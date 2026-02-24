/**
 * js/components/VersionHistory.js
 * * Component for displaying and managing version history (changelog).
 */
import { html, LoadingOverlay } from '../UI.js';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from '../firebase.js';
import { useToast, useConfirmation } from '../context/AppContext.js';
import { XIcon, TrashIcon, EditIcon, CheckIcon } from '../Icons.js';
import * as utils from '../utils.js';

const React = window.React;
const { useState, useEffect, useRef } = React;

const VersionItem = ({ version, adminUser, onDelete }) => {
    const formattedDate = utils.formatTimestampForTable(version.createdAt);

    return html`
        <div className="relative pl-8 sm:pl-32 py-6 group">
            <div className="flex flex-col sm:flex-row items-start mb-1 group-last:before:hidden before:absolute before:left-2 sm:before:left-0 before:h-full before:px-px before:bg-slate-200 sm:before:ml-[6.5rem] before:self-start before:-translate-x-1/2 before:translate-y-3 after:absolute after:left-2 sm:after:left-0 after:w-2 after:h-2 after:bg-indigo-600 after:border-4 after:box-content after:border-slate-50 after:rounded-full sm:after:ml-[6.5rem] after:-translate-x-1/2 after:translate-y-1.5">
                <time className="sm:absolute left-0 translate-y-0.5 inline-flex items-center justify-center text-xs font-semibold uppercase w-20 h-6 mb-3 sm:mb-0 text-emerald-600 bg-emerald-100 rounded-full">${version.versionNumber}</time>
                <div className="text-xl font-bold text-slate-900">${version.title}</div>
            </div>
            <div className="text-slate-500 mb-2 text-sm">
                <span>${formattedDate.date} ${formattedDate.time}</span>
                <span className="mx-2">•</span>
                <span className="font-medium text-slate-700">${version.createdBy}</span>
            </div>
            <div className="text-slate-700 prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">${version.description}</p>
            </div>

            ${adminUser && html`
                <button
                    onClick=${() => onDelete(version.id)}
                    className="absolute top-6 right-0 p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Bejegyzés törlése"
                >
                    <${TrashIcon} size=${16} />
                </button>
            `}
        </div>
    `;
};

const AddVersionForm = ({ onCancel, onSave }) => {
    const [versionNumber, setVersionNumber] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave({ versionNumber, title, description });
        setIsSubmitting(false);
    };

    return html`
        <form onSubmit=${handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8 animate-fade-in-down">
            <h4 className="text-lg font-bold text-slate-800 mb-4">Új verzió rögzítése</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Verziószám (pl. v1.2.0)</label>
                    <input
                        type="text"
                        required
                        value=${versionNumber}
                        onChange=${(e) => setVersionNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="v..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cím / Rövid összefoglaló</label>
                    <input
                        type="text"
                        required
                        value=${title}
                        onChange=${(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Pl. Tesztkörnyezet bevezetése"
                    />
                </div>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Részletes leírás (Changelog)</label>
                <textarea
                    required
                    value=${description}
                    onChange=${(e) => setDescription(e.target.value)}
                    rows="4"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Sorold fel a változtatásokat..."
                ></textarea>
            </div>
            <div className="flex justify-end gap-3">
                <button type="button" onClick=${onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Mégse</button>
                <button type="submit" disabled=${isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">Mentés</button>
            </div>
        </form>
    `;
};

const VersionHistory = ({ onClose, adminUser }) => {
    const [versions, setVersions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [permissionError, setPermissionError] = useState(false);
    const showToast = useToast();
    const showConfirmation = useConfirmation();

    useEffect(() => {
        const q = query(collection(db, "versions"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const versionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVersions(versionsData);
            setIsLoading(false);
            setPermissionError(false);
        }, (error) => {
            console.error("Error fetching versions:", error);
            if (error.code === 'permission-denied') {
                setPermissionError(true);
            } else {
                showToast("Hiba a verziók betöltésekor", "error");
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [showToast]);

    const handleAddVersion = async (data) => {
        try {
            await addDoc(collection(db, "versions"), {
                ...data,
                createdAt: serverTimestamp(),
                createdBy: adminUser.email
            });
            showToast("Új verzió sikeresen rögzítve!", "success");
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding version:", error);
            if (error.code === 'permission-denied') {
                showToast("Hiba: Jogosultsági probléma (lásd a figyelmeztetést)", "error");
            } else {
                showToast("Hiba a mentés során: " + error.message, "error");
            }
        }
    };

    const handleDeleteVersion = (id) => {
        showConfirmation({
            message: "Biztosan törölni szeretnéd ezt a verzióbejegyzést? Ez nem vonható vissza.",
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "versions", id));
                    showToast("Bejegyzés törölve.", "success");
                } catch (error) {
                    console.error("Error deleting version:", error);
                    showToast("Hiba a törlés során.", "error");
                }
            }
        });
    };

    const handleSeedData = async () => {
        showConfirmation({
            message: "Szeretnéd automatikusan betölteni az eddigi fejlesztéseket (Tesztkörnyezet, UI változások)?",
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    const batch = [
                        {
                            versionNumber: "v1.0.0",
                            title: "Kezdeti Rendszerállapot",
                            description: "Az eredeti, éles rendszer működése.",
                            createdBy: "system",
                            createdAt: serverTimestamp()
                        },
                        {
                            versionNumber: "v1.1.0",
                            title: "Tesztkörnyezet és UI Fejlesztések",
                            description: "• Létrehoztuk a 'Shadow' tesztkörnyezetet (külön adatbázis: registrations_test).\n• Az Admin felületen elkülönített Teszt nézet (piros háttérrel).\n• A teszt regisztrációk NEM kerülnek be a Google Sheet-be.\n• Új beállítások menü (fogaskerék ikon).",
                            createdBy: adminUser.email,
                            createdAt: serverTimestamp()
                        },
                        {
                            versionNumber: "v1.1.1",
                            title: "Verziókövetés Funkció",
                            description: "• Új Verziókövetés (Changelog) modul hozzáadása az admin felülethez.\n• Fejlesztési előzmények rögzítése és visszakövethetősége.",
                            createdBy: adminUser.email,
                            createdAt: serverTimestamp()
                        }
                    ];

                    for (const item of batch) {
                        await addDoc(collection(db, "versions"), item);
                    }
                    showToast("Kezdeti verziók sikeresen betöltve!", "success");
                } catch (error) {
                    console.error("Error seeding data:", error);
                    showToast("Hiba az adatok betöltésekor: " + error.message, "error");
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick=${onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col" onClick=${e => e.stopPropagation()}>
                <header className="p-6 border-b flex justify-between items-center bg-indigo-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Verziókövetés & Changelog</h3>
                            <p className="text-sm text-slate-500">A rendszer fejlesztésének története</p>
                        </div>
                    </div>
                    <button onClick=${onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-white/50 transition-colors"><${XIcon} size=${24} /></button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    ${permissionError && html`
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        <strong className="font-bold">Figyelem: Adatbázis jogosultsági hiba!</strong><br />
                                        A verziókövetés funkció használatához frissíteni kell az adatbázis szabályokat.<br />
                                        Kérlek futtasd a parancssorban: <code className="bg-red-100 px-1 py-0.5 rounded text-red-800">firebase deploy --only firestore:rules</code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    `}

                    ${isLoading ? html`<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>` : html`
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-semibold text-slate-700">Előzmények</h4>
                            ${!showAddForm && !permissionError && html`
                                <button onClick=${() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    Új verzió hozzáadása
                                </button>
                            `}
                        </div>

                        ${showAddForm && html`<${AddVersionForm} onCancel=${() => setShowAddForm(false)} onSave=${handleAddVersion} />`}

                        <div className="relative">
                            ${versions.length === 0
                                ? html`
                                    <div className="text-center py-12">
                                        <p className="text-slate-400 mb-4">Még nincsenek rögzített verziók.</p>
                                        <button
                                            onClick=${handleSeedData}
                                            className="px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                                        >
                                            Kezdeti fejlesztések betöltése (v1.1.0)
                                        </button>
                                    </div>
                                `
                                : versions.map(version => html`<${VersionItem} key=${version.id} version=${version} adminUser=${adminUser} onDelete=${handleDeleteVersion} />`)
                            }
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
};

export default VersionHistory;
