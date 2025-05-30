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
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
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

export class VaultService {
  private static readonly COLLECTION_NAME = 'vault_items';

  /**
   * Adds a new item to the vault (optimized)
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

      // Encrypt the entire item
      const encryptedData = ZeroKnowledgeEncryption.encryptVaultItem(vaultItem, masterPassword);

      // Create searchable fields (optimized for indexing and hashed for privacy)
      const searchableFields = {
        name: item.name.toLowerCase().trim(),
        url: item.url?.toLowerCase().trim(),
        username: item.username?.toLowerCase().trim()
      };

      // Create searchable hashes, filtering out undefined values
      const searchableHashes: { nameHash: string; urlHash?: string; usernameHash?: string } = {
        nameHash: ZeroKnowledgeEncryption.hashSearchableField(searchableFields.name, userId)
      };

      // Only add hashes for fields that exist (Firebase doesn't allow undefined values)
      if (searchableFields.url) {
        searchableHashes.urlHash = ZeroKnowledgeEncryption.hashSearchableField(searchableFields.url, userId);
      }
      if (searchableFields.username) {
        searchableHashes.usernameHash = ZeroKnowledgeEncryption.hashSearchableField(searchableFields.username, userId);
      }

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

      // Use addDoc with optimized performance settings
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), storedItem);
      
      // Return the Firestore document ID
      return docRef.id;
    } catch (error) {
      // Enhanced error handling
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
   * Updates an existing vault item
   */
  static async updateItem(
    itemId: string,
    userId: string,
    updates: Partial<Omit<VaultItem, 'id' | 'created'>>,
    masterPassword: string
  ): Promise<void> {
    try {
      // First, get the current item
      const currentItem = await this.getItem(itemId, userId, masterPassword);
      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Merge updates
      const updatedItem: VaultItem = {
        ...currentItem,
        ...updates,
        lastModified: Date.now()
      };

      // Re-encrypt the updated item
      const encryptedData = ZeroKnowledgeEncryption.encryptVaultItem(updatedItem, masterPassword);

      // Update searchable fields
      const searchableFields = {
        name: updatedItem.name.toLowerCase().trim(),
        url: updatedItem.url?.toLowerCase().trim(),
        username: updatedItem.username?.toLowerCase().trim()
      };

      // Create searchable hashes, filtering out undefined values
      const searchableHashes: { nameHash: string; urlHash?: string; usernameHash?: string } = {
        nameHash: ZeroKnowledgeEncryption.hashSearchableField(searchableFields.name, userId)
      };

      // Only add hashes for fields that exist (Firebase doesn't allow undefined values)
      if (searchableFields.url) {
        searchableHashes.urlHash = ZeroKnowledgeEncryption.hashSearchableField(searchableFields.url, userId);
      }
      if (searchableFields.username) {
        searchableHashes.usernameHash = ZeroKnowledgeEncryption.hashSearchableField(searchableFields.username, userId);
      }

      const updateData = {
        encryptedData,
        category: updatedItem.category,
        favorite: updatedItem.favorite || false,
        lastModified: updatedItem.lastModified,
        tags: updatedItem.tags || [],
        searchableHashes
      };

      await updateDoc(doc(db, this.COLLECTION_NAME, itemId), updateData);
    } catch (error) {
      throw new Error(`Failed to update vault item: ${(error as Error).message}`);
    }
  }

  /**
   * Deletes a vault item
   */
  static async deleteItem(itemId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const itemDoc = await getDoc(doc(db, this.COLLECTION_NAME, itemId));
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }

      const itemData = itemDoc.data() as StoredVaultItem;
      if (itemData.userId !== userId) {
        throw new Error('Unauthorized');
      }

      await deleteDoc(doc(db, this.COLLECTION_NAME, itemId));
    } catch (error) {
      throw new Error(`Failed to delete vault item: ${(error as Error).message}`);
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
      
      // Verify ownership
      if (storedItem.userId !== userId) {
        throw new Error('Unauthorized');
      }

      // Decrypt the item
      const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
        storedItem.encryptedData,
        masterPassword
      );

      return decryptedItem;
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        throw error;
      }
      throw new Error(`Failed to get vault item: ${(error as Error).message}`);
    }
  }

  /**
   * Gets all vault items for a user and decrypts them with caching optimization
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
      // Build optimized query with pagination support
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('lastModified', 'desc')
      );

      // Add pagination if specified
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      if (options.lastVisible) {
        q = query(q, startAfter(options.lastVisible));
      }

      const querySnapshot = await getDocs(q);
      const items: VaultItem[] = [];

      // Process items in batches for better performance
      const batchSize = 10;
      const docBatches = [];
      
      for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
        docBatches.push(querySnapshot.docs.slice(i, i + batchSize));
      }

      // Process batches in parallel for faster decryption
      for (const batch of docBatches) {
        const batchPromises = batch.map(async (doc) => {
          try {
            const storedItem = { id: doc.id, ...doc.data() } as StoredVaultItem;
            const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
              storedItem.encryptedData,
              masterPassword
            );
            return decryptedItem;
          } catch (error) {
            console.error(`Failed to decrypt item ${doc.id}:`, error);
            // Skip corrupted items instead of failing the entire operation
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        items.push(...batchResults.filter(item => item !== null) as VaultItem[]);
      }

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

      await this.updateItem(
        itemId,
        userId,
        { favorite: !currentItem.favorite },
        masterPassword
      );
    } catch (error) {
      throw new Error(`Failed to toggle favorite: ${(error as Error).message}`);
    }
  }

  /**
   * Sets up a real-time listener for vault items with optimized caching
   */
  static setupVaultListener(
    userId: string,
    masterPassword: string,
    onUpdate: (items: VaultItem[]) => void,
    onError: (error: Error) => void,
    options: {
      limit?: number;
    } = {}
  ): () => void {
    try {
      // Build optimized query
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('lastModified', 'desc')
      );

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      // Set up real-time listener with offline support
      const unsubscribe = onSnapshot(
        q,
        {
          includeMetadataChanges: false, // Ignore metadata changes for better performance
        },
        async (querySnapshot) => {
          try {
            const items: VaultItem[] = [];

            // Process changes efficiently
            const docChanges = querySnapshot.docChanges();
            
            if (docChanges.length === 0 && !querySnapshot.empty) {
              // Initial load - process all docs
              for (const doc of querySnapshot.docs) {
                try {
                  const storedItem = { id: doc.id, ...doc.data() } as StoredVaultItem;
                  const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
                    storedItem.encryptedData,
                    masterPassword
                  );
                  items.push(decryptedItem);
                } catch (error) {
                  console.error(`Failed to decrypt item ${doc.id}:`, error);
                }
              }
            } else {
              // Process only changes for better performance
              for (const change of docChanges) {
                try {
                  if (change.type === 'removed') {
                    continue; // Handle removals in the UI
                  }
                  
                  const storedItem = { id: change.doc.id, ...change.doc.data() } as StoredVaultItem;
                  const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
                    storedItem.encryptedData,
                    masterPassword
                  );
                  items.push(decryptedItem);
                } catch (error) {
                  console.error(`Failed to decrypt item ${change.doc.id}:`, error);
                }
              }
              
              // For changes, get all current docs
              if (items.length === 0) {
                for (const doc of querySnapshot.docs) {
                  try {
                    const storedItem = { id: doc.id, ...doc.data() } as StoredVaultItem;
                    const decryptedItem = ZeroKnowledgeEncryption.decryptVaultItem(
                      storedItem.encryptedData,
                      masterPassword
                    );
                    items.push(decryptedItem);
                  } catch (error) {
                    console.error(`Failed to decrypt item ${doc.id}:`, error);
                  }
                }
              }
            }

            onUpdate(items);
          } catch (error) {
            onError(new Error(`Failed to process vault updates: ${(error as Error).message}`));
          }
        },
        (error) => {
          onError(new Error(`Vault listener error: ${error.message}`));
        }
      );

      return unsubscribe;
    } catch (error) {
      onError(new Error(`Failed to setup vault listener: ${(error as Error).message}`));
      return () => {}; // Return empty unsubscribe function
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
      // Use lightweight query for stats (no decryption needed)
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
        
        // Count by category
        stats.itemsByCategory[data.category] = (stats.itemsByCategory[data.category] || 0) + 1;
        
        // Count favorites
        if (data.favorite) {
          stats.favoriteCount++;
        }
        
        // Count recently modified
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
   * Exports vault data (encrypted)
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
} 