/**
 * js/main.js
 * * Entry point for the React application.
 * The App is now wrapped with AppProvider to enable global state management.
 */
import App from './App.js';
import { html } from './UI.js';
import { AppProvider } from './context/AppContext.js';

const ReactDOM = window.ReactDOM;

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

// Wrap the main App component with the AppProvider
root.render(html`
    <${AppProvider}>
        <${App} />
    <//>
`);

// MÓDOSÍTÁS: Betöltésjelző eltávolítása a betöltés után
// A 'DOMContentLoaded' biztosítja, hogy a szkript lefusson, amint a HTML betöltődött,
// de még a képek és egyéb erőforrások betöltése előtt, így a React app gyorsabban elindulhat.
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    if (loader) {
        // Áttűnés elindítása
        loader.style.opacity = '0';
        // Eltávolítás a DOM-ból az áttűnés után
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300); // Ennek meg kell egyeznie a CSS-ben lévő transition időtartamával
    }
});