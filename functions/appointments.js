const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const crypto = require("crypto");
const {ensureIsAdmin, sendDynamicEmail} = require("./utils");
const templates = require("./emailTemplates");

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
                waitlistCount: 0,
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
            waitlistCount: 0,
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
        let activeWaitlist = [];

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

            // Kérjük le a várólistásokat is, hogy őket is értesíthessük
            const waitlistQuery = courseRef.collection("waitlist");
            const waitlistSnap = await transaction.get(waitlistQuery);

            waitlistSnap.forEach((doc) => {
                activeWaitlist.push(doc.data());
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
                    courseDate: formatCourseDate(date),
                    startTime: startTime
                });

                if (doc.data().allBookingId) {
                    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
                    const globalRef = db.collection(allBookingsCollection).doc(doc.data().allBookingId);
                    transaction.update(globalRef, {
                        courseName: name,
                        courseDate: formatCourseDate(date),
                        startTime: startTime
                    });
                }
            });

            // Ugyanezt megtesszük a várólistás adatokon is
            waitlistSnap.forEach((doc) => {
                transaction.update(doc.ref, {
                    courseName: name,
                    courseDate: formatCourseDate(date),
                    startTime: startTime
                });

                if (doc.data().allWaitlistId) {
                    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
                    const globalRef = db.collection(allBookingsCollection).doc(doc.data().allWaitlistId);
                    transaction.update(globalRef, {
                        courseName: name,
                        courseDate: formatCourseDate(date),
                        startTime: startTime
                    });
                }
            });
        });

        // Ha a fontos adatok (dátum, idő, név) változtak, küldjünk e-mailt az érintetteknek
        const isMajorChange = oldCourseData.date !== date || oldCourseData.startTime !== startTime || oldCourseData.name !== name || oldCourseData.endTime !== endTime;
        
        if (isMajorChange) {
            const emailPromises = [];

            // 1. E-mailek a rendes jelentkezőknek
            if (activeBookings.length > 0) {
                activeBookings.forEach(booking => {
                    const combinedData = {
                        ...booking,
                        oldCourseName: oldCourseData.name,
                        oldCourseDate: formatCourseDate(oldCourseData.date),
                        oldStartTime: oldCourseData.startTime,
                        oldEndTime: oldCourseData.endTime,
                        newCourseName: name,
                        newCourseDate: date,
                        newStartTime: startTime,
                        newEndTime: endTime
                    };
                    if (oldCourseData.name === "Orvosi alkalmassági vizsgálat") {
                        emailPromises.push(sendDynamicEmail("medicalCourseModified", combinedData, templates.medicalCourseModified(combinedData), isTestView));
                    } else {
                        emailPromises.push(sendDynamicEmail("courseModified", combinedData, templates.courseModified(combinedData), isTestView));
                    }
                });
            }

            // 2. E-mailek a várólistásoknak
            if (activeWaitlist.length > 0) {
                activeWaitlist.forEach(waitlistEntry => {
                    const combinedData = {
                        ...waitlistEntry,
                        oldCourseName: oldCourseData.name,
                        oldCourseDate: formatCourseDate(oldCourseData.date),
                        oldStartTime: oldCourseData.startTime,
                        oldEndTime: oldCourseData.endTime,
                        newCourseName: name,
                        newCourseDate: date,
                        newStartTime: startTime,
                        newEndTime: endTime
                    };
                    // Note: Orvosi alkalmassági várólistát külön sablon is kezelhetné itt, 
                    // de a user csak medicalCourseModified-t kért rendes időpontokra. 
                    // Egyelőre használjuk a waitlistCourseModified-et várólistára.
                    emailPromises.push(sendDynamicEmail("waitlistCourseModified", combinedData, templates.waitlistCourseModified(combinedData), isTestView));
                });
            }

            if (emailPromises.length > 0) {
                await Promise.allSettled(emailPromises);
            }
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
                if (courseData.name === "Orvosi alkalmassági vizsgálat") {
                    return sendDynamicEmail("medicalCourseDeleted", booking, templates.medicalCourseDeleted(booking), isTestView);
                } else {
                    return sendDynamicEmail("courseDeleted", booking, templates.courseDeleted(booking), isTestView);
                }
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
            if (bookingData.courseName === "Orvosi alkalmassági vizsgálat") {
                await sendDynamicEmail("medicalBookingCancelledByAdmin", bookingData, templates.medicalBookingCancelledByAdmin(bookingData), isTestView);
            } else {
                await sendDynamicEmail("bookingCancelledByAdmin", bookingData, templates.bookingCancelledByAdmin(bookingData), isTestView);
            }
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
    const {courseId, firstName, lastName, email, isTestView, silent} = data;

    if (!courseId || !firstName || !lastName || !email) {
        throw new HttpsError("invalid-argument", "Minden mező kitöltése kötelező.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
    const registrationsCollection = isTestView ? "registrations_test" : "registrations";

    const courseRef = db.collection(coursesCollection).doc(courseId);
    const bookingsSubcollection = courseRef.collection("bookings");

    try {
        let bookingDataToEmail = null;
        let courseDataToEmail = null;
        let isLinkedToStudent = false;

        // 0. Check if student exists in registrations collection by email
        const normalizedEmail = email.toLowerCase().trim();
        const registrationsSnapshot = await db.collection(registrationsCollection)
            .where("email", "==", normalizedEmail)
            .limit(1)
            .get();
        
        if (!registrationsSnapshot.empty) {
            isLinkedToStudent = true;
        }

        await db.runTransaction(async (transaction) => {
            // 1. Get course to check capacity
            const courseDoc = await transaction.get(courseRef);
            if (!courseDoc.exists) {
                throw new HttpsError("not-found", "A foglalkozás nem található.");
            }

            const courseData = courseDoc.data();
            courseDataToEmail = courseData;
            const currentBookings = courseData.bookingsCount || 0;

            if (currentBookings >= courseData.capacity && !silent) {
                throw new HttpsError("resource-exhausted", "Sajnos ez a foglalkozás időközben betelt. (Course is full)");
            }

            // 2. Check if this email is already registered for THIS course
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
                courseDate: formatCourseDate(courseData.date),
                startTime: courseData.startTime,
                endTime: courseData.endTime || "ismeretlen",
                cancellation_token: cancellationToken,
                isPresent: null,
                feePaid: false,
                addedByAdmin: !!silent,
                addedAsExtra: !!silent,
                isLinkedToStudent: isLinkedToStudent,
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

        if (bookingDataToEmail && !silent) {
            if (bookingDataToEmail.courseName === "Elsősegély tanfolyam") {
                await sendDynamicEmail("firstAidConfirmation", bookingDataToEmail, templates.firstAidConfirmation(bookingDataToEmail), isTestView);
            } else if (bookingDataToEmail.courseName === "Orvosi alkalmassági vizsgálat") {
                await sendDynamicEmail("medicalBookingConfirmation", bookingDataToEmail, templates.medicalBookingConfirmation(courseDataToEmail, bookingDataToEmail), isTestView);
            } else {
                await sendDynamicEmail("bookingConfirmation", bookingDataToEmail, templates.bookingConfirmation(bookingDataToEmail), isTestView);
            }
        }

        return {success: true, message: silent ? "A tanuló sikeresen hozzáadva extraként (értesítés nélkül)." : "Jelentkezés sikeresen rögzítve."};
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
 * bulkAddStudentToCourses
 * Admin adds a student to multiple courses at once.
 */
exports.bulkAddStudentToCourses = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const {courseIds, firstName, lastName, email, isTestView} = data;

    if (!Array.isArray(courseIds) || courseIds.length === 0 || !firstName || !lastName || !email) {
        throw new HttpsError("invalid-argument", "Minden mező kitöltése kötelező.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
    const registrationsCollection = isTestView ? "registrations_test" : "registrations";
    const normalizedEmail = email.toLowerCase().trim();

    let isLinkedToStudent = false;

    // 0. Check if student exists in registrations collection by email
    const registrationsSnapshot = await db.collection(registrationsCollection)
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();
        
    if (!registrationsSnapshot.empty) {
        isLinkedToStudent = true;
    }

    let successCount = 0;
    let failCount = 0;
    const emailsToSend = [];

    // Megpróbáljuk minden kurzusra egyenként beregisztrálni (kivédve a tranzakciós korlátokat)
    for (const courseId of courseIds) {
        const courseRef = db.collection(coursesCollection).doc(courseId);
        const bookingsSubcollection = courseRef.collection("bookings");

        try {
            let localBookingData = null;
            await db.runTransaction(async (transaction) => {
                const courseDoc = await transaction.get(courseRef);
                if (!courseDoc.exists) {
                    throw new Error("Course not found");
                }

                const courseData = courseDoc.data();
                const currentBookings = courseData.bookingsCount || 0;

                // Ha az Admin pipálta ki, de időközben betelt, akkor skip (ahogy a user kérte: "csak a szabad helyekkel rendelkező")
                if (currentBookings >= courseData.capacity) {
                    throw new Error("Course is full");
                }

                const bookingDocRef = bookingsSubcollection.doc(normalizedEmail);
                const existingBooking = await transaction.get(bookingDocRef);

                if (existingBooking.exists) {
                    throw new Error("Already booked");
                }

                const cancellationToken = crypto.randomUUID();
                const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);

                localBookingData = {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: normalizedEmail,
                    bookingDate: FieldValue.serverTimestamp(),
                    courseId: courseId,
                    courseName: courseData.name,
                    courseDate: formatCourseDate(courseData.date),
                    startTime: courseData.startTime,
                    endTime: courseData.endTime || "ismeretlen",
                    cancellation_token: cancellationToken,
                    isPresent: null,
                    feePaid: false,
                    allBookingId: globalBookingRef.id,
                    addedByAdmin: true,
                    isLinkedToStudent: isLinkedToStudent,
                };

                transaction.set(bookingDocRef, localBookingData);
                transaction.set(globalBookingRef, localBookingData);

                transaction.update(courseRef, {
                    bookingsCount: FieldValue.increment(1)
                });

            });
            if (localBookingData) {
                emailsToSend.push(localBookingData);
                successCount++;
            }
        } catch (error) {
            console.error(`Error booking course ${courseId} in bulk:`, error.message);
            failCount++;
        }
    }

    // E-mailek elküldése (a kérés szerint a csoportos küld e-mailt)
    const emailPromises = emailsToSend.map(bookingData => {
        if (bookingData.courseName === "Elsősegély tanfolyam") {
            return sendDynamicEmail("firstAidConfirmation", bookingData, templates.firstAidConfirmation(bookingData), isTestView);
        } else if (bookingData.courseName === "Orvosi alkalmassági vizsgálat") {
            // Bulk-ból hiányozhat a konkrét courseData, de a szükséges mezők megvannak a bookingData-ban.
            const fakeCourseData = {
                date: bookingData.courseDate,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime
            };
            return sendDynamicEmail("medicalBookingConfirmation", bookingData, templates.medicalBookingConfirmation(fakeCourseData, bookingData), isTestView);
        } else {
            return sendDynamicEmail("bookingConfirmation", bookingData, templates.bookingConfirmation(bookingData), isTestView);
        }
    });
    await Promise.allSettled(emailPromises);

    return {
        success: true, 
        message: `Sikeresen felírtuk ${successCount} foglalkozásra. (Sikertelen: ${failCount})`
    };
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

        // Check if this token belongs to a WAITLIST entry
        if (bookingData.isWaitlist) {
            const waitlistRefToDelete = courseRefToUpdate.collection("waitlist").doc(bookingData.email);

            await db.runTransaction(async (transaction) => {
                const waitlistDoc = await transaction.get(waitlistRefToDelete);
                if (!waitlistDoc.exists) {
                    throw new HttpsError("not-found", "A várólista jelentkezés (már) nem található.");
                }

                transaction.delete(waitlistRefToDelete);
                transaction.delete(globalRefToDelete);

                transaction.update(courseRefToUpdate, {
                    waitlistCount: FieldValue.increment(-1)
                });
            });

            if (bookingData.courseName === "Orvosi alkalmassági vizsgálat") {
                await sendDynamicEmail("medicalWaitlistCancelledByStudent", bookingData, templates.medicalWaitlistCancelledByStudent(bookingData), isTestView);
            } else {
                await sendDynamicEmail("waitlistCancelledByStudent", bookingData, templates.waitlistCancelledByStudent(bookingData), isTestView);
            }
            return {success: true, message: "Sikeresen leiratkoztál a várólistáról."};
        } else {
            // Normal Booking Cancellation
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
                if (bookingData.courseName === "Orvosi alkalmassági vizsgálat") {
                    await sendDynamicEmail("medicalBookingCancelledByStudent", bookingData, templates.medicalBookingCancelledByStudent(bookingData), isTestView);
                } else {
                    await sendDynamicEmail("bookingCancelledByStudent", bookingData, templates.bookingCancelledByStudent(bookingData), isTestView);
                }
                // Várólista logika meghívása
                await processWaitlist(bookingData.courseId, isTestView);
            }

            return {success: true, message: "Jelentkezés sikeresen lemondva."};
        }
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
        // Felépítjük a dátumot explicitly a budapesti időzónában.
        // Mivel a Cloud Functions UTC-n fut, a sima `new Date(Y, M, D, H, m)` UTC-ként lesz értelmezve.
        // Beállítjuk a helyes stringet: "2024-10-25T14:30:00.000+01:00" vagy "+02:00" attól függően,
        // hogy nyári vagy téli időszámítás van. Az Intl.DateTimeFormat megmondja az eltolódást.
        
        // Először készítünk egy hozzávetőleges (UTC) dátumot a keresett napra
        const approximateDate = new Date(`${courseData.date}T12:00:00Z`);
        
        // Kiszámítjuk, hogy a kért napon Magyarországon mennyi volt az UTC-től való eltérés
        // Egy formatter Europe/Budapest timezone-nal
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Budapest',
            timeZoneName: 'longOffset' // pl: "GMT+02:00" vagy "GMT+01:00"
        });
        const parts = formatter.formatToParts(approximateDate);
        const offsetPart = parts.find(p => p.type === 'timeZoneName').value; // "GMT+02:00"
        const offsetString = offsetPart.replace('GMT', ''); // "+02:00" vagy "+01:00" (ha csak 'GMT', az 'Z')
        const finalOffset = offsetString === '' ? 'Z' : offsetString;

        // Most már pontos ISO stringet tudunk építeni
        const exactCourseDateTimeString = `${courseData.date}T${courseData.startTime}:00.000${finalOffset}`;
        const courseStartDate = new Date(exactCourseDateTimeString);
        
        const now = new Date(); // Mostani időpillanat (UTC, de az epoch millisec abszolút)
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
                bookingDate: FieldValue.serverTimestamp(),
                courseId: courseId,
                courseName: courseData.name,
                courseDate: formatCourseDate(courseData.date),
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
                
                // Törlés a várólistáról és a globalis waitlist doc-ból
                transaction.delete(firstWaitlistUserDoc.ref);
                if (waitlistData.allWaitlistId) {
                    const globalWaitlistRef = db.collection(allBookingsCollection).doc(waitlistData.allWaitlistId);
                    transaction.delete(globalWaitlistRef);
                }

                // Létszám növelése és várólista csökkentése
                transaction.update(courseRef, {
                    bookingsCount: FieldValue.increment(1),
                    waitlistCount: FieldValue.increment(-1)
                });
            });

            // Értesítő e-mail küldése
            await sendDynamicEmail("waitlistPromoted", bookingData, templates.waitlistPromoted(bookingData), isTestView);
            console.log(`Waitlist auto-promotion successful for ${normalizedEmail}`);

        } else if (hoursUntilStart >= 3) {
            // KEVESEBB MINT 24 ÓRA, DE TÖBB MINT 3 ÓRA: Gyorsasági Broadcast (3. opció)
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
                    courseDate: formatCourseDate(courseData.date),
                    startTime: courseData.startTime,
                    endTime: courseData.endTime || "ismeretlen",
                    encodedEmail: encodedEmail
                };
                
                return sendDynamicEmail("lastMinuteSpot", emailData, templates.lastMinuteSpot(emailData), isTestView);
            });

            await Promise.allSettled(emailsPromises);
            console.log(`Sent ${waitlistSnap.size} last-minute broadcast emails for course ${courseId}`);
        } else {
            // KEVESEBB MINT 3 ÓRA VAN HÁTRA: Már nem küldünk semmilyen értesítést a várólistásoknak
            console.log(`Course ${courseId} is starting in less than 3 hours (${hoursUntilStart.toFixed(2)} hours). No waitlist emails sent.`);
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
    const {courseId, firstName, lastName, email, isTestView} = data;

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

        const courseData = courseDoc.data();
        if (courseData.name === "Elsősegély tanfolyam") {
            throw new HttpsError("invalid-argument", "Elsősegély tanfolyam esetén nincs lehetőség várólistára jelentkezni.");
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

        const cancellationToken = crypto.randomUUID();
        const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
        const globalBookingRef = db.collection(allBookingsCollection).doc(`waitlist_${courseId}_${normalizedEmail}`);

        const waitlistData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            joinedAt: FieldValue.serverTimestamp(),
            courseId: courseId,
            courseName: courseData.name,
            courseDate: formatCourseDate(courseData.date),
            startTime: courseData.startTime,
            endTime: courseData.endTime || "ismeretlen",
            cancellation_token: cancellationToken,
            allWaitlistId: globalBookingRef.id,
            isWaitlist: true
        };

        // Create the global waitlist document for the token to work in cancelBookingByStudent
        await globalBookingRef.set(waitlistData);
        await waitlistRef.set(waitlistData);

        // Növeljük a várólista számlálót
        await courseRef.update({
            waitlistCount: FieldValue.increment(1)
        });

        const waitlistEmailData = { ...waitlistData };

        // Küldünk egy megerősítő e-mailt a feliratkozásról
        if (waitlistEmailData.courseName === "Orvosi alkalmassági vizsgálat") {
            await sendDynamicEmail("medicalWaitlistJoined", waitlistEmailData, templates.medicalWaitlistJoined(courseData, waitlistEmailData), isTestView);
        } else {
            await sendDynamicEmail("waitlistJoined", waitlistEmailData, templates.waitlistJoined(waitlistEmailData), isTestView);
        }

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
        let courseDataToEmail = null;

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
            courseDataToEmail = courseData;
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
                bookingDate: FieldValue.serverTimestamp(),
                courseId: courseId,
                courseName: courseData.name,
                courseDate: formatCourseDate(courseData.date),
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
            
            // Törlés várólistáról és a globalis waitlist doc-ból
            transaction.delete(waitlistDocRef);
            if (waitlistData.allWaitlistId) {
                const globalWaitlistRef = db.collection(allBookingsCollection).doc(waitlistData.allWaitlistId);
                transaction.delete(globalWaitlistRef);
            }

            // Kurzus létszám növelése és várólista csökkentése
            transaction.update(courseRef, {
                bookingsCount: FieldValue.increment(1),
                waitlistCount: FieldValue.increment(-1)
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
            if (bookingDataToEmail.courseName === "Elsősegély tanfolyam") {
                await sendDynamicEmail("firstAidConfirmation", bookingDataToEmail, templates.firstAidConfirmation(bookingDataToEmail), isTestView);
            } else if (bookingDataToEmail.courseName === "Orvosi alkalmassági vizsgálat") {
                // Last minute nem valószínű, de biztonság kedvéért kezeljük le
                await sendDynamicEmail("medicalBookingConfirmation", bookingDataToEmail, templates.medicalBookingConfirmation(courseDataToEmail, bookingDataToEmail), isTestView);
            } else {
                await sendDynamicEmail("bookingConfirmation", bookingDataToEmail, templates.bookingConfirmation(bookingDataToEmail), isTestView);
            }
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
/**
 * updateBookingAttendance
 * Admin rögzíti, hogy a tanuló jelen volt-e a foglalkozáson (true, false, vagy null).
 */
exports.updateBookingAttendance = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const { courseId, studentEmail, isPresent, isTestView } = data;

    if (!courseId || !studentEmail || isPresent === undefined) {
        throw new HttpsError("invalid-argument", "Hiányzó adatok a jelenlét rögzítéséhez.");
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
            // 1. READS (Minden olvasásnak meg kell előznie az írásokat a Firestore transaction-ökben!)
            const bookingDoc = await transaction.get(bookingDocRef);
            let globalBookingDoc = null;
            try {
                globalBookingDoc = await transaction.get(globalBookingRef);
            } catch (err) {
                console.warn("Global booking fetch failed, but continuing.", err);
            }

            // 2. WRITES
            // Ha létezik a lokális foglalás, frissítjük
            if (bookingDoc.exists) {
                transaction.update(bookingDocRef, {
                    isPresent: isPresent
                });
            } else {
                console.warn(`Booking with ID ${normalizedEmail} not found in course ${courseId}.`);
                throw new HttpsError("not-found", `A foglalás nem található (${normalizedEmail}).`);
            }

            // Ha létezik a globális foglalás, azt is frissítjük
            if (globalBookingDoc && globalBookingDoc.exists) {
                transaction.update(globalBookingRef, {
                    isPresent: isPresent
                });
            } else {
                console.warn(`Global booking with ID ${globalBookingRef.id} not found.`);
            }
        });

        return { success: true, message: "Jelenlét sikeresen rögzítve." };
    } catch (error) {
        console.error("Error updating booking attendance:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", `Hiba történt a jelenlét rögzítése során: ${error.message}`);
    }
});

/**
 * linkStudentToBooking
 * Admin manuálisan összekapcsol egy "árva" foglalást egy létező tanulóval.
 */
exports.linkStudentToBooking = onCall({region: "europe-west1"}, async (request) => {
    await ensureIsAdmin(request.auth);

    const data = request.data;
    const { courseId, bookingEmail, studentId, isTestView } = data;

    if (!courseId || !bookingEmail || !studentId) {
        throw new HttpsError("invalid-argument", "Hiányzó adatok az összerendeléshez.");
    }

    const db = getFirestore();
    const coursesCollection = isTestView ? "courses_test" : "courses";
    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
    const registrationsCollection = isTestView ? "registrations_test" : "registrations";

    const normalizedEmail = bookingEmail.toLowerCase().trim();
    const courseRef = db.collection(coursesCollection).doc(courseId);
    const bookingDocRef = courseRef.collection("bookings").doc(normalizedEmail);
    const globalBookingRef = db.collection(allBookingsCollection).doc(`${courseId}_${normalizedEmail}`);
    const studentRef = db.collection(registrationsCollection).doc(studentId);

    try {
        await db.runTransaction(async (transaction) => {
            // 1. Ellenőrizzük, hogy létezik-e a tanuló
            const studentDoc = await transaction.get(studentRef);
            if (!studentDoc.exists) {
                throw new HttpsError("not-found", "A kiválasztott tanuló nem található.");
            }

            // 2. Ellenőrizzük a lokális foglalást
            const bookingDoc = await transaction.get(bookingDocRef);
            if (!bookingDoc.exists) {
                throw new HttpsError("not-found", "A foglalás nem található.");
            }

            // 3. Ellenőrizzük a globális foglalást
            const globalBookingDoc = await transaction.get(globalBookingRef);

            // 4. Frissítjük a lokális foglalást
            transaction.update(bookingDocRef, {
                linkedStudentId: studentId,
                manuallyLinked: true
            });

            // 5. Frissítjük a globális foglalást, ha létezik
            if (globalBookingDoc.exists) {
                transaction.update(globalBookingRef, {
                    linkedStudentId: studentId,
                    manuallyLinked: true
                });
            }
        });

        return { success: true, message: "A foglalás sikeresen összerendelve a tanulóval!" };
    } catch (error) {
        console.error("Error linking student to booking:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Hiba történt az összerendelés során.", error.message);
    }
});

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
        const courseRef = db.collection(coursesCollection).doc(courseId);
        const waitlistDocRef = courseRef.collection("waitlist").doc(normalizedEmail);
        
        await db.runTransaction(async (transaction) => {
            const docSnap = await transaction.get(waitlistDocRef);
            if (docSnap.exists) {
                const waitlistData = docSnap.data();
                transaction.delete(waitlistDocRef);
                
                if (waitlistData.allWaitlistId) {
                    const allBookingsCollection = isTestView ? "allBookings_test" : "allBookings";
                    const globalWaitlistRef = db.collection(allBookingsCollection).doc(waitlistData.allWaitlistId);
                    transaction.delete(globalWaitlistRef);
                }
                
                transaction.update(courseRef, {
                    waitlistCount: FieldValue.increment(-1)
                });
            }
        });
        
        return {success: true, message: "Tanuló eltávolítva a várólistáról."};
    } catch (error) {
        console.error("Error removing waitlist entry:", error);
        throw new HttpsError("internal", "Hiba történt a törléskor.");
    }
});
