import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, 
    serverTimestamp, 
    collection, 
    doc, 
    onSnapshot, 
    updateDoc, 
    setDoc, // ÚJ
    deleteDoc,
    query,
    orderBy,
    addDoc,
    getDoc,
    getDocs,
    where,
    deleteField,
    Timestamp,
    limit // ÚJ
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { 
    getFunctions, 
    httpsCallable 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyCuZrleVz4n_c6BZPQVklquGcjw9KOwEB8",
  authDomain: "moszat-jelentkezes.firebaseapp.com",
  projectId: "moszat-jelentkezes",
  storageBucket: "moszat-jelentkezes.appspot.com",
  messagingSenderId: "594096075495",
  appId: "1:594096075495:web:4d7d83cbccdcf1f5c4e842",
  measurementId: "G-LCFNYC2K0M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// JAVÍTÁS: A Cloud Functions régiójának megadása
const functions = getFunctions(app, 'europe-west1');

// ÚJ: Segédfüggvény a teszt mód detektálására
const isTestMode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('test') === 'true';
};

// ÚJ: Segédfüggvény a megfelelő gyűjtemény nevének lekérésére
const getCollectionName = (baseName) => {
    if (isTestMode() && baseName === 'registrations') {
        return 'registrations_test';
    }
    return baseName;
};

export { 
    app, 
    auth, 
    db,
    functions,
    httpsCallable,
    onAuthStateChanged, 
    serverTimestamp,
    collection,
    doc,
    onSnapshot,
    updateDoc,
    setDoc, // ÚJ
    deleteDoc,
    query,
    orderBy,
    addDoc,
    getDoc,
    getDocs,
    where,
    deleteField,
    limit, // ÚJ
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut,
    Timestamp,
    isTestMode, // Exportáljuk, hogy más komponensek is használhassák
    getCollectionName // Exportáljuk a dinamikus kollekció választáshoz
};
