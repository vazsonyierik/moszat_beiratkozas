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

// Helper function to format date (YYYY-MM-DD to YYYY. MM. DD.)
function formatCourseDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
        return `${parts[0]}. ${parts[1]}. ${parts[2]}.`;
    }
    return dateStr;
}

/**
 * A beégetett sablon változóit is cserélni tudó függvény.
 * Csak az adatbázisból betöltött sablonokhoz használjuk.
 */
const replaceTemplateVariables = (templateString, data) => {
    if (!templateString) return "";
    
    // Bármit megtalál a {{ és }} között, beleértve sortöréseket is
    return templateString.replace(/\{\{([\s\S]*?)\}\}/g, (match, rawInner) => {
        // HTML tagek kiszűrése és szóközök levágása a változó neve körül
        const path = rawInner.replace(/<[^>]*>?/gm, '').trim();
        
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

    // Számítsuk ki a címzett e-mail címét (alapértelmezett: a tanuló e-mailje)
    let recipientEmail = templateData.email;

    // Ha az orvosnak küldünk emlékeztetőt, akkor a templateData.email lehet, hogy hiányzik (ha csak a kurzusadatokat kapta meg).
    // Később ezt felülírhatjuk az adatbázisban lévő doctorEmail-lel.
    if (!recipientEmail && templateId !== 'doctorMedicalReminder') {
        logger.error("Student data is missing email, cannot send.", {studentId: templateData.id});
        return;
    }

    let finalSubject = fallbackTemplate?.subject || "";
    let finalHtml = fallbackTemplate?.html || "";
    let isEnabled = true;
    let dbDoctorEmail = null;

    try {
        // Próbáljuk meg betölteni a sablont a Firestore-ból
        const templateDoc = await db.collection("email_templates").doc(templateId).get();
        if (templateDoc.exists) {
            const dynamicTemplate = templateDoc.data();
            
            // Mindig figyeljük a kapcsolót, függetlenül attól, hogy van-e szöveg elmentve
            if (dynamicTemplate.enabled !== undefined) {
                isEnabled = dynamicTemplate.enabled;
            }

            // MAP DATA FOR TEMPLATES EARLY: Ensure standardized variable names are available for DB interpolation
            // Frontend editor templates use {{firstName}}, {{lastName}}, {{secondName}}
            // but the underlying student record might only have current_firstName, etc.
            const mappedTemplateData = { ...templateData };
            if (mappedTemplateData.current_firstName && !mappedTemplateData.firstName) {
                mappedTemplateData.firstName = mappedTemplateData.current_firstName;
            }
            if (mappedTemplateData.current_lastName && !mappedTemplateData.lastName) {
                mappedTemplateData.lastName = mappedTemplateData.current_lastName;
            }
            if (mappedTemplateData.current_secondName !== undefined && mappedTemplateData.secondName === undefined) {
                mappedTemplateData.secondName = mappedTemplateData.current_secondName;
            }

            // Generate a clean {{fullName}} property just like the backend getFullName()
            if (!mappedTemplateData.fullName) {
                mappedTemplateData.fullName = [
                    mappedTemplateData.lastName, 
                    mappedTemplateData.firstName, 
                    mappedTemplateData.secondName
                ].filter(Boolean).join(" ");
            }
            
            // Create a formatted reason HTML property if reason exists
            if (mappedTemplateData.reason) {
                mappedTemplateData.reason_formatted = `<p><strong>Indoklás:</strong> ${mappedTemplateData.reason}</p>`;
            } else {
                mappedTemplateData.reason_formatted = '';
            }

            // Format course date if it exists
            if (mappedTemplateData.courseDate) {
                mappedTemplateData.courseDate = formatCourseDate(mappedTemplateData.courseDate);
            }

            // Ha orvosi emlékeztetőről van szó, olvassuk ki az orvos e-mail címét az adatbázisból is.
            if (templateId === 'doctorMedicalReminder' && dynamicTemplate.doctorEmail) {
                dbDoctorEmail = dynamicTemplate.doctorEmail;
            }

            // Csak akkor cseréljük le a beégetett sablont a db-s sablonra,
            // ha a db-ben ténylegesen VAN is elmentve valamilyen szöveg
            if (dynamicTemplate.subject && dynamicTemplate.html) {
                // Behelyettesítjük a változókat a Firestore-ból jött sablonba
                finalSubject = replaceTemplateVariables(dynamicTemplate.subject, mappedTemplateData);
                finalHtml = replaceTemplateVariables(dynamicTemplate.html, mappedTemplateData);
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

    // Orvosi emlékeztető esetén a címzett felülírása
    if (templateId === 'doctorMedicalReminder') {
        recipientEmail = dbDoctorEmail || fallbackTemplate?.doctorEmail || "dr.minta@example.com";
    }

    if (!recipientEmail) {
        logger.error("Recipient email is missing, cannot send.", {templateId});
        return;
    }

    // ÚJ: Ellenőrizzük, hogy a teszt emailek engedélyezve vannak-e
    if (isTest) {
        try {
            const configDoc = await db.collection("settings").doc("testConfig").get();
            if (configDoc.exists) {
                const config = configDoc.data();
                if (config.emailsEnabled === false) {
                    logger.info("Test emails are disabled in settings. Skipping email send.", {to: recipientEmail});
                    return;
                }
            }
        } catch (error) {
            logger.warn("Failed to check test email settings. Proceeding with send.", {error: error.message});
        }
    }

    const subjectPrefix = isTest ? "[TESZT] " : "";

    const mailPayload = {
        to: recipientEmail,
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
