'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/AuthContext';
import { getFirebaseErrorMessage, logError } from '@/lib/firebase-errors';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [step, setStep] = useState<'login' | 'master-password'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, verifyMasterPassword, userProfile, user, masterPasswordVerified, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get redirect parameters from middleware
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const stepParam = searchParams.get('step');
  
  // Enhanced redirect logic with better state management
  useEffect(() => {
    // Wait for auth state to fully load
    if (authLoading) return;

    // If user is fully authenticated, redirect immediately
    if (user && masterPasswordVerified) {
      router.replace(redirectTo);
      return;
    }
    
    // Enhanced step detection with user validation
    if (stepParam === 'master-password' && user && userProfile) {
      // Only set to master-password step if user is authenticated and profile is loaded
      setStep('master-password');
      setError(''); // Clear any previous errors
    } else if (stepParam === 'master-password' && user && !userProfile) {
      // User exists but profile not loaded yet, wait for it
      return;
    } else if (stepParam === 'master-password' && !user) {
      // Invalid state: master-password step requested but no user
      // Redirect to normal login and clear step parameter
      const loginUrl = new URL('/auth/login', window.location.origin);
      loginUrl.searchParams.set('redirectTo', redirectTo);
      router.replace(loginUrl.toString());
      return;
    } else if (!stepParam && user && !masterPasswordVerified) {
      // User is authenticated but needs master password - redirect with correct step
      const loginUrl = new URL('/auth/login', window.location.origin);
      loginUrl.searchParams.set('redirectTo', redirectTo);
      loginUrl.searchParams.set('step', 'master-password');
      router.replace(loginUrl.toString());
      return;
    }
  }, [user, masterPasswordVerified, userProfile, authLoading, router, redirectTo, stepParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      setStep('master-password');
      toast.success('Account verified! Please enter your master password.');
    } catch (error) {
      logError(error, 'user login');
      const userFriendlyMessage = getFirebaseErrorMessage(error);
      setError(userFriendlyMessage);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMasterPasswordVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !masterPassword.trim()) return;

    setLoading(true);
    setError('');

    try {
      const isValid = await verifyMasterPassword(masterPassword);
      if (isValid) {
        toast.success('Welcome back! Vault unlocked successfully.');
        // Clear any stale session data and ensure clean navigation
        sessionStorage.removeItem('vaultAccessAuthorized');
        // Use the redirect URL from middleware or default to dashboard
        router.replace(redirectTo);
      } else {
        setError('Incorrect master password. Please try again.');
        toast.error('Incorrect master password.');
        setMasterPassword(''); // Clear the field for security
      }
    } catch (error) {
      logError(error, 'master password verification');
      const userFriendlyMessage = getFirebaseErrorMessage(error);
      setError(userFriendlyMessage);
      toast.error('Failed to verify master password.');
      setMasterPassword(''); // Clear the field for security
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  const handleBackToLogin = async () => {
    try {
      // Set loading state
      setLoading(true);
      setError('');
      
      // Fully log out the user (clears both Firebase auth and vault session)
      await logout();
      
      // Immediately redirect to home page to break any potential redirect loops
      router.replace('/');
      
      // Show success message
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to home page for clean state
      router.replace('/');
      toast.error('Logout failed, but redirecting to clean state');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Enhanced master password step with better error handling
  if (step === 'master-password' && user && userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Unlock Your Vault</CardTitle>
            <CardDescription>
              Welcome back, {userProfile.displayName || user.email?.split('@')[0]}! Enter your master password to access your encrypted vault.
            </CardDescription>
            {userProfile.masterPasswordHint && (
              <div className="mt-2 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                <strong>Hint:</strong> {userProfile.masterPasswordHint}
              </div>
            )}
          </CardHeader>

          <form onSubmit={handleMasterPasswordVerification}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="masterPassword">Master Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="masterPassword"
                    type={showMasterPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter your master password"
                    className="pl-10 pr-12"
                    required
                    autoFocus
                    autoComplete="current-password"
                    style={{ WebkitAppearance: 'none' }}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                    tabIndex={-1}
                    disabled={loading}
                  >
                    {showMasterPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button type="submit" className="w-full" disabled={loading || !masterPassword.trim()}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  'Unlock Vault'
                )}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToLogin}
                  className="text-muted-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-muted-foreground mr-2"></div>
                      Logging out...
                    </>
                  ) : (
                    '← Sign in with different account'
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Redirect loading state for when user is authenticated but waiting
  if (user && masterPasswordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to your vault...</p>
        </div>
      </div>
    );
  }

  // Handle case where master password step is requested but user/profile not ready
  if (step === 'master-password' && (!user || !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your CryptLock account
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-12"
                  required
                  autoComplete="current-password"
                  style={{ WebkitAppearance: 'none' }}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleForgotPassword}
                className="text-muted-foreground"
                disabled={loading}
              >
                Forgot your password?
              </Button>

              <div className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-blue-600 hover:underline dark:text-blue-400">
                  Sign up
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
} 