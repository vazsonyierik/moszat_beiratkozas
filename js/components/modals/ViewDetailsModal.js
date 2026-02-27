/**
 * js/components/modals/ViewDetailsModal.js
 * * Modal for viewing student details.
 * JAVÍTÁS: A `formatAddress` függvény lecserélve egy intelligensebb verzióra,
 * amely helyesen formázza a címet, és címkéket ad az épület, emelet stb. adatokhoz.
 * JAVÍTÁS 2: A címformázó logika finomítva, hogy az írásjeleket (vesszők, szóközök)
 * a magyar szabványnak megfelelően, logikusabban kezelje.
 * MÓDOSÍTÁS: Új "Tanulmányi előzmények" szekció hozzáadva a korábbi tanulmányokra
 * és vizsgákra vonatkozó adatok megjelenítéséhez.
 * MÓDOSÍTÁS 2: A modális ablak most már csak a gombokra kattintva záródik be, a háttérre kattintva nem.
 * MÓDOSÍTÁS 3: A címformázó logika frissítve, hogy a pontokat a házszám, épület stb. után helyesen kezelje.
 * MÓDOSÍTÁS 4: A születési hely most már tartalmazza az országot is, ha az nem Magyarország. A tartózkodási hely mindig a teljes címet mutatja.
 * MÓDOSÍTÁS 5: Visszaállítva a logika, hogy ha a tartózkodási hely azonos a lakcímmel, akkor szövegesen jelenjen meg.
 * MÓDOSÍTÁS 6: Vizsgaeredmények megjelenítése táblázatos formában.
 * MÓDOSÍTÁS 7: Vizsgaeredmények szerkesztésének és törlésének lehetősége.
 */
import { html } from '../../UI.js';
import { formatFullName, formatSingleTimestamp } from '../../utils.js';
import * as Icons from '../../Icons.js';
import { useConfirmation, useToast } from '../../context/AppContext.js';

const { useState, useEffect } = window.React;

const DisplayField = ({ label, value }) => html`
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 py-2 text-sm border-b last:border-b-0 border-gray-100">
        <strong className="text-gray-500 font-medium">${label}</strong>
        <span className="text-gray-900 col-span-2 break-words font-medium">${value || 'N/A'}</span>
    </div>
`;

const ExamResultsTable = ({ results, onEdit, onDelete, onSave, onCancel, editingIndex, tempExamData, setTempExamData }) => {
    if (!results || results.length === 0) return html`<p className="text-sm text-gray-500 italic">Nincsenek rögzített vizsgaeredmények.</p>`;

    // We need to keep track of the original index because sorting changes order.
    // So map to include original index first.
    const resultsWithIndex = results.map((res, index) => ({ ...res, originalIndex: index }));

    // Sort by date descending (newest first)
    const sortedResults = [...resultsWithIndex].sort((a, b) => {
        // Handle YYYY.MM.DD. HH:MM format or simple string.
        // We strip trailing dots and replace separators to make it standard ISO-like (YYYY-MM-DD)
        const normalize = (d) => d.split(' ')[0].replace(/\.$/, '').replace(/\./g, '-');
        const dateA = new Date(normalize(a.date));
        const dateB = new Date(normalize(b.date));

        if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
        return b.date.localeCompare(a.date);
    });

    return html`
        <div className="overflow-x-auto rounded-lg border border-gray-200 mt-2">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Dátum</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Tárgy</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Eredmény</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Helyszín</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Műveletek</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    ${sortedResults.map((res) => {
                        const isEditing = editingIndex === res.originalIndex;
                        const resultLower = res.result.toLowerCase();
                        let badgeClass = 'bg-gray-100 text-gray-800';
                        let displayResult = res.result;

                        if (resultLower === 'megfelelt' || resultLower === 'sikeres') {
                            badgeClass = 'bg-green-100 text-green-800';
                            displayResult = 'M';
                        } else if (resultLower === 'nem felelt meg' || resultLower.includes('sikertelen')) {
                            badgeClass = 'bg-red-100 text-red-800';
                            displayResult = '1';
                        } else if (resultLower === 'nem jelent meg') {
                            badgeClass = 'bg-yellow-100 text-yellow-800';
                            displayResult = '3';
                        }

                        if (isEditing) {
                            return html`
                                <tr key=${res.originalIndex} className="bg-blue-50">
                                    <td className="px-3 py-2 align-top">
                                        <input
                                            type="text"
                                            value=${tempExamData.date}
                                            onChange=${e => setTempExamData({...tempExamData, date: e.target.value})}
                                            className="w-full text-xs border rounded p-1 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="ÉÉÉÉ.HH.NN. ÓÓ:PP"
                                        />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <input
                                            type="text"
                                            value=${tempExamData.subject}
                                            onChange=${e => setTempExamData({...tempExamData, subject: e.target.value})}
                                            className="w-full text-xs border rounded p-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <input
                                            type="text"
                                            value=${tempExamData.result}
                                            onChange=${e => setTempExamData({...tempExamData, result: e.target.value})}
                                            className="w-full text-xs border rounded p-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <input
                                            type="text"
                                            value=${tempExamData.location}
                                            onChange=${e => setTempExamData({...tempExamData, location: e.target.value})}
                                            className="w-full text-xs border rounded p-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right align-top">
                                        <div className="flex justify-end gap-1">
                                            <button onClick=${onSave} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Mentés">
                                                <${Icons.CheckIcon} size=${18} />
                                            </button>
                                            <button onClick=${onCancel} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Mégse">
                                                <${Icons.XIcon} size=${18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }

                        return html`
                        <tr key=${res.originalIndex} className="hover:bg-gray-50 group">
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900">${res.date}</td>
                            <td className="px-3 py-2 text-gray-700">${res.subject}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                                <span className=${`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                                    ${displayResult}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-xs">${res.location}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick=${() => onEdit(res.originalIndex, res)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Szerkesztés">
                                        <${Icons.EditIcon} size=${16} />
                                    </button>
                                    <button onClick=${() => onDelete(res.originalIndex)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Törlés">
                                        <${Icons.TrashIcon} size=${16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `})}
                </tbody>
            </table>
        </div>
    `;
};

const ViewDetailsModal = ({ student, onClose, onUpdate }) => {
    const [localStudent, setLocalStudent] = useState(student);
    const [editingExamIndex, setEditingExamIndex] = useState(null);
    const [tempExamData, setTempExamData] = useState({});

    const showConfirmation = useConfirmation();
    const showToast = useToast();

    // Sync local state when prop updates (e.g. if parent refreshes)
    useEffect(() => {
        setLocalStudent(student);
    }, [student]);

    // Exam handling functions
    const handleEditExam = (index, data) => {
        setEditingExamIndex(index);
        setTempExamData({ ...data }); // Copy data to avoid direct mutation
    };

    const handleCancelExamEdit = () => {
        setEditingExamIndex(null);
        setTempExamData({});
    };

    const handleSaveExam = async () => {
        if (editingExamIndex === null) return;

        // Validation: Date and Subject are required
        if (!tempExamData.date || !tempExamData.subject) {
            showToast("A Dátum és a Tárgy mezők kitöltése kötelező!", "error");
            return;
        }

        const newExamResults = [...(localStudent.examResults || [])];
        newExamResults[editingExamIndex] = { ...tempExamData }; // Update array

        try {
            const studentName = formatFullName(localStudent.current_prefix, localStudent.current_firstName, localStudent.current_lastName, localStudent.current_secondName);

            // Update parent (Firestore)
            await onUpdate(localStudent.id, { examResults: newExamResults }, studentName);

            // Update local state immediately for responsiveness
            setLocalStudent(prev => ({ ...prev, examResults: newExamResults }));

            showToast("Vizsgaeredmény sikeresen frissítve!", "success");
            handleCancelExamEdit();
        } catch (error) {
            console.error("Hiba a mentés során:", error);
            showToast("Hiba történt a mentés során.", "error");
        }
    };

    const handleDeleteExam = (index) => {
        showConfirmation({
            message: "Biztosan törölni szeretnéd ezt a vizsgaeredményt? A művelet nem visszavonható.",
            onConfirm: async () => {
                const newExamResults = (localStudent.examResults || []).filter((_, i) => i !== index);

                try {
                    const studentName = formatFullName(localStudent.current_prefix, localStudent.current_firstName, localStudent.current_lastName, localStudent.current_secondName);

                    // Update parent
                    await onUpdate(localStudent.id, { examResults: newExamResults }, studentName);

                    // Update local state
                    setLocalStudent(prev => ({ ...prev, examResults: newExamResults }));

                    showToast("Vizsgaeredmény törölve!", "success");
                } catch (error) {
                    console.error("Hiba a törlés során:", error);
                    showToast("Hiba történt a törlés során.", "error");
                }
            }
        });
    };

    // Címformázó függvény (megtartva a meglévő logikát)
    const formatAddress = (prefix) => {
        const get = (field) => localStudent[`${prefix}_${field}`];
        const formatWithPeriod = (value) => {
            if (!value || typeof value !== 'string') return null;
            const trimmed = value.trim();
            return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
        };
        const mainParts = [];
        if (get('country')) mainParts.push(get('country'));
        const cityPart = [get('zip'), get('city')].filter(Boolean).join(' ');
        if (cityPart) mainParts.push(cityPart);
        let streetDetails = '';
        const streetNameAndType = [get('street'), get('streetType')].filter(Boolean).join(' ');
        if (streetNameAndType) {
            let fullStreetPart = streetNameAndType;
            const houseNumber = formatWithPeriod(get('houseNumber'));
            if (houseNumber) fullStreetPart += ` ${houseNumber}`;
            streetDetails += fullStreetPart;
        }
        const building = formatWithPeriod(get('building'));
        if (building) streetDetails += (streetDetails ? ', ' : '') + `ép. ${building}`;
        const staircase = formatWithPeriod(get('staircase'));
        if (staircase) streetDetails += (streetDetails ? ', ' : '') + `lph. ${staircase}`;
        const floor = formatWithPeriod(get('floor'));
        if (floor) streetDetails += (streetDetails ? ', ' : '') + `${floor} em.`;
        const door = formatWithPeriod(get('door'));
        if (door) streetDetails += (streetDetails ? ', ' : '') + `${door} ajtó`;

        if (streetDetails) mainParts.push(streetDetails);
        return mainParts.length > 0 ? mainParts.join(', ') : 'N/A';
    };

    const formatStudyHistory = (key, value) => {
        if (!value) return 'N/A';
        if (key === 'has_previous_license') return value === 'igen' ? 'Igen' : 'Nem';
        if (key === 'studied_elsewhere_radio') {
            const map = { 'igen_nalunk': 'Igen, nálunk', 'igen_mashol': 'Igen, máshol', 'nem': 'Nem' };
            return map[value] || value;
        }
        return value;
    };

    const fullName = formatFullName(localStudent.current_prefix, localStudent.current_firstName, localStudent.current_lastName, localStudent.current_secondName);
    const birthFullName = formatFullName(localStudent.birth_prefix, localStudent.birth_firstName, localStudent.birth_lastName, localStudent.birth_secondName);
    const motherFullName = formatFullName(localStudent.mother_prefix, localStudent.mother_firstName, localStudent.mother_lastName, localStudent.mother_secondName);
    
    const getBirthPlace = () => {
        const country = localStudent.birth_country || '';
        const city = localStudent.birth_city || '';
        const district = localStudent.birth_district || '';
        let place = '';
        if (country.toLowerCase().trim() !== 'magyarország' && country !== '') place += `${country}, `;
        place += city;
        if (district) place += `, ${district}`;
        return place || 'N/A';
    };
    const birthPlace = getBirthPlace();

    const Section = ({ title, children, className = "" }) => html`
        <div className=${`bg-white p-5 rounded-lg shadow-sm border border-gray-200 ${className}`}>
            <h4 className="text-lg font-bold text-indigo-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                ${title}
            </h4>
            <div className="space-y-1">${children}</div>
        </div>
    `;

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick=${e => e.stopPropagation()}>
                <header className="p-6 border-b bg-white rounded-t-xl flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Tanuló adatlapja</h3>
                        <p className="text-indigo-600 font-medium">${fullName}</p>
                    </div>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main className="p-6 overflow-y-auto flex-grow bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <${Section} title="Személyes adatok">
                                <${DisplayField} label="Viselt név" value=${fullName} />
                                <${DisplayField} label="Születési név" value=${birthFullName} />
                                <${DisplayField} label="Anyja neve" value=${motherFullName} />
                                <${DisplayField} label="Születési hely" value=${birthPlace} />
                                <${DisplayField} label="Születési idő" value=${localStudent.birthDate} />
                                <${DisplayField} label="Állampolgárság" value=${localStudent.nationality} />
                                ${localStudent.secondNationality && html`<${DisplayField} label="Második állampolgárság" value=${localStudent.secondNationality} />`}
                            <//>

                            <${Section} title="Elérhetőségek">
                                <${DisplayField} label="Email" value=${localStudent.email} />
                                <${DisplayField} label="Telefonszám" value=${localStudent.phone_number} />
                            <//>

                            <${Section} title="Lakcím adatok">
                                <${DisplayField} label="Állandó lakcím" value=${formatAddress('permanent_address')} />
                                <${DisplayField} label="Tartózkodási hely" value=${localStudent.residenceIsSame ? 'Azonos az állandó lakcímmel' : formatAddress('temporary_address')} />
                            <//>
                        </div>

                        <div className="space-y-6">
                            <${Section} title="Adminisztráció és Státusz">
                                <${DisplayField} label="Tanuló azonosító" value=${localStudent.studentId} />
                                <${DisplayField} label="Sorszám" value=${localStudent.registrationNumber} />
                                <${DisplayField} label="Jelentkezés ideje" value=${formatSingleTimestamp(localStudent.createdAt)} />
                                <${DisplayField} label="Beiratkozás ideje" value=${formatSingleTimestamp(localStudent.enrolledAt)} />
                                <${DisplayField} label="Azonosító megadása" value=${formatSingleTimestamp(localStudent.studentIdAssignedAt)} />
                                <${DisplayField} label="Tanfolyam befejezve" value=${formatSingleTimestamp(localStudent.courseCompletedAt)} />
                            <//>

                            <${Section} title="Okmányok és Végzettség">
                                <${DisplayField} label="Okmány típusa" value=${localStudent.documentType} />
                                <${DisplayField} label="Okmány száma" value=${localStudent.documentNumber} />
                                <${DisplayField} label="Okmány lejárata" value=${localStudent.documentExpiry} />
                                <${DisplayField} label="Végzettség" value=${localStudent.education} />
                            <//>

                            <${Section} title="Tanulmányi Előzmények">
                                <${DisplayField} label="Van korábbi jogsi?" value=${formatStudyHistory('has_previous_license', localStudent.has_previous_license)} />
                                <${DisplayField} label="Kategóriák" value=${localStudent.previous_license_categories} />
                                <${DisplayField} label="Tanult máshol?" value=${formatStudyHistory('studied_elsewhere_radio', localStudent.studied_elsewhere_radio)} />
                                <${DisplayField} label="Sikertelen vizsgák" value=${localStudent.failed_exam_count} />
                            <//>

                            <${Section} title="Gondviselő (18 év alatt)">
                                <${DisplayField} label="Név" value=${localStudent.guardian_name} />
                                <${DisplayField} label="Telefon" value=${localStudent.guardian_phone} />
                                <${DisplayField} label="Email" value=${localStudent.guardian_email} />
                            <//>
                        </div>
                    </div>

                    ${/* Vizsgaeredmények szekció - Teljes szélességben */''}
                    <div className="mt-6">
                        ${localStudent.isCaseFiled ? html`
                            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-4 flex items-center gap-3 shadow-sm">
                                <div className="p-2 bg-green-100 rounded-full"><${Icons.CheckIcon} size=${20} /></div>
                                <div>
                                    <div className="font-bold text-lg">Ügy iktatva</div>
                                    <div className="text-sm opacity-90">
                                        ${localStudent.caseFiledAt
                                            ? new Date(localStudent.caseFiledAt).toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                            : 'Korábbi rögzítés'
                                        }
                                    </div>
                                </div>
                            </div>
                        ` : html`
                            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-lg mb-4 flex items-center gap-3 shadow-sm">
                                <div className="p-2 bg-orange-100 rounded-full"><${Icons.AlertCircleIcon} size=${20} /></div>
                                <div>
                                    <div className="font-bold text-lg">Ügy nincs iktatva</div>
                                    <div className="text-sm opacity-90">A tanuló még nem szerepel a KAV rendszerében iktatottként.</div>
                                </div>
                            </div>
                        `}

                        <${Section} title="Vizsgaeredmények (KAV Import)" className="border-indigo-100 ring-4 ring-indigo-50">
                            <${ExamResultsTable}
                                results=${localStudent.examResults}
                                onEdit=${handleEditExam}
                                onDelete=${handleDeleteExam}
                                onSave=${handleSaveExam}
                                onCancel=${handleCancelExamEdit}
                                editingIndex=${editingExamIndex}
                                tempExamData=${tempExamData}
                                setTempExamData=${setTempExamData}
                            />
                        <//>
                    </div>

                    ${/* Megjegyzés szekció - Teljes szélességben */''}
                    <div className="mt-6">
                        <${Section} title="Megjegyzés">
                            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">${localStudent.megjegyzes || 'Nincs megjegyzés.'}</p>
                        <//>
                    </div>
                </main>

                <footer className="p-4 bg-white rounded-b-xl border-t flex justify-end gap-3 z-10">
                    <button onClick=${onClose} className="bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-900 transition-colors shadow-sm">Bezárás</button>
                </footer>
            </div>
        </div>
    `;
};

export default ViewDetailsModal;
