/**
 * js/components/AdminLog.js
 * New component to display manual admin actions from Firestore.
 * JAVÍTÁS: Lapozás hozzáadva a hosszú listák kezeléséhez.
 * MÓDOSÍTÁS: A lapozó javítása, hogy sok oldal esetén se csússzon szét a felület.
 */
import { html, LoadingOverlay } from '../UI.js';
import { db, collection, query, orderBy, onSnapshot } from '../firebase.js';
import { formatSingleTimestamp } from '../utils.js';
import * as Icons from '../Icons.js';

const { useState, useEffect, useMemo } = window.React;

const AdminLogEntry = ({ log }) => {
    return html`
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatSingleTimestamp(log.timestamp)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">${log.adminEmail}</td>
            <td className="px-6 py-4 text-sm text-gray-700">${log.action}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${log.studentName}</td>
        </tr>
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

const AdminLog = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const q = query(collection(db, "admin_logs"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(logsData);
            setIsLoading(false);
            setError(null);
        }, (err) => {
            console.error("Hiba az admin naplók lekérdezésekor: ", err);
            setError("Nem sikerült betölteni az admin naplóbejegyzéseket. Ellenőrizd a Firestore biztonsági szabályokat.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => { setCurrentPage(1); }, [logs, itemsPerPage]);

    const currentLogs = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return logs.slice(indexOfFirstItem, indexOfLastItem);
    }, [logs, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(logs.length / itemsPerPage);

    if (isLoading) return html`<${LoadingOverlay} text="Admin napló betöltése..." />`;
    if (error) return html`<div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">${error}</div>`;

    return html`
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mt-8">
            <header className="p-4 border-b">
                <h2 className="text-xl font-bold text-gray-700">Admin Napló</h2>
                <p className="text-sm text-gray-500 mt-1">Itt láthatók az adminisztrátorok által manuálisan végrehajtott műveletek.</p>
            </header>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Időpont</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Művelet</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Érintett Tanuló</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        ${currentLogs.length === 0
                            ? html`<tr><td colSpan="4" className="text-center py-16 text-gray-500">Nincsenek adminisztrátori naplóbejegyzések.</td></tr>`
                            : currentLogs.map(log => html`<${AdminLogEntry} key=${log.id} log=${log} />`)
                        }
                    </tbody>
                </table>
            </div>
            ${totalPages > 1 && html`<div className="p-4 bg-white border-t"><${Pagination} currentPage=${currentPage} totalPages=${totalPages} onPageChange=${setCurrentPage} /></div>`}
        </div>
    `;
};

export default AdminLog;
