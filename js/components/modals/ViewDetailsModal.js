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
 * MÓDOSÍTÁS 6: Vizsgaeredmények megjelenítése táblázatos formában.
 */
import { html } from '../../UI.js';
import { formatFullName, formatSingleTimestamp } from '../../utils.js';

const DisplayField = ({ label, value }) => html`
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 py-2 text-sm border-b last:border-b-0 border-gray-100">
        <strong className="text-gray-500 font-medium">${label}</strong>
        <span className="text-gray-900 col-span-2 break-words font-medium">${value || 'N/A'}</span>
    </div>
`;

const ExamResultsTable = ({ results }) => {
    if (!results || results.length === 0) return html`<p className="text-sm text-gray-500 italic">Nincsenek rögzített vizsgaeredmények.</p>`;

    // Sort by date descending (newest first)
    const sortedResults = [...results].sort((a, b) => {
        // Handle YYYY.MM.DD. HH:MM format or simple string.
        // We strip trailing dots and replace separators to make it standard ISO-like (YYYY-MM-DD)
        const normalize = (d) => d.split(' ')[0].replace(/\.$/, '').replace(/\./g, '-');
        const dateA = new Date(normalize(a.date));
        const dateB = new Date(normalize(b.date));

        if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
        return b.date.localeCompare(a.date);
    });

    return html`
        <div className="overflow-x-auto rounded-lg border border-gray-200 mt-2">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dátum</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tárgy</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eredmény</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Helyszín</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    ${sortedResults.map((res, idx) => {
                        const resultLower = res.result.toLowerCase();
                        let badgeClass = 'bg-gray-100 text-gray-800';
                        if (resultLower === 'megfelelt') {
                            badgeClass = 'bg-green-100 text-green-800';
                        } else if (resultLower === 'nem felelt meg' || resultLower.includes('sikertelen')) {
                            badgeClass = 'bg-red-100 text-red-800';
                        }

                        return html`
                        <tr key=${idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-gray-900">${res.date}</td>
                            <td className="px-3 py-2 text-gray-700">${res.subject}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                                <span className=${`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                                    ${res.result}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-xs">${res.location}</td>
                        </tr>
                    `})}
                </tbody>
            </table>
        </div>
    `;
};

const ViewDetailsModal = ({ student, onClose }) => {
    // Címformázó függvény (megtartva a meglévő logikát)
    const formatAddress = (prefix) => {
        const get = (field) => student[`${prefix}_${field}`];
        const formatWithPeriod = (value) => {
            if (!value || typeof value !== 'string') return null;
            const trimmed = value.trim();
            return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
        };
        const mainParts = [];
        if (get('country')) mainParts.push(get('country'));
        const cityPart = [get('zip'), get('city')].filter(Boolean).join(' ');
        if (cityPart) mainParts.push(cityPart);
        let streetDetails = '';
        const streetNameAndType = [get('street'), get('streetType')].filter(Boolean).join(' ');
        if (streetNameAndType) {
            let fullStreetPart = streetNameAndType;
            const houseNumber = formatWithPeriod(get('houseNumber'));
            if (houseNumber) fullStreetPart += ` ${houseNumber}`;
            streetDetails += fullStreetPart;
        }
        const building = formatWithPeriod(get('building'));
        if (building) streetDetails += (streetDetails ? ', ' : '') + `ép. ${building}`;
        const staircase = formatWithPeriod(get('staircase'));
        if (staircase) streetDetails += (streetDetails ? ', ' : '') + `lph. ${staircase}`;
        const floor = formatWithPeriod(get('floor'));
        if (floor) streetDetails += (streetDetails ? ', ' : '') + `${floor} em.`;
        const door = formatWithPeriod(get('door'));
        if (door) streetDetails += (streetDetails ? ', ' : '') + `${door} ajtó`;

        if (streetDetails) mainParts.push(streetDetails);
        return mainParts.length > 0 ? mainParts.join(', ') : 'N/A';
    };

    const formatStudyHistory = (key, value) => {
        if (!value) return 'N/A';
        if (key === 'has_previous_license') return value === 'igen' ? 'Igen' : 'Nem';
        if (key === 'studied_elsewhere_radio') {
            const map = { 'igen_nalunk': 'Igen, nálunk', 'igen_mashol': 'Igen, máshol', 'nem': 'Nem' };
            return map[value] || value;
        }
        return value;
    };

    const fullName = formatFullName(student.current_prefix, student.current_firstName, student.current_lastName, student.current_secondName);
    const birthFullName = formatFullName(student.birth_prefix, student.birth_firstName, student.birth_lastName, student.birth_secondName);
    const motherFullName = formatFullName(student.mother_prefix, student.mother_firstName, student.mother_lastName, student.mother_secondName);
    
    const getBirthPlace = () => {
        const country = student.birth_country || '';
        const city = student.birth_city || '';
        const district = student.birth_district || '';
        let place = '';
        if (country.toLowerCase().trim() !== 'magyarország' && country !== '') place += `${country}, `;
        place += city;
        if (district) place += `, ${district}`;
        return place || 'N/A';
    };
    const birthPlace = getBirthPlace();

    const Section = ({ title, children, className = "" }) => html`
        <div className=${`bg-white p-5 rounded-lg shadow-sm border border-gray-200 ${className}`}>
            <h4 className="text-lg font-bold text-indigo-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                ${title}
            </h4>
            <div className="space-y-1">${children}</div>
        </div>
    `;

    return html`
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick=${e => e.stopPropagation()}>
                <header className="p-6 border-b bg-white rounded-t-xl flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Tanuló adatlapja</h3>
                        <p className="text-indigo-600 font-medium">${fullName}</p>
                    </div>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main className="p-6 overflow-y-auto flex-grow bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <${Section} title="Személyes adatok">
                                <${DisplayField} label="Viselt név" value=${fullName} />
                                <${DisplayField} label="Születési név" value=${birthFullName} />
                                <${DisplayField} label="Anyja neve" value=${motherFullName} />
                                <${DisplayField} label="Születési hely" value=${birthPlace} />
                                <${DisplayField} label="Születési idő" value=${student.birthDate} />
                                <${DisplayField} label="Állampolgárság" value=${student.nationality} />
                                ${student.secondNationality && html`<${DisplayField} label="Második állampolgárság" value=${student.secondNationality} />`}
                            <//>

                            <${Section} title="Elérhetőségek">
                                <${DisplayField} label="Email" value=${student.email} />
                                <${DisplayField} label="Telefonszám" value=${student.phone_number} />
                            <//>

                            <${Section} title="Lakcím adatok">
                                <${DisplayField} label="Állandó lakcím" value=${formatAddress('permanent_address')} />
                                <${DisplayField} label="Tartózkodási hely" value=${student.residenceIsSame ? 'Azonos az állandó lakcímmel' : formatAddress('temporary_address')} />
                            <//>
                        </div>

                        <div className="space-y-6">
                            <${Section} title="Adminisztráció és Státusz">
                                <${DisplayField} label="Tanuló azonosító" value=${student.studentId} />
                                <${DisplayField} label="Sorszám" value=${student.registrationNumber} />
                                <${DisplayField} label="Jelentkezés ideje" value=${formatSingleTimestamp(student.createdAt)} />
                                <${DisplayField} label="Beiratkozás ideje" value=${formatSingleTimestamp(student.enrolledAt)} />
                                <${DisplayField} label="Azonosító megadása" value=${formatSingleTimestamp(student.studentIdAssignedAt)} />
                                <${DisplayField} label="Tanfolyam befejezve" value=${formatSingleTimestamp(student.courseCompletedAt)} />
                            <//>

                            <${Section} title="Okmányok és Végzettség">
                                <${DisplayField} label="Okmány típusa" value=${student.documentType} />
                                <${DisplayField} label="Okmány száma" value=${student.documentNumber} />
                                <${DisplayField} label="Okmány lejárata" value=${student.documentExpiry} />
                                <${DisplayField} label="Végzettség" value=${student.education} />
                            <//>

                            <${Section} title="Tanulmányi Előzmények">
                                <${DisplayField} label="Van korábbi jogsi?" value=${formatStudyHistory('has_previous_license', student.has_previous_license)} />
                                <${DisplayField} label="Kategóriák" value=${student.previous_license_categories} />
                                <${DisplayField} label="Tanult máshol?" value=${formatStudyHistory('studied_elsewhere_radio', student.studied_elsewhere_radio)} />
                                <${DisplayField} label="Sikertelen vizsgák" value=${student.failed_exam_count} />
                            <//>

                            <${Section} title="Gondviselő (18 év alatt)">
                                <${DisplayField} label="Név" value=${student.guardian_name} />
                                <${DisplayField} label="Telefon" value=${student.guardian_phone} />
                                <${DisplayField} label="Email" value=${student.guardian_email} />
                            <//>
                        </div>
                    </div>

                    ${/* Vizsgaeredmények szekció - Teljes szélességben */''}
                    <div className="mt-6">
                        <${Section} title="Vizsgaeredmények (KAV Import)" className="border-indigo-100 ring-4 ring-indigo-50">
                            <${ExamResultsTable} results=${student.examResults} />
                        <//>
                    </div>

                    ${/* Megjegyzés szekció - Teljes szélességben */''}
                    <div className="mt-6">
                        <${Section} title="Megjegyzés">
                            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">${student.megjegyzes || 'Nincs megjegyzés.'}</p>
                        <//>
                    </div>
                </main>

                <footer className="p-4 bg-white rounded-b-xl border-t flex justify-end gap-3 z-10">
                    <button onClick=${onClose} className="bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-900 transition-colors shadow-sm">Bezárás</button>
                </footer>
            </div>
        </div>
    `;
};

export default ViewDetailsModal;
