'use client';

import Link from 'next/link';
import { useState, useCallback, useMemo, memo, lazy, Suspense, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { NavigationMobile } from '@/components/header-mobile';
import { useAuth } from '@/hooks/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { User } from 'firebase/auth';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Eye, 
  Globe, 
  Heart, 
  Layers, 
  Shield, 
  Sparkles, 
  AlertTriangle,
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
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <FloatingCard delay={index * 0.1} className="p-8">
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
        <feature.icon className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{feature.description}</p>
      <ul className="space-y-3">
        {feature.features.map((item: string, idx: number) => (
          <li key={idx} className="flex items-center text-gray-600 dark:text-gray-400">
            <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
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
    <FloatingCard delay={index * 0.1} className="p-8">
      <div className="flex items-start space-x-6">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <feature.icon className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{feature.title}</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{feature.stat}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{feature.statLabel}</div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
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
    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
      <Suspense fallback={<span className="bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block animate-pulse" />}>
        {stat.value === 0 ? (
          // Direct render for zero to ensure it always shows
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            0{stat.suffix}
          </span>
        ) : (
          <AnimatedCounter 
            value={stat.value} 
            suffix={stat.suffix}
            className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          />
        )}
      </Suspense>
    </div>
    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{stat.label}</p>
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
    "hidden md:flex items-center space-x-8",
    isCompact ? "h-16" : "h-20"
  )}>
    <Link href="#features" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
              Features
            </Link>
    <Link href="#privacy" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
      Privacy Proof
    </Link>
    <Link href="#about" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
      About
            </Link>
    
    {user ? (
      <>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Welcome, {userProfile?.displayName || user.email?.split('@')[0]}
        </span>
        <Button 
          onClick={handleDashboardAccess}
          variant="outline"
          size="sm"
          className="border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          {masterPasswordVerified ? 'Dashboard' : 'Sign In'}
        </Button>
        <Button 
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </>
    ) : (
      <>
        <Link href="/auth/login" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
              Sign In
            </Link>
            <Link href="/auth/register">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
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

  // Handle scroll for dynamic header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
    if (masterPasswordVerified) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [masterPasswordVerified, router]);

  const handleVaultAccess = useCallback(() => {
    sessionStorage.setItem('vaultAccessAuthorized', 'true');
    router.push('/vault');
  }, [router]);

  // Memoized data arrays to prevent recreation on each render
  const features = useMemo(() => [
    {
      icon: Key,
      title: "Password Generation",
      description: "Generate cryptographically secure passwords with advanced customization options",
      features: ["Customizable length & complexity", "Real-time strength analysis", "Pronounceable password options"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Lock,
      title: "Zero-Knowledge Architecture",
      description: "Your data is encrypted before it ever leaves your device - true privacy protection",
      features: ["Client-side encryption", "No server access to data", "Complete privacy guarantee"],
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Globe,
      title: "Cross-Platform Sync",
      description: "Access your passwords on all devices with real-time encrypted synchronization",
      features: ["Instant sync across devices", "Offline access capability", "Conflict resolution"],
      color: "from-purple-500 to-violet-500"
    },
    {
      icon: ShieldCheck,
      title: "Security Monitoring",
      description: "Advanced threat detection and breach monitoring to keep you safe",
      features: ["Data breach alerts", "Weak password detection", "Security score tracking"],
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Database,
      title: "Secure Vault",
      description: "Store passwords, notes, cards, and identity information in one secure place",
      features: ["Multiple data types", "Organized categories", "Advanced search"],
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: Share2,
      title: "Secure Sharing",
      description: "Share passwords and notes securely with family and team members",
      features: ["Encrypted sharing", "Access controls", "Audit trails"],
      color: "from-orange-500 to-yellow-500"
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
      icon: Clock,
      title: "End-to-End Protection",
      description: "Data is encrypted on your device before transmission and remains encrypted in our databases.",
      stat: "24/7",
      statLabel: "Protection"
    },
    {
      icon: Layers,
      title: "Multi-Layer Security",
      description: "Multiple security layers including device authentication, secure protocols, and encrypted storage.",
      stat: "5+",
      statLabel: "Security Layers"
    }
  ], []);

  const stats = useMemo(() => [
    { value: 2025, suffix: "", label: "Year Built" },
    { value: 99, suffix: ".9%", label: "Target Uptime" },
    { value: 256, suffix: "-bit", label: "Encryption" },
    { value: 0, suffix: " ", label: "Known Vulnerabilities" }
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 overscroll-none">
      {/* Optimized Animated Background Elements - reduced complexity */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          style={{ y: y1 }}
          className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"
        />
        <motion.div 
          style={{ y: y2 }}
          className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-pink-400/10 to-orange-400/10 rounded-full blur-3xl"
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
            "bg-white/80 dark:bg-slate-900/80 border backdrop-blur-xl transition-all duration-300",
            isScrolled
              ? "mx-4 md:mx-auto shadow-xl border-gray-200/50 dark:border-gray-700/50" 
              : "shadow-sm border-gray-200 dark:border-gray-800"
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
                    "text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors",
                    isScrolled ? "h-7 w-7" : "h-8 w-8"
                  )} />
                </motion.div>
                <motion.span 
                  className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent"
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
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 px-6 py-2 text-sm font-medium">
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
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
              Your Digital Life,{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Completely Secure
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-4xl mx-auto leading-relaxed">
              The world&apos;s most secure password manager with{' '}
              <strong className="text-blue-600 dark:text-blue-400">zero-knowledge architecture</strong>.
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
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl text-lg px-8 py-4 group"
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
                    className="w-full sm:w-auto border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 text-lg px-8 py-4"
                  >
                    <Lock className="mr-2 h-5 w-5" />
                    Access Vault
                  </Button>
                )}
              </>
            ) : (
              <>
            <Link href="/auth/register">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl text-lg px-8 py-4 group">
                    <Rocket className="mr-2 h-5 w-5" />
                Start Free Today
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/auth/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 text-lg px-8 py-4">
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
            <TrustIndicatorCard delay={0.1} className="p-6">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center mb-3">
                  <Eye className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Zero-Knowledge</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">We never see your data</p>
              </div>
            </TrustIndicatorCard>

            <TrustIndicatorCard delay={0.2} className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center mb-3">
                  <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">AES-256 Encryption</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Military-grade security</p>
            </div>
            </TrustIndicatorCard>

            <TrustIndicatorCard delay={0.3} className="p-6">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 flex items-center justify-center mb-3">
                  <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Cross-Platform</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Access everywhere</p>
              </div>
            </TrustIndicatorCard>

            <TrustIndicatorCard delay={0.4} className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/50 dark:to-pink-800/50 flex items-center justify-center mb-3">
                  <Heart className="h-8 w-8 text-pink-600 dark:text-pink-400" />
            </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">100% Free</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Forever & always</p>
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
            className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400"
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
      <Suspense fallback={<div className="py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm"><div className="container mx-auto px-4"><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section id="features" className="py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="container mx-auto px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                  Complete Password Security Solution
            </h2>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
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
                  <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 px-6 py-2 text-sm font-medium">
                    <Shield className="h-4 w-4 mr-2" />
                    Bank-Level Security Architecture
                  </Badge>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Military-Grade Protection
                </h3>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12">
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

      {/* Proof of Privacy Section */}
      <Suspense fallback={<div className="py-20 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20"><div className="container mx-auto px-4"><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section id="privacy" className="py-20 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <div className="container mx-auto px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
                className="text-center mb-16"
              >
                <div className="inline-flex items-center justify-center mb-6">
                  <Badge variant="secondary" className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 px-6 py-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Proof of Privacy
                  </Badge>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                  See What We Actually Store
                </h2>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                  This is what your data looks like in our database. Even our developers can't read it.
                </p>
              </motion.div>

              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                  {/* What You See */}
                  <TrustIndicatorCard delay={0.1} className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mr-4">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">What You See</h3>
                        <p className="text-green-600 dark:text-green-400 text-sm">Decrypted on your device</p>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
                      <div className="space-y-4 font-mono text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Name:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">My Bank Account</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Username:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">john.doe@email.com</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Password:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">SuperSecure123!</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">URL:</span>
                          <span className="ml-2 text-blue-600 dark:text-blue-400">https://mybank.com</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">Account #12345</span>
                        </div>
                      </div>
                </div>
                  </TrustIndicatorCard>

                  {/* What We See */}
                  <TrustIndicatorCard delay={0.2} className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mr-4">
                        <Database className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">What We See</h3>
                        <p className="text-red-600 dark:text-red-400 text-sm">Encrypted in our database</p>
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-700">
                      <div className="space-y-4 font-mono text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">encryptedData:</span>
                          <div className="mt-1 text-red-600 dark:text-red-400 break-all">
                            lpjHja5qk1PLTbUxx5qwFj7X82nN4ObF...
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">nameHash:</span>
                          <div className="mt-1 text-red-600 dark:text-red-400 break-all">
                            51130e4b037cf06056f26309f5b581f0...
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">urlHash:</span>
                          <div className="mt-1 text-red-600 dark:text-red-400 break-all">
                            2b76052fdb98ca755d633dc8b42d30b9...
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">usernameHash:</span>
                          <div className="mt-1 text-red-600 dark:text-red-400 break-all">
                            8e2ad8d8ac2387d4906fa8eb3e44ff96...
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">iv:</span>
                          <div className="mt-1 text-red-600 dark:text-red-400 break-all">
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
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-700 max-w-4xl mx-auto">
                    <div className="flex items-center justify-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Fingerprint className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Developer Guarantee
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                      Even if we wanted to, we <strong>cannot</strong> read your passwords. Your master password never leaves your device, 
                      and without it, your data is mathematically impossible to decrypt.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto mb-3">
                          <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Client-Side Encryption</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          All encryption happens in your browser before data is sent
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-3">
                          <Key className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No Server Keys</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          We never store or have access to your decryption keys
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Breach Protection</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
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
      <Suspense fallback={<div className="py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm"><div className="container mx-auto px-4"><div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section id="about" className="py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="container mx-auto px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                  Why Choose CryptLock?
            </h2>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                  We believe privacy is a fundamental right, not a premium feature.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <TrustIndicatorCard delay={0.1} className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Infinity className="h-8 w-8 text-white" />
              </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Forever Free</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No hidden costs, no premium tiers, no feature limitations. CryptLock is completely free forever because we believe security should be accessible to everyone.
                  </p>
                </TrustIndicatorCard>

                <TrustIndicatorCard delay={0.2} className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Award className="h-8 w-8 text-white" />
              </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Open Source</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Our code is open for everyone to inspect, audit, and contribute to. Transparency builds trust, and trust is the foundation of security.
                  </p>
                </TrustIndicatorCard>

                <TrustIndicatorCard delay={0.3} className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <TrendingUp className="h-8 w-8 text-white" />
            </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Built for the Future</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Designed with modern security standards and best practices. We&apos;re committed to staying ahead of emerging threats and evolving user needs.
                  </p>
                </TrustIndicatorCard>
          </div>
        </div>
      </section>
        </ParallaxSection>
      </Suspense>

      {/* CTA Section - Optimized lazy loading */}
      <Suspense fallback={<div className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden"><div className="container mx-auto px-4"><div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div></div>}>
        <ParallaxSection>
          <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20" />
            <div className="container mx-auto px-4 text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Secure Your Digital Life?
          </h2>
                <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                  Be among the first to experience next-generation password security. Start your journey to better digital protection today.
          </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth/register">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                      <Rocket className="mr-2 h-5 w-5" />
                      Start Free Today
                      <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300" asChild>
                    <a href="https://github.com/nerdylua/password-manager-web" target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 h-5 w-5" />
                      View on GitHub
                    </a>
                  </Button>
                </div>
              </motion.div>
        </div>
      </section>
        </ParallaxSection>
      </Suspense>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Company Info */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Lock className="h-8 w-8 text-blue-400" />
                <span className="text-2xl font-bold">CryptLock</span>
              </div>
              <p className="text-gray-400 mb-4">
                Zero-knowledge password manager built for privacy and security. Forever free, forever secure.
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-800" asChild>
                  <a href="https://x.com/nerdylua" target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-800" asChild>
                  <a href="https://github.com/nerdylua/password-manager-web" target="_blank" rel="noopener noreferrer">
                    <Github className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-800" asChild>
                  <a href="mailto:nihaalsp7@gmail.com">
                    <Mail className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Product */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#privacy" className="hover:text-white transition-colors">Privacy Proof</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a 
                    href="https://github.com/nerdylua/password-manager-web/issues" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Report Issues & Get Help
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-center items-center">
            <p className="text-gray-400 text-sm text-center">
              © 2025 CryptLock. All rights reserved. Built with ❤️ for privacy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
