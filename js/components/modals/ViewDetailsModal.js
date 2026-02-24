/**
 * js/components/modals/ViewDetailsModal.js
 * * Modal for viewing student details.
 * JAVÍTÁS: A `formatAddress` függvény lecserélve egy intelligensebb verzióra,
 * amely helyesen formázza a címet, és címkéket ad az épület, emelet stb. adatokhoz.
 * JAVÍTÁS 2: A címformázó logika finomítva, hogy az írásjeleket (vesszők, szóközök)
 * a magyar szabványnak megfelelően, logikusabban kezelje.
 * MÓDOSÍTÁS: Új "Tanulmányi előzmények" szekció hozzáadva a korábbi tanulmányokra
 * és vizsgákra vonatkozó adatok megjelenítéséhez.
 * MÓDOSÍTÁS 2: A modális ablak most már csak a gombokra kattintva záródik be, a háttérre kattintva nem.
 * MÓDOSÍTÁS 3: A címformázó logika frissítve, hogy a pontokat a házszám, épület stb. után helyesen kezelje.
 * MÓDOSÍTÁS 4: A születési hely most már tartalmazza az országot is, ha az nem Magyarország. A tartózkodási hely mindig a teljes címet mutatja.
 * MÓDOSÍTÁS 5: Visszaállítva a logika, hogy ha a tartózkodási hely azonos a lakcímmel, akkor szövegesen jelenjen meg.
 */
import { html } from '../../UI.js';
import { formatFullName, formatSingleTimestamp } from '../../utils.js';

const DisplayField = ({ label, value }) => html`
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 py-2 text-sm">
        <strong className="text-gray-500 font-medium">${label}</strong>
        <span className="text-gray-800 col-span-2 break-words">${value || 'N/A'}</span>
    </div>
`;

const ViewDetailsModal = ({ student, onClose }) => {
    // Címformázó függvény
    const formatAddress = (prefix) => {
        const get = (field) => student[`${prefix}_${field}`];

        // Segédfüggvény, ami pontot tesz a végére, ha hiányzik
        const formatWithPeriod = (value) => {
            if (!value || typeof value !== 'string') return null;
            const trimmed = value.trim();
            // Ha már van pont a végén, nem teszünk újat
            return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
        };

        const mainParts = [];

        if (get('country')) mainParts.push(get('country'));
        
        const cityPart = [get('zip'), get('city')].filter(Boolean).join(' ');
        if (cityPart) mainParts.push(cityPart);

        const streetDetails = [];
        const streetNameAndType = [get('street'), get('streetType')].filter(Boolean).join(' ');
        
        if (streetNameAndType) {
            let fullStreetPart = streetNameAndType;
            const houseNumber = formatWithPeriod(get('houseNumber'));
            if (houseNumber) fullStreetPart += ` ${houseNumber}`;
            streetDetails.push(fullStreetPart);
        }

        const building = formatWithPeriod(get('building'));
        if (building) streetDetails.push(`ép. ${building}`);

        const staircase = formatWithPeriod(get('staircase'));
        if (staircase) streetDetails.push(`lph. ${staircase}`);
        
        const floor = formatWithPeriod(get('floor'));
        if (floor) streetDetails.push(`${floor} em.`);
        
        const door = formatWithPeriod(get('door'));
        if (door) streetDetails.push(`${door} ajtó`);

        if (streetDetails.length > 0) mainParts.push(streetDetails.join(' '));
        
        return mainParts.length > 0 ? mainParts.join(', ') : 'N/A';
    };

    // Segédfüggvény a tanulmányi előzmények adatainak formázásához
    const formatStudyHistory = (key, value) => {
        if (!value) return 'N/A';
        if (key === 'has_previous_license') {
            return value === 'igen' ? 'Igen' : 'Nem';
        }
        if (key === 'studied_elsewhere_radio') {
            const map = {
                'igen_nalunk': 'Igen, nálunk',
                'igen_mashol': 'Igen, máshol',
                'nem': 'Nem'
            };
            return map[value] || value;
        }
        if (key === 'failed_exam_count') {
            return value.toString();
        }
        return value;
    };

    const fullName = formatFullName(student.current_prefix, student.current_firstName, student.current_lastName, student.current_secondName);
    const birthFullName = formatFullName(student.birth_prefix, student.birth_firstName, student.birth_lastName, student.birth_secondName);
    const motherFullName = formatFullName(student.mother_prefix, student.mother_firstName, student.mother_lastName, student.mother_secondName);
    
    // Születési hely formázása a kérésnek megfelelően
    const getBirthPlace = () => {
        const country = student.birth_country || '';
        const city = student.birth_city || '';
        const district = student.birth_district || '';
        
        let place = '';
        if (country.toLowerCase().trim() !== 'magyarország' && country !== '') {
            place += `${country}, `;
        }
        place += city;
        if (district) {
            place += `, ${district}`;
        }
        return place || 'N/A';
    };
    const birthPlace = getBirthPlace();

    const Section = ({ title, children }) => html`
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <h4 className="text-lg font-semibold text-indigo-700 border-b pb-3 mb-4">${title}</h4>
            <div className="space-y-1">${children}</div>
        </div>
    `;

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-5xl transform transition-all" onClick=${e => e.stopPropagation()}>
                <header className="p-6 border-b bg-white rounded-t-xl flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Tanuló adatlapja</h3>
                        <p className="text-gray-500">${fullName}</p>
                    </div>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </header>
                <main className="p-6 max-h-[70vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <${Section} title="Személyes adatok">
                        <${DisplayField} label="Viselt név" value=${fullName} />
                        <${DisplayField} label="Születési név" value=${birthFullName} />
                        <${DisplayField} label="Anyja neve" value=${motherFullName} />
                        <${DisplayField} label="Születési hely" value=${birthPlace} />
                        <${DisplayField} label="Születési idő" value=${student.birthDate} />
                        <${DisplayField} label="Állampolgárság" value=${student.nationality} />
                        ${student.secondNationality && html`<${DisplayField} label="Második állampolgárság" value=${student.secondNationality} />`}
                    <//>
                    <${Section} title="Elérhetőségek és megjegyzés">
                        <${DisplayField} label="Email" value=${student.email} />
                        <${DisplayField} label="Telefonszám" value=${student.phone_number} />
                        <${DisplayField} label="Megjegyzés" value=${student.megjegyzes} />
                    <//>
                    <${Section} title="Állandó lakcím">
                        <${DisplayField} label="Teljes cím" value=${formatAddress('permanent_address')} />
                    <//>
                     <${Section} title="Tartózkodási hely">
                        <${DisplayField} label="Teljes cím" value=${student.residenceIsSame ? 'Azonos az állandó lakcímmel' : formatAddress('temporary_address')} />
                    <//>
                    <${Section} title="Okmányok és végzettség">
                        <${DisplayField} label="Okmány típusa" value=${student.documentType} />
                        <${DisplayField} label="Okmány száma" value=${student.documentNumber} />
                        <${DisplayField} label="Okmány lejárata" value=${student.documentExpiry} />
                        <${DisplayField} label="Végzettség" value=${student.education} />
                    <//>
                    <${Section} title="Tanulmányi előzmények">
                        <${DisplayField} label="Van korábbi jogosítványa" value=${formatStudyHistory('has_previous_license', student.has_previous_license)} />
                        <${DisplayField} label="Korábbi kategóriák" value=${student.previous_license_categories} />
                        <${DisplayField} label="Tanult máshol/nálunk" value=${formatStudyHistory('studied_elsewhere_radio', student.studied_elsewhere_radio)} />
                        <${DisplayField} label="Hány sikertelen vizsga" value=${formatStudyHistory('failed_exam_count', student.failed_exam_count)} />
                    <//>
                    <${Section} title="Gondviselő adatai">
                        <${DisplayField} label="Gondviselő neve" value=${student.guardian_name} />
                        <${DisplayField} label="Gondviselő telefonja" value=${student.guardian_phone} />
                        <${DisplayField} label="Gondviselő emailje" value=${student.guardian_email} />
                    <//>
                    <${Section} title="Adminisztráció">
                        <${DisplayField} label="Tanuló azonosító" value=${student.studentId} />
                        <${DisplayField} label="Sorszám" value=${student.registrationNumber} />
                        <${DisplayField} label="Jelentkezés ideje" value=${formatSingleTimestamp(student.createdAt)} />
                        <${DisplayField} label="Beiratkozás ideje" value=${formatSingleTimestamp(student.enrolledAt)} />
                        <${DisplayField} label="Azonosító megadása" value=${formatSingleTimestamp(student.studentIdAssignedAt)} />
                        <${DisplayField} label="Tanfolyam befejezve" value=${formatSingleTimestamp(student.courseCompletedAt)} />
                    <//>
                </main>
                <footer className="p-4 bg-white rounded-b-xl border-t flex justify-end">
                    <button onClick=${onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-md hover:bg-gray-300">Bezárás</button>
                </footer>
            </div>
        </div>
    `;
};

export default ViewDetailsModal;

