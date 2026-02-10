"""
PiVault - Secure Self-Hosted Password Manager
High-performance backend optimized for localized deployment (e.g., Raspberry Pi).
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import secrets
import base64
import aiosqlite
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import pyotp
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from contextlib import asynccontextmanager

# --- Application Configuration ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- Security & Cryptography Configuration ---
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST = 65536
ARGON2_PARALLELISM = 4

# Database path
DB_PATH = ROOT_DIR / "pivault.db"

# Argon2id password hashing instance
ph = PasswordHasher(
    time_cost=ARGON2_TIME_COST,
    memory_cost=ARGON2_MEMORY_COST,
    parallelism=ARGON2_PARALLELISM
)

# API Rate Limiting (SlowAPI)
limiter = Limiter(key_func=get_remote_address)

# Logging Service Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("PiVault")

# Security bearer
security = HTTPBearer()

# ============================================
# DATABASE INITIALIZATION
# ============================================
async def init_database():
    """Initialize SQLite database with optimized settings for Raspberry Pi"""
    async with aiosqlite.connect(DB_PATH) as db:
        # Enable WAL mode for better concurrency
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA synchronous=NORMAL")
        await db.execute("PRAGMA cache_size=10000")
        await db.execute("PRAGMA temp_store=MEMORY")
        
        # Users table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                master_key_salt TEXT NOT NULL,
                totp_secret TEXT,
                totp_enabled INTEGER DEFAULT 0,
                language TEXT DEFAULT 'en',
                auto_lock_minutes INTEGER DEFAULT 15,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Categories table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                icon TEXT DEFAULT 'folder',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Vault entries table - stores client-side encrypted blobs only
        await db.execute("""
            CREATE TABLE IF NOT EXISTS vault_entries (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                category_id TEXT,
                encrypted_data TEXT NOT NULL,
                nonce TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        """)
        
        # Security audit log
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                action TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        
        # Failed login attempts for brute-force protection
        await db.execute("""
            CREATE TABLE IF NOT EXISTS login_attempts (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)
        
        # Create indexes for performance
        await db.execute("CREATE INDEX IF NOT EXISTS idx_vault_user ON vault_entries(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)")
        
        await db.commit()
        logger.info("Database initialized successfully")

async def get_db():
    """Database connection context manager"""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()

# ============================================
# PYDANTIC MODELS
# ============================================
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    totp_enabled: bool
    language: str
    auto_lock_minutes: int

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    icon: str = "folder"

class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: str
    created_at: str

class VaultEntryCreate(BaseModel):
    encrypted_data: str  # AES-256-GCM encrypted JSON
    nonce: str  # Base64 encoded nonce
    category_id: Optional[str] = None

class VaultEntryUpdate(BaseModel):
    encrypted_data: str
    nonce: str
    category_id: Optional[str] = None

class VaultEntryResponse(BaseModel):
    id: str
    encrypted_data: str
    nonce: str
    category_id: Optional[str]
    created_at: str
    updated_at: str

class TOTPSetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_data: str

class TOTPVerify(BaseModel):
    code: str

class SettingsUpdate(BaseModel):
    language: Optional[str] = None
    auto_lock_minutes: Optional[int] = None

class ExportData(BaseModel):
    encrypted_vault: str
    nonce: str
    categories: List[dict]
    version: str = "1.0"
    exported_at: str

class ImportData(BaseModel):
    encrypted_vault: str
    nonce: str
    categories: List[dict]

class PasswordStrength(BaseModel):
    password: str

class PasswordStrengthResponse(BaseModel):
    score: int
    feedback: List[str]

# ============================================
# SECURITY UTILITIES
# ============================================
def create_jwt_token(user_id: str, email: str) -> str:
    """Create JWT token with expiration"""
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def check_brute_force(db, email: str, ip: str) -> bool:
    """Check for brute force attempts - returns True if blocked"""
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    cursor = await db.execute(
        "SELECT COUNT(*) FROM login_attempts WHERE email = ? AND ip_address = ? AND timestamp > ?",
        (email, ip, cutoff)
    )
    row = await cursor.fetchone()
    return row[0] >= 5  # Block after 5 failed attempts in 15 minutes

async def record_login_attempt(db, email: str, ip: str):
    """Record failed login attempt"""
    await db.execute(
        "INSERT INTO login_attempts (id, email, ip_address, timestamp) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), email, ip, datetime.now(timezone.utc).isoformat())
    )
    await db.commit()

async def clear_login_attempts(db, email: str, ip: str):
    """Clear login attempts after successful login"""
    await db.execute(
        "DELETE FROM login_attempts WHERE email = ? AND ip_address = ?",
        (email, ip)
    )
    await db.commit()

async def log_audit(db, user_id: str, action: str, ip: str, user_agent: str, success: bool):
    """Log security-relevant actions"""
    await db.execute(
        "INSERT INTO audit_log (id, user_id, action, ip_address, user_agent, success, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), user_id, action, ip, user_agent, 1 if success else 0, datetime.now(timezone.utc).isoformat())
    )
    await db.commit()

def calculate_password_strength(password: str) -> tuple:
    """Calculate password strength score and feedback"""
    score = 0
    feedback = []
    
    if len(password) >= 8:
        score += 1
    else:
        feedback.append("password_too_short")
    
    if len(password) >= 12:
        score += 1
    
    if len(password) >= 16:
        score += 1
    
    if any(c.isupper() for c in password):
        score += 1
    else:
        feedback.append("add_uppercase")
    
    if any(c.islower() for c in password):
        score += 1
    else:
        feedback.append("add_lowercase")
    
    if any(c.isdigit() for c in password):
        score += 1
    else:
        feedback.append("add_numbers")
    
    if any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in password):
        score += 1
    else:
        feedback.append("add_special")
    
    # Check for common patterns
    common_patterns = ['123', 'abc', 'qwerty', 'password', 'admin']
    if any(p in password.lower() for p in common_patterns):
        score -= 2
        feedback.append("avoid_common_patterns")
    
    return max(0, min(score, 7)), feedback

# ============================================
# APP LIFECYCLE
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    await init_database()
    yield
    logger.info("Application shutdown")

# ============================================
# APPLICATION SETUP
# ============================================
app = FastAPI(
    title="PiVault API",
    description="Self-hosted Password Manager optimized for Raspberry Pi",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# AUTH ENDPOINTS
# ============================================
@api_router.post("/auth/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserRegister, db=Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
    if await cursor.fetchone():
        raise HTTPException(status_code=400, detail="email_exists")
    
    # Generate salt for master key derivation
    master_key_salt = secrets.token_hex(32)
    
    # Hash password with Argon2id
    password_hash = ph.hash(user_data.password)
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO users (id, email, password_hash, master_key_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, user_data.email, password_hash, master_key_salt, now, now)
    )
    
    # Create default category
    await db.execute(
        "INSERT INTO categories (id, user_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), user_id, "General", "folder", now)
    )
    
    await db.commit()
    
    # Log audit
    await log_audit(db, user_id, "register", request.client.host, request.headers.get("user-agent", ""), True)
    
    # Create JWT token
    token = create_jwt_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        email=user_data.email,
        totp_enabled=False,
        language="en",
        auto_lock_minutes=15
    )

@api_router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, user_data: UserLogin, db=Depends(get_db)):
    """Login user"""
    ip = request.client.host
    
    # Check brute force
    if await check_brute_force(db, user_data.email, ip):
        await log_audit(db, None, "login_blocked", ip, request.headers.get("user-agent", ""), False)
        raise HTTPException(status_code=429, detail="too_many_attempts")
    
    # Find user
    cursor = await db.execute(
        "SELECT id, email, password_hash, totp_enabled, totp_secret, language, auto_lock_minutes FROM users WHERE email = ?",
        (user_data.email,)
    )
    user = await cursor.fetchone()
    
    if not user:
        await record_login_attempt(db, user_data.email, ip)
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    # Verify password
    try:
        ph.verify(user["password_hash"], user_data.password)
    except VerifyMismatchError:
        await record_login_attempt(db, user_data.email, ip)
        await log_audit(db, user["id"], "login_failed", ip, request.headers.get("user-agent", ""), False)
        raise HTTPException(status_code=401, detail="invalid_credentials")
    
    # Check TOTP if enabled
    if user["totp_enabled"]:
        if not user_data.totp_code:
            raise HTTPException(status_code=400, detail="totp_required")
        totp = pyotp.TOTP(user["totp_secret"])
        if not totp.verify(user_data.totp_code, valid_window=1):
            await record_login_attempt(db, user_data.email, ip)
            raise HTTPException(status_code=401, detail="invalid_totp")
    
    # Clear login attempts
    await clear_login_attempts(db, user_data.email, ip)
    
    # Log successful login
    await log_audit(db, user["id"], "login", ip, request.headers.get("user-agent", ""), True)
    
    # Create JWT token
    token = create_jwt_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        email=user["email"],
        totp_enabled=bool(user["totp_enabled"]),
        language=user["language"],
        auto_lock_minutes=user["auto_lock_minutes"]
    )

@api_router.get("/auth/me")
async def get_current_user(payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Get current user info"""
    cursor = await db.execute(
        "SELECT id, email, totp_enabled, language, auto_lock_minutes, master_key_salt FROM users WHERE id = ?",
        (payload["sub"],)
    )
    user = await cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    return {
        "id": user["id"],
        "email": user["email"],
        "totp_enabled": bool(user["totp_enabled"]),
        "language": user["language"],
        "auto_lock_minutes": user["auto_lock_minutes"],
        "master_key_salt": user["master_key_salt"]
    }

@api_router.post("/auth/logout")
async def logout(request: Request, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Logout user - log the action"""
    await log_audit(db, payload["sub"], "logout", request.client.host, request.headers.get("user-agent", ""), True)
    return {"message": "logged_out"}

# ============================================
# TOTP ENDPOINTS
# ============================================
@api_router.post("/auth/totp/setup", response_model=TOTPSetupResponse)
async def setup_totp(payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Setup TOTP 2FA"""
    cursor = await db.execute("SELECT email, totp_enabled FROM users WHERE id = ?", (payload["sub"],))
    user = await cursor.fetchone()
    
    if user["totp_enabled"]:
        raise HTTPException(status_code=400, detail="totp_already_enabled")
    
    # Generate TOTP secret
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=user["email"], issuer_name="PiVault")
    
    # Store secret temporarily (not enabled yet)
    await db.execute(
        "UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?",
        (secret, datetime.now(timezone.utc).isoformat(), payload["sub"])
    )
    await db.commit()
    
    return TOTPSetupResponse(
        secret=secret,
        otpauth_url=otpauth_url,
        qr_data=otpauth_url
    )

@api_router.post("/auth/totp/verify")
async def verify_totp_setup(data: TOTPVerify, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Verify and enable TOTP"""
    cursor = await db.execute("SELECT totp_secret FROM users WHERE id = ?", (payload["sub"],))
    user = await cursor.fetchone()
    
    if not user["totp_secret"]:
        raise HTTPException(status_code=400, detail="totp_not_setup")
    
    totp = pyotp.TOTP(user["totp_secret"])
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="invalid_code")
    
    # Enable TOTP
    await db.execute(
        "UPDATE users SET totp_enabled = 1, updated_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), payload["sub"])
    )
    await db.commit()
    
    return {"message": "totp_enabled"}

@api_router.post("/auth/totp/disable")
async def disable_totp(data: TOTPVerify, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Disable TOTP"""
    cursor = await db.execute("SELECT totp_secret, totp_enabled FROM users WHERE id = ?", (payload["sub"],))
    user = await cursor.fetchone()
    
    if not user["totp_enabled"]:
        raise HTTPException(status_code=400, detail="totp_not_enabled")
    
    totp = pyotp.TOTP(user["totp_secret"])
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="invalid_code")
    
    # Disable TOTP
    await db.execute(
        "UPDATE users SET totp_enabled = 0, totp_secret = NULL, updated_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), payload["sub"])
    )
    await db.commit()
    
    return {"message": "totp_disabled"}

# ============================================
# SETTINGS ENDPOINTS
# ============================================
@api_router.patch("/settings")
async def update_settings(settings: SettingsUpdate, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Update user settings"""
    updates = []
    values = []
    
    if settings.language:
        if settings.language not in ["en", "it"]:
            raise HTTPException(status_code=400, detail="invalid_language")
        updates.append("language = ?")
        values.append(settings.language)
    
    if settings.auto_lock_minutes is not None:
        if settings.auto_lock_minutes < 1 or settings.auto_lock_minutes > 60:
            raise HTTPException(status_code=400, detail="invalid_auto_lock")
        updates.append("auto_lock_minutes = ?")
        values.append(settings.auto_lock_minutes)
    
    if updates:
        updates.append("updated_at = ?")
        values.append(datetime.now(timezone.utc).isoformat())
        values.append(payload["sub"])
        
        await db.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
            values
        )
        await db.commit()
    
    return {"message": "settings_updated"}

# ============================================
# CATEGORIES ENDPOINTS
# ============================================
@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Get all categories for user"""
    cursor = await db.execute(
        "SELECT id, name, icon, created_at FROM categories WHERE user_id = ? ORDER BY name",
        (payload["sub"],)
    )
    rows = await cursor.fetchall()
    return [CategoryResponse(id=r["id"], name=r["name"], icon=r["icon"], created_at=r["created_at"]) for r in rows]

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Create a new category"""
    category_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO categories (id, user_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)",
        (category_id, payload["sub"], data.name, data.icon, now)
    )
    await db.commit()
    
    return CategoryResponse(id=category_id, name=data.name, icon=data.icon, created_at=now)

@api_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, data: CategoryCreate, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Update a category"""
    cursor = await db.execute(
        "SELECT id FROM categories WHERE id = ? AND user_id = ?",
        (category_id, payload["sub"])
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="category_not_found")
    
    await db.execute(
        "UPDATE categories SET name = ?, icon = ? WHERE id = ?",
        (data.name, data.icon, category_id)
    )
    await db.commit()
    
    cursor = await db.execute("SELECT created_at FROM categories WHERE id = ?", (category_id,))
    row = await cursor.fetchone()
    
    return CategoryResponse(id=category_id, name=data.name, icon=data.icon, created_at=row["created_at"])

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Delete a category"""
    cursor = await db.execute(
        "SELECT id FROM categories WHERE id = ? AND user_id = ?",
        (category_id, payload["sub"])
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="category_not_found")
    
    await db.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    await db.commit()
    
    return {"message": "category_deleted"}

# ============================================
# VAULT ENDPOINTS
# ============================================
@api_router.get("/vault", response_model=List[VaultEntryResponse])
async def get_vault_entries(
    category_id: Optional[str] = None,
    payload: dict = Depends(verify_jwt_token),
    db=Depends(get_db)
):
    """Get all vault entries for user"""
    if category_id:
        cursor = await db.execute(
            "SELECT id, encrypted_data, nonce, category_id, created_at, updated_at FROM vault_entries WHERE user_id = ? AND category_id = ? ORDER BY updated_at DESC",
            (payload["sub"], category_id)
        )
    else:
        cursor = await db.execute(
            "SELECT id, encrypted_data, nonce, category_id, created_at, updated_at FROM vault_entries WHERE user_id = ? ORDER BY updated_at DESC",
            (payload["sub"],)
        )
    
    rows = await cursor.fetchall()
    return [VaultEntryResponse(
        id=r["id"],
        encrypted_data=r["encrypted_data"],
        nonce=r["nonce"],
        category_id=r["category_id"],
        created_at=r["created_at"],
        updated_at=r["updated_at"]
    ) for r in rows]

@api_router.post("/vault", response_model=VaultEntryResponse)
async def create_vault_entry(data: VaultEntryCreate, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Create a new vault entry"""
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    await db.execute(
        "INSERT INTO vault_entries (id, user_id, category_id, encrypted_data, nonce, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (entry_id, payload["sub"], data.category_id, data.encrypted_data, data.nonce, now, now)
    )
    await db.commit()
    
    return VaultEntryResponse(
        id=entry_id,
        encrypted_data=data.encrypted_data,
        nonce=data.nonce,
        category_id=data.category_id,
        created_at=now,
        updated_at=now
    )

@api_router.put("/vault/{entry_id}", response_model=VaultEntryResponse)
async def update_vault_entry(entry_id: str, data: VaultEntryUpdate, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Update a vault entry"""
    cursor = await db.execute(
        "SELECT id, created_at FROM vault_entries WHERE id = ? AND user_id = ?",
        (entry_id, payload["sub"])
    )
    entry = await cursor.fetchone()
    if not entry:
        raise HTTPException(status_code=404, detail="entry_not_found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "UPDATE vault_entries SET encrypted_data = ?, nonce = ?, category_id = ?, updated_at = ? WHERE id = ?",
        (data.encrypted_data, data.nonce, data.category_id, now, entry_id)
    )
    await db.commit()
    
    return VaultEntryResponse(
        id=entry_id,
        encrypted_data=data.encrypted_data,
        nonce=data.nonce,
        category_id=data.category_id,
        created_at=entry["created_at"],
        updated_at=now
    )

@api_router.delete("/vault/{entry_id}")
async def delete_vault_entry(entry_id: str, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Delete a vault entry"""
    cursor = await db.execute(
        "SELECT id FROM vault_entries WHERE id = ? AND user_id = ?",
        (entry_id, payload["sub"])
    )
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="entry_not_found")
    
    await db.execute("DELETE FROM vault_entries WHERE id = ?", (entry_id,))
    await db.commit()
    
    return {"message": "entry_deleted"}

# ============================================
# EXPORT/IMPORT ENDPOINTS
# ============================================
@api_router.get("/export")
async def export_vault(payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Export all vault data (encrypted)"""
    # Get all entries
    cursor = await db.execute(
        "SELECT id, encrypted_data, nonce, category_id, created_at, updated_at FROM vault_entries WHERE user_id = ?",
        (payload["sub"],)
    )
    entries = await cursor.fetchall()
    
    # Get categories
    cursor = await db.execute(
        "SELECT id, name, icon, created_at FROM categories WHERE user_id = ?",
        (payload["sub"],)
    )
    categories = await cursor.fetchall()
    
    return {
        "entries": [dict(e) for e in entries],
        "categories": [dict(c) for c in categories],
        "version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/import")
async def import_vault(data: dict, payload: dict = Depends(verify_jwt_token), db=Depends(get_db)):
    """Import vault data"""
    imported_entries = 0
    imported_categories = 0
    
    # Import categories first
    category_map = {}  # old_id -> new_id
    for cat in data.get("categories", []):
        new_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO categories (id, user_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)",
            (new_id, payload["sub"], cat["name"], cat.get("icon", "folder"), datetime.now(timezone.utc).isoformat())
        )
        category_map[cat["id"]] = new_id
        imported_categories += 1
    
    # Import entries
    for entry in data.get("entries", []):
        new_category_id = category_map.get(entry.get("category_id"))
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO vault_entries (id, user_id, category_id, encrypted_data, nonce, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), payload["sub"], new_category_id, entry["encrypted_data"], entry["nonce"], now, now)
        )
        imported_entries += 1
    
    await db.commit()
    
    return {
        "message": "import_complete",
        "imported_entries": imported_entries,
        "imported_categories": imported_categories
    }

# ============================================
# UTILITY ENDPOINTS
# ============================================
@api_router.post("/password-strength", response_model=PasswordStrengthResponse)
async def check_password_strength(data: PasswordStrength):
    """Check password strength"""
    score, feedback = calculate_password_strength(data.password)
    return PasswordStrengthResponse(score=score, feedback=feedback)

@api_router.get("/")
async def root():
    """API health check"""
    return {"message": "PiVault API", "version": "1.0.0", "status": "healthy"}

@api_router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# Serve frontend static files in production
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_BUILD_DIR), html=True), name="frontend")
else:
    logger.warning(f"Frontend build directory not found at {FRONTEND_BUILD_DIR}. Static files will not be served.")

