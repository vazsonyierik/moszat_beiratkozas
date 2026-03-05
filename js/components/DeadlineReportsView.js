import { html } from '../UI.js';
import * as utils from '../utils.js';

const React = window.React;
const { useState, useMemo, Fragment } = React;

/**
 * Calculates days remaining between today and a target date.
 * Returns negative if the date has passed.
 */
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Maps the backend phase string to the exact requested Hungarian string
 * Backend phases from deadlineCalculator.js:
 * Phase 1: Beiratkozva (90 nap)
 * Phase 2: Azonosító kiadva (9 hónap)
 * Phase 3: Sikertelen elmélet (12 hónap azonosítótól)
 * Phase 4: Sikeres KRESZ vizsga (2 év)
 */
function mapPhaseName(backendPhase) {
    if (!backendPhase) return "Ismeretlen fázis";
    if (backendPhase.includes("Phase 1")) return "Tanfolyam megkezdése (90 nap)";
    if (backendPhase.includes("Phase 2")) return "Első elméleti vizsga (9 hónap)";
    if (backendPhase.includes("Phase 3")) return "Sikeres elméleti vizsga (12 hónap)";
    if (backendPhase.includes("Phase 4")) return "Sikeres forgalmi vizsga (2 év)";
    return backendPhase;
}

/**
 * Maps phase string to a numeric phase (1, 2, 3, 4) for filtering
 */
function getPhaseNumber(backendPhase) {
    if (!backendPhase) return 0;
    if (backendPhase.includes("Phase 1")) return 1;
    if (backendPhase.includes("Phase 2")) return 2;
    if (backendPhase.includes("Phase 3")) return 3;
    if (backendPhase.includes("Phase 4")) return 4;
    return 0;
}

const DeadlineReportsView = ({ students, onStudentClick }) => {
    const [phaseFilter, setPhaseFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredStudents = useMemo(() => {
        if (!students) return [];

        return students.filter(student => {
            // Only students with valid deadlineInfo
            if (!student?.deadlineInfo?.shiftedDate) {
                return false;
            }

            const daysRemaining = calculateDaysRemaining(student.deadlineInfo.shiftedDate);
            if (daysRemaining === null) return false;

            // Apply Phase Filter
            const phaseNum = getPhaseNumber(student.deadlineInfo.activePhase);
            if (phaseFilter !== 'all') {
                const targetPhase = parseInt(phaseFilter, 10);
                if (phaseNum !== targetPhase) return false;
            }

            // Apply Status Filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'ok' && daysRemaining <= 30) return false;
                if (statusFilter === 'warning' && (daysRemaining > 30 || daysRemaining < 0)) return false;
                if (statusFilter === 'expired' && daysRemaining >= 0) return false;
            }

            return true;
        }).sort((a, b) => {
             // Sort by days remaining (closest deadline first)
             const daysA = calculateDaysRemaining(a.deadlineInfo.shiftedDate);
             const daysB = calculateDaysRemaining(b.deadlineInfo.shiftedDate);
             return daysA - daysB;
        });
    }, [students, phaseFilter, statusFilter]);

    return html`
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                    <label htmlFor="phaseFilter" className="block text-sm font-medium text-gray-700 mb-1">Fázis Szűrő</label>
                    <select
                        id="phaseFilter"
                        value=${phaseFilter}
                        onChange=${e => setPhaseFilter(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                        <option value="all">Mind</option>
                        <option value="1">Csak 1. Fázis</option>
                        <option value="2">Csak 2. Fázis</option>
                        <option value="3">Csak 3. Fázis</option>
                        <option value="4">Csak 4. Fázis</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Állapot Szűrő</label>
                    <select
                        id="statusFilter"
                        value=${statusFilter}
                        onChange=${e => setStatusFilter(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                        <option value="all">Mind</option>
                        <option value="ok">Rendben (>30 nap)</option>
                        <option value="warning">Veszélyeztetett (<= 30 nap)</option>
                        <option value="expired">Letelt (< 0 nap)</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
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

                            // Format shiftedDate
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

                            return html`
                                <tr key="${student.id}" className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-900 cursor-pointer" onClick=${() => onStudentClick(student)}>
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
                            `;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

export default DeadlineReportsView;