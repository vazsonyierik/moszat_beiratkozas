/**
 * js/components/StudentIdInput.js
 * * A custom input component for formatting the student ID.
 * * Automatically formats the ID string as the user types (e.g., 1234/12/1234/1234).
 */
import { html } from '../UI.js';

const React = window.React;

const StudentIdInput = ({ value, onChange, ...props }) => {
    const handleIdChange = (e) => {
        // Remove all non-digit characters
        let input = e.target.value.replace(/\D/g, '');
        let formattedInput = '';

        if (input.length > 0) {
            formattedInput = input.slice(0, 4);
        }
        if (input.length > 4) {
            formattedInput += '/' + input.slice(4, 6);
        }
        if (input.length > 6) {
            formattedInput += '/' + input.slice(6, 10);
        }
        if (input.length > 10) {
            formattedInput += '/' + input.slice(10, 14);
        }

        // Create a synthetic event object to pass to the original onChange handler
        const syntheticEvent = {
            target: {
                name: e.target.name,
                value: formattedInput
            }
        };
        onChange(syntheticEvent);
    };

    return html`
        <input
            type="text"
            value=${value}
            onChange=${handleIdChange}
            placeholder="1234/12/1234/1234"
            maxLength="17"
            ...${props}
        />
    `;
};

export default StudentIdInput;
