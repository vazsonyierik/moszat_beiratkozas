import { html } from '../../UI.js';
import { db, collection, query, where, getDocs, updateDoc, doc, addDoc, orderBy, limit, deleteDoc } from '../../firebase.js';
import * as Icons from '../../Icons.js';

const { useState, useRef, useEffect, Fragment } = window.React;
const XLSX = window.XLSX;

const ExamImportModal = ({ onClose, onImportComplete, isTestView }) => {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [error, setError] = useState(null);
    const [pendingOverrides, setPendingOverrides] = useState([]);
    const [activeTab, setActiveTab] = useState('errors');
    const [importHistory, setImportHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const fileInputRef = useRef(null);

    const fetchHistory = async () => {
        try {
            const q = query(collection(db, 'import_logs'), orderBy('createdAt', 'desc'), limit(5));
            const snapshot = await getDocs(q);
            setImportHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Nem sikerült betölteni az előzményeket:", err);
        }
    };

    const saveImportLog = async (finalResults) => {
        try {
            const logEntry = {
                createdAt: new Date().toISOString(),
                isTest: isTestView,
                ...finalResults
            };

            // 1. Save new log
            await addDoc(collection(db, 'import_logs'), logEntry);

            // 2. Cleanup: keep only latest 5
            const q = query(collection(db, 'import_logs'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            if (snapshot.size > 5) {
                const toDelete = snapshot.docs.slice(5);
                toDelete.forEach(doc => deleteDoc(doc.ref));
            }
        } catch (err) {
            console.error("Hiba a log mentésekor:", err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setImportResults(null);
            setPendingOverrides([]);
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

    const formatExamDate = (rawDate) => {
        if (rawDate instanceof Date) {
            // Round to nearest minute: add 30 seconds, then floor to minute
            const roundedTime = new Date(Math.round(rawDate.getTime() / 60000) * 60000);

            const y = roundedTime.getFullYear();
            const m = String(roundedTime.getMonth() + 1).padStart(2, '0');
            const d = String(roundedTime.getDate()).padStart(2, '0');
            const hours = String(roundedTime.getHours()).padStart(2, '0');
            const mins = String(roundedTime.getMinutes()).padStart(2, '0');
            return `${y}.${m}.${d}. ${hours}:${mins}`;
        }
        return rawDate.toString();
    };

    const importRow = async (row, docRef, studentData, results, isForce = false, mode = 'normal') => {
        const formattedExamDate = formatExamDate(row.examDateRaw);
        const existingResults = studentData.examResults || [];

        // Logic: Find existing exam by Subject + Date
        const existingIndex = existingResults.findIndex(ex =>
            ex.subject === row.subject && ex.date === formattedExamDate
        );

        if (mode === 'delete') {
            if (existingIndex !== -1) {
                 const existingExam = existingResults[existingIndex];
                 if (existingExam.result !== 'Törölve') {
                     const updatedExam = { ...existingExam, result: 'Törölve', importedAt: new Date().toISOString() };
                     const newResults = [...existingResults];
                     newResults[existingIndex] = updatedExam;

                     await updateDoc(docRef, { examResults: newResults });
                     if (results) results.updated.push({
                         studentId: studentData.studentId,
                         subject: row.subject,
                         date: formattedExamDate,
                         result: 'Törölve',
                         prevResult: existingExam.result
                     });
                 }
            }
            // If not found in delete mode, do nothing (as requested)
            return;
        }

        if (existingIndex !== -1) {
            // Found match. Check if we should update.
            const existingExam = existingResults[existingIndex];

            const isExistingPlaceholder = !existingExam.result || existingExam.result === "Kiírva";
            const isNewConcrete = row.result && row.result !== "Kiírva";

            if (isExistingPlaceholder && isNewConcrete) {
                // Update logic
                const updatedExam = { ...existingExam, result: row.result, importedAt: new Date().toISOString() };
                const newResults = [...existingResults];
                newResults[existingIndex] = updatedExam;

                await updateDoc(docRef, { examResults: newResults });
                if (results) results.updated.push({
                    studentId: studentData.studentId,
                    subject: row.subject,
                    date: formattedExamDate,
                    result: row.result,
                    prevResult: existingExam.result
                });
            } else {
                // Duplicate or no update needed
                if (results) results.skipped.push({
                    studentId: studentData.studentId,
                    subject: row.subject,
                    date: formattedExamDate,
                    reason: "Már létező eredmény",
                    existingResult: existingExam.result
                });
            }
        } else {
            // New exam entry
            const examResult = {
                subject: row.subject,
                date: formattedExamDate,
                result: row.result,
                location: row.location,
                importedAt: new Date().toISOString()
            };

            await updateDoc(docRef, {
                examResults: [...existingResults, examResult]
            });
            if (results) results.success.push({
                studentId: studentData.studentId,
                subject: row.subject,
                date: formattedExamDate,
                result: row.result,
                location: row.location
            });
        }
    };

    const processExcel = async () => {
        if (!file) {
            setError("Kérlek válassz ki egy fájlt!");
            return;
        }

        setIsProcessing(true);
        setImportResults(null);
        setError(null);
        setPendingOverrides([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // Use cellDates: true to parse dates as JS Date objects where possible
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                const results = {
                    success: [],
                    updated: [],
                    errors: [],
                    skipped: [],
                    caseFiled: [], // New category
                    debugInfo: null
                };

                const overrides = [];
                const collectionName = isTestView ? 'registrations_test' : 'registrations';

                // Helper to find sheets by partial name match
                const findSheet = (partialName) => workbook.SheetNames.find(n => n.toLowerCase().includes(partialName.toLowerCase()));

                // Define processing order
                const processingSteps = [
                    { key: 'foglalva', sheetName: findSheet('vizsgaidőpont foglalva'), mode: 'normal' },
                    { key: 'eredmeny', sheetName: findSheet('vizsgaeredmény rögzítve'), mode: 'normal' },
                    { key: 'torolve', sheetName: findSheet('vizsgaidőpont törölve'), mode: 'delete' },
                    { key: 'iktatva', sheetName: findSheet('ügy iktatva'), mode: 'caseFile' }
                ];

                // Debug info capture
                results.debugInfo = {
                    processedSheets: processingSteps.map(s => s.sheetName).filter(Boolean)
                };

                for (const step of processingSteps) {
                    if (!step.sheetName) continue;

                    const worksheet = workbook.Sheets[step.sheetName];
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

                    if (headerRowIndex === -1) continue;

                    const headers = jsonData[headerRowIndex].map(h => h ? h.toString().trim() : "");
                    const studentIdIdx = headers.indexOf('Tanuló azonosító');
                    // "Ügy iktatva" sheet might not have "Szül. ideje" or "Vizsgatárgy" depending on structure,
                    // checking required columns based on mode.

                    const isCaseFileMode = step.mode === 'caseFile';

                    const birthDateIdx = headers.findIndex(h => h.includes('Szül.'));
                    const subjectIdx = headers.indexOf('Vizsgatárgy');
                    const examDateIdx = headers.indexOf('Vizsga'); // "Vizsga" is the date column
                    const resultIdx = headers.indexOf('Eredmény');
                    const locationIdx = headers.indexOf('Vizsgahely');

                    // Validation: Case File mode only needs Student ID (and ideally Birth Date for verification)
                    if (studentIdIdx === -1) continue;

                    if (!isCaseFileMode && (subjectIdx === -1 || examDateIdx === -1)) {
                         // Skip sheet if essential exam columns are missing for exam modes
                         continue;
                    }

                    const rows = jsonData.slice(headerRowIndex + 1);

                    for (const row of rows) {
                        const studentIdRaw = row[studentIdIdx];
                        const studentId = studentIdRaw ? studentIdRaw.toString().trim() : "";
                        if (!studentId) continue;

                        const birthDateRaw = birthDateIdx !== -1 ? row[birthDateIdx] : null;

                        // Query Firestore
                        const q = query(collection(db, collectionName), where("studentId", "==", studentId));
                        const querySnapshot = await getDocs(q);

                        if (querySnapshot.empty) {
                            if (!isCaseFileMode) {
                                results.errors.push({ id: studentId, msg: "Tanuló nem található a rendszerben." });
                            }
                            continue;
                        }

                        const docRef = querySnapshot.docs[0].ref;
                        const studentData = querySnapshot.docs[0].data();

                        // Birth Date Verification (if available in sheet)
                        if (birthDateRaw) {
                             const excelBirthDate = normalizeDate(birthDateRaw);
                             const dbBirthDate = normalizeDate(studentData.birthDate);

                             if (excelBirthDate && dbBirthDate && dbBirthDate !== excelBirthDate) {
                                 // Create override object
                                 const overrideObj = {
                                     row: { studentId, subject: row[subjectIdx], examDateRaw: row[examDateIdx], result: row[resultIdx], location: row[locationIdx] }, // Capture what we can
                                     errorMsg: `Születési dátum eltérés (Rendszer: ${dbBirthDate}, Excel: ${excelBirthDate})`,
                                     docRef,
                                     studentData,
                                     mode: step.mode // Pass mode to override handler
                                 };
                                 overrides.push(overrideObj);
                                 continue;
                             }
                        }

                        if (isCaseFileMode) {
                            // "Ügy iktatva" logic
                            if (!studentData.isCaseFiled) {
                                await updateDoc(docRef, { isCaseFiled: true });
                                results.caseFiled.push({
                                    studentId: studentId,
                                    name: studentData.current_lastName + ' ' + studentData.current_firstName
                                });
                            }
                        } else {
                            // Exam logic (Import, Update, Delete)
                            const subject = row[subjectIdx]?.toString().trim();
                            const examDateRaw = row[examDateIdx];
                            let result = resultIdx !== -1 ? row[resultIdx]?.toString().trim() : "";
                            const location = locationIdx !== -1 ? row[locationIdx]?.toString().trim() : '';

                            if (!result) result = "Kiírva";

                            if (!subject || !examDateRaw) {
                                results.errors.push({ id: studentId, msg: "Hiányzó vizsgaadatok (tárgy vagy dátum)." });
                                continue;
                            }

                            await importRow(
                                { studentId, subject, examDateRaw, result, location },
                                docRef,
                                studentData,
                                results,
                                false,
                                step.mode
                            );
                        }
                    }
                }

                setImportResults(results);
                setPendingOverrides(overrides);

                if (overrides.length === 0) {
                     saveImportLog(results);
                }

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

    const handleForceImport = async (overrideItem, index) => {
        if (!window.confirm("Biztosan importálod ezt a tételt a hiba ellenére?")) return;

        try {
            if (overrideItem.mode === 'caseFile') {
                 if (!overrideItem.studentData.isCaseFiled) {
                    await updateDoc(overrideItem.docRef, { isCaseFiled: true });
                     setImportResults(prev => ({
                        ...prev,
                        caseFiled: [...prev.caseFiled, {
                            studentId: overrideItem.row.studentId,
                             name: overrideItem.studentData.current_lastName + ' ' + overrideItem.studentData.current_firstName
                        }]
                    }));
                 }
            } else {
                await importRow(overrideItem.row, overrideItem.docRef, overrideItem.studentData, null, true, overrideItem.mode);

                setImportResults(prev => ({
                    ...prev,
                    success: [...prev.success, {
                        studentId: overrideItem.row.studentId,
                        subject: overrideItem.row.subject,
                        date: overrideItem.row.examDateRaw instanceof Date ? overrideItem.row.examDateRaw.toLocaleDateString() : overrideItem.row.examDateRaw,
                        result: overrideItem.row.result,
                        location: overrideItem.row.location,
                        note: "Kényszerített import"
                    }]
                }));
            }

            // Remove from list
            const newOverrides = [...pendingOverrides];
            newOverrides.splice(index, 1);
            setPendingOverrides(newOverrides);

            if (newOverrides.length === 0) {
                // saveImportLog(importResults); // Would need latest state
            }

        } catch (err) {
            console.error("Force import failed:", err);
            setError("Hiba a kényszerített importálás során: " + err.message);
        }
    };

    const handleShowHistory = () => {
        if (!showHistory) {
            fetchHistory();
        }
        setShowHistory(!showHistory);
    };

    const loadHistoryItem = (item) => {
        setImportResults({
            success: item.success,
            updated: item.updated,
            skipped: item.skipped,
            errors: item.errors,
            debugInfo: item.debugInfo
        });
        setPendingOverrides([]);
        setShowHistory(false);
    };

    if (showHistory) {
         // Fix: Ensure Icons are used correctly and destructured Fragment is used for list
         return html`
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]">
                    <header className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <h3 className="text-xl font-bold text-gray-800">Importálási Előzmények (Utolsó 5)</h3>
                        <button onClick=${() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><${Icons.XIcon} size=${24} /></button>
                    </header>
                    <div className="p-4 overflow-y-auto">
                        ${importHistory.length === 0 ? html`<p className="text-center text-gray-500">Nincsenek korábbi importálások.</p>` :
                            html`<ul className="divide-y divide-gray-200">
                                ${importHistory.map(log => html`
                                    <li key=${log.id} className="py-4 hover:bg-gray-50 cursor-pointer rounded px-2 transition-colors" onClick=${() => loadHistoryItem(log)}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">${new Date(log.createdAt).toLocaleString('hu-HU')}</p>
                                                <p className="text-xs text-gray-500">
                                                    Sikeres: ${log.success?.length || 0},
                                                    Frissítve: ${log.updated?.length || 0},
                                                    Iktatva: ${log.caseFiled?.length || 0},
                                                    Hiba: ${log.errors?.length || 0}
                                                </p>
                                            </div>
                                            <${Icons.ChevronRightIcon} size=${20} className="text-gray-400" />
                                        </div>
                                    </li>
                                `)}
                            </ul>`
                        }
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <header className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <${Icons.UploadCloudIcon} size=${24} className="text-indigo-600"/>
                        Vizsgaeredmények Importálása (KAV)
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick=${handleShowHistory} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md transition-colors mr-2">Előzmények</button>
                        <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <${Icons.XIcon} size=${24} />
                        </button>
                    </div>
                </header>

                <main className="p-6 overflow-y-auto flex-grow">
                    ${!importResults ? html`
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                <p className="font-semibold mb-2">Importálási tudnivalók:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>A fájl formátuma <strong>.xlsx</strong> legyen.</li>
                                    <li>Támogatott munkalapok: <strong>"Vizsgaidőpont foglalva"</strong>, <strong>"Vizsgaeredmény rögzítve"</strong>, <strong>"Vizsgaidőpont törölve"</strong>, <strong>"Ügy iktatva"</strong>.</li>
                                    <li>A rendszer a <strong>Tanuló azonosító</strong> és <strong>Születési dátum</strong> alapján azonosít.</li>
                                    <li>A meglévő "Kiírva" státuszú vizsgákat az eredmény importáláskor frissíti.</li>
                                    <li>A "Törölve" munkalapon lévő vizsgák eredménye "Törölve" státuszra vált.</li>
                                    <li>Az "Ügy iktatva" munkalapon lévő tanulók "Ügy iktatva" jelölést kapnak.</li>
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
                            <div className="grid grid-cols-5 gap-4 text-center">
                                <div className="bg-green-100 p-2 rounded-lg border border-green-200 cursor-pointer hover:bg-green-200 transition-colors" onClick=${() => setActiveTab('success')}>
                                    <div className="text-xl font-bold text-green-700">${importResults.success.length}</div>
                                    <div className="text-xs text-green-800 uppercase font-semibold tracking-wide">Új</div>
                                </div>
                                <div className="bg-blue-100 p-2 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors" onClick=${() => setActiveTab('updated')}>
                                    <div className="text-xl font-bold text-blue-700">${importResults.updated.length}</div>
                                    <div className="text-xs text-blue-800 uppercase font-semibold tracking-wide">Frissítve</div>
                                </div>
                                <div className="bg-purple-100 p-2 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors" onClick=${() => setActiveTab('caseFiled')}>
                                    <div className="text-xl font-bold text-purple-700">${importResults.caseFiled ? importResults.caseFiled.length : 0}</div>
                                    <div className="text-xs text-purple-800 uppercase font-semibold tracking-wide">Iktatva</div>
                                </div>
                                <div className="bg-yellow-100 p-2 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-200 transition-colors" onClick=${() => setActiveTab('skipped')}>
                                    <div className="text-xl font-bold text-yellow-700">${importResults.skipped.length}</div>
                                    <div className="text-xs text-yellow-800 uppercase font-semibold tracking-wide">Kihagyva</div>
                                </div>
                                <div className="bg-red-100 p-2 rounded-lg border border-red-200 cursor-pointer hover:bg-red-200 transition-colors" onClick=${() => setActiveTab('errors')}>
                                    <div className="text-xl font-bold text-red-700">${importResults.errors.length + pendingOverrides.length}</div>
                                    <div className="text-xs text-red-800 uppercase font-semibold tracking-wide">Hiba</div>
                                </div>
                            </div>

                            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700 flex justify-between items-center">
                                    <span>
                                        ${activeTab === 'success' && 'Újonnan hozzáadott vizsgák'}
                                        ${activeTab === 'updated' && 'Frissített / Törölt vizsgaeredmények'}
                                        ${activeTab === 'caseFiled' && 'Iktatott ügyek'}
                                        ${activeTab === 'skipped' && 'Kihagyott tételek'}
                                        ${activeTab === 'errors' && 'Hibák és Eltérések'}
                                    </span>
                                </div>
                                <div className="overflow-x-auto max-h-80">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500">Azonosító</th>
                                                ${activeTab !== 'errors' && activeTab !== 'caseFiled' && html`
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Tárgy</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Dátum</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Helyszín</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Eredmény</th>
                                                `}
                                                ${activeTab === 'caseFiled' && html`<th className="px-4 py-2 text-left font-medium text-gray-500">Név</th>`}
                                                ${activeTab === 'errors' && html`<th className="px-4 py-2 text-left font-medium text-gray-500">Hiba üzenet / Ok</th>`}
                                                ${activeTab === 'skipped' && html`<th className="px-4 py-2 text-left font-medium text-gray-500">Ok</th>`}
                                                ${activeTab === 'errors' && html`<th className="px-4 py-2 text-right font-medium text-gray-500">Művelet</th>`}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            ${activeTab === 'success' && importResults.success.map((item, idx) => html`
                                                <tr key=${idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-mono text-xs">${item.studentId}</td>
                                                    <td className="px-4 py-2">${item.subject}</td>
                                                    <td className="px-4 py-2">${item.date}</td>
                                                    <td className="px-4 py-2 text-xs text-gray-500">${item.location}</td>
                                                    <td className="px-4 py-2 font-medium">${item.result}</td>
                                                </tr>
                                            `)}

                                            ${activeTab === 'updated' && importResults.updated.map((item, idx) => html`
                                                <tr key=${idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-mono text-xs">${item.studentId}</td>
                                                    <td className="px-4 py-2">${item.subject}</td>
                                                    <td className="px-4 py-2">${item.date}</td>
                                                    <td className="px-4 py-2 text-xs text-gray-500">-</td>
                                                    <td className="px-4 py-2">
                                                        <span className="text-gray-400 line-through mr-2 text-xs">${item.prevResult}</span>
                                                        <span className="font-medium ${item.result === 'Törölve' ? 'text-red-600' : 'text-blue-600'}">${item.result}</span>
                                                    </td>
                                                </tr>
                                            `)}

                                            ${activeTab === 'caseFiled' && (importResults.caseFiled || []).map((item, idx) => html`
                                                <tr key=${idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-mono text-xs">${item.studentId}</td>
                                                    <td className="px-4 py-2 font-medium">${item.name}</td>
                                                </tr>
                                            `)}

                                            ${activeTab === 'skipped' && importResults.skipped.map((item, idx) => html`
                                                <tr key=${idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-mono text-xs">${item.studentId}</td>
                                                    <td className="px-4 py-2">${item.subject}</td>
                                                    <td className="px-4 py-2">${item.date}</td>
                                                    <td className="px-4 py-2 text-xs text-gray-500">-</td>
                                                    <td className="px-4 py-2 text-gray-500">${item.existingResult}</td>
                                                    <td className="px-4 py-2 text-orange-600 text-xs">${item.reason}</td>
                                                </tr>
                                            `)}

                                            ${activeTab === 'errors' && html`
                                                <${Fragment}>
                                                    ${pendingOverrides.map((item, idx) => html`
                                                        <tr key=${'override-' + idx} className="bg-orange-50 hover:bg-orange-100">
                                                            <td className="px-4 py-3 font-mono text-xs text-gray-700 align-top">${item.row.studentId}</td>
                                                            <td className="px-4 py-3 text-orange-800 align-top" colSpan="4">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-semibold">Eltérés:</span>
                                                                    <span>${item.errorMsg}</span>
                                                                    <span className="text-xs text-gray-500 mt-1">
                                                                        ${item.mode === 'caseFile' ? 'Iktatás' : `Adatok: ${item.row.subject} (${item.row.result})`}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right align-top">
                                                                <button
                                                                    onClick=${() => handleForceImport(item, idx)}
                                                                    className="bg-orange-600 text-white text-xs font-bold py-1.5 px-3 rounded hover:bg-orange-700 transition-colors shadow-sm"
                                                                >
                                                                    Kényszerítés
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `)}
                                                    ${importResults.errors.map((err, idx) => html`
                                                        <tr key=${'error-' + idx} className="bg-red-50 hover:bg-red-100">
                                                            <td className="px-4 py-2 font-mono text-xs text-gray-700">${err.id}</td>
                                                            <td className="px-4 py-2 text-red-600" colSpan="4">${err.msg}</td>
                                                            <td></td>
                                                        </tr>
                                                    `)}
                                                </${Fragment}>
                                            `}
                                        </tbody>
                                    </table>
                                    ${activeTab === 'success' && importResults.success.length === 0 && html`<div className="p-4 text-center text-gray-500">Nincs megjeleníthető adat.</div>`}
                                    ${activeTab === 'updated' && importResults.updated.length === 0 && html`<div className="p-4 text-center text-gray-500">Nincs megjeleníthető adat.</div>`}
                                    ${activeTab === 'caseFiled' && (!importResults.caseFiled || importResults.caseFiled.length === 0) && html`<div className="p-4 text-center text-gray-500">Nincs megjeleníthető adat.</div>`}
                                    ${activeTab === 'skipped' && importResults.skipped.length === 0 && html`<div className="p-4 text-center text-gray-500">Nincs megjeleníthető adat.</div>`}
                                    ${activeTab === 'errors' && importResults.errors.length === 0 && pendingOverrides.length === 0 && html`<div className="p-4 text-center text-gray-500">Nincs hiba.</div>`}
                                </div>
                            </div>

                            ${importResults.debugInfo && html`
                                <details className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
                                    <summary className="cursor-pointer font-bold mb-2">Technikai Információk (Debug)</summary>
                                    <pre className="whitespace-pre-wrap">
Processed Sheets: ${JSON.stringify(importResults.debugInfo.processedSheets, null, 2)}
                                    </pre>
                                </details>
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
