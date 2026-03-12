const {Timestamp} = require("firebase-admin/firestore");

// Hungarian holidays and special working Saturdays for 2026/2027
// Format: YYYY-MM-DD
const HOLIDAYS = [
    // 2026 Holidays (Example estimates/actuals, depending on Hungarian calendar)
    "2026-01-01", // Újév
    "2026-03-15", // Nemzeti ünnep
    "2026-04-03", // Nagypéntek
    "2026-04-06", // Húsvéthétfő
    "2026-05-01", // Munka ünnepe
    "2026-05-25", // Pünkösdhétfő
    "2026-08-20", // Államalapítás
    "2026-10-23", // 1956-os forradalom
    "2026-11-01", // Mindenszentek
    "2026-12-24", // Szenteste (Pihenőnap)
    "2026-12-25", // Karácsony
    "2026-12-26", // Karácsony

    // 2027 Holidays (Example estimates/actuals)
    "2027-01-01",
    "2027-03-15",
    "2027-03-26", // Nagypéntek
    "2027-03-29", // Húsvéthétfő
    "2027-05-01",
    "2027-05-17", // Pünkösdhétfő
    "2027-08-20",
    "2027-10-23",
    "2027-11-01",
    "2027-12-24",
    "2027-12-25",
    "2027-12-26"
];

// Special working Saturdays (munkanap áthelyezések)
const WORKING_SATURDAYS = [
    // Add specific dates here if applicable for 2026/2027
    // "2026-08-08",
];

/**
 * Checks if a given date string (YYYY-MM-DD) is a weekend or holiday.
 * Extends the deadline to the next working day.
 */
function getNextWorkingDay(date) {
    const resultDate = new Date(date);
    let shifted = false;

    while (true) {
        // Correct timezone offset before checking ISO string so it matches Hungarian local time
        const localDate = new Date(resultDate.getTime() - (resultDate.getTimezoneOffset() * 60000));
        const dayOfWeek = resultDate.getDay();
        const dateStr = localDate.toISOString().split("T")[0];

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
        const isHoliday = HOLIDAYS.includes(dateStr);
        const isWorkingSaturday = WORKING_SATURDAYS.includes(dateStr);

        if ((isWeekend && !isWorkingSaturday) || isHoliday) {
            // Shift to next day
            resultDate.setDate(resultDate.getDate() + 1);
            shifted = true;
        } else {
            // Found a working day
            break;
        }
    }

    return {date: resultDate, shifted};
}

/**
 * Extracts a Date object from a Firestore Timestamp, ISO string, or Date object.
 */
function toDate(input) {
    if (!input) return null;
    if (input instanceof Date) return input;
    if (typeof input.toDate === "function") return input.toDate();
    if (typeof input === "string") return new Date(input);
    if (input.seconds) return new Date(input.seconds * 1000);
    return null;
}

/**
 * Parses the "YYYY.MM.DD. HH:mm" string format used in exam results.
 */
function parseExamDate(dateInput) {
    if (!dateInput) return null;

    let safeDateString = dateInput;
    if (typeof safeDateString.toDate === 'function') {
        safeDateString = safeDateString.toDate().toISOString().split('T')[0];
    } else if (safeDateString instanceof Date) {
        safeDateString = safeDateString.toISOString().split('T')[0];
    }

    if (typeof safeDateString !== 'string') {
        return null;
    }

    // Format: "2023.10.15. 10:00"
    const cleaned = safeDateString.replace(/\./g, "-").replace(/ /g, "T") + ":00";
    // This creates something like "2023-10-15-T10:00:00".
    // Better way: match the parts
    const match = safeDateString.match(/(\d{4})\.(\d{2})\.(\d{2})\.?\s+(\d{2}):(\d{2})/);
    if (match) {
        return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00`);
    }
    // Fallback simple split
    const parts = safeDateString.split(" ")[0].replace(/\.$/, "").split(".");
    if (parts.length >= 3) {
        // "Déli Horgony" (Noon Anchor): 12:00:00Z UTC formátumot használunk,
        // így a nyári-téli időszámítás eltolódása miatt sosem ugrik át a következő naptári napra a dátum.
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`);
    }
    return new Date(safeDateString);
}

/**
 * Calculates the deadline phase and dates for a student.
 */
function calculateDeadline(studentData) {
    if (studentData.isTransferred === true) {
        return {
            activePhase: "Lezárva: Másik képzőszervhez áthelyezve",
            originalDate: null,
            shiftedDate: null,
            isShifted: false
        };
    }

    const enrolledAt = toDate(studentData.enrolledAt);
    const studentIdAssignedAt = toDate(studentData.studentIdAssignedAt);
    const examResults = studentData.examResults || [];

    // Check for Phase 5: Passed Practical Exam
    const passedPractical = examResults.find(ex =>
        ex.subject && ex.subject.toLowerCase().includes("forgalmi") &&
        ex.result && (ex.result.toLowerCase().includes("sikeres") || ex.result === "M")
    );

    if (passedPractical) {
        return {
            activePhase: "Phase 5: Sikeres forgalmi vizsga (Befejezte)",
            originalDate: null,
            shiftedDate: null,
            isShifted: false
        };
    }

    // Filter theory exams
    const theoryExams = examResults.filter(ex =>
        ex.subject && ex.subject.includes("Közlekedési alapismeretek") && !ex.isSynthetic
    );

    // Sort theory exams by date descending
    theoryExams.sort((a, b) => {
        const dA = parseExamDate(a.date);
        const dB = parseExamDate(b.date);
        return dB - dA;
    });

    const successfulTheory = theoryExams.find(ex =>
        ex.result && (ex.result.toLowerCase().includes("sikeres") || ex.result === "M")
    );

    const failedTheories = theoryExams.filter(ex =>
        ex.result && (ex.result.toLowerCase().includes("sikertelen") || ex.result === "1")
    );

    // KAV Deadline Calculation Helper
    // 1. Normalize to noon (Déli Horgony) to avoid timezone/DST rollover bugs.
    // 2. Add requested time (exactly 9 months, 1 year, 2 years).
    const calculateKAVDate = (baseDate, {days = 0, months = 0, years = 0}) => {
        const d = new Date(baseDate);
        // "Déli Horgony" (UTC 12:00:00) biztosítja, hogy a nyári/téli időszámítás 
        // ne tolja át a dátumot a szomszédos napra.
        d.setUTCHours(12, 0, 0, 0);

        if (years) d.setUTCFullYear(d.getUTCFullYear() + years);
        if (months) d.setUTCMonth(d.getUTCMonth() + months);
        if (days) d.setUTCDate(d.getUTCDate() + days);

        // KAV logikájában nincs "Mínusz 1 nap" szabály a lejáratra, a határidő napra pontosan megegyezik a kezdeti nappal.
        // d.setDate(d.getDate() - 1); // <--- EZT TÖRÖLTÜK

        return d;
    };

    // Helper to evaluate if a calculated shifted date is expired
    const evaluateExpired = (phaseName, original, shiftedDate, isShifted) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(shiftedDate);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            return {
                activePhase: `Lezárva (Lejárt): ${phaseName}`,
                originalDate: Timestamp.fromDate(original),
                shiftedDate: Timestamp.fromDate(shiftedDate),
                isShifted: isShifted
            };
        }
        return {
            activePhase: phaseName,
            originalDate: Timestamp.fromDate(original),
            shiftedDate: Timestamp.fromDate(shiftedDate),
            isShifted: isShifted
        };
    };

    // Phase 4: Successful theory -> 2 years from successful theory exam date. (Shift to working day).
    if (successfulTheory) {
        const examDate = parseExamDate(successfulTheory.date);
        if (examDate && !isNaN(examDate.getTime())) {
            const deadlineDate = calculateKAVDate(examDate, {years: 2});

            const {date: finalDate, shifted} = getNextWorkingDay(deadlineDate);
            finalDate.setUTCHours(12, 0, 0, 0);

            return evaluateExpired("Phase 4: Sikeres KRESZ vizsga (2 év)", deadlineDate, finalDate, shifted);
        }
    }

    // Phase 3 & 2 require studentIdAssignedAt
    if (studentIdAssignedAt) {
        // Find if there is a failed theory within 9 months of azonositoMegadasa
        let hasFailedWithin9Months = false;

        // Use standard exactly 9 months ahead for the failure window check
        const nineMonthsFromAssigned = new Date(studentIdAssignedAt);
        // Déli Horgony használata a vizsgaablak vizsgálatához is!
        nineMonthsFromAssigned.setUTCHours(12, 0, 0, 0);
        nineMonthsFromAssigned.setUTCMonth(nineMonthsFromAssigned.getUTCMonth() + 9);

        for (const failed of failedTheories) {
            // Check if the failure is within 9 months AFTER the studentIdAssignedAt date.
            // The rule says "within 9 months of azonositoMegadasa".
            const failedDate = parseExamDate(failed.date);
            if (failedDate && !isNaN(failedDate.getTime())) {
                if (failedDate.getTime() >= studentIdAssignedAt.getTime() &&
                    failedDate.getTime() <= nineMonthsFromAssigned.getTime()) {
                    hasFailedWithin9Months = true;
                    break;
                }
            }
        }

        if (hasFailedWithin9Months) {
            // Phase 3: NO successful theory, but has failed theory within 9 months -> 12 months from azonositoMegadasa.
            const deadlineDate = calculateKAVDate(studentIdAssignedAt, {months: 12});

            const {date: finalDate, shifted} = getNextWorkingDay(deadlineDate);
            finalDate.setUTCHours(12, 0, 0, 0);

            return evaluateExpired("Phase 3: Sikertelen elmélet (12 hónap azonosítótól)", deadlineDate, finalDate, shifted);
        } else {
            // Phase 2: Has azonositoMegadasa but no successful or valid failed theory -> 9 months from azonositoMegadasa.
            const deadlineDate = calculateKAVDate(studentIdAssignedAt, {months: 9});

            const {date: finalDate, shifted} = getNextWorkingDay(deadlineDate);
            finalDate.setUTCHours(12, 0, 0, 0);

            return evaluateExpired("Phase 2: Azonosító kiadva (9 hónap)", deadlineDate, finalDate, shifted);
        }
    }

    // Phase 1: Has beiratkozasIdeje but NO azonositoMegadasa -> exactly 90 calendar days from enrolledAt.
    if (enrolledAt && !studentIdAssignedAt) {
        const deadlineDate = calculateKAVDate(enrolledAt, {days: 90});

        // NO working day shift for Phase 1
        return evaluateExpired("Phase 1: Beiratkozva (90 nap)", deadlineDate, deadlineDate, false);
    }

    // No relevant dates found
    return null;
}

module.exports = {
    calculateDeadline,
    getNextWorkingDay
};
