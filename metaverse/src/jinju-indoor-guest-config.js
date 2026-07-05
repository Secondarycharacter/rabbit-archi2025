/** Jinju indoor guest placements (Jinju-Indoor-Mark-1 … Mark-16). */

export const JINJU_INDOOR_GUEST_CONFIG_VERSION = "jinju-indoor-marie-sit-clips-20260705";

export const JINJU_INDOOR_GUEST_ID_PREFIX = "Jinju-Indoor-";

/** Active tour guests (I01–I16). */
export const JINJU_INDOOR_ACTIVE_GUEST_MAX_MARK = 16;

/** Revealed first after all indoor guests finish loading (same role as Angji priority/simultaneous). */
export const JINJU_INDOOR_PRIORITY_GUEST_IDS = [
  `${JINJU_INDOOR_GUEST_ID_PREFIX}Mark-3`
];

/** Material prefix matched against col-layer ramp meshes (normalized lowercase). */
export const JINJU_INDOOR_RAMP_1F_PREFIXES = ["0_col_b_ramp_1f"];
export const JINJU_INDOOR_RAMP_2F_PREFIXES = ["0_col_b_ramp_2f"];

/** Upper-floor indoor guests are planned but intentionally disabled for now. */
export const JINJU_INDOOR_UPPER_GUEST_ENABLED = false;

export const JINJU_INDOOR_FIXED_GUEST_IDS = [
  `${JINJU_INDOOR_GUEST_ID_PREFIX}Mark-3`
];

const SIT_CLIP_PATTERN = /^(sit|seat|sitting)/i;

export const JINJU_INDOOR_SIT_GUEST_Y_OFFSET = 0.1;

const JINJU_INDOOR_SAMBA_CLIPS = [
  "Samba Dancing01",
  "Samba Dancing02",
  "Samba Dancing03",
  "Samba Dancing04",
  "Samba Dancing05",
  "Samba Dancing06"
];

const JINJU_INDOOR_SIT_SEAT_CHARACTER_POOL = [
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

const JINJU_INDOOR_IDLE_POOL = [
  "01 Happycats/01 Skeleton_Dancer/Happycats_Skeleton_Dancer.glb",
  "01 Happycats/02_Happycat_Ultra_General/Happycats_Ultra_gen.glb",
  "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
  "02 Shrooms/04 Shroom_Gangnam style Dancer/Shroom_Gangnam style Dancer.glb",
  "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
  "04 Monkey/01 Monkey1/Monkey_Thriller Dancer_Ver1.glb",
  "04 Monkey/02 Monkey2/Monkey_Thriller Dancer_Ver2.glb"
];

const JINJU_INDOOR_MARK_LAYOUT = [
  { mark: 1, position: { x: 7.15, y: 5.9, z: 5.17 }, rotationY: -5.2511, role: "randomIdle" },
  { mark: 2, position: { x: 15.76, y: 5.9, z: 6.42 }, rotationY: -4.8136, role: "randomIdle" },
  {
    mark: 3,
    position: { x: 13.6, y: 5.9, z: -1.45 },
    rotationY: -3.5112,
    role: "fixed",
    file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
    animation: { type: "loop", clips: ["Samba Dancing01"] }
  },
  { mark: 4, position: { x: 6.35, y: 5.85, z: 0.05 }, rotationY: -8.5227, role: "randomSitSeat" },
  { mark: 5, position: { x: 5.19, y: 5.9, z: -0.91 }, rotationY: -12.0116, role: "randomSitSeat" },
  { mark: 6, position: { x: 1.0, y: 5.92, z: -0.67 }, rotationY: -12.2341, role: "randomSitSeat" },
  { mark: 7, position: { x: -5.36, y: 5.9, z: 0.98 }, rotationY: -7.9333, role: "randomSitSeat" },
  { mark: 8, position: { x: -6.24, y: 5.9, z: 0.67 }, rotationY: -10.9791, role: "randomSitSeat" },
  { mark: 9, position: { x: -8.49, y: 5.9, z: -2.92 }, rotationY: -6.2365, role: "randomSitSeat" },
  { mark: 10, position: { x: -13.31, y: 5.9, z: -1.44 }, rotationY: -6.4659, role: "randomSitSeat" },
  { mark: 11, position: { x: -13.35, y: 5.9, z: 0.88 }, rotationY: -3.196, role: "randomSitSeat" },
  { mark: 12, position: { x: -17.89, y: 5.9, z: -3.49 }, rotationY: -2.3407, role: "randomIdle" },
  { mark: 13, position: { x: -16.34, y: 5.9, z: 1.01 }, rotationY: 0.6543, role: "randomIdle" },
  { mark: 14, position: { x: -23.83, y: 5.9, z: -1.21 }, rotationY: -0.944, role: "randomIdle" },
  { mark: 15, position: { x: -24.73, y: 5.9, z: -1.17 }, rotationY: 0.9183, role: "randomIdle" },
  { mark: 16, position: { x: -27.83, y: 5.9, z: 1.1 }, rotationY: 2.488, role: "randomIdle" }
];

export const JINJU_INDOOR_GUEST_IDS = JINJU_INDOOR_MARK_LAYOUT
  .filter((layout) => layout.mark <= JINJU_INDOOR_ACTIVE_GUEST_MAX_MARK)
  .map((layout) => `${JINJU_INDOOR_GUEST_ID_PREFIX}Mark-${layout.mark}`);

function getActiveIndoorMarkLayout() {
  return JINJU_INDOOR_MARK_LAYOUT.filter(
    (layout) => layout.mark <= JINJU_INDOOR_ACTIVE_GUEST_MAX_MARK
  );
}

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
  return clips.filter((clip) => SIT_CLIP_PATTERN.test(clip));
}

export function getJinjuIndoorGuestPositionYOffset(spawn) {
  if (typeof spawn.sitYOffsetOverride === "number") {
    return spawn.sitYOffsetOverride;
  }

  const clips = spawn.animation?.clips || [];

  return clips.some((clip) => SIT_CLIP_PATTERN.test(clip)) ? JINJU_INDOOR_SIT_GUEST_Y_OFFSET : 0;
}

export function buildJinjuIndoorGuestSpawns() {
  const activeLayout = getActiveIndoorMarkLayout();
  const idleLayouts = activeLayout.filter((layout) => layout.role === "randomIdle");
  const sitLayouts = activeLayout.filter((layout) => layout.role === "randomSitSeat");
  const idleAssignments = pickRandomPoolAssignments(JINJU_INDOOR_IDLE_POOL, idleLayouts.length);
  const sitAssignments = pickRandomPoolAssignments(
    JINJU_INDOOR_SIT_SEAT_CHARACTER_POOL,
    sitLayouts.length
  );
  let idleIndex = 0;
  let sitIndex = 0;

  return activeLayout.map((layout) => {
    const id = `${JINJU_INDOOR_GUEST_ID_PREFIX}Mark-${layout.mark}`;
    const baseSpawn = {
      id,
      position: { ...layout.position },
      rotationY: layout.rotationY,
      devLabel: `I${String(layout.mark).padStart(2, "0")}`
    };

    if (layout.role === "fixed") {
      const sitClips = filterSitSeatClips(layout.animation.clips);

      return {
        ...baseSpawn,
        file: layout.file,
        animation: layout.animation,
        sitYOffsetOverride: sitClips.length ? JINJU_INDOOR_SIT_GUEST_Y_OFFSET : undefined
      };
    }

    if (layout.role === "randomIdle") {
      return {
        ...baseSpawn,
        file: idleAssignments[idleIndex++],
        animation: { type: "loop", clips: ["Idle"] }
      };
    }

    const sitEntry = sitAssignments[sitIndex++];
    const sitSeatClips = filterSitSeatClips(sitEntry.clips);
    const sitClip = sitSeatClips.length ? sitSeatClips[0] : sitEntry.clips[0];

    return {
      ...baseSpawn,
      file: sitEntry.file,
      animation: {
        type: "loop",
        clips: [sitClip]
      },
      sitYOffsetOverride: typeof sitEntry.sitYOffsetOverride === "number"
        ? sitEntry.sitYOffsetOverride
        : (sitSeatClips.length ? JINJU_INDOOR_SIT_GUEST_Y_OFFSET : undefined)
    };
  });
}

let sessionIndoorGuestSpawns = null;

export function resetJinjuIndoorGuestSession() {
  sessionIndoorGuestSpawns = null;
}

export function getJinjuIndoorGuestSpawns() {
  if (!sessionIndoorGuestSpawns) {
    sessionIndoorGuestSpawns = buildJinjuIndoorGuestSpawns();
    console.info(`[jinju-indoor-guest-config] session spawns ready (${JINJU_INDOOR_GUEST_CONFIG_VERSION})`);
  }

  return sessionIndoorGuestSpawns;
}

export function getJinjuIndoorGuestIds() {
  return JINJU_INDOOR_GUEST_IDS;
}

export function getJinjuIndoorFixedGuestSpawns() {
  return getJinjuIndoorGuestSpawns().filter((spawn) => JINJU_INDOOR_FIXED_GUEST_IDS.includes(spawn.id));
}

export function getJinjuIndoorRandomGuestSpawns() {
  return getJinjuIndoorGuestSpawns().filter((spawn) => !JINJU_INDOOR_FIXED_GUEST_IDS.includes(spawn.id));
}

export function getJinjuIndoorPriorityGuestSpawns() {
  return getJinjuIndoorGuestSpawns().filter((spawn) => (
    JINJU_INDOOR_PRIORITY_GUEST_IDS.includes(spawn.id)
  ));
}

export function getJinjuIndoorBackgroundGuestSpawns() {
  return getJinjuIndoorGuestSpawns().filter((spawn) => (
    !JINJU_INDOOR_PRIORITY_GUEST_IDS.includes(spawn.id)
  ));
}

function getJinjuIndoorMarkNumber(spawnId) {
  return Number(String(spawnId).replace(`${JINJU_INDOOR_GUEST_ID_PREFIX}Mark-`, ""));
}

export function getJinjuIndoorGuestLoadYieldFrames(spawnId) {
  const markNumber = getJinjuIndoorMarkNumber(spawnId);

  return Number.isFinite(markNumber) && markNumber >= 10 ? 4 : 2;
}

export function getJinjuIndoorGuestRevealDelayMs(spawnId) {
  const markNumber = getJinjuIndoorMarkNumber(spawnId);

  return Number.isFinite(markNumber) && markNumber >= 10 ? 500 : 250;
}

console.info(`[jinju-indoor-guest-config] layout loaded ${JINJU_INDOOR_GUEST_CONFIG_VERSION}`);
