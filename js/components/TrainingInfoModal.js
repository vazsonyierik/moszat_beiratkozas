/**
 * js/components/TrainingInfoModal.js
 * * New component to display the training information.
 * * JAVÍTÁS: A tartalom kiegészítve a teljes szöveggel és formázva az olvashatóság érdekében.
 * * MÓDOSÍTÁS: A címek félkövérré téve és a szövegtördelés javítva a felhasználói kérés alapján.
 * * MÓDOSÍTÁS: A modális ablak most már csak a gombokra kattintva záródik be, a háttérre kattintva nem.
 * * MÓDOSÍTÁS 2: A dizájn hozzáigazítva az űrlap stílusához.
 * * JAVÍTÁS 3: A táblázatok mobilbaráttá téve a jobb olvashatóság érdekében.
 */
import { html } from '../UI.js';
import { XIcon } from '../Icons.js';

const TrainingInfoModal = ({ onClose }) => {
    // Helper component for table rows to avoid repetition
    const InfoRow = ({ label, value }) => html`
        <tr>
            <th>${label}</th>
            <td>${value}</td>
        </tr>
    `;
    
    // MÓDOSÍTÁS: data-label attribútumok hozzáadva a mobil nézethez
    const FeeRow = ({ item, fee, note }) => html`
        <tr>
            <td data-label="Tétel">${item}</td>
            <td data-label="Díj">${fee}</td>
            <td data-label="Fizetési határidő">${note}</td>
        </tr>
    `;

    return html`
        <div className="modal-overlay">
            <div className="modal-container" onClick=${e => e.stopPropagation()}>
                <header className="modal-header">
                     <div>
                        <h3>Tájékoztató a Képzési Szolgáltatásról</h3>
                        <p>Hatályos: 2025. január 1-től</p>
                    </div>
                    <button onClick=${onClose} className="modal-close-button"><${XIcon} size=${24} /></button>
                </header>
                <main className="modal-main">
                    <div>
                        
                        <h4>Képzőszerv adatai</h4>
                        <div className="overflow-x-auto">
                            <table className="responsive-table-card">
                                <tbody>
                                    <${InfoRow} label="Képzőszerv megnevezése" value="Jogsiszoft Kft." />
                                    <${InfoRow} label="Székhely" value="1223 Budapest, Gyula Vezér út 52/C 3. em. 14. ajtó" />
                                    <${InfoRow} label="Cégjegyzékszám" value="01-09-917305" />
                                    <${InfoRow} label="Felnőttképzési nyilvántartási szám" value="B/2020/000180" />
                                    <${InfoRow} label="Fantázianevek" value="Mosolyzóna Autósiskola, Kreszprofesszor Autósiskola" />
                                    <${InfoRow} label="Iskolavezető neve" value="Pető Attila" />
                                    <${InfoRow} label="Iskolavezető e-mail címe" value="jogsiszoft@gmail.com" />
                                    <${InfoRow} label="E-mail" value="mosolyzonairoda@gmail.com, kreszprofesszor@gmail.com" />
                                    <${InfoRow} label="Telefonszáma" value="+36 1 333 3323" />
                                    <${InfoRow} label="Hivatalos honlap" value=${html`<a href="https://www.jogsiszoft.hu/" target="_blank">https://www.jogsiszoft.hu/</a>`} />
                                    <${InfoRow} label="Tanulói tájékoztató oldal" value=${html`<a href="https://moszat.hu/" target="_blank">https://moszat.hu/</a>`} />
                                </tbody>
                            </table>
                        </div>

                        <h4>Ügyfélfogadás</h4>
                        <div className="overflow-x-auto">
                            <table className="responsive-table-card">
                                <tbody>
                                    <${InfoRow} label="Cím" value="1088 Budapest, Krúdy utca 16-18. földszint 3. ajtó" />
                                    <${InfoRow} label="Telefonszám" value="+36 1 333 3323 (elérhető nyitvatartási időben)" />
                                    <${InfoRow} label="Irodai nyitvatartás" value=${html`
                                        <ul className="list-none p-0 m-0">
                                            <li>Hétfő: 9:00 – 17:45</li>
                                            <li>Kedd: 12:30 – 17:00</li>
                                            <li>Szerda: 11:00 – 17:00</li>
                                            <li>Csütörtök: 12:30 – 17:00</li>
                                            <li>Péntek: 11:00 – 15:00</li>
                                        </ul>
                                    `} />
                                </tbody>
                            </table>
                        </div>

                        <h4>A képzés helyszínei</h4>
                        <ul>
                            <li><strong>Elméleti képzés:</strong> Zárt rendszerű távoktatás (e-learning) keretében, a tanuló által választott tetszőleges helyszínen (stabil internet elérés szükséges).</li>
                            <li><strong>Gyakorlati képzés:</strong> A választott gyakorlati oktatóval egyeztetett helyszínen, a szakoktató által biztosított oktatójárművel.</li>
                        </ul>

                        <h3>TANFOLYAMRA TÖRTÉNŐ FELVÉTEL ÉS A VIZSGÁRA BOCSÁTÁS FELTÉTELEI</h3>
                        <p>A jelentkezés feltétele az előírt életkori feltételeknek való megfelelés és a jelentkezési adatlap kitöltése. Legkésőbb a jelentkezési adatlap leadásakor a tanulónak le kell adnia az érvényes orvosi egészségügyi alkalmassági igazolást („B” kategória esetén 1. alkalmassági csoportra vonatkozót), melyet alapesetben a jelentkező háziorvosa állít ki. Nem szükséges külön orvosi alkalmassági igazolás, amennyiben a tanulónak – a megszerezni kívánt vezetői engedély kategóriához előírt alkalmassági csoportnak megfelelő – orvosi érvényességhez kötött érvényes vezetői engedélye van. Személyes jelentkezéskor a tanulónak be kell mutatnia személyazonosításra alkalmas okmányát, lakcímkártyáját vagy tartózkodási engedélyét, és ha van, a vezetői engedélyét. A jelentkezési lapot kitöltés után a megfelelő helyeken saját kezűleg alá kell írnia (18 éven aluliaknál a törvényes képviselő aláírása is szükséges). A tanulónak az alapfokú iskolai végzettségét legkésőbb az első hatósági vizsgán igazolnia kell az eredeti okmány bemutatásával. Ennek elmulasztása esetén – annak pótlásáig – a soron következő vizsgára a tanuló nem bocsátható. Pályaalkalmassági (PÁV) vizsgálatra alapesetben nincs szükség. Erre csak öt sikertelen forgalmi vizsgát követően, a hatodik vizsga letétele előtt van szükség.</p>

                        <h4>A képzéssel kapcsolatos általános tudnivalók</h4>
                        <p>Iskolánknál kizárólag e-learning rendszerű elméleti képzés folyik, így a tananyag elsajátítása a tanuló egyéni időbeosztása alapján és egyéni haladási üteme szerint történik. Az e-learning hozzáférés 75 óra tanulási időt és 180 nap rendelkezésre állást biztosít. A hozzáférés egyszer díjmentesen hosszabbítható, amely további 30 napot és 10 órát ad. Minden további hosszabbítás díja 10.000 Ft, és szintén 30 nappal/10 órával növeli a hozzáférést a jogszabályban előírt határidőkig.</p>
                        <ul>
                            <li>A tanulónak a tananyag megkezdésétől számított <strong>9 hónapon belül</strong> részt kell vennie az első hatósági elméleti vizsgáján.</li>
                            <li>A tanulónak a tananyag megkezdésétől számított <strong>12 hónapon belül</strong> pedig rendelkeznie kell sikeres elméleti vizsgával, ellenkező esetben a teljes képzést újra kell kezdenie.</li>
                        </ul>
                        <p>A gyakorlati tanórák tervezett időtartama 50 perc. A képzés, illetve annak részei alól „B” kategória esetén mentesítés nem adható. Gyakorlati képzését csak az kezdheti meg, aki az előírt elméleti tantárgyakból sikeres vizsgát tett. A gyakorlati óra helyszínének és kezdési időpontjának meghatározása a tanulóval egyeztetve történik. Gyakorlati oktatás kizárólag az autósiskola által biztosított oktatójárműveken történik. Szeszes ital, vagy a vezetési képességre hátrányosan ható szer (gyógyszer, kábítószer, stb.) hatása alatti állapotban a képzés bármely szakaszában tilos az oktatáson való részvétel, amely a képzésről történő azonnali kizárást eredményez. A képzésből jogosan kizárt tanuló a tandíjat nem kaphatja vissza. A tanuló elméleti- és gyakorlati vezetési pótórákat igényelhet választott gyakorlati oktatójától, illetve az autósiskola ügyfélszolgálatán keresztül.</p>

                        <h4>Tanuló áthelyezése</h4>
                        <p>A tanuló áthelyezési kérelme esetén az autósiskola a teljesített elméleti és gyakorlati képzésről térítésmentesen igazolást állít ki a jogszabályban előírt 3 munkanapos határidőn belül. A képzési igazolás kiállítását a képzőszervtől a tanulónak kell igényelnie. A képzési igazolással a tanuló felkeresi az általa választott új autósiskolát, aki a további ügymenetet lefolytatja. Az elbocsátó autósiskola az elméleti képzésre befizetett díjat és a felhasznált vizsgadíjat nem téríti vissza. A befizetett, de le nem vezetett gyakorlati órák díját az iskola 9.000 Ft/óra áron visszatéríti.</p>

                        <h4>A vizsgákkal kapcsolatos általános tudnivalók</h4>
                        <p>A vizsgázónak a vizsga helyszínén a kiírt időpont előtt legalább 15 perccel meg kell jelennie. A vizsgán a személyazonosságot érvényes személyazonosító igazolvánnyal, útlevéllel vagy kártyaformátumú vezetői engedéllyel kell igazolni. Lejárt okmány nem fogadható el. Amennyiben a vizsgázó rendelkezik vezetői engedéllyel, azt a vizsgán minden esetben be kell mutatnia. Ha a vizsgázó érvényes okmányok hiányában vagy vizsgára alkalmatlan állapotban jelenik meg, a vizsgán nem vehet részt, és új vizsgát csak a vizsgadíj ismételt befizetése után tehet. Sikertelen vizsga esetén pótvizsgára van lehetőség a vonatkozó szabályok szerint, a pótvizsgadíj befizetése mellett.</p>
                        <p>A vizsgabiztos felfüggeszti azon vizsgázó vizsgáját, aki:</p>
                        <ul>
                            <li>személyazonossága vagy személyi adatai tekintetében a vizsgabiztost megtévesztette vagy azt megkísérelte,</li>
                            <li>a vizsgabiztost döntésének meghozatalában előny adásával, ígéretével, fenyegetéssel befolyásolni törekedett,</li>
                            <li>az objektív értékelést ellehetetleníti, vagy a vizsga eredményét befolyásoló, meg nem engedett segédeszközt (pl. mobiltelefon, kép- vagy hangrögzítő eszköz) használ,</li>
                            <li>magatartásával a vizsga rendjét megzavarja, szabályos lebonyolítását akadályozza.</li>
                        </ul>
                        <p>Az elméleti vizsga számítógép igénybevételével történik. A vizsgaközponttól kapott engedély alapján szóbeli elméleti vizsgát tehet tolmács közreműködésével a magyar nyelvet nem anyanyelvi szinten beszélő külföldi állampolgár. Ugyancsak szóbeli vizsgát tehet az, aki szakértői véleménnyel igazoltan szövegértési vagy szövegolvasási nehézséggel küzd.</p>

                        <h4>Vezetői engedéllyel kapcsolatos tudnivalók</h4>
                        <p>Amennyiben a tanuló minden előírt vizsgakötelezettségét sikeresen teljesítette, akkor a Közlekedési Alkalmassági és Vizsgaközpont (KAV) továbbítja az elektronikus vizsgaigazolást az okmányirodának, mely alapján a hatóság kiállítja a vezetői engedélyt. Vezetői engedélyt csak annak lehet kiadni, akinek szokásos tartózkodási helye Magyarország területén van. Az ügyfélnek tehát ezt a tényt a vezetői engedély iránti kérelem benyújtásakor igazolnia kell (érvényes lakcímkártya, vagy legalább 185 napig érvényes tartózkodási engedély).</p>
                        <p><strong>Elsősegély-nyújtási ismeretek:</strong> A vezetői engedély kiadásához szükséges az elsősegély-nyújtási ismeretek megszerzését igazoló kártya megléte (vagy az az alóli mentesülés igazolása), amennyiben a tanuló első vezetői engedélyét szerzi. Vizsgát a Magyar Vöröskeresztnél lehet tenni. A sikeres vizsgáról a Vöröskereszt elektronikusan értesíti a nyilvántartó szervet. Mentesül a vizsga alól, aki a 31/1992. (XII. 19.) NM rendeletben meghatározott szakirányú végzettséggel rendelkezik. Amennyiben a vezetői engedély kiadásának feltételeivel kapcsolatban (különösen külföldi állampolgárok esetében) kérdések merülnek fel, azokat célszerű még a képzés megkezdése előtt tisztázni. Ehhez a tanuló kérheti a képzőszerv segítségét is.</p>

                        <h3>A TANULÓ ÉS A KÉPZŐSZERV JOGAI ÉS KÖTELEZETTSÉGEI</h3>
                        <h5>A tanuló jogai:</h5>
                        <ul>
                            <li>A képzés megkezdése előtt tájékozódni és megismerni a képzőszerv vállalkozási feltételeit.</li>
                            <li>A vállalt szolgáltatást a képzőszervtől számon kérni, igénybe venni.</li>
                            <li>A képzést megszakítani. A befizetett, de le nem vezetett gyakorlati órák díját az iskola 9.000 Ft/óra áron visszatéríti. Az elméleti képzés díja és a vizsgadíjak nem téríthetőek vissza.</li>
                            <li>Másik képzőszervnél folytatni a képzést, amelyhez az iskola kiállítja a szükséges igazolásokat.</li>
                            <li>A személyes adataival kapcsolatos titoktartást követelni.</li>
                            <li>A gyakorlati órát legalább 48 órával a megbeszélt időpont előtt lemondani. Ennél későbbi lemondás vagy meg nem jelenés esetén 1 óra megtartottnak minősül és díjköteles.</li>
                            <li>Panasszal, észrevétellel élni a képzéssel kapcsolatban.</li>
                        </ul>
                        <h5>A tanuló kötelességei:</h5>
                        <ul>
                            <li>A tandíjat és vizsgadíjakat a szerződésben rögzített határidőre megfizetni.</li>
                            <li>A képzőszerv iskolai és pénzügyi rendtartását betartani.</li>
                            <li>A foglalkozásokon józan, kipihent állapotban, az oktatási körülményekhez illő öltözetben megjelenni.</li>
                            <li>Az általános emberi normákat betartani, kulturáltan viselkedni.</li>
                            <li>A szakoktató utasításait követni, a képzésben aktívan közreműködni.</li>
                            <li>Késés esetén a szakoktatóra legalább 20 percet várni. A tanuló késését a szakoktató nem köteles bepótolni.</li>
                        </ul>
                        <h5>A képzőszerv jogai:</h5>
                        <ul>
                            <li>A tandíjat a szerződés szerint beszedni.</li>
                            <li>Indokolt esetben a képzési időpontot (legalább 24 órával előtte) módosítani.</li>
                            <li>A beiratkozástól számított 3. hónap után a még le nem vezetett óradíjakat módosítani.</li>
                            <li>A szerződést felmondani, ha a tanuló a fizetési kötelezettségének nem tesz eleget.</li>
                        </ul>
                        <h5>A képzőszerv kötelességei:</h5>
                        <ul>
                            <li>A vállalkozási feltételekben meghatározottakat betartani.</li>
                            <li>A tudomására jutott személyes adatokat bizalmasan kezelni.</li>
                            <li>A képzés díjáról számlát kiállítani.</li>
                            <li>Az oktatáshoz kulturált környezetet és körülményeket biztosítani.</li>
                            <li>A tanuló panaszát kivizsgálni és arra érdemben reagálni.</li>
                            <li>A tanuló kérésére a szükséges igazolásokat kiadni.</li>
                        </ul>

                        <h3>„B” kategóriás képzés</h3>
                        <h5>Milyen járműveket vezethet vele?</h5>
                        <p>A 3500 kg-ot meg nem haladó megengedett legnagyobb össztömegű gépkocsit, amely a vezetőn kívül legfeljebb nyolc utas szállítására tervezett és gyártott gépjármű, valamint az ilyen gépjárműből és a hozzá kapcsolt, a vonatkozó jogszabályban meghatározott pótkocsiból álló járműszerelvényt.</p>
                        <h5>A képzés megkezdésének feltételei</h5>
                        <ul>
                            <li>Betöltött legalább 16 év és 6 hónapos életkor.</li>
                            <li>Legalább alapfokú (8 általános) iskolai végzettség.</li>
                            <li>Érvényes személyazonosító okmány és lakcímkártya.</li>
                        </ul>
                        <h5>Vizsgára bocsátás feltételei</h5>
                        <ul>
                            <li><strong>Elméleti vizsga:</strong> Betöltött 16 év és 9 hónapos életkor, az elméleti tanfolyam elvégzését igazoló tanfolyami igazolás. Érvényes orvosi alkalmassági igazolás (1. csoportú).</li>
                            <li><strong>Forgalmi vizsga:</strong> Betöltött 17. életév, sikeres elméleti vizsga, valamint a kötelező 29 gyakorlati óra és 580 km menettávolság teljesítése.</li>
                        </ul>
                        
                        <h4>Képzés tantárgyai és kötelező óraszámai</h4>
                        <div className="overflow-x-auto">
                            <table className="responsive-table-grid">
                                <thead>
                                    <tr>
                                        <th>Képzési rész</th>
                                        <th>Tantárgy/Foglalkozás</th>
                                        <th>Óraszám/Időtartam</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td data-label="Képzési rész" rowSpan="4"><strong>Elmélet</strong></td><td data-label="Tantárgy/Foglalkozás">Közlekedési alapismeretek</td><td data-label="Óraszám/Időtartam" rowSpan="3">E-learning (75 óra / 180 nap)</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás">Járművezetés elmélete</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás">Szerkezeti és üzemeltetési ismeretek</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás">Hatósági elméleti vizsga</td><td data-label="Óraszám/Időtartam">55 perc</td></tr>
                                    <tr><td data-label="Képzési rész" rowSpan="7"><strong>Gyakorlat</strong></td><td data-label="Tantárgy/Foglalkozás">Alapoktatás (járműkezelés)</td><td data-label="Óraszám/Időtartam">9 óra</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás">Főoktatás: Városi vezetés</td><td data-label="Óraszám/Időtartam">14 óra</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás">Főoktatás: Országúti vezetés</td><td data-label="Óraszám/Időtartam">4 óra</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás">Főoktatás: Éjszakai vezetés</td><td data-label="Óraszám/Időtartam">2 óra</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás">Hatósági forgalmi vizsga</td><td data-label="Óraszám/Időtartam">1 óra</td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás"><strong>Gyakorlat összesen</strong></td><td data-label="Óraszám/Időtartam"><strong>Kötelező minimum: 29 óra + 1 vizsgaóra</strong></td></tr>
                                    <tr><td data-label="Tantárgy/Foglalkozás"><strong>Kötelező menettávolság</strong></td><td data-label="Óraszám/Időtartam"><strong>580 km</strong></td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h4>Az autósiskolának fizetendő képzési díjak</h4>
                        <div className="overflow-x-auto">
                            <table className="responsive-table-grid">
                                <thead>
                                    <tr>
                                        <th>Tétel</th>
                                        <th>Díj</th>
                                        <th>Fizetési határidő</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <${FeeRow} item="Elméleti képzés díja (egyösszegben)" fee="100.000 Ft" note="Beiratkozáskor" />
                                    <${FeeRow} item="vagy részletfizetéssel: Első részlet" fee="65.000 Ft" note="Beiratkozáskor" />
                                    <${FeeRow} item="Második részlet" fee="45.000 Ft" note="KRESZ-vizsga előtt" />
                                    <${FeeRow} item="Gyakorlati képzés díja (30 óra)" fee="300.000 Ft" note="Előre fizetéssel, minimum 10 óránként előre (3x100.000 Ft)" />
                                    <${FeeRow} item="Gyakorlati pótóra díja" fee="10.000 Ft/óra" note="Előre fizetéssel, gyakorlati oktatóval megbeszéltek alapján" />
                                    <${FeeRow} item="Elméleti pótvizsga (iskolai ügyintézéssel)" fee="5.000 Ft" note="Pótvizsgára jelentkezés előtt" />
                                    <${FeeRow} item="E-learning pót-hozzáférés (további hosszabbítás)" fee="10.000 Ft / alkalom" note="Igényléskor" />
                                </tbody>
                            </table>
                        </div>
                        <h5>Az elméleti díj (100.000 Ft) tartalmazza:</h5>
                        <p>Nyomtatott és e-learning tananyagot, A teljes számítógépes hatósági vizsgaanyagot, Korlátlan részvételi lehetőséget tantermi konzultációkon, A közúti elsősegélynyújtás online tananyagát, Ügyintézési és adminisztrációs költségeket, Az első KRESZ vizsga díját, Egyszeri díjmentes hosszabbítás (további 30 nap hozzáférés és 10 óra tanulási időkeret), Egy KRESZ pótvizsga díjat (igazolt személyes konzultáción való részvétel esetén).</p>

                        <h4>Hatósági vizsgadíjak (KAV részére fizetendő)</h4>
                        <div className="overflow-x-auto">
                            <table className="responsive-table-grid">
                                <thead>
                                    <tr>
                                        <th>Tétel</th>
                                        <th>Díj</th>
                                        <th>Megjegyzés</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <${FeeRow} item="KRESZ vizsga" fee="4.600 Ft" note="Az első vizsga díját az elméleti csomag tartalmazza" />
                                    <${FeeRow} item="Forgalmi vizsga" fee="11.000 Ft" note="A vizsgára jelentkezés előtt fizetendő" />
                                    <${FeeRow} item="Elméleti pótvizsga" fee="4.600 Ft" note="Sikertelen vizsga esetén fizetendő a vizsgáztató szervnél (KAV)" />
                                </tbody>
                            </table>
                        </div>

                        <h4>Egyéb költségek</h4>
                        <div className="overflow-x-auto">
                            <table className="responsive-table-grid">
                                <thead>
                                    <tr>
                                        <th>Tétel</th>
                                        <th>Díj</th>
                                        <th>Fizetési határidő</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <${FeeRow} item="Elsősegélynyújtás vizsgadíj (Magyar Vöröskereszt)" fee="19.990 Ft" note="A vizsgára jelentkezéskor, a Vöröskereszt felé" />
                                </tbody>
                            </table>
                        </div>

                        <h4>Állami támogatás (25.000 Ft)</h4>
                        <p>2018. július 1-től a 20. életévüket be nem töltött magyar állampolgárok „B” kategóriás jogosítványuk megszerzéséhez állami támogatást igényelhetnek. A támogatási kérelem a sikeres elméleti vizsgát követően nyújtható be a Magyar Államkincstár Nyugdíjfolyósító Igazgatóságnál az elméleti tanfolyam és a sikeres elméleti vizsga díjának igazolt összegére, legfeljebb összesen 25.000 Ft értékében. A támogatás GYES-en, GYED-en lévők számára is elérhető. A támogatáshoz szükséges igénylőlap letölthető a Magyar Államkincstár honlapjáról.</p>

                        <h4>Felügyeleti szervek</h4>
                        <p><strong>Építési és Közlekedési Minisztérium</strong><br/>Cím: 1054 Budapest, Alkotmány utca 5.<br/>E-mail: info@ekm.gov.hu</p>
                        <p><strong>KAV Közlekedési Alkalmassági és Vizsgaközpont Nonprofit Kft.</strong><br/>Cím: 1033 Budapest, Polgár utca 8-10.<br/>E-mail: info@kavk.hu<br/>Telefon: +36 1 814 1800</p>
                        
                        <p className="text-right">Kelt: Budapest, 2025.01.01.<br/>Jogsiszoft Kft.</p>
                    </div>
                </main>
                <footer className="modal-footer">
                    <button onClick=${onClose} className="modal-button-primary">Bezárás</button>
                </footer>
            </div>
        </div>
    `;
};

export default TrainingInfoModal;
