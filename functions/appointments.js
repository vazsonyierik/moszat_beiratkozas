const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {ensureIsAdmin} = require("./utils");

/**
 * createCourse
 * Creates a new course/appointment.
 */
exports.createCourse = onCall({ region: "europe-west1" }, async (request) => {
    ensureIsAdmin(request.auth);

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
    ensureIsAdmin(request.auth);

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
