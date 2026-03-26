const DEFAULT_TEMPLATES = {
    registrationConfirmation: {
        id: 'registrationConfirmation',
        name: 'Sikeres jelentkezés (E-1)', category: 'Beiratkozás és Tanfolyam',
        subject: `Sikeres jelentkezés! Már csak egy lépés van hátra`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
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
    `,
        enabled: true
    },
    enrolledConfirmation: {
        id: 'enrolledConfirmation',
        name: 'Beiratkozás visszaigazolása (E-2)', category: 'Beiratkozás és Tanfolyam',
        subject: `Fontos információk a KRESZ-tanfolyamodról!`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
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
            <p><strong>Fontos!</strong> Az órákon és a konzultáción való részvételhez minden esetben előzetes egyeztetés szükséges.</p>

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
    `,
        enabled: true
    },
    courseCompletedMedicalNeeded: {
        id: 'courseCompletedMedicalNeeded',
        name: 'Tanfolyam elvégezve - Orvosi hiányzik (E-3)', category: 'Beiratkozás és Tanfolyam',
        subject: `Következő lépések a KRESZ-vizsgád felé`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
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
            
            <p><b>Hogyan tovább, miután aláírtad a lapot?</b></p>
            <ol>
                <li>Mi eljuttatjuk a jelentkezési adatlapot a vizsgaközponthoz (KAV).</li>
                <li>Ők 1-3 munkanapon belül feldolgozzák.</li>
                <li>Amint ez megtörtént, <b>küldünk egy újabb e-mailt</b>, és utána már telefonon egyeztethetünk is a vizsgaidőpontról</li>
            </ol>
            <p>Ha bármi kérdésed van a fentiekkel kapcsolatban, írj bátran!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><b>Mosolyzóna, a Kreszprofesszor autósiskolája</b></p>
        </div>
        `,
        enabled: true
    },
    courseReminder1Day: {
        id: 'courseReminder1Day',
        name: 'Időpont emlékeztető 1 nap (T-9)', category: 'Emlékeztetők',
        subject: `Holnap találkozunk! Emlékeztető a KRESZ foglalkozásról`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Szeretnénk emlékeztetni, hogy holnap várunk a következő foglalkozásra:</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Kérjük, hogy pontosan érkezz!</p>
                <p>Kérjük, ha váratlanul közbejött valami, és mégsem tudsz részt venni, az alábbi gombra kattintva haladéktalanul mondd le az időpontot!</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    courseCompletedReadyToSign: {
        id: 'courseCompletedReadyToSign',
        name: 'Tanfolyam elvégezve - Aláírásra kész (E-4)', category: 'Beiratkozás és Tanfolyam',
        subject: `Következő lépés a KRESZ-vizsgád felé`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
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
            
            <p><strong>Hogyan tovább, miután aláírtad a lapot?</strong></p>
            <ol>
                <li><p>Mi eljuttatjuk a jelentkezési adatlapot a vizsgaközponthoz (KAV).</p></li>
                <li><p>Ők 1-3 munkanapon belül feldolgozzák.</p></li>
                <li><p>Amint ez megtörtént, <strong>küldünk egy újabb e-mailt</strong>, és utána már telefonon egyeztethetünk is a vizsgaidőpontról</p></li>
            </ol>
            <p>Ha bármi kérdésed van a fentiekkel kapcsolatban, írj bátran!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><b>Mosolyzóna, a Kreszprofesszor autósiskolája</b></p>
        </div>
        `,
        enabled: true
    },
    medicalCertificateReceived: {
        id: 'medicalCertificateReceived',
        name: 'Orvosi alkalmassági rögzítve (E-5)', category: 'Beiratkozás és Tanfolyam',
        subject: `Orvosi alkalmassági vélemény rögzítve`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
            <p>Értesítünk, hogy az orvosi alkalmassági vélemény feltöltésre került a vizsgáztató szerv elektronikus nyilvántartó rendszerébe (KVAR).</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><b>Mosolyzóna, a Kreszprofesszor autósiskolája</b></p>
        </div>
    `,
        enabled: true
    },
    paymentReminderDay4: {
        id: 'paymentReminderDay4',
        name: 'Fizetési emlékeztető 4. nap (T-1)', category: 'Emlékeztetők',
        subject: `Emlékeztető a befejezetlen regisztrációdról`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
            <p>Ez egy emlékeztető a pár nappal ezelőtt megkezdett beiratkozásodról. A folyamat véglegesítéséhez már csak a tandíj befizetése van hátra, melyhez továbbra is felhasználhatod az 5000 Ft értékű kedvezményedet.</p>
            <p>Amennyiben nem találod a korábbi, részleteket tartalmazó e-mailünket, kérjük, jelezd nekünk egy válaszlevélben, és örömmel elküldjük újra a szükséges információkat.</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `,
        enabled: true
    },
    paymentReminderDay10: {
        id: 'paymentReminderDay10',
        name: 'Fizetési emlékeztető 10. nap (T-2)', category: 'Emlékeztetők',
        subject: `Fontos: a regisztrációddal kapcsolatban`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
            <p>A 10 nappal ezelőtti online regisztrációddal kapcsolatban írunk.</p>
            <p>Szeretnénk emlékeztetni, hogy a beiratkozásod véglegesítéséhez már csak a tandíj befizetése van hátra, melyhez továbbra is felhasználhatod az 5000 Ft értékű kedvezményedet.</p>
            <p>Kérjük, vedd figyelembe, hogy amennyiben pár napon belül nem kapunk visszajelzést tőled, ezt tekintjük az utolsó értesítésünknek, és adatvédelmi irányelveinknek megfelelően töröljük a befejezetlen regisztrációdat a rendszerünkből.</p>
            <p>Ha a fizetési információkat tartalmazó korábbi e-mailünket nem találod, jelezd nekünk egy válasszal, és örömmel elküldjük újra.</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `,
        enabled: true
    },
    courseStartReminderDay30: {
        id: 'courseStartReminderDay30',
        name: 'Tanfolyamkezdési emlékeztető 30. nap (T-3)', category: 'Emlékeztetők',
        subject: `Emlékeztető: Aktiváld a KRESZ-hozzáférésedet!`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
            <p>Látjuk a rendszerünkben, hogy bár már 30 napja beiratkoztál hozzánk, még nem nyitottad meg az online KRESZ-tananyagot.</p>
            <p><strong>Fontos:</strong> Az e-learning regisztráció önmagában nem elég! Ahhoz, hogy hivatalosan is elinduljon a tanfolyam, legalább egyszer meg kell nyitnod a tananyagot.</p>
            <p>Kérünk, hogy ezt tedd meg minél hamarabb!</p>
            <p>Ha ezzel kapcsolatban technikai problémába ütköztél, vagy egyszerűen csak kérdésed van, kérjük, jelezd nekünk egy válasz e-mailben, és örömmel segítünk!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `,
        enabled: true
    },
    courseStartReminderDay60: {
        id: 'courseStartReminderDay60',
        name: 'Tanfolyamkezdési emlékeztető 60. nap (T-4)', category: 'Emlékeztetők',
        subject: `Figyelmeztetés: a regisztrációd 30 napon belül lejár!`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
            <p>Sajnos még mindig azt látjuk a rendszerünkben, hogy nem kezdted el az e-learning tanfolyamot, pedig már 60 napja beiratkoztál.</p>
            <p>Szeretnénk megbizonyosdni róla, hogy minden rendben van-e. Gyakori hiba, hogy a tanulók csak belépnek a felületre, de nem indítják el ténylegesen a tananyagot. Kérünk, ellenőrizd, hogy ez nálad megtörtént-e!</p>
            <p><strong>A tanfolyam elindítására 30 napod maradt.</strong></p>
            <p>Ha ezzel kapcsolatban technikai problémába ütköztél, vagy egyszerűen csak kérdésed van, kérjük, jelezd nekünk egy válasz e-mailben, és örömmel segítünk!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `,
        enabled: true
    },
    courseStartReminderDay85: {
        id: 'courseStartReminderDay85',
        name: 'Tanfolyamkezdési emlékeztető 85. nap (T-5)', category: 'Emlékeztetők',
        subject: `Fontos! Már csak 5 napod maradt elkezdeni a KRESZ tanfolyamot!`,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
            <p>Látjuk, hogy már csak 5 napod van elkezdeni az online KRESZ tanfolyamodat.</p>
            <p>Szeretnénk egyértelművé tenni a következőt: <strong>már csak 5 napod van elindítani a tananyagot.</strong> Bizonyosodj meg róla, hogy a tananyagot magát nyitod meg, nem csak belépsz az oldalra.</p>
            <p><strong>Ne feledd</strong>, a határidő lejárta után a folytatás csak egy új, <strong>30 000 Ft-os regisztrációval lehetséges.</strong></p>
            <p>Ha ezzel kapcsolatban technikai problémába ütköztél, írj egy választ erre az e-mailre, és azonnal segítünk. Ne várd meg az utolsó pillanatot!</p>
            <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
        </div>
    `,
        enabled: true
    },
    elearningProgressReminderDay90: {
        id: 'elearningProgressReminderDay90',
        name: 'E-learning haladási emlékeztető 90. nap (T-6)', category: 'Emlékeztetők',
        subject: `Fontos információk az e-learninges KRESZ tanfolyamodhoz`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
                <p>Ez egy emlékeztető, hogy 3 hónapja kezdted el az online KRESZ tanfolyamot, ezért egy rövid helyzetjelentéssel és néhány fontos információval szeretnénk segíteni a haladásodat.</p>
                <p>Szeretnénk, ha tudnád, hogy nem vagy egyedül a felkészülésben. Ha esetleg egy vagy több témát szívesen hallgatnál meg élőben is, bármikor csatlakozhatsz <strong>tantermi óráinkhoz vagy személyes konzultációinkhoz.</strong> Ehhez kérjük, keress minket elérhetőségeinken!</p>
                
                <p>Kérdés esetén ne habozz keresni minket! Sikeres tanulást kívánunk!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    bookingConfirmation: {
        id: 'bookingConfirmation',
        name: 'Időpontfoglalás visszaigazolása', category: 'Időpontfoglalás',
        subject: `Időpontfoglalás visszaigazolása - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Sikeresen jelentkeztél a következő foglalkozásra:</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Kérjük, hogy pontosan érkezz!</p>
                <p>Amennyiben mégsem tudsz részt venni, kérjük, az alábbi linkre kattintva mondd le a jelentkezésedet, hogy másnak is legyen lehetősége részt venni:</p>
                <p>
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    bookingCancelledByAdmin: {
        id: 'bookingCancelledByAdmin',
        name: 'Jelentkezés törölve (Admin)', category: 'Időpontfoglalás',
        subject: `Jelentkezés törölve - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Tájékoztatunk, hogy a következő foglalkozásra leadott jelentkezésed törlésre került a rendszerünkben:</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Ha úgy gondolod, hogy ez tévedés, kérjük vedd fel velünk a kapcsolatot.</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    bookingCancelledByStudent: {
        id: 'bookingCancelledByStudent',
        name: 'Jelentkezés lemondva (Diák)', category: 'Időpontfoglalás',
        subject: `Időpont lemondva - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Sikeresen lemondtad a jelentkezésedet a következő foglalkozásra:</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Köszönjük, hogy jelezted felénk!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    courseModified: {
        id: 'courseModified',
        name: 'Időpont változás', category: 'Időpontfoglalás',
        subject: `Időpont változás - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Tájékoztatunk, hogy az alábbi foglalkozásod, amire jelentkeztél, <strong>megváltozott:</strong></p>
                
                <div style="margin-bottom: 1.5em; padding: 1em; background-color: #f9f9f9; border-left: 4px solid #666;">
                    <p style="margin: 0 0 0.5em 0;"><strong>Régi adatok:</strong></p>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        <li>Foglalkozás: {{oldCourseName}}</li>
                        <li>Időpont: {{oldCourseDate}} ({{oldStartTime}} - {{oldEndTime}})</li>
                    </ul>
                </div>

                <div style="margin-bottom: 2em; padding: 1em; background-color: #eef2ff; border-left: 4px solid #4f46e5;">
                    <p style="margin: 0 0 0.5em 0;"><strong>Új adatok:</strong></p>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li><strong>Foglalkozás:</strong> {{newCourseName}}</li>
                        <li><strong>Időpont:</strong> {{newCourseDate}} ({{newStartTime}} - {{newEndTime}})</li>
                    </ul>
                </div>

                <p>A jelentkezésed automatikusan átkerült az új időpontra, nincs további teendőd.</p>
                <p>Amennyiben az új időpont nem megfelelő számodra, kérjük, az alábbi linkre kattintva mondd le a jelentkezésedet:</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    courseDeleted: {
        id: 'courseDeleted',
        name: 'Foglalkozás elmarad', category: 'Időpontfoglalás',
        subject: `Foglalkozás elmarad - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Sajnálattal tájékoztatunk, hogy a következő foglalkozás, amelyre jelentkeztél, váratlan okok miatt <strong>elmarad:</strong></p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Eredeti időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Kérjük, foglalj egy új időpontot az aktuálisan meghirdetett foglalkozásaink közül.</p>
                <p>Elnézést kérünk az esetleges kellemetlenségekért!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    elearningProgressReminderDay180: {
        id: 'elearningProgressReminderDay180',
        name: 'E-learning haladási emlékeztető 180. nap (T-7)', category: 'Emlékeztetők',
        subject: `Fontos tájékoztatás a KRESZ vizsgád határidejéről és teendőidről`,
        html: `
            <div dir="ltr" style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{lastName}} {{firstName}} {{secondName}}!</strong></p>
                <p>Egy fontos határidőre szeretnénk emlékeztetni a KRESZ tanfolyamoddal kapcsolatban.</p>
                <p>A jogszabályok értelmében a tanfolyam megkezdésétől számítva 9 hónapod van, hogy részt vegyél egy KRESZ vizsgán. A te esetedben ebből <strong>már csak 3 hónap van hátra.</strong></p>
                <p>A KRESZ vizsgára való felkészüléshez elengedhetetlen a tananyaghoz való hozzáférés.<br>Amennyiben a hozzáférési időd időközben lejárt, kérjük, jelezd felénk e-mailben. A tandíjad ugyanis tartalmaz egy egyszeri, díjmentes hosszabbítást, <strong>ami plusz 30 napot és 10 óra gyakorlási időt biztosít a számodra.</strong></p>
                
                <p>Ha a határidőkkel vagy a képzéssel kapcsolatban bármilyen kérdésed van, válasz e-mailben keress minket!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    courseReminder3Days: {
        id: 'courseReminder3Days',
        name: 'Időpont emlékeztető 3 nap (T-8)', category: 'Emlékeztetők',
        subject: `Emlékeztető a közelgő KRESZ foglalkozásról`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Szeretnénk emlékeztetni, hogy 3 nap múlva várunk a következő foglalkozásra:</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Kérjük, hogy pontosan érkezz!</p>
                <p><strong>FONTOS KÉRÉS:</strong> Ha időközben közbejött valami, és mégsem tudsz részt venni, kérjük, az alábbi gombra kattintva mielőbb mondd le az időpontot! Ezzel esélyt adsz a várólistán lévő tanulóknak, hogy bejussanak a helyedre.</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    waitlistPromoted: {
        id: 'waitlistPromoted',
        name: 'Várólista: Automatikus bekerülés', category: 'Időpontfoglalás',
        subject: `Jó hír! Bekerültél a foglalkozásra - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Örömmel értesítünk, hogy felszabadult egy hely az alábbi foglalkozáson, és mivel a várólistán voltál, automatikusan be is osztottunk rá!</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Nincs más teendőd, mint pontosan megjelenni a megadott időpontban.</p>
                <p>Ha esetleg már nem aktuális, és mégsem tudsz részt venni, kérjük, az alábbi linkre kattintva mondd le a jelentkezésedet, hogy a várólistán következő tanuló megkaphassa a helyet:</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    waitlistJoined: {
        id: 'waitlistJoined',
        name: 'Várólista: Sikeres feliratkozás', category: 'Időpontfoglalás',
        subject: `Sikeres feliratkozás a várólistára - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Sikeresen feliratkoztál a várólistára az alábbi foglalkozásra:</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Amint felszabadul egy hely, e-mailben fogunk értesíteni a részletekről.</p>
                <p>Amennyiben már nem aktuális, és szeretnél leiratkozni a várólistáról, kérjük, kattints az alábbi gombra:</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Leiratkozás a várólistáról
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    waitlistCourseModified: {
        id: 'waitlistCourseModified',
        name: 'Várólista: Időpont változás', category: 'Időpontfoglalás',
        subject: `Várólistás időpont változás - Mosolyzóna Autósiskola`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Tájékoztatunk, hogy az alábbi foglalkozás időpontja, amire <strong>várólistán vagy</strong>, megváltozott:</p>

                <div style="margin-bottom: 1.5em; padding: 1em; background-color: #f9f9f9; border-left: 4px solid #666;">
                    <p style="margin: 0 0 0.5em 0;"><strong>Régi adatok:</strong></p>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        <li>Foglalkozás: {{oldCourseName}}</li>
                        <li>Időpont: {{oldCourseDate}} ({{oldStartTime}} - {{oldEndTime}})</li>
                    </ul>
                </div>

                <div style="margin-bottom: 2em; padding: 1em; background-color: #eef2ff; border-left: 4px solid #4f46e5;">
                    <p style="margin: 0 0 0.5em 0;"><strong>Új adatok:</strong></p>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li><strong>Foglalkozás:</strong> {{newCourseName}}</li>
                        <li><strong>Időpont:</strong> {{newCourseDate}} ({{newStartTime}} - {{newEndTime}})</li>
                    </ul>
                </div>

                <p>A várólistás jelentkezésed automatikusan érvényben maradt az új időpontra, nincs további teendőd.</p>
                <p>Amennyiben az új időpont már nem megfelelő számodra, kérjük, az alábbi linkre kattintva iratkozz le a várólistáról:</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}"
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Leiratkozás a várólistáról
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    waitlistLastMinuteSpot: {
        id: 'waitlistLastMinuteSpot',
        name: 'Várólista: Last-minute üresedés (<24h)', category: 'Várólista',
        subject: `Utolsó pillanatos szabad hely! (Gyorsasági foglalás)`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Váratlanul felszabadult egy hely a várva várt foglalkozáson, amely kevesebb mint 24 óra múlva kezdődik!</p>
                <ul>
                    <li><strong>Foglalkozás:</strong> {{courseName}}</li>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Mivel az idő rövid, a helyet <strong>gyorsasági alapon lehet lefoglalni</strong>. Aki először kattint a lenti gombra, az kapja meg a helyet.</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lastminute.html?courseId={{courseId}}&email={{encodedEmail}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #5cb85c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Lefoglalom a helyet!
                    </a>
                </p>
                <p>Ha a gombra kattintva azt az üzenetet kapod, hogy a hely betelt, akkor valaki más már gyorsabb volt. Köszönjük a megértésedet!</p>
                <p>Amennyiben már nem aktuális, és szeretnél leiratkozni a várólistáról, kérjük, kattints az alábbi gombra:</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Leiratkozás a várólistáról
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    firstAidConfirmation: {
        id: 'firstAidConfirmation',
        name: 'Elsősegély: Sikeres jelentkezés', category: 'Elsősegély',
        subject: `Sikeres jelentkezés elsősegély tanfolyamra - Mosolyzóna`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Sikeresen regisztráltunk az alábbi elsősegély tanfolyamra:</p>
                <ul>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p><strong>FONTOS: A részvétel feltétele a tanfolyam díjának előzetes rendezése!</strong></p>
                <p>Kérjük, hogy a tanfolyam díját legkésőbb a tanfolyam előtti napig rendezd banki átutalással vagy személyesen az irodánkban. Helyszíni készpénzes fizetésre a tanfolyam napján nincs lehetőség!</p>
                
                <p style="margin-top: 1.2em; margin-bottom: 1.2em;"><strong>Fizetési lehetőségek:</strong></p>
                <ul style="list-style-type: disc; padding-left: 20px;">
                    <li><strong>Banki átutalás:</strong>
                        <ul style="list-style-type: circle; padding-left: 20px;">
                            <li><strong>Kedvezményezett:</strong> Jogsiszoft Kft.</li>
                            <li><strong>Számlaszám:</strong> 12010855-01164374-00100009 (Raiffeisen Bank)</li>
                            <li><strong>Közlemény:</strong> Kérjük, tüntesd fel a nevedet és azt, hogy "Elsősegély"!</li>
                        </ul>
                    </li>
                    <li style="margin-top: 1em;"><strong>Személyesen az irodában:</strong> 1088 Budapest, Krúdy u. 16-18. fszt. 3. (Nyitvatartási időben)</li>
                </ul>

                <p>Amennyiben mégsem tudsz részt venni, kérjük, az alábbi linkre kattintva mondd le a jelentkezésedet!</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    firstAidReminderDay5: {
        id: 'firstAidReminderDay5',
        name: 'Elsősegély Emlékeztető (T-5 nap)', category: 'Elsősegély',
        subject: `Közeleg az elsősegély tanfolyamod!`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>5 nap múlva ({{courseDate}}) várunk az elsősegély tanfolyamra!</p>
                <p>Rendszerünk szerint a tanfolyam díja még nem érkezett be hozzánk. Kérjük, ne felejtsd el rendezni a díjat banki átutalással vagy személyesen az irodánkban legkésőbb a tanfolyam előtti napig.</p>
                <p>Kérjük, vedd figyelembe, hogy a helyszínen az oktatónál nincs lehetőség fizetésre, a díj beérkezése a részvétel feltétele!</p>
                <p>Ha közbejött valami, kérjük mondd le a jelentkezésed:</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    firstAidReminderDay3: {
        id: 'firstAidReminderDay3',
        name: 'Elsősegély Emlékeztető (T-3 nap)', category: 'Elsősegély',
        subject: `Sürgős: Elsősegély tanfolyam fizetési emlékeztető`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>3 nap múlva lesz az elsősegély tanfolyam, amelyre jelentkeztél ({{courseDate}}).</p>
                <p><strong>Fontos figyelmeztetés!</strong> A díj befizetésének hiányában a képzésen nem vehetsz részt. Kérjük, sürgősen pótold a befizetést! Ha átutaltad, kérjük, hozd magaddal a bizonylatot a tanfolyamra.</p>
                <p>Amennyiben már nem aktuális, mindenképpen mondd le a jelentkezést:</p>
                <p style="margin: 1.5em 0;">
                    <a href="https://moszat.hu/beiratkozas/lemondas.html?token={{cancellation_token}}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       Időpont lemondása
                    </a>
                </p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    firstAidReminderDay1: {
        id: 'firstAidReminderDay1',
        name: 'Elsősegély Figyelmeztetés (T-1 nap)', category: 'Elsősegély',
        subject: `Figyelem! Holnapi elsősegély tanfolyam - Hiányzó befizetés`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Figyelem! Mivel a holnapi elsősegély tanfolyam díja a mai napig nem került rögzítésre a rendszerünkben, <strong>a holnapi tanfolyamon sajnos nem áll módunkban fogadni téged.</strong></p>
                <p>Ha a díjat már átutaltad, és csak adminisztrációs hiba történt, kérlek <strong>azonnal vedd fel velünk a kapcsolatot</strong> válasz e-mailben, és hozd magaddal a fizetést igazoló bizonylatot a tanfolyamra!</p>
                <p>Megértésedet köszönjük!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },
    firstAidPaymentReceived: {
        id: 'firstAidPaymentReceived',
        name: 'Elsősegély: Díj beérkezett', category: 'Elsősegély',
        subject: `Sikeres fizetés: Elsősegély tanfolyam`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Örömmel értesítünk, hogy az elsősegély tanfolyam díja sikeresen megérkezett hozzánk, így a helyed <strong>véglegesítve lett.</strong></p>
                <ul>
                    <li><strong>Időpont:</strong> {{courseDate}} ({{startTime}} - {{endTime}})</li>
                </ul>
                <p>Már nincs más teendőd, mint pontosan megjelenni a képzésen.</p>
                <p>Várunk szeretettel!</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna, a Kreszprofesszor autósiskolája</strong></p>
            </div>
        `,
        enabled: true
    },

    // ORVOSI ALKALMASSÁGI VIZSGÁLAT TEMPLATES
    medicalBookingConfirmation: {
        id: 'medicalBookingConfirmation',
        name: 'Orvosi vizsg.: Sikeres foglalás', category: 'Orvosi alkalmassági',
        subject: `Sikeres jelentkezés orvosi alkalmassági vizsgálatra`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Sikeresen jelentkeztél az orvosi alkalmassági vizsgálatra a következő időpontban:</p>
                <p style="margin-left: 1.2em; font-size: 1.1em; color: #e53935;">
                    <strong>Dátum:</strong> {{courseDate}} ({{startTime}} - {{endTime}})<br>
                    <strong>Helyszín:</strong> Irodánk (1088 Budapest, Krúdy u. 16-18. fszt. 3.)
                </p>
                <p style="margin-top: 2em; margin-bottom: 0.5em; color: #d32f2f;"><strong>FONTOS - Mit kell magaddal hoznod a vizsgálatra?</strong></p>
                <ul style="margin-top: 0.5em;">
                    <li><strong>Személyi igazolvány</strong></li>
                    <li><strong>Lakcímkártya</strong></li>
                    <li><strong>TAJ kártya</strong> (ha rendelkezel vele)</li>
                    <li>A vizsgálat díja (Kérjük, pontosan hozd a <strong>KÉSZPÉNZT</strong>. A vizsgálat díja: <strong>xxxx Ft</strong>)</li>
                </ul>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna Autósiskola</strong></p>
            </div>
        `,
        enabled: true
    },
    medicalWaitlistJoined: {
        id: 'medicalWaitlistJoined',
        name: 'Orvosi vizsg.: Várólista feliratkozás', category: 'Orvosi alkalmassági',
        subject: `Feliratkoztál az orvosi alkalmassági vizsgálat várólistájára`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Ez egy automatikus visszaigazolás arról, hogy sikeresen feliratkoztál az alábbi orvosi alkalmassági vizsgálat <strong>VÁRÓLISTÁJÁRA</strong>:</p>
                <p style="margin-left: 1.2em; font-size: 1.1em;">
                    <strong>Dátum:</strong> {{courseDate}} ({{startTime}} - {{endTime}})
                </p>
                <p>Ha üresedés történik, e-mailben fogunk értesíteni. Kérjük, figyeld a postafiókodat!</p>
                <p style="margin-top: 2em; margin-bottom: 0.5em; color: #d32f2f;"><strong>FONTOS - Mit kell magaddal hoznod a vizsgálatra, ha bekerülsz?</strong></p>
                <ul style="margin-top: 0.5em;">
                    <li><strong>Személyi igazolvány</strong></li>
                    <li><strong>Lakcímkártya</strong></li>
                    <li><strong>TAJ kártya</strong> (ha rendelkezel vele)</li>
                    <li>A vizsgálat díja (Kérjük, pontosan hozd a <strong>KÉSZPÉNZT</strong>. A vizsgálat díja: <strong>xxxx Ft</strong>)</li>
                </ul>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna Autósiskola</strong></p>
            </div>
        `,
        enabled: true
    },
    medicalCourseReminder1Day: {
        id: 'medicalCourseReminder1Day',
        name: 'Orvosi vizsg.: Emlékeztető (1 nappal előtte)', category: 'Orvosi alkalmassági',
        subject: `Emlékeztető: Holnap orvosi alkalmassági vizsgálat`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Kedves {{firstName}}!</strong></p>
                <p>Emlékeztetünk, hogy holnap orvosi alkalmassági vizsgálatra várunk az irodánkban.</p>
                <p style="margin-left: 1.2em; font-size: 1.1em; color: #e53935;">
                    <strong>Dátum:</strong> {{courseDate}} ({{startTime}} - {{endTime}})<br>
                    <strong>Helyszín:</strong> Irodánk (1088 Budapest, Krúdy u. 16-18. fszt. 3.)
                </p>
                <p style="margin-top: 2em; margin-bottom: 0.5em; color: #d32f2f;"><strong>FONTOS - Kérjük, ne felejtsd otthon a következőket:</strong></p>
                <ul style="margin-top: 0.5em;">
                    <li><strong>Személyi igazolvány</strong></li>
                    <li><strong>Lakcímkártya</strong></li>
                    <li><strong>TAJ kártya</strong> (ha rendelkezel vele)</li>
                    <li>A vizsgálat díja (Kérjük, pontosan hozd a <strong>KÉSZPÉNZT</strong>. A vizsgálat díja: <strong>xxxx Ft</strong>)</li>
                </ul>
                <p style="margin-top: 2.4em;">Várunk szeretettel:<br><strong>Mosolyzóna Autósiskola</strong></p>
            </div>
        `,
        enabled: true
    },
    doctorMedicalReminder: {
        id: 'doctorMedicalReminder',
        name: 'Orvosnak szóló emlékeztető', category: 'Orvosi alkalmassági',
        subject: `Emlékeztető: Holnapi orvosi alkalmassági vizsgálat`,
        doctorEmail: 'dr.minta@example.com',
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <p style="margin-bottom: 2.4em;"><strong>Tisztelt Doktor Úr / Doktornő!</strong></p>
                <p>Emlékeztetőül küldjük, hogy a holnapi napon orvosi alkalmassági vizsgálat lesz az irodánkban az alábbi időpontban:</p>
                <p style="margin-left: 1.2em; font-size: 1.1em;">
                    <strong>Dátum:</strong> {{courseDate}} ({{startTime}} - {{endTime}})
                </p>
                <p>A diákokat értesítettük, hogy hozzák magukkal a szükséges iratokat és a vizsgálat díját.</p>
                <p style="margin-top: 2.4em;">Üdvözlettel:<br><strong>Mosolyzóna Autósiskola</strong></p>
            </div>
        `,
        enabled: true
    }
};
export default DEFAULT_TEMPLATES;
