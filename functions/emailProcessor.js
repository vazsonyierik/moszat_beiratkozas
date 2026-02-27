const imaps = require("imap-simple");
const {simpleParser} = require("mailparser");
const XLSX = require("xlsx");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const normalizeDate = (input) => {
    // Handle JS Date object
    if (input instanceof Date && !isNaN(input)) {
        const y = input.getFullYear();
        const m = String(input.getMonth() + 1).padStart(2, "0");
        const d = String(input.getDate()).padStart(2, "0");
        return `${y}.${m}.${d}.`;
    }

    if (typeof input !== "string") return null;

    const trimmed = input.trim().replace(/\.$/, ""); // Remove trailing dot if exists

    // 1. Try YYYY.MM.DD or YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    if (isoMatch) {
        const y = isoMatch[1];
        const m = isoMatch[2].padStart(2, "0");
        const d = isoMatch[3].padStart(2, "0");
        return `${y}.${m}.${d}.`;
    }

    // 2. Try US format M/D/YY or M/D/YYYY (e.g. 5/1/91)
    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (usMatch) {
        let y = parseInt(usMatch[3], 10);
        const m = usMatch[1].padStart(2, "0");
        const d = usMatch[2].padStart(2, "0");

        // Handle 2-digit year (cutoff 30 -> 2030, else 19xx)
        if (y < 100) {
            y = y < 30 ? 2000 + y : 1900 + y;
        }
        return `${y}.${m}.${d}.`;
    }

    return null;
};

const formatExamDate = (rawDate) => {
    if (rawDate instanceof Date) {
        // Round to nearest minute: add 30 seconds, then floor to minute
        const roundedTime = new Date(Math.round(rawDate.getTime() / 60000) * 60000);

        const y = roundedTime.getFullYear();
        const m = String(roundedTime.getMonth() + 1).padStart(2, "0");
        const d = String(roundedTime.getDate()).padStart(2, "0");
        const hours = String(roundedTime.getHours()).padStart(2, "0");
        const mins = String(roundedTime.getMinutes()).padStart(2, "0");
        return `${y}.${m}.${d}. ${hours}:${mins}`;
    }
    return rawDate.toString();
};

/**
 * Processes incoming emails from KAV to update student statuses.
 * Looks for emails from 'noreply@kavk.hu' or with 'Adatközlés' subject with Excel attachments.
 * Parses the 'Ügy iktatva' sheet and updates 'isCaseFiled' for students.
 */
const processIncomingEmails = async () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || "imap.gmail.com";
    const emailPort = process.env.EMAIL_PORT || 993;

    if (!emailUser || !emailPass) {
        logger.warn("Email credentials not set (EMAIL_USER, EMAIL_PASS). Skipping email processing.");
        return 0;
    }

    const db = getFirestore();

    const config = {
        imap: {
            user: emailUser,
            password: emailPass,
            host: emailHost,
            port: emailPort,
            tls: true,
            authTimeout: 10000,
            tlsOptions: {rejectUnauthorized: false} // Helps with some strict SSL issues
        }
    };

    let connection;
    let processedCount = 0;
    const updatedStudentsList = [];

    try {
        logger.info("Connecting to IMAP...");
        connection = await imaps.connect(config);
        // Open the appropriate 'All Mail' folder to find emails even if archived
        try {
            // First try the Hungarian folder name
            await connection.openBox("[Gmail]/Összes levél");
            logger.info("Successfully opened '[Gmail]/Összes levél' mailbox.");
        } catch (huError) {
            logger.warn("Could not open '[Gmail]/Összes levél', trying English name...");
            // Fallback to the English folder name
            await connection.openBox("[Gmail]/All Mail");
            logger.info("Successfully opened '[Gmail]/All Mail' mailbox.");
        }

        // NARROWER SEARCH: Only fetch unread emails from the last 7 days containing 'kav' in the sender
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const searchCriteria = [
            "UNSEEN",
            ["SINCE", sevenDaysAgo],
            ["FROM", "kav"]
        ];

        const fetchOptions = {
            bodies: [""], // Fetch the entire raw message body
            markSeen: false // We will mark as seen only if it matches our criteria
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        logger.info(`Found ${messages.length} unread emails in total.`);

        for (const message of messages) {
            try {
                const all = message.parts.find(part => part.which === "");
                const id = message.attributes.uid;
                const idHeader = "Imap-Id: " + id + "\r\n";

                // Parse the email
                const parsed = await simpleParser(idHeader + all.body);

                // --- ROBUST SENDER/SUBJECT CHECK ---
                const fromText = parsed.from?.text || "";
                const fromAddress = parsed.from?.value?.[0]?.address || "";
                const subject = parsed.subject || "";

                logger.info(`Checking email UID:${id} | Subject: "${subject}" | From: "${fromText}" (${fromAddress})`);

                const isKavSender = fromAddress.toLowerCase().includes("kav") || fromText.toLowerCase().includes("kav");
                const isKavSubject = subject.toLowerCase().includes("adatközlés");

                // Strict filtering: Must be from KAV or have specific subject
                if (!isKavSender && !isKavSubject) {
                    logger.info(`Skipping non-relevant email. (UID: ${id})`);
                    continue;
                }

                logger.info(`Processing relevant email (UID: ${id})...`);

                if (parsed.attachments && parsed.attachments.length > 0) {
                    for (const attachment of parsed.attachments) {
                        const filename = attachment.filename || "";
                        if (filename.endsWith(".xls") || filename.endsWith(".xlsx")) {
                            logger.info(`Processing attachment: ${filename}`);

                            // Parse Excel
                            const workbook = XLSX.read(attachment.content, {type: "buffer"});

                            // Find sheets by partial name match
                            const findSheet = (partialName) => workbook.SheetNames.find(n => n.toLowerCase().includes(partialName.toLowerCase()));

                            // Define processing steps
                            const processingSteps = [
                                {sheetName: findSheet("vizsgaidőpont foglalva"), mode: "normal"},
                                {sheetName: findSheet("vizsgaeredmény rögzítve"), mode: "normal"},
                                {sheetName: findSheet("vizsgaidőpont törölve"), mode: "delete"},
                                {sheetName: findSheet("ügy iktatva"), mode: "caseFile"}
                            ];

                            for (const step of processingSteps) {
                                if (!step.sheetName) continue;

                                const worksheet = workbook.Sheets[step.sheetName];
                                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});
                                const isCaseFileMode = step.mode === "caseFile";

                                let updateCount = 0;

                                // Iterate through all rows to find student IDs with regex
                                for (const row of jsonData) {
                                    if (!Array.isArray(row)) continue;

                                    // 1. Find Student ID regex match (e.g. 9342/25/1469/2560)
                                    const idIndex = row.findIndex(cell => {
                                        if (!cell) return false;
                                        return /^\d+\/\d+\/\d+\/\d+$/.test(cell.toString().trim());
                                    });

                                    // If no ID found in this row, skip
                                    if (idIndex === -1) continue;

                                    const studentId = row[idIndex].toString().trim();

                                    // 2. Birth date is usually the column before ID (idIndex - 1)
                                    const birthDateRaw = idIndex > 0 ? row[idIndex - 1] : null;

                                    // Database lookup (Try 'registrations' then 'registrations_test')
                                    let q = db.collection("registrations").where("studentId", "==", studentId);
                                    let snapshot = await q.get();

                                    if (snapshot.empty) {
                                        // Try test collection
                                        q = db.collection("registrations_test").where("studentId", "==", studentId);
                                        snapshot = await q.get();
                                    }

                                    if (snapshot.empty) {
                                        // Student not found in either collection
                                        if (!isCaseFileMode) {
                                            logger.warn(`Student not found: ${studentId} in file ${filename}`);
                                        }
                                        continue;
                                    }

                                    const docRef = snapshot.docs[0].ref;
                                    const studentData = snapshot.docs[0].data();

                                    // 3. Birth Date Validation
                                    if (birthDateRaw) {
                                        const excelBirthDate = normalizeDate(birthDateRaw);
                                        const dbBirthDate = normalizeDate(studentData.birthDate);

                                        if (excelBirthDate && dbBirthDate && dbBirthDate !== excelBirthDate) {
                                            logger.warn(`Birth date mismatch for ${studentId}. DB: ${dbBirthDate}, Excel: ${excelBirthDate}. Skipping.`);
                                            continue;
                                        }
                                    }

                                    // 4. Update Logic
                                    if (isCaseFileMode) {
                                        if (!studentData.isCaseFiled) {
                                            await docRef.update({isCaseFiled: true});
                                            updateCount++;

                                            const fullName = [studentData.current_prefix, studentData.current_lastName, studentData.current_firstName, studentData.current_secondName].filter(Boolean).join(" ");
                                            updatedStudentsList.push({
                                                studentId: studentId,
                                                name: fullName,
                                                file: filename,
                                                action: "Ügy iktatva"
                                            });
                                        }
                                    } else {
                                        // Exam Logic (Normal/Delete)

                                        // Refresh student data to ensure we have latest examResults array
                                        const freshSnap = await docRef.get();
                                        const freshData = freshSnap.data();
                                        const existingResults = freshData.examResults || [];

                                        // Extract Exam Data relative to ID index
                                        const examDateRaw = row.find(c => c instanceof Date || (typeof c === "string" && /^\d{4}[.-]\d{1,2}[.-]\d{1,2}/.test(c.trim())));

                                        if (!examDateRaw) {
                                            logger.warn(`Missing exam date for ${studentId} in ${filename}. Skipping.`);
                                            continue;
                                        }

                                        const formattedExamDate = formatExamDate(examDateRaw);

                                        // Find result keyword
                                        let result = "Kiírva";
                                        const resultCell = row.find(c => typeof c === "string" && /^(megfelelt|nem felelt meg|sikeres|sikertelen|nem jelent meg|kiírva|törölve)$/i.test(c.trim()));
                                        if (resultCell) result = resultCell.toString().trim();

                                        const subject = row[idIndex + 2] ? row[idIndex + 2].toString().trim() : "Ismeretlen tárgy";
                                        const location = row[idIndex + 4] ? row[idIndex + 4].toString().trim() : "";

                                        // Find existing exam by Subject + Date
                                        const existingIndex = existingResults.findIndex(ex =>
                                            ex.subject === subject && ex.date === formattedExamDate
                                        );

                                        let examUpdated = false;
                                        let actionType = "";

                                        if (step.mode === "delete") {
                                            if (existingIndex !== -1) {
                                                const existingExam = existingResults[existingIndex];
                                                if (existingExam.result !== "Törölve") {
                                                    existingResults[existingIndex] = {...existingExam, result: "Törölve", importedAt: new Date().toISOString()};
                                                    examUpdated = true;
                                                    actionType = "Vizsga törölve";
                                                }
                                            }
                                        } else {
                                            // Normal mode (Upsert)
                                            if (existingIndex !== -1) {
                                                const existingExam = existingResults[existingIndex];
                                                const isExistingPlaceholder = !existingExam.result || existingExam.result === "Kiírva";
                                                const isNewConcrete = result && result !== "Kiírva";

                                                if (isExistingPlaceholder && isNewConcrete) {
                                                    existingResults[existingIndex] = {...existingExam, result: result, importedAt: new Date().toISOString()};
                                                    examUpdated = true;
                                                    actionType = `Vizsga frissítve: ${result}`;
                                                }
                                            } else {
                                                // New exam
                                                existingResults.push({
                                                    subject: subject,
                                                    date: formattedExamDate,
                                                    result: result,
                                                    location: location,
                                                    importedAt: new Date().toISOString()
                                                });
                                                examUpdated = true;
                                                actionType = "Új vizsga rögzítve";
                                            }
                                        }

                                        if (examUpdated) {
                                            await docRef.update({examResults: existingResults});
                                            updateCount++;

                                            const fullName = [freshData.current_prefix, freshData.current_lastName, freshData.current_firstName, freshData.current_secondName].filter(Boolean).join(" ");
                                            updatedStudentsList.push({
                                                studentId: studentId,
                                                name: fullName,
                                                file: filename,
                                                action: actionType
                                            });
                                        }
                                    }
                                }

                                processedCount += updateCount;
                            }
                        }
                    }
                } else {
                    logger.info(`Relevant email has no attachments. (UID: ${id})`);
                }

                // Mark email as seen ONLY if it was identified as relevant (KAV email)
                await connection.addFlags(id, "\\Seen");
                logger.info(`Marked email ${id} as seen.`);
            } catch (err) {
                logger.error(`Error processing individual email (UID: ${message.attributes.uid}):`, err);
            }
        }
    } catch (error) {
        logger.error("Error in email processing loop:", error);
    } finally {
        if (connection) {
            try {
                connection.end();
            } catch (e) {
                logger.error("Error closing IMAP connection:", e);
            }
        }
    }

    if (updatedStudentsList.length > 0) {
        try {
            await getFirestore().collection("email_import_logs").add({
                createdAt: FieldValue.serverTimestamp(),
                processedCount: updatedStudentsList.length,
                students: updatedStudentsList
            });
            logger.info(`Logged ${updatedStudentsList.length} updates to email_import_logs.`);
        } catch (logErr) {
            logger.error("Failed to save email import log", logErr);
        }
    }

    return processedCount;
};

module.exports = {processIncomingEmails};
