/**
 * Angji GUIDE tour data — base JSON + localStorage overlay (local dev).
 */

export const ANGJI_GUIDE_TOUR_DATA_URL = "./data/guide/angji-guide-tour.json";
export const ANGJI_GUIDE_MANAGER_VERSION = "restore-common-dialogues-20260907";
export const ANGJI_GUIDE_STORAGE_KEY = "angji-guide-tour-manager-v1";

export const DEFAULT_GUIDE_SPAWN_TRANSFORM = {
  position: { x: -44.89, y: 21.95, z: 29.8 },
  rotationY: 4.6915
};

/** Shipped GUIDE 360° intro — matches GitHub `angji-guide-tour.json`. */
export const DEFAULT_ORBIT_SPIN = {
  id: "orbit_spin",
  name: "사이트 전경",
  position: { x: -167.35, y: 25.00, z: 73.26 },
  target: { x: -10.54, y: 50.00, z: 16.37 },
  cameraHeight: 25,
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

export function isImplausibleOrbitSequences(sequences) {
  if (!Array.isArray(sequences) || sequences.length === 0) {
    return true;
  }

  return sequences.every((spin) => isImplausibleOrbitSpin(spin));
}

export const GUIDE_TOUR_GLOBAL_DEFAULTS = {
  dialogDistance: 1.2,
  interactionDistance: 2.0,
  textSpeed: 0.0583,
  lineHoldSeconds: 0,
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
  ],
  /** "__random_dance__" = pick any clip whose name starts with Dance */
  idleDanceClip: "__random_dance__"
};

/** Sentinel for Idle dance dropdown: random among Dance* clips. */
export const IDLE_DANCE_RANDOM_VALUE = "__random_dance__";

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

export function normalizeOrbitSequence(raw = {}, index = 0) {
  const fallback = DEFAULT_ORBIT_SPIN;
  const position = normalizePosition(raw.position, fallback.position);
  const target = normalizePosition(raw.target, fallback.target);
  // Prefer explicit position.y (카메라 Y); cameraHeight remains a compat alias.
  const cameraHeight = Number.isFinite(Number(raw.position?.y))
    ? asNumber(raw.position.y, fallback.position.y)
    : asNumber(raw.cameraHeight, position.y);
  position.y = cameraHeight;

  const idBase = index === 0 ? "orbit_spin" : `orbit_${index + 1}`;
  const id = String(raw.id || idBase).trim() || idBase;

  return {
    id,
    name: String(raw.name || (index === 0 ? "사이트 전경" : `오르빗 ${index + 1}`)).trim() || id,
    position,
    target,
    cameraHeight,
    rotationY: asNumber(raw.rotationY, fallback.rotationY),
    durationSeconds: Math.max(0.5, asNumber(raw.durationSeconds, fallback.durationSeconds)),
    rotationTurns: asNumber(raw.rotationTurns, fallback.rotationTurns),
    pitchOffsetDegrees: asNumber(raw.pitchOffsetDegrees, fallback.pitchOffsetDegrees)
  };
}

/** @deprecated Prefer normalizeOrbitSequence / orbitSequences. */
function normalizeOrbitSpin(raw) {
  if (isImplausibleOrbitSpin(raw)) {
    return normalizeOrbitSequence(DEFAULT_ORBIT_SPIN, 0);
  }

  return normalizeOrbitSequence(raw, 0);
}

export function normalizeOrbitSequences(raw = {}) {
  if (Array.isArray(raw.orbitSequences) && raw.orbitSequences.length > 0) {
    const seen = new Set();
    return raw.orbitSequences.map((item, index) => {
      const seq = normalizeOrbitSequence(item, index);
      let id = seq.id;
      let suffix = 2;

      while (seen.has(id)) {
        id = `${seq.id}_${suffix}`;
        suffix += 1;
      }

      seen.add(id);
      return { ...seq, id };
    });
  }

  if (raw.orbitSpin && !isImplausibleOrbitSpin(raw.orbitSpin)) {
    return [normalizeOrbitSequence({ ...raw.orbitSpin, id: raw.orbitSpin.id || "orbit_spin" }, 0)];
  }

  return [normalizeOrbitSequence(DEFAULT_ORBIT_SPIN, 0)];
}

export function findOrbitSequence(tourData, sequenceId) {
  const sequences = Array.isArray(tourData?.orbitSequences)
    ? tourData.orbitSequences
    : normalizeOrbitSequences(tourData || {});
  const id = String(sequenceId || "").trim();

  if (id) {
    const matched = sequences.find((item) => item.id === id);

    if (matched) {
      return matched;
    }
  }

  return sequences[0] || normalizeOrbitSequence(DEFAULT_ORBIT_SPIN, 0);
}

export function createEmptyOrbitSequence(index = 0) {
  return normalizeOrbitSequence({
    ...DEFAULT_ORBIT_SPIN,
    id: index === 0 ? "orbit_spin" : `orbit_${Date.now().toString(36)}`,
    name: index === 0 ? "사이트 전경" : `오르빗 ${index + 1}`
  }, index);
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
    // Explicit "없음" clears both legacy runtime flags and the badge.
    startTourChoice = false;
    orbitAfter = false;
    postEvent = { ...postEvent, checkpointId: "" };
  } else if (postEvent.type === "yes_no") {
    startTourChoice = true;
    orbitAfter = false;
    postEvent = { ...postEvent, checkpointId: "" };
  } else if (postEvent.type === "other") {
    startTourChoice = false;
    if (!postEvent.checkpointId) {
      postEvent = { ...postEvent, checkpointId: "orbit_spin" };
    }
    orbitAfter = Boolean(postEvent.checkpointId);
  } else {
    startTourChoice = false;
    orbitAfter = false;
  }

  line.startTourChoice = startTourChoice;
  line.orbitAfter = orbitAfter;
  line.postEvent = postEvent;
  return line;
}

/** Build 「다음 이벤트」 dropdown options including orbit sequences. */
export function buildPostEventSelectOptions(orbitSequences = []) {
  const options = [
    { value: "none", label: "없음" },
    { value: "yes_no", label: "YES / NO" }
  ];

  (orbitSequences || []).forEach((seq) => {
    options.push({
      value: `orbit:${seq.id}`,
      label: `오르빗 · ${seq.name || seq.id}`
    });
  });

  return options;
}

export function encodePostEventSelectValue(postEvent = {}, line = null) {
  // Prefer explicit postEvent, but fall back to legacy runtime flags so the
  // editor dropdown matches what the tour actually runs.
  if (postEvent?.type === "yes_no" || line?.startTourChoice) {
    return "yes_no";
  }

  if (postEvent?.type === "other" && postEvent.checkpointId) {
    return `orbit:${postEvent.checkpointId}`;
  }

  if (line?.orbitAfter) {
    return `orbit:${postEvent?.checkpointId || "orbit_spin"}`;
  }

  return "none";
}

export function decodePostEventSelectValue(value) {
  const raw = String(value || "none");

  if (raw === "yes_no") {
    return { type: "yes_no", checkpointId: "" };
  }

  if (raw.startsWith("orbit:")) {
    return { type: "other", checkpointId: raw.slice("orbit:".length) || "orbit_spin" };
  }

  return { type: "none", checkpointId: "" };
}

export function normalizeDialogueLine(line = {}, index = 0, eventId = "00") {
  const order = index + 1;
  const id = String(line.id || `${eventId}_${String(order).padStart(2, "0")}`);

  let startTourChoice = asBool(line.startTourChoice, false);
  let orbitAfter = asBool(line.orbitAfter, false);
  let postEvent = normalizePostEvent(line.postEvent || {});

  // Legacy JSON may only set startTourChoice / orbitAfter without postEvent.type.
  if ((!postEvent.type || postEvent.type === "none") && startTourChoice) {
    postEvent = { ...postEvent, type: "yes_no", checkpointId: "" };
  } else if ((!postEvent.type || postEvent.type === "none") && orbitAfter) {
    postEvent = {
      ...postEvent,
      type: "other",
      checkpointId: postEvent.checkpointId || "orbit_spin"
    };
  }

  const normalized = {
    id,
    ko: String(line.ko || ""),
    en: String(line.en || ""),
    textSpeed: line.textSpeed == null || line.textSpeed === ""
      ? null
      : asNumber(line.textSpeed, null),
    startTourChoice,
    orbitAfter,
    postEvent
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
  const orbitSequences = normalizeOrbitSequences(raw);
  const orbitSpin = orbitSequences[0]
    ? normalizeOrbitSequence(orbitSequences[0], 0)
    : normalizeOrbitSpin(raw.orbitSpin);

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
    idleDanceClip: (() => {
      const explicit = String(raw.idleDanceClip || "").trim();

      if (explicit) {
        return explicit;
      }

      const clips = Array.isArray(raw.idleDanceClips)
        ? raw.idleDanceClips.map(String).filter(Boolean)
        : [];

      // Legacy multi-clip lists behaved as a random pool → map to random Dance*.
      if (clips.length === 1) {
        return clips[0];
      }

      return IDLE_DANCE_RANDOM_VALUE;
    })(),
    orbitSequences,
    // Compat alias for older readers — first sequence.
    orbitSpin,
    closingAnimations: (() => {
      if (Array.isArray(raw.closingAnimations) && raw.closingAnimations.length) {
        return raw.closingAnimations.map(String);
      }

      // Migrate legacy per-event closingAnimations (usually last event).
      for (let i = events.length - 1; i >= 0; i -= 1) {
        const clips = events[i]?.closingAnimations;
        if (Array.isArray(clips) && clips.length) {
          return clips.map(String);
        }
      }

      return ["Greeting_bow", "Greeting_Hand", "Idle"];
    })(),
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
    || isImplausibleOrbitSequences(normalized.orbitSequences);

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

  if (isImplausibleOrbitSequences(next.orbitSequences)) {
    next.orbitSequences = normalizeOrbitSequences(base || { orbitSpin: DEFAULT_ORBIT_SPIN });
    next.orbitSpin = next.orbitSequences[0];
  }

  return next;
}

function isBlankLocalizedBlock(block) {
  if (!block || typeof block !== "object") {
    return true;
  }

  return !String(block.ko || "").trim() && !String(block.en || "").trim();
}

function pinShippedGuideDefaults(data, base) {
  if (!data || !base) {
    return data;
  }

  // Only fill missing/implausible orbit sequences — do not wipe editor-authored lists.
  if (isImplausibleOrbitSequences(data.orbitSequences)) {
    data.orbitSequences = normalizeOrbitSequences(base);
    data.orbitSpin = data.orbitSequences[0];
  } else if (!Array.isArray(data.orbitSequences) || data.orbitSequences.length === 0) {
    data.orbitSequences = normalizeOrbitSequences(base);
    data.orbitSpin = data.orbitSequences[0];
  } else {
    data.orbitSpin = data.orbitSequences[0];
  }

  [
    "transitionPrompt",
    "declineMessage",
    "escPrompt",
    "restartTourPrompt"
  ].forEach((key) => {
    if (base[key] && isBlankLocalizedBlock(data[key])) {
      data[key] = deepClone(base[key]);
    }
  });

  if (base.escChoiceLabels && !data.escChoiceLabels) {
    data.escChoiceLabels = deepClone(base.escChoiceLabels);
  }

  // Restore blank dialogue lines from shipped JSON (localStorage wipe / bad sync).
  if (Array.isArray(base.events) && Array.isArray(data.events)) {
    const baseById = new Map(base.events.map((event) => [String(event.id), event]));

    data.events = data.events.map((event) => {
      const fromBase = baseById.get(String(event.id));

      if (!fromBase?.dialogues?.length || !Array.isArray(event.dialogues)) {
        return event;
      }

      const baseLines = new Map(fromBase.dialogues.map((line) => [String(line.id), line]));
      const dialogues = event.dialogues.map((line, index) => {
        const baseLine = baseLines.get(String(line.id)) || fromBase.dialogues[index];

        if (!baseLine) {
          return line;
        }

        const koBlank = !String(line.ko || "").trim();
        const enBlank = !String(line.en || "").trim();

        if (!koBlank && !enBlank) {
          return line;
        }

        return {
          ...line,
          ko: koBlank ? String(baseLine.ko || "") : line.ko,
          en: enBlank ? String(baseLine.en || "") : line.en
        };
      });

      // If storage somehow dropped to a single empty line, restore full base set.
      const onlyEmptyShell = dialogues.length <= 1
        && !String(dialogues[0]?.ko || "").trim()
        && !String(dialogues[0]?.en || "").trim()
        && fromBase.dialogues.length > 1;

      return {
        ...event,
        dialogues: onlyEmptyShell
          ? deepClone(fromBase.dialogues)
          : dialogues
      };
    });
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

    const repaired = pinShippedGuideDefaults(
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
      "./editor-mode/guide-tour-firestore.js?v=guide-base-firestore-20260905"
    );

    if (isGuideTourFirestoreConfigured()) {
      const remote = await loadGuideTourFromFirestore();

      if (remote) {
        return base
          ? pinShippedGuideDefaults(repairEventAltitudesAgainstBase(remote, base), base)
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
