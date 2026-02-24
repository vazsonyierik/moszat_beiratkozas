/**
 * js/components/EditableField.js
 * * Reusable form field component for editing data.
 * JAVÍTÁS: autocomplete attribútum hozzáadva a jobb felhasználói élmény és böngészőkompatibilitás érdekében.
 */

import { html } from '../UI.js';

const EditableField = ({ label, name, value, onChange, type = 'text', options = [], placeholder = '', disabled = false, required = false, autocomplete = '' }) => {
    const commonProps = {
        id: name,
        name: name,
        onChange: onChange,
        className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
        disabled: disabled,
        required: required,
        autoComplete: autocomplete
    };

    return html`
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 items-center py-1">
            <label htmlFor=${name} className="text-sm font-medium text-gray-600">${label}${required && html`<span className="text-red-500 ml-1">*</span>`}</label>
            <div className="col-span-2">
                ${type === 'select' ? html`
                    <select ...${commonProps} value=${value || ''}>
                        ${options.map((opt, index) => html`<option key=${index} value=${opt.value}>${opt.label}</option>`)}
                    </select>
                ` : type === 'checkbox' ? html`
                    <input type="checkbox" ...${commonProps} checked=${!!value} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                ` : html`
                    <input type=${type} ...${commonProps} value=${value || ''} placeholder=${placeholder} />
                `}
            </div>
        </div>
    `;
};

export default EditableField;

