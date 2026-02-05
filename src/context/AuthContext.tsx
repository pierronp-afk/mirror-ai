"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    User,
    signInAnonymously,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult,
    linkWithRedirect,
    linkWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authError: string | null;
    loginAnonymously: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // Gérer le résultat de la redirection Google
        const handleRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    console.log('✅ Google sign-in successful');
                    setAuthError(null);
                }
            } catch (error: any) {
                console.error("❌ Erreur de redirection Google:", error);
                console.error("Error code:", error.code);
                console.error("Error message:", error.message);
                console.error("Full error:", error);

                // Messages d'erreur spécifiques
                if (error.code === 'auth/operation-not-allowed') {
                    setAuthError('⚠️ Google Auth n\'est pas activé dans Firebase Console. Veuillez l\'activer dans Authentication > Sign-in method.');
                } else if (error.code === 'auth/unauthorized-domain') {
                    setAuthError('⚠️ Ce domaine n\'est pas autorisé. Ajoutez-le dans Firebase Console > Authentication > Settings > Authorized domains.');
                } else if (error.code === 'auth/popup-blocked') {
                    setAuthError('La popup a été bloquée par votre navigateur.');
                } else {
                    setAuthError(`Erreur d'authentification: ${error.message}`);
                }
            }
        };

        handleRedirectResult();

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                console.log('🔄 Autentifié en tant que:', currentUser.email || 'Anonyme');
            } else {
                console.log('🔄 Non connecté');
            }
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginAnonymously = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Erreur de connexion anonyme:", error);
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        setAuthError(null);
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            // Si l'utilisateur est déjà en mode anonyme, on essaie de lier les comptes
            if (auth.currentUser && auth.currentUser.isAnonymous) {
                console.log('🔗 Attempting to link anonymous account with Google...');
                try {
                    await linkWithPopup(auth.currentUser, provider);
                    return;
                } catch (linkError: any) {
                    if (linkError.code === 'auth/popup-blocked' || linkError.code === 'auth/cancelled-popup-request') {
                        console.log('⚠️ Popup blocked, falling back to linking with redirect...');
                        await linkWithRedirect(auth.currentUser, provider);
                        return;
                    }
                    console.error('❌ Linking error:', linkError);
                    // Si l'erreur est que le compte existe déjà, on fait un login classique
                    if (linkError.code === 'auth/credential-already-in-use') {
                        console.log('ℹ️ Credential already in use, performing normal login...');
                    } else {
                        throw linkError;
                    }
                }
            }

            // Login classique pour les nouveaux utilisateurs ou utilisateurs non-anonymes
            console.log('🚀 Attempting Google login with popup...');
            try {
                await signInWithPopup(auth, provider);
                console.log('✅ Popup login successful');
            } catch (popupError: any) {
                console.warn('⚠️ Popup attempt failed, error code:', popupError.code);

                // Fallback vers redirect si la popup est bloquée ou s'il y a une erreur CORS/COOP
                if (
                    popupError.code === 'auth/popup-blocked' ||
                    popupError.code === 'auth/cancelled-popup-request' ||
                    popupError.code === 'auth/internal-error' ||
                    popupError.message.includes('cross-origin')
                ) {
                    console.log('🔄 Falling back to signInWithRedirect...');
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError;
                }
            }
        } catch (error: any) {
            console.error("❌ Erreur de connexion Google:", error);
            if (error.code === 'auth/operation-not-allowed') {
                setAuthError('⚠️ Google Auth n\'est pas activé dans Firebase Console.');
            } else {
                setAuthError(`Erreur: ${error.message}`);
            }
            throw error;
        }
    };

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, authError, loginAnonymously, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
