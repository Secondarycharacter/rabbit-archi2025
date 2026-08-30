import {
  addRoomMessage,
  authenticateAdmin,
  deleteRoomMessage,
  ensureOpeningMessage,
  ensureUserForPost,
  subscribeRoomMessages,
  updateRoomMessage,
  verifyUserPin
} from './chat-firestore.js';
import { isValidPin, normalizeUserKey } from './chat-crypto.js';

const VALID_TONES = new Set(['mint', 'green', 'orange', 'purple', 'slate']);
const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_GUEST_ID = 'GUEST';
const ADMIN_IDS = ['토끼건축', 'RABBITARCHI', '토기건축'];
const ADMIN_CANONICAL = {
  토기건축: '토끼건축'
};
const CHAT_SESSION_KEY = 'rabbit-homepage-chat-user-session';
const CHAT_SESSION_EVENT = 'rabbit-homepage-chat-session-changed';
const CHAT_PIN_PLACEHOLDER = '비번은 숫자6자 내용수정,삭제시 필요합니다';

let memorySession = null;

try {
  window.sessionStorage.removeItem(CHAT_SESSION_KEY);
  window.localStorage.removeItem(CHAT_SESSION_KEY);
} catch {
  /* ignore leftover storage from older builds */
}

function normalizeAdminId(value) {
  return String(value || '').trim();
}

function isAdminId(value) {
  const trimmed = normalizeAdminId(value);
  if (!trimmed) {
    return false;
  }
  return ADMIN_IDS.some((id) => id.toLowerCase() === trimmed.toLowerCase());
}

function resolveCanonicalAdminId(value) {
  const trimmed = normalizeAdminId(value);
  if (ADMIN_CANONICAL[trimmed]) {
    return ADMIN_CANONICAL[trimmed];
  }
  return ADMIN_IDS.find((id) => id.toLowerCase() === trimmed.toLowerCase()) || trimmed;
}

function isSessionValid(session) {
  return Boolean(session?.userKey);
}

function getChatSession() {
  if (!memorySession?.userKey || !memorySession?.displayId) {
    return null;
  }
  return memorySession;
}

function clearChatSession() {
  memorySession = null;
  try {
    window.sessionStorage.removeItem(CHAT_SESSION_KEY);
    window.localStorage.removeItem(CHAT_SESSION_KEY);
  } catch {
    /* ignore */
  }
  document.dispatchEvent(new CustomEvent(CHAT_SESSION_EVENT));
}

function setChatSession(session) {
  if (!session?.userKey || !session?.displayId) {
    clearChatSession();
    return;
  }
  memorySession = {
    userKey: session.userKey,
    displayId: session.displayId,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt || null,
    isAdmin: Boolean(session.isAdmin),
    verifiedAt: Date.now()
  };
  document.dispatchEvent(new CustomEvent(CHAT_SESSION_EVENT));
}

async function ensureAdminAccess(adminId) {
  const canonical = resolveCanonicalAdminId(adminId);
  const current = getChatSession();

  if (
    current?.isAdmin &&
    current.displayId.toLowerCase() === canonical.toLowerCase() &&
    isSessionValid(current)
  ) {
    return current;
  }

  if (ensureAdminAccess.busy) {
    return null;
  }

  ensureAdminAccess.busy = true;
  try {
    const password = window.prompt(
      `"${canonical}" 는 관리자 전용 아이디입니다.\n비밀번호를 입력해주세요.`
    );

    if (password === null) {
      return null;
    }

    const session = await authenticateAdmin(canonical, password);
    setChatSession(session);
    return session;
  } catch (error) {
    window.alert(error?.message || '관리자 인증에 실패했습니다.');
    return null;
  } finally {
    ensureAdminAccess.busy = false;
  }
}

function buildManageAuth(user, pinOverride) {
  if (user?.sessionToken && isSessionValid(user)) {
    return {
      sessionToken: user.sessionToken,
      displayId: user.displayId
    };
  }

  return {
    displayId: user?.displayId,
    pin: pinOverride
  };
}

function pickTone(author, self) {
  if (self) {
    return 'green';
  }
  const hash = [...String(author)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const tones = ['mint', 'orange', 'purple', 'slate'];
  return tones[hash % tones.length];
}

function normalizeMessageText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeMessage(raw, currentUserKey) {
  const author = String(raw.author || DEFAULT_GUEST_ID).trim().slice(0, 16) || DEFAULT_GUEST_ID;
  const authorId = String(raw.authorId || 'guest');
  const self =
    Boolean(currentUserKey) &&
    authorId !== 'guest' &&
    authorId !== 'system' &&
    authorId === currentUserKey;
  const tone = VALID_TONES.has(raw.tone) ? raw.tone : pickTone(author, self);

  return {
    id: raw.id,
    authorId,
    author,
    text: normalizeMessageText(raw.text),
    tone,
    self,
    isSystem: Boolean(raw.isSystem),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || null
  };
}

function getInitials(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return '?';
  }
  if (/[가-힣]/.test(trimmed)) {
    return trimmed.slice(0, 1);
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * @param {{
 *   rootId: string,
 *   messagesId: string,
 *   formId: string,
 *   nicknameId: string,
 *   pinId: string,
 *   inputId: string,
 *   channel: string,
 *   projectEventName: string,
 *   emptyRoomText?: string
 * }} config
 */
export function createHomepageChat(config) {
  const root = document.getElementById(config.rootId);
  const messagesEl = document.getElementById(config.messagesId);
  const formEl = document.getElementById(config.formId);
  const nicknameEl = document.getElementById(config.nicknameId);
  const pinEl = document.getElementById(config.pinId);
  const inputEl = document.getElementById(config.inputId);
  const sessionEl = root?.querySelector('.metaverse-chat__session');
  const sessionLabelEl = root?.querySelector('.metaverse-chat__session-label');
  const logoutEl = root?.querySelector('.metaverse-chat__logout');

  const state = {
    project: null,
    projectId: null,
    messages: [],
    editingId: null,
    unsubscribe: null,
    currentUser: getChatSession(),
    firestoreReady: false,
    firestoreError: null
  };

  function clearComposerFields() {
    if (nicknameEl) {
      nicknameEl.value = '';
    }
    if (pinEl) {
      pinEl.value = '';
    }
  }

  function updateSessionBar() {
    const loggedIn = Boolean(state.currentUser?.displayId);
    if (sessionEl) {
      sessionEl.hidden = !loggedIn;
    }
    if (sessionLabelEl) {
      sessionLabelEl.textContent = loggedIn ? `${state.currentUser.displayId} 로그인됨` : '';
    }
    if (pinEl) {
      pinEl.placeholder = loggedIn
        ? (state.currentUser.isAdmin ? '관리자 인증됨' : '인증됨 (수정·삭제 가능)')
        : CHAT_PIN_PLACEHOLDER;
    }
  }

  function applySessionToComposer() {
    state.currentUser = getChatSession();
    if (!state.currentUser || !nicknameEl) {
      if (pinEl && !pinEl.value) {
        pinEl.placeholder = CHAT_PIN_PLACEHOLDER;
      }
      updateSessionBar();
      return;
    }
    nicknameEl.value = state.currentUser.displayId;
    if (pinEl) {
      pinEl.value = '';
    }
    updateSessionBar();
  }

  function logoutChat() {
    clearChatSession();
    state.currentUser = null;
    state.editingId = null;
    clearComposerFields();
    if (pinEl) {
      pinEl.placeholder = CHAT_PIN_PLACEHOLDER;
    }
    updateSessionBar();
    renderMessages();
    nicknameEl?.focus();
  }

  function scrollMessagesToBottom() {
    if (!messagesEl) {
      return;
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function findMessageIndex(messageId) {
    return state.messages.findIndex((message) => message.id === messageId);
  }

  function canManageMessage(message) {
    if (!message || message.isSystem) {
      return false;
    }
    if (message.authorId === 'guest' || message.authorId === 'system') {
      return false;
    }
    if (state.currentUser?.userKey && message.authorId === state.currentUser.userKey) {
      return true;
    }
    return false;
  }

  async function ensureAuthorForPost() {
    const typed = String(nicknameEl?.value || '').trim().slice(0, 16);
    const pin = String(pinEl?.value || '').trim();

    if (!typed) {
      window.alert('아이디와 6자리 비밀번호를 입력해주세요.');
      nicknameEl?.focus();
      return null;
    }

    if (isAdminId(typed)) {
      const adminSession = await ensureAdminAccess(typed);
      if (!adminSession) {
        clearComposerFields();
        return null;
      }
      state.currentUser = adminSession;
      nicknameEl.value = adminSession.displayId;
      if (pinEl) {
        pinEl.value = '';
        pinEl.placeholder = '관리자 인증됨';
      }
      updateSessionBar();
      return { type: 'session', session: adminSession };
    }

    const sessionMatches =
      state.currentUser &&
      !state.currentUser.isAdmin &&
      typed === state.currentUser.displayId &&
      isSessionValid(state.currentUser);

    if (sessionMatches) {
      if (pinEl) {
        pinEl.value = '';
      }
      return { type: 'session', session: state.currentUser };
    }

    if (!isValidPin(pin)) {
      window.alert('6자리 숫자 비밀번호를 입력해주세요.');
      pinEl?.focus();
      return null;
    }

    try {
      const user = await ensureUserForPost(typed, pin);
      state.currentUser = user;
      setChatSession(user);
      nicknameEl.value = user.displayId;
      if (pinEl) {
        pinEl.value = '';
        pinEl.placeholder = '인증됨 (수정·삭제 가능)';
      }
      return { type: 'pin', displayId: typed, pin, session: user };
    } catch (error) {
      window.alert(error?.message || '아이디 또는 비밀번호 확인에 실패했습니다.');
      return null;
    }
  }

  async function ensureAuthorForManage(message) {
    if (state.currentUser?.userKey === message.authorId) {
      return state.currentUser;
    }

    const typed = String(nicknameEl?.value || '').trim().slice(0, 16);
    const pin = String(pinEl?.value || '').trim();
    const displayId = typed || message.author;

    if (!isValidPin(pin)) {
      const enteredPin = window.prompt(`"${displayId}" 비밀번호(6자리)를 입력해주세요.`);
      if (!isValidPin(enteredPin)) {
        window.alert('6자리 숫자 비밀번호를 입력해주세요.');
        return null;
      }
      try {
        const user = await verifyUserPin(displayId, enteredPin);
        if (user.userKey !== message.authorId) {
          window.alert('본인의 메시지만 수정·삭제할 수 있습니다.');
          return null;
        }
        state.currentUser = user;
        setChatSession(user);
        nicknameEl.value = user.displayId;
        return user;
      } catch (error) {
        window.alert(error?.message || '비밀번호 확인에 실패했습니다.');
        return null;
      }
    }

    try {
      const user = await verifyUserPin(displayId, pin);
      if (user.userKey !== message.authorId) {
        window.alert('본인의 메시지만 수정·삭제할 수 있습니다.');
        return null;
      }
      state.currentUser = user;
      setChatSession(user);
      nicknameEl.value = user.displayId;
      if (pinEl) {
        pinEl.value = '';
      }
      return user;
    } catch (error) {
      window.alert(error?.message || '비밀번호 확인에 실패했습니다.');
      return null;
    }
  }

  function validateNicknameInput() {
    const typed = String(nicknameEl?.value || '').trim().slice(0, 16);
    if (!typed) {
      if (pinEl) {
        pinEl.placeholder = CHAT_PIN_PLACEHOLDER;
      }
      return;
    }

    if (!isAdminId(typed)) {
      nicknameEl.value = typed;
      return;
    }

    nicknameEl.value = resolveCanonicalAdminId(typed);
  }

  function startEditMessage(messageId) {
    if (!state.projectId) {
      return;
    }
    state.editingId = messageId;
    renderMessages();
  }

  function cancelEditMessage() {
    state.editingId = null;
    renderMessages();
  }

  async function saveEditedMessage(messageId, nextText) {
    const index = findMessageIndex(messageId);
    if (index < 0) {
      return;
    }

    const message = state.messages[index];
    if (!canManageMessage(message)) {
      const user = await ensureAuthorForManage(message);
      if (!user) {
        return;
      }
    }

    const text = normalizeMessageText(nextText).slice(0, MAX_MESSAGE_LENGTH);
    if (!text) {
      return;
    }

    try {
      await updateRoomMessage(
        config.channel,
        state.projectId,
        messageId,
        text
      );
      state.editingId = null;
    } catch (error) {
      window.alert(error?.message || '메시지 수정에 실패했습니다.');
    }
  }

  async function deleteMessage(messageId) {
    const index = findMessageIndex(messageId);
    if (index < 0) {
      return;
    }

    const message = state.messages[index];
    if (!canManageMessage(message)) {
      const user = await ensureAuthorForManage(message);
      if (!user) {
        return;
      }
    }

    const confirmed = window.confirm('이 메시지를 삭제할까요?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteRoomMessage(config.channel, state.projectId, messageId);
      if (state.editingId === messageId) {
        state.editingId = null;
      }
    } catch (error) {
      window.alert(error?.message || '메시지 삭제에 실패했습니다.');
    }
  }

  function createActionButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'metaverse-chat__action';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderEditForm(message) {
    const wrap = document.createElement('div');

    const field = document.createElement('textarea');
    field.className = 'metaverse-chat__edit-field';
    field.value = message.text;
    field.maxLength = MAX_MESSAGE_LENGTH;
    field.rows = 3;

    const actions = document.createElement('div');
    actions.className = 'metaverse-chat__actions';

    const saveButton = createActionButton('저장', () => {
      saveEditedMessage(message.id, field.value);
    });
    const cancelButton = createActionButton('취소', () => {
      cancelEditMessage();
    });

    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        saveEditedMessage(message.id, field.value);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelEditMessage();
      }
    });

    actions.append(saveButton, cancelButton);
    wrap.append(field, actions);
    return wrap;
  }

  function renderMessages() {
    if (!messagesEl) {
      return;
    }

    const previousScrollTop = messagesEl.scrollTop;
    const wasNearBottom =
      messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 48;

    messagesEl.innerHTML = '';

    if (state.firestoreError) {
      const error = document.createElement('p');
      error.className = 'metaverse-chat__empty';
      error.textContent = '채팅을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      messagesEl.appendChild(error);
      return;
    }

    if (!state.projectId) {
      const empty = document.createElement('p');
      empty.className = 'metaverse-chat__empty';
      empty.textContent = config.emptyRoomText || '프로젝트를 선택하면 채팅이 표시됩니다.';
      messagesEl.appendChild(empty);
      return;
    }

    if (!state.messages.length) {
      const empty = document.createElement('p');
      empty.className = 'metaverse-chat__empty';
      empty.textContent = state.firestoreReady ? '첫 메시지를 남겨 보세요.' : '채팅을 불러오는 중…';
      messagesEl.appendChild(empty);
      return;
    }

    state.messages.forEach((message) => {
      const item = document.createElement('article');
      item.className = `metaverse-chat__message metaverse-chat__message--tone-${message.tone}`;
      item.dataset.messageId = message.id;

      const avatar = document.createElement('div');
      avatar.className = 'metaverse-chat__avatar';
      avatar.textContent = getInitials(message.author);
      avatar.setAttribute('aria-hidden', 'true');

      const bubble = document.createElement('div');
      bubble.className = 'metaverse-chat__bubble';

      const author = document.createElement('span');
      author.className = 'metaverse-chat__author';
      author.textContent = message.author;
      bubble.appendChild(author);

      if (state.editingId === message.id && canManageMessage(message)) {
        bubble.appendChild(renderEditForm(message));
      } else {
        const text = document.createElement('p');
        text.className = 'metaverse-chat__text';
        text.textContent = message.text;
        bubble.appendChild(text);

        if (canManageMessage(message)) {
          const actions = document.createElement('div');
          actions.className = 'metaverse-chat__actions';
          actions.append(
            createActionButton('수정', () => startEditMessage(message.id)),
            createActionButton('삭제', () => deleteMessage(message.id))
          );
          bubble.appendChild(actions);
        }
      }

      item.append(avatar, bubble);
      messagesEl.appendChild(item);
    });

    if (wasNearBottom || state.editingId === null) {
      scrollMessagesToBottom();
    } else {
      messagesEl.scrollTop = previousScrollTop;
    }

    if (state.editingId) {
      const editField = messagesEl.querySelector('.metaverse-chat__edit-field');
      editField?.focus();
      if (editField) {
        const length = editField.value.length;
        editField.setSelectionRange(length, length);
      }
    }
  }

  function setComposerEnabled(enabled) {
    if (nicknameEl) {
      nicknameEl.disabled = !enabled;
    }
    if (pinEl) {
      pinEl.disabled = !enabled;
    }
    if (inputEl) {
      inputEl.disabled = !enabled;
    }
    formEl?.querySelector('.metaverse-chat__send')?.toggleAttribute('disabled', !enabled);
  }

  function detachRoomListener() {
    if (state.unsubscribe) {
      state.unsubscribe();
      state.unsubscribe = null;
    }
  }

  async function openRoom(project) {
    const projectId = project?.id || null;

    detachRoomListener();
    state.project = project;
    state.projectId = projectId;
    state.messages = [];
    state.editingId = null;
    state.firestoreReady = false;
    state.firestoreError = null;

    if (!projectId) {
      setComposerEnabled(false);
      renderMessages();
      return;
    }

    setComposerEnabled(true);
    applySessionToComposer();
    renderMessages();

    try {
      await ensureOpeningMessage(config.channel, project);
    } catch (error) {
      console.warn('채팅 오프닝 메시지 생성 실패:', error);
    }

    state.unsubscribe = subscribeRoomMessages(
      config.channel,
      projectId,
      (messages) => {
        const userKey = state.currentUser?.userKey || null;
        state.messages = messages.map((message) => normalizeMessage(message, userKey));
        state.firestoreReady = true;
        state.firestoreError = null;
        renderMessages();
      },
      (error) => {
        console.error('채팅 메시지 구독 실패:', error);
        state.firestoreError = true;
        renderMessages();
      }
    );
  }

  async function appendMessage(text) {
    if (!state.projectId) {
      return false;
    }

    const normalized = normalizeMessageText(text).slice(0, MAX_MESSAGE_LENGTH);
    if (!normalized) {
      return false;
    }

    const authInfo = await ensureAuthorForPost();
    if (!authInfo) {
      return false;
    }

    try {
      const result = await addRoomMessage(
        config.channel,
        state.projectId,
        { text: normalized },
        authInfo.session || null
      );

      if (result.session?.userKey) {
        state.currentUser = result.session;
        setChatSession(result.session);
      }

      return true;
    } catch (error) {
      window.alert(error?.message || '메시지 전송에 실패했습니다.');
      return false;
    }
  }

  function submitComposer() {
    if (!inputEl || inputEl.disabled) {
      return;
    }

    const text = inputEl.value;
    if (!normalizeMessageText(text)) {
      return;
    }

    appendMessage(text).then((posted) => {
      if (!posted) {
        return;
      }
      inputEl.value = '';
      inputEl.focus();
    });
  }

  function bindEvents() {
    document.addEventListener(config.projectEventName, (event) => {
      openRoom(event.detail?.project || null);
    });

    nicknameEl?.addEventListener('change', () => {
      validateNicknameInput();
    });

    nicknameEl?.addEventListener('blur', () => {
      validateNicknameInput();
    });

    logoutEl?.addEventListener('click', () => {
      logoutChat();
    });

    document.addEventListener(CHAT_SESSION_EVENT, () => {
      applySessionToComposer();
      renderMessages();
    });

    pinEl?.addEventListener('input', () => {
      pinEl.value = pinEl.value.replace(/\D/g, '').slice(0, 6);
    });

    inputEl?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      submitComposer();
    });

    formEl?.addEventListener('submit', (event) => {
      event.preventDefault();
      submitComposer();
    });
  }

  async function init() {
    if (!root || !messagesEl || !formEl) {
      return;
    }

    bindEvents();
    clearComposerFields();
    applySessionToComposer();
    setComposerEnabled(false);
    renderMessages();
  }

  init();

  return {
    openRoom
  };
}
