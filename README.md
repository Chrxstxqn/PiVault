# PiVault - Self-Hosted Password Manager
### Created by [Christian Schito](https://github.com/christian-schito)
**Version: 1.0.0**

PiVault is a secure, self-hosted password manager optimized for Raspberry Pi and personal server environments. It features a "host-proof" architecture where the server stores encrypted data without having access to the decryption keys, ensuring maximum privacy.


## 🚀 Features

- **Zero-Knowledge Architecture**: Data is encrypted on the client using AES-256-GCM before being sent to the server. The server never sees your passwords defined in the vault.
- **Modern Security**:
  - **Argon2id** for password hashing.
  - **JWT** (JSON Web Tokens) for authentication.
  - **TOTP** (Time-based One-Time Password) Two-Factor Authentication support.
  - **Brute-force protection** with automatic temporary IP blocking.
  - **Security Audit Log** for tracking all sensitive actions.
- **Fast & Lightweight**:
  - Backend built with **FastAPI** and **Async SQLite** (aiosqlite).
  - Optimized for low-resource environments like Raspberry Pi.
- **Responsive UI**:
  - Frontend built with **React**, **Tailwind CSS**, and **Radix UI**.
  - Mobile-friendly design.
- **Developer Friendly**:
  - Comprehensive API testing suite included.
  - Easy to deploy and maintain.

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (Async with WAL mode enabled)
- **Security**: PyJWT, Argon2-cffi, PyOTP
- **Testing**: Pytest

### Frontend
- **Framework**: React 19
- **Build Tool**: Create React App (with Craco)
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Components**: Radix UI Primitives
- **State/Data**: Axios, React Hook Form, Zod

## 🏁 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file (optional, defaults provided in code):
   ```env
   JWT_SECRET=your_super_secure_secret_key_here
   CORS_ORIGINS=http://localhost:3000
   ```

5. Start the server:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```
   The API will be available at `http://localhost:8000`. API docs are at `http://localhost:8000/docs`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The application will open at `http://localhost:3000`.

## � Docker Deployment

The easiest way to run PiVault is using Docker Compose.

1. Ensure you have Docker and Docker Compose installed.
2. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```
3. The application will be available at `http://localhost:8000`.

To stop the application:
```bash
docker-compose down
```

## �🔒 Security Architecture


### User Authentication
- When a user registers, their master password is hashed using **Argon2id** with a unique salt.
- A random `master_key_salt` is generated and stored.
- On login, the server verifies the hash. If successful, it returns a JWT.

### Vault Encryption
- The client derives a master encryption key from the user's password and the `master_key_salt`.
- Vault entries (passwords, notes, etc.) are encrypted on the client side using **AES-256-GCM**.
- The server receives and stores only the `encrypted_data` and the `nonce`.
- Decryption happens solely in the user's browser; the server cannot read your stored passwords.

## 🧪 Testing

To run the backend test suite:

```bash
# Make sure your backend server is running on localhost:8000
python3 backend_test.py
```

## 📄 License

This project is open-source.
