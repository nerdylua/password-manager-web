'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ZeroKnowledgeEncryption, EncryptedData } from '@/lib/encryption';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: number;
  lastLoginAt: number;
  masterPasswordHash: string | null;
  masterPasswordSalt: string | null; // Salt for master password hash
  masterPasswordFastHash: string | null; // Fast hash for login verification
  masterPasswordHint: string | null;
  vaultTestData: EncryptedData; // Backup verification method
  settings: {
    theme: 'light' | 'dark' | 'system';
    autoLockTimeout: number; // in minutes
    language: string;
  };
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  masterPasswordVerified: boolean;
  getMasterPassword: () => string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, masterPassword: string, hint?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyMasterPassword: (masterPassword: string) => Promise<boolean>;
  updateMasterPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  lockVault: () => void;
  errorDetails: {
    error: unknown;
    context: string;
    timestamp: number;
  } | null;
  getErrorDetails: () => {
    error: unknown;
    context: string;
    timestamp: number;
  } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// Cookie management utilities
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;secure;samesite=strict`;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [masterPasswordVerified, setMasterPasswordVerified] = useState(false);
  const [encryptedMasterPassword, setEncryptedMasterPassword] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    error: unknown;
    context: string;
    timestamp: number;
  } | null>(null);

  // Generate session key for encrypting master password in memory
  const generateSessionKey = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Encrypt master password for memory storage
  const encryptForSession = (password: string, key: string): string => {
    // Use a lighter encryption for session storage to improve performance
    const encrypted = CryptoJS.AES.encrypt(password, key).toString();
    return encrypted;
  };

  // Decrypt master password from memory storage
  const decryptFromSession = (encryptedData: string, key: string): string => {
    // Use lighter decryption for session storage
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  };

  // Get master password (decrypted)
  const getMasterPassword = (): string | null => {
    if (!encryptedMasterPassword || !sessionKey) {
      return null;
    }
    try {
      return decryptFromSession(encryptedMasterPassword, sessionKey);
    } catch {
      return null;
    }
  };

  // Helper function to log and store error details
  const logAndStoreError = (error: unknown, context: string) => {
    console.error(`Error in ${context}:`, error);
    setErrorDetails({
      error,
      context,
      timestamp: Date.now()
    });
    
    // Clear error details after 30 seconds
    setTimeout(() => {
      setErrorDetails(null);
    }, 30000);
  };

  // Load user profile
  const loadUserProfile = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        setUserProfile(profileData);
        
        // Update last login time
        await updateDoc(doc(db, 'users', uid), {
          lastLoginAt: Date.now()
        });
      }
    } catch (error) {
      logAndStoreError(error, 'loading user profile');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Set authentication cookie
        setCookie('auth-token', 'authenticated', 7);
        
        // Load user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile;
            setUserProfile(profileData);
            
            // Update last login time
            await updateDoc(doc(db, 'users', user.uid), {
              lastLoginAt: Date.now()
            });
          }
        } catch (error) {
          logAndStoreError(error, 'loading user profile');
        }
        
        // Check if master password was previously verified in this session
        const mpvSession = sessionStorage.getItem('mpv');
        const storedSessionKey = sessionStorage.getItem('sessionKey');
        const storedEncryptedPassword = sessionStorage.getItem('encryptedMasterPassword');
        
        if (mpvSession === 'verified' && storedSessionKey && storedEncryptedPassword) {
          setMasterPasswordVerified(true);
          setSessionKey(storedSessionKey);
          setEncryptedMasterPassword(storedEncryptedPassword);
          setCookie('master-password-verified', 'true', 1); // 1 day expiry
        }
      } else {
        setUserProfile(null);
        setMasterPasswordVerified(false);
        // Clear master password from memory
        setEncryptedMasterPassword(null);
        setSessionKey(null);
        // Clear cookies on logout
        deleteCookie('auth-token');
        deleteCookie('master-password-verified');
        sessionStorage.removeItem('mpv');
        sessionStorage.removeItem('sessionKey');
        sessionStorage.removeItem('encryptedMasterPassword');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Cookie will be set in the onAuthStateChanged callback
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    masterPassword: string,
    hint?: string | null
  ) => {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Generate user salt for master password hashing
      const userSalt = ZeroKnowledgeEncryption.generateSalt();

      // Create test data to verify master password later
      const testString = `vault-test-${user.uid}-${Date.now()}`;
      const vaultTestData = ZeroKnowledgeEncryption.encrypt(testString, masterPassword);

      // Create user profile document
      const userProfileData: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        masterPasswordHash: ZeroKnowledgeEncryption.hash(masterPassword, userSalt),
        masterPasswordSalt: userSalt,
        masterPasswordFastHash: ZeroKnowledgeEncryption.fastHash(masterPassword, userSalt),
        masterPasswordHint: hint || null,
        vaultTestData,
        settings: {
          theme: 'system',
          autoLockTimeout: 15,
          language: 'en'
        }
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      
      // Automatically verify master password since it was just set during registration
      setMasterPasswordVerified(true);
      sessionStorage.setItem('mpv', 'verified');
      setCookie('master-password-verified', 'true', 1);

      // Securely store master password in encrypted memory
      const newSessionKey = generateSessionKey();
      const encryptedPassword = encryptForSession(masterPassword, newSessionKey);
      setSessionKey(newSessionKey);
      setEncryptedMasterPassword(encryptedPassword);

      // Persist in sessionStorage for page refreshes
      sessionStorage.setItem('sessionKey', newSessionKey);
      sessionStorage.setItem('encryptedMasterPassword', encryptedPassword);

    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const logout = async () => {
    try {
      // Clear master password from memory
      setEncryptedMasterPassword(null);
      setSessionKey(null);
      // Clear sessionStorage
      sessionStorage.removeItem('mpv');
      sessionStorage.removeItem('sessionKey');
      sessionStorage.removeItem('encryptedMasterPassword');
      await signOut(auth);
      // Cookies will be cleared in the onAuthStateChanged callback
    } catch (error: any) {
      throw new Error(error.message || 'Failed to logout');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  const verifyMasterPassword = async (masterPassword: string): Promise<boolean> => {
    if (!user || !userProfile) {
      return false;
    }

    try {
      // Fast verification using stored fast hash (optimized for login performance)
      if (userProfile.masterPasswordFastHash && userProfile.masterPasswordSalt) {
        const inputFastHash = ZeroKnowledgeEncryption.fastHash(masterPassword, userProfile.masterPasswordSalt);
        if (inputFastHash === userProfile.masterPasswordFastHash) {
          setMasterPasswordVerified(true);
          sessionStorage.setItem('mpv', 'verified');
          setCookie('master-password-verified', 'true', 1);
          
          // Securely store master password in encrypted memory and sessionStorage
          const newSessionKey = generateSessionKey();
          const encryptedPassword = encryptForSession(masterPassword, newSessionKey);
          setSessionKey(newSessionKey);
          setEncryptedMasterPassword(encryptedPassword);
          
          // Persist in sessionStorage for page refreshes
          sessionStorage.setItem('sessionKey', newSessionKey);
          sessionStorage.setItem('encryptedMasterPassword', encryptedPassword);
          
          return true;
        }
        return false; // Wrong password
      }
      
      // Fallback to full hash verification (for accounts without fast hash)
      if (userProfile.masterPasswordHash && userProfile.masterPasswordSalt) {
        const inputHash = ZeroKnowledgeEncryption.hash(masterPassword, userProfile.masterPasswordSalt);
        if (inputHash === userProfile.masterPasswordHash) {
          setMasterPasswordVerified(true);
          sessionStorage.setItem('mpv', 'verified');
          setCookie('master-password-verified', 'true', 1);
          
          // Upgrade account with fast hash for future logins
          try {
            const fastHash = ZeroKnowledgeEncryption.fastHash(masterPassword, userProfile.masterPasswordSalt);
            await updateDoc(doc(db, 'users', user.uid), {
              masterPasswordFastHash: fastHash
            });
            setUserProfile({
              ...userProfile,
              masterPasswordFastHash: fastHash
            });
          } catch (error) {
            console.warn('Failed to upgrade account with fast hash:', error);
          }
          
          // Securely store master password in encrypted memory and sessionStorage
          const newSessionKey = generateSessionKey();
          const encryptedPassword = encryptForSession(masterPassword, newSessionKey);
          setSessionKey(newSessionKey);
          setEncryptedMasterPassword(encryptedPassword);
          
          // Persist in sessionStorage for page refreshes
          sessionStorage.setItem('sessionKey', newSessionKey);
          sessionStorage.setItem('encryptedMasterPassword', encryptedPassword);
          
          return true;
        }
        return false; // Wrong password
      }
      
      // Fallback to encrypted test data verification (for very old accounts)
      const testString = ZeroKnowledgeEncryption.decrypt(userProfile.vaultTestData, masterPassword);
      const isValid = testString.startsWith(`vault-test-${user.uid}`);
      
      if (isValid) {
        setMasterPasswordVerified(true);
        sessionStorage.setItem('mpv', 'verified');
        setCookie('master-password-verified', 'true', 1); // 1 day expiry
        
        // Securely store master password in encrypted memory and sessionStorage
        const newSessionKey = generateSessionKey();
        const encryptedPassword = encryptForSession(masterPassword, newSessionKey);
        setSessionKey(newSessionKey);
        setEncryptedMasterPassword(encryptedPassword);
        
        // Persist in sessionStorage for page refreshes
        sessionStorage.setItem('sessionKey', newSessionKey);
        sessionStorage.setItem('encryptedMasterPassword', encryptedPassword);
      }
      
      return isValid;
    } catch (error) {
      return false;
    }
  };

  const updateMasterPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !userProfile) {
      throw new Error('User not authenticated');
    }

    // Verify current master password
    const isCurrentValid = await verifyMasterPassword(currentPassword);
    if (!isCurrentValid) {
      throw new Error('Current master password is incorrect');
    }

    try {
      // Create new test data with new master password
      const testString = `vault-test-${user.uid}-${Date.now()}`;
      const newVaultTestData = ZeroKnowledgeEncryption.encrypt(testString, newPassword);

      // Update user profile with new test data
      await updateDoc(doc(db, 'users', user.uid), {
        vaultTestData: newVaultTestData
      });

      // Update local state
      setUserProfile({
        ...userProfile,
        vaultTestData: newVaultTestData
      });

    } catch (error: any) {
      throw new Error(error.message || 'Failed to update master password');
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userProfile) {
      throw new Error('User not authenticated');
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), updates);
      setUserProfile({ ...userProfile, ...updates });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const lockVault = () => {
    setMasterPasswordVerified(false);
    // Clear master password from memory
    setEncryptedMasterPassword(null);
    setSessionKey(null);
    sessionStorage.removeItem('mpv');
    sessionStorage.removeItem('sessionKey');
    sessionStorage.removeItem('encryptedMasterPassword');
    deleteCookie('master-password-verified');
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    masterPasswordVerified,
    getMasterPassword,
    signIn,
    signUp,
    logout,
    resetPassword,
    verifyMasterPassword,
    updateMasterPassword,
    updateUserProfile,
    lockVault,
    errorDetails,
    getErrorDetails: () => errorDetails
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 