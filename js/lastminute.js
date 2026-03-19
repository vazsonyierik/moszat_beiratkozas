import { html } from './UI.js';
import { functions, httpsCallable } from './firebase.js';

const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;

const App = () => {
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('Kérem várjon, jelentkezés feldolgozása...');

    useEffect(() => {
        const claimSpot = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const courseId = urlParams.get('courseId');
            const email = urlParams.get('email');
            // Support 'test' param similar to other pages, but typically emails sent in test mode will direct to test URL
            const isTestView = urlParams.get('test') === 'true';

            if (!courseId || !email) {
                setStatus('error');
                setMessage('Érvénytelen vagy hiányzó azonosítók a linkben.');
                return;
            }

            try {
                const claimLastMinuteSpot = httpsCallable(functions, 'claimLastMinuteSpot');
                const result = await claimLastMinuteSpot({ courseId, email: decodeURIComponent(email), isTestView });

                setStatus('success');
                setMessage(result.data.message || 'Sikeresen lefoglaltad a last-minute helyet!');
            } catch (error) {
                console.error("Claim error:", error);
                setStatus('error');

                let errorMsg = error.message || 'Hiba történt a hely lefoglalásakor. Kérjük, próbálja újra később.';
                // Provide friendlier messages for known competition cases
                if (errorMsg.includes('gyorsabb volt') || errorMsg.includes('időközben már betelt')) {
                    errorMsg = 'Sajnos valaki más gyorsabb volt, és már lefoglalta ezt a helyet. Köszönjük az érdeklődést!';
                } else if (errorMsg.includes('Már van rendes jelentkezésed')) {
                    errorMsg = 'Már rendelkezel sikeres jelentkezéssel erre a foglalkozásra.';
                }

                setMessage(errorMsg);
            }
        };

        claimSpot();
    }, []);

    return html`
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 text-center">
                    ${status === 'loading' && html`
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Feldolgozás...</h2>
                        <p className="text-gray-500">${message}</p>
                    `}

                    ${status === 'success' && html`
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Siker!</h2>
                        <p className="text-gray-600 mb-6">${message}</p>
                        <p className="text-sm text-gray-500">Az ablakot most már bezárhatja.</p>
                    `}

                    ${status === 'error' && html`
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sikertelen</h2>
                        <p className="text-gray-600 mb-6">${message}</p>
                    `}
                </div>
            </div>
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
