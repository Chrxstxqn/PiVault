# PiVault - Self-Hosted Password Manager
### Created by [Christian Schito](https://github.com/christian-schito)
**Version: 1.0.0**

PiVault is a secure, self-hosted password manager optimized for Raspberry Pi and personal server environments. It features a "host-proof" architecture where the server stores encrypted data without having access to the decryption keys, ensuring maximum privacy.

---

## 🚀 Quick Start (Easy Deployment)

The fastest way to get PiVault running is using **Docker**. You can deploy it in seconds using our pre-built image.

### 1. Create a `docker-compose.yml` file:
```yaml
services:
  pivault:
    image: ghcr.io/chrxstxqn/pivault:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/backend/data
    environment:
      - JWT_SECRET=change-me-to-something-very-long
      - CORS_ORIGINS=*
    restart: unless-stopped
```

### 2. Launch the vault:
```bash
docker compose up -d
```

### 3. Access your vault:
Open your browser and navigate to `http://localhost:8000`.

---

## ✨ Features

- **Zero-Knowledge Architecture**: Data is encrypted on the client using AES-256-GCM. The server never sees your master password or decrypted data.
- **Modern Security**:
  - **Argon2id** for high-security password hashing.
  - **TOTP (2FA)** support for an extra layer of protection.
  - **Brute-force protection** with automatic IP rate-limiting.
  - **Security Audit Log** to monitor all access and changes.
- **Fast & Lightweight**: Backend built with FastAPI and Async SQLite, perfect for Raspberry Pi.
- **Premium UI**: Modern, responsive interface built with React 19, Tailwind CSS, and Radix UI.

## 🔒 Security Architecture

### User Authentication
- **Hashing**: Master passwords are never stored. We use Argon2id with a unique salt for each user.
- **Session**: Secure JWT-based authentication with configurable expiration.

### Vault Encryption
- **Client-Side**: Encryption happens exclusively in the browser. 
- **Algorithm**: AES-256-GCM provides both confidentiality and integrity.
- **Host-Proof**: Even if the server is compromised, your passwords remain encrypted and unreadable without your master password.

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI, Async SQLite (aiosqlite)
- **Frontend**: React 19, Tailwind CSS, Radix UI, Lucide Icons
- **DevOps**: Docker, GitHub Container Registry (GHCR)

## 🏁 Development Setup

If you want to contribute or run the project locally without Docker:

### Backend
1. `cd backend`
2. `python3 -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `uvicorn server:app --reload --port 8000`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm start`

## 🧪 Testing
Run the backend validation suite:
```bash
# Ensure server is running on localhost:8000
python3 backend_test.py
```

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
