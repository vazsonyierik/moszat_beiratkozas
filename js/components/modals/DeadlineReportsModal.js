import { html } from '../../UI.js';
import * as utils from '../../utils.js';
import * as Icons from '../../Icons.js';

const React = window.React;
const { useState, useMemo, Fragment } = React;

function calculateDaysRemaining(targetTimestamp) {
    if (!targetTimestamp) return null;
    let targetDate;
    if (targetTimestamp.toDate) {
        targetDate = targetTimestamp.toDate();
    } else if (targetTimestamp.seconds) {
        targetDate = new Date(targetTimestamp.seconds * 1000);
    } else {
        targetDate = new Date(targetTimestamp);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function mapPhaseName(backendPhase) {
    if (!backendPhase) return "Ismeretlen fázis";
    if (backendPhase.includes("Phase 1")) return "Tanfolyam megkezdése (90 nap)";
    if (backendPhase.includes("Phase 2")) return "Első elméleti vizsga (9 hónap)";
    if (backendPhase.includes("Phase 3")) return "Sikeres elméleti vizsga (12 hónap)";
    if (backendPhase.includes("Phase 4")) return "Sikeres forgalmi vizsga (2 év)";
    return backendPhase;
}

function getPhaseNumber(backendPhase) {
    if (!backendPhase) return 0;
    if (backendPhase.includes("Phase 1")) return 1;
    if (backendPhase.includes("Phase 2")) return 2;
    if (backendPhase.includes("Phase 3")) return 3;
    if (backendPhase.includes("Phase 4")) return 4;
    return 0;
}

const DeadlineReportsModal = ({ students, onClose, onStudentClick }) => {
    const [phaseFilter, setPhaseFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredStudents = useMemo(() => {
        if (!students) return [];

        return students.filter(student => {
            if (!student?.deadlineInfo?.shiftedDate) {
                return false;
            }

            const daysRemaining = calculateDaysRemaining(student.deadlineInfo.shiftedDate);
            if (daysRemaining === null) return false;

            const phaseNum = getPhaseNumber(student.deadlineInfo.activePhase);
            if (phaseFilter !== 'all') {
                const targetPhase = parseInt(phaseFilter, 10);
                if (phaseNum !== targetPhase) return false;
            }

            if (statusFilter !== 'all') {
                if (statusFilter === 'ok' && daysRemaining <= 30) return false;
                if (statusFilter === 'warning' && (daysRemaining > 30 || daysRemaining < 0)) return false;
                if (statusFilter === 'expired' && daysRemaining >= 0) return false;
            }

            return true;
        }).sort((a, b) => {
             const daysA = calculateDaysRemaining(a.deadlineInfo.shiftedDate);
             const daysB = calculateDaysRemaining(b.deadlineInfo.shiftedDate);
             return daysA - daysB;
        });
    }, [students, phaseFilter, statusFilter]);

    const handleModalContainerClick = (e) => {
        e.stopPropagation();
    };

    const handlePhaseChange = (e) => {
        setPhaseFilter(e.target.value);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
    };

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick=${onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col transform transition-all" onClick=${handleModalContainerClick}>
                
                <header className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-800">Határidő Riportok</h2>
                    </div>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <${Icons.XIcon} size=${24} />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex-1">
                            <label htmlFor="phaseFilter" className="block text-sm font-medium text-gray-700 mb-1">Fázis Szűrő</label>
                            <select id="phaseFilter" value=${phaseFilter} onChange=${handlePhaseChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                <option value="all">Mind</option>
                                <option value="1">Csak 1. Fázis</option>
                                <option value="2">Csak 2. Fázis</option>
                                <option value="3">Csak 3. Fázis</option>
                                <option value="4">Csak 4. Fázis</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Állapot Szűrő</label>
                            <select id="statusFilter" value=${statusFilter} onChange=${handleStatusChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                <option value="all">Mind</option>
                                <option value="ok">Rendben (>30 nap)</option>
                                <option value="warning">Veszélyeztetett (<= 30 nap)</option>
                                <option value="expired">Letelt (< 0 nap)</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Név</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Azonosító</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Aktuális Fázis</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Határidő Dátuma</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Állapot</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                ${filteredStudents.length === 0 ? html`
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                            Nincsenek a szűrési feltételeknek megfelelő tanulók.
                                        </td>
                                    </tr>
                                ` : filteredStudents.map(student => {
                                    const fullName = utils.formatFullName(student.current_prefix, student.current_firstName, student.current_lastName, student.current_secondName);
                                    const phaseName = mapPhaseName(student.deadlineInfo.activePhase);

                                    let deadlineDateStr = '';
                                    if (student.deadlineInfo.shiftedDate) {
                                        let d;
                                        if (student.deadlineInfo.shiftedDate.toDate) {
                                            d = student.deadlineInfo.shiftedDate.toDate();
                                        } else if (student.deadlineInfo.shiftedDate.seconds) {
                                            d = new Date(student.deadlineInfo.shiftedDate.seconds * 1000);
                                        } else {
                                            d = new Date(student.deadlineInfo.shiftedDate);
                                        }
                                        deadlineDateStr = d.toLocaleDateString('hu-HU');
                                    }

                                    const daysRemaining = calculateDaysRemaining(student.deadlineInfo.shiftedDate);

                                    let statusColorClass = '';
                                    let statusText = '';
                                    let emoji = '';

                                    if (daysRemaining < 0) {
                                        statusColorClass = 'bg-red-100 text-red-800';
                                        statusText = 'Letelt';
                                        emoji = '🔴';
                                    } else if (daysRemaining <= 30) {
                                        statusColorClass = 'bg-orange-100 text-orange-800';
                                        statusText = 'Veszélyeztetett';
                                        emoji = '⚠️';
                                    } else {
                                        statusColorClass = 'bg-green-100 text-green-800';
                                        statusText = 'Rendben';
                                        emoji = '✅';
                                    }

                                    const handleRowClick = () => {
                                        onStudentClick(student);
                                        onClose();
                                    };

                                    // VÉDŐBUROK A HTM BUG ELLEN: <${Fragment}>
                                    return html`
                                        <${Fragment} key=${student.id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-900 cursor-pointer" onClick=${handleRowClick}>
                                                    ${fullName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    ${student.studentId || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    ${phaseName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                                    ${deadlineDateStr}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColorClass}">
                                                        <span className="mr-1">${emoji}</span>
                                                        ${statusText} (${daysRemaining} nap)
                                                    </span>
                                                </td>
                                            </tr>
                                        </${Fragment}>
                                    `;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export default DeadlineReportsModal;