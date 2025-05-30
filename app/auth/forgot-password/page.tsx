'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Shield, 
  Key, 
  Lock,
  HelpCircle,
  Lightbulb,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Master Password Recovery
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Important information about password recovery
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Important Information */}
            <Alert className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <div className="font-semibold mb-2">⚠️ MASTER PASSWORD CANNOT BE RECOVERED</div>
                <p className="text-sm">
                  Due to our zero-knowledge architecture, your master password cannot be reset, recovered, or bypassed by anyone - including our support team.
                </p>
              </AlertDescription>
            </Alert>

            {/* Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-start space-x-3">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Why Can't We Help?
                  </h3>
                  <div className="text-blue-700 dark:text-blue-300 text-sm space-y-2">
                    <p>• Your master password never leaves your device</p>
                    <p>• All data is encrypted locally before transmission</p>
                    <p>• We only store encrypted data that we cannot decrypt</p>
                    <p>• This ensures complete privacy but prevents password recovery</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What This Means */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-start space-x-3">
                <Key className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    What This Means for You
                  </h3>
                  <div className="text-yellow-700 dark:text-yellow-300 text-sm space-y-2">
                    <p>• <strong>Forgotten password = Permanent data loss</strong></p>
                    <p>• No recovery emails, security questions, or backup codes</p>
                    <p>• Customer support cannot access or restore your data</p>
                    <p>• You would need to create a completely new account</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Aids */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-start space-x-3">
                <Lightbulb className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                    Try These Memory Aids
                  </h3>
                  <div className="text-green-700 dark:text-green-300 text-sm space-y-2">
                    <p>• Think about when you created your account</p>
                    <p>• Remember the pattern or phrase you used</p>
                    <p>• Check if you wrote it down somewhere safe</p>
                    <p>• Consider variations of passwords you commonly use</p>
                    <p>• Try passwords you might have shared with trusted family</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="border rounded-lg p-4">
              <Button
                variant="ghost"
                onClick={() => setShowHelp(!showHelp)}
                className="w-full justify-between"
              >
                <div className="flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Need More Help?
                </div>
                <span>{showHelp ? '−' : '+'}</span>
              </Button>
              
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400"
                >
                  <div>
                    <h4 className="font-semibold mb-1">Password Variations to Try:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Different capitalization patterns</li>
                      <li>Numbers at the beginning vs. end</li>
                      <li>Special characters you commonly use</li>
                      <li>Spaces instead of underscores or dashes</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">Account Recovery Options:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Create a new account (losing all current data)</li>
                      <li>Wait and try again later with fresh memory</li>
                      <li>Check with family members you might have shared it with</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/auth/login" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
              
              <Link href="/auth/register" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Create New Account
                </Button>
              </Link>
            </div>

            {/* Footer Message */}
            <div className="text-center pt-4 border-t">
              <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400 text-sm">
                <Heart className="w-4 h-4 text-red-500" />
                <span>This limitation exists because we truly protect your privacy</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 