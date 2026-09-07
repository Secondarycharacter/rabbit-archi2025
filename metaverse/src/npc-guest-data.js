/**
 * NPC guest + dialog data store.
 * Base JSON → localStorage overlay. Global → Guest → Dialog override order.
 */

export const NPC_GUEST_DATA_VERSION = "angji-npc-korean-names-20260822";
export const NPC_GUEST_STORAGE_KEY = "angji-npc-guest-manager-v1";
export const NPC_GUEST_PROGRESS_KEY = "angji-npc-conversation-progress-v1";
export const NPC_GUEST_DATA_URL = "./data/npc/guests.json";

export const NPC_GLOBAL_DEFAULTS = {
  interactionDistance: 1.5,
  dialogDistance: 1.2,
  interactionKey: " ",
  interactionScale: 1.5,
  hoverEffect: true,
  hoverTweenSeconds: 0.22,
  alignMoveSpeed: 1.35,
  alignRotateSpeed: 4.5,
  cameraBlendSeconds: 0.55,
  cameraMinDistance: 1.15,
  cameraMaxDistance: 2.8,
  cameraFov: null,
  cameraHeight: 1.55,
  cameraLookLift: 0.35,
  cameraYawOffset: 0,
  cameraPitchOffset: 0,
  cameraLateralOffset: 0,
  cameraDistance: null,
  hidePlayerDuringDialog: true,
  textSpeed: 0.0583,
  lineHoldSeconds: 1.0,
  lineHoldPerChar: 0.02,
  lineHoldMaxExtra: 3.33,
  dialogDuration: 0.8,
  voiceEnabled: true,
  voiceVolume: 1,
  voicePlaybackSpeed: 1,
  bubbleMaxLines: 2,
  bubbleMaxVisible: 2,
  bubbleFadeSeconds: 0.55,
  bubbleFadeRisePx: 42,
  bubbleMinFontPx: 12,
  bubbleMaxFontPx: 16,
  restorePlayerPositionOnCancel: false,
  restorePlayerPositionOnEnd: false,
  repeatable: true,
  idleAnimation: "Idle",
  walkingAnimation: "Walking",
  talkAnimation: "",
  greetingAnimation: ""
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return fallback;
}

function normalizeDialogLine(line = {}, index = 0, guestDefaults = {}) {
  const order = asNumber(line.order, index + 1);
  const textSpeed = line.textSpeed == null || line.textSpeed === ""
    ? null
    : asNumber(line.textSpeed, null);

  return {
    id: String(line.id || `dialog_${order}`),
    order,
    enabled: asBool(line.enabled, true),
    koreanText: String(line.koreanText || ""),
    englishSubtitle: String(line.englishSubtitle || ""),
    audioFile: String(line.audioFile || ""),
    textSpeed,
    dialogDuration: line.dialogDuration == null || line.dialogDuration === ""
      ? null
      : asNumber(line.dialogDuration, guestDefaults.dialogDuration ?? NPC_GLOBAL_DEFAULTS.dialogDuration)
  };
}

function normalizeOnComplete(raw = {}) {
  const type = String(raw?.type || "none");
  return {
    type: type === "unlock_event" ? "unlock_event" : "none",
    targetEventId: String(raw?.targetEventId || "")
  };
}

export function normalizeConversationEvent(event = {}, index = 0, guestDefaults = {}) {
  const dialogLines = Array.isArray(event.dialogLines)
    ? event.dialogLines.map((line, lineIndex) => normalizeDialogLine(line, lineIndex, guestDefaults))
      .sort((a, b) => a.order - b.order)
    : [];

  return {
    id: String(event.id || `event_${index + 1}`),
    name: String(event.name || `대화 이벤트 ${index + 1}`),
    unlockedByDefault: asBool(event.unlockedByDefault, index === 0),
    onComplete: normalizeOnComplete(event.onComplete),
    dialogLines
  };
}

function ensureConversationEvents(guest = {}, guestDefaults = {}) {
  if (Array.isArray(guest.conversationEvents) && guest.conversationEvents.length) {
    return guest.conversationEvents.map((event, index) => (
      normalizeConversationEvent(event, index, guestDefaults)
    ));
  }

  const legacyLines = Array.isArray(guest.dialogLines) ? guest.dialogLines : [];
  return [
    normalizeConversationEvent({
      id: "event_1",
      name: "기본 대화",
      unlockedByDefault: true,
      onComplete: guest.onCompleteNext || { type: "none", targetEventId: "" },
      dialogLines: legacyLines
    }, 0, guestDefaults)
  ];
}

function normalizeGuest(guest = {}, globalDefaults = NPC_GLOBAL_DEFAULTS) {
  const mergedDefaults = { ...NPC_GLOBAL_DEFAULTS, ...globalDefaults };
  const conversationEvents = ensureConversationEvents(guest, mergedDefaults);
  // Keep dialogLines mirrored to the first event for older readers / scene-editor dialogue sync.
  const dialogLines = conversationEvents[0]?.dialogLines || [];

  return {
    guestId: String(guest.guestId || ""),
    guestKey: String(guest.guestKey || guest.guestId || ""),
    name: String(guest.name || guest.guestId || "Guest"),
    displayName: String(guest.displayName || ""),
    enabled: asBool(guest.enabled, true),
    interactionEnabled: asBool(guest.interactionEnabled, false),
    interactionDistance: asNumber(guest.interactionDistance, mergedDefaults.interactionDistance),
    dialogDistance: asNumber(guest.dialogDistance, mergedDefaults.dialogDistance),
    interactionKey: String(guest.interactionKey ?? mergedDefaults.interactionKey),
    interactionScale: asNumber(guest.interactionScale, mergedDefaults.interactionScale),
    hoverEffect: asBool(guest.hoverEffect, mergedDefaults.hoverEffect),
    textSpeed: asNumber(guest.textSpeed, mergedDefaults.textSpeed),
    dialogDuration: asNumber(guest.dialogDuration, mergedDefaults.dialogDuration),
    voiceEnabled: asBool(guest.voiceEnabled, mergedDefaults.voiceEnabled),
    voiceVolume: asNumber(guest.voiceVolume, mergedDefaults.voiceVolume),
    voicePlaybackSpeed: asNumber(guest.voicePlaybackSpeed, mergedDefaults.voicePlaybackSpeed),
    repeatable: asBool(guest.repeatable, mergedDefaults.repeatable),
    idleAnimation: String(guest.idleAnimation ?? mergedDefaults.idleAnimation),
    walkingAnimation: String(guest.walkingAnimation ?? mergedDefaults.walkingAnimation),
    talkAnimation: String(guest.talkAnimation ?? mergedDefaults.talkAnimation),
    greetingAnimation: String(guest.greetingAnimation ?? mergedDefaults.greetingAnimation),
    cameraMinDistance: asNumber(guest.cameraMinDistance, mergedDefaults.cameraMinDistance),
    cameraMaxDistance: asNumber(guest.cameraMaxDistance, mergedDefaults.cameraMaxDistance),
    cameraFov: guest.cameraFov == null || guest.cameraFov === ""
      ? null
      : asNumber(guest.cameraFov, null),
    cameraHeight: asNumber(guest.cameraHeight, mergedDefaults.cameraHeight),
    cameraLookLift: asNumber(guest.cameraLookLift, mergedDefaults.cameraLookLift),
    cameraYawOffset: asNumber(guest.cameraYawOffset, mergedDefaults.cameraYawOffset),
    cameraPitchOffset: asNumber(guest.cameraPitchOffset, mergedDefaults.cameraPitchOffset),
    cameraLateralOffset: asNumber(guest.cameraLateralOffset, mergedDefaults.cameraLateralOffset),
    cameraDistance: guest.cameraDistance == null || guest.cameraDistance === ""
      ? null
      : asNumber(guest.cameraDistance, null),
    hidePlayerDuringDialog: asBool(
      guest.hidePlayerDuringDialog,
      mergedDefaults.hidePlayerDuringDialog
    ),
    hoverTweenSeconds: asNumber(guest.hoverTweenSeconds, mergedDefaults.hoverTweenSeconds),
    alignMoveSpeed: asNumber(guest.alignMoveSpeed, mergedDefaults.alignMoveSpeed),
    alignRotateSpeed: asNumber(guest.alignRotateSpeed, mergedDefaults.alignRotateSpeed),
    cameraBlendSeconds: asNumber(guest.cameraBlendSeconds, mergedDefaults.cameraBlendSeconds),
    bubbleMaxLines: asNumber(guest.bubbleMaxLines, mergedDefaults.bubbleMaxLines),
    bubbleMaxVisible: asNumber(guest.bubbleMaxVisible, mergedDefaults.bubbleMaxVisible),
    bubbleFadeSeconds: asNumber(guest.bubbleFadeSeconds, mergedDefaults.bubbleFadeSeconds),
    bubbleFadeRisePx: asNumber(guest.bubbleFadeRisePx, mergedDefaults.bubbleFadeRisePx),
    bubbleMinFontPx: asNumber(guest.bubbleMinFontPx, mergedDefaults.bubbleMinFontPx),
    bubbleMaxFontPx: asNumber(guest.bubbleMaxFontPx, mergedDefaults.bubbleMaxFontPx),
    restorePlayerPositionOnCancel: asBool(
      guest.restorePlayerPositionOnCancel,
      mergedDefaults.restorePlayerPositionOnCancel
    ),
    restorePlayerPositionOnEnd: asBool(
      guest.restorePlayerPositionOnEnd,
      mergedDefaults.restorePlayerPositionOnEnd
    ),
    conversationEvents,
    dialogLines
  };
}

export function createEmptyConversationEvent(order = 1, options = {}) {
  return normalizeConversationEvent({
    id: options.id || `event_${order}`,
    name: options.name || `대화 이벤트 ${order}`,
    unlockedByDefault: options.unlockedByDefault ?? order === 1,
    onComplete: options.onComplete || { type: "none", targetEventId: "" },
    dialogLines: options.dialogLines || []
  }, order - 1);
}

export function createEmptyGuest(partial = {}) {
  return normalizeGuest({
    guestId: partial.guestId || `Mark-${Date.now() % 10000}`,
    guestKey: partial.guestKey || "guest_new",
    name: partial.name || "New Guest",
    displayName: partial.displayName || "??",
    enabled: true,
    interactionEnabled: false,
    dialogLines: []
  });
}

export function createEmptyDialogLine(order = 1) {
  return normalizeDialogLine({
    id: `dialog_${order}`,
    order,
    enabled: true,
    koreanText: "",
    englishSubtitle: "",
    audioFile: "",
    textSpeed: null,
    dialogDuration: null
  }, order - 1);
}

export function normalizeGuestBundle(raw = {}) {
  const globalDefaults = {
    ...NPC_GLOBAL_DEFAULTS,
    ...(raw.globalDefaults || {})
  };

  const guests = Array.isArray(raw.guests)
    ? raw.guests.map((guest) => normalizeGuest(guest, globalDefaults))
    : [];

  return {
    version: asNumber(raw.version, 1),
    globalDefaults,
    guests
  };
}

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadConversationProgress() {
  const raw = readStorage(NPC_GUEST_PROGRESS_KEY);
  const completed = Array.isArray(raw?.completedGuestIds) ? raw.completedGuestIds : [];
  const byGuest = {};

  if (raw?.byGuest && typeof raw.byGuest === "object") {
    Object.entries(raw.byGuest).forEach(([guestId, state]) => {
      byGuest[String(guestId)] = {
        completedEventIds: [...new Set((state?.completedEventIds || []).map(String))],
        unlockedEventIds: [...new Set((state?.unlockedEventIds || []).map(String))]
      };
    });
  }

  return {
    completedGuestIds: [...new Set(completed.map(String))],
    byGuest
  };
}

export function saveConversationProgress(progress) {
  writeStorage(NPC_GUEST_PROGRESS_KEY, {
    completedGuestIds: [...new Set((progress?.completedGuestIds || []).map(String))],
    byGuest: progress?.byGuest || {}
  });
}

export function getGuestEventProgress(guestId, progress = loadConversationProgress()) {
  const state = progress?.byGuest?.[String(guestId)] || {};
  return {
    completedEventIds: [...new Set((state.completedEventIds || []).map(String))],
    unlockedEventIds: [...new Set((state.unlockedEventIds || []).map(String))]
  };
}

function defaultUnlockedEventIds(guest) {
  return (guest?.conversationEvents || [])
    .filter((event) => event.unlockedByDefault)
    .map((event) => String(event.id));
}

export function resolveUnlockedEventIds(guest, progress = loadConversationProgress()) {
  const state = getGuestEventProgress(guest?.guestId, progress);
  if (state.unlockedEventIds.length) {
    return state.unlockedEventIds;
  }
  return defaultUnlockedEventIds(guest);
}

export function resolveActiveConversationEvent(guest, progress = loadConversationProgress()) {
  const events = guest?.conversationEvents || [];
  if (!events.length) {
    return null;
  }

  const unlocked = new Set(resolveUnlockedEventIds(guest, progress));
  const completed = new Set(getGuestEventProgress(guest.guestId, progress).completedEventIds);

  if (guest.repeatable) {
    return events.find((event) => unlocked.has(String(event.id))) || events[0] || null;
  }

  return events.find((event) => (
    unlocked.has(String(event.id)) && !completed.has(String(event.id))
  )) || null;
}

export function markConversationCompleted(guestId) {
  const progress = loadConversationProgress();

  if (!progress.completedGuestIds.includes(guestId)) {
    progress.completedGuestIds.push(guestId);
    saveConversationProgress(progress);
  }

  return progress;
}

/**
 * Mark a conversation event complete and optionally unlock the next event.
 * When no further interactable events remain (and guest is not repeatable),
 * the guest is added to completedGuestIds.
 */
export function markConversationEventCompleted(guestId, eventId, guest = null) {
  const progress = loadConversationProgress();
  const id = String(guestId || "");
  const completedEventId = String(eventId || "");

  if (!id || !completedEventId) {
    return progress;
  }

  const state = getGuestEventProgress(id, progress);
  const unlocked = new Set(
    state.unlockedEventIds.length
      ? state.unlockedEventIds
      : defaultUnlockedEventIds(guest)
  );
  const completed = new Set(state.completedEventIds);
  completed.add(completedEventId);

  const event = (guest?.conversationEvents || []).find((item) => String(item.id) === completedEventId);

  if (
    guest
    && !guest.repeatable
    && event?.onComplete?.type === "unlock_event"
    && event.onComplete.targetEventId
  ) {
    unlocked.add(String(event.onComplete.targetEventId));
  }

  progress.byGuest = {
    ...(progress.byGuest || {}),
    [id]: {
      completedEventIds: [...completed],
      unlockedEventIds: [...unlocked]
    }
  };

  if (guest && !guest.repeatable) {
    const nextActive = resolveActiveConversationEvent({
      ...guest,
      guestId: id
    }, progress);

    if (!nextActive) {
      if (!progress.completedGuestIds.includes(id)) {
        progress.completedGuestIds.push(id);
      }
    } else {
      progress.completedGuestIds = progress.completedGuestIds.filter((item) => item !== id);
    }
  }

  saveConversationProgress(progress);
  return progress;
}

export function clearConversationCompleted(guestId) {
  const progress = loadConversationProgress();
  const id = String(guestId || "");
  progress.completedGuestIds = progress.completedGuestIds.filter((item) => item !== id);

  if (progress.byGuest?.[id]) {
    const nextByGuest = { ...progress.byGuest };
    delete nextByGuest[id];
    progress.byGuest = nextByGuest;
  }

  saveConversationProgress(progress);
  return progress;
}

export function loadStoredGuestBundle() {
  const stored = readStorage(NPC_GUEST_STORAGE_KEY);
  return stored ? normalizeGuestBundle(stored) : null;
}

export function saveGuestBundle(bundle) {
  const normalized = normalizeGuestBundle(bundle);
  writeStorage(NPC_GUEST_STORAGE_KEY, normalized);
  return normalized;
}

const guestBundleListeners = new Set();

export function subscribeGuestBundleUpdates(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  guestBundleListeners.add(listener);
  return () => guestBundleListeners.delete(listener);
}

function notifyGuestBundleListeners(bundle, meta = {}) {
  guestBundleListeners.forEach((listener) => {
    try {
      listener(bundle, meta);
    } catch (error) {
      console.error("[npc-guest-data] listener failed", error);
    }
  });

  void import("./editor-mode/editor-broadcast-sync.js?v=editor-broadcast-sync-20260902")
    .then(({ postGuestBundleBroadcast }) => postGuestBundleBroadcast(bundle, meta))
    .catch(() => {});
}

/**
 * Single write path for Editor Mode guest saves.
 * NORMAL MODE reads through loadRuntimeGuestBundle().
 */
export function publishGuestBundle(bundle, options = {}) {
  const normalized = normalizeGuestBundle(bundle);
  const persist = options.persist !== false;

  if (persist) {
    saveGuestBundle(normalized);
  }

  notifyGuestBundleListeners(normalized, {
    source: options.source || (persist ? "publish-save" : "publish-apply"),
    persisted: persist
  });

  return normalized;
}

/** Runtime loader shared by NORMAL MODE and Editor Mode. */
export async function loadRuntimeGuestBundle(
  url = NPC_GUEST_DATA_URL,
  modelGuestEntries = null
) {
  return loadEffectiveGuestBundle(url, modelGuestEntries);
}

export function clearStoredGuestBundle() {
  localStorage.removeItem(NPC_GUEST_STORAGE_KEY);
}

export async function loadBaseGuestBundle(url = NPC_GUEST_DATA_URL) {
  const response = await fetch(`${url}?v=${NPC_GUEST_DATA_VERSION}`, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Failed to load NPC guest data (${response.status})`);
  }

  return normalizeGuestBundle(await response.json());
}

function guestHasDialogContent(guest) {
  const events = guest?.conversationEvents || [];
  if (events.some((event) => (event.dialogLines || []).some((line) => String(line.koreanText || "").trim()))) {
    return true;
  }
  return (guest?.dialogLines || []).some((line) => String(line.koreanText || "").trim());
}

function mergeGuestRecords(jsonGuest, storedGuest, globalDefaults) {
  if (!jsonGuest) {
    return normalizeGuest(storedGuest, globalDefaults);
  }

  if (!storedGuest) {
    return normalizeGuest(jsonGuest, globalDefaults);
  }

  const preferStoredEvents = Array.isArray(storedGuest.conversationEvents)
    && storedGuest.conversationEvents.length > 0
    && guestHasDialogContent(storedGuest);

  const dialogLines = guestHasDialogContent(storedGuest)
    ? storedGuest.dialogLines
    : jsonGuest.dialogLines;

  return normalizeGuest({
    ...jsonGuest,
    ...storedGuest,
    guestKey: storedGuest.guestKey || jsonGuest.guestKey,
    name: storedGuest.name || jsonGuest.name,
    displayName: storedGuest.displayName || jsonGuest.displayName,
    dialogLines,
    conversationEvents: preferStoredEvents
      ? storedGuest.conversationEvents
      : (storedGuest.conversationEvents || jsonGuest.conversationEvents),
    interactionEnabled: storedGuest.interactionEnabled ?? jsonGuest.interactionEnabled
  }, globalDefaults);
}

/** Merge shipped guests.json with localStorage edits (names/settings) without dropping JSON dialog. */
export function mergeGuestBundleWithJson(jsonBundle, storedBundle) {
  if (!jsonBundle && !storedBundle) {
    return normalizeGuestBundle({});
  }

  if (!storedBundle) {
    return normalizeGuestBundle(jsonBundle);
  }

  if (!jsonBundle) {
    return normalizeGuestBundle(storedBundle);
  }

  const jsonNorm = normalizeGuestBundle(jsonBundle);
  const storedNorm = normalizeGuestBundle(storedBundle);
  const jsonById = new Map(jsonNorm.guests.map((guest) => [guest.guestId, guest]));
  const storedById = new Map(storedNorm.guests.map((guest) => [guest.guestId, guest]));
  const guestIds = new Set([...jsonById.keys(), ...storedById.keys()]);
  const globalDefaults = {
    ...jsonNorm.globalDefaults,
    ...storedNorm.globalDefaults
  };

  return {
    version: Math.max(jsonNorm.version, storedNorm.version),
    globalDefaults,
    guests: [...guestIds].map((guestId) => mergeGuestRecords(
      jsonById.get(guestId),
      storedById.get(guestId),
      globalDefaults
    ))
  };
}

/**
 * Merge guests.json with localStorage overlay, then expand to every model guest.
 */
export async function loadEffectiveGuestBundle(url = NPC_GUEST_DATA_URL, modelGuestEntries = null) {
  const stored = loadStoredGuestBundle();
  let jsonBundle = null;
  let remoteBundle = null;

  if (!stored) {
    try {
      const { isGuestBundleFirestoreConfigured, loadGuestBundleFromFirestore } = await import(
        "./editor-mode/guest-bundle-firestore.js?v=guest-base-firestore-20260905"
      );

      if (isGuestBundleFirestoreConfigured()) {
        remoteBundle = await loadGuestBundleFromFirestore();
      }
    } catch (error) {
      console.warn("[npc-guest-data] Firestore load skipped", error);
    }
  }

  try {
    jsonBundle = await loadBaseGuestBundle(url);
  } catch (error) {
    console.warn("[npc-guest-data] failed to load base JSON", error);
  }

  let base;

  if (stored) {
    base = mergeGuestBundleWithJson(jsonBundle, stored);
  } else if (remoteBundle) {
    base = normalizeGuestBundle(remoteBundle);
  } else {
    base = mergeGuestBundleWithJson(jsonBundle, null);
  }

  return mergeModelGuestsIntoBundle(base, modelGuestEntries);
}

/**
 * Ensure bundle contains every model guest (Mark-1..N) in number order.
 * Existing saved settings for a guestId are preserved.
 */
export function mergeModelGuestsIntoBundle(bundle, modelGuestEntries = null) {
  const normalized = normalizeGuestBundle(bundle);
  const entries = Array.isArray(modelGuestEntries) ? modelGuestEntries : [];

  if (!entries.length) {
    normalized.guests = [...normalized.guests].sort((a, b) => {
      const aNum = Number(String(a.guestId).replace(/\D+/g, ""));
      const bNum = Number(String(b.guestId).replace(/\D+/g, ""));
      return (Number.isFinite(aNum) ? aNum : 9999) - (Number.isFinite(bNum) ? bNum : 9999);
    });
    return normalized;
  }

  const byId = new Map(normalized.guests.map((guest) => [guest.guestId, guest]));
  const merged = entries.map((entry) => {
    const existing = byId.get(entry.guestId);

    if (existing) {
      return normalizeGuest({
        ...existing,
        guestKey: existing.guestKey || entry.guestKey,
        name: existing.name || entry.name,
        displayName: existing.displayName || entry.displayName
      }, normalized.globalDefaults);
    }

    return createEmptyGuest({
      guestId: entry.guestId,
      guestKey: entry.guestKey,
      name: entry.name,
      displayName: entry.displayName,
      enabled: true,
      interactionEnabled: false,
      dialogLines: []
    });
  });

  return {
    ...normalized,
    guests: merged
  };
}

export function getDisplayNameMap(bundle) {
  const map = new Map();
  normalizeGuestBundle(bundle).guests.forEach((guest) => {
    const label = guest.displayName || guest.name;
    if (guest.guestId && label) {
      map.set(guest.guestId, String(label));
    }
  });
  return map;
}

export function resolveDialogLine(guest, line, globalDefaults = NPC_GLOBAL_DEFAULTS) {
  const g = normalizeGuest(guest, globalDefaults);
  const l = normalizeDialogLine(line, 0, g);
  const textSpeed = l.textSpeed == null ? g.textSpeed : l.textSpeed;
  const dialogDuration = l.dialogDuration == null ? g.dialogDuration : l.dialogDuration;

  return {
    ...l,
    textSpeed,
    dialogDuration,
    voiceEnabled: g.voiceEnabled && Boolean(l.audioFile),
    voiceVolume: g.voiceVolume,
    voicePlaybackSpeed: g.voicePlaybackSpeed
  };
}

/**
 * Runtime configs consumed by npc-interaction-system.
 */
export function resolveInteractionConfigs(bundle, progress = loadConversationProgress()) {
  const normalized = normalizeGuestBundle(bundle);

  return normalized.guests
    .filter((guest) => guest.enabled && guest.guestId)
    .map((guest) => {
      const activeEvent = resolveActiveConversationEvent(guest, progress);
      const sourceLines = activeEvent?.dialogLines || guest.dialogLines || [];
      const lines = sourceLines
        .filter((line) => line.enabled && String(line.koreanText || "").trim())
        .sort((a, b) => a.order - b.order)
        .map((line) => resolveDialogLine(guest, line, normalized.globalDefaults));

      const canInteract = Boolean(
        guest.interactionEnabled
        && lines.length > 0
        && (guest.repeatable || Boolean(activeEvent))
      );

      return {
        ...normalized.globalDefaults,
        ...guest,
        labelId: guest.displayName || guest.name,
        activeEventId: activeEvent?.id || null,
        activeEventName: activeEvent?.name || null,
        dialogLines: lines,
        conversationCompleted: !guest.repeatable && !activeEvent,
        canInteract
      };
    });
}

export function getGuestSummaryRows(bundle, progress = loadConversationProgress()) {
  const normalized = normalizeGuestBundle(bundle);

  return normalized.guests.map((guest) => {
    const events = guest.conversationEvents || [];
    const activeEvent = resolveActiveConversationEvent(guest, progress);
    const lines = (activeEvent?.dialogLines || guest.dialogLines || []).filter((line) => line.enabled);
    const voiceCount = lines.filter((line) => Boolean(line.audioFile)).length;

    return {
      guestId: guest.guestId,
      name: guest.name,
      displayName: guest.displayName,
      enabled: guest.enabled,
      interactionEnabled: guest.interactionEnabled,
      dialogCount: lines.length,
      eventCount: events.length,
      voiceCount,
      repeatable: guest.repeatable,
      completed: !guest.repeatable && !activeEvent,
      activeEventName: activeEvent?.name || "",
      hasDialog: lines.length > 0
    };
  });
}

export function parseGuestBundleJson(text) {
  const parsed = JSON.parse(String(text ?? ""));
  return normalizeGuestBundle(parsed);
}

export async function importGuestBundleFromFile(file) {
  const text = await file.text();
  return parseGuestBundleJson(text);
}

export function exportGuestBundleJson(bundle) {
  return `${JSON.stringify(normalizeGuestBundle(bundle), null, 2)}\n`;
}

export function cloneGuestBundle(bundle) {
  return deepClone(normalizeGuestBundle(bundle));
}
