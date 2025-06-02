// Web Worker for crypto operations to improve INP
import CryptoJS from 'crypto-js';
import { ZeroKnowledgeEncryption } from './encryption';

// Type declarations for scheduler API
declare global {
  interface Window {
    scheduler?: {
      postTask: (callback: () => void, options?: { priority: string }) => void;
    };
  }
}

export interface CryptoTask {
  id: string;
  type: 'encrypt' | 'decrypt' | 'hash' | 'fastHash' | 'validate';
  data: {
    text?: string;
    key?: string;
    encryptedData?: string;
  };
}

export interface CryptoResult {
  id: string;
  result: string | boolean;
  error?: string;
}

// Web Worker code
const workerCode = `
importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

self.onmessage = function(e) {
  const { id, type, data } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'encrypt':
        // Generate random IV for each encryption
        const iv = CryptoJS.lib.WordArray.random(128 / 8);
        const encrypted = CryptoJS.AES.encrypt(data.text, data.key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        // Prepend IV to ciphertext for storage
        result = iv.toString() + ':' + encrypted.toString();
        break;
        
      case 'decrypt':
        // Split IV and ciphertext
        const parts = data.encryptedData.split(':');
        if (parts.length !== 2) throw new Error('Invalid encrypted data format');
        const ivHex = parts[0];
        const ciphertext = parts[1];
        
        const decrypted = CryptoJS.AES.decrypt(ciphertext, data.key, {
          iv: CryptoJS.enc.Hex.parse(ivHex),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        result = decrypted.toString(CryptoJS.enc.Utf8);
        break;
        
      case 'validate':
        // Validate that encrypted data can be decrypted
        try {
          const testParts = data.encryptedData.split(':');
          if (testParts.length !== 2) throw new Error('Invalid format');
          
          const testIvHex = testParts[0];
          const testCiphertext = testParts[1];
          
          const testDecrypt = CryptoJS.AES.decrypt(testCiphertext, data.key, {
            iv: CryptoJS.enc.Hex.parse(testIvHex),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          });
          const decryptedTest = testDecrypt.toString(CryptoJS.enc.Utf8);
          result = !!(decryptedTest && decryptedTest.length > 0);
        } catch (error) {
          result = false;
        }
        break;
        
      default:
        throw new Error('Unknown crypto operation: ' + type);
    }
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
`;

interface PendingTask {
  resolve: (value: string | boolean) => void;
  reject: (reason: Error) => void;
}

class CryptoWorkerManager {
  private worker: Worker | null = null;
  private pendingTasks = new Map<string, PendingTask>();
  private taskIdCounter = 0;
  private workerReady = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // Create worker from blob to avoid external file dependency
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (e: MessageEvent<CryptoResult>) => {
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
      
      this.worker.onerror = (error) => {
        console.error('Crypto worker error:', error);
        this.workerReady = false;
      };
      
      this.workerReady = true;
      
      // Clean up URL
      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.warn('Failed to create crypto worker, falling back to main thread:', error);
      this.workerReady = false;
    }
  }

  private generateTaskId(): string {
    return `task_${++this.taskIdCounter}_${Date.now()}`;
  }

  async executeTask(type: string, data: CryptoTask['data']): Promise<string | boolean> {
    // Fallback to main thread if worker is not available
    if (!this.workerReady || !this.worker) {
      return this.executeOnMainThread(type, data);
    }

    const id = this.generateTaskId();
    
    return new Promise<string | boolean>((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject });
      
      // Set timeout for tasks
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error('Crypto operation timeout'));
        }
      }, 10000);
      
      this.worker!.postMessage({ id, type, data });
    });
  }

  private executeOnMainThread(type: string, data: CryptoTask['data']): Promise<string | boolean> {
    return new Promise<string | boolean>((resolve, reject) => {
      // Use requestIdleCallback to avoid blocking interactions
      const execute = () => {
        try {
          let result: string | boolean;
          
          switch (type) {
            case 'encrypt':
              if (!data.text || !data.key) throw new Error('Missing text or key for encryption');
              // Generate random IV for each encryption
              const iv = CryptoJS.lib.WordArray.random(128 / 8);
              const encrypted = CryptoJS.AES.encrypt(data.text, data.key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
              });
              // Prepend IV to ciphertext for storage
              result = iv.toString() + ':' + encrypted.toString();
              break;
              
            case 'decrypt':
              if (!data.encryptedData || !data.key) throw new Error('Missing encryptedData or key for decryption');
              // Split IV and ciphertext
              const parts = data.encryptedData.split(':');
              if (parts.length !== 2) throw new Error('Invalid encrypted data format');
              const ivHex = parts[0];
              const ciphertext = parts[1];
              
              const decrypted = CryptoJS.AES.decrypt(ciphertext, data.key, {
                iv: CryptoJS.enc.Hex.parse(ivHex),
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
              });
              result = decrypted.toString(CryptoJS.enc.Utf8);
              break;
              
            case 'validate':
              if (!data.encryptedData || !data.key) throw new Error('Missing encryptedData or key for validation');
              try {
                const testParts = data.encryptedData.split(':');
                if (testParts.length !== 2) throw new Error('Invalid format');
                
                const testIvHex = testParts[0];
                const testCiphertext = testParts[1];
                
                const testDecrypt = CryptoJS.AES.decrypt(testCiphertext, data.key, {
                  iv: CryptoJS.enc.Hex.parse(testIvHex),
                  mode: CryptoJS.mode.CBC,
                  padding: CryptoJS.pad.Pkcs7
                });
                const decryptedTest = testDecrypt.toString(CryptoJS.enc.Utf8);
                result = !!(decryptedTest && decryptedTest.length > 0);
              } catch (error) {
                result = false;
              }
              break;
              
            default:
              throw new Error('Unknown crypto operation: ' + type);
          }
          
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      // Use scheduler API if available, otherwise fallback to setTimeout
      if (window.scheduler && 'postTask' in window.scheduler) {
        window.scheduler.postTask(execute, { priority: 'background' });
      } else if ('requestIdleCallback' in window) {
        requestIdleCallback(() => execute(), { timeout: 1000 });
      } else {
        setTimeout(execute, 0);
      }
    });
  }

  // Helper methods for common operations
  async encryptForSession(password: string, key: string): Promise<string> {
    const result = await this.executeTask('encrypt', { text: password, key });
    return result as string;
  }

  async decryptFromSession(encryptedData: string, key: string): Promise<string> {
    const result = await this.executeTask('decrypt', { encryptedData, key });
    return result as string;
  }

  async validateSessionData(encryptedData: string, key: string): Promise<boolean> {
    const result = await this.executeTask('validate', { encryptedData, key });
    return result as boolean;
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingTasks.clear();
    this.workerReady = false;
  }
}

// Singleton instance
let cryptoWorkerManager: CryptoWorkerManager | null = null;

export function getCryptoWorker(): CryptoWorkerManager {
  if (!cryptoWorkerManager) {
    cryptoWorkerManager = new CryptoWorkerManager();
  }
  return cryptoWorkerManager;
} 