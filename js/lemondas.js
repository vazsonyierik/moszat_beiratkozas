/**
 * js/lemondas.js
 * Entry point for the student appointment cancellation page.
 */

import { html, LoadingOverlay } from './UI.js';
import { functions, httpsCallable } from './firebase.js';

const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;

const CancellationApp = () => {
    const [status, setStatus] = useState('confirm'); // 'confirm', 'loading', 'success', 'error'
    const [errorMessage, setErrorMessage] = useState('');
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('Hiányzó vagy érvénytelen lemondási azonosító a hivatkozásban.');
        }
    }, [token]);

    const [successMessage, setSuccessMessage] = useState('A jelentkezésedet sikeresen töröltük a rendszerből. Köszönjük, hogy időben jelezted felénk!');

    const handleCancel = async () => {
        setStatus('loading');
        try {
            const cancelFn = httpsCallable(functions, 'cancelBookingByStudent');
            const result = await cancelFn({ token });
            if (result.data && result.data.message) {
                setSuccessMessage(result.data.message);
            }
            setStatus('success');
        } catch (error) {
            console.error("Hiba a lemondás során:", error);
            setStatus('error');
            
            let msg = error.message;
            if (msg.includes('nem található') || msg.includes('not-found')) {
                msg = 'A jelentkezés nem található. Lehet, hogy már korábban lemondtad, leiratkoztál a várólistáról, vagy a foglalkozás elmaradt.';
            }
            setErrorMessage(msg || 'Hiba történt a művelet közben.');
        }
    };

    const renderContent = () => {
        if (status === 'loading') {
            return html`<${LoadingOverlay} text="Lemondás feldolgozása..." />`;
        }

        if (status === 'success') {
            return html`
                <div className="bg-white p-8 rounded-xl shadow-lg border border-green-100 text-center max-w-md mx-auto">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Sikeres lemondás</h2>
                    <p className="text-gray-600 mb-6">${successMessage}</p>
                    <a href="https://mosolyzona.hu" className="text-indigo-600 hover:text-indigo-800 font-medium underline">Vissza a főoldalra</a>
                </div>
            `;
        }

        if (status === 'error') {
            return html`
                <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 text-center max-w-md mx-auto">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Sikertelen művelet</h2>
                    <p className="text-gray-600 mb-6">${errorMessage}</p>
                    <a href="idopont.html" className="text-indigo-600 hover:text-indigo-800 font-medium underline">Időpontok megtekintése</a>
                </div>
            `;
        }

        return html`
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Jelentkezés lemondása</h2>
                <p className="text-gray-600 mb-8">Biztosan szeretnéd lemondani az időpontodat, vagy leiratkozni a várólistáról? Ez a művelet nem vonható vissza.</p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick=${handleCancel}
                        className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors focus:ring-4 focus:ring-red-300"
                    >
                        Igen, lemondom / leiratkozom
                    </button>
                    <a 
                        href="idopont.html" 
                        className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors focus:ring-4 focus:ring-gray-300"
                    >
                        Nem, mégsem
                    </a>
                </div>
            </div>
        `;
    };

    return html`
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            ${renderContent()}
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${CancellationApp} />`);
