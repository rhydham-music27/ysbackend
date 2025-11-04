import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  try {
    const roundsFromEnv = process.env.BCRYPT_SALT_ROUNDS;
    const saltRounds = Number.isInteger(Number(roundsFromEnv))
      ? Math.max(4, Math.min(15, Number(roundsFromEnv)))
      : 10;
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (_error) {
    return false;
  }
}

export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < 8) errors.push('Password must be at least 8 characters long.');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character.');

  return { isValid: errors.length === 0, errors };
}

export function generateRandomPassword(length: number = 32): string {
  const bytes = crypto.randomBytes(Math.ceil(length * 0.75));
  // Base64 yields ~4/3 expansion; trim and restrict to URL-safe alphanumerics
  const base = bytes
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, length);
  // Ensure minimum length even after filtering
  if (base.length >= length) return base;
  const extra = crypto.randomBytes(length).toString('hex');
  return (base + extra).slice(0, length);
}


