const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const crypto = require("crypto");
const {ensureIsAdmin} = require("./utils");

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
        await db.runTransaction(async (transaction) => {
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A foglalkozás nem található.");
            }

            // TODO: In a later phase, handle deleting bookings subcollection
            // and sending cancellation emails to students.
            // For now, just delete the course document.
            transaction.delete(courseRef);
        });

        return {success: true, message: "Foglalkozás sikeresen törölve."};
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
        await db.runTransaction(async (transaction) => {
            const bookingDoc = await transaction.get(bookingDocRef);
            if (!bookingDoc.exists) {
                throw new HttpsError("not-found", "A jelentkezés nem található.");
            }

            // Delete subcollection document
            transaction.delete(bookingDocRef);

            // Delete global allBookings document
            transaction.delete(globalBookingRef);

            // Decrement course counter
            transaction.update(courseRef, {
                bookingsCount: FieldValue.increment(-1)
            });
        });

        return {success: true, message: "Jelentkezés sikeresen törölve."};
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
            // Note: Since we are inside a transaction, we can't do a query (.where) safely without locks or limitations.
            // But we CAN read specific documents. However, we don't know the doc ID (it's auto-generated).
            // A robust way in NoSQL is to use the email as the Document ID in the subcollection.
            // E.g., bookingsSubcollection.doc(email.toLowerCase())
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

            // Note: Email sending (Trigger Email) is intentionally omitted in this phase
            // as per user request.
        });

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
