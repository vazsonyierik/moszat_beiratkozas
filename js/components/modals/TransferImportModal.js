/**
 * js/components/modals/TransferImportModal.js
 * Modal for bulk importing transfer students via CSV/TSV.
 */
import { html, LoadingOverlay } from '../../UI.js';
import { functions, httpsCallable } from '../../firebase.js';
import { XIcon, UploadCloudIcon } from '../../Icons.js';
import { useToast } from '../../context/AppContext.js';

const React = window.React;
const { useState, Fragment } = React;

const parseFullName = (fullName) => {
    if (!fullName) return { lastName: '', firstName: '' };
    const parts = fullName.trim().split(' ');
    const lastName = parts[0] || '';
    const firstName = parts.slice(1).join(' ') || '';
    return { lastName, firstName };
};

const parseAddress = (addressStr) => {
    if (!addressStr) return { zip: '', city: '', street: '' };
    // Matches something like "1234 Budapest, Példa utca 1."
    const zipMatch = addressStr.match(/\b\d{4}\b/);
    const zip = zipMatch ? zipMatch[0] : '';

    let rest = addressStr;
    if (zip) {
        rest = rest.replace(zip, '').trim();
    }

    // Assume city is the next word after zip, usually separated by space or comma
    const parts = rest.split(/[,]+/);
    let city = '';
    let street = rest;

    if (parts.length > 1) {
        city = parts[0].trim();
        street = parts.slice(1).join(',').trim();
    } else {
        const words = rest.split(' ');
        city = words[0] || '';
        street = words.slice(1).join(' ') || '';
    }

    return { zip, city, street };
};

const TransferImportModal = ({ onClose, adminUser, isTestView }) => {
    const [file, setFile] = useState(null);
    const [parsedStudents, setParsedStudents] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState(null);

    const showToast = useToast();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (fileToParse) => {
        setIsParsing(true);
        setError(null);
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target.result;
            // Determine delimiter
            const delimiter = text.includes('\t') ? '\t' : ';';

            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                setError("A fájl üres, vagy nem tartalmaz fejlécet.");
                setIsParsing(false);
                return;
            }

            // Skip header (index 0)
            const students = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(delimiter).map(col => col.trim());
                // Expected headers:
                // 0: Tanuló neve, 1: Születéskori neve, 2: Születési hely, 3: Születési kerület,
                // 4: Születési idő, 5: Anyja neve, 6: Állandó lakcím, 7: Tartózkodási hely,
                // 8: Telefonszám, 9: Email cím, 10: Tanuló azonosító, 11: Sikeres KRESZ

                const studentName = parseFullName(cols[0]);
                const birthName = parseFullName(cols[1]);
                const motherName = parseFullName(cols[5]);

                const permAddress = parseAddress(cols[6]);
                const tempAddress = parseAddress(cols[7]);

                const studentObj = {
                    current_lastName: studentName.lastName,
                    current_firstName: studentName.firstName,
                    birth_lastName: birthName.lastName || studentName.lastName,
                    birth_firstName: birthName.firstName || studentName.firstName,
                    birth_city: cols[2] || '',
                    birth_district: cols[3] || '',
                    birthDate: cols[4] || '',
                    mother_lastName: motherName.lastName,
                    mother_firstName: motherName.firstName,

                    permanent_address_zip: permAddress.zip,
                    permanent_address_city: permAddress.city,
                    permanent_address_street: permAddress.street,

                    temporary_address_zip: tempAddress.zip,
                    temporary_address_city: tempAddress.city,
                    temporary_address_street: tempAddress.street,
                    residenceIsSame: !cols[7], // if no temp address, assume same

                    phone_number: cols[8] || '',
                    email: cols[9] || '',
                    studentId: cols[10] || '',
                    transferKreszDate: cols[11] || '',

                    isTransferStudent: true,

                    // defaults
                    nationality: 'magyar',
                    birth_country: 'Magyarország',
                    permanent_address_country: 'Magyarország',
                    temporary_address_country: 'Magyarország',
                };

                // Only add if it has a name
                if (studentObj.current_lastName) {
                    students.push(studentObj);
                }
            }

            setParsedStudents(students);
            setIsParsing(false);
        };

        reader.onerror = () => {
            setError("Hiba a fájl beolvasása során.");
            setIsParsing(false);
        };

        reader.readAsText(fileToParse);
    };

    const handleImport = async () => {
        if (parsedStudents.length === 0) return;

        setIsImporting(true);
        try {
            const bulkAdd = httpsCallable(functions, 'adminBulkAddTransferStudents');
            const result = await bulkAdd({
                students: parsedStudents,
                _isTest: isTestView
            });

            showToast(`Sikeresen importálva ${result.data.count} tanuló!`, 'success');
            onClose();
        } catch (err) {
            console.error("Hiba az importálás során:", err);
            showToast(`Hiba történt: ${err.message}`, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick=${e => e.stopPropagation()}>
                <header className=${`p-6 border-b rounded-t-xl flex justify-between items-center ${isTestView ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <${UploadCloudIcon} size=${28} className="text-indigo-600" />
                            Áthelyezett Tanulók Importálása (CSV/TSV)
                            ${isTestView && html`<span className="text-red-600 ml-2 text-sm">(TESZT MÓD)</span>`}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                            Válaszd ki az Excelből exportált .csv vagy .tsv fájlt a tanulók tömeges rögzítéséhez.
                        </p>
                    </div>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <${XIcon} size=${24} />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto flex-grow">
                    ${isParsing && html`<div className="text-center p-4"><span className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full inline-block"></span> Fájl feldolgozása...</div>`}
                    ${error && html`<div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">${error}</div>`}

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fájl kiválasztása (.csv, .tsv, .txt)</label>
                        <input
                            type="file"
                            accept=".csv, .tsv, .txt"
                            onChange=${handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer"
                        />
                    </div>

                    ${parsedStudents.length > 0 && html`
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Feldolgozott adatok előnézete (${parsedStudents.length} tanuló)</h4>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500">Név</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500">Azonosító</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500">KRESZ Dátum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        ${parsedStudents.map((s, idx) => html`
                                            <tr key=${idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900">${s.current_lastName} ${s.current_firstName}</td>
                                                <td className="px-4 py-2 text-gray-500">${s.email}</td>
                                                <td className="px-4 py-2 text-gray-500">${s.studentId}</td>
                                                <td className="px-4 py-2 text-gray-500">${s.transferKreszDate}</td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                </main>

                <footer className="p-4 bg-gray-50 border-t rounded-b-xl flex justify-end gap-3">
                    <button onClick=${onClose} className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Mégse</button>
                    <button
                        onClick=${handleImport}
                        disabled=${parsedStudents.length === 0 || isImporting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                        ${isImporting ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Importálás folyamatban...` : `Importálás (${parsedStudents.length})`}
                    </button>
                </footer>
            </div>
        </div>
    `;
};

export default TransferImportModal;