/**
 * js/components/modals/EditDetailsModal.js
 * * Modal for editing student details.
 * * This version logs the edit action.
 * * JAVÍTÁS 3: A segédkomponensek (TabButton, Section) kiemelése a fő komponensből, hogy megakadályozzuk az újra-deklarálásukat minden renderelésnél. Ez a végleges megoldás a fókuszvesztési hibára.
 * * MÓDOSÍTÁS: A színséma frissítve az új dizájn szerint (türkiz/cián).
 * * JAVÍTÁS 4: A hibásan megjelenő JSX kommentek eltávolítva a kódból.
 * * MÓDOSÍTÁS 5: A tartózkodási hely szekció kiegészítve a hiányzó, szerkeszthető mezőkkel.
 */
import { html } from '../../UI.js';
import { formatFullName, formatSingleTimestamp } from '../../utils.js';
import { XCircleIcon, XIcon } from '../../Icons.js';
import { documentTypeOptions, educationOptions, prefixOptions, budapestDistricts } from '../../constants.js';
import { deleteField } from '../../firebase.js';
import UnmemoizedEditableField from '../EditableField.js';
import UnmemoizedDateInput from '../DateInput.js';
import { useToast, useConfirmation } from '../../context/AppContext.js';
import { logAdminAction } from '../../actions.js';

const React = window.React;

// JAVÍTÁS: A gyermek komponensek memoizálása, hogy megakadályozzuk a felesleges újrarenderelést gépelés közben.
const EditableField = React.memo(UnmemoizedEditableField);
const DateInput = React.memo(UnmemoizedDateInput);

// JAVÍTÁS: A segédkomponensek kiemelése a fő komponensből, hogy megakadályozzuk az újra-deklarálásukat minden renderelésnél.
const TabButton = ({ tabId, label, activeTab, setActiveTab }) => html`
    <button 
        onClick=${() => setActiveTab(tabId)}
        className=${`px-4 py-2 text-sm font-medium rounded-t-lg border-l border-t border-r -mb-px ${activeTab === tabId ? 'bg-white border-b-white text-teal-600' : 'bg-stone-50 text-gray-500 hover:bg-stone-100 border-stone-200'}`}
    >
        ${label}
    </button>
`;
    
const Section = React.memo(({ title, children }) => html`
    <div className="space-y-4 p-4 border rounded-lg bg-stone-50">
        <h4 className="font-semibold text-gray-700">${title}</h4>
        ${children}
    </div>
`);

const EditDetailsModal = ({ student, onClose, onUpdate, adminUser }) => {
    const [originalData] = React.useState(student);
    const [formData, setFormData] = React.useState(student);
    const [isSaving, setIsSaving] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('personal');

    const showToast = useToast();
    const showConfirmation = useConfirmation();

    const handleChange = React.useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        
        setFormData(prev => {
            const newState = { ...prev, [name]: val };

            const isCopyingResidence = (name === 'residenceIsSame') ? val : newState.residenceIsSame;
            const isPermanentAddressField = name.startsWith('permanent_address_');

            if (isCopyingResidence && (name === 'residenceIsSame' || isPermanentAddressField)) {
                const fieldsToCopy = ['country', 'zip', 'city', 'street', 'streetType', 'houseNumber', 'building', 'staircase', 'floor', 'door'];
                fieldsToCopy.forEach(field => {
                    newState[`temporary_address_${field}`] = newState[`permanent_address_${field}`];
                });
            }

            return newState;
        });
    }, []);

    const handleSave = React.useCallback(async () => {
        setIsSaving(true);
        const changes = {};
        const changedFields = [];
        Object.keys(formData).forEach(key => {
            if (JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
                changes[key] = formData[key];
                changedFields.push(key);
            }
        });

        if (Object.keys(changes).length === 0) {
            showToast('Nem történt változás.', 'info');
            setIsSaving(false);
            onClose();
            return;
        }

        try {
            await onUpdate(formData.id, changes);
            const studentName = formatFullName(formData.current_prefix, formData.current_firstName, formData.current_lastName, formData.current_secondName);
            await logAdminAction(adminUser.email, `Adatok szerkesztése (${changedFields.join(', ')})`, studentName, formData.id);
            showToast('Változások sikeresen mentve!', 'success');
            setIsSaving(false);
            onClose();
        } catch (error) {
            console.error("Error updating student:", error);
            showToast('Hiba a mentés során!', 'error');
            setIsSaving(false);
        }
    }, [formData, originalData, onUpdate, onClose, showToast, adminUser]);

    const handleTimestampDeleteRequest = React.useCallback((fieldName, fieldLabel) => {
        showConfirmation({
            message: `Biztosan törölni szeretnéd a '${fieldLabel}' időbélyeget? Ez a művelet nem vonható vissza.`,
            onConfirm: async () => {
                const updatePayload = { [fieldName]: deleteField() };
                 if (fieldName === 'studentIdAssignedAt') {
                    updatePayload.studentId = deleteField();
                }
                try {
                    await onUpdate(student.id, updatePayload);
                    const studentName = formatFullName(student.current_prefix, student.current_firstName, student.current_lastName, student.current_secondName);
                    await logAdminAction(adminUser.email, `Időbélyeg törlése: ${fieldLabel}`, studentName, student.id);
                    setFormData(prev => {
                        const newState = { ...prev };
                        delete newState[fieldName];
                        if (fieldName === 'studentIdAssignedAt') {
                            delete newState.studentId;
                        }
                        return newState;
                    });
                    showToast('Időbélyeg törölve.', 'success');
                } catch (error) {
                    showToast('Hiba a törlés során!', 'error');
                }
            },
        });
    }, [student, onUpdate, showConfirmation, showToast, adminUser]);

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick=${onClose}>
            <div className="bg-stone-50 rounded-xl shadow-2xl w-full max-w-6xl transform transition-all" onClick=${e => e.stopPropagation()}>
                <header className="p-6 border-b bg-white rounded-t-xl flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Tanuló adatainak szerkesztése</h3>
                        <p className="text-gray-500">${formatFullName(student.current_prefix, student.current_firstName, student.current_lastName, student.current_secondName)}</p>
                    </div>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><${XIcon} size=${24} /></button>
                </header>
                <main className="p-2 sm:p-6 max-h-[70vh] overflow-y-auto">
                    <div className="border-b border-stone-200">
                        <nav className="flex flex-wrap space-x-2" aria-label="Tabs">
                           <${TabButton} tabId="personal" label="Személyes adatok" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                           <${TabButton} tabId="documents" label="Okmányok" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                           <${TabButton} tabId="address" label="Címek" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                           <${TabButton} tabId="contact" label="Elérhetőségek" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                           <${TabButton} tabId="history" label="Előzmények" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                        </nav>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-b-lg border border-t-0">
                        ${activeTab === 'personal' && html`
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <${Section} title="Viselt név">
                                    <${EditableField} label="Előtag" name="current_prefix" value=${formData.current_prefix} onChange=${handleChange} type="select" options=${prefixOptions} />
                                    <${EditableField} label="Családi név" name="current_lastName" value=${formData.current_lastName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Utónév" name="current_firstName" value=${formData.current_firstName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Második utónév" name="current_secondName" value=${formData.current_secondName} onChange=${handleChange} />
                                <//>
                                <${Section} title="Születési név">
                                    <${EditableField} label="Előtag" name="birth_prefix" value=${formData.birth_prefix} onChange=${handleChange} type="select" options=${prefixOptions} />
                                    <${EditableField} label="Családi név" name="birth_lastName" value=${formData.birth_lastName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Utónév" name="birth_firstName" value=${formData.birth_firstName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Második utónév" name="birth_secondName" value=${formData.birth_secondName} onChange=${handleChange} />
                                <//>
                                 <${Section} title="Anyja neve">
                                    <${EditableField} label="Előtag" name="mother_prefix" value=${formData.mother_prefix} onChange=${handleChange} type="select" options=${prefixOptions} />
                                    <${EditableField} label="Családi név" name="mother_lastName" value=${formData.mother_lastName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Utónév" name="mother_firstName" value=${formData.mother_firstName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Második utónév" name="mother_secondName" value=${formData.mother_secondName} onChange=${handleChange} />
                                <//>
                                <${Section} title="Születési adatok">
                                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 items-center py-1">
                                        <label htmlFor="birthDateEdit" className="text-sm font-medium text-gray-600">Születési idő</label>
                                        <div className="col-span-2">
                                            <${DateInput} id="birthDateEdit" name="birthDate" value=${formData.birthDate} onChange=${handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm" />
                                        </div>
                                    </div>
                                    <${EditableField} label="Születési ország" name="birth_country" value=${formData.birth_country} onChange=${handleChange} />
                                    <${EditableField} label="Születési hely" name="birth_city" value=${formData.birth_city} onChange=${handleChange} />
                                    ${formData.birth_city && formData.birth_city.toLowerCase().trim() === 'budapest' && html`
                                        <${EditableField} label="Születési kerület" name="birth_district" value=${formData.birth_district} onChange=${handleChange} type="select" options=${[ {value: "", label: "Válassz..."}, ...budapestDistricts.map(d => ({value: d, label: d}))]} />
                                    `}
                                    <${EditableField} label="Állampolgárság" name="nationality" value=${formData.nationality} onChange=${handleChange} />
                                    <${EditableField} label="Kettős állampolgár" name="isDualCitizen" value=${formData.isDualCitizen} onChange=${handleChange} type="checkbox" />
                                    ${formData.isDualCitizen && html`<${EditableField} label="Második állampolgárság" name="secondNationality" value=${formData.secondNationality} onChange=${handleChange} />`}
                                <//>
                            </div>
                        `}
                        ${activeTab === 'documents' && html`
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <${Section} title="Okmányok és végzettség">
                                    <${EditableField} label="Okmány típusa" name="documentType" value=${formData.documentType} onChange=${handleChange} type="select" options=${documentTypeOptions} />
                                    <${EditableField} label="Okmány száma" name="documentNumber" value=${formData.documentNumber} onChange=${handleChange} />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 items-center py-1">
                                        <label htmlFor="documentExpiryEdit" className="text-sm font-medium text-gray-600">Okmány lejárata</label>
                                        <div className="col-span-2">
                                            <${DateInput} id="documentExpiryEdit" name="documentExpiry" value=${formData.documentExpiry} onChange=${handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm" />
                                        </div>
                                    </div>
                                    <${EditableField} label="Végzettség" name="education" value=${formData.education} onChange=${handleChange} type="select" options=${educationOptions} />
                                <//>
                            </div>
                        `}
                        ${activeTab === 'address' && html`
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <${Section} title="Állandó lakcím">
                                    <${EditableField} label="Ország" name="permanent_address_country" value=${formData.permanent_address_country} onChange=${handleChange} />
                                    <${EditableField} label="Irányítószám" name="permanent_address_zip" value=${formData.permanent_address_zip} onChange=${handleChange} />
                                    <${EditableField} label="Város" name="permanent_address_city" value=${formData.permanent_address_city} onChange=${handleChange} />
                                    <${EditableField} label="Közterület" name="permanent_address_street" value=${formData.permanent_address_street} onChange=${handleChange} />
                                    <${EditableField} label="Jelleg" name="permanent_address_streetType" value=${formData.permanent_address_streetType} onChange=${handleChange} />
                                    <${EditableField} label="Házszám" name="permanent_address_houseNumber" value=${formData.permanent_address_houseNumber} onChange=${handleChange} />
                                    <${EditableField} label="Épület" name="permanent_address_building" value=${formData.permanent_address_building} onChange=${handleChange} />
                                    <${EditableField} label="Lépcsőház" name="permanent_address_staircase" value=${formData.permanent_address_staircase} onChange=${handleChange} />
                                    <${EditableField} label="Emelet" name="permanent_address_floor" value=${formData.permanent_address_floor} onChange=${handleChange} />
                                    <${EditableField} label="Ajtó" name="permanent_address_door" value=${formData.permanent_address_door} onChange=${handleChange} />
                                <//>
                                <${Section} title="Tartózkodási hely">
                                    <${EditableField} label="Azonos a lakcímmel" name="residenceIsSame" value=${formData.residenceIsSame} onChange=${handleChange} type="checkbox" />
                                    <${EditableField} label="Ország" name="temporary_address_country" value=${formData.temporary_address_country} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Irányítószám" name="temporary_address_zip" value=${formData.temporary_address_zip} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Város" name="temporary_address_city" value=${formData.temporary_address_city} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Közterület" name="temporary_address_street" value=${formData.temporary_address_street} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Jelleg" name="temporary_address_streetType" value=${formData.temporary_address_streetType} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Házszám" name="temporary_address_houseNumber" value=${formData.temporary_address_houseNumber} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Épület" name="temporary_address_building" value=${formData.temporary_address_building} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Lépcsőház" name="temporary_address_staircase" value=${formData.temporary_address_staircase} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Emelet" name="temporary_address_floor" value=${formData.temporary_address_floor} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                    <${EditableField} label="Ajtó" name="temporary_address_door" value=${formData.temporary_address_door} onChange=${handleChange} disabled=${formData.residenceIsSame} />
                                <//>
                            </div>
                        `}
                        ${activeTab === 'contact' && html`
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <${Section} title="Tanuló elérhetőségei">
                                    <${EditableField} label="Email" name="email" value=${formData.email} onChange=${handleChange} type="email" />
                                    <${EditableField} label="Telefonszám" name="phone_number" value=${formData.phone_number} onChange=${handleChange} type="tel" />
                                    <${EditableField} label="Megjegyzés" name="megjegyzes" value=${formData.megjegyzes} onChange=${handleChange} />
                                <//>
                                <${Section} title="Gondviselő elérhetőségei">
                                    <${EditableField} label="Neve" name="guardian_name" value=${formData.guardian_name} onChange=${handleChange} />
                                    <${EditableField} label="Email" name="guardian_email" value=${formData.guardian_email} onChange=${handleChange} type="email" />
                                    <${EditableField} label="Telefonszám" name="guardian_phone" value=${formData.guardian_phone} onChange=${handleChange} type="tel" />
                                <//>
                            </div>
                        `}
                        ${activeTab === 'history' && html`
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <${Section} title="Tanulmányi előzmények">
                                    <${EditableField} label="Van korábbi jogosítványa" name="has_previous_license" value=${formData.has_previous_license} onChange=${handleChange} type="select" options=${[{value: 'nem', label: 'Nem'}, {value: 'igen', label: 'Igen'}]} />
                                    <${EditableField} label="Korábbi kategóriák" name="previous_license_categories" value=${formData.previous_license_categories} onChange=${handleChange} />
                                    <${EditableField} label="Tanult máshol/nálunk" name="studied_elsewhere_radio" value=${formData.studied_elsewhere_radio} onChange=${handleChange} type="select" options=${[{value: 'nem', label: 'Nem'}, {value: 'igen_nalunk', label: 'Igen, nálunk'}, {value: 'igen_mashol', label: 'Igen, máshol'}]} />
                                    <${EditableField} label="Hány sikertelen vizsga" name="failed_exam_count" value=${formData.failed_exam_count} onChange=${handleChange} type="number" />
                                <//>
                                <${Section} title="Adminisztratív időbélyegek">
                                    <div className="text-sm text-gray-600 space-y-3">
                                        ${['createdAt', 'enrolledAt', 'studentIdAssignedAt', 'courseCompletedAt'].map(field => html`
                                            <div key=${field} className="flex justify-between items-center">
                                                <span>${{createdAt: 'Jelentkezés', enrolledAt: 'Beiratkozás', studentIdAssignedAt: 'Azonosító kiadva', courseCompletedAt: 'Tanfolyam kész'}[field]}: <strong>${formatSingleTimestamp(formData[field]) || 'N/A'}</strong></span>
                                                ${formData[field] && html`<button onClick=${() => handleTimestampDeleteRequest(field, {createdAt: 'Jelentkezés', enrolledAt: 'Beiratkozás', studentIdAssignedAt: 'Azonosító', courseCompletedAt: 'Tanfolyam kész'}[field])} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" title="Időbélyeg törlése"><${XCircleIcon} size=${16} /></button>`}
                                            </div>
                                        `)}
                                    </div>
                                <//>
                            </div>
                        `}
                    </div>
                </main>
                <footer className="p-4 bg-white rounded-b-xl border-t flex justify-end items-center gap-4">
                    <button onClick=${onClose} className="bg-stone-200 text-stone-800 font-semibold py-2 px-6 rounded-md hover:bg-stone-300">Mégse</button>
                    <button onClick=${handleSave} disabled=${isSaving} className="bg-teal-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-teal-700 disabled:opacity-50">
                        ${isSaving ? 'Mentés...' : 'Változások mentése'}
                    </button>
                </footer>
            </div>
        </div>
    `;
};

export default EditDetailsModal;
