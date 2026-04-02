/**
 * js/idopont.js
 * Entry point for the student appointment booking page.
 */

import { html, LoadingOverlay } from './UI.js';
import { db, collection, onSnapshot, query, where, auth, signInAnonymously, onAuthStateChanged, functions, httpsCallable } from './firebase.js';
import Icons from './Icons.js';

const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useMemo, useRef, Fragment } = React;

// Simple Toast component since we don't have AppContext wrapper here by default
const Toast = ({ message, type, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(handleClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 240);
    };

    const bgClass = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : type === 'success' ? 'bg-green-500' : 'bg-gray-800';

    return html`
        <div className=${`fixed bottom-4 right-4 z-50 ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}`}>
            <div className=${`${bgClass} text-white px-6 py-3 rounded shadow-lg flex items-center gap-3`}>
                <span className="font-semibold">${message}</span>
                <button onClick=${handleClose} className="text-white hover:text-gray-200">
                    <${Icons.XIcon} size=${16} />
                </button>
            </div>
        </div>
    `;
};

const CheckoutModal = ({ cart, onClose, onBook, isTestView, onRemoveItem }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [emailConfirm, setEmailConfirm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [results, setResults] = useState(null);
    const [step, setStep] = useState(1); // For 2-step wizard on mobile
    const [isClosing, setIsClosing] = useState(false);
    const contentRef = useRef(null);

    // Desktop layout logic updates: skip summary list on desktop. On mobile, show wizard if 3 or more items.
    const isDesktop = window.innerWidth >= 1024;
    const isMobile = window.innerWidth < 640;
    const needsWizard = isMobile;

    // Determine what to render based on wizard step and view mode
    const showSummaryList = isDesktop ? false : (!needsWizard || step === 1);
    const showForm = isDesktop ? true : (!needsWizard || step === 2);

    const handleStepChange = (newStep) => {
        setStep(newStep);
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    const handleClose = (resultsToPass) => {
        setIsClosing(true);
        setTimeout(() => onClose(resultsToPass), 240);
    };

    const handleRemoveItem = (courseId) => {
        if (cart.length === 1 && onRemoveItem) {
            // Trigger exit animation if this is the last item
            setIsClosing(true);
            setTimeout(() => {
                onRemoveItem(courseId);
            }, 240);
        } else if (onRemoveItem) {
            onRemoveItem(courseId);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setHasAttemptedSubmit(true);

        if (!firstName || !lastName || !email || !emailConfirm) {
            // Nem adunk globális hibát, az inline validáció kezeli
            return;
        }

        if (email !== emailConfirm) {
            // E-mail egyezés hibáját továbbra is inline jelezzük majd
            return;
        }

        setIsSubmitting(true);
        const currentResults = { success: [], errors: [] };

        for (const item of cart) {
            try {
                await onBook({
                    courseId: item.course.id,
                    firstName,
                    lastName,
                    email,
                    isTestView,
                    isWaitlist: item.isWaitlist
                });
                currentResults.success.push(item);
            } catch (err) {
                console.error("Booking error for course:", item.course.id, err);
                currentResults.errors.push({ item, error: err.message || 'Hiba történt a jelentkezés során.' });
            }
        }

        setResults(currentResults);
        setIsSubmitting(false);
    };

    // --- Helper for rendering action buttons in the persistent footer ---
    const renderFooter = () => {
        if (results) {
            return html`
                <div className="p-4 border-t border-gray-100 bg-white rounded-b-[1.5rem] flex justify-end shrink-0">
                    <button 
                        onClick=${() => handleClose(results)}
                        className="px-6 py-2 bg-[#e09900] lg:hover:bg-[#c98900] text-white rounded-xl font-bold transition-all shadow-md lg:active:scale-95 text-sm"
                    >
                        Bezárás
                    </button>
                </div>
            `;
        }

        if (showSummaryList && needsWizard && step === 1) {
            return html`
                <div className="p-4 border-t border-gray-100 bg-white rounded-b-[1.5rem] flex justify-end shrink-0">
                    <button
                        key="btn-next"
                        onClick=${() => handleStepChange(2)}
                        className="px-6 py-2.5 bg-[#e09900] lg:hover:bg-[#c98900] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md lg:active:scale-95 text-sm"
                    >
                        <span>Tovább</span>
                    </button>
                </div>
            `;
        }

        if (showForm) {
            return html`
                <div className="p-4 border-t border-gray-100 bg-white rounded-b-[1.5rem] flex justify-between items-center shrink-0">
                    ${needsWizard && step === 2 && !results ? html`
                        <button
                            key="btn-back"
                            type="button"
                            onClick=${() => handleStepChange(1)}
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors lg:active:scale-95 text-sm"
                        >
                            <span>Vissza</span>
                        </button>
                    ` : html`<div key="btn-back-placeholder"></div>`}
                    <button
                        key="btn-submit"
                        onClick=${handleSubmit}
                        disabled=${isSubmitting}
                        className="px-6 py-2.5 bg-[#e09900] lg:hover:bg-[#c98900] text-white rounded-xl font-bold disabled:opacity-70 disabled:hover:bg-[#e09900] flex items-center justify-center gap-2 shadow-md lg:active:scale-95 text-sm"
                    >
                        ${isSubmitting ? html`<span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span> <span>Feldolgozás...</span>` : html`<span>Véglegesítés</span>`}
                    </button>
                </div>
            `;
        }
        return null;
    };

    return html`
        <div className=${`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto font-[Poppins] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick=${() => {
            // Prevent closing by clicking outside if the user is actively filling out the form (Step 2)
            if (showForm && !results) return;
            handleClose(results || undefined);
        }}>
            <div className=${`bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] w-full max-w-sm sm:max-w-md my-auto flex flex-col overscroll-none ${isClosing ? 'animate-fade-out' : 'animate-scale-in'} overflow-hidden h-[540px] sm:h-[480px]`} onClick=${e => e.stopPropagation()}>
                <header className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-200 flex justify-between items-center bg-[#efefef] rounded-t-[1.5rem] shrink-0">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-[#333333] flex items-center gap-2">
                            ${!results && html`<${Icons.DocumentIcon} size=${18} className="text-[#e09900] shrink-0" />`}
                            ${results ? 'Összegzés' : 'Jelentkezés véglegesítése'}
                        </h3>
                    </div>
                    <button onClick=${() => handleClose(results || undefined)} className="text-gray-500 hover:text-gray-800 p-1.5 rounded-full hover:bg-gray-200 transition-colors -mr-1">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </header>
                
                <main ref=${contentRef} className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    ${results ? html`
                        <div className="space-y-4">
                            ${results.success.length > 0 ? html`
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
                                        <div className="bg-[#e09900] text-white rounded-full p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>
                                        Sikeres jelentkezés (${results.success.length} db)
                                    </h4>
                                    <ul className="space-y-2">
                                        ${results.success.map(s => html`
                                            <li key=${s.course.id} className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-start gap-2 shadow-sm text-sm">
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-800">${s.course.name}</div>
                                                    <div className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                                                        <${Icons.CalendarIcon} size=${12} className="text-[#888888]"/>
                                                        ${s.course.date.replace(/-/g, '. ')}.
                                                    </div>
                                                </div>
                                            </li>
                                        `)}
                                    </ul>
                                    <div className="mt-4 text-xs text-gray-600 border-t border-gray-200 pt-3 bg-white p-3 rounded-lg flex items-start gap-2">
                                        <div className="text-[#ea9f21] shrink-0 mt-0.5"><${Icons.InfoIcon} size=${16} /></div>
                                        <div>
                                            <p className="mb-1">A foglalásokról (tételenként) visszaigazoló e-maileket fogsz kapni hamarosan.</p>
                                            <p className="font-semibold text-gray-800">Kérjük, ellenőrizd a Spam és Promóciók mappákat is!</p>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${results.errors.length > 0 ? html`
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
                                        <div className="bg-[#888888] text-white rounded-full p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>
                                        Sikertelen (${results.errors.length} db)
                                    </h4>
                                    <ul className="space-y-2">
                                        ${results.errors.map(e => html`
                                            <li key=${e.item.course.id} className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-start gap-2 shadow-sm text-sm">
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-800">${e.item.course.name}</div>
                                                    <div className="text-[#ea9f21] text-xs mt-0.5 font-medium flex items-start gap-1">
                                                        <div className="shrink-0 mt-0.5"><${Icons.AlertTriangleIcon} size=${12} /></div>
                                                        <span>${e.error}</span>
                                                    </div>
                                                </div>
                                            </li>
                                        `)}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    ` : html`
                        ${showSummaryList && html`
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Kiválasztott időpontok (${cart.length})</p>
                                <ul className="space-y-2">
                                    ${cart.map((item, index) => html`
                                        <li key=${index} className="bg-gray-50 p-2.5 sm:py-1.5 sm:px-2.5 rounded border border-gray-200 flex justify-between items-center gap-3 sm:gap-2 transition-all hover:border-[#e09900]">
                                            <div className="flex-1 min-w-0 leading-tight">
                                                <span className="font-bold text-gray-800 text-[14px] sm:text-[12px] break-words">${item.course.name} ${item.isWaitlist ? html`<span className="text-[9px] uppercase tracking-wide font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full ml-1.5 align-middle border border-orange-100 whitespace-nowrap">Várólista</span>` : ''}</span>
                                                <div className="text-gray-500 mt-1 sm:mt-0.5 flex items-center gap-1.5 sm:gap-1 text-[12px] sm:text-[10px]">
                                                    <div className="sm:hidden"><${Icons.CalendarIcon} size=${12} className="text-[#888888]" /></div>
                                                    <div className="hidden sm:block"><${Icons.CalendarIcon} size=${10} className="text-[#888888]" /></div>
                                                    <span>${item.course.date.replace(/-/g, '. ')}. <span className="font-semibold text-[#333333] ml-1">${item.course.startTime} - ${item.course.endTime}</span></span>
                                                </div>
                                            </div>
                                            ${onRemoveItem ? html`
                                                <button
                                                    type="button"
                                                    onClick=${() => handleRemoveItem(item.course.id)}
                                                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md p-2 sm:p-1 transition-colors shrink-0"
                                                    title="Eltávolítás"
                                                >
                                                    <div className="sm:hidden"><${Icons.XIcon} size=${16} /></div>
                                                    <div className="hidden sm:block"><${Icons.XIcon} size=${14} /></div>
                                                </button>
                                            ` : ''}
                                        </li>
                                    `)}
                                </ul>
                            </div>
                        `}

                        ${showForm && html`
                            <div>
                                ${error ? html`<div className="mb-3 p-2 bg-orange-50 border border-orange-200 text-orange-900 rounded-lg text-xs font-medium flex items-center gap-1.5"><${Icons.AlertTriangleIcon} size=${14} className="shrink-0 text-[#ea9f21]" /><span>${error}</span></div>` : ''}

                                <form id="checkout-form" onSubmit=${handleSubmit} className="space-y-4" noValidate>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Vezetéknév</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value=${lastName}
                                                    onChange=${e => setLastName(e.target.value)}
                                                    className=${`w-full px-3 py-2.5 bg-gray-50 border text-gray-900 rounded-xl focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-base ${hasAttemptedSubmit && !lastName ? 'border-[#ea9f21] pr-10' : 'border-gray-200'}`}
                                                    placeholder="Kovács"
                                                />
                                                ${hasAttemptedSubmit && !lastName && html`
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                        <div className="w-5 h-5 bg-[#ea9f21] rounded-full flex items-center justify-center text-white font-bold text-xs">!</div>
                                                    </div>
                                                `}
                                            </div>
                                            ${hasAttemptedSubmit && !lastName && html`
                                                <p className="mt-1 ml-1 text-xs text-[#ea9f21] font-semibold">A mező kitöltése kötelező!</p>
                                            `}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Keresztnév</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value=${firstName}
                                                    onChange=${e => setFirstName(e.target.value)}
                                                    className=${`w-full px-3 py-2.5 bg-gray-50 border text-gray-900 rounded-xl focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-base ${hasAttemptedSubmit && !firstName ? 'border-[#ea9f21] pr-10' : 'border-gray-200'}`}
                                                    placeholder="János"
                                                />
                                                ${hasAttemptedSubmit && !firstName && html`
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                        <div className="w-5 h-5 bg-[#ea9f21] rounded-full flex items-center justify-center text-white font-bold text-xs">!</div>
                                                    </div>
                                                `}
                                            </div>
                                            ${hasAttemptedSubmit && !firstName && html`
                                                <p className="mt-1 ml-1 text-xs text-[#ea9f21] font-semibold">A mező kitöltése kötelező!</p>
                                            `}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">E-mail cím</label>
                                        <div className="relative">
                                            <input 
                                                type="email"
                                                value=${email}
                                                onChange=${e => setEmail(e.target.value)}
                                                className=${`w-full px-3 py-2.5 bg-gray-50 border text-gray-900 rounded-xl focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-base ${hasAttemptedSubmit && !email ? 'border-[#ea9f21] pr-10' : 'border-gray-200'}`}
                                                placeholder="pelda@email.hu"
                                            />
                                            ${hasAttemptedSubmit && !email && html`
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <div className="w-5 h-5 bg-[#ea9f21] rounded-full flex items-center justify-center text-white font-bold text-xs">!</div>
                                                </div>
                                            `}
                                        </div>
                                        ${hasAttemptedSubmit && !email && html`
                                            <p className="mt-1 ml-1 text-xs text-[#ea9f21] font-semibold">A mező kitöltése kötelező!</p>
                                        `}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">E-mail cím megerősítése</label>
                                        <div className="relative">
                                            <input 
                                                type="email"
                                                value=${emailConfirm}
                                                onChange=${e => setEmailConfirm(e.target.value)}
                                                className=${`w-full px-3 py-2.5 bg-gray-50 border text-gray-900 rounded-xl focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-base ${(hasAttemptedSubmit && !emailConfirm) || (hasAttemptedSubmit && email && emailConfirm && email !== emailConfirm) ? 'border-[#ea9f21] pr-10' : 'border-gray-200'}`}
                                                placeholder="pelda@email.hu"
                                            />
                                            ${((hasAttemptedSubmit && !emailConfirm) || (hasAttemptedSubmit && email && emailConfirm && email !== emailConfirm)) && html`
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <div className="w-5 h-5 bg-[#ea9f21] rounded-full flex items-center justify-center text-white font-bold text-xs">!</div>
                                                </div>
                                            `}
                                        </div>
                                        ${hasAttemptedSubmit && !emailConfirm && html`
                                            <p className="mt-1 ml-1 text-xs text-[#ea9f21] font-semibold">A mező kitöltése kötelező!</p>
                                        `}
                                        ${hasAttemptedSubmit && email && emailConfirm && email !== emailConfirm && html`
                                            <p className="mt-1 ml-1 text-xs text-[#ea9f21] font-semibold">A két e-mail cím nem egyezik!</p>
                                        `}
                                    </div>
                                    <button type="submit" className="hidden" />
                                </form>
                            </div>
                        `}
                    `}
                </main>
                ${renderFooter()}
            </div>
        </div>
    `;
};

// ... More code to be appended ...

// --- Helper Functions ---

// Get the Monday of the week for a given date string (YYYY-MM-DD)
function getWeekKey(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    // In JS, 0 is Sunday, 1 is Monday...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    
    // Format to YYYY-MM-DD
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}

// Format week key to display name (e.g. "Március 23. - Március 29.")
function formatWeekName(weekKey) {
    const monday = new Date(weekKey);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const months = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
    
    const startStr = `${months[monday.getMonth()]} ${monday.getDate()}.`;
    const endStr = `${months[sunday.getMonth()]} ${sunday.getDate()}.`;
    return `${startStr} – ${endStr}`;
}

// Format day name
function getDayName(dateStr) {
    const d = new Date(dateStr);
    const days = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
    return `${days[d.getDay()]} • ${dateStr.replace(/-/g, '. ')}.`;
}



const InfoModal = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('kresz');
    const [isClosing, setIsClosing] = useState(false);
    const contentRef = useRef(null);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 240);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    return html`
        <div className=${`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] overflow-y-auto font-[Poppins] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick=${handleClose}>
            <div className=${`bg-white rounded-[1.5rem] shadow-2xl w-full max-w-2xl my-8 flex flex-col overscroll-none ${isClosing ? 'animate-fade-out' : 'animate-scale-in'} overflow-hidden`} onClick=${e => e.stopPropagation()}>
                
                <header className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-200 flex justify-between items-center bg-[#efefef] rounded-t-[1.5rem] shrink-0">
                    <h3 className="text-base font-bold text-[#333333] flex items-center gap-2">
                        <div className="bg-[#ea9f21] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-serif italic">i</div>
                        Hasznos tudnivalók
                    </h3>
                    <button onClick=${handleClose} className="text-gray-500 hover:text-gray-800 p-1.5 rounded-full hover:bg-gray-200 transition-colors -mr-1">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </header>

                <div className="flex bg-gray-50 border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0" style=${{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <button 
                        onClick=${() => handleTabChange('kresz')}
                        className=${`flex-1 min-w-[120px] py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'kresz' ? 'border-[#e09900] text-[#e09900] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        Tantermi KRESZ
                    </button>
                    <button 
                        onClick=${() => handleTabChange('firstaid')}
                        className=${`flex-1 min-w-[120px] py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'firstaid' ? 'border-[#e09900] text-[#e09900] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        Elsősegély
                    </button>
                    <button 
                        onClick=${() => handleTabChange('medical')}
                        className=${`flex-1 min-w-[120px] py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'medical' ? 'border-[#e09900] text-[#e09900] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        Orvosi
                    </button>
                </div>

                <main ref=${contentRef} className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white rounded-b-[1.5rem] max-h-[60vh]">
                    
                    ${activeTab === 'kresz' && html`
                        <div className="space-y-6 text-sm text-gray-700 leading-relaxed animate-tab-fade-in" key="kresz">
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">Tantermi képzéseink – Rugalmasan, ahogy neked a legjobb!</h4>
                                <p className="mb-4 text-base sm:text-sm text-gray-600">Autósiskolánk folyamatosan szervez tantermi képzéseket, amelyeken Pető Attila, azaz a Kreszprofesszor segít téged a sikeres felkészülésben.</p>
                                
                                <h5 className="text-lg font-bold text-gray-800 mb-2">Miért jó ez neked?</h5>
                                
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="font-bold text-gray-900 flex items-center gap-2 mb-1"><${Icons.CheckCircle} size=${18} className="text-[#ea9f21]" /> Rugalmas időpontok:</div>
                                        <p className="mb-2 text-base sm:text-sm text-gray-600">Képzéseink reggel és este is indulnak, így te döntöd el, mikor szeretnél részt venni.</p>
                                        <div className="text-[#e09900] font-medium flex gap-2 items-start"><${Icons.ChevronRightIcon} size=${18} className="shrink-0 mt-0.5" /> <span className="text-base sm:text-sm">Járhatsz akár reggeli, akár esti alkalmakra – sőt, ezt akár hetente is variálhatod, ahogy neked a legjobban megfelel!</span></div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="font-bold text-gray-900 flex items-center gap-2 mb-1"><${Icons.CheckCircle} size=${18} className="text-[#ea9f21]" /> Szabad modulválasztás:</div>
                                        <p className="mb-2 text-base sm:text-sm text-gray-600">Oktatásunk modulrendszerű, így bármikor csatlakozhatsz, és a modulokat tetszőleges sorrendben hallgathatod meg.</p>
                                        <div className="text-[#e09900] font-medium flex gap-2 items-start"><${Icons.ChevronRightIcon} size=${18} className="shrink-0 mt-0.5" /> <span className="text-base sm:text-sm">Nincs előre meghatározott sorrend – te állítod össze a saját tanrendeted!</span></div>
                                    </div>
                                    
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <div className="font-bold text-red-800 flex items-center gap-2 mb-1"><${Icons.AlertTriangleIcon} size=${18} className="text-red-600" /> Fontos!</div>
                                        <p className="text-red-800 font-medium text-base sm:text-sm">Arra figyelj, hogy ugyanazt a modult nem érdemes kétszer elvégezni, mert minden alkalommal ugyanazt az anyagot ismételjük.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="font-medium text-gray-800 bg-orange-50 p-3 border-l-4 border-[#e09900] rounded-r-lg flex items-start gap-3">
                                <${Icons.CalendarIcon} size=${20} className="text-[#e09900] shrink-0 mt-0.5" />
                                <span className="text-base sm:text-sm">Tanulj a saját időbeosztásod szerint, válaszd ki, mikor szeretnél jönni, és számíthatsz ránk, hogy végigkísérünk a sikeres vizsgáig!</span>
                            </div>

                            <p className="text-gray-600 italic border border-gray-200 p-4 rounded-xl text-base sm:text-sm">
                                Nem találsz számodra megfelelő tantermi időpontot? Semmi gond! A tanórákat végig is nézheted Pető Attila, a Kreszprofesszor előadásában a YouTube-on, teljesen ingyenesen. <a href="https://www.youtube.com/@KRESZTV" target="_blank" className="text-[#e09900] font-bold underline flex items-center gap-1 inline-flex mt-1"><${Icons.ChevronRightIcon} size=${16} /> KRESZ TV</a>
                            </p>

                            <hr className="border-gray-200" />

                            <h4 className="text-lg font-bold text-gray-900 mb-4">Modulok felépítése</h4>
                            
                            <ul className="space-y-4 text-base sm:text-sm">
                                <li className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <div className="font-bold text-[#e09900] mb-2 border-b border-gray-100 pb-2">1. modul – Tanfolyamtájékoztató, alapozó foglalkozás</div>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-1">
                                        <li>Általános információk a képzés menetéről</li>
                                        <li>Vezetéselmélet: emberi tényezők</li>
                                        <li>Érzékelés: látás, figyelem</li>
                                        <li>A vezető munkatere: ülés, tükrök beállítása</li>
                                        <li>Alapvető műszaki információk a járműről</li>
                                        <li>KRESZ-alapok, fogalmak, közúti jelzések</li>
                                    </ul>
                                </li>
                                <li className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <div className="font-bold text-[#e09900] mb-2 border-b border-gray-100 pb-2">2. modul – KRESZ, haladás közben</div>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-1">
                                        <li>Elindulás, megállás, várakozás</li>
                                        <li>Haladás az úton: jobbratartás, egyirányú út, osztottpályás út</li>
                                        <li>Párhuzamos közlekedés, villamos sínen közlekedés</li>
                                        <li>Kitérés, kikerülés, előzés</li>
                                        <li>Megfordulás, hátramenet</li>
                                    </ul>
                                </li>
                                <li className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <div className="font-bold text-[#e09900] mb-2 border-b border-gray-100 pb-2">3. modul – KRESZ, manőverezések</div>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-1">
                                        <li>A járművezetés személyi és tárgyi feltételei</li>
                                        <li>Személyszállítás, teherszállítás szabályai</li>
                                        <li>Műszaki hiba, vontatás</li>
                                        <li>Irányváltoztatás, körforgalom, kanyarodó főútvonal</li>
                                        <li>Követési távolság, féktávolság, vasúti átjáró</li>
                                        <li>Autópálya, autóút, lakó-pihenő övezet</li>
                                        <li>Megkülönböztető és figyelmeztető jelzések</li>
                                    </ul>
                                </li>
                                <li className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <div className="font-bold text-[#e09900] mb-2 border-b border-gray-100 pb-2">4. modul – KRESZ, útkereszteződések</div>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-1">
                                        <li>Elsőbbségadás szabályai, sorrend a kereszteződésekben</li>
                                        <li>Villamos és gyalogos elsőbbsége</li>
                                        <li>Lámpák és rendőri forgalomirányítás jelzései</li>
                                    </ul>
                                </li>
                                <li className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <div className="font-bold text-[#e09900] mb-2 border-b border-gray-100 pb-2">Konzultáció</div>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600 ml-1">
                                        <li>Hasznos tippek a sikeres vizsgához</li>
                                        <li>KRESZ: gyalogosként, kerékpárral, egyéb járművekkel közlekedve</li>
                                        <li>Összefoglalás, ismétlés, gyakorlás</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    `}

                    ${activeTab === 'firstaid' && html`
                        <div className="space-y-6 text-sm text-gray-700 leading-relaxed animate-tab-fade-in" key="firstaid">
                            
                            <div className="bg-orange-50 border border-[#e09900] p-4 rounded-xl text-orange-900">
                                <h4 className="font-bold text-lg mb-1 flex items-center gap-2">Fontos tudnivaló a jogosítvány átvételéhez</h4>
                                <p className="text-base sm:text-sm">A jogosítványod átvételének egyik feltétele, hogy rendelkezz érvényes és sikeres közúti elsősegélynyújtó vizsgával.</p>
                            </div>

                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">E-learning – a tandíj része</h4>
                                <p className="mb-2 text-base sm:text-sm text-gray-600">A tanfolyamon való részvétel nem kötelező, de minden tanulónk számára biztosítunk egy e-learninges felkészítőt, amely a tandíjban benne van. <strong>Ezért külön nem kell fizetned.</strong></p>
                                <p className="text-base sm:text-sm text-gray-600">Az e-learning segít felkészülni az elsősegélynyújtó vizsgára saját tempódban, kényelmesen.</p>
                            </div>

                            <hr className="border-gray-200" />

                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">Gyakorlati felkészítés</h4>
                                <p className="mb-3 text-gray-600 italic text-base sm:text-sm">...ha magabiztosan szeretnél vizsgázni!</p>
                                <p className="mb-4 text-base sm:text-sm text-gray-600">Rendszeresen tartunk gyakorlati foglalkozásokat, ahol személyesen is át tudjuk nézni a legfontosabb vizsgatémákat:</p>
                                
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 text-base sm:text-sm">
                                    <li className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg"><${Icons.CheckCircle} size=${18} className="text-[#ea9f21]" /> Betegvizsgálat</li>
                                    <li className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg"><${Icons.CheckCircle} size=${18} className="text-[#ea9f21]" /> Újraélesztés (BLS)</li>
                                    <li className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg"><${Icons.CheckCircle} size=${18} className="text-[#ea9f21]" /> Stabil oldalfektetés</li>
                                    <li className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg"><${Icons.CheckCircle} size=${18} className="text-[#ea9f21]" /> Műfogások</li>
                                    <li className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg"><${Icons.CheckCircle} size=${18} className="text-[#ea9f21]" /> Sebellátás, kötözések</li>
                                </ul>

                                <p className="font-bold text-gray-800 mb-4 bg-gray-100 p-3 rounded-lg border-l-4 border-gray-400 flex items-start gap-3">
                                    <${Icons.CheckCircle} size=${20} className="text-gray-500 shrink-0 mt-0.5" />
                                    <span className="text-base sm:text-sm">És természetesen válaszolunk az e-learninggel kapcsolatos kérdéseidre is.</span>
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm text-center flex flex-col items-center">
                                        <div className="mb-2 text-[#888888]"><${Icons.CalendarIcon} size=${24} /></div>
                                        <div className="font-bold text-gray-900">Mikor?</div>
                                        <div className="text-gray-600 text-sm mt-1">Háromhetente,<br/>péntekenként<br/>16:30-tól 20:30-ig</div>
                                    </div>
                                    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm text-center flex flex-col items-center">
                                        <div className="mb-2 text-[#888888]"><${Icons.InfoIcon} size=${24} /></div>
                                        <div className="font-bold text-gray-900">Helyszín</div>
                                        <div className="text-gray-600 text-sm mt-2">Az autósiskola<br/>tanterme</div>
                                    </div>
                                    <div className="bg-[#e09900] text-white p-4 rounded-xl shadow-md text-center flex flex-col justify-center items-center">
                                        <div className="mb-2"><${Icons.CreditCardIcon} size=${24} /></div>
                                        <div className="font-bold">Részvételi díj</div>
                                        <div className="text-xl font-extrabold mt-1">12.000 Ft</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}

                    ${activeTab === 'medical' && html`
                        <div className="space-y-6 text-sm text-gray-700 leading-relaxed animate-tab-fade-in" key="medical">
                            <h4 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Orvosi alkalmassági vizsgálat – Gyorsan, kényelmesen!</h4>
                            
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <${Icons.ChevronRightIcon} size=${20} className="text-[#ea9f21] mt-0.5 shrink-0" />
                                    <p className="font-medium text-gray-800 text-base">Nincs sorban állás, a vizsgálatot gyorsan és kényelmesen el tudod végezni.</p>
                                </div>
                                
                                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <${Icons.ChevronRightIcon} size=${20} className="text-[#ea9f21] mt-0.5 shrink-0" />
                                    <p className="text-gray-700 text-base sm:text-sm">Akár egyéb vizsgálatok nélkül is elvégezhető, de ez <strong>mindig az orvos helyszíni döntésétől függ.</strong></p>
                                </div>
                                
                                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <${Icons.DocumentIcon} size=${20} className="text-[#888888] mt-0.5 shrink-0" />
                                    <p className="text-gray-700 text-base sm:text-sm">Az orvosi alkalmassági véleményt rövid időn belül, a vizsgálatot követően kézhez kapod.</p>
                                </div>
                            </div>

                            <div className="mt-8 bg-orange-50 p-6 rounded-2xl border border-[#e09900] shadow-sm">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center shadow-sm shrink-0 text-[#ea9f21]">
                                        <${Icons.CreditCardIcon} size=${32} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-orange-900 text-lg mb-1 text-center sm:text-left">A vizsgálat díja: 10.000 Ft</h5>
                                        <p className="text-orange-800 text-center sm:text-left text-base sm:text-sm">A díjat a helyszínen tudsz befizetni, <strong>kizárólag készpénzben.</strong></p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 bg-red-50 p-4 rounded-xl border-l-4 border-red-500 text-red-800 font-medium flex items-start gap-3">
                                <${Icons.ClockIcon} size=${20} className="mt-0.5 shrink-0" />
                                <p className="text-base sm:text-sm"><strong>Fontos!</strong> Kérjük, hogy a vizsgálatra legkésőbb 17:00-ig érkezz meg.</p>
                            </div>
                        </div>
                    `}
                </main>
            </div>
        </div>
    `;
};

const StudentAppointmentsApp = () => {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [collapsedWeeks, setCollapsedWeeks] = useState({});
    
    // Carts & UI state
    const [cart, setCart] = useState([]); // Array of { course, isWaitlist }
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [cartBump, setCartBump] = useState(false);
    const [quickBookItem, setQuickBookItem] = useState(null); // For instant booking Orvosi/Elsosegely
    const [toast, setToast] = useState(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isMobileFilterModalOpen, setIsMobileFilterModalOpen] = useState(false);
    
    useEffect(() => {
        // Csak mobilon alkalmazzuk a scroll lock-ot, asztali nézetben felesleges (és elrontja a görgetősávot)
        if (window.innerWidth >= 1024) return;

        if (isCheckoutOpen || isInfoModalOpen || isMobileFilterModalOpen) {
            // Apply scroll locking without changing position fixed, as that causes iOS Safari bottom bar to jump up
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none'; // Prevents pull-to-refresh
            document.documentElement.style.overscrollBehavior = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
            document.documentElement.style.overscrollBehavior = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
            document.documentElement.style.overscrollBehavior = '';
        };
    }, [isCheckoutOpen, isInfoModalOpen, isMobileFilterModalOpen]);

    
    // Category Tabs: 'kresz', 'medical', 'firstaid'
    

    // Advanced filtering state for Desktop (where tabs are replaced by filters)
    const [selectedCategories, setSelectedCategories] = useState({
        consultation: false,
        medical: false,
        firstaid: false
    });
    const [selectedModules, setSelectedModules] = useState({
        mod1: false,
        mod2: false,
        mod3: false,
        mod4: false
    });
    const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'am', 'pm'
    const [isFilterExpanded, setIsFilterExpanded] = useState(window.innerWidth >= 1024);
    
    // Temporary state for Mobile Filter Modal (deferred filtering)
    const [tempSelectedCategories, setTempSelectedCategories] = useState({
        consultation: false,
        medical: false,
        firstaid: false
    });
    const [tempSelectedModules, setTempSelectedModules] = useState({
        mod1: false,
        mod2: false,
        mod3: false,
        mod4: false
    });
    const [tempTimeFilter, setTempTimeFilter] = useState('all');
    const [isMobileFilterClosing, setIsMobileFilterClosing] = useState(false);

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    const isAnyFilterActive = useMemo(() => {
        return selectedCategories.consultation || selectedCategories.medical || selectedCategories.firstaid ||
               selectedModules.mod1 || selectedModules.mod2 || selectedModules.mod3 || selectedModules.mod4 ||
               timeFilter !== 'all';
    }, [selectedCategories, selectedModules, timeFilter]);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const urlParams = new URLSearchParams(window.location.search);
    const isTestView = urlParams.get('test') === 'true';

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // 1. Setup Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (!user) {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Auth error:", error);
                showToast("Hiba a hitelesítés során.", "error");
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch active courses
    useEffect(() => {
        if (!isAuthReady) return;

        const collectionName = isTestView ? 'courses_test' : 'courses';
        const todayStr = new Date().toISOString().split('T')[0];
        
        const q = query(
            collection(db, collectionName),
            where('date', '>=', todayStr)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            let coursesData = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                let isPastStartTime = false;

                if (data.date && data.startTime) {
                    const dateParts = data.date.split('-');
                    const timeParts = data.startTime.split(':');
                    if (dateParts.length === 3 && timeParts.length === 2) {
                        const courseStartDateTime = new Date(
                            parseInt(dateParts[0]),
                            parseInt(dateParts[1]) - 1,
                            parseInt(dateParts[2]),
                            parseInt(timeParts[0]),
                            parseInt(timeParts[1])
                        );
                        if (now > courseStartDateTime) {
                            isPastStartTime = true;
                        }
                    }
                }

                if (!isPastStartTime) {
                    coursesData.push({ id: doc.id, ...data });
                }
            });
            
            coursesData.sort((a, b) => {
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                if (a.startTime < b.startTime) return -1;
                if (a.startTime > b.startTime) return 1;
                return 0;
            });
            
            setCourses(coursesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching courses:", error);
            showToast("Nem sikerült betölteni az időpontokat.", "error");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isAuthReady, isTestView]);

    const handleBookAppointment = async (bookingData) => {
        try {
            if (bookingData.isWaitlist) {
                const joinWaitlistFn = httpsCallable(functions, 'joinWaitlist');
                return await joinWaitlistFn(bookingData);
            } else {
                const bookAppointmentFn = httpsCallable(functions, 'bookAppointment');
                return await bookAppointmentFn(bookingData);
            }
        } catch (error) {
            console.error("Error during booking:", error);
            let msg = error.message;
            if (msg.includes('already registered')) msg = 'Ezzel az e-mail címmel már jelentkeztél erre a foglalkozásra!';
            if (msg.includes('is full')) msg = 'Sajnos ez a foglalkozás időközben betelt.';
            throw new Error(msg);
        }
    };
    
    // Cart management
    const addToCart = (course, isWaitlist = false) => {
        if (!cart.find(item => item.course.id === course.id)) {
            setCart([...cart, { course, isWaitlist }]);
            
            // Trigger animation
            setCartBump(true);
            setTimeout(() => setCartBump(false), 300);
        }
    };

    const removeFromCart = (courseId) => {
        const newCart = cart.filter(item => item.course.id !== courseId);
        setCart(newCart);
        if (newCart.length === 0) setIsCheckoutOpen(false);
    };

    const handleCheckoutClose = (results) => {
        setIsCheckoutOpen(false);
        setQuickBookItem(null); // Clear quick book if it was open
        if (results && results.success) {
            const successfulIds = results.success.map(s => s.course.id);
            setCart(prevCart => prevCart.filter(item => !successfulIds.includes(item.course.id)));
        }
    };

    // Quick Book for Orvosi/FirstAid
    const openQuickBook = (course, isWaitlist = false) => {
        setQuickBookItem([{ course, isWaitlist }]);
        setIsCheckoutOpen(true);
    };

    // 3. Prepare data and filter based on device view
    const { kreszWeeks, medicalCourses, firstAidCourses, desktopWeeks } = useMemo(() => {
        const medical = [];
        const firstAid = [];
        const kresz = [];

        const desktopFilteredCourses = [];

        courses.forEach(c => {
            const isMedical = c.name === "Orvosi alkalmassági vizsgálat";
            const isFirstAid = c.name === "Elsősegély tanfolyam";
            const isConsultation = c.name.toLowerCase().includes("konzultáció");
            const isModule = !isMedical && !isFirstAid && !isConsultation;

            // Base categorizations for Mobile (Tabs)
            if (isMedical) medical.push(c);
            else if (isFirstAid) firstAid.push(c);
            else kresz.push(c);

            // Filtering for Desktop (Unified list)
            let matchesTime = true;
            if (timeFilter !== 'all') {
                const hour = parseInt(c.startTime.split(':')[0], 10);
                if (timeFilter === 'am' && hour >= 12) matchesTime = false;
                if (timeFilter === 'pm' && hour < 12) matchesTime = false;
            }

            if (matchesTime) {
                const noFiltersActive =
                    !selectedCategories.medical &&
                    !selectedCategories.firstaid &&
                    !selectedCategories.consultation &&
                    !selectedModules.mod1 &&
                    !selectedModules.mod2 &&
                    !selectedModules.mod3 &&
                    !selectedModules.mod4;

                if (noFiltersActive) {
                    desktopFilteredCourses.push(c);
                } else {
                    if (isMedical && selectedCategories.medical) desktopFilteredCourses.push(c);
                    else if (isFirstAid && selectedCategories.firstaid) desktopFilteredCourses.push(c);
                    else if (isConsultation && selectedCategories.consultation) desktopFilteredCourses.push(c);
                    else if (isModule) {
                        const name = c.name.toLowerCase();
                        // Make filtering more robust by checking multiple common naming patterns for modules
                        const isMod1 = name.includes('1. ') || name.includes('1.modul') || name.includes('első') || name.includes('1. nap');
                        const isMod2 = name.includes('2. ') || name.includes('2.modul') || name.includes('második') || name.includes('2. nap');
                        const isMod3 = name.includes('3. ') || name.includes('3.modul') || name.includes('harmadik') || name.includes('3. nap');
                        const isMod4 = name.includes('4. ') || name.includes('4.modul') || name.includes('negyedik') || name.includes('4. nap');

                        if (
                            (isMod1 && selectedModules.mod1) ||
                            (isMod2 && selectedModules.mod2) ||
                            (isMod3 && selectedModules.mod3) ||
                            (isMod4 && selectedModules.mod4)
                        ) {
                            desktopFilteredCourses.push(c);
                        }
                    }
                }
            }
        });

        // Group KRESZ by week (Mobile)
        const weeksMap = {};
        kresz.forEach(c => {
            const wKey = getWeekKey(c.date);
            if (!weeksMap[wKey]) {
                weeksMap[wKey] = { weekKey: wKey, name: formatWeekName(wKey), days: {} };
            }
            if (!weeksMap[wKey].days[c.date]) {
                weeksMap[wKey].days[c.date] = [];
            }
            weeksMap[wKey].days[c.date].push(c);
        });
        const sortedWeeks = Object.values(weeksMap).sort((a, b) => a.weekKey.localeCompare(b.weekKey));

        // Group ALL filtered courses by week (Desktop)
        const desktopWeeksMap = {};
        desktopFilteredCourses.forEach(c => {
            const wKey = getWeekKey(c.date);
            if (!desktopWeeksMap[wKey]) {
                desktopWeeksMap[wKey] = { weekKey: wKey, name: formatWeekName(wKey), days: {} };
            }
            if (!desktopWeeksMap[wKey].days[c.date]) {
                desktopWeeksMap[wKey].days[c.date] = [];
            }
            desktopWeeksMap[wKey].days[c.date].push(c);
        });
        const desktopSortedWeeks = Object.values(desktopWeeksMap).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
        
        return {
            kreszWeeks: sortedWeeks,
            medicalCourses: medical,
            firstAidCourses: firstAid,
            desktopWeeks: desktopSortedWeeks
        };
    }, [courses, timeFilter, selectedCategories, selectedModules]);

    const openMobileFilterModal = () => {
        // Init temp state with current state
        setTempSelectedCategories({ ...selectedCategories });
        setTempSelectedModules({ ...selectedModules });
        setTempTimeFilter(timeFilter);
        setIsMobileFilterModalOpen(true);
    };

    const closeMobileFilterModal = () => {
        setIsMobileFilterClosing(true);
        setTimeout(() => {
            setIsMobileFilterModalOpen(false);
            setIsMobileFilterClosing(false); // Reset state for next time
        }, 240);
    };

    const applyMobileFilters = () => {
        setSelectedCategories({ ...tempSelectedCategories });
        setSelectedModules({ ...tempSelectedModules });
        setTimeFilter(tempTimeFilter);
        closeMobileFilterModal();
    };

    const clearMobileFilters = () => {
        setTempSelectedCategories({ consultation: false, medical: false, firstaid: false });
        setTempSelectedModules({ mod1: false, mod2: false, mod3: false, mod4: false });
        setTempTimeFilter('all');
        setSelectedCategories({ consultation: false, medical: false, firstaid: false });
        setSelectedModules({ mod1: false, mod2: false, mod3: false, mod4: false });
        setTimeFilter('all');
        closeMobileFilterModal();
    };

    // Render Helpers
    const renderCourseCard = (course, isQuickBook = false) => {
        const isFull = course.bookingsCount >= course.capacity;
        const availableSeats = course.capacity - (course.bookingsCount || 0);
                const cartItem = cart.find(item => item.course.id === course.id);
        const isInCart = !!cartItem;
        const isWaitlistInCart = cartItem && cartItem.isWaitlist;

        const isMedical = course.name === "Orvosi alkalmassági vizsgálat";
        const isFirstAid = course.name === "Elsősegély tanfolyam";

        let buttonArea = null;

        if (isInCart) {
            buttonArea = html`
                <button 
                    onClick=${() => removeFromCart(course.id)}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#e09900] lg:active:scale-95 transition-transform"
                >
                    Mégse kérem
                </button>
            `;
        } else if (isFull) {
            if (isFirstAid) {
                buttonArea = html`
                    <span className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 sm:py-2 border border-gray-200 rounded-md text-xs font-medium text-[#888888] bg-[#efefef] cursor-not-allowed">
                        Betelt
                    </span>
                `;
            } else {
                buttonArea = html`
                    <button 
                        onClick=${() => isQuickBook ? openQuickBook(course, true) : addToCart(course, true)}
                        className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 transition-colors lg:active:scale-95"
                    >
                        <${Icons.ClockIcon} size=${14} className="text-[#e09900]" />
                        Várólistára jelentkezés
                    </button>
                `;
            }
        } else {
            buttonArea = html`
                <button 
                    onClick=${() => isQuickBook ? openQuickBook(course, false) : addToCart(course, false)}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 sm:py-2 border border-transparent rounded-md shadow-sm text-xs font-bold text-[#e09900] bg-orange-50 hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#e09900] transition-colors lg:active:scale-95"
                >
                    ${isQuickBook ? 'Azonnali Jelentkezés' : 'Kiválasztom'}
                </button>
            `;
        }

        // A kártya csak akkor legyen elhalványítva (opacity-60), ha betelt, ÉS nincs lehetőség várólistára (pl. Elsősegély)
        const isCompletelyFull = isFull && isFirstAid;

        return html`
            <div key=${course.id} className=${`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 ${isInCart ? (isWaitlistInCart ? 'border-[#e09900] ring-1 ring-[#e09900] bg-orange-50/30' : 'border-[#e09900] ring-1 ring-[#e09900] bg-orange-50/10') : isFull ? 'border-gray-200 bg-gray-50/30' : 'border-gray-200'} ${isCompletelyFull ? 'opacity-60' : ''}`}>
                <div className="flex flex-col h-full justify-between gap-4">
                    <div>
                        <div className="flex justify-between items-start mb-2 gap-3">
                            <h4 className=${`font-extrabold text-[#333333] leading-tight pr-2 ${course.name.length > 25 ? 'text-[15px]' : 'text-lg'}`}>${course.name}</h4>
                            ${isInCart ? (isWaitlistInCart ? html`
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-[#c98900] border border-orange-100 shrink-0">Várólistán</span>
                            ` : html`
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-[#c98900] border border-orange-200 shrink-0">Kiválasztva</span>
                            `) : isFull ? html`
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-[#888888] border border-gray-200 shrink-0">Betelt</span>
                            ` : html`
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-[#333333] border border-gray-200 shrink-0">${availableSeats} hely</span>
                            `}
                        </div>

                        <div className="text-[#888888] font-semibold text-sm flex items-center gap-1.5 mb-2 mt-1">
                            <${Icons.ClockIcon} size=${16} className="text-[#888888]" />
                            <span>${course.startTime} - ${course.endTime}</span>
                        </div>

                        ${(isMedical || isFirstAid) && html`
                            <div className=${`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isCompletelyFull ? 'bg-gray-100 border border-gray-200 text-[#888888]' : 'bg-orange-50 border border-orange-100 text-[#c98900]'}`}>
                                <${Icons.CreditCardIcon} size=${14} className=${isCompletelyFull ? 'text-[#888888]' : 'text-[#c98900]'} />
                                ${isFirstAid ? 'Előre fizetős' : 'Fizetős'}
                            </div>
                        `}

                        ${isQuickBook && html`
                            <div className="text-sm font-medium text-[#888888] mt-2 flex items-center gap-1.5">
                                <${Icons.CalendarIcon} size=${16} />
                                ${course.date.replace(/-/g, '. ')}
                            </div>
                        `}
                    </div>
                    <div className="mt-auto pt-4 pb-1 border-t border-gray-100 bg-gray-50/50 -mx-5 px-5 rounded-b-xl flex items-center">
                        ${buttonArea}
                    </div>
                </div>
            </div>
        `;
    };

    if (!isAuthReady || isLoading) {
        return html`<${LoadingOverlay} text="Időpontok betöltése..." />`;
    }

    

    const toggleCategory = (cat) => {
        setSelectedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleWeek = (weekKey) => {
        setCollapsedWeeks(prev => ({
            ...prev,
            [weekKey]: !prev[weekKey]
        }));
    };

    return html`
        <div className="min-h-screen max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-[Poppins] [scrollbar-gutter:stable]">
            ${isTestView && html`
                <div className="bg-red-500 text-white text-center py-2 px-4 font-bold rounded-md mb-6 shadow flex items-center justify-center gap-2">
                    <${Icons.AlertTriangleIcon} size=${20} />
                    TESZT ÜZEMMÓD - Az adatok nem kerülnek mentésre az éles rendszerbe!
                </div>
            `}

            <header className="mb-12 text-center flex flex-col items-center">
                <img 
                    src="https://mosolyzona.hu/wp-content/uploads/2019/10/cropped-mosoly-1.jpg" 
                    alt="Mosolyzóna Logó" 
                    className="w-16 h-16 rounded-full mb-5 shadow-sm object-cover"
                />
                <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">Időpontfoglalás</h1>
                <p className="max-w-4xl mx-auto text-base sm:text-lg text-gray-500 px-4">
                    Szűrd ki a neked megfelelő időpontokat, és foglald le a helyed egyszerűen!
                </p>
            </header>

            <!-- Felső Szekció (Info Banners, Title, KRESZ TV) -->
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-y-8 gap-x-8 relative z-10 mb-6 lg:mb-8">
                
                <!-- Bal oldal (Span 2) -->
                <div className="lg:col-span-2 flex flex-col gap-8 w-full justify-end">
                    <!-- Info Banners -->
                    <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm flex items-start sm:items-center gap-4 cursor-pointer hover:bg-orange-100 transition-colors" onClick=${() => setIsInfoModalOpen(true)}>
                            <div className="bg-[#e09900] text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 shadow-md">
                                <span className="font-serif italic font-bold text-xl leading-none">i</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center min-h-[40px]">
                                <h3 className="text-orange-900 font-bold text-sm sm:text-base">Fontos tudnivalók jelentkezés előtt!</h3>
                                <p className="text-orange-800 text-xs sm:text-sm mt-0.5">Kattints ide a részletekért!</p>
                            </div>
                            <div className="hidden sm:block text-orange-400">
                                <${Icons.ChevronRightIcon} size=${24} />
                            </div>
                        </div>

                        <!-- Mobile only filter hint banner -->
                        <div className="lg:hidden bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick=${openMobileFilterModal}>
                            <div className="bg-[#888888] text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            </div>
                            <div className="flex-1 flex flex-col justify-center min-h-[40px]">
                                <p className="text-gray-700 text-sm font-medium">A bal alsó sarokban található ikonnal tudsz szűrni az időpontok között.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Title Area -->
                    <div className="flex items-center gap-2.5 pb-2 border-b-2 border-gray-100 shrink-0">
                        <div className="bg-[#e09900] text-white p-1.5 rounded-lg shadow-sm">
                            <${Icons.CalendarIcon} size=${20} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#333333]">Időpontok</h2>
                    </div>
                </div>

                <!-- Jobb oldal (Span 1) - KRESZ TV -->
                <div className="lg:col-span-1 w-full h-full relative flex flex-col justify-end hidden lg:flex">
                    <!-- KRESZ TV Banner (Desktop Only) - Not Sticky -->
                    <div className="w-full items-end">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm w-full">
                            <div className="flex items-center gap-2 mb-2">
                                <${Icons.PlayCircleIcon} size=${20} className="text-[#e09900]" />
                                <h3 className="font-bold text-[#333333] text-sm">KRESZ TV</h3>
                            </div>
                            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                                Nem találsz megfelelő időpontot? Nézd végig az előadásokat a KRESZ TV YouTube csatornáján!
                            </p>
                            <a
                                href="https://www.youtube.com/@KRESZTV"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full text-center px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#e09900] rounded-lg font-bold text-xs transition-colors border border-transparent"
                            >
                                Kattints ide!
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Alsó Szekció (Listák és Szűrő) -->
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-y-8 gap-x-8 relative z-10">

                <!-- Left Column (Span 2) -->
                <div className="lg:col-span-2 flex flex-col gap-8 w-full">
                    <!-- Main Content Area -->
                    <div className="flex flex-col gap-6">
                        <!-- Content Rendering (Unified) -->
                        <div className="space-y-8 min-h-[70vh] flex-1" key=${`desktop-list-${timeFilter}-${Object.values(selectedCategories).join('')}-${Object.values(selectedModules).join('')}`}>
                            ${(desktopWeeks.length > 0) && html`
                                <div className="space-y-8 animate-fade-in-up">
                                    ${desktopWeeks.map(week => html`
                                        <div key=${week.weekKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                                            <div 
                                                className="bg-gray-200 border-b border-gray-300 px-5 py-3.5 cursor-pointer flex justify-between items-center hover:bg-gray-300 transition-colors"
                                                onClick=${() => toggleWeek(week.weekKey)}
                                            >
                                                <h3 className="text-base sm:text-lg font-bold text-[#333333] flex items-center gap-2">
                                                    <${Icons.CalendarIcon} size=${18} className="text-[#333333]"/>
                                                    ${week.name}
                                                </h3>
                                                <span className=${`text-gray-500 transition-transform duration-300 ${collapsedWeeks[week.weekKey] ? '' : 'rotate-90'}`}>
                                                    <${Icons.ChevronRightIcon} size=${24} />
                                                </span>
                                            </div>
                                            <div className=${`grid transition-[grid-template-rows] duration-300 ease-in-out ${collapsedWeeks[week.weekKey] ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                                                <div className="overflow-hidden">
                                                    <div className="p-4 sm:p-5 space-y-5">
                                                        ${Object.keys(week.days).sort().map(dateStr => html`
                                                            <div key=${dateStr} className="border-l-4 border-[#ea9f21] pl-4 sm:pl-5">
                                                                <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">${getDayName(dateStr)}</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                                                                    ${week.days[dateStr].map(course => renderCourseCard(course, false))}
                                                                </div>
                                                            </div>
                                                        `)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `)}
                                </div>
                            `}

                            ${(desktopWeeks.length === 0) && html`
                                <div className="bg-white rounded-xl shadow p-8 sm:p-12 text-center border border-gray-100 animate-fade-in-up min-h-[300px] flex flex-col items-center justify-center gap-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                    </div>
                                    <p className="text-gray-500 text-base sm:text-lg max-w-md mx-auto">A megadott szűrési feltételekkel nincs meghirdetett időpont.</p>
                                    <button
                                        onClick=${() => {
                                            setSelectedCategories({ consultation: false, medical: false, firstaid: false });
                                            setSelectedModules({ mod1: false, mod2: false, mod3: false, mod4: false });
                                            setTimeFilter('all');
                                        }}
                                        className="mt-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-semibold transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <${Icons.XIcon} size=${16} /> Szűrések törlése
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Right Column (Span 1) -->
                <div className="lg:col-span-1 w-full h-full relative">
                    
                    ${html`
                    <!-- Sticky Sidebar Wrapper (Filter & Cart) -->
                    <div className="sticky top-6 flex flex-col gap-4 lg:max-h-[calc(100vh-3rem)]">
                        
                        <!-- Filter Panel -->
                        <div className="hidden lg:block bg-white shadow-lg sm:rounded-xl border border-gray-200 overflow-hidden shrink-0">
                            <div className=${`bg-gray-200 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-300 transition-colors ${isFilterExpanded ? 'border-b border-gray-300' : ''}`} onClick=${() => setIsFilterExpanded(!isFilterExpanded)}>
                                <h3 className="text-base font-bold text-[#333333] flex items-center gap-2">
                                    <${Icons.SearchIcon} size=${18} className="text-[#333333]" />
                                    Szűrés
                                </h3>
                                <div className="flex items-center gap-3">
                                    ${(() => {
                                        const isAnyFilterActive = selectedCategories.consultation || selectedCategories.medical || selectedCategories.firstaid || selectedModules.mod1 || selectedModules.mod2 || selectedModules.mod3 || selectedModules.mod4 || timeFilter !== 'all';
                                        return html`
                                            <button
                                                onClick=${(e) => {
                                                    e.stopPropagation();
                                                    if (!isAnyFilterActive) return;
                                                    setSelectedCategories({ consultation: false, medical: false, firstaid: false });
                                                    setSelectedModules({ mod1: false, mod2: false, mod3: false, mod4: false });
                                                    setTimeFilter('all');
                                                }}
                                                disabled=${!isAnyFilterActive}
                                                className=${`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full transition-colors ${isAnyFilterActive ? 'text-[#e09900] hover:text-[#c98900] bg-orange-50 hover:bg-orange-100' : 'text-[#888888] bg-[#efefef] cursor-not-allowed'}`}
                                                title="Összes szűrés törlése"
                                            >
                                                <span className=${`rounded-full p-0.5 ${isAnyFilterActive ? 'bg-orange-100 text-[#e09900]' : 'bg-transparent text-[#888888]'}`}><${Icons.XIcon} size=${12} /></span>
                                                Törlés
                                            </button>
                                        `;
                                    })()}
                                    <span className=${`text-[#888888] transition-transform duration-300 ${isFilterExpanded ? 'rotate-180' : ''}`}>
                                        <${Icons.ChevronRightIcon} size=${20} className="rotate-90" />
                                    </span>
                                </div>
                            </div>

                            <div className=${`grid transition-[grid-template-rows] duration-300 ease-in-out ${isFilterExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="p-4 bg-white">
                                        <div className="mb-3">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 transition-colors">Elméleti tanfolyam</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod1: !prev.mod1 }))} className=${`px-2.5 py-1 rounded-full text-xs font-medium border transition-all lg:active:scale-95 flex items-center gap-1.5 ${selectedModules.mod1 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                    1. modul
                                                </button>
                                                <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod2: !prev.mod2 }))} className=${`px-2.5 py-1 rounded-full text-xs font-medium border transition-all lg:active:scale-95 flex items-center gap-1.5 ${selectedModules.mod2 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                    2. modul
                                                </button>
                                                <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod3: !prev.mod3 }))} className=${`px-2.5 py-1 rounded-full text-xs font-medium border transition-all lg:active:scale-95 flex items-center gap-1.5 ${selectedModules.mod3 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                    3. modul
                                                </button>
                                                <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod4: !prev.mod4 }))} className=${`px-2.5 py-1 rounded-full text-xs font-medium border transition-all lg:active:scale-95 flex items-center gap-1.5 ${selectedModules.mod4 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                    4. modul
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-3 border-t border-gray-100 pt-3">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 transition-colors">Kiegészítő szolgáltatások</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <button onClick=${() => toggleCategory('consultation')} className=${`px-2.5 py-1 rounded-full text-xs font-medium border transition-all lg:active:scale-95 flex items-center gap-1.5 ${selectedCategories.consultation ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                    Konzultáció
                                                </button>
                                                <button onClick=${() => toggleCategory('medical')} className=${`px-2.5 py-1 rounded-full text-xs font-medium border transition-all lg:active:scale-95 flex items-center gap-1.5 ${selectedCategories.medical ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                    Orvosi
                                                </button>
                                                <button onClick=${() => toggleCategory('firstaid')} className=${`px-2.5 py-1 rounded-full text-xs font-medium border transition-all lg:active:scale-95 flex items-center gap-1.5 ${selectedCategories.firstaid ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                    Elsősegély
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 pt-4">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 transition-colors">Napszak</p>
                                            <div className="flex gap-1.5">
                                                <button onClick=${() => setTimeFilter('all')} className=${`flex-1 py-1.5 text-xs font-medium rounded-full transition-all border lg:active:scale-95 ${timeFilter === 'all' ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Mind</button>
                                                <button onClick=${() => setTimeFilter('am')} className=${`flex-1 py-1.5 text-xs font-medium rounded-full transition-all border lg:active:scale-95 ${timeFilter === 'am' ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Délelőtt</button>
                                                <button onClick=${() => setTimeFilter('pm')} className=${`flex-1 py-1.5 text-xs font-medium rounded-full transition-all border lg:active:scale-95 ${timeFilter === 'pm' ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Délután</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Cart Panel -->
                        <div className="hidden lg:flex bg-white shadow-lg sm:rounded-xl border border-gray-200 flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="bg-gray-200 px-4 py-3 flex justify-between items-center shrink-0 border-b border-gray-300">
                            <h3 className="text-base font-bold text-[#333333] flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                Kiválasztott időpontok
                            </h3>
                        </div>
                        <div className="p-4 flex flex-col flex-1 min-h-0 bg-white">
                        ${cart.length === 0 ? html`
                            <div className="text-gray-500 text-xs italic py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                Még nem választottál ki időpontot.<br/>Kattints a "Kiválasztom" gombra a hozzáadáshoz.
                            </div>
                        ` : html`
                            <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                                ${cart.map(item => html`
                                    <div key=${item.course.id} className="flex justify-between items-start p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-[#e09900] transition-colors">
                                        <div className="flex-1">
                                            <div className="font-semibold text-[#e09900] text-xs">
                                                ${item.course.name}
                                                ${item.isWaitlist ? html`<span className="ml-1.5 text-[10px] text-[#c98900] bg-orange-50 px-1 py-0.5 rounded border border-orange-200">Várólista</span>` : ''}
                                            </div>
                                            <div className="text-[11px] text-[#888888] mt-1 flex items-center gap-1">
                                                <${Icons.CalendarIcon} size=${10} className="text-[#888888]" />
                                                ${item.course.date.replace(/-/g, '. ')}. <span className="font-medium text-[#333333]">${item.course.startTime}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick=${() => removeFromCart(item.course.id)}
                                            className="ml-2 text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-200 rounded shadow-sm border border-gray-200 p-1 transition-colors"
                                            title="Eltávolítás"
                                        >
                                            <${Icons.XIcon} size=${12} />
                                        </button>
                                    </div>
                                `)}
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-200 shrink-0">
                                <button
                                    onClick=${() => setIsCheckoutOpen(true)}
                                    className="w-full flex justify-center items-center gap-1.5 py-2.5 px-3 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#e09900] lg:hover:bg-[#c98900] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e09900] transition-all hover:shadow-md"
                                >
                                    Véglegesítés (${cart.length})
                                </button>
                            </div>
                        `}
                        </div>
                        </div>
                    </div>
                    `}
                </div>
            </div>

            
            <!-- Floating Navigation Bar (Mobile) -->
            <div className="lg:hidden fixed z-40 bottom-6 left-0 right-0 px-4 sm:px-6 pb-[env(safe-area-bottom)] pointer-events-none flex justify-between items-center transition-all duration-300 gap-2">
                
                <!-- Filter Button -->
                <button 
                    onClick=${openMobileFilterModal}
                    className="relative pointer-events-auto bg-white text-gray-800 w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center transition-transform lg:hover:scale-105 lg:active:scale-95 border border-gray-200 shrink-0"
                    title="Szűrés és kategóriák"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#e09900]"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    ${isAnyFilterActive ? html`
                        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#e09900] border-2 border-white rounded-full shadow-sm"></span>
                    ` : ''}
                </button>

                <!-- Floating Pill Button (Véglegesítés) -->
                <div className=${`transition-all duration-300 flex-1 flex justify-center ${cart.length > 0 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none max-w-0 overflow-hidden'}`}>
                    <button 
                        onClick=${() => setIsCheckoutOpen(true)}
                        className="bg-[#e09900] lg:hover:bg-[#c98900] text-white pl-2 pr-4 sm:pr-6 py-3 rounded-full font-bold shadow-[0_10px_40px_rgba(224,153,0,0.3)] flex items-center gap-2 sm:gap-3 lg:active:scale-95 transition-all border border-[#c98900] backdrop-blur-md whitespace-nowrap"
                    >
                        <div className=${`bg-white text-[#e09900] w-10 h-10 flex items-center justify-center rounded-full font-black text-lg shadow-inner transition-transform duration-300 shrink-0 ${cartBump ? 'scale-125 bg-gray-100' : 'scale-100'}`}>
                            ${cart.length}
                        </div>
                        <div className="flex items-center gap-1.5 ml-1">
                            <span className="tracking-wide text-sm sm:text-base">Véglegesítés</span>
                        </div>
                    </button>
                </div>

                <!-- Info Button -->
                <button 
                    onClick=${() => setIsInfoModalOpen(true)}
                    className="pointer-events-auto bg-white lg:lg:hover:bg-orange-50 text-[#e09900] w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center transition-transform lg:hover:scale-105 lg:active:scale-95 border border-gray-200 shrink-0"
                    title="Fontos tudnivalók jelentkezés előtt"
                >
                    <span className="font-serif italic font-bold text-3xl leading-none">i</span>
                </button>
            </div>

            <!-- Spacer for the floating buttons so content isn't covered at the bottom -->
            <div className="lg:hidden h-24 pb-[env(safe-area-inset-bottom)]"></div>

            <!-- Floating Info Button for Desktop -->
            <div className="hidden lg:flex fixed z-40 right-6 bottom-6 pointer-events-none flex-col items-end gap-3 transition-all duration-300">
                <button 
                    onClick=${() => setIsInfoModalOpen(true)}
                    className="pointer-events-auto bg-[#ea9f21] lg:hover:bg-[#c98900] text-white w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center transition-transform lg:hover:scale-105 lg:active:scale-95 border border-[#ea9f21]"
                    title="Fontos tudnivalók jelentkezés előtt"
                >
                    <span className="font-serif italic font-bold text-3xl leading-none">i</span>
                </button>
            </div>

            <!-- Checkout Modal -->
            ${isCheckoutOpen && html`
                <${CheckoutModal} 
                    cart=${quickBookItem || cart} 
                    onClose=${handleCheckoutClose} 
                    onBook=${handleBookAppointment}
                    isTestView=${isTestView}
                    onRemoveItem=${quickBookItem ? null : removeFromCart}
                />
            `}

            ${isInfoModalOpen && html`<${InfoModal} onClose=${() => setIsInfoModalOpen(false)} />`}

            
            <!-- Mobile Filter Modal -->
            ${isMobileFilterModalOpen && html`
                <div className=${`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] font-[Poppins] ${isMobileFilterClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick=${closeMobileFilterModal}>
                    <div className=${`bg-white rounded-[1.5rem] shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] flex flex-col overscroll-none ${isMobileFilterClosing ? 'animate-fade-out' : 'animate-scale-in'} overflow-hidden`} onClick=${e => e.stopPropagation()}>
                        <header className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-200 flex justify-between items-center bg-[#efefef] rounded-t-[1.5rem] shrink-0">
                            <h3 className="text-base font-bold text-[#333333] flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#e09900]"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Szűrés és kategóriák
                            </h3>
                            <button onClick=${closeMobileFilterModal} className="text-gray-500 hover:text-gray-800 p-1.5 rounded-full hover:bg-gray-200 transition-colors -mr-1">
                                <${Icons.XIcon} size=${20} />
                            </button>
                        </header>
                        <main className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Elméleti tanfolyam</p>
                                <div className="flex flex-wrap gap-2.5">
                                    <button onClick=${() => setTempSelectedModules(prev => ({ ...prev, mod1: !prev.mod1 }))} className=${`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all lg:active:scale-95 flex items-center gap-1.5 ${tempSelectedModules.mod1 ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>1. modul</button>
                                    <button onClick=${() => setTempSelectedModules(prev => ({ ...prev, mod2: !prev.mod2 }))} className=${`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all lg:active:scale-95 flex items-center gap-1.5 ${tempSelectedModules.mod2 ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>2. modul</button>
                                    <button onClick=${() => setTempSelectedModules(prev => ({ ...prev, mod3: !prev.mod3 }))} className=${`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all lg:active:scale-95 flex items-center gap-1.5 ${tempSelectedModules.mod3 ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>3. modul</button>
                                    <button onClick=${() => setTempSelectedModules(prev => ({ ...prev, mod4: !prev.mod4 }))} className=${`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all lg:active:scale-95 flex items-center gap-1.5 ${tempSelectedModules.mod4 ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>4. modul</button>
                                </div>
                            </div>

                            <div className="mb-6 border-t border-gray-100 pt-5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Kiegészítő szolgáltatások</p>
                                <div className="flex flex-wrap gap-2.5">
                                    <button onClick=${() => setTempSelectedCategories(prev => ({ ...prev, consultation: !prev.consultation }))} className=${`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all lg:active:scale-95 flex items-center gap-1.5 ${tempSelectedCategories.consultation ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                                        Konzultáció
                                    </button>
                                    <button onClick=${() => setTempSelectedCategories(prev => ({ ...prev, medical: !prev.medical }))} className=${`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all lg:active:scale-95 flex items-center gap-1.5 ${tempSelectedCategories.medical ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                                        Orvosi
                                    </button>
                                    <button onClick=${() => setTempSelectedCategories(prev => ({ ...prev, firstaid: !prev.firstaid }))} className=${`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all lg:active:scale-95 flex items-center gap-1.5 ${tempSelectedCategories.firstaid ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                                        Elsősegély
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Napszak</p>
                                <div className="flex gap-2">
                                    <button onClick=${() => setTempTimeFilter('all')} className=${`flex-1 py-2.5 text-sm font-bold rounded-full transition-all border lg:active:scale-95 ${tempTimeFilter === 'all' ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Mind</button>
                                    <button onClick=${() => setTempTimeFilter('am')} className=${`flex-1 py-2.5 text-sm font-bold rounded-full transition-all border lg:active:scale-95 ${tempTimeFilter === 'am' ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Délelőtt</button>
                                    <button onClick=${() => setTempTimeFilter('pm')} className=${`flex-1 py-2.5 text-sm font-bold rounded-full transition-all border lg:active:scale-95 ${tempTimeFilter === 'pm' ? 'bg-[#e09900] text-white border-[#e09900] shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Délután</button>
                                </div>
                            </div>
                        </main>
                        <div className="p-4 border-t border-gray-100 bg-white rounded-b-[1.5rem] flex justify-between items-center gap-3 shrink-0">
                            <button
                                onClick=${clearMobileFilters}
                                className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 bg-[#efefef] hover:bg-gray-200 rounded-xl transition-all lg:active:scale-95"
                            >
                                Törlés
                            </button>
                            <button 
                                onClick=${applyMobileFilters}
                                className="flex-1 px-4 py-2.5 bg-[#e09900] lg:hover:bg-[#c98900] text-white rounded-xl font-bold transition-all shadow-md lg:active:scale-95 text-center text-sm"
                            >
                                Szűrés
                            </button>
                        </div>
                    </div>
                </div>
            `}

            ${toast && html`<${Toast} message=${toast.message} type=${toast.type} onClose=${() => setToast(null)} />`}
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${StudentAppointmentsApp} />`);
