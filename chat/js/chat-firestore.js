import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { chatDb } from './chat-firebase.js';
import { createPinRecord, normalizeUserKey, verifyPinRecord } from './chat-crypto.js';

const USERS_COLLECTION = 'homepageChatUsers';
const ROOMS_COLLECTION = 'homepageChatRooms';
const ADMIN_PASSWORD = '1031!@';
const PIN_ATTEMPT_LIMIT = 5;
const PIN_LOCK_MS = 1000 * 60 * 15;

function messagesCollectionRef(roomKey) {
  return collection(chatDb, ROOMS_COLLECTION, roomKey, 'messages');
}

function roomDocRef(roomKey) {
  return doc(chatDb, ROOMS_COLLECTION, roomKey);
}

function userDocRef(userKey) {
  return doc(chatDb, USERS_COLLECTION, userKey);
}

export function buildRoomKey(channel, projectId) {
  return `${channel}:${projectId}`;
}

function safeGetLocal(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocal(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function pinAttemptKey(userKey) {
  return `rabbit-chat-pin-attempts:${userKey}`;
}

function readPinAttempts(userKey) {
  const raw = safeGetLocal(pinAttemptKey(userKey));
  if (!raw) {
    return { count: 0, lockedUntil: 0 };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed.count) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0
    };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writePinAttempts(userKey, data) {
  safeSetLocal(pinAttemptKey(userKey), JSON.stringify(data));
}

function assertPinNotLocked(userKey) {
  const attempts = readPinAttempts(userKey);
  if (attempts.lockedUntil > Date.now()) {
    const minutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
    throw new Error(`비밀번호 시도 횟수를 초과했습니다. ${minutes}분 후 다시 시도해주세요.`);
  }
}

function recordPinFailure(userKey) {
  const attempts = readPinAttempts(userKey);
  const nextCount = attempts.count + 1;
  if (nextCount >= PIN_ATTEMPT_LIMIT) {
    writePinAttempts(userKey, { count: 0, lockedUntil: Date.now() + PIN_LOCK_MS });
    throw new Error('비밀번호 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.');
  }
  writePinAttempts(userKey, { count: nextCount, lockedUntil: 0 });
}

function clearPinFailures(userKey) {
  writePinAttempts(userKey, { count: 0, lockedUntil: 0 });
}

function firestoreErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'permission-denied' || String(error?.message || '').includes('permission-denied')) {
    return '채팅 저장 권한이 없습니다. Firestore 규칙을 다시 배포해주세요.';
  }
  if (typeof error?.message === 'string' && error.message) {
    return error.message;
  }
  return '요청 처리에 실패했습니다.';
}

function toSession(userKey, displayId, extra = {}) {
  return {
    userKey,
    displayId,
    sessionToken: userKey,
    isAdmin: Boolean(extra.isAdmin)
  };
}

async function getUserRecord(userKey) {
  const snapshot = await getDoc(userDocRef(userKey));
  if (!snapshot.exists()) {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

async function registerUser(userKey, displayId, password) {
  const pinRecord = await createPinRecord(password);
  await setDoc(userDocRef(userKey), {
    displayId,
    passwordHash: pinRecord.passwordHash,
    salt: pinRecord.salt,
    iterations: pinRecord.iterations,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp()
  });
  return toSession(userKey, displayId);
}

async function signInOrRegister(displayId, password, options = {}) {
  const trimmed = String(displayId || '').trim().slice(0, 16);
  const userKey = options.userKey || normalizeUserKey(trimmed);
  if (!userKey) {
    throw new Error('아이디를 입력해주세요.');
  }

  assertPinNotLocked(userKey);

  const existing = await getUserRecord(userKey);
  if (!existing) {
    const session = await registerUser(userKey, trimmed, password);
    clearPinFailures(userKey);
    return options.isAdmin ? { ...session, isAdmin: true } : session;
  }

  const valid = await verifyPinRecord(password, existing);
  if (!valid) {
    recordPinFailure(userKey);
    throw new Error('비밀번호가 올바르지 않습니다.');
  }

  clearPinFailures(userKey);
  try {
    await updateDoc(userDocRef(userKey), { lastActiveAt: serverTimestamp() });
  } catch {
    /* ignore */
  }

  return toSession(userKey, existing.displayId || trimmed, { isAdmin: options.isAdmin });
}

export async function ensureUserForPost(displayId, pin) {
  return signInOrRegister(displayId, pin);
}

export async function authenticateUser(displayId, pin) {
  return ensureUserForPost(displayId, pin);
}

export async function verifyUserPin(displayId, pin) {
  return ensureUserForPost(displayId, pin);
}

export async function authenticateAdmin(displayId, adminPassword) {
  if (adminPassword !== ADMIN_PASSWORD) {
    throw new Error('관리자 비밀번호가 올바르지 않습니다.');
  }

  const trimmed = String(displayId || '').trim().slice(0, 16);
  return signInOrRegister(trimmed, ADMIN_PASSWORD, {
    userKey: normalizeUserKey(trimmed),
    isAdmin: true
  });
}

export async function ensureOpeningMessage(channel, project) {
  const projectId = project?.id;
  if (!projectId) {
    return;
  }

  const roomKey = buildRoomKey(channel, projectId);
  const openingRef = doc(messagesCollectionRef(roomKey), 'opening');
  const openingSnapshot = await getDoc(openingRef);
  if (openingSnapshot.exists()) {
    return;
  }

  const projectName = String(
    project.designOverviewTitle || project.title || project.id || '프로젝트'
  ).trim();

  await setDoc(
    roomDocRef(roomKey),
    {
      channel,
      projectId,
      projectName,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await setDoc(openingRef, {
    authorId: 'system',
    author: '토끼건축',
    text: `"${projectName}"에 대한 의견을 남겨주세요`,
    tone: 'mint',
    isSystem: true,
    createdAt: serverTimestamp(),
    updatedAt: null
  });
}

export function subscribeRoomMessages(channel, projectId, onMessages, onError) {
  const roomKey = buildRoomKey(channel, projectId);
  const messagesQuery = query(messagesCollectionRef(roomKey), orderBy('createdAt', 'asc'));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((entry) => {
        const data = entry.data();
        const createdAt = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString();
        const updatedAt = data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt || null;

        return {
          id: entry.id,
          authorId: data.authorId || 'guest',
          author: data.author || 'GUEST',
          text: data.text || '',
          tone: data.tone || 'slate',
          isSystem: Boolean(data.isSystem),
          createdAt,
          updatedAt
        };
      });
      onMessages(messages.filter((message) => message.text));
    },
    (error) => {
      onError?.(error);
    }
  );
}

function pickTone(author, self) {
  if (self) {
    return 'green';
  }
  const hash = [...String(author)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const tones = ['mint', 'orange', 'purple', 'slate'];
  return tones[hash % tones.length];
}

export async function addRoomMessage(channel, projectId, message, session) {
  const roomKey = buildRoomKey(channel, projectId);
  const authorId = session?.userKey;
  const author = session?.displayId || message.displayId;

  if (!authorId || !author) {
    throw new Error('아이디와 비밀번호를 입력한 뒤 메시지를 보낼 수 있습니다.');
  }

  const tone = session?.isAdmin ? pickTone(author, false) : 'green';

  try {
    await setDoc(
      roomDocRef(roomKey),
      {
        channel,
        projectId,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    const docRef = await addDoc(messagesCollectionRef(roomKey), {
      authorId,
      author,
      text: message.text,
      tone,
      isSystem: false,
      createdAt: serverTimestamp(),
      updatedAt: null
    });

    return {
      messageId: docRef.id,
      session
    };
  } catch (error) {
    throw new Error(firestoreErrorMessage(error));
  }
}

export async function updateRoomMessage(channel, projectId, messageId, text) {
  const roomKey = buildRoomKey(channel, projectId);
  await updateDoc(doc(chatDb, ROOMS_COLLECTION, roomKey, 'messages', messageId), {
    text,
    updatedAt: serverTimestamp()
  });
}

export async function deleteRoomMessage(channel, projectId, messageId) {
  if (messageId === 'opening') {
    throw new Error('삭제할 수 없는 메시지입니다.');
  }
  const roomKey = buildRoomKey(channel, projectId);
  await deleteDoc(doc(chatDb, ROOMS_COLLECTION, roomKey, 'messages', messageId));
}

export { normalizeUserKey };
