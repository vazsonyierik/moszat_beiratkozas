/**
 * js/utils.js
 * * This file contains helper functions used across the admin panel.
 * JAVÍTÁS: A formatSingleTimestamp most már helyesen kezeli a null/undefined
 * időbélyegeket, és üres stringet ad vissza, megelőzve a hibás dátumok megjelenítését.
 */
import { Timestamp } from './firebase.js';

// Checks if a student is under 18 based on their birth date string.
export const isStudentUnder18 = (birthDateStr) => {
    if (!birthDateStr) return false;
    const cleanedDateStr = birthDateStr.endsWith('.') ? birthDateStr.slice(0, -1) : birthDateStr;
    const parts = cleanedDateStr.split('.').map(p => parseInt(p, 10));
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const [year, month, day] = parts;
    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age < 18;
};

// Checks if a student has studied before at our school or elsewhere.
export const hasStudentStudiedBefore = (studyStatus) => studyStatus === 'igen_nalunk' || studyStatus === 'igen_mashol';

// Checks if a student has a previous license.
export const hasPreviousLicense = (licenseStatus) => licenseStatus === 'igen';

// Checks if a student has a medical certificate.
export const hasMedicalCertificate = (reg) => !!reg.hasMedicalCertificate;

// Checks if a student has completed the course.
export const hasCompletedCourse = (reg) => !!reg.courseCompletedAt;

// Checks if a student ID has been assigned.
export const hasStudentId = (reg) => !!reg.studentId;

// Checks if a student has left a comment.
export const hasComment = (comment) => comment && comment.trim() !== '';

// Formats a Firestore timestamp into separate date and time strings for tables.
export const formatTimestampForTable = (timestamp) => {
    if (!timestamp || !timestamp.seconds) {
        return { date: 'N/A', time: '' };
    }
    const d = new Date(timestamp.seconds * 1000);
    const date = d.toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
};

// Formats a Firestore timestamp into a single localized string.
// JAVÍTÁS: A függvény most már helyesen ellenőrzi a timestamp meglétét és típusát.
// Ha a timestamp érvénytelen (null, undefined, stb.), üres stringet ad vissza,
// így elkerülve, hogy hibásan az aktuális időpont jelenjen meg.
export const formatSingleTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return '';
    }
    const d = timestamp.toDate();
    return d.toLocaleString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Budapest'
    });
};


// Formats a full name from its constituent parts.
export const formatFullName = (prefix, first, last, second) => [prefix, last, first, second].filter(Boolean).join(' ');

// Calculates the number of days that have passed since a Firestore timestamp.
export const calculateDaysSince = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return null;
    const now = new Date();
    const pastDate = new Date(timestamp.seconds * 1000);
    // Set hours to 0 to compare dates only, avoiding time zone issues
    now.setHours(0, 0, 0, 0);
    pastDate.setHours(0, 0, 0, 0);
    const diffTime = now - pastDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Converts a date string (from a date input) to a Firestore Timestamp object.
export const dateStringToTimestamp = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return Timestamp.fromDate(date);
};
