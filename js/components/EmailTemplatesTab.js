import { html } from '../UI.js';
import { db, doc, getDoc, setDoc, collection, getDocs } from '../firebase.js';
import * as Icons from '../Icons.js';
import { useToast, useConfirmation } from '../context/AppContext.js';
import DEFAULT_TEMPLATES from './defaultTemplates.js';
import TestEmailModal from './modals/TestEmailModal.js';

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
    
    // Test Email Modal state
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [savedSubject, setSavedSubject] = useState('');
    const [savedHtmlContent, setSavedHtmlContent] = useState('');
    
    // Drag and Drop state
    const [templateOrder, setTemplateOrder] = useState(null); // { categoryName: [templateId1, templateId2] }
    const [draggedItem, setDraggedItem] = useState(null); // { category, index, id }
    const [draggedOverItem, setDraggedOverItem] = useState(null); // { category, index }
    
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

            // 2.a Generate initial fallback categories
            const initialCategories = {};
            Object.keys(DEFAULT_TEMPLATES).forEach(key => {
                const category = DEFAULT_TEMPLATES[key].category || 'Egyéb';
                if (!initialCategories[category]) {
                    initialCategories[category] = [];
                }
                initialCategories[category].push(key);
            });

            // 2.b Attempt to read saved custom order from _metadata document
            let loadedOrder = null;
            if (loadedData['_metadata'] && loadedData['_metadata'].order) {
                loadedOrder = loadedData['_metadata'].order;
                
                // Handle new templates that might not be in the saved metadata yet
                Object.keys(DEFAULT_TEMPLATES).forEach(key => {
                    let isFound = false;
                    Object.values(loadedOrder).forEach(categoryArr => {
                        if (categoryArr.includes(key)) isFound = true;
                    });
                    
                    if (!isFound) {
                        const defaultCat = DEFAULT_TEMPLATES[key].category || 'Egyéb';
                        if (!loadedOrder[defaultCat]) {
                            loadedOrder[defaultCat] = [];
                        }
                        loadedOrder[defaultCat].push(key);
                    }
                });
            } else {
                loadedOrder = initialCategories;
            }

            setTemplateOrder(loadedOrder);

            // Merge with defaults to ensure all keys exist
            const mergedTemplates = {};
            Object.keys(DEFAULT_TEMPLATES).forEach(key => {
                // Ignore the metadata document when treating as a template
                if (key === '_metadata') return;

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
            
            // Set saved state tracking
            setSavedSubject(mergedTemplates[activeTemplateId].subject);
            setSavedHtmlContent(mergedTemplates[activeTemplateId].html);

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
        setSavedSubject(templates[templateId].subject);
        setSavedHtmlContent(templates[templateId].html);
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
            
            // Frissítjük a mentett állapotot
            setSavedSubject(subject);
            setSavedHtmlContent(htmlContent);

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
                    setSavedSubject(defaultTpl.subject);
                    setSavedHtmlContent(defaultTpl.html);
                    showToast("Alapértelmezett sablon visszaállítva.", "success");
                } catch (e) {
                    console.error(e);
                }
            }
        });
    };

    const handleOpenTestModal = () => {
        const hasUnsavedChanges = subject !== savedSubject || htmlContent !== savedHtmlContent;
        if (hasUnsavedChanges) {
            showConfirmation({
                message: "Figyelem: Vannak nem mentett módosításaid! A teszt e-mail a legutóbb mentett állapotot fogja tükrözni. Biztosan folytatod?",
                onConfirm: () => setIsTestModalOpen(true)
            });
        } else {
            setIsTestModalOpen(true);
        }
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e, category, index, id) => {
        setDraggedItem({ category, index, id });
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 drag image / transparent background trick
        setTimeout(() => {
            e.target.classList.add('opacity-50');
        }, 0);
    };

    const handleDragOver = (e, category, index) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        
        // Prevent unnecessary state updates if still over the same item
        if (draggedOverItem && draggedOverItem.category === category && draggedOverItem.index === index) {
            return;
        }
        setDraggedOverItem({ category, index });
    };

    const handleDragEnter = (e, category, index) => {
        e.preventDefault();
        setDraggedOverItem({ category, index });
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('opacity-50');
        setDraggedItem(null);
        setDraggedOverItem(null);
    };

    const handleDrop = async (e, targetCategory, targetIndex) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling to parent <ul>
        
        if (!draggedItem || !templateOrder) return;
        
        const sourceCategory = draggedItem.category;
        const sourceIndex = draggedItem.index;
        
        // Return if dropped on itself
        if (sourceCategory === targetCategory && sourceIndex === targetIndex) {
            handleDragEnd(e);
            return;
        }

        const newOrder = { ...templateOrder };
        
        // Remove from source array
        const [movedItem] = newOrder[sourceCategory].splice(sourceIndex, 1);
        
        // Add to target array at the specified index
        if (!newOrder[targetCategory]) {
             newOrder[targetCategory] = [];
        }
        newOrder[targetCategory].splice(targetIndex, 0, movedItem);
        
        // If a category becomes empty, you could theoretically delete it, 
        // but we'll keep it so users can drag items back into it.
        
        setTemplateOrder(newOrder);
        handleDragEnd(e);
        
        // Save the new order to Firestore
        try {
            await setDoc(doc(db, "email_templates", "_metadata"), {
                order: newOrder,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err) {
            console.error("Failed to save new order to Firestore", err);
            showToast("Nem sikerült elmenteni az új sorrendet.", "error");
        }
    };

    if (isLoading || !templateOrder) {
        return html`<div className="text-center p-12 text-gray-500">Sablonok betöltése...</div>`;
    }

    return html`
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row min-h-[600px]">
            
            
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 overflow-y-auto" style=${{ maxHeight: '800px' }}>
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <h3 className="font-semibold text-gray-800">E-mail Sablonok</h3>
                    <p className="text-xs text-gray-500 mt-1">Válaszd ki a szerkeszteni kívánt e-mailt.</p>
                </div>
                
                <div className="p-2 space-y-4">
                    ${Object.keys(templateOrder).map((category, catIndex) => html`
                        <div key=${category} className="mb-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3 mt-4">${category}</h4>
                            <ul 
                                className="space-y-1 pb-4" 
                                onDragOver=${(e) => handleDragOver(e, category, templateOrder[category].length)}
                                onDragEnter=${(e) => handleDragEnter(e, category, templateOrder[category].length)}
                                onDrop=${(e) => handleDrop(e, category, templateOrder[category].length)}
                            >
                                ${templateOrder[category].length === 0 ? html`
                                    <li className="text-xs text-gray-400 italic px-3 py-1 border-2 border-dashed border-gray-200 rounded text-center">Húzz ide egy sablont</li>
                                ` : ''}

                                ${templateOrder[category].map((key, index) => {
                                    const tpl = templates[key] || DEFAULT_TEMPLATES[key];
                                    if (!tpl) return null; // Safe check for missing templates

                                    const isActive = activeTemplateId === key;
                                    const isTemplateEnabled = tpl.enabled !== false;
                                    const isDraggedOver = draggedOverItem && draggedOverItem.category === category && draggedOverItem.index === index;
                                    
                                    return html`
                                        <${React.Fragment} key=${key}>
                                            ${isDraggedOver ? html`<div className="h-1 bg-indigo-500 rounded my-1 w-full transition-all"></div>` : ''}
                                            <li 
                                                draggable="true"
                                                onDragStart=${(e) => handleDragStart(e, category, index, key)}
                                                onDragOver=${(e) => handleDragOver(e, category, index)}
                                                onDragEnter=${(e) => handleDragEnter(e, category, index)}
                                                onDragEnd=${handleDragEnd}
                                                onDrop=${(e) => handleDrop(e, category, index)}
                                                className="cursor-move"
                                            >
                                                <div className=${`group flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700' : 'hover:bg-gray-100 text-gray-700 border-l-4 border-transparent'}`}
                                                     onClick=${() => handleTemplateSelect(key)}>
                                                    <div className="flex-1 min-w-0 pr-2 flex items-center gap-2">
                                                        <${Icons.GripVerticalIcon} size=${14} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />
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
                                        </${React.Fragment}>
                                    `;
                                })}
                                
                                ${/* This is the drop zone for the very end of the list */''}
                                ${draggedOverItem && draggedOverItem.category === category && draggedOverItem.index === templateOrder[category].length && templateOrder[category].length > 0 ? html`
                                    <div className="h-1 bg-indigo-500 rounded my-1 w-full transition-all"></div>
                                ` : ''}
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
                    
                    <div className="flex gap-3">
                        <button 
                            onClick=${handleOpenTestModal}
                            disabled=${isSaving}
                            className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <${Icons.SendIcon} size=${18} />
                            Teszt e-mail küldése
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
            <${TestEmailModal} 
                templateId=${activeTemplateId}
                savedTemplate=${{ subject: savedSubject, html: savedHtmlContent }}
                isOpen=${isTestModalOpen}
                onClose=${() => setIsTestModalOpen(false)}
            />
        </div>
    `;
};

export default EmailTemplatesTab;
