import { html } from '../UI.js';
import { db, doc, getDoc, setDoc, collection, getDocs } from '../firebase.js';
import Icons from '../Icons.js';
import { useToast, useConfirmation } from '../context/AppContext.js';
import DEFAULT_TEMPLATES from './defaultTemplates.js';
import TestEmailModal from './modals/TestEmailModal.js';

const React = window.React;
const { useState, useEffect, useRef, Fragment } = React;

// Modális ablak a gomb beszúrásához (színválasztóval és haladó beállításokkal)
const InsertButtonModal = ({ isOpen, onClose, onInsert, initialData = null }) => {
    // Alapértelmezett értékek
    const [url, setUrl] = useState('https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}');
    const [text, setText] = useState('Időpont lemondása');
    const [bgColor, setBgColor] = useState('#d9534f');
    const [textColor, setTextColor] = useState('#ffffff');
    const [paddingV, setPaddingV] = useState(12);
    const [paddingH, setPaddingH] = useState(24);
    const [borderRadius, setBorderRadius] = useState(6);
    const [borderWidth, setBorderWidth] = useState(0);
    const [borderColor, setBorderColor] = useState('#000000');
    const [borderOpacity, setBorderOpacity] = useState(100); // Új state a szegély áttetszőségéhez
    const [fontSize, setFontSize] = useState(16);
    const [fontWeight, setFontWeight] = useState('bold');
    const [opacity, setOpacity] = useState(100);

    // Helper: HEX to RGB string ("r, g, b")
    const hexToRgbStr = (hex) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        return `${r}, ${g}, ${b}`;
    };

    // Ha van initialData (meglévő gombot szerkesztünk), akkor betöltjük
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setUrl(initialData.url || 'https://');
                setText(initialData.text || 'Gomb');
                setBgColor(initialData.bgColor || '#d9534f');
                setTextColor(initialData.textColor || '#ffffff');
                setPaddingV(initialData.paddingV !== undefined ? initialData.paddingV : 12);
                setPaddingH(initialData.paddingH !== undefined ? initialData.paddingH : 24);
                setBorderRadius(initialData.borderRadius !== undefined ? initialData.borderRadius : 6);
                setBorderWidth(initialData.borderWidth !== undefined ? initialData.borderWidth : 0);
                setBorderColor(initialData.borderColor || '#000000');
                setBorderOpacity(initialData.borderOpacity !== undefined ? initialData.borderOpacity : 100);
                setFontSize(initialData.fontSize !== undefined ? initialData.fontSize : 16);
                setFontWeight(initialData.fontWeight || 'bold');
                setOpacity(initialData.opacity !== undefined ? initialData.opacity : 100);
            } else {
                // Reset to defaults ha új gomb
                setUrl('https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}');
                setText('Időpont lemondása');
                setBgColor('#d9534f');
                setTextColor('#ffffff');
                setPaddingV(12);
                setPaddingH(24);
                setBorderRadius(6);
                setBorderWidth(0);
                setBorderColor('#000000');
                setBorderOpacity(100);
                setFontSize(16);
                setFontWeight('bold');
                setOpacity(100);
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onInsert({
            url, text, bgColor, textColor, paddingV, paddingH,
            borderRadius, borderWidth, borderColor, borderOpacity, fontSize, fontWeight, opacity
        });
        onClose();
    };

    return html`
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-60 p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between rounded-t-xl border-b p-4 bg-gray-50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                        ${initialData ? 'Gomb szerkesztése' : 'Gomb beszúrása'}
                    </h3>
                    <button type="button" onClick=${onClose} className="text-gray-400 hover:text-gray-900 bg-transparent hover:bg-gray-200 rounded-lg p-1.5 transition-colors">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </div>

                <form onSubmit=${handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Gomb felirata</label>
                            <input
                                type="text"
                                value=${text}
                                onChange=${(e) => setText(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-medium p-2 border"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Hivatkozás (URL)</label>
                            <input
                                type="url"
                                value=${url}
                                onChange=${(e) => setUrl(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                required
                                placeholder="https://"
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Színek</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Háttérszín</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value=${bgColor}
                                        onChange=${(e) => setBgColor(e.target.value)}
                                        className="h-10 w-10 rounded cursor-pointer border-0 p-0"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">${bgColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Szövegszín</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value=${textColor}
                                        onChange=${(e) => setTextColor(e.target.value)}
                                        className="h-10 w-10 rounded cursor-pointer border-0 p-0"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">${textColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Megjelenés</h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Betűméret (px)</label>
                                <input
                                    type="number"
                                    value=${fontSize}
                                    onChange=${(e) => setFontSize(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    min="8" max="72"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Vastagság</label>
                                <select 
                                    value=${fontWeight} 
                                    onChange=${(e) => setFontWeight(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                >
                                    <option value="normal">Normál</option>
                                    <option value="bold">Félkövér (Bold)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Belső margó F/L (px)</label>
                                <input
                                    type="number"
                                    value=${paddingV}
                                    onChange=${(e) => setPaddingV(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    min="0" max="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Belső margó B/J (px)</label>
                                <input
                                    type="number"
                                    value=${paddingH}
                                    onChange=${(e) => setPaddingH(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    min="0" max="100"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Lekerekítés (px)</label>
                                <input
                                    type="number"
                                    value=${borderRadius}
                                    onChange=${(e) => setBorderRadius(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    min="0" max="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gomb áttetszőség (%)</label>
                                <input
                                    type="number"
                                    value=${opacity}
                                    onChange=${(e) => setOpacity(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    min="0" max="100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Szegély vastagság</label>
                                <input
                                    type="number"
                                    value=${borderWidth}
                                    onChange=${(e) => setBorderWidth(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    min="0" max="20"
                                />
                            </div>
                            <div className=${borderWidth > 0 ? '' : 'opacity-50 pointer-events-none'}>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Szegély színe</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value=${borderColor}
                                        onChange=${(e) => setBorderColor(e.target.value)}
                                        className="h-10 w-full rounded cursor-pointer border-0 p-0"
                                    />
                                </div>
                            </div>
                            <div className=${borderWidth > 0 ? '' : 'opacity-50 pointer-events-none'}>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Szegély áttetszőség</label>
                                <input
                                    type="number"
                                    value=${borderOpacity}
                                    onChange=${(e) => setBorderOpacity(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    min="0" max="100"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Előnézet:</label>
                        <div className="p-4 bg-gray-50 rounded-lg flex justify-center items-center border border-gray-200 border-dashed overflow-hidden min-h-[100px]"
                             style=${{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
                            <a href="#" onClick=${e=>e.preventDefault()} style=${{ 
                                display: 'inline-block', 
                                padding: `${paddingV}px ${paddingH}px`, 
                                backgroundColor: bgColor, 
                                color: textColor, 
                                textDecoration: 'none', 
                                borderRadius: `${borderRadius}px`, 
                                fontWeight: fontWeight,
                                fontSize: `${fontSize}px`,
                                border: `${borderWidth}px solid rgba(${hexToRgbStr(borderColor)}, ${borderOpacity / 100})`,
                                opacity: opacity / 100
                            }}>
                                ${text}
                            </a>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100 mt-4 pb-2">
                        <button type="button" onClick=${onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors">
                            Mégse
                        </button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold transition-colors shadow-sm">
                            ${initialData ? 'Módosítások mentése' : 'Beszúrás'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
};

const EmailTemplatesTab = () => {
    const [templates, setTemplates] = useState({});
    const [activeTemplateId, setActiveTemplateId] = useState('registrationConfirmation');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [subject, setSubject] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [isEnabled, setIsEnabled] = useState(true);
    const [doctorEmail, setDoctorEmail] = useState('');
    
    // Test Email Modal state
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [savedSubject, setSavedSubject] = useState('');
    const [savedHtmlContent, setSavedHtmlContent] = useState('');
    const [savedDoctorEmail, setSavedDoctorEmail] = useState('');
    
    // Drag and Drop state
    const [templateOrder, setTemplateOrder] = useState(null); // { categoryName: [templateId1, templateId2] }
    const [draggedItem, setDraggedItem] = useState(null); // { category, index, id }
    const [draggedOverItem, setDraggedOverItem] = useState(null); // { category, index }

    // Custom Button Modal state
    const [isButtonModalOpen, setIsButtonModalOpen] = useState(false);
    const [buttonModalData, setButtonModalData] = useState(null); // Új state a szerkesztett gomb adatainak
    const [editingNode, setEditingNode] = useState(null); // Reference to the DOM node being edited
    
    // Dynamic variables state
    const [dynamicVariables, setDynamicVariables] = useState([]);

    const showToast = useToast();
    const showConfirmation = useConfirmation();
    const editorRef = useRef(null);
    const editorContainerRef = useRef(null);

    // 1. Betöltjük a külső TinyMCE library-t dinamikusan, ha még nincs
    useEffect(() => {
        if (!window.tinymce) {
            const script = document.createElement('script');
            script.src = "https://cdn.tiny.cloud/1/ntihde9iskk6k7ukxpdwv61q6nnmdfglug52dfl3xln8839j/tinymce/6/tinymce.min.js";
            document.head.appendChild(script);

            script.onload = loadTemplates;
        } else {
            loadTemplates();
        }
        
        // Cleanup function tinymce-re
        return () => {
            if (window.tinymce) {
                window.tinymce.remove();
            }
        };
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
            setDoctorEmail(mergedTemplates[activeTemplateId].doctorEmail || '');
            setIsEnabled(mergedTemplates[activeTemplateId].enabled);
            
            // Set saved state tracking
            setSavedSubject(mergedTemplates[activeTemplateId].subject);
            setSavedHtmlContent(mergedTemplates[activeTemplateId].html);
            setSavedDoctorEmail(mergedTemplates[activeTemplateId].doctorEmail || '');

        } catch (error) {
            console.error("Error loading templates:", error);
            showToast("Nem sikerült betölteni az e-mail sablonokat (valószínűleg jogosultsági hiba). Alapértelmezett betöltése.", "warning");
            
            // Biztonsági fallback hiba esetén
            setTemplates({...DEFAULT_TEMPLATES});
            setSubject(DEFAULT_TEMPLATES[activeTemplateId].subject);
            setHtmlContent(DEFAULT_TEMPLATES[activeTemplateId].html);
            setDoctorEmail(DEFAULT_TEMPLATES[activeTemplateId].doctorEmail || '');
            setIsEnabled(DEFAULT_TEMPLATES[activeTemplateId].enabled !== false);
        } finally {
            setIsLoading(false);
        }
    };

    // 3. TinyMCE editor inicializálása vagy tartalmának frissítése amikor váltunk a sablonok között
    useEffect(() => {
        if (isLoading || !window.tinymce || !editorContainerRef.current) return;

        let editorInstance = null;
        
        // Adjunk a containernek egy id-t, ha még nincs
        if (!editorContainerRef.current.id) {
            editorContainerRef.current.id = 'tinymce-editor-' + Math.random().toString(36).substr(2, 9);
        }

        // Ha már van létező editor ezen az ID-n, ne inicializáljuk újra
        const existingEditor = window.tinymce.get(editorContainerRef.current.id);
        
        if (!existingEditor) {
            window.tinymce.init({
                target: editorContainerRef.current,
                height: 400,
                menubar: false,
                plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                toolbar_mode: 'wrap', // Ne tegye a gombokat három pont (...) mögé, hanem törje új sorba
                toolbar: 'undo redo | blocks fontfamily fontsizeinput | ' +
                    'bold italic underline strikethrough forecolor backcolor | alignleft aligncenter ' +
                    'alignright alignjustify | lineheight | bullist numlist outdent indent | ' +
                    'table hr | removeformat | customInsertButton | code help',
                font_family_formats: 'Alapértelmezett Sans (Eszközfüggő)=sans-serif; Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva',
                font_size_formats: '8px 10px 11px 12px 14px 16px 18px 24px 36px',
                line_height_formats: '1.0 1.2 1.4 1.5 1.6 2.0',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                convert_urls: false,
                relative_urls: false,
                remove_script_host: false,
                setup: (editor) => {
                    editorInstance = editor;
                    
                    // Közös logika a gomb adatainak kinyerésére a DOM-ból
                    const extractButtonData = (anchorNode) => {
                                // Megpróbáljuk kinyerni a stílusokat
                                const computedStyle = editor.dom.getStyle(anchorNode, 'background-color', true) || editor.dom.getStyle(anchorNode, 'background-color');
                                let bgColorHex = '#d9534f';
                                // Nagyon egyszerű rgb to hex konverter (TinyMCE rgb-t vagy rgba-t ad vissza)
                                if (computedStyle && computedStyle.startsWith('rgb')) {
                                     const rgb = computedStyle.match(/[\d.]+/g);
                                     if(rgb && rgb.length >= 3) {
                                         bgColorHex = "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
                                     }
                                }

                                const colorStyle = editor.dom.getStyle(anchorNode, 'color', true) || editor.dom.getStyle(anchorNode, 'color');
                                let textColorHex = '#ffffff';
                                if (colorStyle && colorStyle.startsWith('rgb')) {
                                     const rgb = colorStyle.match(/[\d.]+/g);
                                     if(rgb && rgb.length >= 3) {
                                         textColorHex = "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
                                     }
                                }
                                
                                // Padding
                                const pT = parseInt(editor.dom.getStyle(anchorNode, 'padding-top') || 12);
                                const pL = parseInt(editor.dom.getStyle(anchorNode, 'padding-left') || 24);
                                
                                // Border radius
                                const br = parseInt(editor.dom.getStyle(anchorNode, 'border-radius') || 6);

                                // Border width, color, and opacity
                                const bw = parseInt(editor.dom.getStyle(anchorNode, 'border-width') || 0);
                                let borderColorHex = '#000000';
                                let borderOp = 100;
                                const bcStyle = editor.dom.getStyle(anchorNode, 'border-color');
                                if (bcStyle && bcStyle.startsWith('rgb')) {
                                    const rgb = bcStyle.match(/[\d.]+/g);
                                    if(rgb && rgb.length >= 3) {
                                         borderColorHex = "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
                                    }
                                    if(rgb && rgb.length >= 4) {
                                         borderOp = Math.round(parseFloat(rgb[3]) * 100);
                                    }
                                }

                                // Font size & weight
                                const fs = parseInt(editor.dom.getStyle(anchorNode, 'font-size') || 16);
                                const fw = editor.dom.getStyle(anchorNode, 'font-weight') === 'bold' || parseInt(editor.dom.getStyle(anchorNode, 'font-weight')) > 400 ? 'bold' : 'normal';

                                // Opacity
                                const op = parseFloat(editor.dom.getStyle(anchorNode, 'opacity') || 1);

                                return {
                                    url: anchorNode.getAttribute('href') || '',
                                    text: anchorNode.innerText || '',
                                    bgColor: bgColorHex,
                                    textColor: textColorHex,
                                    paddingV: pT,
                                    paddingH: pL,
                                    borderRadius: br,
                                    borderWidth: bw,
                                    borderColor: borderColorHex,
                                    borderOpacity: borderOp,
                                    fontSize: fs,
                                    fontWeight: fw,
                                    opacity: Math.round(op * 100)
                                };
                    };
                    
                    // Custom Button plugin - Toolbar gomb
                    editor.ui.registry.addButton('customInsertButton', {
                        text: 'Gomb beszúrása / szerkesztése',
                        icon: 'plus',
                        tooltip: 'Gomb beszúrása vagy meglévő szerkesztése',
                        onAction: () => {
                            const node = editor.selection.getNode();
                            const anchorNode = node.nodeName === 'A' ? node : node.closest('a');
                            const isButton = anchorNode && editor.dom.getStyle(anchorNode, 'display') === 'inline-block';
                            
                            if (isButton) {
                                // Meglévő gomb szerkesztése
                                const buttonData = extractButtonData(anchorNode);
                                document.dispatchEvent(new CustomEvent('openInsertButtonModal', { 
                                    detail: { action: 'edit', data: buttonData, node: anchorNode } 
                                }));
                            } else {
                                // Új gomb beszúrása
                                document.dispatchEvent(new CustomEvent('openInsertButtonModal', { detail: { action: 'insert' } }));
                            }
                        }
                    });

                    // Custom Button - Kontextus menü (Jobb klikk)
                    editor.ui.registry.addMenuItem('editCustomButton', {
                        text: 'Gomb szerkesztése',
                        icon: 'edit-block',
                        onAction: () => {
                            const node = editor.selection.getNode();
                            const anchorNode = node.nodeName === 'A' ? node : node.closest('a');
                            
                            if (anchorNode) {
                                const buttonData = extractButtonData(anchorNode);
                                document.dispatchEvent(new CustomEvent('openInsertButtonModal', { 
                                    detail: { action: 'edit', data: buttonData, node: anchorNode } 
                                }));
                            }
                        }
                    });

                    // Csak akkor mutatjuk a kontextus menüt, ha gombon állunk
                    editor.ui.registry.addContextMenu('editCustomButton', {
                        update: (element) => {
                            // Ellenőrizzük, hogy link-e, és gomb-szerű kinézete van-e (display: inline-block)
                            const isButton = element.nodeName === 'A' && editor.dom.getStyle(element, 'display') === 'inline-block';
                            const parentIsButton = element.closest('a') && editor.dom.getStyle(element.closest('a'), 'display') === 'inline-block';
                            
                            return (isButton || parentIsButton) ? 'editCustomButton' : '';
                        }
                    });

                    // Tartalom változás figyelése
                    editor.on('Change KeyUp', () => {
                        const content = editor.getContent();
                        setHtmlContent(content);
                    });

                    // Kezdeti tartalom beállítása, ha az editor már kész
                    editor.on('init', () => {
                        editor.setContent(htmlContent);
                    });
                }
            });
            
            // Mivel a editorRef egy generic ref volt az editorhoz, 
            // most ide mentjük el, hogy a handleInsertButton elhívhassa
            editorRef.current = 'tinymce'; 
        } else if (existingEditor.getContent() !== htmlContent && existingEditor.initialized) {
            // Update tartalmat, ha megváltozott (pl. sablon váltás)
            // de csak akkor, ha nem ő maga triggerelte (hogy ne legyen kurzor ugrálás)
            // Itt most egyszerűsítve:
            existingEditor.setContent(htmlContent);
        }

        // Event listener a modális megnyitásához a TinyMCEből
        const handleOpenModal = (e) => {
            if (e.detail && e.detail.action === 'edit') {
                setButtonModalData(e.detail.data);
                setEditingNode(e.detail.node);
            } else {
                setButtonModalData(null);
                setEditingNode(null);
            }
            setIsButtonModalOpen(true);
        };
        
        document.addEventListener('openInsertButtonModal', handleOpenModal);

        return () => {
            document.removeEventListener('openInsertButtonModal', handleOpenModal);
        };

    }, [isLoading, activeTemplateId]); // Itt kivettük a htmlContent-et a dependencykből, hogy gépeléskor ne frissüljön újra

    // Kigyűjtjük az összes dinamikus változót a betöltött sablonokból
    useEffect(() => {
        if (isLoading || Object.keys(templates).length === 0) return;

        const variableSet = new Set();
        const variableRegex = /\{\{([\s\S]*?)\}\}/g;

        Object.values(templates).forEach(tpl => {
            if (!tpl) return;
            const contentToScan = (tpl.html || '') + ' ' + (tpl.subject || '');
            let match;
            while ((match = variableRegex.exec(contentToScan)) !== null) {
                // Megtisztítjuk a HTML tagektől és szóközöktől (ugyanaz a logika, mint a utils.js-ben)
                const varName = match[1].replace(/<[^>]*>?/gm, '').trim();
                if (varName && varName.length > 0) {
                    variableSet.add(varName);
                }
            }
        });

        const sortedVariables = Array.from(variableSet).sort();
        setDynamicVariables(sortedVariables);
    }, [templates, isLoading]);

    // Gomb beszúrása VAGY meglévő frissítése a TinyMCE-ben
    const handleInsertButton = (data) => {
        if (!editorContainerRef.current || !editorContainerRef.current.id) return;
        const editor = window.tinymce.get(editorContainerRef.current.id);
        if (!editor) return;

        const borderStyle = data.borderWidth > 0 ? `border: ${data.borderWidth}px solid ${data.borderColor};` : '';
        
        // Ha meglévő gombot szerkesztünk (és a DOM node még létezik)
        if (editingNode && editor.dom.isChildOf(editingNode, editor.getBody())) {
            editor.dom.setAttribs(editingNode, {
                href: data.url,
                target: '_blank',
                style: `display: inline-block; padding: ${data.paddingV}px ${data.paddingH}px; background-color: ${data.bgColor}; color: ${data.textColor}; text-decoration: none; border-radius: ${data.borderRadius}px; font-weight: ${data.fontWeight}; font-size: ${data.fontSize}px; margin: 15px 0; opacity: ${data.opacity / 100}; ${borderStyle}`
            });
            editingNode.innerText = data.text;
            
            // Frissítjük a state-et
            setHtmlContent(editor.getContent());
        } else {
            // Új gomb beszúrása
            const buttonHtml = `<a href="${data.url}" target="_blank" style="display: inline-block; padding: ${data.paddingV}px ${data.paddingH}px; background-color: ${data.bgColor}; color: ${data.textColor}; text-decoration: none; border-radius: ${data.borderRadius}px; font-weight: ${data.fontWeight}; font-size: ${data.fontSize}px; margin: 15px 0; opacity: ${data.opacity / 100}; ${borderStyle}">${data.text}</a>&nbsp;`;
            editor.insertContent(buttonHtml);
        }
        
        // Reset state
        setEditingNode(null);
        setButtonModalData(null);
    };

    const handleTemplateSelect = (templateId) => {
        setActiveTemplateId(templateId);
        setSubject(templates[templateId].subject);
        setHtmlContent(templates[templateId].html);
        setDoctorEmail(templates[templateId].doctorEmail || '');
        setIsEnabled(templates[templateId].enabled !== false);
        setSavedSubject(templates[templateId].subject);
        setSavedHtmlContent(templates[templateId].html);
        setSavedDoctorEmail(templates[templateId].doctorEmail || '');
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
                    doctorEmail: doctorEmail,
                    enabled: isEnabled
                }
            }));
            
            // Frissítjük a mentett állapotot
            setSavedSubject(subject);
            setSavedHtmlContent(htmlContent);
            setSavedDoctorEmail(doctorEmail);

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
                setDoctorEmail(defaultTpl.doctorEmail || '');
                
                if (editorContainerRef.current && editorContainerRef.current.id) {
                    const editor = window.tinymce.get(editorContainerRef.current.id);
                    if (editor) {
                        editor.setContent(defaultTpl.html);
                    }
                }
                
                try {
                    await setDoc(doc(db, "email_templates", activeTemplateId), {
                        subject: defaultTpl.subject,
                        html: defaultTpl.html,
                        doctorEmail: defaultTpl.doctorEmail || '',
                        name: defaultTpl.name,
                        enabled: isEnabled, // Keep current enabled state
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                    setSavedSubject(defaultTpl.subject);
                    setSavedHtmlContent(defaultTpl.html);
                    setSavedDoctorEmail(defaultTpl.doctorEmail || '');
                    showToast("Alapértelmezett sablon visszaállítva.", "success");
                } catch (e) {
                    console.error(e);
                }
            }
        });
    };

    const handleOpenTestModal = () => {
        const hasUnsavedChanges = subject !== savedSubject || htmlContent !== savedHtmlContent || doctorEmail !== savedDoctorEmail;
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
        // Mivel az onDragOver is ezt teszi, itt csak ellenőrzünk
        if (draggedOverItem && draggedOverItem.category === category && draggedOverItem.index === index) {
            return;
        }
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
                                    
                                    // Itt rajzoljuk felülre a vonalat, ha épp efölé húzzák az egeret
                                    const isDraggedOver = draggedOverItem && draggedOverItem.category === category && draggedOverItem.index === index;
                                    
                                    // Ha van egy áthúzott elem, ami ráadásul a mi kategóriánkban van, és az index azonos:
                                    const dropIndicatorClass = isDraggedOver ? 'border-t-2 border-t-indigo-500' : 'border-t-2 border-t-transparent';

                                    return html`
                                        <li
                                            key=${key}
                                            draggable="true"
                                            onDragStart=${(e) => handleDragStart(e, category, index, key)}
                                            onDragOver=${(e) => handleDragOver(e, category, index)}
                                            onDragEnter=${(e) => handleDragEnter(e, category, index)}
                                            onDragEnd=${handleDragEnd}
                                            onDrop=${(e) => handleDrop(e, category, index)}
                                            className=${`cursor-move transition-all ${dropIndicatorClass}`}
                                            style=${{ marginTop: isDraggedOver ? '0' : '0' }}
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
                                    `;
                                })}

                                ${/* Ez az eldobási zóna a lista legvégére (ha utolsónak akarjuk bedobni) */''}
                                <li
                                    onDragOver=${(e) => handleDragOver(e, category, templateOrder[category].length)}
                                    onDragEnter=${(e) => handleDragEnter(e, category, templateOrder[category].length)}
                                    onDrop=${(e) => handleDrop(e, category, templateOrder[category].length)}
                                    className=${`h-2 w-full transition-all ${draggedOverItem && draggedOverItem.category === category && draggedOverItem.index === templateOrder[category].length ? 'border-t-2 border-t-indigo-500' : 'border-t-2 border-t-transparent'}`}
                                ></li>
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
                        <p className="mb-3">A szövegben lévő dupla kapcsos zárójelek közötti szavakat a rendszer küldéskor automatikusan kicseréli a tanuló adataira. Kattints egy változóra a másoláshoz, majd illeszd be a szövegbe!</p>
                        <div className="flex flex-wrap gap-2">
                            ${dynamicVariables.map(variable => html`
                                <span 
                                    key=${variable} 
                                    className="inline-block bg-white px-2 py-1 rounded border border-blue-300 text-xs font-mono cursor-pointer hover:bg-blue-100 transition-colors"
                                    onClick=${() => {
                                        navigator.clipboard.writeText('{{' + variable + '}}');
                                        showToast('Másolva: {{' + variable + '}}', 'success');
                                    }}
                                    title="Kattints a másoláshoz"
                                >
                                    {{${variable}}}
                                </span>
                            `)}
                            ${dynamicVariables.length === 0 ? html`<span className="text-xs italic">Nincsenek elérhető változók.</span>` : null}
                        </div>
                    </div>

                    ${activeTemplateId === 'doctorMedicalReminder' ? html`
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Orvos e-mail címe (Címzett)</label>
                            <input 
                                type="email" 
                                value=${doctorEmail}
                                onChange=${(e) => setDoctorEmail(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-medium p-2 border"
                                disabled=${!isEnabled}
                                placeholder="dr.valaki@example.com"
                            />
                        </div>
                    ` : null}

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
            <${InsertButtonModal}
                isOpen=${isButtonModalOpen}
                onClose=${() => {
                    setIsButtonModalOpen(false);
                    setButtonModalData(null);
                    setEditingNode(null);
                }}
                onInsert=${handleInsertButton}
                initialData=${buttonModalData}
            />
        </div>
    `;
};

export default EmailTemplatesTab;
