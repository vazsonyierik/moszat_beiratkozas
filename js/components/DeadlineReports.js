import { html } from '../UI.js';
import * as Icons from '../Icons.js';
import * as utils from '../utils.js';

const React = window.React;
const { useState, useMemo, Fragment } = React;

export default function DeadlineReports({ students, onShowDetails }) {
    // States for filtering
    const [daysFilter, setDaysFilter] = useState(''); // Empty string means "all days"
    const [phaseFilter, setPhaseFilter] = useState('all');
    const [includeExpired, setIncludeExpired] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Helper functions (from ViewDetailsModal/utils) ---
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

        const diffTime = target - today;
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

    const formatJustDate = (timestamp) => {
        if (!timestamp) return '-';
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
            return '-';
        }
        if (isNaN(d.getTime())) return '-';

        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.`;
    };

    const getStatusColorAndText = (daysRemaining) => {
        if (daysRemaining === null) return { text: 'Ismeretlen', className: 'text-gray-500 italic' };
        if (daysRemaining < 0) return { text: 'Letelt', className: 'font-bold text-red-600 bg-red-100 px-2 py-1 rounded inline-block text-xs' };
        if (daysRemaining <= 30) return { text: `${daysRemaining} nap van hátra`, className: 'font-bold text-orange-600' };
        return { text: `${daysRemaining} nap van hátra`, className: 'font-bold text-green-600' };
    };

    // --- Filtering Logic ---
    const filteredStudents = useMemo(() => {
        if (!students) return [];

        return students.filter(student => {
            // 1. Must have deadlineInfo and a valid shiftedDate
            if (!student.deadlineInfo || !student.deadlineInfo.shiftedDate) return false;

            const daysRemaining = getDaysRemaining(student.deadlineInfo.shiftedDate);
            if (daysRemaining === null) return false;

            // 2. Filter by search term
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const name = utils.formatFullName(
                    student.current_prefix,
                    student.current_firstName,
                    student.current_lastName,
                    student.current_secondName
                ).toLowerCase();
                const email = (student.email || '').toLowerCase();
                if (!name.includes(term) && !email.includes(term)) {
                    return false;
                }
            }

            // 3. Filter by phase
            if (phaseFilter !== 'all') {
                const phase = student.deadlineInfo.activePhase || '';
                if (!phase.includes(phaseFilter)) return false;
            }

            // 4. Filter by expired
            if (!includeExpired && daysRemaining < 0) {
                return false;
            }

            // 5. Filter by days remaining
            if (daysFilter !== '') {
                const maxDays = parseInt(daysFilter, 10);
                if (!isNaN(maxDays)) {
                    // Only show if daysRemaining is less than or equal to maxDays
                    // If includeExpired is true, also include negative days
                    if (daysRemaining > maxDays) return false;
                }
            }

            return true;
        }).sort((a, b) => {
            // Sort by days remaining ascending (most urgent first)
            const daysA = getDaysRemaining(a.deadlineInfo.shiftedDate) || 0;
            const daysB = getDaysRemaining(b.deadlineInfo.shiftedDate) || 0;
            return daysA - daysB;
        });
    }, [students, daysFilter, phaseFilter, includeExpired, searchTerm]);

    // --- UI Helpers ---
    const handleQuickDays = (days) => {
        setDaysFilter(days.toString());
    };

    return html`
        <div className="bg-white rounded-lg shadow mt-6">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <${Icons.CalendarIcon} size=${24} className="text-indigo-600" />
                    Határidő Riportok és Lekérdezések
                </h2>

                ${/* Filters */''}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">

                    ${/* Days Filter */''}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Szűrés hátralévő napokra</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="0"
                                placeholder="Pl.: 30"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                value=${daysFilter}
                                onChange=${e => setDaysFilter(e.target.value)}
                            />
                            <span className="self-center text-sm text-gray-500">nap</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                            <button onClick=${() => handleQuickDays(7)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded transition-colors">7 nap</button>
                            <button onClick=${() => handleQuickDays(30)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded transition-colors">1 hó</button>
                            <button onClick=${() => handleQuickDays(90)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded transition-colors">3 hó</button>
                            <button onClick=${() => handleQuickDays(180)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded transition-colors">6 hó</button>
                            <button onClick=${() => setDaysFilter('')} className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded transition-colors">Töröl</button>
                        </div>
                    </div>

                    ${/* Phase Filter */''}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Határidő típusa / Fázis</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white"
                            value=${phaseFilter}
                            onChange=${e => setPhaseFilter(e.target.value)}
                        >
                            <option value="all">Összes aktív fázis</option>
                            <option value="Phase 1">Megkezdhetőségi (90 nap)</option>
                            <option value="Phase 2">Első elmélet (9 hónap)</option>
                            <option value="Phase 3">Sikeres elmélet (12 hónap)</option>
                            <option value="Phase 4">Sikeres forgalmi (2 év)</option>
                        </select>
                    </div>

                    ${/* Search Filter */''}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Keresés név / email alapján</label>
                        <input
                            type="text"
                            placeholder="Keresés..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            value=${searchTerm}
                            onChange=${e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    ${/* Checkboxes */''}
                    <div className="space-y-2 flex flex-col justify-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 w-4 h-4"
                                checked=${includeExpired}
                                onChange=${e => setIncludeExpired(e.target.checked)}
                            />
                            <span className="text-sm text-gray-700 font-medium">Mutassa a már lejárt határidőket is</span>
                        </label>
                    </div>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                    Összes találat: <span className="font-bold text-gray-800">${filteredStudents.length}</span> tanuló
                </div>
            </div>

            ${/* Table */''}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanuló</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kapcsolat</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktuális Cél / Fázis</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Határidő Napja</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Állapot</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Művelet</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        ${filteredStudents.length === 0 ? html`
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    Nincs a szűrési feltételeknek megfelelő tanuló.
                                </td>
                            </tr>
                        ` : filteredStudents.map(student => {
                            const info = student.deadlineInfo;
                            const daysRemaining = getDaysRemaining(info.shiftedDate);
                            const statusStyle = getStatusColorAndText(daysRemaining);

                            const fullName = utils.formatFullName(
                                student.current_prefix,
                                student.current_firstName,
                                student.current_lastName,
                                student.current_secondName
                            );

                            const getStatusLabel = (s) => {
                                if (student.courseCompletedAt) return 'E-learning kész';
                                if (student.status_enrolled) return 'Beiratkozva';
                                if (student.status_paid) return 'Fizetve';
                                if (s === 'archived') return 'Archivált';
                                if (s && s.startsWith('expired')) return 'Lejárt';
                                if (s === 'active') return 'Folyamatban';
                                return s || 'Jelentkező';
                            };

                            const lastNameInitial = (student.current_lastName || '').charAt(0).toUpperCase();
                            const firstNameInitial = (student.current_firstName || '').charAt(0).toUpperCase();

                            return html`
                                <tr key="${student.id}" className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">
                                                ${lastNameInitial}${firstNameInitial}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">${fullName}</div>
                                                <div className="text-xs text-gray-500">${getStatusLabel(student.status)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">${student.email}</div>
                                        <div className="text-sm text-gray-500">${student.phone_number || student.telefon || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title="${getPhaseLabel(info.activePhase)}">
                                            ${getPhaseLabel(info.activePhase)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 font-medium">${formatJustDate(info.shiftedDate)}</div>
                                        ${info.isShifted ? html`
                                            <div className="text-[10px] text-gray-400" title="Ünnepnap/hétvége miatt csúsztatva">(csúsztatva)</div>
                                        ` : null}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="${statusStyle.className}">
                                            ${statusStyle.text}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick=${() => onShowDetails(student)}
                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors"
                                        >
                                            Részletek
                                        </button>
                                    </td>
                                </tr>
                            `;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
