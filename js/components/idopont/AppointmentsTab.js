import { html } from "../../UI.js";
import { collection, query, orderBy, onSnapshot, getDocs, doc, deleteDoc } from "../../firebase.js";
import { db, functions } from "../../firebase.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";

const { useState, useEffect, Fragment } = React;

const AppointmentsTab = ({ isTestMode }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [viewingCourse, setViewingCourse] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const collectionName = isTestMode ? 'courses_test' : 'courses';
    const bookingsCollectionName = isTestMode ? 'bookings_test' : 'bookings';

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, collectionName), orderBy('date', 'desc'), orderBy('time', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const coursesData = [];
            snapshot.forEach((doc) => {
                coursesData.push({ id: doc.id, ...doc.data() });
            });
            setCourses(coursesData);
            setLoading(false);
        }, (error) => {
            console.error("Hiba az időpontok betöltésekor:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isTestMode]);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleDeleteCourse = async (courseId) => {
        if (!confirm("Biztosan törölni szeretnéd ezt az időpontot és az összes jelentkezőt?")) return;

        try {
            const deleteCourseFn = httpsCallable(functions, 'deleteCourseAsAdmin');
            await deleteCourseFn({ courseId, reason: "Admin törölte az admin felületről", isTestMode });
            showToast("Kurzus sikeresen törölve.");
            if (viewingCourse && viewingCourse.id === courseId) {
                setViewingCourse(null);
            }
        } catch (error) {
            console.error(error);
            alert("Hiba történt a törlés során: " + error.message);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const courseData = {
            date: formData.get('date'),
            time: formData.get('time'),
            title: formData.get('title'),
            location: formData.get('location'),
            maxParticipants: parseInt(formData.get('maxParticipants'), 10),
            createdAt: new Date().toISOString()
        };

        try {
            const { addDoc } = await import('../../firebase.js');
            await addDoc(collection(db, collectionName), courseData);
            setShowCourseModal(false);
            showToast("Sikeresen létrehozva!");
        } catch (error) {
            console.error(error);
            alert("Hiba történt a létrehozáskor.");
        }
    };

    const loadBookingsForCourse = async (course) => {
        setViewingCourse(course);
        setLoadingBookings(true);
        const bookingsRef = collection(db, `${collectionName}/${course.id}/${bookingsCollectionName}`);

        try {
            const snapshot = await getDocs(bookingsRef);
            const bookingsData = [];
            snapshot.forEach(doc => bookingsData.push({ id: doc.id, ...doc.data() }));
            setBookings(bookingsData);
        } catch (error) {
            console.error("Hiba a jelentkezők betöltésekor:", error);
        }
        setLoadingBookings(false);
    };

    const handleToggleStatus = async (courseId, bookingId, field, currentValue) => {
        try {
            const toggleFn = httpsCallable(functions, 'toggleBookingStatus');
            await toggleFn({ courseId, bookingId, field, value: !currentValue, isTestMode });

            // Helyi frissítés a UI miatt
            setBookings(bookings.map(b => b.id === bookingId ? { ...b, [field]: !currentValue } : b));
        } catch (error) {
            console.error(error);
            alert("Hiba a státusz frissítésekor.");
        }
    };

    const handleDeleteBooking = async (courseId, bookingId) => {
        if (!confirm("Biztosan törölni szeretnéd ezt a jelentkezőt?")) return;
        try {
            const deleteBookingFn = httpsCallable(functions, 'deleteBookingAsAdmin');
            await deleteBookingFn({ courseId, bookingId, reason: "Admin törlés", isTestMode });
            setBookings(bookings.filter(b => b.id !== bookingId));
            showToast("Jelentkező törölve.");
        } catch (error) {
            console.error(error);
            alert("Hiba a jelentkező törlésekor.");
        }
    };

    return html`
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                    Időpontok kezelése
                    ${isTestMode ? html`<span className="ml-2 text-sm text-red-600 bg-red-100 px-2 py-1 rounded">TESZT MÓD</span>` : null}
                </h2>
                <button onClick=${() => setShowCourseModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium">
                    + Új Időpont Létrehozása
                </button>
            </div>

            ${toastMessage && html`
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">${toastMessage}</span>
                </div>
            `}

            <!-- KURZUS LÉTREHOZÁS MODAL -->
            ${showCourseModal && html`
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Új Időpont (Kurzus)</h3>
                        <form onSubmit=${handleCreateCourse} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Típus (Cím)</label>
                                <select name="title" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="Tantermi képzés">Tantermi képzés</option>
                                    <option value="Elsősegély">Elsősegély</option>
                                    <option value="Orvosi alkalmassági">Orvosi alkalmassági</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Dátum</label>
                                    <input type="date" name="date" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Idő (Kezdés - Vége)</label>
                                    <input type="text" name="time" placeholder="09:00 - 12:00" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Helyszín</label>
                                <input type="text" name="location" defaultValue="1149 Bp. Pillangó u 16." required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Létszámkorlát (fő)</label>
                                <input type="number" name="maxParticipants" defaultValue="20" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:col-start-2 sm:text-sm">Mentés</button>
                                <button type="button" onClick=${() => setShowCourseModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm">Mégsem</button>
                            </div>
                        </form>
                    </div>
                </div>
            `}

            <!-- JELENTKEZŐK MODAL -->
            ${viewingCourse && html`
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <div>
                                <h3 className="text-lg font-bold">${viewingCourse.title} - Jelentkezők</h3>
                                <p className="text-sm text-gray-600">${viewingCourse.date} | ${viewingCourse.time} | Létszám: ${bookings.length} / ${viewingCourse.maxParticipants} fő</p>
                            </div>
                            <button onClick=${() => setViewingCourse(null)} className="text-gray-400 hover:text-gray-500">
                                <span className="sr-only">Bezárás</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            ${loadingBookings ? html`<p className="text-gray-500">Betöltés...</p>` :
                                bookings.length === 0 ? html`<p className="text-gray-500 italic">Még nincsenek jelentkezők.</p>` : html`
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Név</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Jelenlét</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Művelet</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        ${bookings.map(booking => html`
                                            <tr key=${booking.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${booking.lastName} ${booking.firstName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <button onClick=${() => handleToggleStatus(viewingCourse.id, booking.id, 'isPresent', booking.isPresent)}
                                                            className=${`px-2 py-1 text-xs rounded-full font-semibold ${booking.isPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        ${booking.isPresent ? 'Megjelent' : 'Hiányzott'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                    <button onClick=${() => handleDeleteBooking(viewingCourse.id, booking.id)} className="text-red-600 hover:text-red-900">Törlés</button>
                                                </td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            `}
                        </div>
                    </div>
                </div>
            `}

            <!-- KURZUSOK LISTÁJA -->
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                ${loading ? html`<p className="p-4 text-gray-500">Betöltés...</p>` :
                  courses.length === 0 ? html`<p className="p-4 text-gray-500 italic">Nincsenek elérhető időpontok.</p>` : html`
                    <ul className="divide-y divide-gray-200">
                        ${courses.map(course => html`
                            <li key=${course.id}>
                                <div className="block hover:bg-gray-50">
                                    <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                        <div className="flex-1 cursor-pointer" onClick=${() => loadBookingsForCourse(course)}>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-indigo-600 truncate">${course.title}</p>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        ${course.maxParticipants} fős korlát
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                                                        ${course.date} | ${course.time}
                                                    </p>
                                                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        ${course.location}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <button onClick=${() => handleDeleteCourse(course.id)} className="text-red-500 hover:text-red-700 p-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        `)}
                    </ul>
                `}
            </div>
        </div>
    `;
};

export default AppointmentsTab;
