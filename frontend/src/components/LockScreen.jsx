import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { toast } from 'sonner';

const LockScreen = () => {
  const { unlockVault, logout, language, user } = useAuth();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await unlockVault(password);
      toast.success(t('success', language));
    } catch (err) {
      setError(t('invalid_credentials', language));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8" data-testid="lock-screen">
      <div className="w-full max-w-sm">
        {/* Lock animation */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center lock-icon">
            <Lock className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t('vault_locked', language)}</h1>
          <p className="text-muted-foreground mt-2">{user?.email}</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">{t('master_password', language)}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                data-testid="unlock-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoFocus
                autoComplete="current-password"
                className="bg-input border-transparent focus:border-primary h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            data-testid="unlock-submit-btn"
            className="w-full h-11 btn-glow"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('loading', language)}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                {t('unlock', language)}
              </>
            )}
          </Button>
        </form>

        <button
          onClick={handleLogout}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('logout', language)}
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mt-12 text-muted-foreground">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">PiVault</span>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
