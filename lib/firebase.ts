import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate required configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  // Log technical details in development only
  if (process.env.NODE_ENV === 'development') {
    console.error('Missing Firebase configuration keys:', missingKeys);
    console.error('Please check your .env.local file and ensure all required Firebase environment variables are set.');
  }
  
  // Throw a user-friendly error
  throw new Error('CryptLock is currently experiencing configuration issues. Please try again later or contact support if the problem persists.');
}

// Initialize Firebase with better error handling
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Firebase initialization failed:', error);
  }
  throw new Error('Unable to connect to CryptLock services. Please check your internet connection and try again.');
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Enable offline persistence for better performance
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support all required features for persistence.');
    }
  });
}

// Declare global type for emulator connection tracking
declare global {
  interface Window {
    FIRESTORE_EMULATOR_CONNECTED?: boolean;
  }
}

// Connect to emulator in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    // Only connect if not already connected
    if (!window.FIRESTORE_EMULATOR_CONNECTED) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      window.FIRESTORE_EMULATOR_CONNECTED = true;
    }
  } catch (error) {
    // Emulator might not be running, ignore error
    console.info('Firestore emulator not available, using production');
  }
}

export default app; 