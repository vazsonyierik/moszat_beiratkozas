/**
 * js/idopont.js
 * Entry point for the student appointment booking page.
 */

import { html, LoadingOverlay } from './UI.js';
import { db, collection, onSnapshot, query, where, auth, signInAnonymously, onAuthStateChanged, functions, httpsCallable } from './firebase.js';
import * as Icons from './Icons.js';

const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;

// Simple Toast component since we don't have AppContext wrapper here by default
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgClass = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';

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

const BookingModal = ({ course, onClose, onBook, isTestView }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [emailConfirm, setEmailConfirm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

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
        try {
            await onBook({
                courseId: course.id,
                firstName,
                lastName,
                email,
                isTestView
            });
        } catch (err) {
            console.error("Booking error:", err);
            setError(err.message || 'Hiba történt a jelentkezés során.');
            setIsSubmitting(false);
        }
    };

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all" onClick=${e => e.stopPropagation()}>
                <header className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-gray-800">Jelentkezés</h3>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <${Icons.XIcon} size=${24} />
                    </button>
                </header>
                
                <div className="p-4 sm:p-6 bg-indigo-50 border-b border-indigo-100">
                    <p className="font-semibold text-indigo-900">${course.name}</p>
                    <p className="text-sm text-indigo-700">${course.date} | ${course.startTime} - ${course.endTime}</p>
                </div>

                <main className="p-4 sm:p-6">
                    ${error && html`<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">${error}</div>`}
                    
                    <form onSubmit=${handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vezetéknév</label>
                                <input 
                                    type="text" 
                                    value=${lastName} 
                                    onChange=${e => setLastName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Keresztnév</label>
                                <input 
                                    type="text" 
                                    value=${firstName} 
                                    onChange=${e => setFirstName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cím</label>
                            <input 
                                type="email" 
                                value=${email} 
                                onChange=${e => setEmail(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cím megerősítése</label>
                            <input 
                                type="email" 
                                value=${emailConfirm} 
                                onChange=${e => setEmailConfirm(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick=${onClose}
                                disabled=${isSubmitting}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                            >
                                Mégse
                            </button>
                            <button 
                                type="submit"
                                disabled=${isSubmitting}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                ${isSubmitting ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Küldés...` : 'Jelentkezem'}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    `;
};

const StudentAppointmentsApp = () => {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [toast, setToast] = useState(null);
    
    const urlParams = new URLSearchParams(window.location.search);
    const isTestView = urlParams.get('test') === 'true';

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // 1. Setup Auth (Wait for initial state, sign in anonymously if no user)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (!user) {
                    // Only sign in anonymously if there is truly no user after Firebase checks cache
                    await signInAnonymously(auth);
                } else {
                    // User is already logged in (could be an admin testing the page)
                    setIsAuthReady(true);
                }
            } catch (error) {
                console.error("Auth error:", error);
                showToast("Hiba a hitelesítés során.", "error");
            }
            // Once auth state is determined (either way), we are ready
            setIsAuthReady(true);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, []);

    // 2. Fetch active courses
    useEffect(() => {
        if (!isAuthReady) return;

        const collectionName = isTestView ? 'courses_test' : 'courses';
        
        // Only get courses from today onwards
        const todayStr = new Date().toISOString().split('T')[0];
        
        const q = query(
            collection(db, collectionName),
            where('date', '>=', todayStr)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let coursesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Sort locally
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
            const bookAppointmentFn = httpsCallable(functions, 'bookAppointment');
            await bookAppointmentFn(bookingData);
            
            showToast('Sikeres jelentkezés!', 'success');
            setSelectedCourse(null); // Close modal
        } catch (error) {
            console.error("Error during booking:", error);
            // Translate common error codes if possible
            let msg = error.message;
            if (msg.includes('already registered')) msg = 'Ezzel az e-mail címmel már jelentkeztél erre a foglalkozásra!';
            if (msg.includes('is full')) msg = 'Sajnos ez a foglalkozás időközben betelt.';
            
            throw new Error(msg); // Let the modal handle the display
        }
    };

    if (!isAuthReady || isLoading) {
        return html`<${LoadingOverlay} text="Időpontok betöltése..." />`;
    }

    return html`
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            ${isTestView && html`
                <div className="bg-red-500 text-white text-center py-2 px-4 font-bold rounded-md mb-6 shadow flex items-center justify-center gap-2">
                    <${Icons.AlertTriangleIcon} size=${20} />
                    TESZT ÜZEMMÓD - Az adatok nem kerülnek mentésre az éles rendszerbe!
                </div>
            `}

            <header className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Foglalkozások és Időpontok</h1>
                <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                    Válasszon a szabad időpontok közül és jelentkezzen be!
                </p>
            </header>

            <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                <ul className="divide-y divide-gray-200">
                    ${courses.length === 0 ? html`
                        <li className="px-6 py-12 text-center text-gray-500">Jelenleg nincs aktív meghirdetett foglalkozás. Kérjük, nézzen vissza később!</li>
                    ` : courses.map(course => {
                        const isFull = course.bookingsCount >= course.capacity;
                        const availableSeats = course.capacity - (course.bookingsCount || 0);

                        return html`
                            <li key=${course.id} className=${`hover:bg-gray-50 transition-colors ${isFull ? 'opacity-75' : ''}`}>
                                <div className="px-4 py-4 sm:px-6 flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="text-lg font-bold text-indigo-600 truncate">${course.name}</p>
                                            ${isFull ? html`
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                    Betelt
                                                </span>
                                            ` : html`
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                    ${availableSeats} szabad hely
                                                </span>
                                            `}
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 gap-6">
                                            <p className="flex items-center gap-1">
                                                <${Icons.CalendarIcon} size=${16} className="text-gray-400" />
                                                ${course.date}
                                            </p>
                                            <p className="flex items-center gap-1 font-medium">
                                                ${course.startTime} - ${course.endTime}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 sm:mt-0 ml-4">
                                        <button 
                                            onClick=${() => setSelectedCourse(course)}
                                            disabled=${isFull}
                                            className=${`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isFull ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
                                        >
                                            ${isFull ? 'Nincs több hely' : 'Jelentkezem'}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        `;
                    })}
                </ul>
            </div>

            ${selectedCourse && html`
                <${BookingModal} 
                    course=${selectedCourse} 
                    onClose=${() => setSelectedCourse(null)} 
                    onBook=${handleBookAppointment}
                    isTestView=${isTestView}
                />
            `}

            ${toast && html`<${Toast} message=${toast.message} type=${toast.type} onClose=${() => setToast(null)} />`}
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${StudentAppointmentsApp} />`);