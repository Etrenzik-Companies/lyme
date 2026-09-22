/**
 * Hashing and encryption for personal data.
 *
 * The rules this file exists to enforce:
 *   - Email addresses are stored encrypted (AES-GCM), never in plaintext.
 *   - A separate salted hash is the unique key, so duplicates can be detected without
 *     ever decrypting anything.
 *   - IP addresses and user-agents are stored only as salted hashes, for abuse
 *     forensics. The raw values never hit storage.
 *
 * Salts and keys come from Worker secrets. If a secret is missing in local dev we fall
 * back to a fixed development value and log loudly — never in production.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

const DEV_FALLBACK = 'dev-only-not-for-production';

function secret(env, name) {
  const value = env[name];
  if (value) return value;
  console.warn(`[crypto] ${name} is not set — using the development fallback. Do not ship this.`);
  return `${DEV_FALLBACK}:${name}`;
}

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex) =>
  new Uint8Array(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));

/** Salted SHA-256, hex encoded. Used for email_hash, ip_hash and ua_hash. */
export async function saltedHash(env, value, saltName) {
  const data = enc.encode(`${secret(env, saltName)}::${String(value).toLowerCase().trim()}`);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

export const hashEmail = (env, email) => saltedHash(env, email, 'EMAIL_HASH_SALT');
export const hashIp = (env, ip) => saltedHash(env, ip, 'IP_HASH_SALT');
export const hashUa = (env, ua) => saltedHash(env, ua, 'IP_HASH_SALT');

/** Plain SHA-256 for non-secret identifiers such as canonical news URLs. */
export async function sha256(value) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(String(value))));
}

async function aesKey(env) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret(env, 'EMAIL_ENC_KEY')));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** AES-GCM encrypt. Output is "<iv hex>.<ciphertext hex>". */
export async function encrypt(env, plaintext) {
  const key = await aesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(String(plaintext)));
  return `${toHex(iv)}.${toHex(ct)}`;
}

export async function decrypt(env, payload) {
  const [ivHex, ctHex] = String(payload).split('.');
  if (!ivHex || !ctHex) throw new Error('malformed ciphertext');
  const key = await aesKey(env);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(ivHex) },
    key,
    fromHex(ctHex)
  );
  return dec.decode(pt);
}

/** URL-safe random token for verification and self-service management links. */
export function token(bytes = 32) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Constant-time string compare, for tokens arriving from a URL. */
export function safeEqual(a, b) {
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
