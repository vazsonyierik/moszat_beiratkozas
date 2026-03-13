const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// FONTOS: Feltételezzük, hogy az admin már inicializálva van az index.js-ben
const db = admin.firestore();

// Segédfüggvény a jogosultság ellenőrzéséhez (az index.js-ből)
// Ezt később átadhatjuk importtal, de mivel ez ugyanabban a projektben fut,
// újraírjuk a validációt (email alapú admin).
async function ensureIsAdmin(authData) {
    if (!authData || !authData.token || !authData.token.email) {
        throw new HttpsError('unauthenticated', 'A művelethez hitelesítés szükséges.');
    }
    const adminDoc = await db.collection('admins').doc(authData.token.email).get();
    if (!adminDoc.exists) {
        throw new HttpsError('permission-denied', 'Nincs adminisztrátori jogosultságod.');
    }
}

// ============================================================================
// = PUBIKUS VÉGPONTOK (TANULÓKNAK)
// ============================================================================

exports.bookAppointment = onCall({ region: "europe-west3", cors: true }, async (request) => {
    const { courseId, studentInfo, isTestMode } = request.data;
    
    // Validáció
    if (!courseId || !studentInfo || !studentInfo.email || !studentInfo.lastName || !studentInfo.firstName) {
        throw new HttpsError("invalid-argument", "Hiányzó adatok a jelentkezéshez.");
    }
    
    // Prefix a teszt módú emailekhez, és kollekciókhoz
    const courseCollectionName = isTestMode ? "courses_test" : "courses";
    const bookingCollectionName = isTestMode ? "bookings_test" : "bookings";
    const testPrefix = isTestMode ? "[TEST] " : "";

    const { lastName, firstName, email } = studentInfo;
    const courseRef = db.doc(`${courseCollectionName}/${courseId}`);
    const bookingsCollectionRef = courseRef.collection(bookingCollectionName);

    try {
        let bookingData;
        await db.runTransaction(async (transaction) => {
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A kiválasztott foglalkozás nem létezik vagy már törölték.");
            }
            const courseData = courseDoc.data();

            // 1. Üresedés / Létszám ellenőrzése
            const allBookingsSnapshot = await transaction.get(bookingsCollectionRef);
            if (allBookingsSnapshot.size >= courseData.maxParticipants) {
                throw new HttpsError("resource-exhausted", "Sajnos a kiválasztott foglalkozás már betelt.");
            }

            // 2. Duplikáció ellenőrzése e-mail alapján
            const existingBookingQuery = bookingsCollectionRef.where("email", "==", email);
            const existingBookingSnapshot = await transaction.get(existingBookingQuery);
            if (!existingBookingSnapshot.empty) {
                throw new HttpsError("already-exists", "Ezzel az e-mail címmel már jelentkeztél erre a foglalkozásra.");
            }

            // 3. Jelentkezés elmentése
            const newBookingRef = bookingsCollectionRef.doc();
            bookingData = {
                lastName: lastName.trim(),
                firstName: firstName.trim(),
                email: email,
                bookingDate: admin.firestore.FieldValue.serverTimestamp(),
                courseId: courseId,
                courseName: courseData.title,
                courseDate: courseData.date,
                startTime: courseData.time.split('-')[0].trim(),
                isPresent: false,
                infoEmailSent: false,
                feePaid: false
            };

            transaction.set(newBookingRef, bookingData);
        });

        // 4. Visszaigazoló e-mail küldése (ha a beállítások engedik)
        let sendEmail = true;
        if (isTestMode) {
            const testConfigDoc = await db.collection("settings").doc("testConfig").get();
            if (testConfigDoc.exists && testConfigDoc.data().emailsEnabled === false) {
                sendEmail = false;
                logger.info("Teszt e-mail küldés le van tiltva a beállításokban.");
            }
        }

        if (sendEmail) {
            // Itt a Firebase Extension (Trigger Email) kollekcióját használjuk,
            // ami ugyanaz a mechanizmus, mint a `moszat_beiratkozas` rendszerben a `sendEmail` végpontnál.
            await db.collection("mail").add({
                to: email,
                message: {
                    subject: `${testPrefix}Sikeres jelentkezés: ${bookingData.courseName} (${bookingData.courseDate})`,
                    text: `Kedves ${bookingData.firstName}!\n\nSikeresen jelentkeztél a következő foglalkozásra:\n\n` +
                          `Kurzus: ${bookingData.courseName}\n` +
                          `Dátum: ${bookingData.courseDate}\n` +
                          `Kezdés: ${bookingData.startTime}\n\n` +
                          `Várunk szeretettel!\nMosolyzóna Autósiskola`,
                    html: `
                    <div style="font-family: sans-serif;">
                        <h2>${testPrefix}Sikeres jelentkezés</h2>
                        <p>Kedves <strong>${bookingData.firstName}</strong>!</p>
                        <p>Sikeresen rögzítettük a jelentkezésedet a következő foglalkozásra:</p>
                        <ul>
                            <li><strong>Kurzus:</strong> ${bookingData.courseName}</li>
                            <li><strong>Dátum:</strong> ${bookingData.courseDate}</li>
                            <li><strong>Kezdés:</strong> ${bookingData.startTime}</li>
                        </ul>
                        <br>
                        <p>Várunk szeretettel!</p>
                        <p>Üdvözlettel,<br><strong>Mosolyzóna Autósiskola</strong></p>
                    </div>`
                }
            });
            logger.info(`Visszaigazoló e-mail sorba állítva a mail kollekcióban: ${email}`);
        }

        return { success: true, message: "Sikeres jelentkezés!" };

    } catch (error) {
        logger.error("Hiba a jelentkezés során:", error);
        // Ha mi dobtuk a HttpsError-t (pl. betelt), azt adjuk vissza
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Váratlan hiba történt a jelentkezés során.");
    }
});

// ============================================================================
// = ADMIN VÉGPONTOK
// ============================================================================

exports.addStudentAsAdmin = onCall({ region: "europe-west3", cors: true }, async (request) => {
    await ensureIsAdmin(request.auth);
    const { courseId, studentInfo, isPresent, isTestMode } = request.data;
    
    if (!courseId || !studentInfo || !studentInfo.email || !studentInfo.lastName || !studentInfo.firstName) {
        throw new HttpsError("invalid-argument", "Hiányzó adatok a tanuló hozzáadásához.");
    }

    const courseCollectionName = isTestMode ? "courses_test" : "courses";
    const bookingCollectionName = isTestMode ? "bookings_test" : "bookings";
    
    const { lastName, firstName, email } = studentInfo;
    const courseRef = db.doc(`${courseCollectionName}/${courseId}`);
    const bookingsCollectionRef = courseRef.collection(bookingCollectionName);

    try {
        await db.runTransaction(async (transaction) => {
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A foglalkozás nem létezik.");
            }
            const courseData = courseDoc.data();

            // Admin hozzáadásánál is ellenőrizzük, van-e már ilyen e-mail (hogy elkerüljük a duplikációt)
            const existingBookingQuery = bookingsCollectionRef.where("email", "==", email);
            const existingBookingSnapshot = await transaction.get(existingBookingQuery);
            if (!existingBookingSnapshot.empty) {
                throw new HttpsError("already-exists", "Ezzel az e-mail címmel már létezik regisztráció ehhez a foglalkozáshoz.");
            }

            const newBookingRef = bookingsCollectionRef.doc();
            transaction.set(newBookingRef, {
                lastName: lastName.trim(),
                firstName: firstName.trim(),
                email: email,
                bookingDate: admin.firestore.FieldValue.serverTimestamp(),
                courseId: courseId,
                courseName: courseData.title,
                courseDate: courseData.date,
                startTime: courseData.time.split('-')[0].trim(),
                isPresent: isPresent === true,
                infoEmailSent: false,
                feePaid: false,
                addedByAdmin: true
            });
        });

        // Visszaigazoló e-mail küldése, mert admin adta hozzá
        let sendEmail = true;
        if (isTestMode) {
            const testConfigDoc = await db.collection("settings").doc("testConfig").get();
            if (testConfigDoc.exists && testConfigDoc.data().emailsEnabled === false) {
                sendEmail = false;
            }
        }

        if (sendEmail) {
            const courseDoc = await courseRef.get();
            const courseData = courseDoc.data();
            const testPrefix = isTestMode ? "[TEST] " : "";

            await db.collection("mail").add({
                to: studentInfo.email,
                message: {
                    subject: `${testPrefix}Sikeres jelentkezés (Admin rögzítette): ${courseData.title} (${courseData.date})`,
                    text: `Kedves ${studentInfo.firstName}!\n\nAutósiskolánk rögzítette a jelentkezésedet a következő foglalkozásra:\n\n` +
                          `Kurzus: ${courseData.title}\n` +
                          `Dátum: ${courseData.date}\n` +
                          `Kezdés: ${courseData.time.split('-')[0].trim()}\n\n` +
                          `Várunk szeretettel!\nMosolyzóna Autósiskola`,
                    html: `
                    <div style="font-family: sans-serif;">
                        <h2>${testPrefix}Sikeres jelentkezés</h2>
                        <p>Kedves <strong>${studentInfo.firstName}</strong>!</p>
                        <p>Autósiskolánk rögzítette a jelentkezésedet a következő foglalkozásra:</p>
                        <ul>
                            <li><strong>Kurzus:</strong> ${courseData.title}</li>
                            <li><strong>Dátum:</strong> ${courseData.date}</li>
                            <li><strong>Kezdés:</strong> ${courseData.time.split('-')[0].trim()}</li>
                        </ul>
                        <br>
                        <p>Várunk szeretettel!</p>
                        <p>Üdvözlettel,<br><strong>Mosolyzóna Autósiskola</strong></p>
                    </div>`
                }
            });
            logger.info(`Visszaigazoló e-mail sorba állítva az admin által hozzáadott tanulónak: ${studentInfo.email}`);
        }

        return { success: true, message: "Tanuló sikeresen hozzáadva." };
    } catch (error) {
        logger.error("Hiba az admin tanuló hozzáadás során:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Váratlan hiba történt a mentés során.");
    }
});

exports.toggleBookingStatus = onCall({ region: "europe-west3", cors: true }, async (request) => {
    await ensureIsAdmin(request.auth);
    const { courseId, bookingId, field, value, isTestMode } = request.data;

    if (!courseId || !bookingId || !field) {
         throw new HttpsError("invalid-argument", "Hiányzó azonosítók vagy mező.");
    }

    const allowedFields = ['isPresent', 'feePaid', 'infoEmailSent'];
    if (!allowedFields.includes(field)) {
         throw new HttpsError("invalid-argument", "Érvénytelen státusz mező.");
    }

    const courseCollectionName = isTestMode ? "courses_test" : "courses";
    const bookingCollectionName = isTestMode ? "bookings_test" : "bookings";
    
    const bookingRef = db.doc(`${courseCollectionName}/${courseId}/${bookingCollectionName}/${bookingId}`);
    
    try {
        await bookingRef.update({ [field]: value });
        return { success: true };
    } catch (error) {
        logger.error("Hiba a státusz frissítésénél:", error);
        throw new HttpsError("internal", "Váratlan hiba történt a státusz frissítése során.");
    }
});

exports.deleteBookingAsAdmin = onCall({ region: "europe-west3", cors: true }, async (request) => {
    await ensureIsAdmin(request.auth);
    const { courseId, bookingId, reason, isTestMode } = request.data;
    
    if (!courseId || !bookingId) {
        throw new HttpsError("invalid-argument", "Hiányzó kurzus vagy jelentkezés azonosító.");
    }

    const courseCollectionName = isTestMode ? "courses_test" : "courses";
    const bookingCollectionName = isTestMode ? "bookings_test" : "bookings";
    
    const courseRef = db.doc(`${courseCollectionName}/${courseId}`);
    const bookingRef = db.doc(`${courseCollectionName}/${courseId}/${bookingCollectionName}/${bookingId}`);

    try {
        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists) {
            throw new HttpsError("not-found", "A jelentkezés nem található.");
        }
        const bookingData = bookingDoc.data();

        const courseDoc = await courseRef.get();
        const courseData = courseDoc.exists ? courseDoc.data() : { title: bookingData.courseName, date: bookingData.courseDate };

        await bookingRef.delete();
        logger.info(`Admin törölte a jelentkezést: ${bookingId} Kurzus: ${courseId}. Ok: ${reason}`);

        // Törlésről szóló értesítő e-mail küldése
        let sendEmail = true;
        if (isTestMode) {
            const testConfigDoc = await db.collection("settings").doc("testConfig").get();
            if (testConfigDoc.exists && testConfigDoc.data().emailsEnabled === false) {
                sendEmail = false;
            }
        }

        if (sendEmail && bookingData.email) {
            const testPrefix = isTestMode ? "[TEST] " : "";
            await db.collection("mail").add({
                to: bookingData.email,
                message: {
                    subject: `${testPrefix}Jelentkezés törölve: ${courseData.title} (${courseData.date})`,
                    text: `Kedves ${bookingData.firstName}!\n\nTájékoztatunk, hogy a(z) ${courseData.title} kurzusra (${courseData.date}) leadott jelentkezésedet töröltük.\n\n` +
                          `Kérjük, vedd fel velünk a kapcsolatot, ha kérdésed van.\n\n` +
                          `Üdvözlettel,\nMosolyzóna Autósiskola`,
                    html: `
                    <div style="font-family: sans-serif;">
                        <h2>${testPrefix}Jelentkezés törölve</h2>
                        <p>Kedves <strong>${bookingData.firstName}</strong>!</p>
                        <p>Tájékoztatunk, hogy a következő foglalkozásra leadott jelentkezésedet <strong>töröltük</strong>:</p>
                        <ul>
                            <li><strong>Kurzus:</strong> ${courseData.title}</li>
                            <li><strong>Dátum:</strong> ${courseData.date}</li>
                        </ul>
                        <br>
                        <p>Kérjük, vedd fel velünk a kapcsolatot, ha bármilyen kérdésed lenne ezzel kapcsolatban.</p>
                        <p>Üdvözlettel,<br><strong>Mosolyzóna Autósiskola</strong></p>
                    </div>`
                }
            });
            logger.info(`Törlés értesítő e-mail sorba állítva a tanulónak: ${bookingData.email}`);
        }

        return { success: true, message: "Jelentkezés sikeresen törölve." };
    } catch (error) {
        logger.error("Hiba a jelentkezés törlése során:", error);
        throw new HttpsError("internal", "Váratlan hiba történt a törlés során.");
    }
});

exports.deleteCourseAsAdmin = onCall({ region: "europe-west3", cors: true }, async (request) => {
    await ensureIsAdmin(request.auth);
    const { courseId, reason, isTestMode } = request.data;
    
    if (!courseId) {
        throw new HttpsError("invalid-argument", "Hiányzó kurzus azonosító.");
    }

    const courseCollectionName = isTestMode ? "courses_test" : "courses";
    const bookingCollectionName = isTestMode ? "bookings_test" : "bookings";
    
    const courseRef = db.doc(`${courseCollectionName}/${courseId}`);
    const bookingsCollectionRef = courseRef.collection(bookingCollectionName);

    try {
        // 1. Összes jelentkezés (alkollekció) törlése kötegekben (batch)
        const bookingsSnapshot = await bookingsCollectionRef.get();
        if (!bookingsSnapshot.empty) {
            let batch = db.batch();
            let batchCount = 0;

            for (const doc of bookingsSnapshot.docs) {
                batch.delete(doc.ref);
                batchCount++;

                if (batchCount === 400) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }
        }

        // 2. Maga a kurzus törlése
        await courseRef.delete();

        logger.info(`Admin törölte a kurzust: ${courseId}. Ok: ${reason}`);
        return { success: true, message: "Kurzus és a hozzá tartozó jelentkezések sikeresen törölve." };
    } catch (error) {
        logger.error("Hiba a kurzus törlése során:", error);
        throw new HttpsError("internal", "Váratlan hiba történt a kurzus törlése során.");
    }
});

// ============================================================================
// = NAPI EMLÉKEZTETŐ (CRON)
// ============================================================================

exports.sendDailyReminders = onSchedule({ schedule: "every day 09:00", timeZone: "Europe/Budapest", region: "europe-west3" }, async (event) => {
    logger.info("Napi emlékeztető küldés elindult a másnapi kurzusokhoz.");

    // Budapesti idő szerinti holnapi dátum string generálása (YYYY-MM-DD)
    const budapestFormatter = new Intl.DateTimeFormat('hu-HU', {
        timeZone: 'Europe/Budapest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    // Egy nap múlva (24 óra) a jelenlegi időponttól
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const parts = budapestFormatter.formatToParts(tomorrow);
    
    let year = '', month = '', day = '';
    for (const part of parts) {
        if (part.type === 'year') year = part.value;
        if (part.type === 'month') month = part.value;
        if (part.type === 'day') day = part.value;
    }
    const tomorrowStr = `${year}-${month}-${day}`;

    // ÉLES KURZUSOK FELDOLGOZÁSA (A teszt módúakat a Cron Job most figyelmen kívül hagyja, hogy biztonságos legyen)
    const coursesSnapshot = await db.collection("courses").where("date", "==", tomorrowStr).get();
    
    if (coursesSnapshot.empty) {
        logger.info(`Nincs meghirdetett kurzus holnapra (${tomorrowStr}).`);
        return null;
    }

    let emailsSent = 0;

    for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        const bookingsSnapshot = await courseDoc.ref.collection("bookings").get();

        for (const bookingDoc of bookingsSnapshot.docs) {
            const booking = bookingDoc.data();

            // Csak akkor küldünk, ha van email címe
            if (booking.email) {
                await db.collection("mail").add({
                    to: booking.email,
                    message: {
                        subject: `Emlékeztető - Közelgő foglalkozás holnap: ${courseData.title}`,
                        text: `Kedves ${booking.firstName}!\n\nSzeretnénk emlékeztetni, hogy korábbi jelentkezésed alapján a következő foglalkozásunkra várunk holnap:\n\n` +
                              `Kurzus: ${courseData.title}\n` +
                              `Dátum: ${courseData.date}\n` +
                              `Időtartam: ${courseData.time}\n` +
                              `Helyszín: ${courseData.location}\n\n` +
                              `Kérjük érkezz pontosan!\nMosolyzóna Autósiskola`,
                        html: `
                        <div style="font-family: sans-serif;">
                            <h2>Emlékeztető – közelgő foglalkozás</h2>
                            <p>Kedves <strong>${booking.firstName}</strong>!</p>
                            <p>Szeretnénk emlékeztetni, hogy korábbi jelentkezésed alapján a következő foglalkozásunkra várunk <strong>holnap</strong>:</p>
                            <ul>
                                <li><strong>Kurzus:</strong> ${courseData.title}</li>
                                <li><strong>Dátum:</strong> ${courseData.date}</li>
                                <li><strong>Időtartam:</strong> ${courseData.time}</li>
                                <li><strong>Helyszín:</strong> ${courseData.location}</li>
                            </ul>
                            <br>
                            <p>Kérjük, érkezz pontosan a megadott helyszínre!</p>
                            <p>Üdvözlettel,<br><strong>Mosolyzóna Autósiskola</strong></p>
                        </div>`
                    }
                });
                emailsSent++;
            }
        }
    }

    logger.info(`Napi emlékeztető lefutott. Összesen ${emailsSent} emlékeztető e-mail sorba állítva.`);
    return null;
});
