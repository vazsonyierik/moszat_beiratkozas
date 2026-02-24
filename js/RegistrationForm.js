/**
 * js/RegistrationForm.js
 * * The main registration form component.
 * FIX V3: Solved input focus loss permanently by memoizing child components (ValidatedInput) and handlers.
 * UPDATE V3: Validation checkmark now appears onBlur and is positioned correctly inside the input field.
 * FIX V3: Checkmarks no longer appear on disabled fields.
 * FIX V3: Corrected various minor validation logic bugs.
 * UPDATE V4: Added icons to navigation buttons for better UX.
 * UPDATE V4.1: Added CSS classes for new card and separator styles.
 * FIX V4.2: Corrected SVG attribute warnings in navigation buttons.
 * MODIFICATION: Re-integrated the missing "Previous License and Studies" section.
 * FIX: Resolved accessibility issue by replacing orphaned <label> tags with <div> tags.
 * JAVÍTÁS: Az információs ablak (tooltip) pozicionálása javítva, hogy ne lógjon ki a képernyőről.
 * JAVÍTÁS 2: Az információs dobozok stílusa frissítve a jobb láthatóság és design érdekében.
 * JAVÍTÁS 3: Mobil nézet visszaállítva, asztali ikon és tooltip stílus javítva.
 * JAVÍTÁS 4: A lépések közötti váltás animációjának implementálása.
 * KÉRÉS ALAPJÁN: A gondviselői szekció információs ikonja áthelyezve a tartalom jobb felső sarkába.
 * JAVÍTÁS 5: Az ikon pozíciója a felhasználói visszajelzés alapján korrigálva a "Neve" mező mellé.
 * JAVÍTÁS 6: A felületen megjelenő fejlesztői kommentek eltávolítva és az információs doboz láthatósága mobilra korlátozva.
 * JAVÍTÁS 7: A hibásan renderelt kommentek véglegesen eltávolítva és az asztali nézetben hiányzó ikon visszaállítva.
 * JAVÍTÁS 8: A beviteli mezők vízszintes igazítása asztali nézetben és az ikon pozíciójának véglegesítése.
 * JAVÍTÁS 9: A felhasználó által jelzett, renderelt kommentek eltávolítása és a beviteli mezők igazítása.
 * JAVÍTÁS 10: A csak mobilon szükséges információs dobozok elrejtése asztali nézetben.
 * MÓDOSÍTÁS: Logó hozzáadása az űrlap fejlécéhez.
 * JAVÍTÁS 12: A teljes validációs pipa (checkmark) implementáció eltávolítva a kódból.
 * JAVÍTÁS 13: Mobil nézetben hiba esetén az oldal az első hibára ugrik.
 * JAVÍTÁS 14: Figyelmeztető ikon bevezetése a lejárt okmányhoz és a 18 év alatti gondviselői adatokhoz.
 * MÓDOSÍTÁS 15: Asztali nézetben is működik a hibára görgetés, és a hibás mezők piros keretet és ikont kapnak.
 * JAVÍTÁS 16: A renderelt JSX kommentek eltávolítva.
 * JAVÍTÁS 17: A hibajelzés (piros keret, ikon, üzenet) eltűnik, amint a felhasználó elkezd gépelni a mezőbe.
 * JAVÍTÁS 18: A hibajelzés nem jelenik meg az inaktív (disabled) "Születési név" mezőkön.
 * JAVÍTÁS 19: A választómenük (select) hibajelzése már a menü megnyitásakor (onFocus) eltűnik.
 * JAVÍTÁS 20: Kijavítva a szintaktikai hiba.
 * MÓDOSÍTÁS 21: A lejárt okmány figyelmeztetés HTML struktúrája módosítva a tooltip működéséhez.
 * MÓDOSÍTÁS 22: A ValidatedInput komponens kiegészítve a warning (figyelmeztetés) állapot kezelésével.
 * JAVÍTÁS 23: Kijavítva a 'class' vs 'className' React hibát és a figyelmeztetés HTML struktúrája a jobb mobil megjelenés érdekében.
 * JAVÍTÁS 24: Egységesítve a tooltip-ek stílusát.
 * JAVÍTÁS 25: A nyilatkozatok szekció hibajelzése vizuálisan kiemelve.
 * JAVÍTÁS 26: A nyilatkozatok szekció hibajelzéséből eltávolítva a teljes doboz színezése.
 * JAVÍTÁS 27: A "Hiba a kitöltésben" felugró ablak eltávolítva, helyette az űrlap az első hibára ugrik.
 * JAVÍTÁS 28: A folyamatjelző (stepper) kattinthatóvá téve és a gondviselő e-mail validációja javítva.
 * JAVÍTÁS 38 (VÉGLEGES STRUKTURÁLIS JAVÍTÁS): A `key` hiba véglegesen megoldva a renderelési logika refaktorálásával. A sikeres beküldés után a teljes űrlap cserélődik le a "Siker" nézetre, ahogy a korábbi, működő verzióban, megelőzve a React összezavarodását.
 * JAVÍTÁS 39: A "Születési idő" validációja kiegészítve, hogy csak a teljes dátumot fogadja el.
 * JAVÍTÁS 40: A hibaüzenet szövege tegeződő formára módosítva a felhasználói kérés alapján.
 * JAVÍTÁS 41: Új validáció hozzáadva, amely megakadályozza, hogy a 18 év alatti tanuló és a gondviselő ugyanazt az e-mail címet vagy telefonszámot adja meg.
 * MÓDOSÍTÁS 42: A születési hely ("Budapest") átírásakor a kerület mező automatikusan törlődik.
 * MÓDOSÍTÁS 43: A gondviselői szekció logikája módosítva: 18 év felett alapból letiltva, és egy jelölőnégyzettel aktiválható.
 * MÓDOSÍTÁS 45: Az igazítási probléma megoldva a jelölőnégyzet áthelyezésével a kártya aljára.
 * MÓDOSÍTÁS 46: A 18 év feletti gondviselői adatok validációja kiegészítve, és az információs ikon visszaállítva.
 * MÓDOSÍTÁS 47: Az e-mail mezők kiegészítve az `inputmode="email"` attribútummal a jobb mobil billentyűzet érdekében.
 * MÓDOSÍTÁS 48: A "Közterület jellege" mezők kiegészítve az `autocapitalize="none"` attribútummal.
 */
import { html, LoadingOverlay, InfoModal } from './UI.js';
import { functions, httpsCallable, isTestMode } from './firebase.js'; // ÚJ: isTestMode importálása
import DateInput from './components/DateInput.js';
import PrivacyPolicyModal from './components/PrivacyPolicyModal.js';
import TrainingInfoModal from './components/TrainingInfoModal.js';
import { formatFullName } from './utils.js';
import { educationOptions, documentTypeOptions } from './constants.js';
import Stepper from './components/Stepper.js';
import { InfoIcon, AlertTriangleIcon, AlertCircleIcon } from './Icons.js';

const { useState, useEffect, useMemo, Fragment, useCallback, useRef } = window.React;

// --- Helper Functions & Memoized Components ---

const isDateStringValidAndUnder18 = (birthDateStr) => {
    if (!birthDateStr || birthDateStr.length !== 10) return false;
    const parts = birthDateStr.split('.').map(p => parseInt(p.trim(), 10));
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const [year, month, day] = parts;
    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age < 18;
};

const ValidatedInput = React.memo(({ name, label, required, children, error, warning, disabled, className = '' }) => {
    const hasError = error && !disabled;
    const hasWarning = warning && !disabled;
    const childWithProps = React.cloneElement(children, {
        className: `${children.props.className || ''} ${hasError ? 'has-error' : ''} ${hasWarning ? 'has-warning' : ''}`,
        disabled: disabled // Pass disabled prop to the actual input element
    });

    return html`
        <div className=${`input-group ${className}`}>
            <label htmlFor=${name}>
                ${label}
                ${required && (typeof label === 'string') && html`<span className="required-star">*</span>`}
            </label>
            <div className="input-wrapper">
                ${childWithProps}
                ${hasError && html`<${AlertCircleIcon} className="error-icon" />`}
                ${hasWarning && !hasError && html`
                    <div className="warning-icon-wrapper">
                        <${AlertTriangleIcon} size=${16} className="warning-icon" />
                        <span className="warning-message-text">${warning}</span>
                    </div>
                `}
            </div>
            ${hasError && html`<p className="error-message">${error}</p>`}
            ${hasWarning && !hasError && html`<div className="warning-message-mobile">${warning}</div>`}
        </div>
    `;
});

const ValidatedSelect = React.memo(({ name, label, required, value, onChange, onFocus, error, options, disabled = false, className = '' }) => {
    return html`
        <${ValidatedInput} name=${name} label=${label} required=${required} error=${error} disabled=${disabled} className=${className}>
            <select id=${name} name=${name} value=${value} onChange=${onChange} onFocus=${onFocus} disabled=${disabled} required=${required} className="input">
                ${options.map((opt, index) => html`
                    <option key=${index} value=${opt.value} disabled=${opt.disabled || false}>
                        ${opt.label}
                    </option>
                `)}
            </select>
        <//>
    `;
});


const Collapsible = ({ isVisible, children }) => {
    return html`
        <div className=${`collapsible-section ${isVisible ? 'is-open' : ''}`}>
            <div className="collapsible-content">
                ${children}
            </div>
        </div>
    `;
};

const SuccessView = ({ onNewRegistration }) => {
    return html`
        <div className="registration-card">
             <div className="registration-logo-header">
                <img src="https://moszat.hu/moszat_teszt/images/logo100px.png" alt="Mosolyzóna Kreszprofesszor Autósiskola Logó" />
            </div>
            <div className="registration-card-header">
                <h1>BEIRATKOZÁSI ADATLAP</h1>
                <p>Köszönjük a bizalmadat!</p>
            </div>
            <style>
                @keyframes scale-in {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .success-view-content {
                    animation: scale-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
                }
            </style>
            <div className="text-center py-12 px-6 form-step success-view-content">
                <div className="inline-block bg-teal-100 p-5 rounded-full mb-6">
                    <svg className="w-16 h-16 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Sikeresen beiratkoztál!</h2>
                <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8">
                    A beiratkozásod részleteit és a további teendőket elküldtük az általad megadott e-mail címre.
                </p>
                <div className="bg-teal-50 border-l-4 border-teal-500 text-teal-800 p-4 rounded-md max-w-xl mx-auto text-left">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm">
                                Ha pár percen belül nem érkezik meg az e-mail, kérjük a <strong>SPAM</strong> vagy <strong>Promóciós</strong> mappákat is nézd meg!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="form-navigation">
                <div></div>
                <div>
                    <button type="button" onClick=${onNewRegistration} className="form-button primary">
                        <span>Új beiratkozás</span>
                    </button>
                </div>
            </div>
        </div>
    `;
};


const RegistrationForm = () => {
    const initialFormData = {
        current_prefix: '', current_lastName: '', current_firstName: '', current_secondName: '',
        birth_prefix: '', birth_lastName: '', birth_firstName: '', birth_secondName: '',
        copyNameToBirth: true,
        mother_prefix: '', mother_lastName: '', mother_firstName: '', mother_secondName: '',
        birth_country: 'Magyarország', birth_city: 'Budapest', birth_district: '', birthDate: '',
        nationality: 'magyar', isDualCitizen: false, secondNationality: '',
        documentType: '', documentNumber: '', documentExpiry: '',
        education: '',
        has_previous_license: 'nem', previous_license_number: '', previous_license_categories: '',
        studied_elsewhere_radio: 'nem', had_exam_recently_radio: 'nem', failed_exam_count: 0,
        permanent_address_country: 'Magyarország', permanent_address_zip: '', permanent_address_city: 'Budapest', permanent_address_street: '', permanent_address_streetType: '', permanent_address_houseNumber: '', permanent_address_building: '', permanent_address_staircase: '', permanent_address_floor: '', permanent_address_door: '',
        residenceIsSame: true,
        temporary_address_country: 'Magyarország', temporary_address_zip: '', temporary_address_city: 'Budapest', temporary_address_street: '', temporary_address_streetType: '', temporary_address_houseNumber: '', temporary_address_building: '', temporary_address_staircase: '', temporary_address_floor: '', temporary_address_door: '',
        phone_number: '', email: '', email_confirm: '',
        guardian_name: '', guardian_phone: '', guardian_email: '', guardian_email_confirm: '',
        declaration_data: false,
        declaration_medical: false,
        declaration_education: false,
        declaration_training_info: false,
        declaration_privacy: false,
        megjegyzes: '',
    };
    
    const budapestDistricts = Array.from({ length: 23 }, (_, i) => ({ value: `${(i + 1).toString().padStart(2, '0')}. kerület`, label: `${(i + 1).toString().padStart(2, '0')}. kerület` }));
    const prefixOptions = [{value: '', label: ''}, {value: 'dr.', label: 'dr.'}, {value: 'Dr.', label: 'Dr.'}];


    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalInfo, setModalInfo] = useState(null);
    const [documentExpiryWarning, setDocumentExpiryWarning] = useState(null);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showTrainingInfoModal, setShowTrainingInfoModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [highestValidatedStep, setHighestValidatedStep] = useState(0);
    const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
    // MÓDOSÍTÁS: Új állapot a gondviselői adatok önkéntes megadásához
    const [wantsToProvideGuardianData, setWantsToProvideGuardianData] = useState(false);
    const stepperRef = useRef(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else if (stepperRef.current && !isSubmittedSuccessfully) {
            stepperRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, [currentStep, isSubmittedSuccessfully]);

    const isUnder18 = useMemo(() => {
        return isDateStringValidAndUnder18(formData.birthDate);
    }, [formData.birthDate]);
    
    // MÓDOSÍTÁS: Ha a tanuló betölti a 18-at, alaphelyzetbe állítjuk az önkéntes választást
    useEffect(() => {
        if (!isUnder18) {
            // A mezők letiltásra kerülnek, az önkéntes választás alaphelyzetbe áll
        } else {
            // Ha a tanuló 18 év alatti lesz, az önkéntes választás irreleváns
            setWantsToProvideGuardianData(false);
        }
    }, [isUnder18]);

    const steps = [
        { id: 1, name: 'Személyes adatok', fields: ['current_lastName', 'current_firstName', 'birth_lastName', 'birth_firstName', 'mother_lastName', 'mother_firstName', 'birthDate', 'birth_city', 'birth_district', 'nationality'] },
        { id: 2, name: 'Okmányok és lakcím', fields: ['documentType', 'documentNumber', 'documentExpiry', 'education', 'permanent_address_zip', 'permanent_address_city', 'permanent_address_street', 'permanent_address_streetType', 'permanent_address_houseNumber'] },
        { id: 3, name: 'Elérhetőségek', fields: ['phone_number', 'email', 'email_confirm', 'guardian_name', 'guardian_phone', 'guardian_email', 'guardian_email_confirm'] },
        { id: 4, name: 'Nyilatkozatok', fields: ['declarations'] }
    ];
    
    const handleInteraction = useCallback((e) => {
        const { name } = e.target;
        setErrors(prevErrors => {
            if (!prevErrors[name]) return prevErrors;
            const newErrors = { ...prevErrors };
            delete newErrors[name];
            return newErrors;
        });
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const newState = { ...prev, [name]: finalValue };
             // MÓDOSÍTÁS: Ha a születési hely már nem Budapest, töröljük a kerületet
            if (name === 'birth_city' && finalValue.toLowerCase().trim() !== 'budapest') {
                newState.birth_district = '';
            }
            return newState;
        });

        handleInteraction(e);

        if (formData.copyNameToBirth && (name === 'current_lastName' || name === 'current_firstName')) {
            setErrors(prevErrors => {
                const newErrors = { ...prevErrors };
                delete newErrors.birth_lastName;
                delete newErrors.birth_firstName;
                return newErrors;
            });
        }

        if (name === 'documentExpiry') {
            setDocumentExpiryWarning(null);
            if (finalValue.length === 10) {
                const parts = finalValue.split('.').map(p => parseInt(p.trim(), 10));
                if (parts.length === 3 && !parts.some(isNaN)) {
                    const expiryDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (expiryDate < today) {
                        setDocumentExpiryWarning('Figyelem, az okmányod lejárt! A vizsgákhoz érvényes okmányra lesz szükséged.');
                    }
                }
            }
        }
    }, [formData.copyNameToBirth, handleInteraction]);

    // MÓDOSÍTÁS: Külön eseménykezelő a gondviselői adatok önkéntes megadásához
    const handleWantsToProvideGuardianChange = (e) => {
        const isChecked = e.target.checked;
        setWantsToProvideGuardianData(isChecked);
        if (!isChecked) {
            // Ha a felhasználó meggondolja magát, töröljük a beírt adatokat és a hibákat
            setFormData(prev => ({
                ...prev,
                guardian_name: '',
                guardian_phone: '',
                guardian_email: '',
                guardian_email_confirm: ''
            }));
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.guardian_name;
                delete newErrors.guardian_phone;
                delete newErrors.guardian_email;
                delete newErrors.guardian_email_confirm;
                return newErrors;
            });
        }
    };

    useEffect(() => {
        if (!formData.isDualCitizen) {
            setFormData(prev => ({ ...prev, secondNationality: '' }));
        }
    }, [formData.isDualCitizen]);

    useEffect(() => {
        if (formData.has_previous_license === 'nem') {
            setFormData(prev => ({
                ...prev,
                previous_license_number: '',
                previous_license_categories: ''
            }));
        }
    }, [formData.has_previous_license]);

    useEffect(() => {
        if (formData.studied_elsewhere_radio === 'nem') {
            setFormData(prev => ({
                ...prev,
                had_exam_recently_radio: 'nem',
                failed_exam_count: 0
            }));
        }
    }, [formData.studied_elsewhere_radio]);

    useEffect(() => {
        if (formData.had_exam_recently_radio === 'nem') {
            setFormData(prev => ({ ...prev, failed_exam_count: 0 }));
        }
    }, [formData.had_exam_recently_radio]);
    
    useEffect(() => {
        if (formData.copyNameToBirth) {
            const newBirthData = {
                birth_prefix: formData.current_prefix,
                birth_lastName: formData.current_lastName,
                birth_firstName: formData.current_firstName,
                birth_secondName: formData.current_secondName,
            };
            setFormData(prev => ({ ...prev, ...newBirthData }));
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.birth_lastName;
                delete newErrors.birth_firstName;
                return newErrors;
            });
        }
    }, [formData.copyNameToBirth, formData.current_prefix, formData.current_lastName, formData.current_firstName, formData.current_secondName]);

    useEffect(() => {
        if (formData.residenceIsSame) {
            const fieldsToCopy = ['country', 'zip', 'city', 'street', 'streetType', 'houseNumber', 'building', 'staircase', 'floor', 'door'];
            let updates = {};
            fieldsToCopy.forEach(field => {
                updates[`temporary_address_${field}`] = formData[`permanent_address_${field}`];
            });
            setFormData(prev => ({ ...prev, ...updates }));
        }
    }, [formData.residenceIsSame, formData.permanent_address_country, formData.permanent_address_zip, formData.permanent_address_city, formData.permanent_address_street, formData.permanent_address_streetType, formData.permanent_address_houseNumber, formData.permanent_address_building, formData.permanent_address_staircase, formData.permanent_address_floor, formData.permanent_address_door]);

    const validateStep = (step) => {
        const newErrors = {};
        const stepFields = steps.find(s => s.id === step)?.fields || [];
        
        const requiredFields = {
            current_lastName: 'Családi név megadása kötelező.',
            current_firstName: 'Utónév megadása kötelező.',
            birth_lastName: 'Születési családi név megadása kötelező.',
            birth_firstName: 'Születési utónév megadása kötelező.',
            mother_lastName: 'Anyja családi neve kötelező.',
            mother_firstName: 'Anyja utóneve kötelező.',
            birthDate: 'Születési idő megadása kötelező.',
            birth_city: 'Születési hely megadása kötelező.',
            nationality: 'Állampolgárság megadása kötelező.',
            documentType: 'Okmánytípus kiválasztása kötelező.',
            documentNumber: 'Okmányszám megadása kötelező.',
            documentExpiry: 'Lejárati idő megadása kötelező.',
            education: 'Végzettség kiválasztása kötelező.',
            permanent_address_zip: 'Irányítószám megadása kötelező.',
            permanent_address_city: 'Város megadása kötelező.',
            permanent_address_street: 'Közterület megadása kötelező.',
            permanent_address_streetType: 'Közterület jellegének megadása kötelező.',
            permanent_address_houseNumber: 'Házszám megadása kötelező.',
            phone_number: 'Telefonszám megadása kötelező.',
            email: 'E-mail cím megadása kötelező.',
            email_confirm: 'E-mail cím megerősítése kötelező.',
        };

        stepFields.forEach(field => {
            if (requiredFields[field] && !formData[field]) {
                newErrors[field] = requiredFields[field];
            }
        });
        
        if (step === 1) {
            if (formData.birthDate && formData.birthDate.length < 10) {
                newErrors.birthDate = 'Kérjük, a teljes dátumot add meg (éééé.hh.nn.).';
            }
            if (formData.birth_city.toLowerCase().trim() === 'budapest' && !formData.birth_district) {
                newErrors.birth_district = 'Budapest esetén a kerület kiválasztása kötelező.';
            }
        }

        if (step === 2) {
            if (formData.documentType === 'Magyar személyigazolvány' && !/^\d{6}[A-Za-z]{2}$/.test(formData.documentNumber)) {
                newErrors.documentNumber = 'A magyar személyi igazolvány száma 6 számból és 2 betűből áll (pl. 123456AB).';
            }
        }

        if (step === 3) {
            if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Érvénytelen e-mail cím.';
            else if (/@(citromail\.hu|freemail\.hu|gmail\.hu)$/i.test(formData.email)) newErrors.email = 'Citromail/Freemail/Gmail.hu cím nem engedélyezett.';
            if (formData.email !== formData.email_confirm) newErrors.email_confirm = 'A két e-mail cím nem egyezik.';
            
            // MÓDOSÍTÁS: A gondviselői adatok validációjának kiterjesztése
            const shouldValidateGuardian = isUnder18 || wantsToProvideGuardianData;

            if (shouldValidateGuardian) {
                // Kötelező mezők ellenőrzése csak 18 év alatt
                if (isUnder18 && !formData.guardian_name) newErrors.guardian_name = 'Gondviselő nevének megadása kötelező.';
                if (isUnder18 && !formData.guardian_phone) newErrors.guardian_phone = 'Gondviselő telefonszámának megadása kötelező.';
                if (isUnder18 && !formData.guardian_email) newErrors.guardian_email = 'Gondviselő e-mail címének megadása kötelező.';
                if (isUnder18 && !formData.guardian_email_confirm) newErrors.guardian_email_confirm = 'Gondviselő e-mail címének megerősítése kötelező.';
                
                // Formai és egyezőségi validációk, ha az email mezők ki vannak töltve
                if (formData.guardian_email && !/\S+@\S+\.\S+/.test(formData.guardian_email)) {
                    newErrors.guardian_email = 'Érvénytelen e-mail cím.';
                }
                if (formData.guardian_email && formData.guardian_email !== formData.guardian_email_confirm) {
                    newErrors.guardian_email_confirm = 'A két e-mail cím nem egyezik.';
                }
                
                // Duplikált adatok ellenőrzése, ha a mezők ki vannak töltve
                if (formData.guardian_phone && formData.guardian_phone === formData.phone_number) {
                    newErrors.guardian_phone = 'A gondviselő telefonszáma nem egyezhet meg a tanulóéval.';
                }
                if (formData.guardian_email && formData.guardian_email === formData.email) {
                    newErrors.guardian_email = 'A gondviselő e-mail címe nem egyezhet meg a tanulóéval.';
                }
            }
        }

        if (step === 4) {
             if (!formData.declaration_data || !formData.declaration_medical || !formData.declaration_education || !formData.declaration_training_info || !formData.declaration_privacy) {
                newErrors.declarations = 'A beiratkozáshoz minden nyilatkozat elfogadása kötelező.';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (!validateStep(currentStep)) {
            setTimeout(() => {
                const firstError = document.querySelector('.error-message, .declaration-error-wrapper');
                if (firstError) {
                    const errorGroup = firstError.closest('.input-group, .form-section');
                    if (errorGroup) {
                         errorGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                         firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        } else {
            setHighestValidatedStep(prev => Math.max(prev, currentStep));
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const goToStep = (step) => {
        if (step <= highestValidatedStep + 1 && step < currentStep) {
            setCurrentStep(step);
        }
    };
    
    const handleResetForm = () => {
        setFormData(initialFormData);
        setCurrentStep(1);
        setHighestValidatedStep(0);
        setIsSubmittedSuccessfully(false);
        setErrors({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(4)) {
            setTimeout(() => {
                const firstError = document.querySelector('.error-message, .declaration-error-wrapper');
                if (firstError) {
                    const errorGroup = firstError.closest('.input-group, .form-section');
                    if (errorGroup) {
                        errorGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
            return;
        }

        setIsSubmitting(true);
        try {
            // ÚJ: isTestMode() ellenőrzése és _isTest flag beállítása
            const payload = { ...formData };
            if (isTestMode()) {
                payload._isTest = true;
                console.log("Submitting in TEST MODE");
            }

            const submitRegistration = httpsCallable(functions, 'submitRegistration');
            await submitRegistration(payload);
            setIsSubmittedSuccessfully(true);

        } catch (error) {
            console.error("Hiba a beiratkozás mentésekor: ", error);
            setModalInfo({ title: 'Hiba történt!', message: `A beiratkozás mentése sikertelen. Hiba: ${error.message}`, type: 'error', onClose: () => setModalInfo(null) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const InfoTooltip = ({ text, position = 'center', type = 'info' }) => {
        const positionClasses = {
            center: 'left-1/2 -translate-x-1/2',
            right: 'right-0',
            left: 'left-0'
        };
        const IconComponent = type === 'alert' ? AlertTriangleIcon : InfoIcon;
        return html`
            <div className="relative group hidden lg:flex items-center">
                <${IconComponent} size=${16} className="text-teal-500 cursor-pointer transition-transform duration-200 group-hover:scale-110" />
                <div className=${`info-tooltip-text absolute bottom-full ${positionClasses[position] || positionClasses.center} mb-2 w-64 p-2 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10`}>
                    ${text}
                </div>
            </div>
        `;
    };
    
    return html`
        <${Fragment}>
            ${isSubmitting && html`<${LoadingOverlay} text="Beiratkozás küldése..." />`}
            ${modalInfo && html`<${InfoModal} ...${modalInfo} />`}
            ${showPrivacyModal && html`<${PrivacyPolicyModal} onClose=${() => setShowPrivacyModal(false)} />`}
            ${showTrainingInfoModal && html`<${TrainingInfoModal} onClose=${() => setShowTrainingInfoModal(false)} />`}

            ${isSubmittedSuccessfully ? html`
                <${SuccessView} onNewRegistration=${handleResetForm} />
            ` : html`
                <form onSubmit=${handleSubmit} noValidate className="registration-card">
                    <div className="registration-logo-header">
                        <img src="https://moszat.hu/moszat_teszt/images/logo100px.png" alt="Mosolyzóna Kreszprofesszor Autósiskola Logó" />
                    </div>

                    <div className="registration-card-header">
                        <h1>BEIRATKOZÁSI ADATLAP</h1>
                        <p>Kérjük, hogy az adatokat pontosan add meg!</p>
                    </div>
                    
                    <div ref=${stepperRef}>
                        <${Stepper} 
                            steps=${steps} 
                            currentStep=${currentStep} 
                            highestValidatedStep=${highestValidatedStep} 
                            onStepClick=${goToStep} 
                        />
                    </div>

                    <div className="form-content">
                        ${currentStep === 1 && html`
                            <div className="form-step" key="step1">
                                <div className="form-section">
                                    <h2 className="form-section-header">Személyi adatok</h2>
                                    <div className="p-4 md:p-6 space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 grid-with-separator">
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <h3 className="font-semibold text-base text-gray-800">Beiratkozó viselt neve</h3>
                                                    <${InfoTooltip} text="Kérjük, a személyazonosító okmányodon szereplő, teljes nevedet add meg. Amennyiben több keresztnévvel rendelkezel, mindegyiket add meg." position="left" />
                                                </div>
                                                <p className="info-box lg:hidden">Kérjük, a személyazonosító okmányodon szereplő, teljes nevedet add meg. Amennyiben több keresztnévvel rendelkezel, mindegyiket add meg.</p>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-1">
                                                        <${ValidatedSelect} name="current_prefix" label="Előtag" value=${formData.current_prefix} onChange=${handleChange} onFocus=${handleInteraction} options=${prefixOptions} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <${ValidatedInput} name="current_lastName" label="Családi név" required=${true} error=${errors.current_lastName}>
                                                            <input type="text" id="current_lastName" name="current_lastName" value=${formData.current_lastName} onChange=${handleChange} required className="input" />
                                                        <//>
                                                    </div>
                                                    <div className="col-span-3">
                                                         <${ValidatedInput} name="current_firstName" label="Utónév" required=${true} error=${errors.current_firstName}>
                                                            <input type="text" id="current_firstName" name="current_firstName" value=${formData.current_firstName} onChange=${handleChange} required className="input" />
                                                        <//>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <${ValidatedInput} name="current_secondName" label="Második utónév">
                                                            <input type="text" id="current_secondName" name="current_secondName" value=${formData.current_secondName} onChange=${handleChange} className="input" />
                                                        <//>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <h3 className="font-semibold text-base text-gray-800">Beiratkozó születési neve</h3>
                                                    <div className="flex items-center"><input type="checkbox" id="copyNameToBirth" name="copyNameToBirth" checked=${formData.copyNameToBirth} onChange=${handleChange}/><label htmlFor="copyNameToBirth" className="ml-2 !mb-0 text-sm">Azonos a viselt névvel</label></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-1"><${ValidatedSelect} name="birth_prefix" label="Előtag" value=${formData.birth_prefix} onChange=${handleChange} onFocus=${handleInteraction} disabled=${formData.copyNameToBirth} options=${prefixOptions} /></div>
                                                    <div className="col-span-2"><${ValidatedInput} name="birth_lastName" label="Családi név" required=${true} error=${errors.birth_lastName} disabled=${formData.copyNameToBirth}><input type="text" id="birth_lastName" name="birth_lastName" value=${formData.birth_lastName} onChange=${handleChange} required disabled=${formData.copyNameToBirth} className="input" /><//></div>
                                                    <div className="col-span-3"><${ValidatedInput} name="birth_firstName" label="Utónév" required=${true} error=${errors.birth_firstName} disabled=${formData.copyNameToBirth}><input type="text" id="birth_firstName" name="birth_firstName" value=${formData.birth_firstName} onChange=${handleChange} required disabled=${formData.copyNameToBirth} className="input" /><//></div>
                                                    <div className="col-span-3"><${ValidatedInput} name="birth_secondName" label="Második utónév" disabled=${formData.copyNameToBirth}><input type="text" id="birth_secondName" name="birth_secondName" value=${formData.birth_secondName} onChange=${handleChange} disabled=${formData.copyNameToBirth} className="input" /><//></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 pt-6 mt-6 border-t grid-with-separator">
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <h3 className="font-semibold text-base text-gray-800">Anyja születési neve</h3>
                                                    <${InfoTooltip} text="Kérjük, a teljes leánykori nevét add meg. Ha a személyazonosító igazolványodon a leánykori név mellett szerepel titulus (pl. Dr.), azt is add meg." position="left" />
                                                </div>
                                                <p className="info-box lg:hidden">Kérjük, a teljes leánykori nevét add meg. Ha a személyazonosító igazolványodon a leánykori név mellett szerepel titulus (pl. Dr.), azt is add meg.</p>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-1"><${ValidatedSelect} name="mother_prefix" label="Előtag" value=${formData.mother_prefix} onChange=${handleChange} onFocus=${handleInteraction} options=${prefixOptions} /></div>
                                                    <div className="col-span-2"><${ValidatedInput} name="mother_lastName" label="Családi név" required=${true} error=${errors.mother_lastName}><input type="text" id="mother_lastName" name="mother_lastName" value=${formData.mother_lastName} onChange=${handleChange} required className="input" /><//></div>
                                                    <div className="col-span-3"><${ValidatedInput} name="mother_firstName" label="Utónév" required=${true} error=${errors.mother_firstName}><input type="text" id="mother_firstName" name="mother_firstName" value=${formData.mother_firstName} onChange=${handleChange} required className="input" /><//></div>
                                                    <div className="col-span-3"><${ValidatedInput} name="mother_secondName" label="Második utónév"><input type="text" id="mother_secondName" name="mother_secondName" value=${formData.mother_secondName} onChange=${handleChange} className="input" /><//></div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <h3 className="font-semibold text-base text-gray-800">Beiratkozó születési adatai</h3>
                                                    <${InfoTooltip} text="Ha a születési helyed Budapest, kérjük, válaszd ki a kerületet. A kerületet a személyigazolványod hátulján találod." position="right" />
                                                </div>
                                                <p className="info-box lg:hidden">Ha a születési helyed Budapest, kérjük, válaszd ki a kerületet. A kerületet a személyigazolványod hátulján találod.</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><${ValidatedInput} name="birthDate" label="Születési idő" required=${true} error=${errors.birthDate}><${DateInput} id="birthDate" name="birthDate" value=${formData.birthDate} onChange=${handleChange} required=${true} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="birth_country" label="Születési ország" required=${true} error=${errors.birth_country}><input type="text" id="birth_country" name="birth_country" value=${formData.birth_country} onChange=${handleChange} required className="input"/><//></div>
                                                    <div><${ValidatedInput} name="birth_city" label="Születési hely" required=${true} error=${errors.birth_city}><input type="text" id="birth_city" name="birth_city" value=${formData.birth_city} onChange=${handleChange} required className="input"/><//></div>
                                                    <div><${ValidatedInput} name="nationality" label="Állampolgárság" required=${true} error=${errors.nationality}><input type="text" id="nationality" name="nationality" value=${formData.nationality} onChange=${handleChange} required className="input"/><//></div>
                                                    <div className="col-span-2">
                                                        <${Collapsible} isVisible=${formData.birth_city.toLowerCase().trim() === 'budapest'}>
                                                            <${ValidatedSelect} name="birth_district" label="Születési kerület" required=${true} error=${errors.birth_district} value=${formData.birth_district} onChange=${handleChange} onFocus=${handleInteraction} options=${[ { value: "", label: "Válassz kerületet...", disabled: true }, ...budapestDistricts ]} />
                                                        <//>
                                                    </div>
                                                </div>
                                                <div className="flex items-center"><input type="checkbox" id="isDualCitizen" name="isDualCitizen" checked=${formData.isDualCitizen} onChange=${handleChange}/><label htmlFor="isDualCitizen" className="ml-2 !mb-0 text-sm">Rendelkezem másik állampolgársággal is</label></div>
                                                <${Collapsible} isVisible=${formData.isDualCitizen}>
                                                    <div className="pt-2">
                                                        <${ValidatedInput} name="secondNationality" label="Második állampolgárság" required=${formData.isDualCitizen} error=${errors.secondNationality}>
                                                            <input type="text" id="secondNationality" name="secondNationality" value=${formData.secondNationality} onChange=${handleChange} required=${formData.isDualCitizen} className="input"/>
                                                        <//>
                                                    </div>
                                                <//>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `}
                        ${currentStep === 2 && html`
                            <div className="form-step" key="step2">
                                <div className="form-section">
                                    <h2 className="form-section-header">Okmányok, Végzettség és Tanulmányi Előzmények</h2>
                                    <div className="p-4 md:p-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8 grid-with-separator">
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <h3 className="font-semibold text-base text-gray-800">Személyes okmány</h3>
                                                </div>
                                                <div><${ValidatedSelect} name="documentType" label="Okmány típusa" required=${true} error=${errors.documentType} value=${formData.documentType} onChange=${handleChange} onFocus=${handleInteraction} options=${documentTypeOptions} /></div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><${ValidatedInput} name="documentNumber" label="Okmány száma" required=${true} error=${errors.documentNumber}><input type="text" id="documentNumber" name="documentNumber" value=${formData.documentNumber} onChange=${handleChange} required placeholder="pl. 123456AB" className="input"/><//></div>
                                                    <div>
                                                        <${ValidatedInput} 
                                                            name="documentExpiry" 
                                                            label="Lejárati idő" 
                                                            required=${true} 
                                                            error=${errors.documentExpiry}
                                                            warning=${documentExpiryWarning}
                                                        >
                                                            <${DateInput} id="documentExpiry" name="documentExpiry" value=${formData.documentExpiry} onChange=${handleChange} required=${true} className="input"/>
                                                        <//>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <h3 className="font-semibold text-base text-gray-800">Végzettség</h3>
                                                </div>
                                                <div>
                                                    <${ValidatedSelect} name="education" label="Legmagasabb iskolai végzettséged" required=${true} error=${errors.education} value=${formData.education} onChange=${handleChange} onFocus=${handleInteraction} options=${educationOptions} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-6 mt-6 border-t">
                                            <div className="form-subsection-header">
                                                <h3 className="font-semibold text-base text-gray-800">Korábbi jogosítvány és tanulmányok</h3>
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                                                <div>
                                                    <div className="form-choice-group">
                                                        <div className="question-text">Van-e bármilyen kategóriás jogosítványod?</div>
                                                        <div className="options-wrapper">
                                                            <label className="option-label"><input type="radio" name="has_previous_license" value="igen" checked=${formData.has_previous_license === 'igen'} onChange=${handleChange} /> <span>Igen</span></label>
                                                            <label className="option-label"><input type="radio" name="has_previous_license" value="nem" checked=${formData.has_previous_license === 'nem'} onChange=${handleChange} /> <span>Nem</span></label>
                                                        </div>
                                                    </div>
                                                    <${Collapsible} isVisible=${formData.has_previous_license === 'igen'}>
                                                        <div className="collapsible-inner-box">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <${ValidatedInput} name="previous_license_number" label="Jogosítvány száma" required=${formData.has_previous_license === 'igen'}>
                                                                    <input type="text" id="previous_license_number" name="previous_license_number" value=${formData.previous_license_number} onChange=${handleChange} required=${formData.has_previous_license === 'igen'} className="input"/>
                                                                <//>
                                                                <${ValidatedInput} name="previous_license_categories" label="Meglévő kategóriák" required=${formData.has_previous_license === 'igen'}>
                                                                    <input type="text" id="previous_license_categories" name="previous_license_categories" value=${formData.previous_license_categories} onChange=${handleChange} placeholder="pl. B, AM" required=${formData.has_previous_license === 'igen'} className="input"/>
                                                                <//>
                                                            </div>
                                                            <p className="info-box !mt-4">
                                                                Az adatlap kitöltése után kérjük, küldd el a jogosítványod mindkét oldaláról készült fotót a <span className="font-semibold" style=${{color: 'var(--primary-color)'}}>mosolyzonairoda@gmail.com</span> e-mail címre.
                                                                <br />
                                                                Kérjük, akkor is add meg az adatait, ha már lejárt az okmány.
                                                            </p>
                                                        </div>
                                                    <//>
                                                </div>
                                                <div>
                                                    <div className="form-choice-group">
                                                        <div className="question-text">Tanultál-e már másik autósiskolában?</div>
                                                        <div className="options-wrapper">
                                                            <label className="option-label"><input type="radio" name="studied_elsewhere_radio" value="igen_nalunk" checked=${formData.studied_elsewhere_radio === 'igen_nalunk'} onChange=${handleChange} /> <span>Igen, nálatok</span></label>
                                                            <label className="option-label"><input type="radio" name="studied_elsewhere_radio" value="igen_mashol" checked=${formData.studied_elsewhere_radio === 'igen_mashol'} onChange=${handleChange} /> <span>Igen, máshol</span></label>
                                                            <label className="option-label"><input type="radio" name="studied_elsewhere_radio" value="nem" checked=${formData.studied_elsewhere_radio === 'nem'} onChange=${handleChange} /> <span>Nem</span></label>
                                                        </div>
                                                    </div>
                                                    <${Collapsible} isVisible=${formData.studied_elsewhere_radio.startsWith('igen')}>
                                                        <div className="collapsible-inner-box">
                                                            <div className="form-choice-group">
                                                                <div className="question-text">Volt-e forgalmi vizsgád az utóbbi két évben?</div>
                                                                <div className="options-wrapper">
                                                                    <label className="option-label"><input type="radio" name="had_exam_recently_radio" value="igen" checked=${formData.had_exam_recently_radio === 'igen'} onChange=${handleChange} /> <span>Igen</span></label>
                                                                    <label className="option-label"><input type="radio" name="had_exam_recently_radio" value="nem" checked=${formData.had_exam_recently_radio === 'nem'} onChange=${handleChange} /> <span>Nem</span></label>
                                                                </div>
                                                            </div>
                                                            <${Collapsible} isVisible=${formData.had_exam_recently_radio === 'igen'}>
                                                                <${ValidatedInput} name="failed_exam_count" label="Hány sikertelen forgalmi vizsgád volt?" required=${formData.had_exam_recently_radio === 'igen'}>
                                                                    <input type="number" id="failed_exam_count" name="failed_exam_count" value=${formData.failed_exam_count} onChange=${handleChange} min="0" required=${formData.had_exam_recently_radio === 'igen'} className="input no-spinners"/>
                                                                <//>
                                                            <//>
                                                        </div>
                                                    <//>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-section">
                                    <h2 className="form-section-header">Lakcímek</h2>
                                    <div className="p-4 md:p-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8 grid-with-separator">
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <h3 className="font-semibold text-base text-gray-800">Állandó lakcím</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><${ValidatedInput} name="permanent_address_country" label="Ország" required=${true} error=${errors.permanent_address_country}><input type="text" id="permanent_address_country" name="permanent_address_country" value=${formData.permanent_address_country} onChange=${handleChange} required className="input"/><//></div>
                                                    <div><${ValidatedInput} name="permanent_address_zip" label="Irányítószám" required=${true} error=${errors.permanent_address_zip}><input type="text" id="permanent_address_zip" name="permanent_address_zip" value=${formData.permanent_address_zip} onChange=${handleChange} required className="input"/><//></div>
                                                </div>
                                                <div><${ValidatedInput} name="permanent_address_city" label="Város" required=${true} error=${errors.permanent_address_city}><input type="text" id="permanent_address_city" name="permanent_address_city" value=${formData.permanent_address_city} onChange=${handleChange} required className="input"/><//></div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-2"><${ValidatedInput} name="permanent_address_street" label="Közterület" required=${true} error=${errors.permanent_address_street}><input type="text" id="permanent_address_street" name="permanent_address_street" value=${formData.permanent_address_street} onChange=${handleChange} required className="input"/><//></div>
                                                    <div><${ValidatedInput} name="permanent_address_streetType" label="Jellege" required=${true} error=${errors.permanent_address_streetType}><input type="text" id="permanent_address_streetType" name="permanent_address_streetType" value=${formData.permanent_address_streetType} onChange=${handleChange} required className="input" autocapitalize="none" /><//></div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-4">
                                                    <div className="col-span-2"><${ValidatedInput} name="permanent_address_houseNumber" label="Házszám" required=${true} error=${errors.permanent_address_houseNumber}><input type="text" id="permanent_address_houseNumber" name="permanent_address_houseNumber" value=${formData.permanent_address_houseNumber} onChange=${handleChange} required className="input"/><//></div>
                                                    <div className="col-span-3"><${ValidatedInput} name="permanent_address_building" label="Épület"><input type="text" id="permanent_address_building" name="permanent_address_building" value=${formData.permanent_address_building} onChange=${handleChange} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="permanent_address_staircase" label="Lph."><input type="text" id="permanent_address_staircase" name="permanent_address_staircase" value=${formData.permanent_address_staircase} onChange=${handleChange} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="permanent_address_floor" label="Emelet"><input type="text" id="permanent_address_floor" name="permanent_address_floor" value=${formData.permanent_address_floor} onChange=${handleChange} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="permanent_address_door" label="Ajtó"><input type="text" id="permanent_address_door" name="permanent_address_door" value=${formData.permanent_address_door} onChange=${handleChange} className="input"/><//></div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="form-subsection-header">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-base text-gray-800">Tartózkodási hely</h3>
                                                        <${InfoTooltip} text="Csak akkor töltsd ki, ha eltér az állandó lakcímedtől." />
                                                    </div>
                                                    <div className="flex items-center">
                                                        <input type="checkbox" id="residenceIsSame" name="residenceIsSame" checked=${formData.residenceIsSame} onChange=${handleChange}/>
                                                        <label htmlFor="residenceIsSame" className="ml-2 !mb-0 text-sm">Azonos az állandó lakcímmel</label>
                                                    </div>
                                                </div>
                                                <p className="info-box lg:hidden">Csak akkor töltsd ki, ha eltér az állandó lakcímedtől.</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><${ValidatedInput} name="temporary_address_country" label="Ország" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_country" name="temporary_address_country" value=${formData.temporary_address_country} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="temporary_address_zip" label="Irányítószám" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_zip" name="temporary_address_zip" value=${formData.temporary_address_zip} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                </div>
                                                <div><${ValidatedInput} name="temporary_address_city" label="Város" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_city" name="temporary_address_city" value=${formData.temporary_address_city} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-2"><${ValidatedInput} name="temporary_address_street" label="Közterület" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_street" name="temporary_address_street" value=${formData.temporary_address_street} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="temporary_address_streetType" label="Jellege" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_streetType" name="temporary_address_streetType" value=${formData.temporary_address_streetType} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input" autocapitalize="none" /><//></div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-4">
                                                    <div className="col-span-2"><${ValidatedInput} name="temporary_address_houseNumber" label="Házszám" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_houseNumber" name="temporary_address_houseNumber" value=${formData.temporary_address_houseNumber} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                    <div className="col-span-3"><${ValidatedInput} name="temporary_address_building" label="Épület" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_building" name="temporary_address_building" value=${formData.temporary_address_building} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="temporary_address_staircase" label="Lph." disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_staircase" name="temporary_address_staircase" value=${formData.temporary_address_staircase} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="temporary_address_floor" label="Emelet" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_floor" name="temporary_address_floor" value=${formData.temporary_address_floor} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                    <div><${ValidatedInput} name="temporary_address_door" label="Ajtó" disabled=${formData.residenceIsSame}><input type="text" id="temporary_address_door" name="temporary_address_door" value=${formData.temporary_address_door} onChange=${handleChange} disabled=${formData.residenceIsSame} className="input"/><//></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `}
                        ${currentStep === 3 && html`
                            <div className="form-step" key="step3">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="form-section">
                                        <h2 className="form-section-header">Beiratkozó elérhetőségei</h2>
                                        <div className="p-4 md:p-6">
                                            <div className="info-box lg:hidden mb-3">
                                                <span>A megadott e-mail címre és telefonszámra fogjuk küldeni a képzéssel kapcsolatos legfontosabb információkat.</span>
                                            </div>
                                            
                                            <${ValidatedInput}
                                                name="phone_number"
                                                label=${html`
                                                    <div className="flex justify-between items-center w-full">
                                                        <span className="whitespace-nowrap">Telefonszám<span className="required-star">*</span></span>
                                                        <${InfoTooltip} text="A megadott e-mail címre fogjuk küldeni a képzéssel kapcsolatos legfontosabb információkat." position="right" />
                                                    </div>
                                                `}
                                                required=${true}
                                                error=${errors.phone_number}
                                            >
                                                <input type="tel" id="phone_number" name="phone_number" value=${formData.phone_number} onChange=${handleChange} required className="input" placeholder="+36 20 123 4567" autoComplete="tel"/>
                                            <//>
                                            <${ValidatedInput} name="email" label="E-mail cím" required=${true} error=${errors.email} className="mt-3">
                                                <input type="email" id="email" name="email" value=${formData.email} onChange=${handleChange} required className="input" autoComplete="email" inputmode="email"/>
                                            <//>
                                            <${ValidatedInput} name="email_confirm" label="E-mail cím megerősítése" required=${true} error=${errors.email_confirm} className="mt-3">
                                                <input type="email" id="email_confirm" name="email_confirm" value=${formData.email_confirm} onChange=${handleChange} required className="input" autoComplete="email" inputmode="email"/>
                                            <//>
                                            <p className="info-box mt-3">A <span style=${{color: '#2dd4bf', fontWeight: '600'}}>citromail.hu</span>, <span style=${{color: '#2dd4bf', fontWeight: '600'}}>freemail.hu</span> és <span style=${{color: '#2dd4bf', fontWeight: '600'}}>gmail.hu</span> (gmail.com természetesen megfelelő) e-mail szolgáltató nem fogadja az e-Titán Rendszer által küldött e-maileket, ezért ezen címek megadása nem lehetséges.</p>
                                        </div>
                                    </div>
                                     <div className="form-section">
                                        <h2 className=${`form-section-header ${isUnder18 ? 'guardian-section-required' : ''}`}>
                                            Szülő/Gondviselő elérhetőségei
                                        </h2>
                                        <div className="p-4 md:p-6">
                                            <div className="info-box lg:hidden mb-3">
                                                ${isUnder18
                                                    ? html`<span><strong>Fontos:</strong> Mivel még nem múltál el 18 éves, a gondviselőd adatainak megadása kötelező.</span>`
                                                    : html`<span>Ezt a részt nem szükséges kitöltened, de megadhatod egy kapcsolattartó (pl. szülő) adatait.</span>`
                                                }
                                            </div>

                                            <${ValidatedInput}
                                                name="guardian_name"
                                                label="Neve"
                                                required=${isUnder18}
                                                error=${errors.guardian_name}
                                                disabled=${!isUnder18 && !wantsToProvideGuardianData}
                                            >
                                                <input type="text" id="guardian_name" name="guardian_name" value=${formData.guardian_name} onChange=${handleChange} required=${isUnder18} className="input" autoComplete="name"/>
                                            <//>

                                            <${ValidatedInput} name="guardian_phone" label="Telefonszám" required=${isUnder18} error=${errors.guardian_phone} className="mt-3" disabled=${!isUnder18 && !wantsToProvideGuardianData}>
                                                <input type="tel" id="guardian_phone" name="guardian_phone" value=${formData.guardian_phone} onChange=${handleChange} required=${isUnder18} className="input" placeholder="+36 20 123 4567" autoComplete="tel"/>
                                            <//>
                                            <${ValidatedInput} name="guardian_email" label="E-mail cím" required=${isUnder18} error=${errors.guardian_email} className="mt-3" disabled=${!isUnder18 && !wantsToProvideGuardianData}>
                                                <input type="email" id="guardian_email" name="guardian_email" value=${formData.guardian_email} onChange=${handleChange} required=${isUnder18} className="input" autoComplete="email" inputmode="email"/>
                                            <//>
                                             <${ValidatedInput} name="guardian_email_confirm" label="E-mail cím megerősítése" required=${isUnder18} error=${errors.guardian_email_confirm} className="mt-3" disabled=${!isUnder18 && !wantsToProvideGuardianData}>
                                                <input type="email" id="guardian_email_confirm" name="guardian_email_confirm" value=${formData.guardian_email_confirm} onChange=${handleChange} required=${isUnder18} className="input" autoComplete="email" inputmode="email"/>
                                            <//>
                                            
                                            ${!isUnder18 && html`
                                                <div className="flex items-center mt-4">
                                                    <input
                                                        type="checkbox"
                                                        id="wantsToProvideGuardianData"
                                                        name="wantsToProvideGuardianData"
                                                        checked=${wantsToProvideGuardianData}
                                                        onChange=${handleWantsToProvideGuardianChange}
                                                    />
                                                    <label htmlFor="wantsToProvideGuardianData" className="ml-2 !mb-0 text-sm">Szülő/gondviselő adatait is megadom</label>
                                                </div>
                                            `}
                                        </div>
                                    </div>
                                </div>
                                <div className="form-section">
                                    <h2 className="form-section-header">Megjegyzés (opcionális)</h2>
                                    <div className="p-4 md:p-6">
                                        <${ValidatedInput} name="megjegyzes" label="Ha van bármilyen további közlendőd vagy kérdésed a beiratkozással kapcsolatban, itt jelezheted.">
                                            <textarea id="megjegyzes" name="megjegyzes" value=${formData.megjegyzes} onChange=${handleChange} rows="4" className="input"></textarea>
                                        <//>
                                    </div>
                                </div>
                            </div>
                        `}
                        ${currentStep === 4 && html`
                            <div className="form-step" key="step4">
                                <div className="form-section">
                                    <h2 className="form-section-header">Nyilatkozatok</h2>
                                    <div className="p-4 md:p-6 space-y-4">
                                        <div className="flex items-start">
                                           <input id="declaration_data" name="declaration_data" type="checkbox" checked=${formData.declaration_data} onChange=${handleChange} required className="flex-shrink-0 mt-1" />
                                           <label htmlFor="declaration_data" className="ml-3 !mb-0 text-sm font-medium text-slate-600">
                                                Büntetőjogi felelősségem tudatában kijelentem, hogy a szolgáltatott adatok a valóságnak megfelelnek, és vállalom, hogy az adataimban bekövetkező változást 8 napon belül bejelentem.
                                           </label>
                                        </div>
                                        <div className="flex items-start">
                                           <input id="declaration_medical" name="declaration_medical" type="checkbox" checked=${formData.declaration_medical} onChange=${handleChange} required className="flex-shrink-0 mt-1" />
                                           <label htmlFor="declaration_medical" className="ml-3 !mb-0 text-sm font-medium text-slate-600">
                                                Tudomásul veszem, hogy a KRESZ-vizsgára jelentkezés feltétele az érvényes orvosi alkalmassági vélemény bemutatása.
                                           </label>
                                        </div>
                                        <div className="flex items-start">
                                           <input id="declaration_education" name="declaration_education" type="checkbox" checked=${formData.declaration_education} onChange=${handleChange} required className="flex-shrink-0 mt-1" />
                                           <label htmlFor="declaration_education" className="ml-3 !mb-0 text-sm font-medium text-slate-600">
                                                Kijelentem, hogy rendelkezem a jogszabályban előírt alapfokú (8 általános) iskolai végzettséggel.
                                           </label>
                                        </div>
                                        <div className="flex items-start">
                                           <input id="declaration_training_info" name="declaration_training_info" type="checkbox" checked=${formData.declaration_training_info} onChange=${handleChange} required className="flex-shrink-0 mt-1" />
                                           <label htmlFor="declaration_training_info" className="ml-3 !mb-0 text-sm font-medium text-slate-600">
                                                Elolvastam és elfogadom a 
                                                <button type="button" onClick=${() => setShowTrainingInfoModal(true)} className="form-link ml-1">
                                                    Képzési Tájékoztatót
                                                </button>
                                                , és a benne foglalt feltételeket.
                                           </label>
                                        </div>
                                        <div className="flex items-start">
                                           <input id="declaration_privacy" name="declaration_privacy" type="checkbox" checked=${formData.declaration_privacy} onChange=${handleChange} required className="flex-shrink-0 mt-1" />
                                           <label htmlFor="declaration_privacy" className="ml-3 !mb-0 text-sm font-medium text-slate-600">
                                                Elolvastam és elfogadom az 
                                                <button type="button" onClick=${() => setShowPrivacyModal(true)} className="form-link ml-1">
                                                    Adatkezelési Tájékoztatót
                                                </button>
                                                , és hozzájárulok az adataim kezeléséhez.
                                           </label>
                                        </div>
                                        ${errors.declarations && html`
                                            <div className="declaration-error-wrapper">
                                                <${AlertCircleIcon} size=${20} className="flex-shrink-0" />
                                                <p className="error-message !m-0">${errors.declarations}</p>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>

                    <div className="form-navigation">
                        <div>
                            ${currentStep > 1 && html`
                                <button type="button" onClick=${prevStep} className="form-button secondary">
                                    <span>Vissza</span>
                                </button>
                            `}
                        </div>
                        <div>
                            ${currentStep < steps.length && html`
                                <button type="button" onClick=${nextStep} className="form-button primary">
                                    <span>Tovább</span>
                                </button>
                            `}
                            ${currentStep === steps.length && html`
                                <button type="submit" disabled=${isSubmitting} className="form-button primary">
                                    <span>${isSubmitting ? 'Küldés...' : 'Beiratkozás elküldése'}</span>
                                </button>
                            `}
                        </div>
                    </div>
                </form>
            `}
        </>
    `;
};

export default RegistrationForm;
