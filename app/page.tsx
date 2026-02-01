'use client';

import Link from 'next/link';
import { useState, useCallback, useMemo, memo, lazy, Suspense, useEffect, startTransition } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { NavigationMobile } from '@/components/header-mobile';
import { useAuth } from '@/hooks/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { User } from 'firebase/auth';

// Optimize imports - only import icons that are immediately visible
import { 
  ArrowRight, 
  CheckCircle, 
  Eye, 
  Globe, 
  Heart, 
  Shield, 
  Sparkles, 
  Lock,
  Key,
  Fingerprint,
  ShieldCheck,
  Database,
  Infinity,
  Award,
  TrendingUp,
  Rocket,
  Github,
  Twitter,
  Mail,
  LogOut,
  BarChart3,
  Info,
  Download
} from 'lucide-react';

// Lazy load additional icons only when needed
const LazyIcons = {
  Clock: lazy(() => import('lucide-react').then(mod => ({ default: mod.Clock }))),
  Layers: lazy(() => import('lucide-react').then(mod => ({ default: mod.Layers }))),
  AlertTriangle: lazy(() => import('lucide-react').then(mod => ({ default: mod.AlertTriangle }))),
  Share2: lazy(() => import('lucide-react').then(mod => ({ default: mod.Share2 }))),
};

// Create proper component wrappers for lazy icons
const LazyAlertTriangle = ({ className }: { className?: string }) => (
  <Suspense fallback={<Shield className={className} />}>
    <LazyIcons.AlertTriangle className={className} />
  </Suspense>
);

import { cn } from '@/lib/utils';

// SSR-safe check for browser environment - lazy check to avoid issues during module initialization
const canUseStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.sessionStorage === 'undefined') return false;
  if (typeof window.sessionStorage.getItem !== 'function') return false;
  if (typeof window.sessionStorage.setItem !== 'function') return false;
  if (typeof window.sessionStorage.removeItem !== 'function') return false;
  return true;
};

// SSR-safe sessionStorage wrapper
const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!canUseStorage()) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!canUseStorage()) return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (key: string): void => {
    if (!canUseStorage()) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

// Lazy load heavy components that aren't immediately visible
const ParallaxSection = lazy(() => import('@/components/parallax-section').then(module => ({ default: module.ParallaxSection })));
const AnimatedCounter = lazy(() => import('@/components/animated-counter').then(module => ({ default: module.AnimatedCounter })));
const FloatingCard = lazy(() => import('@/components/floating-card').then(module => ({ default: module.FloatingCard })));

// Component interfaces for better type safety
interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  features: string[];
  color: string;
}

interface SecurityFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

interface UserProfile {
  displayName?: string;
  email?: string;
}

interface NavigationProps {
  user: User | null;
  userProfile: UserProfile | null;
  masterPasswordVerified: boolean;
  handleDashboardAccess: () => void;
  handleLogout: () => void;
  isCompact: boolean;
}

// Memoized components to prevent unnecessary re-renders
const FeatureCard = memo(({ feature, index }: { feature: Feature; index: number }) => (
  <Suspense fallback={<div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
    <FloatingCard delay={index * 0.1} className="app-surface p-8">
      <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10`}>
        <feature.icon className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">{feature.description}</p>
      <ul className="space-y-3">
        {feature.features.map((item: string, idx: number) => (
          <li key={idx} className="flex items-center text-slate-600 dark:text-slate-400">
            <CheckCircle className="h-4 w-4 text-slate-900 dark:text-slate-100 mr-3 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </FloatingCard>
  </Suspense>
));

FeatureCard.displayName = 'FeatureCard';

const SecurityFeatureCard = memo(({ feature, index }: { feature: SecurityFeature; index: number }) => (
  <Suspense fallback={<div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
    <FloatingCard delay={index * 0.1} className="app-surface p-8">
      <div className="flex items-start space-x-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center flex-shrink0 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <feature.icon className="h-7 w-7 text-white dark:text-slate-900" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
            <div className="text-right">
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{feature.stat}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{feature.statLabel}</div>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
        </div>
      </div>
    </FloatingCard>
  </Suspense>
));

SecurityFeatureCard.displayName = 'SecurityFeatureCard';

const TrustIndicatorCard = memo(({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) => (
  <Suspense fallback={<div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
    <FloatingCard delay={delay} className={className}>
      {children}
    </FloatingCard>
  </Suspense>
));

TrustIndicatorCard.displayName = 'TrustIndicatorCard';

const StatCard = memo(({ stat, index }: { stat: Stat; index: number }) => (
  <div className="text-center">
    <div className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-2">
      <Suspense fallback={<span className="bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block animate-pulse" />}>
        {stat.value === 0 ? (
          // Direct render for zero to ensure it always shows
          <span className="text-slate-900 dark:text-white">0{stat.suffix}</span>
        ) : (
          <AnimatedCounter 
            value={stat.value} 
            suffix={stat.suffix}
            className="text-slate-900 dark:text-white"
          />
        )}
      </Suspense>
    </div>
    <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">{stat.label}</p>
  </div>
));

StatCard.displayName = 'StatCard';

// Memoized navigation component - Desktop only
const Navigation = memo(({ 
  user, 
  userProfile, 
  masterPasswordVerified, 
  handleDashboardAccess, 
  handleLogout,
  isCompact
}: NavigationProps) => (
  <nav className={cn(
    "hidden md:flex items-center space-x-6",
    isCompact ? "h-16" : "h-20"
  )}>
    <Link href="#features" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium">
              Features
            </Link>
    <Link href="#extension" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium">
      Extension
    </Link>
    <Link href="#privacy" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium">
      Privacy Proof
    </Link>
    <Link href="#about" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium">
      About
            </Link>
    
    {user ? (
      <>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Welcome, {userProfile?.displayName || user.email?.split('@')[0]}
        </span>
        <Button 
          onClick={handleDashboardAccess}
          variant="outline"
          size="sm"
          className="app-cta-outline"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          {masterPasswordVerified ? 'Dashboard' : 'Sign In'}
        </Button>
        <Button 
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </>
    ) : (
      <>
        <Link href="/auth/login" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium">
              Sign In
            </Link>
            <Link href="/auth/register">
          <Button className="app-cta shadow-sm hover:shadow-md transition-all duration-300">
            Get Started Free
          </Button>
            </Link>
      </>
    )}
    <ThemeToggle />
          </nav>
));

Navigation.displayName = 'Navigation';

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  
  // Optimize parallax transforms with reduced calculations
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  
  const { user, userProfile, logout, masterPasswordVerified } = useAuth();
  const router = useRouter();

  // Handle scroll for dynamic header with throttling
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Check multiple scroll sources - body/html may be the scroll container due to CSS
      const scrollPos = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setIsScrolled(scrollPos > 50);
    };
    
    // Set initial state
    handleScroll();
    
    // Listen on multiple targets for scroll events (CSS makes body/html the scroll container)
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    document.body.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    document.documentElement.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      document.removeEventListener("scroll", handleScroll, { capture: true });
      document.body.removeEventListener("scroll", handleScroll, { capture: true });
      document.documentElement.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  // Memoized handlers to prevent re-renders
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  }, [logout]);

  const handleDashboardAccess = useCallback(() => {
    // Use startTransition for non-urgent updates
    startTransition(() => {
      if (masterPasswordVerified) {
        // Clear any stale vault access markers to ensure clean navigation
        safeSessionStorage.removeItem('vaultAccessAuthorized');
        router.push('/dashboard');
      } else if (user) {
        // User is authenticated but needs master password verification
        const loginUrl = new URL('/auth/login', window.location.origin);
        loginUrl.searchParams.set('redirectTo', '/dashboard');
        loginUrl.searchParams.set('step', 'master-password');
        router.push(loginUrl.toString());
      } else {
        // User is not authenticated at all
        router.push('/auth/login');
      }
    });
  }, [user, masterPasswordVerified, router]);

  const handleVaultAccess = useCallback(() => {
    startTransition(() => {
      safeSessionStorage.setItem('vaultAccessAuthorized', 'true');
      router.push('/vault');
    });
  }, [router]);

  // Memoized data arrays to prevent recreation on each render
  const features = useMemo(() => [
    {
      icon: Key,
      title: "Password Generation",
      description: "Generate cryptographically secure passwords with advanced customization options",
      features: ["Customizable length & complexity", "Real-time strength analysis", "Pronounceable password options"],
      color: "bg-gradient-to-br from-blue-600 to-indigo-500"
    },
    {
      icon: Lock,
      title: "Zero-Knowledge Architecture",
      description: "Your data is encrypted before it ever leaves your device - true privacy protection",
      features: ["Client-side encryption", "No server access to data", "Complete privacy guarantee"],
      color: "bg-gradient-to-br from-emerald-500 to-green-600"
    },
    {
      icon: Globe,
      title: "Cross-Platform Sync",
      description: "Access your passwords on all devices with real-time encrypted synchronization",
      features: ["Instant sync across devices", "Offline access capability", "Conflict resolution"],
      color: "bg-gradient-to-br from-violet-600 to-fuchsia-500"
    },
    {
      icon: ShieldCheck,
      title: "Security Monitoring",
      description: "Advanced threat detection and breach monitoring to keep you safe",
      features: ["Data breach alerts", "Weak password detection", "Security score tracking"],
      color: "bg-gradient-to-br from-rose-500 to-orange-500"
    },
    {
      icon: Database,
      title: "Secure Vault",
      description: "Store passwords, notes, cards, and identity information in one secure place",
      features: ["Multiple data types", "Organized categories", "Advanced search"],
      color: "bg-gradient-to-br from-sky-500 to-blue-600"
    },
    {
      icon: Shield,
      title: "Secure Sharing",
      description: "Share passwords and notes securely with family and team members",
      features: ["Encrypted sharing", "Access controls", "Audit trails"],
      color: "bg-gradient-to-br from-amber-500 to-yellow-500"
    }
  ], []);

  const securityFeatures = useMemo(() => [
    {
      icon: Eye,
      title: "Zero-Knowledge Architecture",
      description: "Your master password never leaves your device. We literally cannot see your data, even if we wanted to.",
      stat: "100%",
      statLabel: "Privacy"
    },
    {
      icon: Shield,
      title: "AES-256 Encryption",
      description: "Military-grade encryption with PBKDF2 key derivation using 100,000+ iterations for maximum security.",
      stat: "256-bit",
      statLabel: "Encryption"
    },
    {
      icon: ShieldCheck,
      title: "End-to-End Protection",
      description: "Data is encrypted on your device before transmission and remains encrypted in our databases.",
      stat: "24/7",
      statLabel: "Protection"
    },
    {
      icon: Shield,
      title: "Multi-Layer Security",
      description: "Multiple security layers including device authentication, secure protocols, and encrypted storage.",
      stat: "5+",
      statLabel: "Security Layers"
    }
  ], []);

  const stats = useMemo(() => [
    { value: 2025, suffix: "", label: "Actively Maintained" },
    { value: 99, suffix: ".9%", label: "Independently Verified Uptime" },
    { value: 256, suffix: "-bit", label: "AES Encryption" },
    { value: 0, suffix: " ", label: "Critical Vulnerabilities (Current)" }
  ], []);

  return (
    <TooltipProvider>
      <div className="app-shell">
        {/* Optimized Animated Background Elements - reduced complexity */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            style={{ y: y1 }}
            className="absolute top-16 left-6 w-80 h-80 bg-gradient-to-r from-blue-400/15 to-indigo-300/10 rounded-full blur-3xl"
          />
          <motion.div 
            style={{ y: y2 }}
            className="absolute top-40 right-6 w-96 h-96 bg-gradient-to-r from-pink-300/15 to-orange-200/10 rounded-full blur-3xl"
          />
          <motion.div
            style={{ y: y1 }}
            className="absolute bottom-10 left-1/3 w-72 h-72 bg-gradient-to-r from-emerald-300/12 to-cyan-200/10 rounded-full blur-3xl"
          />
        </div>

        {/* Dynamic Header - Transforms on scroll */}
        <motion.header
          className="fixed left-0 right-0 top-0 z-50"
        >
          <motion.div
            initial={{
              maxWidth: "100%",
              margin: "0 auto",
              borderRadius: "0",
            }}
            animate={{
              maxWidth: isScrolled ? "68rem" : "100%",
              margin: isScrolled ? "1rem auto" : "0 auto",
              borderRadius: isScrolled ? "9999px" : "0",
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className={cn(
              "bg-white/80 dark:bg-slate-900/70 border backdrop-blur-xl transition-all duration-300",
              isScrolled
                ? "mx-4 md:mx-auto shadow-lg border-slate-200/70 dark:border-slate-800/70" 
                : "shadow-sm border-slate-200/60 dark:border-slate-800/60"
            )}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className={cn(
                "flex items-center justify-between transition-all duration-300",
                isScrolled ? "h-16" : "h-20"
              )}>
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-3 group">
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Lock className={cn(
                      "text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors",
                      isScrolled ? "h-7 w-7" : "h-8 w-8"
                    )} />
                  </motion.div>
                  <motion.span 
                    className="font-semibold text-slate-900 dark:text-white tracking-tight"
                    animate={{
                      fontSize: isScrolled ? "1.25rem" : "1.5rem"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    CryptLock
                  </motion.span>
                </Link>

                {/* Desktop Navigation */}
                <Navigation 
                  user={user}
                  userProfile={userProfile}
                  masterPasswordVerified={masterPasswordVerified}
                  handleDashboardAccess={handleDashboardAccess}
                  handleLogout={handleLogout}
                  isCompact={isScrolled}
                />

                {/* Mobile Navigation */}
                <NavigationMobile
                  user={user}
                  userProfile={userProfile}
                  masterPasswordVerified={masterPasswordVerified}
                  handleDashboardAccess={handleDashboardAccess}
                  handleLogout={handleLogout}
                  isScrolled={isScrolled}
                />
              </div>
            </div>
          </motion.div>
        </motion.header>

        {/* Spacer for fixed header */}
        <div className="h-20" />

        {/* Hero Section */}
        <section className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-6xl mx-auto text-center">
            {/* Announcement Banner */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center justify-center mb-8"
            >
              <Badge
                variant="secondary"
                className="app-pill bg-blue-50/80 text-blue-700 border-blue-200/70 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800/60"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                100% Free Forever - No Hidden Costs
              </Badge>
            </motion.div>

            {/* Hero Content */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-12"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
                Your Digital Life,{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  Completely Secure
                </span>
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-slate-400 mb-8 max-w-4xl mx-auto leading-relaxed">
              Privacy-first password management with{' '}
                <strong className="text-slate-900 dark:text-white">zero-knowledge architecture</strong>.
                Your master password never leaves your device — we literally cannot see your data.
              </p>
            </motion.div>
            
            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              {user ? (
                <>
                  <Button 
                    onClick={handleDashboardAccess}
                    size="lg" 
                    className="w-full sm:w-auto app-cta shadow-sm hover:shadow-md text-lg px-8 py-4 group"
                  >
                    <BarChart3 className="mr-2 h-5 w-5" />
                    {masterPasswordVerified ? 'Enter Dashboard' : 'Sign In to Dashboard'}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  {masterPasswordVerified && (
                    <Button 
                      onClick={handleVaultAccess}
                      variant="outline" 
                      size="lg" 
                      className="w-full sm:w-auto app-cta-outline transition-all duration-300 text-lg px-8 py-4"
                    >
                      <Lock className="mr-2 h-5 w-5" />
                      Access Vault
                    </Button>
                  )}
                  
                  {/* Loading Information Tooltip for Logged-in Users */}
                  <div className="flex items-center mt-4 sm:mt-0 sm:ml-4">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 cursor-help">
                          <Info className="h-4 w-4 mr-1.5" />
                          <span className="hidden sm:inline">Loading Info</span>
                          <span className="sm:hidden">Info</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs" sideOffset={5}>
                        <div className="text-sm space-y-2">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            📊 Dashboard & 🔐 Vault Loading Times
                          </div>
                          <div className="space-y-1 text-xs">
                            <p><strong>Initial Load:</strong> 2-5 seconds (decrypting your data)</p>
                            <p><strong>Real-time Updates:</strong> Instant sync across all devices</p>
                            <p><strong>Security:</strong> All decryption happens locally in your browser</p>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                            Loading time depends on vault size and connection speed
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </>
              ) : (
                <>
              <Link href="/auth/register">
                    <Button size="lg" className="w-full sm:w-auto app-cta shadow-sm hover:shadow-md text-lg px-8 py-4 group">
                      <Rocket className="mr-2 h-5 w-5" />
                  Start Free Today
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/login">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto app-cta-outline transition-all duration-300 text-lg px-8 py-4">
                  Sign In
                </Button>
              </Link>
                </>
              )}
            </motion.div>

            {/* Trust Indicators */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
            >
              <TrustIndicatorCard delay={0.1} className="app-surface p-6">
              <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 ring-1 ring-black/5 dark:ring-white/10">
                    <Github className="h-7 w-7 text-slate-700 dark:text-slate-200" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">Open Source</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm">Code is public & auditable</p>
                </div>
              </TrustIndicatorCard>

              <TrustIndicatorCard delay={0.2} className="app-surface p-6">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 ring-1 ring-black/5 dark:ring-white/10">
                    <Lock className="h-7 w-7 text-slate-700 dark:text-slate-200" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">Local First</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm">Your data stays on your device</p>
              </div>
              </TrustIndicatorCard>

              <TrustIndicatorCard delay={0.3} className="app-surface p-6">
              <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 ring-1 ring-black/5 dark:ring-white/10">
                    <Shield className="h-7 w-7 text-slate-700 dark:text-slate-200" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">Bug Bounty Active</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm">Ongoing security research</p>
                </div>
              </TrustIndicatorCard>

              <TrustIndicatorCard delay={0.4} className="app-surface p-6">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 ring-1 ring-black/5 dark:ring-white/10">
                    <Eye className="h-7 w-7 text-slate-700 dark:text-slate-200" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">Zero-Knowledge</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm">Cryptographically proven</p>
                </div>
              </TrustIndicatorCard>
            </motion.div>

            {/* Stats - Optimized for faster render */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12"
            >
              {stats.map((stat, index) => (
                <StatCard key={index} stat={stat} index={index} />
              ))}
            </motion.div>

            {/* Launch Announcement - Reduced animation delay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              className="flex items-center justify-center space-x-2 text-slate-600 dark:text-slate-400"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">Available now</span>
                <span>•</span>
                <span>Built with modern security standards</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - Now includes Security Architecture */}
        <Suspense fallback={<div className="app-section app-section-muted backdrop-blur-sm"><div className="container mx-auto px-4"><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
          <ParallaxSection>
            <section id="features" className="app-section app-section-muted backdrop-blur-sm">
          <div className="container mx-auto px-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="text-center mb-16"
                >
                  <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 dark:text-white mb-6 tracking-tight">
                    Complete Password Security Solution
              </h2>
                  <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                    Advanced features powered by bank-level security architecture. Everything you need for password security with enterprise-grade protection.
                  </p>
                </motion.div>

                {/* Core Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                  {features.map((feature, index) => (
                    <FeatureCard key={index} feature={feature} index={index} />
                  ))}
            </div>

                {/* Security Architecture Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="text-center mb-16"
                >
                  <div className="inline-flex items-center justify-center mb-6">
                    <Badge
                      variant="secondary"
                      className="app-pill bg-indigo-50/80 text-indigo-700 border-indigo-200/70 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800/60"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Bank-Level Security Architecture
                    </Badge>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-6 tracking-tight">
                    Military-Grade Protection
                  </h3>
                  <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-12">
                    Built with privacy-first principles and zero-knowledge architecture. Your data is encrypted before it ever leaves your device.
                  </p>
                </motion.div>

                {/* Security Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {securityFeatures.map((feature, index) => (
                    <SecurityFeatureCard key={index} feature={feature} index={index} />
                  ))}
                </div>
                  </div>
          </section>
        </ParallaxSection>
      </Suspense>

      {/* Browser Extension Section */}
      <Suspense fallback={<div className="app-section app-section-muted"><div className="container mx-auto px-4"><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section id="extension" className="app-section app-section-muted">
            <div className="container mx-auto px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
                className="text-center mb-16"
              >
                <div className="inline-flex items-center justify-center mb-6">
                  <Badge
                    variant="secondary"
                    className="app-pill bg-violet-50/80 text-violet-700 border-violet-200/70 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800/60"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Browser Extension
                  </Badge>
                </div>
                <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 dark:text-white mb-6 tracking-tight">
                  Save Passwords with One Click
                </h2>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                  Install our browser extension to automatically detect password fields and save them directly to your CryptLock vault with a single click.
                </p>
              </motion.div>

              <div className="max-w-6xl mx-auto">
                {/* Extension Demo */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="app-surface p-8 mb-12"
                >
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    {/* Demo Image/Video Area */}
                    <div className="flex-1">
                      <div className="relative app-surface-muted p-6 min-h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-14 h-14 bg-slate-900 dark:bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Globe className="h-7 w-7 text-white dark:text-slate-900" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                            Browser Extension Demo
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Visit any website → Type password → Click "Save to CryptLock" → Done!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Extension Info */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                        How It Works
                      </h3>
                      <ul className="space-y-4 mb-6">
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                          <span className="text-slate-600 dark:text-slate-400">
                            <strong>Auto-detects</strong> password fields on any website
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                          <span className="text-slate-600 dark:text-slate-400">
                            <strong>One-click save</strong> with "Save to CryptLock" button
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                          <span className="text-slate-600 dark:text-slate-400">
                            <strong>Zero-knowledge</strong> - passwords never stored locally
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                          <span className="text-slate-600 dark:text-slate-400">
                            <strong>Works everywhere</strong> - Gmail, GitHub, Banking, etc.
                          </span>
                        </li>
                      </ul>

                      {/* Download Button */}
                      <Button 
                        onClick={() => {
                          // Create and download zip file
                          const link = document.createElement('a');
                          link.href = '/api/download-extension';
                          link.download = 'cryptlock-extension.zip';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          toast.success('Extension package downloaded! Follow setup instructions below.');
                        }}
                        size="lg" 
                        className="w-full sm:w-auto app-cta shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Download Extension
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Setup Instructions */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {/* Chrome Setup */}
                  <TrustIndicatorCard delay={0.1} className="app-surface p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center mr-4">
                        <Globe className="h-6 w-6 text-white dark:text-slate-900" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Chrome/Edge Setup</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">For Chromium-based browsers</p>
                      </div>
                    </div>
                    <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">1</span>
                        <span>Download and extract the extension package</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">2</span>
                        <span>Go to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">chrome://extensions/</code></span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">3</span>
                        <span>Enable "Developer mode" (top right toggle)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">4</span>
                        <span>Click "Load unpacked" and select the extension folder</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">5</span>
                        <span>Pin the extension for easy access and do not delete the folder</span>
                      </li>
                    </ol>
                  </TrustIndicatorCard>

                  {/* Firefox Setup */}
                  <TrustIndicatorCard delay={0.2} className="app-surface p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center mr-4">
                        <Globe className="h-6 w-6 text-white dark:text-slate-900" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Firefox Setup</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">For Firefox browser</p>
                      </div>
                    </div>
                    <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">1</span>
                        <span>Download and extract the extension package</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">2</span>
                        <span>Go to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">about:debugging</code></span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">3</span>
                        <span>Click "This Firefox" in the sidebar</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">4</span>
                        <span>Click "Load Temporary Add-on" and select manifest.json</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5 flex-shrink-0">5</span>
                        <span className="text-slate-500 dark:text-slate-400">Note: Extension resets when Firefox closes</span>
                      </li>
                    </ol>
                  </TrustIndicatorCard>
                </motion.div>

                {/* Requirements & Troubleshooting */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="mt-12 app-surface p-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Requirements */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                        <Info className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                        Requirements
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                          CryptLock web app accessible (localhost:3000 if local)
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                          Chrome/Edge/Firefox browser
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                          Developer mode enabled (Chrome/Edge)
                        </li>
                      </ul>
                    </div>

                    {/* Troubleshooting */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                        <LazyAlertTriangle className="h-5 w-5 mr-2 text-amber-500 dark:text-amber-400" />
                        Troubleshooting
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Button not appearing? Refresh the page after installation</li>
                        <li>• Extension not working? Ensure CryptLock is running</li>
                        <li>• Service worker issues? Reload the extension</li>
                        <li>• Need help? Check browser console for errors</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </ParallaxSection>
      </Suspense>

      {/* Proof of Privacy Section */}
      <Suspense fallback={<div className="app-section app-section-muted"><div className="container mx-auto px-4"><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section id="privacy" className="app-section app-section-muted">
            <div className="container mx-auto px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
                className="text-center mb-16"
              >
                <div className="inline-flex items-center justify-center mb-6">
                  <Badge
                    variant="secondary"
                    className="app-pill bg-emerald-50/80 text-emerald-700 border-emerald-200/70 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Proof of Privacy
                  </Badge>
                </div>
                <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 dark:text-white mb-6 tracking-tight">
                  See What We Actually Store
                </h2>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                  This is what your data looks like in our database. Even our devs can't read it.
                </p>
              </motion.div>

              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                  {/* What You See */}
                  <TrustIndicatorCard delay={0.1} className="app-surface p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center mr-4">
                        <Eye className="h-6 w-6 text-white dark:text-slate-900" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">What You See</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Decrypted on your device</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
                      <div className="space-y-4 font-mono text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Name:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">My Bank Account</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Username:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">john.doe@email.com</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Password:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">SuperSecure123!</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">URL:</span>
                          <span className="ml-2 text-blue-600 dark:text-blue-400">https://mybank.com</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Notes:</span>
                          <span className="ml-2 text-slate-900 dark:text-white">Account #12345</span>
                        </div>
                      </div>
                </div>
                  </TrustIndicatorCard>

                  {/* What We See */}
                  <TrustIndicatorCard delay={0.2} className="app-surface p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center mr-4">
                        <Database className="h-6 w-6 text-white dark:text-slate-900" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">What We See</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Encrypted in our database</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
                      <div className="space-y-4 font-mono text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">encryptedData:</span>
                          <div className="mt-1 text-slate-500 dark:text-slate-400 break-all">
                            lpjHja5qk1PLTbUxx5qwFj7X82nN4ObF...
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">nameHash:</span>
                          <div className="mt-1 text-slate-500 dark:text-slate-400 break-all">
                            51130e4b037cf06056f26309f5b581f0...
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">urlHash:</span>
                          <div className="mt-1 text-slate-500 dark:text-slate-400 break-all">
                            2b76052fdb98ca755d633dc8b42d30b9...
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">usernameHash:</span>
                          <div className="mt-1 text-slate-500 dark:text-slate-400 break-all">
                            8e2ad8d8ac2387d4906fa8eb3e44ff96...
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">iv:</span>
                          <div className="mt-1 text-slate-500 dark:text-slate-400 break-all">
                            f9f54de4a0cd1d036b7155c85d028334
                          </div>
                        </div>
                      </div>
                    </div>
                  </TrustIndicatorCard>
                </div>

                {/* Developer Guarantee */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="app-surface p-8 max-w-4xl mx-auto">
                    <div className="flex items-center justify-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
                        <Fingerprint className="h-8 w-8 text-white dark:text-slate-900" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                      Developer Guarantee
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                      Even if we wanted to, we <strong>cannot</strong> read your passwords. Your master password never leaves your device, 
                      and without it, your data is mathematically impossible to decrypt.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                          <Lock className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Client-Side Encryption</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          All encryption happens in your browser before data is sent
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                          <Key className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">No Server Keys</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          We never store or have access to your decryption keys
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                          <LazyAlertTriangle className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Breach Protection</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Even if our servers are compromised, your data stays safe
                        </p>
                      </div>
                    </div>
                </div>
                </motion.div>
          </div>
        </div>
      </section>
        </ParallaxSection>
      </Suspense>

      {/* About Section - Optimized lazy loading */}
      <Suspense fallback={<div className="app-section"><div className="container mx-auto px-4"><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section id="about" className="app-section">
        <div className="container mx-auto px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 dark:text-white mb-6 tracking-tight">
                  Why Choose CryptLock?
            </h2>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                  We believe privacy is a fundamental right, not a premium feature.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <TrustIndicatorCard delay={0.1} className="app-surface p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Infinity className="h-8 w-8 text-white dark:text-slate-900" />
              </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Forever Free</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    No hidden costs, no premium tiers, no feature limitations. CryptLock is completely free forever because we believe security should be accessible to everyone.
                  </p>
                </TrustIndicatorCard>

                <TrustIndicatorCard delay={0.2} className="app-surface p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Award className="h-8 w-8 text-white dark:text-slate-900" />
              </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Open Source</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Our code is open for everyone to inspect, audit, and contribute to. Transparency builds trust, and trust is the foundation of security.
                  </p>
                </TrustIndicatorCard>

                <TrustIndicatorCard delay={0.3} className="app-surface p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <TrendingUp className="h-8 w-8 text-white dark:text-slate-900" />
            </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Built for the Future</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Designed with modern security standards and best practices. We&apos;re committed to staying ahead of emerging threats and evolving user needs.
                  </p>
                </TrustIndicatorCard>
          </div>
        </div>
      </section>
        </ParallaxSection>
      </Suspense>

      {/* CTA Section - Optimized lazy loading */}
      <Suspense fallback={<div className="app-section bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden"><div className="container mx-auto px-4"><div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section className="app-section bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white relative overflow-hidden border-t border-slate-200 dark:border-slate-800/60">
            <div className="container mx-auto px-4 text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <h2 className="text-4xl md:text-5xl font-semibold mb-6 tracking-tight text-slate-900 dark:text-white">
            Ready to Secure Your Digital Life?
          </h2>
                <p className="text-xl mb-8 max-w-2xl mx-auto text-slate-600 dark:text-slate-300">
                  Be among the first to experience next-generation password security. Start your journey to better digital protection today.
          </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/auth/register" className="w-auto">
                    <Button size="lg" variant="secondary" className="w-auto text-lg px-8 py-4 bg-blue-600 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-700 dark:hover:bg-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                      <Rocket className="mr-2 h-5 w-5" />
                      Start Free Today
                      <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
                  </Link>
                  <div className="w-auto">
                    <Button size="lg" variant="outline" className="w-auto text-lg px-8 py-4 bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/50 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-300" asChild>
                      <a href="https://github.com/nerdylua/password-manager-web" target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-5 w-5" />
                        View on GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </motion.div>
        </div>
      </section>
        </ParallaxSection>
      </Suspense>

      {/* Footer */}
      <footer className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Company Info */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span className="text-2xl font-bold">CryptLock</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Zero-knowledge password manager built for privacy and security. Forever free, forever secure.
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-900" asChild>
                  <a href="https://x.com/nerdylua" target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-900" asChild>
                  <a href="https://github.com/nerdylua/password-manager-web" target="_blank" rel="noopener noreferrer">
                    <Github className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-900" asChild>
                  <a href="mailto:nihaalsp7@gmail.com">
                    <Mail className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Product */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><Link href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#extension" className="hover:text-slate-900 dark:hover:text-white transition-colors">Extension</Link></li>
                <li><Link href="#privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Proof</Link></li>
                <li><Link href="/auth/register" className="hover:text-slate-900 dark:hover:text-white transition-colors">Get Started</Link></li>
                <li><Link href="/auth/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li>
                  <a 
                    href="https://github.com/nerdylua/password-manager-web/issues" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Report Issues & Get Help
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-300 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-center items-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm text-center">
              © 2025 CryptLock. All rights reserved. Built with ❤️ for privacy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  </TooltipProvider>
);
}
