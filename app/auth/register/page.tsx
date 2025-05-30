'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/AuthContext';
import { PasswordStrengthAnalyzer, PasswordStrengthResult } from '@/lib/password-strength';
import { getFirebaseErrorMessage, logError } from '@/lib/firebase-errors';
import { Eye, EyeOff, Lock, Mail, Shield, User, Dices, Info, AlertTriangle } from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import ErrorModal from '@/components/ErrorModal';
import toast from 'react-hot-toast';

function RegisterContent() {
  const [step, setStep] = useState<'account' | 'master-password'>('account');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Account creation fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Master password fields
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [masterPasswordHint, setMasterPasswordHint] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [masterPasswordStrength, setMasterPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);

  const { signUp, user, masterPasswordVerified } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (user && masterPasswordVerified) {
      router.replace(redirectTo);
    }
  }, [user, masterPasswordVerified, router, redirectTo]);

  // Analyze master password strength in real-time
  useEffect(() => {
    if (masterPassword) {
      const strength = PasswordStrengthAnalyzer.analyzePassword(masterPassword, [email, displayName]);
      setMasterPasswordStrength(strength);
    } else {
      setMasterPasswordStrength(null);
    }
  }, [masterPassword, email, displayName]);

  // Helper function to show error modal
  const showValidationError = (message: string) => {
    setErrorModalMessage(message);
    setShowErrorModal(true);
  };

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError('');
    setStep('master-password');
    toast.success('Account details verified! Now set up your master password.');
  };

  const handleMasterPasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validation - Use popup modal for master password errors
    if (masterPassword !== confirmMasterPassword) {
      showValidationError('Master passwords do not match. Please ensure both password fields contain exactly the same password.');
      return;
    }

    if (masterPassword.length < 8) {
      showValidationError('Master password must be at least 8 characters long. Please choose a longer password for better security.');
      return;
    }

    if (!masterPasswordStrength || masterPasswordStrength.score < 2) {
      showValidationError('Master password is too weak. Please choose a stronger password with a mix of uppercase letters, lowercase letters, numbers, and symbols.');
      return;
    }

    if (masterPassword === password) {
      showValidationError('Master password cannot be the same as your account password. Please choose a different password for your vault.');
      return;
    }

    if (!acknowledgedWarning) {
      showValidationError('You must acknowledge and understand the master password warning to continue. Please read the warning carefully and check the acknowledgment box.');
      return;
    }

    setLoading(true);
    setError(''); // Clear any previous errors

    try {
      await signUp(email, password, displayName, masterPassword, masterPasswordHint || undefined);
      toast.success('Account created successfully! Welcome to CryptLock!');
      router.replace(redirectTo);
    } catch (error) {
      logError(error, 'account registration');
      const userFriendlyMessage = getFirebaseErrorMessage(error);
      setError(userFriendlyMessage); // Use regular error display for Firebase errors
      toast.error('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateMasterPassword = () => {
    const generated = PasswordStrengthAnalyzer.generateSecurePassword(16, {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeSimilar: true
    });
    setMasterPassword(generated);
    setConfirmMasterPassword(generated);
  };

  // Show loading state while checking authentication
  if (user && masterPasswordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (step === 'master-password') {
    return (
      <>
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title="Master Password Error"
          message={errorModalMessage}
        />
        
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Secure Your Vault</CardTitle>
              <CardDescription>
                Create a strong master password to protect your data with zero-knowledge encryption
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleMasterPasswordSetup}>
              <CardContent className="space-y-4">
                {/* Show Firebase errors with Alert, but validation errors use modal */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* CRITICAL WARNING - More Prominent */}
                <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>⚠️ CRITICAL WARNING:</strong> If you forget your master password, you will permanently lose access to ALL your data. 
                    CryptLock uses zero-knowledge encryption - we literally cannot help you recover it. 
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="masterPassword">Master Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="masterPassword"
                      type={showMasterPassword ? 'text' : 'password'}
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      placeholder="Create a strong master password"
                      className="pl-10 pr-20"
                      required
                      autoFocus
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-muted flex items-center justify-center"
                        onClick={generateMasterPassword}
                        title="Generate secure password"
                      >
                        <Dices className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-muted flex items-center justify-center"
                        onClick={() => setShowMasterPassword(!showMasterPassword)}
                        title="Toggle password visibility"
                      >
                        {showMasterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {masterPasswordStrength && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>Strength: 
                          <span 
                            className="ml-1 font-medium" 
                            style={{ color: masterPasswordStrength.strengthColor }}
                          >
                            {masterPasswordStrength.strengthText}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Crack time: {masterPasswordStrength.crackTimeDisplay}
                        </span>
                      </div>
                      <Progress 
                        value={masterPasswordStrength.percentage} 
                        className="h-2"
                        style={{
                          '--progress-background': masterPasswordStrength.strengthColor
                        } as React.CSSProperties}
                      />
                      {masterPasswordStrength.suggestions.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-3">
                          <div className="font-medium mb-2">Suggestions:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {masterPasswordStrength.suggestions.map((suggestion, index) => (
                              <li key={index}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-6">
                  <Label htmlFor="confirmMasterPassword">Confirm Master Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmMasterPassword"
                      type={showMasterPassword ? 'text' : 'password'}
                      value={confirmMasterPassword}
                      onChange={(e) => setConfirmMasterPassword(e.target.value)}
                      placeholder="Confirm your master password"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <Label htmlFor="hint">Password Hint (Optional)</Label>
                  <Textarea
                    id="hint"
                    value={masterPasswordHint}
                    onChange={(e) => setMasterPasswordHint(e.target.value)}
                    placeholder="A hint to help you remember your master password (never include the actual password)"
                    className="resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This hint will be visible when you log in. Don&apos;t include any part of your actual password.
                  </p>
                </div>

                {/* ACKNOWLEDGMENT CHECKBOX */}
                <div className="mt-6 p-4 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-950/10">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="acknowledge-warning"
                      checked={acknowledgedWarning}
                      onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded"
                      required
                    />
                    <label htmlFor="acknowledge-warning" className="text-sm text-red-800 dark:text-red-200 font-medium">
                      <strong>I understand and acknowledge:</strong>
                      <ul className="mt-2 space-y-1 text-xs">
                        <li>• If I forget my master password, I will lose access to ALL my data permanently</li>
                        <li>• CryptLock cannot recover or reset my master password due to zero-knowledge encryption</li>
                        <li>• I am solely responsible for remembering and safely storing my master password</li>
                      </ul>
                    </label>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-6">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !masterPasswordStrength || masterPasswordStrength.score < 2 || !acknowledgedWarning}
                >
                  {loading ? 'Creating Account...' : 'Create Secure Vault'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('account')}
                  className="text-muted-foreground"
                >
                  ← Back to account details
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Start your journey to better password security
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleAccountCreation}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  className="pl-10"
                  required
                  autoFocus
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Account Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password for your account"
                  className="pl-10 pr-10"
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pl-10"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Continue'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline dark:text-blue-400">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <RouteGuard>
      <Suspense fallback={<RegisterFallback />}>
        <RegisterContent />
      </Suspense>
    </RouteGuard>
  );
} 