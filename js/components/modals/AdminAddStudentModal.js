/**
 * js/components/modals/AdminAddStudentModal.js
 * * Modal for admins to manually add a new student.
 * * This version adds a default 'active' status and logs the creation action.
 * * JAVÍTÁS 2: A segédkomponensek (TabButton, Section) kiemelése és a beviteli mezők memoizálása. Ez a végleges megoldás a fókuszvesztési hibára.
 * * MÓDOSÍTÁS: A színséma frissítve az új dizájn szerint (türkiz/cián).
 * * JAVÍTÁS 3: A hibásan megjelenő JSX kommentek eltávolítva a kódból.
 * * JAVÍTÁS 4: A komponens most már a biztonságos 'adminAddStudent' Cloud Functiont hívja a közvetlen adatbázis-írás helyett, megoldva a jogosultsági hibát.
 * * MÓDOSÍTÁS 5: Új jelölőnégyzet hozzáadva, amellyel az admin kérheti az első, fizetési tájékoztató e-mail kiküldését.
 * * MÓDOSÍTÁS 6: A tartózkodási hely szekció kiegészítve a hiányzó mezőkkel (épület, lépcsőház, emelet, ajtó).
 */

import { html } from '../../UI.js';
// JAVÍTÁS: A 'functions' és 'httpsCallable' importálása a Cloud Function hívásához.
import { functions, httpsCallable } from '../../firebase.js';
import { XIcon } from '../../Icons.js';
import { prefixOptions, budapestDistricts, documentTypeOptions, educationOptions } from '../../constants.js';
import UnmemoizedEditableField from '../EditableField.js';
import UnmemoizedDateInput from '../DateInput.js';
import { useToast } from '../../context/AppContext.js';
// A logAdminAction már nem szükséges itt, mert a Cloud Function naplóz.
// import { logAdminAction } from '../../actions.js';
import { formatFullName } from '../../utils.js';

const React = window.React;
const { useState, useCallback } = React;

// JAVÍTÁS: A gyermek komponensek memoizálása, hogy megakadályozzuk a felesleges újrarenderelést gépelés közben.
const EditableField = React.memo(UnmemoizedEditableField);
const DateInput = React.memo(UnmemoizedDateInput);

// JAVÍTÁS: A segédkomponensek kiemelése a fő komponensből, hogy megakadályozzuk az újra-deklarálásukat minden renderelésnél.
const TabButton = ({ tabId, label, activeTab, setActiveTab }) => html`
    <button 
        onClick=${() => setActiveTab(tabId)}
        className=${`px-3 py-2 text-xs sm:text-sm font-medium rounded-t-lg border-l border-t border-r -mb-px ${activeTab === tabId ? 'bg-white border-b-white text-teal-600' : 'bg-stone-50 text-gray-500 hover:bg-stone-100 border-stone-200'}`}
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


const AdminAddStudentModal = ({ onClose, adminUser, isTestView }) => { // ÚJ: isTestView prop hozzáadása
    const initialFormData = {
        current_prefix: '', current_lastName: '', current_firstName: '', current_secondName: '',
        birth_prefix: '', birth_lastName: '', birth_firstName: '', birth_secondName: '',
        copyNameToBirth: true,
        mother_prefix: '', mother_lastName: '', mother_firstName: '', mother_secondName: '',
        birth_country: 'Magyarország', birth_city: '', birth_district: '', birthDate: '',
        nationality: 'magyar', isDualCitizen: false, secondNationality: '',
        documentType: '', documentNumber: '', documentExpiry: '',
        education: '',
        has_previous_license: 'nem', previous_license_number: '', previous_license_categories: '',
        studied_elsewhere_radio: 'nem', had_exam_recently_radio: 'nem', failed_exam_count: 0,
        permanent_address_country: 'Magyarország', permanent_address_zip: '', permanent_address_city: '', permanent_address_street: '', permanent_address_streetType: '', permanent_address_houseNumber: '', permanent_address_building: '', permanent_address_staircase: '', permanent_address_floor: '', permanent_address_door: '',
        residenceIsSame: true,
        temporary_address_country: 'Magyarország', temporary_address_zip: '', temporary_address_city: '', temporary_address_street: '', temporary_address_streetType: '', temporary_address_houseNumber: '', temporary_address_building: '', temporary_address_staircase: '', temporary_address_floor: '', temporary_address_door: '',
        phone_number: '', email: '',
        guardian_name: '', guardian_phone: '', guardian_email: '',
        megjegyzes: '',
        // MÓDOSÍTÁS: Új állapot az email küldés vezérléséhez
        sendInitialEmail: false,
    };
    
    const [formData, setFormData] = useState(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const showToast = useToast();

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const newState = { ...prev, [name]: val };

            const isCopyingName = (name === 'copyNameToBirth') ? val : newState.copyNameToBirth;
            const isCurrentNameField = ['current_prefix', 'current_lastName', 'current_firstName', 'current_secondName'].includes(name);

            if (isCopyingName && (name === 'copyNameToBirth' || isCurrentNameField)) {
                newState.birth_prefix = newState.current_prefix;
                newState.birth_lastName = newState.current_lastName;
                newState.birth_firstName = newState.current_firstName;
                newState.birth_secondName = newState.current_secondName;
            }

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // JAVÍTÁS: A biztonságos Cloud Function hívása
            const adminAddStudent = httpsCallable(functions, 'adminAddStudent');

            // ÚJ: Az _isTest flag átadása a payloadban, ha az admin teszt nézetben van
            const payload = { ...formData };
            if (isTestView) {
                payload._isTest = true;
            }

            // Az űrlap adatai (beleértve a sendInitialEmail állapotát is) átadódnak
            await adminAddStudent(payload);
            
            const modeText = isTestView ? ' (TESZT)' : '';
            showToast(`Tanuló sikeresen rögzítve${modeText}!`, 'success');
            onClose();
        } catch (error) {
            console.error("Hiba a tanuló mentésekor: ", error);
            showToast(error.message || 'Hiba a mentés során!', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick=${onClose}>
            <div className="bg-stone-50 rounded-xl shadow-2xl w-full max-w-6xl transform transition-all" onClick=${e => e.stopPropagation()}>
                <header className=${`p-6 border-b rounded-t-xl flex justify-between items-center ${isTestView ? 'bg-red-50' : 'bg-white'}`}>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">
                            Új tanuló manuális rögzítése
                            ${isTestView && html`<span className="text-red-600 ml-2">(TESZT MÓD)</span>`}
                        </h3>
                        <p className="text-gray-500">Töltsd ki a tanuló adatait.</p>
                    </div>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><${XIcon} size=${24} /></button>
                </header>
                <main className="p-2 sm:p-6 max-h-[70vh] overflow-y-auto">
                    <div className="border-b border-stone-200">
                        <nav className="flex flex-wrap space-x-1 sm:space-x-2" aria-label="Tabs">
                            <${TabButton} tabId="personal" label="Személyes adatok" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                            <${TabButton} tabId="docs" label="Okmányok és előzmények" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                            <${TabButton} tabId="address" label="Címek" activeTab=${activeTab} setActiveTab=${setActiveTab} />
                            <${TabButton} tabId="contact" label="Elérhetőségek" activeTab=${activeTab} setActiveTab=${setActiveTab} />
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
                                    <${EditableField} label="Azonos a viselt névvel" name="copyNameToBirth" value=${formData.copyNameToBirth} onChange=${handleChange} type="checkbox" />
                                    <${EditableField} label="Előtag" name="birth_prefix" value=${formData.birth_prefix} onChange=${handleChange} type="select" options=${prefixOptions} disabled=${formData.copyNameToBirth} />
                                    <${EditableField} label="Családi név" name="birth_lastName" value=${formData.birth_lastName} onChange=${handleChange} required=${true} disabled=${formData.copyNameToBirth} />
                                    <${EditableField} label="Utónév" name="birth_firstName" value=${formData.birth_firstName} onChange=${handleChange} required=${true} disabled=${formData.copyNameToBirth} />
                                    <${EditableField} label="Második utónév" name="birth_secondName" value=${formData.birth_secondName} onChange=${handleChange} disabled=${formData.copyNameToBirth} />
                                <//>
                                <${Section} title="Anyja neve">
                                    <${EditableField} label="Előtag" name="mother_prefix" value=${formData.mother_prefix} onChange=${handleChange} type="select" options=${prefixOptions} />
                                    <${EditableField} label="Családi név" name="mother_lastName" value=${formData.mother_lastName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Utónév" name="mother_firstName" value=${formData.mother_firstName} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Második utónév" name="mother_secondName" value=${formData.mother_secondName} onChange=${handleChange} />
                                <//>
                                <${Section} title="Születési adatok">
                                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 items-center py-1">
                                        <label htmlFor="birthDateAdmin" className="text-sm font-medium text-gray-600">Születési idő<span className="text-red-500 ml-1">*</span></label>
                                        <div className="col-span-2">
                                            <${DateInput} id="birthDateAdmin" name="birthDate" value=${formData.birthDate} onChange=${handleChange} required=${true} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm" />
                                        </div>
                                    </div>
                                    <${EditableField} label="Születési ország" name="birth_country" value=${formData.birth_country} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Születési hely" name="birth_city" value=${formData.birth_city} onChange=${handleChange} required=${true} />
                                    ${formData.birth_city.toLowerCase().trim() === 'budapest' && html`
                                        <${EditableField} label="Születési kerület" name="birth_district" value=${formData.birth_district} onChange=${handleChange} type="select" required=${true} options=${[ {value: "", label: "Válassz kerületet..."}, ...budapestDistricts.map(d => ({value: d, label: d}))]} />
                                    `}
                                    <${EditableField} label="Állampolgárság" name="nationality" value=${formData.nationality} onChange=${handleChange} required=${true} />
                                    <${EditableField} label="Kettős állampolgár" name="isDualCitizen" value=${formData.isDualCitizen} onChange=${handleChange} type="checkbox" />
                                    ${formData.isDualCitizen && html`<${EditableField} label="Második állampolgárság" name="secondNationality" value=${formData.secondNationality} onChange=${handleChange} required=${true} />`}
                                <//>
                            </div>
                        `}
                         ${activeTab === 'docs' && html`
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <${Section} title="Okmányok és végzettség">
                                    <${EditableField} label="Okmány típusa" name="documentType" value=${formData.documentType} onChange=${handleChange} type="select" options=${documentTypeOptions} required=${true} />
                                    <${EditableField} label="Okmány száma" name="documentNumber" value=${formData.documentNumber} onChange=${handleChange} required=${true} />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 items-center py-1">
                                        <label htmlFor="documentExpiryAdmin" className="text-sm font-medium text-gray-600">Lejárati idő<span className="text-red-500 ml-1">*</span></label>
                                        <div className="col-span-2">
                                            <${DateInput} id="documentExpiryAdmin" name="documentExpiry" value=${formData.documentExpiry} onChange=${handleChange} required=${true} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm" />
                                        </div>
                                    </div>
                                    <${EditableField} label="Végzettség" name="education" value=${formData.education} onChange=${handleChange} type="select" options=${educationOptions} required=${true} />
                                <//>
                                <${Section} title="Tanulmányi előzmények">
                                    <${EditableField} label="Van korábbi jogosítványa" name="has_previous_license" value=${formData.has_previous_license} onChange=${handleChange} type="select" options=${[{value: 'nem', label: 'Nem'}, {value: 'igen', label: 'Igen'}]} />
                                    <${EditableField} label="Korábbi kategóriák" name="previous_license_categories" value=${formData.previous_license_categories} onChange=${handleChange} />
                                    <${EditableField} label="Tanult máshol/nálunk" name="studied_elsewhere_radio" value=${formData.studied_elsewhere_radio} onChange=${handleChange} type="select" options=${[{value: 'nem', label: 'Nem'}, {value: 'igen_nalunk', label: 'Igen, nálunk'}, {value: 'igen_mashol', label: 'Igen, máshol'}]} />
                                    <${EditableField} label="Hány sikertelen vizsga" name="failed_exam_count" value=${formData.failed_exam_count} onChange=${handleChange} type="number" />
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
                                    <${EditableField} label="Email" name="email" value=${formData.email} onChange=${handleChange} type="email" required=${true} />
                                    <${EditableField} label="Telefonszám" name="phone_number" value=${formData.phone_number} onChange=${handleChange} type="tel" required=${true} />
                                    <${EditableField} label="Megjegyzés" name="megjegyzes" value=${formData.megjegyzes} onChange=${handleChange} />
                                <//>
                                <${Section} title="Gondviselő elérhetőségei">
                                    <${EditableField} label="Neve" name="guardian_name" value=${formData.guardian_name} onChange=${handleChange} />
                                    <${EditableField} label="Email" name="guardian_email" value=${formData.guardian_email} onChange=${handleChange} type="email" />
                                    <${EditableField} label="Telefonszám" name="guardian_phone" value=${formData.guardian_phone} onChange=${handleChange} type="tel" />
                                <//>
                            </div>
                        `}
                    </div>
                </main>
                <footer className="p-4 bg-white rounded-b-xl border-t flex justify-between items-center gap-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="sendInitialEmail" name="sendInitialEmail" checked=${formData.sendInitialEmail} onChange=${handleChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                        <label htmlFor="sendInitialEmail" className="ml-2 text-sm font-medium text-gray-700">Fizetési tájékoztató e-mail küldése</label>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick=${onClose} className="bg-stone-200 text-stone-800 font-semibold py-2 px-6 rounded-md hover:bg-stone-300">Mégse</button>
                        <button onClick=${handleSave} disabled=${isSaving} className="bg-teal-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-teal-700 disabled:opacity-50">
                            ${isSaving ? 'Mentés...' : 'Tanuló rögzítése'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    `;
};

export default AdminAddStudentModal;
