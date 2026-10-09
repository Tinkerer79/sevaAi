import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey() {
  const value = String(process.env.PII_ENCRYPTION_KEY || '').trim();
  if (!value) {
    const error = new Error('PII_ENCRYPTION_KEY is not configured.');
    error.code = 'PII_KEY_MISSING';
    throw error;
  }
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) {
    const error = new Error('PII_ENCRYPTION_KEY must encode exactly 32 bytes.');
    error.code = 'PII_KEY_INVALID';
    throw error;
  }
  return key;
}

export function encryptPrivate(value, purpose) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`sevamanipur:v1:${purpose}`));
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64url')}:${encrypted.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}`;
}

export function decryptPrivate(value, purpose) {
  const [version, ivPart, dataPart, tagPart, extra] = String(value || '').split(':');
  if (version !== 'v1' || !ivPart || !dataPart || !tagPart || extra) {
    throw new Error('Encrypted private data has an unsupported format.');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAAD(Buffer.from(`sevamanipur:v1:${purpose}`));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}
