/**
 * js/AdminPanel.js
 * * Main component for the admin interface.
 * FIX: The component is wrapped in a container div to restore its max-width and centering,
 * which was removed during the form redesign refactor in App.js.
 * JAVÍTÁS: A táblázatban lévő `<div>` elemek `<span>`-re cserélve, hogy a dupla kattintásos kijelölés és másolás helyesen működjön.
 * JAVÍTÁS 2: A JSX kommentek eltávolítva az 'htm' template literálból, hogy megszűnjenek a DOM nesting hibák.
 */

import { html, LoadingOverlay } from './UI.js'; // Import ConfirmationModal
import { db, serverTimestamp, collection, doc, onSnapshot, updateDoc, query, orderBy, deleteDoc, functions, httpsCallable } from './firebase.js';
import { useToast, useConfirmation } from './context/AppContext.js';
import * as utils from './utils.js';
import * as Icons from './Icons.js';
import { logAdminAction } from './actions.js';

import ViewDetailsModal from './components/modals/ViewDetailsModal.js';
import EditDetailsModal from './components/modals/EditDetailsModal.js';
import AdminAddStudentModal from './components/modals/AdminAddStudentModal.js';
import AutomationLog from './components/AutomationLog.js';
import AdminLog from './components/AdminLog.js';
import StudentIdInput from './components/StudentIdInput.js';
import VersionHistory from './components/VersionHistory.js'; // ÚJ: Verziókövetés komponens importálása

const React = window.React;
const { useState, useEffect, useMemo, useCallback, Fragment, useRef } = React;

// --- Child Components ---
const StatusIcon = ({ Icon, color, title }) => html`
    <div title=${title} className="w-7 h-7 rounded-full flex items-center justify-center ${color} text-white shadow-md">
        <${Icon} size=${16} />
    </div>
`;
const iconFilterOptions = [
    { key: 'medical', Icon: Icons.MedicalIcon, title: 'Orvosi igazolás leadva', check: (reg) => reg.hasMedicalCertificate, color: "bg-pink-500" },
    { key: 'hasId', Icon: Icons.IdCardIcon, title: 'Tanulói azonosító kitöltve', check: (reg) => !!reg.studentId, color: "bg-purple-500" },
    { key: 'prevLicense', Icon: Icons.CarIcon, title: 'Van már jogosítványa', check: (reg) => reg.has_previous_license === 'igen', color: "bg-green-500" },
    { key: 'under18', Icon: Icons.AlertIcon, title: '18 év alatti', check: (reg) => utils.isStudentUnder18(reg.birthDate), color: "bg-red-500" },
    { key: 'studiedElsewhere', Icon: Icons.HelpIcon, title: 'Tanult már máshol/nálunk', check: (reg) => reg.studied_elsewhere_radio !== 'nem', color: "bg-yellow-500" },
    { key: 'hasComment', Icon: Icons.InfoIcon, title: 'Van megjegyzése', check: (reg) => utils.hasComment(reg.megjegyzes), color: "bg-blue-500" },
    { key: 'adminRegistered', Icon: Icons.AdminUserIcon, title: 'Admin által rögzített', check: (reg) => reg.registeredBy === 'admin', color: "bg-slate-500" }
];

const IconLegendModal = ({ onClose }) => {
    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all" onClick=${e => e.stopPropagation()}>
                <header className="p-4 sm:p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Ikonok Jelentése</h3>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><${Icons.XIcon} size=${24} /></button>
                </header>
                <main className="p-4 sm:p-6 space-y-4">
                    ${iconFilterOptions.map(opt => html`
                        <div key=${opt.key} className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center ${opt.color} text-white shadow-md">
                                    <${opt.Icon} size=${18} />
                                </div>
                            </div>
                            <div>
                                <p className="font-medium text-gray-700">${opt.title}</p>
                            </div>
                        </div>
                    `)}
                </main>
            </div>
        </div>
    `;
};

const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const delta = 1;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
    }

    if (currentPage - delta > 2) {
        range.unshift('...');
    }
    if (currentPage + delta < totalPages - 1) {
        range.push('...');
    }

    range.unshift(1);
    range.push(totalPages);
    
    return [...new Set(range)];
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    const pageNumbers = getPaginationItems(currentPage, totalPages);
    
    return html`
        <nav className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:justify-end">
                <button onClick=${() => onPageChange(currentPage - 1)} disabled=${currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Előző</button>
                <div className="hidden sm:flex sm:items-center sm:ml-4">
                    ${pageNumbers.map((number, index) => {
                        if (number === '...') {
                            return html`<span key=${`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>`;
                        }
                        return html`<button key=${number} onClick=${() => onPageChange(number)} className=${`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>${number}</button>`;
                    })}
                </div>
                <button onClick=${() => onPageChange(currentPage + 1)} disabled=${currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Következő</button>
            </div>
        </nav>
    `;
};

const StudentTable = ({ title, students, onStatusChange, onShowDetails, onEditDetails, onDelete, onIdSave, onMarkAsCompleted, onRestore, onCommentSave, allowIdEditing = false, paginated = false, adminUser, showDayCounter = false, allowRestore = false }) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [editingRowId, setEditingRowId] = React.useState(null);
    const [inlineIdValue, setInlineIdValue] = React.useState('');
    const [idDate, setIdDate] = React.useState('');
    const [completeDate, setCompleteDate] = React.useState('');
    const [openCommentId, setOpenCommentId] = React.useState(null);
    const [commentText, setCommentText] = React.useState('');
    const showConfirmation = useConfirmation();

    const handleQuickEditClick = (reg) => {
        setEditingRowId(reg.id);
        setInlineIdValue(reg.studentId || '');
        setIdDate('');
        setCompleteDate('');
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
    };

    const handleSaveComment = (reg) => {
        onCommentSave(reg.id, commentText, studentFullName(reg));
        setOpenCommentId(null);
    };

    React.useEffect(() => { setCurrentPage(1); }, [students, itemsPerPage]);

    const currentStudents = React.useMemo(() => {
        if (!paginated) return students;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return students.slice(indexOfFirstItem, indexOfLastItem);
    }, [students, currentPage, itemsPerPage, paginated]);

    const totalPages = paginated ? Math.ceil(students.length / itemsPerPage) : 1;
    
    const getRowBgClass = (reg) => {
        if (reg.status === 'expired_unpaid') {
            return 'bg-amber-100 hover:bg-amber-200';
        }
        if (reg.status === 'expired_not_started') {
            return 'bg-cyan-100 hover:bg-cyan-200';
        }
        if (reg.status === 'expired_elearning_incomplete') {
            return 'bg-rose-100 hover:bg-rose-200';
        }
        if (reg.status && reg.status.startsWith('expired')) {
            return 'bg-red-100 hover:bg-red-200';
        }
        if (reg.courseCompletedAt) return 'bg-blue-50 hover:bg-blue-100';
        if (reg.status_enrolled) return 'bg-green-50 hover:bg-green-100';
        if (reg.status_paid) return 'bg-yellow-50 hover:bg-yellow-100';
        return 'hover:bg-gray-50';
    };

    return html`
    <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold ${title.toLowerCase().includes('lejárt') ? 'text-red-700' : title.toLowerCase().includes('befejezte') ? 'text-indigo-700' : title.toLowerCase().includes('beiratkozott') ? 'text-green-700' : title.toLowerCase().includes('fizetett') ? 'text-yellow-700' : 'text-gray-700'}">${title} (${students.length})</h2>
            ${paginated && html`
                <div className="flex items-center space-x-2 text-sm">
                    <label htmlFor="itemsPerPage-${title}" className="text-gray-600">Oldalanként:</label>
                    <select id="itemsPerPage-${title}" value=${itemsPerPage} onChange=${e => setItemsPerPage(Number(e.target.value))} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <option value="10">10</option><option value="25">25</option><option value="50">50</option>
                    </select>
                </div>
            `}
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Jelentkezés ideje</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Név / Email cím</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Születési adatok</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Anyja neve</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Státusz</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Admin</th>
                            <th scope="col" className="relative px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Műveletek</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        ${currentStudents.length === 0 ? html`<tr><td colSpan="7" className="text-center py-10 text-gray-500">Nincsenek tanulók ebben a kategóriában.</td></tr>`
                        : currentStudents.map((reg) => {
                            const formattedTime = utils.formatTimestampForTable(reg.createdAt);
                            const birthPlace = `${reg.birth_city}${reg.birth_district ? `, ${reg.birth_district}` : ''}`;
                            const fullName = studentFullName(reg);
                            const motherFullName = utils.formatFullName(reg.mother_prefix, reg.mother_firstName, reg.mother_lastName, reg.mother_secondName);
                            
                            const adminIcons = [
                                reg.registeredBy === 'admin' && { Icon: Icons.AdminUserIcon, color: "bg-slate-500", title: "Admin által rögzített", key: 'adminReg' },
                                utils.hasMedicalCertificate(reg) && { Icon: Icons.MedicalIcon, color: "bg-pink-500", title: "Orvosi igazolás leadva", key: 'med' },
                                utils.hasCompletedCourse(reg) && { Icon: Icons.GraduationCapIcon, color: "bg-cyan-500", title: "A tanfolyamot befejezte", key: 'grad' },
                                utils.hasStudentId(reg) && { Icon: Icons.IdCardIcon, color: "bg-purple-500", title: "Tanulói azonosító kitöltve", key: 'id' }
                            ].filter(Boolean);

                            const studentIcons = [
                                utils.hasPreviousLicense(reg.has_previous_license) && { Icon: Icons.CarIcon, color: "bg-green-500", title: "Van már jogosítványa", key: 'lic' },
                                utils.isStudentUnder18(reg.birthDate) && { Icon: Icons.AlertIcon, color: "bg-red-500", title: "18 év alatti", key: 'age' },
                                utils.hasStudentStudiedBefore(reg.studied_elsewhere_radio) && { Icon: Icons.HelpIcon, color: "bg-yellow-500", title: "Tanult már máshol/nálunk", key: 'study' },
                                utils.hasComment(reg.megjegyzes) && { Icon: Icons.InfoIcon, color: "bg-blue-500", title: "Van megjegyzése", key: 'comment' }
                            ].filter(Boolean);

                            const isEditingThisRow = editingRowId === reg.id;
                            const allowDelete = !reg.status_enrolled && !reg.courseCompletedAt;

                            return html`
                            <${React.Fragment} key=${reg.id}>
                                <tr className="${getRowBgClass(reg)} transition-colors">
                                    
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        <div className="flex flex-col">
                                            <span>${formattedTime.date}</span>
                                            <span className="text-gray-500">${formattedTime.time}</span>
                                        </div>
                                    </td>
                                    
                                    
                                    <td className="px-6 py-4 whitespace-normal">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900">${fullName}</span>
                                                ${(() => {
                                                    if (!showDayCounter) return null;
                                                
                                                // JAVÍTÁS: Hiányzó 'let' kulcsszavak pótlása
                                                let days = null;
                                                let daysLabel = '';
                                                let bgColor = '';
                                    
                                                if (reg.studentIdAssignedAt) {
                                                    days = utils.calculateDaysSince(reg.studentIdAssignedAt);
                                                    daysLabel = 'napja kapott ID-t';
                                                    bgColor = 'bg-blue-100 text-blue-800';
                                                } else if (reg.status_enrolled && reg.enrolledAt) {
                                                    days = utils.calculateDaysSince(reg.enrolledAt);
                                                    daysLabel = 'napja iratkozott be';
                                                    bgColor = 'bg-green-100 text-green-800';
                                                } else if (!reg.status_enrolled && reg.createdAt) {
                                                    days = utils.calculateDaysSince(reg.createdAt);
                                                    daysLabel = 'napja jelentkezett';
                                                    bgColor = 'bg-gray-100 text-gray-800';
                                                }
                                    
                                                // JAVÍTÁS: A hiányzó visszatérési érték (a span elem) pótlása
                                                if (days !== null && days >= 0) {
                                                    return html`<span className="${'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + bgColor}">${days} ${daysLabel}</span>`;
                                                }
                                                return null;
                                            })()}
                                            </div>
                                            <span className="text-sm text-gray-500">${reg.email}</span>
                                        </div>
                                    </td>
                                    
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex flex-col">
                                            <span>${birthPlace}</span>
                                            <span className="text-gray-500">${reg.birthDate}</span>
                                        </div>
                                    </td>
                                    
                                    
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">
                                        ${motherFullName}
                                    </td>
                                    
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col justify-center space-y-1">
                                            ${adminIcons.length > 0 && html`
                                                <div className="flex items-center space-x-1.5">
                                                    ${adminIcons.map(icon => html`<${StatusIcon} key=${icon.key} ...${icon} />`)}
                                                </div>
                                            `}
                                            ${studentIcons.length > 0 && html`
                                                <div className="flex items-center space-x-1.5">
                                                    ${studentIcons.map(icon => html`<${StatusIcon} key=${icon.key} ...${icon} />`)}
                                                </div>
                                            `}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex flex-col space-y-2">
                                            ${!reg.status_enrolled && html`
                                                <label className="flex items-center">
                                                    <input type="checkbox" checked=${!!reg.status_paid} onChange=${() => onStatusChange(reg.id, 'status_paid', !reg.status_paid, fullName)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" /> 
                                                    <span className="ml-2">Fizetve</span>
                                                </label>
                                            `}
                                            ${reg.status_enrolled && html`
                                                <label className="flex items-center">
                                                    <input type="checkbox" checked=${!!reg.hasMedicalCertificate} onChange=${() => onStatusChange(reg.id, 'hasMedicalCertificate', !reg.hasMedicalCertificate, fullName)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" /> 
                                                    <span className="ml-2">Orvosi</span>
                                                </label>
                                            `}
                                            <label className="flex items-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked=${!!reg.status_enrolled} 
                                                    onChange=${() => onStatusChange(reg.id, 'status_enrolled', !reg.status_enrolled, fullName)} 
                                                    disabled=${!reg.status_paid}
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                /> 
                                                <span className=${`ml-2 ${!reg.status_paid ? 'text-gray-400' : ''}`}>Beírva</span>
                                            </label>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        ${isEditingThisRow ? html`
                                            <div className="flex items-start space-x-2">
                                                <div className="flex flex-col space-y-2 items-start">
                                                    <div className="flex items-center space-x-2">
                                                        <${StudentIdInput} 
                                                            name="studentId"
                                                            value=${inlineIdValue}
                                                            onChange=${(e) => setInlineIdValue(e.target.value)}
                                                            className="w-48 p-1 border rounded-md shadow-sm text-sm"
                                                        />
                                                        <input type="date" value=${idDate} onChange=${e => setIdDate(e.target.value)} className="p-1 border rounded-md shadow-sm text-sm" />
                                                        <button onClick=${() => handleIdSaveConfirm(reg)} className="p-1.5 hover:bg-green-100 rounded-full" title="Azonosító mentése">
                                                            <${Icons.CheckIcon} size=${20} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-medium">Befejezte?</span>
                                                        <input type="date" value=${completeDate} onChange=${e => setCompleteDate(e.target.value)} className="p-1 border rounded-md shadow-sm text-sm" />
                                                         <button onClick=${() => handleMarkAsCompletedConfirm(reg)} className="p-1.5 hover:bg-green-100 rounded-full" title="Elmélet kész">
                                                            <${Icons.CheckIcon} size=${20} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <button onClick=${handleCancelQuickEdit} className="p-1.5 hover:bg-red-100 rounded-full self-center" title="Mégse">
                                                    <${Icons.XIcon} size=${20} />
                                                </button>
                                            </div>
                                        ` : html`
                                            <div className="flex items-center justify-end space-x-2">
                                                <div className="flex flex-col items-end space-y-2">
                                                    <button onClick=${() => onShowDetails(reg)} className="text-indigo-600 hover:text-indigo-900 font-semibold">Adatok</button>

<button onClick=${() => onEditDetails(reg)} className="text-blue-600 hover:text-blue-900 font-semibold">Szerkesztés</button>
                                                </div>
                                                <div className="flex flex-col items-center space-y-2 border-l pl-2 ml-2 py-1">
                                                    ${allowIdEditing && !reg.courseCompletedAt && html`
                                                        <button onClick=${() => handleQuickEditClick(reg)} className="text-gray-500 hover:text-gray-700" title="Gyors szerkesztés">
                                                            <${Icons.EditIcon} size=${20} />
                                                        </button>
                                                    `}
                                                    ${allowRestore && html`
                                                        <button onClick=${() => onRestore(reg)} className="text-green-600 hover:text-green-800" title="Tanuló visszaállítása">
                                                            <${Icons.RestoreIcon} size=${20} />
                                                        </button>
                                                    `}
                                                    ${allowDelete && html`<button onClick=${() => onDelete(reg.id, fullName)} className="text-red-600 hover:text-red-800" title="Jelentkezés törlése"><${Icons.TrashIcon} size=${20} /></button>`}
                                                    <button onClick=${() => handleToggleComment(reg)} className="text-gray-500 hover:text-gray-700" title="Admin megjegyzés">
                                                        ${reg.adminComment && reg.adminComment.trim()
                                                            ? html`<${Icons.ArrowDownCircleSolidIcon} size=${20} />`
                                                            : html`<${Icons.ArrowDownCircleIcon} size=${20} />`
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        `}
                                    </td>
                                </tr>
                                <tr key=${reg.id + '-comment'}>
                                    <td colSpan="7" className="p-0 border-none">
                                        <div className=${`transition-all duration-300 ease-in-out grid ${openCommentId === reg.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                            <div className="overflow-hidden">
                                                <div className="p-3 bg-slate-50">
                                                    <div className="p-2 bg-white rounded-md border">
                                                        <label htmlFor="adminComment-${reg.id}" className="block text-xs font-bold text-gray-600 mb-1 uppercase">Admin Megjegyzés</label>
                                                        <textarea
                                                            id="adminComment-${reg.id}"
                                                            value=${commentText}
                                                            onChange=${e => setCommentText(e.target.value)}
                                                            className="w-full p-2 border rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                            rows="3"
                                                            placeholder="Ide írhatsz megjegyzést a tanulóval kapcsolatban..."
                                                        ></textarea>
                                                        <div className="text-right mt-2">
                                                            <button onClick=${() => setOpenCommentId(null)} className="text-sm bg-gray-200 text-gray-800 font-semibold py-1 px-3 rounded-md hover:bg-gray-300 mr-2">Mégse</button>
                                                            <button onClick=${() => handleSaveComment(reg)} className="text-sm bg-indigo-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-indigo-700">
                                                                Mentés
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </${React.Fragment}>
                        `})}
                    </tbody>
                </table>
            </div>
            ${paginated && totalPages > 1 && html`<div className="p-4 bg-white border-t"><${Pagination} currentPage=${currentPage} totalPages=${totalPages} onPageChange=${setCurrentPage} /></div>`}
        </div>
    </div>
`;
};

// --- Main AdminPanel Component ---

const AdminPanel = ({ user, handleLogout }) => {
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewingStudent, setViewingStudent] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [activeTab, setActiveTab] = useState('applicants');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [selectedIconFilters, setSelectedIconFilters] = useState([]);
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [expiredFilter, setExpiredFilter] = useState('all');
    const [isRunningChecks, setIsRunningChecks] = useState(false);
    const [showIconLegend, setShowIconLegend] = useState(false);
    const [viewTestDataType, setViewTestDataType] = useState(false);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false); // ÚJ: Verziókövetés modal állapota
    const modeMenuRef = useRef(null);

    const showToast = useToast();
    const showConfirmation = useConfirmation();

    useEffect(() => {
        const handleCopy = (event) => {
            if (event.target.closest('.admin-view-wrapper')) {
                const selectedText = window.getSelection().toString();
                const cleanText = selectedText.trim(); 
                event.clipboardData.setData('text/plain', cleanText);
                event.preventDefault();
            }
        };
        document.addEventListener('copy', handleCopy);
        return () => {
            document.removeEventListener('copy', handleCopy);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modeMenuRef.current && !modeMenuRef.current.contains(event.target)) {
                setIsModeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const collectionName = viewTestDataType ? "registrations_test" : "registrations";

        const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const regsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRegistrations(regsData);
            setError(null);
            setIsLoading(false);
        }, (err) => {
            console.error("Hiba az adatok lekérdezésekor: ", err);
            setError("Nem sikerült betölteni a jelentkezéseket.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user, viewTestDataType]);

    const handleUpdateStudent = useCallback(async (id, data, studentName) => {
        const collectionName = viewTestDataType ? "registrations_test" : "registrations";
        const regRef = doc(db, collectionName, id);
        await updateDoc(regRef, data);
        await logAdminAction(user.email, `Tanulói adatlap szerkesztése (${viewTestDataType ? 'TESZT' : 'ÉLES'})`, studentName, id);
    }, [user, viewTestDataType]);
    
    const handleStatusUpdate = useCallback(async (id, field, value, studentName) => {
        const collectionName = viewTestDataType ? "registrations_test" : "registrations";
        const regRef = doc(db, collectionName, id);
        const updateData = { [field]: value };
        if (field === 'status_enrolled' && value === true) {
            updateData.enrolledAt = serverTimestamp();
        }
        try { 
            await updateDoc(regRef, updateData);
            const statusText = {
                status_paid: 'Fizetve',
                status_enrolled: 'Beiratkozva',
                hasMedicalCertificate: 'Orvosi leadva'
            }[field];
            const actionText = `${statusText} státusz ${value ? 'bekapcsolása' : 'kikapcsolása'} (${viewTestDataType ? 'TESZT' : 'ÉLES'})`;
            await logAdminAction(user.email, actionText, studentName, id);
            showToast('Státusz frissítve!', 'success');
        } catch (err) { 
            console.error("Hiba a státusz frissítésekor: ", err);
            showToast('Hiba a státusz frissítésekor!', 'error');
        }
    }, [showToast, user, viewTestDataType]);
    
    const handleIdSave = useCallback(async (id, studentId, studentName, customDateStr) => {
        const collectionName = viewTestDataType ? "registrations_test" : "registrations";
        const regRef = doc(db, collectionName, id);
        try {
            const updatePayload = { studentId: studentId };
            if (studentId && studentId.trim() !== "") {
                const timestamp = utils.dateStringToTimestamp(customDateStr) || serverTimestamp();
                updatePayload.studentIdAssignedAt = timestamp;
            }
            await updateDoc(regRef, updatePayload);
            await logAdminAction(user.email, `Tanulói azonosító mentése (${viewTestDataType ? 'TESZT' : 'ÉLES'}): ${studentId}`, studentName, id);
            showToast('Tanulói azonosító mentve!', 'success');
        } catch (err) { 
            console.error("Hiba a Tanuló azonosító mentésekor:", err);
            showToast('Hiba az azonosító mentésekor!', 'error');
        }
    }, [showToast, user, viewTestDataType]);

    const handleCommentSave = useCallback(async (id, adminComment, studentName) => {
        const collectionName = viewTestDataType ? "registrations_test" : "registrations";
        const regRef = doc(db, collectionName, id);
        try {
            await updateDoc(regRef, { adminComment });
            await logAdminAction(user.email, `Admin megjegyzés mentése/módosítása (${viewTestDataType ? 'TESZT' : 'ÉLES'})`, studentName, id);
            showToast('Admin megjegyzés mentve!', 'success');
        } catch (err) {
            console.error("Hiba az admin megjegyzés mentésekor:", err);
            showToast('Hiba a megjegyzés mentésekor!', 'error');
        }
    }, [showToast, user, viewTestDataType]);

    const handleMarkAsCompleted = useCallback(async (id, studentName, customDateStr) => {
        const collectionName = viewTestDataType ? "registrations_test" : "registrations";
        const regRef = doc(db, collectionName, id);
        try {
            const timestamp = utils.dateStringToTimestamp(customDateStr) || serverTimestamp();
            await updateDoc(regRef, { courseCompletedAt: timestamp });
            await logAdminAction(user.email, `Tanfolyam befejezettnek jelölése (${viewTestDataType ? 'TESZT' : 'ÉLES'})`, studentName, id);
            showToast('Tanuló befejezte a tanfolyamot!', 'success');
        } catch (err) {
            console.error("Hiba a 'befejezte' státusz frissítésekor: ", err);
            showToast("Hiba a 'befejezte' státusz frissítésekor!", 'error');
        }
    }, [showToast, user, viewTestDataType]);

    const handleMarkAsCompletedWithConfirmation = useCallback((reg, customDate, onComplete) => {
        const studentName = utils.formatFullName(reg.current_prefix, reg.current_firstName, reg.current_lastName, reg.current_secondName);
        
        const onConfirmAction = async () => {
            await handleMarkAsCompleted(reg.id, studentName, customDate);
            if (onComplete) onComplete();
        };
    
        const medicalStatusText = reg.hasMedicalCertificate 
            ? '<strong><span style="text-transform: uppercase; color: red;">VAN</span></strong>' 
            : '<strong><span style="text-transform: uppercase; color: red;">NINCS</span></strong>';

        const confirmationMessage = `Biztos szeretnéd befejezett státuszba állítani a tanulót? Ellenőrizd, hogy biztosan ${medicalStatusText} orvosi alkalmassági véleménye.`;
    
        showConfirmation({
            message: confirmationMessage,
            onConfirm: onConfirmAction,
        });
    }, [handleMarkAsCompleted, showConfirmation]);

    const handleStatusChangeRequest = useCallback((id, field, newValue, studentName) => {
        const fieldName = {status_paid: 'Fizetve', status_enrolled: 'Beírva', hasMedicalCertificate: 'Orvosi'}[field];
        const action = newValue ? 'bekapcsolni' : 'kikapcsolni';
        showConfirmation({
            message: `Biztosan szeretnéd ${action} a '${fieldName}' státuszt?`,
            onConfirm: () => { handleStatusUpdate(id, field, newValue, studentName); },
        });
    }, [handleStatusUpdate, showConfirmation]);

    const handleDelete = useCallback(async (id, studentName) => {
        const collectionName = viewTestDataType ? "registrations_test" : "registrations";
        const regRef = doc(db, collectionName, id);
        try { 
            await deleteDoc(regRef); 
            await logAdminAction(user.email, `Jelentkezés törlése (${viewTestDataType ? 'TESZT' : 'ÉLES'})`, studentName, id);
            showToast('Jelentkezés törölve!', 'success');
        } catch (err) { 
            console.error("Hiba a törlés során: ", err);
            showToast('Hiba a törlés során!', 'error');
        }
    }, [showToast, user, viewTestDataType]);
    
    const handleDeleteRequest = useCallback((id, name) => {
        showConfirmation({
            message: `Biztosan törölni szeretnéd ${name} jelentkezését? Ez a művelet nem vonható vissza.`,
            onConfirm: () => { handleDelete(id, name); },
        });
    }, [handleDelete, showConfirmation]);

    const handleRestoreStudent = useCallback(async (id, studentName) => {
        const collectionName = viewTestDataType ? "registrations_test" : "registrations";
        const regRef = doc(db, collectionName, id);
        try {
            await updateDoc(regRef, { status: 'active' });
            await logAdminAction(user.email, `Tanuló státuszának visszaállítása (lejárt -> aktív) [${viewTestDataType ? 'TESZT' : 'ÉLES'}]`, studentName, id);
            showToast('Tanuló sikeresen visszaállítva!', 'success');
        } catch (err) {
            console.error("Hiba a visszaállítás során: ", err);
            showToast('Hiba a visszaállítás során!', 'error');
        }
    }, [user, showToast, viewTestDataType]);

    const handleRestoreRequest = useCallback((reg) => {
        const studentName = utils.formatFullName(reg.current_prefix, reg.current_firstName, reg.current_lastName, reg.current_secondName);
        showConfirmation({
            message: `Biztosan vissza szeretnéd állítani ${studentName} státuszát 'aktív'-ra? A tanuló visszakerül a megfelelő kategóriába.`,
            onConfirm: () => handleRestoreStudent(reg.id, studentName),
        });
    }, [showConfirmation, handleRestoreStudent]);

    const handleRunChecks = useCallback(async () => {
        setIsRunningChecks(true);
        showToast('Az ellenőrzés elindult a háttérben...', 'info');
        try {
            const manualChecks = httpsCallable(functions, 'manualDailyChecks');
            const result = await manualChecks();
            const count = result.data.logCount || 0;
            showToast(`Sikeres futtatás! ${count} automatikus művelet hajtódott végre. Az adatok frissülhetnek.`, 'success');
        } catch (error) {
            console.error("Hiba a manuális ellenőrzés során:", error);
            showToast(`Hiba a futtatás során: ${error.message}`, 'error');
        } finally {
            setIsRunningChecks(false);
        }
    }, [showToast]);

    const handleModeSwitch = () => {
        const targetMode = !viewTestDataType;
        const modeName = targetMode ? 'TESZT' : 'ÉLES';
        const message = targetMode
            ? 'Biztosan át akarsz váltani a TESZT felületre? Itt teszt adatokat kezelhetsz, amelyek nem kerülnek be az éles rendszerbe.'
            : 'Biztosan vissza akarsz térni az ÉLES felületre? Mostantól valódi adatokat kezelsz!';

        setIsModeMenuOpen(false);

        showConfirmation({
            message: message,
            onConfirm: () => {
                setViewTestDataType(targetMode);
                showToast(`Sikeresen átváltottál ${modeName} üzemmódba.`, 'info');
            }
        });
    };

    const filteredRegistrations = useMemo(() => {
        const iconChecks = iconFilterOptions.filter(opt => selectedIconFilters.includes(opt.key));
        return registrations.filter(reg => {
            const term = searchTerm.toLowerCase();
            const fullName = utils.formatFullName(reg.current_prefix, reg.current_firstName, reg.current_lastName, reg.current_secondName).toLowerCase();
            const motherFullName = utils.formatFullName(reg.mother_prefix, reg.mother_firstName, reg.mother_lastName, reg.mother_secondName).toLowerCase();
            const email = reg.email ? reg.email.toLowerCase() : '';
            const matchesSearch = term === '' || fullName.includes(term) || motherFullName.includes(term) || email.includes(term);
            if (!matchesSearch) return false;

            const regDate = reg.createdAt?.seconds ? new Date(reg.createdAt.seconds * 1000) : null;
            if ((startDate && (!regDate || regDate < new Date(startDate)))) return false;
            if ((endDate && (!regDate || regDate > new Date(endDate)))) return false;

            return iconChecks.every(check => check.check(reg));
        });
    }, [registrations, searchTerm, startDate, endDate, selectedIconFilters]);

    const { 
        enrolledRegistrations, 
        paidRegistrations, 
        pendingRegistrations, 
        completedRegistrations,
        allExpiredRegistrations
    } = useMemo(() => {
        const source = filteredRegistrations;
        
        const expiredStudents = source.filter(reg => reg.status && reg.status.startsWith('expired'));
        const expiredIds = new Set(expiredStudents.map(s => s.id));
        const activeStudents = source.filter(reg => !expiredIds.has(reg.id));

        const completed = activeStudents.filter(reg => reg.courseCompletedAt);
        const enrolled = activeStudents.filter(reg => reg.status_enrolled && !reg.courseCompletedAt);
        const paid = activeStudents.filter(reg => reg.status_paid && !reg.status_enrolled && !reg.courseCompletedAt);
        const pending = activeStudents.filter(reg => !reg.status_paid && !reg.status_enrolled && !reg.courseCompletedAt);

        return { 
            enrolledRegistrations: enrolled, 
            paidRegistrations: paid, 
            pendingRegistrations: pending, 
            completedRegistrations: completed,
            allExpiredRegistrations: expiredStudents
        };
    }, [filteredRegistrations]);

    const filteredExpiredStudents = useMemo(() => {
        if (expiredFilter === 'all') {
            return allExpiredRegistrations;
        }
        if (expiredFilter === 'thirty_day') {
            return allExpiredRegistrations.filter(reg => reg.status === 'expired_unpaid');
        }
        if (expiredFilter === 'ninety_day') {
            return allExpiredRegistrations.filter(reg => reg.status === 'expired_not_started');
        }
        if (expiredFilter === 'elearning') {
            return allExpiredRegistrations.filter(reg => reg.status === 'expired_elearning_incomplete');
        }
        return [];
    }, [allExpiredRegistrations, expiredFilter]);

    if (isLoading) return html`<${LoadingOverlay} text="Admin felület betöltése..." />`;
    if (error) return html`<div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">${error}</div>`;

    const TabButton = ({ tabName, label }) => {
        const isActive = activeTab === tabName;
        const activeClasses = 'border-indigo-500 text-indigo-600';
        const inactiveClasses = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
        return html`
            <button onClick=${() => setActiveTab(tabName)} className="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${isActive ? activeClasses : inactiveClasses}">
                ${label}
            </button>
        `;
    };

    const containerBgClass = viewTestDataType ? 'bg-red-50' : 'bg-gray-50';

    return html`
        <div className=${`container mx-auto px-4 sm:px-6 lg:px-8 py-8 ${containerBgClass}`}>
            <div className=${`p-4 sm:p-6 lg:p-8 rounded-xl ${viewTestDataType ? 'bg-red-100/50' : 'bg-gray-50'}`}>
                <header className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                        Admin Felület
                        ${viewTestDataType && html`<span className="text-red-600 ml-3 text-2xl">(TESZT MÓD)</span>`}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Bejelentkezve: <strong className="font-medium">${user.email}</strong></span>
                        <button onClick=${handleLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 flex items-center gap-2">
                            <${Icons.LogoutIcon} size=${16} />
                            Kijelentkezés
                        </button>
                        <button onClick=${handleRunChecks} disabled=${isRunningChecks} className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-wait">
                            ${isRunningChecks ? 'Futtatás...' : 'Ellenőrzés'}
                        </button>

                        <div className="flex items-center gap-2">
                            <button onClick=${() => setIsAddingStudent(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700">Új tanuló rögzítése</button>

                            <div className="relative" ref=${modeMenuRef}>
                                <button
                                    onClick=${() => setIsModeMenuOpen(!isModeMenuOpen)}
                                    className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                                    title="Beállítások"
                                >
                                    <${Icons.SettingsIcon} size=${24} />
                                </button>

                                ${isModeMenuOpen && html`
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200 overflow-hidden">
                                        <div className="py-1">
                                            <button
                                                onClick=${handleModeSwitch}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                ${viewTestDataType
                                                    ? html`<span className="w-3 h-3 rounded-full bg-green-500"></span> Váltás ÉLES módra`
                                                    : html`<span className="w-3 h-3 rounded-full bg-red-500"></span> Váltás TESZT módra`
                                                }
                                            </button>
                                            <button
                                                onClick=${() => { setShowVersionHistory(true); setIsModeMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                                Verziókövetés
                                            </button>
                                        </div>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="bg-white rounded-lg border shadow-sm mb-8 overflow-hidden">
                    <button onClick=${() => setIsFilterVisible(!isFilterVisible)} className="w-full p-4 text-left font-semibold text-gray-700 flex justify-between items-center hover:bg-gray-50 focus:outline-none">
                        <span>Szűrés és Keresés</span>
                        <${Icons.ChevronDownIcon} className=${`w-5 h-5 transform transition-transform ${isFilterVisible ? 'rotate-180' : ''}`} />
                    </button>
                    <div className=${`transition-all duration-500 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="p-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                            <div className="md:col-span-1">
                                <label htmlFor="search" className="block text-sm font-medium text-gray-700">Keresés (Név, Email, Anyja neve)</label>
                                <input type="text" id="search" value=${searchTerm} onChange=${e => setSearchTerm(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Keresési kifejezés..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Jelentkezés -tól</label><input type="date" id="startDate" value=${startDate} onChange=${e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" /></div>
                                <div><label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Jelentkezés -ig</label><input type="date" id="endDate" value=${endDate} onChange=${e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" /></div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">Státusz ikonok</label>
                                    <button onClick=${() => setShowIconLegend(true)} className="text-sm text-indigo-600 hover:underline focus:outline-none">Mi mit jelent?</button>
                                </div>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    ${iconFilterOptions.map(({ key, Icon, title, color }) => {
                                        const isSelected = selectedIconFilters.includes(key);
                                        return html`
                                        <button 
                                            key=${key} 
                                            onClick=${() => setSelectedIconFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
                                            title=${title}
                                            className=${`p-2 rounded-full border-2 transition-colors ${isSelected ? `${color} border-transparent` : 'border-gray-300 bg-white'}`}
                                        >
                                            <${Icon} size=${18} className=${isSelected ? 'text-white' : 'text-gray-600'} />
                                        </button>
                                    `})}
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>

                <${React.Fragment}>
                    <div className="border-b border-gray-200 mb-8">
                        <nav className="-mb-px flex justify-between items-center" aria-label="Tabs">
                            <div className="flex space-x-8">
                                <${TabButton} tabName="applicants" label="Jelentkező tanulók" />
                                <${TabButton} tabName="enrolled" label="Beiratkozott tanulók" />
                                <${TabButton} tabName="completed" label="E-learninget befejezte" />
                                <${TabButton} tabName="expired" label="Lejárt tanulók" />
                            </div>
                            <div className="flex space-x-8">
                                <${TabButton} tabName="automation_logs" label="Automatizálási Napló" />
                                <${TabButton} tabName="admin_logs" label="Admin Napló" />
                            </div>
                        </nav>
                    </div>
                    ${activeTab === 'applicants' && html`<div key="applicants-tab"><${StudentTable} adminUser=${user} key="paid_students" title="Fizetett (beiratkozásra váró) tanulók" students=${paidRegistrations} onStatusChange=${handleStatusChangeRequest} onShowDetails=${setViewingStudent} onEditDetails=${setEditingStudent} onDelete=${handleDeleteRequest} onCommentSave=${handleCommentSave} showDayCounter=${true} /><${StudentTable} adminUser=${user} key="pending_students" title="Új és folyamatban lévő jelentkezők" students=${pendingRegistrations} onStatusChange=${handleStatusChangeRequest} onShowDetails=${setViewingStudent} onEditDetails=${setEditingStudent} onDelete=${handleDeleteRequest} onCommentSave=${handleCommentSave} paginated=${true} showDayCounter=${true} /></div>`}
                    ${activeTab === 'enrolled' && html`<div key="enrolled-tab"><${StudentTable} adminUser=${user} key="enrolled_students" title="Beiratkozott tanulók" students=${enrolledRegistrations} onStatusChange=${handleStatusChangeRequest} onShowDetails=${setViewingStudent} onEditDetails=${setEditingStudent} onIdSave=${handleIdSave} onMarkAsCompleted=${handleMarkAsCompletedWithConfirmation} onCommentSave=${handleCommentSave} allowIdEditing=${true} paginated=${true} showDayCounter=${true} /></div>`}
                    ${activeTab === 'completed' && html`<div key="completed-tab"><${StudentTable} adminUser=${user} key="completed_students" title="E-learninget befejezte" students=${completedRegistrations} onStatusChange=${handleStatusChangeRequest} onShowDetails=${setViewingStudent} onEditDetails=${setEditingStudent} onIdSave=${handleIdSave} onMarkAsCompleted=${handleMarkAsCompletedWithConfirmation} onCommentSave=${handleCommentSave} allowIdEditing=${true} paginated=${true} showDayCounter=${false} /></div>`}
                    
                    ${activeTab === 'expired' && html`
                        <div key="expired-tab">
                            <div className="mb-6 p-4 bg-white rounded-lg border shadow-sm flex justify-between items-center">
                                <div className="flex items-center gap-6">
                                    <span className="font-medium text-sm text-gray-700">Szűrés lejárat oka szerint:</span>
                                    <div className="flex items-center gap-5">
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="expiredFilter" value="all" checked=${expiredFilter === 'all'} onChange=${(e) => setExpiredFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">Összes</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="expiredFilter" value="thirty_day" checked=${expiredFilter === 'thirty_day'} onChange=${(e) => setExpiredFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">30 napos (nem fizetett)</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="expiredFilter" value="ninety_day" checked=${expiredFilter === 'ninety_day'} onChange=${(e) => setExpiredFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">90 napos (nem kezdte el)</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="expiredFilter" value="elearning" checked=${expiredFilter === 'elearning'} onChange=${(e) => setExpiredFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">9 hónapos (e-learning)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <${StudentTable} 
                                adminUser=${user}
                                key="expired_students" 
                                title="Lejárt tanulók" 
                                students=${filteredExpiredStudents} 
                                onStatusChange=${handleStatusChangeRequest} 
                                onShowDetails=${setViewingStudent} 
                                onEditDetails=${setEditingStudent} 
                                onDelete=${handleDeleteRequest} 
                                onRestore=${handleRestoreRequest}
                                onCommentSave=${handleCommentSave}
                                allowRestore=${true}
                                allowIdEditing=${false} 
                                paginated=${true}
                                showDayCounter=${false}
                            />
                        </div>
                    `}
                    ${activeTab === 'automation_logs' && html`
                        <div key="automation-logs-tab">
                            <${AutomationLog} />
                        </div>
                    `}
                     ${activeTab === 'admin_logs' && html`
                        <div key="admin-logs-tab">
                            <${AdminLog} />
                        </div>
                    `}
                </${React.Fragment}>
                
                ${viewingStudent && html`<${ViewDetailsModal} student=${viewingStudent} onClose=${() => setViewingStudent(null)} />`}
                ${editingStudent && html`<${EditDetailsModal} student=${editingStudent} onClose=${() => setEditingStudent(null)} onUpdate=${handleUpdateStudent} adminUser=${user} />`}
                ${isAddingStudent && html`<${AdminAddStudentModal} onClose=${() => setIsAddingStudent(false)} adminUser=${user} isTestView=${viewTestDataType} />`}
                ${showIconLegend && html`<${IconLegendModal} onClose=${() => setShowIconLegend(false)} />`}
                ${showVersionHistory && html`<${VersionHistory} onClose=${() => setShowVersionHistory(false)} adminUser=${user} />`}
            </div>
        </div>
    `;
};

export default AdminPanel;