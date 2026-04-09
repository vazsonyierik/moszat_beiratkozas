import { html } from '../UI.js';
import Icons from '../Icons.js';
import * as utils from '../utils.js';
import StudentIdInput from './StudentIdInput.js';

const React = window.React;
const { useState, useMemo, Fragment } = React;

const StatusIcon = ({ Icon, color, title }) => html`
    <div title=${title} className="w-6 h-6 rounded-full flex items-center justify-center ${color} text-white shadow-sm ring-1 ring-white">
        <${Icon} size=${14} />
    </div>
`;

// Pagináció pontosan ugyanúgy, csak kicsit frissített színekkel
const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) range.push(i);
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
        <nav className="flex items-center justify-between mt-4">
            <div className="flex-1 flex justify-between sm:justify-end gap-2">
                <button onClick=${() => onPageChange(currentPage - 1)} disabled=${currentPage === 1} className="relative inline-flex items-center px-3 py-1.5 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">Előző</button>
                <div className="hidden sm:flex sm:items-center gap-1">
                    ${pageNumbers.map((number, index) => {
                        if (number === '...') return html`<span key="ellipsis-${index}" className="relative inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-500">...</span>`;
                        return html`<button key="${number}" onClick=${() => onPageChange(number)} className=${`relative inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium transition-colors shadow-sm ${currentPage === number ? 'z-10 bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>${number}</button>`;
                    })}
                </div>
                <button onClick=${() => onPageChange(currentPage + 1)} disabled=${currentPage === totalPages} className="relative inline-flex items-center px-3 py-1.5 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">Következő</button>
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
    const [activeDropdownMenu, setActiveDropdownMenu] = useState(null);

    const { useConfirmation } = require('../context/AppContext.js');
    const showConfirmation = useConfirmation ? useConfirmation() : (opts) => { if(window.confirm(opts.message)) opts.onConfirm(); };

    React.useEffect(() => {
        const closeDropdown = (e) => {
            if (!e.target.closest('.action-menu-container')) {
                setActiveDropdownMenu(null);
            }
        };
        document.addEventListener('click', closeDropdown);
        return () => document.removeEventListener('click', closeDropdown);
    }, []);

    React.useEffect(() => { setCurrentPage(1); }, [students, itemsPerPage]);

    const currentStudents = useMemo(() => {
        if (!paginated) return students;
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return students.slice(indexOfFirstItem, indexOfLastItem);
    }, [students, currentPage, itemsPerPage, paginated]);

    const totalPages = paginated ? Math.ceil(students.length / itemsPerPage) : 1;

    const studentFullName = (reg) => utils.formatFullName(reg.current_prefix, reg.current_firstName, reg.current_lastName, reg.current_secondName);

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

    const handleIdSaveConfirm = (reg) => {
        showConfirmation({
            message: \`Biztosan menti a(z) '\${inlineIdValue}' azonosítót \${studentFullName(reg)} számára?\`,
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
        if (openCommentId === reg.id) {
            setOpenCommentId(null);
        } else {
            setOpenCommentId(reg.id);
            setCommentText(reg.adminComment || '');
        }
    };

    const handleSaveComment = (reg) => {
        onCommentSave(reg.id, commentText, studentFullName(reg));
        setOpenCommentId(null);
    };

    const toggleDropdown = (e, id) => {
        e.stopPropagation();
        setActiveDropdownMenu(activeDropdownMenu === id ? null : id);
    };

    // Stílusok a modernizált sorokhoz
    const getRowBgClass = (reg) => {
        if (reg.status === 'archived') return 'bg-slate-50 text-slate-500';
        if (reg.status && reg.status.startsWith('expired')) return 'bg-rose-50 border-l-4 border-rose-500';
        if (reg.courseCompletedAt) return 'bg-cyan-50 border-l-4 border-cyan-400';
        if (reg.status_enrolled) return 'bg-emerald-50 border-l-4 border-emerald-400';
        if (reg.status_paid) return 'bg-amber-50 border-l-4 border-amber-400';
        return 'bg-white border-l-4 border-transparent hover:bg-slate-50';
    };

    const CustomToggle = ({ checked, onChange, disabled, label, colorClass }) => html\`
        <label className="\${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} inline-flex items-center gap-2">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked=\${checked} onChange=\${onChange} disabled=\${disabled} />
                <div className="\${checked ? colorClass : 'bg-slate-200'} w-9 h-5 rounded-full transition-colors shadow-inner"></div>
                <div className="\${checked ? 'translate-x-4' : 'translate-x-0'} absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm"></div>
            </div>
            <span className="text-xs font-medium text-slate-700">\${label}</span>
        </label>
    \`;

    return html\`
        <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    \${title}
                    <span className="bg-slate-200 text-slate-700 py-0.5 px-2.5 rounded-full text-sm font-semibold">\${students.length}</span>
                </h2>
                \${paginated && html\`
                    <div className="flex items-center space-x-2 text-sm bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <label htmlFor="itemsPerPage-\${title}" className="text-slate-500 pl-2">Sorok:</label>
                        <select id="itemsPerPage-\${title}" value=\${itemsPerPage} onChange=\${e => setItemsPerPage(Number(e.target.value))} className="bg-transparent border-none text-slate-700 focus:ring-0 cursor-pointer font-medium">
                            <option value="10">10</option><option value="25">25</option><option value="50">50</option>
                        </select>
                    </div>
                \`}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Idő / Napok</th>
                                <th className="px-4 py-3 font-semibold">Tanuló adatai</th>
                                <th className="px-4 py-3 font-semibold">Címkék</th>
                                <th className="px-4 py-3 font-semibold">Státusz</th>
                                <th className="px-4 py-3 font-semibold text-right">Műveletek</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            \${currentStudents.length === 0 ? html\`
                                <tr>
                                    <td colSpan="5" className="px-4 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <\${Icons.InboxIcon} size=\${48} className="text-slate-200 mb-3" />
                                            <p className="text-base">Nincs megjeleníthető találat</p>
                                        </div>
                                    </td>
                                </tr>
                            \` : currentStudents.map((reg) => {
                                const formattedTime = utils.formatTimestampForTable(reg.createdAt);
                                const birthPlace = \`\${reg.birth_city}\${reg.birth_district ? \`, \${reg.birth_district}\` : ''}\`;
                                const fullName = studentFullName(reg);
                                const motherFullName = utils.formatFullName(reg.mother_prefix, reg.mother_firstName, reg.mother_lastName, reg.mother_secondName);

                                const allIcons = [
                                    reg.registeredBy === 'admin' && { Icon: Icons.AdminUserIcon, color: "bg-slate-600", title: "Admin rögzítette", key: 'adminReg' },
                                    utils.hasMedicalCertificate(reg) && { Icon: Icons.MedicalIcon, color: "bg-pink-500", title: "Orvosi", key: 'med' },
                                    utils.hasCompletedCourse(reg) && { Icon: Icons.GraduationCapIcon, color: "bg-cyan-500", title: "Befejezte", key: 'grad' },
                                    utils.hasStudentId(reg) && { Icon: Icons.IdCardIcon, color: "bg-purple-500", title: "Azonosító", key: 'id' },
                                    reg.isCaseFiled && { Icon: Icons.FolderIcon, color: "bg-teal-500", title: "Ügy iktatva", key: 'case' },
                                    utils.hasPreviousLicense(reg.has_previous_license) && { Icon: Icons.CarIcon, color: "bg-emerald-500", title: "Van jogsi", key: 'lic' },
                                    utils.isStudentUnder18(reg.birthDate) && { Icon: Icons.AlertIcon, color: "bg-rose-500", title: "18-", key: 'age' },
                                    utils.hasStudentStudiedBefore(reg.studied_elsewhere_radio) && { Icon: Icons.HelpIcon, color: "bg-amber-500", title: "Tanult már", key: 'study' },
                                    utils.hasComment(reg.megjegyzes) && { Icon: Icons.InfoIcon, color: "bg-blue-500", title: "Megjegyzés", key: 'comment' }
                                ].filter(Boolean);

                                const isEditingThisRow = editingRowId === reg.id;
                                const allowDelete = (!reg.status_enrolled && !reg.courseCompletedAt) || isTransferTab;

                                let daysTag = null;
                                if (showDayCounter) {
                                    let days = null;
                                    let daysLabel = '';
                                    let bgColor = '';
                                    if (reg.studentIdAssignedAt) { days = utils.calculateDaysSince(reg.studentIdAssignedAt); daysLabel = 'ID kapott'; bgColor = 'bg-blue-100 text-blue-700'; }
                                    else if (reg.status_enrolled && reg.enrolledAt) { days = utils.calculateDaysSince(reg.enrolledAt); daysLabel = 'beírva'; bgColor = 'bg-emerald-100 text-emerald-700'; }
                                    else if (!reg.status_enrolled && reg.createdAt) { days = utils.calculateDaysSince(reg.createdAt); daysLabel = 'jelentkezett'; bgColor = 'bg-slate-200 text-slate-700'; }

                                    if (days !== null && days >= 0) {
                                        daysTag = html\`<span className="\${'inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold mt-1 w-max ' + bgColor}">\${days} napja \${daysLabel}</span>\`;
                                    }
                                }

                                return html\`
                                    <\${Fragment} key="\${reg.id}">
                                        <tr className="\${getRowBgClass(reg)} transition-colors duration-200 group">

                                            {/* Idő és Napok */}
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-slate-700">\${formattedTime.date}</span>
                                                    <span className="text-xs text-slate-400">\${formattedTime.time}</span>
                                                    \${daysTag}
                                                </div>
                                            </td>

                                            {/* Tanuló adatai össszevonva */}
                                            <td className="px-4 py-3 align-top whitespace-normal min-w-[200px]">
                                                <div className="flex flex-col gap-1">
                                                    <div className="font-bold text-slate-900">\${fullName}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1"><\${Icons.MailIcon} size=\${12}/> \${reg.email}</div>
                                                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                                        <span><strong>Szül:</strong> \${reg.birthDate} (\${birthPlace})</span>
                                                        <span><strong>AN:</strong> \${motherFullName}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Ikonok */}
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-wrap gap-1 max-w-[120px]">
                                                    \${allIcons.map(icon => html\`<\${StatusIcon} key="\${icon.key}" ...\${icon} />\`)}
                                                </div>
                                            </td>

                                            {/* Státusz kapcsolók */}
                                            <td className="px-4 py-3 align-top">
                                                \${!isTransferTab && html\`
                                                    <div className="flex flex-col gap-2">
                                                        \${!reg.status_enrolled && html\`
                                                            <\${CustomToggle}
                                                                checked=\${!!reg.status_paid}
                                                                onChange=\${() => onStatusChange(reg.id, 'status_paid', !reg.status_paid, fullName)}
                                                                label="Fizetve"
                                                                colorClass="bg-amber-400"
                                                            />
                                                        \`}
                                                        \${reg.status_enrolled && html\`
                                                            <\${CustomToggle}
                                                                checked=\${!!reg.hasMedicalCertificate}
                                                                onChange=\${() => onStatusChange(reg.id, 'hasMedicalCertificate', !reg.hasMedicalCertificate, fullName)}
                                                                label="Orvosi"
                                                                colorClass="bg-pink-400"
                                                            />
                                                        \`}
                                                        <\${CustomToggle}
                                                            checked=\${!!reg.status_enrolled}
                                                            onChange=\${() => onStatusChange(reg.id, 'status_enrolled', !reg.status_enrolled, fullName)}
                                                            disabled=\${!reg.status_paid}
                                                            label="Beírva"
                                                            colorClass="bg-emerald-500"
                                                        />
                                                    </div>
                                                \`}
                                            </td>

                                            {/* Műveletek */}
                                            <td className="px-4 py-3 align-top text-right relative">
                                                \${isEditingThisRow ? html\`
                                                    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 z-10 absolute right-4 top-2 flex flex-col gap-3 min-w-[280px]">
                                                        <div className="flex items-center justify-between border-b pb-2">
                                                            <span className="font-bold text-slate-700">Gyors szerkesztés</span>
                                                            <button onClick=\${handleCancelQuickEdit} className="text-slate-400 hover:text-rose-500 transition-colors"><\${Icons.XIcon} size=\${18} /></button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-semibold text-slate-500">Tanulói azonosító</label>
                                                            <div className="flex items-center gap-2">
                                                                <\${StudentIdInput} name="studentId" value=\${inlineIdValue} onChange=\${(e) => setInlineIdValue(e.target.value)} className="flex-1 p-1.5 border border-slate-300 rounded text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                                                <input type="date" value=\${idDate} onChange=\${e => setIdDate(e.target.value)} className="w-32 p-1.5 border border-slate-300 rounded text-sm" />
                                                                <button onClick=\${() => handleIdSaveConfirm(reg)} className="p-1.5 bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white rounded transition-colors" title="Mentés"><\${Icons.CheckIcon} size=\${16} /></button>
                                                            </div>
                                                        </div>

                                                        \${!isTransferTab && html\`
                                                            <div className="space-y-2 mt-2 pt-2 border-t">
                                                                <label className="text-xs font-semibold text-slate-500">Tanfolyam befejezése</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input type="date" value=\${completeDate} onChange=\${e => setCompleteDate(e.target.value)} className="flex-1 p-1.5 border border-slate-300 rounded text-sm" />
                                                                    <button onClick=\${() => handleMarkAsCompletedConfirm(reg)} className="p-1.5 bg-cyan-100 text-cyan-600 hover:bg-cyan-500 hover:text-white rounded transition-colors" title="Kész"><\${Icons.CheckIcon} size=\${16} /></button>
                                                                </div>
                                                            </div>
                                                        \`}
                                                    </div>
                                                \` : html\`
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick=\${() => onShowDetails(reg)} className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Adatlap"><\${Icons.EyeIcon} size=\${18} /></button>
                                                        <button onClick=\${() => onEditDetails(reg)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Szerkesztés"><\${Icons.EditIcon} size=\${18} /></button>

                                                        {/* More Menu */}
                                                        <div className="relative action-menu-container">
                                                            <button onClick=\${(e) => toggleDropdown(e, reg.id)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                                                                <\${Icons.MoreVerticalIcon} size=\${18} />
                                                            </button>

                                                            \${activeDropdownMenu === reg.id && html\`
                                                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 overflow-hidden">
                                                                    \${allowIdEditing && !reg.courseCompletedAt && html\`
                                                                        <button onClick=\${() => { handleQuickEditClick(reg); setActiveDropdownMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                                            <\${Icons.ZapIcon} size=\${16} className="text-orange-500"/> Gyors szerkesztés
                                                                        </button>
                                                                    \`}
                                                                    <button onClick=\${() => { handleToggleComment(reg); setActiveDropdownMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                                        <\${Icons.MessageSquareIcon} size=\${16} className="\${reg.adminComment ? 'text-blue-500' : 'text-slate-400'}"/> Admin megjegyzés
                                                                    </button>
                                                                    \${allowArchive && html\`
                                                                        <button onClick=\${() => { onArchive(reg); setActiveDropdownMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100">
                                                                            <\${Icons.ArchiveIcon} size=\${16} className="text-amber-500"/> Archiválás
                                                                        </button>
                                                                    \`}
                                                                    \${allowRestore && html\`
                                                                        <button onClick=\${() => { onRestore(reg); setActiveDropdownMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100">
                                                                            <\${Icons.RestoreIcon} size=\${16} className="text-emerald-500"/> Visszaállítás
                                                                        </button>
                                                                    \`}
                                                                    \${allowDelete && html\`
                                                                        <button onClick=\${() => { onDelete(reg.id, fullName); setActiveDropdownMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 font-medium">
                                                                            <\${Icons.TrashIcon} size=\${16} /> Törlés
                                                                        </button>
                                                                    \`}
                                                                </div>
                                                            \`}
                                                        </div>
                                                    </div>
                                                \`}
                                            </td>
                                        </tr>

                                        {/* Megjegyzés lenyíló */}
                                        <tr className="bg-slate-50">
                                            <td colSpan="5" className="p-0 border-none">
                                                <div className=\`transition-all duration-300 ease-in-out grid \${openCommentId === reg.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}\`>
                                                    <div className="overflow-hidden">
                                                        <div className="px-4 py-3 border-l-4 border-blue-400 ml-4 mb-2 mr-4 bg-white shadow-sm rounded-r-lg">
                                                            <label className="block text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                                                                <\${Icons.InfoIcon} size=\${14} /> Belső admin megjegyzés
                                                            </label>
                                                            <textarea
                                                                value=\${commentText}
                                                                onChange=\${e => setCommentText(e.target.value)}
                                                                className="w-full p-2.5 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                                                                rows="2"
                                                                placeholder="Ide írhatsz rejtett megjegyzést a tanulóval kapcsolatban..."
                                                            ></textarea>
                                                            <div className="flex justify-end mt-2 gap-2">
                                                                <button onClick=\${() => setOpenCommentId(null)} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">Mégse</button>
                                                                <button onClick=\${() => handleSaveComment(reg)} className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors shadow-sm">Mentés</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </\${Fragment}>
                                \`;
                            })}
                        </tbody>
                    </table>
                </div>
                \${paginated && totalPages > 1 && html\`<div className="p-4 bg-slate-50 border-t border-slate-200"><\${Pagination} currentPage=\${currentPage} totalPages=\${totalPages} onPageChange=\${setCurrentPage} /></div>\`}
            </div>
        </div>
    \`;
};

export default TestStudentTable;