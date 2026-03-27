import { html } from '../../UI.js';
import * as Icons from '../../Icons.js';
import { db, collection, onSnapshot, query, orderBy, deleteDoc, doc, getDocs, limit, where, functions, httpsCallable } from '../../firebase.js';
import { useToast, useConfirmation } from '../../context/AppContext.js';

const React = window.React;
const { useState, useEffect, Fragment } = React;

/**
 * BulkStudentRegistrationModal
 * Modal to add one student to multiple courses at once.
 */
const BulkStudentRegistrationModal = ({ courses, onClose, isTestView }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [selectedCourseIds, setSelectedCourseIds] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    
    const showToast = useToast();

    // Szűrjük csak a szabad kapacitású, jövőbeli/aktuális kurzusokat (ha akarjuk). Most egyszerűen csak a szabadokat.
    const availableCourses = courses.filter(c => (c.bookingsCount || 0) < c.capacity);

    const toggleCourseSelection = (courseId) => {
        const newSet = new Set(selectedCourseIds);
        if (newSet.has(courseId)) {
            newSet.delete(courseId);
        } else {
            newSet.add(courseId);
        }
        setSelectedCourseIds(newSet);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!firstName || !lastName || !email || selectedCourseIds.size === 0) {
            showToast('Kérjük, töltsön ki minden személyes adatot és válasszon ki legalább egy foglalkozást!', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const bulkAddFn = httpsCallable(functions, 'bulkAddStudentToCourses');
            const result = await bulkAddFn({
                firstName,
                lastName,
                email,
                courseIds: Array.from(selectedCourseIds),
                isTestView
            });

            if (result.data && result.data.success) {
                showToast(result.data.message || 'Sikeres mentés.', 'success');
                onClose();
            }
        } catch (error) {
            console.error("Error bulk adding student:", error);
            showToast(`Hiba a mentés során: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return html`
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
            <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
                
                <div className="flex items-center justify-between rounded-t border-b p-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                            Tanuló csoportos beosztása
                        </h3>
                    </div>
                    <button onClick=${onClose} className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    <form id="bulkRegistrationForm" onSubmit=${handleSave} className="space-y-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h4 className="text-md font-bold text-gray-800 mb-4 border-b pb-2">1. Tanuló adatai</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vezetéknév</label>
                                    <input 
                                        type="text" 
                                        value=${lastName}
                                        onChange=${(e) => setLastName(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Keresztnév</label>
                                    <input 
                                        type="text" 
                                        value=${firstName}
                                        onChange=${(e) => setFirstName(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cím</label>
                                    <input 
                                        type="email" 
                                        value=${email}
                                        onChange=${(e) => setEmail(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">A rendszer a sikeres mentés után értesítő e-mailt küld erre a címre minden kiválasztott foglalkozásról.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h4 className="text-md font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                                <span>2. Foglalkozások kiválasztása</span>
                                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Kiválasztva: ${selectedCourseIds.size} db</span>
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">Csak a szabad helyekkel rendelkező foglalkozások listázódnak.</p>
                            
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                ${availableCourses.length === 0 ? html`
                                    <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded border">Nincs szabad foglalkozás a rendszerben.</p>
                                ` : availableCourses.map(course => {
                                    const isSelected = selectedCourseIds.has(course.id);
                                    return html`
                                        <label key=${course.id} className=${`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                            <div className="flex items-center h-5 mt-0.5">
                                                <input 
                                                    type="checkbox" 
                                                    checked=${isSelected}
                                                    onChange=${() => toggleCourseSelection(course.id)}
                                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">${course.name}</p>
                                                <p className="text-sm text-gray-500 truncate">${course.date} | ${course.startTime} - ${course.endTime}</p>
                                            </div>
                                            <div className="text-xs text-gray-500 whitespace-nowrap pt-0.5">
                                                ${course.capacity - (course.bookingsCount || 0)} szabad hely
                                            </div>
                                        </label>
                                    `;
                                })}
                            </div>
                        </div>
                    </form>
                </div>
                
                <div className="flex items-center justify-end gap-3 rounded-b border-t p-4 bg-white">
                    <button type="button" onClick=${onClose} className="rounded-lg bg-white px-5 py-2.5 text-center text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200">
                        Mégse
                    </button>
                    <button 
                        type="submit" 
                        form="bulkRegistrationForm"
                        disabled=${isSaving}
                        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 flex items-center gap-2"
                    >
                        ${isSaving ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Mentés...` : 'Tanuló beiratása'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

/**
 * Modal to link an orphan booking to a student
 */
const LinkStudentModal = ({ booking, courseId, isTestView, onClose, onSuccess }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    
    const showToast = useToast();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm || searchTerm.length < 3) {
            showToast('Kérjük, adjon meg legalább 3 karaktert a kereséshez!', 'warning');
            return;
        }

        setIsSearching(true);
        try {
            const collectionName = isTestView ? 'registrations_test' : 'registrations';
            const regsRef = collection(db, collectionName);
            // We can't easily OR query by name in v8/v9, so we'll fetch all active and filter locally.
            // For simplicity, let's just fetch all and filter locally for a robust search (since we need to search by name too)
            
            const allSnap = await getDocs(query(regsRef, where('status', '==', 'active')));
            const results = [];
            const searchLower = searchTerm.toLowerCase();
            
            allSnap.forEach(doc => {
                const data = doc.data();
                const fullName = `${data.current_lastName || ''} ${data.current_firstName || ''}`.toLowerCase();
                if (data.email?.toLowerCase().includes(searchLower) || fullName.includes(searchLower)) {
                    results.push({ id: doc.id, ...data });
                }
            });
            
            setSearchResults(results);
            if (results.length === 0) {
                showToast('Nem található tanuló ezzel a keresési feltétellel.', 'info');
            }
        } catch (error) {
            console.error("Error searching students:", error);
            showToast('Hiba a keresés során.', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleLink = async (studentId) => {
        setIsLinking(true);
        try {
            const linkFn = httpsCallable(functions, 'linkStudentToBooking');
            await linkFn({
                courseId,
                bookingEmail: booking.email,
                studentId,
                isTestView
            });
            showToast('Sikeres összerendelés!', 'success');
            onSuccess();
        } catch (error) {
            console.error("Error linking student:", error);
            showToast(`Hiba az összerendelés során: ${error.message}`, 'error');
            setIsLinking(false);
        }
    };

    return html`
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-60 p-4">
            <div className="relative w-full max-w-lg rounded-lg bg-white shadow-2xl flex flex-col">
                <div className="flex items-center justify-between rounded-t border-b p-4 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <${Icons.UserAddIcon} size=${20} className="text-blue-600" />
                        Tanuló összerendelése
                    </h3>
                    <button onClick=${onClose} className="text-gray-400 hover:text-gray-900">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto max-h-[70vh]">
                    <div className="mb-4 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                            <strong>Árva jelentkezés:</strong> ${booking.lastName} ${booking.firstName} (${booking.email})
                        </p>
                    </div>
                    
                    <form onSubmit=${handleSearch} className="mb-4 flex gap-2">
                        <input 
                            type="text" 
                            value=${searchTerm}
                            onChange=${(e) => setSearchTerm(e.target.value)}
                            placeholder="Keresés név vagy e-mail alapján..."
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <button 
                            type="submit"
                            disabled=${isSearching}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            ${isSearching ? 'Keresés...' : 'Keresés'}
                        </button>
                    </form>
                    
                    ${searchResults.length > 0 && html`
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-gray-700">Találatok:</h4>
                            <ul className="divide-y divide-gray-200 border rounded-md">
                                ${searchResults.map(student => html`
                                    <li key=${student.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">${student.current_lastName} ${student.current_firstName}</p>
                                            <p className="text-xs text-gray-500">${student.email}</p>
                                        </div>
                                        <button 
                                            onClick=${() => handleLink(student.id)}
                                            disabled=${isLinking}
                                            className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                                        >
                                            ${isLinking ? 'Mentés...' : 'Összerendelés'}
                                        </button>
                                    </li>
                                `)}
                            </ul>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
};

/**
 * Modal to view and manage students who booked a specific course
 */
const CourseBookingsModal = ({ course, onClose, isTestView }) => {
    const [bookings, setBookings] = useState([]);
    const [waitlist, setWaitlist] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWaitlistLoading, setIsWaitlistLoading] = useState(true);
    
    // Add student silently form states
    const [addFirstName, setAddFirstName] = useState('');
    const [addLastName, setAddLastName] = useState('');
    const [addEmail, setAddEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    
    // Linking state
    const [bookingToLink, setBookingToLink] = useState(null);

    // Cancel modal state
    const [cancelModal, setCancelModal] = useState({ isOpen: false, item: null, type: null }); // type: 'booking' | 'waitlist'
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Attendance loading state
    const [updatingAttendanceId, setUpdatingAttendanceId] = useState(null);
    
    // First Aid payment loading and status states
    const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
    const [paymentStatuses, setPaymentStatuses] = useState({});

    const showToast = useToast();
    const showConfirmation = useConfirmation();

    useEffect(() => {
        if (!course) return;

        const collectionName = isTestView ? 'courses_test' : 'courses';
        
        // Fetch Bookings
        const qBookings = query(
            collection(db, collectionName, course.id, 'bookings'),
            orderBy('bookingDate', 'asc')
        );

        const unsubscribeBookings = onSnapshot(qBookings, async (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBookings(data);
            setIsLoading(false);
            
            // If this is a First Aid course, fetch payment statuses
            if (course.name === "Elsősegély tanfolyam" && data.length > 0) {
                const regCollection = isTestView ? 'registrations_test' : 'registrations';
                const statuses = {};
                
                // We fetch the registrations to get firstAidPaid status for each student
                try {
                    // For safety and performance, we'll fetch them individually since we have their emails. 
                    // To optimize, we run them in parallel
                    await Promise.all(data.map(async (booking) => {
                        const email = booking.email;
                        const qReg = query(collection(db, regCollection), where('email', '==', email), limit(1));
                        const regSnapshot = await getDocs(qReg);
                        if (!regSnapshot.empty) {
                            statuses[email] = regSnapshot.docs[0].data().firstAidPaid === true;
                        } else {
                            statuses[email] = false;
                        }
                    }));
                    setPaymentStatuses(statuses);
                } catch (err) {
                    console.error("Error fetching payment statuses:", err);
                }
            }
        }, (error) => {
            console.error("Error fetching bookings:", error);
            showToast("Hiba történt a jelentkezők betöltésekor.", "error");
            setIsLoading(false);
        });

        // Fetch Waitlist
        const qWaitlist = query(
            collection(db, collectionName, course.id, 'waitlist'),
            orderBy('joinedAt', 'asc')
        );

        const unsubscribeWaitlist = onSnapshot(qWaitlist, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setWaitlist(data);
            setIsWaitlistLoading(false);
        }, (error) => {
            console.error("Error fetching waitlist:", error);
            setIsWaitlistLoading(false);
        });

        return () => {
            unsubscribeBookings();
            unsubscribeWaitlist();
        };
    }, [course, isTestView, showToast]);

    const handleCancelBooking = (booking) => {
        setCancelModal({ isOpen: true, item: booking, type: 'booking' });
        setCancelReason('');
    };

    const handleRemoveWaitlist = (entry) => {
        setCancelModal({ isOpen: true, item: entry, type: 'waitlist' });
        setCancelReason('');
    };

    const confirmCancellation = async () => {
        setIsCancelling(true);
        const { item, type } = cancelModal;

        try {
            if (type === 'booking') {
                const cancelBookingFn = httpsCallable(functions, 'cancelBookingAsAdmin');
                await cancelBookingFn({
                    courseId: course.id,
                    studentEmail: item.email,
                    isTestView,
                    reason: cancelReason
                });
                showToast('Jelentkezés sikeresen törölve.', 'success');
            } else if (type === 'waitlist') {
                const removeWaitlistFn = httpsCallable(functions, 'removeWaitlistEntryAsAdmin');
                await removeWaitlistFn({
                    courseId: course.id,
                    email: item.email,
                    isTestView,
                    // Note: waitlist cancellation might not use reason in backend yet, but we pass it anyway
                    reason: cancelReason
                });
                showToast('Sikeresen eltávolítva a várólistáról.', 'success');
            }
            setCancelModal({ isOpen: false, item: null, type: null });
        } catch (error) {
            console.error("Error cancelling:", error);
            showToast(`Hiba a törlés során: ${error.message}`, 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    const handlePrintCourseBookings = () => {
        // Név alapján ABC sorrendbe rendezzük a tanulókat
        const sortedBookings = [...bookings].sort((a, b) => {
            const nameA = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase().trim();
            const nameB = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase().trim();
            return nameA.localeCompare(nameB, 'hu');
        });

        // Nyomtatási HTML összeállítása
        const printContent = `
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <title>Jelenléti ív - ${course.name}</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        color: #000;
                        margin: 0;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                    }
                    .course-title {
                        font-size: 28px;
                        font-weight: bold;
                        text-transform: uppercase;
                        margin: 0 0 10px 0;
                    }
                    .course-datetime {
                        font-size: 18px;
                        font-weight: normal;
                        color: #333;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #000;
                        padding: 12px 15px;
                        text-align: left;
                        font-size: 18px;
                    }
                    th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .col-num {
                        width: 50px;
                        text-align: center;
                        font-weight: bold;
                    }
                    .col-name {
                        width: auto;
                    }
                    @media print {
                        @page { margin: 15mm; }
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="course-title">${course.name}</h1>
                    <div class="course-datetime">${course.date} | ${course.startTime} - ${course.endTime}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="col-num">Ssz.</th>
                            <th class="col-name">Név</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedBookings.map((b, index) => `
                            <tr>
                                <td class="col-num">${index + 1}.</td>
                                <td class="col-name">${b.lastName} ${b.firstName}</td>
                            </tr>
                        `).join('')}
                        ${sortedBookings.length === 0 ? '<tr><td colspan="2" style="text-align:center;">Nincs jelentkező erre a foglalkozásra.</td></tr>' : ''}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        // Új ablak nyitása és a HTML tartalom beírása
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();

            // Várunk kicsit, hogy a DOM felépüljön, majd hívjuk a print-et
            printWindow.setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
        } else {
            showToast('Nem sikerült megnyitni a nyomtatási ablakot (esetleg a böngésző blokkolta a felugró ablakokat).', 'error');
        }
    };

    const handleAttendanceToggle = async (booking, newStatus) => {
        // Ha ugyanarra kattint ami már be van állítva, akkor vegyük le a jelölést (null)
        const finalStatus = booking.isPresent === newStatus ? null : newStatus;

        setUpdatingAttendanceId(booking.id || booking.email);
        try {
            const updateAttendanceFn = httpsCallable(functions, 'updateBookingAttendance');
            await updateAttendanceFn({
                courseId: course.id,
                studentEmail: booking.email,
                isPresent: finalStatus,
                isTestView
            });
            // The local UI will update automatically via the onSnapshot listener
        } catch (error) {
            console.error("Error updating attendance:", error);
            showToast(`Hiba a jelenlét rögzítésekor: ${error.message}`, 'error');
        } finally {
            setUpdatingAttendanceId(null);
        }
    };

    const handleFirstAidPaymentToggle = async (booking) => {
        const currentStatus = paymentStatuses[booking.email] || false;
        const newStatus = !currentStatus;
        
        const actionText = newStatus ? 'fizetettre' : 'nem fizetettre';
        showConfirmation({
            message: `Biztosan átállítod a státuszt ${actionText}? ${newStatus ? 'Ezzel a rendszer automatikusan kiküld egy visszaigazoló e-mailt a tanulónak.' : ''}`,
            onConfirm: async () => {
                setUpdatingPaymentId(booking.id || booking.email);
                try {
                    const updatePaymentFn = httpsCallable(functions, 'updateFirstAidPaymentStatus');
                    const result = await updatePaymentFn({
                        studentEmail: booking.email,
                        isPaid: newStatus,
                        isTestView
                    });
                    
                    if (result.data?.warning) {
                        showToast(result.data.warning, 'warning');
                    } else {
                        showToast(`Fizetési státusz sikeresen mentve (${actionText}).`, 'success');
                    }
                    
                    // Update local state immediately
                    setPaymentStatuses(prev => ({
                        ...prev,
                        [booking.email]: newStatus
                    }));
                } catch (error) {
                    console.error("Error updating first aid payment:", error);
                    showToast(`Hiba a fizetés frissítésekor: ${error.message}`, 'error');
                } finally {
                    setUpdatingPaymentId(null);
                }
            }
        });
    };

    const handleNotifyAbsentees = () => {
        // Ezt a gombot egyelőre csak előkészítjük
        const absentees = bookings.filter(b => b.isPresent === false);
        if (absentees.length === 0) {
            showToast('Nincs olyan tanuló, aki hiányzóként (piros X) lenne megjelölve.', 'info');
            return;
        }

        const absenteeNames = absentees.map(b => `${b.lastName} ${b.firstName}`).join(', ');

        showConfirmation({
            message: `Hamarosan: Értesítés küldése a következő ${absentees.length} hiányzónak: ${absenteeNames}. Ez a funkció jelenleg fejlesztés alatt áll.`,
            onConfirm: () => {
                console.log('Absentees to notify:', absentees);
            }
        });
    };

    const handleAddStudentSilently = async (e) => {
        e.preventDefault();
        
        if (!addFirstName || !addLastName || !addEmail) {
            showToast('Minden mező kitöltése kötelező az új tanuló felviteléhez!', 'warning');
            return;
        }

        setIsAdding(true);
        try {
            const bookFn = httpsCallable(functions, 'bookAppointment');
            const result = await bookFn({
                courseId: course.id,
                firstName: addFirstName,
                lastName: addLastName,
                email: addEmail,
                isTestView,
                silent: true // The key param indicating NO confirmation email should be sent
            });
            
            showToast(result.data.message || 'Sikeres hozzáadás extraként (értesítés nélkül).', 'success');
            
            // Reset form and close
            setAddFirstName('');
            setAddLastName('');
            setAddEmail('');
            setIsAddFormOpen(false);

        } catch (error) {
            console.error("Error adding student silently:", error);
            showToast(`Hiba a hozzáadás során: ${error.message}`, 'error');
        } finally {
            setIsAdding(false);
        }
    };

    return html`
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4">
            <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
                
                <div className="flex items-center justify-between rounded-t border-b p-4">
                    <div className="flex-1">
                        <div className="flex justify-between items-center pr-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Jelentkezők: ${course.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    ${course.date} | ${course.startTime} - ${course.endTime}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick=${handleNotifyAbsentees}
                                    className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors"
                                    title="Hiányzók értesítése (Hamarosan)"
                                >
                                    <${Icons.MailIcon} size=${16} />
                                    <span className="hidden sm:inline">Hiányzók értesítése</span>
                                </button>
                                <button
                                    onClick=${handlePrintCourseBookings}
                                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center transition-colors"
                                    title="Jelenléti ív nyomtatása"
                                >
                                    <${Icons.PrinterIcon} size=${18} />
                                </button>
                                <button
                                    onClick=${() => setIsAddFormOpen(!isAddFormOpen)}
                                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors"
                                >
                                    <${Icons.PlusCircleIcon} size=${16} />
                                    Új tanuló hozzáadása (Extra)
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick=${onClose} className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900">
                        <${Icons.XIcon} size=${20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    ${isAddFormOpen && html`
                        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-indigo-200">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                                    <${Icons.UserAddIcon} size=${18} className="text-indigo-600" />
                                    Új tanuló azonnali felvitele a kurzusra (Extra)
                                </h4>
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-semibold border border-gray-200">
                                    Nem kap e-mailt, de túllépheti a létszámot!
                                </span>
                            </div>
                            <form onSubmit=${handleAddStudentSilently} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vezetéknév</label>
                                    <input 
                                        type="text" 
                                        value=${addLastName}
                                        onChange=${(e) => setAddLastName(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Keresztnév</label>
                                    <input 
                                        type="text" 
                                        value=${addFirstName}
                                        onChange=${(e) => setAddFirstName(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cím</label>
                                    <input 
                                        type="email" 
                                        value=${addEmail}
                                        onChange=${(e) => setAddEmail(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-3 flex justify-end mt-2">
                                    <button 
                                        type="submit" 
                                        disabled=${isAdding}
                                        className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        ${isAdding ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Hozzáadás...` : 'Hozzáadás Extraként'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    `}

                    ${isLoading ? html`
                        <div className="text-center py-8 text-gray-500">Jelentkezők betöltése...</div>
                    ` : html`
                        <${Fragment}>
                            ${bookings.length === 0 ? html`
                                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                                    <${Icons.UsersIcon} size=${48} className="mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-500">Még nincs jelentkező erre a foglalkozásra.</p>
                                </div>
                            ` : html`
                                <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                                    <ul className="divide-y divide-gray-200">
                                        ${bookings.map((booking, index) => html`
                                            <li key=${booking.id || index} className="hover:bg-gray-50">
                                                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                            ${index + 1}.
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-indigo-600 truncate flex items-center gap-2">
                                                                ${booking.lastName} ${booking.firstName}
                                                                ${booking.addedByAdmin ? html`
                                                                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                                                        <${Icons.ShieldIcon} size=${12} />
                                                                        Admin
                                                                    </span>
                                                                ` : ''}
                                                                ${booking.addedAsExtra ? html`
                                                                    <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-700/10" title="Extra rögzítésként (létszám felett) lett hozzáadva">
                                                                        Extra
                                                                    </span>
                                                                ` : ''}
                                                                ${(booking.isLinkedToStudent === false && !booking.manuallyLinked) ? html`
                                                                    <span className="text-yellow-500 font-bold ml-1 flex items-center" title="Nincs tanulói profilja az adatbázisban ezzel az e-mail címmel!">
                                                                        ⚠️
                                                                        <button 
                                                                            onClick=${() => setBookingToLink(booking)}
                                                                            className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded hover:bg-yellow-200 transition-colors"
                                                                        >
                                                                            Összerendelés
                                                                        </button>
                                                                    </span>
                                                                ` : ''}
                                                                ${booking.manuallyLinked ? html`
                                                                    <span className="text-blue-500 font-bold ml-1" title="Manuálisan összerendelve egy tanulóval">
                                                                        🔷
                                                                    </span>
                                                                ` : ''}
                                                            </p>
                                                            <p className="text-sm text-gray-500 truncate">${booking.email}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5" title="Jelentkezés időpontja">
                                                                Jelentkezés: ${booking.bookingDate ? new Date(booking.bookingDate.seconds * 1000).toLocaleString('hu-HU') : 'Folyamatban...'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-4">
                                                        ${course.name === "Elsősegély tanfolyam" ? html`
                                                            <div className="flex flex-col items-center mr-2 border-r pr-4 border-gray-200">
                                                                <span className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-semibold">Fizetve</span>
                                                                ${updatingPaymentId === (booking.id || booking.email) ? html`
                                                                    <div className="h-7 w-7 flex items-center justify-center">
                                                                        <span className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
                                                                    </div>
                                                                ` : html`
                                                                    <button
                                                                        onClick=${() => handleFirstAidPaymentToggle(booking)}
                                                                        className=${`p-1 rounded-full transition-all duration-200 hover:scale-110 ${paymentStatuses[booking.email] ? 'text-green-600 bg-green-50 shadow-sm ring-1 ring-green-200' : 'text-red-500 bg-red-50 shadow-sm ring-1 ring-red-200'}`}
                                                                        title=${paymentStatuses[booking.email] ? "Fizetve - kattints a törléshez" : "Nincs fizetve - kattints a fizetés rögzítéséhez"}
                                                                    >
                                                                        ${paymentStatuses[booking.email] ? html`<${Icons.CheckCircleIcon} size=${20} />` : html`<${Icons.XCircleIcon} size=${20} />`}
                                                                    </button>
                                                                `}
                                                            </div>
                                                        ` : null}
                                                        
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-semibold">Jelenlét</span>
                                                            ${updatingAttendanceId === (booking.id || booking.email) ? html`
                                                                <div className="flex items-center justify-center w-[64px] h-[34px]">
                                                                    <span className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
                                                                </div>
                                                            ` : html`
                                                                <div className="flex items-center gap-1 sm:gap-2">
                                                                    <button
                                                                        onClick=${() => handleAttendanceToggle(booking, true)}
                                                                        className=${`p-1.5 rounded-full transition-all duration-200 hover:bg-green-50 hover:scale-110 ${booking.isPresent === true ? 'text-green-600 bg-green-50 shadow-sm' : 'text-gray-300'}`}
                                                                        title="Jelen volt"
                                                                    >
                                                                        <${Icons.CheckCircleIcon} size=${22} />
                                                                    </button>
                                                                    <button
                                                                        onClick=${() => handleAttendanceToggle(booking, false)}
                                                                        className=${`p-1.5 rounded-full transition-all duration-200 hover:bg-red-50 hover:scale-110 ${booking.isPresent === false ? 'text-red-600 bg-red-50 shadow-sm' : 'text-gray-300'}`}
                                                                        title="Hiányzott"
                                                                    >
                                                                        <${Icons.XCircleIcon} size=${22} />
                                                                    </button>
                                                                </div>
                                                            `}
                                                        </div>
                                                        
                                                        <div className="w-px h-8 bg-gray-200 mx-1 ml-2"></div>
                                                        <button 
                                                            onClick=${() => handleCancelBooking(booking)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors ml-1"
                                                            title="Jelentkezés törlése"
                                                        >
                                                            <${Icons.TrashIcon} size=${18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        `)}
                                    </ul>
                                </div>
                            `}

                            ${(!isWaitlistLoading && waitlist.length > 0 && course.name !== "Elsősegély tanfolyam") ? html`
                                <div className="mt-8">
                                    <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                        <${Icons.UsersIcon} size=${20} className="text-yellow-600" />
                                        Várólista (${waitlist.length})
                                    </h4>
                                    <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                                        <ul className="divide-y divide-gray-200">
                                            ${waitlist.map((entry, index) => html`
                                                <li key=${entry.id || index} className="hover:bg-gray-50">
                                                    <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold border border-yellow-200">
                                                                V-${index + 1}.
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 truncate">${entry.lastName} ${entry.firstName}</p>
                                                                <p className="text-sm text-gray-500 truncate">${entry.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-sm text-gray-500 hidden sm:block">
                                                                Feliratkozott: ${entry.joinedAt ? new Date(entry.joinedAt.seconds * 1000).toLocaleString('hu-HU') : '...'}
                                                            </div>
                                                            <button 
                                                                onClick=${() => handleRemoveWaitlist(entry)}
                                                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                                                                title="Eltávolítás a várólistáról"
                                                            >
                                                                <${Icons.TrashIcon} size=${16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            `)}
                                        </ul>
                                    </div>
                                </div>
                            ` : null}
                        </${Fragment}>
                    `}
                </div>
                
                <div className="flex items-center justify-end rounded-b border-t p-4 bg-white">
                    <button onClick=${onClose} className="rounded-lg bg-gray-500 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300">
                        Bezárás
                    </button>
                </div>
            </div>
            
            ${bookingToLink && html`
                <${LinkStudentModal}
                    booking=${bookingToLink}
                    courseId=${course.id}
                    isTestView=${isTestView}
                    onClose=${() => setBookingToLink(null)}
                    onSuccess=${() => setBookingToLink(null)}
                />
            `}

            ${cancelModal.isOpen && html`
                <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-60 p-4">
                    <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between rounded-t border-b p-4 bg-red-50">
                            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                                <${Icons.AlertTriangleIcon} size=${20} className="text-red-600" />
                                Törlés megerősítése
                            </h3>
                            <button onClick=${() => setCancelModal({ isOpen: false, item: null, type: null })} className="text-gray-400 hover:text-gray-900">
                                <${Icons.XIcon} size=${20} />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-700 mb-4 text-sm">
                                Biztosan törölni szeretnéd <strong>${cancelModal.item?.lastName} ${cancelModal.item?.firstName}</strong>
                                ${cancelModal.type === 'booking' ? ' jelentkezését' : ' várólistás feliratkozását'}?
                            </p>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Törlés indoka (opcionális)
                            </label>
                            <textarea
                                rows="3"
                                value=${cancelReason}
                                onChange=${(e) => setCancelReason(e.target.value)}
                                placeholder="Ez az indoklás bekerül a kiküldött e-mailbe..."
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            ></textarea>
                        </div>
                        <div className="flex items-center justify-end gap-3 rounded-b border-t p-4 bg-gray-50">
                            <button
                                onClick=${() => setCancelModal({ isOpen: false, item: null, type: null })}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100"
                            >
                                Mégse
                            </button>
                            <button
                                onClick=${confirmCancellation}
                                disabled=${isCancelling}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                ${isCancelling ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Törlés...` : 'Törlés'}
                            </button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

const AppointmentsTab = ({ isTestView }) => {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCourseForBookings, setSelectedCourseForBookings] = useState(null);
    
    // Edit course state
    const [editingCourseId, setEditingCourseId] = useState(null);
    const [editCourseData, setEditCourseData] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Form states
    const [courseName, setCourseName] = useState('');
    const [courseDate, setCourseDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [capacity, setCapacity] = useState('');
    
    // Bulk generator states
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [genStartDate, setGenStartDate] = useState('');
    const [genNumDays, setGenNumDays] = useState(4); // default 4 alkalom (2 hét)
    const [genCapacity, setGenCapacity] = useState(20);
    const [genMorningModule, setGenMorningModule] = useState(1);
    const [genAfternoonModule, setGenAfternoonModule] = useState(3);
    const [previewCourses, setPreviewCourses] = useState([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    // Bulk student registration states
    const [isBulkStudentRegistrationOpen, setIsBulkStudentRegistrationOpen] = useState(false);

    // Cancel Course Modal state
    const [cancelCourseModal, setCancelCourseModal] = useState({ isOpen: false, courseId: null, courseName: '' });
    const [cancelCourseReason, setCancelCourseReason] = useState('');
    const [isCancellingCourse, setIsCancellingCourse] = useState(false);

    // Új állapotok az Archív/Aktív fülekhez és a lapozáshoz
    const [activeTab, setActiveTab] = useState('active'); // 'active' vagy 'archived'
    const [currentPageActive, setCurrentPageActive] = useState(1);
    const [currentPageArchived, setCurrentPageArchived] = useState(1);
    const itemsPerPage = 10;

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

    // Foglalkozások szétválogatása Aktív és Archív kategóriákba
    const getCategorizedCourses = () => {
        const now = new Date();
        const active = [];
        const archived = [];

        courses.forEach(course => {
            // Kombináljuk a dátumot és a befejezési időt
            let courseEndDateTime = null;
            if (course.date && course.endTime) {
                // course.date format is assumed to be YYYY-MM-DD based on HTML input type="date"
                const dateParts = course.date.split('-');
                const timeParts = course.endTime.split(':');
                if (dateParts.length === 3 && timeParts.length === 2) {
                    courseEndDateTime = new Date(
                        parseInt(dateParts[0]),
                        parseInt(dateParts[1]) - 1, // Hónapok 0-tól indulnak
                        parseInt(dateParts[2]),
                        parseInt(timeParts[0]),
                        parseInt(timeParts[1])
                    );
                }
            }

            if (courseEndDateTime && now > courseEndDateTime) {
                archived.push(course);
            } else {
                active.push(course);
            }
        });

        // Archív lista rendezése: Dátum és befejezési idő csökkenő sorrendben
        archived.sort((a, b) => {
            if (a.date > b.date) return -1;
            if (a.date < b.date) return 1;
            if (a.endTime > b.endTime) return -1;
            if (a.endTime < b.endTime) return 1;
            return 0;
        });

        return { active, archived };
    };

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

        // Ütközésvizsgálat
        const hasConflict = courses.some(course => 
            course.date === courseDate && 
            course.startTime === startTime
        );

        if (hasConflict) {
            showToast(`Ezen a napon (${courseDate}) és időpontban (${startTime}) már van meghirdetve egy foglalkozás!`, 'error');
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

    const handleDeleteCourse = (courseId, courseName) => {
        setCancelCourseModal({ isOpen: true, courseId, courseName });
        setCancelCourseReason('');
    };

    const confirmCourseCancellation = async () => {
        setIsCancellingCourse(true);
        try {
            const deleteCourseFn = httpsCallable(functions, 'deleteCourseAsAdmin');
            await deleteCourseFn({
                courseId: cancelCourseModal.courseId,
                isTestView,
                reason: cancelCourseReason
            });
            showToast('Foglalkozás sikeresen törölve!', 'success');
            setCancelCourseModal({ isOpen: false, courseId: null, courseName: '' });
        } catch (error) {
            console.error("Error deleting course:", error);
            showToast(`Hiba a törlés során: ${error.message}`, 'error');
        } finally {
            setIsCancellingCourse(false);
        }
    };

    const startEditingCourse = (course) => {
        setEditingCourseId(course.id);
        setEditCourseData({ ...course });
    };

    const cancelEditingCourse = () => {
        setEditingCourseId(null);
        setEditCourseData({});
    };

    const handleUpdateCourse = async (e) => {
        e.preventDefault();

        if (!editCourseData.name || !editCourseData.date || !editCourseData.startTime || !editCourseData.endTime || !editCourseData.capacity) {
            showToast('Kérjük, töltsön ki minden mezőt a szerkesztéshez!', 'warning');
            return;
        }

        if (editCourseData.startTime >= editCourseData.endTime) {
            showToast('A befejezési időnek a kezdési idő után kell lennie!', 'warning');
            return;
        }

        // Ütközésvizsgálat
        const hasConflict = courses.some(course => 
            course.id !== editingCourseId && // Saját magával ne ütközzön
            course.date === editCourseData.date && 
            course.startTime === editCourseData.startTime
        );

        if (hasConflict) {
            showToast(`Ezen a napon (${editCourseData.date}) és időpontban (${editCourseData.startTime}) már van meghirdetve egy másik foglalkozás!`, 'error');
            return;
        }

        setIsUpdating(true);
        try {
            const updateCourseFn = httpsCallable(functions, 'updateCourseAsAdmin');
            await updateCourseFn({
                courseId: editingCourseId,
                name: editCourseData.name,
                date: editCourseData.date,
                startTime: editCourseData.startTime,
                endTime: editCourseData.endTime,
                capacity: parseInt(editCourseData.capacity, 10),
                isTestView: isTestView
            });

            showToast('Foglalkozás sikeresen frissítve! (A jelentkezők e-mailben értesültek a változásról, ha a dátum/idő/név módosult)', 'success');
            setEditingCourseId(null);
            setEditCourseData({});
            
        } catch (error) {
            console.error("Error updating course:", error);
            showToast(`Hiba a frissítés során: ${error.message}`, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleGeneratePreview = () => {
        if (!genStartDate || !genNumDays || !genCapacity) {
            showToast('Kérjük, töltsön ki minden mezőt a generátorhoz!', 'warning');
            return;
        }

        let currentMorningModule = parseInt(genMorningModule, 10);
        let currentAfternoonModule = parseInt(genAfternoonModule, 10);
        let currentBaseDate = new Date(genStartDate);
        
        const previews = [];
        let generatedDays = 0;
        let dayCounter = 0; // Biztonsági limit, hogy ne fusson végtelenül
        
        while (generatedDays < parseInt(genNumDays, 10) && dayCounter < 100) {
            const dayOfWeek = currentBaseDate.getDay();
            
            // Kedd (2) vagy Csütörtök (4)
            if (dayOfWeek === 2 || dayOfWeek === 4) {
                // Determine if this is a "teaching week"
                // The pattern is: Tuesday, Thursday, then skip a week.
                // We'll consider the first Tuesday/Thursday encountered as part of the first week.
                // To do this simply, we will just jump forward by appropriate days.
                
                const dateStr = currentBaseDate.toISOString().split('T')[0];
                
                // Délelőtt
                previews.push({
                    id: `preview_${Date.now()}_${generatedDays}_m`,
                    name: `${currentMorningModule}. modul`,
                    date: dateStr,
                    startTime: '09:00',
                    endTime: '12:15',
                    capacity: parseInt(genCapacity, 10)
                });
                
                // Délután
                previews.push({
                    id: `preview_${Date.now()}_${generatedDays}_a`,
                    name: `${currentAfternoonModule}. modul`,
                    date: dateStr,
                    startTime: '17:30',
                    endTime: '20:15',
                    capacity: parseInt(genCapacity, 10)
                });
                
                // Ciklus léptetése 1-2-3-4
                currentMorningModule = currentMorningModule === 4 ? 1 : currentMorningModule + 1;
                currentAfternoonModule = currentAfternoonModule === 4 ? 1 : currentAfternoonModule + 1;
                
                generatedDays++;
                
                // Ha csütörtökön vagyunk, a következő alkalom a jövő hét utáni kedd (+12 nap)
                if (dayOfWeek === 4) {
                    currentBaseDate.setDate(currentBaseDate.getDate() + 12);
                } else {
                    // Ha kedden vagyunk, a következő alkalom ezen a héten csütörtök (+2 nap)
                    currentBaseDate.setDate(currentBaseDate.getDate() + 2);
                }
            } else {
                // Ha nem kedd vagy csütörtök, lépjünk egy napot
                currentBaseDate.setDate(currentBaseDate.getDate() + 1);
            }
            
            dayCounter++;
        }
        
        // Ütközésvizsgálat a meglévő aktív foglalkozásokkal
        for (const preview of previews) {
            const hasConflict = courses.some(course => 
                course.date === preview.date && 
                course.startTime === preview.startTime
            );
            if (hasConflict) {
                showToast(`Figyelem: A(z) ${preview.date} - ${preview.startTime} időpontra már van meghirdetve egy foglalkozás a rendszerben. A generálás megszakítva. Kérjük válasszon másik kezdő dátumot!`, 'error');
                return;
            }
        }

        setPreviewCourses(previews);
        showToast('Előnézet sikeresen legenerálva. A mentés előtt még szabadon módosíthatod az adatokat.', 'info');
    };

    const handlePreviewChange = (id, field, value) => {
        setPreviewCourses(prev => prev.map(course => {
            if (course.id === id) {
                return { ...course, [field]: value };
            }
            return course;
        }));
    };

    const handleRemovePreview = (id) => {
        setPreviewCourses(prev => prev.filter(course => course.id !== id));
    };

    const handleBulkSave = async () => {
        if (previewCourses.length === 0) {
            showToast('Nincsenek menthető időpontok az előnézetben.', 'warning');
            return;
        }

        // Belső duplikáció ellenőrzése a szerkesztett listában
        const uniqueKeys = new Set();
        for (const preview of previewCourses) {
            const key = `${preview.date}_${preview.startTime}`;
            if (uniqueKeys.has(key)) {
                showToast(`Figyelem: Az előnézetben több azonos időpont is szerepel (${preview.date} - ${preview.startTime}). Kérjük javítsa a duplikációkat a mentés előtt!`, 'error');
                return;
            }
            uniqueKeys.add(key);
        }

        // Végső ütközésvizsgálat a meglévő aktív foglalkozásokkal (ha időközben mást hoztak létre)
        for (const preview of previewCourses) {
            const hasConflict = courses.some(course => 
                course.date === preview.date && 
                course.startTime === preview.startTime
            );
            if (hasConflict) {
                showToast(`Figyelem: A(z) ${preview.date} - ${preview.startTime} időpontra időközben létrejött egy foglalkozás a rendszerben. A tömeges mentés megszakítva.`, 'error');
                return;
            }
        }

        setIsBulkSaving(true);
        try {
            const createMultipleCoursesFn = httpsCallable(functions, 'createMultipleCourses');
            
            // Távolítsuk el az 'id'-t, mert az csak a frontendnek kellett a listához
            const coursesToSave = previewCourses.map(({id, ...rest}) => rest);
            
            await createMultipleCoursesFn({
                courses: coursesToSave,
                isTestView: isTestView
            });

            showToast(`${coursesToSave.length} foglalkozás sikeresen létrehozva!`, 'success');
            
            // Töröljük a listát és csukjuk be a generátort
            setPreviewCourses([]);
            setIsGeneratorOpen(false);
            
        } catch (error) {
            console.error("Error bulk creating courses:", error);
            showToast(`Hiba a tömeges mentés során: ${error.message}`, 'error');
        } finally {
            setIsBulkSaving(false);
        }
    };

    if (isLoading) {
        return html`<div className="text-center p-8 text-gray-500">Foglalkozások betöltése...</div>`;
    }

    const { active, archived } = getCategorizedCourses();
    const currentList = activeTab === 'active' ? active : archived;
    const currentPage = activeTab === 'active' ? currentPageActive : currentPageArchived;
    const totalPages = Math.ceil(currentList.length / itemsPerPage);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const visibleCourses = currentList.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            if (activeTab === 'active') {
                setCurrentPageActive(newPage);
            } else {
                setCurrentPageArchived(newPage);
            }
        }
    };

    return html`
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <${Icons.UsersIcon} size=${20} className="text-indigo-600" />
                        Csoportos regisztráció
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Egy tanuló felvétele több szabad foglalkozásra egyszerre.</p>
                </div>
                <button 
                    onClick=${() => setIsBulkStudentRegistrationOpen(true)}
                    className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-indigo-700 shadow flex items-center gap-2 transition-colors"
                >
                    <${Icons.PlusCircleIcon} size=${18} />
                    Tanuló csoportos beosztása
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <${Icons.PlusCircleIcon} size=${20} className="text-indigo-600" />
                        Új foglalkozás meghirdetése
                    </h3>
                    <button 
                        onClick=${() => setIsGeneratorOpen(!isGeneratorOpen)}
                        className="text-sm font-semibold flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 py-1.5 px-3 rounded-md transition-colors border border-slate-300"
                    >
                        <${Icons.RefreshIcon} size=${16} />
                        ${isGeneratorOpen ? 'Generátor bezárása' : 'Tömeges modul generáló (4 modul)'}
                    </button>
                </div>
                
                ${isGeneratorOpen ? html`
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
                        <div className="flex items-start gap-3 mb-4 text-slate-700">
                            <${Icons.InfoIcon} size=${20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm leading-tight">
                                Ez a generátor kifejezetten a 4 modul elcsúsztatott kiírására szolgál. Kéthetente Kedden és Csütörtökön fog időpontokat készíteni a megadott kezdődátumtól. Az elkészült listában az egyes napokat a végleges mentés előtt még szabadon módosíthatod (pl. ha a Csütörtök ünnepnap, átrakhatod Péntekre).
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-white p-4 rounded-md shadow-sm border border-slate-200">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Első tanfolyami nap</label>
                                <input 
                                    type="date" 
                                    value=${genStartDate}
                                    onChange=${(e) => setGenStartDate(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    required
                                />
                                <span className="text-xs text-slate-500 block mt-1">(Ideális esetben egy Kedd)</span>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hány alkalom?</label>
                                <select 
                                    value=${genNumDays}
                                    onChange=${(e) => setGenNumDays(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                >
                                    <option value="2">2 alkalom (1 oktatási hét)</option>
                                    <option value="4">4 alkalom (2 oktatási hét)</option>
                                    <option value="6">6 alkalom (3 oktatási hét)</option>
                                    <option value="8">8 alkalom (4 oktatási hét)</option>
                                </select>
                                <span className="text-xs text-slate-500 block mt-1">(1 alkalom = 1 nap = De + Du)</span>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Létszám (kapacitás)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value=${genCapacity}
                                    onChange=${(e) => setGenCapacity(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                            
                            <div className="lg:col-span-2 grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                                <div className="col-span-2 text-xs font-bold text-slate-600 text-center uppercase border-b pb-1 mb-1">
                                    Első napi modulok (0. ciklus)
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Délelőtt</label>
                                    <select 
                                        value=${genMorningModule}
                                        onChange=${(e) => setGenMorningModule(e.target.value)}
                                        className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1"
                                    >
                                        <option value="1">1. modul</option>
                                        <option value="2">2. modul</option>
                                        <option value="3">3. modul</option>
                                        <option value="4">4. modul</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Délután</label>
                                    <select 
                                        value=${genAfternoonModule}
                                        onChange=${(e) => setGenAfternoonModule(e.target.value)}
                                        className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1"
                                    >
                                        <option value="1">1. modul</option>
                                        <option value="2">2. modul</option>
                                        <option value="3">3. modul</option>
                                        <option value="4">4. modul</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="lg:col-span-5 flex justify-end mt-2 border-t pt-4">
                                <button 
                                    type="button" 
                                    onClick=${handleGeneratePreview}
                                    className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-colors"
                                >
                                    <${Icons.EyeIcon} size=${18} />
                                    Előnézet Generálása
                                </button>
                            </div>
                        </div>
                        
                        ${previewCourses.length > 0 && html`
                            <div className="mt-6 border-t pt-6">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-sm uppercase tracking-wide">Előnézet</span>
                                    Generált időpontok ellenőrzése
                                </h4>
                                <div className="bg-white rounded-md shadow-sm border border-gray-300 overflow-hidden">
                                    <div className="max-h-96 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Dátum</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Idősáv</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Foglalkozás (Modul)</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Létszám</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Művelet</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                ${previewCourses.map((course, index) => html`
                                                    <tr key=${course.id} className=${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                        <td className="px-4 py-2">
                                                            <input 
                                                                type="date" 
                                                                value=${course.date}
                                                                onChange=${(e) => handlePreviewChange(course.id, 'date', e.target.value)}
                                                                className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 flex items-center gap-1">
                                                            <input 
                                                                type="time" 
                                                                value=${course.startTime}
                                                                onChange=${(e) => handlePreviewChange(course.id, 'startTime', e.target.value)}
                                                                className="w-24 text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                            <span className="text-gray-400">-</span>
                                                            <input 
                                                                type="time" 
                                                                value=${course.endTime}
                                                                onChange=${(e) => handlePreviewChange(course.id, 'endTime', e.target.value)}
                                                                className="w-24 text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <select 
                                                                value=${course.name}
                                                                onChange=${(e) => handlePreviewChange(course.id, 'name', e.target.value)}
                                                                className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                <option value="1. modul">1. modul</option>
                                                                <option value="2. modul">2. modul</option>
                                                                <option value="3. modul">3. modul</option>
                                                                <option value="4. modul">4. modul</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input 
                                                                type="number" 
                                                                value=${course.capacity}
                                                                onChange=${(e) => handlePreviewChange(course.id, 'capacity', parseInt(e.target.value, 10))}
                                                                className="w-20 text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button 
                                                                onClick=${() => handleRemovePreview(course.id)}
                                                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded"
                                                                title="Eltávolítás a listából"
                                                            >
                                                                <${Icons.TrashIcon} size=${18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `)}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-slate-50 border-t border-gray-200 p-4 flex justify-between items-center">
                                        <div className="text-sm font-medium text-gray-700">
                                            Összesen generálva: <span className="font-bold text-indigo-600">${previewCourses.length}</span> db időpont.
                                        </div>
                                        <button 
                                            onClick=${handleBulkSave}
                                            disabled=${isBulkSaving}
                                            className="bg-green-600 text-white font-bold py-2.5 px-6 rounded-md hover:bg-green-700 shadow flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                                        >
                                            ${isBulkSaving ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Mentés...` : html`<${Icons.CheckIcon} size=${20} /> Tervezet Véglegesítése és Mentése`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>
                ` : html`
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
                `}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
                    <button
                        onClick=${() => { setActiveTab('active'); setCurrentPageActive(1); }}
                        className=${`text-lg font-bold pb-1 transition-colors ${activeTab === 'active' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Aktív foglalkozások (${active.length})
                    </button>
                    <button
                        onClick=${() => { setActiveTab('archived'); setCurrentPageArchived(1); }}
                        className=${`text-lg font-bold pb-1 transition-colors ${activeTab === 'archived' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Archív foglalkozások (${archived.length})
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Foglalkozás</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Időpont</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Létszám (Várólista)</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Műveletek</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            ${visibleCourses.length === 0 ? html`
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                        Nincsenek megjeleníthető foglalkozások.
                                    </td>
                                </tr>
                            ` : visibleCourses.map(course => {
                                const isFull = course.bookingsCount >= course.capacity;
                                return html`
                                    <tr key=${course.id} className="hover:bg-gray-50">
                                        ${editingCourseId === course.id ? html`
                                            <td colSpan="4" className="px-6 py-4">
                                                <form onSubmit=${handleUpdateCourse} className="flex flex-wrap items-center gap-2">
                                                    <select 
                                                        value=${editCourseData.name} 
                                                        onChange=${(e) => setEditCourseData({...editCourseData, name: e.target.value})}
                                                        className="text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                                    >
                                                        <option value="Elsősegély tanfolyam">Elsősegély tanfolyam</option>
                                                        <option value="Orvosi alkalmassági vizsgálat">Orvosi alkalmassági vizsgálat</option>
                                                        <option value="1. modul">1. modul</option>
                                                        <option value="2. modul">2. modul</option>
                                                        <option value="3. modul">3. modul</option>
                                                        <option value="4. modul">4. modul</option>
                                                        <option value="Konzultáció">Konzultáció</option>
                                                    </select>
                                                    
                                                    <input 
                                                        type="date" 
                                                        value=${editCourseData.date} 
                                                        onChange=${(e) => setEditCourseData({...editCourseData, date: e.target.value})}
                                                        className="text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    
                                                    <input 
                                                        type="time" 
                                                        value=${editCourseData.startTime} 
                                                        onChange=${(e) => setEditCourseData({...editCourseData, startTime: e.target.value})}
                                                        className="text-sm border-gray-300 rounded w-24 focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    <span className="text-gray-500">-</span>
                                                    <input 
                                                        type="time" 
                                                        value=${editCourseData.endTime} 
                                                        onChange=${(e) => setEditCourseData({...editCourseData, endTime: e.target.value})}
                                                        className="text-sm border-gray-300 rounded w-24 focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value=${editCourseData.capacity} 
                                                        onChange=${(e) => setEditCourseData({...editCourseData, capacity: e.target.value})}
                                                        className="text-sm border-gray-300 rounded w-16 focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <button 
                                                            type="button" 
                                                            onClick=${cancelEditingCourse}
                                                            className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                                        >
                                                            Mégse
                                                        </button>
                                                        <button 
                                                            type="submit" 
                                                            disabled=${isUpdating}
                                                            className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
                                                        >
                                                            ${isUpdating ? 'Mentés...' : 'Mentés'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </td>
                                        ` : html`
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">${course.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">${course.date}</div>
                                                <div className="text-sm text-gray-500">${course.startTime} - ${course.endTime}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className=${`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isFull ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                        ${course.bookingsCount || 0} / ${course.capacity}
                                                    </span>
                                                    ${(course.waitlistCount > 0 && course.name !== "Elsősegély tanfolyam") && html`
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800" title="Várólistán lévők száma">
                                                            V: ${course.waitlistCount}
                                                        </span>
                                                    `}
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
                                                    onClick=${() => startEditingCourse(course)}
                                                    className="text-amber-600 hover:text-amber-900 ml-4"
                                                    title="Foglalkozás szerkesztése"
                                                >
                                                    <${Icons.EditIcon} size=${20} />
                                                </button>
                                                <button 
                                                    onClick=${() => handleDeleteCourse(course.id, course.name)}
                                                    className="text-red-600 hover:text-red-900 ml-4"
                                                    title="Foglalkozás törlése"
                                                >
                                                    <${Icons.TrashIcon} size=${20} />
                                                </button>
                                            </td>
                                        `}
                                    </tr>
                                `;
                            })}
                        </tbody>
                    </table>
                </div>

                ${totalPages > 1 && html`
                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Összesen: <span className="font-medium">${currentList.length}</span> foglalkozás
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick=${() => handlePageChange(currentPage - 1)}
                                disabled=${currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Előző
                            </button>
                            <span className="px-3 py-1 text-sm text-gray-700 font-medium">
                                ${currentPage} / ${totalPages}
                            </span>
                            <button
                                onClick=${() => handlePageChange(currentPage + 1)}
                                disabled=${currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Következő
                            </button>
                        </div>
                    </div>
                `}
            </div>

            ${selectedCourseForBookings && html`
                <${CourseBookingsModal} 
                    course=${selectedCourseForBookings}
                    onClose=${() => setSelectedCourseForBookings(null)}
                    isTestView=${isTestView}
                />
            `}

            ${isBulkStudentRegistrationOpen && html`
                <${BulkStudentRegistrationModal} 
                    courses=${courses}
                    onClose=${() => setIsBulkStudentRegistrationOpen(false)}
                    isTestView=${isTestView}
                />
            `}

            ${cancelCourseModal.isOpen && html`
                <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-60 p-4">
                    <div className="relative w-full max-w-md rounded-lg bg-white shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between rounded-t border-b p-4 bg-red-50">
                            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                                <${Icons.AlertTriangleIcon} size=${20} className="text-red-600" />
                                Foglalkozás törlése
                            </h3>
                            <button onClick=${() => setCancelCourseModal({ isOpen: false, courseId: null, courseName: '' })} className="text-gray-400 hover:text-gray-900">
                                <${Icons.XIcon} size=${20} />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-gray-700 mb-4 text-sm">
                                Biztosan törölni szeretnéd a(z) <strong>${cancelCourseModal.courseName}</strong> foglalkozást?
                                A művelet nem vonható vissza, és minden jelentkező értesítést kap.
                            </p>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Törlés indoka (opcionális)
                            </label>
                            <textarea
                                rows="3"
                                value=${cancelCourseReason}
                                onChange=${(e) => setCancelCourseReason(e.target.value)}
                                placeholder="Ez az indoklás bekerül a hallgatóknak kiküldött e-mailbe..."
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            ></textarea>
                        </div>
                        <div className="flex items-center justify-end gap-3 rounded-b border-t p-4 bg-gray-50">
                            <button
                                onClick=${() => setCancelCourseModal({ isOpen: false, courseId: null, courseName: '' })}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100"
                            >
                                Mégse
                            </button>
                            <button
                                onClick=${confirmCourseCancellation}
                                disabled=${isCancellingCourse}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                ${isCancellingCourse ? html`<span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Törlés...` : 'Foglalkozás törlése'}
                            </button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

export default AppointmentsTab;
