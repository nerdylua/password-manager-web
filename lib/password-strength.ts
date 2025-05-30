import zxcvbn from 'zxcvbn';

export interface PasswordStrengthResult {
  score: number; // 0-4 (0: weak, 4: strong)
  crackTimeDisplay: string;
  suggestions: string[];
  warning: string;
  guessesLog10: number;
  entropy: number;
  strengthText: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  strengthColor: string;
  percentage: number;
}

export class PasswordStrengthAnalyzer {
  /**
   * Analyzes password strength using zxcvbn and additional custom checks
   */
  static analyzePassword(password: string, userInputs: string[] = []): PasswordStrengthResult {
    if (!password) {
      return {
        score: 0,
        crackTimeDisplay: 'instant',
        suggestions: ['Enter a password'],
        warning: 'Password is required',
        guessesLog10: 0,
        entropy: 0,
        strengthText: 'Very Weak',
        strengthColor: '#ef4444',
        percentage: 0
      };
    }

    const result = zxcvbn(password, userInputs);
    
    const strengthTexts: Record<number, 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'> = {
      0: 'Very Weak',
      1: 'Weak',
      2: 'Fair',
      3: 'Good',
      4: 'Strong'
    };

    const strengthColors: Record<number, string> = {
      0: '#ef4444', // red
      1: '#f97316', // orange
      2: '#eab308', // yellow
      3: '#22c55e', // green
      4: '#16a34a'  // dark green
    };

    // Calculate entropy
    const entropy = this.calculateEntropy(password);

    // Enhanced suggestions
    const enhancedSuggestions = this.getEnhancedSuggestions(password, result.feedback.suggestions);

    return {
      score: result.score,
      crackTimeDisplay: String(result.crack_times_display.offline_slow_hashing_1e4_per_second),
      suggestions: enhancedSuggestions,
      warning: result.feedback.warning || '',
      guessesLog10: result.guesses_log10,
      entropy,
      strengthText: strengthTexts[result.score],
      strengthColor: strengthColors[result.score],
      percentage: (result.score / 4) * 100
    };
  }

  /**
   * Calculates password entropy
   */
  private static calculateEntropy(password: string): number {
    let charsetSize = 0;
    
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32; // Approximation for symbols
    
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  /**
   * Provides enhanced suggestions based on password analysis
   */
  private static getEnhancedSuggestions(password: string, baseSuggestions: string[]): string[] {
    const suggestions = [...baseSuggestions];
    
    if (password.length < 12) {
      suggestions.push('Use at least 12 characters for better security');
    }
    
    if (!/[a-z]/.test(password)) {
      suggestions.push('Add lowercase letters');
    }
    
    if (!/[A-Z]/.test(password)) {
      suggestions.push('Add uppercase letters');
    }
    
    if (!/[0-9]/.test(password)) {
      suggestions.push('Add numbers');
    }
    
    if (!/[^a-zA-Z0-9]/.test(password)) {
      suggestions.push('Add special characters (!@#$%^&*)');
    }
    
    if (/(.)\1{2,}/.test(password)) {
      suggestions.push('Avoid repeating characters');
    }
    
    if (/123|abc|qwe|password|admin/i.test(password)) {
      suggestions.push('Avoid common patterns and words');
    }
    
    return suggestions.slice(0, 3); // Limit to 3 most important suggestions
  }

  /**
   * Checks if password meets minimum security requirements
   */
  static meetsMinimumRequirements(password: string): boolean {
    return password.length >= 8 &&
           /[a-z]/.test(password) &&
           /[A-Z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[^a-zA-Z0-9]/.test(password);
  }

  /**
   * Generates a secure password with specified criteria
   */
  static generateSecurePassword(
    length: number = 16,
    options: {
      uppercase?: boolean;
      lowercase?: boolean;
      numbers?: boolean;
      symbols?: boolean;
      excludeSimilar?: boolean;
      excludeAmbiguous?: boolean;
    } = {}
  ): string {
    const defaultOptions = {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeSimilar: false,
      excludeAmbiguous: false,
      ...options
    };

    let charset = '';
    
    if (defaultOptions.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (defaultOptions.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (defaultOptions.numbers) charset += '0123456789';
    if (defaultOptions.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (defaultOptions.excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, '');
    }
    
    if (defaultOptions.excludeAmbiguous) {
      charset = charset.replace(/[{}[\]()\/\\'"~,;.<>]/g, '');
    }
    
    let password = '';
    const crypto = window.crypto || (window as { msCrypto?: Crypto }).msCrypto;
    
    for (let i = 0; i < length; i++) {
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const randomIndex = randomArray[0] % charset.length;
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Checks for common patterns that make passwords weak
   */
  static hasCommonPatterns(password: string): string[] {
    const patterns: string[] = [];
    
    if (/(.)\1{2,}/.test(password)) {
      patterns.push('Repeated characters');
    }
    
    if (/123|234|345|456|567|678|789|890/.test(password)) {
      patterns.push('Sequential numbers');
    }
    
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
      patterns.push('Sequential letters');
    }
    
    if (/qwerty|asdf|zxcv/i.test(password)) {
      patterns.push('Keyboard patterns');
    }
    
    const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'monkey', 'letmein', '123456', 'qwerty'];
    const lowerPassword = password.toLowerCase();
    
    for (const word of commonWords) {
      if (lowerPassword.includes(word)) {
        patterns.push(`Common word: ${word}`);
        break;
      }
    }
    
    return patterns;
  }
} 