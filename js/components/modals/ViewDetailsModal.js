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
import { functions, httpsCallable, isTestMode, db, doc, getDoc } from '../../firebase.js';

const { useState, useEffect } = window.React;

const DisplayField = ({ label, value }) => html`
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 py-2 text-sm border-b last:border-b-0 border-gray-100">
        <strong className="text-gray-500 font-medium">${label}</strong>
        <span className="text-gray-900 col-span-2 break-words font-medium">${value || 'N/A'}</span>
    </div>
`;

const ExamResultsTable = ({ results, onEdit, onDelete, onSave, onCancel, editingIndex, tempExamData, setTempExamData }) => {
    const [showCancelledExams, setShowCancelledExams] = useState(false);

    if (!results || results.length === 0) return html`<p key="empty-exams" className="text-sm text-gray-500 italic">Nincsenek rögzített vizsgaeredmények.</p>`;

    // Filter out canceled "Forgalmi" (practical) exams to hide them from the table.
    // However, synthetic rows (isCaseFiled) or canceled theory exams should remain visible.
    const filteredResults = results.filter(res => {
        if (res.isSynthetic) return true; // Keep synthetic rows

        // If showCancelledExams is true, render ALL exams.
        if (showCancelledExams) return true;

        // Hide if subject contains "forgalmi" and result is "Törölve"
        const isForgalmi = res.subject && res.subject.toLowerCase().includes('forgalmi');
        const isCanceled = res.result === 'Törölve';

        if (isForgalmi && isCanceled) {
            return false;
        }

        return true;
    });

    // Extract synthetic row if present to keep it at the top
    const syntheticRow = filteredResults.find(res => res.isSynthetic);
    const realResults = filteredResults.filter(res => !res.isSynthetic);

    // We need to keep track of the original index because sorting changes order.
    // So map to include original index first. Note: index must match the original array structure for editing/deleting.
    // However, since the synthetic row was added at index 0, the real exams start at index 1 in the parent's logic if it was passed.
    // Wait, the parent uses localStudent.examResults[editingExamIndex] which does NOT include the synthetic row!
    // So originalIndex should correspond to the index in localStudent.examResults.
    const resultsWithIndex = realResults.map((res, index) => ({ ...res, originalIndex: index }));

    // Sort by date ascending (oldest first)
    const sortedRealResults = [...resultsWithIndex].sort((a, b) => {
        // Handle YYYY.MM.DD. HH:MM format or simple string.
        // We strip trailing dots and replace separators to make it standard ISO-like (YYYY-MM-DD)
        const normalize = (d) => d.split(' ')[0].replace(/\.$/, '').replace(/\./g, '-');
        const dateA = new Date(normalize(a.date));
        const dateB = new Date(normalize(b.date));

        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
        return a.date.localeCompare(b.date);
    });

    // Combine back: synthetic row (if any) always goes first (at the very top)
    const sortedResults = syntheticRow ? [syntheticRow, ...sortedRealResults] : sortedRealResults;

    return html`
        <div key="table-wrapper">
            <div className="flex justify-end mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 w-4 h-4"
                        checked=${showCancelledExams}
                        onChange=${(e) => setShowCancelledExams(e.target.checked)}
                    />
                    <span className="text-sm text-gray-600 font-medium">Törölt forgalmi vizsgák mutatása</span>
                </label>
            </div>
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
                        } else if (resultLower === 'rögzítve') {
                            badgeClass = 'bg-green-100 text-green-800';
                            displayResult = 'Rögzítve';
                        }

                        if (isEditing) {
                            return html`
                                <tr key="${res.originalIndex}" className="bg-blue-50">
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
                        <tr key="${res.isSynthetic ? 'synthetic' : res.originalIndex}" className="hover:bg-gray-50 group">
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900">${res.date}</td>
                            <td className="px-3 py-2 text-gray-700">${res.subject}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                                <span className=${`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                                    ${displayResult}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-xs">${res.location}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                ${!res.isSynthetic ? html`
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick=${() => onEdit(res.originalIndex, res)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Szerkesztés">
                                            <${Icons.EditIcon} size=${16} />
                                        </button>
                                        <button onClick=${() => onDelete(res.originalIndex)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Törlés">
                                            <${Icons.TrashIcon} size=${16} />
                                        </button>
                                    </div>
                                ` : null}
                            </td>
                        </tr>
                    `})}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const ViewDetailsModal = ({ student, onClose, onUpdate, isTestView }) => {
    const [localStudent, setLocalStudent] = useState(student);
    const [editingExamIndex, setEditingExamIndex] = useState(null);
    const [tempExamData, setTempExamData] = useState({});
    const [isRecalculating, setIsRecalculating] = useState(false);

    const showConfirmation = useConfirmation();
    const showToast = useToast();

    // Sync local state when prop updates (e.g. if parent refreshes)
    useEffect(() => {
        setLocalStudent(student);
    }, [student]);

    const handleRecalculateDeadline = async () => {
        setIsRecalculating(true);
        try {
            const recalculateFn = httpsCallable(functions, 'recalculateStudentDeadline');
            const result = await recalculateFn({
                documentId: localStudent.id,
                isTest: isTestView
            });

            if (result.data.success) {
                // Re-fetch the entire student document to ensure perfect reactivity with backend formats
                const collectionName = isTestView ? 'registrations_test' : 'registrations';
                const docRef = doc(db, collectionName, localStudent.id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setLocalStudent({ id: docSnap.id, ...docSnap.data() });
                    showToast("Határidők sikeresen frissítve!", "success");
                } else {
                    showToast("Hiba: A tanuló nem található.", "error");
                }
            }
        } catch (error) {
            console.error("Hiba a határidő újraszámításakor:", error);
            showToast("Hiba történt a határidő frissítése során.", "error");
        } finally {
            setIsRecalculating(false);
        }
    };

    // Format synthetic date precisely to match KAV import format (YYYY.MM.DD. HH:mm) without spaces
    const formatCaseFiledDate = (timestamp) => {
        if (!timestamp) return 'Igen (Korábbi rögzítés)';
        let d;
        if (typeof timestamp.toDate === 'function') {
            d = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            d = timestamp;
        } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            d = new Date(timestamp);
        } else if (timestamp.seconds) {
            d = new Date(timestamp.seconds * 1000);
        } else {
            return 'Igen (Korábbi rögzítés)';
        }
        
        if (isNaN(d.getTime())) return 'Igen (Korábbi rögzítés)';

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');

        return `${y}.${m}.${day}. ${h}:${min}`;
    };

    // Helper functions for Deadline rendering
    const formatJustDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        let d;
        if (typeof timestamp.toDate === 'function') {
            d = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            d = timestamp;
        } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            d = new Date(timestamp);
        } else if (timestamp.seconds) {
            d = new Date(timestamp.seconds * 1000);
        } else {
            return 'N/A';
        }
        if (isNaN(d.getTime())) return 'N/A';

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}.${m}.${day}.`;
    };

    const getDaysRemaining = (targetTimestamp) => {
        if (!targetTimestamp) return null;
        let d;
        if (typeof targetTimestamp.toDate === 'function') {
            d = targetTimestamp.toDate();
        } else if (targetTimestamp instanceof Date) {
            d = targetTimestamp;
        } else if (typeof targetTimestamp === 'string' || typeof targetTimestamp === 'number') {
            d = new Date(targetTimestamp);
        } else if (targetTimestamp.seconds) {
            d = new Date(targetTimestamp.seconds * 1000);
        } else {
            return null;
        }
        if (isNaN(d.getTime())) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(d);
        target.setHours(0, 0, 0, 0);
        
        const diffTime = target.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getPhaseLabel = (activePhase) => {
        if (!activePhase) return 'N/A';
        if (activePhase.includes('Phase 1')) return 'Megkezdhetőségi határidő (90 nap)';
        if (activePhase.includes('Phase 2')) return 'Első elméleti vizsga határideje (9 hónap)';
        if (activePhase.includes('Phase 3')) return 'Sikeres elméleti vizsga határideje (12 hónap)';
        if (activePhase.includes('Phase 4')) return 'Sikeres forgalmi vizsga határideje (2 év)';
        return activePhase;
    };

    // Transferred status toggle function
    const handleToggleTransferred = () => {
        const currentStatus = !!localStudent.isTransferred;
        const newStatus = !currentStatus;
        const actionText = newStatus ? "áthelyezve más képzőszervhez" : "aktív (áthelyezés visszavonva)";

        showConfirmation({
            message: `Biztosan megváltoztatod a tanuló áthelyezési státuszát erre: ${actionText}?`,
            onConfirm: async () => {
                try {
                    const studentName = formatFullName(localStudent.current_prefix, localStudent.current_firstName, localStudent.current_lastName, localStudent.current_secondName);

                    const updatePayload = { isTransferred: newStatus };
                    if (newStatus && !localStudent.transferredOutDate) {
                        updatePayload.transferredOutDate = new Date().toISOString().split('T')[0];
                    }

                    // Update parent (Firestore)
                    await onUpdate(localStudent.id, updatePayload, studentName);

                    // Update local state optimistically, including the deadlineInfo terminal state
                    setLocalStudent(prev => {
                        const updatedStudent = { ...prev, ...updatePayload };
                        if (newStatus) {
                            updatedStudent.deadlineInfo = {
                                activePhase: "Lezárva: Másik képzőszervhez áthelyezve",
                                originalDate: null,
                                shiftedDate: null,
                                isShifted: false
                            };
                        } else {
                            updatedStudent.deadlineInfo = null;
                        }
                        return updatedStudent;
                    });

                    showToast(`Áthelyezési státusz frissítve.`, "success");

                    // Optionally, if toggled back to active, trigger a recalculation to fetch the proper dates immediately
                    if (!newStatus) {
                        handleRecalculateDeadline();
                    }

                } catch (err) {
                    console.error("Hiba az áthelyezési státusz frissítésekor: ", err);
                    showToast("Hiba a mentés során.", "error");
                }
            }
        });
    };

    const handleTransferredDateChange = async (e) => {
        const newDate = e.target.value;
        setLocalStudent(prev => ({ ...prev, transferredOutDate: newDate }));

        try {
            const studentName = formatFullName(localStudent.current_prefix, localStudent.current_firstName, localStudent.current_lastName, localStudent.current_secondName);
            await onUpdate(localStudent.id, { transferredOutDate: newDate }, studentName);
            showToast("Áthelyezés dátuma frissítve.", "success");
        } catch (err) {
            console.error("Hiba a dátum frissítésekor: ", err);
            showToast("Hiba a mentés során.", "error");
        }
    };

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

    // Címformázó függvény
    const formatAddress = (prefix) => {
        const get = (field) => localStudent[`${prefix}_${field}`];
        const formatWithPeriod = (value) => {
            if (!value || typeof value !== 'string') return null;
            const trimmed = value.trim();
            return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
        };

        const zipAndCity = [get('zip'), get('city')].filter(Boolean).join(' ');
        const streetAndType = [get('street'), get('streetType')].filter(Boolean).join(' ');

        if (!zipAndCity && !streetAndType) return 'N/A';

        let address = [zipAndCity, streetAndType].filter(Boolean).join(', ');
        const houseNumber = formatWithPeriod(get('houseNumber'));
        if (houseNumber) {
            address += ` ${houseNumber}`;
        } else {
            // If there's no house number, we'll append a dot to the street type just to be safe if there are sub parts, or we can just leave it. The requirement implies house number is present.
        }

        const subParts = [];
        const building = formatWithPeriod(get('building'));
        if (building) {
            // The requirement says "building -> building + " ép." (or "ép." depending on existing data, just ensure it reads like "B. ép.")"
            // Wait, building might just be "B." or "B" so formatWithPeriod gives "B." then we add " ép." -> "B. ép."
            subParts.push(`${building} ép.`);
        }

        const staircase = formatWithPeriod(get('staircase'));
        if (staircase) subParts.push(`${staircase} lph.`);

        const floor = formatWithPeriod(get('floor'));
        if (floor) subParts.push(`${floor} em.`);

        const door = formatWithPeriod(get('door'));
        if (door) subParts.push(door);

        if (subParts.length > 0) {
            address += ` ${subParts.join(' ')}`;
        }

        return address;
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

    const Section = ({ title, children, className = "", headerRight = null }) => html`
        <div className=${`bg-white p-5 rounded-lg shadow-sm border border-gray-200 ${className}`}>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <h4 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                    ${title}
                </h4>
                ${headerRight && html`<div>${headerRight}</div>`}
            </div>
            <div className="space-y-1">${children}</div>
        </div>
    `;

    const renderDeadlineStatus = () => {
        if (!localStudent.deadlineInfo) {
            return html`
                <p className="text-sm text-gray-500 italic mt-2">A határidő kalkuláció folyamatban van, vagy nincs elegendő adat.</p>
            `;
        }

        const info = localStudent.deadlineInfo;

        // If we only have activePhase but no dates (terminal states)
        if (!info.shiftedDate && info.activePhase) {
             return html`
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                    <div className="flex flex-col border-b border-gray-100 pb-2 md:col-span-2">
                        <strong className="text-gray-500 mb-1">Aktuális Cél / Fázis</strong>
                        <span className="text-gray-900 font-medium">${getPhaseLabel(info.activePhase)}</span>
                    </div>
                </div>
            `;
        }

        if (!info.shiftedDate) {
             return html`
                <p className="text-sm text-gray-500 italic mt-2">A határidő kalkuláció folyamatban van, vagy nincs elegendő adat.</p>
            `;
        }

        const mappedPhase = getPhaseLabel(info.activePhase);
        const daysRemaining = getDaysRemaining(info.shiftedDate);

        let statusElement;
        if (daysRemaining === null) {
            statusElement = html`<span className="text-gray-500 italic">Ismeretlen státusz</span>`;
        } else if (daysRemaining < 0) {
            statusElement = html`<span className="font-bold text-red-600 bg-red-100 px-2 py-1 rounded">Letelt</span>`;
        } else if (daysRemaining <= 30) {
            statusElement = html`<span className="font-bold text-orange-600">${daysRemaining} nap van hátra</span>`;
        } else {
            statusElement = html`<span className="font-bold text-green-600">${daysRemaining} nap van hátra</span>`;
        }

        return html`
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                <div className="flex flex-col border-b border-gray-100 pb-2">
                    <strong className="text-gray-500 mb-1">Aktuális Cél / Fázis</strong>
                    <span className="text-gray-900 font-medium">${mappedPhase}</span>
                </div>
                <div className="flex flex-col border-b border-gray-100 pb-2">
                    <strong className="text-gray-500 mb-1">Állapot</strong>
                    <div>${statusElement}</div>
                </div>
                <div className="flex flex-col col-span-1 md:col-span-2 pt-1">
                    <strong className="text-gray-500 mb-1">Határidő napja</strong>
                    <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">${formatJustDate(info.shiftedDate)}</span>
                        ${info.isShifted ? html`
                            <span className="text-xs text-gray-400 italic mt-1">
                                *(Eredeti határidő: ${formatJustDate(info.originalDate)}, hétvége/ünnepnap miatt csúsztatva)*
                            </span>
                        ` : null}
                    </div>
                </div>
            </div>
        `;
    };

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

                    ${/* Határidők szekció - Teljes szélességben */''}
                    <div className="mt-6">
                        <${Section} 
                            title="Határidők és Képzési Állapot" 
                            className="border-blue-100 ring-4 ring-blue-50"
                            headerRight=${html`
                                <button 
                                    onClick=${handleRecalculateDeadline} 
                                    disabled=${isRecalculating}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                                >
                                    <${Icons.RefreshIcon} size=${16} className=${isRecalculating ? "animate-spin" : ""} />
                                    ${isRecalculating ? "Frissítés..." : "Frissítés"}
                                </button>
                            `}
                        >
                            ${renderDeadlineStatus()}
                        <//>
                    </div>

                    ${/* Vizsgaeredmények szekció - Teljes szélességben */''}
                    <div className="mt-6">
                        <${Section} title="Vizsgaeredmények (KAV Import)" className="border-indigo-100 ring-4 ring-indigo-50">
                            <${ExamResultsTable}
                                results=${localStudent.isCaseFiled ? [
                                    {
                                        date: localStudent.caseFiledAt ? formatCaseFiledDate(localStudent.caseFiledAt) : 'Igen (Korábbi rögzítés)',
                                        subject: 'Ügy iktatva',
                                        result: 'Rögzítve',
                                        location: '-',
                                        isSynthetic: true
                                    },
                                    ...(localStudent.examResults || [])
                                ] : localStudent.examResults}
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

                    ${/* Képzés Lezárása szekció - Teljes szélességben */''}
                    <div className="mt-6 mb-4">
                        <${Section} title="Képzés Lezárása" className="border-red-100 ring-4 ring-red-50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 gap-4">
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-900">Áthelyezve (Másik képzőszervhez)</h4>
                                    <p className="text-xs text-gray-500">Ha be van kapcsolva, a rendszer lezártnak tekinti a tanulót az aktív határidő riportokban.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    ${!!localStudent.isTransferred && html`
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="transferredOutDate" className="text-sm font-medium text-gray-700 whitespace-nowrap">Áthelyezés dátuma:</label>
                                            <input
                                                type="date"
                                                id="transferredOutDate"
                                                value=${localStudent.transferredOutDate || ''}
                                                onChange=${handleTransferredDateChange}
                                                className="border-gray-300 rounded-md shadow-sm text-sm focus:ring-red-500 focus:border-red-500"
                                            />
                                        </div>
                                    `}
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked=${!!localStudent.isTransferred}
                                            onChange=${handleToggleTransferred}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>
                            </div>
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
