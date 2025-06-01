'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireMasterPassword?: boolean;
  redirectTo?: string;
}

export default function RouteGuard({ 
  children, 
  requireAuth = false, 
  requireMasterPassword = false,
  redirectTo = '/auth/login'
}: RouteGuardProps) {
  const { user, masterPasswordVerified, loading, clearAllSessionData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    // Enhanced validation for inconsistent states
    const validateAndCleanup = () => {
      // Check for potentially corrupted session state
      const mpvSession = sessionStorage.getItem('mpv');
      const hasSessionData = !!(mpvSession || sessionStorage.getItem('sessionKey'));
      
      // If we have session storage markers but no authentication state, clean up
      if (hasSessionData && !user) {
        console.warn('Cleaning up stale session data - user logged out');
        clearAllSessionData();
        return true;
      }
      
      // If user exists but master password verification is inconsistent
      if (user && hasSessionData && mpvSession === 'verified' && !masterPasswordVerified) {
        console.warn('Inconsistent master password verification state detected');
        // Clear stale master password verification
        sessionStorage.removeItem('mpv');
        sessionStorage.removeItem('sessionKey');
        sessionStorage.removeItem('encryptedMasterPassword');
        return true;
      }
      
      return false;
    };

    // Run validation and cleanup
    const wasCleanedUp = validateAndCleanup();
    
    // If we just cleaned up, wait for the next cycle
    if (wasCleanedUp) {
      setHasValidated(false);
      return;
    }

    // Check authentication requirements
    if (requireAuth && !user) {
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set('redirectTo', pathname);
      router.replace(loginUrl.toString());
      return;
    }

    // Check master password requirements
    if (requireMasterPassword && user && !masterPasswordVerified) {
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set('redirectTo', pathname);
      loginUrl.searchParams.set('step', 'master-password');
      router.replace(loginUrl.toString());
      return;
    }

    // All validations passed
    setHasValidated(true);
  }, [user, masterPasswordVerified, loading, router, pathname, requireAuth, requireMasterPassword, redirectTo, clearAllSessionData]);

  // Show loading state while checking authentication
  if (loading || !hasValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : 'Validating session...'}
          </p>
        </div>
      </div>
    );
  }

  // Don't render protected content if requirements aren't met
  if (requireAuth && !user) {
    return null;
  }

  if (requireMasterPassword && (!user || !masterPasswordVerified)) {
    return null;
  }

  return <>{children}</>;
} 