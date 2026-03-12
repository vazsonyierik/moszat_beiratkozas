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

const formatDateForDB = (val) => {
    if (!val) return '';
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return '';
        const d = new Date(val.getTime() + Math.abs(val.getTimezoneOffset() * 60000));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    let str = String(val).trim();
    const match = str.match(/(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    return str;
};

const parseName = (nameStr) => {
    if (!nameStr) return { prefix: '', last: '', first: '' };
    let str = String(nameStr).trim();
    let prefix = '';
    const lowerStr = str.toLowerCase();
    if (lowerStr.startsWith('dr.') || lowerStr.startsWith('dr ')) {
        prefix = 'Dr.';
        str = str.substring(3).trim();
    } else if (lowerStr.startsWith('ifj.') || lowerStr.startsWith('ifj ')) {
        prefix = 'ifj.';
        str = str.substring(4).trim();
    }
    const parts = str.split(/\s+/);
    return {
        prefix: prefix,
        last: parts[0] || '',
        first: parts.slice(1).join(' ') || ''
    };
};

const parseAddress = (addrStr) => {
    if (!addrStr) return { zip: '', city: '', street: '' };
    let str = String(addrStr).trim();
    let zip = '', city = '', street = str;
    const zipMatch = str.match(/\b(\d{4})\b/);
    if (zipMatch) {
        zip = zipMatch[1];
        let rest = str.replace(zip, '').trim();
        if (rest.startsWith(',')) rest = rest.substring(1).trim();
        const parts = rest.split(',');
        if (parts.length > 1) {
            city = parts[0].trim();
            street = parts.slice(1).join(',').trim();
        } else {
            const spaceIdx = rest.indexOf(' ');
            if (spaceIdx !== -1) {
                city = rest.substring(0, spaceIdx).trim();
                street = rest.substring(spaceIdx + 1).trim();
            } else {
                city = rest;
                street = '';
            }
        }
    }
    return { zip, city, street };
};

const normalizePhone = (val) => {
    if (!val) return '';
    let str = String(val).replace(/[^\d]/g, '');
    if (str.startsWith('06')) str = '36' + str.slice(2);
    if (str.startsWith('0036')) str = '36' + str.slice(4);
    if (str.length === 9) str = '36' + str;
    if (!str.startsWith('36')) str = '36' + str;
    return '+' + str;
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
                const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (jsonData.length === 0) {
                    setError("A fájl üres.");
                    setIsParsing(false);
                    return;
                }

                const students = [];
                for (const row of jsonData) {
                    const cName = parseName(row['Tanuló neve']);
                    const bName = parseName(row['Születéskori neve'] || row['Tanuló neve']);
                    const mName = parseName(row['Anyja neve']);
                    const permAddr = parseAddress(row['Állandó lakcím']);
                    const tempAddrStr = row['Tartózkodási hely'];
                    const tempAddr = tempAddrStr ? parseAddress(tempAddrStr) : permAddr;

                    const studentObj = {
                        isTransferStudent: true,
                        // Names
                        current_prefix: cName.prefix, current_lastName: cName.last, current_firstName: cName.first, current_secondName: '',
                        birth_prefix: bName.prefix, birth_lastName: bName.last, birth_firstName: bName.first, birth_secondName: '',
                        mother_prefix: mName.prefix, mother_lastName: mName.last, mother_firstName: mName.first, mother_secondName: '',
                        // Birth & Nationality
                        birth_country: 'Magyarország',
                        birth_city: String(row['Születési hely'] || '').trim(),
                        birth_district: String(row['Születési kerület'] || '').trim(),
                        birthDate: formatDateForDB(row['Születési idő']),
                        nationality: 'magyar', isDualCitizen: false, secondNationality: '',
                        // Addresses
                        permanent_address_country: 'Magyarország',
                        permanent_address_zip: permAddr.zip,
                        permanent_address_city: permAddr.city,
                        permanent_address_street: permAddr.street,
                        residenceIsSame: !tempAddrStr,
                        temporary_address_country: 'Magyarország',
                        temporary_address_zip: tempAddr.zip,
                        temporary_address_city: tempAddr.city,
                        temporary_address_street: tempAddr.street,
                        // Contacts & IDs
                        phone_number: normalizePhone(row['Telefonszám']),
                        email: String(row['Email cím'] || '').trim(),
                        studentId: String(row['Tanuló azonosító'] || '').trim(),
                        transferKreszDate: formatDateForDB(row['Sikeres KRESZ']),
                        // System Defaults so Modals don't break
                        documentType: 'Személyi igazolvány', documentNumber: '', documentExpiry: '', education: '',
                        has_previous_license: 'nem', previous_license_categories: '',
                        studied_elsewhere_radio: 'igen_mashol', failed_exam_count: 0, megjegyzes: 'Tömeges importtal rögzítve.'
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