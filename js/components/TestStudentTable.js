/**
 * js/components/TestStudentTable.js
 * Modernized version of StudentTable used exclusively in Test Mode.
 */
import { html } from '../UI.js';
import Icons from '../Icons.js';
import { useConfirmation } from '../context/AppContext.js';
import * as utils from '../utils.js';
import StudentIdInput from './StudentIdInput.js';

const React = window.React;
const { useState, useMemo, useEffect, Fragment, useRef } = React;

const StatusIcon = ({ Icon, color, title }) => html`
    <div title=${title} className="w-7 h-7 rounded-full flex items-center justify-center ${color} text-white shadow-md">
        <${Icon} size=${16} />
    </div>
`;

// A modern toggle switch component
const ToggleSwitch = ({ checked, onChange, disabled, label }) => {
    return html`
        <label className="flex items-center cursor-pointer group">
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked=${checked}
                    onChange=${onChange}
                    disabled=${disabled}
                />
                <div className=${`block w-10 h-6 rounded-full transition-colors ${disabled ? 'bg-gray-200' : checked ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                <div className=${`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
            </div>
            ${label && html`<span className=${`ml-3 text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>${label}</span>`}
        </label>
    `;
};

const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
    }
    if (currentPage - delta > 2) range.unshift('...');
    if (currentPage + delta < totalPages - 1) range.push('...');
    range.unshift(1);
    range.push(totalPages);
    return [...new Set(range)];
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    const pageNumbers = getPaginationItems(currentPage, totalPages);
    return html`
        <nav className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:justify-end gap-2">
                <button onClick=${() => onPageChange(currentPage - 1)} disabled=${currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">Előző</button>
                <div className="hidden sm:flex sm:items-center gap-1">
                    ${pageNumbers.map((number, index) => {
                        if (number === '...') return html`<span key="ellipsis-${index}" className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500">...</span>`;
                        return html`<button key="${number}" onClick=${() => onPageChange(number)} className=${`relative inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${currentPage === number ? 'z-10 bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>${number}</button>`;
                    })}
                </div>
                <button onClick=${() => onPageChange(currentPage + 1)} disabled=${currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">Következő</button>
            </div>
        </nav>
    `;
};

const TestStudentTable = ({ title, students, onStatusChange, onShowDetails, onEditDetails, onDelete, onIdSave, onMarkAsCompleted, onRestore, onArchive, onCommentSave, allowIdEditing = false, paginated = false, adminUser, showDayCounter = false, allowRestore = false, allowArchive = false, isTransferTab = false }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [editingRowId, setEditingRowId] = useState(null);
    const [inlineIdValue, setInlineIdValue] = useState('');
    const [idDate, setIdDate] = useState('');
    const [completeDate, setCompleteDate] = useState('');
    const [openCommentId, setOpenCommentId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const showConfirmation = useConfirmation();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleDropdownClick = (e, id) => {
        e.stopPropagation();
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    const handleQuickEditClick = (reg) => {
        setEditingRowId(reg.id);
        setInlineIdValue(reg.studentId || '');
        setIdDate('');
        setCompleteDate('');
        setOpenDropdownId(null);
    };

    const handleCancelQuickEdit = () => {
        setEditingRowId(null);
        setInlineIdValue('');
    };

    const studentFullName = (reg) => utils.formatFullName(reg.current_prefix, reg.current_firstName, reg.current_lastName, reg.current_secondName);

    const handleIdSaveConfirm = (reg) => {
        showConfirmation({
            message: `Biztosan menti a(z) '${inlineIdValue}' azonosítót ${studentFullName(reg)} számára?`,
            onConfirm: () => {
                onIdSave(reg.id, inlineIdValue, studentFullName(reg), idDate);
                handleCancelQuickEdit();
            }
        });
    };

    const handleMarkAsCompletedConfirm = (reg) => {
        onMarkAsCompleted(reg, completeDate, () => {
            handleCancelQuickEdit();
        });
    };

    const handleToggleComment = (reg) => {
        const isOpening = openCommentId !== reg.id;
        if (isOpening) {
            setOpenCommentId(reg.id);
            setCommentText(reg.adminComment || '');
        } else {
            setOpenCommentId(null);
        }
        setOpenDropdownId(null);
    };

    const handleSaveComment = (reg) => {
        onCommentSave(reg.id, commentText, studentFullName(reg));
        setOpenCommentId(null);
    };

    useEffect(() => { setCurrentPage(1); }, [students, itemsPerPage]);

    const currentStudents = useMemo(() => {
        if (!paginated) return students;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return students.slice(indexOfFirstItem, indexOfLastItem);
    }, [students, currentPage, itemsPerPage, paginated]);

    const totalPages = paginated ? Math.ceil(students.length / itemsPerPage) : 1;

    const getRowBgClass = (reg) => {
        if (reg.status === 'archived') return 'bg-gray-100/50 text-gray-500 hover:bg-gray-100';
        if (reg.status === 'expired_unpaid') return 'bg-amber-50/50 hover:bg-amber-50';
        if (reg.status === 'expired_not_started') return 'bg-cyan-50/50 hover:bg-cyan-50';
        if (reg.status === 'expired_elearning_incomplete') return 'bg-rose-50/50 hover:bg-rose-50';
        if (reg.status && reg.status.startsWith('expired')) return 'bg-red-50/50 hover:bg-red-50';
        if (reg.courseCompletedAt) return 'bg-blue-50/30 hover:bg-blue-50';
        if (reg.status_enrolled) return 'bg-green-50/30 hover:bg-green-50';
        if (reg.status_paid) return 'bg-yellow-50/30 hover:bg-yellow-50';
        return 'hover:bg-slate-50';
    };

    return html`
    <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                ${title}
                <span className="bg-slate-200 text-slate-700 py-0.5 px-2.5 rounded-full text-sm font-bold">${students.length}</span>
            </h2>
            ${paginated && html`
                <div className="flex items-center space-x-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <label htmlFor="itemsPerPage-${title}" className="text-sm font-medium text-slate-600">Oldalanként:</label>
                    <select id="itemsPerPage-${title}" value=${itemsPerPage} onChange=${e => setItemsPerPage(Number(e.target.value))} className="text-sm border-0 bg-transparent text-slate-800 font-bold focus:ring-0 cursor-pointer">
                        <option value="10">10</option><option value="25">25</option><option value="50">50</option>
                    </select>
                </div>
            `}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
            <div className="overflow-x-auto overflow-y-visible">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider rounded-tl-2xl">Jelentkezés</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tanuló</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Adatok</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ikonok</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Státusz</th>
                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider rounded-tr-2xl">Műveletek</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        ${currentStudents.length === 0 ? html`<tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium">Nincsenek tanulók ebben a kategóriában.</td></tr>`
                        : currentStudents.map((reg) => {
                            const formattedTime = utils.formatTimestampForTable(reg.createdAt);
                            const birthPlace = `${reg.birth_city}${reg.birth_district ? `, ${reg.birth_district}` : ''}`;
                            const fullName = studentFullName(reg);
                            const motherFullName = utils.formatFullName(reg.mother_prefix, reg.mother_firstName, reg.mother_lastName, reg.mother_secondName);

                            const adminIcons = [
                                reg.registeredBy === 'admin' && { Icon: Icons.AdminUserIcon, color: "bg-slate-500", title: "Admin által rögzített", key: 'adminReg' },
                                utils.hasMedicalCertificate(reg) && { Icon: Icons.MedicalIcon, color: "bg-pink-500", title: "Orvosi igazolás leadva", key: 'med' },
                                utils.hasCompletedCourse(reg) && { Icon: Icons.GraduationCapIcon, color: "bg-cyan-500", title: "A tanfolyamot befejezte", key: 'grad' },
                                utils.hasStudentId(reg) && { Icon: Icons.IdCardIcon, color: "bg-purple-500", title: "Tanulói azonosító kitöltve", key: 'id' },
                                reg.isCaseFiled && { Icon: Icons.FolderIcon, color: "bg-teal-500", title: "Ügy iktatva", key: 'case' }
                            ].filter(Boolean);

                            const studentIcons = [
                                utils.hasPreviousLicense(reg.has_previous_license) && { Icon: Icons.CarIcon, color: "bg-green-500", title: "Van már jogosítványa", key: 'lic' },
                                utils.isStudentUnder18(reg.birthDate) && { Icon: Icons.AlertIcon, color: "bg-red-500", title: "18 év alatti", key: 'age' },
                                utils.hasStudentStudiedBefore(reg.studied_elsewhere_radio) && { Icon: Icons.HelpIcon, color: "bg-yellow-500", title: "Tanult már máshol/nálunk", key: 'study' },
                                utils.hasComment(reg.megjegyzes) && { Icon: Icons.InfoIcon, color: "bg-blue-500", title: "Van megjegyzése", key: 'comment' }
                            ].filter(Boolean);

                            const isEditingThisRow = editingRowId === reg.id;
                            const allowDelete = (!reg.status_enrolled && !reg.courseCompletedAt) || isTransferTab;

                            return html`
                            <${Fragment} key="${reg.id}">
                                <tr key="${reg.id}-main" className="${getRowBgClass(reg)} transition-colors duration-200 group">

                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">${formattedTime.date}</span>
                                            <span className="text-xs text-slate-500 font-medium">${formattedTime.time}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-5 whitespace-normal">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-base font-bold text-slate-900">${fullName}</span>
                                                ${(() => {
                                                    if (!showDayCounter) return null;
                                                    let days = null;
                                                    let daysLabel = '';
                                                    let bgColor = '';

                                                    if (reg.studentIdAssignedAt) {
                                                        days = utils.calculateDaysSince(reg.studentIdAssignedAt);
                                                        daysLabel = 'napja ID-t kapott';
                                                        bgColor = 'bg-blue-100 text-blue-800 border-blue-200';
                                                    } else if (reg.status_enrolled && reg.enrolledAt) {
                                                        days = utils.calculateDaysSince(reg.enrolledAt);
                                                        daysLabel = 'napja beiratkozott';
                                                        bgColor = 'bg-green-100 text-green-800 border-green-200';
                                                    } else if (!reg.status_enrolled && reg.createdAt) {
                                                        days = utils.calculateDaysSince(reg.createdAt);
                                                        daysLabel = 'napja jelentkezett';
                                                        bgColor = 'bg-slate-100 text-slate-700 border-slate-200';
                                                    }

                                                    if (days !== null && days >= 0) {
                                                        return html`<span className="${'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ' + bgColor}">${days} ${daysLabel}</span>`;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <span className="text-sm text-slate-500 font-medium flex items-center gap-1">
                                                <${Icons.MailIcon} size=${14} className="text-slate-400" />
                                                ${reg.email}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-5 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-slate-700">${reg.birthDate}</span>
                                            <span className="text-slate-500 text-xs">${birthPlace}</span>
                                            <span className="text-slate-600 font-medium text-xs mt-1">Anyja: ${motherFullName}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-2">
                                            ${adminIcons.length > 0 && html`
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    ${adminIcons.map(icon => html`<${StatusIcon} key="${icon.key}" ...${icon} />`)}
                                                </div>
                                            `}
                                            ${studentIcons.length > 0 && html`
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    ${studentIcons.map(icon => html`<${StatusIcon} key="${icon.key}" ...${icon} />`)}
                                                </div>
                                            `}
                                        </div>
                                    </td>

                                    <td className="px-6 py-5">
                                        ${!isTransferTab && html`
                                            <div className="flex flex-col gap-3">
                                                ${!reg.status_enrolled && html`
                                                    <${ToggleSwitch}
                                                        label="Fizetve"
                                                        checked=${!!reg.status_paid}
                                                        onChange=${() => onStatusChange(reg.id, 'status_paid', !reg.status_paid, fullName)}
                                                    />
                                                `}
                                                ${reg.status_enrolled && html`
                                                    <${ToggleSwitch}
                                                        label="Orvosi"
                                                        checked=${!!reg.hasMedicalCertificate}
                                                        onChange=${() => onStatusChange(reg.id, 'hasMedicalCertificate', !reg.hasMedicalCertificate, fullName)}
                                                    />
                                                `}
                                                <${ToggleSwitch}
                                                    label="Beírva"
                                                    checked=${!!reg.status_enrolled}
                                                    onChange=${() => onStatusChange(reg.id, 'status_enrolled', !reg.status_enrolled, fullName)}
                                                    disabled=${!reg.status_paid}
                                                />
                                            </div>
                                        `}
                                    </td>

                                    <td className="px-6 py-5 text-right relative">
                                        ${isEditingThisRow ? html`
                                            <div className="flex flex-col items-end gap-3 bg-white p-3 rounded-xl shadow-lg border border-slate-200 absolute right-6 z-10 w-72">
                                                <div className="w-full">
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Azonosító</label>
                                                    <div className="flex items-center gap-2">
                                                        <${StudentIdInput}
                                                            name="studentId"
                                                            value=${inlineIdValue}
                                                            onChange=${(e) => setInlineIdValue(e.target.value)}
                                                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <input type="date" value=${idDate} onChange=${e => setIdDate(e.target.value)} className="w-32 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                                        <button onClick=${() => handleIdSaveConfirm(reg)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" title="Azonosító mentése">
                                                            <${Icons.CheckIcon} size=${18} />
                                                        </button>
                                                    </div>
                                                </div>
                                                ${!isTransferTab && html`
                                                    <div className="w-full pt-2 border-t border-slate-100">
                                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Befejezés dátuma</label>
                                                        <div className="flex items-center gap-2">
                                                            <input type="date" value=${completeDate} onChange=${e => setCompleteDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                                            <button onClick=${() => handleMarkAsCompletedConfirm(reg)} className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors" title="Elmélet kész">
                                                                <${Icons.CheckIcon} size=${18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                `}
                                                <button onClick=${handleCancelQuickEdit} className="w-full mt-1 p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg transition-colors text-sm">
                                                    Mégse
                                                </button>
                                            </div>
                                        ` : html`
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick=${() => onShowDetails(reg)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg text-sm transition-colors">Adatok</button>

                                                <div className="relative">
                                                    <button
                                                        onClick=${(e) => handleDropdownClick(e, reg.id)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        <${Icons.MoreVerticalIcon} size=${20} />
                                                    </button>

                                                    ${openDropdownId === reg.id && html`
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-20 py-1 overflow-hidden" onClick=${e => e.stopPropagation()}>
                                                            <button onClick=${() => { onEditDetails(reg); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                                <${Icons.EditIcon} size=${16} className="text-blue-500" /> Szerkesztés
                                                            </button>

                                                            ${allowIdEditing && !reg.courseCompletedAt && html`
                                                                <button onClick=${() => handleQuickEditClick(reg)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                                    <${Icons.EditIcon} size=${16} className="text-indigo-500" /> Gyors szerkesztés
                                                                </button>
                                                            `}

                                                            <button onClick=${() => handleToggleComment(reg)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                                <${Icons.InfoIcon} size=${16} className="text-slate-500" /> Megjegyzés ${reg.adminComment && html`<span className="w-2 h-2 rounded-full bg-blue-500"></span>`}
                                                            </button>

                                                            ${allowArchive && html`
                                                                <button onClick=${() => { onArchive(reg); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-t border-slate-100">
                                                                    <${Icons.ArchiveIcon} size=${16} className="text-amber-500" /> Archiválás
                                                                </button>
                                                            `}
                                                            ${allowRestore && html`
                                                                <button onClick=${() => { onRestore(reg); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 border-t border-slate-100">
                                                                    <${Icons.RestoreIcon} size=${16} className="text-green-500" /> Visszaállítás
                                                                </button>
                                                            `}
                                                            ${allowDelete && html`
                                                                <button onClick=${() => { onDelete(reg.id, fullName); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100">
                                                                    <${Icons.TrashIcon} size=${16} className="text-red-500" /> Törlés
                                                                </button>
                                                            `}
                                                        </div>
                                                    `}
                                                </div>
                                            </div>
                                        `}
                                    </td>
                                </tr>

                                <tr key="${reg.id}-comment">
                                    <td colSpan="6" className="p-0 border-0">
                                        <div className=${`transition-all duration-300 ease-in-out overflow-hidden ${openCommentId === reg.id ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="p-4 bg-blue-50/50 border-b border-blue-100">
                                                <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
                                                    <label htmlFor="adminComment-${reg.id}" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Megjegyzés</label>
                                                    <textarea
                                                        id="adminComment-${reg.id}"
                                                        value=${commentText}
                                                        onChange=${e => setCommentText(e.target.value)}
                                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                                        rows="3"
                                                        placeholder="Írd ide a tanulóval kapcsolatos megjegyzéseket..."
                                                    ></textarea>
                                                    <div className="flex justify-end gap-2 mt-3">
                                                        <button onClick=${() => setOpenCommentId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Mégse</button>
                                                        <button onClick=${() => handleSaveComment(reg)} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Mentés</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </${Fragment}>
                        `})}
                    </tbody>
                </table>
            </div>
            ${paginated && totalPages > 1 && html`<div className="p-4 bg-slate-50/80 border-t border-slate-200 rounded-b-2xl"><${Pagination} currentPage=${currentPage} totalPages=${totalPages} onPageChange=${setCurrentPage} /></div>`}
        </div>
    </div>
`;
};

export default TestStudentTable;
