/** Angji tour guest placements (Mark-1 … Mark-13). */

export const ANGJI_PRIORITY_GUEST_IDS = ["Mark-1", "Mark-2"];
export const ANGJI_SIMULTANEOUS_GUEST_IDS = ["Mark-4", "Mark-5", "Mark-6"];

const ANGJI_RESERVED_GUEST_IDS = new Set([
  ...ANGJI_PRIORITY_GUEST_IDS,
  ...ANGJI_SIMULTANEOUS_GUEST_IDS
]);

export function getAngjiPriorityGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => ANGJI_PRIORITY_GUEST_IDS.includes(spawn.id));
}

export function getAngjiSimultaneousGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => ANGJI_SIMULTANEOUS_GUEST_IDS.includes(spawn.id));
}

export function getAngjiBackgroundGuestSpawns() {
  return ANGJI_GUEST_MARKS.filter((spawn) => !ANGJI_RESERVED_GUEST_IDS.has(spawn.id));
}

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
    position: { x: -24.75, y: 22.05, z: -10.29 },
    rotationY: 2.0183,
    movement: {
      type: "patrol",
      clip: "Run_Fast",
      speed: 0.135,
      patrolTargets: [
        { x: 5.64, y: 23.31, z: -28.44 },
        { x: -24.75, y: 22.05, z: -10.29 },
        { x: -5.1, y: 22.05, z: 26.32 },
        { x: -24.75, y: 22.05, z: -10.29 }
      ]
    }
  }
];
