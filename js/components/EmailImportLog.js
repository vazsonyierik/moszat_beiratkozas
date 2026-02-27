import { html } from '../UI.js';
import { db, collection, query, where, orderBy, onSnapshot } from '../firebase.js';
import * as Icons from '../Icons.js';

const { useState, useEffect, Fragment } = window.React;

const EmailImportLog = () => {
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
        }, (err) => {
            console.error("Error fetching email logs:", err);
            setError("Nem sikerült betölteni az email naplót.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleExpand = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    if (loading) return html`<div className="p-4 text-center text-gray-500">Betöltés...</div>`;
    if (error) return html`<div className="p-4 text-center text-red-500">${error}</div>`;
    if (logs.length === 0) return html`<div className="p-4 text-center text-gray-500">Nincs megjeleníthető napló az elmúlt 30 napból.</div>`;

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
                                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600 font-medium">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Tanuló Neve</th>
                                                <th className="px-4 py-2 text-left">Azonosító</th>
                                                <th className="px-4 py-2 text-left">Forrás Fájl</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            ${log.students && log.students.map((student, idx) => html`
                                                <tr key=${idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium text-gray-800">${student.name}</td>
                                                    <td className="px-4 py-2 font-mono text-gray-600">${student.studentId}</td>
                                                    <td className="px-4 py-2 text-gray-500 italic truncate max-w-xs" title=${student.file}>${student.file}</td>
                                                </tr>
                                            `)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `}
                    </div>
                `;
            })}
        </div>
    `;
};

export default EmailImportLog;
