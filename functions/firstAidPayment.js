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
    const { studentEmail, courseId, isPaid, isTestView } = request.data;
    
    if (studentEmail === undefined || isPaid === undefined) {
        throw new HttpsError("invalid-argument", "Tanuló email és fizetési státusz kötelező.");
    }

    const normalizedEmail = studentEmail.toLowerCase().trim();
    const collectionName = isTestView ? 'registrations_test' : 'registrations';
    
    // 1. Try to find the student document by email
    const studentSnapshot = await db.collection(collectionName)
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();

    let studentData = null;
    let studentId = null;

    if (!studentSnapshot.empty) {
        const studentDocRef = studentSnapshot.docs[0].ref;
        studentData = studentSnapshot.docs[0].data();
        studentId = studentSnapshot.docs[0].id;

        // Update the student document's firstAidPaid status (Global credit)
        await studentDocRef.update({
            firstAidPaid: isPaid
        });
    }

    // 2. Update the booking documents if courseId is provided (Booking specific status)
    if (courseId) {
        const coursesCollection = isTestView ? "courses_test" : "courses";
        const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";

        const courseRef = db.collection(coursesCollection).doc(courseId);
        const localBookingRef = courseRef.collection("bookings").doc(normalizedEmail);
        const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);

        try {
            await db.runTransaction(async (transaction) => {
                // READ PHASE
                const localDoc = await transaction.get(localBookingRef);
                const globalDoc = await transaction.get(globalBookingRef);

                // WRITE PHASE
                if (localDoc.exists) {
                    transaction.update(localBookingRef, { firstAidPaid: isPaid });
                }
                if (globalDoc.exists) {
                    transaction.update(globalBookingRef, { firstAidPaid: isPaid });
                }
            });
        } catch (error) {
            console.error("Error updating booking specific payment status:", error);
            // We do not throw to not break the flow, but it's good to log
        }
    }

    // 3. If paid = true, send the confirmation email
    if (isPaid === true) {
        let bookingData = null;

        // Find the booking for the email context
        if (courseId) {
            // First try to get the specific course booking if we have courseId
            const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
            const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);
            const globalDoc = await globalBookingRef.get();
            if (globalDoc.exists) {
                bookingData = globalDoc.data();
            }
        }
        
        if (!bookingData) {
            // Fallback: Check if there's any First Aid course booking to get course details for the email
            const bookingsRef = db.collection(isTestView ? 'allBookings_test' : 'allBookings');
            const bookingsSnapshot = await bookingsRef.where('email', '==', normalizedEmail)
                .where('courseName', '==', 'Elsősegély tanfolyam')
                .get();

            if (!bookingsSnapshot.empty) {
                bookingData = bookingsSnapshot.docs[0].data();
            }
        }

        let courseDate = bookingData?.courseDate || "N/A";
        let startTime = bookingData?.startTime || "N/A";
        let endTime = bookingData?.endTime || "N/A";
        
        // Use fallbacks for names if current_firstName is missing
        const fName = studentData?.firstName || studentData?.current_firstName || bookingData?.firstName || "";
        const lName = studentData?.lastName || studentData?.current_lastName || bookingData?.lastName || "";
        const sName = studentData?.secondName || studentData?.current_secondName || "";

        const templateData = {
            id: studentId || normalizedEmail, // Fallback to email if no student doc
            email: normalizedEmail,
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
            console.error("Failed to send first aid payment email for:", normalizedEmail);
            // We don't throw an error because the update was successful, but we can return a warning
            return { success: true, warning: "Fizetési státusz frissítve, de az email küldése sikertelen." };
        }
    }

    return { success: true, message: "Elsősegély fizetési státusz sikeresen frissítve!" };
});
