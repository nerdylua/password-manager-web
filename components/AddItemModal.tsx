'use client';

import React, { useState, useEffect } from 'react';
import { VaultItem } from '@/lib/encryption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Key, 
  StickyNote, 
  CreditCard, 
  User, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Copy, 
  Star,
  Check,
  Shield,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<VaultItem>) => Promise<void>;
  editingItem?: VaultItem | null;
}

interface PasswordGeneratorSettings {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
}

const defaultPasswordSettings: PasswordGeneratorSettings = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeSimilar: true
};

export default function AddItemModal({ isOpen, onClose, onSave, editingItem }: AddItemModalProps) {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState<Partial<VaultItem>>({
    name: '',
    category: 'login',
    username: '',
    password: '',
    url: '',
    notes: '',
    favorite: false,
    tags: [],
    // Card fields
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    // Identity fields
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSettings, setPasswordSettings] = useState<PasswordGeneratorSettings>(defaultPasswordSettings);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData(editingItem);
        setActiveTab(editingItem.category);
      } else {
        setFormData({
          name: '',
          category: 'login',
          username: '',
          password: '',
          url: '',
          notes: '',
          favorite: false,
          tags: [],
          // Card fields
          cardholderName: '',
          cardNumber: '',
          expiryDate: '',
          cvv: '',
          // Identity fields
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          address: ''
        });
        setActiveTab('login');
      }
      setShowPassword(false);
      setGeneratedPassword('');
    }
  }, [isOpen, editingItem]);

  // Update category when tab changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, category: activeTab as VaultItem['category'] }));
  }, [activeTab]);

  // Generate password (optimized for performance)
  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const similar = 'il1Lo0O';

    let charset = '';
    if (passwordSettings.includeUppercase) charset += uppercase;
    if (passwordSettings.includeLowercase) charset += lowercase;
    if (passwordSettings.includeNumbers) charset += numbers;
    if (passwordSettings.includeSymbols) charset += symbols;

    if (passwordSettings.excludeSimilar) {
      charset = charset.split('').filter(char => !similar.includes(char)).join('');
    }

    if (charset === '') {
      toast.error('Please select at least one character type');
      return;
    }

    // Use crypto.getRandomValues for better performance and security
    const array = new Uint8Array(passwordSettings.length);
    crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < passwordSettings.length; i++) {
      password += charset.charAt(array[i] % charset.length);
    }

    setGeneratedPassword(password);
    analyzePasswordStrength(password);
    toast.success('Password generated successfully');
  };

  // Analyze password strength (optimized)
  const analyzePasswordStrength = (password: string) => {
    let score = 0;
    const feedback = [];

    // Length checks
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');
    if (password.length >= 12) score += 1;

    // Character type checks (optimized regex)
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Include symbols');

    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthLevel = strengthLevels[Math.min(score, 5)];

    setPasswordStrength({
      score,
      feedback: feedback.length > 0 ? feedback.join(', ') : `${strengthLevel} password`
    });
  };

  // Use generated password
  const useGeneratedPassword = () => {
    if (generatedPassword) {
      setFormData(prev => ({ ...prev, password: generatedPassword }));
      setGeneratedPassword('');
      toast.success('Password applied');
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }

    // Set loading state at the start of submission
    setSaving(true);

    try {
      const now = Date.now();
      await onSave({
        ...formData,
        category: activeTab as VaultItem['category'],
        id: editingItem?.id || `${now}-${Math.random().toString(36).substr(2, 9)}`,
        created: editingItem?.created || now,
        lastModified: now
      });
      
      onClose();
      // Toast notification is handled in the parent component
    } catch (error) {
      // Error toast is handled in the parent component
      console.error('Failed to save item:', error);
    } finally {
      // Always reset loading state
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof VaultItem, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Analyze password strength when password changes
    if (field === 'password' && value) {
      analyzePasswordStrength(value as string);
    }
  };

  const renderPasswordGenerator = () => (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Zap className="w-4 h-4 mr-2" />
          Password Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Length: {passwordSettings.length}</Label>
          </div>
          <Slider
            value={[passwordSettings.length]}
            onValueChange={([value]: number[]) => setPasswordSettings(prev => ({ ...prev, length: value }))}
            min={8}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={passwordSettings.includeUppercase}
              onCheckedChange={(checked: boolean) => setPasswordSettings(prev => ({ ...prev, includeUppercase: checked }))}
            />
            <Label className="text-sm">A-Z</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={passwordSettings.includeLowercase}
              onCheckedChange={(checked: boolean) => setPasswordSettings(prev => ({ ...prev, includeLowercase: checked }))}
            />
            <Label className="text-sm">a-z</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={passwordSettings.includeNumbers}
              onCheckedChange={(checked: boolean) => setPasswordSettings(prev => ({ ...prev, includeNumbers: checked }))}
            />
            <Label className="text-sm">0-9</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={passwordSettings.includeSymbols}
              onCheckedChange={(checked: boolean) => setPasswordSettings(prev => ({ ...prev, includeSymbols: checked }))}
            />
            <Label className="text-sm">!@#</Label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={passwordSettings.excludeSimilar}
            onCheckedChange={(checked: boolean) => setPasswordSettings(prev => ({ ...prev, excludeSimilar: checked }))}
          />
          <Label className="text-sm">Exclude similar characters (i, l, 1, L, o, 0, O)</Label>
        </div>

        <Button 
          type="button"
          onClick={generatePassword} 
          className="w-full" 
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Password
        </Button>

        {generatedPassword && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded flex-1 break-all">
                {generatedPassword}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(generatedPassword, 'Generated password')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button onClick={useGeneratedPassword} size="sm" className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Use This Password
              </Button>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                passwordStrength.score <= 2 ? 'bg-red-500' :
                passwordStrength.score <= 4 ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <span className="text-gray-600 dark:text-gray-400">{passwordStrength.feedback}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          <DialogDescription>
            {editingItem ? 'Update your vault item details' : 'Add a new item to your secure vault'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="secure-note" className="flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Note
              </TabsTrigger>
              <TabsTrigger value="credit-card" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="identity" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Identity
              </TabsTrigger>
            </TabsList>

            <div className="mt-8">
              <TabsContent value="login" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Gmail Account"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username/Email</Label>
                    <Input
                      id="username"
                      placeholder="your@email.com"
                      value={formData.username || ''}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={formData.password || ''}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {formData.password && (
                      <div className="mt-2 flex items-center space-x-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${
                          passwordStrength.score <= 2 ? 'bg-red-500' :
                          passwordStrength.score <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <span className="text-gray-600 dark:text-gray-400">{passwordStrength.feedback}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">Website URL</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={formData.url || ''}
                      onChange={(e) => handleInputChange('url', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes..."
                      value={formData.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={formData.favorite || false}
                      onCheckedChange={(checked: boolean) => handleInputChange('favorite', checked)}
                    />
                    <Label className="flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Mark as favorite
                    </Label>
                  </div>
                </div>

                {renderPasswordGenerator()}
              </TabsContent>

              <TabsContent value="secure-note" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-name">Name *</Label>
                    <Input
                      id="note-name"
                      placeholder="e.g., Important Passwords"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note-content">Note Content</Label>
                    <Textarea
                      id="note-content"
                      placeholder="Your secure note content..."
                      value={formData.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={8}
                      className="min-h-[200px]"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={formData.favorite || false}
                      onCheckedChange={(checked: boolean) => handleInputChange('favorite', checked)}
                    />
                    <Label className="flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Mark as favorite
                    </Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="credit-card" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-name">Card Name *</Label>
                    <Input
                      id="card-name"
                      placeholder="e.g., Personal Visa Card"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardholder">Cardholder Name</Label>
                    <Input
                      id="cardholder"
                      placeholder="John Doe"
                      value={formData.cardholderName || ''}
                      onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      value={formData.cardNumber || ''}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={formData.expiryDate || ''}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={formData.cvv || ''}
                        onChange={(e) => handleInputChange('cvv', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card-notes">Notes</Label>
                    <Textarea
                      id="card-notes"
                      placeholder="Additional card information..."
                      value={formData.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={formData.favorite || false}
                      onCheckedChange={(checked: boolean) => handleInputChange('favorite', checked)}
                    />
                    <Label className="flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Mark as favorite
                    </Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="identity" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identity-name">Identity Name *</Label>
                    <Input
                      id="identity-name"
                      placeholder="e.g., Personal Identity"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input
                        id="first-name"
                        placeholder="John"
                        value={formData.firstName || ''}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input
                        id="last-name"
                        placeholder="Doe"
                        value={formData.lastName || ''}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identity-email">Email</Label>
                    <Input
                      id="identity-email"
                      placeholder="john@example.com"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Company Name"
                      value={formData.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="123 Main St, City, State, ZIP"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identity-notes">Notes</Label>
                    <Textarea
                      id="identity-notes"
                      placeholder="Additional identity information..."
                      value={formData.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={formData.favorite || false}
                      onCheckedChange={(checked: boolean) => handleInputChange('favorite', checked)}
                    />
                    <Label className="flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Mark as favorite
                    </Label>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {editingItem ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                editingItem ? 'Update Item' : 'Add Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 