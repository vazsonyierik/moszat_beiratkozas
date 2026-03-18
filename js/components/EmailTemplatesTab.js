import { html } from '../UI.js';
import { db, doc, getDoc, setDoc, collection, getDocs } from '../firebase.js';
import * as Icons from '../Icons.js';
import { useToast, useConfirmation } from '../context/AppContext.js';
import DEFAULT_TEMPLATES from './defaultTemplates.js';

const React = window.React;
const { useState, useEffect, useRef, Fragment } = React;

const EmailTemplatesTab = () => {
    const [templates, setTemplates] = useState({});
    const [activeTemplateId, setActiveTemplateId] = useState('registrationConfirmation');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [subject, setSubject] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [isEnabled, setIsEnabled] = useState(true);
    
    const showToast = useToast();
    const showConfirmation = useConfirmation();
    const quillRef = useRef(null);
    const editorContainerRef = useRef(null);

    // 1. Betöltjük a külső Quill library-t dinamikusan, ha még nincs
    useEffect(() => {
        if (!window.Quill) {
            const script = document.createElement('script');
            script.src = "https://cdn.quilljs.com/1.3.7/quill.min.js";
            document.head.appendChild(script);

            const style = document.createElement('link');
            style.rel = "stylesheet";
            style.href = "https://cdn.quilljs.com/1.3.7/quill.snow.css";
            document.head.appendChild(style);

            script.onload = loadTemplates;
        } else {
            loadTemplates();
        }
    }, []);

    // 2. Betöltjük az adatbázisból a mentett sablonokat
    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "email_templates"));
            const loadedData = {};
            snapshot.forEach(doc => {
                loadedData[doc.id] = doc.data();
            });

            // Merge with defaults to ensure all keys exist
            const mergedTemplates = {};
            Object.keys(DEFAULT_TEMPLATES).forEach(key => {
                mergedTemplates[key] = {
                    ...DEFAULT_TEMPLATES[key],
                    ...loadedData[key] // DB data overwrites default if it exists
                };

                // Ha az adatbázisban nincs enabled mező, alapból true
                if (mergedTemplates[key].enabled === undefined) {
                    mergedTemplates[key].enabled = true;
                }
            });

            setTemplates(mergedTemplates);
            
            // Set initial form state for the active tab
            setSubject(mergedTemplates[activeTemplateId].subject);
            setHtmlContent(mergedTemplates[activeTemplateId].html);
            setIsEnabled(mergedTemplates[activeTemplateId].enabled);

        } catch (error) {
            console.error("Error loading templates:", error);
            showToast("Nem sikerült betölteni az e-mail sablonokat (valószínűleg jogosultsági hiba). Alapértelmezett betöltése.", "warning");
            
            // Biztonsági fallback hiba esetén
            setTemplates({...DEFAULT_TEMPLATES});
            setSubject(DEFAULT_TEMPLATES[activeTemplateId].subject);
            setHtmlContent(DEFAULT_TEMPLATES[activeTemplateId].html);
            setIsEnabled(DEFAULT_TEMPLATES[activeTemplateId].enabled !== false);
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Quill editor inicializálása vagy tartalmának frissítése amikor váltunk a sablonok között
    useEffect(() => {
        if (isLoading || !window.Quill || !editorContainerRef.current) return;

        if (!quillRef.current) {
            quillRef.current = new window.Quill(editorContainerRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                        [{ 'align': [] }],
                        ['link'],
                        ['clean']                                         // remove formatting button
                    ]
                }
            });
            
            quillRef.current.on('text-change', () => {
                setHtmlContent(quillRef.current.root.innerHTML);
            });
        }

        if (quillRef.current.root.innerHTML !== htmlContent) {
            const delta = quillRef.current.clipboard.convert(htmlContent);
            quillRef.current.setContents(delta, 'silent');
        }

    }, [isLoading, activeTemplateId, htmlContent]);

    const handleTemplateSelect = (templateId) => {
        setActiveTemplateId(templateId);
        setSubject(templates[templateId].subject);
        setHtmlContent(templates[templateId].html);
        setIsEnabled(templates[templateId].enabled !== false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const templateRef = doc(db, "email_templates", activeTemplateId);
            await setDoc(templateRef, {
                subject,
                html: htmlContent,
                name: DEFAULT_TEMPLATES[activeTemplateId].name,
                enabled: isEnabled,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setTemplates(prev => ({
                ...prev,
                [activeTemplateId]: {
                    ...prev[activeTemplateId],
                    subject,
                    html: htmlContent,
                    enabled: isEnabled
                }
            }));

            showToast("Sablon sikeresen elmentve!", "success");
        } catch (error) {
            console.error("Hiba a mentés során:", error);
            showToast("Hiba történt a mentés során.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleEnable = async (templateId, newEnabledState) => {
        try {
            // Optimistic update
            setTemplates(prev => ({
                ...prev,
                [templateId]: {
                    ...prev[templateId],
                    enabled: newEnabledState
                }
            }));

            if (activeTemplateId === templateId) {
                setIsEnabled(newEnabledState);
            }

            const templateRef = doc(db, "email_templates", templateId);
            await setDoc(templateRef, {
                enabled: newEnabledState,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            showToast(`A(z) "${DEFAULT_TEMPLATES[templateId].name}" sablon ${newEnabledState ? 'engedélyezve' : 'kikapcsolva'}.`, "success");
        } catch (error) {
            console.error("Hiba a kapcsolás során:", error);
            showToast("Hiba történt a státusz módosításakor.", "error");

            // Revert optimistic update
            setTemplates(prev => ({
                ...prev,
                [templateId]: {
                    ...prev[templateId],
                    enabled: !newEnabledState
                }
            }));
            if (activeTemplateId === templateId) {
                setIsEnabled(!newEnabledState);
            }
        }
    };

    const handleRestoreDefault = () => {
        showConfirmation({
            message: "Biztosan visszaállítod ennek az e-mailnek az alapértelmezett (beégetett) tartalmát? A jelenlegi egyedi módosításaid ehhez a sablonhoz végleg elvesznek.",
            onConfirm: async () => {
                const defaultTpl = DEFAULT_TEMPLATES[activeTemplateId];
                setSubject(defaultTpl.subject);
                setHtmlContent(defaultTpl.html);
                if (quillRef.current) {
                    const delta = quillRef.current.clipboard.convert(defaultTpl.html);
                    quillRef.current.setContents(delta, 'silent');
                }
                
                try {
                    await setDoc(doc(db, "email_templates", activeTemplateId), {
                        subject: defaultTpl.subject,
                        html: defaultTpl.html,
                        name: defaultTpl.name,
                        enabled: isEnabled, // Keep current enabled state
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                    showToast("Alapértelmezett sablon visszaállítva.", "success");
                } catch (e) {
                    console.error(e);
                }
            }
        });
    };

    if (isLoading) {
        return html`<div className="text-center p-12 text-gray-500">Sablonok betöltése...</div>`;
    }

    // Csoportosítás kategóriák szerint
    const groupedTemplates = {};
    Object.keys(DEFAULT_TEMPLATES).forEach(key => {
        const category = DEFAULT_TEMPLATES[key].category || 'Egyéb';
        if (!groupedTemplates[category]) {
            groupedTemplates[category] = [];
        }
        groupedTemplates[category].push(key);
    });

    return html`
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row min-h-[600px]">


            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 overflow-y-auto" style=${{ maxHeight: '800px' }}>
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <h3 className="font-semibold text-gray-800">E-mail Sablonok</h3>
                    <p className="text-xs text-gray-500 mt-1">Válaszd ki a szerkeszteni kívánt e-mailt.</p>
                </div>

                <div className="p-2 space-y-4">
                    ${Object.keys(groupedTemplates).map(category => html`
                        <div key=${category} className="mb-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3 mt-4">${category}</h4>
                            <ul className="space-y-1">
                                ${groupedTemplates[category].map(key => {
                                    const tpl = templates[key] || DEFAULT_TEMPLATES[key];
                                    const isActive = activeTemplateId === key;
                                    const isTemplateEnabled = tpl.enabled !== false;

                                    return html`
                                        <li key=${key}>
                                            <div className=${`group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700' : 'hover:bg-gray-100 text-gray-700 border-l-4 border-transparent'}`}
                                                 onClick=${() => handleTemplateSelect(key)}>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <span className=${`block truncate text-sm font-medium ${isActive ? 'text-indigo-700' : 'text-gray-700'} ${!isTemplateEnabled && !isActive ? 'opacity-50' : ''}`}>
                                                        ${DEFAULT_TEMPLATES[key].name}
                                                    </span>
                                                </div>
                                                <div className="flex-shrink-0 ml-2" onClick=${(e) => e.stopPropagation()}>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                      <input type="checkbox" className="sr-only peer" checked=${isTemplateEnabled} onChange=${(e) => handleToggleEnable(key, e.target.checked)} />
                                                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </li>
                                    `;
                                })}
                            </ul>
                        </div>
                    `)}
                </div>
            </div>


            <div className="w-full md:w-2/3 p-6 flex flex-col h-full">

                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">${DEFAULT_TEMPLATES[activeTemplateId].name}</h2>
                        <div className="mt-2 flex items-center">
                            <span className="text-sm text-gray-500 mr-3">Állapot:</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked=${isEnabled} onChange=${(e) => handleToggleEnable(activeTemplateId, e.target.checked)} />
                              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                              <span className=${`ml-3 text-sm font-medium ${isEnabled ? 'text-indigo-600' : 'text-gray-500'}`}>
                                  ${isEnabled ? 'Aktív (Kiküldésre kerül)' : 'Kikapcsolva (Nem küldi ki)'}
                              </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 flex-grow">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-blue-800 text-sm">
                        <p className="font-bold mb-1 flex items-center gap-2"><${Icons.InfoIcon} size=${16} /> Dinamikus változók használata</p>
                        <p className="mb-2">A szövegben lévő dupla kapcsos zárójelek közötti szavakat a rendszer küldéskor automatikusan kicseréli a tanuló adataira. <strong>Kérlek ezeket ne töröld ki!</strong></p>
                        <p className="text-xs mt-1 italic">Általános változók: {{firstName}}, {{lastName}}, {{email}}</p>
                        <p className="text-xs mt-1 italic">Időpontfoglalás változói: {{courseName}}, {{courseDate}}, {{startTime}}, {{endTime}}, {{cancellation_token}}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail tárgya</label>
                        <input
                            type="text"
                            value=${subject}
                            onChange=${(e) => setSubject(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-medium p-2 border"
                            disabled=${!isEnabled}
                        />
                    </div>

                    <div className=${!isEnabled ? 'opacity-60 pointer-events-none' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                            <span>E-mail HTML törzse (Tartalom)</span>
                        </label>

                        <div className="mt-1 rounded-md overflow-hidden border border-gray-300" style=${{ minHeight: '300px' }}>
                            <div ref=${editorContainerRef} style=${{ minHeight: '250px', backgroundColor: 'white' }}></div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-200 flex justify-between items-center">
                    <button 
                        onClick=${handleRestoreDefault}
                        className="text-gray-500 hover:text-red-600 text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        <${Icons.AlertIcon} size=${16} />
                        Alapértelmezett visszaállítása
                    </button>
                    
                    <button 
                        onClick=${handleSave}
                        disabled=${isSaving}
                        className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <${Icons.SaveIcon} size=${18} />
                        ${isSaving ? 'Mentés folyamatban...' : 'Sablon mentése az adatbázisba'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

export default EmailTemplatesTab;
