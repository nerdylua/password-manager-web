'use client';

// Patch the global localStorage on the server to provide a no-op mock
// This prevents errors from third-party libraries that access localStorage directly
// Node.js 22+ has a broken localStorage object from --localstorage-file flag when the path is invalid
if (typeof window === 'undefined' && typeof globalThis.localStorage !== 'undefined') {
  const noopStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0
  };
  (globalThis as unknown as { localStorage: typeof noopStorage }).localStorage = noopStorage;
  (globalThis as unknown as { sessionStorage: typeof noopStorage }).sessionStorage = noopStorage;
}

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
import { getCryptoWorker } from '@/lib/crypto-worker';
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
  getMasterPassword: () => Promise<string | null>;
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
  clearAllSessionData: () => void;
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

// SSR-safe check for browser environment - lazy check to avoid issues during module initialization
const canUseStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Check if localStorage and sessionStorage exist and their methods are actual functions
  try {
    const ls = window.localStorage;
    const ss = window.sessionStorage;
    if (!ls || !ss) return false;
    if (typeof ls.getItem !== 'function') return false;
    if (typeof ls.setItem !== 'function') return false;
    if (typeof ls.removeItem !== 'function') return false;
    if (typeof ss.getItem !== 'function') return false;
    if (typeof ss.setItem !== 'function') return false;
    if (typeof ss.removeItem !== 'function') return false;
    return true;
  } catch {
    return false;
  }
};

// SSR-safe localStorage wrapper - MUST use window.localStorage to avoid Node.js's broken global localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!canUseStorage()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!canUseStorage()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (key: string): void => {
    if (!canUseStorage()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
  keys: (): string[] => {
    if (!canUseStorage()) return [];
    try {
      return Object.keys(window.localStorage);
    } catch {
      return [];
    }
  }
};

// SSR-safe sessionStorage wrapper
const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!canUseStorage()) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!canUseStorage()) return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (key: string): void => {
    if (!canUseStorage()) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

// Cookie management utilities
const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof window === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
};

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
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

  // Encrypt master password for memory storage using crypto worker
  const encryptForSession = async (password: string, key: string): Promise<string> => {
    try {
      const cryptoWorker = getCryptoWorker();
      return await cryptoWorker.encryptForSession(password, key);
    } catch (error) {
      // Fallback to synchronous encryption if worker fails
      console.warn('Crypto worker failed, using synchronous encryption:', error);
      // Generate random IV for each encryption
      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      const encrypted = CryptoJS.AES.encrypt(password, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      // Prepend IV to ciphertext for storage
      return iv.toString() + ':' + encrypted.toString();
    }
  };

  // Decrypt master password from memory storage using crypto worker
  const decryptFromSession = async (encryptedData: string, key: string): Promise<string> => {
    try {
      const cryptoWorker = getCryptoWorker();
      return await cryptoWorker.decryptFromSession(encryptedData, key);
    } catch (error) {
      // Fallback to synchronous decryption if worker fails
      console.warn('Crypto worker failed, using synchronous decryption:', error);
      // Split IV and ciphertext
      const parts = encryptedData.split(':');
      if (parts.length !== 2) throw new Error('Invalid encrypted data format');
      const ivHex = parts[0];
      const ciphertext = parts[1];
      
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: CryptoJS.enc.Hex.parse(ivHex),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    }
  };

  // Get master password (decrypted) - now async
  const getMasterPassword = useCallback(async (): Promise<string | null> => {
    if (!encryptedMasterPassword || !sessionKey) {
      return null;
    }
    try {
      return await decryptFromSession(encryptedMasterPassword, sessionKey);
    } catch {
      return null;
    }
  }, [encryptedMasterPassword, sessionKey]);

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

  // Helper function to clear all session data (for logout or cleanup)
  const clearAllSessionData = useCallback(() => {
    // Clear master password from memory
    setEncryptedMasterPassword(null);
    setSessionKey(null);
    setMasterPasswordVerified(false);
    
    // Skip storage operations if not in browser
    if (!canUseStorage()) return;
    
    // Clear all session storage items
    safeSessionStorage.removeItem('mpv');
    safeSessionStorage.removeItem('sessionKey');
    safeSessionStorage.removeItem('encryptedMasterPassword');
    safeSessionStorage.removeItem('vaultAccessAuthorized');
    safeSessionStorage.removeItem('highlightSecurityIssues');
    safeSessionStorage.removeItem('pageRefreshMarker');
    safeSessionStorage.removeItem('sessionId');
    
    // Clear localStorage items related to tab close detection
    const sessionId = safeSessionStorage.getItem('sessionId');
    if (sessionId) {
      safeLocalStorage.removeItem(`refresh_${sessionId}`);
      safeLocalStorage.removeItem(`refresh_${sessionId}_timestamp`);
      safeLocalStorage.removeItem(`tab_hidden_${sessionId}`);
    }
    safeLocalStorage.removeItem('tabClosed');
    safeLocalStorage.removeItem('tabClosedTimestamp');
    
    // Clear cookies
    deleteCookie('auth-token');
    deleteCookie('master-password-verified');
  }, []);

  // Enhanced session management for better tab close/refresh detection
  useEffect(() => {
    if (!canUseStorage()) return;

    // Enhanced tab close detection with localStorage coordination
    const sessionId = safeSessionStorage.getItem('sessionId') || crypto.randomUUID();
    safeSessionStorage.setItem('sessionId', sessionId);
    
    // Track if this is a page refresh by checking if the session was marked as refreshing
    const isPageRefresh = safeLocalStorage.getItem(`refresh_${sessionId}`) === 'true';
    
    // Clean up old session refresh markers (older than 5 seconds)
    const cleanupOldMarkers = () => {
      safeLocalStorage.keys().forEach(key => {
        if (key.startsWith('refresh_') && key !== `refresh_${sessionId}`) {
          const timestamp = safeLocalStorage.getItem(`${key}_timestamp`);
          if (!timestamp || Date.now() - parseInt(timestamp) > 5000) {
            safeLocalStorage.removeItem(key);
            safeLocalStorage.removeItem(`${key}_timestamp`);
          }
        }
      });
    };
    cleanupOldMarkers();

    // Handle tab state management for new tabs (not refreshes)
    const handleTabStateManagement = () => {
      // Only clear stale session data if this is a new tab (not a refresh)
      if (user && !masterPasswordVerified && !isPageRefresh) {
        console.log('New tab detected, clearing stale session data');
        safeSessionStorage.removeItem('mpv');
        safeSessionStorage.removeItem('sessionKey');
        safeSessionStorage.removeItem('encryptedMasterPassword');
        deleteCookie('master-password-verified');
        
        // Clear vault access authorization to prevent inconsistent state
        safeSessionStorage.removeItem('vaultAccessAuthorized');
        safeSessionStorage.removeItem('highlightSecurityIssues');
      }
    };

    // Only run this logic for new tabs (not refreshes)
    if (!isPageRefresh) {
      handleTabStateManagement();
    }

    // Clear the refresh marker after processing
    safeLocalStorage.removeItem(`refresh_${sessionId}`);
    safeLocalStorage.removeItem(`refresh_${sessionId}_timestamp`);

    // Enhanced beforeunload handler to mark page refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Mark this as a potential refresh
      safeLocalStorage.setItem(`refresh_${sessionId}`, 'true');
      safeLocalStorage.setItem(`refresh_${sessionId}_timestamp`, Date.now().toString());
      
      // Set a timer to remove the marker if the page doesn't load again
      // This will catch actual tab closes
      setTimeout(() => {
        const stillMarked = safeLocalStorage.getItem(`refresh_${sessionId}`);
        if (stillMarked === 'true') {
          // Tab was actually closed, not refreshed
          console.log('Tab close detected, logging out user');
          safeLocalStorage.removeItem(`refresh_${sessionId}`);
          safeLocalStorage.removeItem(`refresh_${sessionId}_timestamp`);
          
          // Clear all session data for this session
          if (user) {
            // Use a different approach for tab close logout
            // Set a flag that will be checked on next page load
            safeLocalStorage.setItem('tabClosed', 'true');
            safeLocalStorage.setItem('tabClosedTimestamp', Date.now().toString());
          }
        }
      }, 1000);
    };

    // Handle page visibility changes for additional tab close detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Mark potential tab close
        safeLocalStorage.setItem(`tab_hidden_${sessionId}`, Date.now().toString());
        
        // If tab stays hidden for too long, consider it closed
        setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            const hiddenTime = safeLocalStorage.getItem(`tab_hidden_${sessionId}`);
            if (hiddenTime && Date.now() - parseInt(hiddenTime) > 2000) {
              // Tab has been hidden for more than 2 seconds, likely closed
              safeLocalStorage.setItem('tabClosed', 'true');
              safeLocalStorage.setItem('tabClosedTimestamp', Date.now().toString());
            }
          }
        }, 2000);
      } else if (document.visibilityState === 'visible') {
        // Tab became visible again, clear hidden marker
        safeLocalStorage.removeItem(`tab_hidden_${sessionId}`);
      }
    };

    // Check for tab close flag on mount
    const checkTabCloseFlag = () => {
      const tabClosed = safeLocalStorage.getItem('tabClosed');
      const tabClosedTimestamp = safeLocalStorage.getItem('tabClosedTimestamp');
      
      if (tabClosed === 'true' && tabClosedTimestamp) {
        const timeSinceClose = Date.now() - parseInt(tabClosedTimestamp);
        
        // If tab close was recent (within 10 seconds), log out
        if (timeSinceClose < 10000 && user) {
          console.log('Previous tab close detected, logging out user');
          clearAllSessionData();
          signOut(auth).catch(() => {
            // Ignore signout errors during cleanup
          });
        }
        
        // Clear the flags
        safeLocalStorage.removeItem('tabClosed');
        safeLocalStorage.removeItem('tabClosedTimestamp');
      }
    };

    // Check for tab close flag immediately
    checkTabCloseFlag();

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up this session's markers
      safeLocalStorage.removeItem(`refresh_${sessionId}`);
      safeLocalStorage.removeItem(`refresh_${sessionId}_timestamp`);
      safeLocalStorage.removeItem(`tab_hidden_${sessionId}`);
    };
  }, [user, masterPasswordVerified, clearAllSessionData]);

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
        
        // Enhanced session restoration with validation
        const mpvSession = safeSessionStorage.getItem('mpv');
        const storedSessionKey = safeSessionStorage.getItem('sessionKey');
        const storedEncryptedPassword = safeSessionStorage.getItem('encryptedMasterPassword');
        const sessionId = safeSessionStorage.getItem('sessionId');
        
        // Only restore session if all conditions are met and it's not a fresh start after tab close
        if (mpvSession === 'verified' && 
            storedSessionKey && 
            storedEncryptedPassword && 
            sessionId &&
            !safeLocalStorage.getItem('tabClosed')) {
          
          // Run validation asynchronously to avoid blocking
          const validateSession = async () => {
            try {
              const cryptoWorker = getCryptoWorker();
              const isValid = await cryptoWorker.validateSessionData(storedEncryptedPassword, storedSessionKey);
              
              if (isValid) {
                setMasterPasswordVerified(true);
                setSessionKey(storedSessionKey);
                setEncryptedMasterPassword(storedEncryptedPassword);
                setCookie('master-password-verified', 'true', 1);
              } else {
                throw new Error('Invalid encrypted password');
              }
            } catch (error) {
              // If validation fails, clear potentially corrupted session data
              console.warn('Session validation failed, clearing corrupted data:', error);
              safeSessionStorage.removeItem('mpv');
              safeSessionStorage.removeItem('sessionKey');
              safeSessionStorage.removeItem('encryptedMasterPassword');
              deleteCookie('master-password-verified');
            }
          };

          // Use scheduler API if available, otherwise requestIdleCallback
          if (window.scheduler && 'postTask' in window.scheduler) {
            window.scheduler.postTask(validateSession, { priority: 'background' });
          } else if ('requestIdleCallback' in window) {
            requestIdleCallback(() => validateSession(), { timeout: 2000 });
          } else {
            setTimeout(validateSession, 0);
          }
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
        safeSessionStorage.removeItem('mpv');
        safeSessionStorage.removeItem('sessionKey');
        safeSessionStorage.removeItem('encryptedMasterPassword');
        // Clear vault access and other session data
        safeSessionStorage.removeItem('vaultAccessAuthorized');
        safeSessionStorage.removeItem('highlightSecurityIssues');
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

      // Generate user salt for master password hashing (do this once)
      const userSalt = ZeroKnowledgeEncryption.generateSalt();

      // Prepare test string for vault verification
      const testString = `vault-test-${user.uid}-${Date.now()}`;

      // Start Firebase profile update immediately (async operation)
      const profileUpdatePromise = updateProfile(user, { displayName });

      // Run crypto operations with micro-task scheduling to prevent UI blocking
      const [masterPasswordHash, masterPasswordFastHash, vaultTestData] = await Promise.all([
        // Use setTimeout to schedule crypto work in next tick
        new Promise<string>(resolve => {
          setTimeout(() => {
            resolve(ZeroKnowledgeEncryption.hashForRegistration(masterPassword, userSalt));
          }, 0);
        }),
        new Promise<string>(resolve => {
          setTimeout(() => {
            resolve(ZeroKnowledgeEncryption.fastHash(masterPassword, userSalt));
          }, 0);
        }),
        new Promise<EncryptedData>(resolve => {
          setTimeout(() => {
            resolve(ZeroKnowledgeEncryption.encryptForRegistration(testString, masterPassword));
          }, 0);
        })
      ]);

      // Wait for profile update to complete
      await profileUpdatePromise;

      // Create user profile document with pre-computed values
      const userProfileData: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        masterPasswordHash,
        masterPasswordSalt: userSalt,
        masterPasswordFastHash,
        masterPasswordHint: hint || null,
        vaultTestData,
        settings: {
          theme: 'system',
          autoLockTimeout: 15,
          language: 'en'
        }
      };

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', user.uid), userProfileData);
      
      // Automatically verify master password since it was just set during registration
      setMasterPasswordVerified(true);
      safeSessionStorage.setItem('mpv', 'verified');
      setCookie('master-password-verified', 'true', 1);

      // Securely store master password in encrypted memory
      const newSessionKey = generateSessionKey();
      const encryptedPassword = await encryptForSession(masterPassword, newSessionKey);
      setSessionKey(newSessionKey);
      setEncryptedMasterPassword(encryptedPassword);

      // Persist in sessionStorage for page refreshes
      safeSessionStorage.setItem('sessionKey', newSessionKey);
      safeSessionStorage.setItem('encryptedMasterPassword', encryptedPassword);

    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const logout = async () => {
    try {
      // Clear all session data first
      clearAllSessionData();
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Additional cleanup will happen in onAuthStateChanged callback
    } catch (error: any) {
      // Even if Firebase signout fails, clear local data
      clearAllSessionData();
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
          safeSessionStorage.setItem('mpv', 'verified');
          setCookie('master-password-verified', 'true', 1);
          
          // Securely store master password in encrypted memory and sessionStorage
          const newSessionKey = generateSessionKey();
          const encryptedPassword = await encryptForSession(masterPassword, newSessionKey);
          setSessionKey(newSessionKey);
          setEncryptedMasterPassword(encryptedPassword);
          
          // Persist in sessionStorage for page refreshes
          safeSessionStorage.setItem('sessionKey', newSessionKey);
          safeSessionStorage.setItem('encryptedMasterPassword', encryptedPassword);
          
          return true;
        }
        return false; // Wrong password
      }
      
      // Fallback to full hash verification (for accounts without fast hash)
      if (userProfile.masterPasswordHash && userProfile.masterPasswordSalt) {
        const inputHash = ZeroKnowledgeEncryption.hash(masterPassword, userProfile.masterPasswordSalt);
        if (inputHash === userProfile.masterPasswordHash) {
          setMasterPasswordVerified(true);
          safeSessionStorage.setItem('mpv', 'verified');
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
          const encryptedPassword = await encryptForSession(masterPassword, newSessionKey);
          setSessionKey(newSessionKey);
          setEncryptedMasterPassword(encryptedPassword);
          
          // Persist in sessionStorage for page refreshes
          safeSessionStorage.setItem('sessionKey', newSessionKey);
          safeSessionStorage.setItem('encryptedMasterPassword', encryptedPassword);
          
          return true;
        }
        return false; // Wrong password
      }
      
      // Fallback to encrypted test data verification (for very old accounts)
      const testString = ZeroKnowledgeEncryption.decrypt(userProfile.vaultTestData, masterPassword);
      const isValid = testString.startsWith(`vault-test-${user.uid}`);
      
      if (isValid) {
        setMasterPasswordVerified(true);
        safeSessionStorage.setItem('mpv', 'verified');
        setCookie('master-password-verified', 'true', 1); // 1 day expiry
        
        // Securely store master password in encrypted memory and sessionStorage
        const newSessionKey = generateSessionKey();
        const encryptedPassword = await encryptForSession(masterPassword, newSessionKey);
        setSessionKey(newSessionKey);
        setEncryptedMasterPassword(encryptedPassword);
        
        // Persist in sessionStorage for page refreshes
        safeSessionStorage.setItem('sessionKey', newSessionKey);
        safeSessionStorage.setItem('encryptedMasterPassword', encryptedPassword);
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

  const lockVault = useCallback(() => {
    setMasterPasswordVerified(false);
    // Clear master password from memory
    setEncryptedMasterPassword(null);
    setSessionKey(null);
    safeSessionStorage.removeItem('mpv');
    safeSessionStorage.removeItem('sessionKey');
    safeSessionStorage.removeItem('encryptedMasterPassword');
    safeSessionStorage.removeItem('vaultAccessAuthorized');
    safeSessionStorage.removeItem('highlightSecurityIssues');
    deleteCookie('master-password-verified');
  }, []);

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
    getErrorDetails: () => errorDetails,
    clearAllSessionData // Export for emergency cleanup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 