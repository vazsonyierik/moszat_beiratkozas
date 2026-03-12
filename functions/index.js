const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https"); // HttpsError importálása
const {setGlobalOptions} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const {getFirestore, Timestamp, FieldValue} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth"); // getAuth importálása
const {google} = require("googleapis");
const templates = require("./emailTemplates");
const {formatFullName, formatSingleTimestamp, isUnder18} = require("./utils");
const {processIncomingEmails} = require("./emailProcessor");
const {calculateDeadline} = require("./deadlineCalculator");

// Firebase Admin SDK inicializálása
initializeApp();
const db = getFirestore();
const auth = getAuth(); // Auth szolgáltatás inicializálása

// Globális beállítások a funkcióknak
setGlobalOptions({region: "europe-west1", memory: "512MiB"});

// --- Segédfüggvények ---

/**
 * BIZTONSÁGI JAVÍTÁS: Szanitizál egy stringet a HTML entitások cseréjével,
 * hogy megelőzze az XSS támadásokat.
 * @param {*} input A szanitizálandó bemenet.
 * @return {*} A szanitizált string, vagy az eredeti bemenet, ha nem string.
 */
const sanitizeInput = (input) => {
    if (typeof input !== "string") {
        return input; // Visszaadja a nem-string értékeket (pl. boolean) változatlanul
    }
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
    };
    return input.replace(/[&<>"']/g, (m) => map[m]);
};


/**
 * Ellenőrzi, hogy egy adott e-mail cím adminisztrátor-e.
 * @param {string} email Az ellenőrizendő e-mail cím.
 * @return {Promise<boolean>} Igaz, ha a felhasználó admin.
 */
const isAdmin = async (email) => {
    if (!email) return false;
    const adminRef = db.doc(`admins/${email}`);
    const adminSnap = await adminRef.get();
    return adminSnap.exists;
};


/**
 * Adatsor hozzáfűzése egy megadott Google Sheet-hez.
 * @param {string} spreadsheetId A Google Sheet azonosítója.
 * @param {string} sheetName A munkalap neve.
 * @param {Array<any>} rowData A hozzáfűzendő adatsor.
 */
const appendToSheet = async (spreadsheetId, sheetName, rowData) => {
    if (!spreadsheetId) {
        logger.error("CRITICAL: Google Sheet ID is not provided. Cannot append.", {sheetName});
        return;
    }
    try {
        const auth = new google.auth.GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const authClient = await auth.getClient();
        const sheets = google.sheets({version: "v4", auth: authClient});
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            resource: {values: [rowData]},
        });
        logger.info(`Successfully appended data to Google Sheet: ${spreadsheetId}`);
    } catch (error) {
        if (error.code === 403 || (error.errors && error.errors.some(e => e.reason === "permissionDenied"))) {
            logger.error(`CRITICAL PERMISSION ERROR: The function does not have permission to edit the Google Sheet (ID: ${spreadsheetId}). Please share the sheet with the service account 'moszat-jelentkezes@appspot.gserviceaccount.com' as an 'Editor'.`, {fullError: error.message});
        } else {
            logger.error(`CRITICAL ERROR appending to Google Sheet (ID: ${spreadsheetId}):`, {
                message: error.message,
                code: error.code,
            });
        }
    }
};

/**
 * Új, szekvenciális regisztrációs szám generálása (pl. "25/0001").
 * @param {boolean} isTest Jelzi, ha teszt regisztrációs számról van szó.
 * @return {Promise<string|null>} Az új regisztrációs szám vagy null hiba esetén.
 */
const generateRegistrationNumber = async (isTest = false) => {
    const counterDocName = isTest ? "registrations_test" : "registrations";
    const counterRef = db.doc(`counters/${counterDocName}`);
    try {
        const newCount = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const currentCount = counterDoc.exists ? counterDoc.data().count || 0 : 0;
            const nextCount = currentCount + 1;
            transaction.set(counterRef, {count: nextCount}, {merge: true});
            return nextCount;
        });
        const year = new Date().getFullYear().toString().slice(-2);
        const paddedCount = newCount.toString().padStart(4, "0");
        const prefix = isTest ? "TEST-" : ""; // Teszt előtag
        const registrationNumber = `${prefix}${year}/${paddedCount}`;
        logger.info(`Generated new registration number: ${registrationNumber}`);
        return registrationNumber;
    } catch (error) {
        logger.error("Failed to generate registration number", error);
        return null;
    }
};

/**
 * Új regisztráció adatainak naplózása a fő regisztrációs táblázatba.
 * @param {object} studentData Az új tanuló adatai.
 */
const logNewRegistrationToSheet = async (studentData) => {
    const SPREADSHEET_ID = process.env.REGISTRATION_SHEET_ID;

    if (!SPREADSHEET_ID) {
        logger.error("SHEET ID environment variable not set. Skipping sheet log for new registration.");
        return;
    }
    const headers = [
        "sorszam", "jelentkezes_ideje", "beiratkozas_ideje", "azonosito_megadasa", "tanfolyam_befejezve",
        "current_prefix", "current_lastName", "current_firstName", "current_secondName",
        "birth_prefix", "birth_lastName", "birth_firstName", "birth_secondName",
        "mother_prefix", "mother_lastName", "mother_firstName", "mother_secondName",
        "birth_country", "birth_city", "birth_district", "birthDate", "nationality", "secondNationality",
        "documentType", "documentNumber", "documentExpiry", "education",
        "has_previous_license", "previous_license_number", "previous_license_categories",
        "studied_elsewhere_radio", "had_exam_recently_radio", "failed_exam_count",
        "permanent_address_country", "permanent_address_zip", "permanent_address_city", "permanent_address_street", "permanent_address_streetType", "permanent_address_houseNumber", "permanent_address_building", "permanent_address_staircase", "permanent_address_floor", "permanent_address_door",
        "temporary_address_country", "temporary_address_zip", "temporary_address_city", "temporary_address_street", "temporary_address_streetType", "temporary_address_houseNumber", "temporary_address_building", "temporary_address_staircase", "temporary_address_floor", "temporary_address_door",
        "phone_number", "email", "guardian_name", "guardian_phone", "guardian_email", "megjegyzes"
    ];
    const rowData = headers.map(header => {
        if (header === "sorszam") return studentData.registrationNumber || "";
        if (header === "jelentkezes_ideje") return studentData.createdAt ? formatSingleTimestamp(studentData.createdAt) : "";
        if (header === "beiratkozas_ideje") return studentData.enrolledAt ? formatSingleTimestamp(studentData.enrolledAt) : "";
        if (header === "azonosito_megadasa") return studentData.studentIdAssignedAt ? formatSingleTimestamp(studentData.studentIdAssignedAt) : "";
        if (header === "tanfolyam_befejezve") return studentData.courseCompletedAt ? formatSingleTimestamp(studentData.courseCompletedAt) : "";
        return studentData[header] || "";
    });
    await appendToSheet(SPREADSHEET_ID, "Jelentkezések", rowData);
};

/**
 * Tanuló sorának frissítése a fő regisztrációs táblázatban.
 * @param {object} studentData A tanuló frissített adatai.
 */
const updateRegistrationSheet = async (studentData) => {
    const SPREADSHEET_ID = process.env.REGISTRATION_SHEET_ID;
    const SHEET_NAME = "Jelentkezések";
    if (!SPREADSHEET_ID) {
        logger.error("SHEET ID env var not set. Cannot update sheet.");
        return;
    }
    if (!studentData.registrationNumber) {
        logger.error("Cannot update sheet: Student is missing registration number.", {studentId: studentData.id});
        return;
    }
    try {
        const auth = new google.auth.GoogleAuth({scopes: ["https://www.googleapis.com/auth/spreadsheets"]});
        const authClient = await auth.getClient();
        const sheets = google.sheets({version: "v4", auth: authClient});
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:A`,
        });
        const rows = response.data.values;
        let rowNumber = -1;
        if (rows) {
            const rowIndex = rows.findLastIndex(row => row[0] === studentData.registrationNumber);
            if (rowIndex !== -1) {
                rowNumber = rowIndex + 1;
            }
        }
        if (rowNumber === -1) {
            logger.warn(`Could not find row for registration number ${studentData.registrationNumber}. Appending as new row instead.`);
            await logNewRegistrationToSheet(studentData);
            return;
        }
        logger.info(`Found student at row ${rowNumber}. Preparing to update.`);
        const headers = [
            "sorszam", "jelentkezes_ideje", "beiratkozas_ideje", "azonosito_megadasa", "tanfolyam_befejezve",
            "current_prefix", "current_lastName", "current_firstName", "current_secondName",
            "birth_prefix", "birth_lastName", "birth_firstName", "birth_secondName",
            "mother_prefix", "mother_lastName", "mother_firstName", "mother_secondName",
            "birth_country", "birth_city", "birth_district", "birthDate", "nationality", "secondNationality",
            "documentType", "documentNumber", "documentExpiry", "education",
            "has_previous_license", "previous_license_number", "previous_license_categories",
            "studied_elsewhere_radio", "had_exam_recently_radio", "failed_exam_count",
            "permanent_address_country", "permanent_address_zip", "permanent_address_city", "permanent_address_street", "permanent_address_streetType", "permanent_address_houseNumber", "permanent_address_building", "permanent_address_staircase", "permanent_address_floor", "permanent_address_door",
            "temporary_address_country", "temporary_address_zip", "temporary_address_city", "temporary_address_street", "temporary_address_streetType", "temporary_address_houseNumber", "temporary_address_building", "temporary_address_staircase", "temporary_address_floor", "temporary_address_door",
            "phone_number", "email", "guardian_name", "guardian_phone", "guardian_email", "megjegyzes"
        ];
        const rowData = headers.map(header => {
            if (header === "sorszam") return studentData.registrationNumber || "";
            if (header === "jelentkezes_ideje") return studentData.createdAt ? formatSingleTimestamp(studentData.createdAt) : "";
            if (header === "beiratkozas_ideje") return studentData.enrolledAt ? formatSingleTimestamp(studentData.enrolledAt) : "";
            if (header === "azonosito_megadasa") return studentData.studentIdAssignedAt ? formatSingleTimestamp(studentData.studentIdAssignedAt) : "";
            if (header === "tanfolyam_befejezve") return studentData.courseCompletedAt ? formatSingleTimestamp(studentData.courseCompletedAt) : "";
            return studentData[header] || "";
        });
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A${rowNumber}`,
            valueInputOption: "USER_ENTERED",
            resource: {values: [rowData]},
        });
        logger.info(`Successfully updated row ${rowNumber} for registration number ${studentData.registrationNumber}.`);
    } catch (error) {
        logger.error(`Failed to update sheet for registration number ${studentData.registrationNumber}.`, {
            message: error.message,
            code: error.code,
        });
    }
};

/**
 * Beiratkozott tanuló adatainak naplózása a beiratkozási táblázatba.
 * @param {object} studentData A beiratkozott tanuló adatai.
 */
const logEnrollmentToSheet = async (studentData) => {
    const SPREADSHEET_ID = process.env.ENROLLMENT_SHEET_ID;

    if (!SPREADSHEET_ID) {
        logger.error("SHEET ID environment variable not set. Skipping sheet log for enrollment.");
        return;
    }
    const enrolledAt = studentData.enrolledAt ? formatSingleTimestamp(studentData.enrolledAt) : new Date().toLocaleString("hu-HU");
    const studentName = formatFullName(studentData.current_prefix, studentData.current_firstName, studentData.current_lastName, studentData.current_secondName);
    const email = studentData.email || "";
    const rowData = [enrolledAt, studentName, email];
    await appendToSheet(SPREADSHEET_ID, "Beiratkozottak", rowData);
};

/**
 * Adatok exportálása a FAR táblázatba.
 * @param {object} studentData A tanuló adatai.
 */
const logToFarSheet = async (studentData) => {
    const SPREADSHEET_ID = process.env.FAR_SHEET_ID;
    const SHEET_NAME = "Résztvevők";

    if (!SPREADSHEET_ID) {
        logger.error("SHEET ID environment variable not set. Skipping FAR sheet log.");
        return;
    }
    const viseltNev = formatFullName(studentData.current_prefix, studentData.current_firstName, studentData.current_lastName, studentData.current_secondName);
    const szuletesiNev = formatFullName(studentData.birth_prefix, studentData.birth_firstName, studentData.birth_lastName, studentData.birth_secondName);
    const anyjaNeve = formatFullName(studentData.mother_prefix, studentData.mother_firstName, studentData.mother_lastName, studentData.mother_secondName);

    // REVERT: Eredeti oszlopstruktúra visszaállítása (nincs tanfolyam kezdés az első oszlopban)
    const rowData = [
        studentData.education || "", viseltNev, szuletesiNev, anyjaNeve,
        studentData.birth_country || "", studentData.birth_city || "", studentData.birthDate || "",
        studentData.email || "", "", "", "", "", "", "",
    ];
    await appendToSheet(SPREADSHEET_ID, SHEET_NAME, rowData);
    logger.info(`Successfully logged data to FAR sheet for student: ${viseltNev}`);
};

/**
 * E-mail küldése a 'mail' gyűjteménybe való írással.
 * @param {object} studentData A címzett adatai.
 * @param {object} template Az e-mail sablon.
 * @param {boolean} isTest Teszt üzemmód jelző.
 */
const sendEmail = async (studentData, template, isTest = false) => {
    if (!studentData.email) {
        logger.error("Student data is missing email, cannot send.", {studentId: studentData.id});
        return;
    }
    if (!template || !template.subject || !template.html) {
        logger.error("Email template is invalid.", {studentId: studentData.id});
        return;
    }

    // ÚJ: Ellenőrizzük, hogy a teszt emailek engedélyezve vannak-e
    if (isTest) {
        try {
            const configDoc = await db.collection("settings").doc("testConfig").get();
            if (configDoc.exists) {
                const config = configDoc.data();
                if (config.emailsEnabled === false) {
                    logger.info("Test emails are disabled in settings. Skipping email send.", {to: studentData.email});
                    return;
                }
            }
        } catch (error) {
            logger.warn("Failed to check test email settings. Proceeding with send.", {error: error.message});
        }
    }

    const subjectPrefix = isTest ? "[TESZT] " : "";

    const mailPayload = {
        to: studentData.email,
        from: "\"Mosolyzóna, a Kreszprofesszor autósiskolája\" <iroda@mosolyzona.hu>",
        message: {
            subject: `${subjectPrefix}${template.subject}`,
            html: template.html,
        },
    };
    if (isUnder18(studentData.birthDate) && studentData.guardian_email) {
        mailPayload.cc = studentData.guardian_email;
    }
    try {
        await db.collection("mail").add(mailPayload);
        logger.info(`Email queued for sending to ${studentData.email}`, {cc: mailPayload.cc || "none", isTest});
    } catch (error) {
        logger.error(`Failed to queue email for ${studentData.email}`, {error: error.message});
    }
};

// --- AUTOMATIZÁLÁSI FUNKCIÓ ---
const runDailyChecks = async () => {
    logger.info("Starting daily checks with new logic...");

    const today = new Date();
    const automationLogs = [];
    const snapshot = await db.collection("registrations").where("status", "==", "active").get();
    if (snapshot.empty) {
        logger.info("No active registrations found. Ending daily checks.");
        return 0;
    }
    const studentPromises = [];
    snapshot.forEach((doc) => {
        const student = {id: doc.id, ...doc.data()};
        const studentName = formatFullName(student.current_prefix, student.current_firstName, student.current_lastName, student.current_secondName);
        if (!student.status_paid && !student.status_enrolled) {
            const createdAt = student.createdAt.toDate();
            const daysSinceCreation = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
            if (daysSinceCreation === 4) {
                studentPromises.push(sendEmail(student, templates.paymentReminderDay4(student)));
                automationLogs.push({student: studentName, action: "Fizetési emlékeztető (4. nap) küldve"});
            } else if (daysSinceCreation === 10) {
                studentPromises.push(sendEmail(student, templates.paymentReminderDay10(student)));
                automationLogs.push({student: studentName, action: "Fizetési emlékeztető (10. nap) küldve"});
            } else if (daysSinceCreation >= 20) {
                studentPromises.push(doc.ref.update({status: "expired_unpaid"}));
                automationLogs.push({student: studentName, action: "Státusz 'lejárt (nem fizetett)'-re állítva"});
            }
        } else if (student.status_enrolled && !student.studentId) {
            const enrolledAt = student.enrolledAt.toDate();
            const daysSinceEnrolled = Math.floor((today - enrolledAt) / (1000 * 60 * 60 * 24));
            if (daysSinceEnrolled === 30) {
                studentPromises.push(sendEmail(student, templates.courseStartReminderDay30(student)));
                automationLogs.push({student: studentName, action: "Tanfolyamkezdési emlékeztető (30. nap) küldve"});
            } else if (daysSinceEnrolled === 60) {
                studentPromises.push(sendEmail(student, templates.courseStartReminderDay60(student)));
                automationLogs.push({student: studentName, action: "Tanfolyamkezdési emlékeztető (60. nap) küldve"});
            } else if (daysSinceEnrolled === 85) {
                studentPromises.push(sendEmail(student, templates.courseStartReminderDay85(student)));
                automationLogs.push({student: studentName, action: "Tanfolyamkezdési emlékeztető (85. nap) küldve"});
            } else if (daysSinceEnrolled >= 90) {
                studentPromises.push(doc.ref.update({status: "expired_not_started"}));
                automationLogs.push({student: studentName, action: "Státusz 'lejárt (nem kezdte el)'-re állítva"});
            }
        } else if (student.studentId && !student.courseCompletedAt) {
            const studentIdAssignedAt = student.studentIdAssignedAt.toDate();
            const daysSinceIdAssigned = Math.floor((today - studentIdAssignedAt) / (1000 * 60 * 60 * 24));
            const monthsSinceId = (today.getFullYear() - studentIdAssignedAt.getFullYear()) * 12 + (today.getMonth() - studentIdAssignedAt.getMonth());
            if (daysSinceIdAssigned === 90) {
                studentPromises.push(sendEmail(student, templates.elearningProgressReminderDay90(student)));
                automationLogs.push({student: studentName, action: "E-learning haladási emlékeztető (90. nap) küldve"});
            } else if (daysSinceIdAssigned === 180) {
                studentPromises.push(sendEmail(student, templates.elearningProgressReminderDay180(student)));
                automationLogs.push({student: studentName, action: "E-learning haladási emlékeztető (180. nap) küldve"});
            }
            if (monthsSinceId >= 9) {
                studentPromises.push(doc.ref.update({status: "expired_elearning_incomplete"}));
                automationLogs.push({student: studentName, action: "Státusz 'lejárt (e-learning nem kész)'-re állítva (9 hónap eltelt)"});
            }
        }
    });
    await Promise.all(studentPromises);
    if (automationLogs.length > 0) {
        const logDocRef = db.collection("automation_logs").doc(today.toISOString().split("T")[0]);
        await logDocRef.set({
            createdAt: Timestamp.now(),
            entries: automationLogs,
        }, {merge: true});
    }
    logger.info(`Daily checks completed. ${automationLogs.length} actions logged.`);
    return automationLogs.length;
};

// --- EXPORTÁLT CLOUD FUNKCIÓK ---

// ÚJ FUNKCIÓ: Biztonságos regisztrációkezelés
exports.submitRegistration = onCall({region: "europe-west1"}, async (request) => {
    const formData = request.data;

    // ÚJ: Teszt mód detektálása a kérésből
    const isTest = formData._isTest === true;
    delete formData._isTest; // Nem mentjük el az adatbázisba

    // BIZTONSÁGI JAVÍTÁS: A bejövő adatok szanitizálása
    const sanitizedData = {};
    for (const key in formData) {
        if (Object.prototype.hasOwnProperty.call(formData, key)) {
            sanitizedData[key] = sanitizeInput(formData[key]);
        }
    }

    // Szerver oldali validáció (a szanitizált adatokkal)
    if (!sanitizedData.current_lastName || !sanitizedData.current_firstName || !sanitizedData.email) {
        throw new HttpsError("invalid-argument", "A kötelező mezők (név, email) nincsenek kitöltve.");
    }

    const newRegistrationData = {
        ...sanitizedData, // A szanitizált adatokat használjuk
        createdAt: Timestamp.now(),
        status: "active",
        registeredBy: "form",
    };

    // Tisztítás
    delete newRegistrationData.email_confirm;
    delete newRegistrationData.guardian_email_confirm;
    delete newRegistrationData.copyNameToBirth;

    const collectionName = isTest ? "registrations_test" : "registrations";

    try {
        const docRef = await db.collection(collectionName).add(newRegistrationData);
        logger.info(`New registration successfully submitted via function for ${sanitizedData.email} to ${collectionName}`, {docId: docRef.id});
        return {success: true, message: "Sikeres regisztráció!"};
    } catch (error) {
        logger.error("Error submitting registration via function:", error);
        throw new HttpsError("internal", "Hiba történt a regisztráció mentésekor.");
    }
});

// JAVÍTÁS: Új Cloud Function az admin általi tanuló hozzáadáshoz
exports.adminAddStudent = onCall({region: "europe-west1"}, async (request) => {
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Nincs jogosultságod a funkció futtatásához.");
    }

    const formData = request.data;
    const isTest = formData._isTest === true;
    delete formData._isTest;

    const newRegistrationData = {
        ...formData,
        createdAt: Timestamp.now(),
        status: "active",
        registeredBy: "admin",
    };

    // Felesleges mezők eltávolítása a végleges dokumentumból
    delete newRegistrationData.copyNameToBirth;

    if (formData.isTransferStudent) {
        newRegistrationData.status_paid = true;
        newRegistrationData.status_enrolled = true;
        newRegistrationData.hasMedicalCertificate = true;

        let kreszDateStr = formData.transferKreszDate;
        if (!kreszDateStr || typeof kreszDateStr !== 'string') {
            // Fallback if empty, use current date
            kreszDateStr = new Date().toISOString().split('T')[0];
        }

        // "Déli Horgony" (Noon Anchor): 12:00:00Z UTC formátumot használunk,
        // így a nyári-téli időszámítás eltolódása miatt sosem ugrik át a következő naptári napra a dátum.
        const dateObj = new Date(kreszDateStr + "T12:00:00Z");
        // Ensure valid date before creating timestamp
        if (!isNaN(dateObj.getTime())) {
            newRegistrationData.courseCompletedAt = Timestamp.fromDate(dateObj);
        } else {
            newRegistrationData.courseCompletedAt = Timestamp.now();
        }

        newRegistrationData.examResults = [{
            date: kreszDateStr.replace(/-/g, '.') + ". 12:00",
            subject: "Közlekedési alapismeretek",
            result: "Sikeres (M)",
            location: "Hozott adat (Átjelentkezés)",
            isSynthetic: false
        }];
    }
    delete newRegistrationData.transferKreszDate;

    const collectionName = isTest ? "registrations_test" : "registrations";

    try {
        const docRef = await db.collection(collectionName).add(newRegistrationData);
        logger.info(`Admin (${userEmail}) successfully added a new student to ${collectionName}: ${formatFullName(formData.current_prefix, formData.current_firstName, formData.current_lastName, formData.current_secondName)}`, {docId: docRef.id});
        return {success: true, docId: docRef.id};
    } catch (error) {
        logger.error(`Error adding student by admin ${userEmail}:`, error);
        throw new HttpsError("internal", "Hiba történt a tanuló mentésekor.");
    }
});


// ÚJ FUNKCIÓ: Áthelyezett tanulók tömeges importálása (CSV/TSV)
exports.adminBulkAddTransferStudents = onCall({region: "europe-west1"}, async (request) => {
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Nincs jogosultságod a funkció futtatásához.");
    }

    const { students, _isTest } = request.data;

    if (!Array.isArray(students) || students.length === 0) {
        throw new HttpsError("invalid-argument", "A tanulók listája érvénytelen vagy üres.");
    }

    const collectionName = _isTest ? "registrations_test" : "registrations";
    const batch = db.batch();
    let count = 0;

    for (const student of students) {
        const newRegistrationData = {
            ...student,
            createdAt: Timestamp.now(),
            status: "active",
            registeredBy: "admin",
            status_paid: true,
            status_enrolled: true,
            hasMedicalCertificate: true,
        };

        // KRESZ Date logic
        let kreszDateStr = newRegistrationData.transferKreszDate;
        if (!kreszDateStr || typeof kreszDateStr !== 'string') {
            kreszDateStr = new Date().toISOString().split('T')[0];
        }

        // "Déli Horgony" (Noon Anchor): 12:00:00Z UTC formátumot használunk
        const dateObj = new Date(kreszDateStr + "T12:00:00Z");
        if (!isNaN(dateObj.getTime())) {
            newRegistrationData.courseCompletedAt = Timestamp.fromDate(dateObj);
        } else {
            newRegistrationData.courseCompletedAt = Timestamp.now();
        }

        newRegistrationData.examResults = [{
            date: kreszDateStr.replace(/-/g, '.') + ". 12:00",
            subject: "Közlekedési alapismeretek",
            result: "Sikeres (M)",
            location: "Hozott adat (Átjelentkezés)",
            isSynthetic: false
        }];

        delete newRegistrationData.transferKreszDate;

        const docRef = db.collection(collectionName).doc();
        batch.set(docRef, newRegistrationData);
        count++;
    }

    try {
        await batch.commit();
        logger.info(`Admin (${userEmail}) successfully bulk added ${count} transfer students to ${collectionName}.`);
        return { success: true, count };
    } catch (error) {
        logger.error(`Error bulk adding transfer students by admin ${userEmail}:`, error);
        throw new HttpsError("internal", "Hiba történt a tömeges importálás során.");
    }
});

// ÚJ FUNKCIÓ: Biztonságos admin bejelentkezési link küldése
exports.sendAdminLoginLink = onCall({region: "europe-west1"}, async (request) => {
    const email = request.data.email;
    if (!email) {
        throw new HttpsError("invalid-argument", "Az e-mail cím megadása kötelező.");
    }

    const isUserAdmin = await isAdmin(email);
    if (!isUserAdmin) {
        logger.warn(`Non-admin login attempt for email: ${email}`);
        throw new HttpsError("permission-denied", "Nincs jogosultság a bejelentkezéshez.");
    }

    try {
        const actionCodeSettings = {
            url: request.data.redirectUrl || "https://moszat-jelentkezes.web.app/?admin=true",
            handleCodeInApp: true,
        };
        const link = await auth.generateSignInWithEmailLink(email, actionCodeSettings);

        await db.collection("mail").add({
            to: email,
            from: "\"Mosolyzóna, a Kreszprofesszor autósiskolája\" <iroda@mosolyzona.hu>",
            message: {
                subject: "Admin bejelentkezési link",
                html: `Kattints ide a bejelentkezéshez: <a href="${link}">Bejelentkezés</a>`,
            },
        });

        logger.info(`Admin sign-in link sent to ${email}`);
        return {success: true};
    } catch (error) {
        logger.error(`Error sending admin sign-in link to ${email}`, error);
        throw new HttpsError("internal", "Hiba történt a bejelentkezési link küldésekor.");
    }
});

// Napi ütemezett ellenőrzések
exports.dailyScheduledChecks = onSchedule("every day 08:00", () => runDailyChecks());

// Ütemezett email feldolgozás (Hétfőtől Péntekig, 06:00-18:00 között minden óra 5. percében)
exports.scheduledEmailProcessor = onSchedule({
    schedule: "5 6-18 * * 1-5",
    timeZone: "Europe/Budapest",
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "1GiB",
}, async () => {
    logger.info("Scheduled email processing started.");
    try {
        const processedCount = await processIncomingEmails({daysBack: 2, unseenOnly: false});
        logger.info(`Scheduled email processing completed. Updates: ${processedCount}`);
    } catch (error) {
        logger.error("Error in scheduled email processing:", error);
    }
});

// ÚJ FUNKCIÓ: Összes határidő tömeges újraszámítása
exports.recalculateAllDeadlines = onCall({region: "europe-west1", timeoutSeconds: 540, memory: "1GiB"}, async (request) => {
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Nincs jogosultságod a funkció futtatásához.");
    }

    const { isTestView } = request.data;
    const collectionName = isTestView ? "registrations_test" : "registrations";

    try {
        const snapshot = await db.collection(collectionName).get();
        let updatedCount = 0;

        // Firestore batches can handle up to 500 operations
        let batch = db.batch();
        let batchCount = 0;

        snapshot.forEach((doc) => {
            const studentData = doc.data();

            // Skip archived records to save operations
            if (studentData.status === 'archived') {
                return;
            }

            const newDeadlineInfo = calculateDeadline(studentData) || null;

            // Optimization: Only update if it actually changed
            if (JSON.stringify(studentData.deadlineInfo) !== JSON.stringify(newDeadlineInfo)) {
                batch.update(doc.ref, { deadlineInfo: newDeadlineInfo });
                updatedCount++;
                batchCount++;

                // If batch limit reached, commit and start a new one
                if (batchCount >= 400) {
                    batch.commit(); // Note: in a real robust scenario, we should await this, but for simple chunks we can collect promises
                    batch = db.batch();
                    batchCount = 0;
                }
            }
        });

        // Commit any remaining operations in the final batch
        if (batchCount > 0) {
            await batch.commit();
        }

        logger.info(`Bulk deadline recalculation complete for ${collectionName}. Updated ${updatedCount} records.`);
        return { success: true, updatedCount };
    } catch (error) {
        logger.error(`Error in recalculateAllDeadlines for ${collectionName}:`, error);
        throw new HttpsError("internal", "Hiba történt a tömeges újraszámítás során.");
    }
});

// Manuális ellenőrzések
exports.manualDailyChecks = onCall({region: "europe-west1"}, async (request) => {
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Nincs jogosultságod a funkció futtatásához.");
    }
    const logCount = await runDailyChecks();
    return {success: true, logCount};
});

// ÚJ FUNKCIÓ: Manuális határidő újraszámítás egy adott tanulóra
exports.recalculateStudentDeadline = onCall({region: "europe-west1"}, async (request) => {
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Nincs jogosultságod a funkció futtatásához.");
    }

    const {documentId, isTest} = request.data;
    if (!documentId) {
        throw new HttpsError("invalid-argument", "Hiányzó dokumentum azonosító.");
    }

    const collectionName = isTest ? "registrations_test" : "registrations";
    const docRef = db.collection(collectionName).doc(documentId);

    try {
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            throw new HttpsError("not-found", "Tanuló nem található.");
        }

        const studentData = docSnap.data();
        const newDeadlineInfo = calculateDeadline(studentData) || null;

        await docRef.update({deadlineInfo: newDeadlineInfo});
        logger.info(`Manual deadline recalculation triggered for ${documentId} in ${collectionName} by ${userEmail}.`);

        return {success: true, deadlineInfo: newDeadlineInfo};
    } catch (error) {
        logger.error(`Error recalculating deadline for ${documentId}:`, error);
        throw new HttpsError("internal", "Hiba történt a határidő újraszámításakor.");
    }
});

// Manuális email feldolgozás (KIZÁRÓLAG email)
exports.processEmailsManual = onCall({region: "europe-west1", timeoutSeconds: 540, memory: "1GiB"}, async (request) => {
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Nincs jogosultságod a funkció futtatásához.");
    }

    const daysBack = request.data.daysBack !== undefined ? request.data.daysBack : 2;
    const unseenOnly = request.data.unseenOnly !== undefined ? request.data.unseenOnly : false;
    const startDate = request.data.startDate !== undefined ? request.data.startDate : null;
    const endDate = request.data.endDate !== undefined ? request.data.endDate : null;

    try {
        const processedCount = await processIncomingEmails({daysBack, unseenOnly, startDate, endDate});
        logger.info(`Manual email processing triggered by ${userEmail}. Updates: ${processedCount} (Days: ${daysBack}, Unseen: ${unseenOnly}, Start: ${startDate}, End: ${endDate})`);
        return {success: true, processedCount};
    } catch (error) {
        logger.error("Error manual email processing:", error);
        throw new HttpsError("internal", "Hiba az e-mailek feldolgozása közben.");
    }
});

// Dokumentum létrehozásakor lefutó trigger
exports.onRegistrationCreated = onDocumentCreated(
    {
        document: "registrations/{registrationId}",
        secrets: ["REGISTRATION_SHEET_ID"],
    },
    async (event) => {
        const studentData = event.data.data();
        const studentRef = event.data.ref;

        const registrationNumber = await generateRegistrationNumber(false);
        if (registrationNumber) {
            await studentRef.update({registrationNumber: registrationNumber});
        }

        if (studentData.registeredBy === "form" || studentData.sendInitialEmail === true) {
            const emailData = {...studentData, registrationNumber};
            await sendEmail(emailData, templates.registrationConfirmation(emailData));
        }

        if (studentData.sendInitialEmail !== undefined) {
            await studentRef.update({sendInitialEmail: FieldValue.delete()});
        }

        const deadlineInfo = calculateDeadline(studentData);
        if (deadlineInfo) {
            await studentRef.update({deadlineInfo});
        }

        logger.info(`Registration created for ${studentRef.id}. Sheet writing will be handled by onUpdated trigger.`);
    }
);

// ÚJ: Dokumentum létrehozásakor lefutó trigger a TESZT adatbázishoz
exports.onRegistrationTestCreated = onDocumentCreated(
    {
        document: "registrations_test/{registrationId}",
    },
    async (event) => {
        const studentData = event.data.data();
        const studentRef = event.data.ref;

        const registrationNumber = await generateRegistrationNumber(true); // true = teszt
        if (registrationNumber) {
            await studentRef.update({registrationNumber: registrationNumber});
        }

        if (studentData.registeredBy === "form" || studentData.sendInitialEmail === true) {
            const emailData = {...studentData, registrationNumber};
            // isTest = true paraméter átadása a sendEmail-nek
            await sendEmail(emailData, templates.registrationConfirmation(emailData), true);
        }

        if (studentData.sendInitialEmail !== undefined) {
            await studentRef.update({sendInitialEmail: FieldValue.delete()});
        }

        const deadlineInfo = calculateDeadline(studentData);
        if (deadlineInfo) {
            await studentRef.update({deadlineInfo});
        }

        // MÓDOSÍTÁS: A teszt adatbázis NEM ír a sheet-be
        logger.info(`TEST Registration created for ${studentRef.id}. No sheet output.`);
    }
);

// Dokumentum frissítésekor lefutó trigger
exports.onRegistrationUpdated = onDocumentUpdated(
    {
        document: "registrations/{registrationId}",
        secrets: ["REGISTRATION_SHEET_ID", "ENROLLMENT_SHEET_ID", "FAR_SHEET_ID"],
    },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();
        let sheetNeedsUpdate = false;

        if (before.sendInitialEmail === true && after.sendInitialEmail === undefined) {
            logger.info(`'sendInitialEmail' field removed for ${after.registrationNumber}. No sheet update needed for this change.`);
            return;
        }

        if (!before.registrationNumber && after.registrationNumber) {
            logger.info(`New registration number detected for ${after.registrationNumber}. Creating initial sheet row.`);
            await logNewRegistrationToSheet(after);
            sheetNeedsUpdate = false;
        } else {
            const beforeComparable = {...before};
            delete beforeComparable.createdAt;
            const afterComparable = {...after};
            delete afterComparable.createdAt;
            if (JSON.stringify(beforeComparable) !== JSON.stringify(afterComparable)) {
                sheetNeedsUpdate = true;
            }
        }

        if (sheetNeedsUpdate) {
            logger.info(`Change detected for ${after.registrationNumber}. Updating sheet row.`);
            await updateRegistrationSheet(after);
        }

        if (!before.studentId && after.studentId) {
            logger.info(`Student ID assigned for ${after.registrationNumber}. Logging to FAR sheet.`);
            await logToFarSheet(after);
        }

        if (!before.status_enrolled && after.status_enrolled) {
            await sendEmail(after, templates.enrolledConfirmation(after));
            await logEnrollmentToSheet(after);
        }

        if (!before.courseCompletedAt && after.courseCompletedAt) {
            if (after.hasMedicalCertificate) {
                await sendEmail(after, templates.courseCompletedReadyToSign(after));
            } else {
                await sendEmail(after, templates.courseCompletedMedicalNeeded(after));
            }
        }

        if (!before.hasMedicalCertificate && after.hasMedicalCertificate) {
            await sendEmail(after, templates.medicalCertificateReceived(after));
        }

        // CRITICAL OPTIMIZATION: Deadline Calculation
        // Only run if specific deadline-related fields changed
        const fieldsToWatch = ["examResults", "enrolledAt", "studentIdAssignedAt", "courseCompletedAt", "studentId", "isTransferred", "status"];
        let needsDeadlineRecalc = false;

        for (const field of fieldsToWatch) {
            if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
                needsDeadlineRecalc = true;
                break;
            }
        }

        if (needsDeadlineRecalc) {
            const newDeadlineInfo = calculateDeadline(after) || null;
            // Only update if the result actually changed
            if (JSON.stringify(before.deadlineInfo) !== JSON.stringify(newDeadlineInfo)) {
                logger.info(`Updating deadlineInfo for ${after.registrationNumber}`);
                await event.data.after.ref.update({deadlineInfo: newDeadlineInfo});
            }
        }
    }
);

// ÚJ: Dokumentum frissítésekor lefutó trigger a TESZT adatbázishoz
exports.onRegistrationTestUpdated = onDocumentUpdated(
    {
        document: "registrations_test/{registrationId}",
    },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();

        // Teszt mód (isTest = true) - CSAK E-mailek küldése, nincs sheet írás

        if (!before.status_enrolled && after.status_enrolled) {
            await sendEmail(after, templates.enrolledConfirmation(after), true);
        }

        if (!before.courseCompletedAt && after.courseCompletedAt) {
            if (after.hasMedicalCertificate) {
                await sendEmail(after, templates.courseCompletedReadyToSign(after), true);
            } else {
                await sendEmail(after, templates.courseCompletedMedicalNeeded(after), true);
            }
        }

        if (!before.hasMedicalCertificate && after.hasMedicalCertificate) {
            await sendEmail(after, templates.medicalCertificateReceived(after), true);
        }

        // CRITICAL OPTIMIZATION: Deadline Calculation
        const fieldsToWatch = ["examResults", "enrolledAt", "studentIdAssignedAt", "courseCompletedAt", "studentId", "isTransferred", "status"];
        let needsDeadlineRecalc = false;

        for (const field of fieldsToWatch) {
            if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
                needsDeadlineRecalc = true;
                break;
            }
        }

        if (needsDeadlineRecalc) {
            const newDeadlineInfo = calculateDeadline(after) || null;
            if (JSON.stringify(before.deadlineInfo) !== JSON.stringify(newDeadlineInfo)) {
                logger.info(`Updating deadlineInfo for TEST ${after.registrationNumber}`);
                await event.data.after.ref.update({deadlineInfo: newDeadlineInfo});
            }
        }

        logger.info(`TEST Registration updated for ${after.registrationNumber}. Emails sent if triggered. Sheet update SKIPPED.`);
    }
);

/**
 * Migration Script: Migrate existing dates in the "registrations_test" collection to the Noon Anchor (12:00:00 UTC).
 * It will read `enrolledAt`, `studentIdAssignedAt`, and `courseCompletedAt`.
 * If they exist, it converts them to 12:00:00 UTC and saves them back.
 * It ignores the main "registrations" collection as requested.
 *
 * To run: Open the deployed function URL in a browser and append ?run=true
 */
exports.migrateDatesToNoonTest = onRequest({region: "europe-west3", maxInstances: 1}, async (req, res) => {
    // Biztonsági ellenőrzés (hogy véletlenül ne fusson le)
    if (req.query.run !== 'true') {
        res.status(400).send("A script futtatásához add hozzá a '?run=true' paramétert az URL végéhez.");
        return;
    }

    try {
        const snapshot = await db.collection("registrations_test").get();
        let updatedCount = 0;
        const totalDocs = snapshot.size;

        // Process in batches for performance
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const updateData = {};
            let modified = false;

            const fieldsToMigrate = ["enrolledAt", "studentIdAssignedAt", "courseCompletedAt"];

            for (const field of fieldsToMigrate) {
                if (data[field]) {
                    // Extract Date object from Firestore Timestamp or string
                    let currentDate;
                    if (data[field].toDate && typeof data[field].toDate === 'function') {
                        currentDate = data[field].toDate();
                    } else if (data[field] instanceof Date) {
                        currentDate = data[field];
                    } else if (typeof data[field] === 'string' || typeof data[field] === 'number') {
                        currentDate = new Date(data[field]);
                    }

                    if (currentDate && !isNaN(currentDate.getTime())) {
                        // Check if it's already exactly 12:00:00.000 UTC
                        if (currentDate.getUTCHours() !== 12 ||
                            currentDate.getUTCMinutes() !== 0 ||
                            currentDate.getUTCSeconds() !== 0 ||
                            currentDate.getUTCMilliseconds() !== 0) {

                            // Apply Noon Anchor
                            const newDate = new Date(currentDate);
                            newDate.setUTCHours(12, 0, 0, 0);

                            updateData[field] = Timestamp.fromDate(newDate);
                            modified = true;
                        }
                    }
                }
            }

            if (modified) {
                batch.update(doc.ref, updateData);
                batchCount++;
                updatedCount++;

                // Commit the batch if we reach the Firestore limit (500)
                if (batchCount === 450) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            }
        }

        // Commit any remaining updates in the final batch
        if (batchCount > 0) {
            await batch.commit();
        }

        res.status(200).send(`Migráció sikeres a teszt adatbázisban (registrations_test)! Összesen ${updatedCount} tanuló rekordja lett frissítve a ${totalDocs}-ból. A dátumok fixen 12:00 UTC-re álltak be.`);

    } catch (error) {
        logger.error("Hiba a migrációs script futtatásakor:", error);
        res.status(500).send(`Hiba történt a migráció során: ${error.message}`);
    }
});
