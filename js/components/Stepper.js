/**
 * js/components/Stepper.js
 * A new component to visually represent the steps in the registration form.
 * UPDATE: The component now hides the step number and shows an SVG checkmark for completed steps.
 * UPDATE V2: The layout is changed to a column format to prevent overlapping on desktop.
 * JAVÍTÁS: A komponens most már kezeli a kattintásokat a korábban teljesített lépéseken.
 * JAVÍTÁS V2: A kattintás eseménykezelő átkerült a teljes lépésről a kör ikonra, és a felesleges CSS osztály eltávolításra került.
 * JAVÍTÁS V3: A kattintás eseménykezelő visszahelyezve a fő elemre a mobil kompatibilitás javítása érdekében, a vonal kattinthatósága CSS-sel tiltva.
 */
import { html } from '../UI.js';
import { CheckIcon } from '../Icons.js';

const Stepper = ({ steps, currentStep, highestValidatedStep, onStepClick }) => {
    return html`
        <div className="stepper">
            ${steps.map((step, index) => {
                // Meghatározzuk, hogy egy lépés befejezett-e
                const isCompleted = step.id <= highestValidatedStep && step.id < currentStep;
                const isActive = currentStep === step.id;
                // Egy lépés akkor kattintható, ha már befejeződött
                const isClickable = isCompleted;

                // CSS osztályok a lépés állapotának jelzésére
                const stepClasses = `step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''}`;

                return html`
                    <div 
                        key=${step.id} 
                        className=${stepClasses}
                        onClick=${() => isClickable && onStepClick(step.id)}
                    >
                        <div 
                            className="step-icon-wrapper"
                        >
                            <div className="step-icon">
                                ${isCompleted 
                                    ? html`<${CheckIcon} />` 
                                    : html`<span>${step.id}</span>`
                                }
                            </div>
                        </div>
                        <span className="step-text">${step.name}</span>
                    </div>
                `;
            })}
        </div>
    `;
};

export default Stepper;
