"use client";
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cette fonction surveille les changements d'état (connexion/déconnexion)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAnonymously = () => signInAnonymously(auth);
  const logout = () => signOut(auth);

  return { user, loading, loginAnonymously, logout };
}