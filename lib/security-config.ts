/**
 * Security Configuration for CryptLock Password Manager
 * Centralized security settings and constants
 */

export const SECURITY_CONFIG = {
  // Authentication Settings
  AUTH: {
    // Session timeout in minutes
    SESSION_TIMEOUT: 60,
    // Master password verification timeout in minutes
    MASTER_PASSWORD_TIMEOUT: 15,
    // Maximum login attempts before lockout
    MAX_LOGIN_ATTEMPTS: 5,
    // Lockout duration in minutes
    LOCKOUT_DURATION: 30,
    // Minimum password length
    MIN_PASSWORD_LENGTH: 8,
    // Minimum master password length
    MIN_MASTER_PASSWORD_LENGTH: 12,
  },

  // Cookie Settings
  COOKIES: {
    // Cookie names
    AUTH_TOKEN: 'auth-token',
    MASTER_PASSWORD_VERIFIED: 'master-password-verified',
    // Cookie expiry in days
    AUTH_EXPIRY_DAYS: 7,
    MASTER_PASSWORD_EXPIRY_DAYS: 1,
    // Cookie security options
    SECURE: true,
    SAME_SITE: 'strict' as const,
    HTTP_ONLY: false, // Client-side access needed for middleware
  },

  // Encryption Settings
  ENCRYPTION: {
    // PBKDF2 iterations for key derivation
    PBKDF2_ITERATIONS: 100000,
    // Salt length in bytes
    SALT_LENGTH: 32,
    // IV length for AES encryption
    IV_LENGTH: 16,
    // Key length for AES-256
    KEY_LENGTH: 32,
  },

  // Content Security Policy
  CSP: {
    DEFAULT_SRC: "'self'",
    SCRIPT_SRC: "'self' 'unsafe-inline' 'unsafe-eval'",
    STYLE_SRC: "'self' 'unsafe-inline'",
    IMG_SRC: "'self' data: https:",
    FONT_SRC: "'self' data:",
    CONNECT_SRC: "'self' https://*.firebaseapp.com https://*.googleapis.com",
    FRAME_ANCESTORS: "'none'",
    OBJECT_SRC: "'none'",
    BASE_URI: "'self'",
    FORM_ACTION: "'self'",
  },

  // Security Headers
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  },

  // Rate Limiting
  RATE_LIMITS: {
    // Login attempts per IP per hour
    LOGIN_ATTEMPTS_PER_HOUR: 10,
    // Registration attempts per IP per hour
    REGISTRATION_ATTEMPTS_PER_HOUR: 5,
    // Password reset attempts per email per hour
    PASSWORD_RESET_PER_HOUR: 3,
  },

  // Secure Routes Configuration
  ROUTES: {
    // Routes that require authentication
    PROTECTED: ['/dashboard', '/settings', '/vault', '/export'],
    // Routes that require master password verification
    MASTER_PASSWORD_REQUIRED: ['/dashboard', '/vault', '/export'],
    // Auth routes that should redirect authenticated users
    AUTH_ROUTES: ['/auth/login', '/auth/register'],
    // Completely public routes
    PUBLIC: ['/', '/privacy', '/terms', '/security', '/about'],
  },

  // Auto-lock Settings
  AUTO_LOCK: {
    // Default auto-lock timeout in minutes
    DEFAULT_TIMEOUT: 15,
    // Available timeout options in minutes
    TIMEOUT_OPTIONS: [5, 10, 15, 30, 60, 120],
    // Minimum timeout allowed
    MIN_TIMEOUT: 5,
    // Maximum timeout allowed
    MAX_TIMEOUT: 720, // 12 hours
  },

  // Password Generation
  PASSWORD_GENERATION: {
    // Default password length
    DEFAULT_LENGTH: 16,
    // Minimum password length
    MIN_LENGTH: 8,
    // Maximum password length
    MAX_LENGTH: 128,
    // Character sets
    LOWERCASE: 'abcdefghijklmnopqrstuvwxyz',
    UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    NUMBERS: '0123456789',
    SYMBOLS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    // Similar characters to avoid in passwords
    SIMILAR_CHARS: 'il1Lo0O',
  },

  // Security Events
  SECURITY_EVENTS: {
    // Events that should be logged
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT: 'logout',
    MASTER_PASSWORD_VERIFIED: 'master_password_verified',
    MASTER_PASSWORD_FAILED: 'master_password_failed',
    VAULT_LOCKED: 'vault_locked',
    PASSWORD_CREATED: 'password_created',
    PASSWORD_UPDATED: 'password_updated',
    PASSWORD_DELETED: 'password_deleted',
    EXPORT_INITIATED: 'export_initiated',
    SETTINGS_CHANGED: 'settings_changed',
  },
} as const;

/**
 * Get Content Security Policy header value
 */
export function getCSPHeader(): string {
  const csp = SECURITY_CONFIG.CSP;
  return [
    `default-src ${csp.DEFAULT_SRC}`,
    `script-src ${csp.SCRIPT_SRC}`,
    `style-src ${csp.STYLE_SRC}`,
    `img-src ${csp.IMG_SRC}`,
    `font-src ${csp.FONT_SRC}`,
    `connect-src ${csp.CONNECT_SRC}`,
    `frame-ancestors ${csp.FRAME_ANCESTORS}`,
    `object-src ${csp.OBJECT_SRC}`,
    `base-uri ${csp.BASE_URI}`,
    `form-action ${csp.FORM_ACTION}`,
  ].join('; ');
}

/**
 * Check if a route requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return SECURITY_CONFIG.ROUTES.PROTECTED.some(route => pathname.startsWith(route));
}

/**
 * Check if a route requires master password verification
 */
export function requiresMasterPassword(pathname: string): boolean {
  return SECURITY_CONFIG.ROUTES.MASTER_PASSWORD_REQUIRED.some(route => pathname.startsWith(route));
}

/**
 * Check if a route is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
  return SECURITY_CONFIG.ROUTES.AUTH_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a route is public
 */
export function isPublicRoute(pathname: string): boolean {
  return (SECURITY_CONFIG.ROUTES.PUBLIC as readonly string[]).includes(pathname) || pathname === '/';
}

/**
 * Get secure cookie options
 */
export function getCookieOptions(name: keyof typeof SECURITY_CONFIG.COOKIES) {
  const config = SECURITY_CONFIG.COOKIES;
  const expiry = name === 'AUTH_TOKEN' ? config.AUTH_EXPIRY_DAYS : config.MASTER_PASSWORD_EXPIRY_DAYS;
  
  return {
    expires: new Date(Date.now() + expiry * 24 * 60 * 60 * 1000),
    secure: config.SECURE,
    sameSite: config.SAME_SITE,
    httpOnly: config.HTTP_ONLY,
    path: '/',
  };
} 