/** Jinju project guest placements (Jinju-Mark-1 … Jinju-Mark-13). */

export const JINJU_GUEST_CONFIG_VERSION = "jinju-marie-sit-clips-20260705";

export const JINJU_GUEST_ID_PREFIX = "Jinju-";

export const JINJU_PRIORITY_GUEST_IDS = [
  `${JINJU_GUEST_ID_PREFIX}Mark-1`,
  `${JINJU_GUEST_ID_PREFIX}Mark-2`,
  `${JINJU_GUEST_ID_PREFIX}Mark-3`
];

const JINJU_PATROL_BASE_SPEED = 0.135;
const JINJU_PATROL_Y = 2;

function patrolPoint(x, z) {
  return { x, y: JINJU_PATROL_Y, z };
}

const JINJU_MARK_LAYOUT = [
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-1`,
    position: { x: 13.64, y: 1.95, z: 5.01 },
    rotationY: 9.2444,
    role: "fixed",
    file: "05 Edition/01 Marie Antoinette Fox/Edition_Marie.glb",
    animation: { type: "loop", clips: ["Sit_Footcross"] },
    sitYOffsetOverride: 0.06
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-2`,
    position: { x: 7.33, y: 2, z: 3.84 },
    rotationY: -1.8245,
    role: "fixed",
    file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
    animation: { type: "loop", clips: ["Idle"] }
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-3`,
    position: { x: -12.92, y: 2, z: -8.36 },
    rotationY: -4.8363,
    role: "fixed",
    file: "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb",
    animation: { type: "loop", clips: ["Idle"] },
    scaleMultiplier: 0.75
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-4`,
    position: { x: -44.9, y: 2, z: -5.94 },
    rotationY: -10.4455,
    role: "idle"
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-5`,
    position: patrolPoint(-54.24, -13.42),
    rotationY: 6.2366,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(-54.24, -13.42),
      patrolPoint(-54.51, 23.1)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-6`,
    position: patrolPoint(-53.64, 23.02),
    rotationY: 7.9012,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(-53.64, 23.02),
      patrolPoint(-20.9, 22.48)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-7`,
    position: patrolPoint(-27.68, 24.39),
    rotationY: 4.7168,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(-27.68, 24.39),
      patrolPoint(-51.72, 21.89)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-8`,
    position: patrolPoint(-47.51, 24.18),
    rotationY: 8.0603,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(-47.51, 24.18),
      patrolPoint(-8.02, 22.46)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-9`,
    position: patrolPoint(18.94, 24.67),
    rotationY: 4.2454,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(18.94, 24.67),
      patrolPoint(-9.55, 23.68),
      patrolPoint(-9.89, 36.87),
      patrolPoint(-9.55, 23.68)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-10`,
    position: patrolPoint(-16.79, 19.83),
    rotationY: -3.2957,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(-16.79, 19.83),
      patrolPoint(-17.35, 7.37),
      patrolPoint(-40.06, 7.31),
      patrolPoint(-41.38, 4.44),
      patrolPoint(-53.61, 4.93),
      patrolPoint(-54.6, 21.98),
      patrolPoint(-17.68, 23.16)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-11`,
    position: patrolPoint(19.05, 13.71),
    rotationY: 3.0698,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(19.05, 13.71),
      patrolPoint(18.52, 3.74),
      patrolPoint(7.67, 2.47),
      patrolPoint(18.1, 2.56),
      patrolPoint(15.94, 0.94),
      patrolPoint(18.77, -2.74),
      patrolPoint(18.84, -23.18),
      patrolPoint(21.97, 2.21)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-12`,
    position: patrolPoint(14.8, 1),
    rotationY: 4.4582,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(14.8, 1),
      patrolPoint(-50.13, 0.06)
    ]
  },
  {
    id: `${JINJU_GUEST_ID_PREFIX}Mark-13`,
    position: patrolPoint(-49.28, -3.49),
    rotationY: 2.0863,
    role: "patrol",
    patrolWaypoints: [
      patrolPoint(-49.28, -3.49),
      patrolPoint(-34.17, 1.19),
      patrolPoint(-11.67, -6.38),
      patrolPoint(-7.6, -14.46),
      patrolPoint(-6.06, -3.3),
      patrolPoint(6.64, 0.21),
      patrolPoint(7.77, 1.89),
      patrolPoint(7.16, 2.97)
    ]
  }
];

const JINJU_RANDOM_GUEST_POOL = [
  "01 Happycats/01 Skeleton_Dancer/Happycats_Skeleton_Dancer.glb",
  "01 Happycats/02_Happycat_Ultra_General/Happycats_Ultra_gen.glb",
  "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
  "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
  "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
  "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
  "04 Monkey/01 Monkey1/Monkey_Thriller Dancer_Ver1.glb",
  "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb"
];

export const JINJU_GUEST_IDS = JINJU_MARK_LAYOUT.map((layout) => layout.id);

const SIT_CLIP_PATTERN = /sit|seat|footcross/i;

export const JINJU_SIT_GUEST_Y_OFFSET = 0.12;

export function getJinjuGuestPositionYOffset(spawn) {
  if (typeof spawn.sitYOffsetOverride === "number") {
    return spawn.sitYOffsetOverride;
  }

  const clips = [
    ...(spawn.animation?.clips || []),
    spawn.movement?.clip
  ].filter(Boolean);

  return clips.some((clip) => SIT_CLIP_PATTERN.test(clip)) ? JINJU_SIT_GUEST_Y_OFFSET : 0;
}

function buildPatrolLoopTargets(waypoints) {
  if (!waypoints?.length) {
    return [];
  }

  if (waypoints.length === 1) {
    return [{ ...waypoints[0] }];
  }

  return [...waypoints.slice(1), { ...waypoints[0] }];
}

function pickRandomGuestFiles(count) {
  if (count <= 0 || JINJU_RANDOM_GUEST_POOL.length === 0) {
    return [];
  }

  const assignments = [];

  for (let index = 0; index < count; index += 1) {
    const pickIndex = Math.floor(Math.random() * JINJU_RANDOM_GUEST_POOL.length);
    assignments.push(JINJU_RANDOM_GUEST_POOL[pickIndex]);
  }

  return assignments;
}

export function buildJinjuGuestSpawns() {
  const randomLayouts = JINJU_MARK_LAYOUT.filter((layout) => layout.role === "idle" || layout.role === "patrol");
  const randomGuestFiles = pickRandomGuestFiles(randomLayouts.length);
  let randomFileIndex = 0;

  return JINJU_MARK_LAYOUT.map((layout) => {
    const markNumber = Number(String(layout.id).replace(`${JINJU_GUEST_ID_PREFIX}Mark-`, ""));
    const baseSpawn = {
      id: layout.id,
      position: { ...layout.position },
      rotationY: layout.rotationY,
      devLabel: Number.isFinite(markNumber) ? `E${String(markNumber).padStart(2, "0")}` : undefined
    };

    if (layout.role === "fixed") {
      return {
        ...baseSpawn,
        file: layout.file,
        animation: layout.animation,
        sitYOffsetOverride: layout.sitYOffsetOverride,
        scaleMultiplier: layout.scaleMultiplier
      };
    }

    const file = randomGuestFiles[randomFileIndex];
    randomFileIndex += 1;

    if (layout.role === "idle") {
      return {
        ...baseSpawn,
        file,
        animation: { type: "loop", clips: ["Idle"] }
      };
    }

    return {
      ...baseSpawn,
      file,
      movement: {
        type: "patrol",
        clip: "Walking",
        speed: JINJU_PATROL_BASE_SPEED,
        randomSpeedCycle: true,
        speedRatioMin: 0.1,
        speedRatioMax: 0.3,
        speedRatioStep: 0.1,
        easeSpeed: false,
        patrolTargets: buildPatrolLoopTargets(layout.patrolWaypoints)
      }
    };
  });
}

let sessionGuestSpawns = null;

export function resetJinjuGuestSession() {
  sessionGuestSpawns = null;
}

export function getJinjuGuestSpawns() {
  if (!sessionGuestSpawns) {
    sessionGuestSpawns = buildJinjuGuestSpawns();
    console.info(`[jinju-guest-config] session spawns ready (${JINJU_GUEST_CONFIG_VERSION})`);
  }

  return sessionGuestSpawns;
}

export function getJinjuGuestIds() {
  return JINJU_GUEST_IDS;
}

export function getJinjuOutdoorGuestIds() {
  return JINJU_GUEST_IDS;
}

export function getJinjuFixedGuestSpawns() {
  const fixedIds = new Set(
    JINJU_MARK_LAYOUT.filter((layout) => layout.role === "fixed").map((layout) => layout.id)
  );

  return getJinjuGuestSpawns().filter((spawn) => fixedIds.has(spawn.id));
}

export function getJinjuPriorityGuestSpawns() {
  return getJinjuFixedGuestSpawns();
}

export function getJinjuRandomGuestSpawns() {
  const fixedIds = new Set(
    JINJU_MARK_LAYOUT.filter((layout) => layout.role === "fixed").map((layout) => layout.id)
  );

  return getJinjuGuestSpawns().filter((spawn) => !fixedIds.has(spawn.id));
}

export function getJinjuOutdoorBackgroundGuestSpawns() {
  return getJinjuGuestSpawns().filter((spawn) => !JINJU_PRIORITY_GUEST_IDS.includes(spawn.id));
}

export function getJinjuBackgroundGuestSpawns() {
  return getJinjuOutdoorBackgroundGuestSpawns();
}

function getJinjuOutdoorMarkNumber(spawnId) {
  return Number(String(spawnId).replace(`${JINJU_GUEST_ID_PREFIX}Mark-`, ""));
}

export function getJinjuGuestLoadYieldFrames(spawnId) {
  const markNumber = getJinjuOutdoorMarkNumber(spawnId);

  return Number.isFinite(markNumber) && markNumber >= 9 ? 4 : 2;
}

export function getJinjuGuestRevealDelayMs(spawnId) {
  const markNumber = getJinjuOutdoorMarkNumber(spawnId);

  return Number.isFinite(markNumber) && markNumber >= 9 ? 500 : 250;
}

function validateMarkLayout(layout) {
  if (layout.role === "fixed" && !layout.file) {
    console.warn(`[jinju-guest-config] ${layout.id}: fixed role requires file`);
  }
}

JINJU_MARK_LAYOUT.forEach(validateMarkLayout);
console.info(`[jinju-guest-config] layout loaded ${JINJU_GUEST_CONFIG_VERSION}`);
