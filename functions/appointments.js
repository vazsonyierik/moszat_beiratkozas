const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const crypto = require("crypto");
const {ensureIsAdmin, sendDynamicEmail} = require("./utils");
const templates = require("./emailTemplates");

/**
 * createMultipleCourses
 * Creates multiple courses/appointments in a single batch.
 */
exports.createMultipleCourses = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const {courses, isTestView} = data;

    if (!Array.isArray(courses) || courses.length === 0) {
        throw new HttpsError("invalid-argument", "A foglalkozások listája érvénytelen vagy üres.");
    }

    const db = getFirestore();
    const collectionName = isTestView ? "courses_test" : "courses";
    const batch = db.batch();
    const collectionRef = db.collection(collectionName);

    try {
        for (const course of courses) {
            const {name, date, startTime, endTime, capacity} = course;
            
            if (!name || !date || !startTime || !endTime || !capacity) {
                throw new HttpsError("invalid-argument", "Minden kötelező mezőt ki kell tölteni a generált időpontoknál.");
            }

            if (capacity <= 0) {
                throw new HttpsError("invalid-argument", "A kapacitásnak nagyobbnak kell lennie 0-nál.");
            }

            const newDocRef = collectionRef.doc();
            batch.set(newDocRef, {
                name,
                date,
                startTime,
                endTime,
                capacity: parseInt(capacity, 10),
                bookingsCount: 0,
                createdAt: FieldValue.serverTimestamp()
            });
        }

        await batch.commit();
        return {success: true, message: `${courses.length} foglalkozás sikeresen létrehozva.`};
    } catch (error) {
        console.error("Error creating multiple courses:", error);
        throw new HttpsError("internal", "Hiba történt a foglalkozások tömeges létrehozásakor.", error);
    }
});

/**
 * createCourse
 * Creates a new course/appointment.
 */
exports.createCourse = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const {name, date, startTime, endTime, capacity, isTestView} = data;

    if (!name || !date || !startTime || !endTime || !capacity) {
        throw new HttpsError("invalid-argument", "Minden kötelező mezőt ki kell tölteni.");
    }

    if (capacity <= 0) {
        throw new HttpsError("invalid-argument", "A kapacitásnak nagyobbnak kell lennie 0-nál.");
    }

    const db = getFirestore();
    const collectionName = isTestView ? "courses_test" : "courses";

    try {
        const docRef = await db.collection(collectionName).add({
            name,
            date,
            startTime,
            endTime,
            capacity: parseInt(capacity, 10),
            bookingsCount: 0,
            createdAt: FieldValue.serverTimestamp()
        });

        return {success: true, courseId: docRef.id};
    } catch (error) {
        console.error("Error creating course:", error);
        throw new HttpsError("internal", "Hiba történt a foglalkozás létrehozásakor.", error);
    }
});

/**
 * updateCourseAsAdmin
 * Updates an existing course and notifies enrolled students of the changes.
 */
exports.updateCourseAsAdmin = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const {courseId, name, date, startTime, endTime, capacity, isTestView} = data;

    if (!courseId || !name || !date || !startTime || !endTime || !capacity) {
        throw new HttpsError("invalid-argument", "Minden kötelező mezőt ki kell tölteni a módosításhoz.");
    }

    if (capacity <= 0) {
        throw new HttpsError("invalid-argument", "A kapacitásnak nagyobbnak kell lennie 0-nál.");
    }

    const db = getFirestore();
    const collectionName = isTestView ? "courses_test" : "courses";
    const courseRef = db.collection(collectionName).doc(courseId);

    try {
        let oldCourseData = null;
        let activeBookings = [];

        await db.runTransaction(async (transaction) => {
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A módosítani kívánt foglalkozás nem található.");
            }

            oldCourseData = courseDoc.data();

            // Kérjük le a foglalkozáshoz tartozó jelentkezőket, hogy értesíthessük őket
            const bookingsQuery = courseRef.collection("bookings");
            const bookingsSnap = await transaction.get(bookingsQuery);
            
            bookingsSnap.forEach((doc) => {
                activeBookings.push(doc.data());
            });

            // Frissítsük magát a kurzust
            transaction.update(courseRef, {
                name,
                date,
                startTime,
                endTime,
                capacity: parseInt(capacity, 10),
                updatedAt: FieldValue.serverTimestamp()
            });

            // Frissítsük a jelentkezéseken is a kurzus adatait (mind a subcollection-ben, mind a global collection-ben)
            bookingsSnap.forEach((doc) => {
                transaction.update(doc.ref, {
                    courseName: name,
                    courseDate: date,
                    startTime: startTime
                });

                if (doc.data().allBookingId) {
                    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
                    const globalRef = db.collection(allBookingsCollection).doc(doc.data().allBookingId);
                    transaction.update(globalRef, {
                        courseName: name,
                        courseDate: date,
                        startTime: startTime
                    });
                }
            });
        });

        // Ha voltak jelentkezők és a fontos adatok (dátum, idő, név) változtak, küldjünk e-mailt
        const isMajorChange = oldCourseData.date !== date || oldCourseData.startTime !== startTime || oldCourseData.name !== name || oldCourseData.endTime !== endTime;
        
        if (isMajorChange && activeBookings.length > 0) {
            const newCourseData = { name, date, startTime, endTime };
            const emailPromises = activeBookings.map(booking => {
                const combinedData = {
                    ...booking,
                    oldCourseName: oldCourseData.name,
                    oldCourseDate: oldCourseData.date,
                    oldStartTime: oldCourseData.startTime,
                    oldEndTime: oldCourseData.endTime,
                    newCourseName: name,
                    newCourseDate: date,
                    newStartTime: startTime,
                    newEndTime: endTime
                };
                return sendDynamicEmail("courseModified", combinedData, templates.courseModified(combinedData), isTestView);
            });
            await Promise.allSettled(emailPromises);
        }

        return {success: true, message: "Foglalkozás sikeresen módosítva."};
    } catch (error) {
        console.error("Error updating course:", error);
        throw new HttpsError("internal", "Hiba történt a foglalkozás módosításakor.", error);
    }
});

/**
 * deleteCourseAsAdmin
 * Deletes a course/appointment and handles related actions (e.g. notifications) if necessary.
 */
exports.deleteCourseAsAdmin = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const {courseId, isTestView} = data;

    if (!courseId) {
        throw new HttpsError("invalid-argument", "Hiányzó courseId.");
    }

    const db = getFirestore();
    const collectionName = isTestView ? "courses_test" : "courses";
    const courseRef = db.collection(collectionName).doc(courseId);

    try {
        const bookingsToCancel = [];
        let courseData = null;

        await db.runTransaction(async (transaction) => {
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A foglalkozás nem található.");
            }

            courseData = courseDoc.data();

            // Fetch all bookings for this course outside the transaction constraints
            // (or within, but we need to query them first).
            // Actually, in Firebase Admin SDK v10+, transaction.get() supports queries!
            const bookingsQuery = courseRef.collection("bookings");
            const bookingsSnap = await transaction.get(bookingsQuery);

            bookingsSnap.forEach((doc) => {
                bookingsToCancel.push(doc.data());

                // Delete from subcollection
                transaction.delete(doc.ref);

                // Delete from global collections
                if (doc.data().allBookingId) {
                    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
                    const globalRef = db.collection(allBookingsCollection).doc(doc.data().allBookingId);
                    transaction.delete(globalRef);
                }
            });

            // Delete the course document
            transaction.delete(courseRef);
        });

        // Send emails outside the transaction
        if (courseData && bookingsToCancel.length > 0) {
            const emailPromises = bookingsToCancel.map(booking => {
                // ÚJ: Használjuk a dinamikus e-mail küldőt
                return sendDynamicEmail("courseDeleted", booking, templates.courseDeleted(booking), isTestView);
            });
            await Promise.allSettled(emailPromises);
        }

        return {success: true, message: "Foglalkozás sikeresen törölve, e-mailek kiküldve."};
    } catch (error) {
        console.error("Error deleting course:", error);
        throw new HttpsError("internal", "Hiba történt a foglalkozás törlésekor.", error);
    }
});

/**
 * cancelBookingAsAdmin
 * Deletes a student's booking from a course as an admin.
 */
exports.cancelBookingAsAdmin = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const {courseId, studentEmail, isTestView} = data;

    if (!courseId || !studentEmail) {
        throw new HttpsError("invalid-argument", "Hiányzó courseId vagy studentEmail.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";

    const normalizedEmail = studentEmail.toLowerCase().trim();
    const courseRef = db.collection(coursesCollection).doc(courseId);
    const bookingDocRef = courseRef.collection("bookings").doc(normalizedEmail);
    const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);

    try {
        let bookingData = null;

        await db.runTransaction(async (transaction) => {
            const bookingDoc = await transaction.get(bookingDocRef);
            if (!bookingDoc.exists) {
                throw new HttpsError("not-found", "A jelentkezés nem található.");
            }
            bookingData = bookingDoc.data();

            // Delete subcollection document
            transaction.delete(bookingDocRef);

            // Delete global allBookings document
            transaction.delete(globalBookingRef);

            // Decrement course counter
            transaction.update(courseRef, {
                bookingsCount: FieldValue.increment(-1)
            });
        });

        if (bookingData) {
            await sendDynamicEmail("bookingCancelledByAdmin", bookingData, templates.bookingCancelledByAdmin(bookingData), isTestView);
            // Várólista logika meghívása
            await processWaitlist(courseId, isTestView);
        }

        return {success: true, message: "Jelentkezés sikeresen törölve, e-mail kiküldve."};
    } catch (error) {
        console.error("Error cancelling booking:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Hiba történt a jelentkezés törlésekor.", error.message);
    }
});

/**
 * bookAppointment
 * Student creates a booking for a course. Uses a transaction to prevent overbooking.
 */
exports.bookAppointment = onCall({region: "europe-west1"}, async (request) => {
    // Requires some form of auth (Anonymous is fine)
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Be kell jelentkezned a jelentkezéshez.");
    }

    const data = request.data;
    const {courseId, firstName, lastName, email, isTestView} = data;

    if (!courseId || !firstName || !lastName || !email) {
        throw new HttpsError("invalid-argument", "Minden mező kitöltése kötelező.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";

    const courseRef = db.collection(coursesCollection).doc(courseId);
    const bookingsSubcollection = courseRef.collection("bookings");

    try {
        let bookingDataToEmail = null;

        await db.runTransaction(async (transaction) => {
            // 1. Get course to check capacity
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A foglalkozás nem található.");
            }

            const courseData = courseDoc.data();
            const currentBookings = courseData.bookingsCount || 0;

            if (currentBookings >= courseData.capacity) {
                throw new HttpsError("resource-exhausted", "Sajnos ez a foglalkozás időközben betelt. (Course is full)");
            }

            // 2. Check if this email is already registered for THIS course
            const normalizedEmail = email.toLowerCase().trim();
            const bookingDocRef = bookingsSubcollection.doc(normalizedEmail);
            const existingBooking = await transaction.get(bookingDocRef);

            if (existingBooking.exists) {
                throw new HttpsError("already-exists", "Ezzel az e-mail címmel már jelentkeztél erre a foglalkozásra!");
            }

            // 3. Generate cancellation token
            const cancellationToken = crypto.randomUUID();

            // 4. Prepare booking data
            const bookingData = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: normalizedEmail,
                bookingDate: FieldValue.serverTimestamp(),
                courseId: courseId,
                courseName: courseData.name,
                courseDate: courseData.date,
                startTime: courseData.startTime,
                endTime: courseData.endTime || "ismeretlen",
                cancellation_token: cancellationToken,
                isPresent: null,
                feePaid: false,
            };

            // 5. Prepare global reference
            const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);
            bookingData.allBookingId = globalBookingRef.id;

            // 6. Add to subcollection (using email as ID prevents double booking naturally)
            transaction.set(bookingDocRef, bookingData);

            // Add to global allBookings collection
            transaction.set(globalBookingRef, bookingData);

            // 7. Increment course counter
            transaction.update(courseRef, {
                bookingsCount: FieldValue.increment(1)
            });

            bookingDataToEmail = bookingData;
        });

        if (bookingDataToEmail) {
            await sendDynamicEmail("bookingConfirmation", bookingDataToEmail, templates.bookingConfirmation(bookingDataToEmail), isTestView);
        }

        return {success: true};
    } catch (error) {
        console.error("Booking transaction failed:", error);
        // Re-throw known HttpErrors
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Hiba történt a jelentkezés rögzítésekor.", error.message);
    }
});

/**
 * cancelBookingByStudent
 * Student cancels their own booking using a token.
 */
exports.cancelBookingByStudent = onCall({region: "europe-west1"}, async (request) => {
    const data = request.data;
    const {token} = data;

    if (!token) {
        throw new HttpsError("invalid-argument", "Érvénytelen vagy hiányzó azonosító (token).");
    }

    const db = getFirestore();

    try {
        let bookingData = null;
        let courseRefToUpdate = null;
        let bookingRefToDelete = null;
        let globalRefToDelete = null;
        let isTestView = false;

        // Note: Since we don't know if the token is in 'allBookings' or 'allBookings_test',
        // we have to query both. This is fine since it's an uncommon operation.
        let querySnapshot = await db.collection("allBookings").where("cancellation_token", "==", token).limit(1).get();

        if (!querySnapshot.empty) {
            isTestView = false;
        } else {
            querySnapshot = await db.collection("allBookings_test").where("cancellation_token", "==", token).limit(1).get();
            if (!querySnapshot.empty) {
                isTestView = true;
            }
        }

        if (querySnapshot.empty) {
            throw new HttpsError("not-found", "A megadott azonosító nem található vagy a jelentkezés már törölve lett.");
        }

        const globalDoc = querySnapshot.docs[0];
        bookingData = globalDoc.data();
        globalRefToDelete = globalDoc.ref;

        const coursesCollection = isTestView ? "courses_test" : "courses";
        courseRefToUpdate = db.collection(coursesCollection).doc(bookingData.courseId);
        bookingRefToDelete = courseRefToUpdate.collection("bookings").doc(bookingData.email);

        // Perform the deletion in a transaction to safely decrement the count
        await db.runTransaction(async (transaction) => {
            const bookingDoc = await transaction.get(bookingRefToDelete);
            if (!bookingDoc.exists) {
                throw new HttpsError("not-found", "A jelentkezés (már) nem található a foglalkozásnál.");
            }

            transaction.delete(bookingRefToDelete);
            transaction.delete(globalRefToDelete);

            transaction.update(courseRefToUpdate, {
                bookingsCount: FieldValue.increment(-1)
            });
        });

        if (bookingData) {
            await sendDynamicEmail("bookingCancelledByStudent", bookingData, templates.bookingCancelledByStudent(bookingData), isTestView);
            // Várólista logika meghívása
            await processWaitlist(bookingData.courseId, isTestView);
        }

        return {success: true, message: "Jelentkezés sikeresen lemondva."};
    } catch (error) {
        console.error("Error during student cancellation:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Hiba történt a lemondás feldolgozásakor.", error.message);
    }
});

// --- Várólista (Waitlist) funkciók ---

/**
 * processWaitlist
 * Belső segédfüggvény, amely lemondáskor meghívódik a várólista kezelésére.
 */
async function processWaitlist(courseId, isTestView) {
    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const courseRef = db.collection(coursesCollection).doc(courseId);

    try {
        const courseDoc = await courseRef.get();
        if (!courseDoc.exists) return;
        const courseData = courseDoc.data();

        // 1. Van-e egyáltalán szabad hely?
        if (courseData.bookingsCount >= courseData.capacity) {
            return; // Nincs szabad hely, nincs mit tenni
        }

        // 2. Van-e valaki a várólistán?
        const waitlistRef = courseRef.collection("waitlist");
        const waitlistSnap = await waitlistRef.orderBy("joinedAt", "asc").get();
        if (waitlistSnap.empty) {
            return; // Üres a várólista
        }

        // 3. Mennyi idő van hátra a kurzus kezdetéig?
        // A courseData.date formátuma "YYYY-MM-DD", a startTime "HH:mm"
        const courseDateTimeString = `${courseData.date}T${courseData.startTime}:00+01:00`; // Magyar időzóna, kb. jó
        const courseDateObj = new Date(courseData.date + "T" + courseData.startTime + ":00Z"); // UTC anchor biztonság kedvéért (vagy local, függ a beállítástól)

        // Biztosabb módszer a lokális idő kiszámítására:
        const [year, month, day] = courseData.date.split('-');
        const [hours, minutes] = courseData.startTime.split(':');
        // Kezeljük úgy, mintha budapesti idő lenne (ez a szerveren is így fut a timezone miatt, de local date objektumként)
        const courseStartDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();

        const hoursUntilStart = (courseStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilStart > 24) {
            // TÖBB MINT 24 ÓRA: Automatikus bekerülés (1. opció)
            const firstWaitlistUserDoc = waitlistSnap.docs[0];
            const waitlistData = firstWaitlistUserDoc.data();

            // Beírjuk a bookings-ba
            const bookingsSubcollection = courseRef.collection("bookings");
            const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";

            const normalizedEmail = waitlistData.email.toLowerCase().trim();
            const bookingDocRef = bookingsSubcollection.doc(normalizedEmail);
            const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);
            const cancellationToken = crypto.randomUUID();

            const bookingData = {
                firstName: waitlistData.firstName,
                lastName: waitlistData.lastName,
                email: normalizedEmail,
                phoneNumber: waitlistData.phoneNumber || "",
                bookingDate: FieldValue.serverTimestamp(),
                courseId: courseId,
                courseName: courseData.name,
                courseDate: courseData.date,
                startTime: courseData.startTime,
                endTime: courseData.endTime || "ismeretlen",
                cancellation_token: cancellationToken,
                isPresent: null,
                feePaid: false,
                allBookingId: globalBookingRef.id,
                promotedFromWaitlist: true
            };

            await db.runTransaction(async (transaction) => {
                // Ellenőrizzük megint a kapacitást tranzakcióban
                const tCourseDoc = await transaction.get(courseRef);
                const tCourseData = tCourseDoc.data();
                if (tCourseData.bookingsCount >= tCourseData.capacity) {
                    throw new Error("Közben betelt.");
                }

                // Hozzáadás
                transaction.set(bookingDocRef, bookingData);
                transaction.set(globalBookingRef, bookingData);

                // Törlés a várólistáról
                transaction.delete(firstWaitlistUserDoc.ref);

                // Létszám növelése
                transaction.update(courseRef, {
                    bookingsCount: FieldValue.increment(1)
                });
            });

            // Értesítő e-mail küldése
            await sendDynamicEmail("waitlistPromoted", bookingData, templates.waitlistPromoted(bookingData), isTestView);
            console.log(`Waitlist auto-promotion successful for ${normalizedEmail}`);

        } else if (hoursUntilStart > 0) {
            // KEVESEBB MINT 24 ÓRA: Gyorsasági Broadcast (3. opció)
            // Létrehozunk egy claim dokumentumot, hogy nyomon kövessük a "versenyt"
            const claimRef = db.collection(isTestView ? "claims_test" : "claims").doc(courseId);

            // Ha már van aktív claim ehhez a kurzushoz, ami még nyitott, akkor ne spameljünk újat
            const claimDoc = await claimRef.get();
            if (claimDoc.exists && claimDoc.data().isOpen) {
                 return; // Már kiküldtük az értesítést a korábbi lemondásnál erre a szabad helyre
            }

            await claimRef.set({
                courseId: courseId,
                courseName: courseData.name,
                isOpen: true,
                createdAt: FieldValue.serverTimestamp()
            });

            // E-mail küldése mindenkinek
            const emailsPromises = waitlistSnap.docs.map(doc => {
                const waitlistData = doc.data();
                const encodedEmail = encodeURIComponent(waitlistData.email.toLowerCase().trim());

                const emailData = {
                    ...waitlistData,
                    courseId: courseId,
                    courseName: courseData.name,
                    courseDate: courseData.date,
                    startTime: courseData.startTime,
                    endTime: courseData.endTime || "ismeretlen",
                    encodedEmail: encodedEmail
                };

                return sendDynamicEmail("lastMinuteSpot", emailData, templates.lastMinuteSpot(emailData), isTestView);
            });

            await Promise.allSettled(emailsPromises);
            console.log(`Sent ${waitlistSnap.size} last-minute broadcast emails for course ${courseId}`);
        }

    } catch (error) {
        console.error("Error processing waitlist:", error);
    }
}

/**
 * joinWaitlist
 * Tanuló feliratkozása a várólistára.
 */
exports.joinWaitlist = onCall({region: "europe-west1"}, async (request) => {
    const data = request.data;
    const {courseId, firstName, lastName, email, phoneNumber, isTestView} = data;

    if (!courseId || !firstName || !lastName || !email) {
        throw new HttpsError("invalid-argument", "Minden kötelező mezőt ki kell tölteni.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const normalizedEmail = email.toLowerCase().trim();

    try {
        const courseRef = db.collection(coursesCollection).doc(courseId);
        const courseDoc = await courseRef.get();

        if (!courseDoc.exists) {
            throw new HttpsError("not-found", "A foglalkozás nem található.");
        }

        // Ellenőrizzük, hogy nincs-e már a rendes jelentkezők között
        const bookingDoc = await courseRef.collection("bookings").doc(normalizedEmail).get();
        if (bookingDoc.exists) {
            throw new HttpsError("already-exists", "Már van rendes (sikeres) jelentkezésed erre a foglalkozásra!");
        }

        // Ellenőrizzük, hogy nincs-e már a várólistán
        const waitlistRef = courseRef.collection("waitlist").doc(normalizedEmail);
        const waitlistDoc = await waitlistRef.get();
        if (waitlistDoc.exists) {
            throw new HttpsError("already-exists", "Ezzel az e-mail címmel már feliratkoztál a várólistára!");
        }

        await waitlistRef.set({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phoneNumber: phoneNumber ? phoneNumber.trim() : "",
            joinedAt: FieldValue.serverTimestamp()
        });

        return {success: true, message: "Sikeresen feliratkoztál a várólistára!"};
    } catch (error) {
        console.error("Error joining waitlist:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Hiba történt a várólistára való feliratkozáskor.");
    }
});

/**
 * claimLastMinuteSpot
 * Versenyhelyzet kezelése: A diák kattint az e-mailben lévő gombra, hogy megszerezze a felszabadult helyet.
 */
exports.claimLastMinuteSpot = onCall({region: "europe-west1"}, async (request) => {
    const data = request.data;
    const {courseId, email, isTestView} = data;

    if (!courseId || !email) {
        throw new HttpsError("invalid-argument", "Érvénytelen kérés.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const claimRef = db.collection(isTestView ? "claims_test" : "claims").doc(courseId);
    const courseRef = db.collection(coursesCollection).doc(courseId);
    const normalizedEmail = email.toLowerCase().trim();

    try {
        let bookingDataToEmail = null;

        await db.runTransaction(async (transaction) => {
            // 1. Megnézzük a claim dokumentumot (Hogy nyitott-e még a verseny)
            const claimDoc = await transaction.get(claimRef);
            if (!claimDoc.exists || !claimDoc.data().isOpen) {
                throw new HttpsError("resource-exhausted", "Sajnos valaki más már gyorsabb volt, és lefoglalta ezt a helyet.");
            }

            // 2. Megnézzük a kurzust, hogy TÉNYLEG van-e hely (biztonsági duplázás)
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A foglalkozás nem található.");
            }
            const courseData = courseDoc.data();
            if (courseData.bookingsCount >= courseData.capacity) {
                // Ha valahogy betelt (pl. admin beírt valakit kézzel), lezárjuk a claim-et
                transaction.update(claimRef, { isOpen: false });
                throw new HttpsError("resource-exhausted", "Sajnos a hely időközben már betelt.");
            }

            // 3. Kivesszük az embert a várólistáról (ha ott van, és ki kell olvasni a nevét/adatait)
            const waitlistDocRef = courseRef.collection("waitlist").doc(normalizedEmail);
            const waitlistDoc = await transaction.get(waitlistDocRef);
            if (!waitlistDoc.exists) {
                throw new HttpsError("not-found", "Nem találunk a várólistán ezzel az e-mail címmel.");
            }
            const waitlistData = waitlistDoc.data();

            // 4. Létrehozzuk a jelentkezést (bookings)
            const bookingsSubcollection = courseRef.collection("bookings");
            const bookingDocRef = bookingsSubcollection.doc(normalizedEmail);

            // Ellenőrizzük, hátha már valahogy jelentkezett
            const existingBooking = await transaction.get(bookingDocRef);
            if (existingBooking.exists) {
                throw new HttpsError("already-exists", "Már van rendes jelentkezésed erre a foglalkozásra.");
            }

            const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
            const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);
            const cancellationToken = crypto.randomUUID();

            const bookingData = {
                firstName: waitlistData.firstName,
                lastName: waitlistData.lastName,
                email: normalizedEmail,
                phoneNumber: waitlistData.phoneNumber || "",
                bookingDate: FieldValue.serverTimestamp(),
                courseId: courseId,
                courseName: courseData.name,
                courseDate: courseData.date,
                startTime: courseData.startTime,
                endTime: courseData.endTime || "ismeretlen",
                cancellation_token: cancellationToken,
                isPresent: null,
                feePaid: false,
                allBookingId: globalBookingRef.id,
                claimedLastMinute: true
            };

            // Mentések tranzakcióban
            transaction.set(bookingDocRef, bookingData);
            transaction.set(globalBookingRef, bookingData);

            // Törlés várólistáról
            transaction.delete(waitlistDocRef);

            // Kurzus létszám növelése
            transaction.update(courseRef, {
                bookingsCount: FieldValue.increment(1)
            });

            // Lezárjuk a Claim dokumentumot, hogy más már ne kattinthasson sikeresen!
            transaction.update(claimRef, {
                isOpen: false,
                claimedBy: normalizedEmail,
                claimedAt: FieldValue.serverTimestamp()
            });

            bookingDataToEmail = bookingData;
        });

        // E-mail küldése a sikeres foglalásról (Ugyanaz a template, mint a normál foglalásnál, vagy a waitlistPromoted)
        if (bookingDataToEmail) {
            await sendDynamicEmail("bookingConfirmation", bookingDataToEmail, templates.bookingConfirmation(bookingDataToEmail), isTestView);
        }

        return {success: true, message: "Sikeresen lefoglaltad a last-minute helyet!"};

    } catch (error) {
        console.error("Last minute claim failed:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Hiba történt a hely lefoglalásakor.");
    }
});

/**
 * removeWaitlistEntryAsAdmin
 * Admin törölhet valakit a várólistáról.
 */
exports.removeWaitlistEntryAsAdmin = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const {courseId, email, isTestView} = data;

    if (!courseId || !email) {
        throw new HttpsError("invalid-argument", "Hiányzó adatok.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const normalizedEmail = email.toLowerCase().trim();

    try {
        const waitlistDocRef = db.collection(coursesCollection).doc(courseId).collection("waitlist").doc(normalizedEmail);
        await waitlistDocRef.delete();

        return {success: true, message: "Tanuló eltávolítva a várólistáról."};
    } catch (error) {
        console.error("Error removing waitlist entry:", error);
        throw new HttpsError("internal", "Hiba történt a törléskor.");
    }
});
