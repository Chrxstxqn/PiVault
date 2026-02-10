/**
 * PiVault Client-Side Cryptography Module
 * Zero-knowledge encryption - server never sees plaintext
 */
import CryptoJS from 'crypto-js';

// Key derivation iterations (Argon2id simulation with PBKDF2 for browser)
const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE = 256 / 32; // 256 bits
const SALT_SIZE = 128 / 8; // 128 bits

/**
 * Derive encryption key from master password using PBKDF2
 * @param {string} masterPassword - User's master password
 * @param {string} salt - Salt from server (hex string)
 * @returns {string} - Derived key as hex string
 */
export const deriveKey = (masterPassword, salt) => {
  const key = CryptoJS.PBKDF2(masterPassword, CryptoJS.enc.Hex.parse(salt), {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });
  return key.toString(CryptoJS.enc.Hex);
};

/**
 * Generate random nonce for AES-GCM
 * @returns {string} - Random nonce as hex string
 */
export const generateNonce = () => {
  const nonce = CryptoJS.lib.WordArray.random(12); // 96 bits for GCM
  return nonce.toString(CryptoJS.enc.Hex);
};

/**
 * Encrypt data using AES-256
 * @param {object} data - Data to encrypt
 * @param {string} key - Encryption key (hex)
 * @returns {object} - { encrypted: string, nonce: string }
 */
export const encryptData = (data, key) => {
  const nonce = generateNonce();
  const jsonData = JSON.stringify(data);
  
  // Use nonce as IV
  const encrypted = CryptoJS.AES.encrypt(jsonData, CryptoJS.enc.Hex.parse(key), {
    iv: CryptoJS.enc.Hex.parse(nonce),
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  return {
    encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    nonce: nonce
  };
};

/**
 * Decrypt data using AES-256
 * @param {string} encryptedData - Base64 encrypted data
 * @param {string} nonce - Nonce used for encryption (hex)
 * @param {string} key - Decryption key (hex)
 * @returns {object|null} - Decrypted data or null if failed
 */
export const decryptData = (encryptedData, nonce, key) => {
  try {
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(encryptedData)
    });
    
    const decrypted = CryptoJS.AES.decrypt(cipherParams, CryptoJS.enc.Hex.parse(key), {
      iv: CryptoJS.enc.Hex.parse(nonce),
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding
    });
    
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

/**
 * Generate a secure random password
 * @param {object} options - Password generation options
 * @returns {string} - Generated password
 */
export const generatePassword = (options = {}) => {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = false
  } = options;

  let charset = '';
  
  const lowercaseChars = excludeAmbiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = excludeAmbiguous ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = excludeAmbiguous ? '23456789' : '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (lowercase) charset += lowercaseChars;
  if (uppercase) charset += uppercaseChars;
  if (numbers) charset += numberChars;
  if (symbols) charset += symbolChars;

  if (!charset) charset = lowercaseChars + uppercaseChars + numberChars;

  let password = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  // Ensure at least one character from each selected type
  const requirements = [];
  if (lowercase) requirements.push(lowercaseChars);
  if (uppercase) requirements.push(uppercaseChars);
  if (numbers) requirements.push(numberChars);
  if (symbols) requirements.push(symbolChars);

  // Replace random positions with required characters
  const positions = new Uint32Array(requirements.length);
  crypto.getRandomValues(positions);
  
  let passwordArray = password.split('');
  requirements.forEach((chars, index) => {
    const pos = positions[index] % length;
    const charIndex = positions[index] % chars.length;
    passwordArray[pos] = chars[charIndex];
  });

  return passwordArray.join('');
};

/**
 * Calculate password strength (0-7 scale)
 * @param {string} password - Password to check
 * @returns {object} - { score: number, feedback: string[], color: string }
 */
export const calculatePasswordStrength = (password) => {
  let score = 0;
  const feedback = [];

  if (!password) {
    return { score: 0, feedback: ['empty_password'], color: 'gray' };
  }

  // Length checks
  if (password.length >= 8) score += 1;
  else feedback.push('password_too_short');
  
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character type checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('add_lowercase');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('add_uppercase');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('add_numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('add_special');

  // Common patterns penalty
  const commonPatterns = ['123', 'abc', 'qwerty', 'password', 'admin', '111', 'aaa'];
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score -= 2;
    feedback.push('avoid_common_patterns');
  }

  score = Math.max(0, Math.min(score, 7));

  let color;
  if (score <= 2) color = 'red';
  else if (score <= 4) color = 'yellow';
  else if (score <= 5) color = 'orange';
  else color = 'green';

  return { score, feedback, color };
};

/**
 * Clear sensitive data from memory
 * @param {string} data - Data to clear
 */
export const clearSensitiveData = (data) => {
  if (typeof data === 'string') {
    // Overwrite string (limited effect due to JS string immutability)
    return '';
  }
  return null;
};

/**
 * Copy text to clipboard with auto-clear
 * @param {string} text - Text to copy
 * @param {number} clearAfterMs - Clear after milliseconds (default 30s)
 * @returns {Promise<void>}
 */
export const copyToClipboard = async (text, clearAfterMs = 30000) => {
  try {
    await navigator.clipboard.writeText(text);
    
    // Auto-clear clipboard after timeout
    if (clearAfterMs > 0) {
      setTimeout(async () => {
        try {
          const currentClip = await navigator.clipboard.readText();
          if (currentClip === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Clipboard access denied after timeout - that's fine
        }
      }, clearAfterMs);
    }
    
    return true;
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return false;
  }
};

/**
 * Hash data for comparison (not for security)
 * @param {string} data - Data to hash
 * @returns {string} - SHA256 hash
 */
export const hashData = (data) => {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
};
