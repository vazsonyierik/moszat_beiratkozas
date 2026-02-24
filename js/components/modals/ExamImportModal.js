import { html } from '../../UI.js';
import { db, collection, query, where, getDocs, updateDoc, doc } from '../../firebase.js';
import * as Icons from '../../Icons.js';

const { useState, useRef, useEffect } = window.React;
const XLSX = window.XLSX;

const ExamImportModal = ({ onClose, onImportComplete, isTestView }) => {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const normalizeDate = (input) => {
        // Handle JS Date object
        if (input instanceof Date && !isNaN(input)) {
            const y = input.getFullYear();
            const m = String(input.getMonth() + 1).padStart(2, '0');
            const d = String(input.getDate()).padStart(2, '0');
            return `${y}.${m}.${d}.`;
        }

        if (typeof input !== 'string') return null;

        const trimmed = input.trim().replace(/\.$/, ''); // Remove trailing dot if exists

        // 1. Try YYYY.MM.DD or YYYY-MM-DD
        const isoMatch = trimmed.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
        if (isoMatch) {
            const y = isoMatch[1];
            const m = isoMatch[2].padStart(2, '0');
            const d = isoMatch[3].padStart(2, '0');
            return `${y}.${m}.${d}.`;
        }

        // 2. Try US format M/D/YY or M/D/YYYY (e.g. 5/1/91)
        const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (usMatch) {
            let y = parseInt(usMatch[3], 10);
            const m = usMatch[1].padStart(2, '0');
            const d = usMatch[2].padStart(2, '0');

            // Handle 2-digit year (cutoff 30 -> 2030, else 19xx)
            if (y < 100) {
                y = y < 30 ? 2000 + y : 1900 + y;
            }
            return `${y}.${m}.${d}.`;
        }

        return null;
    };

    const processExcel = async () => {
        if (!file) {
            setError("Kérlek válassz ki egy fájlt!");
            return;
        }

        setIsProcessing(true);
        setImportResults(null);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // Use cellDates: true to parse dates as JS Date objects where possible
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                // Find potential sheets: "Vizsgaeredmény rögzítve" OR "Vizsgaidőpont foglalva"
                const targetSheets = workbook.SheetNames.filter(name => {
                    const lowerName = name.toLowerCase();
                    return lowerName.includes('vizsgaeredmény') ||
                           lowerName.includes('rögzítve') ||
                           lowerName.includes('vizsgaidőpont') ||
                           lowerName.includes('foglalva');
                });

                if (targetSheets.length === 0) {
                    throw new Error("Nem található 'Vizsgaeredmény rögzítve' vagy 'Vizsgaidőpont foglalva' munkalap a fájlban.");
                }

                const results = {
                    success: 0,
                    updated: 0, // Track updates separately from creates
                    errors: [],
                    skipped: 0
                };

                const collectionName = isTestView ? 'registrations_test' : 'registrations';

                // Iterate through all matching sheets
                for (const sheetName of targetSheets) {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                    // Find header row
                    let headerRowIndex = -1;
                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row.some(cell => typeof cell === 'string' && cell.includes('Tanuló azonosító'))) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        // Skip sheet if no valid header found, but log warning if it was a target sheet?
                        // For now, continue to next sheet.
                        continue;
                    }

                    const headers = jsonData[headerRowIndex].map(h => h ? h.toString().trim() : "");
                    const studentIdIdx = headers.indexOf('Tanuló azonosító');
                    const birthDateIdx = headers.findIndex(h => h.includes('Szül.'));
                    const subjectIdx = headers.indexOf('Vizsgatárgy');
                    const examDateIdx = headers.indexOf('Vizsga'); // "Vizsga" oszlop a dátum
                    const resultIdx = headers.indexOf('Eredmény'); // Optional for "Foglalva"
                    const locationIdx = headers.indexOf('Vizsgahely');

                    if (studentIdIdx === -1 || birthDateIdx === -1 || subjectIdx === -1 || examDateIdx === -1) {
                         // Critical columns missing for this sheet
                         continue;
                    }

                    const rows = jsonData.slice(headerRowIndex + 1);

                    for (const row of rows) {
                        const studentIdRaw = row[studentIdIdx];
                        const studentId = studentIdRaw ? studentIdRaw.toString().trim() : "";

                        if (!studentId) continue; // Skip empty rows

                        const birthDateRaw = row[birthDateIdx];
                        const subject = row[subjectIdx]?.toString().trim();
                        const examDateRaw = row[examDateIdx];
                        let result = resultIdx !== -1 ? row[resultIdx]?.toString().trim() : "";
                        const location = locationIdx !== -1 ? row[locationIdx]?.toString().trim() : '';

                        // Default result if missing (for reservation sheets)
                        if (!result) result = "Kiírva";

                        if (!subject || !examDateRaw) {
                            results.errors.push({ id: studentId, msg: "Hiányzó vizsgaadatok (tárgy vagy dátum)." });
                            continue;
                        }

                        // Normalize dates
                        const excelBirthDate = normalizeDate(birthDateRaw);

                        // FIX: Round time to nearest minute to handle floating point errors
                        let formattedExamDate = "";
                        if (examDateRaw instanceof Date) {
                            // Round to nearest minute: add 30 seconds, then floor to minute
                            const roundedTime = new Date(Math.round(examDateRaw.getTime() / 60000) * 60000);

                            const y = roundedTime.getFullYear();
                            const m = String(roundedTime.getMonth() + 1).padStart(2, '0');
                            const d = String(roundedTime.getDate()).padStart(2, '0');
                            const hours = String(roundedTime.getHours()).padStart(2, '0');
                            const mins = String(roundedTime.getMinutes()).padStart(2, '0');
                            formattedExamDate = `${y}.${m}.${d}. ${hours}:${mins}`;
                        } else {
                            formattedExamDate = examDateRaw.toString();
                        }

                        // Query Firestore for student
                        const q = query(collection(db, collectionName), where("studentId", "==", studentId));
                        const querySnapshot = await getDocs(q);

                        if (querySnapshot.empty) {
                            results.errors.push({ id: studentId, msg: "Tanuló nem található a rendszerben (azonosító alapján)." });
                            continue;
                        }

                        const docRef = querySnapshot.docs[0].ref;
                        const studentData = querySnapshot.docs[0].data();

                        // Verify Birth Date
                        const dbBirthDate = normalizeDate(studentData.birthDate);

                        if (!excelBirthDate) {
                             results.errors.push({
                                id: studentId,
                                msg: `Érvénytelen születési dátum formátum az Excelben: ${birthDateRaw}`
                            });
                            continue;
                        }

                        if (dbBirthDate !== excelBirthDate) {
                            results.errors.push({
                                id: studentId,
                                msg: `Születési dátum eltérés (Rendszer: ${dbBirthDate}, Excel: ${excelBirthDate}).`
                            });
                            continue;
                        }

                        const existingResults = studentData.examResults || [];

                        // Logic: Find existing exam by Subject + Date
                        const existingIndex = existingResults.findIndex(ex =>
                            ex.subject === subject && ex.date === formattedExamDate
                        );

                        if (existingIndex !== -1) {
                            // Found match. Check if we should update.
                            const existingExam = existingResults[existingIndex];

                            // If existing result is 'Kiírva' (or empty) AND we have a concrete result (anything other than 'Kiírva' or empty), UPDATE.
                            // OR if we are just re-importing the same 'Kiírva' reservation, we might skip.

                            const isExistingPlaceholder = !existingExam.result || existingExam.result === "Kiírva";
                            const isNewConcrete = result && result !== "Kiírva";

                            if (isExistingPlaceholder && isNewConcrete) {
                                // Update logic
                                const updatedExam = { ...existingExam, result: result, importedAt: new Date().toISOString() };
                                const newResults = [...existingResults];
                                newResults[existingIndex] = updatedExam;

                                await updateDoc(docRef, { examResults: newResults });
                                results.updated++;
                            } else {
                                // Duplicate or no update needed
                                results.skipped++;
                            }
                        } else {
                            // New exam entry
                            const examResult = {
                                subject: subject,
                                date: formattedExamDate,
                                result: result,
                                location: location,
                                importedAt: new Date().toISOString()
                            };

                            await updateDoc(docRef, {
                                examResults: [...existingResults, examResult]
                            });
                            results.success++;
                        }
                    }
                }

                setImportResults(results);
                if (onImportComplete) onImportComplete();

            } catch (err) {
                console.error("Hiba a feldolgozás során:", err);
                setError(`Hiba történt: ${err.message}`);
            } finally {
                setIsProcessing(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]">
                <header className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <${Icons.UploadCloudIcon} size=${24} className="text-indigo-600"/>
                        Vizsgaeredmények Importálása (KAV)
                    </h3>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <${Icons.XIcon} size=${24} />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto flex-grow">
                    ${!importResults ? html`
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                <p className="font-semibold mb-2">Importálási tudnivalók:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>A fájl formátuma <strong>.xlsx</strong> legyen.</li>
                                    <li>Támogatott munkalapok: <strong>"Vizsgaeredmény rögzítve"</strong>, <strong>"Vizsgaidőpont foglalva"</strong>.</li>
                                    <li>A rendszer a <strong>Tanuló azonosító</strong> és <strong>Születési dátum</strong> alapján azonosít.</li>
                                    <li>A meglévő "Kiírva" státuszú vizsgákat az eredmény importáláskor frissíti.</li>
                                </ul>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors bg-gray-50 hover:bg-indigo-50 group cursor-pointer" onClick=${() => fileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    ref=${fileInputRef}
                                    onChange=${handleFileChange}
                                />
                                <div className="flex flex-col items-center justify-center space-y-3">
                                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <${Icons.FilePlusIcon} size=${32} className="text-indigo-500" />
                                    </div>
                                    <span className="text-gray-600 font-medium text-lg">
                                        ${file ? file.name : "Kattints a fájl kiválasztásához"}
                                    </span>
                                    <span className="text-sm text-gray-400">Excel (.xlsx) fájlok támogatottak</span>
                                </div>
                            </div>

                            ${error && html`
                                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                                    <${Icons.AlertTriangleIcon} size=${20} className="flex-shrink-0 mt-0.5" />
                                    <span>${error}</span>
                                </div>
                            `}
                        </div>
                    ` : html`
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div className="bg-green-100 p-4 rounded-lg border border-green-200">
                                    <div className="text-2xl font-bold text-green-700">${importResults.success}</div>
                                    <div className="text-xs text-green-800 uppercase font-semibold tracking-wide">Új</div>
                                </div>
                                <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
                                    <div className="text-2xl font-bold text-blue-700">${importResults.updated}</div>
                                    <div className="text-xs text-blue-800 uppercase font-semibold tracking-wide">Frissítve</div>
                                </div>
                                <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-200">
                                    <div className="text-2xl font-bold text-yellow-700">${importResults.skipped}</div>
                                    <div className="text-xs text-yellow-800 uppercase font-semibold tracking-wide">Kihagyva</div>
                                </div>
                                <div className="bg-red-100 p-4 rounded-lg border border-red-200">
                                    <div className="text-2xl font-bold text-red-700">${importResults.errors.length}</div>
                                    <div className="text-xs text-red-800 uppercase font-semibold tracking-wide">Hiba</div>
                                </div>
                            </div>

                            ${importResults.errors.length > 0 && html`
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <${Icons.AlertTriangleIcon} size=${18} className="text-orange-500"/>
                                        Hibalista
                                    </h4>
                                    <div className="bg-gray-50 border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Azonosító</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Hiba oka</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                ${importResults.errors.map((err, idx) => html`
                                                    <tr key=${idx}>
                                                        <td className="px-4 py-2 font-mono text-xs text-gray-700">${err.id}</td>
                                                        <td className="px-4 py-2 text-red-600">${err.msg}</td>
                                                    </tr>
                                                `)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `}
                        </div>
                    `}
                </main>

                <footer className="p-4 sm:p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    ${!importResults ? html`
                        <button onClick=${onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors">Mégse</button>
                        <button
                            onClick=${processExcel}
                            disabled=${!file || isProcessing}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all flex items-center gap-2"
                        >
                            ${isProcessing ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Feldolgozás...` : 'Importálás indítása'}
                        </button>
                    ` : html`
                        <button onClick=${onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium shadow-sm transition-all">Bezárás</button>
                    `}
                </footer>
            </div>
        </div>
    `;
};

export default ExamImportModal;
