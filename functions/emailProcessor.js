const imaps = require("imap-simple");
const {simpleParser} = require("mailparser");
const XLSX = require("xlsx");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

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

    try {
        logger.info("Connecting to IMAP...");
        connection = await imaps.connect(config);
        await connection.openBox("INBOX");

        // BROADER SEARCH: Fetch ALL unread emails to ensure we don't miss anything due to sender mismatch
        const searchCriteria = ["UNSEEN"];

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

                            // Find 'Ügy iktatva' sheet (case insensitive)
                            const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes("ügy iktatva"));

                            if (sheetName) {
                                const worksheet = workbook.Sheets[sheetName];
                                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});

                                // Find 'Tanuló azonosító' column
                                let headerRowIndex = -1;
                                let studentIdIdx = -1;

                                for (let i = 0; i < jsonData.length; i++) {
                                    const row = jsonData[i];
                                    const idx = row.findIndex(cell => cell && cell.toString().trim() === "Tanuló azonosító");
                                    if (idx !== -1) {
                                        headerRowIndex = i;
                                        studentIdIdx = idx;
                                        break;
                                    }
                                }

                                if (headerRowIndex !== -1 && studentIdIdx !== -1) {
                                    const rows = jsonData.slice(headerRowIndex + 1);
                                    let updateCount = 0;

                                    for (const row of rows) {
                                        const studentIdRaw = row[studentIdIdx];
                                        const studentId = studentIdRaw ? studentIdRaw.toString().trim() : "";

                                        if (studentId) {
                                            // Update Firestore
                                            const q = db.collection("registrations").where("studentId", "==", studentId);
                                            const snapshot = await q.get();

                                            if (!snapshot.empty) {
                                                const batch = db.batch();
                                                snapshot.docs.forEach(doc => {
                                                    if (!doc.data().isCaseFiled) {
                                                        batch.update(doc.ref, {isCaseFiled: true});
                                                        updateCount++;
                                                    }
                                                });
                                                await batch.commit();
                                                logger.info(`Marked student ${studentId} as case filed.`);
                                            }
                                        }
                                    }
                                    processedCount += updateCount;
                                } else {
                                    logger.warn(`Could not find 'Tanuló azonosító' column in sheet ${sheetName}`);
                                }
                            } else {
                                logger.info(`No 'Ügy iktatva' sheet found in ${filename}.`);
                            }
                        }
                    }
                } else {
                    logger.info(`Relevant email has no attachments. (UID: ${id})`);
                }

                // Mark email as seen ONLY if it was identified as relevant (KAV email)
                // This prevents us from processing it again next time.
                // Even if no rows were updated (e.g., all students already updated), we mark as seen.
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

    return processedCount;
};

module.exports = {processIncomingEmails};
