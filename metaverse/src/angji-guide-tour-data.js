/**
 * Angji GUIDE tour data — base JSON + localStorage overlay (local dev).
 */

export const ANGJI_GUIDE_TOUR_DATA_URL = "./data/guide/angji-guide-tour.json";
export const ANGJI_GUIDE_MANAGER_VERSION = "angji-guide-manager-20260822";
export const ANGJI_GUIDE_STORAGE_KEY = "angji-guide-tour-manager-v1";

export const GUIDE_TOUR_GLOBAL_DEFAULTS = {
  dialogDistance: 1.2,
  interactionDistance: 2.0,
  textSpeed: 0.0583,
  lineHoldSeconds: 1.0,
  lineHoldPerChar: 0.02,
  lineHoldMaxExtra: 3.33,
  cameraBlendSeconds: 0.85,
  idleDanceDelaySeconds: 300,
  idleDanceClips: [
    "Dance_Samba01",
    "Dance_Samba02",
    "Dance_Samba03",
    "Dance_Samba04",
    "Dance_Samba05",
    "Dance_Samba06",
    "Dance_Samba07"
  ]
};

export const GUIDE_POST_EVENT_TYPES = ["none", "yes_no", "other"];

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

function normalizePosition(raw = {}, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: asNumber(raw.x, fallback.x),
    y: asNumber(raw.y, fallback.y),
    z: asNumber(raw.z, fallback.z)
  };
}

export function normalizePostEvent(raw = {}) {
  const type = GUIDE_POST_EVENT_TYPES.includes(raw.type) ? raw.type : "none";

  return {
    type,
    comment: String(raw.comment || ""),
    checkpointId: String(raw.checkpointId || "")
  };
}

export function normalizeDialogueLine(line = {}, index = 0, eventId = "00") {
  const order = index + 1;
  const id = String(line.id || `${eventId}_${String(order).padStart(2, "0")}`);

  return {
    id,
    ko: String(line.ko || ""),
    en: String(line.en || ""),
    textSpeed: line.textSpeed == null || line.textSpeed === ""
      ? null
      : asNumber(line.textSpeed, null),
    startTourChoice: asBool(line.startTourChoice, false),
    orbitAfter: asBool(line.orbitAfter, false),
    cameraEffect: line.cameraEffect ? String(line.cameraEffect) : null,
    postEvent: normalizePostEvent(line.postEvent || {})
  };
}

export function normalizeTourEvent(event = {}, index = 0) {
  const id = String(event.id || String(index).padStart(2, "0"));
  const dialogues = Array.isArray(event.dialogues)
    ? event.dialogues.map((line, lineIndex) => normalizeDialogueLine(line, lineIndex, id))
    : [];

  return {
    id,
    title: String(event.title || `Event ${id}`),
    guidePosition: normalizePosition(event.guidePosition),
    guideRotationY: asNumber(event.guideRotationY, 0),
    keepConfiguredY: asBool(event.keepConfiguredY, false),
    cameraEffect: String(event.cameraEffect || "default"),
    closingAnimations: Array.isArray(event.closingAnimations)
      ? event.closingAnimations.map(String)
      : undefined,
    dialogues
  };
}

export function normalizeTourData(raw = {}) {
  const events = Array.isArray(raw.events)
    ? raw.events.map((event, index) => normalizeTourEvent(event, index))
    : [];

  return {
    version: asNumber(raw.version, 2),
    guideSpawnId: String(raw.guideSpawnId || "Angji-Guide"),
    dialogDistance: asNumber(raw.dialogDistance, GUIDE_TOUR_GLOBAL_DEFAULTS.dialogDistance),
    interactionDistance: asNumber(raw.interactionDistance, GUIDE_TOUR_GLOBAL_DEFAULTS.interactionDistance),
    textSpeed: asNumber(raw.textSpeed, GUIDE_TOUR_GLOBAL_DEFAULTS.textSpeed),
    lineHoldSeconds: asNumber(raw.lineHoldSeconds, GUIDE_TOUR_GLOBAL_DEFAULTS.lineHoldSeconds),
    lineHoldPerChar: asNumber(raw.lineHoldPerChar, GUIDE_TOUR_GLOBAL_DEFAULTS.lineHoldPerChar),
    lineHoldMaxExtra: asNumber(raw.lineHoldMaxExtra, GUIDE_TOUR_GLOBAL_DEFAULTS.lineHoldMaxExtra),
    cameraBlendSeconds: asNumber(raw.cameraBlendSeconds, GUIDE_TOUR_GLOBAL_DEFAULTS.cameraBlendSeconds),
    idleDanceDelaySeconds: asNumber(raw.idleDanceDelaySeconds, GUIDE_TOUR_GLOBAL_DEFAULTS.idleDanceDelaySeconds),
    idleDanceClips: Array.isArray(raw.idleDanceClips)
      ? raw.idleDanceClips.map(String)
      : [...GUIDE_TOUR_GLOBAL_DEFAULTS.idleDanceClips],
    orbitSpin: raw.orbitSpin ? deepClone(raw.orbitSpin) : undefined,
    transitionPrompt: raw.transitionPrompt ? deepClone(raw.transitionPrompt) : undefined,
    declineMessage: raw.declineMessage ? deepClone(raw.declineMessage) : undefined,
    escPrompt: raw.escPrompt ? deepClone(raw.escPrompt) : undefined,
    escChoiceLabels: raw.escChoiceLabels ? deepClone(raw.escChoiceLabels) : undefined,
    restartTourPrompt: raw.restartTourPrompt ? deepClone(raw.restartTourPrompt) : undefined,
    talkingClips: Array.isArray(raw.talkingClips) ? raw.talkingClips.map(String) : undefined,
    talkingSwitchSeconds: raw.talkingSwitchSeconds ? deepClone(raw.talkingSwitchSeconds) : undefined,
    events
  };
}

export function createEmptyDialogueLine(eventId = "00", index = 0) {
  return normalizeDialogueLine({
    id: `${eventId}_${String(index + 1).padStart(2, "0")}`,
    ko: "",
    en: "",
    postEvent: { type: "none", comment: "", checkpointId: "" }
  }, index, eventId);
}

export function createEmptyTourEvent(index = 0) {
  const id = String(index).padStart(2, "0");

  return normalizeTourEvent({
    id,
    title: `새 이벤트 ${id}`,
    guidePosition: { x: 0, y: 0, z: 0 },
    guideRotationY: 0,
    cameraEffect: "default",
    dialogues: [createEmptyDialogueLine(id, 0)]
  }, index);
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

export function loadStoredTourData() {
  const stored = readStorage(ANGJI_GUIDE_STORAGE_KEY);

  return stored ? normalizeTourData(stored) : null;
}

export function saveTourData(data) {
  const normalized = normalizeTourData(data);
  writeStorage(ANGJI_GUIDE_STORAGE_KEY, normalized);
  return normalized;
}

export function clearStoredTourData() {
  localStorage.removeItem(ANGJI_GUIDE_STORAGE_KEY);
}

export async function loadBaseTourData(url = ANGJI_GUIDE_TOUR_DATA_URL) {
  const response = await fetch(`${url}?v=${ANGJI_GUIDE_MANAGER_VERSION}`, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Failed to load guide tour data (${response.status})`);
  }

  return normalizeTourData(await response.json());
}

export async function loadEffectiveTourData(url = ANGJI_GUIDE_TOUR_DATA_URL) {
  const stored = loadStoredTourData();

  if (stored) {
    return stored;
  }

  return loadBaseTourData(url);
}

export function exportTourDataJson(data) {
  return `${JSON.stringify(normalizeTourData(data), null, 2)}\n`;
}

export function getEventSummaryRows(data) {
  return (data?.events || []).map((event) => ({
    id: event.id,
    title: event.title,
    lineCount: event.dialogues?.length || 0,
    position: event.guidePosition,
    rotationY: event.guideRotationY
  }));
}

export function radiansToDegrees(rad) {
  return (rad * 180) / Math.PI;
}

export function degreesToRadians(deg) {
  return (deg * Math.PI) / 180;
}
