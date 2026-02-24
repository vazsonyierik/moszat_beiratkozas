/**
 * js/UI.js
 * * This file contains reusable UI components for the application.
 * * JAVÍTÁS: A ConfirmationModal mostantól helyesen jeleníti meg a HTML formázást tartalmazó üzeneteket.
 * * MÓDOSÍTÁS: A modális ablakok most már csak a gombokra kattintva záródnak be, a háttérre kattintva nem.
 * * UPDATE: Added a new Tooltip component.
 */
import htm from 'https://unpkg.com/htm?module';
import { XIcon, InfoIcon } from './Icons.js';

const React = window.React;

export const html = htm.bind(React.createElement);

export const LoadingOverlay = ({ text }) => html`
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
        <div className="text-center loader-content">
            <img src="https://moszat.hu/moszat_teszt/images/MK_128px.png" alt="Betöltés..." className="loader-icon" />
            <p className="mt-4 text-lg font-semibold text-gray-700">${text}</p>
        </div>
    </div>
`;

export const InfoModal = ({ title, message, type, onClose }) => html`
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center transform transition-all relative" onClick=${(e) => e.stopPropagation()}>
            <button onClick=${onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><${XIcon} size=${24} /></button>
            <h3 className="text-xl font-bold ${type === 'error' ? 'text-red-600' : 'text-indigo-600'}">${title}</h3>
            <p className="text-gray-600 my-4" dangerouslySetInnerHTML=${{ __html: message }}></p>
            <button onClick=${onClose} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Rendben</button>
        </div>
    </div>
`;

export const Toast = ({ message, type, onClose }) => {
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000); // Az értesítés 4 másodperc után eltűnik

        return () => clearTimeout(timer);
    }, [onClose]);

    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    return html`
        <div className="fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white transform transition-all duration-300 ${typeClasses[type] || 'bg-gray-800'} z-[101]">
            ${message}
        </div>
    `;
};

export const ConfirmationModal = ({ message, onConfirm, onCancel }) => html`
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[101]">
        <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-sm text-center transform transition-all relative">
            <button onClick=${onCancel} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><${XIcon} size=${24} /></button>
            <h3 className="text-lg font-semibold text-gray-800">Megerősítés</h3>
            <p className="text-gray-600 my-4" dangerouslySetInnerHTML=${{ __html: message }}></p>
            <div className="flex justify-center gap-4 mt-6">
                <button onClick=${onCancel} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-md hover:bg-gray-300">Nem</button>
                <button onClick=${onConfirm} className="bg-red-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-700">Igen</button>
            </div>
        </div>
    </div>
`;

export const Tooltip = ({ text }) => html`
    <div className="tooltip-container hidden lg:inline-block">
        <${InfoIcon} size=${18} className="text-gray-400" />
        <span className="tooltip-text">
            ${text}
        </span>
    </div>
`;
