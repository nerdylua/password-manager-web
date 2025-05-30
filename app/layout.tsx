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

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, masterPasswordVerified } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Allow authenticated users to access home page - no auto-redirect
    // They can choose to logout or navigate to dashboard manually

    // If user is not authenticated and trying to access protected pages
    if (!user && (pathname.startsWith('/vault') || pathname.startsWith('/dashboard'))) {
      router.push('/auth/login');
      return;
    }

    // If user is authenticated but hasn't entered master password and trying to access protected pages
    if (user && !masterPasswordVerified && (pathname.startsWith('/vault') || pathname.startsWith('/dashboard'))) {
      router.push('/auth/login');
      return;
    }

    // Restrict vault access - only accessible via dashboard navigation, not direct URL
    if (pathname.startsWith('/vault') && user && masterPasswordVerified) {
      // Check if user came from dashboard (using referrer or session storage)
      const cameFromDashboard = sessionStorage.getItem('vaultAccessAuthorized');
      if (!cameFromDashboard) {
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
      <body className={`${inter.className} overscroll-none`}>
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
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                },
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
