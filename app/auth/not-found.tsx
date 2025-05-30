'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, LogIn, UserPlus, Home, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-lg mx-auto text-center">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-16 w-16 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CryptLock</h1>
        </motion.div>

        {/* 404 Message */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            404
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The authentication page you're looking for doesn't exist. 
            Choose from the options below to access your account.
          </p>
        </motion.div>

        {/* Auth Options */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-4 mb-8"
        >
          <Link href="/auth/login" className="block">
            <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <LogIn className="mr-2 h-5 w-5" />
              Sign In to Your Account
            </Button>
          </Link>
          
          <Link href="/auth/register" className="block">
            <Button variant="outline" size="lg" className="w-full border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300">
              <UserPlus className="mr-2 h-5 w-5" />
              Create New Account
            </Button>
          </Link>
        </motion.div>

        {/* Additional Options */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-sm text-gray-500 dark:text-gray-400 space-y-3"
        >
          <div className="flex items-center justify-center space-x-6">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center">
              <Home className="mr-1 h-4 w-4" />
              Home
            </Link>
            <Link href="/#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Features
            </Link>
            <Link href="/#security" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Security
            </Link>
          </div>
        </motion.div>

        {/* Security Reminder */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
        >
          <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Remember: Always verify the URL when accessing authentication pages to protect against phishing attacks.
          </p>
        </motion.div>
      </div>
    </div>
  );
} 