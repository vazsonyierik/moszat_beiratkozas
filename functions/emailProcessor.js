const imaps = require("imap-simple");
const {simpleParser} = require("mailparser");
const XLSX = require("xlsx");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const db = getFirestore();

/**
 * Processes incoming emails from KAV to update student statuses.
 * Looks for emails from 'noreply@kavk.hu' with Excel attachments.
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

        // Search for UNSEEN emails from KAV
        // Note: Gmail might not support complex OR queries easily via IMAP, so we filter by FROM.
        // If 'noreply@kavk.hu' is strict, use it.
        const searchCriteria = ["UNSEEN", ["FROM", "noreply@kavk.hu"]];
        // const searchCriteria = ['UNSEEN']; // For testing all unread

        const fetchOptions = {
            bodies: [""], // Fetch the entire raw message body
            markSeen: false // We will mark as seen only after successful processing
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        logger.info(`Found ${messages.length} unread emails from KAV.`);

        for (const message of messages) {
            try {
                const all = message.parts.find(part => part.which === "");
                const id = message.attributes.uid;
                const idHeader = "Imap-Id: " + id + "\r\n";

                // Parse the email
                const parsed = await simpleParser(idHeader + all.body);

                if (parsed.attachments && parsed.attachments.length > 0) {
                    for (const attachment of parsed.attachments) {
                        const filename = attachment.filename || "";
                        if (filename.endsWith(".xls") || filename.endsWith(".xlsx")) {
                            logger.info(`Processing attachment: ${filename} from email subject: ${parsed.subject}`);

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
                }

                // Mark email as seen after processing
                await connection.addFlags(id, "\\Seen");
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
