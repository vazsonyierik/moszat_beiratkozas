export const auth = { currentUser: null };
export const signInAnonymously = () => { auth.currentUser = { uid: '123' }; return Promise.resolve(); };
export const db = {};
export const collection = () => {};
export const where = () => {};
export const onSnapshot = (q, cb) => {
    setTimeout(() => cb({ docs: [
        { id: '1', data: () => ({ name: 'Elsősegély tanfolyam', date: '2026-05-10', startTime: '08:00', endTime: '12:00', capacity: 20, bookingsCount: 5 }) },
        { id: '2', data: () => ({ name: '1. modul', date: '2026-05-15', startTime: '14:00', endTime: '16:00', capacity: 15, bookingsCount: 15 }) }
    ] }), 100);
    return () => {};
};
export const query = () => {};
export const functions = {};
export const httpsCallable = () => async () => { return { success: true }};
export const orderBy = () => {};
export const deleteDoc = () => Promise.resolve();
export const doc = () => {};
export const serverTimestamp = () => {};
export const updateDoc = () => Promise.resolve();
export const setDoc = () => Promise.resolve();
export const getDocs = () => Promise.resolve({docs:[]});
export const Timestamp = { now: () => ({}), fromDate: () => ({}) };
