import React, { useState, useEffect } from 'react';
import { Folder, Key, Globe, User, Lock, CreditCard, Briefcase, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { t } from '../lib/i18n';

const iconOptions = [
  { value: 'folder', icon: Folder, label: 'Folder' },
  { value: 'key', icon: Key, label: 'Key' },
  { value: 'globe', icon: Globe, label: 'Globe' },
  { value: 'user', icon: User, label: 'User' },
  { value: 'lock', icon: Lock, label: 'Lock' },
  { value: 'credit-card', icon: CreditCard, label: 'Finance' },
  { value: 'briefcase', icon: Briefcase, label: 'Work' },
  { value: 'shopping-bag', icon: ShoppingBag, label: 'Shopping' },
];

const CategoryModal = ({ open, category, language, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when category changes
  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setSelectedIcon(category.icon || 'folder');
    } else {
      setName('');
      setSelectedIcon('folder');
    }
  }, [category, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), icon: selectedIcon }, category?.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm" data-testid="category-modal">
        <DialogHeader>
          <DialogTitle>
            {category ? t('edit_category', language) : t('add_category', language)}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="categoryName">{t('category_name', language)}</Label>
            <Input
              id="categoryName"
              data-testid="category-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Social Media"
              required
              maxLength={50}
            />
          </div>
          
          {/* Icon selection */}
          <div className="space-y-2">
            <Label>{t('category_icon', language)}</Label>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedIcon(value)}
                  className={`
                    p-3 rounded-md border transition-colors flex flex-col items-center gap-1
                    ${selectedIcon === value 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-card border-border/40 hover:border-border text-muted-foreground hover:text-foreground'}
                  `}
                  title={label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('cancel', language)}
            </Button>
            <Button 
              type="submit" 
              data-testid="category-save-btn"
              disabled={!name.trim() || isSaving}
            >
              {t('save', language)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryModal;
