/** Angji tour guest placements (Mark-1 … Mark-18). */

export const ANGJI_GUEST_CONFIG_VERSION = "angji-guest-full-20260705";

export const ANGJI_PRIORITY_GUEST_IDS = ["Mark-1", "Mark-2"];
export const ANGJI_SIMULTANEOUS_GUEST_IDS = ["Mark-4", "Mark-5", "Mark-6"];

const ANGJI_RESERVED_GUEST_IDS = new Set([
  ...ANGJI_PRIORITY_GUEST_IDS,
  ...ANGJI_SIMULTANEOUS_GUEST_IDS
]);

/** Mark-1, Mark-2 and Mark-13+ are placed outside the building and appear in orbit view. */
export const ANGJI_OUTDOOR_GUEST_MIN_MARK = 13;

function getGuestMarkNumber(spawnId) {
  return Number(String(spawnId).replace("Mark-", ""));
}

export function isAngjiOutdoorGuestId(spawnId) {
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
    position: { x: 5.25, y: 22.41, z: -0.25 },
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
