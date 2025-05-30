'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Shield, 
  Lock, 
  Key, 
  FileX, 
  UserX, 
  CheckCircle,
  BookOpen,
  Lightbulb
} from 'lucide-react';

interface MasterPasswordEducationProps {
  onContinue: () => void;
  onCancel: () => void;
}

export function MasterPasswordEducation({ onContinue, onCancel }: MasterPasswordEducationProps) {
  const [hasReadAll, setHasReadAll] = useState(false);
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);

  const handleContinue = () => {
    if (hasReadAll && acknowledgedRisk) {
      onContinue();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-900 dark:text-red-200">
            Before You Create Your Account
          </CardTitle>
          <CardDescription className="text-lg">
            Understanding Master Password Security in Zero-Knowledge Systems
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Critical Warning */}
          <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="text-base">
              <strong className="text-lg">⚠️ CRITICAL WARNING</strong>
              <br />
              If you forget your master password, you will <strong>permanently lose ALL your data</strong>. 
              There is no recovery, reset, or bypass option.
            </AlertDescription>
          </Alert>

          {/* What Zero-Knowledge Means */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              What is Zero-Knowledge Encryption?
            </h3>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  Your data is encrypted on your device before being stored
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  Only you have the key (your master password) to decrypt it
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  CryptLock servers never see your unencrypted data
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  Even if our servers are hacked, your data remains secure
                </li>
              </ul>
            </div>
          </div>

          {/* The Trade-off */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <Key className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
              The Security Trade-off
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-bold text-green-800 dark:text-green-200 mb-2">✅ Maximum Security</h4>
                <ul className="text-xs space-y-1 text-green-700 dark:text-green-300">
                  <li>• Unhackable by design</li>
                  <li>• Government-proof</li>
                  <li>• Company cannot access your data</li>
                  <li>• True privacy protection</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-bold text-red-800 dark:text-red-200 mb-2">❌ No Password Recovery</h4>
                <ul className="text-xs space-y-1 text-red-700 dark:text-red-300">
                  <li>• Cannot reset forgotten passwords</li>
                  <li>• No customer support recovery</li>
                  <li>• No security questions</li>
                  <li>• No email recovery links</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Scenarios */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <FileX className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
              What Happens If You Forget?
            </h3>
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="space-y-3">
                <div className="flex items-start">
                  <UserX className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-800 dark:text-red-200">Complete Data Loss</p>
                    <p className="text-sm text-red-700 dark:text-red-300">All passwords, notes, and data become permanently inaccessible</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Lock className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-800 dark:text-red-200">No Technical Solution</p>
                    <p className="text-sm text-red-700 dark:text-red-300">Even our developers cannot help you recover your data</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-800 dark:text-red-200">Start Over</p>
                    <p className="text-sm text-red-700 dark:text-red-300">You would need to create a new account and re-enter all data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
              Protect Your Master Password
            </h3>
            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <li>📝 <strong>Write it down</strong> and store in a safe, secure location</li>
                <li>👨‍👩‍👧‍👦 <strong>Share with trusted family</strong> in case of emergency</li>
                <li>🎯 <strong>Use our hint feature</strong> during registration</li>
                <li>🧠 <strong>Choose something memorable</strong> but unique to you</li>
                <li>💪 <strong>Practice typing it</strong> regularly so it becomes muscle memory</li>
                <li>📱 <strong>Consider a passphrase</strong> - easier to remember than random characters</li>
              </ul>
            </div>
          </div>

          {/* Confirmation Checkboxes */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="read-all"
                checked={hasReadAll}
                onChange={(e) => setHasReadAll(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="read-all" className="text-sm font-medium">
                I have read and understood how zero-knowledge encryption works
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="acknowledge-risk"
                checked={acknowledgedRisk}
                onChange={(e) => setAcknowledgedRisk(e.target.checked)}
                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="acknowledge-risk" className="text-sm font-medium text-red-800 dark:text-red-200">
                <strong>I acknowledge that forgetting my master password means permanent data loss</strong>
              </label>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button 
            onClick={handleContinue}
            className="w-full" 
            disabled={!hasReadAll || !acknowledgedRisk}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            I Understand - Continue to Registration
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full"
          >
            I Need to Think About This
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 