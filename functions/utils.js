/**
 * functions/utils.js
 * Segédfüggvények a Cloud Functions számára (CommonJS modulként).
 */

// Formátumozza a teljes nevet az alkotóelemekből.
const formatFullName = (prefix, first, last, second) => {
    return [prefix, last, first, second].filter(Boolean).join(" ");
};

// Formátumoz egy Firestore időbélyeget egyetlen lokalizált karakterlánccá.
const formatSingleTimestamp = (timestamp) => {
    // JAVÍTÁS: Ha az időbélyeg nem létezik, üres stringet ad vissza,
    // nem pedig az aktuális időt.
    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "";
    }
    const d = timestamp.toDate();
    return d.toLocaleString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Budapest"
    });
};

// Ellenőrzi, hogy a tanuló 18 év alatti-e a születési dátuma alapján.
const isUnder18 = (birthDateStr) => {
    if (!birthDateStr) return false;
    const cleanedDateStr = birthDateStr.endsWith(".") ? birthDateStr.slice(0, -1) : birthDateStr;
    const parts = cleanedDateStr.split(".").map(p => parseInt(p.trim(), 10));
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const [year, month, day] = parts;
    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age < 18;
};

/**
 * Ellenőrzi, hogy egy adott e-mail cím adminisztrátor-e.
 * Ezt úgy végzi el, hogy megkeresi a doc-ot az admins kollekcióban.
 * Mivel a functions könyvtár használja a getFirestore-t a utils-ban, azt itt is be kell húzni,
 * vagy átadni az adatbázist. Mivel a `utils` még nem húzza be a firestore-t,
 * behúzzuk most ide is.
 */
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const isAdmin = async (email) => {
    if (!email) return false;
    const db = getFirestore();
    const adminRef = db.doc(`admins/${email}`);
    const adminSnap = await adminRef.get();
    return adminSnap.exists;
};

const ensureIsAdmin = async (auth) => {
    const userEmail = auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        const {HttpsError} = require("firebase-functions/v2/https");
        throw new HttpsError("permission-denied", "Nincs jogosultságod a funkció futtatásához.");
    }
};

/**
 * Központi e-mail küldő segédfüggvény
 * @param {object} studentData A címzett adatai.
 * @param {object} template Az e-mail sablon.
 * @param {boolean} isTest Teszt üzemmód jelző.
 */
const sendEmail = async (studentData, template, isTest = false) => {
    const db = getFirestore();

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
        logger.info(`Email added to queue for ${studentData.email}. Template: ${template.subject}`);
    } catch (error) {
        logger.error(`Failed to queue email for ${studentData.email}. Error: ${error.message}`);
    }
};

// A függvények exportálása CommonJS szintaxissal.
module.exports = {
    formatFullName,
    formatSingleTimestamp,
    isUnder18,
    isAdmin,
    ensureIsAdmin,
    sendEmail
};
