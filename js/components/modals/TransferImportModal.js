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

const normalizePhone = (val) => {
    if (!val) return '';
    let str = String(val).replace(/[^\d+]/g, ''); // Remove spaces, dashes, slashes
    if (str.startsWith('06')) return '+36' + str.slice(2);
    if (str.startsWith('36')) return '+' + str;
    if (str.startsWith('+36')) return str;
    if (str.length === 9) return '+36' + str; // fallback for e.g., 301234567
    return str;
};

const normalizeDateToISO = (val) => {
    if (!val) return '';
    // Handle Excel serial numbers if raw:true was used
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    let str = String(val).trim();
    // Match Hungarian/ISO YYYY.MM.DD or YYYY-MM-DD
    const isoMatch = str.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    // Match US MM/DD/YY from SheetJS default string conversion
    const usMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (usMatch) {
        let y = usMatch[3];
        if (y.length === 2) y = parseInt(y) < 50 ? '20' + y : '19' + y;
        return `${y}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
    }
    return str; // Fallback
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
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "yyyy.mm.dd." });

                if (jsonData.length === 0) {
                    setError("A fájl üres.");
                    setIsParsing(false);
                    return;
                }

                const students = [];
                for (const row of jsonData) {
                    const studentNameStr = String(row['Tanuló neve'] || '');
                    const birthNameStr = String(row['Születéskori neve'] || '');
                    const motherNameStr = String(row['Anyja neve'] || '');
                    const permAddrStr = String(row['Állandó lakcím'] || '');
                    const tempAddrStr = String(row['Tartózkodási hely'] || '');

                    const studentName = parseFullName(studentNameStr);
                    const birthName = parseFullName(birthNameStr);
                    const motherName = parseFullName(motherNameStr);

                    const permAddress = parseAddress(permAddrStr);
                    const tempAddress = parseAddress(tempAddrStr);

                    const studentObj = {
                        current_lastName: studentName.lastName,
                        current_firstName: studentName.firstName,
                        birth_lastName: birthName.lastName || studentName.lastName,
                        birth_firstName: birthName.firstName || studentName.firstName,
                        birth_city: String(row['Születési hely'] || ''),
                        birth_district: String(row['Születési kerület'] || ''),
                        birthDate: normalizeDateToISO(row['Születési idő']),
                        mother_lastName: motherName.lastName,
                        mother_firstName: motherName.firstName,

                        permanent_address_zip: permAddress.zip,
                        permanent_address_city: permAddress.city,
                        permanent_address_street: permAddress.street,

                        temporary_address_zip: tempAddress.zip,
                        temporary_address_city: tempAddress.city,
                        temporary_address_street: tempAddress.street,
                        residenceIsSame: !tempAddrStr.trim(), // if no temp address, assume same

                        phone_number: normalizePhone(row['Telefonszám']),
                        email: String(row['Email cím'] || ''),
                        studentId: String(row['Tanuló azonosító'] || ''),
                        transferKreszDate: normalizeDateToISO(row['Sikeres KRESZ']),

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
            } catch (parseError) {
                console.error("Hiba a fájl feldolgozása során:", parseError);
                setError("Hiba a fájl feldolgozása során. Kérjük ellenőrizd a fájl formátumát.");
            } finally {
                setIsParsing(false);
            }
        };

        reader.onerror = () => {
            setError("Hiba a fájl beolvasása során.");
            setIsParsing(false);
        };

        reader.readAsArrayBuffer(fileToParse);
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fájl kiválasztása (.xlsx, .xls, .csv)</label>
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
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
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Név</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Születéskori név</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Születési adatok</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Anyja neve</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Lakcím</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Telefon</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Email</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Azonosító</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">KRESZ Vizsga</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        ${parsedStudents.map((s, idx) => {
                                            const displayBirthDate = s.birthDate.replace(/-/g, '.') + '.';
                                            const displayKreszDate = s.transferKreszDate.replace(/-/g, '.') + '.';

                                            return html`
                                                <tr key=${idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">${s.current_lastName} ${s.current_firstName}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">${s.birth_lastName} ${s.birth_firstName}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">${s.birth_city}, ${displayBirthDate}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">${s.mother_lastName} ${s.mother_firstName}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">${s.permanent_address_zip} ${s.permanent_address_city}, ${s.permanent_address_street}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">${s.phone_number}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">${s.email}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">${s.studentId}</td>
                                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap font-medium text-indigo-600">${displayKreszDate}</td>
                                                </tr>
                                            `;
                                        })}
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