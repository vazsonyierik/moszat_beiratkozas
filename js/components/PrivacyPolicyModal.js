/**
 * js/components/PrivacyPolicyModal.js
 * * Modal for displaying the privacy policy.
 * * JAVÍTÁS: A tartalom frissítve a legújabb adatkezelési tájékoztatóval.
 * * MÓDOSÍTÁS: A modális ablak most már csak a gombokra kattintva záródik be, a háttérre kattintva nem.
 * * MÓDOSÍTÁS 2: A dizájn hozzáigazítva az űrlap stílusához.
 * * JAVÍTÁS 3: A táblázatok mobilbaráttá téve a jobb olvashatóság érdekében.
 */
import { html } from '../UI.js';
import { XIcon } from '../Icons.js';

const PrivacyPolicyModal = ({ onClose }) => {
    return html`
        <div className="modal-overlay">
            <div className="modal-container" onClick=${e => e.stopPropagation()}>
                <header className="modal-header">
                    <div>
                        <h3>Adatkezelési Tájékoztató</h3>
                        <p>Hatályos: 2025. január 1-től</p>
                    </div>
                    <button onClick=${onClose} className="modal-close-button"><${XIcon} size=${24} /></button>
                </header>
                <main className="modal-main">
                    <div>
                        <p>A <strong>Jogsiszoft Korlátolt Felelősségű Társaság</strong> (a továbbiakban: Adatkezelő vagy Autósiskola) elkötelezett az Ön személyes adatainak védelme mellett. Célunk, hogy a szolgáltatásainkat igénybe vevő tanulók számára mindenkor biztosítsuk a személyes adataik biztonságos és jogszerű kezelését.</p>
                        <p>Ez a tájékoztató az Európai Parlament és a Tanács (EU) 2016/679 Rendelete (Általános Adatvédelmi Rendelet, a továbbiakban: GDPR), valamint az információs önrendelkezési jogról és az információszabadságról szóló 2011. évi CXII. törvény (a továbbiakban: Infotv.) alapján készült.</p>
                        <p>Kérjük, figyelmesen olvassa el a tájékoztatót, mielőtt hozzájárul személyes adatai kezeléséhez. A képzésre való jelentkezéssel Ön elismeri, hogy a jelen Adatkezelési Tájékoztató tartalmát megismerte, megértette és elfogadja.</p>

                        <h3>1. Az Adatkezelő adatai</h3>
                        <table className="responsive-table-card">
                            <tbody>
                                <tr><th>Név:</th><td>Jogsiszoft Korlátolt Felelősségű Társaság</td></tr>
                                <tr><th>Rövidített név:</th><td>Jogsiszoft Kft.</td></tr>
                                <tr><th>Székhely:</th><td>1223 Budapest, Gyula Vezér út 52/C 3. em. 14. ajtó</td></tr>
                                <tr><th>Ügyfélfogadás helye:</th><td>1088 Budapest, Krúdy u. 16.</td></tr>
                                <tr><th>Cégjegyzékszám:</th><td>01-09-917305</td></tr>
                                <tr><th>Adószám:</th><td>14733868-2-43</td></tr>
                                <tr><th>Képviselő:</th><td>Pető Attila (iskolavezető)</td></tr>
                                <tr><th>Telefonszám:</th><td>+36 1 333 3323</td></tr>
                                <tr><th>E-mail cím:</th><td>jogsiszoft@gmail.com</td></tr>
                                <tr><th>Honlap:</th><td>www.jogsiszoft.hu</td></tr>
                            </tbody>
                        </table>

                        <h3>2. Az adatkezelés alapjául szolgáló főbb jogszabályok</h3>
                        <ul>
                            <li>Az Európai Parlament és a Tanács (EU) 2016/679 Rendelete (GDPR)</li>
                            <li>Az információs önrendelkezési jogról és az információszabadságról szóló 2011. évi CXII. törvény (Infotv.)</li>
                            <li>A közúti járművezetők és a közúti közlekedési szakemberek képzésének és vizsgáztatásának részletes szabályairól szóló 24/2005. (IV. 21.) GKM rendelet</li>
                            <li>A számvitelről szóló 2000. évi C. törvény (Számv. tv.)</li>
                            <li>A felnőttképzésről szóló 2013. évi LXXVII. törvény (Fktv.)</li>
                        </ul>

                        <h3>3. A kezelt személyes adatok köre, az adatkezelés célja és jogalapja</h3>
                        <p>Az Autósiskola az alábbi célokból, a megjelölt jogalapokon kezeli az Ön személyes adatait. Az adatszolgáltatás a képzési szerződés megkötésének előfeltétele. Amennyiben Ön a szükséges adatokat nem szolgáltatja, a szerződés nem jön létre.</p>
                        <div className="overflow-x-auto">
                            <table className="responsive-table-grid">
                                <thead>
                                    <tr>
                                        <th>Adatkezelési Cél</th>
                                        <th>Kezelt Adatok Köre</th>
                                        <th>Az Adatkezelés Jogalapja</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td data-label="Adatkezelési Cél"><strong>Szerződéskötés, kapcsolattartás, tájékoztatás</strong></td><td data-label="Kezelt Adatok Köre">Név, lakcím, értesítési cím, telefonszám, e-mail cím.</td><td data-label="Az Adatkezelés Jogalapja"><strong>GDPR 6. cikk (1) b) pont:</strong> az adatkezelés olyan szerződés teljesítéséhez (vagy azt megelőző lépésekhez) szükséges, amelyben az érintett az egyik fél.</td></tr>
                                    <tr><td data-label="Adatkezelési Cél"><strong>Képzési szerződés teljesítése, a képzés lebonyolítása</strong></td><td data-label="Kezelt Adatok Köre">Születési név, anyja neve, születési hely és idő, állampolgárság, oktatási azonosító, képzési adatok, haladási napló adatai, elméleti és gyakorlati órákon való részvétel.</td><td data-label="Az Adatkezelés Jogalapja"><strong>GDPR 6. cikk (1) b) pont:</strong> a szerződés teljesítése.</td></tr>
                                    <tr><td data-label="Adatkezelési Cél"><strong>Hatósági vizsgára jelentkezés és vizsgaügyintézés</strong></td><td data-label="Kezelt Adatok Köre">Természetes személyazonosító adatok, személyi igazolvány és lakcímkártya száma, meglévő vezetői engedély adatai, nyilatkozat az alapfokú iskolai végzettségről (vagy azt igazoló okirat adatai).</td><td data-label="Az Adatkezelés Jogalapja"><strong>GDPR 6. cikk (1) c) pont:</strong> az adatkezelés az adatkezelőre vonatkozó jogi kötelezettség teljesítéséhez szükséges (24/2005. GKM rendelet, Fktv.).</td></tr>
                                    <tr><td data-label="Adatkezelési Cél"><strong>Orvosi alkalmasság igazolása</strong></td><td data-label="Kezelt Adatok Köre">Orvosi alkalmassági véleményen szereplő egészségügyi adatok.</td><td data-label="Az Adatkezelés Jogalapja"><strong>GDPR 9. cikk (2) g) pont:</strong> az adatkezelés jelentős közérdek alapján, uniós vagy tagállami jog alapján szükséges.</td></tr>
                                    <tr><td data-label="Adatkezelési Cél"><strong>Számlázás, pénzügyi kötelezettségek teljesítése</strong></td><td data-label="Kezelt Adatok Köre">Név, lakcím, adószám (ha van), számlázási adatok, befizetésekkel kapcsolatos információk.</td><td data-label="Az Adatkezelés Jogalapja"><strong>GDPR 6. cikk (1) c) pont:</strong> jogi kötelezettség teljesítése (Számv. tv.).</td></tr>
                                    <tr><td data-label="Adatkezelési Cél"><strong>Felnőttképzési adatszolgáltatási kötelezettség (FAR)</strong></td><td data-label="Kezelt Adatok Köre">Az Fktv. által előírt adatok (pl. név, születési adatok, legmagasabb iskolai végzettség, oktatási azonosító).</td><td data-label="Az Adatkezelés Jogalapja"><strong>GDPR 6. cikk (1) c) pont:</strong> jogi kötelezettség teljesítése (Fktv.).</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>4. Az adatkezelés időtartama</h3>
                        <ul>
                            <li>A képzési szerződéssel kapcsolatos adatokat és dokumentumokat a szerződés megszűnésétől számított <strong>5 évig</strong> (az általános polgári jogi elévülési idő szerint) őrizzük meg.</li>
                            <li>A számviteli bizonylatokat (számlákat) a kiállításuktól számított <strong>8 évig</strong> kell megőriznünk a Számv. tv. 169. § (2) bekezdése alapján.</li>
                            <li>A vizsgajelentkezési lapokat és a képzéssel kapcsolatos, hatóság felé történő adatszolgáltatás alapjául szolgáló dokumentumokat a közlekedési hatóság által előírt ideig, de legalább a képzés végétől számított <strong>5 évig</strong> őrizzük meg.</li>
                        </ul>

                        <h3>5. Adattovábbítás és adatfeldolgozók</h3>
                        <p>Az Ön adatait a jogszabályi kötelezettségek teljesítése érdekében továbbítjuk a következő szervek felé:</p>
                        <ul>
                            <li><strong>Közlekedési Alkalmassági és Vizsgaközpont (KAV):</strong> A vizsgára jelentkezés és a vizsgáztatás lebonyolítása céljából.</li>
                            <li><strong>Felnőttképzési Adatszolgáltatási Rendszer (FAR):</strong> A jogszabályban előírt adatszolgáltatási kötelezettség teljesítése érdekében.</li>
                        </ul>
                        <p>Az Adatkezelő a működése során adatfeldolgozókat vehet igénybe, akik az Adatkezelő utasításai alapján, a vele kötött szerződés keretei között járnak el.</p>
                        <p><strong>Főbb adatfeldolgozóink:</strong></p>
                        <ul>
                            <li><strong>Gyakorlati szakoktatók:</strong> A gyakorlati képzés lebonyolítása érdekében.</li>
                            <li><strong>Könyvelőiroda:</strong> A számviteli kötelezettségek teljesítéséhez.</li>
                            <li><strong>IT-szolgáltató / E-learning rendszer üzemeltetője:</strong> Az online elméleti képzés (ha van) és az adminisztrációs rendszerek működtetéséhez.</li>
                        </ul>
                        <p>Az adatfeldolgozók az adatokat bizalmasan kezelik, és azokat más célra nem használhatják fel.</p>

                        <h3>6. Adatbiztonság</h3>
                        <p>Az Adatkezelő megfelelő technikai és szervezési intézkedésekkel gondoskodik az Ön személyes adatainak biztonságáról, védve azokat többek között a jogosulatlan hozzáféréstől, megváltoztatástól, továbbítástól, nyilvánosságra hozataltól, törléstől vagy megsemmisítéstől. A papír alapú dokumentumokat zárt irodában, az elektronikus adatokat pedig jelszóval és tűzfallal védett rendszerekben tároljuk.</p>

                        <h3>7. Az Ön jogai az adatkezeléssel kapcsolatban</h3>
                        <p>Önt az adatkezelés időtartama alatt az alábbi jogok illetik meg a GDPR alapján:</p>
                        <ul>
                            <li><strong>Tájékoztatáshoz és hozzáféréshez való jog:</strong> Kérheti, hogy tájékoztassuk az Önre vonatkozó adatkezelésről, és másolatot kérhet a kezelt adatokról.</li>
                            <li><strong>Helyesbítéshez való jog:</strong> Kérheti a pontatlanul rögzített vagy hiányos személyes adatainak helyesbítését, kiegészítését.</li>
                            <li><strong>Törléshez való jog ("elfeledtetéshez való jog"):</strong> Kérheti adatai törlését, ha azokra már nincs szükség abból a célból, amiből gyűjtöttük, vagy ha az adatkezelés jogellenes. A törlési kérelmet nem áll módunkban teljesíteni, ha az adatkezelés jogi kötelezettség teljesítése (pl. számviteli megőrzés) vagy jogi igények előterjesztése, érvényesítése miatt szükséges.</li>
                            <li><strong>Az adatkezelés korlátozásához való jog:</strong> Bizonyos esetekben (pl. ha vitatja az adatok pontosságát) kérheti, hogy személyes adatai kezelését korlátozzuk.</li>
                            <li><strong>Adathordozhatósághoz való jog:</strong> Jogosult arra, hogy a rendelkezésünkre bocsátott adatait tagolt, széles körben használt, géppel olvasható formátumban megkapja, és azokat egy másik adatkezelőnek továbbítsa.</li>
                            <li><strong>Tiltakozáshoz való jog:</strong> Tiltakozhat személyes adatainak kezelése ellen, ha az adatkezelés közérdekből vagy jogos érdekből történik.</li>
                        </ul>
                        <p>Kérelmeit az 1. pontban megadott elérhetőségeken nyújthatja be. A kérelmére indokolatlan késedelem nélkül, de legkésőbb 1 hónapon belül válaszolunk.</p>

                        <h3>8. Jogorvoslati lehetőségek</h3>
                        <p>Ha úgy érzi, hogy személyes adatait nem a jogszabályoknak megfelelően kezeljük, kérjük, első lépésként vegye fel velünk a kapcsolatot az 1. pontban megadott elérhetőségeken a helyzet békés rendezése érdekében.</p>
                        <p>Amennyiben a panaszát nem sikerül megnyugtatóan rendezni, jogorvoslatért a <strong>Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH)</strong> fordulhat.</p>
                        <ul>
                            <li><strong>Cím:</strong> 1055 Budapest, Falk Miksa utca 9-11.</li>
                            <li><strong>Postacím:</strong> 1363 Budapest, Pf. 9.</li>
                            <li><strong>E-mail:</strong> ugyfelszolgalat@naih.hu</li>
                            <li><strong>Honlap:</strong> www.naih.hu</li>
                        </ul>
                        <p>Lehetősége van továbbá bírósághoz fordulni, ha jogai sérültek. A pert – választása szerint – a lakóhelye vagy tartózkodási helye szerinti törvényszék előtt is megindíthatja.</p>

                        <h3>9. Értelmező rendelkezések</h3>
                        <ul>
                            <li><strong>Személyes adat:</strong> Azonosított vagy azonosítható természetes személyre („érintett”) vonatkozó bármely információ.</li>
                            <li><strong>Adatkezelő:</strong> Aki a személyes adatok kezelésének céljait és eszközeit önállóan vagy másokkal együtt meghatározza (jelen esetben a Jogsiszoft Kft.).</li>
                            <li><strong>Adatkezelés:</strong> A személyes adatokon vagy adatállományokon végzett bármely művelet (pl. gyűjtés, rögzítés, tárolás, továbbítás, törlés).</li>
                            <li><strong>Adatfeldolgozó:</strong> Az a természetes vagy jogi személy, amely az adatkezelő nevében személyes adatokat kezel.</li>
                        </ul>
                    </div>
                </main>
                <footer className="modal-footer">
                    <button onClick=${onClose} className="modal-button-primary">Bezárás</button>
                </footer>
            </div>
        </div>
    `;
};

export default PrivacyPolicyModal;
