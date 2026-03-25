const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { sendDynamicEmail, isAdmin } = require("./utils");
const db = getFirestore();

exports.sendFirstAidPaymentEmail = onCall({ region: "europe-west1" }, async (request) => {
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Csak adminok hívhatják ezt a funkciót.");
    }

    const { studentId, isTestView } = request.data;
    if (!studentId) {
        throw new HttpsError("invalid-argument", "Tanuló azonosító kötelező.");
    }

    const collectionName = isTestView ? 'registrations_test' : 'registrations';
    const studentDoc = await db.collection(collectionName).doc(studentId).get();

    if (!studentDoc.exists) {
        throw new HttpsError("not-found", "Tanuló nem található.");
    }

    const studentData = studentDoc.data();

    // Check if there's a First Aid course booking to get course details for the email
    const bookingsRef = db.collection(isTestView ? 'allBookings_test' : 'allBookings');
    const bookingsSnapshot = await bookingsRef.where('email', '==', studentData.email)
        .where('courseName', '==', 'Elsősegély tanfolyam')
        .get();

    let courseDate = "N/A";
    let startTime = "N/A";
    let endTime = "N/A";

    if (!bookingsSnapshot.empty) {
        // Assume the first or most recent one
        const bookingData = bookingsSnapshot.docs[0].data();
        courseDate = bookingData.courseDate || "N/A";
        startTime = bookingData.startTime || "N/A";
        endTime = bookingData.endTime || "N/A";
    }

    const emailResult = await sendDynamicEmail("firstAidPaymentReceived", studentData.email, {
        firstName: studentData.current_firstName,
        lastName: studentData.current_lastName,
        secondName: studentData.current_secondName,
        courseDate: courseDate,
        startTime: startTime,
        endTime: endTime
    });

    if (!emailResult) {
        throw new HttpsError("internal", "Hiba az email küldésekor.");
    }

    return { success: true, message: "Fizetési visszaigazoló e-mail sikeresen elküldve!" };
});
