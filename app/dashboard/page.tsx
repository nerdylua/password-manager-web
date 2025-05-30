'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useRouter } from 'next/navigation';
import { VaultItem } from '@/lib/encryption';
import { VaultService } from '@/lib/vault-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  LogOut, 
  Lock, 
  Key, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  Eye, 
  Download,
  BarChart3,
  Folder,
  ArrowRight,
  ArrowLeft,
  Info,
  Zap,
  RefreshCw,
  Home
} from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import { ThemeToggle } from '@/components/theme-toggle';
import toast from 'react-hot-toast';
import ErrorModal from '@/components/ErrorModal';

function DashboardContent() {
  const { user, userProfile, logout, lockVault, getMasterPassword } = useAuth();
  const router = useRouter();
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    error?: unknown;
  }>({
    title: '',
    message: '',
  });

  // Helper function to show detailed error modal
  const showDetailedError = (title: string, message: string, error: unknown) => {
    setErrorModalData({ title, message, error });
    setShowErrorModal(true);
  };

  // Load vault items for statistics
  const loadVaultItems = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingItems(true);
      
      // Get master password from AuthContext
      const masterPassword = getMasterPassword();
      if (!masterPassword) {
        // Don't show error, just set empty array
        setVaultItems([]);
        return;
      }

      // Load from Firebase with encryption
      const items = await VaultService.getAllItems(user.uid, masterPassword);
      setVaultItems(items);
    } catch (error) {
      console.error('Failed to load vault items for dashboard:', error);
      // Show detailed error modal for dashboard vault loading issues
      showDetailedError(
        'Dashboard Data Error',
        'Unable to load vault statistics for the dashboard. This could be due to network issues or authentication problems.',
        error
      );
      // Don't show error toast, just use empty array
      setVaultItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [user, getMasterPassword]);

  useEffect(() => {
    loadVaultItems();
  }, [loadVaultItems]);

  // Calculate real vault statistics
  const weakPasswords = vaultItems.filter(item => 
    item.password && item.password.length < 8
  ).length;
  
  const duplicatePasswords = (() => {
    const passwords = vaultItems
      .filter(item => item.password)
      .map(item => item.password);
    const unique = new Set(passwords);
    return passwords.length - unique.size;
  })();
  
  const vaultStats = {
    totalItems: vaultItems.length,
    weakPasswords,
    duplicatePasswords,
    oldPasswords: 0, // Could implement age checking later
    securityScore: vaultItems.length === 0 ? 100 : 
      Math.max(0, 100 - (weakPasswords * 10) - (duplicatePasswords * 15))
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  };

  const handleLockVault = () => {
    lockVault();
    router.push('/auth/login');
    toast.success('Vault locked successfully');
  };

  const navigateToVault = () => {
    // Authorize vault access via dashboard navigation
    sessionStorage.setItem('vaultAccessAuthorized', 'true');
    router.push('/vault');
  };

  const navigateToHome = () => {
    router.push('/');
  };

  return (
    <TooltipProvider delayDuration={0}>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateToHome}
                      className="mr-2"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      <Home className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Back to Home Page</p>
                  </TooltipContent>
                </Tooltip>

                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    CryptLock Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Security overview and quick actions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-m text-gray-500 dark:text-gray-400 mr-4 text-center">
                  Welcome, {userProfile?.displayName || user?.email?.split('@')[0]}
                </span>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={navigateToVault}
                      className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Open Vault
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Access your encrypted password vault</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLockVault}
                    >
                      <Lock className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Lock your vault and return to login</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sign out and clear session</p>
                  </TooltipContent>
                </Tooltip>

                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  {vaultItems.length === 0 ? (
                    <>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Your Vault is Ready
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Start securing your digital life by adding passwords, notes, and payment cards to your encrypted vault.
                      </p>
                      <Button onClick={navigateToVault} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Item
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Your Vault is Secure
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You have {vaultItems.length} {vaultItems.length === 1 ? 'item' : 'items'} safely encrypted in your vault. Keep adding more to build your digital security.
                      </p>
                      <div className="flex space-x-3">
                        <Button onClick={navigateToVault} className="bg-blue-600 hover:bg-blue-700">
                          <Folder className="h-4 w-4 mr-2" />
                          Manage Vault
                          <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
                        <Button onClick={navigateToVault} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
              </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-help">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                    <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{vaultStats.totalItems}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Passwords, notes, cards
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total number of items stored in your encrypted vault</p>
              </TooltipContent>
            </Tooltip>
                
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-help">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className={`text-2xl font-bold ${vaultStats.securityScore >= 80 ? 'text-green-600' : vaultStats.securityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {vaultStats.securityScore}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {vaultStats.securityScore >= 80 ? 'Excellent security' : 
                       vaultStats.securityScore >= 60 ? 'Good security' : 'Needs improvement'}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Overall security rating based on password strength and best practices</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-help">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">Weak Passwords</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className={`text-2xl font-bold ${weakPasswords === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {weakPasswords}
                  </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {weakPasswords === 0 ? 'All passwords strong' : `${weakPasswords} weak ${weakPasswords === 1 ? 'password' : 'passwords'}`}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Number of passwords that don&apos;t meet security standards</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-help">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">Duplicates</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className={`text-2xl font-bold ${duplicatePasswords === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {duplicatePasswords}
                  </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {duplicatePasswords === 0 ? 'No duplicates found' : `${duplicatePasswords} duplicate ${duplicatePasswords === 1 ? 'password' : 'passwords'}`}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Number of duplicate passwords that should be changed for better security</p>
              </TooltipContent>
            </Tooltip>
                  </div>
                  
          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={navigateToVault}
                        className="h-20 flex flex-col items-center justify-center space-y-2"
                      >
                        <Plus className="h-6 w-6" />
                        <span className="text-sm">Add Password</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add a new login, secure note, payment card, or identity</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={navigateToVault}
                        className="h-20 flex flex-col items-center justify-center space-y-2"
                      >
                        <Search className="h-6 w-6" />
                        <span className="text-sm">Browse Vault</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Search and manage all your stored passwords and data</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center space-y-2"
                        disabled
                      >
                        <RefreshCw className="h-6 w-6" />
                        <span className="text-sm">Security Audit</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Analyze your passwords for security vulnerabilities (Coming Soon)</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center space-y-2"
                        disabled
                      >
                        <Download className="h-6 w-6" />
                        <span className="text-sm">Export Data</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export your encrypted vault data for backup (Coming Soon)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Security Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Security Status */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  vaultStats.securityScore >= 80 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                    : vaultStats.securityScore >= 60
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      vaultStats.securityScore >= 80 
                        ? 'bg-green-100 dark:bg-green-900'
                        : vaultStats.securityScore >= 60
                        ? 'bg-yellow-100 dark:bg-yellow-900'
                        : 'bg-red-100 dark:bg-red-900'
                    }`}>
                      <Shield className={`w-4 h-4 ${
                        vaultStats.securityScore >= 80 
                          ? 'text-green-600 dark:text-green-400'
                          : vaultStats.securityScore >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <p className={`font-medium ${
                        vaultStats.securityScore >= 80 
                          ? 'text-green-800 dark:text-green-200'
                          : vaultStats.securityScore >= 60
                          ? 'text-yellow-800 dark:text-yellow-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {vaultStats.securityScore >= 80 ? 'Excellent Security' : 
                         vaultStats.securityScore >= 60 ? 'Good Security' : 'Security Needs Attention'}
                      </p>
                      <p className={`text-sm ${
                        vaultStats.securityScore >= 80 
                          ? 'text-green-600 dark:text-green-400'
                          : vaultStats.securityScore >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {vaultStats.securityScore >= 80 
                          ? 'Your vault is secure and well-protected'
                          : vaultStats.securityScore >= 60
                          ? 'Your vault has some security improvements available'
                          : 'Your vault has security issues that need attention'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={
                    vaultStats.securityScore >= 80 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : vaultStats.securityScore >= 60
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }>
                    {vaultStats.securityScore}%
                  </Badge>
                </div>

                {/* Dynamic Recommendations */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      {vaultItems.length === 0 ? (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Getting Started</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                            Add your first password to start building your secure digital identity.
                          </p>
                          <Button 
                            size="sm" 
                            onClick={navigateToVault}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Get Started
                          </Button>
                        </>
                      ) : weakPasswords > 0 || duplicatePasswords > 0 ? (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Security Recommendations</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                            {weakPasswords > 0 && duplicatePasswords > 0 
                              ? `You have ${weakPasswords} weak and ${duplicatePasswords} duplicate passwords. Consider updating them for better security.`
                              : weakPasswords > 0 
                              ? `You have ${weakPasswords} weak ${weakPasswords === 1 ? 'password' : 'passwords'}. Consider making them stronger.`
                              : `You have ${duplicatePasswords} duplicate ${duplicatePasswords === 1 ? 'password' : 'passwords'}. Consider making them unique.`}
                          </p>
                          <Button 
                            size="sm" 
                            onClick={navigateToVault}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Review Passwords
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Keep It Up!</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                            Your vault security is excellent. Continue adding more passwords to keep your digital life secure.
                          </p>
                          <Button 
                            size="sm" 
                            onClick={navigateToVault}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Add More Items
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">No activity yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Activity will appear here once you start using your vault
                </p>
              </div>
            </CardContent>
          </Card>
      </main>
      
      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorModalData.title}
        message={errorModalData.message}
        error={errorModalData.error}
      />
    </div>
    </TooltipProvider>
  );
}

export default function DashboardPage() {
  return (
    <RouteGuard requireAuth={true} requireMasterPassword={true}>
      <DashboardContent />
    </RouteGuard>
  );
} 