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
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, googleProvider, db, functions } from '@/lib/firebase';
import { ensureReferralVisitorId, getStoredReferralAttribution } from '@/lib/referralAttribution';

interface AuthContextType {
  user: User | null;
  role: 'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | 'curator' | 'study_author' | 'study_reviewer' | null;
  isPremium: boolean;
  b2bPersonas: string[];
  allowedOrganizations: string[];
  b2bOrganizationIds: string[];
  assessmentQuota: number;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string, consentData: { tosAccepted: boolean, privacyAccepted: boolean, cryptoRiskAccepted?: boolean }) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

type AuthClaims = {
  role?: string;
  b2bPersonas?: unknown;
  orgScopes?: unknown;
};

type WindowWithTokenRefreshFlag = Window & {
  __hasRefreshedToken?: boolean;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | 'curator' | 'study_author' | 'study_reviewer' | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [b2bPersonas, setB2bPersonas] = useState<string[]>([]);
  const [allowedOrganizations, setAllowedOrganizations] = useState<string[]>([]);
  const [b2bOrganizationIds, setB2bOrganizationIds] = useState<string[]>([]);
  const [assessmentQuota, setAssessmentQuota] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Baca Custom Claims
          const tokenResult = await currentUser.getIdTokenResult();
          const claims = tokenResult.claims as AuthClaims;
          
          let currentRole: 'user' | 'admin_omnifit' | 'admin_csrs' | 'assessor' | 'curator' | 'study_author' | 'study_reviewer' = 'user';
          let currentB2bPersonas: string[] = [];
          let currentAllowedOrganizations: string[] = [];
          let currentB2bOrganizationIds: string[] = [];
          
          const validRoles = new Set(['user', 'admin_omnifit', 'admin_csrs', 'assessor', 'curator', 'study_author', 'study_reviewer']);
          const pickRole = (raw: unknown): typeof currentRole => {
            if (typeof raw === 'string' && validRoles.has(raw)) {
              return raw as typeof currentRole;
            }
            return 'user';
          };

          if (claims.role && claims.role !== 'user') {
            currentRole = pickRole(claims.role);
            currentB2bPersonas = toStringArray(claims.b2bPersonas);
            currentAllowedOrganizations = toStringArray(claims.orgScopes);
            currentB2bOrganizationIds = toStringArray(claims.orgScopes);
          } else {
            // Fallback (Migration compatibility):
            const emailRef = doc(db, 'users', currentUser.email || '');
            const emailSnap = await getDoc(emailRef).catch(() => null);
            const roleFromEmailDoc = emailSnap?.exists() ? pickRole(emailSnap.data().role) : null;
            
            if (roleFromEmailDoc) currentRole = roleFromEmailDoc;
            if (emailSnap?.exists()) {
              const data = emailSnap.data();
              currentB2bPersonas = Array.isArray(data.b2bPersonas) ? data.b2bPersonas : [];
              currentAllowedOrganizations = Array.isArray(data.allowedOrganizations) ? data.allowedOrganizations : [];
              currentB2bOrganizationIds = Array.isArray(data.b2bOrganizationIds) ? data.b2bOrganizationIds : [];
              
              // Migrate email doc to UID doc
              await setDoc(doc(db, 'users', currentUser.uid), { 
                email: currentUser.email,
                displayName: currentUser.displayName,
                updatedAt: new Date().toISOString() 
              }, { merge: true });
            } else {
              const userRef = doc(db, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const data = userSnap.data();
                currentRole = pickRole(data.role);
                currentB2bPersonas = Array.isArray(data.b2bPersonas) ? data.b2bPersonas : [];
                currentAllowedOrganizations = Array.isArray(data.allowedOrganizations) ? data.allowedOrganizations : [];
                currentB2bOrganizationIds = Array.isArray(data.b2bOrganizationIds) ? data.b2bOrganizationIds : [];
              } else {
                await setDoc(userRef, {
                  email: currentUser.email,
                  displayName: currentUser.displayName,
                  role: 'user',
                  createdAt: new Date().toISOString()
                });
              }
            }
            
            // Periksa apakah claims perlu direfresh (User punya akses di Firestore tapi belum masuk ke Claims)
            const hasOrgsInFirestore = currentAllowedOrganizations.length > 0 || currentB2bOrganizationIds.length > 0;
            const hasOrgsInClaims = Array.isArray(claims.orgScopes) && claims.orgScopes.length > 0;
            
            if (hasOrgsInFirestore && !hasOrgsInClaims) {
              console.log('Force refreshing token to sync B2B claims...');
              await currentUser.getIdToken(true);
              // Refresh halaman agar claims baru terbaca dari awal
              const browserWindow = window as WindowWithTokenRefreshFlag;
              if (typeof window !== 'undefined' && !browserWindow.__hasRefreshedToken) {
                browserWindow.__hasRefreshedToken = true;
                setTimeout(() => window.location.reload(), 500);
              }
            }
          }

          try {
            const referral = getStoredReferralAttribution();
            const visitorId = ensureReferralVisitorId();
            if (referral?.affiliateCode && visitorId) {
              const bindAttribution = httpsCallable(functions, 'bindReferralAttributionToUser');
              await bindAttribution({ visitorId });
            }
          } catch (bindError) {
            console.warn('Gagal bind referral attribution saat login:', bindError);
          }
          
          setRole(currentRole);
          setB2bPersonas(currentB2bPersonas);
          setAllowedOrganizations(currentAllowedOrganizations);
          setB2bOrganizationIds(currentB2bOrganizationIds);

          // ✅ PERBAIKAN: Gunakan onSnapshot (real-time) agar kuota otomatis
          // terupdate di UI segera setelah webhook berhasil menambahkan kuota,
          // tanpa perlu user melakukan refresh halaman.
          const userRef = doc(db, 'users', currentUser.uid);
          unsubscribeSnapshot = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
              const data = userSnap.data();
              setAssessmentQuota(data.assessmentQuota || 0);
              
              let hasValidPremium = data.isPremium === true;
              if (hasValidPremium && data.premiumValidUntil) {
                const validUntilDate = new Date(data.premiumValidUntil);
                if (new Date() > validUntilDate) {
                  hasValidPremium = false;
                }
              }
              
              const premiumCheck = currentUser.email === 'deny.wismoyo@gmail.com' || currentRole === 'admin_csrs' || hasValidPremium;
              setIsPremium(premiumCheck);
            } else {
              setAssessmentQuota(0);
              const premiumCheck = currentUser.email === 'deny.wismoyo@gmail.com' || currentRole === 'admin_csrs';
              setIsPremium(premiumCheck);
            }
          }, (error) => {
            console.warn('onSnapshot quota error:', error);
            setAssessmentQuota(0);
            setIsPremium(currentUser.email === 'deny.wismoyo@gmail.com' || currentRole === 'admin_csrs');
          });

        } catch (error) {
          console.error("Gagal memeriksa role user:", error);
          setRole('user');
          setB2bPersonas([]);
          setAllowedOrganizations([]);
          setB2bOrganizationIds([]);
          setAssessmentQuota(0);
          setIsPremium(false);
        }
      } else {
        setRole(null);
        setB2bPersonas([]);
        setAllowedOrganizations([]);
        setB2bOrganizationIds([]);
        setAssessmentQuota(0);
        setIsPremium(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Gagal login dengan Google:", error);
    }
  };

  // Fungsi Baru: Daftar dengan Email & Password
  const registerWithEmail = async (email: string, password: string, name: string, consentData: { tosAccepted: boolean, privacyAccepted: boolean, cryptoRiskAccepted?: boolean }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profil di Firebase Auth untuk menyimpan Nama
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // Send Email Verification
      await sendEmailVerification(userCredential.user);

      // Simpan langsung ke Firestore agar data nama sinkron sejak awal
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
      
      await setDoc(userRef, {
        email: userCredential.user.email,
        displayName: name,
        role: 'user',
        createdAt: new Date().toISOString(),
        consentLog: {
          ...consentData,
          timestamp: new Date().toISOString(),
          userAgent
        }
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

  // Fungsi Baru: Reset Password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Gagal mengirim email reset password:", error);
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
    <AuthContext.Provider value={{ user, role, isPremium, b2bPersonas, allowedOrganizations, b2bOrganizationIds, assessmentQuota, loading, loginWithGoogle, registerWithEmail, loginWithEmail, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);