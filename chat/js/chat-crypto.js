const PBKDF2_ITERATIONS = 120000;

function encodeBase64(bytes) {
  const chunk = [];
  bytes.forEach((byte) => chunk.push(String.fromCharCode(byte)));
  return btoa(chunk.join(''));
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function normalizeUserKey(displayId) {
  return String(displayId || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 32);
}

export function isValidPin(pin) {
  return /^\d{6}$/.test(String(pin || ''));
}

export function emailForUserKey(userKey) {
  const bytes = new TextEncoder().encode(String(userKey || ''));
  let hex = '';
  bytes.forEach((byte) => {
    hex += byte.toString(16).padStart(2, '0');
  });
  return `u${hex}@chat.rabbit-archi.local`;
}

export async function hashPin(pin, saltBytes) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(pin)),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return encodeBase64(new Uint8Array(derived));
}

export async function createPinRecord(pin) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPin(pin, saltBytes);

  return {
    passwordHash,
    salt: encodeBase64(saltBytes),
    iterations: PBKDF2_ITERATIONS
  };
}

export async function verifyPinRecord(pin, record) {
  if (!record?.passwordHash || !record?.salt) {
    return false;
  }

  const saltBytes = decodeBase64(record.salt);
  const candidate = await hashPin(pin, saltBytes);
  return candidate === record.passwordHash;
}
