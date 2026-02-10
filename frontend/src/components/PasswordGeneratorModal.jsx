import React, { useState, useCallback } from 'react';
import { Copy, RefreshCw, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { t } from '../lib/i18n';
import { generatePassword, copyToClipboard, calculatePasswordStrength } from '../lib/crypto';
import { toast } from 'sonner';

const PasswordGeneratorModal = ({ open, language, onClose, onUsePassword }) => {
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  const [strength, setStrength] = useState({ score: 0, color: 'gray' });

  // Generate password
  const generate = useCallback(() => {
    const newPassword = generatePassword(options);
    setPassword(newPassword);
    setStrength(calculatePasswordStrength(newPassword));
    setCopied(false);
  }, [options]);

  // Generate on open
  React.useEffect(() => {
    if (open) {
      generate();
    }
  }, [open, generate]);

  // Handle copy
  const handleCopy = async () => {
    const success = await copyToClipboard(password);
    if (success) {
      setCopied(true);
      toast.success(t('copied', language), { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle option change
  const handleOptionChange = (key, value) => {
    setOptions(prev => {
      const newOptions = { ...prev, [key]: value };
      
      // Ensure at least one character type is selected
      const hasAnyType = newOptions.uppercase || newOptions.lowercase || newOptions.numbers || newOptions.symbols;
      if (!hasAnyType) {
        newOptions.lowercase = true;
      }
      
      return newOptions;
    });
  };

  // Regenerate when options change
  React.useEffect(() => {
    if (open && password) {
      generate();
    }
  }, [options.length, options.uppercase, options.lowercase, options.numbers, options.symbols, options.excludeAmbiguous]);

  const getStrengthLabel = (score) => {
    if (score <= 2) return t('strength_weak', language);
    if (score <= 4) return t('strength_fair', language);
    if (score <= 5) return t('strength_good', language);
    return t('strength_strong', language);
  };

  const getStrengthColor = (score) => {
    if (score <= 2) return 'bg-destructive';
    if (score <= 4) return 'bg-accent';
    if (score <= 5) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="password-generator-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            {t('password_generator', language)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Password display */}
          <div className="space-y-2">
            <div className="relative">
              <div className="p-4 bg-input rounded-md font-mono text-lg break-all select-all border border-border/40">
                {password}
              </div>
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  data-testid="copy-generated-password"
                  className="h-8 w-8 p-0"
                >
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={generate}
                  data-testid="regenerate-password"
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Strength indicator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getStrengthColor(strength.score)} transition-all duration-300`}
                  style={{ width: `${(strength.score / 7) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-16">
                {getStrengthLabel(strength.score)}
              </span>
            </div>
          </div>
          
          {/* Length slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('length', language)}</Label>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {options.length}
              </span>
            </div>
            <Slider
              value={[options.length]}
              onValueChange={([value]) => handleOptionChange('length', value)}
              min={8}
              max={64}
              step={1}
              data-testid="password-length-slider"
            />
          </div>
          
          {/* Character options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="uppercase" className="cursor-pointer">
                {t('uppercase', language)}
              </Label>
              <Switch
                id="uppercase"
                checked={options.uppercase}
                onCheckedChange={(checked) => handleOptionChange('uppercase', checked)}
                data-testid="uppercase-switch"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="lowercase" className="cursor-pointer">
                {t('lowercase', language)}
              </Label>
              <Switch
                id="lowercase"
                checked={options.lowercase}
                onCheckedChange={(checked) => handleOptionChange('lowercase', checked)}
                data-testid="lowercase-switch"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="numbers" className="cursor-pointer">
                {t('numbers', language)}
              </Label>
              <Switch
                id="numbers"
                checked={options.numbers}
                onCheckedChange={(checked) => handleOptionChange('numbers', checked)}
                data-testid="numbers-switch"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="symbols" className="cursor-pointer">
                {t('symbols', language)}
              </Label>
              <Switch
                id="symbols"
                checked={options.symbols}
                onCheckedChange={(checked) => handleOptionChange('symbols', checked)}
                data-testid="symbols-switch"
              />
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Label htmlFor="excludeAmbiguous" className="cursor-pointer text-muted-foreground">
                {t('exclude_ambiguous', language)}
              </Label>
              <Switch
                id="excludeAmbiguous"
                checked={options.excludeAmbiguous}
                onCheckedChange={(checked) => handleOptionChange('excludeAmbiguous', checked)}
                data-testid="exclude-ambiguous-switch"
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              {t('cancel', language)}
            </Button>
            <Button
              className="flex-1 btn-glow"
              onClick={handleCopy}
              data-testid="use-password-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              {t('copy', language)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordGeneratorModal;
