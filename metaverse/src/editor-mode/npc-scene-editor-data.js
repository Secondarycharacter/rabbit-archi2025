/**
 * Rabbit Metaverse Editor — NPC placement data (PHASE 1–2).
 * Matches Rabbit Metaverse Editor 기술 요구사항.pdf §7, §19–22, §27–31.
 */

export const NPC_SCENE_DATA_VERSION = "1.0";
export const NPC_SCENE_STORAGE_KEY = "rabbit-metaverse-npc-placements-v1";
export const NPC_SCENE_DATA_URL = "./data/npc/npcs.json";
export const EDITOR_NPC_ID_PREFIX = "npc_";

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePosition(raw = {}, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: asNumber(raw.x, fallback.x),
    y: asNumber(raw.y, fallback.y),
    z: asNumber(raw.z, fallback.z)
  };
}

export function radiansToDegrees(rad) {
  return (rad * 180) / Math.PI;
}

export function degreesToRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function npcModelFileName(path = "") {
  const normalized = String(path || "").replace(/\\/g, "/");
  const base = normalized.split("/").pop() || normalized;
  return base.trim() || normalized;
}

export function normalizeOffset3(raw, fallback = { x: 0, y: 0, z: 0 }) {
  if (typeof raw === "number") {
    return {
      x: 0,
      y: asNumber(raw, fallback.y),
      z: 0
    };
  }

  if (!raw || typeof raw !== "object") {
    return {
      x: asNumber(fallback.x, 0),
      y: asNumber(fallback.y, 0),
      z: asNumber(fallback.z, 0)
    };
  }

  return {
    x: asNumber(raw.x, fallback.x),
    y: asNumber(raw.y ?? raw.offsetY, fallback.y),
    z: asNumber(raw.z, fallback.z)
  };
}

function normalizeAnimPivots(raw = {}) {
  const pivots = {};

  Object.entries(raw || {}).forEach(([clip, pivot]) => {
    const name = String(clip || "").trim();

    if (!name || !pivot || typeof pivot !== "object") {
      return;
    }

    const offset = normalizeOffset3(pivot);
    pivots[name] = {
      useCustom: pivot.useCustom === true,
      x: offset.x,
      y: offset.y,
      z: offset.z
    };
  });

  return pivots;
}

export function normalizeNpcAnimation(raw = {}, fallbackSpawnAnim = null) {
  const fallback = fallbackSpawnAnim && typeof fallbackSpawnAnim === "object"
    ? fallbackSpawnAnim
    : null;
  const fallbackClips = Array.isArray(fallback?.clips)
    ? fallback.clips.map((clip) => String(clip || "").trim()).filter(Boolean)
    : [];
  let clips = Array.isArray(raw.clips)
    ? raw.clips.map((clip) => String(clip || "").trim()).filter(Boolean)
    : [];

  const requestedMode = String(raw.mode || raw.type || "").trim().toLowerCase();
  let mode = requestedMode;

  if (!mode) {
    if (clips.length > 1) {
      mode = "sequence";
    } else if (fallback?.type === "sequence") {
      mode = "sequence";
    } else if (raw.loop === false || fallback?.type === "once") {
      mode = "once";
    } else {
      mode = "loop";
    }
  }

  if (mode === "sequence" && !clips.length && fallbackClips.length) {
    clips = [...fallbackClips];
  }

  const defaultClip = String(
    raw.default
    || clips[0]
    || fallbackClips[0]
    || "Idle"
  );

  if (mode === "sequence") {
    if (!clips.length) {
      clips = [defaultClip];
    }

    return {
      mode: "sequence",
      type: "sequence",
      default: defaultClip,
      loop: true,
      clips,
      pivots: normalizeAnimPivots(raw.pivots)
    };
  }

  if (mode === "once") {
    return {
      mode: "once",
      type: "once",
      default: defaultClip,
      loop: false,
      clips: clips.length ? clips : [defaultClip],
      pivots: normalizeAnimPivots(raw.pivots)
    };
  }

  return {
    mode: "loop",
    type: "loop",
    default: defaultClip,
    loop: true,
    clips: clips.length ? clips : [defaultClip],
    pivots: normalizeAnimPivots(raw.pivots)
  };
}

export function spawnAnimationToEditor(animation) {
  if (!animation) {
    return normalizeNpcAnimation({ mode: "loop", default: "Idle", clips: ["Idle"] });
  }

  return normalizeNpcAnimation({
    mode: animation.type,
    type: animation.type,
    clips: animation.clips,
    default: animation.clips?.[0],
    loop: animation.type !== "once",
    pivots: animation.pivots
  });
}

export function editorAnimationToSpawn(animation) {
  const normalized = normalizeNpcAnimation(animation);

  if (normalized.mode === "sequence") {
    return {
      type: "sequence",
      clips: [...normalized.clips]
    };
  }

  return {
    type: normalized.mode === "once" ? "once" : "loop",
    clips: [normalized.default || normalized.clips[0] || "Idle"]
  };
}

/** Prefer editor animation; restore builtin sequence when record was collapsed. */
export function resolveRecordAnimation(record, builtinSpawn = null) {
  const raw = record?.animation || {};
  const builtinAnim = builtinSpawn?.animation || null;
  const mode = String(raw.mode || raw.type || "").trim().toLowerCase();
  const hasExplicitClips = Array.isArray(raw.clips);
  const clips = hasExplicitClips
    ? raw.clips.map((clip) => String(clip || "").trim()).filter(Boolean)
    : [];
  const defaultClip = String(raw.default || clips[0] || "");

  // New editor writes include mode + clips[]. Keep them as authored.
  if (mode && hasExplicitClips) {
    return normalizeNpcAnimation(raw, builtinAnim);
  }

  // Legacy / collapsed records (default+loop only) → restore builtin sequence.
  if (builtinAnim?.type === "sequence" && Array.isArray(builtinAnim.clips) && builtinAnim.clips.length) {
    const collapsed = !hasExplicitClips || clips.length <= 1;
    const looksCollapsed = collapsed && (
      !defaultClip
      || defaultClip === "Idle"
      || defaultClip === builtinAnim.clips[0]
    );

    if (!mode || looksCollapsed) {
      return spawnAnimationToEditor(builtinAnim);
    }
  }

  return normalizeNpcAnimation(raw, builtinAnim);
}

function normalizePatrolTarget(raw = {}) {
  const target = normalizePosition(raw);
  const moveClip = String(raw.moveClip || raw.clip || "").trim();
  const arrivalClip = String(raw.arrivalClip || "").trim();
  const arrivalCount = Math.max(1, Math.round(asNumber(raw.arrivalCount, 1)));

  if (moveClip) {
    target.moveClip = moveClip;
  }

  if (arrivalClip) {
    target.arrivalClip = arrivalClip;
    target.arrivalCount = arrivalCount;
  }

  return target;
}

export function normalizeNpcMovement(raw) {
  if (!raw || raw.type === "none" || raw.enabled === false) {
    return null;
  }

  if (raw.type !== "patrol") {
    return null;
  }

  const clips = Array.isArray(raw.clips)
    ? raw.clips.map((clip) => String(clip || "").trim()).filter(Boolean)
    : [];
  const patrolTargets = Array.isArray(raw.patrolTargets)
    ? raw.patrolTargets.map((target) => normalizePatrolTarget(target))
    : [];

  if (!patrolTargets.length) {
    return null;
  }

  const normalized = {
    type: "patrol",
    clip: String(raw.clip || clips[0] || "Walking"),
    speed: asNumber(raw.speed, 0.12),
    patrolTargets
  };

  if (clips.length) {
    normalized.clips = clips;
  }

  if (raw.randomClip === true) {
    normalized.randomClip = true;
  }

  if (raw.cycleRestClip) {
    normalized.cycleRestClip = String(raw.cycleRestClip);
    normalized.cycleRestCount = Math.max(1, Math.round(asNumber(raw.cycleRestCount, 1)));
  }

  if (raw.arrivalClip) {
    normalized.arrivalClip = String(raw.arrivalClip);
  }

  if (Number.isFinite(Number(raw.arrivalHoldMs))) {
    normalized.arrivalHoldMs = Math.max(200, Number(raw.arrivalHoldMs));
  }

  if (raw.arrivalLookAt && typeof raw.arrivalLookAt === "object") {
    normalized.arrivalLookAt = normalizePosition(raw.arrivalLookAt);
  }

  if (raw.snapToFloor === true || raw.snapToFloor === false) {
    normalized.snapToFloor = raw.snapToFloor;
  }

  if (Array.isArray(raw.snapToFloorSegments) && raw.snapToFloorSegments.length) {
    normalized.snapToFloorSegments = raw.snapToFloorSegments.map((segment) => ({
      fromMark: asNumber(segment.fromMark, asNumber(segment.toMark, 0)),
      toMark: asNumber(segment.toMark, asNumber(segment.fromMark, 0))
    }));
  }

  // Default ON (GitHub Mark-16/17/18/19). Mark-13 sets false.
  normalized.easeSpeed = raw.easeSpeed !== false;

  if (Number.isFinite(Number(raw.minSpeedFactor))) {
    normalized.minSpeedFactor = Number(raw.minSpeedFactor);
  }

  if (Number.isFinite(Number(raw.decelDistance))) {
    normalized.decelDistance = Number(raw.decelDistance);
  }

  if (Number.isFinite(Number(raw.accelRate))) {
    normalized.accelRate = Number(raw.accelRate);
  }

  if (raw.faceSpawnRotationOnDepart === true) {
    normalized.faceSpawnRotationOnDepart = true;
  }

  if (raw.randomSpeedCycle === true) {
    normalized.randomSpeedCycle = true;
  }

  return normalized;
}

/** Prefer authored editor movement; otherwise keep built-in config patrol. */
export function resolveRecordMovement(record, builtinSpawn = null) {
  const fromRecord = normalizeNpcMovement(record?.movement);

  if (fromRecord) {
    return fromRecord;
  }

  return normalizeNpcMovement(builtinSpawn?.movement);
}

export function resolveNpcOffset(record, clipName = null) {
  const clip = String(clipName || record?.animation?.default || "Idle");
  const pivot = record?.animation?.pivots?.[clip];

  if (pivot?.useCustom) {
    return normalizeOffset3(pivot);
  }

  return normalizeOffset3(record?.footOffset);
}

export function resolveNpcYOffset(record, clipName = null) {
  return resolveNpcOffset(record, clipName).y;
}

export function normalizeNpcRecord(raw = {}) {
  const id = String(raw.id || "").trim();

  if (!id) {
    return null;
  }

  const rotationYDeg = Number.isFinite(Number(raw.transform?.rotationY))
    ? asNumber(raw.transform.rotationY)
    : radiansToDegrees(asNumber(raw.transform?.rotationYRadians, 0));

  const record = {
    id,
    name: String(raw.name || id),
    type: raw.type === "guide" ? "guide" : "npc",
    deleted: raw.deleted === true,
    model: {
      path: String(raw.model?.path || raw.modelPath || "")
    },
    transform: {
      position: normalizePosition(raw.transform?.position),
      rotationY: rotationYDeg,
      scale: asNumber(raw.transform?.scale, 1)
    },
    footOffset: normalizeOffset3(raw.footOffset),
    interaction: {
      enabled: raw.interaction?.enabled !== false,
      triggerDistance: asNumber(raw.interaction?.triggerDistance, 1.5)
    },
    animation: normalizeNpcAnimation(raw.animation),
  };

  if (Object.prototype.hasOwnProperty.call(raw, "movement")) {
    record.movement = normalizeNpcMovement(raw.movement);
  }

  return record;
}

export function isEditorCreatedNpcId(id) {
  return String(id || "").startsWith(EDITOR_NPC_ID_PREFIX);
}

export function nextEditorNpcId(existingIds = []) {
  const used = new Set(existingIds.map(String));
  let index = 1;

  while (used.has(`${EDITOR_NPC_ID_PREFIX}${String(index).padStart(3, "0")}`)) {
    index += 1;
  }

  return `${EDITOR_NPC_ID_PREFIX}${String(index).padStart(3, "0")}`;
}

export function getActiveNpcRecords(document) {
  return (document?.npcs || []).filter((npc) => !npc.deleted);
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function buildEditorSpawnFromTemplate(templateSpawn, options = {}) {
  const source = templateSpawn || {};
  const position = options.position || source.position || { x: 0, y: 0, z: 0 };
  const animation = source.animation
    ? cloneJson(source.animation)
    : { type: "loop", clips: ["Idle"] };

  return {
    id: options.id,
    file: options.file || source.file,
    assetRoot: source.assetRoot,
    position: {
      x: asNumber(position.x),
      y: asNumber(position.y),
      z: asNumber(position.z)
    },
    rotationY: Number.isFinite(Number(options.rotationY))
      ? Number(options.rotationY)
      : asNumber(source.rotationY),
    animation,
    movement: source.movement ? cloneJson(source.movement) : undefined,
    scaleMultiplier: source.scaleMultiplier,
    sitYOffsetOverride: source.sitYOffsetOverride,
    preferExternalFloor: source.preferExternalFloor,
    devLabel: options.name || options.id,
    editorCreated: true
  };
}

export function collectNpcModelCatalog(guests = [], extraSpawns = []) {
  const catalog = [];
  const seen = new Set();

  [...extraSpawns, ...guests.map((guest) => guest?.spawn).filter(Boolean)].forEach((spawn) => {
    const file = String(spawn.file || "").trim();

    if (!file || seen.has(file)) {
      return;
    }

    seen.add(file);
    catalog.push({
      file,
      name: npcModelFileName(file),
      spawn
    });
  });

  return catalog;
}

export function normalizeNpcSceneDocument(raw = {}) {
  const npcs = Array.isArray(raw.npcs)
    ? raw.npcs.map(normalizeNpcRecord).filter(Boolean)
    : [];

  return {
    version: String(raw.version || NPC_SCENE_DATA_VERSION),
    projectId: String(raw.projectId || "angji"),
    npcs
  };
}

export function guestToNpcRecord(guest, options = {}) {
  if (!guest?.spawn?.id || !guest?.root) {
    return null;
  }

  const spawn = guest.spawn;
  const pos = guest.root.position;
  const footOffset = normalizeOffset3(
    spawn.footOffset ?? spawn.sitYOffsetOverride ?? 0
  );
  const pivots = normalizeAnimPivots(spawn.animationPivots || {});
  const builtin = typeof options.getBuiltinSpawnById === "function"
    ? options.getBuiltinSpawnById(spawn.id)
    : null;
  // Never persist night Devi/Marie mesh paths into the day placement document.
  let modelPath = spawn.file || "";

  if (builtin?.file && (
    options.preferBuiltinModelPath === true
    || /Devi\.glb/i.test(modelPath)
    || /01 Devi\//i.test(modelPath)
    || /Marie/i.test(modelPath)
  )) {
    modelPath = builtin.file;
  }

  return normalizeNpcRecord({
    id: spawn.id,
    name: spawn.devLabel || spawn.id,
    type: spawn.id === "Angji-Guide" ? "guide" : "npc",
    model: { path: modelPath },
    transform: {
      position: {
        x: pos.x,
        y: pos.y,
        z: pos.z
      },
      rotationY: radiansToDegrees(guest.root.rotation?.y ?? spawn.rotationY ?? 0),
      scale: guest.scaleMultiplier ?? spawn.scaleMultiplier ?? 1
    },
    interaction: {
      enabled: true,
      triggerDistance: 1.5
    },
    footOffset,
    animation: {
      ...spawnAnimationToEditor(spawn.animation),
      pivots
    },
    movement: spawn.movement || null
  });
}

export function buildNpcSceneFromGuests(guests = [], options = {}) {
  const npcs = guests
    .map((guest) => guestToNpcRecord(guest, options))
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return normalizeNpcSceneDocument({
    version: NPC_SCENE_DATA_VERSION,
    projectId: "angji",
    npcs
  });
}

function syncGuestSpawnOffset(guest, record, offset = null) {
  const resolved = offset || resolveNpcOffset(record);

  if (!guest?.spawn) {
    return resolved;
  }

  guest.spawn.footOffset = normalizeOffset3(record?.footOffset);
  guest.spawn.animationPivots = normalizeAnimPivots(record?.animation?.pivots);
  guest.spawn.positionOffset = resolved;
  guest.spawn.sitYOffsetOverride = resolved.y;

  if (guest.root?.position) {
    guest.spawn.positionBase = {
      x: guest.root.position.x - resolved.x,
      y: guest.root.position.y - resolved.y,
      z: guest.root.position.z - resolved.z
    };
  }

  return resolved;
}

export function applyNpcRecordToGuest(guest, record, options = {}) {
  if (!guest?.root || !record?.transform) {
    return false;
  }

  const { position, rotationY } = record.transform;
  const offset = resolveNpcOffset(record, options.clipName || null);
  const builtinSpawn = options.builtinSpawn || null;
  const previousMovementKey = JSON.stringify(guest.spawn?.movement || null);
  const transformOnly = options.transformOnly === true;
  const homePose = {
    x: asNumber(position.x, guest.root.position.x),
    y: asNumber(position.y, guest.root.position.y),
    z: asNumber(position.z, guest.root.position.z),
    rotationY: degreesToRadians(rotationY)
  };

  // Cast applies pose once before reveal, then again via applyPoseOverlay after
  // background dancers already started. Snapping/clearing phase there yanked
  // Mark-9/10/11 back to spawn mid-Samba (looked like a sudden group commute).
  // Same settle pass also yanked early-revealed patrol NPCs (e.g. Ethan) home
  // mid-first-leg, then force-restarted — looked like walk out → snap back → restart.
  const preserveActiveDance = options.preserveActiveDance === true
    && (
      guest.danceSequencePhase === "playing"
      || guest.danceSequencePhase === "returning"
    );
  const preserveActivePatrol = options.preserveActivePatrol === true
    && (
      guest.patrolPhase === "moving"
      || guest.patrolPhase === "idle"
      || guest.patrolPhase === "turningToArrivalLook"
      || guest.patrolPhase === "turningToDepart"
    )
    && (guest.isVisibleShown === true || guest.root.isEnabled?.() === true);

  if (!preserveActiveDance && !preserveActivePatrol) {
    guest.root.position.set(homePose.x, homePose.y, homePose.z);
    guest.root.rotation.y = homePose.rotationY;
  }

  if (guest.spawn) {
    guest.spawn.position = {
      x: homePose.x,
      y: homePose.y,
      z: homePose.z
    };
    guest.spawn.rotationY = homePose.rotationY;
    // Keep resolveGuestSpawn from re-deriving floor+sitY over the authored pose.
    guest.spawn.positionYOverride = homePose.y;
    // Force the next reveal to re-resolve from the edited spawn fields.
    guest.resolvedSpawn = null;
    guest._appliedClipOffset = null;

    // Editor / overlay snap is the canonical 등장위치 — lock return/home here so
    // dance sequences do not walk back to a stale mid-tour pose.
    guest.initialSpawnPose = { ...homePose };
    guest.danceSequenceHome = { ...homePose };

    if (!preserveActiveDance) {
      guest.danceSequencePhase = null;
      guest.syncSequenceRestartQueued = false;
    }

    // Night Devi enemies: keep Idle + chase behavior; only snap to day spawn pose.
    if (transformOnly) {
      guest.root.computeWorldMatrix(true);
      return true;
    }

    syncGuestSpawnOffset(guest, record, offset);

    const resolvedMovement = resolveRecordMovement(record, builtinSpawn);

    if (resolvedMovement?.type === "patrol") {
      guest.spawn.movement = cloneJson(resolvedMovement);
    } else if (
      Object.prototype.hasOwnProperty.call(record, "movement")
      && record.movement == null
      && options.allowClearMovement
    ) {
      delete guest.spawn.movement;
      guest.patrolPhase = null;
      guest.patrolArrivalPending = false;
    } else if (builtinSpawn?.movement?.type === "patrol") {
      guest.spawn.movement = cloneJson(builtinSpawn.movement);
    }

    const nextMovementKey = JSON.stringify(guest.spawn?.movement || null);
    const movementChanged = previousMovementKey !== nextMovementKey;

    if (guest.spawn.movement?.type === "patrol") {
      if (preserveActivePatrol && !movementChanged) {
        // Keep in-progress waypoint index/phase; cast overlay must not restart.
        guest._editorNeedsPatrolRestart = false;
      } else if (movementChanged || guest.patrolPhase == null) {
        guest.patrolTargetIndex = 0;
        guest.patrolPhase = "moving";
        guest.patrolArrivalPending = false;
        guest.patrolSpeedFactor = 0;
        guest._editorNeedsPatrolRestart = movementChanged || !guest.activeAnimationGroup;
      } else {
        guest._editorNeedsPatrolRestart = movementChanged || !guest.activeAnimationGroup;
      }
    } else {
      const resolvedAnimation = resolveRecordAnimation(record, builtinSpawn);
      record.animation = {
        ...resolvedAnimation,
        pivots: normalizeAnimPivots(record.animation?.pivots || resolvedAnimation.pivots)
      };
      const previousAnimKey = JSON.stringify(guest.spawn.animation || null);
      guest.spawn.animation = editorAnimationToSpawn(record.animation);
      const nextAnimKey = JSON.stringify(guest.spawn.animation || null);

      if (!preserveActiveDance) {
        guest._editorNeedsAnimRestart = previousAnimKey !== nextAnimKey || !guest.activeAnimationGroup;
      }
    }
  }

  guest.root.computeWorldMatrix(true);
  return true;
}

export function applyNpcSceneToGuests(guests = [], document, options = {}) {
  const byId = new Map((document?.npcs || []).map((npc) => [npc.id, npc]));
  const getBuiltinSpawnById = options.getBuiltinSpawnById || (() => null);
  const skipGuestIds = options.skipGuestIds instanceof Set
    ? options.skipGuestIds
    : new Set(options.skipGuestIds || []);
  let applied = 0;

  guests.forEach((guest) => {
    const guestId = guest.spawn?.id;

    if (skipGuestIds.has(guestId)) {
      return;
    }

    const record = byId.get(guestId);

    if (record && applyNpcRecordToGuest(guest, record, {
      builtinSpawn: getBuiltinSpawnById(guestId) || null,
      allowClearMovement: options.allowClearMovement === true,
      transformOnly: options.transformOnly === true,
      preserveActiveDance: options.preserveActiveDance === true,
      preserveActivePatrol: options.preserveActivePatrol === true
    })) {
      applied += 1;
    }
  });

  return applied;
}

export function readNpcSceneStorage() {
  try {
    const raw = localStorage.getItem(NPC_SCENE_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return normalizeNpcSceneDocument(JSON.parse(raw));
  } catch (error) {
    console.warn("[npc-scene-editor-data] storage read failed", error);
    return null;
  }
}

export function writeNpcSceneStorage(document) {
  const normalized = normalizeNpcSceneDocument(document);
  localStorage.setItem(NPC_SCENE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearNpcSceneStorage() {
  try {
    localStorage.removeItem(NPC_SCENE_STORAGE_KEY);
  } catch (error) {
    console.warn("[npc-scene-editor-data] storage clear failed", error);
  }
}

export function exportNpcSceneJson(document, pretty = true) {
  return JSON.stringify(normalizeNpcSceneDocument(document), null, pretty ? 2 : 0);
}

export async function loadBaseNpcScene(url = NPC_SCENE_DATA_URL) {
  try {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-cache" });

    if (!response.ok) {
      return null;
    }

    return normalizeNpcSceneDocument(await response.json());
  } catch (error) {
    console.warn("[npc-scene-editor-data] base JSON load failed", error);
    return null;
  }
}

function enforceBuiltinModelIdentity(document, options = {}) {
  if (typeof options.getBuiltinSpawnById !== "function") {
    return document;
  }

  return normalizeNpcSceneDocument({
    ...document,
    npcs: (document?.npcs || [])
      .filter((npc) => npc.id !== "Mark-Night-Marie")
      .map((npc) => {
      const builtin = options.getBuiltinSpawnById(npc.id);
      const storedPath = String(npc.model?.path || "");
      const wasNightKind = Boolean(builtin) && (
        /Devi\.glb/i.test(storedPath)
        || /01 Devi\//i.test(storedPath)
      );

      if (!builtin?.file) {
        return npc;
      }

      return {
        ...npc,
        model: { path: builtin.file },
        ...(wasNightKind
          ? {
            animation: spawnAnimationToEditor(builtin.animation),
            movement: normalizeNpcMovement(builtin.movement)
          }
          : {})
      };
    })
  });
}

export async function loadEffectiveNpcScene(
  guests = [],
  url = NPC_SCENE_DATA_URL,
  options = {}
) {
  const fromGuests = buildNpcSceneFromGuests(guests, options);
  const stored = readNpcSceneStorage();
  const base = await loadBaseNpcScene(url);

  // Project npcs.json is the shipped baseline (same coords as angji-guest-config /
  // GitHub Pages). Stale localStorage used to replace the whole document and made
  // Mark-* spawn positions diverge from the homepage. Keep storage only for
  // editor-created NPCs; Mark/Guide poses always come from the project file.
  let document = fromGuests;

  if (base?.npcs?.length) {
    document = mergeNpcSceneDocuments(document, base);
  } else if (options.preferStorageDrafts === true && stored?.npcs?.length) {
    document = mergeNpcSceneDocuments(document, stored);
  }

  if (stored?.npcs?.length) {
    const editorOnly = normalizeNpcSceneDocument({
      ...stored,
      npcs: stored.npcs.filter((npc) => isEditorCreatedNpcId(npc.id))
    });

    if (editorOnly.npcs.length) {
      document = mergeNpcSceneDocuments(document, editorOnly);
    }
  }

  return enforceBuiltinModelIdentity(document, options);
}

export function mergeNpcSceneDocuments(baseDoc, overlayDoc) {
  const base = normalizeNpcSceneDocument(baseDoc);
  const overlay = normalizeNpcSceneDocument(overlayDoc);
  const rawOverlayById = new Map(
    (Array.isArray(overlayDoc?.npcs) ? overlayDoc.npcs : [])
      .filter((npc) => npc?.id)
      .map((npc) => [String(npc.id), npc])
  );
  const byId = new Map(base.npcs.map((npc) => [npc.id, npc]));

  overlay.npcs.forEach((npc) => {
    const prev = byId.get(npc.id);
    const rawOverlayAnim = rawOverlayById.get(npc.id)?.animation || {};
    const isLegacyAnim = (
      !Object.prototype.hasOwnProperty.call(rawOverlayAnim, "mode")
      && !Object.prototype.hasOwnProperty.call(rawOverlayAnim, "type")
      && !Object.prototype.hasOwnProperty.call(rawOverlayAnim, "clips")
    );
    const overlayHasMovement = Object.prototype.hasOwnProperty.call(npc, "movement");
    const overlayMovement = normalizeNpcMovement(npc.movement);
    const prevMovement = normalizeNpcMovement(prev?.movement) || prev?.movement || null;
    const prevAnim = normalizeNpcAnimation(prev?.animation || {});
    const overlayAnim = normalizeNpcAnimation(npc.animation || {});
    const overlayLooksCollapsedSequence = (
      isLegacyAnim
      && prevAnim.mode === "sequence"
      && overlayAnim.mode !== "sequence"
      && overlayAnim.clips.length <= 1
      && (
        !overlayAnim.default
        || overlayAnim.default === "Idle"
        || overlayAnim.default === prevAnim.clips[0]
      )
    );
    const mergedAnimation = overlayLooksCollapsedSequence
      ? {
        ...prevAnim,
        pivots: {
          ...(prevAnim.pivots || {}),
          ...(overlayAnim.pivots || {})
        }
      }
      : {
        ...prevAnim,
        ...overlayAnim,
        pivots: {
          ...(prevAnim.pivots || {}),
          ...(overlayAnim.pivots || {})
        }
      };
    const merged = {
      ...(prev || {}),
      ...npc,
      animation: mergedAnimation,
      footOffset: normalizeOffset3(npc.footOffset ?? prev?.footOffset),
      movement: overlayHasMovement
        ? (overlayMovement || (npc.movement == null ? null : prevMovement))
        : prevMovement
    };

    // Empty/invalid overlay patrol must not wipe built-in path data from base.
    if (!normalizeNpcMovement(merged.movement) && prevMovement) {
      merged.movement = prevMovement;
    }

    byId.set(npc.id, normalizeNpcRecord({
      ...merged,
      ...(merged.movement != null || overlayHasMovement ? { movement: merged.movement ?? null } : {})
    }));
  });

  return {
    ...base,
    version: overlay.version || base.version,
    projectId: overlay.projectId || base.projectId,
    npcs: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  };
}
