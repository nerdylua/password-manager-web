'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { ParallaxSection } from '@/components/parallax-section';
import { AnimatedCounter } from '@/components/animated-counter';
import { FloatingCard } from '@/components/floating-card';
import { useAuth } from '@/hooks/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Eye, 
  Globe, 
  Heart, 
  Layers, 
  Menu, 
  Moon, 
  Share2, 
  Shield, 
  Sparkles, 
  Sun, 
  X, 
  ChevronRight,
  AlertTriangle,
  Lock,
  Home,
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
  Folder
} from 'lucide-react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  const { user, userProfile, logout, masterPasswordVerified } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  };

  const handleDashboardAccess = () => {
    if (masterPasswordVerified) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  };

  const features = [
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
  ];

  const securityFeatures = [
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
  ];

  const stats = [
    { value: 2025, suffix: "", label: "Year Built" },
    { value: 99, suffix: ".9%", label: "Target Uptime" },
    { value: 256, suffix: "-bit", label: "Encryption" },
    { value: 0, suffix: " ", label: "Known Vulnerabilities" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 overscroll-none">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          style={{ y: y1 }}
          className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        />
        <motion.div 
          style={{ y: y2 }}
          className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-orange-400/20 rounded-full blur-3xl"
        />
        <motion.div 
          style={{ y: y1 }}
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-r from-green-400/20 to-cyan-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
                <motion.div 
                  className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                CryptLock
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
                Features
              </Link>
              <Link href="#security" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
              Security
            </Link>
              <Link href="#about" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
                About
              </Link>
              
              {user ? (
                // Authenticated user navigation
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
                // Non-authenticated user navigation
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

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pb-4 border-t pt-4"
            >
              <nav className="flex flex-col space-y-4">
                <Link href="#features" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
                  Features
                </Link>
                <Link href="#security" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
                  Security
                </Link>
                <Link href="#about" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
                  About
                </Link>
                
                {user ? (
                  // Authenticated user mobile navigation
                  <>
                    <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t">
                      Welcome, {userProfile?.displayName || user.email?.split('@')[0]}
                    </div>
                    <Button 
                      onClick={handleDashboardAccess}
                      variant="outline"
                      className="w-full justify-start border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      {masterPasswordVerified ? 'Dashboard' : 'Sign In'}
                    </Button>
                    <Button 
                      onClick={handleLogout}
                      variant="ghost"
                      className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  // Non-authenticated user mobile navigation
                  <>
                    <Link href="/auth/login" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium">
                      Sign In
                    </Link>
                    <Link href="/auth/register" className="w-fit">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                        Get Started Free
                      </Button>
            </Link>
                  </>
                )}
          </nav>
            </motion.div>
          )}
        </div>
      </header>

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
              // Authenticated user CTAs
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
                    onClick={() => {
                      sessionStorage.setItem('vaultAccessAuthorized', 'true');
                      router.push('/vault');
                    }}
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
              // Non-authenticated user CTAs
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
            <FloatingCard delay={0.1} className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center mb-3">
                  <Eye className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Zero-Knowledge</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">We never see your data</p>
          </div>
            </FloatingCard>

            <FloatingCard delay={0.2} className="p-6">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center mb-3">
                  <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">AES-256 Encryption</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Military-grade security</p>
              </div>
            </FloatingCard>

            <FloatingCard delay={0.3} className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 flex items-center justify-center mb-3">
                  <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">Cross-Platform</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Access everywhere</p>
            </div>
            </FloatingCard>

            <FloatingCard delay={0.4} className="p-6">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/50 dark:to-pink-800/50 flex items-center justify-center mb-3">
                  <Heart className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">100% Free</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Forever & always</p>
              </div>
            </FloatingCard>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  <AnimatedCounter 
                    value={stat.value} 
                    suffix={stat.suffix}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  />
            </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Launch Announcement */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold">Coming Soon</span>
              <span>•</span>
              <span>Built with modern security standards</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <ParallaxSection>
        <section id="features" className="py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need for Password Security
            </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Comprehensive features designed to keep your digital life secure and organized with enterprise-grade protection.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FloatingCard key={index} delay={index * 0.1} className="p-8">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{feature.description}</p>
                  <ul className="space-y-3">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center text-gray-600 dark:text-gray-400">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </FloatingCard>
              ))}
            </div>
          </div>
        </section>
      </ParallaxSection>

      {/* Security Section */}
      <ParallaxSection>
        <section id="security" className="py-20 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Bank-Level Security Architecture
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Built with privacy-first principles and zero-knowledge architecture. Your data is encrypted before it ever leaves your device.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {securityFeatures.map((feature, index) => (
                <FloatingCard key={index} delay={index * 0.1} className="p-8">
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
              ))}
                </div>

            {/* Security Warning */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <FloatingCard className="p-8 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50/80 to-yellow-50/80 dark:from-red-900/20 dark:to-yellow-900/20">
                <div className="flex items-start space-x-4">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-3">
                      ⚠️ CRITICAL: Master Password Recovery
                    </h3>
                    <div className="text-red-800 dark:text-red-300 space-y-3">
                      <p className="font-semibold">
                        Due to our zero-knowledge architecture, <strong>your master password cannot be recovered</strong> if forgotten.
                      </p>
                      <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg border border-red-300 dark:border-red-700">
                        <h4 className="font-bold mb-2">What this means:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li><strong>Forget your master password = Lose ALL your data permanently</strong></li>
                          <li>We cannot reset, recover, or bypass your master password</li>
                          <li>No customer support can help you access your data</li>
                          <li>Your encrypted vault becomes permanently inaccessible</li>
                </ul>
                </div>
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-300 dark:border-yellow-700">
                        <h4 className="font-bold mb-2 text-yellow-800 dark:text-yellow-200">Protect yourself:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                          <li>Choose a master password you'll remember forever</li>
                          <li>Write it down and store it in a safe place</li>
                          <li>Share it with a trusted family member</li>
                          <li>Use our password hint feature</li>
                          <li>Practice typing it regularly</li>
                </ul>
                </div>
                      <p className="text-sm font-medium">
                        This limitation exists because true zero-knowledge security means even we cannot see your data.
                      </p>
                </div>
                </div>
                </div>
              </FloatingCard>
            </motion.div>
        </div>
      </section>
      </ParallaxSection>

      {/* About Section */}
      <ParallaxSection>
        <section id="about" className="py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose CryptLock?
            </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Built by security experts who believe privacy is a fundamental right, not a premium feature.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FloatingCard delay={0.1} className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Infinity className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Forever Free</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No hidden costs, no premium tiers, no feature limitations. CryptLock is completely free forever because we believe security should be accessible to everyone.
                </p>
              </FloatingCard>

              <FloatingCard delay={0.2} className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Award className="h-8 w-8 text-white" />
              </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Open Source</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Our code is open for everyone to inspect, audit, and contribute to. Transparency builds trust, and trust is the foundation of security.
                </p>
              </FloatingCard>

              <FloatingCard delay={0.3} className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <TrendingUp className="h-8 w-8 text-white" />
              </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Built for the Future</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Designed with modern security standards and best practices. We&apos;re committed to staying ahead of emerging threats and evolving user needs.
                </p>
              </FloatingCard>
          </div>
        </div>
      </section>
      </ParallaxSection>

      {/* CTA Section */}
      <ParallaxSection>
        <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
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
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300">
                  <Github className="mr-2 h-5 w-5" />
                  View on GitHub
                </Button>
              </div>
            </motion.div>
        </div>
      </section>
      </ParallaxSection>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="h-8 w-8 text-blue-400" />
                <span className="text-2xl font-bold">CryptLock</span>
              </div>
              <p className="text-gray-400 mb-4">
                Zero-knowledge password manager built for privacy and security. Forever free, forever secure.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-800">
                  <Twitter className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-800">
                  <Github className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-800">
                  <Mail className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#security" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security Guide</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Best Practices</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Bug Reports</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Feature Requests</Link></li>
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
