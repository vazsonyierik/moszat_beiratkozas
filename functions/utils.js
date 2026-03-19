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
        second: "2-digit",
        timeZone: "Europe/Budapest"
    });
};

// Ellenőrzi, hogy a tanuló 18 év alatti-e a megadott születési dátum alapján.
const isUnder18 = (birthDateStr) => {
    if (!birthDateStr) return false;
    // ...
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
 * A beégetett sablon változóit is cserélni tudó függvény.
 * Csak az adatbázisból betöltött sablonokhoz használjuk.
 */
const replaceTemplateVariables = (templateString, data) => {
    if (!templateString) return "";
    return templateString.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
        // Kezeli a beágyazott objektum tulajdonságokat is, bár itt nem jellemző
        const keys = path.split(".");
        let value = data;
        for (const key of keys) {
            if (value === undefined || value === null) break;
            value = value[key];
        }
        return value !== undefined && value !== null ? value : match;
    });
};

/**
 * Dinamikus e-mail küldő segédfüggvény
 * Először megpróbálja az adatbázisból betölteni a sablont (templateId alapján).
 * Ha nem találja, a fallbackTemplate-et használja (ami a régi kódolt sablon).
 *
 * @param {string} templateId A sablon azonosítója az adatbázisban (pl. 'bookingConfirmation').
 * @param {object} templateData A helyőrzők behelyettesítéséhez használt adatok.
 * @param {object} fallbackTemplate A beégetett sablon (subject, html), ha az adatbázisban nincs meg.
 * @param {boolean} isTest Teszt üzemmód jelző.
 */
const sendDynamicEmail = async (templateId, templateData, fallbackTemplate, isTest = false) => {
    const db = getFirestore();

    if (!templateData.email) {
        logger.error("Student data is missing email, cannot send.", {studentId: templateData.id});
        return;
    }

    let finalSubject = fallbackTemplate?.subject || "";
    let finalHtml = fallbackTemplate?.html || "";
    let isEnabled = true;

    try {
        // Próbáljuk meg betölteni a sablont a Firestore-ból
        const templateDoc = await db.collection("email_templates").doc(templateId).get();
        if (templateDoc.exists) {
            const dynamicTemplate = templateDoc.data();
            
            // Mindig figyeljük a kapcsolót, függetlenül attól, hogy van-e szöveg elmentve
            if (dynamicTemplate.enabled !== undefined) {
                isEnabled = dynamicTemplate.enabled;
            }

            // Csak akkor cseréljük le a beégetett sablont a db-s sablonra,
            // ha a db-ben ténylegesen VAN is elmentve valamilyen szöveg
            if (dynamicTemplate.subject && dynamicTemplate.html) {
                // Behelyettesítjük a változókat a Firestore-ból jött sablonba
                finalSubject = replaceTemplateVariables(dynamicTemplate.subject, templateData);
                finalHtml = replaceTemplateVariables(dynamicTemplate.html, templateData);
                logger.info(`Using dynamic template from DB for ${templateId}`);
            } else {
                logger.warn(`DynamicTemplate ${templateId} exists but is missing subject or html, using fallback content. Enabled state: ${isEnabled}`);
            }
        }
    } catch (error) {
        logger.error(`Error loading dynamic template ${templateId}, using fallback.`, error);
    }
    
    // Ha a sablon ki van kapcsolva az adatbázisban, megszakítjuk a küldést
    if (isEnabled === false) {
        logger.info(`Template ${templateId} is disabled. Skipping email send for ${templateData.email}.`);
        return;
    }

    if (!finalSubject || !finalHtml) {
        logger.error("Email template (dynamic or fallback) is invalid.", {studentId: templateData.id});
        return;
    }

    // ÚJ: Ellenőrizzük, hogy a teszt emailek engedélyezve vannak-e
    if (isTest) {
        try {
            const configDoc = await db.collection("settings").doc("testConfig").get();
            if (configDoc.exists) {
                const config = configDoc.data();
                if (config.emailsEnabled === false) {
                    logger.info("Test emails are disabled in settings. Skipping email send.", {to: templateData.email});
                    return;
                }
            }
        } catch (error) {
            logger.warn("Failed to check test email settings. Proceeding with send.", {error: error.message});
        }
    }

    const subjectPrefix = isTest ? "[TESZT] " : "";

    const mailPayload = {
        to: templateData.email,
        from: "\"Mosolyzóna, a Kreszprofesszor autósiskolája\" <iroda@mosolyzona.hu>",
        message: {
            subject: `${subjectPrefix}${finalSubject}`,
            html: finalHtml,
        },
    };
    if (isUnder18(templateData.birthDate) && templateData.guardian_email) {
        mailPayload.cc = templateData.guardian_email;
    }
    try {
        await db.collection("mail").add(mailPayload);
        logger.info(`Email added to queue for ${templateData.email}. Template ID: ${templateId}`);
    } catch (error) {
        logger.error(`Failed to queue email for ${templateData.email}. Error: ${error.message}`);
    }
};

const sendEmail = async (studentData, template, isTest = false) => {
    // We should ideally use sendDynamicEmail for everything to respect the toggles
    
    // Extracted from templates, we need the templateId. Assuming template.id exists, or we try to find it
    const templateId = template.id || "unknown";

    // Call sendDynamicEmail directly to handle toggle logic and DB fallback
    // This allows legacy `sendEmail` calls to benefit from DB toggles
    return sendDynamicEmail(templateId, studentData, template, isTest);
};

// A függvények exportálása CommonJS szintaxissal.
module.exports = {
    formatFullName,
    formatSingleTimestamp,
    isUnder18,
    isAdmin,
    ensureIsAdmin,
    sendEmail,
    sendDynamicEmail,
    replaceTemplateVariables // Exporting this for testing just in case
};
