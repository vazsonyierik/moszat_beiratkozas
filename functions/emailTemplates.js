/**
 * functions/emailTemplates.js
 * This file contains templates for the automated emails sent by the system.
 * MÓDOSÍTÁS: Az időzített emlékeztető e-mailek szövege és formázása frissítve a kérések alapján.
 * MÓDOSÍTÁS 2: A fix betűméretek eltávolítva, hogy a kliens alapértelmezett beállításai érvényesüljenek.
 * MÓDOSÍTÁS 3: Sablonok azonosítóval ellátva a könnyebb kezelhetőség érdekében.
 * MÓDOSÍTÁS 4: A tanfolyamot befejező e-mailek (E-3, E-4) mostantól ellenőrzik a tanuló életkorát,
 * és csak akkor jelenítik meg a 18 év alattiakra vonatkozó figyelmeztetést, ha az releváns.
 * MÓDOSÍTÁS 5: A 90 és 180 napos emlékeztető e-mailek (T-6, T-7) mostantól ellenőrzik, hogy a tanuló
 * leadta-e már az orvosi igazolását, és csak annak hiányában jelenítik meg az erre vonatkozó felhívást.
 */

// Helper function to format full name
const getFullName = (studentData) => {
    return [studentData.current_lastName, studentData.current_firstName, studentData.current_secondName].filter(Boolean).join(' ');
};

// Helper function to check if student is under 18
const isUnder18 = (birthDateStr) => {
    if (!birthDateStr) return false;
    const cleanedDateStr = birthDateStr.endsWith('.') ? birthDateStr.slice(0, -1) : birthDateStr;
    const parts = cleanedDateStr.split('.').map(p => parseInt(p.trim(), 10));
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const [year, month, day] = parts;
    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age < 18;
};

// --- Eseményvezérelt sablonok ---

// Sablon ID: E-1
// 1. New Registration Confirmation
exports.registrationConfirmation = (studentData) => ({
    subject: 'Sikeres jelentkezés! Már csak egy lépés van hátra',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Először is szeretnénk megköszönni, hogy minket választottál a jogosítványod megszerzéséhez!</p>
            <p>A beiratkozásod véglegesítéséhez és az online elméleti tananyaghoz való hozzáféréshez már csak egy lépés van hátra: a tandíj legalább első részletének befizetése.</p>
            
            <p style="margin-top: 1.2em; margin-bottom: 1.2em;"><strong>Fizetési lehetőségek:</strong></p>
            
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li>
                    <strong>Banki átutalás (ezt javasoljuk):</strong>
                    <ul style="list-style-type: circle; padding-left: 20px;">
                        <li><strong>Kedvezményezett:</strong> Jogsiszoft Kft.</li>
                        <li><strong>Számlaszám:</strong> 12010855-01164374-00100009 (Raiffeisen Bank)</li>
                        <li><strong>Közlemény/Megjegyzés:</strong> Kérjük, itt mindenképp tüntesd fel a saját teljes nevedet a könnyebb beazonosítás érdekében!</li>
                    </ul>
                </li>
                <li style="margin-top: 1em;">
                    <strong>Személyes fizetés az irodánkban:</strong>
                    <ul style="list-style-type: circle; padding-left: 20px;">
                        <li>Lehetőséged van készpénzzel vagy bankkártyával is fizetni.</li>
                        <li><strong>Címünk:</strong> 1088 Budapest, Krúdy u. 16-18. fszt. 3. (A 4-es, 6-os villamos Harminckettesek tere megállójánál)</li>
                        <li>
                            <strong>Nyitvatartás:</strong>
                            <ul style="list-style-type: square; padding-left: 20px;">
                                <li>Hétfő: 9:00 – 17:45</li>
                                <li>Kedd: 12:30 – 17:00</li>
                                <li>Szerda: 11:00 – 17:00</li>
                                <li>Csütörtök: 12:30 – 17:00</li>
                                <li>Péntek: 11:00 – 15:00</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>

            <p style="margin-top: 1.2em;"><strong>Ne feledd a kedvezményt!</strong> Ha a teljes tanfolyami díjat egy összegben fizeted be, 10.000 Ft kedvezményben részesülsz.</p>

            <p style="margin-top: 1.2em;"><strong>Hogyan tovább a fizetés után?</strong></p>
            <p style="margin-bottom: 1.2em;"><strong>A befizetésed feldgozása után</strong> az e-Titán rendszer automatikusan kiküldi a részedre a regisztrációs e-mailt, amellyel hozzáférhetsz az online elméleti (KRESZ) tananyaghoz.</p>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><strong>Személyes fizetés</strong> esetén erre általában pár órán belül sor kerül.</li>
                <li><strong>Banki átutalásnál</strong> az aktiválás a beérkezést követő 24 órán belül (munkanapokon) történik meg.</li>
            </ul>

            <p style="margin-top: 1.2em;"><strong>Röviddel ezután</strong> tőlünk is kapsz majd egy részletes tájékoztató e-mailt a tanfolyam további menetéről és a következő lépésekről.</p>
            <p style="margin-top: 1.2em;">Ha bármi kérdésed van a fentiekkel kapcsolatban, írj bátran!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `
});

// Sablon ID: E-2
// 2. Enrolled Student Information
exports.enrolledConfirmation = (studentData) => ({
    subject: 'Fontos információk a KRESZ-tanfolyamodról!',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Örülünk, hogy nálunk kezdted meg a KRESZ-vizsgára való felkészülést!</p>
            <p>Ebben az e-mailben minden fontos tudnivalót összegyűjtöttünk, amelyek segítenek abban, hogy a tanulásod gördülékeny és sikeres legyen. <strong>Kérünk, őrizd meg ezt a levelet, akár a kedvencek közé mentve, akár kinyomtatva – a tanfolyam során bármikor szükséged lehet rá!</strong></p>
            
            <h3 style="margin-top: 1.5em; margin-bottom: 1em;">1. E-learning tananyag (e-Titán rendszer)</h3>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><strong>Regisztrációs e-mail:</strong> Hamarosan kapni fogsz egy külön e-mailt közvetlenül az <strong>e-Titán rendszerétől</strong> (feladó: noreply@e-titan.hu), amely a belépéshez szükséges linket és adatokat tartalmazza. Ha pár órán belül nem érkezik meg, kérjük, ellenőrizd a spam/promóciók mappát is!</li>
                <li><strong>Aktiválási határidő:</strong> A regisztrációs e-mail megérkezésétől számítva <strong>90 napod van aktiválni a hozzáférésedet</strong> és elkezdeni a tananyagot. Ha ezt elmulasztod, a regisztrációd lejár, és csak díj ellenében tudunk újat biztosítani.</li>
                <li><strong>Hozzáférési idő és hosszabbítás:</strong> Az alap hozzáférésed a tananyaghoz <strong>180 napig és 75 óráig</strong> érvényes. Tapasztalataink szerint napi 1 óra gyakorlással 4–5 hét alatt kényelmesen elvégezhető.
                    <ul style="list-style-type: circle; padding-left: 20px; margin-top: 0.5em;">
                        <li>Ha az időkereted lejárna, egy alkalommal díjmentesen meg tudjuk hosszabbítani a hozzáférésedet <strong>további 10 órával és 30 nappal</strong>.</li>
                        <li>Ezt követően, a jogszabályi határidőkön belül, további hosszabbítás is lehetséges <strong>10 000 Ft díj ellenében</strong>. Hosszabbítási igényedet e-mailben jelezd felénk!</li>
                    </ul>
                </li>
                <li><strong>Fontos jogszabályi határidők:</strong>
                    <ul style="list-style-type: circle; padding-left: 20px; margin-top: 0.5em;">
                        <li>A tanfolyam megkezdésétől számítva <strong>9 hónapon belül</strong> KRESZ-vizsgát kell tenned.</li>
                        <li>A tanfolyam megkezdésétől számítva <strong>12 hónapon belül</strong> sikeres KRESZ-vizsgát kell tenned.</li>
                        <li>Amennyiben ezekből a jogszabályi határidőkből kifutsz, akkor már sajnos nincs lehetőség folytatni az aktuális képzésedet. Ebben az esetben csak az újrakezdésre van lehetőség. Ennek részleteiről emailben tudsz érdeklődni.</li>
                    </ul>
                </li>
            </ul>

            <h3 style="margin-top: 1.5em; margin-bottom: 1em;">2. Orvosi alkalmassági igazolás</h3>
            <p>A KRESZ-vizsgára jelentkezés alapfeltétele az érvényes orvosi alkalmassági vélemény.</p>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li>Ezt a <strong>háziorvosod</strong> állítja ki (1. csoportú, nem hivatásos jogosítványhoz).</li>
                <li>Ha megvan, kérjük, <strong>olvashatóan fotózd le vagy szkenneld be és küldd el nekünk e-mailben!</strong></li>
                <li>Lehetőséged van arra is, hogy a vizsgálaton iskolánknál vegyél részt. Ennek pontos részleteiről, emailben tudsz tájékoztatást kérni.</li>
            </ul>

            <h3 style="margin-top: 1.5em; margin-bottom: 1em;">3. Tantermi órák és konzultáció (Nem kötelező, de ajánlott!)</h3>
            <p>A még sikeresebb vizsgafelkészülés érdekében lehetőséget biztosítunk tantermi képzéseinken való részvételre.</p>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><strong>Tantermi órák:</strong> Ezeken korlátlan számban vehetsz részt! Minden páros héten tartunk délelőtti és délutáni foglalkozásokat is, hogy biztosan megtaláld a neked megfelelőt.</li>
                <li><strong>Szombati konzultáció:</strong> Ha már végigértél az elméleti anyagon (akár online, akár tanteremben), gyere el 3-4 hetente, szombatonként tartott konzultációnkra! Itt átbeszéljük a legtrükkösebb kérdéseket, és mindenre felkészülünk a sikeres vizsga érdekében.</li>
            </ul>
            <p><strong>Fontos!</strong> Az órákon és a konzultáción való részvételhez minden esetben online időpontfoglalás szükséges.</p>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><strong>Jelentkezés, további információk:</strong> <a href="https://moszat.hu/idopont" target="_blank" style="color: #4f46e5; text-decoration: underline;">https://moszat.hu/idopont</a></li>
            </ul>

            <h3 style="margin-top: 1.5em; margin-bottom: 1em;">4. A KRESZ-vizsgára jelentkezés menete</h3>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><strong>Feltételek:</strong> Kizárólag akkor tudunk számodra vizsgaidőpontot igényelni, ha mindkét feltétel teljesült:
                    <ol style="list-style-type: decimal; padding-left: 20px; margin-top: 0.5em;">
                        <li>Az <strong>e-Titán e-learning tananyagot 100%-osan elvégezted</strong>.</li>
                        <li>Az <strong>érvényes orvosi alkalmassági véleményedet elküldted</strong> nekünk.</li>
                    </ol>
                </li>
                <li><strong>Jelentkezés a vizsgára:</strong> Amint végeztél a tananyaggal, a rendszer küldeni fog egy <strong>"E2 – E-learning képzés-igazolás kiállítása"</strong> tárgyú e-mailt. Ha ezt megkaptad (és az orvosid is rendben van), <strong>kérjük, írj nekünk egy e-mailt</strong>, hogy szeretnél KRESZ-vizsgára jelentkezni! Az igazolást nem kell csatolnod, mi látni fogjuk a rendszerünkben.</li>
                <li><strong>Vizsgaidőpont:</strong> A városban egyetlen Vizsgaközpont működik, így a vizsga pontos időpontját <strong>nem te választod, hanem a központ jelöli ki</strong>. Mi a kérelmed után egyeztetjük ezt, és e-mailben értesítünk a részletekről. Általában a jelentkezéstől számított <strong>2–4 héten belül</strong> esedékes a vizsga.</li>
                <li><strong>Módosítás, lemondás:</strong> Ha a kapott időpont mégsem megfelelő, azt legkésőbb a <strong>vizsga előtt 8 nappal</strong> tudod jelezni felénk, és csak később időpontra tudjuk módosítani. Ezen belüli lemondás esetén a vizsgalehetőség és a befizett vizsgadíj elvész.</li>
            </ul>

            <h3 style="margin-top: 1.5em; margin-bottom: 1em;">5. Elsősegély-vizsga</h3>
            <p>A jogosítványod igényléséhez szükséged lesz egy sikeres <strong>Elsősegélynyújtó vizsgára</strong>.</p>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li>Ez nem feltétele a KRESZ-vizsgának vagy a vezetés megkezdésének, sőt a forgalmi vizsgának sem, de a jogosítvány kiállításához kötelező.</li>
                <li>Az e-Titán rendszerben találsz hozzá felkészítő segédanyagot is.</li>
                <li>Ha az online anyag mellett személyes segítségre is szükséged van, külön díjért tantermi felkészítőt is biztosítunk. A részletekért keress minket e-mailben!</li>
            </ul>

            <h3 style="margin-top: 1.5em; margin-bottom: 1em;">6. Kapcsolat és elérhetőségek</h3>
            <p>Kérjük, hogy kérdéseiddel és kéréseiddel <strong>elsősorban e-mailben fordulj hozzánk</strong>. Ez teszi lehetővé számunkra a hatékony ügyintézést és a kérések pontos nyomon követését.</p>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><strong>Irodánk címe:</strong> 1088 Budapest, Krúdy u. 16-18. fszt. 3.</li>
                <li><strong>Nyitvatartás:</strong> H: 9-17:45, K: 12:30-17, Sze: 11-17, Cs: 12:30-17, P: 11-15</li>
                <li><strong>E-mail:</strong> iroda@mosolyzona.hu</li>
                <li><strong>Telefonszám:</strong> +36 1 333 3323</li>
                <li><strong>Minden egyéb információ:</strong> www.moszat.hu</li>
            </ul>

            <p style="margin-top: 1.5em;">Sok sikert kívánunk a tanuláshoz és a vizsgákhoz! Mi itt vagyunk, ha segítségre van szükséged – bátran keress minket!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `
});

// Sablon ID: E-3
// 3. Course Completed - Medical Needed
exports.courseCompletedMedicalNeeded = (studentData) => {
    const under18WarningHtml = isUnder18(studentData.birthDate)
        ? `<p>⚠️ <b>Figyelem, ha még nem múltál el 18!</b> A jelentkezési lapot egy szülődnek vagy gondviselődnek is alá kell írnia, ezért kérjük, hogy <b>ő is jöjjön veled!</b> Enélkül sajnos nem tudjuk elfogadni a jelentkezésed.</p>`
        : '';

    return {
        subject: 'Következő lépések a KRESZ-vizsgád felé',
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Gratulálunk az e-learning tanfolyam sikeres elvégzéséhez! Már csak néhány lépés választ el attól, hogy jelentkezhess a KRESZ-vizsgára. Segítünk, hogy minden simán menjen!</p>
            <p>Kérjük, kövesd az alábbi <b>két egyszerű lépést</b> a megadott sorrendben:</p>
            <p><b>1. LÉPÉS: Orvosi alkalmassági elküldése</b></p>
            <p>A vizsgára jelentkezéshez elengedhetetlen az érvényes orvosi alkalmassági véleményed.</p>
            <ul>
                <li><p><b>Mi a teendő?</b> Készíts egy jól látható (olvasható) fotót vagy szkenneld be a dokumentumot.</p></li>
                <li><p><b>Hova küldd?</b> Egyszerűen válaszolj erre az e-mailre, és csatold a fájlt.</p></li>
            </ul>
            <p><b>Fontos:</b> Kérjük, ezt tedd meg a lehető leghamarabb, mert csak ezután tudsz továbblépni a 2. lépésre.</p>
            <p><b>Nincs háziorvosod?</b> Ebben az esetben is tudunk segítséget nyújtani. Kérjük, jelezd felénk válasz e-mailben, ha szeretnél tájékoztatást kapni a részleteiről.</p>
            <p><b>2. LÉPÉS: Személyes ügyintézés az irodában</b></p>
            <p>Miután e-mailben elküldted nekünk az orvosi alkalmasságit, a következő teendőd, hogy személyesen gyere be hozzánk aláírni a jelentkezési lapot.</p>
            <ul>
                <li><p><b>Mikor gyere?</b> Bármikor nyitvatartási időben:</p>
                    <ul>
                        <li><b>Hétfő:</b> 9:00 – 17:45</li>
                        <li><b>Kedd:</b> 12:30 – 17:00</li>
                        <li><b>Szerda:</b> 11:00 – 17:00</li>
                        <li><b>Csütörtök:</b> 12:30 – 17:00</li>
                        <li><b>Péntek:</b> 11:00 – 15:00</li>
                    </ul>
                </li>
                <li><p><b>Hova gyere?</b></p>
                    <ul>
                        <li><b>Cím:</b> 1088 Budapest, Krúdy u. 16-18. fszt. 3.</li>
                        <li><i>(A Harminckettesek terénél, a 4-6-os villamos megállójától pár percre.)</i></li>
                    </ul>
                </li>
            </ul>
            ${under18WarningHtml}
            <p><b>Hogyan tovább, miután aláírtad a lapot?</b></p>
            <ol>
                <li>Mi eljuttatjuk a jelentkezési adatlapot a vizsgaközponthoz (KAV).</li>
                <li>Ők 1-3 munkanapon belül feldolgozzák.</li>
                <li>Amint ez megtörtént, <b>küldünk egy újabb e-mailt</b>, és utána már telefonon egyeztethetünk is a vizsgaidőpontról</li>
            </ol>
            <p>Ha bármi kérdésed van a fentiekkel kapcsolatban, írj bátran!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><b>Mosolyzóna, a Kreszprofesszor autósiskolája</b></p>
        </div>
        `
    }
};

// Sablon ID: E-4
// 4. Course Completed - Ready to Sign
exports.courseCompletedReadyToSign = (studentData) => {
    const under18WarningHtml = isUnder18(studentData.birthDate)
        ? `<p>⚠️ <strong>Figyelem, ha még nem múltál el 18!</strong> A jelentkezési lapot egy szülődnek vagy gondviselődnek is alá kell írnia, ezért kérjük, hogy <strong>ő is jöjjön veled!</strong> Enélkül sajnos nem tudjuk elfogadni a jelentkezésed.</p>`
        : '';

    return {
        subject: 'Következő lépés a KRESZ-vizsgád felé',
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Gratulálunk az e-learning tanfolyam sikeres elvégzéséhez!</p>
            <p>Mivel az orvosi alkalmassági véleményed már megvan, csak egyetlen lépés van hátra, hogy jelentkezhess a KRESZ-vizsgára: a jelentkezési lap aláírása.</p>
            <p><strong>Teendőd: Személyes ügyintézés az irodában</strong></p>
            <p>Kérjük, gyere be hozzánk személyesen az irodába, hogy aláírd a jelentkezési lapot.</p>
            <ul>
                <li><p><strong>Mikor gyere?</strong> Bármikor nyitvatartási időben:</p>
                    <ul>
                        <li><strong>Hétfő:</strong> 9:00 – 17:45</li>
                        <li><strong>Kedd:</strong> 12:30 – 17:00</li>
                        <li><strong>Szerda:</strong> 11:00 – 17:00</li>
                        <li><strong>Csütörtök:</strong> 12:30 – 17:00</li>
                        <li><strong>Péntek:</strong> 11:00 – 15:00</li>
                    </ul>
                </li>
                <li><p><strong>Hova gyere?</strong></p>
                    <ul>
                        <li><strong>Cím:</strong> 1088 Budapest, Krúdy u. 16-18. fszt. 3.</li>
                        <li><em>(A Harminckettesek terénél, a 4-6-os villamos megállójától pár percre.)</em></li>
                    </ul>
                </li>
            </ul>
            ${under18WarningHtml}
            <p><strong>Hogyan tovább, miután aláírtad a lapot?</strong></p>
            <ol>
                <li><p>Mi eljuttatjuk a jelentkezési adatlapot a vizsgaközponthoz (KAV).</p></li>
                <li><p>Ők 1-3 munkanapon belül feldolgozzák.</p></li>
                <li><p>Amint ez megtörtént, <strong>küldünk egy újabb e-mailt</strong>, és utána már telefonon egyeztethetünk is a vizsgaidőpontról</p></li>
            </ol>
            <p>Ha bármi kérdésed van a fentiekkel kapcsolatban, írj bátran!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><b>Mosolyzóna, a Kreszprofesszor autósiskolája</b></p>
        </div>
        `
    }
};

// Sablon ID: E-5
// 5. Medical Certificate Received
exports.medicalCertificateReceived = (studentData) => ({
    subject: 'Orvosi alkalmassági vélemény rögzítve',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Értesítünk, hogy az orvosi alkalmassági vélemény feltöltésre került a vizsgáztató szerv elektronikus nyilvántartó rendszerébe (KVAR).</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><b>Mosolyzóna, a Kreszprofesszor autósiskolája</b></p>
        </div>
    `
});


// --- IDŐZÍTETT SABLONOK ---

// Sablon ID: T-1
// Jelentkezés utáni 4. nap
exports.paymentReminderDay4 = (studentData) => ({
    subject: 'Emlékeztető a befejezetlen regisztrációdról',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Ez egy emlékeztető a pár nappal ezelőtt megkezdett beiratkozásodról. A folyamat véglegesítéséhez már csak a tandíj befizetése van hátra, melyhez továbbra is felhasználhatod az 5000 Ft értékű kedvezményedet.</p>
            <p>Amennyiben nem találod a korábbi, részleteket tartalmazó e-mailünket, kérjük, jelezd nekünk egy válaszlevélben, és örömmel elküldjük újra a szükséges információkat.</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `
});

// Sablon ID: T-2
// Jelentkezés utáni 10. nap
exports.paymentReminderDay10 = (studentData) => ({
    subject: 'Fontos: a regisztrációddal kapcsolatban',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>A 10 nappal ezelőtti online regisztrációddal kapcsolatban írunk.</p>
            <p>Szeretnénk emlékeztetni, hogy a beiratkozásod véglegesítéséhez már csak a tandíj befizetése van hátra, melyhez továbbra is felhasználhatod az 5000 Ft értékű kedvezményedet.</p>
            <p>Kérjük, vedd figyelembe, hogy amennyiben pár napon belül nem kapunk visszajelzést tőled, ezt tekintjük az utolsó értesítésünknek, és adatvédelmi irányelveinknek megfelelően töröljük a befejezetlen regisztrációdat a rendszerünkből.</p>
            <p>Ha a fizetési információkat tartalmazó korábbi e-mailünket nem találod, jelezd nekünk egy válasszal, és örömmel elküldjük újra.</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `
});


// --- MÓDOSÍTOTT IDŐZÍTETT SABLONOK ---

// Sablon ID: T-3
// Tanfolyamkezdési emlékeztetők (30 nap)
exports.courseStartReminderDay30 = (studentData) => ({
    subject: 'Emlékeztető: Aktiváld a KRESZ-hozzáférésedet!',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Látjuk a rendszerünkben, hogy bár már 30 napja beiratkoztál hozzánk, még nem nyitottad meg az online KRESZ-tananyagot.</p>
            <p><strong>Fontos:</strong> Az e-learning regisztráció önmagában nem elég! Ahhoz, hogy hivatalosan is elinduljon a tanfolyam, legalább egyszer meg kell nyitnod a tananyagot.</p>
            <p>Kérünk, hogy ezt tedd meg minél hamarabb!</p>
            <p>Ha ezzel kapcsolatban technikai problémába ütköztél, vagy egyszerűen csak kérdésed van, kérjük, jelezd nekünk egy válasz e-mailben, és örömmel segítünk!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `
});

// Sablon ID: T-4
// Tanfolyamkezdési emlékeztetők (60 nap)
exports.courseStartReminderDay60 = (studentData) => ({
    subject: 'Figyelmeztetés: a regisztrációd 30 napon belül lejár!',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Sajnos még mindig azt látjuk a rendszerünkben, hogy nem kezdted el az e-learning tanfolyamot, pedig már 60 napja beiratkoztál.</p>
            <p>Szeretnénk megbizonyosdni róla, hogy minden rendben van-e. Gyakori hiba, hogy a tanulók csak belépnek a felületre, de nem indítják el ténylegesen a tananyagot. Kérünk, ellenőrizd, hogy ez nálad megtörtént-e!</p>
            <p><strong>A tanfolyam elindítására 30 napod maradt.</strong></p>
            <p>Ha ezzel kapcsolatban technikai problémába ütköztél, vagy egyszerűen csak kérdésed van, kérjük, jelezd nekünk egy válasz e-mailben, és örömmel segítünk!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `
});

// Sablon ID: T-5
// Tanfolyamkezdési emlékeztetők (85 nap)
exports.courseStartReminderDay85 = (studentData) => ({
    subject: 'Fontos! Már csak 5 napod maradt elkezdeni a KRESZ tanfolyamot!',
    html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
            <p>Látjuk, hogy már csak 5 napod van elkezdeni az online KRESZ tanfolyamodat.</p>
            <p>Szeretnénk egyértelművé tenni a következőt: <strong>már csak 5 napod van elindítani a tananyagot.</strong> Bizonyosodj meg róla, hogy a tananyagot magát nyitod meg, nem csak belépsz az oldalra.</p>
            <p><strong>Ne feledd</strong>, a határidő lejárta után a folytatás csak egy új, <strong>30 000 Ft-os regisztrációval lehetséges.</strong></p>
            <p>Ha ezzel kapcsolatban technikai problémába ütköztél, írj egy választ erre az e-mailre, és azonnal segítünk. Ne várd meg az utolsó pillanatot!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `
});

// Sablon ID: T-6
// E-learning haladási emlékeztetők (90 nap)
exports.elearningProgressReminderDay90 = (studentData) => {
    const medicalReminderHtml = !studentData.hasMedicalCertificate
        ? `<p>A sikeres felkészülés mellett fontos, hogy a vizsgára jelentkezésnek se legyen akadálya. Ehhez szeretnénk felhívni a figyelmedet, hogy a <strong>KRESZ vizsga foglalásának két feltétele van:</strong> az online tanfolyam elvégzése és egy érvényes <strong>orvosi alkalmassági vélemény.</strong></p>
            <ul style="list-style-type: disc; padding-left: 20px;">
                <li><strong>Már megszerezted az orvosi igazolást?</strong> Kérjük, küldd el nekünk a <a href="mailto:iroda@mosolyzona.hu">iroda@mosolyzona.hu</a> címre, hogy rögzíthessük.</li>
                <li><strong>Ha még nincs orvosi alkalmassági véleményed,</strong> semmi gond! Írj nekünk egy e-mailt, és örömmel elküldjük a tudnivalókat, hogy hogyan tudod a legegyszerűbben beszerezni.</li>
            </ul>`
        : '';

    return {
        subject: 'Fontos információk az e-learninges KRESZ tanfolyamodhoz',
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
                <p>Ez egy emlékeztető, hogy 3 hónapja kezdted el az online KRESZ tanfolyamot, ezért egy rövid helyzetjelentéssel és néhány fontos információval szeretnénk segíteni a haladásodat.</p>
                <p>Szeretnénk, ha tudnád, hogy nem vagy egyedül a felkészülésben. Ha esetleg egy vagy több témát szívesen hallgatnál meg élőben is, bármikor csatlakozhatsz <strong>tantermi óráinkhoz vagy személyes konzultációinkhoz.</strong></p>
                <p>A pontos időpontokat és a további részleteket a következő linken találod: <a href="https://moszat.hu/idopont" target="_blank" style="color: #4f46e5; text-decoration: underline;">https://moszat.hu/idopont</a></p>
                ${medicalReminderHtml}
                <p>Kérdés esetén ne habozz keresni minket! Sikeres tanulást kívánunk!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `
    };
};

// Sablon ID: T-7
// E-learning haladási emlékeztetők (180 nap)
exports.elearningProgressReminderDay180 = (studentData) => {
    const medicalReminderHtml = !studentData.hasMedicalCertificate
        ? `<p>Végül, de nem utolsósorban, szeretnénk emlékeztetni <strong>a vizsgára jelentkezés másik fontos feltételére, az orvosi alkalmassági véleményre.</strong><br>A már meglévő orvosi igazolásodat kérjük, küldd el a <strong><a href="mailto:iroda@mosolyzona.hu" target="_blank">iroda@mosolyzona.hu</a></strong> címre, hogy rögzíteni tudjuk. Annak hiányában pedig írj nekünk egy e-mailt, és örömmel elküldjük a beszerzéséhez szükséges tudnivalókat.</p>`
        : '';

    return {
        subject: 'Fontos tájékoztatás a KRESZ vizsgád határidejéről és teendőidről',
        html: `
            <div dir="ltr" style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves ${getFullName(studentData)}!</strong></p>
                <p>Egy fontos határidőre szeretnénk emlékeztetni a KRESZ tanfolyamoddal kapcsolatban.</p>
                <p>A jogszabályok értelmében a tanfolyam megkezdésétől számítva 9 hónapod van, hogy részt vegyél egy KRESZ vizsgán. A te esetedben ebből <strong>már csak 3 hónap van hátra.</strong></p>
                <p>A KRESZ vizsgára való felkészüléshez elengedhetetlen a tananyaghoz való hozzáférés.<br>Amennyiben a hozzáférési időd időközben lejárt, kérjük, jelezd felénk e-mailben. A tandíjad ugyanis tartalmaz egy egyszeri, díjmentes hosszabbítást, <strong>ami plusz 30 napot és 10 óra gyakorlási időt biztosít a számodra.</strong></p>
                ${medicalReminderHtml}
                <p>Ha a határidőkkel vagy a képzéssel kapcsolatban bármilyen kérdésed van, válasz e-mailben keress minket!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `
    };
};
