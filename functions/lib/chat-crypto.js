const crypto = require('crypto');

const PBKDF2_ITERATIONS = 120000;
const ADMIN_IDS = ['토끼건축', 'RABBITARCHI'];

function normalizeUserKey(displayId) {
  return String(displayId || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 32);
}

function isValidPin(pin) {
  return /^\d{6}$/.test(String(pin || ''));
}

function isAdminDisplayId(displayId) {
  const trimmed = String(displayId || '').trim();
  if (!trimmed) {
    return false;
  }
  return ADMIN_IDS.some((id) => id.toLowerCase() === trimmed.toLowerCase());
}

function resolveCanonicalAdminId(displayId) {
  const trimmed = String(displayId || '').trim();
  return ADMIN_IDS.find((id) => id.toLowerCase() === trimmed.toLowerCase()) || trimmed;
}

function hashPin(pin, saltBuffer) {
  return crypto.pbkdf2Sync(String(pin), saltBuffer, PBKDF2_ITERATIONS, 32, 'sha256').toString('base64');
}

function createPinRecord(pin) {
  const saltBuffer = crypto.randomBytes(16);
  return {
    passwordHash: hashPin(pin, saltBuffer),
    salt: saltBuffer.toString('base64'),
    iterations: PBKDF2_ITERATIONS
  };
}

function verifyPinRecord(pin, record) {
  if (!record?.passwordHash || !record?.salt) {
    return false;
  }

  const saltBuffer = Buffer.from(record.salt, 'base64');
  const candidate = hashPin(pin, saltBuffer);
  const left = Buffer.from(candidate);
  const right = Buffer.from(String(record.passwordHash));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  PBKDF2_ITERATIONS,
  ADMIN_IDS,
  normalizeUserKey,
  isValidPin,
  isAdminDisplayId,
  resolveCanonicalAdminId,
  createPinRecord,
  verifyPinRecord,
  createSessionToken
};
