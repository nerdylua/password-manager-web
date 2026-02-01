'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/hooks/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'react-hot-toast';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/AuthContext';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

// SSR-safe check for browser environment - lazy check to avoid issues during module initialization
const canUseStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.sessionStorage === 'undefined') return false;
  if (typeof window.sessionStorage.getItem !== 'function') return false;
  if (typeof window.sessionStorage.setItem !== 'function') return false;
  if (typeof window.sessionStorage.removeItem !== 'function') return false;
  return true;
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
  removeItem: (key: string): void => {
    if (!canUseStorage()) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, masterPasswordVerified } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!canUseStorage()) return;

    // Enhanced session state validation
    const validateSessionState = () => {
      // Check if this appears to be a fresh session (new tab/browser restart)
      const vaultAccessAuthorized = safeSessionStorage.getItem('vaultAccessAuthorized');
      
      // If user is authenticated but session markers are missing and trying to access vault
      if (user && masterPasswordVerified && pathname.startsWith('/vault') && !vaultAccessAuthorized) {
        // Clear potentially stale master password verification and redirect through dashboard
        safeSessionStorage.removeItem('mpv');
        safeSessionStorage.removeItem('sessionKey');
        safeSessionStorage.removeItem('encryptedMasterPassword');
        router.push('/dashboard');
        return true; // Indicate we handled the redirect
      }
      
      return false; // No redirect needed
    };

    // Run session validation
    if (validateSessionState()) return;

    // Allow authenticated users to access home page - no auto-redirect
    // They can choose to logout or navigate to dashboard manually

    // If user is not authenticated and trying to access protected pages
    if (!user && (pathname.startsWith('/vault') || pathname.startsWith('/dashboard'))) {
      router.push('/auth/login');
      return;
    }

    // If user is authenticated but hasn't entered master password and trying to access protected pages
    if (user && !masterPasswordVerified && (pathname.startsWith('/vault') || pathname.startsWith('/dashboard'))) {
      const loginUrl = new URL('/auth/login', window.location.origin);
      loginUrl.searchParams.set('redirectTo', pathname);
      loginUrl.searchParams.set('step', 'master-password');
      router.push(loginUrl.toString());
      return;
    }

    // Enhanced vault access control - ensure proper navigation flow
    if (pathname.startsWith('/vault') && user && masterPasswordVerified) {
      // Check if user came from dashboard or has proper authorization
      const cameFromDashboard = safeSessionStorage.getItem('vaultAccessAuthorized');
      if (!cameFromDashboard) {
        // Redirect through dashboard to establish proper session flow
        router.push('/dashboard');
        return;
      }
    }
  }, [router, pathname, user, masterPasswordVerified, loading]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>CryptLock</title>
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthRedirect>
              {children}
            </AuthRedirect>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
                },
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
