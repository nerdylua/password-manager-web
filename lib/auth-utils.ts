import { auth } from './firebase';

/**
 * Force refresh Firebase Auth token and log debugging information
 */
export const debugAndRefreshAuth = async () => {
  const user = auth.currentUser;
  
  console.log('🔧 Auth Debug and Refresh:', {
    hasCurrentUser: !!user,
    userUid: user?.uid,
    userEmail: user?.email
  });

  if (!user) {
    throw new Error('No authenticated user found');
  }

  try {
    // Force token refresh
    console.log('🔄 Forcing token refresh...');
    const newToken = await user.getIdToken(true);
    
    console.log('✅ Token refreshed successfully:', {
      tokenLength: newToken.length,
      tokenPreview: newToken.substring(0, 20) + '...'
    });

    return newToken;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    throw error;
  }
};

/**
 * Check if current user matches expected user ID
 */
export const validateCurrentUser = (expectedUserId: string) => {
  const user = auth.currentUser;
  
  const validation = {
    hasCurrentUser: !!user,
    currentUserUid: user?.uid,
    expectedUserId,
    match: user?.uid === expectedUserId,
    userReady: !!user && !!user.uid
  };
  
  console.log('🔍 User Validation:', validation);
  
  if (!user) {
    throw new Error('No authenticated user');
  }
  
  if (user.uid !== expectedUserId) {
    throw new Error(`User ID mismatch: expected ${expectedUserId}, got ${user.uid}`);
  }
  
  return validation;
}; 