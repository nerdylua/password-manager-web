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
  HelpCircle
} from 'lucide-react';
import RouteGuard from '@/components/RouteGuard';
import AddItemModal from '@/components/AddItemModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ErrorModal from '@/components/ErrorModal';

interface VaultPageState {
  items: VaultItem[];
  filteredItems: VaultItem[];
  loading: boolean;
  searchTerm: string;
  selectedCategory: 'all' | 'login' | 'secure-note' | 'credit-card' | 'identity';
  viewMode: 'grid' | 'list';
  showPasswords: Record<string, boolean>;
  operationLoading: boolean; // For add/update/delete operations
}

function VaultContent() {
  const router = useRouter();
  const { user, userProfile, logout, lockVault, getMasterPassword } = useAuth();
  const [state, setState] = useState<VaultPageState>({
    items: [],
    filteredItems: [],
    loading: true,
    searchTerm: '',
    selectedCategory: 'all',
    viewMode: 'grid',
    showPasswords: {},
    operationLoading: false
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: VaultItem | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    item: null,
    isDeleting: false
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

  // Load vault items
  const loadVaultItems = useCallback(async () => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Get master password from AuthContext
      const masterPassword = getMasterPassword();
      if (!masterPassword) {
        throw new Error('Master password not available');
      }
      
      // Load from Firebase with encryption (initial load only)
      const items = await VaultService.getAllItems(user.uid, masterPassword, { 
        limit: 100 // Load first 100 items for better performance
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

  // Set up real-time listener for automatic updates
  useEffect(() => {
    if (!user) return;

    const masterPassword = getMasterPassword();
    if (!masterPassword) return;

    setState(prev => ({ ...prev, loading: true }));

    // Set up real-time listener
    const unsubscribe = VaultService.setupVaultListener(
      user.uid,
      masterPassword,
      (items) => {
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
          loadVaultItems
        );
      },
      { limit: 100 } // Limit for performance
    );

    return unsubscribe;
  }, [user, getMasterPassword, showDetailedError, loadVaultItems]);

  // Note: Firebase VaultService auto-saves individual items, no bulk save needed
  const saveVaultItems = useCallback((items: VaultItem[]) => {
    // This function is no longer needed since Firebase saves items individually
    // Keeping for compatibility but items are saved in individual operations
  }, []);

  // Filter items when search or category changes
  const filterItems = useCallback(() => {
    setState(prevState => {
      let filtered = prevState.items;

      // Filter by category
      if (prevState.selectedCategory !== 'all') {
        filtered = filtered.filter(item => item.category === prevState.selectedCategory);
      }

      // Filter by search term
      if (prevState.searchTerm) {
        const term = prevState.searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
          item.name.toLowerCase().includes(term) ||
          item.username?.toLowerCase().includes(term) ||
          item.url?.toLowerCase().includes(term) ||
          item.notes?.toLowerCase().includes(term)
        );
      }

      return { ...prevState, filteredItems: filtered };
    });
  }, []);

  useEffect(() => {
    loadVaultItems();
  }, [loadVaultItems]);

  // Filter items when search or category changes
  useEffect(() => {
    filterItems();
  }, [state.items, state.selectedCategory, state.searchTerm, filterItems]);

  const handleSaveItem = async (itemData: Partial<VaultItem>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const masterPassword = getMasterPassword();
    if (!masterPassword) {
      throw new Error('Master password not available');
    }

    // Guard against duplicate submissions
    if (state.operationLoading) {
      return;
    }

    // Set loading state immediately
    setState(prev => ({ ...prev, operationLoading: true }));

    try {
      if (editingItem) {
        // Show immediate feedback
        toast.loading('Updating item...', { id: 'save-item' });
        
        // Update existing item
        await VaultService.updateItem(
          editingItem.id,
          user.uid,
          itemData,
          masterPassword
        );
        
        // Update local state immediately for better UX
        const updatedItems = state.items.map(item => 
          item.id === editingItem.id ? { ...item, ...itemData, lastModified: Date.now() } : item
        );
        setState(prev => ({
          ...prev,
          items: updatedItems,
          operationLoading: false
        }));
        
        toast.success('Item updated successfully', { id: 'save-item' });
      } else {
        // Show immediate feedback
        toast.loading('Adding item to your vault...', { id: 'save-item' });
        
        // Add new item
        const itemId = await VaultService.addItem(
          user.uid,
          {
            name: itemData.name!,
            username: itemData.username,
            password: itemData.password,
            url: itemData.url,
            notes: itemData.notes,
            category: itemData.category!,
            favorite: itemData.favorite || false,
            tags: itemData.tags || []
          },
          masterPassword
        );

        // Create the full item for local state
        const newItem: VaultItem = {
          id: itemId,
          name: itemData.name!,
          username: itemData.username,
          password: itemData.password,
          url: itemData.url,
          notes: itemData.notes,
          category: itemData.category!,
          favorite: itemData.favorite || false,
          tags: itemData.tags || [],
          created: Date.now(),
          lastModified: Date.now(),
          // Include optional fields
          cardNumber: itemData.cardNumber,
          cardholderName: itemData.cardholderName,
          expiryDate: itemData.expiryDate,
          cvv: itemData.cvv,
          firstName: itemData.firstName,
          lastName: itemData.lastName,
          email: itemData.email,
          phone: itemData.phone,
          address: itemData.address,
          title: itemData.title,
          company: itemData.company,
          ssn: itemData.ssn
        };

        // Update local state immediately for better UX
        setState(prev => ({
          ...prev,
          items: [...prev.items, newItem],
          operationLoading: false
        }));
        
        toast.success('Item added to your vault successfully', { id: 'save-item' });
      }

      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save item:', error);
      setState(prev => ({ ...prev, operationLoading: false }));
      
      // Show detailed error modal
      showDetailedError(
        'Failed to Save Item',
        'Unable to save your vault item. This could be due to network issues, permission problems, or server errors.',
        error,
        true,
        () => handleSaveItem(itemData)
      );
      
      toast.error(
        error instanceof Error && error.message.includes('permission') 
          ? 'Permission denied. Please try logging in again.'
          : 'Failed to save item. Please try again.',
        { id: 'save-item' }
      );
      throw error; // Re-throw so the modal can handle it
    }
  };

  const handleEditItem = (item: VaultItem) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleDeleteItem = (item: VaultItem) => {
    setDeleteModal({
      isOpen: true,
      item,
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!user || !deleteModal.item) {
      toast.error('User not authenticated');
      return;
    }

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    toast.loading('Deleting item...', { id: 'delete-item' });

    try {
      await VaultService.deleteItem(deleteModal.item.id, user.uid);
      
      // Update local state immediately
      const updatedItems = state.items.filter(item => item.id !== deleteModal.item!.id);
      setState(prev => ({
        ...prev,
        items: updatedItems
      }));
      
      toast.success('Item deleted successfully', { id: 'delete-item' });
      setDeleteModal({ isOpen: false, item: null, isDeleting: false });
    } catch (error) {
      console.error('Failed to delete item:', error);
      
      // Show detailed error modal
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (_error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleLogout = async () => {
    try {
      // Clear vault access authorization
      sessionStorage.removeItem('vaultAccessAuthorized');
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  };

  const handleLockVault = () => {
    // Clear vault access authorization
    sessionStorage.removeItem('vaultAccessAuthorized');
    lockVault();
    toast.success('Vault locked successfully');
  };

  const navigateToDashboard = () => {
    // Clear vault access authorization when leaving vault
    sessionStorage.removeItem('vaultAccessAuthorized');
    router.push('/dashboard');
  };

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

      <Button onClick={() => setShowAddModal(true)} size="lg">
        <Plus className="w-5 h-5 mr-2" />
        Add Your First Item
      </Button>
    </div>
  );

  const renderVaultItem = (item: VaultItem) => {
    const ItemIcon = getItemIcon(item.category);
    const isPasswordVisible = state.showPasswords[item.id];

    if (state.viewMode === 'list') {
      return (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
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
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(item.username!, 'Username')}
                            >
                              <Copy className="w-3 h-3" />
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
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(item.password!, 'Password')}
                            >
                              <Copy className="w-3 h-3" />
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
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(item.url!, 'URL')}
                            >
                              <Copy className="w-3 h-3" />
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
                    >
                      <Edit className="w-4 h-4" />
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
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
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
      <Card key={item.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
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
                  >
                    <Edit className="w-4 h-4" />
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
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
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
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.username!, 'Username')}
                      >
                        <Copy className="w-3 h-3" />
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
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.password!, 'Password')}
                      >
                        <Copy className="w-3 h-3" />
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
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.url!, 'URL')}
                      >
                        <Copy className="w-3 h-3" />
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
        {/* Loading Overlay for Operations */}
        {state.operationLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-900 dark:text-white font-medium">Processing...</span>
            </div>
          </div>
        )}

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
                    <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new password, note, card, or identity</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="flex items-center space-x-2 ml-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled>
                        <Settings className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vault settings (Coming Soon)</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleLockVault}>
                        <Lock className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lock vault and return to login</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleLogout}>
                        <LogOut className="w-4 h-4" />
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
                      <Button variant="outline" className="w-full justify-start" disabled>
                        <Download className="w-4 h-4 mr-3" />
                        Export Vault
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Export encrypted vault data for backup (Coming Soon)</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" disabled>
                        <Upload className="w-4 h-4 mr-3" />
                        Import Data
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Import data from other password managers (Coming Soon)</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" disabled>
                        <RefreshCw className="w-4 h-4 mr-3" />
                        Security Audit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Analyze passwords for security vulnerabilities (Coming Soon)</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              {/* Help Section */}
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2" />
                    Need Help?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Getting Started</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Click &quot;Add Item&quot; to create your first secure entry
                        </p>
                      </div>
                    </div>
                  </div>
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