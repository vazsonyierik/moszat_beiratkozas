/**
 * js/App.js
 * * Main application component.
 * DESIGN UPDATE: The component's structure is simplified. It now acts as a wrapper
 * that provides the main background color and centers the appropriate view (form or admin),
 * removing the previous header and footer logic for the form view.
 */
import { 
    auth, 
    onAuthStateChanged, 
    isSignInWithEmailLink, 
    signInWithEmailLink, 
    signOut,
    functions,
    httpsCallable
} from './firebase.js';
import { html, LoadingOverlay } from './UI.js';
import RegistrationForm from './RegistrationForm.js';
import AdminPanel from './AdminPanel.js';
import { useToast } from './context/AppContext.js';

const { useState, useEffect, useCallback } = window.React;

// LoginCard component for the admin login form
const LoginCard = ({ children }) => html`
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                <div className="text-center mb-8">
                    <div className="inline-block bg-teal-100 p-4 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-700">
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><path d="M14 17H9"/><path d="M9 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M19 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M5 17H3"/><path d="M5 7H3"/><path d="M12 5l1.5 2.5"/><path d="m10 5-1.5 2.5"/>
                        </svg>
                    </div>
                </div>
                ${children}
            </div>
        </div>
    </div>
`;

// AdminLogin component
const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const showToast = useToast();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email) {
            showToast('Kérjük, adja meg az email címét!', 'error');
            return;
        }
        setLoading(true);
        try {
            const sendLoginLink = httpsCallable(functions, 'sendAdminLoginLink');
            await sendLoginLink({ email: email, redirectUrl: window.location.href });
            
            window.localStorage.setItem('emailForSignIn', email);
            setEmailSent(true);
            showToast('Bejelentkezési link elküldve az email címedre!', 'success');
        } catch (error) {
            console.error("Hiba a link küldésekor:", error);
            showToast(error.message || 'Hiba történt a bejelentkezés során.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (emailSent) {
        return html`
            <${LoginCard}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Link elküldve!</h2>
                    <p className="mt-4 text-slate-600">Kérjük, ellenőrizd az email fiókodat, és kattints a bejelentkezési linkre a belépéshez.</p>
                </div>
            <//>
        `;
    }

    return html`
        <${LoginCard}>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">Admin Bejelentkezés</h2>
                <p className="mt-2 text-slate-600">Adja meg email címét a jelszó nélküli bejelentkezéshez.</p>
            </div>
            <form onSubmit=${handleLogin} className="mt-8 space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email cím</label>
                    <input
                        type="email"
                        id="email"
                        value=${email}
                        onChange=${(e) => setEmail(e.target.value)}
                        placeholder="admin@email.com"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                </div>
                <button
                    type="submit"
                    disabled=${loading}
                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:from-cyan-700 hover:to-teal-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ${loading ? 'Küldés...' : 'Bejelentkezési link küldése'}
                </button>
            </form>
        <//>
    `;
};


function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [view, setView] = useState('form');
    const showToast = useToast();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin') === 'true') {
            setView('admin');
        }

        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                email = window.prompt('Kérjük, add meg az email címed a bejelentkezés megerősítéséhez.');
            }
            if (email) {
                signInWithEmailLink(auth, email, window.location.href)
                    .then((result) => {
                        window.localStorage.removeItem('emailForSignIn');
                        setUser(result.user);
                        window.history.replaceState({}, document.title, window.location.pathname + '?admin=true');
                    })
                    .catch((error) => {
                        console.error("Hiba a bejelentkezéskor:", error);
                        showToast(`Hiba a bejelentkezéskor: ${error.message}`, 'error');
                    });
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [showToast]);

    const handleLogout = useCallback(async () => {
        await signOut(auth);
        setUser(null);
        showToast('Sikeresen kijelentkeztél.', 'success');
    }, [showToast]);

    // Determine which view to render
    const renderContent = () => {
        if (view === 'admin') {
            if (authLoading) {
                return html`<${LoadingOverlay} text="Azonosítás folyamatban..." />`;
            }
            return user ? html`<${AdminPanel} user=${user} handleLogout=${handleLogout} />` : html`<${AdminLogin} />`;
        }
        // Default view is the registration form
        return html`<${RegistrationForm} />`;
    };
    
    // The main wrapper div gets a specific class for the form view to scope the styles
    const wrapperClass = view === 'form' ? 'form-view-wrapper' : 'admin-view-wrapper';

    return html`
        <div className=${wrapperClass}>
            ${renderContent()}
        </div>
    `;
}

export default App;
