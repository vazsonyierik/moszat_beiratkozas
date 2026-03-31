/**
 * js/idopont.js
 * Entry point for the student appointment booking page.
 */

import { html, LoadingOverlay } from './UI.js';
import { db, collection, onSnapshot, query, where, auth, signInAnonymously, onAuthStateChanged, functions, httpsCallable } from './firebase.js';
import * as Icons from './Icons.js';

const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useMemo, Fragment } = React;

// Simple Toast component since we don't have AppContext wrapper here by default
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgClass = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : type === 'success' ? 'bg-green-500' : 'bg-gray-800';

    return html`
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div className=${`${bgClass} text-white px-6 py-3 rounded shadow-lg flex items-center gap-3`}>
                <span className="font-semibold">${message}</span>
                <button onClick=${onClose} className="text-white hover:text-gray-200">
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
    const [results, setResults] = useState(null);
    const [step, setStep] = useState(1); // For 2-step wizard on mobile

    // Desktop layout logic updates: skip summary list on desktop. On mobile, show wizard if 3 or more items.
    const isDesktop = window.innerWidth >= 1024;
    const isMobile = window.innerWidth < 640;
    const needsWizard = isMobile && cart.length >= 3;

    // Determine what to render based on wizard step and view mode
    const showSummaryList = isDesktop ? false : (!needsWizard || step === 1);
    const showForm = isDesktop ? true : (!needsWizard || step === 2);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!firstName || !lastName || !email || !emailConfirm) {
            setError('Kérjük, töltsön ki minden mezőt!');
            return;
        }

        if (email !== emailConfirm) {
            setError('A két e-mail cím nem egyezik!');
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

    if (results) {
        return html`
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 overflow-y-auto">
                <div className="bg-white sm:rounded-xl rounded-t-3xl shadow-2xl w-full max-w-md transform transition-all sm:my-8 mt-16 max-h-[95vh] flex flex-col pb-[env(safe-area-inset-bottom)] overscroll-none" onClick=${e => e.stopPropagation()}>
                    <header className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 sm:rounded-t-xl rounded-t-3xl shrink-0">
                        <h3 className="text-xl font-bold text-gray-800">Összegzés</h3>
                        <button onClick=${() => onClose(results)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <${Icons.XIcon} size=${24} />
                        </button>
                    </header>
                    <main className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                        ${results.success.length > 0 ? html`
                            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Sikeres jelentkezés (${results.success.length} db)
                                </h4>
                                <ul className="text-sm text-green-700 list-disc list-inside">
                                    ${results.success.map(s => html`<li key=${s.course.id}>${s.course.name} (${s.course.date})</li>`)}
                                </ul>
                                <p className="mt-2 text-sm text-green-800">A visszaigazolásokat elküldtük e-mailben.</p>
                            </div>
                        ` : ''}
                        
                        ${results.errors.length > 0 ? html`
                            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Sikertelen (${results.errors.length} db)
                                </h4>
                                <ul className="text-sm text-red-700 list-disc list-inside">
                                    ${results.errors.map(e => html`<li key=${e.item.course.id}>${e.item.course.name} - ${e.error}</li>`)}
                                </ul>
                            </div>
                        ` : ''}
                        
                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick=${() => onClose(results)}
                                className="px-6 py-2 bg-[#e09900] hover:bg-[#c98900] text-white rounded-md font-medium transition-colors"
                            >
                                Bezárás
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        `;
    }

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] w-full max-w-md transform transition-all my-8 max-h-[95vh] flex flex-col overscroll-none" onClick=${e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#efefef] rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3">
                        ${needsWizard && step === 2 ? html`
                            <button onClick=${() => setStep(1)} className="text-gray-500 hover:text-gray-800 transition-colors p-1 -ml-1">
                                <${Icons.ChevronRightIcon} size=${20} className="rotate-180" />
                            </button>
                        ` : ''}
                        <h3 className="text-base sm:text-lg font-extrabold text-gray-800 tracking-tight">Jelentkezés véglegesítése</h3>
                    </div>
                    <button onClick=${() => onClose()} className="text-gray-500 hover:text-gray-800 p-1.5 rounded-full hover:bg-gray-200 transition-colors -mr-1">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </header>
                
                ${showSummaryList ? html`
                    <div className="px-4 py-4 bg-white border-b border-gray-100 flex-1 sm:flex-none overflow-y-auto sm:max-h-[220px] custom-scrollbar">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Kiválasztott időpontok (${cart.length})</p>
                        <ul className="space-y-2.5">
                            ${cart.map((item, index) => html`
                                <li key=${index} className="text-sm bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center gap-3 transition-all hover:border-[#e09900]">
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-gray-800 block truncate text-base">${item.course.name} ${item.isWaitlist ? html`<span className="text-[10px] uppercase tracking-wide font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full ml-1.5 align-middle border border-orange-100">(Várólista)</span>` : ''}</span>
                                        <div className="text-gray-500 mt-0.5 flex items-center gap-1.5 text-sm">
                                            <${Icons.CalendarIcon} size=${14} className="text-[#888888]" />
                                            <span>${item.course.date.replace(/-/g, '. ')}. <span className="font-semibold text-[#333333] ml-1">${item.course.startTime} - ${item.course.endTime}</span></span>
                                        </div>
                                    </div>
                                    ${onRemoveItem ? html`
                                        <button
                                            type="button"
                                            onClick=${() => onRemoveItem(item.course.id)}
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-2 transition-colors shrink-0"
                                            title="Eltávolítás"
                                        >
                                            <${Icons.XIcon} size=${18} />
                                        </button>
                                    ` : ''}
                                </li>
                            `)}
                        </ul>
                        ${needsWizard && step === 1 ? html`
                            <div className="mt-6">
                                <button
                                    onClick=${() => setStep(2)}
                                    className="w-full py-3.5 bg-[#e09900] hover:bg-[#c98900] text-white rounded-xl font-bold transition-all shadow-[0_4px_10px_rgba(224,_153,_0,_0.2)] flex items-center justify-center gap-2"
                                >
                                    Tovább az adatokhoz <span className="text-xl leading-none">→</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${showForm ? html`
                    <main className="p-4 overflow-y-auto custom-scrollbar flex-1 sm:flex-none bg-white rounded-b-2xl">
                        ${error ? html`<div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm font-medium flex items-start gap-2"><${Icons.AlertTriangleIcon} size=${18} className="mt-0.5 shrink-0" />${error}</div>` : ''}

                        <form onSubmit=${handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Vezetéknév</label>
                                    <input
                                        type="text"
                                        value=${lastName}
                                        onChange=${e => setLastName(e.target.value)}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-sm"
                                        required
                                        placeholder="Kovács"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Keresztnév</label>
                                    <input
                                        type="text"
                                        value=${firstName}
                                        onChange=${e => setFirstName(e.target.value)}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-sm"
                                        required
                                        placeholder="János"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">E-mail cím</label>
                                <input 
                                    type="email"
                                    value=${email}
                                    onChange=${e => setEmail(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-sm"
                                    required
                                    placeholder="pelda@email.hu"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">E-mail cím megerősítése</label>
                                <input 
                                    type="email"
                                    value=${emailConfirm}
                                    onChange=${e => setEmailConfirm(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-[#ea9f21] focus:border-[#ea9f21] focus:bg-white transition-colors font-medium outline-none text-sm"
                                    required
                                    placeholder="pelda@email.hu"
                                />
                            </div>

                            <div className="pt-2 flex justify-end mt-2">
                                <button
                                    type="submit"
                                    disabled=${isSubmitting}
                                    className="px-6 py-2.5 bg-[#e09900] hover:bg-[#c98900] text-white rounded-lg font-bold transition-all disabled:opacity-70 disabled:hover:bg-[#e09900] flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                                >
                                    ${isSubmitting ? html`<span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span> <span>Feldolgozás...</span>` : html`<span>Véglegesítés</span>`}
                                </button>
                            </div>
                        </form>
                    </main>
                ` : ''}
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

// Format week key to display name (e.g. "Március 23. (Hétfő) - Március 29. (Vasárnap)")
function formatWeekName(weekKey) {
    const monday = new Date(weekKey);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const months = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
    
    const startStr = `${months[monday.getMonth()]} ${monday.getDate()}. (Hétfő)`;
    const endStr = `${months[sunday.getMonth()]} ${sunday.getDate()}. (Vasárnap)`;
    return `${startStr} – ${endStr}`;
}

// Format day name
function getDayName(dateStr) {
    const d = new Date(dateStr);
    const days = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
    return `${days[d.getDay()]} (${dateStr.replace(/-/g, '. ')})`;
}


const StudentAppointmentsApp = () => {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // Carts & UI state
    const [cart, setCart] = useState([]); // Array of { course, isWaitlist }
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [cartBump, setCartBump] = useState(false);
    const [quickBookItem, setQuickBookItem] = useState(null); // For instant booking Orvosi/Elsosegely
    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (isCheckoutOpen) {
            // Apply iOS safe scroll locking
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${window.scrollY}px`;
            document.body.style.width = '100%';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [isCheckoutOpen]);

    
    // Category Tabs: 'kresz', 'medical', 'firstaid'
    const [activeTab, setActiveTab] = useState('kresz');

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
    const [isFilterExpanded, setIsFilterExpanded] = useState(true);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

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
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e09900]"
                >
                    Mégse kérem
                </button>
            `;
        } else if (isFull) {
            if (isFirstAid) {
                buttonArea = html`
                    <span className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-[#888888] bg-[#efefef] cursor-not-allowed">
                        Betelt (Nincs várólista)
                    </span>
                `;
            } else {
                buttonArea = html`
                    <button 
                        onClick=${() => isQuickBook ? openQuickBook(course, true) : addToCart(course, true)}
                        className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-4 py-2 border border-[#e09900] rounded-md shadow-sm text-sm font-medium text-[#e09900] bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e09900] transition-colors"
                    >
                        <${Icons.ClockIcon} size=${16} />
                        Várólistára jelentkezés
                    </button>
                `;
            }
        } else {
            buttonArea = html`
                <button 
                    onClick=${() => isQuickBook ? openQuickBook(course, false) : addToCart(course, false)}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#e09900] hover:bg-[#c98900] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e09900]"
                >
                    ${isQuickBook ? 'Azonnali Jelentkezés' : 'Kiválasztom'}
                </button>
            `;
        }

        return html`
            <div key=${course.id} className=${`bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow ${isFull ? 'border-gray-200 bg-gray-50/30' : isInCart ? (isWaitlistInCart ? 'border-[#e09900] ring-1 ring-[#e09900] bg-orange-50/30' : 'border-[#e09900] ring-1 ring-[#e09900] bg-orange-50/10') : 'border-gray-200'}`}>
                <div className="flex flex-col h-full justify-between gap-4">
                    <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                            <h4 className="font-extrabold text-[#333333] text-lg leading-tight pr-2">${course.name}</h4>
                            ${isFull ? html`
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-[#efefef] text-[#888888] shrink-0">Betelt</span>
                            ` : isInCart ? (isWaitlistInCart ? html`
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-50 text-[#c98900] shrink-0">Várólistán</span>
                            ` : html`
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-[#c98900] shrink-0">Kiválasztva</span>
                            `) : html`
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-[#efefef] text-[#333333] shrink-0">${availableSeats} hely</span>
                            `}
                        </div>

                        <div className="text-[#888888] font-medium text-sm flex items-center gap-1.5 mb-2 mt-1">
                            <${Icons.ClockIcon} size=${16} className="text-[#888888]" />
                            <span>${course.startTime} - ${course.endTime}</span>
                        </div>

                        ${(isMedical || isFirstAid) && html`
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#efefef] border border-gray-200 text-xs font-semibold text-[#888888]">
                                <${Icons.CreditCardIcon} size=${14} className="text-[#888888]" />
                                ${isFirstAid ? 'Előre fizetős' : 'Fizetős'}
                            </div>
                        `}

                        ${isQuickBook && html`
                            <div className="text-sm text-[#888888] mt-2 flex items-center gap-1.5">
                                <${Icons.CalendarIcon} size=${16} />
                                ${course.date.replace(/-/g, '. ')}
                            </div>
                        `}
                    </div>
                    <div className="mt-auto pt-3 border-t border-[#efefef]">
                        ${buttonArea}
                    </div>
                </div>
            </div>
        `;
    };

    if (!isAuthReady || isLoading) {
        return html`<${LoadingOverlay} text="Időpontok betöltése..." />`;
    }

    const activeCoursesList = activeTab === 'medical' ? medicalCourses : activeTab === 'firstaid' ? firstAidCourses : [];

    const toggleCategory = (cat) => {
        setSelectedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    return html`
        <div className="min-h-screen max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
            ${isTestView && html`
                <div className="bg-red-500 text-white text-center py-2 px-4 font-bold rounded-md mb-6 shadow flex items-center justify-center gap-2">
                    <${Icons.AlertTriangleIcon} size=${20} />
                    TESZT ÜZEMMÓD - Az adatok nem kerülnek mentésre az éles rendszerbe!
                </div>
            `}

            <header className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Időpontfoglalás</h1>
                <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-500">
                    Válasszon kategóriát, majd jelentkezzen be a szabad időpontokra!
                </p>
            </header>

            <!-- Navigation Tabs (Mobile Only) -->
            <div className="flex lg:hidden justify-center mb-8">
                <div className="inline-flex flex-col sm:flex-row bg-gray-100 p-1 rounded-xl shadow-inner w-full sm:w-auto">
                    <button 
                        onClick=${() => { setActiveTab('kresz'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className=${`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${activeTab === 'kresz' ? 'bg-white text-[#e09900] shadow shadow-orange-100/50 scale-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
                    >
                        <span>🚗</span> Elméleti tanfolyam
                    </button>
                    <button 
                        onClick=${() => { setActiveTab('medical'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className=${`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${activeTab === 'medical' ? 'bg-white text-[#e09900] shadow shadow-orange-100/50 scale-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
                    >
                        <span>🩺</span> Orvosi vizsgálat
                    </button>
                    <button 
                        onClick=${() => { setActiveTab('firstaid'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className=${`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${activeTab === 'firstaid' ? 'bg-white text-[#e09900] shadow shadow-orange-100/50 scale-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
                    >
                        <span>🚑</span> Elsősegély
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                <!-- Main Content Area -->
                <div className="flex-1 w-full lg:w-2/3">

                    <!-- Mobile Content Rendering (Tab based) -->
                    <div className="block lg:hidden space-y-8">
                        ${activeTab === 'kresz' && html`
                            <div className="space-y-8">
                                ${kreszWeeks.length === 0 ? html`
                                    <div className="bg-white rounded-xl shadow p-12 text-center border border-gray-100">
                                        <p className="text-gray-500 text-lg">Jelenleg nincs aktív meghirdetett KRESZ foglalkozás.</p>
                                    </div>
                                ` : kreszWeeks.map(week => html`
                                    <div key=${week.weekKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-[#efefef] border-b border-gray-200 px-6 py-4">
                                            <h3 className="text-lg font-bold text-[#333333] flex items-center gap-2">
                                                <${Icons.CalendarIcon} size=${20} className="text-[#333333]"/>
                                                ${week.name}
                                            </h3>
                                        </div>
                                        <div className="p-4 sm:p-6 space-y-6">
                                            ${Object.keys(week.days).sort().map(dateStr => html`
                                                <div key=${dateStr} className="border-l-4 border-[#ea9f21] pl-4 sm:pl-6">
                                                    <h4 className="font-semibold text-gray-800 mb-4 text-md">${getDayName(dateStr)}</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        ${week.days[dateStr].map(course => renderCourseCard(course, false))}
                                                    </div>
                                                </div>
                                            `)}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        `}

                        ${(activeTab === 'medical' || activeTab === 'firstaid') && html`
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-4 sm:p-6">
                                ${activeCoursesList.length === 0 ? html`
                                    <div className="p-12 text-center">
                                        <p className="text-gray-500 text-lg">Jelenleg nincs meghirdetett időpont ebben a kategóriában.</p>
                                    </div>
                                ` : html`
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        ${activeCoursesList.map(course => renderCourseCard(course, false))}
                                    </div>
                                `}
                            </div>
                        `}
                    </div>

                    <!-- Desktop Content Rendering (Filter based) -->
                    <div className="hidden lg:block space-y-8">
                        ${(desktopWeeks.length > 0) && html`
                            <div className="space-y-8">
                                ${desktopWeeks.map(week => html`
                                    <div key=${week.weekKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-[#efefef] border-b border-gray-200 px-6 py-4">
                                            <h3 className="text-lg font-bold text-[#333333] flex items-center gap-2">
                                                <${Icons.CalendarIcon} size=${20} className="text-[#333333]"/>
                                                ${week.name}
                                            </h3>
                                        </div>
                                        <div className="p-4 sm:p-6 space-y-6">
                                            ${Object.keys(week.days).sort().map(dateStr => html`
                                                <div key=${dateStr} className="border-l-4 border-[#ea9f21] pl-4 sm:pl-6">
                                                    <h4 className="font-semibold text-gray-800 mb-4 text-md">${getDayName(dateStr)}</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                                                        ${week.days[dateStr].map(course => renderCourseCard(course, false))}
                                                    </div>
                                                </div>
                                            `)}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        `}

                        ${(desktopWeeks.length === 0) && html`
                            <div className="bg-white rounded-xl shadow p-12 text-center border border-gray-100">
                                <p className="text-gray-500 text-lg">A megadott szűrési feltételekkel nincs meghirdetett időpont.</p>
                            </div>
                        `}
                    </div>

                </div>

                <!-- Sticky Sidebar (Filter & Cart) -->
                ${(isDesktop || activeTab === 'kresz') && html`
                    <div className=${`w-full lg:w-1/3 sticky top-6 mb-20 space-y-6 ${!isDesktop ? 'hidden lg:block' : ''}`}>

                        <!-- Filter Panel (Desktop Only) -->
                        <div className="hidden lg:block bg-white shadow-lg sm:rounded-xl border border-gray-100 overflow-hidden">
                            <div className="bg-white px-5 py-4 border-b flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick=${() => setIsFilterExpanded(!isFilterExpanded)}>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <${Icons.SearchIcon} size=${20} className="text-[#333333]" />
                                    Szűrés
                                </h3>
                                <div className="flex items-center gap-4">
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
                                                className=${`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full transition-colors ${isAnyFilterActive ? 'text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100' : 'text-[#888888] bg-[#efefef] cursor-not-allowed'}`}
                                                title="Összes szűrés törlése"
                                            >
                                                <span className=${`rounded-full p-0.5 ${isAnyFilterActive ? 'bg-red-100 text-red-600' : 'bg-transparent text-[#888888]'}`}><${Icons.XIcon} size=${14} /></span>
                                                Összes szűrés törlése
                                            </button>
                                        `;
                                    })()}
                                    <span className=${`text-[#888888] transition-transform duration-300 ${isFilterExpanded ? 'rotate-180' : ''}`}>
                                        <${Icons.ChevronRightIcon} size=${24} className="rotate-90" />
                                    </span>
                                </div>
                            </div>

                            ${isFilterExpanded ? html`
                                <div className="p-5 bg-white">
                                    <div className="mb-5">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Elméleti tanfolyam</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod1: !prev.mod1 }))} className=${`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedModules.mod1 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                1. modul
                                            </button>
                                            <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod2: !prev.mod2 }))} className=${`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedModules.mod2 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                2. modul
                                            </button>
                                            <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod3: !prev.mod3 }))} className=${`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedModules.mod3 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                3. modul
                                            </button>
                                            <button onClick=${() => setSelectedModules(prev => ({ ...prev, mod4: !prev.mod4 }))} className=${`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedModules.mod4 ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                4. modul
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-5 border-t border-gray-100 pt-5">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Kiegészítő szolgáltatások</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick=${() => toggleCategory('consultation')} className=${`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedCategories.consultation ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                ${selectedCategories.consultation ? html`<${Icons.CheckIcon} size=${14} className="text-white"/>` : ''} Konzultáció
                                            </button>
                                            <button onClick=${() => toggleCategory('medical')} className=${`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedCategories.medical ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                ${selectedCategories.medical ? html`<${Icons.CheckIcon} size=${14} className="text-white"/>` : ''} Orvosi
                                            </button>
                                            <button onClick=${() => toggleCategory('firstaid')} className=${`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedCategories.firstaid ? 'bg-[#e09900] text-white border-[#e09900]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                                                ${selectedCategories.firstaid ? html`<${Icons.CheckIcon} size=${14} className="text-white"/>` : ''} Elsősegély
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-5">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Napszak</p>
                                        <div className="flex bg-[#efefef] p-1 rounded-lg">
                                            <button onClick=${() => setTimeFilter('all')} className=${`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${timeFilter === 'all' ? 'bg-white text-[#e09900] shadow-sm' : 'text-[#888888] hover:text-[#333333]'}`}>Mind</button>
                                            <button onClick=${() => setTimeFilter('am')} className=${`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${timeFilter === 'am' ? 'bg-white text-[#e09900] shadow-sm' : 'text-[#888888] hover:text-[#333333]'}`}>Délelőtt</button>
                                            <button onClick=${() => setTimeFilter('pm')} className=${`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${timeFilter === 'pm' ? 'bg-white text-[#e09900] shadow-sm' : 'text-[#888888] hover:text-[#333333]'}`}>Délután</button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Cart Panel -->
                        <div className="bg-white shadow-lg sm:rounded-xl p-6 border border-gray-100 flex flex-col max-h-[calc(100vh-120px)]">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-3 shrink-0 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                            Kiválasztott időpontok
                        </h3>
                        ${cart.length === 0 ? html`
                            <div className="text-gray-500 text-sm italic py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                Még nem választottál ki időpontot.<br/>Kattints a "Kiválasztom" gombra a hozzáadáshoz.
                            </div>
                        ` : html`
                            <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                                ${cart.map(item => html`
                                    <div key=${item.course.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-[#e09900] transition-colors">
                                        <div className="flex-1">
                                            <div className="font-semibold text-[#e09900] text-sm">
                                                ${item.course.name}
                                                ${item.isWaitlist ? html`<span className="ml-2 text-xs text-[#c98900] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">(Várólista)</span>` : ''}
                                            </div>
                                            <div className="text-xs text-[#888888] mt-1.5 flex items-center gap-1.5">
                                                <${Icons.CalendarIcon} size=${12} className="text-[#888888]" />
                                                ${item.course.date.replace(/-/g, '. ')}. <span className="font-medium text-[#333333]">${item.course.startTime}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick=${() => removeFromCart(item.course.id)}
                                            className="ml-3 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 rounded shadow-sm border border-red-100 p-1.5 transition-colors"
                                            title="Eltávolítás"
                                        >
                                            <${Icons.XIcon} size=${14} />
                                        </button>
                                    </div>
                                `)}
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-200 shrink-0">
                                <button
                                    onClick=${() => setIsCheckoutOpen(true)}
                                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-[#e09900] hover:bg-[#c98900] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e09900] transition-all hover:shadow-lg"
                                >
                                    Tovább a jelentkezéshez (${cart.length})
                                </button>
                            </div>
                        `}
                        </div>
                    </div>
                `}
            </div>

            <!-- Floating Pill Button for Mobile (Visible on all tabs) -->
            ${cart.length > 0 && html`
                <div className="lg:hidden fixed z-40 bottom-6 left-1/2 -translate-x-1/2 pb-[env(safe-area-bottom)] pointer-events-none w-full px-4 flex justify-center">
                    <button 
                        onClick=${() => setIsCheckoutOpen(true)}
                        className=${`pointer-events-auto bg-[#e09900] hover:bg-[#c98900] text-white pl-2 pr-6 py-3 rounded-full font-bold shadow-[0_10px_40px_rgba(224,153,0,0.3)] flex items-center gap-4 active:scale-95 transition-all border border-[#c98900] backdrop-blur-md`}
                    >
                        <div className=${`bg-white text-[#e09900] w-10 h-10 flex items-center justify-center rounded-full font-black text-lg shadow-inner transition-transform duration-300 ${cartBump ? 'scale-125 bg-gray-100' : 'scale-100'}`}>
                            ${cart.length}
                        </div>
                        <span className="tracking-wide text-[15px]">Tovább a jelentkezéshez <span className="text-xl ml-1 font-normal opacity-80">→</span></span>
                    </button>
                </div>
                <!-- Spacer for the floating button so content isn't covered at the bottom -->
                <div className="lg:hidden h-32 pb-[env(safe-area-inset-bottom)]"></div>
            `}

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

            ${toast && html`<${Toast} message=${toast.message} type=${toast.type} onClose=${() => setToast(null)} />`}
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${StudentAppointmentsApp} />`);
