/** Jinju rooftop guest placements (Jinju-Rooftop-Mark-1 … Mark-30). */

export const JINJU_ROOFTOP_GUEST_CONFIG_VERSION = "jinju-rooftop-marie-sit-clips-20260705";

export const JINJU_ROOFTOP_GUEST_ID_PREFIX = "Jinju-Rooftop-";

export const JINJU_ROOFTOP_ACTIVE_GUEST_MAX_MARK = 25;

export const JINJU_ROOFTOP_RAMP_2F_PREFIXES = ["0_col_b_ramp_2f"];

export const JINJU_ROOFTOP_PRIORITY_GUEST_IDS = [
  `${JINJU_ROOFTOP_GUEST_ID_PREFIX}Mark-3`
];

export const JINJU_ROOFTOP_SIMULTANEOUS_GUEST_IDS = [
  `${JINJU_ROOFTOP_GUEST_ID_PREFIX}Mark-13`,
  `${JINJU_ROOFTOP_GUEST_ID_PREFIX}Mark-14`,
  `${JINJU_ROOFTOP_GUEST_ID_PREFIX}Mark-15`
];

const SIT_CLIP_PATTERN = /^(sit|seat)/i;

export const JINJU_ROOFTOP_SIT_GUEST_Y_OFFSET = 0.1;

const ROOFTOP_MARK_LAYOUT = [
  { mark: 1, position: { x: -27.33, y: 10.1, z: 5.38 }, rotationY: -3.2437, role: "randomSitSeat" },
  { mark: 2, position: { x: -26.48, y: 10.1, z: 5.3 }, rotationY: -9.5305, role: "randomSitSeat" },
  {
    mark: 3,
    position: { x: -26.87, y: 10.1, z: 4.3 },
    rotationY: -6.3319,
    role: "fixedSambaSequence",
    file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
    sambaClips: [
      "Samba Dancing01",
      "Samba Dancing02",
      "Samba Dancing03",
      "Samba Dancing04",
      "Samba Dancing05",
      "Samba Dancing06"
    ]
  },
  { mark: 4, position: { x: -26.96, y: 10.55, z: -4.91 }, rotationY: 6.5326, role: "randomSitSeat" },
  { mark: 5, position: { x: -26.24, y: 10.1, z: -4.91 }, rotationY: 6.3405, role: "randomSitSeat" },
  { mark: 6, position: { x: -21.78, y: 10.1, z: -3.8 }, rotationY: 8.7415, role: "randomIdle" },
  { mark: 7, position: { x: -20.66, y: 10.1, z: -4.82 }, rotationY: 5.347, role: "randomSitSeat" },
  { mark: 8, position: { x: -6.13, y: 10.1, z: -6.09 }, rotationY: 6.2371, role: "randomSitSeat" },
  { mark: 9, position: { x: -8.35, y: 10.1, z: -6.09 }, rotationY: 6.3618, role: "randomSitSeat" },
  { mark: 10, position: { x: -9.83, y: 10.4, z: -6.99 }, rotationY: 6.5326, role: "randomSitSeat" },
  { mark: 11, position: { x: -7.68, y: 10.7, z: -7.95 }, rotationY: 12.4411, role: "randomSitSeatPick" },
  { mark: 12, position: { x: -5.7, y: 10.7, z: -7.89 }, rotationY: 18.6424, role: "randomSitSeatPick" },
  {
    mark: 13,
    position: { x: -8.12, y: 10.1, z: -2.93 },
    rotationY: 15.5954,
    role: "thriller"
  },
  {
    mark: 14,
    position: { x: -10.47, y: 10.1, z: -3.16 },
    rotationY: 15.677,
    role: "thriller"
  },
  {
    mark: 15,
    position: { x: -5.52, y: 10.1, z: -3.18 },
    rotationY: 16.0267,
    role: "thriller"
  },
  { mark: 16, position: { x: -10.38, y: 10.1, z: 0.86 }, rotationY: 21.3511, role: "randomSitSeat" },
  { mark: 17, position: { x: -7.67, y: 10.1, z: 1.02 }, rotationY: 21.8175, role: "randomSitSeat" },
  { mark: 18, position: { x: -5.14, y: 10.1, z: -6.08 }, rotationY: 18.1449, role: "randomSitSeat" },
  { mark: 19, position: { x: 9.56, y: 10.55, z: 1.79 }, rotationY: 22.0589, role: "randomSitSeatPick" },
  { mark: 20, position: { x: 11.01, y: 10.55, z: 1.82 }, rotationY: 21.8947, role: "randomSitSeatPick" },
  { mark: 21, position: { x: 14.65, y: 10.55, z: 3.71 }, rotationY: 17.2373, role: "randomSitSeat" },
  { mark: 22, position: { x: 14.6, y: 10.55, z: 2.7 }, rotationY: 17.7707, role: "randomSitSeat" },
  { mark: 23, position: { x: 9.03, y: 10.55, z: 5.27 }, rotationY: 15.7056, role: "randomSitSeatPick" },
  { mark: 24, position: { x: 15.73, y: 10.33, z: -0.15 }, rotationY: 13.9763, role: "randomIdle" },
  { mark: 25, position: { x: 8.02, y: 10.1, z: -0.17 }, rotationY: 10.8705, role: "runLoop" },
  // Patrol targets for Mark-25
  { mark: 26, position: { x: -27.48, y: 10.1, z: 0.58 }, rotationY: 11.0413, role: "patrolTarget" },
  { mark: 27, position: { x: -27.58, y: 10.1, z: -2.72 }, rotationY: 9.2771, role: "patrolTarget" },
  { mark: 28, position: { x: -17.53, y: 10.1, z: -2.05 }, rotationY: 7.8485, role: "patrolTarget" },
  { mark: 29, position: { x: -7.9, y: 10.1, z: -4.78 }, rotationY: 8.1179, role: "patrolTarget" },
  { mark: 30, position: { x: -1.52, y: 10.1, z: -0.61 }, rotationY: 7.0833, role: "patrolTarget" }
];

/** Guests with at least one Sit/Seat-prefixed animation clip (for marks 11, 12, 19, 20, 23). */
const ROOFTOP_RANDOM_SIT_SEAT_GUEST_POOL = [
  {
    file: "01 Happycats/02_Happycat_Ultra_General/Happycats_Ultra_gen.glb",
    clips: ["Sit_Footswing"]
  },
  {
    file: "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
    clips: ["Seat_Clapping", "Seat_Idle", "Seat_Stand Up"]
  },
  {
    file: "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
    clips: ["Sit_Clap", "Sit_Disapproval", "Sit_Idle", "Sitting_footswing"]
  },
  {
    file: "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
    clips: ["Sitting Talking"]
  },
  {
    file: "04 Monkey/01 Monkey1/Monkey_Thriller Dancer_Ver1.glb",
    clips: ["Sit_Clap", "Sit_Footswing"]
  },
  {
    file: "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb",
    clips: ["Sit_Clap", "Sit_Footswing"]
  },
  {
    file: "05 Edition/01 Marie Antoinette Fox/Edition_Marie.glb",
    clips: ["Sit_Footcross", "Sit_Footswing"],
    sitYOffsetOverride: 0.06
  }
];

const ROOFTOP_SIT_SEAT_POOL = [
  {
    file: "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
    clips: ["Seat_Clapping"]
  },
  {
    file: "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
    clips: ["Sit_Clap", "Sit_Disapproval"]
  },
  {
    file: "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
    clips: ["Sitting Talking"]
  },
  {
    file: "05 Edition/01 Marie Antoinette Fox/Edition_Marie.glb",
    clips: ["Sit_Footcross", "Sit_Footswing"],
    sitYOffsetOverride: 0.06
  }
];

const ROOFTOP_RANDOM_IDLE_POOL = [
  "01 Happycats/01 Skeleton_Dancer/Happycats_Skeleton_Dancer.glb",
  "01 Happycats/02_Happycat_Ultra_General/Happycats_Ultra_gen.glb",
  "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
  "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
  "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
  "04 Monkey/01 Monkey1/Monkey_Thriller Dancer_Ver1.glb",
  "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb"
];

const THRILLER_CLIPS = [
  "Dance_Thriller0",
  "Dance_Thriller1",
  "Dance_Thriller2",
  "Dance_Thriller3",
  "Dance_Thriller4"
];

function pickRandomPoolAssignments(pool, count) {
  if (count <= 0 || pool.length === 0) {
    return [];
  }

  const assignments = [];

  for (let index = 0; index < count; index += 1) {
    assignments.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  return assignments;
}

function filterSitSeatClips(clips) {
  return (clips || []).filter((clip) => SIT_CLIP_PATTERN.test(clip));
}

function pickRandomSitSeatGuestAssignment() {
  const entry = ROOFTOP_RANDOM_SIT_SEAT_GUEST_POOL[
    Math.floor(Math.random() * ROOFTOP_RANDOM_SIT_SEAT_GUEST_POOL.length)
  ];
  const sitClips = filterSitSeatClips(entry.clips);
  const clip = sitClips[Math.floor(Math.random() * sitClips.length)] || entry.clips[0];

  return {
    file: entry.file,
    clip,
    sitYOffsetOverride: entry.sitYOffsetOverride
  };
}

function buildRandomSitSeatPickSpawn(baseSpawn) {
  const assignment = pickRandomSitSeatGuestAssignment();

  return {
    ...baseSpawn,
    file: assignment.file,
    animation: { type: "loop", clips: [assignment.clip] },
    sitYOffsetOverride: typeof assignment.sitYOffsetOverride === "number"
      ? assignment.sitYOffsetOverride
      : JINJU_ROOFTOP_SIT_GUEST_Y_OFFSET
  };
}

function getLayout(mark) {
  return ROOFTOP_MARK_LAYOUT.find((entry) => entry.mark === mark) || null;
}

function buildRunLoopTargets() {
  const targets = [25, 26, 27, 28, 29, 30, 25].map(getLayout).filter(Boolean);
  return targets.map((entry) => ({ x: entry.position.x, y: entry.position.y, z: entry.position.z }));
}

export function getJinjuRooftopGuestIds() {
  return ROOFTOP_MARK_LAYOUT
    .filter((layout) => layout.mark >= 1 && layout.mark <= JINJU_ROOFTOP_ACTIVE_GUEST_MAX_MARK)
    .map((layout) => `${JINJU_ROOFTOP_GUEST_ID_PREFIX}Mark-${layout.mark}`);
}

export function resetJinjuRooftopGuestSession() {
  sessionRooftopGuestSpawns = null;
}

let sessionRooftopGuestSpawns = null;

export function getJinjuRooftopGuestSpawns() {
  if (sessionRooftopGuestSpawns) {
    return sessionRooftopGuestSpawns;
  }

  const sitSeatLayouts = ROOFTOP_MARK_LAYOUT.filter(
    (layout) => layout.role === "randomSitSeat" && layout.mark <= JINJU_ROOFTOP_ACTIVE_GUEST_MAX_MARK
  );
  const idleLayouts = ROOFTOP_MARK_LAYOUT.filter(
    (layout) => (layout.role === "randomIdle") && layout.mark <= JINJU_ROOFTOP_ACTIVE_GUEST_MAX_MARK
  );
  const sitSeatAssignments = pickRandomPoolAssignments(ROOFTOP_SIT_SEAT_POOL, sitSeatLayouts.length);
  const idleAssignments = pickRandomPoolAssignments(ROOFTOP_RANDOM_IDLE_POOL, idleLayouts.length);
  let sitIndex = 0;
  let idleIndex = 0;

  sessionRooftopGuestSpawns = ROOFTOP_MARK_LAYOUT
    .filter((layout) => layout.mark >= 1 && layout.mark <= JINJU_ROOFTOP_ACTIVE_GUEST_MAX_MARK)
    .map((layout) => {
      const id = `${JINJU_ROOFTOP_GUEST_ID_PREFIX}Mark-${layout.mark}`;
      const baseSpawn = {
        id,
        position: { ...layout.position },
        rotationY: layout.rotationY,
        devLabel: `R${String(layout.mark).padStart(2, "0")}`
      };

      if (layout.role === "fixedSambaSequence") {
        return {
          ...baseSpawn,
          file: layout.file,
          animation: { type: "sequence", clips: layout.sambaClips }
        };
      }

      if (layout.role === "thriller") {
        const file = layout.mark === 13
          ? "04 Monkey/01 Monkey1/Monkey_Thriller Dancer_Ver1.glb"
          : "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb";

        return {
          ...baseSpawn,
          file,
          animation: { type: "sequence", clips: THRILLER_CLIPS },
          movement: { type: "rootMotion" }
        };
      }

      if (layout.role === "randomSitSeatPick") {
        return buildRandomSitSeatPickSpawn(baseSpawn);
      }

      if (layout.role === "runLoop") {
        return {
          ...baseSpawn,
          file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
          movement: {
            type: "patrol",
            clip: "Run_Goofy",
            speed: 0.0255,
            easeSpeed: false,
            patrolTargets: buildRunLoopTargets()
          }
        };
      }

      if (layout.role === "randomIdle") {
        return {
          ...baseSpawn,
          file: idleAssignments[idleIndex++],
          animation: { type: "loop", clips: ["Idle"] }
        };
      }

      const entry = sitSeatAssignments[sitIndex++];
      const sitClips = filterSitSeatClips(entry.clips);
      const sitClip = sitClips[0] || entry.clips[0];

      return {
        ...baseSpawn,
        file: entry.file,
        animation: { type: "loop", clips: [sitClip] },
        sitYOffsetOverride: typeof entry.sitYOffsetOverride === "number"
          ? entry.sitYOffsetOverride
          : (sitClips.length ? JINJU_ROOFTOP_SIT_GUEST_Y_OFFSET : undefined)
      };
    });

  console.info(`[jinju-rooftop-guest-config] spawns ready (${JINJU_ROOFTOP_GUEST_CONFIG_VERSION})`);
  return sessionRooftopGuestSpawns;
}

export function getJinjuRooftopPriorityGuestSpawns() {
  return getJinjuRooftopGuestSpawns().filter((spawn) => JINJU_ROOFTOP_PRIORITY_GUEST_IDS.includes(spawn.id));
}

export function getJinjuRooftopBackgroundGuestSpawns() {
  return getJinjuRooftopGuestSpawns().filter((spawn) => !JINJU_ROOFTOP_PRIORITY_GUEST_IDS.includes(spawn.id));
}

function getJinjuRooftopMarkNumber(spawnId) {
  return Number(String(spawnId).replace(`${JINJU_ROOFTOP_GUEST_ID_PREFIX}Mark-`, ""));
}

export function getJinjuRooftopGuestLoadYieldFrames(spawnId) {
  const markNumber = getJinjuRooftopMarkNumber(spawnId);
  return Number.isFinite(markNumber) && markNumber >= 10 ? 3 : 2;
}

export function getJinjuRooftopGuestRevealDelayMs(spawnId) {
  const markNumber = getJinjuRooftopMarkNumber(spawnId);
  return Number.isFinite(markNumber) && markNumber >= 10 ? 350 : 200;
}

/** Marks 13–15 reveal together once all three are loaded. */
export function getJinjuRooftopSequentialGuestSpawns() {
  return [...getJinjuRooftopGuestSpawns()].sort((left, right) => {
    const leftMark = getJinjuRooftopMarkNumber(left.id);
    const rightMark = getJinjuRooftopMarkNumber(right.id);
    return leftMark - rightMark;
  });
}

