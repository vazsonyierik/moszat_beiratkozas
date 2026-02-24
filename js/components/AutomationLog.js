/**
 * js/components/AutomationLog.js
 * This component displays automation logs from Firestore.
 * JAVÍTÁS: Lapozás hozzáadva a hosszú listák kezeléséhez.
 * MÓDOSÍTÁS: A lapozó javítása, hogy sok oldal esetén se csússzon szét a felület.
 */
import { html, LoadingOverlay } from '../UI.js';
import { db, collection, query, orderBy, onSnapshot, getDocs, where } from '../firebase.js';
import { formatSingleTimestamp } from '../utils.js';
import * as Icons from '../Icons.js';

const { useState, useEffect, useMemo } = window.React;

const LogEntry = ({ entry }) => {
    return html`
        <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md">
            <div className="flex-shrink-0 pt-1">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                    <${Icons.InfoIcon} size=${12} className="text-indigo-600" />
                </div>
            </div>
            <div>
                <p className="text-sm text-gray-700">${entry.action}</p>
                <p className="text-xs text-gray-500">Érintett: ${entry.student}</p>
            </div>
        </div>
    `;
};

const LogDayGroup = ({ logGroup }) => {
    const date = new Date(logGroup.createdAt.seconds * 1000).toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return html`
        <div className="mb-8">
            <div className="sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10 p-2 border-b">
                 <h3 className="text-lg font-semibold text-gray-800">${date}</h3>
                 <p className="text-sm text-gray-500">${logGroup.entries.length} automatikus művelet történt ezen a napon.</p>
            </div>
            <div className="mt-4 space-y-1">
                ${logGroup.entries.map((entry, index) => html`<${LogEntry} key=${index} entry=${entry} />`)}
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


const AutomationLog = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    useEffect(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const q = query(
            collection(db, "automation_logs"), 
            where("createdAt", ">=", thirtyDaysAgo),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(logsData);
            setIsLoading(false);
            setError(null);
        }, (err) => {
            console.error("Hiba a naplók lekérdezésekor: ", err);
            setError("Nem sikerült betölteni a naplóbejegyzéseket. Ellenőrizd a Firestore biztonsági szabályokat.");
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

    const handleExport = async () => {
        try {
            const allLogsQuery = query(collection(db, "automation_logs"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(allLogsQuery);
            
            let textContent = "Mosolyzóna Autósiskola - Automatizálási Napló Export\n";
            textContent += `Exportálás dátuma: ${new Date().toLocaleString('hu-HU')}\n\n`;

            querySnapshot.forEach(doc => {
                const logGroup = doc.data();
                const date = new Date(logGroup.createdAt.seconds * 1000).toLocaleDateString('hu-HU');
                textContent += `--- ${date} ---\n`;
                logGroup.entries.forEach(entry => {
                    textContent += `[${entry.student}] ${entry.action}\n`;
                });
                textContent += "\n";
            });

            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `automation_log_export_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (exportError) {
            console.error("Hiba az exportálás során: ", exportError);
            setError("Hiba történt a napló exportálása közben.");
        }
    };

    if (isLoading) return html`<${LoadingOverlay} text="Napló betöltése..." />`;
    if (error) return html`<div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">${error}</div>`;

    return html`
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mt-8">
            <header className="p-4 border-b flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-700">Automatizálási Napló (utolsó 30 nap)</h2>
                    <p className="text-sm text-gray-500 mt-1">Itt láthatók a rendszer által automatikusan végrehajtott műveletek.</p>
                </div>
                <button onClick=${handleExport} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700">
                    Teljes napló exportálása (TXT)
                </button>
            </header>
            <main className="p-2 sm:p-4">
                ${currentLogs.length === 0
                    ? html`<div className="text-center py-16 text-gray-500">Nincsenek naplóbejegyzések az elmúlt 30 napban.</div>`
                    : currentLogs.map(logGroup => html`<${LogDayGroup} key=${logGroup.id} logGroup=${logGroup} />`)
                }
            </main>
            ${totalPages > 1 && html`<div className="p-4 bg-white border-t"><${Pagination} currentPage=${currentPage} totalPages=${totalPages} onPageChange=${setCurrentPage} /></div>`}
        </div>
    `;
};

export default AutomationLog;
