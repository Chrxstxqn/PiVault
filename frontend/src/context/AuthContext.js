/**
 * PiVault Authentication Context
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';
import { deriveKey } from '../lib/crypto';
import { getBrowserLanguage } from '../lib/i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [language, setLanguage] = useState(getBrowserLanguage());
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);
  
  // Auto-lock timer
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);
  
  // Check for auto-lock
  useEffect(() => {
    if (!user || !encryptionKey) return;
    
    const checkAutoLock = setInterval(() => {
      const inactiveMs = Date.now() - lastActivity;
      const lockAfterMs = autoLockMinutes * 60 * 1000;
      
      if (inactiveMs >= lockAfterMs) {
        lockVault();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkAutoLock);
  }, [user, encryptionKey, lastActivity, autoLockMinutes]);
  
  // Activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);
  
  // Session expired listener
  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
    };
    
    window.addEventListener('pivault:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('pivault:session_expired', handleSessionExpired);
    };
  }, []);
  
  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem('pivault_token');
      const storedUser = sessionStorage.getItem('pivault_user');
      
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setLanguage(userData.language || getBrowserLanguage());
          setAutoLockMinutes(userData.auto_lock_minutes || 15);
          
          // Check if we have the encryption key
          const storedKey = sessionStorage.getItem('pivault_key');
          if (storedKey) {
            setEncryptionKey(storedKey);
          } else {
            setIsLocked(true);
          }
        } catch {
          sessionStorage.clear();
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();
  }, []);
  
  // Login
  const login = async (email, password, totpCode = null) => {
    const response = await authAPI.login(email, password, totpCode);
    const userData = response.data;
    
    // Store token and user
    sessionStorage.setItem('pivault_token', userData.access_token);
    sessionStorage.setItem('pivault_user', JSON.stringify(userData));
    
    // Get user info with salt
    const meResponse = await authAPI.getMe();
    const fullUser = { ...userData, ...meResponse.data };
    
    // Derive encryption key from master password
    const key = deriveKey(password, fullUser.master_key_salt);
    sessionStorage.setItem('pivault_key', key);
    
    setUser(fullUser);
    setEncryptionKey(key);
    setLanguage(fullUser.language || getBrowserLanguage());
    setAutoLockMinutes(fullUser.auto_lock_minutes || 15);
    setIsLocked(false);
    updateActivity();
    
    return fullUser;
  };
  
  // Register
  const register = async (email, password) => {
    const response = await authAPI.register(email, password);
    const userData = response.data;
    
    // Store token and user
    sessionStorage.setItem('pivault_token', userData.access_token);
    sessionStorage.setItem('pivault_user', JSON.stringify(userData));
    
    // Get user info with salt
    const meResponse = await authAPI.getMe();
    const fullUser = { ...userData, ...meResponse.data };
    
    // Derive encryption key
    const key = deriveKey(password, fullUser.master_key_salt);
    sessionStorage.setItem('pivault_key', key);
    
    setUser(fullUser);
    setEncryptionKey(key);
    setLanguage(fullUser.language || getBrowserLanguage());
    setAutoLockMinutes(fullUser.auto_lock_minutes || 15);
    setIsLocked(false);
    updateActivity();
    
    return fullUser;
  };
  
  // Logout
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout errors
    }
    
    sessionStorage.removeItem('pivault_token');
    sessionStorage.removeItem('pivault_user');
    sessionStorage.removeItem('pivault_key');
    
    setUser(null);
    setEncryptionKey(null);
    setIsLocked(false);
  };
  
  // Lock vault
  const lockVault = () => {
    sessionStorage.removeItem('pivault_key');
    setEncryptionKey(null);
    setIsLocked(true);
  };
  
  // Unlock vault
  const unlockVault = async (password) => {
    if (!user?.master_key_salt) {
      throw new Error('No user data');
    }
    
    const key = deriveKey(password, user.master_key_salt);
    sessionStorage.setItem('pivault_key', key);
    setEncryptionKey(key);
    setIsLocked(false);
    updateActivity();
    
    return true;
  };
  
  // Update settings
  const updateSettings = (newSettings) => {
    if (newSettings.language) {
      setLanguage(newSettings.language);
    }
    if (newSettings.auto_lock_minutes) {
      setAutoLockMinutes(newSettings.auto_lock_minutes);
    }
    
    // Update stored user
    const updatedUser = { ...user, ...newSettings };
    setUser(updatedUser);
    sessionStorage.setItem('pivault_user', JSON.stringify(updatedUser));
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      encryptionKey,
      isLoading,
      isLocked,
      isAuthenticated: !!user,
      language,
      autoLockMinutes,
      login,
      register,
      logout,
      lockVault,
      unlockVault,
      updateSettings,
      updateActivity,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
