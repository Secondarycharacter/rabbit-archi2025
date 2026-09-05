/**
 * Angji GUIDE tour data — base JSON + localStorage overlay (local dev).
 */

export const ANGJI_GUIDE_TOUR_DATA_URL = "./data/guide/angji-guide-tour.json";
export const ANGJI_GUIDE_MANAGER_VERSION = "guide-esc-label-20260905";
export const ANGJI_GUIDE_STORAGE_KEY = "angji-guide-tour-manager-v1";

export const DEFAULT_GUIDE_SPAWN_TRANSFORM = {
  position: { x: -44.89, y: 21.95, z: 29.8 },
  rotationY: 4.6915
};

/** Shipped GUIDE 360° intro — matches GitHub `angji-guide-tour.json`. */
export const DEFAULT_ORBIT_SPIN = {
  position: { x: -167.35, y: 25.00, z: 73.26 },
  target: { x: -10.54, y: 50.00, z: 16.37 },
  rotationY: 1.9188,
  durationSeconds: 20,
  rotationTurns: 1,
  pitchOffsetDegrees: -20
};

const MIN_GUIDE_SITE_Y = 8;

export function isInvalidGuideWorldPosition(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  const z = Number(position?.z);

  if (![x, y, z].every(Number.isFinite)) {
    return true;
  }

  return Math.hypot(x, z) < 1 && Math.abs(y) < 1;
}

export function isImplausibleGuideAltitude(y) {
  return !Number.isFinite(Number(y)) || Number(y) < MIN_GUIDE_SITE_Y;
}

export function isImplausibleOrbitSpin(spin) {
  const px = Number(spin?.position?.x);
  const py = Number(spin?.position?.y);
  const pz = Number(spin?.position?.z);
  const ty = Number(spin?.target?.y);

  if (![px, py, pz, ty].every(Number.isFinite)) {
    return true;
  }

  return Math.hypot(px, pz) < 1 && Math.abs(py) < 1;
}

export const GUIDE_TOUR_GLOBAL_DEFAULTS = {
  dialogDistance: 1.2,
  interactionDistance: 2.0,
  textSpeed: 0.0583,
  lineHoldSeconds: 1.0,
  lineHoldPerChar: 0.02,
  lineHoldMaxExtra: 3.33,
  cameraBlendSeconds: 0.85,
  idleDanceDelaySeconds: 180,
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

export const GUIDE_CAMERA_EFFECTS = [
  "default",
  "landscape",
  "hall",
  "outdoor",
  "building",
  "lookUp"
];

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

function normalizeOrbitSpin(raw) {
  if (isImplausibleOrbitSpin(raw)) {
    return deepClone(DEFAULT_ORBIT_SPIN);
  }

  return {
    position: normalizePosition(raw.position, DEFAULT_ORBIT_SPIN.position),
    target: normalizePosition(raw.target, DEFAULT_ORBIT_SPIN.target),
    rotationY: asNumber(raw.rotationY, DEFAULT_ORBIT_SPIN.rotationY),
    durationSeconds: asNumber(raw.durationSeconds, DEFAULT_ORBIT_SPIN.durationSeconds),
    rotationTurns: asNumber(raw.rotationTurns, DEFAULT_ORBIT_SPIN.rotationTurns),
    pitchOffsetDegrees: asNumber(raw.pitchOffsetDegrees, DEFAULT_ORBIT_SPIN.pitchOffsetDegrees)
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

/** Map runtime flags + postEvent for editor display and save round-trip. */
export function syncDialogueLinePostEvent(line) {
  let startTourChoice = asBool(line.startTourChoice, false);
  let orbitAfter = asBool(line.orbitAfter, false);
  let postEvent = normalizePostEvent(line.postEvent || {});

  if (postEvent.type === "none") {
    if (startTourChoice) {
      postEvent = { ...postEvent, type: "yes_no" };
    } else if (orbitAfter) {
      postEvent = { ...postEvent, type: "other", checkpointId: "orbit_spin" };
    }
  } else if (postEvent.type === "yes_no") {
    startTourChoice = true;
    orbitAfter = false;
  } else if (postEvent.type === "other") {
    startTourChoice = false;
    orbitAfter = !postEvent.checkpointId || postEvent.checkpointId === "orbit_spin";
    if (!postEvent.checkpointId && orbitAfter) {
      postEvent = { ...postEvent, checkpointId: "orbit_spin" };
    }
  } else {
    startTourChoice = false;
    orbitAfter = false;
  }

  line.startTourChoice = startTourChoice;
  line.orbitAfter = orbitAfter;
  line.postEvent = postEvent;
  return line;
}

export function normalizeDialogueLine(line = {}, index = 0, eventId = "00") {
  const order = index + 1;
  const id = String(line.id || `${eventId}_${String(order).padStart(2, "0")}`);

  const normalized = {
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

  return syncDialogueLinePostEvent(normalized);
}

export function normalizeTourEvent(event = {}, index = 0) {
  const id = String(event.id || String(index).padStart(2, "0"));
  const dialogues = Array.isArray(event.dialogues)
    ? event.dialogues.map((line, lineIndex) => normalizeDialogueLine(line, lineIndex, id))
    : [];
  const spawnFallback = id === "00" || index === 0;
  let guidePosition = normalizePosition(
    event.guidePosition,
    spawnFallback ? DEFAULT_GUIDE_SPAWN_TRANSFORM.position : { x: 0, y: 0, z: 0 }
  );
  let guideRotationY = asNumber(
    event.guideRotationY,
    spawnFallback ? DEFAULT_GUIDE_SPAWN_TRANSFORM.rotationY : 0
  );

  if (spawnFallback && isInvalidGuideWorldPosition(guidePosition)) {
    guidePosition = { ...DEFAULT_GUIDE_SPAWN_TRANSFORM.position };
    guideRotationY = asNumber(event.guideRotationY, DEFAULT_GUIDE_SPAWN_TRANSFORM.rotationY)
      || DEFAULT_GUIDE_SPAWN_TRANSFORM.rotationY;
  } else if (spawnFallback && isImplausibleGuideAltitude(guidePosition.y)) {
    guidePosition = {
      ...guidePosition,
      y: DEFAULT_GUIDE_SPAWN_TRANSFORM.position.y
    };
  }

  return {
    id,
    title: String(event.title || `Event ${id}`),
    guidePosition,
    guideRotationY,
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
    orbitSpin: normalizeOrbitSpin(raw.orbitSpin),
    transitionPrompt: raw.transitionPrompt ? deepClone(raw.transitionPrompt) : undefined,
    declineMessage: raw.declineMessage ? deepClone(raw.declineMessage) : undefined,
    escPrompt: raw.escPrompt ? deepClone(raw.escPrompt) : undefined,
    escChoiceLabels: raw.escChoiceLabels ? deepClone(raw.escChoiceLabels) : undefined,
    restartTourPrompt: raw.restartTourPrompt ? deepClone(raw.restartTourPrompt) : undefined,
    talkingClips: Array.isArray(raw.talkingClips) ? raw.talkingClips.map(String) : undefined,
    talkingSwitchSeconds: raw.talkingSwitchSeconds ? deepClone(raw.talkingSwitchSeconds) : undefined,
    talkingBlendSpeed: raw.talkingBlendSpeed == null
      ? undefined
      : asNumber(raw.talkingBlendSpeed, 0.045),
    talkingCrossfadeSeconds: raw.talkingCrossfadeSeconds == null
      ? undefined
      : asNumber(raw.talkingCrossfadeSeconds, 0.45),
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
    guidePosition: { ...DEFAULT_GUIDE_SPAWN_TRANSFORM.position },
    guideRotationY: DEFAULT_GUIDE_SPAWN_TRANSFORM.rotationY,
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

  if (!stored) {
    return null;
  }

  const normalized = normalizeTourData(stored);
  const storedSpawn = stored.events?.find((event) => event.id === "00") || stored.events?.[0];
  const shouldPersist = isInvalidGuideWorldPosition(storedSpawn?.guidePosition)
    || isImplausibleGuideAltitude(storedSpawn?.guidePosition?.y)
    || isImplausibleOrbitSpin(stored.orbitSpin);

  if (shouldPersist) {
    writeStorage(ANGJI_GUIDE_STORAGE_KEY, normalized);
  }

  return normalized;
}

export function saveTourData(data) {
  const normalized = normalizeTourData(data);
  writeStorage(ANGJI_GUIDE_STORAGE_KEY, normalized);
  return normalized;
}

const tourDataListeners = new Set();

export function subscribeTourDataUpdates(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  tourDataListeners.add(listener);
  return () => tourDataListeners.delete(listener);
}

function notifyTourDataListeners(data, meta = {}) {
  tourDataListeners.forEach((listener) => {
    try {
      listener(data, meta);
    } catch (error) {
      console.error("[guide-tour-data] listener failed", error);
    }
  });

  void import("./editor-mode/editor-broadcast-sync.js?v=editor-broadcast-sync-20260902")
    .then(({ postTourDataBroadcast }) => postTourDataBroadcast(data, meta))
    .catch(() => {});
}

/**
 * Single write path for Editor Mode saves.
 * NORMAL MODE reads the result through loadRuntimeTourData().
 */
export function publishTourData(data, options = {}) {
  const normalized = normalizeTourData(data);
  const persist = options.persist !== false;

  if (persist) {
    saveTourData(normalized);
  }

  notifyTourDataListeners(normalized, {
    source: options.source || (persist ? "publish-save" : "publish-apply"),
    persisted: persist
  });

  return normalized;
}

export function parseTourDataJson(text) {
  const parsed = JSON.parse(String(text ?? ""));
  return normalizeTourData(parsed);
}

export async function importTourDataFromFile(file) {
  const text = await file.text();
  return parseTourDataJson(text);
}

/** Runtime loader shared by NORMAL MODE and Editor Mode preview. */
export async function loadRuntimeTourData(url = ANGJI_GUIDE_TOUR_DATA_URL) {
  return loadEffectiveTourData(url);
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

function repairEventAltitudesAgainstBase(data, base) {
  const next = deepClone(data);
  const baseEvents = new Map((base?.events || []).map((event) => [event.id, event]));

  next.events = (next.events || []).map((event) => {
    const fromBase = baseEvents.get(event.id);
    const invalid = isInvalidGuideWorldPosition(event.guidePosition);
    const low = isImplausibleGuideAltitude(event.guidePosition?.y);

    if (!fromBase?.guidePosition || (!invalid && !low)) {
      return event;
    }

    return {
      ...event,
      guidePosition: invalid
        ? { ...fromBase.guidePosition }
        : { ...event.guidePosition, y: fromBase.guidePosition.y },
      guideRotationY: invalid ? fromBase.guideRotationY : event.guideRotationY,
      keepConfiguredY: invalid ? fromBase.keepConfiguredY : event.keepConfiguredY
    };
  });

  if (isImplausibleOrbitSpin(next.orbitSpin) || !next.orbitSpin) {
    next.orbitSpin = deepClone(base?.orbitSpin || DEFAULT_ORBIT_SPIN);
  }

  return next;
}

function pinShippedOrbitSpin(data, base) {
  if (!data || !base) {
    return data;
  }

  if (base.orbitSpin) {
    data.orbitSpin = deepClone(base.orbitSpin);
  }

  if (base.escPrompt) {
    data.escPrompt = deepClone(base.escPrompt);
  }

  if (base.escChoiceLabels) {
    data.escChoiceLabels = deepClone(base.escChoiceLabels);
  }

  return data;
}

export async function loadEffectiveTourData(url = ANGJI_GUIDE_TOUR_DATA_URL) {
  const stored = loadStoredTourData();
  let base = null;

  try {
    base = await loadBaseTourData(url);
  } catch (error) {
    console.warn("[guide-tour-data] base JSON load failed", error);
  }

  if (stored) {
    if (!base) {
      return stored;
    }

    const repaired = pinShippedOrbitSpin(
      repairEventAltitudesAgainstBase(stored, base),
      base
    );
    const changed = JSON.stringify(repaired) !== JSON.stringify(stored);

    if (changed) {
      writeStorage(ANGJI_GUIDE_STORAGE_KEY, repaired);
    }

    return repaired;
  }

  try {
    const { isGuideTourFirestoreConfigured, loadGuideTourFromFirestore } = await import(
      "./editor-mode/guide-tour-firestore.js?v=guide-orbit-github-20260903"
    );

    if (isGuideTourFirestoreConfigured()) {
      const remote = await loadGuideTourFromFirestore();

      if (remote) {
        return base
          ? pinShippedOrbitSpin(repairEventAltitudesAgainstBase(remote, base), base)
          : remote;
      }
    }
  } catch (error) {
    console.warn("[guide-tour-data] Firestore load skipped", error);
  }

  if (base) {
    return base;
  }

  throw new Error("Failed to load guide tour data");
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
