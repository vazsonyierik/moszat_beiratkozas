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
