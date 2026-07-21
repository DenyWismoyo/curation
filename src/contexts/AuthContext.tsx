// src/contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          let currentRole: any = 'user';

          // 1. Cek apakah Admin mendaftarkan role menggunakan ID berupa Email
          const emailRef = doc(db, 'users', currentUser.email || '');
          const emailSnap = await getDoc(emailRef).catch(() => null);

          if (emailSnap && emailSnap.exists() && emailSnap.data().role === 'assessor') {
            currentRole = 'assessor';
            // Sinkronisasi data ke ID UID agar ke depannya sesuai standar Firestore
            await setDoc(doc(db, 'users', currentUser.uid), { 
              email: currentUser.email,
              displayName: currentUser.displayName,
              role: 'assessor', 
              updatedAt: new Date().toISOString() 
            }, { merge: true });
          } else {
            // 2. Jika tidak ada di Email, cek menggunakan ID berupa UID normal
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              currentRole = userSnap.data().role || 'user';
            } else {
              // Registrasi user baru di Firestore
              await setDoc(userRef, {
                email: currentUser.email,
                displayName: currentUser.displayName,
                role: 'user',
                createdAt: new Date().toISOString()
              });
            }
          }
          
          setRole(currentRole);
        } catch (error) {
          console.error("Gagal memeriksa role user:", error);
          setRole('user');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Gagal login dengan Google:", error);
    }
  };

  // Fungsi Baru: Daftar dengan Email & Password
  const registerWithEmail = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profil di Firebase Auth untuk menyimpan Nama
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // Simpan langsung ke Firestore agar data nama sinkron sejak awal
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        email: userCredential.user.email,
        displayName: name,
        role: 'user',
        createdAt: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error("Gagal mendaftar dengan email:", error);
      throw error; // Melempar error agar bisa ditangkap oleh UI (contoh: email sudah terdaftar)
    }
  };

  // Fungsi Baru: Login dengan Email
  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Gagal login dengan email:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithGoogle, registerWithEmail, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);