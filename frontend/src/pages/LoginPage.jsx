import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { toast } from 'sonner';

import logo from '../assets/logo.jpg';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, language } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, requires2FA ? totpCode : null);
      toast.success(t('success', language));
      navigate('/vault');
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (detail === 'totp_required') {
        setRequires2FA(true);
        setError('');
      } else {
        let errorMsg = t('error_generic', language);
        if (typeof detail === 'string') {
          errorMsg = t(detail, language);
        } else if (Array.isArray(detail) && detail[0]?.msg) {
          errorMsg = detail[0].msg;
        }
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage: `url(${logo})`,
            filter: 'grayscale(0.5) contrast(1.2)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/40 to-primary/20" />
        <div className="relative z-10 flex flex-col justify-center px-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/20">
              <img src={logo} alt="PiVault Logo" className="w-10 h-10 rounded-lg object-cover" />
            </div>
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-white leading-none">PiVault</h1>
              <p className="text-primary text-sm font-medium mt-1 tracking-widest uppercase">Premium Security</p>
            </div>
          </div>
          <p className="text-xl text-white/80 mb-8 max-w-md leading-relaxed">
            {t('app_tagline', language)}
          </p>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white/80 font-medium">{t('zero_knowledge', language)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white/80 font-medium">{t('encrypted', language)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-white/80 font-medium">{t('self_hosted', language)}</span>
            </div>
          </div>

          <div className="absolute bottom-8 left-12">
            <p className="text-white/40 text-sm font-medium">Created with ❤️ by Christian Schito</p>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-card/30">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-10 justify-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center p-4 border border-primary/10">
              <img src={logo} alt="PiVault Logo" className="w-full h-full rounded-lg object-cover" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight">PiVault</h1>
              <p className="text-primary text-xs font-medium tracking-widest uppercase mt-1">Created by Christian Schito</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{t('login', language)}</h2>
            <p className="text-muted-foreground mt-2">
              {t('enter_master_password', language)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('email', language)}</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                autoComplete="email"
                className="bg-input border-transparent focus:border-primary h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('master_password', language)}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
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

            {requires2FA && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="totp">{t('totp_code', language)}</Label>
                <Input
                  id="totp"
                  type="text"
                  data-testid="login-totp-input"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="bg-input border-transparent focus:border-primary h-11 text-center tracking-widest font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  {t('enter_code', language)}
                </p>
              </div>
            )}

            <Button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full h-11 btn-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('signing_in', language)}
                </>
              ) : (
                t('login', language)
              )}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            {t('no_account', language)}{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              {t('create_account', language)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
