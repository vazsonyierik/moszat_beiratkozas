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

    const normalizeDate = (dateStr) => {
        // Input: "2007.09.05." or "2007-09-05" or "2007. 09. 05."
        // Output: "2007.09.05."
        if (!dateStr) return null;
        return dateStr.trim().replace(/-/g, '.').replace(/ /g, '').replace(/\.$/, '') + '.';
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
                const workbook = XLSX.read(data, { type: 'array' });

                // Find the sheet with exam results
                const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('vizsgaeredmény') || name.toLowerCase().includes('rögzítve'));
                if (!sheetName) {
                    throw new Error("Nem található 'Vizsgaeredmény rögzítve' munkalap a fájlban.");
                }

                const worksheet = workbook.Sheets[sheetName];
                // Use raw: false to get formatted strings (dates as strings)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

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
                    throw new Error("Nem található a fejléc sor (Tanuló azonosító oszlop).");
                }

                const headers = jsonData[headerRowIndex].map(h => h.toString().trim());
                const studentIdIdx = headers.indexOf('Tanuló azonosító');
                const birthDateIdx = headers.findIndex(h => h.includes('Szül.'));
                const subjectIdx = headers.indexOf('Vizsgatárgy');
                const examDateIdx = headers.indexOf('Vizsga'); // "Vizsga" oszlop a dátum
                const resultIdx = headers.indexOf('Eredmény');
                const locationIdx = headers.indexOf('Vizsgahely');

                if (studentIdIdx === -1 || birthDateIdx === -1 || subjectIdx === -1 || examDateIdx === -1 || resultIdx === -1) {
                    throw new Error("Hiányzó oszlopok: Tanuló azonosító, Szül. ideje, Vizsgatárgy, Vizsga (dátum), Eredmény.");
                }

                const rows = jsonData.slice(headerRowIndex + 1);
                const results = {
                    success: 0,
                    errors: [],
                    skipped: 0
                };

                const collectionName = isTestView ? 'registrations_test' : 'registrations';

                for (const row of rows) {
                    const studentId = row[studentIdIdx]?.toString().trim();
                    if (!studentId) continue; // Skip empty rows

                    const birthDateRaw = row[birthDateIdx]?.toString().trim();
                    const subject = row[subjectIdx]?.toString().trim();
                    const examDateRaw = row[examDateIdx]?.toString().trim();
                    const result = row[resultIdx]?.toString().trim();
                    const location = locationIdx !== -1 ? row[locationIdx]?.toString().trim() : '';

                    if (!subject || !examDateRaw || !result) {
                        results.errors.push({ id: studentId, msg: "Hiányzó vizsgaadatok (tárgy, dátum vagy eredmény)." });
                        continue;
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
                    const excelBirthDate = normalizeDate(birthDateRaw);

                    if (dbBirthDate !== excelBirthDate) {
                        results.errors.push({
                            id: studentId,
                            msg: `Születési dátum eltérés (Rendszer: ${dbBirthDate}, Excel: ${excelBirthDate}).`
                        });
                        continue;
                    }

                    // Prepare exam result object
                    const examResult = {
                        subject: subject,
                        date: examDateRaw,
                        result: result,
                        location: location,
                        importedAt: new Date().toISOString()
                    };

                    // Check for duplicates
                    const existingResults = studentData.examResults || [];
                    const isDuplicate = existingResults.some(ex =>
                        ex.subject === examResult.subject &&
                        ex.date === examResult.date &&
                        ex.result === examResult.result
                    );

                    if (isDuplicate) {
                        results.skipped++;
                        continue;
                    }

                    // Update document
                    await updateDoc(docRef, {
                        examResults: [...existingResults, examResult]
                    });

                    // If result is 'Megfelelt' and subject is 'Forgalmi vezetés', mark course completed automatically?
                    // (User didn't ask for this, but it's good practice. I'll stick to just importing for now as requested).

                    results.success++;
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
                                    <li>A rendszer a <strong>Tanuló azonosító</strong> és <strong>Születési dátum</strong> alapján azonosít.</li>
                                    <li>A <strong>"Vizsgaeredmény rögzítve"</strong> munkalapot dolgozzuk fel.</li>
                                    <li>Már meglévő eredményeket (azonos tárgy és dátum) a rendszer nem duplikál.</li>
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
                                    <${Icons.AlertIcon} size=${20} className="flex-shrink-0 mt-0.5" />
                                    <span>${error}</span>
                                </div>
                            `}
                        </div>
                    ` : html`
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="bg-green-100 p-4 rounded-lg border border-green-200">
                                    <div className="text-2xl font-bold text-green-700">${importResults.success}</div>
                                    <div className="text-xs text-green-800 uppercase font-semibold tracking-wide">Sikeres</div>
                                </div>
                                <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-200">
                                    <div className="text-2xl font-bold text-yellow-700">${importResults.skipped}</div>
                                    <div className="text-xs text-yellow-800 uppercase font-semibold tracking-wide">Kihagyva (Duplikált)</div>
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
