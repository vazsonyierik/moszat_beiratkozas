import { html } from '../UI.js';
import { db, doc, getDoc, setDoc, collection, getDocs } from '../firebase.js';
import * as Icons from '../Icons.js';
import { useToast, useConfirmation } from '../context/AppContext.js';

const React = window.React;
const { useState, useEffect, useRef } = React;

/**
 * Alapértelmezett sablonok (fallback a Firestore feltöltéshez)
 */
const DEFAULT_TEMPLATES = {
    bookingConfirmation: {
        id: 'bookingConfirmation',
        name: 'Időpontfoglalás visszaigazolása',
        subject: 'Időpontfoglalás visszaigazolása - Mosolyzóna Autósiskola',
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
    <p>Sikeresen jelentkeztél a következő foglalkozásra:</p>
    <ul>
        <li><strong>Foglalkozás:</strong> {{courseName}}</li>
        <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
    </ul>
    <p>Kérjük, hogy pontosan érkezz!</p>
    <p>Amennyiben mégsem tudsz részt venni, kérjük, az alábbi linkre kattintva mondd le a jelentkezésedet, hogy másnak is legyen lehetősége részt venni:</p>
    <p>
        <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
           style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
           Időpont lemondása
        </a>
    </p>
    <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
</div>`
    },
    bookingCancelledByAdmin: {
        id: 'bookingCancelledByAdmin',
        name: 'Jelentkezés törölve (Admin által)',
        subject: 'Jelentkezés törölve - Mosolyzóna Autósiskola',
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
    <p>Tájékoztatunk, hogy a következő foglalkozásra leadott jelentkezésed törlésre került a rendszerünkben:</p>
    <ul>
        <li><strong>Foglalkozás:</strong> {{courseName}}</li>
        <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
    </ul>
    <p>Ha úgy gondolod, hogy ez tévedés, kérjük vedd fel velünk a kapcsolatot.</p>
    <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
</div>`
    },
    bookingCancelledByStudent: {
        id: 'bookingCancelledByStudent',
        name: 'Jelentkezés lemondva (Diák által)',
        subject: 'Időpont lemondva - Mosolyzóna Autósiskola',
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
    <p>Sikeresen lemondtad a jelentkezésedet a következő foglalkozásra:</p>
    <ul>
        <li><strong>Foglalkozás:</strong> {{courseName}}</li>
        <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
    </ul>
    <p>Köszönjük, hogy jelezted felénk!</p>
    <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
</div>`
    },
    courseDeleted: {
        id: 'courseDeleted',
        name: 'Foglalkozás elmarad',
        subject: 'Foglalkozás elmarad - Mosolyzóna Autósiskola',
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
    <p>Sajnálattal tájékoztatunk, hogy a következő foglalkozás, amelyre jelentkeztél, váratlan okok miatt <strong>elmarad:</strong></p>
    <ul>
        <li><strong>Foglalkozás:</strong> {{courseName}}</li>
        <li><strong>Eredeti időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
    </ul>
    <p>Kérjük, foglalj egy új időpontot az aktuálisan meghirdetett foglalkozásaink közül.</p>
    <p>Elnézést kérünk az esetleges kellemetlenségekért!</p>
    <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
</div>`
    }
};

const EmailTemplatesTab = () => {
    const [templates, setTemplates] = useState({});
    const [activeTemplateId, setActiveTemplateId] = useState('bookingConfirmation');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [subject, setSubject] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    
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
            });

            setTemplates(mergedTemplates);
            
            // Set initial form state for the active tab
            setSubject(mergedTemplates[activeTemplateId].subject);
            setHtmlContent(mergedTemplates[activeTemplateId].html);

        } catch (error) {
            console.error("Error loading templates:", error);
            showToast("Nem sikerült betölteni az e-mail sablonokat (valószínűleg jogosultsági hiba). Alapértelmezett betöltése.", "warning");
            
            // Biztonsági fallback hiba esetén
            setTemplates({...DEFAULT_TEMPLATES});
            setSubject(DEFAULT_TEMPLATES[activeTemplateId].subject);
            setHtmlContent(DEFAULT_TEMPLATES[activeTemplateId].html);
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Quill editor inicializálása vagy tartalmának frissítése amikor váltunk a fülek között
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

        // Frissítjük a szerkesztő tartalmát, ha a HTML változik (pl. tab váltáskor)
        // De csak akkor, ha nem mi magunk gépelünk bele épp
        if (quillRef.current.root.innerHTML !== htmlContent) {
            // A Quill szerkesztő tartalmának beállítása biztonságosan API-n keresztül (innerHTML helyett)
            const delta = quillRef.current.clipboard.convert(htmlContent);
            quillRef.current.setContents(delta, 'silent');
        }

    }, [isLoading, activeTemplateId, htmlContent]); // Frissítsük, ha a htmlContent kívülről változik

    const handleTabChange = (templateId) => {
        setActiveTemplateId(templateId);
        setSubject(templates[templateId].subject);
        setHtmlContent(templates[templateId].html);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const templateRef = doc(db, "email_templates", activeTemplateId);
            await setDoc(templateRef, {
                subject,
                html: htmlContent,
                name: DEFAULT_TEMPLATES[activeTemplateId].name, // Keep the human readable name
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Update local state
            setTemplates(prev => ({
                ...prev,
                [activeTemplateId]: {
                    ...prev[activeTemplateId],
                    subject,
                    html: htmlContent
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
                
                // Mentsük is el azonnal, így felülírja a DB-ben az egyedit
                try {
                    await setDoc(doc(db, "email_templates", activeTemplateId), {
                        subject: defaultTpl.subject,
                        html: defaultTpl.html,
                        name: defaultTpl.name,
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

    return html`
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
                <nav className="flex space-x-2 p-4 pb-0 overflow-x-auto" aria-label="Tabs">
                    ${Object.keys(DEFAULT_TEMPLATES).map((key) => {
                        const tpl = templates[key];
                        const isActive = activeTemplateId === key;
                        return html`
                            <button
                                key="${key}"
                                onClick=${() => handleTabChange(key)}
                                className=${`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors ${isActive ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                ${tpl.name}
                            </button>
                        `;
                    })}
                </nav>
            </div>

            <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-blue-800 text-sm">
                    <p className="font-bold mb-1 flex items-center gap-2"><${Icons.InfoIcon} size=${16} /> Dinamikus változók használata</p>
                    <p className="mb-2">A szövegben lévő dupla kapcsos zárójelek közötti szavakat a rendszer küldéskor automatikusan kicseréli a tanuló adataira. <strong>Kérlek ezeket ne töröld ki!</strong></p>
                    <ul className="list-disc pl-5 font-mono text-xs">
                        <li>{{firstName}} - Tanuló keresztneve</li>
                        <li>{{lastName}} - Tanuló vezetékneve</li>
                        <li>{{courseName}} - Foglalkozás neve</li>
                        <li>{{courseDate}} - Foglalkozás dátuma</li>
                        <li>{{startTime}} - Kezdés időpontja</li>
                        <li>{{cancellation_token}} - Egyedi azonosító a lemondó linkhez</li>
                    </ul>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail tárgya</label>
                    <input 
                        type="text" 
                        value=${subject}
                        onChange=${(e) => setSubject(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-medium p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                        <span>E-mail HTML törzse (Tartalom)</span>
                    </label>
                    
                    <div className="mt-1 rounded-md overflow-hidden border border-gray-300" style=${{ minHeight: '300px' }}>
                        <div ref=${editorContainerRef} style=${{ minHeight: '250px', backgroundColor: 'white' }}></div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">A Quill szerkesztő tiszta HTML kódot generál, ami bekerül az e-mail sablonba.</p>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
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
