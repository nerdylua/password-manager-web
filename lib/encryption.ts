import CryptoJS from 'crypto-js';

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  salt: string;
  hmac?: string; // Optional for backward compatibility with old data
  keyDerivationParams: {
    iterations: number;
    keySize: number;
  };
}

export interface VaultItem {
  id: string;
  name: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  category: 'login' | 'secure-note' | 'credit-card' | 'identity';
  favorite: boolean;
  lastModified: number;
  created: number;
  tags: string[];
  
  // Credit card fields
  cardNumber?: string;
  cardholderName?: string;
  expiryDate?: string;
  cvv?: string;
  
  // Identity fields
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  
  // Additional fields
  title?: string;
  company?: string;
  ssn?: string;
}

export class ZeroKnowledgeEncryption {
  private static readonly DEFAULT_ITERATIONS = 100000;
  private static readonly DEFAULT_KEY_SIZE = 256 / 32; // 256 bits / 32 bits per word
  
  // Session key cache to avoid re-derivation
  private static sessionCache = new Map<string, { key: CryptoJS.lib.WordArray; timestamp: number }>();
  private static readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Gets cached key or derives new one
   */
  private static getCachedKey(masterPassword: string, salt: string, iterations: number, keySize: number): CryptoJS.lib.WordArray {
    const cacheKey = `${masterPassword}_${salt}_${iterations}_${keySize}`;
    const cached = this.sessionCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.key;
    }
    
    const key = this.deriveKey(masterPassword, salt, iterations, keySize);
    this.sessionCache.set(cacheKey, { key, timestamp: Date.now() });
    return key;
  }

  /**
   * Clears session cache (call on logout)
   */
  static clearSessionCache(): void {
    this.sessionCache.clear();
  }

  /**
   * Derives an encryption key from a master password using PBKDF2
   */
  static deriveKey(
    masterPassword: string,
    salt: string,
    iterations: number = this.DEFAULT_ITERATIONS,
    keySize: number = this.DEFAULT_KEY_SIZE
  ): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(masterPassword, salt, {
      iterations,
      keySize,
      hasher: CryptoJS.algo.SHA512
    });
  }

  /**
   * Generates a cryptographically secure random salt
   */
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  }

  /**
   * Generates a cryptographically secure random IV
   */
  static generateIV(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  /**
   * Encrypts data using AES-256-CBC + HMAC for authenticated encryption
   * Provides both confidentiality (AES) and authenticity (HMAC)
   */
  static encrypt(data: string, masterPassword: string): EncryptedData {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const iterations = this.DEFAULT_ITERATIONS;
      const keySize = this.DEFAULT_KEY_SIZE;

      // Derive encryption key from master password
      const encKey = this.getCachedKey(masterPassword, salt, iterations, keySize);
      
      // Derive separate HMAC key for authentication
      const hmacKey = CryptoJS.PBKDF2(masterPassword, salt + 'HMAC', {
        iterations,
        keySize,
        hasher: CryptoJS.algo.SHA512
      });

      // Encrypt the data using CBC mode
      const encrypted = CryptoJS.AES.encrypt(data, encKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const ciphertext = encrypted.toString();
      
      // Create HMAC over IV + ciphertext for authentication
      const hmacInput = iv + ciphertext;
      const hmac = CryptoJS.HmacSHA256(hmacInput, hmacKey).toString();

      return {
        encryptedData: ciphertext,
        iv,
        salt,
        hmac,
        keyDerivationParams: {
          iterations,
          keySize
        }
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + (error as Error).message);
    }
  }

  /**
   * Decrypts data using the master password with HMAC verification
   * Includes backward compatibility for data without HMAC
   */
  static decrypt(encryptedData: EncryptedData, masterPassword: string): string {
    try {
      const { encryptedData: data, iv, salt, hmac, keyDerivationParams } = encryptedData;
      
      // Derive the same keys using stored parameters
      const encKey = this.getCachedKey(masterPassword, salt, keyDerivationParams.iterations, keyDerivationParams.keySize);
      
      // Check if this is legacy data without HMAC (backward compatibility)
      if (hmac) {
        const hmacKey = CryptoJS.PBKDF2(masterPassword, salt + 'HMAC', {
          iterations: keyDerivationParams.iterations,
          keySize: keyDerivationParams.keySize,
          hasher: CryptoJS.algo.SHA512
        });

        // Verify HMAC before decryption to detect tampering
        const hmacInput = iv + data;
        const computedHmac = CryptoJS.HmacSHA256(hmacInput, hmacKey).toString();
        
        if (computedHmac !== hmac) {
          throw new Error('Authentication failed - data has been tampered with');
        }
      }
      // If no HMAC field, this is legacy data - proceed without verification

      // Decrypt the data
      const decrypted = CryptoJS.AES.decrypt(data, encKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Invalid master password or corrupted data');
      }

      return decryptedString;
    } catch (error) {
      throw new Error('Decryption failed: ' + (error as Error).message);
    }
  }

  /**
   * Encrypts a vault item
   */
  static encryptVaultItem(item: VaultItem, masterPassword: string): EncryptedData {
    const serializedItem = JSON.stringify(item);
    return this.encrypt(serializedItem, masterPassword);
  }

  /**
   * Decrypts a vault item
   */
  static decryptVaultItem(encryptedData: EncryptedData, masterPassword: string): VaultItem {
    const decryptedString = this.decrypt(encryptedData, masterPassword);
    return JSON.parse(decryptedString) as VaultItem;
  }

  /**
   * Verifies the master password by attempting to decrypt a test string
   * Uses cached key for better performance
   */
  static verifyMasterPassword(
    testEncryptedData: EncryptedData,
    masterPassword: string
  ): boolean {
    try {
      // Use cached decryption for faster verification
      this.decrypt(testEncryptedData, masterPassword);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generates a secure random password
   */
  static generateSecurePassword(
    length: number = 16,
    includeUppercase: boolean = true,
    includeLowercase: boolean = true,
    includeNumbers: boolean = true,
    includeSymbols: boolean = true,
    excludeSimilar: boolean = false
  ): string {
    let charset = '';
    
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, '');
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomBytes = CryptoJS.lib.WordArray.random(1);
      const randomIndex = Math.abs(randomBytes.words[0]) % charset.length;
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Creates a secure hash of the master password for server verification (without exposing the actual password)
   */
  static hashMasterPassword(masterPassword: string, userSalt: string): string {
    return CryptoJS.PBKDF2(masterPassword, userSalt, {
      iterations: 100000,
      keySize: 256 / 32,
      hasher: CryptoJS.algo.SHA512
    }).toString();
  }

  /**
   * Hashes a password with salt using PBKDF2 (for master password storage)
   */
  static hash(password: string, salt: string): string {
    const hash = CryptoJS.PBKDF2(password, salt, {
      iterations: this.DEFAULT_ITERATIONS,
      keySize: this.DEFAULT_KEY_SIZE,
      hasher: CryptoJS.algo.SHA512
    });
    return hash.toString();
  }

  /**
   * Fast hash for master password verification (optimized for login performance)
   * Uses fewer iterations while maintaining reasonable security for authentication
   */
  static fastHash(password: string, salt: string): string {
    const hash = CryptoJS.PBKDF2(password, salt, {
      iterations: 10000, // 10x faster than storage hash
      keySize: this.DEFAULT_KEY_SIZE,
      hasher: CryptoJS.algo.SHA512
    });
    return hash.toString();
  }

  /**
   * Hashes searchable fields for privacy (one-way hash)
   */
  static hashSearchableField(field: string, userId: string): string {
    // Use userId as salt for consistent hashing per user
    const hash = CryptoJS.SHA256(field.toLowerCase().trim() + userId);
    return hash.toString();
  }

  /**
   * Optimized encrypt function for registration (lighter iterations for initial setup)
   * This is safe for registration because we're just creating test data, not actual vault content
   */
  static encryptForRegistration(data: string, masterPassword: string): EncryptedData {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const iterations = 50000; // Half the iterations for faster registration
      const keySize = this.DEFAULT_KEY_SIZE;

      // Derive encryption key from master password
      const encKey = this.getCachedKey(masterPassword, salt, iterations, keySize);
      
      // Derive separate HMAC key for authentication
      const hmacKey = CryptoJS.PBKDF2(masterPassword, salt + 'HMAC', {
        iterations,
        keySize,
        hasher: CryptoJS.algo.SHA512
      });

      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(data, encKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const ciphertext = encrypted.toString();
      
      // Create HMAC over IV + ciphertext for authentication
      const hmacInput = iv + ciphertext;
      const hmac = CryptoJS.HmacSHA256(hmacInput, hmacKey).toString();

      return {
        encryptedData: ciphertext,
        iv,
        salt,
        hmac,
        keyDerivationParams: {
          iterations,
          keySize
        }
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + (error as Error).message);
    }
  }

  /**
   * Optimized hash for registration (lighter iterations for faster signup)
   * Still secure but faster for initial account creation
   */
  static hashForRegistration(password: string, salt: string): string {
    const hash = CryptoJS.PBKDF2(password, salt, {
      iterations: 75000, // 25% fewer iterations for faster registration
      keySize: this.DEFAULT_KEY_SIZE,
      hasher: CryptoJS.algo.SHA512
    });
    return hash.toString();
  }
} 