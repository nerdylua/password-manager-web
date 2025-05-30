'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { VaultItem } from '@/lib/encryption';
import { VaultService } from '@/lib/vault-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Shield, 
  Search, 
  Plus, 
  Key, 
  CreditCard, 
  User, 
  StickyNote,
  Star,
  Copy,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Filter,
  Grid,
  List,
  Lock,
  LogOut,
  Settings,
  Download,
  Upload,
  RefreshCw,
  ArrowLeft,
  Info,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import AddItemModal from '@/components/AddItemModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import ErrorModal from '@/components/ErrorModal';

interface VaultPageState {
  items: VaultItem[];
  filteredItems: VaultItem[];
  loading: boolean;
  searchTerm: string;
  selectedCategory: 'all' | 'login' | 'secure-note' | 'credit-card' | 'identity';
  viewMode: 'grid' | 'list';
  showPasswords: Record<string, boolean>;
}

// Security issue detection functions
const getSecurityIssues = (item: VaultItem, allItems: VaultItem[]) => {
  const issues: { type: 'weak' | 'duplicate' | 'old' | 'missing'; message: string }[] = [];
  
  // Check for weak passwords
  if (item.password && item.password.length < 8) {
    issues.push({ type: 'weak', message: 'Password is too short (less than 8 characters)' });
  }
  
  // Check for duplicate passwords
  if (item.password) {
    const duplicates = allItems.filter(other => 
      other.id !== item.id && other.password === item.password
    );
    if (duplicates.length > 0) {
      issues.push({ type: 'duplicate', message: `Password is used in ${duplicates.length} other ${duplicates.length === 1 ? 'item' : 'items'}` });
    }
  }
  
  // Check for old passwords (90+ days)
  if (item.lastModified) {
    const daysSinceModified = (Date.now() - item.lastModified) / (1000 * 60 * 60 * 24);
    if (daysSinceModified > 90) {
      issues.push({ type: 'old', message: `Password hasn't been updated in ${Math.floor(daysSinceModified)} days` });
    }
  }
  
  // Check for missing passwords in login items
  if (item.category === 'login' && !item.password) {
    issues.push({ type: 'missing', message: 'Login item is missing a password' });
  }
  
  return issues;
};

function VaultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, logout, lockVault, getMasterPassword } = useAuth();
  
  // Memoized refs like topics pattern for better performance
  const masterPassword = React.useMemo(() => getMasterPassword(), [getMasterPassword]);
  
  const [state, setState] = useState<VaultPageState>({
    items: [],
    filteredItems: [],
    loading: true,
    searchTerm: '',
    selectedCategory: 'all',
    viewMode: 'grid',
    showPasswords: {},
  });

  // Security highlighting state
  const [securityHighlight, setSecurityHighlight] = useState({
    enabled: false,
    itemsWithIssues: new Set<string>(),
    showBanner: false
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: VaultItem | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    item: null,
    isDeleting: false
  });

  // Instant feedback states for buttons
  const [buttonStates, setButtonStates] = useState<{
    addItem: boolean;
    refresh: boolean;
    lock: boolean;
    logout: boolean;
    editingItems: Set<string>;
    deletingItems: Set<string>;
    copyingItems: Map<string, string>; // itemId -> field being copied
    exportVault: boolean;
    importData: boolean;
    securityAudit: boolean;
  }>({
    addItem: false,
    refresh: false,
    lock: false,
    logout: false,
    editingItems: new Set(),
    deletingItems: new Set(),
    copyingItems: new Map(),
    exportVault: false,
    importData: false,
    securityAudit: false
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

  // Helper function to show detailed error modal
  const showDetailedError = useCallback((title: string, message: string, error: unknown, canRetry = false, onRetry?: () => void) => {
    setErrorModalData({ title, message, error, canRetry, onRetry });
    setShowErrorModal(true);
  }, []);

  // Optimized like topics - early return if no user
  React.useEffect(() => {
    if (!user || !masterPassword) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    // Preload for instant access
    VaultService.preloadVaultData(user.uid, masterPassword);
    
    // Direct listener setup like topics
    const unsubscribe = VaultService.setupVaultListener(
      user.uid,
      masterPassword,
      (items) => {
        // Direct state update like topics
        setState(prev => ({ 
          ...prev, 
          items, 
          filteredItems: prev.selectedCategory === 'all' ? items : items.filter(item => 
            item.category === prev.selectedCategory
          ),
          loading: false 
        }));
      },
      (error) => {
        console.error('Vault listener error:', error);
        setState(prev => ({ ...prev, loading: false }));
        showDetailedError(
          'Vault Connection Error',
          'Lost connection to your vault. Attempting to reconnect...',
          error,
          true,
          () => window.location.reload()
        );
      },
      { limit: 100 }
    );

    // Simple cleanup like topics
    return unsubscribe;
  }, [user, masterPassword, showDetailedError]);

  // Force refresh vault items (for sync issues)
  const forceRefreshVault = useCallback(async () => {
    if (!user) return;
    
    // Instant visual feedback
    setButtonStates(prev => ({ ...prev, refresh: true }));
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      if (!masterPassword) {
        throw new Error('Master password not available');
      }
      
      // Load fresh data from Firebase
      const items = await VaultService.getAllItems(user.uid, masterPassword, { 
        limit: 100
      });
      
      setState(prev => ({ 
        ...prev, 
        items, 
        filteredItems: prev.selectedCategory === 'all' ? items : items.filter(item => 
          item.category === prev.selectedCategory
        ),
        loading: false 
      }));
      
      toast.success('Vault refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh vault:', error);
      setState(prev => ({ ...prev, loading: false }));
      toast.error('Failed to refresh vault');
    } finally {
      // Reset button state
      setButtonStates(prev => ({ ...prev, refresh: false }));
    }
  }, [user, masterPassword]);

  // Load vault items with preloading
  const loadVaultItems = useCallback(async () => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Get master password from AuthContext
      const masterPassword = getMasterPassword();
      if (!masterPassword) {
        throw new Error('Master password not available');
      }
      
      // Load from Firebase with encryption (use cache for ultra-fast loading)
      const items = await VaultService.getAllItems(user.uid, masterPassword, { 
        limit: 100, // Load first 100 items for better performance
        useCache: true // Use cache for instant loading
      });
      
      setState(prev => ({ 
        ...prev, 
        items, 
        filteredItems: items,
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load vault items:', error);
      setState(prev => ({ ...prev, loading: false }));
      
      // Show detailed error modal instead of just toast
      showDetailedError(
        'Failed to Load Vault',
        'Unable to load your vault items. This could be due to network issues or authentication problems.',
        error,
        true,
        loadVaultItems
      );
    }
  }, [user, getMasterPassword, showDetailedError]);

  // Note: Firebase VaultService auto-saves individual items, no bulk save needed
  const saveVaultItems = useCallback((items: VaultItem[]) => {
    // This function is no longer needed since Firebase saves items individually
    // Keeping for compatibility but items are saved in individual operations
  }, []);

  // Filter items when search or category changes (with safe filtering like topics)
  const filterItems = useCallback(() => {
    setState(prevState => {
      // Safe filtering like topics - check for valid items
      let filtered = prevState.items.filter(item => item && item.name);

      // Filter by category
      if (prevState.selectedCategory !== 'all') {
        filtered = filtered.filter(item => 
          item && item.category === prevState.selectedCategory
        );
      }

      // Filter by search term with safe checks
      if (prevState.searchTerm) {
        const term = prevState.searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
          item && (
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.username && item.username.toLowerCase().includes(term)) ||
            (item.url && item.url.toLowerCase().includes(term)) ||
            (item.notes && item.notes.toLowerCase().includes(term))
          )
        );
      }

      return { ...prevState, filteredItems: filtered };
    });
  }, []);

  useEffect(() => {
    loadVaultItems();
  }, [loadVaultItems]);

  // Security highlighting initialization effect
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    const sessionHighlight = sessionStorage.getItem('highlightSecurityIssues');
    
    if (highlight === 'security' || sessionHighlight === 'true') {
      setSecurityHighlight(prev => ({ ...prev, enabled: true, showBanner: true }));
      
      // Clear session storage after reading
      sessionStorage.removeItem('highlightSecurityIssues');
      
      // Show toast notification
      toast.success('Security highlighting enabled - problematic items are highlighted in red');
    }
  }, [searchParams]);

  // Update security issues when items change
  useEffect(() => {
    if (securityHighlight.enabled && state.items.length > 0) {
      const itemsWithIssues = new Set<string>();
      
      state.items.forEach(item => {
        const issues = getSecurityIssues(item, state.items);
        if (issues.length > 0) {
          itemsWithIssues.add(item.id);
        }
      });
      
      setSecurityHighlight(prev => ({
        ...prev,
        itemsWithIssues
      }));
    }
  }, [securityHighlight.enabled, state.items]);

  // Dismiss security highlighting
  const dismissSecurityHighlight = useCallback(() => {
    setSecurityHighlight({
      enabled: false,
      itemsWithIssues: new Set(),
      showBanner: false
    });
    toast.success('Security highlighting disabled');
  }, []);

  // Filter items when search or category changes
  useEffect(() => {
    filterItems();
  }, [state.items, state.selectedCategory, state.searchTerm, filterItems]);

  // Cleanup on unmount for memory management
  useEffect(() => {
    return () => {
      // Clear caches when leaving vault for memory management
      VaultService.clearAllCaches();
    };
  }, []);

  const handleSaveItem = async (itemData: Partial<VaultItem>) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!masterPassword) {
      toast.error('Master password not available');
      return;
    }

    // Immediate state change for instant UI feedback
    setIsAddingItem(true);

    try {
      if (editingItem) {
        // Immediate loading toast
        toast.loading('Updating item...', { id: 'save-item' });
        
        // Create complete VaultItem object for updating
        const completeItem: VaultItem = {
          id: editingItem.id,
          created: editingItem.created,
          lastModified: Date.now(),
          name: itemData.name || editingItem.name,
          category: itemData.category || editingItem.category,
          username: itemData.username || editingItem.username || '',
          password: itemData.password || editingItem.password || '',
          url: itemData.url || editingItem.url || '',
          notes: itemData.notes || editingItem.notes || '',
          favorite: itemData.favorite ?? editingItem.favorite,
          tags: itemData.tags || editingItem.tags || [],
          // Credit card fields
          cardNumber: itemData.cardNumber || editingItem.cardNumber || '',
          cardholderName: itemData.cardholderName || editingItem.cardholderName || '',
          expiryDate: itemData.expiryDate || editingItem.expiryDate || '',
          cvv: itemData.cvv || editingItem.cvv || '',
          // Identity fields
          firstName: itemData.firstName || editingItem.firstName || '',
          lastName: itemData.lastName || editingItem.lastName || '',
          email: itemData.email || editingItem.email || '',
          phone: itemData.phone || editingItem.phone || '',
          company: itemData.company || editingItem.company || '',
          address: itemData.address || editingItem.address || '',
          title: itemData.title || editingItem.title || '',
          ssn: itemData.ssn || editingItem.ssn || ''
        };
        
        // Simple optimistic update
        setState(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === editingItem.id ? completeItem : item
          ),
          filteredItems: prev.filteredItems.map(item => 
            item.id === editingItem.id ? completeItem : item
          )
        }));
        
        await VaultService.updateItem(
          editingItem.id,
          user.uid,
          completeItem,
          masterPassword
        );
        
        toast.success('Item updated successfully', { id: 'save-item' });
        setEditingItem(null);
        setShowAddModal(false);
      } else {
        toast.loading('Adding item to your vault...', { id: 'save-item' });
        
        // Create temporary item for immediate UI feedback
        const tempItem: VaultItem = {
          id: `temp-${Date.now()}`,
          created: Date.now(),
          lastModified: Date.now(),
          name: itemData.name!,
          username: itemData.username || '',
          password: itemData.password || '',
          url: itemData.url || '',
          notes: itemData.notes || '',
          category: itemData.category!,
          favorite: itemData.favorite || false,
          tags: itemData.tags || [],
          cardNumber: itemData.cardNumber || '',
          cardholderName: itemData.cardholderName || '',
          expiryDate: itemData.expiryDate || '',
          cvv: itemData.cvv || '',
          firstName: itemData.firstName || '',
          lastName: itemData.lastName || '',
          email: itemData.email || '',
          phone: itemData.phone || '',
          company: itemData.company || '',
          address: itemData.address || '',
          title: itemData.title || '',
          ssn: itemData.ssn || ''
        };
        
        // Simple optimistic update
        setState(prev => ({
          ...prev,
          items: [tempItem, ...prev.items],
          filteredItems: prev.selectedCategory === 'all' || prev.selectedCategory === tempItem.category
            ? [tempItem, ...prev.filteredItems] 
            : prev.filteredItems
        }));

        await VaultService.addItem(
          user.uid,
          {
            name: itemData.name!,
            username: itemData.username || '',
            password: itemData.password || '',
            url: itemData.url || '',
            notes: itemData.notes || '',
            category: itemData.category!,
            favorite: itemData.favorite || false,
            tags: itemData.tags || [],
            cardNumber: itemData.cardNumber || '',
            cardholderName: itemData.cardholderName || '',
            expiryDate: itemData.expiryDate || '',
            cvv: itemData.cvv || '',
            firstName: itemData.firstName || '',
            lastName: itemData.lastName || '',
            email: itemData.email || '',
            phone: itemData.phone || '',
            company: itemData.company || '',
            address: itemData.address || '',
            title: itemData.title || '',
            ssn: itemData.ssn || ''
          },
          masterPassword
        );

        // Remove temporary item (real one comes via listener)
        setState(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== tempItem.id),
          filteredItems: prev.filteredItems.filter(item => item.id !== tempItem.id)
        }));

        toast.success('Item added to your vault successfully', { id: 'save-item' });
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      
      // Simple error recovery
      if (editingItem) {
        // Revert to original item
        setState(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === editingItem.id ? editingItem : item
          ),
          filteredItems: prev.filteredItems.map(item => 
            item.id === editingItem.id ? editingItem : item
          )
        }));
      } else {
        // Remove temp items
        setState(prev => ({
          ...prev,
          items: prev.items.filter(item => !item.id.startsWith('temp-')),
          filteredItems: prev.filteredItems.filter(item => !item.id.startsWith('temp-'))
        }));
      }
      
      toast.error(
        error instanceof Error && error.message.includes('permission') 
          ? 'Permission denied. Please try logging in again.'
          : 'Failed to save item. Please try again.',
        { id: 'save-item' }
      );
      throw error;
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleEditItem = (item: VaultItem) => {
    // Instant visual feedback
    setButtonStates(prev => ({
      ...prev,
      editingItems: new Set(prev.editingItems).add(item.id)
    }));

    setEditingItem(item);
    setShowAddModal(true);

    // Reset button state after modal opens
    setTimeout(() => {
      setButtonStates(prev => {
        const newSet = new Set(prev.editingItems);
        newSet.delete(item.id);
        return { ...prev, editingItems: newSet };
      });
    }, 200);
  };

  const handleDeleteItem = (item: VaultItem) => {
    // Instant visual feedback
    setButtonStates(prev => ({
      ...prev,
      deletingItems: new Set(prev.deletingItems).add(item.id)
    }));

    setDeleteModal({
      isOpen: true,
      item,
      isDeleting: false
    });

    // Reset button state after modal opens
    setTimeout(() => {
      setButtonStates(prev => {
        const newSet = new Set(prev.deletingItems);
        newSet.delete(item.id);
        return { ...prev, deletingItems: newSet };
      });
    }, 200);
  };

  const handleConfirmDelete = async () => {
    if (!user || !deleteModal.item) {
      toast.error('User not authenticated');
      return;
    }

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    toast.loading('Deleting item...', { id: 'delete-item' });

    // Optimistic UI update - immediately remove from local state
    const itemToDelete = deleteModal.item;
    setState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemToDelete.id),
      filteredItems: prev.filteredItems.filter(item => item.id !== itemToDelete.id)
    }));

    try {
      // Set operation type for optimized debouncing
      const lastUpdateType = 'delete';
      
      await VaultService.deleteItem(deleteModal.item.id, user.uid);
      
      toast.success('Item deleted successfully', { id: 'delete-item' });
      setDeleteModal({ isOpen: false, item: null, isDeleting: false });
    } catch (error) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        items: [...prev.items, itemToDelete].sort((a, b) => b.lastModified - a.lastModified),
        filteredItems: prev.selectedCategory === 'all' || prev.selectedCategory === itemToDelete.category
          ? [...prev.filteredItems, itemToDelete].sort((a, b) => b.lastModified - a.lastModified)
          : prev.filteredItems
      }));
      
      // If error is "item not found", just refresh and consider it successful
      if (error instanceof Error && error.message.includes('Item not found')) {
        forceRefreshVault();
        toast.success('Item removed', { id: 'delete-item' });
        setDeleteModal({ isOpen: false, item: null, isDeleting: false });
        return;
      }
      
      // If error is about different user, provide helpful message
      if (error instanceof Error && error.message.includes('belongs to a different user')) {
        showDetailedError(
          'Item Belongs to Different Account',
          'This item was created with a different user account. This can happen if you signed out and back in. Use the Search button (🔍) to find orphaned items.',
          error,
          false // No retry for this type of error
        );
        
        setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        return;
      }
      
      // Show detailed error modal for other errors
      showDetailedError(
        'Failed to Delete Item',
        'Unable to delete your vault item. This could be due to network issues, permission problems, or server errors.',
        error,
        true,
        handleConfirmDelete
      );
      
      toast.error(
        error instanceof Error && error.message.includes('permission')
          ? 'Permission denied. Please try logging in again.'
          : 'Failed to delete item. Please try again.',
        { id: 'delete-item' }
      );
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleCancelDelete = () => {
    setDeleteModal({ isOpen: false, item: null, isDeleting: false });
  };

  const togglePasswordVisibility = (itemId: string) => {
    setState(prev => ({
      ...prev,
      showPasswords: {
        ...prev.showPasswords,
        [itemId]: !prev.showPasswords[itemId]
      }
    }));
  };

  const copyToClipboard = async (text: string, label: string, itemId?: string, field?: string) => {
    try {
      // Instant visual feedback
      if (itemId && field) {
        setButtonStates(prev => ({
          ...prev,
          copyingItems: new Map(prev.copyingItems).set(itemId, field)
        }));
      }

      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
      
      // Reset visual feedback after short delay
      if (itemId && field) {
        setTimeout(() => {
          setButtonStates(prev => {
            const newMap = new Map(prev.copyingItems);
            newMap.delete(itemId);
            return { ...prev, copyingItems: newMap };
          });
        }, 800);
      }
    } catch (_error) {
      toast.error('Failed to copy to clipboard');
      // Reset visual feedback on error
      if (itemId && field) {
        setButtonStates(prev => {
          const newMap = new Map(prev.copyingItems);
          newMap.delete(itemId);
          return { ...prev, copyingItems: newMap };
        });
      }
    }
  };

  const handleLogout = async () => {
    // Instant visual feedback
    setButtonStates(prev => ({ ...prev, logout: true }));

    try {
      // Clear vault access authorization
      sessionStorage.removeItem('vaultAccessAuthorized');
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    } finally {
      // Reset button state
      setButtonStates(prev => ({ ...prev, logout: false }));
    }
  };

  const handleLockVault = () => {
    // Instant visual feedback
    setButtonStates(prev => ({ ...prev, lock: true }));

    // Clear vault access authorization
    sessionStorage.removeItem('vaultAccessAuthorized');
    lockVault();
    toast.success('Vault locked successfully');

    // Reset button state
    setTimeout(() => {
      setButtonStates(prev => ({ ...prev, lock: false }));
    }, 100);
  };

  const navigateToDashboard = () => {
    // Clear vault access authorization when leaving vault
    sessionStorage.removeItem('vaultAccessAuthorized');
    router.push('/dashboard');
  };

  // Export vault data as encrypted JSON file
  const handleExportVault = useCallback(async () => {
    if (!user || !masterPassword) {
      toast.error('Authentication required for export');
      return;
    }

    setButtonStates(prev => ({ ...prev, exportVault: true }));
    toast.loading('Preparing vault export...', { id: 'export-vault' });

    try {
      // Get all vault items
      const items = await VaultService.getAllItems(user.uid, masterPassword);
      
      // Group items by category for better organization
      const groupedItems = {
        login: items.filter(item => item.category === 'login'),
        'secure-note': items.filter(item => item.category === 'secure-note'),
        'credit-card': items.filter(item => item.category === 'credit-card'),
        identity: items.filter(item => item.category === 'identity')
      };

      // Create readable export data structure
      const exportData = {
        "_comment_header": "CryptLock Password Manager - Vault Backup",
        "_security_warning": "This file contains encrypted vault data - store securely and do not share",
        "export_info": {
          "application": "CryptLock Password Manager",
          "version": "1.0",
          "export_date": new Date().toLocaleString(),
          "export_timestamp": new Date().toISOString(),
          "total_items": items.length,
          "items_by_category": {
            "logins": groupedItems.login.length,
            "secure_notes": groupedItems['secure-note'].length,
            "credit_cards": groupedItems['credit-card'].length,
            "identities": groupedItems.identity.length
          }
        },
        "vault_data": {
          "logins": groupedItems.login.map(item => ({
            id: item.id,
            name: item.name,
            username: item.username || "",
            password: item.password || "",
            url: item.url || "",
            notes: item.notes || "",
            favorite: item.favorite || false,
            tags: item.tags || []
          })),
          "secure_notes": groupedItems['secure-note'].map(item => ({
            id: item.id,
            name: item.name,
            notes: item.notes || "",
            favorite: item.favorite || false,
            tags: item.tags || []
          })),
          "credit_cards": groupedItems['credit-card'].map(item => ({
            id: item.id,
            name: item.name,
            cardholderName: item.cardholderName || "",
            cardNumber: item.cardNumber || "",
            expiryDate: item.expiryDate || "",
            cvv: item.cvv || "",
            notes: item.notes || "",
            favorite: item.favorite || false,
            tags: item.tags || []
          })),
          "identities": groupedItems.identity.map(item => ({
            id: item.id,
            name: item.name,
            firstName: item.firstName || "",
            lastName: item.lastName || "",
            email: item.email || "",
            phone: item.phone || "",
            company: item.company || "",
            address: item.address || "",
            notes: item.notes || "",
            favorite: item.favorite || false,
            tags: item.tags || []
          }))
        },
        "_comment_legacy": "Legacy format included for backward compatibility",
        "data": items.map(item => ({
          ...item,
          // Remove sensitive metadata for export
          lastModified: undefined,
          created: undefined
        }))
      };

      // Create formatted JSON with better indentation for readability
      const jsonString = JSON.stringify(exportData, null, 4);

      // Create and download file
      const blob = new Blob([jsonString], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cryptlock-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${items.length} items successfully`, { id: 'export-vault' });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export vault data', { id: 'export-vault' });
    } finally {
      setButtonStates(prev => ({ ...prev, exportVault: false }));
    }
  }, [user, masterPassword]);

  // Import vault data from JSON file
  const handleImportData = useCallback(() => {
    if (!user || !masterPassword) {
      toast.error('Authentication required for import');
      return;
    }

    setButtonStates(prev => ({ ...prev, importData: true }));

    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    // Add event listener for when dialog is canceled
    const resetState = () => {
      setButtonStates(prev => ({ ...prev, importData: false }));
    };

    // Reset state when window regains focus (user canceled dialog)
    const handleFocus = () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          resetState();
        }
      }, 100);
      window.removeEventListener('focus', handleFocus);
    };

    window.addEventListener('focus', handleFocus);

    input.onchange = async (e) => {
      // Remove the focus listener since file was selected
      window.removeEventListener('focus', handleFocus);
      
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resetState();
        return;
      }

      toast.loading('Processing import file...', { id: 'import-data' });

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate import data structure
        if (!importData.data || !Array.isArray(importData.data)) {
          throw new Error('Invalid import file format');
        }

        let successCount = 0;
        let errorCount = 0;

        // Import each item
        for (const itemData of importData.data) {
          try {
            await VaultService.addItem(user.uid, {
              name: itemData.name,
              category: itemData.category,
              username: itemData.username || '',
              password: itemData.password || '',
              url: itemData.url || '',
              notes: itemData.notes || '',
              favorite: itemData.favorite || false,
              tags: itemData.tags || [],
              cardNumber: itemData.cardNumber || '',
              cardholderName: itemData.cardholderName || '',
              expiryDate: itemData.expiryDate || '',
              cvv: itemData.cvv || '',
              firstName: itemData.firstName || '',
              lastName: itemData.lastName || '',
              email: itemData.email || '',
              phone: itemData.phone || '',
              company: itemData.company || '',
              address: itemData.address || ''
            }, masterPassword);
            successCount++;
          } catch {
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ''}`, { id: 'import-data' });
        } else {
          toast.error('No items could be imported', { id: 'import-data' });
        }
      } catch (error) {
        console.error('Import failed:', error);
        toast.error('Failed to import data. Please check file format.', { id: 'import-data' });
      } finally {
        resetState();
      }
    };

    // Also handle if the input is never interacted with
    input.oncancel = resetState;

    input.click();
    
    // Fallback: Reset state after 10 seconds if nothing happens
    setTimeout(() => {
      if (buttonStates.importData) {
        resetState();
      }
    }, 10000);
  }, [user, masterPassword, buttonStates.importData]);

  // Perform security audit on vault items
  const handleSecurityAudit = useCallback(async () => {
    if (!user || !masterPassword) {
      toast.error('Authentication required for security audit');
      return;
    }

    setButtonStates(prev => ({ ...prev, securityAudit: true }));
    toast.loading('Analyzing vault security...', { id: 'security-audit' });

    try {
      const items = await VaultService.getAllItems(user.uid, masterPassword);
      
      let weakPasswords = 0;
      let duplicatePasswords = 0;
      let oldPasswords = 0;
      let missingPasswords = 0;
      const passwordMap = new Map<string, number>();

      const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);

      items.forEach(item => {
        if (item.category === 'login') {
          if (!item.password) {
            missingPasswords++;
          } else {
            // Check password strength
            if (item.password.length < 8 || 
                !/[A-Z]/.test(item.password) || 
                !/[a-z]/.test(item.password) || 
                !/\d/.test(item.password)) {
              weakPasswords++;
            }

            // Check for duplicates
            const count = passwordMap.get(item.password) || 0;
            passwordMap.set(item.password, count + 1);
            if (count > 0) {
              duplicatePasswords++;
            }

            // Check age (if lastModified is available)
            if (item.lastModified && item.lastModified < sixMonthsAgo) {
              oldPasswords++;
            }
          }
        }
      });

      // Create audit report
      const issues = [];
      if (weakPasswords > 0) issues.push(`${weakPasswords} weak passwords`);
      if (duplicatePasswords > 0) issues.push(`${duplicatePasswords} duplicate passwords`);
      if (oldPasswords > 0) issues.push(`${oldPasswords} old passwords (6+ months)`);
      if (missingPasswords > 0) issues.push(`${missingPasswords} missing passwords`);

      if (issues.length === 0) {
        toast.success('🛡️ Excellent! No security issues found in your vault.', { 
          id: 'security-audit',
          duration: 4000
        });
      } else {
        toast.error(`🔍 Security issues found: ${issues.join(', ')}. Consider updating these items.`, { 
          id: 'security-audit',
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Security audit failed:', error);
      toast.error('Failed to complete security audit', { id: 'security-audit' });
    } finally {
      setButtonStates(prev => ({ ...prev, securityAudit: false }));
    }
  }, [user, masterPassword]);

  const categories = [
    { id: 'all', label: 'All Items', icon: Grid, count: state.items.length, description: 'View all vault items' },
    { id: 'login', label: 'Logins', icon: Key, count: state.items.filter(i => i.category === 'login').length, description: 'Website and app passwords' },
    { id: 'secure-note', label: 'Secure Notes', icon: StickyNote, count: state.items.filter(i => i.category === 'secure-note').length, description: 'Private notes and documents' },
    { id: 'credit-card', label: 'Payment Cards', icon: CreditCard, count: state.items.filter(i => i.category === 'credit-card').length, description: 'Credit and debit cards' },
    { id: 'identity', label: 'Identities', icon: User, count: state.items.filter(i => i.category === 'identity').length, description: 'Personal identity information' },
  ];

  const getItemIcon = (category: VaultItem['category']) => {
    switch (category) {
      case 'login': return Key;
      case 'secure-note': return StickyNote;
      case 'credit-card': return CreditCard;
      case 'identity': return User;
      default: return Key;
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
        <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Your vault is empty
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        Start by adding your first password, secure note, or payment card to your encrypted vault.
      </p>
      
      {/* Quick tips for new users */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 max-w-md">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-left">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Pro Tip</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Use the password generator to create strong, unique passwords for every account
            </p>
          </div>
        </div>
      </div>

      <Button 
        onClick={() => {
          // Instant visual feedback
          setButtonStates(prev => ({ ...prev, addItem: true }));
          setShowAddModal(true);
          // Reset after modal opens
          setTimeout(() => {
            setButtonStates(prev => ({ ...prev, addItem: false }));
          }, 200);
        }} 
        size="lg"
        disabled={buttonStates.addItem}
        className={buttonStates.addItem ? 'bg-gray-100 dark:bg-gray-700' : ''}
      >
        {buttonStates.addItem ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
        ) : (
          <Plus className="w-5 h-5 mr-2" />
        )}
        Add Your First Item
      </Button>
    </div>
  );

  const renderVaultItem = (item: VaultItem) => {
    const ItemIcon = getItemIcon(item.category);
    const isPasswordVisible = state.showPasswords[item.id];
    
    // Check for security issues if highlighting is enabled
    const hasSecurityIssues = securityHighlight.enabled && securityHighlight.itemsWithIssues.has(item.id);
    const securityIssues = hasSecurityIssues ? getSecurityIssues(item, state.items) : [];

    if (state.viewMode === 'list') {
      return (
        <Card 
          key={item.id} 
          className={`hover:shadow-md transition-shadow ${
            hasSecurityIssues 
              ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
              : ''
          }`}
        >
          <CardContent className="p-4">
            {/* Security Issues Banner */}
            {hasSecurityIssues && (
              <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">Security Issues Found:</p>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
                      {securityIssues.map((issue, index) => (
                        <li key={index}>• {issue.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <ItemIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    {item.favorite && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Favorite item</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {item.category.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  {/* Enhanced details section */}
                  <div className="mt-2 space-y-1 text-sm">
                    {item.username && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 w-16">User:</span>
                        <span className="font-mono text-gray-900 dark:text-white">{item.username}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${
                                buttonStates.copyingItems.get(item.id) === 'username' 
                                  ? 'bg-green-100 dark:bg-green-900' 
                                  : ''
                              }`}
                              onClick={() => copyToClipboard(item.username!, 'Username', item.id, 'username')}
                              disabled={buttonStates.copyingItems.has(item.id)}
                            >
                              {buttonStates.copyingItems.get(item.id) === 'username' ? (
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy username</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                    
                    {item.password && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 w-16">Pass:</span>
                        <span className="font-mono text-gray-900 dark:text-white">
                          {isPasswordVisible ? item.password : '••••••••'}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${
                                buttonStates.copyingItems.get(item.id) === 'password' 
                                  ? 'bg-green-100 dark:bg-green-900' 
                                  : ''
                              }`}
                              onClick={() => copyToClipboard(item.password!, 'Password', item.id, 'password')}
                              disabled={buttonStates.copyingItems.has(item.id)}
                            >
                              {buttonStates.copyingItems.get(item.id) === 'password' ? (
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy password</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => togglePasswordVisibility(item.id)}
                            >
                              {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isPasswordVisible ? 'Hide password' : 'Show password'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                    
                    {item.url && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 w-16">URL:</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a 
                              href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {item.url}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Open website</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${
                                buttonStates.copyingItems.get(item.id) === 'url' 
                                  ? 'bg-green-100 dark:bg-green-900' 
                                  : ''
                              }`}
                              onClick={() => copyToClipboard(item.url!, 'URL', item.id, 'url')}
                              disabled={buttonStates.copyingItems.has(item.id)}
                            >
                              {buttonStates.copyingItems.get(item.id) === 'url' ? (
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy URL</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      disabled={buttonStates.editingItems.has(item.id)}
                      className={buttonStates.editingItems.has(item.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}
                    >
                      {buttonStates.editingItems.has(item.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Edit className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit this item</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item)}
                      disabled={buttonStates.deletingItems.has(item.id)}
                      className={`text-red-600 hover:text-red-700 ${
                        buttonStates.deletingItems.has(item.id) ? 'bg-red-100 dark:bg-red-900' : ''
                      }`}
                    >
                      {buttonStates.deletingItems.has(item.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete this item permanently</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            {item.notes && (
              <div className="mt-3 pt-3 border-t">
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {item.notes}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{item.notes}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Grid view with enhanced tooltips
    return (
      <Card 
        key={item.id} 
        className={`hover:shadow-lg transition-all duration-200 cursor-pointer group ${
          hasSecurityIssues 
            ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
            : ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                <ItemIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {item.name}
                  </h3>
                  {hasSecurityIssues && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div>
                          <p className="font-medium mb-1">Security Issues:</p>
                          <ul className="text-xs space-y-0.5">
                            {securityIssues.map((issue, index) => (
                              <li key={index}>• {issue.message}</li>
                            ))}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {item.favorite && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Favorite item</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs mt-1">
                  {item.category.replace('-', ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditItem(item)}
                    disabled={buttonStates.editingItems.has(item.id)}
                    className={buttonStates.editingItems.has(item.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}
                  >
                    {buttonStates.editingItems.has(item.id) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit this item</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(item)}
                    disabled={buttonStates.deletingItems.has(item.id)}
                    className={`text-red-600 hover:text-red-700 ${
                      buttonStates.deletingItems.has(item.id) ? 'bg-red-100 dark:bg-red-900' : ''
                    }`}
                  >
                    {buttonStates.deletingItems.has(item.id) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete this item permanently</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            {item.username && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Username:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-mono truncate max-w-32">{item.username}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${
                          buttonStates.copyingItems.get(item.id) === 'username' 
                            ? 'bg-green-100 dark:bg-green-900' 
                            : ''
                        }`}
                        onClick={() => copyToClipboard(item.username!, 'Username', item.id, 'username')}
                        disabled={buttonStates.copyingItems.has(item.id)}
                      >
                        {buttonStates.copyingItems.get(item.id) === 'username' ? (
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy username</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
            {item.password && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Password:</span>
                <div className="flex items-center space-x-1">
                  <span className="font-mono text-sm">
                    {isPasswordVisible ? item.password : '••••••••'}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${
                          buttonStates.copyingItems.get(item.id) === 'password' 
                            ? 'bg-green-100 dark:bg-green-900' 
                            : ''
                        }`}
                        onClick={() => copyToClipboard(item.password!, 'Password', item.id, 'password')}
                        disabled={buttonStates.copyingItems.has(item.id)}
                      >
                        {buttonStates.copyingItems.get(item.id) === 'password' ? (
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy password</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => togglePasswordVisibility(item.id)}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPasswordVisible ? 'Hide password' : 'Show password'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
            {item.url && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Website:</span>
                <div className="flex items-center space-x-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a 
                        href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-32"
                      >
                        {item.url}
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open website in new tab</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${
                          buttonStates.copyingItems.get(item.id) === 'url' 
                            ? 'bg-green-100 dark:bg-green-900' 
                            : ''
                        }`}
                        onClick={() => copyToClipboard(item.url!, 'URL', item.id, 'url')}
                        disabled={buttonStates.copyingItems.has(item.id)}
                      >
                        {buttonStates.copyingItems.get(item.id) === 'url' ? (
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy URL</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
          {item.notes && (
            <div className="mt-3 pt-3 border-t">
              <Tooltip>
                <TooltipTrigger>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 cursor-help">
                    {item.notes}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{item.notes}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
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
                      onClick={navigateToDashboard}
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
                        setButtonStates(prev => ({ ...prev, addItem: true }));
                        setShowAddModal(true);
                        // Reset after modal opens
                        setTimeout(() => {
                          setButtonStates(prev => ({ ...prev, addItem: false }));
                        }, 200);
                      }}
                      disabled={buttonStates.addItem}
                      className={buttonStates.addItem ? 'bg-gray-100 dark:bg-gray-700' : ''}
                    >
                      {buttonStates.addItem ? (
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
                        onClick={forceRefreshVault}
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
                        onClick={handleLockVault}
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
                        onClick={handleLogout}
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
                  {categories.map(category => {
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
                        onClick={handleExportVault}
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
                        onClick={handleImportData}
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
                        onClick={handleSecurityAudit}
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
                      onClick={dismissSecurityHighlight}
                      className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Vault Items */}
              {state.loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
          isLoading={isAddingItem}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          itemName={deleteModal.item?.name || ''}
          itemType={deleteModal.item?.category.replace('-', ' ') || 'item'}
          isDeleting={deleteModal.isDeleting}
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