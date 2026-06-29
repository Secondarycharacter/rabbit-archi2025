/** Angji tour guest placements (Mark-1 … Mark-13). */

export const ANGJI_PRIORITY_GUEST_IDS = ["Mark-1", "Mark-2"];
export const ANGJI_SIMULTANEOUS_GUEST_IDS = ["Mark-4", "Mark-5", "Mark-6"];

export const ANGJI_GUEST_MARKS = [
  {
    id: "Mark-1",
    file: "01 Happycats/01 Skeleton_Dancer/Happycats_Skeleton_Dancer.glb",
    position: { x: -12.97, y: 17.08, z: 8.53 },
    rotationY: 5.1552,
    animation: { type: "loop", clips: ["Idle"] }
  },
  {
    id: "Mark-2",
    file: "01 Happycats/04 Happycat_Ninja/Happycats_Ninja_Samba Dancer.glb",
    position: { x: -11.43, y: 17.02, z: 17.46 },
    rotationY: 10.9752,
    animation: { type: "loop", clips: ["Idle"] }
  },
  {
    id: "Mark-3",
    file: "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
    position: { x: 4.96, y: 17.38, z: 1.38 },
    rotationY: 16.0116,
    animation: { type: "loop", clips: ["Seat_Clapping"] }
  },
  {
    id: "Mark-4",
    file: "04 Monkey/01 Monkey1/Monkey_Thriller Dancer_Ver1.glb",
    position: { x: -15.63, y: 17.32, z: -1.19 },
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
    position: { x: -17.29, y: 17.32, z: -4.21 },
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
    position: { x: -13.82, y: 17.32, z: 2.36 },
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
    position: { x: -2.65, y: 17.17, z: 1.31 },
    rotationY: 9.6919,
    animation: { type: "sequence", clips: ["Sit_Clap", "Sit_Disapproval"] }
  },
  {
    id: "Mark-8",
    file: "02 Shrooms/05 Shroom_Swing Dancer/Shroom_Swing Dancer.glb",
    position: { x: 5.54, y: 17.17, z: -2.69 },
    rotationY: 9.828,
    animation: { type: "loop", clips: ["Sitting Talking"] }
  },
  {
    id: "Mark-9",
    file: "05 Edition/01 Marie Antoinette Fox/Edition_Marie.glb",
    position: { x: -5.37, y: 17.18, z: 17.95 },
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
    position: { x: -6.05, y: 17.17, z: 15.4 },
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
    position: { x: -3.08, y: 17.17, z: 20.52 },
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
    position: { x: 0.03, y: 17.17, z: 14.02 },
    rotationY: 5.9136,
    animation: {
      type: "sequence",
      clips: ["Dance_Gangnam Style", "Dance_Locking Hip Hop"]
    }
  },
  {
    id: "Mark-13",
    file: "02 Shrooms/01 Shroom_Hip Hop Dancer/Shroom_Hip Hop Dancer.glb",
    position: { x: -25.04, y: 17.02, z: -8.66 },
    rotationY: 2.0183,
    movement: {
      type: "patrol",
      clip: "Run_Fast",
      speed: 0.135,
      patrolTargets: [
        { x: 5.35, y: 18.28, z: -26.81 },
        { x: -25.04, y: 17.02, z: -8.66 },
        { x: -5.39, y: 17.02, z: 27.95 },
        { x: -25.04, y: 17.02, z: -8.66 }
      ]
    }
  }
];
