import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { calculatePasswordStrength } from '../lib/crypto';
import { toast } from 'sonner';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, language } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [], color: 'gray' });

  // Calculate password strength
  useEffect(() => {
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: [], color: 'gray' });
    }
  }, [password]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError(t('password_too_short', language));
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password);
      toast.success(t('success', language));
      navigate('/vault');
    } catch (err) {
      let errorMsg = t('error_generic', language);
      const detail = err.response?.data?.detail;
      
      if (typeof detail === 'string') {
        errorMsg = t(detail, language);
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        errorMsg = detail[0].msg;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1680992044138-ce4864c2b962?crop=entropy&cs=srgb&fm=jpg&q=85)',
          }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col justify-center px-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">PiVault</h1>
          </div>
          <p className="text-xl text-white/80 mb-8 max-w-md">
            {t('app_tagline', language)}
          </p>
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 max-w-sm">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Security First
            </h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Your master password never leaves your device
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                All data is encrypted with AES-256 before storage
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Even server admins cannot access your passwords
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - register form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">PiVault</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{t('create_account', language)}</h2>
            <p className="text-muted-foreground mt-2">
              Create your secure vault
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
                data-testid="register-email-input"
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
                  data-testid="register-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="new-password"
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
              
              {/* Password strength indicator */}
              {password && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getStrengthColor(passwordStrength.score)} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.score / 7) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getStrengthLabel(passwordStrength.score)}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="space-y-1">
                      {passwordStrength.feedback.slice(0, 3).map((fb, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <X className="w-3 h-3 text-destructive" />
                          {t(fb, language)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirm_password', language)}</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                data-testid="register-confirm-password-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="new-password"
                className="bg-input border-transparent focus:border-primary h-11"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            <div className="p-3 bg-accent/10 border border-accent/20 rounded-md">
              <p className="text-xs text-accent flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> Your master password cannot be recovered. 
                  Make sure to remember it or store it safely.
                </span>
              </p>
            </div>

            <Button 
              type="submit" 
              data-testid="register-submit-btn"
              className="w-full h-11 btn-glow"
              disabled={isLoading || password !== confirmPassword || passwordStrength.score < 3}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('creating_account', language)}
                </>
              ) : (
                t('create_account', language)
              )}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            {t('have_account', language)}{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              {t('login', language)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
