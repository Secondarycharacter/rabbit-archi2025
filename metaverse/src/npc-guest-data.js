/**
 * NPC guest + dialog data store.
 * Base JSON → localStorage overlay. Global → Guest → Dialog override order.
 */

export const NPC_GUEST_DATA_VERSION = "angji-npc-manager-20260825";
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

function normalizeGuest(guest = {}, globalDefaults = NPC_GLOBAL_DEFAULTS) {
  const mergedDefaults = { ...NPC_GLOBAL_DEFAULTS, ...globalDefaults };
  const dialogLines = Array.isArray(guest.dialogLines)
    ? guest.dialogLines.map((line, index) => normalizeDialogLine(line, index, mergedDefaults))
      .sort((a, b) => a.order - b.order)
    : [];

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
    dialogLines
  };
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
  return {
    completedGuestIds: [...new Set(completed.map(String))]
  };
}

export function saveConversationProgress(progress) {
  writeStorage(NPC_GUEST_PROGRESS_KEY, {
    completedGuestIds: [...new Set((progress?.completedGuestIds || []).map(String))]
  });
}

export function markConversationCompleted(guestId) {
  const progress = loadConversationProgress();

  if (!progress.completedGuestIds.includes(guestId)) {
    progress.completedGuestIds.push(guestId);
    saveConversationProgress(progress);
  }

  return progress;
}

export function clearConversationCompleted(guestId) {
  const progress = loadConversationProgress();
  progress.completedGuestIds = progress.completedGuestIds.filter((id) => id !== guestId);
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
  return (guest?.dialogLines || []).some((line) => String(line.koreanText || "").trim());
}

function mergeGuestRecords(jsonGuest, storedGuest, globalDefaults) {
  if (!jsonGuest) {
    return normalizeGuest(storedGuest, globalDefaults);
  }

  if (!storedGuest) {
    return normalizeGuest(jsonGuest, globalDefaults);
  }

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

  try {
    jsonBundle = await loadBaseGuestBundle(url);
  } catch (error) {
    console.warn("[npc-guest-data] failed to load base JSON", error);
  }

  const base = mergeGuestBundleWithJson(jsonBundle, stored);
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
    if (guest.guestId && guest.displayName) {
      map.set(guest.guestId, String(guest.displayName));
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
  const completed = new Set(progress.completedGuestIds || []);

  return normalized.guests
    .filter((guest) => guest.enabled && guest.guestId)
    .map((guest) => {
      const lines = (guest.dialogLines || [])
        .filter((line) => line.enabled && String(line.koreanText || "").trim())
        .sort((a, b) => a.order - b.order)
        .map((line) => resolveDialogLine(guest, line, normalized.globalDefaults));

      return {
        ...normalized.globalDefaults,
        ...guest,
        labelId: guest.displayName || guest.name,
        dialogLines: lines,
        conversationCompleted: completed.has(guest.guestId),
        canInteract: Boolean(
          guest.interactionEnabled
          && lines.length > 0
          && (guest.repeatable || !completed.has(guest.guestId))
        )
      };
    });
}

export function getGuestSummaryRows(bundle, progress = loadConversationProgress()) {
  const normalized = normalizeGuestBundle(bundle);
  const completed = new Set(progress.completedGuestIds || []);

  return normalized.guests.map((guest) => {
    const lines = (guest.dialogLines || []).filter((line) => line.enabled);
    const voiceCount = lines.filter((line) => Boolean(line.audioFile)).length;

    return {
      guestId: guest.guestId,
      name: guest.name,
      displayName: guest.displayName,
      enabled: guest.enabled,
      interactionEnabled: guest.interactionEnabled,
      dialogCount: lines.length,
      voiceCount,
      repeatable: guest.repeatable,
      completed: completed.has(guest.guestId),
      hasDialog: lines.length > 0
    };
  });
}

export function exportGuestBundleJson(bundle) {
  return JSON.stringify(normalizeGuestBundle(bundle), null, 2);
}

export function cloneGuestBundle(bundle) {
  return deepClone(normalizeGuestBundle(bundle));
}
