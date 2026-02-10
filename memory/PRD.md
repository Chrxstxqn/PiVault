# PiVault - Self-Hosted Password Manager

## Project Overview
PiVault è un password manager self-hosted ottimizzato per Raspberry Pi con architettura zero-knowledge.

## Original Problem Statement
- Password manager self-hosted per Raspberry Pi
- Focus su sicurezza, affidabilità, semplicità
- Zero-knowledge encryption
- Multi-lingua (IT/EN)

## User Choices
1. **Auth**: JWT-based custom authentication
2. **Database**: SQLite (ottimizzato per Raspberry Pi)
3. **2FA**: TOTP implementation
4. **Lingua**: Multilingua (IT/EN)
5. **Features**: Generatore password, categorie, export/import cifrato

## Architecture

### Backend (FastAPI + SQLite)
- `/api/auth/*` - Authentication endpoints
- `/api/vault/*` - Vault CRUD operations
- `/api/categories/*` - Category management
- `/api/settings` - User settings
- `/api/export`, `/api/import` - Backup functionality

### Security Features
- **Key Derivation**: Argon2id (backend), PBKDF2 (client-side)
- **Encryption**: AES-256 (client-side, CryptoJS)
- **Auth**: JWT tokens with expiration
- **Rate Limiting**: SlowAPI with 5-10 requests/minute limits
- **Brute Force Protection**: 5 failed attempts = 15 min lockout
- **TOTP 2FA**: PyOTP for TOTP generation/validation

### Database Schema (SQLite)
```sql
users: id, email, password_hash, master_key_salt, totp_secret, totp_enabled, language, auto_lock_minutes
vault_entries: id, user_id, category_id, encrypted_data, nonce, timestamps
categories: id, user_id, name, icon
audit_log: id, user_id, action, ip_address, success, timestamp
login_attempts: id, email, ip_address, timestamp
```

### Frontend (React + Shadcn UI)
- Dark-mode only UI with "Encrypted Obsidian" theme
- JetBrains Mono + Manrope fonts
- Client-side encryption before sending to server
- Auto-lock functionality
- Clipboard timeout (30 seconds)

## What's Been Implemented (2026-02-10)

### Backend
- ✅ User registration with Argon2id password hashing
- ✅ JWT authentication with 24h expiration
- ✅ TOTP 2FA setup and verification
- ✅ Vault CRUD operations (encrypted data only)
- ✅ Category management
- ✅ Rate limiting and brute-force protection
- ✅ Audit logging
- ✅ Export/Import functionality
- ✅ Password strength API

### Frontend
- ✅ Login/Register pages with password strength indicator
- ✅ Vault dashboard with sidebar categories
- ✅ Password entry CRUD (add, edit, delete)
- ✅ Password generator modal
- ✅ Settings page (language, auto-lock, 2FA)
- ✅ Lock screen with master password unlock
- ✅ Multi-language support (EN/IT)
- ✅ Copy to clipboard with auto-clear

## Threat Model

### What's Protected
- All passwords encrypted client-side with AES-256 before storage
- Master password never sent to server
- Server stores only encrypted blobs and hashed credentials

### Attack Scenarios
1. **Server Compromise**: Attacker gets encrypted blobs + password hashes
   - Cannot decrypt vault data without master password
   - Cannot crack Argon2id hashes quickly
   
2. **Man-in-the-Middle**: HTTPS required, encrypted data in transit
   
3. **Brute Force**: Rate limiting + account lockout after 5 attempts

### What Admin Cannot Do
- View plaintext passwords
- Decrypt vault entries
- Access master password

## P0 Features (Implemented)
- [x] User auth with master password
- [x] Encrypted vault storage
- [x] Password generator
- [x] Categories/folders
- [x] 2FA TOTP
- [x] Export/Import

## P1 Features (Backlog)
- [ ] Password breach checking (HaveIBeenPwned API)
- [ ] Password reuse warnings
- [ ] Browser extension
- [ ] Mobile PWA support

## P2 Features (Future)
- [ ] Shared vaults / family sharing
- [ ] Emergency access
- [ ] Custom fields
- [ ] File attachments

## Tech Stack
- **Backend**: FastAPI, SQLite (aiosqlite), Argon2, PyOTP, JWT
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, CryptoJS
- **Fonts**: JetBrains Mono, Manrope

## Raspberry Pi Optimizations
- SQLite with WAL mode for better concurrency
- Low memory footprint (~50MB RAM)
- No heavy background services
- Static frontend build possible
- ARM-compatible dependencies
