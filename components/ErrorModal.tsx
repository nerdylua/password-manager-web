'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Bug, 
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  error?: unknown;
  canRetry?: boolean;
  onRetry?: () => void;
  showErrorDetails?: boolean;
}

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  title = "Something went wrong",
  message,
  error,
  canRetry = false,
  onRetry,
  showErrorDetails = true
}: ErrorModalProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  // Extract error details for technical display
  const getErrorDetails = () => {
    if (!error) return null;
    
    let details: Record<string, unknown> = {};
    
    if (error && typeof error === 'object') {
      if ('code' in error) details.code = (error as { code: unknown }).code;
      if ('message' in error) details.message = (error as { message: unknown }).message;
      if ('stack' in error) details.stack = (error as { stack: unknown }).stack;
    }
    
    if (error instanceof Error) {
      details = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    return Object.keys(details).length > 0 ? details : error;
  };

  const copyErrorDetails = () => {
    const details = getErrorDetails();
    if (details) {
      const errorText = JSON.stringify(details, null, 2);
      navigator.clipboard.writeText(errorText);
      toast.success('Error details copied to clipboard');
    }
  };

  const errorDetails = getErrorDetails();

  // Categorize error types for better user guidance
  const getErrorCategory = () => {
    if (!error || typeof error !== 'object') return 'unknown';
    
    const errorObj = error as Record<string, unknown>;
    
    if (
      (typeof errorObj.code === 'string' && (errorObj.code.includes('network'))) || 
      (typeof errorObj.message === 'string' && errorObj.message.includes('network'))
    ) {
      return 'network';
    }
    if (
      (typeof errorObj.code === 'string' && (errorObj.code.includes('permission') || errorObj.code.includes('auth')))
    ) {
      return 'permission';
    }
    if (
      (typeof errorObj.code === 'string' && (errorObj.code.includes('unavailable') || errorObj.code.includes('deadline')))
    ) {
      return 'service';
    }
    if (
      (typeof errorObj.code === 'string' && (errorObj.code.includes('quota') || errorObj.code.includes('resource-exhausted')))
    ) {
      return 'quota';
    }
    
    return 'unknown';
  };

  const getSuggestions = () => {
    const category = getErrorCategory();
    
    switch (category) {
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable VPN or proxy if using one',
          'Try again in a few moments'
        ];
      case 'permission':
        return [
          'Sign out and sign back in',
          'Clear browser cache and cookies',
          'Check if your account has been suspended',
          'Contact support if the issue persists'
        ];
      case 'service':
        return [
          'CryptLock services may be temporarily down',
          'Try again in a few minutes',
          'Check our status page for updates',
          'Contact support if the issue continues'
        ];
      case 'quota':
        return [
          'You may have exceeded usage limits',
          'Try again later',
          'Contact support for assistance',
          'Consider reducing the size of your request'
        ];
      default:
        return [
          'Try refreshing the page',
          'Clear browser cache',
          'Try again in a few moments',
          'Contact support if the issue persists'
        ];
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Main error message */}
            <Alert variant="destructive" className="border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {message}
              </AlertDescription>
            </Alert>

            {/* Suggestions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium text-blue-800 dark:text-blue-200">
                  What you can try:
                </h3>
              </div>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                {getSuggestions().map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Error details section */}
            {showErrorDetails && errorDetails && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <Button
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full justify-between p-3 text-left font-medium"
                >
                  Technical Details
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                
                {showDetails && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs font-mono space-y-2">
                      <pre className="whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">
                        {JSON.stringify(errorDetails, null, 2)}
                      </pre>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyErrorDetails}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://github.com/nerdylua/password-manager-web/issues', '_blank')}
                        className="text-xs"
                      >
                        <Bug className="w-3 h-3 mr-1" />
                        Report Bug
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {canRetry && onRetry && (
              <Button
                onClick={() => {
                  onRetry();
                  onClose();
                }}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className={canRetry ? "flex-1" : "w-full"}
            >
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 