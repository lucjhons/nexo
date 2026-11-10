import crypto from 'crypto';

// Secret key for AES-256-GCM encryption of sensitive data (like CPF)
// In production this is loaded from environment variables
const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.DATA_ENCRYPTION_KEY, 'nexo-salt-salt', 32)
  : crypto.scryptSync('nexo-secure-system-key-2026-default', 'nexo-salt-salt', 32);

const ALGORITHM = 'aes-256-gcm';

/**
 * Hash password using PBKDF2 with SHA-512 and unique salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `${salt}:${iterations}:${hash}`;
}

/**
 * Verify password against stored hash using constant-time comparison
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, iterationsStr, hash] = storedHash.split(':');
    const iterations = parseInt(iterationsStr, 10);
    const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Encrypt sensitive fields (CPF, private documents) using AES-256-GCM
 */
export function encryptSensitiveData(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt sensitive fields
 */
export function decryptSensitiveData(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  try {
    const [ivHex, authTagHex, encrypted] = encryptedPayload.split(':');
    if (!ivHex || !authTagHex || !encrypted) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '[DADO PROTEGIDO]';
  }
}

/**
 * Mask CPF for UI display (e.g., ***.***.890-00)
 */
export function maskCPF(cpf: string): string {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `***.***.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

/**
 * Hash a password recovery code for secure storage (never store recovery codes in plain text)
 */
export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Generate a cryptographically secure 6-digit numeric verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
