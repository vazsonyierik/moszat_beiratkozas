import { html } from '../UI.js';
import { db, collection, query, where, orderBy, onSnapshot } from '../firebase.js';
import * as Icons from '../Icons.js';

const { useState, useEffect, Fragment } = window.React;

const EmailImportLog = ({ onStudentClick }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        // Calculate date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const q = query(
            collection(db, 'email_import_logs'),
            where('createdAt', '>=', thirtyDaysAgo),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(logsData);
            setLoading(false);

            // Reset to page 1 if the very first item changes (new log arrived)
            if (logsData.length > 0 && logs.length > 0 && logsData[0].id !== logs[0].id) {
                setCurrentPage(1);
            }
        }, (err) => {
            console.error("Error fetching email logs:", err);
            setError("Nem sikerült betölteni az email naplót.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [logs]);

    const toggleExpand = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    if (loading) return html`<div className="p-4 text-center text-gray-500">Betöltés...</div>`;
    if (error) return html`<div className="p-4 text-center text-red-500">${error}</div>`;
    if (logs.length === 0) return html`<div className="p-4 text-center text-gray-500">Nincs megjeleníthető napló az elmúlt 30 napból.</div>`;

    // Ensure Icons are defined before rendering
    if (!Icons || !Icons.MailIcon || !Icons.ChevronUpIcon || !Icons.ChevronDownIcon) {
        return html`<div className="p-4 text-red-500">Hiba: Ikonok nem tölthetők be.</div>`;
    }

    return html`
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Email Feldolgozási Napló (Utolsó 30 nap)</h3>
            ${logs.map(log => {
                const dateStr = log.createdAt ? log.createdAt.toDate().toLocaleString('hu-HU') : 'Ismeretlen dátum';
                const isExpanded = expandedLogId === log.id;

                return html`
                    <div key=${log.id} className="bg-white border rounded-lg shadow-sm overflow-hidden transition-all duration-200">
                        <div
                            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                            onClick=${() => toggleExpand(log.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                                    <${Icons.MailIcon} size=${20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-800">${dateStr}</div>
                                    <div className="text-sm text-gray-500">Feldolgozva: <strong>${log.processedCount}</strong> tanuló</div>
                                </div>
                            </div>
                            <div className="text-gray-400">
                                ${isExpanded
                                    ? html`<${Icons.ChevronUpIcon} size=${20} />`
                                    : html`<${Icons.ChevronDownIcon} size=${20} />`
                                }
                            </div>
                        </div>

                        ${isExpanded && html`
                            <div className="bg-gray-50 p-4 border-t border-gray-100">
                                <div className="bg-white rounded border border-gray-200 overflow-hidden mb-4">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600 font-medium">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Frissített Tanuló Neve</th>
                                                <th className="px-4 py-2 text-left">Azonosító</th>
                                                <th className="px-4 py-2 text-left">Forrás Fájl</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            ${log.students && log.students.length > 0 ? log.students.map((student, idx) => html`
                                                <tr key=${idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium">
                                                        <span 
                                                            className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                            onClick=${() => onStudentClick && onStudentClick(student.studentId)}
                                                        >
                                                            ${student.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-gray-600">${student.studentId}</td>
                                                    <td className="px-4 py-2 text-gray-500 italic truncate max-w-xs" title=${student.file}>${student.file}</td>
                                                </tr>
                                            `) : html`<tr><td colSpan="3" className="px-4 py-4 text-center text-gray-500 italic">Nem történt sikeres frissítés ebben a futásban.</td></tr>`}
                                        </tbody>
                                    </table>
                                </div>
                                
                                ${log.skipped && html`
                                    <div className="space-y-4">
                                        ${log.skipped.alreadyProcessed && log.skipped.alreadyProcessed.length > 0 && html`
                                            <details className="mb-2 group">
                                                <summary className="cursor-pointer font-semibold text-sm text-gray-600 hover:text-gray-800 focus:outline-none list-none flex items-center">
                                                    <span className="mr-2 transform transition-transform group-open:rotate-90">▶</span>
                                                    Már feldolgozva (Nem történt változás): ${log.skipped.alreadyProcessed.length} tanuló
                                                </summary>
                                                <div className="max-h-48 overflow-y-auto pr-2 mt-2 bg-white rounded border p-2">
                                                    <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
                                                        ${log.skipped.alreadyProcessed.map((s, idx) => html`
                                                            <li key=${idx}>
                                                                <span 
                                                                    className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                                    onClick=${() => onStudentClick && onStudentClick(s.id)}
                                                                >
                                                                    ${s.name}
                                                                </span>
                                                                <span className="ml-1">(${s.id})</span>
                                                            </li>
                                                        `)}
                                                    </ul>
                                                </div>
                                            </details>
                                        `}
                                        
                                        ${log.skipped.notFound && log.skipped.notFound.length > 0 && html`
                                            <details className="mb-2 group">
                                                <summary className="cursor-pointer font-semibold text-sm text-orange-600 hover:text-orange-800 focus:outline-none list-none flex items-center">
                                                    <span className="mr-2 transform transition-transform group-open:rotate-90">▶</span>
                                                    Nem található a rendszerben: ${log.skipped.notFound.length} tanuló
                                                </summary>
                                                <div className="max-h-48 overflow-y-auto pr-2 mt-2 bg-white rounded border border-orange-100 p-2">
                                                    <ul className="list-disc pl-5 text-sm text-orange-500 space-y-1">
                                                        ${log.skipped.notFound.map((s, idx) => html`
                                                            <li key=${idx}>${s.name} - Azonosító: ${s.id} <span className="text-orange-300 ml-1">(Fájl: ${s.file})</span></li>
                                                        `)}
                                                    </ul>
                                                </div>
                                            </details>
                                        `}
                                        
                                        ${log.skipped.mismatch && log.skipped.mismatch.length > 0 && html`
                                            <details className="mb-2 group">
                                                <summary className="cursor-pointer font-semibold text-sm text-red-600 hover:text-red-800 focus:outline-none list-none flex items-center">
                                                    <span className="mr-2 transform transition-transform group-open:rotate-90">▶</span>
                                                    Adateltérés (Kihagyva): ${log.skipped.mismatch.length} tanuló
                                                </summary>
                                                <div className="max-h-48 overflow-y-auto pr-2 mt-2 bg-white rounded border border-red-100 p-2">
                                                    <ul className="list-disc pl-5 text-sm text-red-500 space-y-1">
                                                        ${log.skipped.mismatch.map((s, idx) => html`
                                                            <li key=${idx}>
                                                                <span 
                                                                    className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                                    onClick=${() => onStudentClick && onStudentClick(s.id)}
                                                                >
                                                                    ${s.name}
                                                                </span>
                                                                <span className="ml-1">(${s.id}) - Születési dátum eltérés</span>
                                                            </li>
                                                        `)}
                                                    </ul>
                                                </div>
                                            </details>
                                        `}
                                    </div>
                                `}
                            </div>
                        `}
                    </div>
                `;
            })}
        </div>
    `;
};

export default EmailImportLog;
