import { html } from '../../UI.js';
import * as Icons from '../../Icons.js';
import { useToast } from '../../context/AppContext.js';
import { functions, httpsCallable } from '../../firebase.js';

const React = window.React;
const { useState, useEffect, useMemo, Fragment } = React;

const TestEmailModal = ({ templateId, savedTemplate, isOpen, onClose }) => {
    const [testData, setTestData] = useState({});
    const [isSending, setIsSending] = useState(false);
    const showToast = useToast();

    // Szövegből kinyerjük az összes {{valtozo}} típusú mezőt
    const variables = useMemo(() => {
        if (!savedTemplate) return [];
        
        const extractVariables = (text) => {
            if (!text) return [];
            const regex = /\{\{([\w.]+)\}\}/g;
            const matches = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push(match[1]);
            }
            return matches;
        };

        const subjectVars = extractVariables(savedTemplate.subject);
        const htmlVars = extractVariables(savedTemplate.html);
        
        // Csak az egyedi változókat tartjuk meg
        return [...new Set([...subjectVars, ...htmlVars])];
    }, [savedTemplate]);

    // Modal megnyitásakor inicializáljuk a testData state-et üres stringekkel
    useEffect(() => {
        if (isOpen && variables.length > 0) {
            const initialData = {};
            variables.forEach(v => {
                initialData[v] = '';
            });
            setTestData(initialData);
        } else if (isOpen && variables.length === 0) {
            setTestData({}); // Ha nincsenek változók
        }
    }, [isOpen, variables]);

    const handleInputChange = (e, variableName) => {
        setTestData(prev => ({
            ...prev,
            [variableName]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Biztos ami biztos, ellenőrizzük, hogy minden kötelező mező ki van-e töltve
        // Kivétel: a secondName (második keresztnév) nem kötelező, mert sokaknak nincs.
        const missingVars = variables.filter(v => v !== 'secondName' && (!testData[v] || testData[v].trim() === ''));
        if (missingVars.length > 0) {
            showToast('Kérjük, tölts ki minden kötelező változóhoz tartozó mezőt (a 2. keresztnév opcionális)!', 'warning');
            return;
        }

        setIsSending(true);
        try {
            const sendTestEmail = httpsCallable(functions, 'sendTestEmail');
            await sendTestEmail({
                templateId,
                testData
            });
            
            showToast('Teszt e-mail sikeresen elküldve!', 'success');
            onClose();
        } catch (error) {
            console.error('Hiba a teszt e-mail küldésekor:', error);
            showToast(`Hiba történt a küldés során: ${error.message || 'Ismeretlen hiba'}`, 'error');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return html`
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick=${onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                     role="dialog" aria-modal="true" aria-labelledby="modal-headline" onClick=${e => e.stopPropagation()}>
                    
                    <form onSubmit=${handleSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <${Icons.SendIcon} size=${24} className="text-blue-600" />
                                </div>
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                                        Teszt e-mail küldése
                                    </h3>
                                    
                                    <div className="mt-4 mb-6 bg-blue-50 p-3 rounded-md border border-blue-100 flex items-start gap-3">
                                        <${Icons.InfoIcon} size=${20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800">
                                            A teszt e-mail a központi <strong>iroda@mosolyzona.hu</strong> címre fog megérkezni.<br/>
                                            A tárgy mező a <strong>[TESZT SABLON]</strong> előtaggal fog kiegészülni.
                                        </div>
                                    </div>

                                    ${variables.length > 0 ? html`
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 mb-4">
                                                A sablonban található alábbi változóknak kérlek adj meg egy teszt értéket:
                                            </p>
                                            
                                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                                ${variables.map(v => html`
                                                    <div key=${v}>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            {{${v}}} ${v === 'secondName' ? '(Opcionális)' : ''}
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            required=${v !== 'secondName'}
                                                            value=${testData[v] || ''}
                                                            onChange=${(e) => handleInputChange(e, v)}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                            placeholder=${`Teszt érték: ${v}`}
                                                        />
                                                    </div>
                                                `)}
                                            </div>
                                        </div>
                                    ` : html`
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Ez a sablon nem tartalmaz dinamikus változókat. Kattints a Küldés gombra a teszteléshez.
                                            </p>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
                            <button 
                                type="submit" 
                                disabled=${isSending}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                ${isSending ? html`Küldés folyamatban...` : html`
                                    <${Icons.SendIcon} size=${16} /> Teszt küldése
                                `}
                            </button>
                            <button 
                                type="button" 
                                onClick=${onClose}
                                disabled=${isSending}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            >
                                Mégse
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
};

export default TestEmailModal;
