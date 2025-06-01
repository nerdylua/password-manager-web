'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo, Suspense, startTransition } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { VaultItem } from '@/lib/encryption';
import { VaultService } from '@/lib/vault-service';
import { getCryptoWorker } from '@/lib/crypto-worker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  Filter, 
  Eye, 
  EyeOff, 
  Copy, 
  Edit2, 
  Trash2, 
  Shield, 
  Lock, 
  LogOut, 
  RefreshCw,
  AlertTriangle,
  Key,
  FileText,
  CreditCard,
  User,
  Star,
  StarOff,
  ExternalLink,
  Download,
  Upload,
  BarChart3,
  Home,
  ArrowLeft,
  Info,
  X,
  CheckCircle,
  Zap,
  Globe
} from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import { ThemeToggle } from '@/components/theme-toggle';
import toast from 'react-hot-toast';
import AddItemModal from '@/components/AddItemModal';
import ErrorModal from '@/components/ErrorModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

// Optimized interfaces for better performance
interface VaultPageState {
  items: VaultItem[];
  filteredItems: VaultItem[];
  loading: boolean;
  searchTerm: string;
  selectedCategory: 'all' | 'login' | 'secure-note' | 'credit-card' | 'identity';
  viewMode: 'grid' | 'list';
  showPasswords: Record<string, boolean>;
  loadingProgress: { current: number; total: number; stage: string };
}

// Categories configuration
const categories = [
  { id: 'all', label: 'All Items', icon: Grid, description: 'View all vault items', count: 0 },
  { id: 'login', label: 'Logins', icon: Key, description: 'Usernames and passwords', count: 0 },
  { id: 'secure-note', label: 'Secure Notes', icon: FileText, description: 'Encrypted notes', count: 0 },
  { id: 'credit-card', label: 'Payment Cards', icon: CreditCard, description: 'Credit and debit cards', count: 0 },
  { id: 'identity', label: 'Identities', icon: User, description: 'Personal information', count: 0 }
];

// Web worker for heavy filtering and security calculations
class VaultWorker {
  private static instance: VaultWorker;
  private worker: Worker | null = null;
  private taskId = 0;
  private pendingTasks = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  static getInstance(): VaultWorker {
    if (!VaultWorker.instance) {
      VaultWorker.instance = new VaultWorker();
    }
    return VaultWorker.instance;
  }

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    const workerCode = `
      // Security issue detection
      const getSecurityIssues = (item, allItems) => {
        const issues = [];
        
        if (item.password) {
          // Check password strength
          if (item.password.length < 8) {
            issues.push({ type: 'weak', severity: 'high', message: 'Password is too short (minimum 8 characters)' });
          }
          
          // Check for duplicate passwords
          const duplicates = allItems.filter(other => 
            other.id !== item.id && other.password === item.password
          );
          if (duplicates.length > 0) {
            issues.push({ 
              type: 'duplicate', 
              severity: 'high', 
              message: \`Password is used in \${duplicates.length} other \${duplicates.length === 1 ? 'item' : 'items'}\`
            });
          }
          
          // Check password age
          if (item.lastModified) {
            const daysSinceModified = (Date.now() - item.lastModified) / (1000 * 60 * 60 * 24);
            if (daysSinceModified > 90) {
              issues.push({ 
                type: 'old', 
                severity: 'medium', 
                message: \`Password hasn't been changed in \${Math.floor(daysSinceModified)} days\`
              });
            }
          }
        } else if (item.category === 'login') {
          issues.push({ type: 'missing', severity: 'high', message: 'Login item is missing a password' });
        }
        
        return issues;
      };

      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'filterItems':
              const { items, searchTerm, selectedCategory } = data;
              let filtered = items.filter(item => item && item.name);

              // Filter by category
              if (selectedCategory !== 'all') {
                filtered = filtered.filter(item => 
                  item && item.category === selectedCategory
                );
              }

              // Filter by search term with safe checks
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filtered = filtered.filter(item =>
                  item && (
                    (item.name && item.name.toLowerCase().includes(term)) ||
                    (item.username && item.username.toLowerCase().includes(term)) ||
                    (item.url && item.url.toLowerCase().includes(term)) ||
                    (item.notes && item.notes.toLowerCase().includes(term))
                  )
                );
              }
              
              result = filtered;
              break;
              
            case 'calculateSecurityIssues':
              const { allItems } = data;
              const securityData = new Map();
              
              allItems.forEach(item => {
                const issues = getSecurityIssues(item, allItems);
                if (issues.length > 0) {
                  securityData.set(item.id, issues);
                }
              });
              
              result = Array.from(securityData.entries());
              break;
              
            case 'searchItems':
              const { sourceItems, query } = data;
              if (!query) {
                result = sourceItems;
                break;
              }
              
              const searchQuery = query.toLowerCase();
              result = sourceItems.filter(item =>
                item && (
                  (item.name && item.name.toLowerCase().includes(searchQuery)) ||
                  (item.username && item.username.toLowerCase().includes(searchQuery)) ||
                  (item.url && item.url.toLowerCase().includes(searchQuery)) ||
                  (item.notes && item.notes.toLowerCase().includes(searchQuery))
                )
              );
              break;
              
            default:
              throw new Error('Unknown task type: ' + type);
          }
          
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (e) => {
        const { id, result, error } = e.data;
        const task = this.pendingTasks.get(id);
        
        if (task) {
          this.pendingTasks.delete(id);
          if (error) {
            task.reject(new Error(error));
          } else {
            task.resolve(result);
          }
        }
      };
      
      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.warn('Failed to create vault worker:', error);
    }
  }

  async executeTask(type: string, data: unknown): Promise<unknown> {
    if (!this.worker) {
      // Fallback to deferred main thread execution
      return new Promise((resolve) => {
        if (window.scheduler && 'postTask' in window.scheduler) {
          window.scheduler.postTask(() => {
            resolve(this.executeOnMainThread(type, data));
          }, { priority: 'background' });
        } else {
          setTimeout(() => {
            resolve(this.executeOnMainThread(type, data));
          }, 0);
        }
      });
    }

    const id = ++this.taskId;
    
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject });
      
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error('Task timeout'));
        }
      }, 10000);
      
      this.worker!.postMessage({ id, type, data });
    });
  }

  private executeOnMainThread(type: string, data: unknown): unknown {
    // Main thread fallback for critical operations
    switch (type) {
      case 'filterItems':
        const filterData = data as { items: VaultItem[]; searchTerm: string; selectedCategory: string };
        const { items, searchTerm, selectedCategory } = filterData;
        let filtered = items.filter((item: VaultItem) => item && item.name);

        if (selectedCategory !== 'all') {
          filtered = filtered.filter((item: VaultItem) => 
            item && item.category === selectedCategory
          );
        }

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter((item: VaultItem) =>
            item && (
              (item.name && item.name.toLowerCase().includes(term)) ||
              (item.username && item.username.toLowerCase().includes(term)) ||
              (item.url && item.url.toLowerCase().includes(term)) ||
              (item.notes && item.notes.toLowerCase().includes(term))
            )
          );
        }
        
        return filtered;
        
      default:
        return [];
    }
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingTasks.clear();
  }
}

// Optimized security issue detection with caching
const getSecurityIssues = (item: VaultItem, allItems: VaultItem[]) => {
  const issues: Array<{ type: string; severity: string; message: string }> = [];
  
  if (item.password) {
    // Check password strength
    if (item.password.length < 8) {
      issues.push({ type: 'weak', severity: 'high', message: 'Password is too short (minimum 8 characters)' });
    }
    
    // Check for duplicate passwords (optimized)
    const duplicates = allItems.filter(other => 
      other.id !== item.id && other.password === item.password
    );
    if (duplicates.length > 0) {
      issues.push({ 
        type: 'duplicate', 
        severity: 'high', 
        message: `Password is used in ${duplicates.length} other ${duplicates.length === 1 ? 'item' : 'items'}`
      });
    }
    
    // Check password age
    if (item.lastModified) {
      const daysSinceModified = (Date.now() - item.lastModified) / (1000 * 60 * 60 * 24);
      if (daysSinceModified > 90) {
        issues.push({ 
          type: 'old', 
          severity: 'medium', 
          message: `Password hasn't been changed in ${Math.floor(daysSinceModified)} days`
        });
      }
    }
  } else if (item.category === 'login') {
    issues.push({ type: 'missing', severity: 'high', message: 'Login item is missing a password' });
  }
  
  return issues;
};

// Memoized components for better performance
const ItemIcon = memo(({ category }: { category: VaultItem['category'] }) => {
  switch (category) {
    case 'login': return <Key className="h-5 w-5" />;
    case 'secure-note': return <FileText className="h-5 w-5" />;
    case 'credit-card': return <CreditCard className="h-5 w-5" />;
    case 'identity': return <User className="h-5 w-5" />;
    default: return <Key className="h-5 w-5" />;
  }
});

ItemIcon.displayName = 'ItemIcon';

function VaultContent() {
  const { user, userProfile, logout, lockVault, getMasterPassword, masterPasswordVerified } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Optimized state management with reduced complexity
  const [state, setState] = useState<VaultPageState>({
    items: [],
    filteredItems: [],
    loading: true,
    searchTerm: '',
    selectedCategory: 'all',
    viewMode: 'grid',
    showPasswords: {},
    loadingProgress: { current: 0, total: 4, stage: 'Initializing...' }
  });

  // Security highlighting state - simplified
  const [securityHighlight, setSecurityHighlight] = useState({
    enabled: false,
    itemsWithIssues: new Set<string>(),
    showBanner: false
  });

  // Modal states - consolidated
  const [modals, setModals] = useState({
    showAdd: false,
    editing: null as VaultItem | null,
    delete: { isOpen: false, item: null as VaultItem | null, isDeleting: false }
  });

  // Button states for instant feedback - simplified
  const [buttonStates, setButtonStates] = useState<{
    refresh: boolean;
    lock: boolean;
    logout: boolean;
    exportVault: boolean;
    importData: boolean;
    securityAudit: boolean;
    copyingItems: Map<string, string>;
  }>({
    refresh: false,
    lock: false,
    logout: false,
    exportVault: false,
    importData: false,
    securityAudit: false,
    copyingItems: new Map()
  });

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    error?: unknown;
    canRetry?: boolean;
    onRetry?: () => void;
  }>({
    title: '',
    message: '',
  });

  // Worker reference
  const vaultWorker = useRef(VaultWorker.getInstance());
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Helper function to show detailed error modal
  const showDetailedError = useCallback((title: string, message: string, error: unknown, canRetry = false, onRetry?: () => void) => {
    setErrorModalData({ title, message, error, canRetry, onRetry });
    setShowErrorModal(true);
  }, []);

  // Optimized vault loading with progressive enhancement
  const loadVaultItems = useCallback(async () => {
    if (!user || !masterPasswordVerified) return;
    
    // Use startTransition for non-blocking state updates
    startTransition(() => {
      setState(prev => ({ ...prev, loading: true }));
    });
    
    try {
      // Get master password asynchronously in background
      const masterPassword = await getMasterPassword();
      if (!masterPassword) {
        throw new Error('Master password not available');
      }
      
      // Progressive loading stages with non-blocking updates
      startTransition(() => {
        setState(prev => ({ 
          ...prev, 
          loadingProgress: { current: 1, total: 4, stage: 'Establishing secure connection...' }
        }));
      });
      
      // Load items with progressive enhancement
      const items = await VaultService.getAllItems(user.uid, masterPassword, { 
        limit: 50, // Optimized limit for better performance
        useCache: true // Use cache for instant loading
      });
      
      // Update state with startTransition to prevent blocking
      startTransition(() => {
        setState(prev => ({ 
          ...prev, 
          items, 
          filteredItems: items,
          loading: false,
          loadingProgress: { current: 4, total: 4, stage: 'Vault ready!' }
        }));
      });
    } catch (error) {
      console.error('Failed to load vault items:', error);
      
      // Non-blocking error state update
      startTransition(() => {
        setState(prev => ({ ...prev, loading: false }));
      });
      
      showDetailedError(
        'Failed to Load Vault',
        'Unable to load your vault items. This could be due to network issues or authentication problems.',
        error,
        true,
        loadVaultItems
      );
    }
  }, [user, masterPasswordVerified, getMasterPassword, showDetailedError]);

  // Fallback filtering method for when worker fails
  const fallbackFilter = useCallback(() => {
    let filtered = state.items.filter(item => item && item.name);

    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item && item.category === state.selectedCategory
      );
    }

    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item && (
          (item.name && item.name.toLowerCase().includes(term)) ||
          (item.username && item.username.toLowerCase().includes(term)) ||
          (item.url && item.url.toLowerCase().includes(term)) ||
          (item.notes && item.notes.toLowerCase().includes(term))
        )
      );
    }

    return filtered;
  }, [state.items, state.searchTerm, state.selectedCategory]);

  // Optimized filtering with web worker and debouncing
  const filterItems = useCallback(async () => {
    // Early return for empty items to prevent unnecessary work
    if (state.items.length === 0) return;

    // Clear any pending filter operations
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    try {
      // Use startTransition to prevent blocking user interactions
      startTransition(async () => {
        // Use web worker for heavy filtering operations
        const filtered = await vaultWorker.current.executeTask('filterItems', {
          items: state.items,
          searchTerm: state.searchTerm,
          selectedCategory: state.selectedCategory
        }) as VaultItem[];
        
        setState(prev => ({ ...prev, filteredItems: filtered }));
      });
    } catch (error) {
      console.warn('Worker filtering failed, using deferred fallback:', error);
      
      // Deferred fallback to prevent blocking
      if (window.scheduler && 'postTask' in window.scheduler) {
        window.scheduler.postTask(() => {
          const filtered = fallbackFilter();
          startTransition(() => {
            setState(prev => ({ ...prev, filteredItems: filtered }));
          });
        }, { priority: 'background' });
      } else {
        setTimeout(() => {
          const filtered = fallbackFilter();
          startTransition(() => {
            setState(prev => ({ ...prev, filteredItems: filtered }));
          });
        }, 0);
      }
    }
  }, [state.items, state.searchTerm, state.selectedCategory, fallbackFilter]);

  // Optimized search with immediate feedback and debounced processing
  const handleSearchChange = useCallback((value: string) => {
    // Clear any pending filter operations
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Immediate visual feedback - non-blocking
    setState(prev => ({ ...prev, searchTerm: value }));
    
    // Debounce the actual filtering to prevent excessive work
    searchTimeoutRef.current = setTimeout(() => {
      // Use background processing for filtering
      if (window.scheduler && 'postTask' in window.scheduler) {
        window.scheduler.postTask(() => {
          filterItems();
        }, { priority: 'user-blocking' });
      } else {
        filterItems();
      }
    }, 100); // Reduced debounce time for better responsiveness
  }, [filterItems]);

  // Non-blocking category change
  const handleCategoryChange = useCallback((category: typeof state.selectedCategory) => {
    // Immediate visual feedback
    setState(prev => ({ ...prev, selectedCategory: category }));
    
    // Defer filtering to prevent blocking
    if (window.scheduler && 'postTask' in window.scheduler) {
      window.scheduler.postTask(() => {
        filterItems();
      }, { priority: 'user-visible' });
    } else {
      setTimeout(() => {
        filterItems();
      }, 0);
    }
  }, [filterItems]);

  // Optimized view mode toggle with instant feedback
  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    // Immediate visual feedback - this should be instant
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  // Non-blocking vault refresh
  const forceRefreshVault = useCallback(async () => {
    if (!user || !masterPasswordVerified) return;
    
    // Immediate visual feedback
    setButtonStates(prev => ({ ...prev, refresh: true }));
    
    try {
      // Use startTransition for non-blocking updates
      startTransition(() => {
        setState(prev => ({ ...prev, loading: true }));
      });
      
      const masterPassword = await getMasterPassword();
      if (!masterPassword) {
        throw new Error('Master password not available');
      }
      
      // Load fresh data with background processing
      const items = await VaultService.getAllItems(user.uid, masterPassword, { 
        limit: 50,
        useCache: false // Force fresh data
      });
      
      // Non-blocking state update
      startTransition(() => {
        setState(prev => ({ 
          ...prev, 
          items, 
          filteredItems: prev.selectedCategory === 'all' ? items : items.filter(item => 
            item.category === prev.selectedCategory
          ),
          loading: false 
        }));
      });
      
      toast.success('Vault refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh vault:', error);
      startTransition(() => {
        setState(prev => ({ ...prev, loading: false }));
      });
      toast.error('Failed to refresh vault');
    } finally {
      // Deferred button state reset
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, refresh: false }));
      }, 100);
    }
  }, [user, masterPasswordVerified, getMasterPassword]);

  // Optimized item saving with non-blocking updates
  const handleSaveItem = useCallback(async (itemData: Partial<VaultItem>) => {
    if (!user) return;

    try {
      const masterPassword = await getMasterPassword();
      if (!masterPassword) {
        toast.error('Unable to access master password. Please re-authenticate.');
        return;
      }

      if (modals.editing) {
        // Update existing item - prepare full item data
        const updatedItem: VaultItem = {
          ...modals.editing,
          ...itemData,
          id: modals.editing.id,
          lastModified: Date.now()
        };
        
        await VaultService.updateItem(modals.editing.id, user.uid, updatedItem, masterPassword);
        toast.success('Item updated successfully');
      } else {
        // Create new item - use addItem method
        const itemToAdd = {
          name: itemData.name || '',
          username: itemData.username || '',
          password: itemData.password || '',
          url: itemData.url || '',
          notes: itemData.notes || '',
          category: itemData.category || 'login' as const,
          favorite: itemData.favorite || false,
          tags: itemData.tags || []
        };
        
        await VaultService.addItem(user.uid, itemToAdd, masterPassword);
        toast.success('Item created successfully');
      }

      // Close modals immediately for instant feedback
      setModals(prev => ({
        ...prev,
        showAdd: false,
        editing: null
      }));

      // Refresh vault data
      await forceRefreshVault();
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save item');
    }
  }, [user, getMasterPassword, modals.editing, forceRefreshVault]);

  // Non-blocking password visibility toggle
  const togglePasswordVisibility = useCallback((itemId: string) => {
    // Immediate visual feedback
    setState(prev => ({
      ...prev,
      showPasswords: {
        ...prev.showPasswords,
        [itemId]: !prev.showPasswords[itemId]
      }
    }));
  }, []);

  // Optimized clipboard copy with instant feedback
  const copyToClipboard = useCallback(async (text: string, label: string, itemId?: string, field?: string) => {
    try {
      // Immediate visual feedback
      if (itemId && field) {
        setButtonStates(prev => ({
          ...prev,
          copyingItems: new Map(prev.copyingItems).set(`${itemId}-${field}`, field)
        }));
        
        // Clear feedback after short delay
        setTimeout(() => {
          setButtonStates(prev => {
            const newMap = new Map(prev.copyingItems);
            newMap.delete(`${itemId}-${field}`);
            return { ...prev, copyingItems: newMap };
          });
        }, 500);
      }

      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
      
      // Clear loading state on error
      if (itemId && field) {
        setButtonStates(prev => {
          const newMap = new Map(prev.copyingItems);
          newMap.delete(`${itemId}-${field}`);
          return { ...prev, copyingItems: newMap };
        });
      }
    }
  }, []);

  // Optimized edit item handler
  const handleEditItem = useCallback((item: VaultItem) => {
    // Immediate visual feedback
    setModals(prev => ({
      ...prev,
      editing: item,
      showAdd: true
    }));
  }, []);

  // Optimized delete confirmation
  const handleDeleteItem = useCallback((item: VaultItem) => {
    // Immediate modal display
    setModals(prev => ({
      ...prev,
      delete: { isOpen: true, item, isDeleting: false }
    }));
  }, []);

  // Non-blocking delete operation
  const handleConfirmDelete = useCallback(async () => {
    const itemToDelete = modals.delete.item;
    if (!itemToDelete || !user) return;

    // Immediate feedback
    setModals(prev => ({
      ...prev,
      delete: { ...prev.delete, isDeleting: true }
    }));

    try {
      await VaultService.deleteItem(itemToDelete.id, user.uid);
      
      // Close modal immediately
      setModals(prev => ({
        ...prev,
        delete: { isOpen: false, item: null, isDeleting: false }
      }));

      toast.success('Item deleted successfully');

      // Refresh vault data
      await forceRefreshVault();
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item');
      
      // Reset modal state on error
      setModals(prev => ({
        ...prev,
        delete: { ...prev.delete, isDeleting: false }
      }));
    }
  }, [modals.delete.item, user, forceRefreshVault]);

  // Instant modal close handlers
  const handleCancelDelete = useCallback(() => {
    setModals(prev => ({
      ...prev,
      delete: { isOpen: false, item: null, isDeleting: false }
    }));
  }, []);

  // Navigation handlers with instant feedback
  const handleLogout = useCallback(async () => {
    setButtonStates(prev => ({ ...prev, logout: true }));
    
    try {
      await logout();
      router.push('/auth/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout');
      setButtonStates(prev => ({ ...prev, logout: false }));
    }
  }, [logout, router]);

  const handleLockVault = useCallback(() => {
    setButtonStates(prev => ({ ...prev, lock: true }));
    
    lockVault();
    router.push('/auth/login');
    toast.success('Vault locked successfully');
  }, [lockVault, router]);

  const navigateToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const navigateToHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Load data on mount with progressive enhancement
  useEffect(() => {
    startTransition(() => {
      loadVaultItems();
    });
  }, [loadVaultItems]);

  // Filter items when criteria change - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterItems();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [state.items, state.selectedCategory, filterItems]);

  // Security highlighting initialization - non-blocking
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    const sessionHighlight = sessionStorage.getItem('highlightSecurityIssues');
    
    if (highlight === 'security' || sessionHighlight === 'true') {
      startTransition(() => {
        setSecurityHighlight(prev => ({ ...prev, enabled: true, showBanner: true }));
      });
      
      // Clear session storage after reading
      sessionStorage.removeItem('highlightSecurityIssues');
      
      // Show toast notification
      toast.success('Security highlighting enabled - problematic items are highlighted in red');
    }
  }, [searchParams]);

  // Update security issues when items change - background processing
  useEffect(() => {
    if (securityHighlight.enabled && state.items.length > 0) {
      // Use background processing to prevent blocking
      if (window.scheduler && 'postTask' in window.scheduler) {
        window.scheduler.postTask(async () => {
          try {
            const securityData = await vaultWorker.current.executeTask('calculateSecurityIssues', {
              allItems: state.items
            }) as Array<[string, unknown]>;
            
            const itemsWithIssues = new Set<string>(securityData.map(([itemId]) => itemId));
            
            startTransition(() => {
              setSecurityHighlight(prev => ({
                ...prev,
                itemsWithIssues
              }));
            });
          } catch (error) {
            console.warn('Background security calculation failed:', error);
          }
        }, { priority: 'background' });
      } else {
        // Fallback with setTimeout
        setTimeout(() => {
          const itemsWithIssues = new Set<string>();
          
          state.items.forEach(item => {
            const issues = getSecurityIssues(item, state.items);
            if (issues.length > 0) {
              itemsWithIssues.add(item.id);
            }
          });
          
          startTransition(() => {
            setSecurityHighlight(prev => ({
              ...prev,
              itemsWithIssues
            }));
          });
        }, 0);
      }
    }
  }, [securityHighlight.enabled, state.items]);

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Your vault is empty
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Start securing your digital life by adding passwords, notes, and payment cards
      </p>
      <Button 
        onClick={() => setModals(prev => ({ ...prev, showAdd: true }))}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Your First Item
      </Button>
    </div>
  ), []);

  // Render vault item
  const renderVaultItem = useCallback((item: VaultItem) => {
    const hasSecurityIssue = securityHighlight.enabled && securityHighlight.itemsWithIssues.has(item.id);
    
    return (
      <Card 
        key={item.id}
        className={`hover:shadow-md transition-all duration-200 ${
          hasSecurityIssue ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <ItemIcon category={item.category} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {item.name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {item.category.replace('-', ' ')}
                  </Badge>
                  {item.favorite && (
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                  {hasSecurityIssue && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Security issue detected</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditItem(item)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit item</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete item</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {item.username && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Username</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono">{item.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(item.username || '', 'Username', item.id, 'username')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            {item.password && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Password</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono">
                    {state.showPasswords[item.id] ? item.password : '••••••••'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePasswordVisibility(item.id)}
                  >
                    {state.showPasswords[item.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(item.password || '', 'Password', item.id, 'password')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            {item.url && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Website</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm truncate max-w-32">{item.url}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }, [securityHighlight, state.showPasswords, handleEditItem, handleDeleteItem, copyToClipboard, togglePasswordVisibility]);

  // Update categories with counts
  const categoriesWithCounts = useMemo(() => {
    const counts = state.items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return categories.map(cat => ({
      ...cat,
      count: counts[cat.id] || 0
    }));
  }, [state.items]);

  // Cleanup on unmount
  useEffect(() => {
    const currentWorker = vaultWorker.current;
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Clear caches when leaving vault for memory management
      VaultService.clearAllCaches();
      currentWorker.destroy();
    };
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 relative ${
        state.loading || modals.showAdd || buttonStates.refresh || buttonStates.lock || buttonStates.logout || buttonStates.securityAudit 
          ? 'cursor-wait' 
          : ''
      }`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/dashboard')}
                      className="mr-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Back to Dashboard</p>
                  </TooltipContent>
                </Tooltip>
                
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Secure Vault
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {state.items.length} items • Welcome, {userProfile?.displayName || user?.email?.split('@')[0]}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        // Instant visual feedback
                        setModals(prev => ({ ...prev, showAdd: true }));
                        // Reset after modal opens
                        setTimeout(() => {
                          setModals(prev => ({ ...prev, showAdd: false }));
                        }, 200);
                      }}
                      disabled={modals.showAdd}
                      className={modals.showAdd ? 'bg-gray-100 dark:bg-gray-700' : ''}
                    >
                      {modals.showAdd ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Add Item
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new password, note, card, or identity</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-center">
                      Adding and updating items may take a moment due to AES-256 encryption 
                      processing to ensure your data remains secure.
                    </p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="flex items-center space-x-2 ml-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          // Instant visual feedback
                          setButtonStates(prev => ({ ...prev, refresh: true }));
                        }}
                        disabled={buttonStates.refresh}
                        className={buttonStates.refresh ? 'bg-gray-100 dark:bg-gray-700' : ''}
                      >
                        <RefreshCw className={`w-4 h-4 ${buttonStates.refresh ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh vault data</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          // Instant visual feedback
                          setButtonStates(prev => ({ ...prev, lock: true }));
                        }}
                        disabled={buttonStates.lock}
                        className={buttonStates.lock ? 'bg-gray-100 dark:bg-gray-700' : ''}
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lock vault and return to login</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          // Instant visual feedback
                          setButtonStates(prev => ({ ...prev, logout: true }));
                        }}
                        disabled={buttonStates.logout}
                        className={buttonStates.logout ? 'bg-gray-100 dark:bg-gray-700' : ''}
                      >
                        {buttonStates.logout ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sign out completely</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Grid className="w-5 h-5 mr-2" />
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categoriesWithCounts.map(category => {
                    const Icon = category.icon;
                    return (
                      <Tooltip key={category.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={state.selectedCategory === category.id ? "default" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => setState(prev => ({ ...prev, selectedCategory: category.id as VaultPageState['selectedCategory'] }))}
                          >
                            <Icon className="w-4 h-4 mr-3" />
                            <span className="flex-1 text-left">{category.label}</span>
                            <Badge variant="secondary" className="ml-2">
                              {category.count}
                            </Badge>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{category.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {
                          // Instant visual feedback
                          setButtonStates(prev => ({ ...prev, exportVault: true }));
                        }}
                        disabled={buttonStates.exportVault}
                      >
                        {buttonStates.exportVault ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-3"></div>
                        ) : (
                          <Download className="w-4 h-4 mr-3" />
                        )}
                        Export Vault
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Export encrypted vault data as JSON backup file</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {
                          // Instant visual feedback
                          setButtonStates(prev => ({ ...prev, importData: true }));
                        }}
                        disabled={buttonStates.importData}
                      >
                        {buttonStates.importData ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-3"></div>
                        ) : (
                          <Upload className="w-4 h-4 mr-3" />
                        )}
                        Import Data
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Import vault data from JSON backup file</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {
                          // Instant visual feedback
                          setButtonStates(prev => ({ ...prev, securityAudit: true }));
                        }}
                        disabled={buttonStates.securityAudit}
                      >
                        {buttonStates.securityAudit ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-3"></div>
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-3" />
                        )}
                        Security Audit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Analyze vault for weak, duplicate, and old passwords</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Search and Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search your vault..."
                      value={state.searchTerm}
                      onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled>
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Advanced filtering options (Coming Soon)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={state.viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setState(prev => ({ ...prev, viewMode: 'grid' }))}
                      >
                        <Grid className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Grid view</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={state.viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setState(prev => ({ ...prev, viewMode: 'list' }))}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>List view</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Security Highlighting Banner */}
              {securityHighlight.enabled && securityHighlight.showBanner && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                          Security Review Mode Active
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                          Items with security issues are highlighted with red borders and warning icons. 
                          {securityHighlight.itemsWithIssues.size > 0 
                            ? ` Found ${securityHighlight.itemsWithIssues.size} item${securityHighlight.itemsWithIssues.size === 1 ? '' : 's'} that need attention.`
                            : ' All items look secure!'
                          }
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-amber-600 dark:text-amber-400">
                          <span>• Weak passwords (less than 8 characters)</span>
                          <span>• Duplicate passwords</span>
                          <span>• Old passwords (90+ days)</span>
                          <span>• Missing passwords</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Instant visual feedback
                        setSecurityHighlight(prev => ({ ...prev, enabled: false, showBanner: false }));
                      }}
                      className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Vault Items */}
              {state.loading ? (
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {state.loadingProgress.stage}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {state.loadingProgress.current}/{state.loadingProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                        <div 
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${(state.loadingProgress.current / state.loadingProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <Shield className="h-3 w-3" />
                        <span>Zero-knowledge decryption happening locally in your browser</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : state.filteredItems.length === 0 ? (
                state.searchTerm || state.selectedCategory !== 'all' ? (
                  <div className="text-center py-16">
                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No items found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                ) : (
                  renderEmptyState()
                )
              ) : (
                <div className={
                  state.viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }>
                  {state.filteredItems.map(renderVaultItem)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Item Modal */}
        <AddItemModal
          isOpen={modals.showAdd}
          onClose={() => {
            setModals(prev => ({ ...prev, showAdd: false }));
            setModals(prev => ({ ...prev, editing: null }));
          }}
          onSave={handleSaveItem}
          editingItem={modals.editing}
          isLoading={modals.showAdd}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={modals.delete.isOpen}
          onClose={() => {
            setModals(prev => ({ ...prev, delete: { ...prev.delete, isOpen: false } }));
          }}
          onConfirm={() => {
            if (!modals.delete.item) return;
            
            // Immediate visual feedback
            setModals(prev => ({ ...prev, delete: { ...prev.delete, isDeleting: true } }));
            
            // Use startTransition for non-blocking state updates
            startTransition(() => {
              handleConfirmDelete();
            });
          }}
          itemName={modals.delete.item?.name || ''}
          itemType={modals.delete.item?.category.replace('-', ' ') || 'item'}
          isDeleting={modals.delete.isDeleting}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title={errorModalData.title}
          message={errorModalData.message}
          error={errorModalData.error}
          canRetry={errorModalData.canRetry}
          onRetry={errorModalData.onRetry}
        />
      </div>
    </TooltipProvider>
  );
}

export default function VaultPage() {
  return (
    <RouteGuard requireAuth={true} requireMasterPassword={true}>
      <VaultContent />
    </RouteGuard>
  );
} 