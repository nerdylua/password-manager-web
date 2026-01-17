'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Home, RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body className="app-shell app-section-muted flex items-center justify-center p-4 antialiased">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo and Status */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Shield className="h-16 w-16 text-red-600 dark:text-red-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-2 w-2 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">CryptLock</h1>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <div className="text-6xl md:text-7xl font-semibold text-red-600 dark:text-red-400 mb-4">
              Error
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-4">
              Something went wrong
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
              We encountered an unexpected error. Don't worry, your data remains secure and encrypted.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-red-50/80 dark:bg-red-900/30 border border-red-200/70 dark:border-red-800/70 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                  Development Error Details:
                </h3>
                <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto">
                  {error.message}
                </pre>
                {error.digest && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button 
              onClick={reset}
              size="lg" 
              className="w-full sm:w-auto app-cta shadow-sm hover:shadow-md transition-all duration-300"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Try Again
            </Button>
            
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full sm:w-auto app-cta-outline transition-all duration-300">
                <Home className="mr-2 h-5 w-5" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Security Assurance */}
          <div className="p-6 app-surface max-w-md mx-auto">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Your Data is Safe
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This error doesn't affect your encrypted data. All your passwords and information remain secure with zero-knowledge encryption.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
} 