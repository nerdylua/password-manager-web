// Debug utility for authentication issues
import { auth } from './firebase';

export const debugAuthState = () => {
  const user = auth.currentUser;
  
  if (!user) {
    console.log('🔴 No authenticated user');
    return null;
  }
  
  console.log('🟢 Authenticated user:', {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified
  });
  
  return {
    uid: user.uid,
    email: user.email,
    isAuthenticated: true
  };
};

export const debugDocumentPermissions = (documentUserId: string, currentUserId: string) => {
  console.log('🔍 Permission check:', {
    documentUserId,
    currentUserId,
    match: documentUserId === currentUserId,
    documentUserIdType: typeof documentUserId,
    currentUserIdType: typeof currentUserId
  });
  
  return documentUserId === currentUserId;
}; 