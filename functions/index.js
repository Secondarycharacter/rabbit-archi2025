const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const {
  normalizeUserKey,
  isValidPin,
  isAdminDisplayId,
  resolveCanonicalAdminId,
  createPinRecord,
  verifyPinRecord,
  createSessionToken
} = require('./lib/chat-crypto');

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const USERS_COLLECTION = 'homepageChatUsers';
const ROOMS_COLLECTION = 'homepageChatRooms';
const SESSIONS_COLLECTION = 'homepageChatSessions';
const PIN_ATTEMPTS_COLLECTION = 'homepageChatPinAttempts';

const MAX_MESSAGE_LENGTH = 500;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24;
const INACTIVITY_MS = 1000 * 60 * 60 * 24 * 90;
const PIN_ATTEMPT_LIMIT = 5;
const PIN_LOCK_MS = 1000 * 60 * 15;

// Shared with history admin hash and metaverse OVERVIEW_ADMIN_PASSCODE ("1031!@").
function getAdminPassword() {
  return process.env.CHAT_ADMIN_PASSWORD || '1031!@';
}

function buildRoomKey(channel, projectId) {
  return `${channel}:${projectId}`;
}

function normalizeMessageText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeDisplayId(displayId) {
  return String(displayId || '').trim().slice(0, 16);
}

async function readPinAttempts(userKey) {
  const snapshot = await db.collection(PIN_ATTEMPTS_COLLECTION).doc(userKey).get();
  if (!snapshot.exists) {
    return { count: 0, lockedUntil: 0 };
  }
  const data = snapshot.data() || {};
  return {
    count: Number(data.count) || 0,
    lockedUntil: Number(data.lockedUntil) || 0
  };
}

async function assertPinNotLocked(userKey) {
  const attempts = await readPinAttempts(userKey);
  if (attempts.lockedUntil > Date.now()) {
    const minutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
    throw new HttpsError(
      'resource-exhausted',
      `비밀번호 시도 횟수를 초과했습니다. ${minutes}분 후 다시 시도해주세요.`
    );
  }
}

async function recordPinFailure(userKey) {
  const attempts = await readPinAttempts(userKey);
  const nextCount = attempts.count + 1;
  const ref = db.collection(PIN_ATTEMPTS_COLLECTION).doc(userKey);

  if (nextCount >= PIN_ATTEMPT_LIMIT) {
    await ref.set({ count: 0, lockedUntil: Date.now() + PIN_LOCK_MS }, { merge: true });
    throw new HttpsError(
      'resource-exhausted',
      '비밀번호 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.'
    );
  }

  await ref.set({ count: nextCount, lockedUntil: 0 }, { merge: true });
}

async function clearPinFailures(userKey) {
  await db.collection(PIN_ATTEMPTS_COLLECTION).doc(userKey).set(
    { count: 0, lockedUntil: 0 },
    { merge: true }
  );
}

async function getUserRecord(userKey) {
  const snapshot = await db.collection(USERS_COLLECTION).doc(userKey).get();
  if (!snapshot.exists) {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

async function touchUserActivity(userKey) {
  await db.collection(USERS_COLLECTION).doc(userKey).set(
    { lastActiveAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

async function createSession(userKey, displayId) {
  const sessionToken = createSessionToken();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + SESSION_TTL_MS);

  await db.collection(SESSIONS_COLLECTION).doc(sessionToken).set({
    userKey,
    displayId,
    expiresAt,
    createdAt: FieldValue.serverTimestamp()
  });

  return {
    userKey,
    displayId,
    sessionToken,
    expiresAt: expiresAt.toDate().toISOString()
  };
}

async function resolveSession(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const snapshot = await db.collection(SESSIONS_COLLECTION).doc(String(sessionToken)).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() || {};
  const expiresAt = data.expiresAt?.toMillis?.() || 0;
  if (expiresAt <= Date.now()) {
    await snapshot.ref.delete().catch(() => {});
    return null;
  }

  return {
    userKey: data.userKey,
    displayId: data.displayId,
    sessionToken: snapshot.id
  };
}

async function authenticateWithPin(displayId, pin, options = {}) {
  const userKey = normalizeUserKey(displayId);
  const trimmedDisplayId = sanitizeDisplayId(displayId);

  if (!userKey) {
    throw new HttpsError('invalid-argument', '아이디를 입력해주세요.');
  }

  if (isAdminDisplayId(trimmedDisplayId)) {
    throw new HttpsError('invalid-argument', '관리자 아이디는 별도 인증을 사용합니다.');
  }

  if (!isValidPin(pin)) {
    throw new HttpsError('invalid-argument', '6자리 숫자 비밀번호를 입력해주세요.');
  }

  await assertPinNotLocked(userKey);

  const existing = await getUserRecord(userKey);
  if (!existing) {
    if (options.registerOnly) {
      throw new HttpsError('not-found', '등록되지 않은 아이디입니다.');
    }

    const pinRecord = createPinRecord(pin);
    await db.collection(USERS_COLLECTION).doc(userKey).set({
      displayId: trimmedDisplayId,
      passwordHash: pinRecord.passwordHash,
      salt: pinRecord.salt,
      iterations: pinRecord.iterations,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp()
    });

    await clearPinFailures(userKey);
    return createSession(userKey, trimmedDisplayId);
  }

  if (options.registerOnly) {
    throw new HttpsError('already-exists', '이미 사용 중인 아이디입니다.');
  }

  const valid = verifyPinRecord(pin, existing);
  if (!valid) {
    await recordPinFailure(userKey);
    throw new HttpsError('permission-denied', '비밀번호가 올바르지 않습니다.');
  }

  await clearPinFailures(userKey);
  await touchUserActivity(userKey);
  return createSession(userKey, existing.displayId || trimmedDisplayId);
}

async function resolveAuthorFromRequest(data) {
  if (data.guest === true) {
    return {
      authorId: 'guest',
      author: 'GUEST',
      session: null
    };
  }

  const session = await resolveSession(data.sessionToken);
  if (session) {
    if (String(session.userKey).startsWith('admin:')) {
      return {
        authorId: session.userKey,
        author: session.displayId,
        session
      };
    }

    await touchUserActivity(session.userKey);
    return {
      authorId: session.userKey,
      author: session.displayId,
      session
    };
  }

  const adminDisplayId = sanitizeDisplayId(data.adminDisplayId);
  if (adminDisplayId && isAdminDisplayId(adminDisplayId) && data.adminPassword) {
    if (data.adminPassword !== getAdminPassword()) {
      throw new HttpsError('permission-denied', '관리자 비밀번호가 올바르지 않습니다.');
    }

    const canonical = resolveCanonicalAdminId(adminDisplayId);
    return {
      authorId: `admin:${normalizeUserKey(canonical)}`,
      author: canonical,
      session: null
    };
  }

  const displayId = sanitizeDisplayId(data.displayId);
  const pin = String(data.pin || '').trim();
  if (!displayId || !pin) {
    throw new HttpsError('unauthenticated', '아이디와 비밀번호를 입력해주세요.');
  }

  const authSession = await authenticateWithPin(displayId, pin);
  return {
    authorId: authSession.userKey,
    author: authSession.displayId,
    session: authSession
  };
}

async function resolveOwnerForManage(data, messageAuthorId) {
  const session = await resolveSession(data.sessionToken);
  if (session && session.userKey === messageAuthorId) {
    await touchUserActivity(session.userKey);
    return session;
  }

  const displayId = sanitizeDisplayId(data.displayId);
  const pin = String(data.pin || '').trim();
  if (!displayId || !pin) {
    throw new HttpsError('unauthenticated', '비밀번호 확인이 필요합니다.');
  }

  const authSession = await authenticateWithPin(displayId, pin);
  if (authSession.userKey !== messageAuthorId) {
    throw new HttpsError('permission-denied', '본인의 메시지만 수정·삭제할 수 있습니다.');
  }

  return authSession;
}

function pickTone(author) {
  const hash = [...String(author)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const tones = ['mint', 'orange', 'purple', 'slate'];
  return tones[hash % tones.length];
}

async function writeRoomMessage(channel, projectId, payload) {
  const roomKey = buildRoomKey(channel, projectId);
  const roomRef = db.collection(ROOMS_COLLECTION).doc(roomKey);

  await roomRef.set(
    {
      channel,
      projectId,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  const messageRef = await roomRef.collection('messages').add({
    authorId: payload.authorId,
    author: payload.author,
    text: payload.text,
    tone: payload.tone,
    isSystem: Boolean(payload.isSystem),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: null
  });

  return messageRef.id;
}

exports.chatAuth = onCall({ cors: true }, async (request) => {
  const displayId = sanitizeDisplayId(request.data?.displayId);
  const pin = String(request.data?.pin || '').trim();

  const session = await authenticateWithPin(displayId, pin);
  return session;
});

exports.chatAdminAuth = onCall({ cors: true }, async (request) => {
  const adminDisplayId = sanitizeDisplayId(request.data?.adminDisplayId);
  const adminPassword = String(request.data?.adminPassword || '');

  if (!isAdminDisplayId(adminDisplayId)) {
    throw new HttpsError('invalid-argument', '관리자 아이디가 올바르지 않습니다.');
  }

  if (adminPassword !== getAdminPassword()) {
    throw new HttpsError('permission-denied', '관리자 비밀번호가 올바르지 않습니다.');
  }

  const canonical = resolveCanonicalAdminId(adminDisplayId);
  const sessionToken = createSessionToken();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + SESSION_TTL_MS);
  const userKey = `admin:${normalizeUserKey(canonical)}`;

  await db.collection(SESSIONS_COLLECTION).doc(sessionToken).set({
    userKey,
    displayId: canonical,
    isAdmin: true,
    expiresAt,
    createdAt: FieldValue.serverTimestamp()
  });

  return {
    userKey,
    displayId: canonical,
    sessionToken,
    expiresAt: expiresAt.toDate().toISOString(),
    isAdmin: true
  };
});

exports.chatPostMessage = onCall({ cors: true }, async (request) => {
  const channel = String(request.data?.channel || '').trim();
  const projectId = String(request.data?.projectId || '').trim();
  const text = normalizeMessageText(request.data?.text).slice(0, MAX_MESSAGE_LENGTH);

  if (!channel || !projectId) {
    throw new HttpsError('invalid-argument', '채팅방 정보가 올바르지 않습니다.');
  }

  if (!text) {
    throw new HttpsError('invalid-argument', '메시지를 입력해주세요.');
  }

  const authorInfo = await resolveAuthorFromRequest(request.data || {});
  const tone = authorInfo.authorId === 'guest'
    ? pickTone('GUEST')
    : authorInfo.authorId.startsWith('admin:')
      ? pickTone(authorInfo.author)
      : 'green';

  const messageId = await writeRoomMessage(channel, projectId, {
    authorId: authorInfo.authorId,
    author: authorInfo.author,
    text,
    tone,
    isSystem: false
  });

  return {
    messageId,
    session: authorInfo.session
  };
});

exports.chatUpdateMessage = onCall({ cors: true }, async (request) => {
  const channel = String(request.data?.channel || '').trim();
  const projectId = String(request.data?.projectId || '').trim();
  const messageId = String(request.data?.messageId || '').trim();
  const text = normalizeMessageText(request.data?.text).slice(0, MAX_MESSAGE_LENGTH);

  if (!channel || !projectId || !messageId) {
    throw new HttpsError('invalid-argument', '메시지 정보가 올바르지 않습니다.');
  }

  if (!text) {
    throw new HttpsError('invalid-argument', '메시지를 입력해주세요.');
  }

  const roomKey = buildRoomKey(channel, projectId);
  const messageRef = db.collection(ROOMS_COLLECTION).doc(roomKey).collection('messages').doc(messageId);
  const snapshot = await messageRef.get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', '메시지를 찾을 수 없습니다.');
  }

  const message = snapshot.data() || {};
  if (message.isSystem || message.authorId === 'guest' || String(message.authorId).startsWith('admin:')) {
    throw new HttpsError('permission-denied', '수정할 수 없는 메시지입니다.');
  }

  const session = await resolveOwnerForManage(request.data || {}, message.authorId);

  await messageRef.update({
    text,
    updatedAt: FieldValue.serverTimestamp()
  });

  return { ok: true, session };
});

exports.chatDeleteMessage = onCall({ cors: true }, async (request) => {
  const channel = String(request.data?.channel || '').trim();
  const projectId = String(request.data?.projectId || '').trim();
  const messageId = String(request.data?.messageId || '').trim();

  if (!channel || !projectId || !messageId) {
    throw new HttpsError('invalid-argument', '메시지 정보가 올바르지 않습니다.');
  }

  if (messageId === 'opening') {
    throw new HttpsError('permission-denied', '삭제할 수 없는 메시지입니다.');
  }

  const roomKey = buildRoomKey(channel, projectId);
  const messageRef = db.collection(ROOMS_COLLECTION).doc(roomKey).collection('messages').doc(messageId);
  const snapshot = await messageRef.get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', '메시지를 찾을 수 없습니다.');
  }

  const message = snapshot.data() || {};
  if (message.isSystem || message.authorId === 'guest' || String(message.authorId).startsWith('admin:')) {
    throw new HttpsError('permission-denied', '삭제할 수 없는 메시지입니다.');
  }

  await resolveOwnerForManage(request.data || {}, message.authorId);
  await messageRef.delete();

  return { ok: true };
});

exports.chatEnsureOpening = onCall({ cors: true }, async (request) => {
  const channel = String(request.data?.channel || '').trim();
  const projectId = String(request.data?.projectId || '').trim();
  const projectName = String(request.data?.projectName || '프로젝트').trim() || '프로젝트';

  if (!channel || !projectId) {
    throw new HttpsError('invalid-argument', '채팅방 정보가 올바르지 않습니다.');
  }

  const roomKey = buildRoomKey(channel, projectId);
  const roomRef = db.collection(ROOMS_COLLECTION).doc(roomKey);
  const openingRef = roomRef.collection('messages').doc('opening');
  const openingSnapshot = await openingRef.get();

  if (openingSnapshot.exists) {
    return { ok: true, created: false };
  }

  await roomRef.set(
    {
      channel,
      projectId,
      projectName,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  await openingRef.set({
    authorId: 'system',
    author: '토끼건축',
    text: `"${projectName}"에 대한 의견을 남겨주세요`,
    tone: 'mint',
    isSystem: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: null
  });

  return { ok: true, created: true };
});

exports.chatCleanupInactiveUsers = onSchedule(
  {
    schedule: 'every day 04:00',
    timeZone: 'Asia/Seoul'
  },
  async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - INACTIVITY_MS);
    const staleUsers = await db
      .collection(USERS_COLLECTION)
      .where('lastActiveAt', '<', cutoff)
      .limit(50)
      .get();

    if (staleUsers.empty) {
      return;
    }

    const batch = db.batch();
    staleUsers.docs.forEach((entry) => {
      batch.delete(entry.ref);
    });
    await batch.commit();

    const expiredSessions = await db
      .collection(SESSIONS_COLLECTION)
      .where('expiresAt', '<', admin.firestore.Timestamp.now())
      .limit(100)
      .get();

    if (!expiredSessions.empty) {
      const sessionBatch = db.batch();
      expiredSessions.docs.forEach((entry) => {
        sessionBatch.delete(entry.ref);
      });
      await sessionBatch.commit();
    }
  }
);
