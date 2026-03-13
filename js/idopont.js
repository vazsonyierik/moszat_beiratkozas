import { collection, query, where, orderBy, onSnapshot, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";
import { db, functions } from './firebase.js';

// --- TESZT MÓD ELLENŐRZÉSE ---
const urlParams = new URLSearchParams(window.location.search);
const isTestMode = urlParams.get('test') === 'true';

if (isTestMode) {
    document.getElementById('testModeBanner').classList.remove('hidden');
    console.warn("Teszt üzemmód aktív az időpontfoglalóban.");
}

const collectionName = isTestMode ? 'courses_test' : 'courses';
const coursesRef = collection(db, collectionName);

// --- DOM Elemek ---
const coursesContainer = document.getElementById('coursesContainer');
const globalLoader = document.getElementById('globalLoader');
const noCoursesMessage = document.getElementById('noCoursesMessage');
const bookingModal = document.getElementById('bookingModal');
const modalCourseTitle = document.getElementById('modalCourseTitle');
const modalCourseDetails = document.getElementById('modalCourseDetails');
const modalCourseId = document.getElementById('modalCourseId');
const bookingForm = document.getElementById('bookingForm');
const submitBookingBtn = document.getElementById('submitBookingBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const bookingError = document.getElementById('bookingError');

let selectedCourse = null;

// --- Eseménykezelők ---
closeModalBtn.addEventListener('click', hideModal);
document.getElementById('modalBackdrop').addEventListener('click', hideModal);

submitBookingBtn.addEventListener('click', async () => {
    if (!bookingForm.checkValidity()) {
        bookingForm.reportValidity();
        return;
    }

    const formData = new FormData(bookingForm);
    const studentInfo = {
        lastName: formData.get('lastName'),
        firstName: formData.get('firstName'),
        email: formData.get('email')
    };

    const courseId = formData.get('courseId');

    await submitBooking(courseId, studentInfo);
});

// --- Kurzusok Lekérdezése (Valós idejű) ---
let currentRenderId = 0; // Globális változó a race condition elkerülésére

function loadCourses() {
    // Csak a mai és jövőbeli kurzusokat listázzuk
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
        coursesRef, 
        where('date', '>=', today),
        orderBy('date', 'asc')
    );

    onSnapshot(q, (snapshot) => {
        currentRenderId++;
        const myRenderId = currentRenderId;

        globalLoader.classList.add('hidden');
        
        if (snapshot.empty) {
            if (myRenderId === currentRenderId) {
                coursesContainer.classList.add('hidden');
                noCoursesMessage.classList.remove('hidden');
            }
            return;
        }

        if (myRenderId === currentRenderId) {
            noCoursesMessage.classList.add('hidden');
            coursesContainer.classList.remove('hidden');
        }
        
        // Összegyűjtjük a kurzusokat és a hozzájuk tartozó aszinkron hívásokat
        const coursesPromises = snapshot.docs.map(async (docSnap) => {
            const courseData = docSnap.data();
            courseData.id = docSnap.id;

            // Lekérdezzük az aktuális jelentkezők számát a bookings alkollekcióból
            const bookingsCollectionName = isTestMode ? 'bookings_test' : 'bookings';
            const bookingsRef = collection(db, `${collectionName}/${courseData.id}/${bookingsCollectionName}`);

            try {
                const countSnapshot = await getCountFromServer(bookingsRef);
                courseData.currentParticipants = countSnapshot.data().count;
            } catch (err) {
                console.error("Nem sikerült lekérdezni a jelentkezők számát a kurzushoz: " + courseData.id, err);
                courseData.currentParticipants = 0; // Hiba esetén feltételezzük, hogy 0
            }

            return courseData;
        });

        // Megvárjuk, amíg az összes kurzus létszáma betöltődik
        Promise.all(coursesPromises).then(coursesWithCounts => {
            // Csak akkor frissítjük a DOM-ot, ha ez a lekérdezés az utolsó snapshotból indult
            if (myRenderId === currentRenderId) {
                coursesContainer.innerHTML = ''; // Csak ekkor ürítjük ki, hogy elkerüljük a villogást és a versenyhelyzeteket

                // Rendereljük a kártyákat az eredeti sorrendben
                coursesWithCounts.forEach(course => {
                    renderCourseCard(course);
                });
            }
        }).catch(err => {
            if (myRenderId === currentRenderId) {
                console.error("Kritikus hiba a kurzusok létszámának lekérdezésekor:", err);
                globalLoader.innerHTML = '<p class="text-red-500">Hiba történt az adatok betöltésekor. Kérjük frissítsd az oldalt.</p>';
            }
        });

    }, (error) => {
        console.error("Hiba a kurzusok lekérdezésekor:", error);
        globalLoader.innerHTML = '<p class="text-red-500">Hiba történt az adatok betöltésekor. Kérjük frissítsd az oldalt.</p>';
    });
}

// --- Kurzus Kártya Megjelenítése ---
function renderCourseCard(course) {
    const card = document.createElement('div');
    card.className = "bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300";
    
    // Szép dátum formázás (YYYY-MM-DD -> ÉÉÉÉ. HH. NN.)
    const dateParts = course.date.split('-');
    const formattedDate = `${dateParts[0]}. ${dateParts[1]}. ${dateParts[2]}.`;

    const isFull = course.currentParticipants >= course.maxParticipants;
    const buttonClass = isFull
        ? "bg-gray-400 text-white font-medium py-2 px-4 rounded cursor-not-allowed"
        : "book-btn bg-mosoly-red hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors";

    card.innerHTML = `
        <div class="p-6">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-mosoly-red bg-red-50 px-3 py-1 rounded-full uppercase tracking-wide">${course.title}</span>
                <span class="text-sm text-gray-500 font-medium">${formattedDate}</span>
            </div>
            
            <div class="mt-4 flex items-center text-gray-700">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${course.time}</span>
            </div>

            <div class="mt-2 flex items-center text-gray-700">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>${course.location}</span>
            </div>
            
            <div class="mt-6 flex items-center justify-between">
                <div class="text-sm text-gray-500">
                    <span class="font-medium">Jelentkeztek:</span> ${course.currentParticipants} / ${course.maxParticipants} fő
                </div>
                <button type="button" class="${buttonClass}" ${isFull ? 'disabled' : ''} data-id="${course.id}" data-title="${course.title}" data-date="${formattedDate}" data-time="${course.time}">
                    ${isFull ? 'Megtelt' : 'Jelentkezés'}
                </button>
            </div>
        </div>
    `;

    coursesContainer.appendChild(card);

    // Eseménykezelő a gombra
    card.querySelector('.book-btn').addEventListener('click', (e) => {
        const btn = e.target;
        showModal(btn.dataset.id, btn.dataset.title, btn.dataset.date, btn.dataset.time);
    });
}

// --- Modal Kezelés ---
function showModal(id, title, date, time) {
    selectedCourse = { id, title, date, time };
    modalCourseTitle.textContent = title;
    modalCourseDetails.innerHTML = `<strong>Időpont:</strong> ${date} | ${time}`;
    modalCourseId.value = id;
    
    // Alaphelyzetbe állítás
    bookingForm.reset();
    bookingError.classList.add('hidden');
    bookingError.textContent = '';
    submitBookingBtn.disabled = false;
    submitBookingBtn.textContent = 'Jelentkezem';

    bookingModal.classList.remove('hidden');
    // Animate in
    bookingModal.querySelector('.inline-block').classList.add('modal-enter-active');
}

function hideModal() {
    bookingModal.classList.add('hidden');
    const modalInner = bookingModal.querySelector('.inline-block');
    if (modalInner) {
        modalInner.classList.remove('modal-enter-active');
    }
    bookingForm.reset();
    bookingError.classList.add('hidden');
    bookingError.textContent = '';
    selectedCourse = null;
}

// --- Foglalás Beküldése (Cloud Function) ---
async function submitBooking(courseId, studentInfo) {
    try {
        submitBookingBtn.disabled = true;
        submitBookingBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Foglalás...';
        bookingError.classList.add('hidden');

        const bookAppointmentFn = httpsCallable(functions, 'bookAppointment');
        const response = await bookAppointmentFn({ 
            courseId, 
            studentInfo,
            isTestMode: isTestMode
        });

        if (response.data.success) {
            hideModal();
            showToast();
        }

    } catch (error) {
        console.error("Foglalási hiba:", error);
        bookingError.textContent = error.message || "Ismeretlen hiba történt a foglalás során.";
        bookingError.classList.remove('hidden');
        submitBookingBtn.disabled = false;
        submitBookingBtn.textContent = 'Jelentkezem';
    }
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

// Inicializálás
loadCourses();
