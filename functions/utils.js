/**
 * functions/utils.js
 * Segédfüggvények a Cloud Functions számára (CommonJS modulként).
 */

// Formátumozza a teljes nevet az alkotóelemekből.
const formatFullName = (prefix, first, last, second) => {
    return [prefix, last, first, second].filter(Boolean).join(' ');
};

// Formátumoz egy Firestore időbélyeget egyetlen lokalizált karakterlánccá.
const formatSingleTimestamp = (timestamp) => {
    // JAVÍTÁS: Ha az időbélyeg nem létezik, üres stringet ad vissza,
    // nem pedig az aktuális időt.
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

// Ellenőrzi, hogy a tanuló 18 év alatti-e a születési dátuma alapján.
const isUnder18 = (birthDateStr) => {
    if (!birthDateStr) return false;
    const cleanedDateStr = birthDateStr.endsWith('.') ? birthDateStr.slice(0, -1) : birthDateStr;
    const parts = cleanedDateStr.split('.').map(p => parseInt(p.trim(), 10));
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

// A függvények exportálása CommonJS szintaxissal.
module.exports = {
    formatFullName,
    formatSingleTimestamp,
    isUnder18,
};
