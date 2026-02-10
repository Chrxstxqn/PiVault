import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, Globe, User, Lock, FileText, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { t } from '../lib/i18n';
import { calculatePasswordStrength } from '../lib/crypto';

const VaultEntryModal = ({ 
  open, 
  entry, 
  categories, 
  language, 
  onClose, 
  onSave, 
  onOpenGenerator 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    category_id: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, color: 'gray' });

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title || '',
        username: entry.username || '',
        password: entry.password || '',
        url: entry.url || '',
        notes: entry.notes || '',
        category_id: entry.category_id || null,
      });
    } else {
      setFormData({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        category_id: categories[0]?.id || null,
      });
    }
    setShowPassword(false);
  }, [entry, categories, open]);

  // Update password strength
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength({ score: 0, color: 'gray' });
    }
  }, [formData.password]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.password) return;
    
    setIsSaving(true);
    try {
      await onSave(formData, entry?.id);
    } finally {
      setIsSaving(false);
    }
  };

  const getStrengthColor = (score) => {
    if (score <= 2) return 'bg-destructive';
    if (score <= 4) return 'bg-accent';
    if (score <= 5) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="vault-entry-modal">
        <DialogHeader>
          <DialogTitle>
            {entry ? t('edit_item', language) : t('add_item', language)}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('title', language)} *</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="title"
                data-testid="entry-title-input"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Google Account"
                required
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">{t('username', language)}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                data-testid="entry-username-input"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="email@example.com"
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">{t('password', language)} *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                data-testid="entry-password-input"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••••••"
                required
                className="pl-10 pr-20 font-mono"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={onOpenGenerator}
                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Password strength bar */}
            {formData.password && (
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getStrengthColor(passwordStrength.score)} transition-all duration-300`}
                  style={{ width: `${(passwordStrength.score / 7) * 100}%` }}
                />
              </div>
            )}
          </div>
          
          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">{t('url', language)}</Label>
            <Input
              id="url"
              data-testid="entry-url-input"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <Label>{t('category', language)}</Label>
            <Select 
              value={formData.category_id || ''} 
              onValueChange={(v) => handleChange('category_id', v || null)}
            >
              <SelectTrigger data-testid="entry-category-select">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes', language)}</Label>
            <Textarea
              id="notes"
              data-testid="entry-notes-input"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
          
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('cancel', language)}
            </Button>
            <Button 
              type="submit" 
              data-testid="entry-save-btn"
              disabled={!formData.title || !formData.password || isSaving}
              className="btn-glow"
            >
              {t('save', language)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VaultEntryModal;
