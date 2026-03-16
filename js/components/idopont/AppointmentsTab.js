import { html } from '../../UI.js';
import * as Icons from '../../Icons.js';
import { db, collection, onSnapshot, query, orderBy, deleteDoc, doc, functions, httpsCallable } from '../../firebase.js';
import { useToast, useConfirmation } from '../../context/AppContext.js';

const React = window.React;
const { useState, useEffect } = React;

/**
 * Modal to view and manage students who booked a specific course
 */
const CourseBookingsModal = ({ course, onClose, isTestView }) => {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const showToast = useToast();
    const showConfirmation = useConfirmation();

    useEffect(() => {
        if (!course) return;

        const collectionName = isTestView ? 'courses_test' : 'courses';
        // Subcollection is 'bookings'
        const q = query(
            collection(db, collectionName, course.id, 'bookings'),
            orderBy('bookingDate', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBookings(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            showToast("Hiba történt a jelentkezők betöltésekor.", "error");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [course, isTestView, showToast]);

    const handleCancelBooking = (booking) => {
        showConfirmation({
            message: `Biztosan törölni szeretnéd ${booking.firstName} ${booking.lastName} jelentkezését erről a foglalkozásról?`,
            onConfirm: async () => {
                try {
                    const cancelBookingFn = httpsCallable(functions, 'cancelBookingAsAdmin');
                    await cancelBookingFn({
                        courseId: course.id,
                        studentEmail: booking.email,
                        isTestView
                    });
                    showToast('Jelentkezés sikeresen törölve.', 'success');
                } catch (error) {
                    console.error("Error cancelling booking:", error);
                    showToast(`Hiba a törlés során: ${error.message}`, 'error');
                }
            }
        });
    };

    return html`
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
            <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
                
                <div className="flex items-center justify-between rounded-t border-b p-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                            Jelentkezők: ${course.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            ${course.date} | ${course.startTime} - ${course.endTime}
                        </p>
                    </div>
                    <button onClick=${onClose} className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    ${isLoading ? html`
                        <div className="text-center py-8 text-gray-500">Jelentkezők betöltése...</div>
                    ` : bookings.length === 0 ? html`
                        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                            <${Icons.UsersIcon} size=${48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">Még nincs jelentkező erre a foglalkozásra.</p>
                        </div>
                    ` : html`
                        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                            <ul className="divide-y divide-gray-200">
                                ${bookings.map((booking, index) => html`
                                    <li key=${booking.id} className="hover:bg-gray-50">
                                        <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                    ${index + 1}.
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-indigo-600 truncate">${booking.lastName} ${booking.firstName}</p>
                                                    <p className="text-sm text-gray-500 truncate">${booking.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm text-gray-500">
                                                    ${booking.bookingDate ? new Date(booking.bookingDate.seconds * 1000).toLocaleString('hu-HU') : 'Folyamatban...'}
                                                </div>
                                                <button 
                                                    onClick=${() => handleCancelBooking(booking)}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                                                    title="Jelentkezés törlése"
                                                >
                                                    <${Icons.TrashIcon} size=${16} />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                `)}
                            </ul>
                        </div>
                    `}
                </div>
                
                <div className="flex items-center justify-end rounded-b border-t p-4 bg-white">
                    <button onClick=${onClose} className="rounded-lg bg-gray-500 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300">
                        Bezárás
                    </button>
                </div>
            </div>
        </div>
    `;
};

const AppointmentsTab = ({ isTestView }) => {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCourseForBookings, setSelectedCourseForBookings] = useState(null);
    
    // Form states
    const [courseName, setCourseName] = useState('');
    const [courseDate, setCourseDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [capacity, setCapacity] = useState('');

    const showToast = useToast();
    const showConfirmation = useConfirmation();

    useEffect(() => {
        const collectionName = isTestView ? 'courses_test' : 'courses';
        // Simplify query to avoid requiring a composite index, sort locally instead
        const q = query(collection(db, collectionName));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let coursesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Local sort: Date ascending, then startTime ascending
            coursesData.sort((a, b) => {
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                if (a.startTime < b.startTime) return -1;
                if (a.startTime > b.startTime) return 1;
                return 0;
            });
            
            setCourses(coursesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching courses:", error);
            showToast("Hiba a foglalkozások betöltésekor.", "error");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isTestView, showToast]);

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        
        if (!courseName || !courseDate || !startTime || !endTime || !capacity) {
            showToast('Kérjük, töltsön ki minden mezőt!', 'warning');
            return;
        }

        if (startTime >= endTime) {
            showToast('A befejezési időnek a kezdési idő után kell lennie!', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const createCourseFn = httpsCallable(functions, 'createCourse');
            await createCourseFn({
                name: courseName,
                date: courseDate,
                startTime: startTime,
                endTime: endTime,
                capacity: parseInt(capacity, 10),
                isTestView: isTestView
            });

            showToast('Foglalkozás sikeresen létrehozva!', 'success');
            
            // Reset form
            setCourseName('');
            setCourseDate('');
            setStartTime('');
            setEndTime('');
            setCapacity('');
            
        } catch (error) {
            console.error("Error creating course:", error);
            showToast(`Hiba a létrehozás során: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCourse = async (courseId, courseName) => {
        const deleteAction = async () => {
            try {
                // Hívjuk a backend funkciót a biztonságos törléshez (és majdani email küldéshez, stb.)
                const deleteCourseFn = httpsCallable(functions, 'deleteCourseAsAdmin');
                await deleteCourseFn({ courseId, isTestView });
                showToast('Foglalkozás sikeresen törölve!', 'success');
            } catch (error) {
                console.error("Error deleting course:", error);
                showToast(`Hiba a törlés során: ${error.message}`, 'error');
            }
        };

        showConfirmation({
            message: `Biztosan törölni szeretnéd a(z) "${courseName}" foglalkozást? Ez a művelet nem vonható vissza.`,
            onConfirm: deleteAction
        });
    };

    if (isLoading) {
        return html`<div className="text-center p-8 text-gray-500">Foglalkozások betöltése...</div>`;
    }

    return html`
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <${Icons.PlusCircleIcon} size=${20} className="text-indigo-600" />
                    Új foglalkozás meghirdetése
                </h3>
                <form onSubmit=${handleCreateCourse} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Foglalkozás neve</label>
                        <select
                            value=${courseName}
                            onChange=${(e) => setCourseName(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        >
                            <option value="">Válasszon...</option>
                            <option value="Elsősegély tanfolyam">Elsősegély tanfolyam</option>
                            <option value="Orvosi alkalmassági vizsgálat">Orvosi alkalmassági vizsgálat</option>
                            <option value="1. modul">1. modul</option>
                            <option value="2. modul">2. modul</option>
                            <option value="3. modul">3. modul</option>
                            <option value="4. modul">4. modul</option>
                            <option value="Konzultáció">Konzultáció</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dátum</label>
                        <input 
                            type="date" 
                            value=${courseDate}
                            onChange=${(e) => setCourseDate(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kezdés</label>
                        <input 
                            type="time" 
                            value=${startTime}
                            onChange=${(e) => setStartTime(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Befejezés</label>
                        <input 
                            type="time" 
                            value=${endTime}
                            onChange=${(e) => setEndTime(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kapacitás</label>
                        <input 
                            type="number" 
                            min="1"
                            value=${capacity}
                            onChange=${(e) => setCapacity(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                    
                    <div className="lg:col-span-6 flex justify-end mt-4">
                        <button 
                            type="submit" 
                            disabled=${isSaving}
                            className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            ${isSaving ? 'Mentés...' : 'Meghirdetés'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Aktív foglalkozások (${courses.length})</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Foglalkozás</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Időpont</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Létszám</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Műveletek</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            ${courses.length === 0 ? html`
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                        Nincsenek meghirdetett foglalkozások.
                                    </td>
                                </tr>
                            ` : courses.map(course => {
                                const isFull = course.bookingsCount >= course.capacity;
                                return html`
                                    <tr key=${course.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">${course.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">${course.date}</div>
                                            <div className="text-sm text-gray-500">${course.startTime} - ${course.endTime}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className=${`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isFull ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    ${course.bookingsCount || 0} / ${course.capacity}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick=${() => setSelectedCourseForBookings(course)}
                                                className="text-indigo-600 hover:text-indigo-900 ml-4"
                                                title="Jelentkezők megtekintése"
                                            >
                                                <${Icons.UsersIcon} size=${20} />
                                            </button>
                                            <button 
                                                onClick=${() => handleDeleteCourse(course.id, course.name)}
                                                className="text-red-600 hover:text-red-900 ml-4"
                                                title="Foglalkozás törlése"
                                            >
                                                <${Icons.TrashIcon} size=${20} />
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            ${selectedCourseForBookings && html`
                <${CourseBookingsModal} 
                    course=${selectedCourseForBookings}
                    onClose=${() => setSelectedCourseForBookings(null)}
                    isTestView=${isTestView}
                />
            `}
        </div>
    `;
};

export default AppointmentsTab;
