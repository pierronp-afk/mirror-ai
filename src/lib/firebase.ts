import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// On récupère la configuration sécurisée depuis le fichier .env.local
const configRaw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
let firebaseConfig = {};

try {
    firebaseConfig = configRaw ? JSON.parse(configRaw) : {};
} catch (error) {
    console.error("Erreur de parsing de la configuration Firebase (NEXT_PUBLIC_FIREBASE_CONFIG):", error);
}

// On initialise l'application (le Singleton évite de l'initialiser deux fois)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// On exporte les services pour que "useAuth.ts" puisse les utiliser
export const auth = getAuth(app);
export const db = getFirestore(app);