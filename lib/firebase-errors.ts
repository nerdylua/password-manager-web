/**
 * Converts Firebase error codes to user-friendly messages
 */
export function getFirebaseErrorMessage(error: unknown): string {
  // Handle Firebase-specific errors
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message?: string };
    
    switch (firebaseError.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/invalid-credential':
        return 'Invalid login credentials. Please check your email and password.';
      case 'auth/user-token-expired':
        return 'Your session has expired. Please sign in again.';
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please try again later.';
      case 'deadline-exceeded':
        return 'Request timed out. Please try again.';
      case 'resource-exhausted':
        return 'Service is temporarily overloaded. Please try again later.';
      default:
        // Log unknown Firebase errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Unknown Firebase error:', firebaseError.code, firebaseError.message);
        }
        return 'Something went wrong. Please try again later.';
    }
  }
  
  // Handle network errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorWithMessage = error as { message: string };
    if (errorWithMessage.message.includes('network') || errorWithMessage.message.includes('offline')) {
      return 'Please check your internet connection and try again.';
    }
  }
  
  // Generic error fallback
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Logs error details for debugging (development only)
 */
export function logError(error: unknown, context: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error in ${context}`);
    console.error('Error details:', error);
    if (error && typeof error === 'object' && 'stack' in error) {
      console.error('Stack trace:', (error as Error).stack);
    }
    console.groupEnd();
  }
} 