const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { sendDynamicEmail, isAdmin } = require("./utils");
const { firstAidPaymentReceived } = require("./emailTemplates");

exports.updateFirstAidPaymentStatus = onCall({ region: "europe-west1" }, async (request) => {
    const db = getFirestore();
    const userEmail = request.auth?.token?.email;
    if (!userEmail || !(await isAdmin(userEmail))) {
        throw new HttpsError("permission-denied", "Csak adminok hívhatják ezt a funkciót.");
    }

    // studentEmail is easier from the booking table, or studentId. 
    // Wait, the UI in AppointmentsTab has booking.email, so we need to find the student by email.
    const { studentEmail, isPaid, isTestView } = request.data;
    
    if (studentEmail === undefined || isPaid === undefined) {
        throw new HttpsError("invalid-argument", "Tanuló email és fizetési státusz kötelező.");
    }

    const collectionName = isTestView ? 'registrations_test' : 'registrations';
    
    // Find the student document by email
    const studentSnapshot = await db.collection(collectionName)
        .where("email", "==", studentEmail)
        .limit(1)
        .get();

    if (studentSnapshot.empty) {
        throw new HttpsError("not-found", "Tanuló nem található ezzel az e-mail címmel.");
    }

    const studentDocRef = studentSnapshot.docs[0].ref;
    const studentData = studentSnapshot.docs[0].data();

    // 1. Update the student document's firstAidPaid status
    await studentDocRef.update({
        firstAidPaid: isPaid
    });
    
    // 2. Also fetch bookings and update the firstAidPaid flag there so AppointmentsTab can just read it!
    // Or AppointmentsTab could query the registration directly. Updating booking adds data redundancy.
    // Actually, we don't need to update bookings. We will just return success and let the frontend handle the state or refetch.

    // 3. If paid = true, send the confirmation email
    if (isPaid === true) {
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
        
        // Use fallbacks for names if current_firstName is missing
        const fName = studentData.firstName || studentData.current_firstName || "";
        const lName = studentData.lastName || studentData.current_lastName || "";
        const sName = studentData.secondName || studentData.current_secondName || "";

        const templateData = {
            id: studentSnapshot.docs[0].id,
            email: studentData.email,
            firstName: fName,
            lastName: lName,
            secondName: sName,
            courseDate: courseDate,
            startTime: startTime,
            endTime: endTime,
            // Fallback template variables
            current_firstName: fName,
            current_lastName: lName,
            current_secondName: sName
        };

        const fallbackTemplate = firstAidPaymentReceived(templateData);

        const emailResult = await sendDynamicEmail("firstAidPaymentReceived", templateData, fallbackTemplate, isTestView);

        if (!emailResult) {
            console.error("Failed to send first aid payment email for:", studentEmail);
            // We don't throw an error because the update was successful, but we can return a warning
            return { success: true, warning: "Fizetési státusz frissítve, de az email küldése sikertelen." };
        }
    }

    return { success: true, message: "Elsősegély fizetési státusz sikeresen frissítve!" };
});
