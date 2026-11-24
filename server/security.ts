import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const E2EE_SALT = Buffer.from('shopbag-e2ee-v1', 'utf8');
const CHANNEL_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CHANNELS = 2000;

interface E2eeChannel {
  aesKey: Buffer;
  expiresAt: number;
}

const channels = new Map<string, E2eeChannel>();

function pruneExpiredChannels(): void {
  const now = Date.now();
  for (const [id, entry] of channels.entries()) {
    if (entry.expiresAt <= now) {
      channels.delete(id);
    }
  }
  while (channels.size >= MAX_CHANNELS) {
    const oldestKey = channels.keys().next().value;
    if (!oldestKey) break;
    channels.delete(oldestKey);
  }
}

export function performE2eeHandshake(clientPublicKeyB64: string): {
  channelId: string;
  serverPublicKey: string;
  expiresAt: number;
} {
  if (typeof clientPublicKeyB64 !== 'string' || clientPublicKeyB64.length === 0 || clientPublicKeyB64.length > 512) {
    throw new Error('Kunci publik klien tidak valid.');
  }

  const clientPubBuf = Buffer.from(clientPublicKeyB64, 'base64');
  // Uncompressed P-256 point is 65 bytes starting with 0x04
  if (clientPubBuf.length !== 65 || clientPubBuf[0] !== 0x04) {
    throw new Error('Format kunci ECDH P-256 tidak valid.');
  }

  const serverEcdh = crypto.createECDH('prime256v1');
  serverEcdh.generateKeys();

  const sharedSecret = serverEcdh.computeSecret(clientPubBuf);
  const channelId = crypto.randomUUID();
  const derived = crypto.hkdfSync(
    'sha256',
    sharedSecret,
    E2EE_SALT,
    Buffer.from(channelId, 'utf8'),
    32
  );
  const aesKey = Buffer.from(derived);
  const expiresAt = Date.now() + CHANNEL_TTL_MS;

  pruneExpiredChannels();
  channels.set(channelId, { aesKey, expiresAt });

  return {
    channelId,
    serverPublicKey: serverEcdh.getPublicKey('base64'),
    expiresAt,
  };
}

export function decryptE2eePayload(
  channelId: string,
  ivB64: string,
  ciphertextB64: string,
  aadContext: string
): unknown {
  const channel = channels.get(channelId);
  if (!channel || channel.expiresAt <= Date.now()) {
    if (channel) channels.delete(channelId);
    const err = new Error('Sesi enkripsi berakhir. Silakan ulangi.') as Error & { code?: string };
    err.code = 'E2EE_CHANNEL_EXPIRED';
    throw err;
  }

  const iv = Buffer.from(ivB64, 'base64');
  const combined = Buffer.from(ciphertextB64, 'base64');
  if (iv.length !== 12 || combined.length < 17) {
    throw new Error('Payload terenkripsi tidak valid.');
  }

  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', channel.aesKey, iv);
  decipher.setAAD(Buffer.from(`${channelId}:${aadContext}`, 'utf8'));
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function encryptE2eePayload(
  channelId: string,
  data: unknown,
  aadContext: string
): { e2ee: true; channelId: string; iv: string; ciphertext: string } | null {
  const channel = channels.get(channelId);
  if (!channel || channel.expiresAt <= Date.now()) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', channel.aesKey, iv);
  cipher.setAAD(Buffer.from(`${channelId}:${aadContext}`, 'utf8'));

  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  return {
    e2ee: true,
    channelId,
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

export function e2eeBodyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object' || body.e2ee !== true) {
    next();
    return;
  }

  const { channelId, iv, ciphertext } = body;
  if (typeof channelId !== 'string' || typeof iv !== 'string' || typeof ciphertext !== 'string') {
    res.status(400).json({ error: 'Amplop enkripsi tidak lengkap.' });
    return;
  }

  try {
    const fullPath = req.originalUrl.split('?')[0];
    const aadContext = `${req.method.toUpperCase()}:${fullPath}`;
    const decrypted = decryptE2eePayload(channelId, iv, ciphertext, aadContext);
    if (!decrypted || typeof decrypted !== 'object' || Array.isArray(decrypted)) {
      res.status(400).json({ error: 'Isi payload terenkripsi tidak valid.' });
      return;
    }
    req.body = decrypted;
    res.locals.e2eeChannelId = channelId;
    res.locals.e2eeAad = aadContext;
    next();
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    if (code === 'E2EE_CHANNEL_EXPIRED') {
      res.status(428).json({ error: 'Kunci enkripsi perlu diperbarui.', code: 'E2EE_CHANNEL_EXPIRED' });
      return;
    }
    res.status(400).json({ error: 'Dekripsi payload gagal.' });
  }
}

export function sendSecureJson(req: Request, res: Response, statusCode: number, data: unknown): void {
  const channelId = (res.locals.e2eeChannelId as string | undefined) ?? req.header('x-e2ee-channel') ?? undefined;
  const fullPath = req.originalUrl.split('?')[0];
  const aadContext = (res.locals.e2eeAad as string | undefined) ?? `${req.method.toUpperCase()}:${fullPath}`;
  if (channelId) {
    const encrypted = encryptE2eePayload(channelId, data, aadContext);
    if (encrypted) {
      res.status(statusCode).json(encrypted);
      return;
    }
  }
  res.status(statusCode).json(data);
}

// Password hashing with scrypt + per-password random salt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

// Brute-force login rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 15;

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  entry.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// Magic byte image validation (JPG, PNG, WebP)
export function detectImageExtension(buffer: Buffer): '.jpg' | '.png' | '.webp' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp';
  }

  return null;
}
