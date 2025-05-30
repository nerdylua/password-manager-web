'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Menu, X } from 'lucide-react';

interface NavigationProps {
  showAuthButtons?: boolean;
  currentPath?: string;
}

export function Navigation({ showAuthButtons = true, currentPath: _currentPath = '' }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#security', label: 'Security' },
    { href: '#pricing', label: 'Pricing' },
  ];

  return (
    <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Lock className="h-8 w-8 text-cryptlock-accent group-hover:text-cryptlock-primary transition-colors" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-cryptlock-accent rounded-full animate-pulse"></div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-cryptlock-primary to-cryptlock-accent bg-clip-text text-transparent">
              CryptLock
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-cryptlock-primary dark:text-gray-400 dark:hover:text-cryptlock-accent transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            {showAuthButtons && (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-cryptlock-primary dark:text-gray-400 dark:hover:text-cryptlock-accent transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link href="/auth/register">
                  <Button className="bg-cryptlock-accent hover:bg-cryptlock-primary transition-all duration-300 shadow-lg hover:shadow-xl">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 hover:text-cryptlock-primary dark:text-gray-400 dark:hover:text-cryptlock-accent transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {showAuthButtons && (
                <>
                  <Link
                    href="/auth/login"
                    className="text-gray-600 hover:text-cryptlock-primary dark:text-gray-400 dark:hover:text-cryptlock-accent transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link href="/auth/register" className="w-fit">
                    <Button className="w-full bg-cryptlock-accent hover:bg-cryptlock-primary transition-all duration-300">
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
} 