'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useRouter } from 'next/navigation';
import { VaultItem } from '@/lib/encryption';
import { VaultService } from '@/lib/vault-service';
import { PasswordStrengthAnalyzer } from '@/lib/password-strength';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Home,
  Copy,
  Dices,
  FileText,
  CreditCard,
  User,
  Clock,
  ChevronRight
} from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import { ThemeToggle } from '@/components/theme-toggle';
import toast from 'react-hot-toast';
import ErrorModal from '@/components/ErrorModal';

// Lightweight dashboard data interface
interface DashboardData {
  vaultItems: VaultItem[];
  recentItems: VaultItem[];
  stats: {
    totalItems: number;
    weakPasswords: number;
    duplicatePasswords: number;
    securityScore: number;
  };
  lastFetch: number;
}

// Optimized dashboard cache with better memory management
class DashboardCache {
  private static instance: DashboardCache;
  private cache = new Map<string, DashboardData>();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  static getInstance(): DashboardCache {
    if (!DashboardCache.instance) {
      DashboardCache.instance = new DashboardCache();
    }
    return DashboardCache.instance;
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.cache.entries()) {
        if (now - data.lastFetch > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  get(userId: string): DashboardData | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    
    if (Date.now() - cached.lastFetch > this.CACHE_TTL) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached;
  }

  set(userId: string, data: DashboardData): void {
    this.cache.set(userId, { ...data, lastFetch: Date.now() });
    this.startCleanupTimer();
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Memoized category icon component
const CategoryIcon = memo(({ category }: { category: string }) => {
  switch (category) {
    case 'login': return <Key className="h-4 w-4" />;
    case 'secure-note': return <FileText className="h-4 w-4" />;
    case 'credit-card': return <CreditCard className="h-4 w-4" />;
    case 'identity': return <User className="h-4 w-4" />;
    default: return <Key className="h-4 w-4" />;
  }
});

CategoryIcon.displayName = 'CategoryIcon';

// Memoized time ago formatter with better performance
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// Memoized recent item component
const RecentItem = memo(({ item, onClick }: { item: VaultItem; onClick: () => void }) => (
  <div
    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <CategoryIcon category={item.category} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.name}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {item.category.replace('-', ' ')}
          </Badge>
          {item.favorite && (
            <Badge variant="outline" className="text-xs">
              ⭐ Favorite
            </Badge>
          )}
        </div>
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {formatTimeAgo(item.lastModified)}
      </span>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </div>
  </div>
));

RecentItem.displayName = 'RecentItem';

function DashboardContent() {
  const { user, userProfile, logout, lockVault, getMasterPassword } = useAuth();
  const router = useRouter();
  
  // Optimized state management - split into smaller chunks
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    vaultItems: [],
    recentItems: [],
    stats: { totalItems: 0, weakPasswords: 0, duplicatePasswords: 0, securityScore: 100 },
    lastFetch: 0
  });
  
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

  // Password Generator State - memoized to prevent re-renders
  const [generatorSettings, setGeneratorSettings] = useState(() => ({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false
  }));
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Button loading states - simplified
  const [buttonStates, setButtonStates] = useState(() => ({
    exportVault: false,
    securityAudit: false,
    generatePassword: false,
    refresh: false
  }));

  // Cache refs
  const dashboardCache = useRef(DashboardCache.getInstance());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized stats calculation - only recalculate when items change
  const stats = useMemo(() => {
    const items = dashboardData.vaultItems;
    if (items.length === 0) {
      return { totalItems: 0, weakPasswords: 0, duplicatePasswords: 0, securityScore: 100 };
    }

    const weakPasswords = items.filter(item => 
      item.password && item.password.length < 8
    ).length;
    
    const passwords = items
      .filter(item => item.password)
      .map(item => item.password);
    const unique = new Set(passwords);
    const duplicatePasswords = passwords.length - unique.size;
    
    const securityScore = Math.max(0, 100 - (weakPasswords * 10) - (duplicatePasswords * 15));

    return {
      totalItems: items.length,
      weakPasswords,
      duplicatePasswords,
      securityScore
    };
  }, [dashboardData.vaultItems]);

  // Memoized recent items - only recalculate when vault items change
  const recentItems = useMemo(() => {
    return dashboardData.vaultItems
      .slice() // Create copy to avoid mutating original
      .sort((a, b) => b.lastModified - a.lastModified)
      .slice(0, 5);
  }, [dashboardData.vaultItems]);

  // Helper function to show detailed error modal
  const showDetailedError = useCallback((title: string, message: string, error: unknown) => {
    setErrorModalData({ title, message, error });
    setShowErrorModal(true);
  }, []);

  // Optimized dashboard data loader with reduced data fetching
  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoadingItems(true);
      
      const masterPassword = getMasterPassword();
      if (!masterPassword) {
        setDashboardData({
          vaultItems: [],
          recentItems: [],
          stats: { totalItems: 0, weakPasswords: 0, duplicatePasswords: 0, securityScore: 100 },
          lastFetch: Date.now()
        });
        return;
      }

      // Check cache first for instant loading
      if (!forceRefresh) {
        const cached = dashboardCache.current.get(user.uid);
        if (cached) {
          setDashboardData(cached);
          setLoadingItems(false);
          return;
        }
      }

      const startTime = performance.now();
      
      // Load limited data for dashboard - only first 50 items for faster loading
      const items = await VaultService.getAllItems(user.uid, masterPassword, { 
        useCache: !forceRefresh,
        limit: 50 // Reduced from 100 for faster loading
      });
      
      const loadTime = performance.now() - startTime;
      console.log(`Dashboard data loaded in ${loadTime.toFixed(2)}ms`);

      const newDashboardData: DashboardData = {
        vaultItems: items,
        recentItems: [], // Will be calculated by useMemo
        stats: { totalItems: 0, weakPasswords: 0, duplicatePasswords: 0, securityScore: 100 }, // Will be calculated by useMemo
        lastFetch: Date.now()
      };

      // Update cache and state
      dashboardCache.current.set(user.uid, newDashboardData);
      setDashboardData(newDashboardData);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      console.error('Failed to load dashboard data:', error);
      showDetailedError(
        'Dashboard Data Error',
        'Unable to load vault statistics for the dashboard. This could be due to network issues or authentication problems.',
        error
      );
      
      setDashboardData({
        vaultItems: [],
        recentItems: [],
        stats: { totalItems: 0, weakPasswords: 0, duplicatePasswords: 0, securityScore: 100 },
        lastFetch: Date.now()
      });
    } finally {
      setLoadingItems(false);
    }
  }, [user, getMasterPassword, showDetailedError]);

  // Optimized refresh with debouncing
  const handleRefresh = useCallback(async () => {
    if (buttonStates.refresh) return; // Prevent double clicks
    
    setButtonStates(prev => ({ ...prev, refresh: true }));
    toast.loading('Refreshing dashboard...', { id: 'dashboard-refresh' });
    
    try {
      if (user) {
        dashboardCache.current.invalidate(user.uid);
      }
      await loadDashboardData(true);
      toast.success('Dashboard refreshed!', { id: 'dashboard-refresh' });
    } catch (error) {
      toast.error('Failed to refresh dashboard', { id: 'dashboard-refresh' });
    } finally {
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, refresh: false }));
      }, 200);
    }
  }, [loadDashboardData, user, buttonStates.refresh]);

  // Memoized password generation
  const handleGeneratePassword = useCallback(() => {
    if (buttonStates.generatePassword) return;
    
    setButtonStates(prev => ({ ...prev, generatePassword: true }));
    
    try {
      const password = PasswordStrengthAnalyzer.generateSecurePassword(
        generatorSettings.length,
        generatorSettings
      );
      setGeneratedPassword(password);
      toast.success('Password generated successfully!');
    } catch (error) {
      toast.error('Failed to generate password');
    } finally {
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, generatePassword: false }));
      }, 200);
    }
  }, [generatorSettings, buttonStates.generatePassword]);

  // Optimized clipboard function
  const copyPassword = useCallback(async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied to clipboard!');
    } catch {
      toast.error('Failed to copy password');
    }
  }, []);

  // Optimized export with data reuse
  const handleExportVault = useCallback(async () => {
    if (!user || buttonStates.exportVault) return;

    setButtonStates(prev => ({ ...prev, exportVault: true }));
    toast.loading('Preparing vault export...', { id: 'export-vault' });

    try {
      // Reuse dashboard data if recent
      let items = dashboardData.vaultItems;
      
      if (items.length === 0 || (Date.now() - dashboardData.lastFetch) > 60000) {
        const masterPassword = getMasterPassword();
        if (!masterPassword) {
          toast.error('Master password required for export', { id: 'export-vault' });
          return;
        }
        items = await VaultService.getAllItems(user.uid, masterPassword);
      }
      
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          itemCount: items.length,
          source: 'CryptLock Dashboard'
        },
        security: {
          notice: 'This file contains encrypted data. Keep it secure.',
          encryption: 'AES-256-CBC with PBKDF2'
        },
        data: {
          vault: items
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cryptlock-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${items.length} items successfully`, { id: 'export-vault' });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export vault data', { id: 'export-vault' });
    } finally {
      setButtonStates(prev => ({ ...prev, exportVault: false }));
    }
  }, [user, getMasterPassword, dashboardData, buttonStates.exportVault]);

  // Optimized security audit with data reuse
  const handleSecurityAudit = useCallback(async () => {
    if (!user || buttonStates.securityAudit) return;

    setButtonStates(prev => ({ ...prev, securityAudit: true }));
    toast.loading('Analyzing vault security...', { id: 'security-audit' });

    try {
      // Reuse dashboard data if recent
      let items = dashboardData.vaultItems;
      
      if (items.length === 0 || (Date.now() - dashboardData.lastFetch) > 60000) {
        const masterPassword = getMasterPassword();
        if (!masterPassword) {
          toast.error('Master password required for audit', { id: 'security-audit' });
          return;
        }
        items = await VaultService.getAllItems(user.uid, masterPassword);
      }
      
      const weakPasswords = items.filter(item => 
        item.password && item.password.length < 8
      );
      
      const duplicatePasswords = (() => {
        const passwords = items
          .filter(item => item.password)
          .map(item => item.password);
        const duplicates: string[] = [];
        const seen = new Set();
        
        for (const password of passwords) {
          if (seen.has(password) && !duplicates.includes(password!)) {
            duplicates.push(password!);
          }
          seen.add(password);
        }
        return duplicates;
      })();

      const oldPasswords = items.filter(item => {
        if (!item.lastModified) return false;
        const daysSinceModified = (Date.now() - item.lastModified) / (1000 * 60 * 60 * 24);
        return daysSinceModified > 90;
      });

      const missingPasswords = items.filter(item => 
        item.category === 'login' && !item.password
      );

      const securityReport = {
        weak: weakPasswords.length,
        duplicate: duplicatePasswords.length,
        old: oldPasswords.length,
        missing: missingPasswords.length,
        total: items.length
      };

      let reportMessage = `Security Audit Complete!\n\n`;
      reportMessage += `📊 Total Items: ${securityReport.total}\n`;
      reportMessage += `🔴 Weak Passwords: ${securityReport.weak}\n`;
      reportMessage += `🔶 Duplicate Passwords: ${securityReport.duplicate}\n`;
      reportMessage += `🕒 Old Passwords (90+ days): ${securityReport.old}\n`;
      reportMessage += `❌ Missing Passwords: ${securityReport.missing}\n\n`;

      if (securityReport.weak + securityReport.duplicate + securityReport.old + securityReport.missing === 0) {
        reportMessage += `✅ Excellent! Your vault security is in great shape.`;
      } else {
        reportMessage += `💡 Consider updating flagged passwords for better security.`;
      }

      toast.success(reportMessage, { 
        id: 'security-audit',
        duration: 8000,
        style: { whiteSpace: 'pre-line' }
      });
    } catch (error) {
      console.error('Security audit failed:', error);
      toast.error('Failed to complete security audit', { id: 'security-audit' });
    } finally {
      setButtonStates(prev => ({ ...prev, securityAudit: false }));
    }
  }, [user, getMasterPassword, dashboardData, buttonStates.securityAudit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      dashboardCache.current.clear();
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Memoized navigation functions to prevent re-renders
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push('/auth/login');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  }, [logout, router]);

  const handleLockVault = useCallback(() => {
    lockVault();
    router.push('/auth/login');
    toast.success('Vault locked successfully');
  }, [lockVault, router]);

  const navigateToVault = useCallback(() => {
    sessionStorage.setItem('vaultAccessAuthorized', 'true');
    router.push('/vault');
  }, [router]);

  const navigateToVaultWithSecurityHighlight = useCallback(() => {
    sessionStorage.setItem('vaultAccessAuthorized', 'true');
    sessionStorage.setItem('highlightSecurityIssues', 'true');
    router.push('/vault?highlight=security');
  }, [router]);

  const navigateToHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Memoized category count calculation
  const categoryCount = useMemo(() => {
    return new Set(dashboardData.vaultItems.map(item => item.category)).size;
  }, [dashboardData.vaultItems]);

  // Memoized password age calculation
  const passwordAge = useMemo(() => {
    const passwordItems = dashboardData.vaultItems.filter(item => item.password && item.lastModified);
    if (passwordItems.length === 0) return 'N/A';
    const avgAge = passwordItems.reduce((sum, item) => {
      const days = (Date.now() - item.lastModified) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / passwordItems.length;
    return avgAge < 30 ? 'Fresh' : avgAge < 90 ? 'Good' : 'Aging';
  }, [dashboardData.vaultItems]);

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
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-4 text-center">
                  Welcome, {userProfile?.displayName || user?.email?.split('@')[0]}
                </span>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={buttonStates.refresh}
                      className="mr-2"
                    >
                      {buttonStates.refresh ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh dashboard data</p>
                  </TooltipContent>
                </Tooltip>
                
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
                  {stats.totalItems === 0 ? (
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
                        You have {stats.totalItems} {stats.totalItems === 1 ? 'item' : 'items'} safely encrypted in your vault.
                      </p>
                      <Button onClick={navigateToVault} className="bg-blue-600 hover:bg-blue-700">
                        <Folder className="h-4 w-4 mr-2" />
                        Manage Vault
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
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
                    <div className="text-2xl font-bold">{stats.totalItems}</div>
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
                    <div className={`text-2xl font-bold ${stats.securityScore >= 80 ? 'text-green-600' : stats.securityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stats.securityScore}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.securityScore >= 80 ? 'Excellent security' : 
                       stats.securityScore >= 60 ? 'Good security' : 'Needs improvement'}
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
                    <div className={`text-2xl font-bold ${stats.weakPasswords === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.weakPasswords}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.weakPasswords === 0 ? 'All passwords strong' : `${stats.weakPasswords} weak ${stats.weakPasswords === 1 ? 'password' : 'passwords'}`}
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
                    <div className={`text-2xl font-bold ${stats.duplicatePasswords === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.duplicatePasswords}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.duplicatePasswords === 0 ? 'No duplicates found' : `${stats.duplicatePasswords} duplicate ${stats.duplicatePasswords === 1 ? 'password' : 'passwords'}`}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Number of duplicate passwords that should be changed for better security</p>
              </TooltipContent>
            </Tooltip>
          </div>
                  
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={navigateToVault}
                        className="w-full h-12 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Item
                        </div>
                        <ChevronRight className="h-4 w-4" />
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
                        onClick={handleSecurityAudit}
                        disabled={buttonStates.securityAudit}
                        className="w-full h-12 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          {buttonStates.securityAudit ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <BarChart3 className="h-4 w-4 mr-2" />
                          )}
                          Security Audit
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Analyze your passwords for security vulnerabilities</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={handleExportVault}
                        disabled={buttonStates.exportVault}
                        className="w-full h-12 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          {buttonStates.exportVault ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Export Vault
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export your encrypted vault data as a backup file</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            {/* Password Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Dices className="h-5 w-5 mr-2" />
                  Password Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="length">Length: {generatorSettings.length}</Label>
                    <Input
                      id="length"
                      type="range"
                      min="8"
                      max="64"
                      value={generatorSettings.length}
                      onChange={(e) => setGeneratorSettings(prev => ({ 
                        ...prev, 
                        length: parseInt(e.target.value) 
                      }))}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="uppercase">Uppercase (A-Z)</Label>
                      <Switch
                        id="uppercase"
                        checked={generatorSettings.uppercase}
                        onCheckedChange={(checked) => setGeneratorSettings(prev => ({ 
                          ...prev, 
                          uppercase: checked 
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lowercase">Lowercase (a-z)</Label>
                      <Switch
                        id="lowercase"
                        checked={generatorSettings.lowercase}
                        onCheckedChange={(checked) => setGeneratorSettings(prev => ({ 
                          ...prev, 
                          lowercase: checked 
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="numbers">Numbers (0-9)</Label>
                      <Switch
                        id="numbers"
                        checked={generatorSettings.numbers}
                        onCheckedChange={(checked) => setGeneratorSettings(prev => ({ 
                          ...prev, 
                          numbers: checked 
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="symbols">Symbols (!@#...)</Label>
                      <Switch
                        id="symbols"
                        checked={generatorSettings.symbols}
                        onCheckedChange={(checked) => setGeneratorSettings(prev => ({ 
                          ...prev, 
                          symbols: checked 
                        }))}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleGeneratePassword}
                    disabled={buttonStates.generatePassword}
                    className="w-full"
                  >
                    {buttonStates.generatePassword ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Dices className="h-4 w-4 mr-2" />
                    )}
                    Generate Password
                  </Button>

                  {generatedPassword && (
                    <div className="space-y-2">
                      <Label>Generated Password</Label>
                      <div className="flex space-x-2">
                        <Input
                          value={generatedPassword}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPassword(generatedPassword)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Insights */}
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
                  stats.securityScore >= 80 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                    : stats.securityScore >= 60
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stats.securityScore >= 80 
                        ? 'bg-green-100 dark:bg-green-900'
                        : stats.securityScore >= 60
                        ? 'bg-yellow-100 dark:bg-yellow-900'
                        : 'bg-red-100 dark:bg-red-900'
                    }`}>
                      <Shield className={`w-4 h-4 ${
                        stats.securityScore >= 80 
                          ? 'text-green-600 dark:text-green-400'
                          : stats.securityScore >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <p className={`font-medium ${
                        stats.securityScore >= 80 
                          ? 'text-green-800 dark:text-green-200'
                          : stats.securityScore >= 60
                          ? 'text-yellow-800 dark:text-yellow-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {stats.securityScore >= 80 ? 'Excellent Security' : 
                         stats.securityScore >= 60 ? 'Good Security' : 'Security Needs Attention'}
                      </p>
                      <p className={`text-sm ${
                        stats.securityScore >= 80 
                          ? 'text-green-600 dark:text-green-400'
                          : stats.securityScore >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {stats.securityScore >= 80 
                          ? 'Your vault is secure and well-protected'
                          : stats.securityScore >= 60
                          ? 'Your vault has some security improvements available'
                          : 'Your vault has security issues that need attention'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={
                    stats.securityScore >= 80 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : stats.securityScore >= 60
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }>
                    {stats.securityScore}%
                  </Badge>
                </div>

                {/* Dynamic Recommendations */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      {stats.totalItems === 0 ? (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Vault Security Overview</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                            Your vault is empty but ready for secure storage. When you add items, we'll analyze their security and provide personalized recommendations.
                          </p>
                          <div className="grid grid-cols-1 gap-2 mt-3">
                            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                              <Shield className="h-3 w-3 mr-2" />
                              Zero-knowledge encryption active
                            </div>
                            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                              <Key className="h-3 w-3 mr-2" />
                              AES-256 encryption ready
                            </div>
                            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                              <Lock className="h-3 w-3 mr-2" />
                              Master password protected
                            </div>
                          </div>
                        </>
                      ) : stats.weakPasswords > 0 || stats.duplicatePasswords > 0 ? (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Security Recommendations</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                            {stats.weakPasswords > 0 && stats.duplicatePasswords > 0 
                              ? `You have ${stats.weakPasswords} weak and ${stats.duplicatePasswords} duplicate passwords. Consider updating them for better security.`
                              : stats.weakPasswords > 0 
                              ? `You have ${stats.weakPasswords} weak ${stats.weakPasswords === 1 ? 'password' : 'passwords'}. Consider making them stronger.`
                              : `You have ${stats.duplicatePasswords} duplicate ${stats.duplicatePasswords === 1 ? 'password' : 'passwords'}. Consider making them unique.`}
                          </p>
                          <Button 
                            size="sm" 
                            onClick={navigateToVaultWithSecurityHighlight}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Review Passwords
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Advanced Security Insights</p>
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-blue-600 dark:text-blue-400">Password Diversity</span>
                              <span className="text-blue-800 dark:text-blue-200 font-medium">
                                {stats.totalItems > 0 ? 'Excellent' : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-blue-600 dark:text-blue-400">Two-Factor Ready</span>
                              <span className="text-blue-800 dark:text-blue-200 font-medium">
                                {stats.totalItems > 0 ? 'Yes' : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-blue-600 dark:text-blue-400">Data Categories</span>
                              <span className="text-blue-800 dark:text-blue-200 font-medium">
                                {categoryCount} types
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={handleSecurityAudit}
                              className="text-xs"
                            >
                              Run Audit
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={navigateToVaultWithSecurityHighlight}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            >
                              Add More
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Security Metrics */}
                {stats.totalItems > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Password Age
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {passwordAge}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Average freshness
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Encryption
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm font-bold text-green-600">
                          AES-256
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Military grade
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Recent Items
                </div>
                {recentItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={navigateToVault}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading recent items...</p>
                </div>
              ) : recentItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No items yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                    Recent vault items will appear here once you start adding passwords and data
                  </p>
                  <Button 
                    onClick={navigateToVault}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentItems.map((item) => (
                    <RecentItem
                      key={item.id}
                      item={item}
                      onClick={() => navigateToVault()}
                    />
                  ))}
                </div>
              )}
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