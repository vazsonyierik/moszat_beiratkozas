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
