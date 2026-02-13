import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'analysisCache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Try to retrieve a cached AI analysis from Firestore.
 * Returns `null` on miss, if expired, or if Firestore is unavailable.
 */
export async function getFirestoreCache(key: string): Promise<string | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, key);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        const age = Date.now() - (data.timestamp || 0);

        if (age > CACHE_TTL_MS) {
            console.log(`⏳ Firestore entry expired — key: ${key}`);
            return null;
        }

        return data.analysis || null;
    } catch (err) {
        console.error('⚠️  Firestore GET error (falling back):', err);
        return null;
    }
}

/**
 * Store an AI analysis result in Firestore.
 */
export async function setFirestoreCache(key: string, data: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, key);
        await setDoc(docRef, {
            analysis: data,
            timestamp: Date.now()
        });
    } catch (err) {
        console.error('⚠️  Firestore SET error:', err);
    }
}
