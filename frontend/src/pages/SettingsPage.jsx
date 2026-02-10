import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, ArrowLeft, Globe, Lock, Download, Upload, 
  Smartphone, Clock, Check, Loader2, AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../context/AuthContext';
import { authAPI, settingsAPI, exportImportAPI } from '../lib/api';
import { t, languages } from '../lib/i18n';
import { toast } from 'sonner';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, language, autoLockMinutes, updateSettings } = useAuth();
  const fileInputRef = useRef(null);
  
  // Settings state
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedAutoLock, setSelectedAutoLock] = useState(autoLockMinutes);
  const [isSaving, setIsSaving] = useState(false);
  
  // 2FA state
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  
  // Export/Import state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Save settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.update({
        language: selectedLanguage,
        auto_lock_minutes: selectedAutoLock
      });
      updateSettings({ 
        language: selectedLanguage, 
        auto_lock_minutes: selectedAutoLock 
      });
      toast.success(t('settings_saved', language));
    } catch (err) {
      toast.error(t('error_generic', language));
    } finally {
      setIsSaving(false);
    }
  };

  // Setup 2FA
  const handleSetup2FA = async () => {
    setIsSettingUp2FA(true);
    try {
      const response = await authAPI.setupTotp();
      setTotpSetup(response.data);
    } catch (err) {
      toast.error(t('error_generic', language));
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  // Verify 2FA
  const handleVerify2FA = async () => {
    if (totpCode.length !== 6) return;
    
    setIsVerifying2FA(true);
    try {
      await authAPI.verifyTotp(totpCode);
      toast.success(t('totp_enabled', language));
      setTotpSetup(null);
      setTotpCode('');
      updateSettings({ totp_enabled: true });
    } catch (err) {
      toast.error(t('invalid_totp', language));
    } finally {
      setIsVerifying2FA(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (totpCode.length !== 6) return;
    
    setIsVerifying2FA(true);
    try {
      await authAPI.disableTotp(totpCode);
      toast.success(t('totp_disabled', language));
      setTotpCode('');
      updateSettings({ totp_enabled: false });
    } catch (err) {
      toast.error(t('invalid_totp', language));
    } finally {
      setIsVerifying2FA(false);
    }
  };

  // Export vault
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportImportAPI.export();
      const data = JSON.stringify(response.data, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pivault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('export_success', language));
    } catch (err) {
      toast.error(t('error_generic', language));
    } finally {
      setIsExporting(false);
    }
  };

  // Import vault
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const response = await exportImportAPI.import(data);
      toast.success(`${t('import_success', language)} (${response.data.imported_entries} ${t('import_entries', language)})`);
    } catch (err) {
      toast.error(t('error_generic', language));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-border/40 px-4 md:px-6 py-4">
        <div className="flex items-center gap-4 max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/vault')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('settings', language)}</h1>
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-8">
        {/* Account */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{t('account', language)}</h2>
          </div>
          
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {user?.totp_enabled ? '2FA Enabled' : '2FA Disabled'}
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <Separator />
        
        {/* Language & Auto-lock */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-secondary/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="text-lg font-semibold">{t('settings', language)}</h2>
          </div>
          
          <div className="bg-card border border-border/40 rounded-lg p-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('language', language)}</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred language
                </p>
              </div>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-40" data-testid="language-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('auto_lock', language)}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('auto_lock_desc', language)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(selectedAutoLock)} onValueChange={(v) => setSelectedAutoLock(Number(v))}>
                  <SelectTrigger className="w-24" data-testid="autolock-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">{t('minutes', language)}</span>
              </div>
            </div>
            
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              data-testid="save-settings-btn"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {t('save', language)}
            </Button>
          </div>
        </section>
        
        <Separator />
        
        {/* 2FA */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">{t('security', language)}</h2>
          </div>
          
          <div className="bg-card border border-border/40 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Two-Factor Authentication (2FA)</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security with TOTP
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user?.totp_enabled ? (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    Enabled
                  </span>
                ) : (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            {!user?.totp_enabled && !totpSetup && (
              <Button 
                onClick={handleSetup2FA}
                disabled={isSettingUp2FA}
                data-testid="setup-2fa-btn"
              >
                {isSettingUp2FA ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                {t('enable_2fa', language)}
              </Button>
            )}
            
            {totpSetup && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('scan_qr', language)}
                  </p>
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpSetup.otpauth_url)}`}
                      alt="TOTP QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 font-mono break-all">
                    {totpSetup.secret}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('enter_code', language)}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      data-testid="totp-verify-input"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-32 text-center tracking-widest font-mono"
                    />
                    <Button 
                      onClick={handleVerify2FA}
                      disabled={totpCode.length !== 6 || isVerifying2FA}
                      data-testid="verify-2fa-btn"
                    >
                      {isVerifying2FA ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t('verify', language)
                      )}
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => { setTotpSetup(null); setTotpCode(''); }}
                    >
                      {t('cancel', language)}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {user?.totp_enabled && (
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    Disabling 2FA will reduce your account security
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Enter your 2FA code to disable</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      data-testid="totp-disable-input"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-32 text-center tracking-widest font-mono"
                    />
                    <Button 
                      variant="destructive"
                      onClick={handleDisable2FA}
                      disabled={totpCode.length !== 6 || isVerifying2FA}
                      data-testid="disable-2fa-btn"
                    >
                      {isVerifying2FA ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t('disable_2fa', language)
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        
        <Separator />
        
        {/* Export/Import */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
              <Download className="w-4 h-4 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Backup</h2>
          </div>
          
          <div className="bg-card border border-border/40 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">{t('export_vault', language)}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('export_desc', language)}
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                data-testid="export-btn"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {t('export', language)}
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">{t('import_vault', language)}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('import_desc', language)}
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  data-testid="import-file-input"
                />
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  data-testid="import-btn"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {t('import', language)}
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Version info */}
        <div className="text-center text-xs text-muted-foreground py-8">
          <p>PiVault v1.0.0</p>
          <p className="mt-1">{t('self_hosted', language)} • {t('zero_knowledge', language)}</p>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
