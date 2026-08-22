/** Angji tour guest placements (Mark-1 … Mark-22). */

export const ANGJI_NIGHT_DEVI_ASSET_ROOT = "./assets/Enemy/";
export const ANGJI_NIGHT_DEVI_FILE = "01 Devi/Devi.glb";
export const ANGJI_NIGHT_MARIE_FILE = "05 Edition/01 Marie Antoinette Fox/Edition_Marie.glb";
export const ANGJI_NIGHT_MARIE_GUEST_ID = "Mark-Night-Marie";
export const ANGJI_GUEST_CONFIG_VERSION = "angji-guest-night-marie-extra-20260719";

export const ANGJI_PRIORITY_GUEST_IDS = ["Mark-1", "Mark-2"];
export const ANGJI_SIMULTANEOUS_GUEST_IDS = ["Mark-4", "Mark-5", "Mark-6"];

/**
 * Night-only extra guest (does not replace Mark-1).
 * Mark-1 keeps its original spot as Devi; Marie stands at this overlook.
 */
export const ANGJI_NIGHT_MARIE_SPAWN = {
  id: ANGJI_NIGHT_MARIE_GUEST_ID,
  position: { x: -81.81, y: 72.07, z: -211.39 },
  positionYOverride: 72.07,
  rotationY: -6.5153,
  file: ANGJI_NIGHT_MARIE_FILE,
  assetRoot: "./assets/guest/",
  animation: {
    type: "loop",
    clips: ["Idle"],
    clipAliases: ["Idle", "IDLE", "Armature|Idle", "mixamo.com"]
  }
};

/** Night-mode Devi: aggro / attack / leash return. */
export const ANGJI_NIGHT_DEVI_BEHAVIOR = {
  type: "nightDeviChase",
  /** Start following when rabbit enters this radius. */
  aggroRange: 5,
  /** Attack while rabbit is within this radius. */
  attackRange: 1,
  /** Keep chasing (after engage) while rabbit is within this radius. */
  chaseRange: 10,
  /** Start leash timer when rabbit is at/beyond this distance. */
  leashRange: 8,
  leashTimeoutMs: 5000,
  /** Full run speed; chase uses half of this. */
  runSpeed: 0.2,
  /** Home return speed (Walking). */
  walkSpeed: 0.075,
  pathRecordDistance: 0.45,
  idleClip: "Idle",
  chaseClip: "Walking",
  walkClip: "Walking",
  runClip: "Run_Fast",
  runClipAliases: ["Run_Fast", "Run", "Running", "Jump_Run"],
  attackClipPrefix: "Attack"
};

export function toAngjiNightGuestSpawn(spawn) {
  return {
    id: spawn.id,
    position: { ...spawn.position },
    rotationY: spawn.rotationY,
    scaleMultiplier: spawn.scaleMultiplier,
    devLabel: spawn.devLabel,
    file: ANGJI_NIGHT_DEVI_FILE,
    assetRoot: ANGJI_NIGHT_DEVI_ASSET_ROOT,
    behavior: { ...ANGJI_NIGHT_DEVI_BEHAVIOR },
    animation: {
      type: "loop",
      clips: ["Idle"],
      clipAliases: ["Idle", "IDLE", "Armature|Idle", "mixamo.com"]
    }
  };
}

export function getAngjiNightExtraGuestSpawns() {
  return [{
    ...ANGJI_NIGHT_MARIE_SPAWN,
    position: { ...ANGJI_NIGHT_MARIE_SPAWN.position },
    animation: {
      type: ANGJI_NIGHT_MARIE_SPAWN.animation.type,
      clips: [...ANGJI_NIGHT_MARIE_SPAWN.animation.clips],
      clipAliases: [...ANGJI_NIGHT_MARIE_SPAWN.animation.clipAliases]
    }
  }];
}

export function mapAngjiGuestSpawnsForMode(spawns, nightMode) {
  if (!nightMode) {
    return spawns;
  }

  return spawns.map((spawn) => toAngjiNightGuestSpawn(spawn));
}

/** Thriller trio (Mark-4~6) keep in-place dance; all other Angji dance clips may move with root motion. */
export const ANGJI_DANCE_ROOT_MOTION_EXCLUDED_GUEST_IDS = [...ANGJI_SIMULTANEOUS_GUEST_IDS];

const ANGJI_DANCE_CLIP_PATTERN = /dance|samba dancing|swing dancing/i;

export function isAngjiGuestId(spawnId) {
  return /^Mark-\d+$/.test(String(spawnId || ""));
}

export function isAngjiDanceAnimationClip(clipName) {
  return ANGJI_DANCE_CLIP_PATTERN.test(String(clipName || ""));
}

export function shouldAngjiGuestAllowDanceRootMotion(spawnId) {
  return isAngjiGuestId(spawnId)
    && !ANGJI_DANCE_ROOT_MOTION_EXCLUDED_GUEST_IDS.includes(spawnId);
}

const ANGJI_RESERVED_GUEST_IDS = new Set([
  ...ANGJI_PRIORITY_GUEST_IDS,
  ...ANGJI_SIMULTANEOUS_GUEST_IDS
]);

/** Mark-1, Mark-2 and Mark-13+ are outdoor; orbit shows them, tour keeps them and adds indoor guests. */
export const ANGJI_OUTDOOR_GUEST_MIN_MARK = 13;

/** New-area guests (Mark-19+) use walk-tour indoor spawn despite mark number. */
export const ANGJI_INDOOR_GUEST_OVERRIDE_IDS = ["Mark-19", "Mark-20", "Mark-21", "Mark-22"];

function getGuestMarkNumber(spawnId) {
  return Number(String(spawnId).replace("Mark-", ""));
}

export function getAngjiGuestNumberLabel(spawnId) {
  const markNumber = getGuestMarkNumber(spawnId);

  if (!Number.isFinite(markNumber)) {
    return "";
  }

  return String(markNumber).padStart(2, "0");
}

/** Shipped Korean display names for Mark-1 … Mark-22 (matches data/npc/guests.json). */
export const ANGJI_GUEST_DISPLAY_NAMES = {
  "Mark-1": "카이",
  "Mark-2": "엘리아",
  "Mark-3": "루카",
  "Mark-4": "노아",
  "Mark-5": "리안",
  "Mark-6": "아린",
  "Mark-7": "레오",
  "Mark-8": "니아",
  "Mark-9": "세라",
  "Mark-10": "루나",
  "Mark-11": "미아",
  "Mark-12": "이안",
  "Mark-13": "리오",
  "Mark-14": "아론",
  "Mark-15": "엘린",
  "Mark-16": "테오",
  "Mark-17": "노엘",
  "Mark-18": "리아",
  "Mark-19": "에단",
  "Mark-20": "루이",
  "Mark-21": "유나",
  "Mark-22": "에이든"
};

export function getAngjiGuestDisplayName(spawnId) {
  return ANGJI_GUEST_DISPLAY_NAMES[spawnId]
    || ANGJI_GUEST_MARKS.find((spawn) => spawn.id === spawnId)?.devLabel
    || getAngjiGuestNumberLabel(spawnId);
}

/** Model guests (Mark-1 … Mark-22) sorted by mark number for manager lists. */
export function getAngjiModelGuestEntriesSorted() {
  return [...ANGJI_GUEST_MARKS]
    .map((spawn) => {
      const label = getAngjiGuestNumberLabel(spawn.id);
      return {
        guestId: spawn.id,
        guestKey: `guest${label}`,
        name: `Guest ${label}`,
        displayName: getAngjiGuestDisplayName(spawn.id)
      };
    })
    .sort((a, b) => getGuestMarkNumber(a.guestId) - getGuestMarkNumber(b.guestId));
}

export function isAngjiOutdoorGuestId(spawnId) {
  if (ANGJI_INDOOR_GUEST_OVERRIDE_IDS.includes(spawnId)) {
    return false;
  }

  if (ANGJI_PRIORITY_GUEST_IDS.includes(spawnId)) {
    return true;
  }

  const markNumber = getGuestMarkNumber(spawnId);
  return Number.isFinite(markNumber) && markNumber >= ANGJI_OUTDOOR_GUEST_MIN_MARK;
}

export function getAngjiOutdoorGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => isAngjiOutdoorGuestId(spawn.id));
}

export function getAngjiOutdoorBackgroundGuestSpawns() {
  return getAngjiOutdoorGuestSpawns().filter((spawn) => !ANGJI_PRIORITY_GUEST_IDS.includes(spawn.id));
}

export function getAngjiIndoorGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => !isAngjiOutdoorGuestId(spawn.id));
}

export function getAngjiIndoorGuestIds() {
  return getAngjiIndoorGuestSpawns().map((spawn) => spawn.id);
}

export function getAngjiOutdoorGuestIds() {
  return getAngjiOutdoorGuestSpawns().map((spawn) => spawn.id);
}

export function getAngjiAllGuestIds() {
  return [
    ...ANGJI_GUEST_MARKS.map((spawn) => spawn.id),
    ANGJI_NIGHT_MARIE_GUEST_ID
  ];
}

export function getAngjiIndoorBackgroundGuestSpawns() {
  return getAngjiIndoorGuestSpawns().filter((spawn) => !ANGJI_RESERVED_GUEST_IDS.has(spawn.id));
}

export function getAngjiPriorityGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => ANGJI_PRIORITY_GUEST_IDS.includes(spawn.id));
}

export function getAngjiSimultaneousGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => ANGJI_SIMULTANEOUS_GUEST_IDS.includes(spawn.id));
}

export function getAngjiBackgroundGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => !ANGJI_RESERVED_GUEST_IDS.has(spawn.id));
}

function getBackgroundGuestRevealDelayMs(spawnId) {
  const markNumber = Number(String(spawnId).replace("Mark-", ""));
  return Number.isFinite(markNumber) && markNumber >= 14 ? 500 : 250;
}

function getBackgroundGuestLoadYieldFrames(spawnId) {
  const markNumber = Number(String(spawnId).replace("Mark-", ""));
  return Number.isFinite(markNumber) && markNumber >= 14 ? 4 : 2;
}

export { getBackgroundGuestRevealDelayMs, getBackgroundGuestLoadYieldFrames };

/** Applied from Mark-1 placement anchor (-12.68, 22.11, 6.9). */
export const ANGJI_GUEST_WORLD_OFFSET = { x: 0.29, y: 5.03, z: -1.63 };

/** Extra root Y for seated guests (Sit / Sitting / Seat clips). Tune here. */
export const ANGJI_SIT_GUEST_Y_OFFSET = 0.12;

const SIT_CLIP_PATTERN = /sit|seat/i;

/** Patrol loop for Mark-19 (new area Mark-1~12 coordinates). */
const ANGJI_MARK19_PATROL_WAYPOINTS = [
  { x: 18.37, y: 22.17, z: 2.18 },
  { x: 18.55, y: 22.17, z: 2.61 },
  { x: 18.54, y: 22.17, z: 3.23 },
  { x: 18.22, y: 22.17, z: 3.56 },
  { x: 17.47, y: 22.17, z: 3.8 },
  { x: 16.77, y: 22.17, z: 3.7 },
  { x: 14.08, y: 22.17, z: -0.17 },
  { x: 13.73, y: 22.17, z: -0.72 },
  { x: 13.76, y: 22.17, z: -1.24 },
  { x: 14.19, y: 22.17, z: -1.66 },
  { x: 14.9, y: 22.17, z: -1.98 },
  { x: 15.77, y: 22.17, z: -1.58 }
];

export function getAngjiGuestPositionYOffset(spawn) {
  if (typeof spawn.sitYOffsetOverride === "number") {
    return spawn.sitYOffsetOverride;
  }

  const clips = [
    ...(spawn.animation?.clips || []),
    spawn.movement?.clip
  ].filter(Boolean);

  return clips.some((clip) => SIT_CLIP_PATTERN.test(clip)) ? ANGJI_SIT_GUEST_Y_OFFSET : 0;
}

export const ANGJI_GUEST_MARKS = [
  {
    id: "Mark-1",
    file: "01 Happycats/01 Skeleton_Dancer/Happycats_Skeleton_Dancer.glb",
    position: { x: -12.68, y: 22.11, z: 6.9 },
    rotationY: -1.1292,
    animation: { type: "loop", clips: ["Idle"] }
  },
  {
    id: "Mark-2",
    file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
    position: { x: -11.14, y: 22.05, z: 15.83 },
    rotationY: 10.9752,
    animation: { type: "loop", clips: ["Idle"] }
  },
  {
    id: "Mark-3",
    file: "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
    position: { x: 5.3, y: 22.47, z: -0.42 },
    sitYOffsetOverride: 0.17,
    rotationY: 16.0116,
    animation: { type: "loop", clips: ["Seat_Clapping"] }
  },
  {
    id: "Mark-4",
    file: "04 Monkey/01 Monkey1/Monkey_Thriller Dancer_Ver1.glb",
    position: { x: -15.34, y: 22.35, z: -2.82 },
    rotationY: 1.9216,
    animation: {
      type: "sequence",
      clips: [
        "Dance_Thriller0",
        "Dance_Thriller1",
        "Dance_Thriller2",
        "Dance_Thriller3",
        "Dance_Thriller4"
      ]
    }
  },
  {
    id: "Mark-5",
    file: "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb",
    position: { x: -17, y: 22.35, z: -5.84 },
    rotationY: 1.8351,
    animation: {
      type: "sequence",
      clips: [
        "Dance_Thriller0",
        "Dance_Thriller1",
        "Dance_Thriller2",
        "Dance_Thriller3",
        "Dance_Thriller4"
      ]
    }
  },
  {
    id: "Mark-6",
    file: "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb",
    position: { x: -13.53, y: 22.35, z: 0.73 },
    rotationY: 2.006,
    animation: {
      type: "sequence",
      clips: [
        "Dance_Thriller0",
        "Dance_Thriller1",
        "Dance_Thriller2",
        "Dance_Thriller3",
        "Dance_Thriller4"
      ]
    }
  },
  {
    id: "Mark-7",
    file: "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
    position: { x: -2.36, y: 22.2, z: -0.32 },
    rotationY: 9.6919,
    animation: { type: "sequence", clips: ["Sit_Clap", "Sit_Disapproval"] }
  },
  {
    id: "Mark-8",
    file: "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
    position: { x: 5.83, y: 22.2, z: -4.32 },
    rotationY: 9.828,
    animation: { type: "loop", clips: ["Sitting Talking"] }
  },
  {
    id: "Mark-9",
    file: "05 Edition/01 Marie Antoinette Fox/Edition_Marie.glb",
    position: { x: -5.08, y: 22.21, z: 16.32 },
    rotationY: 14.7478,
    animation: {
      type: "sequence",
      clips: [
        "Dance_Samba1",
        "Dance_Samba2",
        "Dance_Samba3",
        "Dance_Samba4",
        "Dance_Samba5",
        "Dance_Samba6",
        "Dance_Samba7",
        "Dance_Samba8"
      ]
    }
  },
  {
    id: "Mark-10",
    file: "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
    position: { x: -5.76, y: 22.2, z: 13.77 },
    rotationY: 1.708,
    animation: {
      type: "sequence",
      clips: [
        "Swing Dancing (1)",
        "Swing Dancing (2)",
        "Swing Dancing (3)",
        "Swing Dancing (4)",
        "Swing Dancing (5)"
      ]
    }
  },
  {
    id: "Mark-11",
    file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
    position: { x: -2.79, y: 22.2, z: 18.89 },
    rotationY: 3.0448,
    animation: {
      type: "sequence",
      clips: [
        "Samba Dancing01",
        "Samba Dancing02",
        "Samba Dancing03",
        "Samba Dancing04",
        "Samba Dancing05",
        "Samba Dancing06",
        "Samba Dancing07"
      ]
    }
  },
  {
    id: "Mark-12",
    file: "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
    position: { x: 0.32, y: 22.2, z: 12.39 },
    rotationY: 5.9136,
    animation: {
      type: "sequence",
      clips: ["Dance_Gangnam Style", "Dance_Locking Hip Hop"]
    }
  },
  {
    id: "Mark-13",
    file: "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
    position: { x: -24.5, y: 22.02, z: -7.47 },
    rotationY: -3.7625,
    movement: {
      type: "patrol",
      clip: "Run_Fast",
      speed: 0.135,
      snapToFloor: true,
      easeSpeed: false,
      snapToFloorSegments: [
        { fromMark: 3, toMark: 4 },
        { fromMark: 6, toMark: 8 }
      ],
      patrolTargets: [
        { x: -22.14, y: 22.02, z: -12.4 },
        { x: -8.58, y: 22.31, z: -19.72 },
        { x: 3.94, y: 23.19, z: -28.01 },
        { x: 8.36, y: 23.37, z: -27.68 },
        { x: 24.16, y: 23.37, z: 1.47 },
        { x: 22.9, y: 23.12, z: 5.67 },
        { x: -1.38, y: 22.05, z: 24.84 },
        { x: -5.79, y: 22.02, z: 25.3 },
        { x: -24.5, y: 22.02, z: -7.47 }
      ]
    }
  },
  {
    id: "Mark-14",
    file: "01 Happycats/01 Skeleton_Dancer/Happycats_Skeleton_Dancer.glb",
    position: { x: -66.93, y: 21.63, z: 12.6 },
    rotationY: 3.5491,
    animation: {
      type: "sequence",
      clips: [
        "Idle_Breath",
        "Idle_Breath",
        "Sport_Golf_Driver",
        "Sport_Golf_Driver",
        "Sport_Golf_Badshot"
      ]
    }
  },
  {
    id: "Mark-15",
    file: "01 Happycats/02_Happycat_Ultra_General/Happycats_Ultra_gen.glb",
    position: { x: 47.62, y: 23.94, z: -38.39 },
    rotationY: 4.627,
    sitYOffsetOverride: 0.4,
    animation: { type: "loop", clips: ["Sit_Footswing"] }
  },
  {
    id: "Mark-16",
    file: "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
    position: { x: 29.22, y: 23.37, z: -13.46 },
    rotationY: 3.5827,
    movement: {
      type: "patrol",
      clips: ["Walking", "Run_Fast"],
      randomClip: true,
      arrivalClip: "Idle",
      arrivalLookAt: { x: 18.66, y: 23.37, z: -29.74 },
      speed: 0.135,
      patrolTargets: [
        { x: 22.02, y: 23.37, z: -16.56 },
        { x: 26.29, y: 23.37, z: -19.34 },
        { x: 29.22, y: 23.37, z: -13.46 }
      ]
    }
  },
  {
    id: "Mark-17",
    file: "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
    position: { x: 17.49, y: 23.37, z: -28.15 },
    rotationY: 7.1784,
    movement: {
      type: "patrol",
      clips: ["Walking", "Run_Fast"],
      randomClip: true,
      arrivalClip: "Idle",
      arrivalLookAt: { x: 29.56, y: 23.37, z: -10.3 },
      speed: 0.135,
      patrolTargets: [
        { x: 25.16, y: 23.37, z: -23.6 },
        { x: 19.84, y: 23.37, z: -22.34 },
        { x: 17.49, y: 23.37, z: -28.15 }
      ]
    }
  },
  {
    id: "Mark-18",
    file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
    position: { x: 41.98, y: 23.37, z: -44.43 },
    rotationY: 2.1988,
    movement: {
      type: "patrol",
      clip: "Run_Goofy",
      cycleRestClip: "Idle",
      cycleRestCount: 2,
      speed: 0.0945,
      patrolTargets: [
        { x: 55.85, y: 23.37, z: -51.83 },
        { x: 56.24, y: 23.37, z: -33.72 },
        { x: 44.84, y: 23.37, z: -26.74 },
        { x: 45.62, y: 23.37, z: -37.82 },
        { x: 41.98, y: 23.37, z: -44.43 }
      ]
    }
  },
  {
    id: "Mark-19",
    devLabel: "N01",
    file: "01 Happycats/01 Skeleton_Dancer/Happycats_Skeleton_Dancer.glb",
    position: { x: 15.77, y: 22.17, z: -1.58 },
    rotationY: -5.6892,
    movement: {
      type: "patrol",
      clip: "Walking",
      cycleRestClip: "Dance_Hiphop1",
      cycleRestCount: 1,
      speed: 0.12,
      snapToFloor: true,
      patrolTargets: ANGJI_MARK19_PATROL_WAYPOINTS
    }
  },
  {
    id: "Mark-20",
    devLabel: "N13",
    file: "03 rabbit04_Staff01/rabbit_Staff01.glb",
    assetRoot: "./assets/character/",
    position: { x: 12.33, y: 22.17, z: 3.07 },
    rotationY: -16.4217,
    animation: { type: "loop", clips: ["IDLE"] }
  },
  {
    id: "Mark-21",
    devLabel: "N14",
    file: "05 Edition/01 Marie Antoinette Fox/Edition_Marie.glb",
    position: { x: 12.6, y: 21.87, z: 8.99 },
    rotationY: -15.9708,
    animation: { type: "loop", clips: ["Sit_Footcross"] }
  },
  {
    id: "Mark-22",
    devLabel: "N15",
    file: "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
    position: { x: 9.562, y: 22.17, z: -0.239 },
    rotationY: -11.1391,
    animation: { type: "loop", clips: ["Sit_Idle"] }
  }
];

function validateGuestSpawnConfig(spawn) {
  const hasAnimation = Boolean(spawn.animation?.clips?.length);
  const hasPatrol = spawn.movement?.type === "patrol";

  if (hasAnimation && hasPatrol) {
    console.warn(`[guest-config] ${spawn.id}: animation and patrol both set; patrol takes precedence at runtime`);
  }

  if (hasPatrol) {
    const targets = spawn.movement.patrolTargets || [];

    if (!targets.length) {
      console.warn(`[guest-config] ${spawn.id}: patrol has no patrolTargets`);
    }

    if (spawn.movement.arrivalClip && !spawn.movement.clip && !(spawn.movement.clips || []).length) {
      console.warn(`[guest-config] ${spawn.id}: arrivalClip set but no locomotion clip(s)`);
    }
  }
}

function validateUniqueGuestIds() {
  const seen = new Set();
  const duplicates = [];

  ANGJI_GUEST_MARKS.forEach((spawn) => {
    if (seen.has(spawn.id)) {
      duplicates.push(spawn.id);
      return;
    }

    seen.add(spawn.id);
  });

  if (duplicates.length) {
    console.error(`[guest-config] duplicate guest ids detected: ${duplicates.join(", ")}`);
  }
}

ANGJI_GUEST_MARKS.forEach(validateGuestSpawnConfig);
validateUniqueGuestIds();
console.info(`[guest-config] loaded ${ANGJI_GUEST_CONFIG_VERSION}`);
