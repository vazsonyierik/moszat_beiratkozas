/**
 * js/components/DateInput.js
 * * A custom date input component for a better user experience.
 * * Automatically formats the date string as the user types.
 * JAVÍTÁS: Szigorúbb validáció hozzáadva a hónap (1-12) és nap (1-31) értékeinek korlátozására gépelés közben.
 * JAVÍTÁS 2: Hozzáadva a szabványos `autocomplete="bday"` attribútum a jobb böngészőkompatibilitás érdekében.
 * MÓDOSÍTÁS: A numerikus billentyűzet előhívása mobil eszközökön az `inputMode` attribútummal.
 * JAVÍTÁS: Az `inputmode` attribútum javítása `inputMode`-ra a React JSX konvencióknak megfelelően.
 */
import { html } from '../UI.js';

const React = window.React;

const DateInput = ({ value, onChange, name, id, required, className }) => {
    const handleDateChange = (e) => {
        let input = e.target.value.replace(/\D/g, ''); // Csak számok engedélyezése

        // Hónap validálása (1-12)
        if (input.length >= 6) {
            let month = input.substring(4, 6);
            if (month.length === 2) {
                if (parseInt(month, 10) > 12) month = '12';
                if (month === '00') month = '01';
            }
            input = input.substring(0, 4) + month + input.substring(6);
        }
        
        // Nap validálása (1-31)
        if (input.length >= 8) {
            let day = input.substring(6, 8);
            if (day.length === 2) {
                if (parseInt(day, 10) > 31) day = '31';
                if (day === '00') day = '01';
            }
            input = input.substring(0, 6) + day;
        }

        // Formázás pontokkal
        let formattedInput = '';
        if (input.length > 0) {
            formattedInput = input.slice(0, 4);
        }
        if (input.length > 4) {
            formattedInput += '.' + input.slice(4, 6);
        }
        if (input.length > 6) {
            formattedInput += '.' + input.slice(6, 8);
        }

        // Szintetikus esemény létrehozása a szülő komponens számára
        const syntheticEvent = {
            target: {
                name: name,
                value: formattedInput
            }
        };
        onChange(syntheticEvent);
    };

    return html`
        <input
            type="text"
            id=${id}
            name=${name}
            value=${value}
            onChange=${handleDateChange}
            required=${required}
            placeholder="éééé.hh.nn."
            maxLength="10"
            className=${className}
            autoComplete="bday"
            inputMode="numeric"
        />
    `;
};

export default DateInput;

