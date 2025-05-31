import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  DocumentSnapshot,
  writeBatch,
  enableNetwork,
  disableNetwork,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ZeroKnowledgeEncryption, EncryptedData, VaultItem } from './encryption';
import { v4 as uuidv4 } from 'uuid';

export interface StoredVaultItem {
  id: string;
  userId: string;
  encryptedData: EncryptedData;
  category: 'login' | 'secure-note' | 'credit-card' | 'identity';
  favorite: boolean;
  lastModified: number;
  created: number;
  tags: string[];
  // Hashed searchable metadata (no plain text visible in Firestore)
  searchableHashes: {
    nameHash: string;
    urlHash?: string;
    usernameHash?: string;
  };
}

// Advanced caching system for high performance
class VaultCache {
  private static instance: VaultCache;
  private cache = new Map<string, { items: VaultItem[]; timestamp: number; }>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 50; // Limit memory usage

  static getInstance(): VaultCache {
    if (!VaultCache.instance) {
      VaultCache.instance = new VaultCache();
    }
    return VaultCache.instance;
  }

  get(userId: string): VaultItem[] | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached.items;
  }

  set(userId: string, items: VaultItem[]): void {
    // Implement LRU eviction if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(userId, {
      items: [...items], // Clone to prevent mutations
      timestamp: Date.now()
    });
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class VaultService {
  private static readonly COLLECTION_NAME = 'vault_items';
  private static cache = VaultCache.getInstance();
  
  // Connection pool to handle multiple concurrent requests
  private static pendingRequests = new Map<string, Promise<void>>();

  /**
   * Get memoized collection reference like topics pattern
   */
  static getCollectionRef() {
    return collection(db, this.COLLECTION_NAME);
  }

  /**
   * Wait for authentication with connection pooling
   */
  private static async waitForAuth(userId: string): Promise<void> {
    // Use connection pooling to avoid multiple auth waits
    const authKey = `auth_${userId}`;
    
    if (this.pendingRequests.has(authKey)) {
      return this.pendingRequests.get(authKey);
    }
    
    const authPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(authKey);
        reject(new Error('Authentication timeout'));
      }, 5000);
      
      if (auth.currentUser && auth.currentUser.uid === userId) {
        clearTimeout(timeout);
        this.pendingRequests.delete(authKey);
        resolve();
        return;
      }
      
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user && user.uid === userId) {
          clearTimeout(timeout);
          this.pendingRequests.delete(authKey);
          unsubscribe();
          resolve();
        }
      });
    });
    
    this.pendingRequests.set(authKey, authPromise);
    return authPromise;
  }

  /**
   * Optimized batch processing for crypto operations
   */
  private static async processCryptoOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
      
      // Small delay between batches to prevent blocking
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    return results;
  }

  /**
   * Adds a new item to the vault with extreme optimization
   */
  static async addItem(
    userId: string,
    item: Omit<VaultItem, 'id' | 'created' | 'lastModified'>,
    masterPassword: string
  ): Promise<string> {
    try {
      const now = Date.now();
      const itemId = uuidv4();
      
      const vaultItem: VaultItem = {
        ...item,
        id: itemId,
        created: now,
        lastModified: now
      };

      // Ultra-optimized parallel crypto operations
      const cryptoPromises: Promise<EncryptedData | string>[] = [
        Promise.resolve(ZeroKnowledgeEncryption.encryptVaultItem(vaultItem, masterPassword)),
        Promise.resolve(ZeroKnowledgeEncryption.hashSearchableField(item.name.toLowerCase().trim(), userId))
      ];

      if (item.url) {
        cryptoPromises.push(Promise.resolve(ZeroKnowledgeEncryption.hashSearchableField(item.url.toLowerCase().trim(), userId)));
      }
      
      if (item.username) {
        cryptoPromises.push(Promise.resolve(ZeroKnowledgeEncryption.hashSearchableField(item.username.toLowerCase().trim(), userId)));
      }

      const results = await Promise.all(cryptoPromises);
      const encryptedData = results[0] as EncryptedData;
      const nameHash = results[1] as string;
      const urlHash = item.url ? results[2] as string : undefined;
      const usernameHash = item.username ? results[item.url ? 3 : 2] as string : undefined;

      const searchableHashes: { nameHash: string; urlHash?: string; usernameHash?: string } = {
        nameHash
      };

      if (urlHash) searchableHashes.urlHash = urlHash;
      if (usernameHash) searchableHashes.usernameHash = usernameHash;

      const storedItem: Omit<StoredVaultItem, 'id'> = {
        userId,
        encryptedData,
        category: item.category,
        favorite: item.favorite || false,
        lastModified: now,
        created: now,
        tags: item.tags || [],
        searchableHashes
      };

      // Immediate cache invalidation for instant UI updates
      this.cache.invalidate(userId);

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), storedItem);
      return docRef.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('permission')) {
        throw new Error('Permission denied. Please check your authentication.');
      } else if (errorMessage.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        throw new Error(`Failed to add vault item: ${errorMessage}`);
      }
    }
  }

  /**
   * Updates an existing vault item with extreme optimization
   */
  static async updateItem(
    itemId: string,
    userId: string,
    updatedItem: VaultItem,
    masterPassword: string
  ): Promise<void> {
    try {
      // Ensure the item has the correct ID and updated timestamp
      const itemToUpdate: VaultItem = {
        ...updatedItem,
        id: itemId,
        lastModified: Date.now()
      };

      // Ultra-optimized parallel crypto operations
      const cryptoPromises: Promise<EncryptedData | string>[] = [
        Promise.resolve(ZeroKnowledgeEncryption.encryptVaultItem(itemToUpdate, masterPassword)),
        Promise.resolve(ZeroKnowledgeEncryption.hashSearchableField(itemToUpdate.name.toLowerCase().trim(), userId))
      ];

      if (itemToUpdate.url) {
        cryptoPromises.push(Promise.resolve(ZeroKnowledgeEncryption.hashSearchableField(itemToUpdate.url.toLowerCase().trim(), userId)));
      }
      
      if (itemToUpdate.username) {
        cryptoPromises.push(Promise.resolve(ZeroKnowledgeEncryption.hashSearchableField(itemToUpdate.username.toLowerCase().trim(), userId)));
      }

      const results = await Promise.all(cryptoPromises);
      const encryptedData = results[0] as EncryptedData;
      const nameHash = results[1] as string;
      const urlHash = itemToUpdate.url ? results[2] as string : undefined;
      const usernameHash = itemToUpdate.username ? results[itemToUpdate.url ? 3 : 2] as string : undefined;

      const searchableHashes: { nameHash: string; urlHash?: string; usernameHash?: string } = {
        nameHash
      };

      if (urlHash) searchableHashes.urlHash = urlHash;
      if (usernameHash) searchableHashes.usernameHash = usernameHash;

      const updateData = {
        encryptedData,
        category: itemToUpdate.category,
        favorite: itemToUpdate.favorite,
        lastModified: itemToUpdate.lastModified,
        tags: itemToUpdate.tags,
        searchableHashes,
        userId
      };

      // Immediate cache invalidation for instant UI updates
      this.cache.invalidate(userId);

      await updateDoc(doc(db, this.COLLECTION_NAME, itemId), updateData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('permission') || errorMessage.includes('Missing or insufficient permissions')) {
        throw new Error('Permission denied. Please check your authentication and try again.');
      } else if (errorMessage.includes('Unauthorized')) {
        throw new Error('You do not have permission to update this item.');
      } else {
        throw new Error(`Failed to update vault item: ${errorMessage}`);
      }
    }
  }

  /**
   * Transaction-based update like topics pattern for atomic operations
   */
  static async updateItemWithTransaction(
    itemId: string,
    userId: string,
    updatedItem: VaultItem,
    masterPassword: string
  ): Promise<void> {
    try {
      const itemRef = doc(this.getCollectionRef(), itemId);
      
      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
          throw new Error("Item does not exist!");
        }

        const existingData = itemDoc.data() as StoredVaultItem;
        if (existingData.userId !== userId) {
          throw new Error("Unauthorized access to this item!");
        }

        // Prepare encrypted data
        const itemToUpdate: VaultItem = {
          ...updatedItem,
          id: itemId,
          lastModified: Date.now()
        };

        const [encryptedData, nameHash] = await Promise.all([
          ZeroKnowledgeEncryption.encryptVaultItem(itemToUpdate, masterPassword),
          ZeroKnowledgeEncryption.hashSearchableField(itemToUpdate.name.toLowerCase().trim(), userId)
        ]);

        const updateData = {
          encryptedData,
          category: itemToUpdate.category,
          favorite: itemToUpdate.favorite,
          lastModified: itemToUpdate.lastModified,
          tags: itemToUpdate.tags,
          searchableHashes: { nameHash },
          userId
        };

        transaction.update(itemRef, updateData);
      });

      // Immediate cache invalidation
      this.cache.invalidate(userId);
    } catch (error) {
      throw new Error(`Failed to update vault item: ${(error as Error).message}`);
    }
  }

  /**
   * Deletes a vault item with instant cache invalidation
   */
  static async deleteItem(itemId: string, userId: string): Promise<void> {
    try {
      // Immediate cache invalidation for instant UI updates
      this.cache.invalidate(userId);
      
      await this.waitForAuth(userId);
      await deleteDoc(doc(db, this.COLLECTION_NAME, itemId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('permission') || errorMessage.includes('Missing or insufficient permissions')) {
        throw new Error('Permission denied. Please check your authentication and try again.');
      } else if (errorMessage.includes('Unauthorized')) {
        throw new Error('You do not have permission to delete this item.');
      } else if (errorMessage.includes('not found')) {
        throw new Error('Item not found or already deleted.');
      } else {
        throw new Error(`Failed to delete vault item: ${errorMessage}`);
      }
    }
  }

  /**
   * Gets a single vault item and decrypts it
   */
  static async getItem(
    itemId: string,
    userId: string,
    masterPassword: string
  ): Promise<VaultItem | null> {
    try {
      const itemDoc = await getDoc(doc(db, this.COLLECTION_NAME, itemId));
      if (!itemDoc.exists()) {
        return null;
      }

      const storedItem = { id: itemDoc.id, ...itemDoc.data() } as StoredVaultItem;
      
      if (storedItem.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
        storedItem.encryptedData,
        masterPassword
      );

      decryptedItem.id = itemId;
      return decryptedItem;
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        throw error;
      }
      throw new Error(`Failed to get vault item: ${(error as Error).message}`);
    }
  }

  /**
   * Gets all vault items for a user and decrypts them with aggressive caching
   */
  static async getAllItems(
    userId: string,
    masterPassword: string,
    options: {
      useCache?: boolean;
      limit?: number;
      lastVisible?: DocumentSnapshot;
    } = {}
  ): Promise<VaultItem[]> {
    try {
      // Check cache first for ultra-fast responses
      if (options.useCache !== false) {
        const cached = this.cache.get(userId);
        if (cached) {
          return cached;
        }
      }

      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('lastModified', 'desc')
      );

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      if (options.lastVisible) {
        q = query(q, startAfter(options.lastVisible));
      }

      const querySnapshot = await getDocs(q);
      const items: VaultItem[] = [];

      // Process in smaller batches for better performance
      const batchSize = 8;
      const docBatches = [];
      
      for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
        docBatches.push(querySnapshot.docs.slice(i, i + batchSize));
      }

      for (const batch of docBatches) {
        const batchPromises = batch.map(async (doc) => {
        try {
          const storedItem = { id: doc.id, ...doc.data() } as StoredVaultItem;
          const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
            storedItem.encryptedData,
            masterPassword
          );
            
            decryptedItem.id = doc.id;
            return decryptedItem;
        } catch (error) {
          console.error(`Failed to decrypt item ${doc.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        items.push(...batchResults.filter(item => item !== null) as VaultItem[]);

        // Tiny delay between batches to prevent UI blocking
        if (docBatches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2));
        }
      }

      // Cache the results for subsequent calls
      this.cache.set(userId, items);

      return items;
    } catch (error) {
      throw new Error(`Failed to get vault items: ${(error as Error).message}`);
    }
  }

  /**
   * Gets items by category
   */
  static async getItemsByCategory(
    userId: string,
    category: VaultItem['category'],
    masterPassword: string
  ): Promise<VaultItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy('lastModified', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const items: VaultItem[] = [];

      for (const doc of querySnapshot.docs) {
        try {
          const storedItem = { id: doc.id, ...doc.data() } as StoredVaultItem;
          const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
            storedItem.encryptedData,
            masterPassword
          );
          decryptedItem.id = doc.id;
          items.push(decryptedItem);
        } catch (error) {
          console.error(`Failed to decrypt item ${doc.id}:`, error);
        }
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to get vault items by category: ${(error as Error).message}`);
    }
  }

  /**
   * Search vault items
   */
  static async searchItems(
    userId: string,
    searchTerm: string,
    masterPassword: string
  ): Promise<VaultItem[]> {
    try {
      const allItems = await this.getAllItems(userId, masterPassword);
      const searchTermLower = searchTerm.toLowerCase();

      return allItems.filter(item => 
        item.name.toLowerCase().includes(searchTermLower) ||
        item.username?.toLowerCase().includes(searchTermLower) ||
        item.url?.toLowerCase().includes(searchTermLower) ||
        item.notes?.toLowerCase().includes(searchTermLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTermLower))
      );
    } catch (error) {
      throw new Error(`Failed to search vault items: ${(error as Error).message}`);
    }
  }

  /**
   * Gets favorite items
   */
  static async getFavoriteItems(
    userId: string,
    masterPassword: string
  ): Promise<VaultItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('favorite', '==', true),
        orderBy('lastModified', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const items: VaultItem[] = [];

      for (const doc of querySnapshot.docs) {
        try {
          const storedItem = { id: doc.id, ...doc.data() } as StoredVaultItem;
          const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
            storedItem.encryptedData,
            masterPassword
          );
          decryptedItem.id = doc.id;
          items.push(decryptedItem);
        } catch (error) {
          console.error(`Failed to decrypt item ${doc.id}:`, error);
        }
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to get favorite items: ${(error as Error).message}`);
    }
  }

  /**
   * Toggles favorite status of an item
   */
  static async toggleFavorite(
    itemId: string,
    userId: string,
    masterPassword: string
  ): Promise<void> {
    try {
      const currentItem = await this.getItem(itemId, userId, masterPassword);
      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Create updated item with toggled favorite status
      const updatedItem: VaultItem = {
        ...currentItem,
        favorite: !currentItem.favorite,
        lastModified: Date.now()
      };

      await this.updateItem(
        itemId,
        userId,
        updatedItem,
        masterPassword
      );
    } catch (error) {
      throw new Error(`Failed to toggle favorite: ${(error as Error).message}`);
    }
  }

  /**
   * Ultra-optimized real-time listener with advanced performance optimizations
   */
  static setupVaultListener(
    userId: string,
    masterPassword: string,
    onUpdate: (items: VaultItem[]) => void,
    onError: (error: Error) => void,
    options: {
      limit?: number;
      debounceMs?: number; // Configurable debounce time
    } = {}
  ): () => void {
    try {
      let q = query(
        this.getCollectionRef(),
        where('userId', '==', userId),
        orderBy('lastModified', 'desc')
      );

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      // Advanced debouncing for better performance
      const debounceMs = options.debounceMs || 200; // Default 200ms debounce
      let debounceTimer: NodeJS.Timeout | null = null;
      let pendingSnapshot: any = null;
      let isProcessing = false;

      // Batch processing function
      const processSnapshot = async (snapshot: any) => {
        if (isProcessing) return; // Prevent concurrent processing
        isProcessing = true;

        try {
          // Skip if no docs or from cache (like topics)
          if (snapshot.empty) {
            onUpdate([]);
            return;
          }

          // Enhanced batch processing with optimized crypto operations
          const itemPromises = snapshot.docs.map(async (doc: any) => {
            try {
              const storedItem = { id: doc.id, ...doc.data() } as StoredVaultItem;
              const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
                storedItem.encryptedData,
                masterPassword
              );
              decryptedItem.id = doc.id;
              return decryptedItem;
            } catch (error) {
              console.warn(`Failed to decrypt item ${doc.id}:`, error);
              return null;
            }
          });

          // Process all in smaller batches to prevent UI blocking
          const batchSize = 6; // Optimized batch size
          const results: VaultItem[] = [];
          
          for (let i = 0; i < itemPromises.length; i += batchSize) {
            const batch = itemPromises.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults.filter(item => item !== null) as VaultItem[]);
            
            // Micro-delay between batches to keep UI responsive
            if (i + batchSize < itemPromises.length) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
          
          // Cache and update
          this.cache.set(userId, results);
          onUpdate(results);

        } catch (error) {
          console.error('Vault listener processing error:', error);
          onError(new Error(`Failed to process vault updates: ${(error as Error).message}`));
        } finally {
          isProcessing = false;
        }
      };

      // Debounced snapshot handler
      const handleSnapshot = (snapshot: any) => {
        pendingSnapshot = snapshot;
        
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(() => {
          if (pendingSnapshot) {
            processSnapshot(pendingSnapshot);
            pendingSnapshot = null;
          }
        }, debounceMs);
      };

      // Setup the listener with enhanced error handling
      const unsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          console.error('Vault listener error:', error);
          onError(new Error(`Vault listener error: ${error.message}`));
        }
      );

      // Enhanced cleanup function
      return () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        unsubscribe();
      };
    } catch (error) {
      onError(new Error(`Failed to setup vault listener: ${(error as Error).message}`));
      return () => {};
    }
  }

  /**
   * Gets vault statistics for dashboard
   */
  static async getVaultStats(userId: string): Promise<{
    totalItems: number;
    itemsByCategory: Record<string, number>;
    favoriteCount: number;
    recentlyModified: number;
  }> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const stats = {
        totalItems: querySnapshot.size,
        itemsByCategory: {} as Record<string, number>,
        favoriteCount: 0,
        recentlyModified: 0
      };

      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      querySnapshot.docs.forEach(doc => {
        const data = doc.data() as StoredVaultItem;
        
        stats.itemsByCategory[data.category] = (stats.itemsByCategory[data.category] || 0) + 1;
        
        if (data.favorite) {
          stats.favoriteCount++;
        }
        
        if (data.lastModified > oneWeekAgo) {
          stats.recentlyModified++;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get vault stats: ${(error as Error).message}`);
    }
  }

  /**
   * Exports vault data
   */
  static async exportVault(
    userId: string,
    masterPassword: string
  ): Promise<{ items: VaultItem[]; exportDate: number }> {
    try {
      const items = await this.getAllItems(userId, masterPassword);
      return {
        items,
        exportDate: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to export vault: ${(error as Error).message}`);
    }
  }

  /**
   * Imports vault data
   */
  static async importVault(
    userId: string,
    importData: { items: VaultItem[] },
    masterPassword: string
  ): Promise<number> {
    try {
      let importedCount = 0;

      for (const item of importData.items) {
        try {
          await this.addItem(userId, {
            name: item.name,
            username: item.username,
            password: item.password,
            url: item.url,
            notes: item.notes,
            category: item.category,
            favorite: item.favorite,
            tags: item.tags
          }, masterPassword);
          importedCount++;
        } catch (error) {
          console.error(`Failed to import item ${item.name}:`, error);
        }
      }

      return importedCount;
    } catch (error) {
      throw new Error(`Failed to import vault: ${(error as Error).message}`);
    }
  }

  /**
   * Preload vault data for instant access
   */
  static async preloadVaultData(userId: string, masterPassword: string): Promise<void> {
    try {
      // Preload in background without waiting
      this.getAllItems(userId, masterPassword, { limit: 50, useCache: false });
    } catch (error) {
      console.warn('Failed to preload vault data:', error);
    }
  }

  /**
   * Clear all caches for memory management
   */
  static clearAllCaches(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
} 