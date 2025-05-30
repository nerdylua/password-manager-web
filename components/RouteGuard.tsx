'use client';

import { useEffect } from 'react';
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
  const { user, masterPasswordVerified, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

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
  }, [user, masterPasswordVerified, loading, router, pathname, requireAuth, requireMasterPassword, redirectTo]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
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