import { FIREBASE_CONFIG, OVERVIEW_ADMIN_PASSCODE } from "./firebase-config.js?v=tps-jump-nocol-20260629";
import { createTpsSystem } from "./controllers/createTpsSystem.js?v=jump-nocol-windup-20260725";
import {
  CONTROLLER_SETTINGS,
  EYE_HEIGHT,
  MAX_FALL_SPEED,
  GROUND_SNAP_TOLERANCE,
  ANGJI_MOVE_SPEED_MULTIPLIER,
  createAngjiTpsOptions
} from "./angji-character-config.js?v=floor2-ceiling-camera-20260629";
import {
  applyCharacterTpsKeyDown
} from "./character-tps-bindings.js?v=tps-jump-nocol-20260629";
import {
  createNpcInteractionSystem
} from "./npc-interaction-system.js?v=angji-npc-korean-names-20260822";
import {
  createNpcGuestManagerPanel
} from "./npc-guest-manager-panel.js?v=angji-npc-korean-names-20260822";
import {
  createAngjiGuideTourSystem
} from "./angji-guide-tour-system.js?v=angji-guide-tour-20260822-v22";
import {
  createAngjiGuideManagerPanel
} from "./angji-guide-manager-panel.js?v=angji-guide-manager-20260822";
import { ANGJI_GUIDE_SPAWN } from "./angji-guide-tour-config.js?v=angji-guide-tour-20260822-v22";
import {
  getDisplayNameMap,
  loadEffectiveGuestBundle,
  resolveInteractionConfigs,
  loadConversationProgress
} from "./npc-guest-data.js?v=angji-npc-korean-names-20260822";
import { createGuestPlacementTool } from "./guest-placement-tool.js?v=orbit-cam-capture-20260725";
import {
  attachHistoryDisplayBoards,
  disposeHistoryDisplayBoards,
  setHistoryDisplayBoardsEnabled
} from "./history-display-board.js?v=chungju-display-mesh-20260805";
import {
  getAngjiIndoorBackgroundGuestSpawns,
  getAngjiOutdoorBackgroundGuestSpawns,
  getAngjiOutdoorGuestSpawns,
  getAngjiIndoorGuestSpawns,
  getAngjiIndoorGuestIds,
  getAngjiOutdoorGuestIds,
  getAngjiAllGuestIds,
  getAngjiSimultaneousGuestSpawns,
  getAngjiNightExtraGuestSpawns,
  getBackgroundGuestRevealDelayMs,
  getBackgroundGuestLoadYieldFrames,
  ANGJI_SIMULTANEOUS_GUEST_IDS,
  ANGJI_PRIORITY_GUEST_IDS,
  ANGJI_NIGHT_MARIE_GUEST_ID,
  ANGJI_GUEST_CONFIG_VERSION,
  getAngjiGuestPositionYOffset,
  getAngjiGuestNumberLabel,
  getAngjiModelGuestEntriesSorted,
  isAngjiGuestId,
  isAngjiOutdoorGuestId,
  mapAngjiGuestSpawnsForMode,
  toAngjiNightGuestSpawn
} from "./angji-guest-config.js?v=angji-mark13-patrol-20260820";
import {
  getJinjuOutdoorBackgroundGuestSpawns,
  getJinjuFixedGuestSpawns,
  getJinjuOutdoorGuestIds,
  JINJU_PRIORITY_GUEST_IDS,
  JINJU_GUEST_CONFIG_VERSION,
  resetJinjuGuestSession,
  getJinjuGuestPositionYOffset,
  getJinjuGuestLoadYieldFrames,
  getJinjuGuestRevealDelayMs
} from "./jinju-guest-config.js?v=jinju-marie-sit-clips-20260705";
import {
  getJinjuIndoorBackgroundGuestSpawns,
  getJinjuIndoorGuestSpawns,
  getJinjuIndoorGuestIds,
  getJinjuIndoorPriorityGuestSpawns,
  resetJinjuIndoorGuestSession,
  getJinjuIndoorGuestPositionYOffset,
  JINJU_INDOOR_PRIORITY_GUEST_IDS,
  JINJU_INDOOR_GUEST_CONFIG_VERSION,
  JINJU_INDOOR_ACTIVE_GUEST_MAX_MARK,
  JINJU_INDOOR_RAMP_1F_PREFIXES,
  JINJU_INDOOR_RAMP_2F_PREFIXES,
  JINJU_INDOOR_UPPER_GUEST_ENABLED,
  getJinjuIndoorGuestLoadYieldFrames,
  getJinjuIndoorGuestRevealDelayMs
} from "./jinju-indoor-guest-config.js?v=jinju-indoor-all16-outdoor-keep-20260705";
import {
  getJinjuRooftopGuestIds,
  getJinjuRooftopGuestSpawns,
  getJinjuRooftopPriorityGuestSpawns,
  getJinjuRooftopBackgroundGuestSpawns,
  resetJinjuRooftopGuestSession,
  JINJU_ROOFTOP_SIMULTANEOUS_GUEST_IDS,
  JINJU_ROOFTOP_GUEST_CONFIG_VERSION,
  getJinjuRooftopGuestLoadYieldFrames,
  getJinjuRooftopGuestRevealDelayMs,
  getJinjuRooftopSequentialGuestSpawns
} from "./jinju-rooftop-guest-config.js?v=jinju-rooftop-marie-sit-clips-20260705";
import { createGuestCharacterSystem, shouldSnapPatrolFloorAtTarget } from "./guest-character-system.js?v=angji-mark13-patrol-20260820";
import { applyLocalDevToolsVisibility, isLocalDevEnvironment } from "./local-dev.js?v=local-dev-20260819";
import { isGuestDevLabelOccluded } from "./guest-dev-label.js?v=angji-guest-labels-20260823";
import { setupAngjiRlbProximityGlow, shouldSkipMaterialFreeze } from "./rlb-proximity-glow.js?v=rlb-shader-proximity-20260820-group-v50";

async function setupLocalRlbShaderTuningPanel(options = {}) {
  if (!isLocalDevEnvironment()) {
    return null;
  }

  try {
    const { createRlbShaderTuningPanel } = await import(
      "./rlb-shader-tuning-panel.js?v=rlb-shader-proximity-20260819-group-v47"
    );
    return createRlbShaderTuningPanel(options);
  } catch (error) {
    console.info("[rlb-tune] admin panel not bundled — night lighting uses baked defaults");
    return null;
  }
}

function ensureAngjiRlbProximityGlow(BABYLON, scene, modelState, getCamera) {
  if (!isAngjiProjectConfig(modelState?.config)) {
    return null;
  }

  if (modelState.rlbProximityGlow && !modelState.rlbProximityGlow.isDisposed?.()) {
    return modelState.rlbProximityGlow;
  }

  try {
    modelState.rlbProximityGlow = setupAngjiRlbProximityGlow(
      BABYLON,
      scene,
      {
        meshes: modelState.meshes,
        model: modelState.model,
        config: modelState.config
      },
      { getCamera }
    );
    console.log("[rlb-glow] re-created proximity glow for Angji model state");
  } catch (error) {
    console.error("[rlb-glow] re-setup failed:", error);
    modelState.rlbProximityGlow = null;
  }

  return modelState.rlbProximityGlow;
}

const MODEL_ROOT = "./assets/models/";
const DEFAULT_MODEL_CACHE_VERSION = "1";

function getModelLoadFileName(config) {
  const version = config?.modelCacheVersion || DEFAULT_MODEL_CACHE_VERSION;
  return `${config.file}?v=${version}`;
}
const ENEMY_ROOT = "./assets/guest/";
const AUDIO_BGM_ROOT = new URL("../assets/audio/bgm/", import.meta.url).href;
const TOUR_BGM_FADE_MS = 3000;
const TOUR_BGM_VOLUME = 1;
const TOUR_BGM_ENABLED = true;
const NIGHT_TOUR_BGM_FILE = "BGM_Night01.mp3";
const NIGHT_CRY_SFX_FILE = "EFT_Crying.mp3";
const NIGHT_CRY_MIN_INTERVAL_MS = 20000;
const NIGHT_CRY_MAX_INTERVAL_MS = 30000;
const NIGHT_CRY_VOLUME = 0.85;

function canUseTourBgm() {
  // Night/day tour audio should play on production (homepage -> metaverse), not only localhost.
  return TOUR_BGM_ENABLED;
}

function resolveTourBgmUrl(fileName) {
  if (!fileName) {
    return null;
  }

  return new URL(String(fileName).replace(/^\//, ""), AUDIO_BGM_ROOT).href;
}
const DEFAULT_MODEL_FILE = "Angji.glb";
const MODEL_CONFIGS = [
  {
    file: "Jinju.glb",
    modelCacheVersion: "20260705-ramp-floors",
    label: "Glocal Jinju",
    overviewId: "jinju",
    moveSpeedMultiplier: 3,
    collision: {
      colLayer: true,
      stairMode: "discrete"
    },
    orbitCamera: {
      zoomOutMultiplier: 3,
      upperBetaDegrees: 82
    },
    performance: {
      localCollisionRadius: 18,
      localGroundRadius: 24,
      localMeshUpdateDistance: 4,
      treeFacingMinMoveDistance: 0.35,
      treeFacingIntervalFrames: 3
    }
  },
  {
    file: "Angji.glb",
    modelCacheVersion: "20260820-angji-trees",
    label: "앵지",
    overviewId: "angji",
    tourBgm: "angji/angji_tour_bgm.mp3",
    moveSpeedMultiplier: 3,
    collision: {
      colLayer: true
    },
    performance: {
      localCollisionRadius: 18,
      localGroundRadius: 24,
      localMeshUpdateDistance: 4,
      treeFacingMinMoveDistance: 0.35,
      treeFacingIntervalFrames: 3,
      treeFacingInOrbit: true
    },
    displayBoards: [
      {
        materialName: "Display_04_01",
        aspectWidth: 9,
        aspectHeight: 6,
        url: "https://rabbit-archi2025.com/history/history.html",
        // Interact on the board itself (HtmlMesh), not a separate modal.
        interactionMode: "embed",
        // Exterior wall board: face outdoors, fill Display material, keep landscape axes.
        contentRotateDegrees: 180,
        contentFlipHorizontal: false,
        preferWorldLandscape: true,
        fillDisplayFace: true,
        faceOutward: true,
        surfaceOffset: 0.08
      }
    ],
    nightLighting: {
      // RLB wall/floor uses shader proximity (rlb-proximity-shader-plugin.js), not SpotLights.
      enableDown01: false,
      enableDown02: false,
      enableDown03: false,
      enableDown0: false,
      enableRlbPresetLights: false,
      maxSimultaneousLights: 4,
      maxActiveSpotLights: 4,
      spotLightCullIntervalFrames: 3,
      spotLightCullRadius: 55,
      lightIncludeRadius: 16,
      flareOcclusionIntervalFrames: 6
    },
    rlbProximityGlow: {
      emissiveOnAllFixtures: true,
      useShaderProximity: true,
      useOverlayFallback: false,
      shaderPriorityOnly: true,
      shaderMaxLights: 320,
      spillOcclusion: true,
      activeOnlyAtNight: true,
      logShaderMaterialNames: false
    },
    orbitCamera: {
      position: { x: -143.86, y: 53.30, z: 6.29 },
      target: { x: 4.27, y: 8.65, z: 5.02 },
      upperBetaDegrees: 82,
      minTargetY: 6.81,
      zoomOutMultiplier: 3,
      time: 7
    },
    tourCamera: {
      position: { x: -46.61, y: 24.44, z: 30.49 },
      target: { x: 0, y: 6.81, z: 0 }
    },
    architectureOverview: {
      title: "■ 설계개요",
      rows: [
        ["명    칭", "앵지밭골 시니어형 소규모체육관"],
        ["대지위치", "창원시 마산회원구 회원동 760-1번지 외 32필지"],
        ["지역지구", "자연녹지지역, 제1종일반주거지역,\n체육시설, 지구단위계획구역"],
        ["대지면적", "6,729.00 ㎡"],
        ["건축면적", "1,125.72 ㎡"],
        ["연 면 적", "1,118.10 ㎡"],
        ["구    조", "일반철골조 + 철근콘크리트조"],
        ["주 용 도", "운동시설"],
        ["건 폐 율", "16.73 % (법정 : 20%/60%이하)"],
        ["용 적 률", "16.62 % (법정 : 100%/200%이하)"],
        ["층    수", "지상 1층"],
        ["최고높이", "10.3 m"],
        ["외부마감", "목재사이딩, 외단열시스템, 복층유리"],
        ["설비개요", "소화펌프, EHP, 태양광(70.4Kw / 36%이상)"],
        ["조경개요", "132.40 ㎡ (대지면적의 17.32 %)"],
        ["주차개요", "총 39대 (장애인주차 2대 포함)"]
      ]
    }
  },
  {
    file: "Chungju.glb",
    modelCacheVersion: "20260805-chungju-ramp-bridge",
    label: "충주",
    overviewId: "chungju",
    moveSpeedMultiplier: 3,
    collision: {
      colLayer: true,
      // Steep 2F ramps + moveSpeedMultiplier 3 need a larger per-frame step budget.
      maxRampStepUp: 1.05,
      // COL ramp meshes can sit slightly above floor slabs in the GLB export.
      bridgeRampFloorGaps: true,
      rampFloorBridgeHorizontal: 1.5
    },
    performance: {
      localCollisionRadius: 18,
      localGroundRadius: 24,
      localMeshUpdateDistance: 4,
      treeFacingMinMoveDistance: 0.35,
      treeFacingIntervalFrames: 3
    },
    displayBoards: [
      {
        materialName: "Display_01_01",
        meshName: "3DGeom-5110",
        url: "https://rabbit-archi2025.com/history/history.html",
        aspectWidth: 9,
        aspectHeight: 6,
        interactionMode: "modal",
        contentFlipHorizontal: true
      }
    ],
    orbitCamera: {
      position: { x: 50.91, y: 40.94, z: 74.48 },
      target: { x: 10.67, y: 16.05, z: 24.47 },
      upperBetaDegrees: 82,
      zoomOutMultiplier: 3,
      time: 11
    },
    tourCamera: {
      position: { x: 28.63, y: 6.51, z: 35.81 },
      target: { x: 21.50, y: 6.80, z: 28.80 }
    }
  },
  {
    file: "Geochang.glb",
    modelCacheVersion: "20260725-blend-load-fix",
    label: "거창",
    overviewId: "geochang",
    moveSpeedMultiplier: 3,
    // Reset: same Angji collision contract (0_COL_* only, no Jinju discrete stairs).
    collision: {
      colLayer: true
    },
    performance: {
      localCollisionRadius: 18,
      localGroundRadius: 24,
      localMeshUpdateDistance: 4,
      treeFacingMinMoveDistance: 0.35,
      treeFacingIntervalFrames: 3,
      optimizeDtvBlendToAlphaTest: true,
      optimizeNonEssentialBlendToAlphaTest: true,
      treatPeopleMaterialAsCutoutProp: true
    },
    displayBoards: [
      {
        materialName: "Display_03_01",
        url: "https://rabbit-archi2025.com/history/history.html",
        aspectWidth: 9,
        aspectHeight: 6,
        interactionMode: "modal"
      }
    ],
    nightLighting: {
      // Perf: only Light_Down0 real SpotLights. Down01/02/03 off.
      enableDown01: false,
      enableDown02: false,
      enableDown03: false,
      enableDown0: true,
      maxSimultaneousLights: 8,
      maxActiveSpotLights: 8,
      spotLightCullIntervalFrames: 3,
      spotLightCullRadius: 55,
      lightIncludeRadius: 16,
      down0Intensity: 24,
      down0LocalRange: 12,
      // World-space -Y; receivers = any mesh inside range + cone (no fixed material list).
      down0AngleDegrees: 140,
      down0ReceiverMode: "range",
      flareOcclusionIntervalFrames: 6
    },
    orbitCamera: {
      position: { x: -41.07, y: 84.64, z: 107.3 },
      target: { x: -42.83, y: 28.5, z: -29.03 },
      rotationY: -3.1287,
      upperBetaDegrees: 82,
      zoomOutMultiplier: 3
    },
    tourCamera: {
      position: { x: -30.82, y: 19.68, z: -6.68 },
      rotationY: -2.9985,
      lookDistance: 10
    }
  }
];
const MODEL_UNIT_SCALE = 1;
const MODEL_ROTATION_X = 0;
const CLAY_PREVIEW = false;
const ENABLE_MODEL_COLLISIONS = false;
const TOUR_START_NAME = "Tour_Start";
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.7;
const GROUND_RAY_UP = 40;
const GROUND_RAY_DOWN = 120;
const TOUR_COLLISION_PADDING = 0.25;
const TOUR_BODY_COLLISION_HEIGHT_OFFSETS = [-0.2, -0.8, -1.22];
const TOUR_LATERAL_COLLISION_OFFSETS = [-PLAYER_RADIUS * 0.75, 0, PLAYER_RADIUS * 0.75];
const LOCAL_COLLISION_RADIUS = 26;
const LOCAL_GROUND_RADIUS = 34;
const LOCAL_MESH_UPDATE_DISTANCE = 2.5;
const DEFAULT_PERFORMANCE_SETTINGS = {
  localCollisionRadius: LOCAL_COLLISION_RADIUS,
  localGroundRadius: LOCAL_GROUND_RADIUS,
  localMeshUpdateDistance: LOCAL_MESH_UPDATE_DISTANCE,
  treeFacingMinMoveDistance: 0.2,
  treeFacingIntervalFrames: 2,
  treeFacingInOrbit: true,
  optimizeDtvBlendToAlphaTest: false,
  optimizeNonEssentialBlendToAlphaTest: false,
  treatPeopleMaterialAsCutoutProp: false
};
const FURNITURE_MATERIAL_PREFIXES = ["chair", "sofa", "table"];
const TOUR_RESET_HORIZONTAL_MARGIN_RATIO = 0.08;
const TOUR_RESET_MIN_HORIZONTAL_MARGIN = 30;
const TOUR_RESET_FALL_DISTANCE = 8;
const TOUR_RESET_FADE_MS = 450;
const MAX_STEP_UP = 0.32;
const MAX_STAIR_STEP_UP = 0.48;
const MAX_RAMP_STEP_UP = 0.72;
const ANGJI_MAX_STAIR_STEP_UP = 1.05;
const MAX_STEP_DOWN = 0.85;
const MIN_STEP_DOWN = 0.025;
const MIN_STEP_UP = 0.035;
const STEP_PROBE_DISTANCES = [0.12, 0.2, 0.32, 0.45, 0.62];
const SHORT_STAIR_PROBE_DISTANCES = [0.12, 0.24, 0.38];
const ANGJI_STAIR_PROBE_DISTANCES = [...STEP_PROBE_DISTANCES, 0.85, 1.1, 1.4];
const MOVE_COLLISION_SUBSTEP_STAIR = 0.14;
const STAIR_CONTEXT_PROBE_OFFSETS = [
  [0, 0],
  [0.28, 0],
  [-0.28, 0],
  [0, 0.28],
  [0, -0.28]
];
const STAIR_STEP_LATERAL_OFFSETS = [0, 0.14, -0.14, 0.24, -0.24];
const RAMP_STEP_LATERAL_OFFSETS = [0, 0.14, -0.14];
const NEAR_RAMP_PROBE_DISTANCES = [0.38, 0.75];
const STAIR_MATERIAL_KEYWORDS = ["polishedconcreteold", "stone01", "stair01", "stair02"];
const STAIR_NODE_KEYWORDS = ["3dgeom126", "3dgeom292", "3dgeom599", "3dgeom600", "stair01", "stair02"];
const ANGJI_BUILDING_WALL_PREFIXES = ["0_col_b_wall"];
const ANGJI_BUILDING_FLOOR1_PREFIXES = ["0_col_b_floor1"];
const ANGJI_BUILDING_FLOOR2_PREFIXES = ["0_col_b_floor2"];
/** Rooftop / 3F floor -> add to GLB as 0_COL_B_Floor3 when the slab exists. */
const ANGJI_BUILDING_FLOOR3_PREFIXES = ["0_col_b_floor3"];
const ANGJI_BUILDING_FLOOR_PREFIXES = [
  ...ANGJI_BUILDING_FLOOR1_PREFIXES,
  ...ANGJI_BUILDING_FLOOR2_PREFIXES,
  ...ANGJI_BUILDING_FLOOR3_PREFIXES
];
const ANGJI_BUILDING_STAIR_PREFIXES = ["0_col_b_stair"];
const ANGJI_BUILDING_RAMP_PREFIXES = [
  "0_col_b_ramp_1f",
  "0_col_b_ramp_2f",
  "0_col_b_ramp_3f",
  "0_col_b_ramp"
];
const ANGJI_BUILDING_FURNITURE_PREFIXES = ["0_col_b_fur"];
const ANGJI_EXTERNAL_FLOOR_PREFIXES = ["0_col_c_floor", "00_col_c_floor"];
const ANGJI_EXTERNAL_WALL_PREFIXES = ["0_col_c_wall"];
const ANGJI_EXTERNAL_STAIR_PREFIXES = ["0_col_c_stair"];
const ANGJI_EXTERNAL_RAMP_PREFIXES = [
  "0_col_c_ramp_1f",
  "0_col_c_ramp_2f",
  "0_col_c_ramp_3f",
  "0_col_c_ramp"
];
const ANGJI_EXTERNAL_BUILDING_PREFIXES = ["0_col_c_bldg1"];
const FLOOR_MATERIAL_KEYWORDS = [
  "colorm00",
  "m00",
  "colord05",
  "d05",
  "color008",
  "008",
  "gray8",
  "28",
  "0128white",
  "*8",
  "<auto>8",
  "auto8",
  "aspalt01",
  "asphaltnew",
  "grasslightgreen",
  "paverswithgrassherringbone",
  "vegetationgrass",
  "polishedconcretenew",
  "woodfloor",
  "ground"
];
const PASS_THROUGH_MATERIAL_KEYWORDS = ["defaultmaterial8", "people"];
const TOUR_PROP_MATERIAL_EXACT_NAMES = ["people01"];
const TOUR_PROP_MATERIAL_KEYWORDS = ["<lc>", ...PASS_THROUGH_MATERIAL_KEYWORDS];
const TOUR_PROP_NODE_KEYWORDS = ["prop", "소품", "decor", "decoration", "accessory", "ornament"];
const FLOOR_NODE_KEYWORDS = [
  "3dgeom247",
  "3dgeom1133",
  "3dgeom1142",
  "3dgeom1144",
  "3dgeom1166",
  "3dgeom1184",
  "3dgeom1189",
  "3dgeom1438",
  "3dgeom1557",
  "3dgeom1558",
  "3dgeom1561",
  "3dgeom1573",
  "3dgeom1639",
  "3dgeom1640",
  "3dgeom2346",
  "3dgeom2347",
  "3dgeom2349",
  "3dgeom2354",
  "3dgeom2355"
];
const GROUND_NORMAL_MIN_Y = 0.55;
const CLASSIFIED_GROUND_NORMAL_MIN_Y = 0.18;
/** Ramps/stairs: allow steeper treads than flat COL floors (~84° vs ~80° from horizontal). */
const RAMP_GROUND_NORMAL_MIN_Y = 0.08;
/** Horizontal reach when bridging a COL floor slab to a nearby COL ramp with a vertical gap. */
const RAMP_FLOOR_BRIDGE_HORIZONTAL = 1.35;
const RAMP_BRIDGE_PROBE_DISTANCES = [0.24, 0.48, 0.72, 1.05, 1.35];
const RAMP_BRIDGE_LATERAL_OFFSETS = [0, 0.2, -0.2, 0.35, -0.35, 0.55, -0.55];
const WALL_NORMAL_MAX_Y = 0.9;
const MIN_COLLISION_DISTANCE = 0.04;
const MIN_WALL_SLIDE_DISTANCE = 0.012;
const MAX_WALL_SLIDE_DEPTH = 2;
const STEP_SMOOTHING = 0.35;
const STEP_SETTLE_EPSILON = 0.015;
const GROUND_GRACE_MS = 180;
const GROUND_GRACE_VERTICAL_TOLERANCE = 0.18;
const STAIR_GROUND_GRACE_MS = 1600;
const STAIR_GROUND_GRACE_VERTICAL_TOLERANCE = 0.52;
const STAIR_STAND_SNAP_TOLERANCE = 0.42;
const ANGJI_SMART_GROUND_Y_BAND = 2.5;
const ANGJI_SLOPE_GROUND_Y_BAND = 3;
const GROUND_PROBE_OFFSETS_COMPACT = [
  [0, 0],
  [PLAYER_RADIUS * 0.55, 0],
  [-PLAYER_RADIUS * 0.55, 0],
  [0, PLAYER_RADIUS * 0.55],
  [0, -PLAYER_RADIUS * 0.55]
];
const GROUND_PROBE_OFFSETS = [
  [0, 0],
  [PLAYER_RADIUS * 0.55, 0],
  [-PLAYER_RADIUS * 0.55, 0],
  [0, PLAYER_RADIUS * 0.55],
  [0, -PLAYER_RADIUS * 0.55],
  [PLAYER_RADIUS * 0.85, 0],
  [-PLAYER_RADIUS * 0.85, 0],
  [0, PLAYER_RADIUS * 0.85],
  [0, -PLAYER_RADIUS * 0.85],
  [PLAYER_RADIUS * 0.4, PLAYER_RADIUS * 0.4],
  [PLAYER_RADIUS * 0.4, -PLAYER_RADIUS * 0.4],
  [-PLAYER_RADIUS * 0.4, PLAYER_RADIUS * 0.4],
  [-PLAYER_RADIUS * 0.4, -PLAYER_RADIUS * 0.4]
];
const DEFAULT_ORBIT_CAMERA = {
  position: { x: 104.57, y: 48.55, z: -1.05 },
  target: { x: 0, y: 6.81, z: 0 }
};
const ORBIT_MOUSE_CONTROL_BACKUP = {
  description: "Babylon default ArcRotateCamera controls before SketchUp-style customization",
  rotateButtons: [0, 1, 2],
  panButton: 2,
  wheelPrecision: 20,
  wheelDeltaPercentage: 0.015,
  panningInertia: 0.65,
  zoomToMouseLocation: false
};
const ORBIT_MOUSE_CONTROL_SETTINGS = {
  rotateButtons: [1],
  rotateSensitivity: 0.003,
  shiftMiddlePanMultiplier: 1,
  zoomToMouseLocation: true
};
// ArcRotateCamera zoom-to-cursor runs scene.pick every wheel tick — dense interior
// geometry freezes the main thread when the camera is close.
const ORBIT_CLOSE_ZOOM_PICK_RADIUS = 12;

function resolveOrbitZoomToMouseLocation(orbitCamera, isNight) {
  if (!orbitCamera || isNight) {
    return false;
  }

  if (orbitCamera.radius <= ORBIT_CLOSE_ZOOM_PICK_RADIUS) {
    return false;
  }

  return ORBIT_MOUSE_CONTROL_SETTINGS.zoomToMouseLocation;
}

function applyOrbitZoomPickPolicy(orbitCamera, isNight) {
  if (!orbitCamera) {
    return;
  }

  orbitCamera.zoomToMouseLocation = resolveOrbitZoomToMouseLocation(orbitCamera, isNight);
}
const DEFAULT_TOUR_CAMERA = {
  position: { x: 36.59, y: 2.02, z: 9.59 },
  target: { x: 26.94, y: 4.55, z: 8.86 }
};

const FIREBALL_SETTINGS = {
  cooldownMs: 500,
  maxActive: 3,
  speed: 0.85,
  radius: 0.18,
  spawnDistance: 0.8,
  maxDistance: 80,
  hitFadeMs: 850,
  hitRotationRadians: Math.PI / 2,
  // Off: ray hits (walls/people/NPC proximity) were stopping projectiles mid-flight.
  collisionEnabled: false
};
const MATERIAL_REFLECTION_SETTINGS = {
  specularIntensity: 0,
  specularPower: 8,
  roughness: 1,
  metallic: 0
};
/** Angji default: fixed count of Light_Down02 twinkle/spot lights. */
const DOWN02_TWINKLE_COUNT = 3;
const ENEMY_SETTINGS = {
  file: "enemy01.glb",
  modelFile: "Angji.glb",
  spawnDelayMs: 5000,
  fadeInMs: 1000,
  deathBlinkMs: 2000,
  deathBlinkCount: 5,
  fadeOutMs: 2000,
  maxHp: 10,
  hitboxPadding: 0,
  heightOffset: -1.7,
  hpBarGap: 0,
  hpBarWidth: 2.2,
  hpBarHeight: 0.18,
  scale: 2,
  patrolSpeedMultiplier: 0.5,
  patrolPoints: [
    { x: -9.63, y: 18.72, z: 21.71 },
    { x: -22.29, y: 18.65, z: -3.84 }
  ]
};

const canvas = document.getElementById("gameCanvas");
let refreshAngjiOrbitGuests = null;
const metaverseLoading = document.getElementById("metaverseLoading");
const loadingProgress = document.getElementById("loadingProgress");
const loadingProgressBar = document.getElementById("loadingProgressBar");
const statusMessage = document.getElementById("statusMessage");
const projectTitle = document.getElementById("projectTitle");
const floorLabel = document.getElementById("floorLabel");
const healthLabel = document.getElementById("healthLabel");
const monsterLabel = document.getElementById("monsterLabel");
const tourModeButton = document.getElementById("tourModeButton");
const orbitViewButton = document.getElementById("orbitViewButton");
const nightModeButton = document.getElementById("nightModeButton");
const sunToggleButton = document.getElementById("sunToggleButton");
const sunPanel = document.getElementById("sunPanel");
const seasonSlider = document.getElementById("seasonSlider");
const timeSlider = document.getElementById("timeSlider");
const seasonValue = document.getElementById("seasonValue");
const timeValue = document.getElementById("timeValue");
const debugToggleButton = document.getElementById("debugToggleButton");
const debugPanel = document.getElementById("debugPanel");
const modelStatus = document.getElementById("modelStatus");
const modelSource = document.getElementById("modelSource");
const modelStats = document.getElementById("modelStats");
const playerDebug = document.getElementById("playerDebug");
const inputDebug = document.getElementById("inputDebug");
const meshList = document.getElementById("meshList");
const copyDebugButton = document.getElementById("copyDebugButton");
const guestPlacementLabel = document.getElementById("guestPlacementLabel");
const guestPlacementFile = document.getElementById("guestPlacementFile");
const guestPlacementList = document.getElementById("guestPlacementList");
const captureGuestPlacementButton = document.getElementById("captureGuestPlacementButton");
const copyGuestPlacementsButton = document.getElementById("copyGuestPlacementsButton");
const undoGuestPlacementButton = document.getElementById("undoGuestPlacementButton");
const clearGuestPlacementsButton = document.getElementById("clearGuestPlacementsButton");
const tourResetFade = document.getElementById("tourResetFade");
const projectOverview = document.getElementById("projectOverview");
const overviewAdminButton = document.getElementById("overviewAdminButton");
const overviewAdminPanel = document.getElementById("overviewAdminPanel");
const overviewAdminCloseButton = document.getElementById("overviewAdminCloseButton");
const overviewAdminPasscode = document.getElementById("overviewAdminPasscode");
const overviewAdminForm = document.getElementById("overviewAdminForm");
const overviewAdminRows = document.getElementById("overviewAdminRows");
const overviewAdminAddRowButton = document.getElementById("overviewAdminAddRowButton");
const overviewAdminStatus = document.getElementById("overviewAdminStatus");
const localDevToolsEnabled = applyLocalDevToolsVisibility();
const PROJECT_OVERVIEWS_PATH = "./data/project-overviews.json";
const OVERVIEW_LOCAL_STORAGE_KEY = "metaverseProjectOverviews";
const FIRESTORE_OVERVIEW_COLLECTION = "metaverseProjectOverviews";
const projectOverviewStore = new Map();
const overviewFirebaseState = {
  db: null,
  firestore: null,
  enabled: false,
  unsubscribe: []
};
let isOverviewAdminUnlocked = false;
let currentOverviewConfig = null;
let loadingTargetProgress = 0;
let loadingDisplayedProgress = 0;
let loadingProgressFrameId = null;
let loadingRevealPending = false;

const LOADING_PROGRESS = {
  engineReady: 0.06,
  dataReady: 0.1,
  modelsWeight: 0.78,
  sceneReady: 0.94
};

function countModelLoadSteps(configs) {
  return configs.reduce((total, config) => total + (config.tourFile ? 2 : 1), 0);
}

function updateLoadingProgressBar() {
  const percent = Math.round(loadingDisplayedProgress * 100);

  if (loadingProgressBar) {
    loadingProgressBar.style.width = `${percent}%`;
  }

  if (loadingProgress) {
    loadingProgress.setAttribute("aria-valuenow", String(percent));
  }
}

function startLoadingProgressAnimation() {
  if (loadingProgressFrameId !== null) {
    return;
  }

  const tick = () => {
    const delta = loadingTargetProgress - loadingDisplayedProgress;

    if (Math.abs(delta) < 0.003) {
      loadingDisplayedProgress = loadingTargetProgress;
    } else {
      loadingDisplayedProgress += delta * 0.14;
    }

    updateLoadingProgressBar();

    if (loadingRevealPending && loadingDisplayedProgress >= 0.995 && loadingTargetProgress >= 1) {
      loadingProgressFrameId = null;
      hideLoadingOverlay();
      return;
    }

    if (loadingDisplayedProgress < loadingTargetProgress || loadingRevealPending) {
      loadingProgressFrameId = window.requestAnimationFrame(tick);
      return;
    }

    loadingProgressFrameId = null;
  };

  loadingProgressFrameId = window.requestAnimationFrame(tick);
}

function setLoadingTargetProgress(value) {
  loadingTargetProgress = Math.max(loadingTargetProgress, Math.min(1, value));
  startLoadingProgressAnimation();
}

function reportModelLoadProgress(completedSteps, totalSteps) {
  const modelProgress = LOADING_PROGRESS.dataReady + ((completedSteps / totalSteps) * LOADING_PROGRESS.modelsWeight);
  setLoadingTargetProgress(modelProgress);
}

function requestLoadingReveal() {
  loadingRevealPending = true;
  setLoadingTargetProgress(1);
}

function startLoadingOverlay() {
  if (!metaverseLoading) {
    return;
  }

  loadingTargetProgress = 0;
  loadingDisplayedProgress = 0;
  loadingRevealPending = false;
  updateLoadingProgressBar();

  metaverseLoading.classList.remove("is-hidden");
  metaverseLoading.setAttribute("aria-busy", "true");
}

function hideLoadingOverlay() {
  if (loadingProgressFrameId !== null) {
    window.cancelAnimationFrame(loadingProgressFrameId);
    loadingProgressFrameId = null;
  }

  if (!metaverseLoading) {
    return;
  }

  metaverseLoading.classList.add("is-hidden");
  metaverseLoading.setAttribute("aria-busy", "false");
  refreshAngjiOrbitGuests?.();
}

startLoadingOverlay();

canvas.tabIndex = 0;

projectTitle.textContent = "First Person Architecture Tour";
floorLabel.textContent = "Orbit View";
healthLabel.textContent = "Human scale";
monsterLabel.textContent = "Object collision";
statusMessage.textContent = "Loading architecture tour...";

function isPlacementToolEnabled() {
  return localDevToolsEnabled && (!debugPanel.hidden || booleanParam("placement", false));
}

function renderGuestPlacementList(markers) {
  if (!guestPlacementList) {
    return;
  }

  guestPlacementList.innerHTML = markers.length === 0
    ? "<li>아직 마커가 없습니다.</li>"
    : markers.map((marker) => {
      const cameraLine = marker.cameraPosition
        ? `<br>cam x ${marker.cameraPosition.x}, y ${marker.cameraPosition.y}, z ${marker.cameraPosition.z}`
        : "";

      return (
        `<li><strong>${marker.label}</strong>`
        + `${marker.file ? ` / ${marker.file}` : ""}`
        + `${marker.source ? ` <em>(${marker.source})</em>` : ""}`
        + cameraLine
        + `<br>pos x ${marker.position.x}, y ${marker.position.y}, z ${marker.position.z}`
        + `<br>rotY ${marker.rotationY} (${marker.rotationYDeg}°)`
        + `</li>`
      );
    }).join("");
}

function getGuestPlacementInputs() {
  return {
    label: guestPlacementLabel?.value?.trim() || "",
    file: guestPlacementFile?.value?.trim() || ""
  };
}

function clearGuestPlacementInputs() {
  if (guestPlacementLabel) {
    guestPlacementLabel.value = "";
  }

  if (guestPlacementFile) {
    guestPlacementFile.value = "";
  }
}

if (localDevToolsEnabled) {
  debugToggleButton?.addEventListener("click", () => {
    debugPanel.hidden = !debugPanel.hidden;
  });

  if (booleanParam("placement", false)) {
    debugPanel.hidden = false;
  }

  copyDebugButton?.addEventListener("click", async () => {
    const debugText = [
      `Status: ${modelStatus.textContent}`,
      `Source: ${modelSource.textContent}`,
      `Stats: ${modelStats.textContent}`,
      `Player: ${playerDebug.textContent}`,
      `Input: ${inputDebug.textContent}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(debugText);
      setStatus("Debug copied. Paste it in chat so I can inspect the current position.");
    } catch {
      setStatus(debugText);
    }
  });
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function getOverviewId(config) {
  return config?.overviewId || normalizeName(config?.label || "");
}

function normalizeOverview(overview) {
  if (!overview) {
    return null;
  }

  const rows = Array.isArray(overview.rows)
    ? overview.rows
      .map((row) => [String(row?.[0] || "").trim(), String(row?.[1] || "").trim()])
      .filter(([label]) => label)
    : [];

  return {
    title: String(overview.title || "■ 설계개요"),
    rows
  };
}

function getProjectOverview(config) {
  const overviewId = getOverviewId(config);
  return projectOverviewStore.get(overviewId) || normalizeOverview(config?.architectureOverview) || null;
}

function setProjectOverview(config, overview) {
  const overviewId = getOverviewId(config);

  if (!overviewId) {
    return;
  }

  projectOverviewStore.set(overviewId, normalizeOverview(overview));
}

function loadLocalOverviewOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(OVERVIEW_LOCAL_STORAGE_KEY) || "{}");
    Object.entries(saved).forEach(([overviewId, overview]) => {
      projectOverviewStore.set(overviewId, normalizeOverview(overview));
    });
  } catch {
    // Ignore malformed local prototype data.
  }
}

function saveLocalOverviewOverrides() {
  const saved = {};
  projectOverviewStore.forEach((overview, overviewId) => {
    saved[overviewId] = overview;
  });
  localStorage.setItem(OVERVIEW_LOCAL_STORAGE_KEY, JSON.stringify(saved));
}

async function loadDefaultProjectOverviews() {
  try {
    const response = await fetch(`${PROJECT_OVERVIEWS_PATH}?v=overview-admin-20260614-2303`, { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const overviews = await response.json();
    Object.entries(overviews).forEach(([overviewId, overview]) => {
      if (!projectOverviewStore.has(overviewId)) {
        projectOverviewStore.set(overviewId, normalizeOverview(overview));
      }
    });
  } catch {
    // Static fallback remains available from MODEL_CONFIGS.
  }
}

function isFirebaseConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.projectId);
}

async function initializeOverviewFirebase(modelConfigs, onChange) {
  if (!isFirebaseConfigured()) {
    overviewAdminStatus.textContent = "Firebase config가 비어 있어 현재 브라우저에 임시 저장됩니다.";
    return;
  }

  try {
    const [{ initializeApp }, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const db = firestoreModule.getFirestore(app);

    overviewFirebaseState.db = db;
    overviewFirebaseState.firestore = firestoreModule;
    overviewFirebaseState.enabled = true;
    overviewAdminStatus.textContent = "Firebase Firestore와 연결되었습니다.";

    modelConfigs
      .filter((config) => getOverviewId(config))
      .forEach((config) => {
        const overviewId = getOverviewId(config);
        const docRef = firestoreModule.doc(db, FIRESTORE_OVERVIEW_COLLECTION, overviewId);
        const unsubscribe = firestoreModule.onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              projectOverviewStore.set(overviewId, normalizeOverview(snapshot.data()));
              onChange?.();
            }
          },
          (error) => {
            if (error.code === "permission-denied") {
              console.warn(`Firestore overview (${overviewId}) unavailable in this session.`);
              return;
            }

            console.error(`Firestore overview (${overviewId}) listener failed:`, error);
          }
        );
        overviewFirebaseState.unsubscribe.push(unsubscribe);
      });
  } catch (error) {
    overviewFirebaseState.enabled = false;
    overviewAdminStatus.textContent = `Firebase 연결 실패: ${error.message || error}`;
  }
}

async function saveProjectOverview(config, overview) {
  const overviewId = getOverviewId(config);
  const normalizedOverview = normalizeOverview(overview);

  setProjectOverview(config, normalizedOverview);
  saveLocalOverviewOverrides();

  if (!overviewFirebaseState.enabled) {
    return "Firebase config 전이라 현재 브라우저에 임시 저장했습니다.";
  }

  const { db, firestore } = overviewFirebaseState;
  await firestore.setDoc(firestore.doc(db, FIRESTORE_OVERVIEW_COLLECTION, overviewId), normalizedOverview, { merge: true });
  return "Firebase Firestore에 저장했습니다.";
}

function renderProjectOverview(overview) {
  if (!projectOverview) {
    return;
  }

  projectOverview.replaceChildren();

  if (!overview) {
    projectOverview.classList.add("is-hidden");
    return;
  }

  projectOverview.classList.remove("is-hidden");

  const title = document.createElement("h2");
  title.textContent = overview.title;
  const list = document.createElement("dl");

  overview.rows.forEach(([label, value]) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = formatOverviewLabel(label);
    description.textContent = value;
    list.append(term, description);
  });

  projectOverview.append(title, list);
}

function formatOverviewLabel(label) {
  const text = String(label || "").replace(/\s+/g, "");

  if (text.length >= 4) {
    return text;
  }

  if (text.length <= 1) {
    return text;
  }

  return text.split("").join(" ".repeat(5 - text.length));
}

function renderOverviewAdminEditor(config) {
  currentOverviewConfig = config || null;
  overviewAdminRows.replaceChildren();

  if (!currentOverviewConfig) {
    overviewAdminStatus.textContent = "편집할 프로젝트 개요가 없습니다.";
    overviewAdminForm.hidden = true;
    return;
  }

  const overview = getProjectOverview(currentOverviewConfig) || { title: "■ 설계개요", rows: [] };
  overview.rows.forEach(([label, value]) => {
    addOverviewAdminRow(label, value);
  });
  overviewAdminForm.hidden = false;
}

function addOverviewAdminRow(label = "", value = "") {
  const row = document.createElement("div");
  const labelInput = document.createElement("input");
  const valueInput = document.createElement("textarea");
  const removeButton = document.createElement("button");

  row.className = "overview-admin-row";
  labelInput.value = label;
  labelInput.placeholder = "항목명";
  valueInput.value = value;
  valueInput.placeholder = "내용";
  removeButton.type = "button";
  removeButton.textContent = "삭제";
  removeButton.addEventListener("click", () => row.remove());
  row.append(labelInput, valueInput, removeButton);
  overviewAdminRows.append(row);
}

function getOverviewFromAdminForm() {
  const rows = [...overviewAdminRows.querySelectorAll(".overview-admin-row")]
    .map((row) => {
      const [labelInput, valueInput] = row.querySelectorAll("input, textarea");
      return [labelInput.value.trim(), valueInput.value.trim()];
    })
    .filter(([label]) => label);

  return {
    title: "■ 설계개요",
    rows
  };
}

function isTextInputTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function isOverviewAdminEditing(event) {
  return Boolean(!overviewAdminPanel.hidden && (overviewAdminPanel.contains(event.target) || isTextInputTarget(event.target)));
}

overviewAdminButton.addEventListener("click", () => {
  overviewAdminPanel.hidden = !overviewAdminPanel.hidden;
});

overviewAdminCloseButton.addEventListener("click", () => {
  overviewAdminPanel.hidden = true;
});

function unlockOverviewAdminIfReady() {
  if (overviewAdminPasscode.value !== OVERVIEW_ADMIN_PASSCODE) {
    return;
  }

  isOverviewAdminUnlocked = true;
  overviewAdminStatus.textContent = "관리자모드가 열렸습니다.";
  renderOverviewAdminEditor(currentOverviewConfig);
}

overviewAdminPasscode.addEventListener("input", unlockOverviewAdminIfReady);
overviewAdminPasscode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    unlockOverviewAdminIfReady();
  }
});

overviewAdminAddRowButton.addEventListener("click", () => {
  addOverviewAdminRow();
});

overviewAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isOverviewAdminUnlocked || !currentOverviewConfig) {
    overviewAdminStatus.textContent = "관리자모드를 먼저 열어주세요.";
    return;
  }

  const overview = getOverviewFromAdminForm();

  try {
    const message = await saveProjectOverview(currentOverviewConfig, overview);
    renderProjectOverview(getProjectOverview(currentOverviewConfig));
    overviewAdminStatus.textContent = message;
  } catch (error) {
    overviewAdminStatus.textContent = `저장 실패: ${error.message || error}`;
  }
});

function vectorToText(vector) {
  return `x ${vector.x.toFixed(2)}, y ${vector.y.toFixed(2)}, z ${vector.z.toFixed(2)}`;
}

function boundsToText(bounds) {
  return `min ${vectorToText(bounds.min)} / center ${vectorToText(bounds.center)} / max ${vectorToText(bounds.max)} / size ${vectorToText(bounds.size)}`;
}

function booleanParam(name, fallback) {
  const value = new URLSearchParams(window.location.search).get(name);
  return value === null ? fallback : value !== "0" && value !== "false";
}

function resolveInitialModelIndex(modelStates) {
  const params = new URLSearchParams(window.location.search);
  const project = params.get("project");
  const modelFile = params.get("model");

  if (project) {
    const projectIndex = modelStates.findIndex((modelState) => modelState.config.overviewId === project);

    if (projectIndex >= 0) {
      return projectIndex;
    }
  }

  if (modelFile) {
    const fileIndex = modelStates.findIndex((modelState) => modelState.config.file === modelFile);

    if (fileIndex >= 0) {
      return fileIndex;
    }
  }

  return Math.max(0, MODEL_CONFIGS.findIndex((config) => config.file === DEFAULT_MODEL_FILE));
}

function resolveActiveModelConfigs() {
  const params = new URLSearchParams(window.location.search);
  const project = params.get("project");
  const modelFile = params.get("model");

  if (project) {
    const matched = MODEL_CONFIGS.filter((config) => config.overviewId === project);
    if (matched.length) {
      return matched;
    }
  }

  if (modelFile) {
    const matched = MODEL_CONFIGS.filter((config) => config.file === modelFile);
    if (matched.length) {
      return matched;
    }
  }

  const fallback = MODEL_CONFIGS.find((config) => config.file === DEFAULT_MODEL_FILE) || MODEL_CONFIGS[0];
  return fallback ? [fallback] : [];
}

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/[\s_-]+/g, "");
}

function getGeometryMeshes(meshes) {
  return meshes.filter((mesh) => typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() > 0);
}

function getMeshBounds(BABYLON, mesh) {
  if (!mesh.getBoundingInfo) {
    return null;
  }

  mesh.computeWorldMatrix(true);
  const boundingBox = mesh.getBoundingInfo().boundingBox;
  const min = boundingBox.minimumWorld.clone();
  const max = boundingBox.maximumWorld.clone();
  const size = max.subtract(min);
  const center = min.add(size.scale(0.5));
  const maxDimension = Math.max(size.x, size.y, size.z);

  return { min, max, size, center, maxDimension };
}

function getCachedMeshBounds(BABYLON, mesh) {
  const cachedBounds = mesh.metadata?.tourBounds;

  if (cachedBounds) {
    return cachedBounds;
  }

  const bounds = getMeshBounds(BABYLON, mesh);
  mesh.metadata = { ...(mesh.metadata || {}), tourBounds: bounds };
  return bounds;
}

function isMeshNearPosition(BABYLON, mesh, position, radius) {
  const bounds = getCachedMeshBounds(BABYLON, mesh);

  if (!bounds) {
    return true;
  }

  const clampedX = Math.max(bounds.min.x, Math.min(position.x, bounds.max.x));
  const clampedY = Math.max(bounds.min.y, Math.min(position.y, bounds.max.y));
  const clampedZ = Math.max(bounds.min.z, Math.min(position.z, bounds.max.z));
  const closest = new BABYLON.Vector3(clampedX, clampedY, clampedZ);

  return BABYLON.Vector3.DistanceSquared(position, closest) <= radius * radius;
}

function getMeshesNearPosition(BABYLON, meshes, position, radius) {
  return meshes.filter((mesh) => isMeshNearPosition(BABYLON, mesh, position, radius));
}

function combineBounds(BABYLON, boundsList) {
  const min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  boundsList.forEach((bounds) => {
    min.minimizeInPlace(bounds.min);
    max.maximizeInPlace(bounds.max);
  });

  const size = max.subtract(min);
  const center = min.add(size.scale(0.5));

  return { min, max, size, center };
}

function getFullBounds(BABYLON, meshes) {
  const boundsList = meshes.map((mesh) => getMeshBounds(BABYLON, mesh)).filter(Boolean);

  if (boundsList.length === 0) {
    return {
      min: BABYLON.Vector3.Zero(),
      max: BABYLON.Vector3.One(),
      size: BABYLON.Vector3.One(),
      center: BABYLON.Vector3.Zero()
    };
  }

  return combineBounds(BABYLON, boundsList);
}

function getFocusBounds(BABYLON, meshes) {
  const boundsList = meshes
    .map((mesh) => getMeshBounds(BABYLON, mesh))
    .filter((bounds) => bounds && bounds.maxDimension > 0)
    .sort((a, b) => a.maxDimension - b.maxDimension);

  if (boundsList.length === 0) {
    return getFullBounds(BABYLON, meshes);
  }

  const p98 = boundsList[Math.floor(boundsList.length * 0.98)]?.maxDimension || boundsList.at(-1).maxDimension;
  const limit = Math.max(p98 * 2, 1);
  const filtered = boundsList.filter((bounds) => bounds.maxDimension <= limit);

  return combineBounds(BABYLON, filtered.length > 0 ? filtered : boundsList);
}

function getRootNodes(result) {
  const nodes = [...result.meshes, ...(result.transformNodes || [])];
  const roots = nodes.filter((node) => !node.parent);
  return roots.length > 0 ? roots : result.meshes;
}

function updateWorldMatrices(root, meshes) {
  root.computeWorldMatrix(true);
  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
}

function isTourStartNode(node) {
  return normalizeName(node.name || node.id).includes(normalizeName(TOUR_START_NAME));
}

function findTourStartNode(result) {
  return [...(result.transformNodes || []), ...result.meshes].find(isTourStartNode) || null;
}

function isDescendantOf(node, ancestor) {
  let current = node;

  while (current) {
    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isNonCollisionProp(node) {
  const passThroughNames = [
    "human",
    "person",
    "people",
    "pedestrian",
    "character",
    "avatar",
    "man",
    "woman",
    "boy",
    "girl",
    "male",
    "female",
    "body",
    "head",
    "hand",
    "arm",
    "leg",
    "foot",
    "cloth",
    "clothes",
    "skin",
    "hair",
    "사람",
    "인물",
    "남자",
    "여자",
    "아이",
    "캐릭터",
    "아바타"
  ];
  let current = node;

  while (current) {
    if (current.metadata?.isGeneratedTourRoot) {
      current = current.parent;
      continue;
    }

    const name = normalizeName(current.name || current.id);

    if (passThroughNames.some((keyword) => name.includes(keyword))) {
      return true;
    }

    current = current.parent;
  }

  const materialNames = [];

  if (node.material) {
    if (Array.isArray(node.material.subMaterials)) {
      node.material.subMaterials.forEach((material) => {
        if (material) materialNames.push(material.name, material.id);
      });
    } else {
      materialNames.push(node.material.name, node.material.id);
    }
  }

  if (materialNames.some((name) => PASS_THROUGH_MATERIAL_KEYWORDS.some((keyword) => normalizeName(name).includes(keyword)))) {
    return true;
  }

  return false;
}

function isTourPropMesh(mesh) {
  if (isNonCollisionProp(mesh)) {
    return true;
  }

  if (hasExactMaterialName(mesh, TOUR_PROP_MATERIAL_EXACT_NAMES)) {
    return true;
  }

  if (hasMaterialKeyword(mesh, TOUR_PROP_MATERIAL_KEYWORDS)) {
    return true;
  }

  let current = mesh;

  while (current) {
    if (current.metadata?.isGeneratedTourRoot) {
      current = current.parent;
      continue;
    }

    const name = normalizeName(current.name || current.id);

    if (TOUR_PROP_NODE_KEYWORDS.some((keyword) => name.includes(normalizeName(keyword)))) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isNonWalkableObject(node) {
  const nonWalkableNames = [
    "car",
    "vehicle",
    "auto",
    "tree",
    "trunk",
    "plant",
    "bush",
    "chair",
    "sofa",
    "table",
    "자동차",
    "차량",
    "나무",
    "수목",
    "식재"
  ];
  let current = node;

  while (current) {
    const name = normalizeName(current.name || current.id);

    if (nonWalkableNames.some((keyword) => name.includes(keyword))) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function getMaterialNames(mesh) {
  if (!mesh.material) {
    return [];
  }

  if (Array.isArray(mesh.material.subMaterials)) {
    return mesh.material.subMaterials
      .filter(Boolean)
      .flatMap((material) => [material.name, material.id]);
  }

  return [mesh.material.name, mesh.material.id];
}

function normalizeMaterialName(name) {
  return String(name || "").trim().toLowerCase();
}

function getNormalizedMaterialNames(mesh) {
  return getMaterialNames(mesh).map(normalizeMaterialName).filter(Boolean);
}

function collectMeshMaterials(mesh) {
  if (!mesh?.material) {
    return [];
  }

  if (Array.isArray(mesh.material.subMaterials)) {
    return mesh.material.subMaterials.filter(Boolean);
  }

  return [mesh.material];
}

function angjiMaterialNameMatchesPrefix(name, prefixes) {
  const normalizedName = normalizeMaterialName(name);

  return prefixes.some((prefix) => (
    normalizedName === prefix
    || normalizedName.startsWith(`${prefix}`)
  ));
}

function getAngjiCollisionMaterialRole(mesh) {
  const materialNames = getNormalizedMaterialNames(mesh);

  for (const name of materialNames) {
    if (
      angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_RAMP_PREFIXES)
      || angjiMaterialNameMatchesPrefix(name, ANGJI_EXTERNAL_RAMP_PREFIXES)
    ) {
      return "ramp";
    }

    if (
      angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_STAIR_PREFIXES)
      || angjiMaterialNameMatchesPrefix(name, ANGJI_EXTERNAL_STAIR_PREFIXES)
    ) {
      return "stair";
    }

    if (angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_FURNITURE_PREFIXES)) {
      return "furniture";
    }

    if (
      angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_FLOOR_PREFIXES)
      || angjiMaterialNameMatchesPrefix(name, ANGJI_EXTERNAL_FLOOR_PREFIXES)
    ) {
      return "floor";
    }

    if (
      angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_WALL_PREFIXES)
      || angjiMaterialNameMatchesPrefix(name, ANGJI_EXTERNAL_WALL_PREFIXES)
      || angjiMaterialNameMatchesPrefix(name, ANGJI_EXTERNAL_BUILDING_PREFIXES)
    ) {
      return "wall";
    }
  }

  return null;
}

function hasAngjiCollisionMaterial(mesh) {
  return getAngjiCollisionMaterialRole(mesh) !== null;
}

function hasAngjiStairMaterial(mesh) {
  return getAngjiCollisionMaterialRole(mesh) === "stair";
}

function hasAngjiRampMaterial(mesh) {
  return getAngjiCollisionMaterialRole(mesh) === "ramp";
}

function getAngjiRampFloorLevel(mesh) {
  if (!mesh) {
    return null;
  }

  const storedLevel = mesh.metadata?.angjiRampFloorLevel;

  if (typeof storedLevel === "number") {
    return storedLevel;
  }

  for (const name of getNormalizedMaterialNames(mesh)) {
    if (!name.includes("ramp")) {
      continue;
    }

    if (name.endsWith("_3f")) {
      return 3;
    }

    if (name.endsWith("_2f")) {
      return 2;
    }

    if (name.endsWith("_1f")) {
      return 1;
    }
  }

  return null;
}

function inferRampFloorLevelAtPosition(BABYLON, position, groundMeshes) {
  const feetY = position.y - EYE_HEIGHT;
  let onRampLevel = null;
  let nearestLevel = null;
  let nearestDistance = Infinity;

  groundMeshes.forEach((mesh) => {
    const level = getAngjiRampFloorLevel(mesh);

    if (!level) {
      return;
    }

    const bounds = getCachedMeshBounds(BABYLON, mesh);

    if (!bounds) {
      return;
    }

    if (feetY >= bounds.min.y - 0.35 && feetY <= bounds.max.y + 0.5) {
      onRampLevel = level;
      return;
    }

    const distance = feetY < bounds.min.y
      ? bounds.min.y - feetY
      : feetY > bounds.max.y
        ? feetY - bounds.max.y
        : 0;

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestLevel = level;
    }
  });

  return onRampLevel ?? nearestLevel;
}

function selectBestRampCandidate(ramps, options = {}) {
  if (!ramps.length) {
    return null;
  }

  const preferredLevel = options.preferredRampFloorLevel;

  if (typeof preferredLevel === "number") {
    const sameFloor = ramps.filter((candidate) => candidate.rampFloorLevel === preferredLevel);

    if (sameFloor.length) {
      return sameFloor.sort(compareGroundCandidateDelta)[0];
    }

    const adjacentFloor = ramps.filter((candidate) => (
      typeof candidate.rampFloorLevel === "number"
      && Math.abs(candidate.rampFloorLevel - preferredLevel) <= 1
    ));

    if (adjacentFloor.length) {
      return adjacentFloor.sort(compareGroundCandidateDelta)[0];
    }
  }

  return ramps.sort(compareGroundCandidateDelta)[0];
}

function hasVisualStairMaterial(mesh) {
  if (hasAngjiCollisionMaterial(mesh)) {
    return false;
  }

  if (hasExactMaterialName(mesh, ["stair01", "stair02"])) {
    return true;
  }

  let current = mesh;

  while (current) {
    const name = normalizeName(current.name || current.id);

    if (STAIR_NODE_KEYWORDS.some((keyword) => name.includes(keyword))) {
      return true;
    }

    current = current.parent;
  }

  return hasMaterialKeyword(mesh, STAIR_MATERIAL_KEYWORDS);
}

function hasAngjiFurnitureMaterial(mesh) {
  return getAngjiCollisionMaterialRole(mesh) === "furniture";
}

function hasAngjiBuildingFloor1Material(mesh) {
  return getNormalizedMaterialNames(mesh).some((name) => (
    angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_FLOOR1_PREFIXES)
  ));
}

function hasAngjiBuildingFloor2Material(mesh) {
  return getNormalizedMaterialNames(mesh).some((name) => (
    angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_FLOOR2_PREFIXES)
  ));
}

function hasAngjiBuildingFloor3Material(mesh) {
  return getNormalizedMaterialNames(mesh).some((name) => (
    angjiMaterialNameMatchesPrefix(name, ANGJI_BUILDING_FLOOR3_PREFIXES)
  ));
}

function hasAngjiExternalFloorMaterial(mesh) {
  return getNormalizedMaterialNames(mesh).some((name) => (
    angjiMaterialNameMatchesPrefix(name, ANGJI_EXTERNAL_FLOOR_PREFIXES)
  ));
}

function hasAngjiGroundMaterial(mesh) {
  return getAngjiCollisionMaterialRole(mesh) === "floor";
}

function hasAngjiWallMaterial(mesh) {
  return getAngjiCollisionMaterialRole(mesh) === "wall";
}

function applyAngjiCollisionInvisibility(mesh, BABYLON) {
  // Collision helpers must stay pickable for walks/occlusion rays, but never draw.
  // (A prior depth-only pass left wall COL visible when disableColorWrite failed on PBR.)
  mesh.isPickable = true;
  mesh.isVisible = false;
  mesh.visibility = 0;
  mesh.metadata = {
    ...(mesh.metadata || {}),
    angjiCollisionInvisible: true,
    angjiDepthOccluder: false
  };

  // Keep materials opaque/pickable-friendly without forcing a visible depth pass.
  collectMeshMaterials(mesh).forEach((material) => {
    if (!material) {
      return;
    }

    if (typeof material.unfreeze === "function") {
      material.unfreeze();
    }

    material.disableDepthWrite = true;

    if ("disableColorWrite" in material) {
      material.disableColorWrite = true;
    }

    if (typeof material.freeze === "function") {
      material.freeze();
    }
  });
}

function isAngjiWalkableSurfaceMesh(mesh) {
  if (mesh.metadata?.angjiVisualStairSurface) {
    return false;
  }

  return Boolean(
    mesh.metadata?.angjiFloorSurface
    || mesh.metadata?.angjiRampSurface
    || mesh.metadata?.angjiStairSurface
  );
}

function isMeshWithinVerticalBand(BABYLON, mesh, eyeY, bandHalfHeight) {
  const bounds = getCachedMeshBounds(BABYLON, mesh);

  if (!bounds) {
    return true;
  }

  const feetY = eyeY - EYE_HEIGHT;

  return bounds.max.y >= feetY - bandHalfHeight && bounds.min.y <= feetY + bandHalfHeight;
}

function buildLocalGroundMeshSet(BABYLON, position, groundMeshes, radius, config) {
  const nearbyGroundMeshes = getMeshesNearPosition(BABYLON, groundMeshes, position, radius);
  const merged = new Map(
    (nearbyGroundMeshes.length > 0 ? nearbyGroundMeshes : groundMeshes)
      .map((mesh) => [mesh.uniqueId, mesh])
  );

  if (!hasColLayerConfig(config)) {
    return new Set(merged.values());
  }

  const inferredRampFloor = inferRampFloorLevelAtPosition(BABYLON, position, groundMeshes);

  groundMeshes.forEach((mesh) => {
    if (!isAngjiWalkableSurfaceMesh(mesh)) {
      return;
    }

    const rampFloorLevel = mesh.metadata?.angjiRampFloorLevel;

    if (
      typeof rampFloorLevel === "number"
      && typeof inferredRampFloor === "number"
      && Math.abs(rampFloorLevel - inferredRampFloor) > 1
    ) {
      return;
    }

    const colSlope = isColSlopeGroundMesh(mesh);
    const yBand = colSlope ? ANGJI_SLOPE_GROUND_Y_BAND : ANGJI_SMART_GROUND_Y_BAND;

    if (colSlope) {
      if (isMeshWithinVerticalBand(BABYLON, mesh, position.y, yBand)) {
        merged.set(mesh.uniqueId, mesh);
      }

      return;
    }

    if (isMeshWithinVerticalBand(BABYLON, mesh, position.y, yBand)) {
      merged.set(mesh.uniqueId, mesh);
    }
  });

  if (hasColRampFloorBridgeConfig(config)) {
    const bridgeBand = ANGJI_SLOPE_GROUND_Y_BAND + getProjectMaxRampStepUp(config) + 0.35;

    groundMeshes.forEach((mesh) => {
      if (!isColRampGroundMesh(mesh)) {
        return;
      }

      if (isMeshWithinVerticalBand(BABYLON, mesh, position.y, bridgeBand)) {
        merged.set(mesh.uniqueId, mesh);
      }
    });
  }

  return new Set(merged.values());
}

function hasMaterialKeyword(mesh, keywords) {
  return getMaterialNames(mesh).some((name) => {
    const normalizedName = normalizeName(name);
    return keywords.some((keyword) => normalizedName.includes(keyword));
  });
}

function hasExactMaterialName(mesh, names) {
  const normalizedTargets = new Set(names.map((name) => normalizeName(name)));

  return getMaterialNames(mesh).some((name) => normalizedTargets.has(normalizeName(name)));
}

function boundsOverlapXZ(a, b, padding = 0) {
  return a.min.x - padding <= b.max.x
    && b.min.x - padding <= a.max.x
    && a.min.z - padding <= b.max.z
    && b.min.z - padding <= a.max.z;
}

function auditColRampFloorConnectivity(BABYLON, modelState) {
  if (!modelState || !hasColLayerConfig(modelState.config)) {
    return null;
  }

  const rampMeshes = modelState.meshes.filter((mesh) => (
    mesh.metadata?.angjiRampSurface
    && mesh.metadata?.angjiCollisionLayer
    && mesh.isEnabled?.() !== false
  ));
  const floorMeshes = modelState.meshes.filter((mesh) => (
    mesh.metadata?.angjiFloorSurface
    && mesh.isEnabled?.() !== false
  ));
  const issues = [];

  rampMeshes.forEach((rampMesh) => {
    const rampBounds = getCachedMeshBounds(BABYLON, rampMesh);

    if (!rampBounds) {
      return;
    }

    const overlappingFloors = floorMeshes.filter((floorMesh) => {
      const floorBounds = getCachedMeshBounds(BABYLON, floorMesh);

      if (!floorBounds) {
        return false;
      }

      return boundsOverlapXZ(rampBounds, floorBounds, 0.12);
    });

    if (!overlappingFloors.length) {
      issues.push({
        type: "no-floor-xz-overlap",
        ramp: rampMesh.name || rampMesh.id,
        rampY: `${rampBounds.min.y.toFixed(2)}-${rampBounds.max.y.toFixed(2)}`
      });
      return;
    }

    overlappingFloors.forEach((floorMesh) => {
      const floorBounds = getCachedMeshBounds(BABYLON, floorMesh);
      const yGap = rampBounds.min.y > floorBounds.max.y
        ? rampBounds.min.y - floorBounds.max.y
        : floorBounds.min.y > rampBounds.max.y
          ? floorBounds.min.y - rampBounds.max.y
          : 0;

      if (yGap > getProjectMaxRampStepUp(modelState.config) + 0.05) {
        issues.push({
          type: "floor-ramp-y-gap",
          ramp: rampMesh.name || rampMesh.id,
          floor: floorMesh.name || floorMesh.id,
          gapMeters: Number(yGap.toFixed(2))
        });
      }
    });
  });

  if (issues.length) {
    console.warn(
      `[collision] ${modelState.config?.label || "model"}: ${issues.length} COL ramp connectivity issue(s).`,
      issues
    );
  } else if (rampMeshes.length) {
    console.info(
      `[collision] ${modelState.config?.label || "model"}: ${rampMeshes.length} COL ramp mesh(es) overlap floor COL in XZ.`
    );
  }

  return { rampMeshes: rampMeshes.length, floorMeshes: floorMeshes.length, issues };
}

function raycastColRampAt(BABYLON, scene, x, z, referenceEyeY, rampMeshSet, maxRampStepUp) {
  const rayOrigin = new BABYLON.Vector3(x, referenceEyeY + GROUND_RAY_UP, z);
  const ray = new BABYLON.Ray(
    rayOrigin,
    BABYLON.Vector3.Down(),
    GROUND_RAY_UP + GROUND_RAY_DOWN + maxRampStepUp + 0.75
  );
  const hit = getRayHits(scene, ray, (mesh) => (
    rampMeshSet.has(mesh)
    && mesh.isPickable !== false
    && mesh.isEnabled()
  ))
    .map(getValidGroundHit)
    .filter(Boolean)
    .sort((a, b) => b.pickedPoint.y - a.pickedPoint.y)[0];

  if (!hit?.pickedPoint) {
    return null;
  }

  const eyeY = hit.pickedPoint.y + EYE_HEIGHT;
  const verticalDelta = eyeY - referenceEyeY;

  if (verticalDelta < MIN_STEP_UP || verticalDelta > maxRampStepUp) {
    return null;
  }

  return {
    hit,
    eyeY,
    verticalDelta
  };
}

function findColRampBridgeStepPose(BABYLON, scene, position, movement, groundMeshSet, options = {}) {
  const maxRampStepUp = options.maxRampStepUp ?? MAX_RAMP_STEP_UP;
  const horizontalReach = options.rampFloorBridgeHorizontal ?? RAMP_FLOOR_BRIDGE_HORIZONTAL;
  const moveDistance = movement.length();

  if (moveDistance <= 0.01) {
    return null;
  }

  const direction = movement.normalizeToNew();
  const lateralAxis = new BABYLON.Vector3(direction.z, 0, -direction.x).normalize();
  const rampMeshSet = new Set(
    [...groundMeshSet].filter((mesh) => isColRampGroundMesh(mesh))
  );

  if (!rampMeshSet.size) {
    return null;
  }

  const probeDistances = options.probeDistances ?? RAMP_BRIDGE_PROBE_DISTANCES;
  const lateralOffsets = options.lateralOffsets ?? RAMP_BRIDGE_LATERAL_OFFSETS;

  for (const distance of probeDistances) {
    const probeDistance = Math.min(Math.max(distance, moveDistance), horizontalReach);

    for (const lateralOffset of lateralOffsets) {
      const lateral = lateralAxis.scale(lateralOffset);
      const probe = position.add(direction.scale(probeDistance)).add(lateral);
      const stepPose = raycastColRampAt(
        BABYLON,
        scene,
        probe.x,
        probe.z,
        position.y,
        rampMeshSet,
        maxRampStepUp
      );

      if (stepPose) {
        return stepPose;
      }
    }
  }

  return null;
}

function isColRampMeshAhead(BABYLON, position, movement, groundMeshSet, options = {}) {
  const horizontalReach = options.rampFloorBridgeHorizontal ?? RAMP_FLOOR_BRIDGE_HORIZONTAL;
  const maxRampStepUp = options.maxRampStepUp ?? MAX_RAMP_STEP_UP;
  const moveDistance = movement.length();

  if (moveDistance <= 0.01) {
    return false;
  }

  const direction = movement.normalizeToNew();
  const forward = new BABYLON.Vector3(direction.x, 0, direction.z).normalize();
  const flatPos = new BABYLON.Vector3(position.x, 0, position.z);
  const feetY = position.y - EYE_HEIGHT;

  for (const mesh of groundMeshSet) {
    if (!isColRampGroundMesh(mesh)) {
      continue;
    }

    const bounds = getCachedMeshBounds(BABYLON, mesh);

    if (!bounds) {
      continue;
    }

    const clampedX = Math.max(bounds.min.x, Math.min(position.x, bounds.max.x));
    const clampedZ = Math.max(bounds.min.z, Math.min(position.z, bounds.max.z));
    const closest = new BABYLON.Vector3(clampedX, 0, clampedZ);
    const toMesh = closest.subtract(flatPos);
    const flatDist = toMesh.length();

    if (flatDist > horizontalReach) {
      continue;
    }

    if (flatDist > 0.02) {
      toMesh.normalize();

      if (BABYLON.Vector3.Dot(toMesh, forward) < 0.12) {
        continue;
      }
    }

    if (bounds.max.y < feetY - 0.35 || bounds.min.y > feetY + maxRampStepUp + 0.45) {
      continue;
    }

    return true;
  }

  return false;
}

function auditAngjiTourElements(modelState) {
  if (!modelState) {
    return null;
  }

  const categories = {
    disabled: [],
    invisible: [],
    peopleProps: [],
    propMeshes: [],
    glass: [],
    trees: [],
    metal: [],
    splitPeopleComponents: [],
    angjiWalls: [],
    angjiFurniture: [],
    angjiFloors: [],
    angjiRamps: [],
    angjiStairs: [],
    angjiColOther: [],
    angjiLayerConflicts: []
  };

  modelState.meshes.forEach((mesh) => {
    const label = mesh.name || mesh.id || "(unnamed)";
    const materialNames = getMaterialNames(mesh).join(",") || "no-material";
    const entry = `${label} [${materialNames}]`;
    const angjiLayers = [];

    if (mesh.metadata?.angjiWallSurface) angjiLayers.push("wall");
    if (mesh.metadata?.angjiFurnitureSurface) angjiLayers.push("furniture");
    if (mesh.metadata?.angjiFloorSurface) angjiLayers.push("floor");
    if (mesh.metadata?.angjiRampSurface) angjiLayers.push("ramp");
    if (mesh.metadata?.angjiStairSurface) angjiLayers.push("stair");

    if (angjiLayers.length > 1) {
      categories.angjiLayerConflicts.push(`${entry} -> ${angjiLayers.join("+")}`);
    } else if (angjiLayers.length === 1) {
      const layer = angjiLayers[0];

      if (layer === "wall") categories.angjiWalls.push(entry);
      else if (layer === "furniture") categories.angjiFurniture.push(entry);
      else if (layer === "floor") categories.angjiFloors.push(entry);
      else if (layer === "ramp") categories.angjiRamps.push(entry);
      else if (layer === "stair") categories.angjiStairs.push(entry);
    } else if (mesh.metadata?.angjiCollisionLayer) {
      categories.angjiColOther.push(entry);
    }

    if (!mesh.isEnabled()) {
      categories.disabled.push(entry);
    }

    if (typeof mesh.visibility === "number" && mesh.visibility <= 0.02) {
      categories.invisible.push(entry);
    }

    if (mesh.metadata?.fireballSplitComponent) {
      categories.splitPeopleComponents.push(entry);
    } else if (hasExactMaterialName(mesh, ["people01"])) {
      categories.peopleProps.push(entry);
    }

    if (isTourPropMesh(mesh)) {
      categories.propMeshes.push(entry);
    }

    if (hasMaterialKeyword(mesh, ["glass", "translucent"])) {
      categories.glass.push(entry);
    }

    if (isDtvTreeMesh(mesh)) {
      categories.trees.push(entry);
    }

    if (hasMaterialKeyword(mesh, ["metal", "aluminum", "silver"])) {
      categories.metal.push(entry);
    }
  });

  const summary = {
    totalMeshes: modelState.meshes.length,
    disabled: categories.disabled.length,
    invisible: categories.invisible.length,
    peopleProps: categories.peopleProps.length,
    propMeshes: categories.propMeshes.length,
    splitPeopleComponents: categories.splitPeopleComponents.length,
    angjiWalls: categories.angjiWalls.length,
    angjiFurniture: categories.angjiFurniture.length,
    angjiFloors: categories.angjiFloors.length,
    angjiRamps: categories.angjiRamps.length,
    angjiStairs: categories.angjiStairs.length,
    angjiColOther: categories.angjiColOther.length,
    angjiLayerConflicts: categories.angjiLayerConflicts.length,
    glass: categories.glass.length,
    trees: categories.trees.length,
    metal: categories.metal.length
  };

  return { summary, categories };
}

function isAngjiProjectConfig(config) {
  return config?.overviewId === "angji";
}

function isJinjuProjectConfig(config) {
  return config?.overviewId === "jinju";
}

function isGeochangProjectConfig(config) {
  return config?.overviewId === "geochang";
}

/** Orbit Night Mode button + night lighting/BGM (Angji-style). */
function supportsNightModeConfig(config) {
  return isAngjiProjectConfig(config) || isGeochangProjectConfig(config);
}

function getRampGroundNormalMinY(config) {
  const configured = config?.collision?.rampGroundNormalMinY;

  if (typeof configured === "number" && configured > 0) {
    return configured;
  }

  return RAMP_GROUND_NORMAL_MIN_Y;
}

function getRampFloorBridgeHorizontal(config) {
  const configured = config?.collision?.rampFloorBridgeHorizontal;

  if (typeof configured === "number" && configured > 0) {
    return configured;
  }

  return RAMP_FLOOR_BRIDGE_HORIZONTAL;
}

function hasColRampFloorBridgeConfig(config) {
  return hasColLayerConfig(config) && config?.collision?.bridgeRampFloorGaps === true;
}

function getProjectMaxRampStepUp(config) {
  const configured = config?.collision?.maxRampStepUp;

  if (typeof configured === "number" && configured > 0) {
    return configured;
  }

  return MAX_RAMP_STEP_UP;
}

function isColLayerDiscreteStairConfig(config) {
  return config?.collision?.stairMode === "discrete";
}

function isColDiscreteStairMesh(mesh) {
  return Boolean(mesh?.metadata?.angjiStairSurface);
}

function isColRampGroundMesh(mesh) {
  return Boolean(
    mesh?.metadata?.angjiRampSurface
    && mesh.metadata?.angjiCollisionLayer
    && !mesh.metadata?.angjiStairSurface
  );
}

function isColSlopeGroundMesh(mesh) {
  return isColDiscreteStairMesh(mesh) || isColRampGroundMesh(mesh);
}

function isSteppableSlopeSurface(mesh) {
  return isColDiscreteStairMesh(mesh)
    || isColRampGroundMesh(mesh)
    || (isStairSurface(mesh) && !isRampSurface(mesh))
    || (isRampSurface(mesh) && !mesh.metadata?.angjiVisualStairSurface);
}

function hasColLayerConfig(config) {
  // Explicit Angji-style 0_COL_* collision contract.
  if (config?.collision && Object.prototype.hasOwnProperty.call(config.collision, "colLayer")) {
    return config.collision.colLayer === true;
  }

  // Legacy fallback for older configs without the flag.
  return isAngjiProjectConfig(config)
    || isJinjuProjectConfig(config)
    || isGeochangProjectConfig(config);
}

function getTourBgmUrl(config) {
  if (!canUseTourBgm()) {
    return null;
  }

  return resolveTourBgmUrl(config?.tourBgm);
}

function createTourBgmController(options = {}) {
  let audio = null;
  let fadeFrameId = null;
  let loadedUrl = null;
  let cryAudio = null;
  let cryTimerId = null;
  let nightAmbienceActive = false;

  function clampVolume(value) {
    return Math.max(0, Math.min(1, value));
  }

  function cancelFade() {
    if (fadeFrameId !== null) {
      cancelAnimationFrame(fadeFrameId);
      fadeFrameId = null;
    }
  }

  function fadeVolumeTo(targetVolume, durationMs, onComplete) {
    cancelFade();

    if (!audio) {
      onComplete?.();
      return;
    }

    const startVolume = clampVolume(audio.volume);
    const clampedTarget = clampVolume(targetVolume);
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      audio.volume = clampVolume(startVolume + (clampedTarget - startVolume) * progress);

      if (progress < 1) {
        fadeFrameId = requestAnimationFrame(step);
        return;
      }

      audio.volume = clampedTarget;
      fadeFrameId = null;
      onComplete?.();
    };

    fadeFrameId = requestAnimationFrame(step);
  }

  function getTrack(url) {
    if (!audio || loadedUrl !== url) {
      cancelFade();
      audio?.pause();
      audio = document.createElement("audio");
      audio.loop = true;
      audio.preload = "auto";
      audio.src = url;
      loadedUrl = url;
      audio.load();
    }

    audio.loop = true;
    return audio;
  }

  function beginFadeIn() {
    fadeVolumeTo(TOUR_BGM_VOLUME, TOUR_BGM_FADE_MS);
  }

  function playTourBgm(config, { keepBgm = false } = {}) {
    const url = getTourBgmUrl(config);

    if (!url) {
      return false;
    }

    const track = getTrack(url);

    if (keepBgm && !track.paused && loadedUrl === url) {
      cancelFade();

      if (track.volume < TOUR_BGM_VOLUME - 0.01) {
        beginFadeIn();
      }

      return true;
    }

    cancelFade();

    if (!keepBgm) {
      track.currentTime = 0;
    }

    track.volume = 0;

    try {
      const playAttempt = track.play();

      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt
          .then(() => beginFadeIn())
          .catch((error) => {
            console.warn("Tour BGM play failed:", error);
          });
      } else {
        beginFadeIn();
      }

      return true;
    } catch (error) {
      console.warn("Tour BGM play failed:", error);
      return false;
    }
  }

  function getNightTourBgmUrl() {
    if (!canUseTourBgm()) {
      return null;
    }

    return resolveTourBgmUrl(NIGHT_TOUR_BGM_FILE);
  }

  function stopCryScheduler() {
    if (cryTimerId !== null) {
      window.clearTimeout(cryTimerId);
      cryTimerId = null;
    }
  }

  function ensureCryAudio() {
    if (!cryAudio) {
      cryAudio = document.createElement("audio");
      cryAudio.preload = "auto";
      cryAudio.src = resolveTourBgmUrl(NIGHT_CRY_SFX_FILE);
      cryAudio.load();
    }

    return cryAudio;
  }

  function playCryOnce() {
    if (!canUseTourBgm() || !nightAmbienceActive) {
      return;
    }

    const track = ensureCryAudio();
    track.volume = NIGHT_CRY_VOLUME;

    try {
      track.currentTime = 0;
      const playAttempt = track.play();

      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt.catch((error) => {
          console.warn("Night cry SFX play failed:", error);
        });
      }
    } catch (error) {
      console.warn("Night cry SFX play failed:", error);
    }
  }

  function scheduleNextCry() {
    stopCryScheduler();

    if (!nightAmbienceActive || !canUseTourBgm()) {
      return;
    }

    const delay = NIGHT_CRY_MIN_INTERVAL_MS
      + Math.random() * (NIGHT_CRY_MAX_INTERVAL_MS - NIGHT_CRY_MIN_INTERVAL_MS);

    cryTimerId = window.setTimeout(() => {
      playCryOnce();
      scheduleNextCry();
    }, delay);
  }

  function startNightCryAmbience() {
    ensureCryAudio();
    nightAmbienceActive = true;
    scheduleNextCry();
  }

  function stopNightCryAmbience() {
    nightAmbienceActive = false;
    stopCryScheduler();

    if (cryAudio) {
      cryAudio.pause();
      cryAudio.currentTime = 0;
    }
  }

  function playNightTourBgm({ keepBgm = false } = {}) {
    const url = getNightTourBgmUrl();

    if (!url) {
      return false;
    }

    const track = getTrack(url);

    if (keepBgm && !track.paused && loadedUrl === url) {
      cancelFade();

      if (track.volume < TOUR_BGM_VOLUME - 0.01) {
        beginFadeIn();
      }

      startNightCryAmbience();
      return true;
    }

    cancelFade();

    if (!keepBgm) {
      track.currentTime = 0;
    }

    track.volume = 0;

    try {
      const playAttempt = track.play();

      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt
          .then(() => {
            beginFadeIn();
            startNightCryAmbience();
          })
          .catch((error) => {
            console.warn("Night tour BGM play failed:", error);
          });
      } else {
        beginFadeIn();
        startNightCryAmbience();
      }

      return true;
    } catch (error) {
      console.warn("Night tour BGM play failed:", error);
      return false;
    }
  }

  function shouldUseNightTourAudio(config) {
    return supportsNightModeConfig(config) && Boolean(options.getIsAngjiNightMode?.());
  }

  function preloadUrl(url) {
    if (!url) {
      return Promise.resolve();
    }

    const track = document.createElement("audio");
    track.preload = "auto";
    track.src = url;
    track.load();

    if (track.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve();
      };

      track.addEventListener("canplaythrough", finish, { once: true });
      track.addEventListener("loadeddata", finish, { once: true });
      track.addEventListener("error", () => {
        console.warn(`Tour BGM preload failed: ${url}`);
        finish();
      }, { once: true });
      window.setTimeout(finish, 4000);
    });
  }

  function preload(config) {
    const urls = [
      getTourBgmUrl(config),
      supportsNightModeConfig(config) ? getNightTourBgmUrl() : null
    ].filter(Boolean);

    if (!urls.length) {
      return Promise.resolve();
    }

    return Promise.all(urls.map((url) => preloadUrl(url))).then(() => {
      if (supportsNightModeConfig(config) && canUseTourBgm()) {
        ensureCryAudio();
      }
    });
  }

  function stopTourBgm({ fadeOut = true } = {}) {
    stopNightCryAmbience();

    if (!audio) {
      return;
    }

    cancelFade();

    if (!fadeOut) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
      return;
    }

    fadeVolumeTo(0, TOUR_BGM_FADE_MS, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  return {
    preload,
    onEnterWalkMode(config, walkEntryOptions = {}) {
      if (shouldUseNightTourAudio(config)) {
        playNightTourBgm(walkEntryOptions);
        return;
      }

      stopNightCryAmbience();
      playTourBgm(config, walkEntryOptions);
    },
    onEnterOrbitMode(config) {
      stopNightCryAmbience();

      if (!getTourBgmUrl(config) && !getNightTourBgmUrl()) {
        return;
      }

      stopTourBgm({ fadeOut: true });
    },
    syncNightTourAudio(config, { keepBgm = false } = {}) {
      if (!config) {
        return;
      }

      if (shouldUseNightTourAudio(config)) {
        playNightTourBgm({ keepBgm });
        return;
      }

      stopNightCryAmbience();
      playTourBgm(config, { keepBgm });
    }
  };
}

function isChungjuProjectConfig(config) {
  return config?.overviewId === "chungju";
}

function isFurnitureMaterialName(name) {
  const normalizedName = normalizeName(name);

  return FURNITURE_MATERIAL_PREFIXES.some((prefix) => normalizedName.startsWith(prefix));
}

function isFurnitureMesh(mesh) {
  return getMaterialNames(mesh).some((name) => isFurnitureMaterialName(name));
}

function getPerformanceSettings(config) {
  return {
    ...DEFAULT_PERFORMANCE_SETTINGS,
    ...(config?.performance || {})
  };
}

function freezeSceneMaterials(materials) {
  materials.forEach((material) => {
    if (!material || typeof material.freeze !== "function" || shouldSkipMaterialFreeze(material)) {
      return;
    }

    material.freeze();
  });
}

function isAngjiDownlightMaterialName(name) {
  const normalized = normalizeMaterialName(name).replace(/[\s_-]+/g, "");
  return /^lightdown0*1$/.test(normalized);
}

function isAngjiDownlight0MaterialName(name) {
  const normalized = normalizeMaterialName(name).replace(/[\s_-]+/g, "");
  // Light_Down0 / Light_Down00 only — must not match Down01/02/03.
  return /^lightdown0+$/.test(normalized);
}

function isAngjiDownlight02MaterialName(name) {
  const normalized = normalizeMaterialName(name).replace(/[\s_-]+/g, "");
  // Angji GLB uses "Light_Down02" (also tolerate Light_Down2 / suffixes).
  return /^lightdown0*2(?:\.\d+)?$/.test(normalized) || normalized.includes("lightdown02");
}

function isAngjiDownlight03MaterialName(name) {
  const normalized = normalizeMaterialName(name).replace(/[\s_-]+/g, "");
  return /^lightdown0*3(?:\.\d+)?$/.test(normalized) || normalized.includes("lightdown03");
}

/** RabbitLightBaker / SketchUp RLB_* preset types used in Angji.glb (skip LightCover). */
const RLB_NIGHT_PRESET_TYPE_MAP = {
  downlight: "DownLight",
  spotlight: "SpotLight",
  linelight: "LineLight",
  panellight: "PanelLight",
  outdoorlight: "OutdoorLight",
  walllight: "WallLight",
  covelight: "CoveLight",
  windowlight: "WindowLight",
  emergencylight: "EmergencyLight",
  glassglow: "GlassGlow",
  signlight: "SignLight",
  stairlight: "StairLight",
  groundlight: "GroundLight"
};

const RLB_NIGHT_LIGHT_PROFILES = {
  DownLight: { intensity: 26, range: 10, angle: 100 },
  SpotLight: { intensity: 30, range: 12, angle: 70 },
  Down02: { intensity: 28, range: 12, angle: 90 },
  LineLight: { intensity: 18, range: 8, angle: 140 },
  PanelLight: { intensity: 20, range: 9, angle: 120 },
  OutdoorLight: { intensity: 34, range: 16, angle: 100 },
  WallLight: { intensity: 22, range: 9, angle: 110 },
  CoveLight: { intensity: 16, range: 7, angle: 150 },
  WindowLight: { intensity: 18, range: 10, angle: 120 },
  EmergencyLight: { intensity: 14, range: 6, angle: 100 },
  GlassGlow: { intensity: 12, range: 5, angle: 160 },
  SignLight: { intensity: 16, range: 7, angle: 100 },
  StairLight: { intensity: 14, range: 6, angle: 100 },
  GroundLight: { intensity: 20, range: 8, angle: 120 }
};

function resolveRlbNightFixtureType(name) {
  const normalized = normalizeMaterialName(name).replace(/[\s_-]+/g, "").toLowerCase();

  if (!normalized || normalized.includes("lightcover")) {
    return null;
  }

  // Legacy Angji SoftSpot markers that remain in the re-authored GLB
  if (/^lightdown0*2(?:\.\d+)?$/.test(normalized) || normalized.includes("lightdown02")) {
    return "Down02";
  }

  if (!normalized.startsWith("rlb")) {
    return null;
  }

  const rest = normalized.slice(3);
  return RLB_NIGHT_PRESET_TYPE_MAP[rest] || null;
}

function collectAngjiLightsByPresetType(modelState) {
  const meshes = modelState?.meshes || [];
  const byType = new Map();

  meshes.forEach((mesh) => {
    if (mesh?.isEnabled?.() === false) {
      return;
    }

    if (typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() <= 0) {
      return;
    }

    const names = getMaterialNames(mesh);
    let type = null;

    for (const name of names) {
      type = resolveRlbNightFixtureType(name);
      if (type) {
        break;
      }
    }

    if (!type) {
      const meshName = normalizeName(mesh.name || mesh.id || "");
      type = resolveRlbNightFixtureType(meshName);
    }

    if (!type) {
      return;
    }

    if (!byType.has(type)) {
      byType.set(type, []);
    }

    byType.get(type).push(mesh);
  });

  return byType;
}

function collectAngjiDownlightMeshes(modelState) {
  const meshes = modelState?.meshes || [];

  return meshes.filter((mesh) => (
    mesh?.isEnabled?.() !== false
    && getMaterialNames(mesh).some((name) => isAngjiDownlightMaterialName(name))
  ));
}

function collectAngjiDownlight0Meshes(modelState) {
  const meshes = modelState?.meshes || [];

  return meshes.filter((mesh) => {
    if (mesh?.isEnabled?.() === false) {
      return false;
    }

    if (typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() <= 0) {
      return false;
    }

    if (getMaterialNames(mesh).some((name) => isAngjiDownlight0MaterialName(name))) {
      return true;
    }

    const meshName = normalizeName(mesh.name || mesh.id || "").replace(/[\s_-]+/g, "");
    return /^lightdown0+$/.test(meshName);
  });
}

function collectAngjiDownlight02Meshes(modelState) {
  const meshes = modelState?.meshes || [];

  return meshes.filter((mesh) => {
    if (mesh?.isEnabled?.() === false) {
      return false;
    }

    if (typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() <= 0) {
      return false;
    }

    if (getMaterialNames(mesh).some((name) => isAngjiDownlight02MaterialName(name))) {
      return true;
    }

    const meshName = normalizeName(mesh.name || mesh.id || "");
    return meshName.includes("lightdown02") || meshName.includes("lightdown2");
  });
}

function collectAngjiDownlight03Meshes(modelState) {
  const meshes = modelState?.meshes || [];

  return meshes.filter((mesh) => {
    if (mesh?.isEnabled?.() === false) {
      return false;
    }

    if (typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() <= 0) {
      return false;
    }

    if (getMaterialNames(mesh).some((name) => isAngjiDownlight03MaterialName(name))) {
      return true;
    }

    const meshName = normalizeName(mesh.name || mesh.id || "");
    return meshName.includes("lightdown03") || meshName.includes("lightdown3");
  });
}

function getNightDown02SelectCount(config, totalCount) {
  if (config?.nightLighting?.down02SelectAll === true) {
    return totalCount;
  }

  const ratio = config?.nightLighting?.down02SelectRatio;

  if (typeof ratio === "number" && ratio >= 0) {
    return Math.max(0, Math.min(totalCount, Math.round(totalCount * ratio)));
  }

  if (typeof config?.nightLighting?.down02SelectCount === "number") {
    return Math.max(0, Math.min(totalCount, Math.floor(config.nightLighting.down02SelectCount)));
  }

  return Math.min(totalCount, DOWN02_TWINKLE_COUNT);
}

function getNightDown03SelectCount(config, totalCount) {
  if (config?.nightLighting?.down03SelectAll === true) {
    return totalCount;
  }

  const ratio = config?.nightLighting?.down03SelectRatio;

  if (typeof ratio === "number" && ratio >= 0) {
    return Math.max(0, Math.min(totalCount, Math.round(totalCount * ratio)));
  }

  if (typeof config?.nightLighting?.down03SelectCount === "number") {
    return Math.max(0, Math.min(totalCount, Math.floor(config.nightLighting.down03SelectCount)));
  }

  // Default: keep previous behavior (treat all Down03 as Down02).
  return totalCount;
}

function getNightMaxSimultaneousLights(config) {
  const configured = config?.nightLighting?.maxSimultaneousLights;

  if (typeof configured === "number" && configured > 0) {
    return Math.max(4, Math.floor(configured));
  }

  return 8;
}

function collectUniqueMaterialsFromMeshes(meshes) {
  const materials = new Set();

  meshes.forEach((mesh) => {
    if (!mesh?.material) {
      return;
    }

    if (Array.isArray(mesh.material.subMaterials)) {
      mesh.material.subMaterials.filter(Boolean).forEach((material) => materials.add(material));
      return;
    }

    materials.add(mesh.material);
  });

  return [...materials];
}

function captureMaterialEmissiveState(material) {
  return {
    material,
    emissiveColor: material.emissiveColor?.clone?.() || null,
    emissiveIntensity: typeof material.emissiveIntensity === "number" ? material.emissiveIntensity : null,
    disableLighting: typeof material.disableLighting === "boolean" ? material.disableLighting : null,
    maxSimultaneousLights: typeof material.maxSimultaneousLights === "number" ? material.maxSimultaneousLights : null
  };
}

function applyDownlightEmissive(BABYLON, material, options = {}) {
  if (typeof material.unfreeze === "function") {
    material.unfreeze();
  }

  const emissiveColor = options.emissiveColor || new BABYLON.Color3(0.85, 0.72, 0.35);
  const emissiveIntensity = typeof options.emissiveIntensity === "number" ? options.emissiveIntensity : 3.4;

  if ("emissiveColor" in material) {
    material.emissiveColor = emissiveColor;
  }

  if ("emissiveIntensity" in material) {
    material.emissiveIntensity = emissiveIntensity;
  }

  if ("disableLighting" in material) {
    material.disableLighting = false;
  }
}

function restoreMaterialEmissiveState(snapshot) {
  const { material } = snapshot;

  if (!material) {
    return;
  }

  if (typeof material.unfreeze === "function") {
    material.unfreeze();
  }

  if (snapshot.emissiveColor && material.emissiveColor?.copyFrom) {
    material.emissiveColor.copyFrom(snapshot.emissiveColor);
  } else if ("emissiveColor" in material && snapshot.emissiveColor === null) {
    material.emissiveColor?.set?.(0, 0, 0);
  }

  if (snapshot.emissiveIntensity !== null && "emissiveIntensity" in material) {
    material.emissiveIntensity = snapshot.emissiveIntensity;
  }

  if (snapshot.disableLighting !== null && "disableLighting" in material) {
    material.disableLighting = snapshot.disableLighting;
  }

  if (snapshot.maxSimultaneousLights !== null && "maxSimultaneousLights" in material) {
    material.maxSimultaneousLights = snapshot.maxSimultaneousLights;
  }

  if (typeof material.freeze === "function") {
    material.freeze();
  }
}

function isDtvTreeMesh(mesh) {
  return getMaterialNames(mesh).some((name) => normalizeName(name).startsWith("dtv"));
}

function isPeopleYawFacingMesh(mesh, performanceSettings = DEFAULT_PERFORMANCE_SETTINGS) {
  // Same camera-yaw treatment as DTV trees. Skip Geochang's renamed
  // DefaultMaterial8 sheet (also named "people") — that is a prop, not cards.
  const treatPeopleAsProp = performanceSettings?.treatPeopleMaterialAsCutoutProp === true;

  return getMaterialNames(mesh).some((name) => {
    const normalized = normalizeName(name);

    if (treatPeopleAsProp && isGeochangPeopleCutoutPropMaterialName(normalized)) {
      return false;
    }

    return normalized === "people";
  });
}

function findConnectedVertexIslands(indices, vertexCount) {
  const parent = new Int32Array(vertexCount);

  for (let index = 0; index < vertexCount; index += 1) {
    parent[index] = index;
  }

  function find(index) {
    let root = index;

    while (parent[root] !== root) {
      root = parent[root];
    }

    let cursor = index;

    while (cursor !== root) {
      const next = parent[cursor];
      parent[cursor] = root;
      cursor = next;
    }

    return root;
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);

    if (leftRoot !== rightRoot) {
      parent[rightRoot] = leftRoot;
    }
  }

  for (let index = 0; index + 2 < indices.length; index += 3) {
    const a = indices[index];
    const b = indices[index + 1];
    const c = indices[index + 2];
    union(a, b);
    union(b, c);
  }

  const islands = new Map();

  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const root = find(vertex);
    let list = islands.get(root);

    if (!list) {
      list = [];
      islands.set(root, list);
    }

    list.push(vertex);
  }

  return Array.from(islands.values());
}

function createDtvTreeIslandMesh(BABYLON, scene, sourceMesh, islandVertices, islandIndex) {
  const positions = sourceMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const indices = sourceMesh.getIndices();

  if (!positions || !indices || islandVertices.length < 3) {
    return null;
  }

  const islandSet = new Set(islandVertices);
  const oldToNew = new Map();
  const newPositions = [];

  islandVertices.forEach((oldIndex) => {
    oldToNew.set(oldIndex, newPositions.length / 3);
    const offset = oldIndex * 3;
    newPositions.push(positions[offset], positions[offset + 1], positions[offset + 2]);
  });

  const newIndices = [];

  for (let index = 0; index + 2 < indices.length; index += 3) {
    const a = indices[index];
    const b = indices[index + 1];
    const c = indices[index + 2];

    if (!islandSet.has(a) || !islandSet.has(b) || !islandSet.has(c)) {
      continue;
    }

    newIndices.push(oldToNew.get(a), oldToNew.get(b), oldToNew.get(c));
  }

  if (newIndices.length < 3) {
    return null;
  }

  // Rebase so local origin = canopy foot -> same pivot model as Angji/Jinju cards.
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < newPositions.length; index += 3) {
    minX = Math.min(minX, newPositions[index]);
    minY = Math.min(minY, newPositions[index + 1]);
    minZ = Math.min(minZ, newPositions[index + 2]);
    maxX = Math.max(maxX, newPositions[index]);
    maxZ = Math.max(maxZ, newPositions[index + 2]);
  }

  const footX = (minX + maxX) * 0.5;
  const footY = minY;
  const footZ = (minZ + maxZ) * 0.5;

  for (let index = 0; index < newPositions.length; index += 3) {
    newPositions[index] -= footX;
    newPositions[index + 1] -= footY;
    newPositions[index + 2] -= footZ;
  }

  const vertexKinds = [
    BABYLON.VertexBuffer.NormalKind,
    BABYLON.VertexBuffer.UVKind,
    BABYLON.VertexBuffer.UV2Kind,
    BABYLON.VertexBuffer.ColorKind,
    BABYLON.VertexBuffer.TangentKind
  ];
  const vertexData = new BABYLON.VertexData();
  vertexData.positions = newPositions;
  vertexData.indices = newIndices;

  vertexKinds.forEach((kind) => {
    const source = sourceMesh.getVerticesData(kind);

    if (!source) {
      return;
    }

    const stride = kind === BABYLON.VertexBuffer.UVKind || kind === BABYLON.VertexBuffer.UV2Kind
      ? 2
      : kind === BABYLON.VertexBuffer.ColorKind || kind === BABYLON.VertexBuffer.TangentKind
        ? 4
        : 3;
    const extracted = [];

    islandVertices.forEach((oldIndex) => {
      const offset = oldIndex * stride;

      for (let component = 0; component < stride; component += 1) {
        extracted.push(source[offset + component]);
      }
    });

    if (kind === BABYLON.VertexBuffer.NormalKind) {
      vertexData.normals = extracted;
    } else if (kind === BABYLON.VertexBuffer.UVKind) {
      vertexData.uvs = extracted;
    } else if (kind === BABYLON.VertexBuffer.UV2Kind) {
      vertexData.uvs2 = extracted;
    } else if (kind === BABYLON.VertexBuffer.ColorKind) {
      vertexData.colors = extracted;
    } else if (kind === BABYLON.VertexBuffer.TangentKind) {
      vertexData.tangents = extracted;
    }
  });

  const islandMesh = new BABYLON.Mesh(
    `${sourceMesh.name || "dtv"}-island-${islandIndex}-${sourceMesh.uniqueId}`,
    scene
  );
  vertexData.applyToMesh(islandMesh, true);
  islandMesh.material = sourceMesh.material;

  // Place foot at the baked island location, then lift into the source parent space.
  sourceMesh.computeWorldMatrix(true);
  const footWorld = BABYLON.Vector3.TransformCoordinates(
    new BABYLON.Vector3(footX, footY, footZ),
    sourceMesh.getWorldMatrix()
  );
  const worldScale = new BABYLON.Vector3();
  const worldRot = new BABYLON.Quaternion();
  const worldPos = new BABYLON.Vector3();
  sourceMesh.getWorldMatrix().decompose(worldScale, worldRot, worldPos);

  islandMesh.parent = null;
  islandMesh.rotationQuaternion = worldRot;
  islandMesh.scaling.copyFrom(worldScale);
  islandMesh.position.copyFrom(footWorld);

  if (sourceMesh.parent) {
    islandMesh.setParent(sourceMesh.parent, true);
  }

  islandMesh.isPickable = false;
  islandMesh.checkCollisions = false;
  islandMesh.receiveShadows = sourceMesh.receiveShadows;
  islandMesh.metadata = {
    ...(sourceMesh.metadata || {}),
    treeMesh: true,
    passThrough: true,
    splitFromMergedDtv: true,
    sourceTreeMeshId: sourceMesh.uniqueId
  };

  return islandMesh;
}

/**
 * Geochang (and similar) exports many individual DTV cards welded into one mesh.
 * One mesh -> one yaw. Split connected islands so each tree can face the camera
 * from its own pivot -> same behavior as Angji/Jinju/Chungju per-tree meshes.
 */
function expandMergedDtvTreeMeshes(BABYLON, scene, treeMeshes, allMeshes) {
  const expanded = [];
  let splitMeshCount = 0;
  let islandCount = 0;

  treeMeshes.forEach((mesh) => {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const indices = mesh.getIndices();

    if (!positions || !indices || positions.length < 9) {
      expanded.push(mesh);
      return;
    }

    const vertexCount = positions.length / 3;
    const islands = findConnectedVertexIslands(indices, vertexCount);

    // Single island: already one tree (or inseparable volume). Keep as-is.
    if (islands.length <= 1) {
      expanded.push(mesh);
      return;
    }

    const created = [];

    islands.forEach((islandVertices, islandIndex) => {
      // Ignore degenerate scraps; DTV cards are typically ~167 verts.
      if (islandVertices.length < 12) {
        return;
      }

      const islandMesh = createDtvTreeIslandMesh(
        BABYLON,
        scene,
        mesh,
        islandVertices,
        islandIndex
      );

      if (islandMesh) {
        created.push(islandMesh);
      }
    });

    if (created.length <= 1) {
      created.forEach((entry) => entry.dispose?.());
      expanded.push(mesh);
      return;
    }

    created.forEach((islandMesh) => {
      expanded.push(islandMesh);
      allMeshes.push(islandMesh);
    });

    mesh.setEnabled(false);
    mesh.isVisible = false;
    mesh.isPickable = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      treeMesh: true,
      passThrough: true,
      mergedDtvSplitAway: true
    };

    splitMeshCount += 1;
    islandCount += created.length;
  });

  if (splitMeshCount > 0) {
    console.info(
      `[trees] Split ${splitMeshCount} merged DTV mesh(es) into ${islandCount} individual trees`
    );
  }

  return expanded;
}

/**
 * People cards: pivot at geometry foot (bbox), not node origin — avoids
 * multi-card blocks looking like they split when yawing toward the camera.
 */
function getPeopleYawPivotWorldPosition(BABYLON, mesh) {
  mesh.computeWorldMatrix(true);
  mesh.refreshBoundingInfo?.(true, true);
  const bounds = mesh.getBoundingInfo?.()?.boundingBox;

  if (!bounds) {
    return mesh.getAbsolutePosition().clone();
  }

  const centerWorld = bounds.centerWorld;
  const minWorld = bounds.minimumWorld;
  return new BABYLON.Vector3(centerWorld.x, minWorld.y, centerWorld.z);
}

function getPeopleBlockYawPivotWorldPosition(BABYLON, meshes) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let found = false;

  meshes.forEach((mesh) => {
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo?.(true, true);
    const bounds = mesh.getBoundingInfo?.()?.boundingBox;

    if (!bounds) {
      return;
    }

    found = true;
    minX = Math.min(minX, bounds.minimumWorld.x);
    minY = Math.min(minY, bounds.minimumWorld.y);
    minZ = Math.min(minZ, bounds.minimumWorld.z);
    maxX = Math.max(maxX, bounds.maximumWorld.x);
    maxZ = Math.max(maxZ, bounds.maximumWorld.z);
  });

  if (!found) {
    return meshes[0]?.getAbsolutePosition?.()?.clone?.() || BABYLON.Vector3.Zero();
  }

  return new BABYLON.Vector3((minX + maxX) * 0.5, minY, (minZ + maxZ) * 0.5);
}

/**
 * Group People cards that should yaw as one block (GLB sibling nodes, or
 * fireball-split components from the same source mesh).
 */
function collectPeopleYawBlockGroups(peopleYawMeshes) {
  const assigned = new Set();
  const groups = [];

  // Fireball split components from one welded mesh -> one block.
  const splitBySource = new Map();
  peopleYawMeshes.forEach((mesh) => {
    const sourceId = mesh.metadata?.fireballSourceMeshId;

    if (!mesh.metadata?.fireballSplitComponent || sourceId == null) {
      return;
    }

    if (!splitBySource.has(sourceId)) {
      splitBySource.set(sourceId, []);
    }

    splitBySource.get(sourceId).push(mesh);
  });

  splitBySource.forEach((groupMeshes) => {
    groups.push(groupMeshes);
    groupMeshes.forEach((mesh) => assigned.add(mesh.uniqueId));
  });

  // GLB parent with 2+ People siblings (Angji exports blocks this way).
  const byParent = new Map();
  peopleYawMeshes.forEach((mesh) => {
    if (assigned.has(mesh.uniqueId)) {
      return;
    }

    const parentKey = mesh.parent?.uniqueId ?? `root:${mesh.uniqueId}`;
    if (!byParent.has(parentKey)) {
      byParent.set(parentKey, []);
    }

    byParent.get(parentKey).push(mesh);
  });

  byParent.forEach((groupMeshes) => {
    if (groupMeshes.length > 1) {
      groups.push(groupMeshes);
      groupMeshes.forEach((mesh) => assigned.add(mesh.uniqueId));
      return;
    }

    groups.push(groupMeshes);
    assigned.add(groupMeshes[0].uniqueId);
  });

  return groups;
}

function attachPeopleBlockYawPivot(BABYLON, scene, groupMeshes, modelRoot) {
  if (!groupMeshes.length) {
    return null;
  }

  const isBlock = groupMeshes.length > 1;
  const leader = groupMeshes.reduce((best, mesh) => {
    if (!best) {
      return mesh;
    }

    const bestBounds = getLocalVertexBounds(BABYLON, best);
    const meshBounds = getLocalVertexBounds(BABYLON, mesh);
    const bestSize = bestBounds
      ? (bestBounds.max.x - bestBounds.min.x) * (bestBounds.max.z - bestBounds.min.z)
      : 0;
    const meshSize = meshBounds
      ? (meshBounds.max.x - meshBounds.min.x) * (meshBounds.max.z - meshBounds.min.z)
      : 0;

    return meshSize > bestSize ? mesh : best;
  }, null);

  modelRoot.computeWorldMatrix(true);
  const worldPos = isBlock
    ? getPeopleBlockYawPivotWorldPosition(BABYLON, groupMeshes)
    : getPeopleYawPivotWorldPosition(BABYLON, leader);
  const rootWorldInverse = modelRoot.getWorldMatrix().clone();
  rootWorldInverse.invert();
  const localPos = BABYLON.Vector3.TransformCoordinates(worldPos, rootWorldInverse);
  const pivotId = isBlock
    ? `people-block-yaw-${groupMeshes.map((mesh) => mesh.uniqueId).join("-")}`
    : `people-yaw-pivot-${leader.uniqueId}`;
  const pivot = new BABYLON.TransformNode(pivotId, scene);
  pivot.parent = modelRoot;
  pivot.position.copyFrom(localPos);
  pivot.rotation.set(0, 0, 0);
  pivot.rotationQuaternion = null;

  groupMeshes.forEach((mesh) => {
    mesh.billboardMode = 0;
    mesh.computeWorldMatrix(true);
    mesh.setParent(pivot, true);
    mesh.computeWorldMatrix(true);
    mesh.metadata = {
      ...(mesh.metadata || {}),
      treeYawPivot: pivot,
      peopleYawBlock: isBlock,
      treeFaceYawOffset: getTreeMeshFaceYawOffset(BABYLON, leader)
    };
  });

  return pivot;
}

/**
 * Same pivot rule as Angji/Jinju/Chungju: yaw around mesh origin.
 * Merged Geochang cards are split + rebased first so their origin is already the tree foot.
 */
function getTreeYawPivotWorldPosition(BABYLON, mesh) {
  mesh.computeWorldMatrix(true);
  return mesh.getAbsolutePosition().clone();
}

function attachTreeYawPivot(BABYLON, scene, mesh, modelRoot) {
  mesh.billboardMode = 0;
  modelRoot.computeWorldMatrix(true);
  mesh.computeWorldMatrix(true);
  mesh.refreshBoundingInfo?.(true, true);

  const worldPos = getTreeYawPivotWorldPosition(BABYLON, mesh);
  const rootWorldInverse = modelRoot.getWorldMatrix().clone();
  rootWorldInverse.invert();
  const localPos = BABYLON.Vector3.TransformCoordinates(worldPos, rootWorldInverse);

  const pivot = new BABYLON.TransformNode(`tree-yaw-pivot-${mesh.uniqueId}`, scene);
  pivot.parent = modelRoot;
  pivot.position.copyFrom(localPos);
  pivot.rotation.set(0, 0, 0);
  pivot.rotationQuaternion = null;
  mesh.setParent(pivot, true);
  mesh.computeWorldMatrix(true);

  mesh.metadata = {
    ...(mesh.metadata || {}),
    treeYawPivot: pivot,
    treeFaceYawOffset: getTreeMeshFaceYawOffset(BABYLON, mesh)
  };
}

function getMaterialDebugName(material) {
  return normalizeName(material?.name || material?.id || "");
}

function shouldPreserveRealtimeBlendMaterial(material, performanceSettings = DEFAULT_PERFORMANCE_SETTINGS) {
  const name = getMaterialDebugName(material);

  if (
    name.includes("glass")
    || name.includes("water")
    || name.includes("pool")
    || name.includes("translucent")
    || name.includes("displayboard")
  ) {
    return true;
  }

  if (!name.includes("people")) {
    return false;
  }

  // Geochang: exact "People" is the old DefaultMaterial8 sheet -> allow AlphaTest.
  if (
    performanceSettings?.treatPeopleMaterialAsCutoutProp === true
    && isGeochangPeopleCutoutPropMaterialName(name)
  ) {
    return false;
  }

  return true;
}

function isGeochangPeopleCutoutPropMaterialName(name) {
  const normalized = normalizeName(name);
  return normalized === "people" || normalized.includes("defaultmaterial8");
}

/** Cutouts that encode transparency as black RGB (alpha channel unused / opaque). */
function isRgbLumaCutoutMaterial(material) {
  const name = getMaterialDebugName(material);
  return name.includes("istockphoto")
    || name.includes("istock")
    || name.includes("shutterstock")
    || name.includes("gettyimages")
    || name === "ivy"
    || name.startsWith("ivy")
    || name.includes("ivy");
}

function isKnownCutoutBlendMaterial(material, performanceSettings = DEFAULT_PERFORMANCE_SETTINGS) {
  const name = getMaterialDebugName(material);

  return name.startsWith("dtv")
    || name.includes("defaultmaterial")
    || name.startsWith("mmkgfgfd")
    || name.includes("arbre")
    || isRgbLumaCutoutMaterial(material)
    || (
      performanceSettings?.treatPeopleMaterialAsCutoutProp === true
      && isGeochangPeopleCutoutPropMaterialName(name)
    );
}

function collectMaterialColorTextures(material) {
  if (!material) {
    return [];
  }

  const listed = [
    material.diffuseTexture,
    material.albedoTexture,
    material.baseTexture,
    material.opacityTexture,
    material.emissiveTexture,
    material.ambientTexture
  ];

  if (typeof material.getActiveTextures === "function") {
    // Prefer color maps only -> skip bump/normal/metal so RGB-as-alpha does not punch holes in them.
    material.getActiveTextures().forEach((texture) => {
      if (
        texture === material.bumpTexture
        || texture === material.normalTexture
        || texture === material.metallicTexture
        || texture === material.reflectivityTexture
        || texture === material.microSurfaceTexture
      ) {
        return;
      }

      listed.push(texture);
    });
  }

  return [...new Set(listed.filter(Boolean))];
}

function applyTextureAlphaFlags(texture, useRgbAsAlpha) {
  if (!texture) {
    return;
  }

  const apply = () => {
    texture.hasAlpha = true;

    if ("getAlphaFromRGB" in texture) {
      texture.getAlphaFromRGB = useRgbAsAlpha === true;
    }

    if (typeof texture.updateSamplingMode === "function" && texture.samplingMode != null) {
      // Nudge sampler so alpha-flag changes are picked up after async decode.
      texture.updateSamplingMode(texture.samplingMode);
    }

    if (typeof texture.markAsDirty === "function") {
      texture.markAsDirty();
    }
  };

  apply();

  if (typeof texture.isReady === "function" && !texture.isReady() && texture.onLoadObservable?.addOnce) {
    texture.onLoadObservable.addOnce(apply);
  }
}

function convertMaterialToAlphaTest(BABYLON, material, performanceSettings = DEFAULT_PERFORMANCE_SETTINGS) {
  if (!material || shouldPreserveRealtimeBlendMaterial(material, performanceSettings)) {
    return false;
  }

  const alphaTestMode = BABYLON.Material.MATERIAL_ALPHATEST;
  const alphaBlendMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  const currentMode = material.transparencyMode;
  const namedCutout = isKnownCutoutBlendMaterial(material, performanceSettings);
  const useRgbAsAlpha = isRgbLumaCutoutMaterial(material);
  const isBlend = currentMode === alphaBlendMode;

  if (!isBlend && !namedCutout) {
    return false;
  }

  if (currentMode === alphaTestMode) {
    enableMaterialTextureAlpha(material, { useRgbAsAlpha });
    return false;
  }

  if (typeof material.unfreeze === "function") {
    material.unfreeze();
  }

  material.transparencyMode = alphaTestMode;

  if ("alphaCutOff" in material) {
    const currentCutOff = typeof material.alphaCutOff === "number" ? material.alphaCutOff : 0;
    material.alphaCutOff = Math.max(currentCutOff, useRgbAsAlpha ? 0.05 : 0.15);
  }

  enableMaterialTextureAlpha(material, { useRgbAsAlpha });

  if ("needDepthPrePass" in material) {
    material.needDepthPrePass = false;
  }

  if ("forceDepthWrite" in material) {
    material.forceDepthWrite = true;
  }

  if (typeof material.markAsDirty === "function" && BABYLON.Material?.MaterialDirtyFlag) {
    material.markAsDirty(BABYLON.Material.MaterialDirtyFlag);
  } else if (typeof material.markAsDirty === "function") {
    material.markAsDirty(63);
  }

  return true;
}

/** Transparent texels render black when alphaMode is cutout but textures lack hasAlpha. */
function enableMaterialTextureAlpha(material, options = {}) {
  if (!material) {
    return;
  }

  // DTV foliage: real alpha channel. IVY / istockphoto cards: black RGB, opaque A.
  const useRgbAsAlpha = options.useRgbAsAlpha === true;
  const textures = collectMaterialColorTextures(material);

  textures.forEach((texture) => {
    applyTextureAlphaFlags(texture, useRgbAsAlpha);
  });

  if (useRgbAsAlpha) {
    const baseTexture = material.diffuseTexture
      || material.albedoTexture
      || material.baseTexture
      || textures[0]
      || null;

    // Ensure the opacity path samples the same map (SpecularGlossiness / PBR).
    if (baseTexture) {
      if (!material.opacityTexture) {
        material.opacityTexture = baseTexture;
      }

      applyTextureAlphaFlags(material.opacityTexture, true);
    }
  }

  if ("useAlphaFromDiffuseTexture" in material) {
    material.useAlphaFromDiffuseTexture = true;
  }

  if ("useAlphaFromAlbedoTexture" in material) {
    material.useAlphaFromAlbedoTexture = true;
  }

  if ("useAlphaFromOpacityTexture" in material && material.opacityTexture) {
    material.useAlphaFromOpacityTexture = true;
  }

  if ("alpha" in material && typeof material.alpha === "number" && material.alpha <= 0) {
    material.alpha = 1;
  }
}

function fixCutoutTextureAlphaOnMeshes(meshes, performanceSettings = DEFAULT_PERFORMANCE_SETTINGS) {
  const materials = collectUniqueMaterialsFromMeshes(meshes);
  let fixed = 0;

  materials.forEach((material) => {
    const mode = material?.transparencyMode;
    const namedCutout = isKnownCutoutBlendMaterial(material, performanceSettings);
    const useRgbAsAlpha = isRgbLumaCutoutMaterial(material);
    const needsAlpha = mode === 1 // ALPHATEST
      || mode === 2 // ALPHABLEND
      || mode === 3 // ALPHATESTANDBLEND
      || namedCutout
      || useRgbAsAlpha;

    if (!needsAlpha) {
      return;
    }

    if (typeof material.unfreeze === "function") {
      material.unfreeze();
    }

    enableMaterialTextureAlpha(material, { useRgbAsAlpha });

    // MASK/cutout authored materials that still draw black: force alpha-test path.
    if (
      (namedCutout || useRgbAsAlpha)
      && material.transparencyMode !== 2
      && "transparencyMode" in material
    ) {
      material.transparencyMode = 1;
      if ("alphaCutOff" in material) {
        const minCut = useRgbAsAlpha ? 0.05 : 0.15;
        material.alphaCutOff = Math.min(
          0.5,
          Math.max(typeof material.alphaCutOff === "number" ? material.alphaCutOff : 0, minCut)
        );
      }
    }

    fixed += 1;

    if (typeof material.freeze === "function") {
      material.freeze();
    }
  });

  // Textures often finish decoding after the first pass -> re-apply IVY/RGB cutout flags.
  const scene = meshes.find((mesh) => mesh?.getScene?.())?.getScene?.();

  if (scene?.onReadyObservable?.addOnce) {
    scene.onReadyObservable.addOnce(() => {
      materials.forEach((material) => {
        if (!isRgbLumaCutoutMaterial(material) && !isKnownCutoutBlendMaterial(material, performanceSettings)) {
          return;
        }

        if (typeof material.unfreeze === "function") {
          material.unfreeze();
        }

        enableMaterialTextureAlpha(material, {
          useRgbAsAlpha: isRgbLumaCutoutMaterial(material)
        });

        if (typeof material.freeze === "function") {
          material.freeze();
        }
      });
    });
  }

  return fixed;
}

function isDtvFoliageMaterial(material) {
  return getMaterialDebugName(material).startsWith("dtv");
}

/**
 * DTV tree cards (especially dtv.1) ship as BLEND with a lowered material alpha.
 * Transparent texels then composite as black against the night sky. Force a
 * real-alpha cutout so empty pixels discard instead of drawing black.
 */
function prepareDtvFoliageMaterials(BABYLON, meshes) {
  const materials = collectUniqueMaterialsFromMeshes(meshes).filter(isDtvFoliageMaterial);

  if (!materials.length) {
    return 0;
  }

  const alphaTestMode = BABYLON.Material?.MATERIAL_ALPHATEST ?? 1;

  materials.forEach((material) => {
    if (typeof material.unfreeze === "function") {
      material.unfreeze();
    }

    material.backFaceCulling = false;

    if ("twoSidedLighting" in material) {
      material.twoSidedLighting = true;
    }

    if ("disableLighting" in material) {
      material.disableLighting = false;
    }

    if ("metallic" in material) {
      material.metallic = 0;
    }

    if ("roughness" in material) {
      material.roughness = 1;
    }

    if ("specularColor" in material && material.specularColor?.set) {
      material.specularColor.set(0, 0, 0);
    }

    if ("environmentIntensity" in material) {
      material.environmentIntensity = 0;
    }

    // SimLab writes dtv.1 baseColor alpha ~0.55; keep texture alpha only.
    if ("alpha" in material) {
      material.alpha = 1;
    }

    if (material.albedoColor && typeof material.albedoColor.a === "number") {
      material.albedoColor.a = 1;
    }

    if (material.diffuseColor && typeof material.diffuseColor.a === "number") {
      material.diffuseColor.a = 1;
    }

    enableMaterialTextureAlpha(material, { useRgbAsAlpha: false });

    if ("transparencyMode" in material) {
      material.transparencyMode = alphaTestMode;
    }

    if ("alphaCutOff" in material) {
      const currentCutOff = typeof material.alphaCutOff === "number" ? material.alphaCutOff : 0;
      material.alphaCutOff = Math.min(0.4, Math.max(currentCutOff, 0.12));
    }

    if ("needDepthPrePass" in material) {
      material.needDepthPrePass = false;
    }

    if ("forceDepthWrite" in material) {
      material.forceDepthWrite = true;
    }
  });

  const scene = meshes.find((mesh) => mesh?.getScene?.())?.getScene?.();

  if (scene?.onReadyObservable?.addOnce) {
    scene.onReadyObservable.addOnce(() => {
      materials.forEach((material) => {
        if (typeof material.unfreeze === "function") {
          material.unfreeze();
        }

        enableMaterialTextureAlpha(material, { useRgbAsAlpha: false });

        if ("transparencyMode" in material) {
          material.transparencyMode = alphaTestMode;
        }

        if (typeof material.freeze === "function") {
          material.freeze();
        }
      });
    });
  }

  return materials.length;
}

function optimizeModelBlendMaterials(BABYLON, meshes, options = {}) {
  const {
    optimizeDtv = false,
    optimizeNonEssential = false,
    performanceSettings = DEFAULT_PERFORMANCE_SETTINGS
  } = options;

  if (!optimizeDtv && !optimizeNonEssential) {
    return 0;
  }

  const materials = collectUniqueMaterialsFromMeshes(meshes);
  let converted = 0;

  materials.forEach((material) => {
    if (shouldPreserveRealtimeBlendMaterial(material, performanceSettings)) {
      return;
    }

    const namedCutout = isKnownCutoutBlendMaterial(material, performanceSettings);
    const allow = optimizeNonEssential || (optimizeDtv && namedCutout);

    if (!allow) {
      return;
    }

    if (convertMaterialToAlphaTest(BABYLON, material, performanceSettings)) {
      converted += 1;
    }
  });

  return converted;
}

function getLocalVertexBounds(BABYLON, mesh) {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

  if (!positions || positions.length < 3) {
    return null;
  }

  const min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (let index = 0; index < positions.length; index += 3) {
    min.x = Math.min(min.x, positions[index]);
    min.y = Math.min(min.y, positions[index + 1]);
    min.z = Math.min(min.z, positions[index + 2]);
    max.x = Math.max(max.x, positions[index]);
    max.y = Math.max(max.y, positions[index + 1]);
    max.z = Math.max(max.z, positions[index + 2]);
  }

  return { min, max };
}

function getTreeMeshFaceYawOffset(BABYLON, mesh) {
  const bounds = getLocalVertexBounds(BABYLON, mesh);

  if (!bounds) {
    return 0;
  }

  const axisSizes = [
    { axis: BABYLON.Axis.X, size: bounds.max.x - bounds.min.x },
    { axis: BABYLON.Axis.Y, size: bounds.max.y - bounds.min.y },
    { axis: BABYLON.Axis.Z, size: bounds.max.z - bounds.min.z }
  ].sort((left, right) => left.size - right.size);

  const thinAxis = axisSizes[0].axis;
  let bestLength = 0;
  let bestYaw = 0;

  [1, -1].forEach((sign) => {
    const direction = mesh.getDirection(thinAxis).clone();
    direction.scaleInPlace(sign);
    direction.y = 0;
    const lengthSquared = direction.lengthSquared();

    if (lengthSquared > bestLength) {
      bestLength = lengthSquared;
      direction.normalize();
      bestYaw = Math.atan2(direction.x, direction.z);
    }
  });

  return bestLength > 1e-6 ? bestYaw : 0;
}

function restoreTreeMeshInitialRotation(mesh) {
  const pivot = mesh.metadata?.treeYawPivot;

  if (!pivot) {
    return;
  }

  mesh.billboardMode = 0;
  pivot.rotationQuaternion = null;
  pivot.rotation.set(0, 0, 0);
}

function restoreTreeMeshesInitialRotation(meshes) {
  meshes.forEach((mesh) => {
    restoreTreeMeshInitialRotation(mesh);
  });
}

function faceTreeMeshTowardPlayer(BABYLON, mesh, playerPosition) {
  const pivot = mesh.metadata?.treeYawPivot;

  if (!pivot) {
    return;
  }

  pivot.rotationQuaternion = null;
  const position = pivot.getAbsolutePosition();
  const dx = playerPosition.x - position.x;
  const dz = playerPosition.z - position.z;

  if (dx * dx + dz * dz < 1e-6) {
    pivot.rotation.set(0, 0, 0);
    return;
  }

  const faceYawOffset = mesh.metadata?.treeFaceYawOffset || 0;

  // Keep the mesh's original upright pose and spin horizontally to face the player.
  pivot.rotation.x = 0;
  pivot.rotation.z = 0;
  pivot.rotation.y = Math.atan2(dx, dz) - faceYawOffset;
}

function isStairSurface(mesh) {
  if (mesh.metadata?.angjiStairSurface) {
    return true;
  }

  let current = mesh;

  while (current) {
    const name = normalizeName(current.name || current.id);

    if (STAIR_NODE_KEYWORDS.some((keyword) => name.includes(keyword))) {
      return true;
    }

    current = current.parent;
  }

  return hasMaterialKeyword(mesh, STAIR_MATERIAL_KEYWORDS);
}

function isRampSurface(mesh) {
  return Boolean(mesh?.metadata?.angjiRampSurface);
}

function isWalkRestrictedSurface(mesh) {
  return isRampSurface(mesh) || isStairSurface(mesh);
}

function isFloorSurface(mesh) {
  if (mesh.metadata?.angjiFloorSurface) {
    return true;
  }

  if (hasMaterialKeyword(mesh, PASS_THROUGH_MATERIAL_KEYWORDS)) {
    return false;
  }

  let current = mesh;

  while (current) {
    const name = normalizeName(current.name || current.id);

    if (FLOOR_NODE_KEYWORDS.some((keyword) => name.includes(keyword))) {
      return true;
    }

    current = current.parent;
  }

  return hasMaterialKeyword(mesh, FLOOR_MATERIAL_KEYWORDS);
}

function isPeopleFireballTarget(mesh, performanceSettings = DEFAULT_PERFORMANCE_SETTINGS) {
  // Geochang renamed DefaultMaterial8 -> People. That sheet is a large translucent
  // prop (~74 meshes); treating it as people made them pickable + fireball-split.
  const treatPeopleAsProp = performanceSettings?.treatPeopleMaterialAsCutoutProp === true;

  return getMaterialNames(mesh).some((name) => {
    const normalized = normalizeName(name);

    if (treatPeopleAsProp && isGeochangPeopleCutoutPropMaterialName(normalized)) {
      return false;
    }

    return normalized.includes("people");
  });
}

function isLikelyWalkableSurface(mesh) {
  if (mesh.metadata?.angjiWallSurface || mesh.metadata?.angjiFurnitureSurface) {
    return false;
  }

  return isStairSurface(mesh) || isRampSurface(mesh) || isFloorSurface(mesh);
}

function pickGuestFloorYFromMeshes(BABYLON, scene, x, z, floorMeshes, fallbackY, maxHitY = null) {
  const floorSet = new Set(floorMeshes || []);

  if (!floorSet.size) {
    return null;
  }

  const rayOriginY = Math.max((maxHitY ?? fallbackY) + 3, fallbackY + 3, 12);
  const rayOrigin = new BABYLON.Vector3(x, rayOriginY, z);
  const ray = new BABYLON.Ray(rayOrigin, new BABYLON.Vector3(0, -1, 0), rayOriginY + 8);
  const hitLimitY = maxHitY ?? (fallbackY + 1.5);

  const hits = getRayHits(scene, ray, (mesh) => (
    floorSet.has(mesh)
    && mesh.isEnabled()
    && mesh.isPickable !== false
  ));

  const topHit = hits
    .filter((hit) => {
      const normal = hit.getNormal?.(true);
      const hitY = hit.pickedPoint?.y;

      if (typeof hitY !== "number") {
        return false;
      }

      return (!normal || normal.y >= CLASSIFIED_GROUND_NORMAL_MIN_Y)
        && hitY <= hitLimitY;
    })
    .sort((a, b) => b.pickedPoint.y - a.pickedPoint.y)[0];

  return topHit?.pickedPoint?.y ?? null;
}

function getJinjuGuestFloorMeshesForLevel(guestModelState, floorLevel) {
  if (!guestModelState) {
    return [];
  }

  if (floorLevel === 1) {
    return [
      ...(guestModelState.angjiBuildingFloor1Meshes || []),
      ...(guestModelState.angjiExternalFloorMeshes || [])
    ];
  }

  if (floorLevel === 2) {
    return guestModelState.angjiBuildingFloor2Meshes || [];
  }

  if (floorLevel === 3) {
    return guestModelState.angjiBuildingFloor3Meshes || [];
  }

  return [];
}

function pickAngjiGuestFloorY(BABYLON, scene, x, z, floor1Meshes, externalFloorMeshes, options = {}) {
  const floor1Set = new Set(floor1Meshes || []);
  const externalSet = new Set(externalFloorMeshes || []);
  const fallbackY = options.fallbackY;
  const maxDelta = typeof options.maxDelta === "number" ? options.maxDelta : 3;
  const preferExternal = options.preferExternal === true;
  const rayOrigin = new BABYLON.Vector3(x, GROUND_RAY_UP + 120, z);
  const ray = new BABYLON.Ray(rayOrigin, new BABYLON.Vector3(0, -1, 0), GROUND_RAY_UP + GROUND_RAY_DOWN + 120);

  const collectHits = (meshSet) => {
    if (!meshSet.size) {
      return [];
    }

    const hits = getRayHits(scene, ray, (mesh) => meshSet.has(mesh) && mesh.isEnabled());

    return hits.filter((hit) => {
      const normal = hit.getNormal?.(true);
      return Number.isFinite(hit.pickedPoint?.y)
        && (!normal || normal.y >= CLASSIFIED_GROUND_NORMAL_MIN_Y);
    });
  };

  const rankHits = (hits) => {
    if (!hits.length) {
      return null;
    }

    if (!Number.isFinite(fallbackY)) {
      return [...hits].sort((left, right) => right.pickedPoint.y - left.pickedPoint.y)[0].pickedPoint.y;
    }

    const near = hits.filter((hit) => Math.abs(hit.pickedPoint.y - fallbackY) <= maxDelta);
    const pool = near.length ? near : [];

    if (!pool.length) {
      return null;
    }

    pool.sort((left, right) => (
      Math.abs(left.pickedPoint.y - fallbackY) - Math.abs(right.pickedPoint.y - fallbackY)
    ));
    return pool[0].pickedPoint.y;
  };

  const externalHits = collectHits(externalSet);
  const floor1Hits = collectHits(floor1Set);

  if (preferExternal) {
    return rankHits(externalHits) ?? rankHits(floor1Hits);
  }

  return rankHits(floor1Hits) ?? rankHits(externalHits);
}

function pickJinjuIndoorFloorY(BABYLON, scene, x, z, floor2Meshes, fallbackY) {
  return pickGuestFloorYFromMeshes(BABYLON, scene, x, z, floor2Meshes, fallbackY, fallbackY + 1.5);
}

function resolveAngjiGuestSpawn(BABYLON, scene, spawn, floor1Meshes, externalFloorMeshes) {
  const preferExternal = isAngjiOutdoorGuestId(spawn.id);
  const snapFloorY = (x, z, fallbackY) => {
    const groundY = pickAngjiGuestFloorY(
      BABYLON,
      scene,
      x,
      z,
      floor1Meshes,
      externalFloorMeshes,
      { fallbackY, preferExternal }
    );
    return groundY ?? fallbackY;
  };
  const sitYOffset = getAngjiGuestPositionYOffset(spawn);
  const snappedY = snapFloorY(spawn.position.x, spawn.position.z, spawn.position.y);
  const position = {
    x: spawn.position.x,
    y: typeof spawn.positionYOverride === "number" ? spawn.positionYOverride : snappedY + sitYOffset,
    z: spawn.position.z
  };

  if (!spawn.movement?.patrolTargets?.length) {
    return {
      ...spawn,
      position
    };
  }

  return {
    ...spawn,
    position,
    movement: {
      ...spawn.movement,
      patrolTargets: spawn.movement.patrolTargets.map((target, targetIndex) => ({
        ...target,
        y: shouldSnapPatrolFloorAtTarget(spawn.movement, targetIndex)
          ? snapFloorY(target.x, target.z, target.y)
          : target.y
      }))
    }
  };
}

function resolveJinjuGuestSpawn(BABYLON, scene, spawn, guestModelState) {
  const isIndoorGuest = spawn.id?.startsWith("Jinju-Indoor-");
  const isRooftopGuest = spawn.id?.startsWith("Jinju-Rooftop-");
  const sitYOffset = isIndoorGuest
    ? getJinjuIndoorGuestPositionYOffset(spawn)
    : getJinjuGuestPositionYOffset(spawn);

  let baseY = spawn.position.y;
  const floorLevel = isRooftopGuest ? 3 : isIndoorGuest ? 2 : 1;
  const floorMeshes = getJinjuGuestFloorMeshesForLevel(guestModelState, floorLevel);

  if (floorMeshes.length) {
    const maxHitY = isIndoorGuest ? spawn.position.y + 1.5 : spawn.position.y + 2;
    const snappedY = pickGuestFloorYFromMeshes(
      BABYLON,
      scene,
      spawn.position.x,
      spawn.position.z,
      floorMeshes,
      spawn.position.y,
      maxHitY
    );

    if (typeof snappedY === "number") {
      baseY = snappedY;
    }
  }

  return {
    ...spawn,
    position: {
      x: spawn.position.x,
      y: baseY + sitYOffset,
      z: spawn.position.z
    }
  };
}

function getJinjuAllGuestIds() {
  return [...getJinjuOutdoorGuestIds(), ...getJinjuIndoorGuestIds(), ...getJinjuRooftopGuestIds()];
}

function getSurfaceDebugName(hit) {
  if (!hit?.pickedMesh) {
    return "-";
  }

  const meshName = hit.pickedMesh.name || hit.pickedMesh.id || "mesh";
  const materialName = getMaterialNames(hit.pickedMesh).filter(Boolean).join(",") || "no-material";
  return `${meshName}:${materialName}`;
}

function hideTourStartMarker(tourStartNode, meshes) {
  if (!tourStartNode) {
    return;
  }

  meshes
    .filter((mesh) => isDescendantOf(mesh, tourStartNode))
    .forEach((mesh) => {
      mesh.isPickable = false;
      mesh.visibility = 0;
    });
}

function applyClayPreviewMaterial(BABYLON, scene, meshes) {
  const material = new BABYLON.StandardMaterial("tour-clay-preview-mat", scene);
  material.diffuseColor = new BABYLON.Color3(0.78, 0.8, 0.74);
  material.emissiveColor = new BABYLON.Color3(0.18, 0.18, 0.16);
  material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
  material.backFaceCulling = false;
  meshes.forEach((mesh) => {
    mesh.material = material;
    mesh.visibility = 1;
    mesh.setEnabled(true);
  });
}

function normalizeModel(BABYLON, scene, result, meshes) {
  const root = new BABYLON.TransformNode("tour-building-root", scene);
  root.metadata = { ...(root.metadata || {}), isGeneratedTourRoot: true };
  const tourStartNode = findTourStartNode(result);

  getRootNodes(result).forEach((node) => {
    if (node !== root) {
      node.setParent(root);
    }
  });

  root.rotation.x = MODEL_ROTATION_X;
  root.scaling.set(MODEL_UNIT_SCALE, MODEL_UNIT_SCALE, MODEL_UNIT_SCALE);
  updateWorldMatrices(root, meshes);

  const initialBounds = getFullBounds(BABYLON, meshes);
  root.position.addInPlace(new BABYLON.Vector3(
    -initialBounds.center.x,
    -initialBounds.min.y,
    -initialBounds.center.z
  ));
  updateWorldMatrices(root, meshes);

  return {
    root,
    scale: MODEL_UNIT_SCALE,
    bounds: getFullBounds(BABYLON, meshes),
    focusBounds: getFocusBounds(BABYLON, meshes),
    tourStartNode
  };
}

function createOrbitCamera(BABYLON, scene) {
  const target = new BABYLON.Vector3(
    DEFAULT_ORBIT_CAMERA.target.x,
    DEFAULT_ORBIT_CAMERA.target.y,
    DEFAULT_ORBIT_CAMERA.target.z
  );
  const position = new BABYLON.Vector3(
    DEFAULT_ORBIT_CAMERA.position.x,
    DEFAULT_ORBIT_CAMERA.position.y,
    DEFAULT_ORBIT_CAMERA.position.z
  );
  const distance = BABYLON.Vector3.Distance(position, target);
  const camera = new BABYLON.ArcRotateCamera("previewCamera", -Math.PI / 2, Math.PI / 2.9, distance, target, scene);

  camera.setPosition(position);
  camera.fov = BABYLON.Tools.ToRadians(58);
  camera.minZ = 0.01;
  camera.maxZ = Math.max(10000, distance * 8);
  camera.lowerRadiusLimit = Math.max(0.5, distance * 0.02);
  camera.upperRadiusLimit = distance;
  camera.lowerBetaLimit = 0.12;
  camera.upperBetaLimit = Math.PI / 2 - 0.04;
  camera.metadata = {
    ...(camera.metadata || {}),
    baseUpperRadiusLimit: camera.upperRadiusLimit,
    defaultBaseUpperRadiusLimit: camera.upperRadiusLimit
  };
  camera.wheelPrecision = 20;
  camera.wheelDeltaPercentage = 0.015;
  camera.inertia = 0;
  camera.panningInertia = 0;
  camera.checkCollisions = false;
  camera.collisionRadius = new BABYLON.Vector3(1, 1, 1);
  camera.attachControl(canvas, false);
  configureSketchUpStyleOrbitControls(BABYLON, scene, camera);
  scene.activeCamera = camera;

  return camera;
}

function configureSketchUpStyleOrbitControls(BABYLON, scene, camera) {
  const pointerInput = camera.inputs.attached.pointers;

  camera.metadata = {
    ...(camera.metadata || {}),
    orbitMouseControlBackup: ORBIT_MOUSE_CONTROL_BACKUP
  };
  camera.zoomToMouseLocation = ORBIT_MOUSE_CONTROL_SETTINGS.zoomToMouseLocation;

  if (pointerInput) {
    pointerInput.buttons = [];
    pointerInput.panningMouseButton = -1;
    pointerInput.panningSensibility = 0;
  }

  let orbitPointerId = null;
  let previousPointerX = 0;
  let previousPointerY = 0;

  function isOrbitMode() {
    return scene.activeCamera === camera;
  }

  function preventMiddleMouseBrowserDefault(event) {
    if (!isOrbitMode() || event.button !== 1) {
      return;
    }

    event.preventDefault();
  }

  function applyOrbitRotation(deltaX, deltaY) {
    camera.alpha -= deltaX * ORBIT_MOUSE_CONTROL_SETTINGS.rotateSensitivity;
    camera.beta -= deltaY * ORBIT_MOUSE_CONTROL_SETTINGS.rotateSensitivity;
    camera.beta = Math.max(camera.lowerBetaLimit, Math.min(camera.upperBetaLimit, camera.beta));
  }

  function applyOrbitPan(deltaX, deltaY) {
    const panScale = (camera.radius / Math.max(canvas.clientHeight, 1)) * ORBIT_MOUSE_CONTROL_SETTINGS.shiftMiddlePanMultiplier;
    const right = camera.getDirection(BABYLON.Axis.X);
    const up = camera.getDirection(BABYLON.Axis.Y);
    camera.target.addInPlace(right.scale(-deltaX * panScale));
    camera.target.addInPlace(up.scale(deltaY * panScale));
  }

  function startMiddleDrag(event) {
    if (!isOrbitMode() || event.button !== 1) {
      return;
    }

    orbitPointerId = event.pointerId;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function moveMiddleDrag(event) {
    if (orbitPointerId !== event.pointerId || !isOrbitMode()) {
      return;
    }

    const deltaX = event.clientX - previousPointerX;
    const deltaY = event.clientY - previousPointerY;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;

    if (event.shiftKey) {
      applyOrbitPan(deltaX, deltaY);
    } else {
      applyOrbitRotation(deltaX, deltaY);
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function stopMiddleDrag(event) {
    if (orbitPointerId !== event.pointerId) {
      return;
    }

    canvas.releasePointerCapture?.(event.pointerId);
    orbitPointerId = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  canvas.addEventListener("pointerdown", preventMiddleMouseBrowserDefault, true);
  canvas.addEventListener("mousedown", preventMiddleMouseBrowserDefault, true);
  canvas.addEventListener("auxclick", preventMiddleMouseBrowserDefault, true);
  canvas.addEventListener("pointerdown", startMiddleDrag, true);
  canvas.addEventListener("pointermove", moveMiddleDrag, true);
  canvas.addEventListener("pointerup", stopMiddleDrag, true);
  canvas.addEventListener("pointercancel", stopMiddleDrag, true);
}

function createWalkCamera(BABYLON, scene) {
  const position = new BABYLON.Vector3(
    DEFAULT_TOUR_CAMERA.position.x,
    DEFAULT_TOUR_CAMERA.position.y,
    DEFAULT_TOUR_CAMERA.position.z
  );
  const target = new BABYLON.Vector3(
    DEFAULT_TOUR_CAMERA.target.x,
    DEFAULT_TOUR_CAMERA.target.y,
    DEFAULT_TOUR_CAMERA.target.z
  );
  const camera = new BABYLON.UniversalCamera("firstPersonCamera", position, scene);

  camera.minZ = 0.03;
  camera.maxZ = 10000;
  camera.fov = BABYLON.Tools.ToRadians(72);
  camera.applyGravity = false;
  camera.checkCollisions = false;
  camera.ellipsoid = new BABYLON.Vector3(PLAYER_RADIUS, PLAYER_HEIGHT * 0.5, PLAYER_RADIUS);
  camera.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);
  camera.inputs.clear();
  camera.setTarget(target);

  return camera;
}

function getInputKey(event) {
  const codeMap = {
    KeyW: "w",
    KeyA: "a",
    KeyS: "s",
    KeyD: "d",
    KeyE: "e",
    KeyJ: "j",
    KeyP: "p",
    KeyG: "g",
    KeyB: "b",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    ShiftLeft: "shift",
    ShiftRight: "shift",
    Space: " ",
    Tab: "tab"
  };

  return codeMap[event.code] || String(event.key || "").toLowerCase();
}

function runInputSelfTest() {
  const expectedMappings = [
    [{ code: "KeyW", key: "w" }, "w"],
    [{ code: "KeyA", key: "a" }, "a"],
    [{ code: "KeyS", key: "s" }, "s"],
    [{ code: "KeyD", key: "d" }, "d"],
    [{ code: "KeyE", key: "e" }, "e"],
    [{ code: "ArrowUp", key: "ArrowUp" }, "arrowup"],
    [{ code: "ArrowDown", key: "ArrowDown" }, "arrowdown"],
    [{ code: "ShiftLeft", key: "Shift" }, "shift"]
  ];
  const mappingOk = expectedMappings.every(([eventLike, expected]) => getInputKey(eventLike) === expected);
  const pointerLockOk = typeof canvas.requestPointerLock === "function" && typeof document.exitPointerLock === "function";
  const mouseMoveOk = "onmousemove" in window;

  return {
    ok: mappingOk && pointerLockOk && mouseMoveOk,
    text: [
      `self ${mappingOk && pointerLockOk && mouseMoveOk ? "ok" : "check"}`,
      `keymap ${mappingOk ? "ok" : "fail"}`,
      `pointerLock ${pointerLockOk ? "ok" : "unsupported"}`,
      `mousemove ${mouseMoveOk ? "ok" : "unsupported"}`
    ].join(" / ")
  };
}

function createInputDiagnostics() {
  const selfTest = runInputSelfTest();

  return {
    selfTestText: selfTest.text,
    pointerLocked: false,
    pointerLockError: "-",
    keyDownCount: 0,
    keyUpCount: 0,
    mouseMoveCount: 0,
    lastKeyDown: "-",
    lastKeyUp: "-",
    lastMouseMove: "-",
    lastMouseDelta: "x 0, y 0",
    lastMoveCommand: "-",
    lastMoveDistance: "0.000",
    lastCollision: "-",
    lastGround: "-",
    lastFireball: "-",
    movementBlocked: false
  };
}

function getValidGroundHit(hit) {
  if (!hit?.hit || !hit.pickedPoint) {
    return null;
  }

  const normal = hit.getNormal?.(true);

  if (isRampSurface(hit.pickedMesh)) {
    return !normal || Math.abs(normal.y) >= RAMP_GROUND_NORMAL_MIN_Y ? hit : null;
  }

  if (isFloorSurface(hit.pickedMesh) || isStairSurface(hit.pickedMesh)) {
    const minNormalY = hit.pickedMesh.metadata?.angjiVisualStairSurface
      ? RAMP_GROUND_NORMAL_MIN_Y
      : CLASSIFIED_GROUND_NORMAL_MIN_Y;

    return !normal || Math.abs(normal.y) >= minNormalY ? hit : null;
  }

  return !normal || normal.y >= GROUND_NORMAL_MIN_Y ? hit : null;
}

function getRayHits(scene, ray, predicate) {
  if (typeof scene.multiPickWithRay === "function") {
    return (scene.multiPickWithRay(ray, predicate) || [])
      .filter((hit) => hit?.hit && hit.pickedPoint && hit.pickedMesh)
      .sort((a, b) => a.distance - b.distance);
  }

  const hit = scene.pickWithRay(ray, predicate);
  return hit?.hit ? [hit] : [];
}

function getBlockingBodyHit(hit) {
  if (!hit?.hit || !hit.pickedMesh || hit.distance < MIN_COLLISION_DISTANCE) {
    return null;
  }

  if (hit.pickedMesh.metadata?.angjiWallSurface || hit.pickedMesh.metadata?.angjiFurnitureSurface) {
    return hit;
  }

  const normal = hit.getNormal?.(true);

  if (hit.pickedMesh.metadata?.angjiRampSurface && hit.pickedMesh.metadata?.angjiCollisionLayer) {
    // Walkable ramp treads can be steeper than flat COL floors; only near-vertical faces block.
    if (normal && normal.y >= RAMP_GROUND_NORMAL_MIN_Y) {
      return null;
    }

    return hit;
  }

  if (hit.pickedMesh.metadata?.angjiRampSurface) {
    if (normal && normal.y >= RAMP_GROUND_NORMAL_MIN_Y) {
      return null;
    }

    return hit;
  }

  if (hit.pickedMesh.metadata?.angjiStairSurface) {
    if (normal && normal.y >= WALL_NORMAL_MAX_Y) {
      return null;
    }

    return hit;
  }

  if (normal && normal.y > WALL_NORMAL_MAX_Y) {
    return null;
  }

  if (!normal && isLikelyWalkableSurface(hit.pickedMesh)) {
    return null;
  }

  return hit;
}

function getFireballMaterial(BABYLON, scene) {
  const existingMaterial = scene.getMaterialByName("tour-fireball-material");

  if (existingMaterial) {
    return existingMaterial;
  }

  const material = new BABYLON.StandardMaterial("tour-fireball-material", scene);
  material.diffuseColor = new BABYLON.Color3(1, 0.35, 0.04);
  material.emissiveColor = new BABYLON.Color3(1, 0.45, 0.08);
  material.specularColor = new BABYLON.Color3(1, 0.65, 0.18);
  material.disableLighting = true;
  return material;
}

function buildFireballHitMeshSet(modelState) {
  // Prefer collision + people only -> full-scene multiPick is a major fireball hitch.
  const meshes = [
    ...(modelState?.collisionMeshes || []),
    ...(modelState?.peopleTargetMeshes || [])
  ];

  if (meshes.length) {
    return new Set(meshes.filter((mesh) => mesh && mesh.isEnabled?.() !== false));
  }

  return new Set((modelState?.projectileHitMeshes || []).filter(Boolean));
}

function createFireballProjectile(BABYLON, scene, camera) {
  const direction = camera.getDirection(BABYLON.Axis.Z).normalize();
  const position = camera.position.add(direction.scale(FIREBALL_SETTINGS.spawnDistance));
  const mesh = BABYLON.MeshBuilder.CreateSphere("tour-fireball", {
    diameter: FIREBALL_SETTINGS.radius * 2,
    segments: 8
  }, scene);

  mesh.position.copyFrom(position);
  mesh.material = getFireballMaterial(BABYLON, scene);
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.applyFog = false;

  // No PointLight: dynamic lights force per-frame material light recomputation and hitch hard in night mode.
  return {
    mesh,
    direction,
    distance: 0
  };
}

function disposeFireballProjectile(projectile) {
  projectile.mesh?.dispose();
}

function createEnemyHpBar(BABYLON, scene) {
  const root = new BABYLON.TransformNode("tour-enemy-hp-root", scene);
  const texture = new BABYLON.DynamicTexture("tour-enemy-hp-texture", {
    width: 512,
    height: 64
  }, scene);
  const material = new BABYLON.StandardMaterial("tour-enemy-hp-material", scene);
  const plane = BABYLON.MeshBuilder.CreatePlane("tour-enemy-hp-plane", {
    width: ENEMY_SETTINGS.hpBarWidth,
    height: ENEMY_SETTINGS.hpBarHeight
  }, scene);

  texture.hasAlpha = true;
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.specularColor = BABYLON.Color3.Black();
  material.disableLighting = true;
  material.backFaceCulling = false;

  plane.parent = root;
  plane.material = material;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;

  root.setEnabled(false);
  return { root, plane, texture };
}

function updateEnemyHpBar(hpBar, hp) {
  if (!hpBar) {
    return;
  }

  const context = hpBar.texture.getContext();
  const width = hpBar.texture.getSize().width;
  const height = hpBar.texture.getSize().height;
  const padding = 5;
  const gap = 4;
  const segmentHeight = height - padding * 2;
  const segmentWidth = (width - padding * 2 - gap * (ENEMY_SETTINGS.maxHp - 1)) / ENEMY_SETTINGS.maxHp;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(0, 0, 0, 0.86)";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgb(20, 230, 60)";
  for (let index = 0; index < hp; index += 1) {
    context.fillRect(
      padding + index * (segmentWidth + gap),
      padding,
      segmentWidth,
      segmentHeight
    );
  }

  hpBar.texture.update();
}

function getRayAabbHitDistance(origin, direction, min, max, maxDistance) {
  let near = 0;
  let far = maxDistance;
  const axes = ["x", "y", "z"];

  for (const axis of axes) {
    const rayDirection = direction[axis];

    if (Math.abs(rayDirection) < 1e-6) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) {
        return null;
      }
      continue;
    }

    let t1 = (min[axis] - origin[axis]) / rayDirection;
    let t2 = (max[axis] - origin[axis]) / rayDirection;

    if (t1 > t2) {
      const temp = t1;
      t1 = t2;
      t2 = temp;
    }

    near = Math.max(near, t1);
    far = Math.min(far, t2);

    if (near > far) {
      return null;
    }
  }

  return near >= 0 && near <= maxDistance ? near : null;
}

function setEnemyMeshVisibility(enemy, visibility) {
  enemy.meshes.forEach((mesh) => {
    mesh.visibility = visibility;
  });
}

async function loadEnemyModel(BABYLON, scene) {
  const fileName = `${ENEMY_SETTINGS.file}?v=${Date.now()}`;
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", ENEMY_ROOT, fileName, scene);
  const root = new BABYLON.TransformNode("tour-enemy-root", scene);
  const contentRoot = new BABYLON.TransformNode("tour-enemy-content", scene);
  const meshes = getGeometryMeshes(result.meshes);

  contentRoot.parent = root;

  getRootNodes(result).forEach((node) => {
    if (node !== root && node !== contentRoot) {
      node.setParent(contentRoot);
    }
  });

  updateWorldMatrices(root, meshes);
  const bounds = getFullBounds(BABYLON, meshes);
  contentRoot.position.addInPlace(new BABYLON.Vector3(
    -bounds.center.x,
    -bounds.min.y,
    -bounds.center.z
  ));
  root.scaling.set(ENEMY_SETTINGS.scale, ENEMY_SETTINGS.scale, ENEMY_SETTINGS.scale);
  updateWorldMatrices(root, meshes);
  const scaledBounds = getFullBounds(BABYLON, meshes);
  const hitboxPadding = ENEMY_SETTINGS.hitboxPadding;

  meshes.forEach((mesh) => {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = { ...(mesh.metadata || {}), passThrough: true, enemyVisual: true };
  });
  softenModelMaterialReflections(BABYLON, scene.materials);

  const hpBar = createEnemyHpBar(BABYLON, scene);
  root.setEnabled(false);

  return {
    root,
    contentRoot,
    meshes,
    hpBar,
    visualHeight: scaledBounds.size.y,
    hitboxSize: new BABYLON.Vector3(
      scaledBounds.size.x + hitboxPadding * 2,
      scaledBounds.size.y + hitboxPadding * 2,
      scaledBounds.size.z + hitboxPadding * 2
    ),
    hpBarOffsetY: scaledBounds.size.y + ENEMY_SETTINGS.hpBarGap + ENEMY_SETTINGS.hpBarHeight / 2,
    fadeObserver: null
  };
}

function animatePeopleFireballHit(BABYLON, scene, mesh) {
  if (!mesh || mesh.metadata?.fireballDying || mesh.metadata?.fireballDefeated) {
    return false;
  }

  const startVisibility = typeof mesh.visibility === "number" ? mesh.visibility : 1;
  const startQuaternion = mesh.rotationQuaternion
    ? mesh.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
  const targetQuaternion = startQuaternion.multiply(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, FIREBALL_SETTINGS.hitRotationRadians));
  const startedAt = performance.now();
  let observer = null;

  mesh.metadata = { ...(mesh.metadata || {}), fireballDying: true };
  mesh.rotationQuaternion = startQuaternion.clone();
  mesh.isPickable = false;

  observer = scene.onBeforeRenderObservable.add(() => {
    const elapsed = performance.now() - startedAt;
    const progress = Math.min(elapsed / FIREBALL_SETTINGS.hitFadeMs, 1);
    const eased = 1 - ((1 - progress) ** 3);

    mesh.rotationQuaternion = BABYLON.Quaternion.Slerp(startQuaternion, targetQuaternion, eased);
    mesh.visibility = startVisibility * (1 - eased);

    if (progress < 1) {
      return;
    }

    mesh.visibility = 0;
    mesh.setEnabled(false);
    mesh.metadata = {
      ...(mesh.metadata || {}),
      fireballDying: false,
      fireballDefeated: true
    };
    scene.onBeforeRenderObservable.remove(observer);
  });

  return true;
}

function getVertexAttributeData(BABYLON, mesh) {
  const kinds = [
    BABYLON.VertexBuffer.PositionKind,
    BABYLON.VertexBuffer.NormalKind,
    BABYLON.VertexBuffer.UVKind,
    BABYLON.VertexBuffer.UV2Kind,
    BABYLON.VertexBuffer.ColorKind,
    BABYLON.VertexBuffer.TangentKind
  ];

  return kinds
    .map((kind) => {
      const data = mesh.getVerticesData(kind);
      const buffer = mesh.getVertexBuffer(kind);
      return data && buffer ? { kind, data, stride: buffer.getSize() } : null;
    })
    .filter(Boolean);
}

function getTriangleMaterialIndices(mesh, triangleCount) {
  const materialIndices = new Array(triangleCount).fill(0);

  if (!mesh.subMeshes || mesh.subMeshes.length === 0) {
    return materialIndices;
  }

  mesh.subMeshes.forEach((subMesh) => {
    const startTriangle = Math.floor(subMesh.indexStart / 3);
    const endTriangle = Math.min(triangleCount, Math.ceil((subMesh.indexStart + subMesh.indexCount) / 3));

    for (let triangleIndex = startTriangle; triangleIndex < endTriangle; triangleIndex += 1) {
      materialIndices[triangleIndex] = subMesh.materialIndex || 0;
    }
  });

  return materialIndices;
}

function getDominantMaterial(mesh, componentTriangles, triangleMaterialIndices) {
  if (!Array.isArray(mesh.material?.subMaterials)) {
    return mesh.material;
  }

  const counts = new Map();
  componentTriangles.forEach((triangleIndex) => {
    const materialIndex = triangleMaterialIndices[triangleIndex] || 0;
    counts.set(materialIndex, (counts.get(materialIndex) || 0) + 1);
  });
  const dominantIndex = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

  return mesh.material.subMaterials[dominantIndex] || mesh.material;
}

function findConnectedTriangleComponents(indices) {
  const triangleCount = Math.floor(indices.length / 3);
  const trianglesByVertex = new Map();

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertexIndex = indices[triangleIndex * 3 + corner];
      const triangles = trianglesByVertex.get(vertexIndex) || [];
      triangles.push(triangleIndex);
      trianglesByVertex.set(vertexIndex, triangles);
    }
  }

  const visited = new Array(triangleCount).fill(false);
  const components = [];

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    if (visited[triangleIndex]) {
      continue;
    }

    const component = [];
    const stack = [triangleIndex];
    visited[triangleIndex] = true;

    while (stack.length > 0) {
      const currentTriangle = stack.pop();
      component.push(currentTriangle);

      for (let corner = 0; corner < 3; corner += 1) {
        const vertexIndex = indices[currentTriangle * 3 + corner];
        const neighbors = trianglesByVertex.get(vertexIndex) || [];

        neighbors.forEach((neighborTriangle) => {
          if (!visited[neighborTriangle]) {
            visited[neighborTriangle] = true;
            stack.push(neighborTriangle);
          }
        });
      }
    }

    components.push(component);
  }

  return components;
}

function createPeopleComponentMeshes(BABYLON, scene, mesh) {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

  if (!positions || positions.length < 9) {
    return [];
  }

  const vertexCount = positions.length / 3;
  const sourceIndices = mesh.getIndices();
  const indices = sourceIndices && sourceIndices.length > 0
    ? Array.from(sourceIndices)
    : Array.from({ length: vertexCount }, (_, index) => index);
  const components = findConnectedTriangleComponents(indices).filter((component) => component.length > 0);

  if (components.length <= 1) {
    return [];
  }

  const attributeData = getVertexAttributeData(BABYLON, mesh);
  const triangleMaterialIndices = getTriangleMaterialIndices(mesh, Math.floor(indices.length / 3));

  return components.map((componentTriangles, componentIndex) => {
    const oldToNewVertex = new Map();
    const oldVertexOrder = [];
    const componentIndices = [];

    componentTriangles.forEach((triangleIndex) => {
      for (let corner = 0; corner < 3; corner += 1) {
        const oldVertexIndex = indices[triangleIndex * 3 + corner];

        if (!oldToNewVertex.has(oldVertexIndex)) {
          oldToNewVertex.set(oldVertexIndex, oldToNewVertex.size);
          oldVertexOrder.push(oldVertexIndex);
        }

        componentIndices.push(oldToNewVertex.get(oldVertexIndex));
      }
    });

    const componentMin = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    const componentMax = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

    oldVertexOrder.forEach((oldVertexIndex) => {
      const vertex = new BABYLON.Vector3(
        positions[oldVertexIndex * 3],
        positions[oldVertexIndex * 3 + 1],
        positions[oldVertexIndex * 3 + 2]
      );
      componentMin.minimizeInPlace(vertex);
      componentMax.maximizeInPlace(vertex);
    });

    const componentCenter = componentMin.add(componentMax.subtract(componentMin).scale(0.5));
    const sourceRotation = mesh.rotationQuaternion
      ? mesh.rotationQuaternion.clone()
      : BABYLON.Quaternion.FromEulerAngles(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
    const sourceLocalMatrix = BABYLON.Matrix.Compose(mesh.scaling, sourceRotation, mesh.position);
    const componentPosition = BABYLON.Vector3.TransformCoordinates(componentCenter, sourceLocalMatrix);
    const vertexData = new BABYLON.VertexData();

    attributeData.forEach(({ kind, data, stride }) => {
      const output = [];

      oldVertexOrder.forEach((oldVertexIndex) => {
        for (let offset = 0; offset < stride; offset += 1) {
          const value = data[oldVertexIndex * stride + offset];

          if (kind === BABYLON.VertexBuffer.PositionKind && offset < 3) {
            output.push(value - componentCenter.asArray()[offset]);
          } else {
            output.push(value);
          }
        }
      });

      vertexData.set(output, kind);
    });

    vertexData.indices = componentIndices;

    const componentMesh = new BABYLON.Mesh(`${mesh.name || mesh.id || "people"}-hit-${componentIndex + 1}`, scene);
    vertexData.applyToMesh(componentMesh, true);
    componentMesh.parent = mesh.parent;
    componentMesh.position.copyFrom(componentPosition);
    componentMesh.rotation.copyFrom(mesh.rotation);
    componentMesh.rotationQuaternion = sourceRotation.clone();
    componentMesh.scaling.copyFrom(mesh.scaling);
    componentMesh.visibility = typeof mesh.visibility === "number" ? mesh.visibility : 1;
    componentMesh.isVisible = mesh.isVisible;
    componentMesh.renderingGroupId = mesh.renderingGroupId;
    componentMesh.material = getDominantMaterial(mesh, componentTriangles, triangleMaterialIndices);
    componentMesh.isPickable = true;
    componentMesh.checkCollisions = false;
    componentMesh.metadata = {
      ...(mesh.metadata || {}),
      passThrough: true,
      peopleTarget: true,
      fireballSplitComponent: true,
      fireballSourceMeshId: mesh.uniqueId
    };
    componentMesh.computeWorldMatrix(true);
    return componentMesh;
  });
}

function splitPeopleTargetMeshes(BABYLON, scene, meshes, performanceSettings = DEFAULT_PERFORMANCE_SETTINGS) {
  const generatedMeshes = [];

  meshes.slice().forEach((mesh) => {
    if (!isPeopleFireballTarget(mesh, performanceSettings) || mesh.metadata?.fireballSplitComponent) {
      return;
    }

    const componentMeshes = createPeopleComponentMeshes(BABYLON, scene, mesh);

    if (componentMeshes.length === 0) {
      return;
    }

    mesh.metadata = {
      ...(mesh.metadata || {}),
      passThrough: true,
      peopleTarget: false,
      fireballSplitOriginal: true
    };
    mesh.isPickable = false;
    mesh.setEnabled(false);
    generatedMeshes.push(...componentMeshes);
  });

  return generatedMeshes;
}

function softenModelMaterialReflections(BABYLON, materials) {
  materials.forEach((material) => {
    if (!material || material.name === "tour-fireball-material") {
      return;
    }

    if (typeof material.unfreeze === "function") {
      material.unfreeze();
    }

    // Keep double-sided foliage/glass readable; opaque building faces still cull via
    // engine defaults when materials are authored single-sided.
    material.backFaceCulling = false;

    if ("specularColor" in material) {
      material.specularColor = BABYLON.Color3.Black();
    }

    if ("specularPower" in material) {
      material.specularPower = MATERIAL_REFLECTION_SETTINGS.specularPower;
    }

    if ("roughness" in material) {
      material.roughness = MATERIAL_REFLECTION_SETTINGS.roughness;
    }

    if ("metallic" in material) {
      material.metallic = MATERIAL_REFLECTION_SETTINGS.metallic;
    }

    if ("microSurface" in material) {
      material.microSurface = 0;
    }

    if ("environmentIntensity" in material) {
      material.environmentIntensity = MATERIAL_REFLECTION_SETTINGS.specularIntensity;
    }
  });
}

function findGroundHit(BABYLON, scene, position, groundMeshSet, options = {}) {
  const referenceEyeY = options.referenceEyeY ?? position.y;
  const maxStepUp = options.maxStepUp ?? MAX_RAMP_STEP_UP;
  const maxStepDown = options.maxStepDown ?? MAX_STEP_DOWN;
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet, options);

  if (!groundHits.length) {
    return null;
  }

  const inRangeCandidates = dedupeGroundCandidates(
    mapGroundHitCandidates(groundHits, referenceEyeY)
      .filter((entry) => entry.delta >= -maxStepDown - GROUND_SNAP_TOLERANCE
        && entry.delta <= maxStepUp + GROUND_SNAP_TOLERANCE)
  );
  const belowRampCandidates = mapGroundHitCandidates(groundHits, referenceEyeY)
    .filter((entry) => entry.isRamp && entry.delta <= GROUND_SNAP_TOLERANCE);
  const preferredRampFloorLevel = belowRampCandidates.length
    ? belowRampCandidates.sort((a, b) => b.eyeY - a.eyeY)[0].rampFloorLevel ?? null
    : null;
  const groundSelect = {
    ...(options.groundSelect || {}),
    preferredRampFloorLevel
  };

  if (inRangeCandidates.length) {
    const selected = selectBestGroundCandidate(inRangeCandidates, groundSelect);

    return selected?.hit || null;
  }

  const belowReference = mapGroundHitCandidates(groundHits, referenceEyeY)
    .filter((entry) => entry.delta <= GROUND_SNAP_TOLERANCE)
    .sort((a, b) => b.eyeY - a.eyeY);

  return belowReference[0]?.hit || null;
}

/** Spawn / reset snap -> accepts large vertical offset from Tour_Start markers. */
function findSpawnGroundHit(BABYLON, scene, position, groundMeshSet) {
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet);

  if (!groundHits.length) {
    return null;
  }

  const referenceEyeY = position.y;
  const candidates = dedupeGroundCandidates(mapGroundHitCandidates(groundHits, referenceEyeY));

  if (!candidates.length) {
    return null;
  }

  const below = candidates
    .filter((entry) => entry.delta <= 0.5)
    .sort((a, b) => b.eyeY - a.eyeY);

  if (below.length) {
    return below[0].hit;
  }

  const above = candidates
    .filter((entry) => entry.delta > 0.5)
    .sort((a, b) => a.delta - b.delta);

  if (above.length) {
    return above[0].hit;
  }

  return candidates.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0].hit;
}

function mapGroundHitCandidates(groundHits, referenceEyeY) {
  return groundHits.map((hit) => ({
    hit,
    eyeY: hit.pickedPoint.y + EYE_HEIGHT,
    delta: hit.pickedPoint.y + EYE_HEIGHT - referenceEyeY,
    isStair: isColDiscreteStairMesh(hit.pickedMesh)
      || (isStairSurface(hit.pickedMesh) && !isRampSurface(hit.pickedMesh)),
    isRamp: isColRampGroundMesh(hit.pickedMesh) || isRampSurface(hit.pickedMesh),
    rampFloorLevel: getAngjiRampFloorLevel(hit.pickedMesh),
    isFloor: Boolean(
      hit.pickedMesh?.metadata?.angjiFloorSurface
      || hit.pickedMesh?.metadata?.angjiRampSurface
      || isFloorSurface(hit.pickedMesh)
    )
  }));
}

function dedupeGroundCandidates(candidates) {
  const bestByMesh = new Map();

  candidates.forEach((entry) => {
    const meshId = entry.hit.pickedMesh.uniqueId;
    const existing = bestByMesh.get(meshId);

    if (!existing || Math.abs(entry.delta) < Math.abs(existing.delta)) {
      bestByMesh.set(meshId, entry);
    }
  });

  return [...bestByMesh.values()];
}

function compareGroundCandidateDelta(a, b) {
  const absDelta = Math.abs(a.delta) - Math.abs(b.delta);

  if (Math.abs(absDelta) > 0.04) {
    return absDelta;
  }

  const aAbove = a.delta > GROUND_SNAP_TOLERANCE ? 1 : 0;
  const bAbove = b.delta > GROUND_SNAP_TOLERANCE ? 1 : 0;

  if (aAbove !== bAbove) {
    return aAbove - bAbove;
  }

  return absDelta;
}

function getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet, options = {}) {
  const probeOffsets = options.compactProbes ? GROUND_PROBE_OFFSETS_COMPACT : GROUND_PROBE_OFFSETS;
  const hits = [];

  for (const [offsetX, offsetZ] of probeOffsets) {
    const rayOrigin = new BABYLON.Vector3(
      position.x + offsetX,
      position.y + GROUND_RAY_UP,
      position.z + offsetZ
    );
    const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), GROUND_RAY_UP + GROUND_RAY_DOWN);
    hits.push(...getRayHits(scene, ray, (mesh) => (
      groundMeshSet.has(mesh)
      && mesh.isPickable !== false
      && mesh.isEnabled()
      && !isTourGuestMesh(mesh)
    )));
  }

  return hits
    .map(getValidGroundHit)
    .filter(Boolean)
    .sort((a, b) => b.pickedPoint.y - a.pickedPoint.y);
}

function getGroundPoseAtPosition(BABYLON, scene, position, groundMeshSet, referenceEyeY = null, options = {}) {
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet, options);
  const maxStepDelta = options.maxStepUp ?? MAX_STEP_UP;

  if (typeof referenceEyeY === "number") {
    const candidate = selectBestGroundCandidate(
      dedupeGroundCandidates(
        mapGroundHitCandidates(groundHits, referenceEyeY)
          .filter((entry) => entry.delta >= -MAX_STEP_DOWN && entry.delta <= maxStepDelta)
      ),
      options.groundSelect || {}
    );
    const hit = candidate?.hit || null;

    if (!hit?.pickedPoint) {
      return null;
    }

    return {
      hit,
      groundY: hit.pickedPoint.y,
      eyeY: hit.pickedPoint.y + EYE_HEIGHT
    };
  }

  let hit = groundHits[0] || null;

  if (!hit?.pickedPoint) {
    return null;
  }

  return {
    hit,
    groundY: hit.pickedPoint.y,
    eyeY: hit.pickedPoint.y + EYE_HEIGHT
  };
}

function getLandingGroundPoseAtPosition(BABYLON, scene, position, groundMeshSet, referenceEyeY, options = {}) {
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet, options);
  const landingCandidate = groundHits
    .map((candidate) => ({
      hit: candidate,
      eyeY: candidate.pickedPoint.y + EYE_HEIGHT
    }))
    .filter((candidate) => candidate.eyeY <= referenceEyeY + GROUND_SNAP_TOLERANCE)
    .sort((a, b) => b.eyeY - a.eyeY)[0];

  if (!landingCandidate) {
    return null;
  }

  return {
    hit: landingCandidate.hit,
    groundY: landingCandidate.hit.pickedPoint.y,
    eyeY: landingCandidate.eyeY
  };
}

function getSweptLandingGroundPoseAtPosition(BABYLON, scene, position, groundMeshSet, previousEyeY, currentEyeY) {
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet);
  const upperY = Math.max(previousEyeY, currentEyeY) + GROUND_SNAP_TOLERANCE;
  const lowerY = Math.min(previousEyeY, currentEyeY) - GROUND_SNAP_TOLERANCE;
  const landingCandidate = groundHits
    .map((candidate) => ({
      hit: candidate,
      eyeY: candidate.pickedPoint.y + EYE_HEIGHT
    }))
    .filter((candidate) => candidate.eyeY >= lowerY && candidate.eyeY <= upperY)
    .sort((a, b) => b.eyeY - a.eyeY)[0];

  if (!landingCandidate) {
    return null;
  }

  return {
    hit: landingCandidate.hit,
    groundY: landingCandidate.hit.pickedPoint.y,
    eyeY: landingCandidate.eyeY
  };
}

function getStepPoseAtPosition(BABYLON, scene, position, groundMeshSet, referenceEyeY, options = {}) {
  const minVerticalDelta = options.minVerticalDelta ?? MIN_STEP_UP;
  const maxVerticalDelta = options.maxVerticalDelta ?? MAX_STAIR_STEP_UP;
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet, {
    compactProbes: options.compactProbes
  });
  const stepCandidate = groundHits
    .filter((candidate) => {
      if (options.slopeFilter === "stair") {
        return isColDiscreteStairMesh(candidate.pickedMesh)
          || (isStairSurface(candidate.pickedMesh) && !isRampSurface(candidate.pickedMesh));
      }

      if (options.slopeFilter === "ramp") {
        return isColRampGroundMesh(candidate.pickedMesh) || isRampSurface(candidate.pickedMesh);
      }

      return isSteppableSlopeSurface(candidate.pickedMesh);
    })
    .map((candidate) => ({
      hit: candidate,
      eyeY: candidate.pickedPoint.y + EYE_HEIGHT,
      verticalDelta: candidate.pickedPoint.y + EYE_HEIGHT - referenceEyeY
    }))
    .filter((candidate) => candidate.verticalDelta >= minVerticalDelta && candidate.verticalDelta <= maxVerticalDelta)
    .sort((a, b) => a.verticalDelta - b.verticalDelta)[0];

  if (!stepCandidate) {
    return null;
  }

  return {
    hit: stepCandidate.hit,
    eyeY: stepCandidate.eyeY,
    verticalDelta: stepCandidate.verticalDelta
  };
}

function isTourGuestMesh(mesh) {
  return Boolean(mesh?.metadata?.tourGuest || mesh?.metadata?.guestId);
}

function isRayPickableCollisionMesh(mesh, collisionMeshSet) {
  return collisionMeshSet.has(mesh)
    && mesh.isPickable
    && mesh.isEnabled()
    && !mesh.metadata?.passThrough
    && !isTourGuestMesh(mesh);
}

function isOverheadBodyCollision(hit, eyeY) {
  if (!hit?.pickedPoint) {
    return false;
  }

  if (hit.pickedMesh?.metadata?.angjiWallSurface || hit.pickedMesh?.metadata?.angjiFurnitureSurface) {
    return false;
  }

  return hit.pickedPoint.y > eyeY - 0.85;
}

function findBodyCollision(BABYLON, scene, position, movement, collisionMeshSet, modelBounds, options = {}) {
  const moveDistance = movement.length();

  if (moveDistance <= 0) {
    return null;
  }

  const direction = movement.normalizeToNew();
  const rayDistance = moveDistance + PLAYER_RADIUS + TOUR_COLLISION_PADDING;
  const minY = (modelBounds?.min?.y ?? 0) + 0.12;
  const lateralAxis = new BABYLON.Vector3(direction.z, 0, -direction.x).normalize();
  const heightOffsets = options.skipLowProbe
    ? TOUR_BODY_COLLISION_HEIGHT_OFFSETS.slice(0, -1)
    : options.highOnly
      ? TOUR_BODY_COLLISION_HEIGHT_OFFSETS.slice(0, 1)
    : TOUR_BODY_COLLISION_HEIGHT_OFFSETS;

  for (const heightOffset of heightOffsets) {
    for (const lateralOffset of TOUR_LATERAL_COLLISION_OFFSETS) {
      const lateral = lateralAxis.scale(lateralOffset);
      const rayOrigin = new BABYLON.Vector3(
        position.x + lateral.x,
        Math.max(position.y + heightOffset, minY),
        position.z + lateral.z
      );
      const ray = new BABYLON.Ray(rayOrigin, direction, rayDistance);
      const hits = getRayHits(scene, ray, (mesh) => isRayPickableCollisionMesh(mesh, collisionMeshSet));
      const hit = hits
        .map(getBlockingBodyHit)
        .find((candidate) => candidate && !isOverheadBodyCollision(candidate, position.y));

      if (hit) {
        hit.collisionHeightOffset = heightOffset;
        hit.collisionLateralOffset = lateralOffset;
        return hit;
      }
    }
  }

  return null;
}

function isLowStepCollision(hit) {
  return !hit || typeof hit.collisionHeightOffset !== "number" || hit.collisionHeightOffset <= -0.75;
}

function isStairCollisionHit(hit) {
  return Boolean(hit?.pickedMesh && isSteppableSlopeSurface(hit.pickedMesh));
}

function isWallSlideCollisionHit(hit) {
  if (!hit?.pickedMesh) {
    return false;
  }

  if (hit.pickedMesh.metadata?.angjiWallSurface || hit.pickedMesh.metadata?.angjiFurnitureSurface) {
    return true;
  }

  if (isStairCollisionHit(hit)) {
    return false;
  }

  const normal = hit.getNormal?.(true);

  if (!normal) {
    return false;
  }

  const horizontal = normal.x * normal.x + normal.z * normal.z;

  return horizontal > 0.12 && Math.abs(normal.y) < WALL_NORMAL_MAX_Y;
}

function getHorizontalHitNormal(hit, BABYLON) {
  const normal = hit.getNormal?.(true);

  if (!normal) {
    return null;
  }

  const horizontal = new BABYLON.Vector3(normal.x, 0, normal.z);

  if (horizontal.lengthSquared() < 1e-8) {
    return null;
  }

  return horizontal.normalize();
}

function computeWallSlideMovement(BABYLON, movement, wallNormal) {
  const intoWall = BABYLON.Vector3.Dot(movement, wallNormal);

  if (intoWall <= 0) {
    return null;
  }

  return movement.subtract(wallNormal.scale(intoWall));
}

function tryWallSlideMove(BABYLON, scene, camera, movement, collisionHit, collisionMeshSet, modelBounds, groundMeshSet, options) {
  const wallSlideDepth = options.wallSlideDepth ?? 0;

  if (wallSlideDepth >= MAX_WALL_SLIDE_DEPTH || !collisionHit || !isWallSlideCollisionHit(collisionHit)) {
    return null;
  }

  if (isLowStepCollision(collisionHit) || isStairCollisionHit(collisionHit)) {
    return null;
  }

  const wallNormal = getHorizontalHitNormal(collisionHit, BABYLON);

  if (!wallNormal) {
    return null;
  }

  const slideMovement = computeWallSlideMovement(BABYLON, movement, wallNormal);

  if (!slideMovement || slideMovement.length() < MIN_WALL_SLIDE_DISTANCE) {
    return null;
  }

  const slideResult = tryMoveWithCollision(
    BABYLON,
    scene,
    camera,
    slideMovement,
    collisionMeshSet,
    modelBounds,
    groundMeshSet,
    {
      ...options,
      wallSlideDepth: wallSlideDepth + 1
    }
  );

  if (!slideResult.moved) {
    return null;
  }

  return {
    ...slideResult,
    reason: `slide:${slideResult.reason}`
  };
}

function tryAxisSeparatedWallSlide(BABYLON, scene, camera, movement, collisionMeshSet, modelBounds, groundMeshSet, options) {
  if ((options.wallSlideDepth ?? 0) > 0) {
    return null;
  }

  const axisMoves = [
    new BABYLON.Vector3(movement.x, 0, 0),
    new BABYLON.Vector3(0, 0, movement.z)
  ];

  for (const partial of axisMoves) {
    if (partial.length() < MIN_WALL_SLIDE_DISTANCE) {
      continue;
    }

    const partialResult = tryMoveWithCollision(
      BABYLON,
      scene,
      camera,
      partial,
      collisionMeshSet,
      modelBounds,
      groundMeshSet,
      {
        ...options,
        wallSlideDepth: MAX_WALL_SLIDE_DEPTH
      }
    );

    if (partialResult.moved) {
      return {
        ...partialResult,
        reason: `slide:${partialResult.reason}`
      };
    }
  }

  return null;
}

function tryWallSlideRecovery(BABYLON, scene, camera, movement, collisionHit, collisionMeshSet, modelBounds, groundMeshSet, options) {
  const slideResult = tryWallSlideMove(
    BABYLON,
    scene,
    camera,
    movement,
    collisionHit,
    collisionMeshSet,
    modelBounds,
    groundMeshSet,
    options
  );

  if (slideResult) {
    return slideResult;
  }

  if (!collisionHit || !isWallSlideCollisionHit(collisionHit)) {
    return null;
  }

  return tryAxisSeparatedWallSlide(
    BABYLON,
    scene,
    camera,
    movement,
    collisionMeshSet,
    modelBounds,
    groundMeshSet,
    options
  );
}

function selectBestGroundCandidate(candidates, options = {}) {
  if (!candidates.length) {
    return null;
  }

  const stairs = candidates.filter((candidate) => candidate.isStair);
  const ramps = candidates.filter((candidate) => candidate.isRamp);

  if (options.preferStairDescent && (stairs.length || ramps.length)) {
    const descending = [...stairs, ...ramps].filter((candidate) => candidate.delta < -MIN_STEP_DOWN);

    if (descending.length) {
      return descending.sort((a, b) => b.eyeY - a.eyeY)[0];
    }
  }

  if (options.preferStairAscent && stairs.length) {
    const ascending = stairs.filter((candidate) => candidate.delta > MIN_STEP_UP);

    if (ascending.length) {
      return ascending.sort((a, b) => a.delta - b.delta)[0];
    }
  }

  if (options.preferRampAscent && ramps.length) {
    const ascending = ramps.filter((candidate) => candidate.delta > MIN_STEP_UP);

    if (ascending.length) {
      return selectBestRampCandidate(ascending, options);
    }
  }

  if (options.preferRampSurface && ramps.length) {
    return selectBestRampCandidate(ramps, options);
  }

  if (stairs.length) {
    return stairs.sort(compareGroundCandidateDelta)[0];
  }

  if (ramps.length) {
    return selectBestRampCandidate(ramps, options);
  }

  return candidates.sort(compareGroundCandidateDelta)[0];
}

function isOnBuildingFloorAt(BABYLON, scene, position, groundMeshSet) {
  const hit = findGroundHit(BABYLON, scene, position, groundMeshSet, {
    referenceEyeY: position.y,
    maxStepUp: MAX_STEP_UP
  });

  if (!hit?.pickedMesh) {
    return false;
  }

  return Boolean(hit.pickedMesh.metadata?.angjiFloorSurface || isFloorSurface(hit.pickedMesh));
}

function isNearColDiscreteStairContext(BABYLON, scene, position, movement, groundMeshSet) {
  if (isOnColDiscreteStairAt(BABYLON, scene, position, groundMeshSet)) {
    return true;
  }

  const moveDistance = movement.length();

  if (moveDistance <= 0.01) {
    return false;
  }

  const direction = movement.normalizeToNew();

  for (const distance of [0.18, 0.38, 0.62, 0.9]) {
    const probePosition = position.add(direction.scale(Math.min(distance, moveDistance)));

    if (isOnColDiscreteStairAt(BABYLON, scene, probePosition, groundMeshSet)) {
      return true;
    }

    const stepPose = getStepPoseAtPosition(BABYLON, scene, probePosition, groundMeshSet, position.y, {
      maxVerticalDelta: ANGJI_MAX_STAIR_STEP_UP,
      slopeFilter: "stair"
    });

    if (stepPose) {
      return true;
    }
  }

  return false;
}

function getLocomotionSurfaceState(BABYLON, scene, position, groundMeshSet, options = {}) {
  const maxRampStepUp = options.maxRampStepUp ?? MAX_RAMP_STEP_UP;
  const hit = findGroundHit(BABYLON, scene, position, groundMeshSet, {
    referenceEyeY: position.y,
    maxStepUp: maxRampStepUp,
    compactProbes: true,
    groundSelect: { preferRampSurface: true }
  });
  const mesh = hit?.pickedMesh;

  return {
    hit,
    onColRamp: Boolean(mesh && isColRampGroundMesh(mesh)),
    onColStair: Boolean(mesh && isColDiscreteStairMesh(mesh)),
    onRamp: Boolean(mesh && (isColRampGroundMesh(mesh) || isRampSurface(mesh))),
    onStair: Boolean(mesh && isStairSurface(mesh) && !isRampSurface(mesh))
  };
}

function isNearColRampContext(BABYLON, scene, position, movement, groundMeshSet, options = {}) {
  const maxRampStepUp = options.maxRampStepUp ?? MAX_RAMP_STEP_UP;
  const bridgeHorizontal = options.rampFloorBridgeHorizontal ?? RAMP_FLOOR_BRIDGE_HORIZONTAL;
  const moveDistance = movement.length();

  if (moveDistance <= 0.01) {
    return false;
  }

  const direction = movement.normalizeToNew();

  for (const distance of NEAR_RAMP_PROBE_DISTANCES) {
    const probePosition = position.add(direction.scale(Math.min(distance, moveDistance)));
    const hit = findGroundHit(BABYLON, scene, probePosition, groundMeshSet, {
      referenceEyeY: position.y,
      maxStepUp: maxRampStepUp,
      compactProbes: true,
      groundSelect: { preferRampSurface: true }
    });

    if (hit?.pickedMesh && isColRampGroundMesh(hit.pickedMesh)) {
      return true;
    }
  }

  return isColRampMeshAhead(BABYLON, position, movement, groundMeshSet, {
    maxRampStepUp,
    rampFloorBridgeHorizontal: bridgeHorizontal
  });
}

function isOnColDiscreteStairAt(BABYLON, scene, position, groundMeshSet) {
  const hit = findGroundHit(BABYLON, scene, position, groundMeshSet, {
    referenceEyeY: position.y,
    maxStepUp: ANGJI_MAX_STAIR_STEP_UP,
    compactProbes: true
  });

  return Boolean(hit?.pickedMesh && isColDiscreteStairMesh(hit.pickedMesh));
}

function isOnColRampSurfaceAt(BABYLON, scene, position, groundMeshSet) {
  const hit = findGroundHit(BABYLON, scene, position, groundMeshSet, {
    referenceEyeY: position.y,
    maxStepUp: MAX_RAMP_STEP_UP,
    compactProbes: true,
    groundSelect: { preferRampSurface: true }
  });

  return Boolean(hit?.pickedMesh && isColRampGroundMesh(hit.pickedMesh));
}

/** @deprecated use isOnColDiscreteStairAt or isOnColRampSurfaceAt */
function isOnColSlopeSurfaceAt(BABYLON, scene, position, groundMeshSet) {
  return isOnColDiscreteStairAt(BABYLON, scene, position, groundMeshSet)
    || isOnColRampSurfaceAt(BABYLON, scene, position, groundMeshSet);
}

function getCenterGroundPose(BABYLON, scene, position, groundMeshSet, referenceEyeY = null, options = {}) {
  return getGroundPoseAtPosition(
    BABYLON,
    scene,
    position,
    groundMeshSet,
    referenceEyeY ?? position.y,
    options
  );
}

function isOnStairSurfaceAt(BABYLON, scene, position, groundMeshSet) {
  const hit = findGroundHit(BABYLON, scene, position, groundMeshSet, {
    referenceEyeY: position.y,
    maxStepUp: MAX_STAIR_STEP_UP,
    compactProbes: true
  });

  return Boolean(hit?.pickedMesh && isStairSurface(hit.pickedMesh) && !isRampSurface(hit.pickedMesh));
}

function isOnRampSurfaceAt(BABYLON, scene, position, groundMeshSet) {
  const hit = findGroundHit(BABYLON, scene, position, groundMeshSet, {
    referenceEyeY: position.y,
    maxStepUp: MAX_RAMP_STEP_UP,
    compactProbes: true,
    groundSelect: { preferRampSurface: true }
  });

  return Boolean(hit?.pickedMesh && isRampSurface(hit.pickedMesh));
}

function findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, options = {}) {
  const moveDistance = movement.length();

  if (moveDistance <= 0) {
    return null;
  }

  const direction = movement.normalizeToNew();
  const lateralAxis = new BABYLON.Vector3(direction.z, 0, -direction.x).normalize();
  const probeDistances = options.probeDistances ?? STEP_PROBE_DISTANCES;
  const lateralOffsets = options.lateralOffsets
    ?? (options.tryLateralProbes ? STAIR_STEP_LATERAL_OFFSETS : [0]);

  for (const distance of probeDistances) {
    const probeDistance = Math.max(distance, moveDistance);

    for (const lateralOffset of lateralOffsets) {
      const lateral = lateralAxis.scale(lateralOffset);
      const probePosition = previousPosition.add(direction.scale(probeDistance)).add(lateral);
      const stepPose = getStepPoseAtPosition(BABYLON, scene, probePosition, groundMeshSet, previousPosition.y, options);

      if (!stepPose) {
        continue;
      }

      return {
        hit: stepPose.hit,
        eyeY: stepPose.eyeY,
        verticalDelta: stepPose.verticalDelta,
        probeDistance
      };
    }
  }

  return null;
}

function applyStepUp(BABYLON, camera, movement, stepPose) {
  const previousPosition = camera.position.clone();
  const desiredPosition = previousPosition.add(movement);

  camera.position.set(desiredPosition.x, stepPose.eyeY, desiredPosition.z);

  return {
    moved: true,
    reason: `step ${stepPose.verticalDelta.toFixed(2)}`,
    distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
    previousPosition,
    groundHit: stepPose.hit
  };
}

function tryMoveWithCollision(BABYLON, scene, camera, movement, collisionMeshSet, modelBounds, groundMeshSet, options = {}) {
  const previousPosition = camera.position.clone();
  const desiredPosition = previousPosition.add(movement);
  const canStepUp = options.allowStepUp !== false;
  const stairAssistMode = options.stairAssistMode ?? "none";
  const colDiscreteAssist = stairAssistMode === "colDiscrete";
  const locomotion = options.locomotion ?? getLocomotionSurfaceState(
    BABYLON,
    scene,
    previousPosition,
    groundMeshSet
  );
  const onColRamp = locomotion.onColRamp;
  const onColStair = locomotion.onColStair;
  const onRamp = locomotion.onRamp;
  const onStair = locomotion.onStair;
  const nearColRamp = options.nearColRamp ?? (
    !onColRamp
    && !onColStair
    && isNearColRampContext(BABYLON, scene, previousPosition, movement, groundMeshSet, {
      maxRampStepUp: options.maxRampStepUp,
      rampFloorBridgeHorizontal: options.rampFloorBridgeHorizontal
    })
  );
  const nearColStair = colDiscreteAssist
    && !onColStair
    && !onColRamp
    && isNearColDiscreteStairContext(BABYLON, scene, previousPosition, movement, groundMeshSet);
  const rampContext = onColRamp || onRamp || nearColRamp;
  const lightStairAssist = stairAssistMode === "light";
  const slopeContext = colDiscreteAssist && (onColStair || nearColStair);
  const stairContext = lightStairAssist && onStair;
  const assistContext = slopeContext || stairContext;
  const maxStairStepUp = options.maxStairStepUp ?? (colDiscreteAssist ? ANGJI_MAX_STAIR_STEP_UP : MAX_STAIR_STEP_UP);
  const maxRampStepUp = options.maxRampStepUp ?? MAX_RAMP_STEP_UP;
  const bridgeRampFloorGaps = options.bridgeRampFloorGaps === true;
  const rampFloorBridgeHorizontal = options.rampFloorBridgeHorizontal ?? RAMP_FLOOR_BRIDGE_HORIZONTAL;
  const activeMaxStepUp = assistContext ? maxStairStepUp : rampContext ? maxRampStepUp : MAX_STEP_UP;
  const useCompactGroundProbes = !bridgeRampFloorGaps;
  const groundSelect = {
    preferStairDescent: options.preferSlopeTransition
      && isOnBuildingFloorAt(BABYLON, scene, previousPosition, groundMeshSet),
    preferStairAscent: slopeContext && nearColStair,
    preferRampAscent: rampContext && canStepUp,
    preferRampSurface: rampContext
  };
  const groundPoseOptions = {
    maxStepUp: activeMaxStepUp,
    groundSelect,
    compactProbes: useCompactGroundProbes
  };
  const rampStepOptions = {
    maxVerticalDelta: maxRampStepUp,
    probeDistances: bridgeRampFloorGaps ? RAMP_BRIDGE_PROBE_DISTANCES : SHORT_STAIR_PROBE_DISTANCES,
    tryLateralProbes: true,
    lateralOffsets: bridgeRampFloorGaps ? RAMP_BRIDGE_LATERAL_OFFSETS : RAMP_STEP_LATERAL_OFFSETS,
    compactProbes: !bridgeRampFloorGaps,
    slopeFilter: "ramp"
  };
  const rampBridgeOptions = {
    maxRampStepUp,
    rampFloorBridgeHorizontal,
    probeDistances: RAMP_BRIDGE_PROBE_DISTANCES,
    lateralOffsets: RAMP_BRIDGE_LATERAL_OFFSETS
  };
  const stairStepOptions = {
    maxVerticalDelta: maxStairStepUp,
    probeDistances: colDiscreteAssist ? STEP_PROBE_DISTANCES : SHORT_STAIR_PROBE_DISTANCES,
    tryLateralProbes: colDiscreteAssist && nearColStair,
    compactProbes: useCompactGroundProbes,
    slopeFilter: "stair"
  };
  const resolveDestinationGround = (position, referenceEyeY) => {
    const groundPose = getGroundPoseAtPosition(
      BABYLON,
      scene,
      position,
      groundMeshSet,
      referenceEyeY,
      groundPoseOptions
    );

    if (assistContext || onColStair || rampContext || !groundPose) {
      return groundPose;
    }

    const centerPose = getCenterGroundPose(
      BABYLON,
      scene,
      position,
      groundMeshSet,
      referenceEyeY,
      { maxStepUp: activeMaxStepUp }
    );

    if (!centerPose) {
      return null;
    }

    if (Math.abs(centerPose.eyeY - groundPose.eyeY) <= GROUND_SNAP_TOLERANCE) {
      return groundPose;
    }

    return centerPose;
  };
  const rejectBlockedMove = (collisionHit, reason) => {
    if ((rampContext || bridgeRampFloorGaps) && canStepUp && collisionHit && isStairCollisionHit(collisionHit)) {
      if (bridgeRampFloorGaps) {
        const bridgePose = findColRampBridgeStepPose(
          BABYLON,
          scene,
          previousPosition,
          movement,
          groundMeshSet,
          rampBridgeOptions
        );

        if (bridgePose) {
          return applyStepUp(BABYLON, camera, movement, bridgePose);
        }
      }

      const rampStepPose = findStepUpPose(
        BABYLON,
        scene,
        previousPosition,
        movement,
        groundMeshSet,
        rampStepOptions
      );

      if (rampStepPose) {
        return applyStepUp(BABYLON, camera, movement, rampStepPose);
      }
    }

    const blocked = {
      moved: false,
      reason,
      distance: 0,
      previousPosition
    };
    const slideResult = tryWallSlideRecovery(
      BABYLON,
      scene,
      camera,
      movement,
      collisionHit,
      collisionMeshSet,
      modelBounds,
      groundMeshSet,
      options
    );

    return slideResult || blocked;
  };
  const initialCollisionHit = findBodyCollision(BABYLON, scene, previousPosition, movement, collisionMeshSet, modelBounds);
  const leadingStepPose = slopeContext && nearColStair && canStepUp
    ? findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, stairStepOptions)
    : null;

  if (leadingStepPose) {
    if (!initialCollisionHit || isLowStepCollision(initialCollisionHit) || isStairCollisionHit(initialCollisionHit)) {
      return applyStepUp(BABYLON, camera, movement, leadingStepPose);
    }

    return rejectBlockedMove(
      initialCollisionHit,
      `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "object"}`
    );
  }

  const groundPose = resolveDestinationGround(desiredPosition, previousPosition.y);

  if (!groundPose) {
    if (assistContext && canStepUp) {
      const stepPose = findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, stairStepOptions);

      if (stepPose) {
        return applyStepUp(BABYLON, camera, movement, stepPose);
      }
    }

    if (bridgeRampFloorGaps && canStepUp) {
      const bridgePose = findColRampBridgeStepPose(
        BABYLON,
        scene,
        previousPosition,
        movement,
        groundMeshSet,
        rampBridgeOptions
      );

      if (bridgePose) {
        return applyStepUp(BABYLON, camera, movement, bridgePose);
      }
    }

    if (rampContext && canStepUp) {
      const rampStepPose = findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, rampStepOptions);

      if (rampStepPose) {
        return applyStepUp(BABYLON, camera, movement, rampStepPose);
      }
    }

    if (!initialCollisionHit) {
      camera.position.set(desiredPosition.x, previousPosition.y, desiredPosition.z);
      return {
        moved: true,
        reason: "flat",
        distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
        previousPosition,
        losesSupport: !assistContext && !onColStair && !rampContext
      };
    }

    return rejectBlockedMove(
      initialCollisionHit,
      `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "object"}`
    );
  }

  const verticalDelta = groundPose.eyeY - previousPosition.y;
  const maxNormalStepUp = activeMaxStepUp;

  if (verticalDelta >= MIN_STEP_UP && verticalDelta <= maxNormalStepUp) {
    if (!canStepUp) {
      camera.position.set(desiredPosition.x, previousPosition.y, desiredPosition.z);

      return {
        moved: true,
        reason: "step wait",
        distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
        previousPosition
      };
    }

    if (initialCollisionHit && !isLowStepCollision(initialCollisionHit)) {
      return rejectBlockedMove(
        initialCollisionHit,
        `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "object"}`
      );
    }

    camera.position.set(desiredPosition.x, groundPose.eyeY, desiredPosition.z);

    return {
      moved: true,
      reason: `step ${verticalDelta.toFixed(2)}`,
      distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
      previousPosition,
      groundHit: groundPose.hit
    };
  }

  if (verticalDelta <= -MIN_STEP_DOWN && verticalDelta >= -MAX_STEP_DOWN) {
    camera.position.set(desiredPosition.x, groundPose.eyeY, desiredPosition.z);

    return {
      moved: true,
      reason: `stepDown ${Math.abs(verticalDelta).toFixed(2)}`,
      distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
      previousPosition,
      groundHit: groundPose.hit
    };
  }

  if (verticalDelta > maxNormalStepUp) {
    if (canStepUp) {
      if (bridgeRampFloorGaps) {
        const bridgePose = findColRampBridgeStepPose(
          BABYLON,
          scene,
          previousPosition,
          movement,
          groundMeshSet,
          rampBridgeOptions
        );

        if (bridgePose) {
          return applyStepUp(BABYLON, camera, movement, bridgePose);
        }
      }

      if (rampContext && verticalDelta <= maxRampStepUp) {
        const rampStepPose = findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, rampStepOptions);

        if (rampStepPose) {
          return applyStepUp(BABYLON, camera, movement, rampStepPose);
        }
      }

      if (verticalDelta <= maxStairStepUp) {
        const stepPose = findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, stairStepOptions);

        if (stepPose) {
          return applyStepUp(BABYLON, camera, movement, stepPose);
        }
      }
    }

    const aheadIsSlope = Boolean(
      groundPose?.hit?.pickedMesh && isSteppableSlopeSurface(groundPose.hit.pickedMesh)
    );

    if (initialCollisionHit || aheadIsSlope || assistContext) {
      const blockReason = `wall:${aheadIsSlope ? "stair" : initialCollisionHit?.pickedMesh?.name || initialCollisionHit?.pickedMesh?.id || "too high"}`;

      if (initialCollisionHit && !aheadIsSlope) {
        return rejectBlockedMove(initialCollisionHit, blockReason);
      }

      return {
        moved: false,
        reason: blockReason,
        distance: 0,
        previousPosition
      };
    }

    camera.position.set(desiredPosition.x, previousPosition.y, desiredPosition.z);

    return {
      moved: true,
      reason: "flat high-skip",
      distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
      previousPosition
    };
  }

  if (verticalDelta < -MAX_STEP_DOWN) {
    if (initialCollisionHit) {
      return rejectBlockedMove(
        initialCollisionHit,
        `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "drop"}`
      );
    }

    camera.position.set(desiredPosition.x, previousPosition.y, desiredPosition.z);

    return {
      moved: true,
      reason: "flat drop-skip",
      distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
      previousPosition,
      losesSupport: true
    };
  }

  const collisionHit = findBodyCollision(BABYLON, scene, previousPosition, movement, collisionMeshSet, modelBounds, {
    skipLowProbe: verticalDelta > 0.05
  });

  if (collisionHit) {
    const stepPose = canStepUp && assistContext
      ? findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, stairStepOptions)
      : null;

    if (stepPose && (isLowStepCollision(collisionHit) || isStairCollisionHit(collisionHit))) {
      return applyStepUp(BABYLON, camera, movement, stepPose);
    }

    return rejectBlockedMove(
      collisionHit,
      `wall:${collisionHit.pickedMesh?.name || collisionHit.pickedMesh?.id || "object"}`
    );
  }

  camera.position.set(desiredPosition.x, groundPose.eyeY, desiredPosition.z);

  return {
    moved: true,
    reason: verticalDelta > 0.05 ? `step ${verticalDelta.toFixed(2)}` : "-",
    distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
    previousPosition,
    groundHit: groundPose.hit
  };
}

function tryMoveWithCollisionSubsteps(BABYLON, scene, camera, movement, collisionMeshSet, modelBounds, groundMeshSet, options = {}) {
  const { onSubstep, substepSize, ...collisionOptions } = options;
  const totalDistance = movement.length();
  const stepLimit = typeof substepSize === "number" && substepSize > 0 ? substepSize : totalDistance;

  if (totalDistance <= stepLimit) {
    const stepResult = tryMoveWithCollision(
      BABYLON,
      scene,
      camera,
      movement,
      collisionMeshSet,
      modelBounds,
      groundMeshSet,
      collisionOptions
    );

    if (typeof onSubstep === "function") {
      onSubstep(stepResult);
    }

    return stepResult;
  }

  const direction = movement.normalizeToNew();
  const previousPosition = camera.position.clone();
  let movedDistance = 0;
  let remaining = totalDistance;
  let lastResult = {
    moved: false,
    reason: "-",
    distance: 0,
    previousPosition
  };

  while (remaining > 1e-5) {
    const stepDistance = Math.min(stepLimit, remaining);
    const stepMovement = direction.clone().scale(stepDistance);
    const stepResult = tryMoveWithCollision(
      BABYLON,
      scene,
      camera,
      stepMovement,
      collisionMeshSet,
      modelBounds,
      groundMeshSet,
      collisionOptions
    );

    if (typeof onSubstep === "function") {
      onSubstep(stepResult);
    }

    movedDistance += typeof stepResult.distance === "number" ? stepResult.distance : stepDistance;
    remaining -= stepDistance;
    lastResult = { ...stepResult, distance: movedDistance, previousPosition };

    if (!stepResult.moved) {
      lastResult.moved = movedDistance > 0.001;
      break;
    }
  }

  return lastResult;
}

function createTpsCamera(BABYLON, scene, sourceCamera) {
  const camera = new BABYLON.UniversalCamera("tpsCamera", sourceCamera.position.clone(), scene);
  camera.minZ = 0.03;
  camera.maxZ = 10000;
  camera.fov = BABYLON.Tools.ToRadians(72);
  camera.inputs.clear();
  return camera;
}

function createTourControls(BABYLON, scene, engine, orbitCamera, walkCamera, initialModelState, options = {}) {
  let activeGroundMeshes = initialModelState.walkableGroundMeshes;
  let activeCollisionMeshes = initialModelState.collisionMeshes;
  let groundMeshSet = new Set(activeGroundMeshes);
  let collisionMeshSet = new Set(activeCollisionMeshes);
  let localGroundMeshSet = groundMeshSet;
  let localCollisionMeshSet = collisionMeshSet;
  let projectileHitMeshSet = buildFireballHitMeshSet(initialModelState);
  let activeTreeMeshes = initialModelState.treeMeshes || [];
  let lastLocalMeshPosition = null;
  let lastTreeViewerPosition = null;
  let treeFacingFrameCounter = 0;
  let activeModelState = initialModelState;
  const keys = new Set();
  const fireballs = [];
  const inputDiagnostics = createInputDiagnostics();
  const tpsCamera = createTpsCamera(BABYLON, scene, walkCamera);
  let tpsSystem = null;
  let walkMode = false;
  let walkFrameLocomotion = null;
  let isGrounded = false;
  let verticalVelocity = 0;
  let stepTargetY = null;
  let stepTargetHit = null;
  let lastStableGroundPose = null;
  let isResettingTour = false;
  let lastFireballAt = -FIREBALL_SETTINGS.cooldownMs;
  let yaw = walkCamera.rotation.y;
  let pitch = walkCamera.rotation.x;
  let currentLabel = "orbit view";
  let lastTpsMoveBlocked = false;
  let pendingMouseDeltaX = 0;
  let pendingMouseDeltaY = 0;
  let pendingWheelDelta = 0;
  let guideLookPointerId = null;
  let guideLookPrevX = 0;
  let guideLookPrevY = 0;
  let lastTpsRuntimeState = null;
  let guestPlacementTool = null;
  let guestCharacterSystem = null;
  let npcInteractionSystem = null;
  let angjiGuideTourSystem = null;
  let guideManagerPanel = null;
  let npcGuestManagerPanel = null;
  let npcDisplayNameByGuestId = new Map();
  let jinjuOutdoorGuestSpawnToken = 0;
  let jinjuIndoorGuestSpawnToken = 0;
  let angjiOutdoorGuestSpawnToken = 0;
  let angjiIndoorGuestSpawnToken = 0;
  let jinjuIndoorGuestActivationStarted = false;
  let jinjuIndoorUpperGuestActivationStarted = false;
  let jinjuIndoorPreloadToken = 0;
  let jinjuIndoorPreloadPromise = null;
  let jinjuIndoorGuestSpawnAttempts = 0;
  let jinjuIndoorGuestSpawnRetryAfter = 0;
  let jinjuIndoorGuestScheduleRunCount = 0;
  let jinjuRooftopGuestActivationStarted = false;
  let jinjuRooftopGuestSpawnToken = 0;
  let jinjuRooftopGuestScheduleRunCount = 0;
  let jinjuIndoorGuestSpawnComplete = false;
  let jinjuRooftopPendingAfterIndoor = false;
  let jinjuRamp1FHasBeenContacted = false;
  let jinjuOutdoorDisposedForIndoor = false;
  let jinjuIndoorDisposedForRooftop = false;
  let jinjuWasOnExternalGroundFloor = false;
  let jinjuWasOnRamp1F = false;
  let jinjuWasOnRamp2F = false;
  const JINJU_INDOOR_GUEST_MAX_SPAWN_ATTEMPTS = 3;
  const JINJU_INDOOR_GUEST_SPAWN_RETRY_COOLDOWN_MS = 5000;
  const enemyState = {
    asset: null,
    loadPromise: null,
    spawnTimerId: null,
    spawnToken: 0,
    active: false,
    dying: false,
    defeated: false,
    hp: ENEMY_SETTINGS.maxHp,
    patrolTargetIndex: 1
  };

  window.tourControllerSettings = CONTROLLER_SETTINGS;
  window.tourInputDiagnostics = inputDiagnostics;

  tpsSystem = createTpsSystem(
    BABYLON,
    scene,
    tpsCamera,
    createAngjiTpsOptions(walkCamera, {
      getCollisionMask: () => (mesh) => (
        !isTourGuestMesh(mesh)
        && (
          localCollisionMeshSet.has(mesh)
          || Boolean(mesh.metadata?.angjiCameraBlockingSurface)
          || Boolean(mesh.metadata?.angjiCollisionLayer)
        )
      ),
      onLoadError: () => {
        setStatus("Character model could not be loaded. Walk mode will continue without avatar.");
      }
    })
  );

  guestPlacementTool = createGuestPlacementTool(BABYLON, scene, {
    eyeHeight: EYE_HEIGHT,
    resolveGroundPoint: (x, z, referenceEyeY) => {
      const pose = getLandingGroundPoseAtPosition(
        BABYLON,
        scene,
        new BABYLON.Vector3(x, referenceEyeY, z),
        localGroundMeshSet,
        referenceEyeY
      );

      if (!pose) {
        return null;
      }

      return new BABYLON.Vector3(x, pose.groundY, z);
    },
    onChange: (markers) => {
      renderGuestPlacementList(markers);
    }
  });
  renderGuestPlacementList([]);

  guestCharacterSystem = createGuestCharacterSystem(BABYLON, scene, {
    showDevLabels: isLocalDevEnvironment(),
    resolveGuestLabelText: (spawn) => {
      if (spawn?.id === ANGJI_GUIDE_SPAWN.id) {
        return spawn.devLabel || "GUIDE";
      }

      if (isAngjiGuestId(spawn?.id)) {
        return npcDisplayNameByGuestId.get(spawn.id) || getAngjiGuestNumberLabel(spawn.id);
      }

      return spawn?.devLabel || "";
    },
    shouldAttachGuestLabel: (spawn) => {
      if (spawn?.id === ANGJI_GUIDE_SPAWN.id) {
        return true;
      }

      if (isAngjiGuestId(spawn?.id)) {
        return true;
      }

      return isLocalDevEnvironment() && Boolean(spawn?.devLabel);
    },
    isGuestLabelVisible: (guest) => {
      if (guest?.spawn?.id === ANGJI_GUIDE_SPAWN.id) {
        return !isAngjiNightGuestMode() && guest.root?.isEnabled?.() !== false;
      }

      if (isAngjiGuestId(guest?.spawn?.id)) {
        return !isAngjiNightGuestMode();
      }

      return isLocalDevEnvironment();
    },
    isGuestLabelOccluded: (guest) => {
      if (guest?.spawn?.id === ANGJI_GUIDE_SPAWN.id) {
        return false;
      }

      const camera = walkMode ? tpsCamera : scene.activeCamera;

      return isGuestDevLabelOccluded(
        BABYLON,
        scene,
        guest,
        camera,
        collisionMeshSet,
        activeCollisionMeshes
      );
    },
    getGeometryMeshes,
    getRootNodes,
    updateWorldMatrices,
    getFullBounds,
    softenModelMaterialReflections,
    targetHeight: 1.75,
    getPlayerPosition: () => {
      if (!walkMode) {
        return null;
      }

      const visualPosition = tpsSystem?.getCharacter?.()?.getVisualPosition?.();

      if (visualPosition) {
        return visualPosition;
      }

      const root = tpsSystem?.getCharacter?.()?.getRoot?.();

      if (root?.position) {
        return root.position;
      }

      return walkCamera?.position || null;
    },
    getCollisionMeshes: () => localCollisionMeshSet.size > 0 ? localCollisionMeshSet : collisionMeshSet,
    canGuestMoveHorizontal: (fromFeetPosition, dirX, dirZ, stepDistance) => {
      if (!(stepDistance > 0.001)) {
        return true;
      }

      const collisionSet = localCollisionMeshSet.size > 0 ? localCollisionMeshSet : collisionMeshSet;

      if (!collisionSet.size) {
        return true;
      }

      const movement = new BABYLON.Vector3(dirX, 0, dirZ).normalize().scale(stepDistance);
      const probePosition = new BABYLON.Vector3(
        fromFeetPosition.x,
        fromFeetPosition.y + EYE_HEIGHT,
        fromFeetPosition.z
      );
      const modelBounds = activeModelState?.model?.bounds;
      const hit = findBodyCollision(
        BABYLON,
        scene,
        probePosition,
        movement,
        collisionSet,
        modelBounds
      );

      if (!hit) {
        return true;
      }

      // Allow shallow ground/step contacts; block walls and furniture blockers.
      if (isLowStepCollision(hit) || isStairCollisionHit(hit)) {
        return true;
      }

      return false;
    },
    hasGuestLineOfSight: (fromFeetPosition, toFeetPosition) => {
      const collisionSet = localCollisionMeshSet.size > 0 ? localCollisionMeshSet : collisionMeshSet;

      if (!collisionSet.size) {
        return true;
      }

      const origin = new BABYLON.Vector3(
        fromFeetPosition.x,
        fromFeetPosition.y + 1.35,
        fromFeetPosition.z
      );
      const target = new BABYLON.Vector3(
        toFeetPosition.x,
        (toFeetPosition.y || fromFeetPosition.y) + 1.35,
        toFeetPosition.z
      );
      const delta = target.subtract(origin);
      const distance = delta.length();

      if (distance <= 0.05) {
        return true;
      }

      const ray = new BABYLON.Ray(origin, delta.normalize(), Math.max(0.05, distance - 0.2));
      const hits = getRayHits(scene, ray, (mesh) => isRayPickableCollisionMesh(mesh, collisionSet));
      const blockingHit = hits.map(getBlockingBodyHit).find(Boolean);
      return !blockingHit;
    },
    resolveSpawnPosition: (spawn) => {
      const guestModelState = getActiveGuestModelState();

      if (!guestModelState) {
        return null;
      }

      if (isAngjiProjectConfig(guestModelState.config)) {
        const floorMeshState = getAngjiGuestFloorMeshState();

        return resolveAngjiGuestSpawn(
          BABYLON,
          scene,
          spawn,
          floorMeshState.angjiBuildingFloor1Meshes,
          floorMeshState.angjiExternalFloorMeshes
        );
      }

      if (isJinjuProjectConfig(guestModelState.config)) {
        return resolveJinjuGuestSpawn(BABYLON, scene, spawn, guestModelState);
      }

      return null;
    },
    resolveGuestFloorY: (x, z, fallbackY) => {
      const guestModelState = getActiveGuestModelState();

      if (!guestModelState) {
        return fallbackY;
      }

      if (isJinjuProjectConfig(guestModelState.config)) {
        const floorMeshes = getJinjuGuestFloorMeshesForLevel(guestModelState, 1);

        return pickGuestFloorYFromMeshes(BABYLON, scene, x, z, floorMeshes, fallbackY, fallbackY + 2)
          ?? fallbackY;
      }

      if (!isAngjiProjectConfig(guestModelState.config)) {
        return fallbackY;
      }

      const floorMeshState = getAngjiGuestFloorMeshState();

      return pickAngjiGuestFloorY(
        BABYLON,
        scene,
        x,
        z,
        floorMeshState.angjiBuildingFloor1Meshes,
        floorMeshState.angjiExternalFloorMeshes,
        { fallbackY }
      ) ?? fallbackY;
    }
  });
  console.info(`[angji-guests] guest config ${ANGJI_GUEST_CONFIG_VERSION}`);
  console.info(`[jinju-guests] outdoor config ${JINJU_GUEST_CONFIG_VERSION}`);
  console.info(`[jinju-guests] indoor config ${JINJU_INDOOR_GUEST_CONFIG_VERSION}`);
  console.info(`[jinju-guests] rooftop config ${JINJU_ROOFTOP_GUEST_CONFIG_VERSION}`);

  function applyNpcDisplayNames(displayNameMap) {
    npcDisplayNameByGuestId = displayNameMap instanceof Map
      ? displayNameMap
      : new Map(displayNameMap || []);
    guestCharacterSystem?.applyGuestLabelTexts?.();
  }

  npcInteractionSystem = createNpcInteractionSystem(BABYLON, scene, {
    configs: [],
    eyeHeight: EYE_HEIGHT,
    getWalkMode: () => (
      walkMode
      && isAngjiProjectConfig(activeModelState.config)
      && !isAngjiNightGuestMode()
    ),
    getPlayerEyePosition: () => {
      if (!walkMode) {
        return null;
      }

      const visualPosition = tpsSystem?.getCharacter?.()?.getVisualPosition?.();

      if (visualPosition) {
        return new BABYLON.Vector3(
          visualPosition.x,
          visualPosition.y + EYE_HEIGHT,
          visualPosition.z
        );
      }

      return walkCamera.position;
    },
    getPlayerBody: () => (walkMode ? walkCamera : null),
    getPlayerCharacter: () => tpsSystem?.getCharacter?.() || null,
    getTpsSystem: () => tpsSystem,
    getGuestById: (guestId) => (
      guestCharacterSystem?.getGuests?.()?.find((guest) => guest?.spawn?.id === guestId) || null
    ),
    getCollisionMeshes: () => (
      localCollisionMeshSet.size > 0 ? localCollisionMeshSet : collisionMeshSet
    ),
    resolveGroundEyeY: (position) => {
      const groundPose = getLandingGroundPoseAtPosition(
        BABYLON,
        scene,
        position,
        localGroundMeshSet,
        position.y,
        { compactProbes: true }
      );

      return groundPose?.eyeY ?? position.y;
    },
    getActiveCamera: () => (walkMode ? tpsCamera : scene.activeCamera),
    onStatus: (message) => {
      if (typeof message === "string" && message) {
        setStatus(message);
      }
    }
  });

  angjiGuideTourSystem = createAngjiGuideTourSystem(BABYLON, scene, {
    eyeHeight: EYE_HEIGHT,
    getWalkMode: () => (
      walkMode
      && isAngjiProjectConfig(activeModelState.config)
      && !isAngjiNightGuestMode()
    ),
    getPlayerBody: () => (walkMode ? walkCamera : null),
    getPlayerCharacter: () => tpsSystem?.getCharacter?.() || null,
    getTpsSystem: () => tpsSystem,
    getGuestCharacterSystem: () => guestCharacterSystem,
    getActiveCamera: () => (walkMode ? tpsCamera : scene.activeCamera),
    getWalkCamera: () => (walkMode ? tpsCamera : walkCamera),
    getOrbitCamera: () => orbitCamera,
    getGuideFloorY: (x, z, fallbackY) => {
      const floorMeshState = getAngjiGuestFloorMeshState();

      return pickAngjiGuestFloorY(
        BABYLON,
        scene,
        x,
        z,
        floorMeshState.angjiBuildingFloor1Meshes,
        floorMeshState.angjiExternalFloorMeshes,
        { fallbackY, preferExternal: true, maxDelta: 6 }
      ) ?? fallbackY;
    },
    resolveGroundEyeY: (position) => {
      const floorMeshState = getAngjiGuestFloorMeshState();
      const fallbackGroundY = position.y - EYE_HEIGHT;
      const groundY = pickAngjiGuestFloorY(
        BABYLON,
        scene,
        position.x,
        position.z,
        floorMeshState.angjiBuildingFloor1Meshes,
        floorMeshState.angjiExternalFloorMeshes,
        { fallbackY: fallbackGroundY, preferExternal: true, maxDelta: 6 }
      );

      if (Number.isFinite(groundY)) {
        return groundY + EYE_HEIGHT;
      }

      const groundPose = getLandingGroundPoseAtPosition(
        BABYLON,
        scene,
        position,
        localGroundMeshSet,
        position.y,
        { compactProbes: true }
      );

      return groundPose?.eyeY ?? position.y;
    },
    snapPlayerGroundAt: (eyePosition, options = {}) => {
      if (!walkMode || !walkCamera || !eyePosition) {
        return;
      }

      let eyeY = eyePosition.y;

      if (options.lockConfiguredEyeY === true) {
        eyeY = eyePosition.y;
      } else {
        const floorMeshState = getAngjiGuestFloorMeshState();
        const fallbackGroundY = eyePosition.y - EYE_HEIGHT;
        const groundY = pickAngjiGuestFloorY(
          BABYLON,
          scene,
          eyePosition.x,
          eyePosition.z,
          floorMeshState.angjiBuildingFloor1Meshes,
          floorMeshState.angjiExternalFloorMeshes,
          { fallbackY: fallbackGroundY, preferExternal: true, maxDelta: 6 }
        );
        eyeY = Number.isFinite(groundY) ? groundY + EYE_HEIGHT : eyePosition.y;
      }

      walkCamera.position.x = eyePosition.x;
      walkCamera.position.y = eyeY;
      walkCamera.position.z = eyePosition.z;
      verticalVelocity = 0;
      isGrounded = true;

      const character = tpsSystem?.getCharacter?.();
      character?.syncFromPlayerEye?.(walkCamera.position);
      character?.updateVisual?.(0, false);

      const groundPose = getLandingGroundPoseAtPosition(
        BABYLON,
        scene,
        walkCamera.position,
        localGroundMeshSet,
        eyeY,
        { compactProbes: true }
      );

      if (groundPose?.hit) {
        rememberStableGround(groundPose.hit, eyeY);
      }
    },
    restoreTourEntryState: () => {
      if (!walkMode) {
        return;
      }

      orbitCamera.detachControl?.();
      scene.activeCamera = tpsCamera;
      resetWalkCameraToTourStart();
    },
    getIsNightMode: () => isAngjiNightGuestMode(),
    onStatus: (message) => {
      if (typeof message === "string" && message) {
        setStatus(message);
      }
    },
    onTourActiveChange: () => {
      updateModeSwitchButtons();
    }
  });

  if (isAngjiProjectConfig(activeModelState.config)) {
    void angjiGuideTourSystem.init().catch((error) => {
      console.error("[angji-guide-tour] init failed", error);
    });
  }

  void loadEffectiveGuestBundle(undefined, getAngjiModelGuestEntriesSorted())
    .then((bundle) => {
      applyNpcDisplayNames(getDisplayNameMap(bundle));
      const configs = resolveInteractionConfigs(bundle, loadConversationProgress());
      npcInteractionSystem?.setConfigs?.(configs);
      console.info(`[npc-interaction] loaded ${configs.length} guest configs`);
    })
    .catch((error) => {
      console.error("[npc-interaction] config load failed", error);
    });

  if (isLocalDevEnvironment()) {
    npcGuestManagerPanel = createNpcGuestManagerPanel({
      getInteractionSystem: () => npcInteractionSystem,
      getModelGuestEntries: () => getAngjiModelGuestEntriesSorted(),
      canTestDialog: () => (
        walkMode
        && isAngjiProjectConfig(activeModelState.config)
        && !isAngjiNightGuestMode()
      ),
      onDisplayNamesChanged: (displayNameMap) => {
        applyNpcDisplayNames(displayNameMap);
      },
      onOpenChange: (isOpen) => {
        clearMovementKeys();
        tpsSystem?.getInputController?.()?.clear?.();
        pendingMouseDeltaX = 0;
        pendingMouseDeltaY = 0;
        pendingWheelDelta = 0;

        if (isOpen && document.pointerLockElement === canvas) {
          document.exitPointerLock?.();
        }
      },
      onStatus: (message) => {
        if (typeof message === "string" && message) {
          setStatus(message);
        }
      }
    });
    void npcGuestManagerPanel.load().catch((error) => {
      console.error("[npc-manager] load failed", error);
    });

    const npcManagerToggle = document.getElementById("npcGuestManagerButton");
    npcManagerToggle?.addEventListener("click", () => {
      npcGuestManagerPanel?.toggle?.();
    });

    guideManagerPanel = createAngjiGuideManagerPanel({
      getGuideTourSystem: () => angjiGuideTourSystem,
      canPreview: () => (
        walkMode
        && isAngjiProjectConfig(activeModelState.config)
        && !isAngjiNightGuestMode()
      ),
      onOpenChange: (isOpen) => {
        clearMovementKeys();
        tpsSystem?.getInputController?.()?.clear?.();
        pendingMouseDeltaX = 0;
        pendingMouseDeltaY = 0;
        pendingWheelDelta = 0;

        if (isOpen && document.pointerLockElement === canvas) {
          document.exitPointerLock?.();
        }
      },
      onStatus: (message) => {
        if (typeof message === "string" && message) {
          setStatus(message);
        }
      }
    });
    void guideManagerPanel.load().catch((error) => {
      console.error("[guide-manager] load failed", error);
    });

    const guideManagerToggle = document.getElementById("guideManagerButton");
    guideManagerToggle?.addEventListener("click", () => {
      guideManagerPanel?.toggle?.();
    });
  }

  function isGuideManagerBlockingInput() {
    return Boolean(guideManagerPanel?.isOpen?.());
  }

  function isNpcGuestManagerBlockingInput() {
    return Boolean(npcGuestManagerPanel?.isOpen?.());
  }

  function isLocalDevPanelBlockingInput() {
    return isNpcGuestManagerBlockingInput() || isGuideManagerBlockingInput();
  }

  function isGuideFreeLookActive() {
    return (
      walkMode
      && !isLocalDevPanelBlockingInput()
      && angjiGuideTourSystem?.allowsFreeLook?.()
    );
  }

  function resetGuideLookDrag() {
    if (guideLookPointerId !== null) {
      canvas.releasePointerCapture?.(guideLookPointerId);
    }

    guideLookPointerId = null;
  }

  function preventGuideMiddleMouseDefault(event) {
    if (event.button !== 1 || !isGuideFreeLookActive()) {
      return;
    }

    event.preventDefault();
  }

  function startGuideLookDrag(event) {
    if (!isGuideFreeLookActive() || event.button !== 1) {
      return;
    }

    if (document.pointerLockElement === canvas) {
      document.exitPointerLock?.();
    }

    guideLookPointerId = event.pointerId;
    guideLookPrevX = event.clientX;
    guideLookPrevY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function moveGuideLookDrag(event) {
    if (guideLookPointerId === null || event.pointerId !== guideLookPointerId) {
      return;
    }

    if (!isGuideFreeLookActive()) {
      stopGuideLookDrag(event);
      return;
    }

    const deltaX = event.clientX - guideLookPrevX;
    const deltaY = event.clientY - guideLookPrevY;
    guideLookPrevX = event.clientX;
    guideLookPrevY = event.clientY;

    if (deltaX !== 0 || deltaY !== 0) {
      angjiGuideTourSystem?.applyLookInput?.(deltaX, deltaY);
    }

    event.preventDefault();
  }

  function stopGuideLookDrag(event) {
    if (guideLookPointerId === null) {
      return;
    }

    if (event?.pointerId != null && event.pointerId !== guideLookPointerId) {
      return;
    }

    canvas.releasePointerCapture?.(event.pointerId);
    guideLookPointerId = null;

    if (event) {
      event.preventDefault();
    }
  }

  function isGuideTourBlockingInput() {
    return Boolean(angjiGuideTourSystem?.blocksPlayerControl?.());
  }

  function isDialogSystemBlockingInput() {
    return isGuideTourBlockingInput() || Boolean(npcInteractionSystem?.blocksPlayerControl?.());
  }

  preloadProjectGuests();

  function getActiveGuestModelState() {
    return activeModelState.tourModelState || activeModelState;
  }

  function getAngjiGuestModelState() {
    return activeModelState.tourModelState || activeModelState;
  }

  function getAngjiGuestFloorMeshState() {
    if (!walkMode && activeModelState.tourModelState) {
      return activeModelState;
    }

    return getAngjiGuestModelState();
  }

  function preloadAngjiOrbitGuests() {
    if (!isAngjiProjectConfig(activeModelState.config)) {
      return;
    }

    const run = () => {
      const nightModeGuests = isAngjiNightGuestMode();
      void guestCharacterSystem?.preload(
        mapAngjiGuestSpawnsForMode(getAngjiOutdoorGuestSpawns(), nightModeGuests),
        { parallel: true, showOnLoad: false }
      );
      void guestCharacterSystem?.preload(
        mapAngjiGuestSpawnsForMode(getAngjiSimultaneousGuestSpawns(), nightModeGuests),
        { parallel: true, showOnLoad: false }
      );
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 4000 });
      return;
    }

    window.setTimeout(run, 2000);
  }

  function waitForIdle(timeoutMs = 3000) {
    return new Promise((resolve) => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => resolve(), { timeout: timeoutMs });
        return;
      }

      window.setTimeout(resolve, 200);
    });
  }

  function resetJinjuIndoorGuestLoadingState() {
    jinjuIndoorGuestActivationStarted = false;
    jinjuIndoorUpperGuestActivationStarted = false;
    jinjuIndoorGuestSpawnAttempts = 0;
    jinjuIndoorGuestSpawnRetryAfter = 0;
    jinjuIndoorGuestScheduleRunCount = 0;
    jinjuIndoorPreloadToken += 1;
    jinjuIndoorGuestSpawnToken += 1;
    jinjuIndoorPreloadPromise = null;
    jinjuRooftopGuestActivationStarted = false;
    jinjuRooftopGuestScheduleRunCount = 0;
    jinjuRooftopGuestSpawnToken += 1;
    jinjuIndoorGuestSpawnComplete = false;
    jinjuRooftopPendingAfterIndoor = false;
    jinjuRamp1FHasBeenContacted = false;
    jinjuOutdoorDisposedForIndoor = false;
    jinjuIndoorDisposedForRooftop = false;
    jinjuWasOnExternalGroundFloor = false;
    jinjuWasOnRamp1F = false;
    jinjuWasOnRamp2F = false;
    resetJinjuIndoorGuestSession?.();
    resetJinjuRooftopGuestSession?.();
  }

  function resetJinjuGuestSpawnStateForOrbit() {
    jinjuOutdoorGuestSpawnToken += 1;
    guestCharacterSystem?.disposeGuests?.({
      onlyIds: [...getJinjuIndoorGuestIds(), ...getJinjuRooftopGuestIds()]
    });
    resetJinjuIndoorGuestLoadingState();
  }

  function resetJinjuTourGuestTriggerState() {
    jinjuRamp1FHasBeenContacted = false;
    jinjuOutdoorDisposedForIndoor = false;
    jinjuIndoorDisposedForRooftop = false;
    jinjuIndoorGuestSpawnComplete = false;
    jinjuRooftopPendingAfterIndoor = false;
    jinjuWasOnExternalGroundFloor = false;
    jinjuWasOnRamp1F = false;
    jinjuWasOnRamp2F = false;
  }

  function getGuestProjectKey(config) {
    if (isAngjiProjectConfig(config)) {
      return "angji";
    }

    if (isJinjuProjectConfig(config)) {
      return "jinju";
    }

    return null;
  }

  function resetGuestProjectOnSwitch(previousConfig, nextConfig) {
    const previousKey = getGuestProjectKey(previousConfig);
    const nextKey = getGuestProjectKey(nextConfig);

    if (!previousKey || previousKey === nextKey) {
      return;
    }

    if (previousKey === "jinju") {
      resetJinjuGuestSession();
      resetJinjuIndoorGuestSession();
      resetJinjuIndoorGuestLoadingState();
      jinjuOutdoorGuestSpawnToken += 1;
      guestCharacterSystem?.disposeGuests?.({ onlyIds: getJinjuAllGuestIds() });
      console.info("[guests] cleared Jinju guests after project switch");
    } else if (previousKey === "angji") {
      angjiOutdoorGuestSpawnToken += 1;
      angjiIndoorGuestSpawnToken += 1;
      guestCharacterSystem?.disposeGuests?.({ onlyIds: getAngjiAllGuestIds() });
      console.info("[guests] cleared Angji guests after project switch");
    }

    if (nextKey === "jinju") {
      resetJinjuGuestSession();
      resetJinjuIndoorGuestSession();
      resetJinjuIndoorGuestLoadingState();
      jinjuOutdoorGuestSpawnToken += 1;
    }
  }

  async function preloadJinjuIndoorGuestsInBackground() {
    // Disabled: background preload stacked 6 skinned GLBs on top of tour model + TPS and caused tab OOM/crash.
    // Indoor guests load only via scheduleJinjuIndoorGuestSpawn() after ramp 1F contact.
    return;
  }

  function meshMatchesJinjuIndoorRampPrefix(mesh, prefixes) {
    if (!mesh) {
      return false;
    }

    return getNormalizedMaterialNames(mesh).some((name) => (
      angjiMaterialNameMatchesPrefix(name, prefixes)
    ));
  }

  function isJinjuIndoorRamp1FMesh(mesh) {
    if (!mesh) {
      return false;
    }

    if (mesh.metadata?.angjiRampSurface && getAngjiRampFloorLevel(mesh) === 1) {
      return true;
    }

    return meshMatchesJinjuIndoorRampPrefix(mesh, JINJU_INDOOR_RAMP_1F_PREFIXES);
  }

  function isJinjuIndoorRamp2FMesh(mesh) {
    if (!mesh) {
      return false;
    }

    if (mesh.metadata?.angjiRampSurface && getAngjiRampFloorLevel(mesh) === 2) {
      return true;
    }

    return meshMatchesJinjuIndoorRampPrefix(mesh, JINJU_INDOOR_RAMP_2F_PREFIXES);
  }

  function getJinjuIndoorRampContactMesh(BABYLON, scene, position, groundMeshSet, isRampMesh) {
    const locomotion = getWalkLocomotionState();

    if (locomotion.onColRamp && isRampMesh(locomotion.hit?.pickedMesh)) {
      return locomotion.hit.pickedMesh;
    }

    const candidateMeshes = [
      locomotion.hit?.pickedMesh,
      stepTargetHit?.pickedMesh,
      lastStableGroundPose?.hit?.pickedMesh
    ];

    for (const mesh of candidateMeshes) {
      if (isRampMesh(mesh)) {
        return mesh;
      }
    }

    const groundHit = findGroundHit(BABYLON, scene, position, groundMeshSet, {
      referenceEyeY: position.y,
      maxStepUp: MAX_RAMP_STEP_UP,
      compactProbes: true,
      groundSelect: { preferRampSurface: true }
    });

    if (isRampMesh(groundHit?.pickedMesh)) {
      return groundHit.pickedMesh;
    }

    const eyeDownRay = new BABYLON.Ray(
      position.clone(),
      BABYLON.Vector3.Down(),
      EYE_HEIGHT + 0.75
    );
    const eyeDownHit = scene.pickWithRay(
      eyeDownRay,
      (mesh) => groundMeshSet.has(mesh)
        && mesh.isPickable !== false
        && mesh.isEnabled()
        && !isTourGuestMesh(mesh)
    );

    if (isRampMesh(eyeDownHit?.pickedMesh)) {
      return eyeDownHit.pickedMesh;
    }

    return null;
  }

  function isJinjuPlayerContactingRamp1F() {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config)) {
      return false;
    }

    return Boolean(
      getJinjuIndoorRampContactMesh(
        BABYLON,
        scene,
        walkCamera.position,
        localGroundMeshSet,
        isJinjuIndoorRamp1FMesh
      )
    );
  }

  function isJinjuPlayerContactingRamp2F() {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config)) {
      return false;
    }

    return Boolean(
      getJinjuIndoorRampContactMesh(
        BABYLON,
        scene,
        walkCamera.position,
        localGroundMeshSet,
        isJinjuIndoorRamp2FMesh
      )
    );
  }

  function isJinjuExternalGroundFloorMesh(mesh) {
    if (!mesh) {
      return false;
    }

    if (mesh.metadata?.angjiExternalFloorSurface) {
      return true;
    }

    return getNormalizedMaterialNames(mesh).some((name) => (
      angjiMaterialNameMatchesPrefix(name, ANGJI_EXTERNAL_FLOOR_PREFIXES)
    ));
  }

  function getJinjuPlayerGroundContactMesh(isSurfaceMesh) {
    const locomotion = getWalkLocomotionState();

    if (locomotion.onColRamp && isSurfaceMesh(locomotion.hit?.pickedMesh)) {
      return locomotion.hit.pickedMesh;
    }

    const candidateMeshes = [
      locomotion.hit?.pickedMesh,
      stepTargetHit?.pickedMesh,
      lastStableGroundPose?.hit?.pickedMesh
    ];

    for (const mesh of candidateMeshes) {
      if (isSurfaceMesh(mesh)) {
        return mesh;
      }
    }

    const groundHit = findGroundHit(BABYLON, scene, walkCamera.position, localGroundMeshSet, {
      referenceEyeY: walkCamera.position.y,
      maxStepUp: MAX_RAMP_STEP_UP,
      compactProbes: true
    });

    if (isSurfaceMesh(groundHit?.pickedMesh)) {
      return groundHit.pickedMesh;
    }

    const eyeDownRay = new BABYLON.Ray(
      walkCamera.position.clone(),
      BABYLON.Vector3.Down(),
      EYE_HEIGHT + 0.75
    );
    const eyeDownHit = scene.pickWithRay(
      eyeDownRay,
      (mesh) => localGroundMeshSet.has(mesh)
        && mesh.isPickable !== false
        && mesh.isEnabled()
        && !isTourGuestMesh(mesh)
    );

    if (isSurfaceMesh(eyeDownHit?.pickedMesh)) {
      return eyeDownHit.pickedMesh;
    }

    return null;
  }

  function isJinjuPlayerOnExternalGroundFloor() {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config)) {
      return false;
    }

    const contactMesh = getJinjuPlayerGroundContactMesh((mesh) => (
      isJinjuExternalGroundFloorMesh(mesh)
      && !isJinjuIndoorRamp1FMesh(mesh)
      && !isJinjuIndoorRamp2FMesh(mesh)
    ));

    return Boolean(contactMesh);
  }

  function hasAnyJinjuIndoorGuests() {
    return getJinjuIndoorGuestIds().some((guestId) => guestCharacterSystem?.isSpawned?.(guestId));
  }

  function hasAnyJinjuRooftopGuests() {
    return getJinjuRooftopGuestIds().some((guestId) => guestCharacterSystem?.isSpawned?.(guestId));
  }

  function getJinjuRooftopMarkFromSpawnId(spawnId) {
    return Number(String(spawnId).replace("Jinju-Rooftop-Mark-", ""));
  }

  function cancelJinjuIndoorGuestSpawn(reason) {
    jinjuIndoorGuestSpawnToken += 1;
    jinjuIndoorGuestActivationStarted = false;
    jinjuIndoorGuestSpawnComplete = false;
    guestCharacterSystem?.disposeGuests?.({ onlyIds: getJinjuIndoorGuestIds() });
    console.info(`[jinju-indoor-guest] cancelled -> ${reason}`);
  }

  function cancelJinjuRooftopGuestSpawn(reason) {
    jinjuRooftopGuestSpawnToken += 1;
    jinjuRooftopGuestActivationStarted = false;
    guestCharacterSystem?.disposeGuests?.({ onlyIds: getJinjuRooftopGuestIds() });
    console.info(`[jinju-rooftop-guest] cancelled -> ${reason}`);
  }

  function disposeJinjuIndoorGuestsForRooftop() {
    if (jinjuIndoorDisposedForRooftop) {
      return;
    }

    if (!jinjuIndoorGuestSpawnComplete) {
      console.info("[jinju-rooftop-guest] skip indoor dispose until indoor spawn complete");
      return;
    }

    guestCharacterSystem?.disposeGuests?.({ onlyIds: getJinjuIndoorGuestIds() });
    jinjuIndoorDisposedForRooftop = true;
    console.info("[jinju-rooftop-guest] indoor guests disposed after R10 reveal");
  }

  function maybeStartJinjuRooftopGuestSpawn(reason) {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config)) {
      return false;
    }

    if (!jinjuIndoorGuestSpawnComplete) {
      jinjuRooftopPendingAfterIndoor = true;
      console.info(`[jinju-rooftop-guest] deferred (${reason}) until indoor spawn complete`);
      return false;
    }

    const rooftopStuck = jinjuRooftopGuestActivationStarted && !hasAnyJinjuRooftopGuests();

    if (jinjuRooftopGuestActivationStarted && !rooftopStuck) {
      return false;
    }

    if (rooftopStuck) {
      console.warn(`[jinju-rooftop-guest] retrying stuck activation (${reason})`);
      jinjuRooftopGuestActivationStarted = false;
    }

    jinjuRooftopPendingAfterIndoor = false;
    jinjuRooftopGuestActivationStarted = true;
    console.info(`[jinju-rooftop-guest] ramp 2F contact -> starting rooftop guest spawn (${reason})`);
    void scheduleJinjuRooftopGuestSpawn();
    return true;
  }

  function flushPendingJinjuRooftopGuestSpawn(reason = "indoor spawn complete") {
    if (!jinjuRooftopPendingAfterIndoor && !isJinjuPlayerContactingRamp2F()) {
      return;
    }

    maybeStartJinjuRooftopGuestSpawn(reason);
  }

  function disposeJinjuOutdoorGuestsForIndoor() {
    if (jinjuOutdoorDisposedForIndoor) {
      return;
    }

    guestCharacterSystem?.disposeGuests?.({ onlyIds: getJinjuOutdoorGuestIds() });
    jinjuOutdoorDisposedForIndoor = true;
    console.info("[jinju-indoor-guest] outdoor guests disposed after indoor spawn complete");
  }

  function restoreJinjuIndoorGuestsAfterRooftop(reason = "restore") {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config) || !guestCharacterSystem) {
      return;
    }

    if (!jinjuIndoorDisposedForRooftop) {
      const spawnedIndoorIds = getJinjuIndoorGuestIds().filter((guestId) => (
        guestCharacterSystem.isSpawned(guestId)
      ));

      if (spawnedIndoorIds.length) {
        guestCharacterSystem.revealGuests(spawnedIndoorIds);
      }

      return;
    }

    jinjuIndoorDisposedForRooftop = false;
    jinjuIndoorGuestActivationStarted = true;
    console.info(`[jinju-indoor-guest] restoring after rooftop (${reason})`);
    void scheduleJinjuIndoorGuestSpawn();
  }

  function ensureJinjuOutdoorGuestsVisibleInWalk(reason = "restore") {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config) || !guestCharacterSystem) {
      return;
    }

    const outdoorIds = getJinjuOutdoorGuestIds();
    const missingOutdoor = outdoorIds.some((guestId) => !guestCharacterSystem.isSpawned(guestId));

    if (!missingOutdoor) {
      revealJinjuOutdoorGuestsIfSpawned();
      return;
    }

    if (jinjuWalkOutdoorRestoreInFlight) {
      return;
    }

    jinjuWalkOutdoorRestoreInFlight = true;
    console.info(`[jinju-outdoor-guest] restoring outdoor guests (${reason})`);
    void scheduleJinjuOutdoorGuestSpawn({ allowInWalk: true }).finally(() => {
      jinjuWalkOutdoorRestoreInFlight = false;
      jinjuOutdoorDisposedForIndoor = false;
    });
  }

  function updateJinjuGuestFloorLifecycle() {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config)) {
      jinjuWasOnExternalGroundFloor = false;
      jinjuWasOnRamp1F = false;
      jinjuWasOnRamp2F = false;
      return;
    }

    const onRamp1F = isJinjuPlayerContactingRamp1F();
    const onRamp2F = isJinjuPlayerContactingRamp2F();
    const onExternalFloor = isJinjuPlayerOnExternalGroundFloor();

    if (onRamp1F && !jinjuWasOnRamp1F) {
      if (jinjuRooftopGuestActivationStarted && !jinjuIndoorDisposedForRooftop) {
        cancelJinjuRooftopGuestSpawn("ramp 1F during rooftop spawn before R10");
      } else if (
        jinjuIndoorGuestSpawnComplete
        && (hasAnyJinjuRooftopGuests() || jinjuRooftopGuestActivationStarted)
      ) {
        cancelJinjuRooftopGuestSpawn("ramp 1F descent -> indoor spawn complete, clearing rooftop");
        restoreJinjuIndoorGuestsAfterRooftop("ramp 1F descent");
      } else if (!jinjuIndoorGuestActivationStarted) {
        jinjuRamp1FHasBeenContacted = true;
        jinjuIndoorGuestActivationStarted = true;
        console.info("[jinju-indoor-guest] ramp 1F contact -> starting indoor guest spawn");
        void scheduleJinjuIndoorGuestSpawn();
      }
    }

    if (onRamp2F && !jinjuWasOnRamp2F) {
      const returningFromRooftop = jinjuIndoorDisposedForRooftop
        && (jinjuRooftopGuestActivationStarted || hasAnyJinjuRooftopGuests());

      if (returningFromRooftop) {
        cancelJinjuRooftopGuestSpawn("ramp 2F descent -> restoring indoor guests");
        restoreJinjuIndoorGuestsAfterRooftop("ramp 2F descent");
      } else {
        maybeStartJinjuRooftopGuestSpawn(JINJU_ROOFTOP_GUEST_CONFIG_VERSION);
      }
    }

    if (onExternalFloor && !jinjuWasOnExternalGroundFloor) {
      const hadRooftop = jinjuRooftopGuestActivationStarted || hasAnyJinjuRooftopGuests();
      const hadIndoor = jinjuIndoorGuestActivationStarted || hasAnyJinjuIndoorGuests();
      const shouldResetIndoor = jinjuRamp1FHasBeenContacted || hadIndoor;
      const shouldRestoreOutdoor = hadRooftop || shouldResetIndoor || jinjuOutdoorDisposedForIndoor;

      if (hadRooftop) {
        cancelJinjuRooftopGuestSpawn("external ground contact");
      }

      if (shouldResetIndoor) {
        cancelJinjuIndoorGuestSpawn("external ground contact");
      }

      if (shouldRestoreOutdoor) {
        ensureJinjuOutdoorGuestsVisibleInWalk("external ground contact");
      }

      resetJinjuTourGuestTriggerState();
    }

    jinjuWasOnRamp1F = onRamp1F;
    jinjuWasOnRamp2F = onRamp2F;
    jinjuWasOnExternalGroundFloor = onExternalFloor;
  }

  function preloadJinjuGuests() {
    if (!isJinjuProjectConfig(activeModelState.config)) {
      return;
    }

    // Orbit outdoor only -> indoor guests load on ramp contact to avoid OOM (building + TPS + N GLBs).
    const run = () => {
      void guestCharacterSystem?.preload(getJinjuFixedGuestSpawns(), { parallel: false, showOnLoad: false });
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 4000 });
      return;
    }

    window.setTimeout(run, 2000);
  }

  function preloadProjectGuests() {
    if (isAngjiProjectConfig(activeModelState.config)) {
      preloadAngjiOrbitGuests();
      return;
    }

    if (isJinjuProjectConfig(activeModelState.config)) {
      preloadJinjuGuests();
    }
  }

  /** Jinju orbit: outdoor + rooftop. Tour: outdoor until indoor complete, then indoor/rooftop by ramp. */
  function canUseAngjiOutdoorGuests() {
    return isAngjiProjectConfig(activeModelState.config);
  }

  function canUseAngjiIndoorGuests() {
    return walkMode && isAngjiProjectConfig(activeModelState.config);
  }

  function isAngjiNightGuestMode() {
    return Boolean(options.getIsAngjiNightMode?.());
  }

  function getAngjiOutdoorSpawnsForCurrentLighting() {
    const spawns = mapAngjiGuestSpawnsForMode(getAngjiOutdoorGuestSpawns(), isAngjiNightGuestMode());

    if (!isAngjiNightGuestMode()) {
      return spawns;
    }

    // Extra night-only overlook Marie (does not replace Mark-1 Devi).
    return [...spawns, ...getAngjiNightExtraGuestSpawns()];
  }

  function getAngjiOutdoorBackgroundSpawnsForCurrentLighting() {
    return mapAngjiGuestSpawnsForMode(getAngjiOutdoorBackgroundGuestSpawns(), isAngjiNightGuestMode());
  }

  function getAngjiIndoorSpawnsForCurrentLighting() {
    return mapAngjiGuestSpawnsForMode(getAngjiIndoorGuestSpawns(), isAngjiNightGuestMode());
  }

  function getAngjiIndoorBackgroundSpawnsForCurrentLighting() {
    return mapAngjiGuestSpawnsForMode(getAngjiIndoorBackgroundGuestSpawns(), isAngjiNightGuestMode());
  }

  async function refreshAngjiGuestsForNightMode() {
    if (!isAngjiProjectConfig(activeModelState.config)) {
      return;
    }

    await yieldFrames(1);
    guestCharacterSystem?.disposeGuests?.({ onlyIds: getAngjiAllGuestIds() });
    await yieldFrames(1);

    // Warm night guest assets in parallel before spawn.
    if (isAngjiNightGuestMode()) {
      const marieTemplate = getAngjiNightExtraGuestSpawns()[0];
      const nightTemplate = toAngjiNightGuestSpawn({
        id: "Mark-Night-Template",
        position: { x: 0, y: 0, z: 0 },
        rotationY: 0
      });

      await Promise.all([
        marieTemplate ? guestCharacterSystem?.preloadAsset?.(marieTemplate) : Promise.resolve(),
        guestCharacterSystem?.preloadAsset?.(nightTemplate)
      ]);
    }

    if (walkMode) {
      await scheduleOutdoorGuestSpawn();
      await scheduleIndoorGuestSpawn();
      guestCharacterSystem?.refreshDevLabels?.();
      return;
    }

    await scheduleOutdoorGuestSpawn();
    guestCharacterSystem?.refreshDevLabels?.();
  }

  function canUseJinjuOutdoorGuests() {
    return !walkMode && isJinjuProjectConfig(activeModelState.config);
  }

  function canUseJinjuIndoorGuests() {
    return walkMode && isJinjuProjectConfig(activeModelState.config);
  }

  function canUseJinjuGuests() {
    return isJinjuProjectConfig(activeModelState.config);
  }

  function revealJinjuOutdoorGuestsIfSpawned() {
    if (!guestCharacterSystem || !isJinjuProjectConfig(activeModelState.config)) {
      return;
    }

    const spawnedOutdoorIds = getJinjuOutdoorGuestIds().filter((guestId) => (
      guestCharacterSystem.isSpawned(guestId)
    ));

    if (!spawnedOutdoorIds.length) {
      return;
    }

    guestCharacterSystem.revealGuests(spawnedOutdoorIds);
  }

  function shouldSpawnJinjuOutdoorGuestsInWalk() {
    if (!walkMode || !isJinjuProjectConfig(activeModelState.config)) {
      return false;
    }

    // Indoor spawn complete disposes outdoor until the player returns to external ground.
    if (jinjuOutdoorDisposedForIndoor) {
      return false;
    }

    return true;
  }

  function ensureJinjuWalkTourOutdoorGuests(reason = "walk tour") {
    if (!shouldSpawnJinjuOutdoorGuestsInWalk() || !guestCharacterSystem) {
      return;
    }

    const missingOutdoor = getJinjuOutdoorGuestIds().some((guestId) => (
      !guestCharacterSystem.isSpawned(guestId)
    ));

    if (!missingOutdoor) {
      revealJinjuOutdoorGuestsIfSpawned();
      return;
    }

    ensureJinjuOutdoorGuestsVisibleInWalk(reason);
  }

  let jinjuWalkOutdoorRestoreInFlight = false;

  function yieldFrames(frameCount = 2) {
    return new Promise((resolve) => {
      let remaining = frameCount;

      const step = () => {
        remaining -= 1;

        if (remaining <= 0) {
          resolve();
          return;
        }

        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });
  }

  async function scheduleOutdoorGuestSpawn() {
    if (!canUseAngjiOutdoorGuests()) {
      guestCharacterSystem?.hide({ onlyIds: getAngjiOutdoorGuestIds() });
      return;
    }

    const spawnToken = ++angjiOutdoorGuestSpawnToken;
    guestCharacterSystem?.hide({ onlyIds: getJinjuAllGuestIds() });

    const allOutdoorSpawns = getAngjiOutdoorSpawnsForCurrentLighting();
    const outdoorBackgroundSpawns = getAngjiOutdoorBackgroundSpawnsForCurrentLighting();
    const nightModeGuests = isAngjiNightGuestMode();

    try {
      // Night: load Devis sequentially -> parallel ImportMeshAsync of the same
      // Devi.glb into one scene often fails and leaves enemies missing.
      await guestCharacterSystem.ensureSpawned(allOutdoorSpawns, {
        parallel: !nightModeGuests,
        showOnLoad: false,
        yieldBetweenLoads: nightModeGuests ? 1 : 0
      });

      if (spawnToken !== angjiOutdoorGuestSpawnToken) {
        return;
      }

      guestCharacterSystem.revealGuests(
        nightModeGuests
          ? [...ANGJI_PRIORITY_GUEST_IDS, ANGJI_NIGHT_MARIE_GUEST_ID]
          : ANGJI_PRIORITY_GUEST_IDS
      );

      for (const spawn of outdoorBackgroundSpawns) {
        if (spawnToken !== angjiOutdoorGuestSpawnToken) {
          return;
        }

        if (!nightModeGuests) {
          await yieldFrames(getBackgroundGuestLoadYieldFrames(spawn.id));
        }

        guestCharacterSystem.revealGuest(spawn.id);

        if (!nightModeGuests) {
          const delayMs = getBackgroundGuestRevealDelayMs(spawn.id);

          if (delayMs > 0) {
            await wait(delayMs);
          }
        }
      }
    } catch (error) {
      console.error("Outdoor guest spawn failed", error);
    }
  }

  refreshAngjiOrbitGuests = () => {
    if (canUseAngjiOutdoorGuests()) {
      void scheduleOutdoorGuestSpawn();
    }

    if (canUseJinjuOutdoorGuests()) {
      void scheduleJinjuOrbitGuests();
    }
  };

  async function scheduleJinjuOrbitGuests() {
    if (!isJinjuProjectConfig(activeModelState.config) || walkMode) {
      return;
    }

    await scheduleJinjuOutdoorGuestSpawn();
    await scheduleJinjuRooftopGuestSpawn({ allowInOrbit: true });
  }

  async function scheduleJinjuOutdoorGuestSpawn(options = {}) {
    if (!isJinjuProjectConfig(activeModelState.config)) {
      guestCharacterSystem?.hide({ onlyIds: getJinjuOutdoorGuestIds() });
      return;
    }

    if (walkMode && !options.allowInWalk) {
      return;
    }

    const spawnToken = ++jinjuOutdoorGuestSpawnToken;
    guestCharacterSystem?.hide({ onlyIds: getAngjiAllGuestIds() });

    try {
      await guestCharacterSystem.ensureSpawned(getJinjuFixedGuestSpawns(), {
        parallel: false,
        showOnLoad: false
      });

      if (spawnToken !== jinjuOutdoorGuestSpawnToken) {
        return;
      }

      for (const spawn of getJinjuFixedGuestSpawns()) {
        if (!guestCharacterSystem.isSpawned(spawn.id)) {
          console.error(`[jinju-outdoor-guest] failed to load fixed guest ${spawn.id} (${spawn.file})`);
        }
      }

      guestCharacterSystem.revealGuests(JINJU_PRIORITY_GUEST_IDS);

      for (const spawn of getJinjuOutdoorBackgroundGuestSpawns()) {
        if (spawnToken !== jinjuOutdoorGuestSpawnToken) {
          return;
        }

        await guestCharacterSystem.ensureSpawned([spawn], { parallel: false, showOnLoad: false });
        await yieldFrames(getJinjuGuestLoadYieldFrames(spawn.id));
        guestCharacterSystem.revealGuest(spawn.id);

        const delayMs = getJinjuGuestRevealDelayMs(spawn.id);

        if (delayMs > 0) {
          await wait(delayMs);
        }
      }
    } catch (error) {
      console.error("Jinju outdoor guest spawn failed", error);
    }
  }

  function logJinjuIndoorGuestReveal(spawn) {
    const guest = guestCharacterSystem?.getGuests?.().find((entry) => entry.spawn.id === spawn.id);
    const y = guest?.resolvedSpawn?.position?.y ?? spawn.position.y;
    console.info(`[jinju-indoor-guest] revealed ${spawn.id} at y=${typeof y === "number" ? y.toFixed(2) : y}`);
  }

  function logJinjuRooftopGuestReveal(spawn) {
    const guest = guestCharacterSystem?.getGuests?.().find((entry) => entry.spawn.id === spawn.id);
    const y = guest?.resolvedSpawn?.position?.y ?? spawn.position.y;
    console.info(`[jinju-rooftop-guest] revealed ${spawn.id} at y=${typeof y === "number" ? y.toFixed(2) : y}`);
  }

  async function scheduleJinjuRooftopGuestSpawn(options = {}) {
    const allowInOrbit = Boolean(options.allowInOrbit);

    if (!isJinjuProjectConfig(activeModelState.config)) {
      guestCharacterSystem?.hide({ onlyIds: getJinjuRooftopGuestIds() });
      jinjuRooftopGuestActivationStarted = false;
      return;
    }

    if (walkMode) {
      if (!canUseJinjuIndoorGuests()) {
        guestCharacterSystem?.hide({ onlyIds: getJinjuRooftopGuestIds() });
        jinjuRooftopGuestActivationStarted = false;
        return;
      }

      if (!jinjuIndoorGuestSpawnComplete) {
        jinjuRooftopPendingAfterIndoor = true;
        jinjuRooftopGuestActivationStarted = false;
        console.info("[jinju-rooftop-guest] walk spawn blocked until indoor guests finish loading");
        return;
      }
    } else if (!allowInOrbit) {
      return;
    }

    const spawnToken = ++jinjuRooftopGuestSpawnToken;
    jinjuRooftopGuestScheduleRunCount += 1;
    const scheduleRunId = jinjuRooftopGuestScheduleRunCount;
    const sequentialSpawns = getJinjuRooftopSequentialGuestSpawns();
    const simultaneousIds = new Set(JINJU_ROOFTOP_SIMULTANEOUS_GUEST_IDS);
    let revealedAny = false;
    let pendingSimultaneous = [];

    console.info(`[jinju-rooftop-guest] schedule run #${scheduleRunId} start (token=${spawnToken})`);

    const flushSimultaneousGroup = () => {
      if (pendingSimultaneous.length !== JINJU_ROOFTOP_SIMULTANEOUS_GUEST_IDS.length) {
        return;
      }

      guestCharacterSystem.revealGuests(
        pendingSimultaneous.map((spawn) => spawn.id),
        { syncAnimations: true }
      );
      pendingSimultaneous.forEach((spawn) => {
        revealedAny = true;
        logJinjuRooftopGuestReveal(spawn);
      });
      pendingSimultaneous = [];
    };

    try {
      for (const spawn of sequentialSpawns) {
        if (spawnToken !== jinjuRooftopGuestSpawnToken) {
          return;
        }

        if (walkMode && !canUseJinjuIndoorGuests()) {
          return;
        }

        if (guestCharacterSystem?.isSpawned?.(spawn.id)) {
          if (simultaneousIds.has(spawn.id)) {
            pendingSimultaneous.push(spawn);
            flushSimultaneousGroup();
          } else {
            guestCharacterSystem.revealGuest(spawn.id);
            revealedAny = true;
            logJinjuRooftopGuestReveal(spawn);
          }
        } else {
          await yieldFrames(getJinjuRooftopGuestLoadYieldFrames(spawn.id));
          await guestCharacterSystem.ensureSpawned([spawn], { parallel: false, showOnLoad: false });

          if (spawnToken !== jinjuRooftopGuestSpawnToken) {
            return;
          }

          if (simultaneousIds.has(spawn.id)) {
            pendingSimultaneous.push(spawn);
            flushSimultaneousGroup();
          } else {
            guestCharacterSystem.revealGuest(spawn.id);
            revealedAny = true;
            logJinjuRooftopGuestReveal(spawn);
          }
        }

        const markNumber = getJinjuRooftopMarkFromSpawnId(spawn.id);

        if (walkMode && markNumber === 10 && jinjuIndoorGuestSpawnComplete) {
          disposeJinjuIndoorGuestsForRooftop();
        } else if (walkMode && markNumber === 10) {
          console.info("[jinju-rooftop-guest] skip indoor dispose at R10 (indoor spawn still loading)");
        }

        const delayMs = getJinjuRooftopGuestRevealDelayMs(spawn.id);

        if (delayMs > 0) {
          await wait(delayMs);
        }
      }
    } catch (error) {
      console.error("Jinju rooftop guest spawn failed", error);
    } finally {
      if (spawnToken !== jinjuRooftopGuestSpawnToken) {
        return;
      }

      if (revealedAny) {
        console.info(`[jinju-rooftop-guest] schedule run #${scheduleRunId} complete -> spawn-once latch held`);
        return;
      }

      jinjuRooftopGuestActivationStarted = false;
    }
  }

  async function scheduleJinjuIndoorGuestSpawn() {
    if (!canUseJinjuIndoorGuests()) {
      guestCharacterSystem?.hide({ onlyIds: getJinjuIndoorGuestIds() });
      jinjuIndoorGuestActivationStarted = false;
      return;
    }

    const spawnToken = ++jinjuIndoorGuestSpawnToken;
    jinjuIndoorPreloadToken += 1;
    jinjuIndoorGuestScheduleRunCount += 1;
    const scheduleRunId = jinjuIndoorGuestScheduleRunCount;

    console.info(`[jinju-indoor-guest] schedule run #${scheduleRunId} start (token=${spawnToken})`);

    const prioritySpawns = getJinjuIndoorPriorityGuestSpawns();
    const backgroundSpawns = getJinjuIndoorBackgroundGuestSpawns();
    let revealedAny = false;

    try {
      for (const spawn of prioritySpawns) {
        if (spawnToken !== jinjuIndoorGuestSpawnToken || !canUseJinjuIndoorGuests()) {
          return;
        }

        if (guestCharacterSystem?.isSpawned?.(spawn.id)) {
          guestCharacterSystem.revealGuest(spawn.id);
          revealedAny = true;
          logJinjuIndoorGuestReveal(spawn);
          continue;
        }

        await yieldFrames(getJinjuIndoorGuestLoadYieldFrames(spawn.id));
        await guestCharacterSystem.ensureSpawned([spawn], { parallel: false, showOnLoad: false });

        if (spawnToken !== jinjuIndoorGuestSpawnToken) {
          return;
        }

        guestCharacterSystem.revealGuest(spawn.id);
        revealedAny = true;
        logJinjuIndoorGuestReveal(spawn);
      }

      for (const spawn of backgroundSpawns) {
        if (spawnToken !== jinjuIndoorGuestSpawnToken || !canUseJinjuIndoorGuests()) {
          return;
        }

        if (guestCharacterSystem?.isSpawned?.(spawn.id)) {
          await yieldFrames(getJinjuIndoorGuestLoadYieldFrames(spawn.id));
          guestCharacterSystem.revealGuest(spawn.id);
          revealedAny = true;
          logJinjuIndoorGuestReveal(spawn);
        } else {
          await yieldFrames(getJinjuIndoorGuestLoadYieldFrames(spawn.id));
          await guestCharacterSystem.ensureSpawned([spawn], { parallel: false, showOnLoad: false });

          if (spawnToken !== jinjuIndoorGuestSpawnToken) {
            return;
          }

          await yieldFrames(getJinjuIndoorGuestLoadYieldFrames(spawn.id));
          guestCharacterSystem.revealGuest(spawn.id);
          revealedAny = true;
          logJinjuIndoorGuestReveal(spawn);
        }

        const delayMs = getJinjuIndoorGuestRevealDelayMs(spawn.id);

        if (delayMs > 0) {
          await wait(delayMs);
        }
      }
    } catch (error) {
      console.error("Jinju indoor guest spawn failed", error);
    } finally {
      if (spawnToken !== jinjuIndoorGuestSpawnToken) {
        return;
      }

      if (revealedAny) {
        jinjuIndoorGuestSpawnAttempts = 0;
        jinjuIndoorGuestSpawnRetryAfter = 0;
        jinjuIndoorGuestSpawnComplete = true;
        disposeJinjuOutdoorGuestsForIndoor();
        flushPendingJinjuRooftopGuestSpawn("indoor spawn complete");
        console.info(
          `[jinju-indoor-guest] schedule run #${scheduleRunId} complete -> spawn-once latch held (audit: auditJinjuGuestState())`
        );
        return;
      }

      jinjuIndoorGuestActivationStarted = false;
      jinjuIndoorGuestSpawnAttempts += 1;

      if (jinjuIndoorGuestSpawnAttempts >= JINJU_INDOOR_GUEST_MAX_SPAWN_ATTEMPTS) {
        console.warn(
          `[jinju-indoor-guest] spawn gave up after ${JINJU_INDOOR_GUEST_MAX_SPAWN_ATTEMPTS} attempts`
        );
        return;
      }

      jinjuIndoorGuestSpawnRetryAfter = performance.now() + JINJU_INDOOR_GUEST_SPAWN_RETRY_COOLDOWN_MS;
      console.warn(
        `[jinju-indoor-guest] spawn attempt ${jinjuIndoorGuestSpawnAttempts}/${JINJU_INDOOR_GUEST_MAX_SPAWN_ATTEMPTS} failed; retry in ${JINJU_INDOOR_GUEST_SPAWN_RETRY_COOLDOWN_MS}ms`
      );
    }
  }

  async function scheduleJinjuGuestSpawn() {
    if (!canUseJinjuGuests()) {
      guestCharacterSystem?.hide({ onlyIds: getJinjuAllGuestIds() });
      return;
    }

    if (walkMode) {
      void scheduleJinjuIndoorGuestSpawn();
      return;
    }

    void scheduleJinjuOutdoorGuestSpawn();
  }

  async function scheduleIndoorGuestSpawn() {
    if (!canUseAngjiIndoorGuests()) {
      guestCharacterSystem?.hide({ onlyIds: getAngjiIndoorGuestIds() });
      return;
    }

    const spawnToken = ++angjiIndoorGuestSpawnToken;
    guestCharacterSystem.hide({ onlyIds: getAngjiIndoorGuestIds() });
    guestCharacterSystem?.hide({ onlyIds: getJinjuAllGuestIds() });

    const allIndoorSpawns = getAngjiIndoorSpawnsForCurrentLighting();
    const backgroundSpawns = getAngjiIndoorBackgroundSpawnsForCurrentLighting();
    const nightModeGuests = isAngjiNightGuestMode();

    try {
      await guestCharacterSystem.ensureSpawned(allIndoorSpawns, {
        parallel: !nightModeGuests,
        showOnLoad: false,
        yieldBetweenLoads: nightModeGuests ? 1 : 0
      });

      if (spawnToken !== angjiIndoorGuestSpawnToken) {
        return;
      }

      const simultaneousGuests = guestCharacterSystem
        .getGuests()
        .filter((guest) => ANGJI_SIMULTANEOUS_GUEST_IDS.includes(guest.spawn.id));
      const loadedIds = new Set(simultaneousGuests.map((guest) => guest.spawn.id));

      if (ANGJI_SIMULTANEOUS_GUEST_IDS.every((guestId) => loadedIds.has(guestId))) {
        guestCharacterSystem.revealGuests(ANGJI_SIMULTANEOUS_GUEST_IDS, {
          syncAnimations: !nightModeGuests
        });
      }

      for (const spawn of backgroundSpawns) {
        if (spawnToken !== angjiIndoorGuestSpawnToken) {
          return;
        }

        if (!nightModeGuests) {
          await yieldFrames(getBackgroundGuestLoadYieldFrames(spawn.id));
        }

        guestCharacterSystem.revealGuest(spawn.id);

        if (!nightModeGuests) {
          const delayMs = getBackgroundGuestRevealDelayMs(spawn.id);

          if (delayMs > 0) {
            await wait(delayMs);
          }
        }
      }
    } catch (error) {
      console.error("Indoor guest spawn failed", error);
    }
  }

  function getPlacementFacingYaw() {
    const characterYaw = tpsSystem?.getCharacter?.()?.getFacingYaw?.();

    if (walkMode && typeof characterYaw === "number") {
      return characterYaw;
    }

    return yaw;
  }

  function captureGuestPlacement() {
    if (!guestPlacementTool || !isPlacementToolEnabled()) {
      return null;
    }

    const { label, file } = getGuestPlacementInputs();
    const marker = walkMode
      ? guestPlacementTool.captureFromWalk({
        eyePosition: walkCamera.position.clone(),
        rotationY: getPlacementFacingYaw(),
        label,
        file
      })
      : guestPlacementTool.captureFromOrbit({
        cameraPosition: orbitCamera.position.clone(),
        target: (orbitCamera.target || BABYLON.Vector3.Zero()).clone(),
        label,
        file
      });

    clearGuestPlacementInputs();

    if (marker.source === "orbit" && marker.cameraPosition) {
      const cam = marker.cameraPosition;
      setStatus(
        `Orbit camera saved: ${marker.label}`
        + ` | cam (${cam.x.toFixed(2)}, ${cam.y.toFixed(2)}, ${cam.z.toFixed(2)})`
        + ` | rotY ${marker.rotationY.toFixed(4)} (${((marker.rotationY * 180) / Math.PI).toFixed(1)}°)`
      );
      console.info("[orbit-placement]", {
        label: marker.label,
        cameraPosition: {
          x: Number(cam.x.toFixed(2)),
          y: Number(cam.y.toFixed(2)),
          z: Number(cam.z.toFixed(2))
        },
        rotationY: Number(marker.rotationY.toFixed(4)),
        rotationYDeg: Number(((marker.rotationY * 180) / Math.PI).toFixed(1)),
        lookTarget: {
          x: Number(marker.lookTarget.x.toFixed(2)),
          y: Number(marker.lookTarget.y.toFixed(2)),
          z: Number(marker.lookTarget.z.toFixed(2))
        }
      });
    } else {
      setStatus(`Guest placement saved: ${marker.label}`);
    }

    return marker;
  }

  captureGuestPlacementButton?.addEventListener("click", () => {
    captureGuestPlacement();
  });

  copyGuestPlacementsButton?.addEventListener("click", async () => {
    if (!guestPlacementTool) {
      return;
    }

    try {
      const text = await guestPlacementTool.copyToClipboard();
      setStatus(`Copied ${guestPlacementTool.getMarkers().length} guest placement(s).`);
      console.info(text);
    } catch (error) {
      setStatus(`Copy failed: ${error.message || error}`);
    }
  });

  undoGuestPlacementButton?.addEventListener("click", () => {
    const removed = guestPlacementTool?.undoLast();

    if (removed) {
      setStatus(`Removed placement: ${removed.label}`);
    }
  });

  clearGuestPlacementsButton?.addEventListener("click", () => {
    guestPlacementTool?.clear();
    setStatus("Guest placements cleared.");
  });

  window.guestPlacement = {
    capture: () => captureGuestPlacement(),
    copy: () => guestPlacementTool?.copyToClipboard(),
    markers: () => guestPlacementTool?.getMarkers() || [],
    json: () => guestPlacementTool?.formatJson() || "[]"
  };

  window.auditAngjiTourElements = () => {
    const walkModelState = activeModelState.tourModelState || activeModelState;
    const report = auditAngjiTourElements(walkModelState);
    console.info("[angji-tour-audit]", report?.summary || "no model");
    console.table(report?.summary || {});
    return report;
  };

  window.auditColRampFloorConnectivity = () => {
    const walkModelState = activeModelState.tourModelState || activeModelState;
    const report = auditColRampFloorConnectivity(BABYLON, walkModelState);
    console.info("[ramp-connectivity-audit]", report);
    return report;
  };

  window.auditJinjuGuestState = () => {
    const audit = guestCharacterSystem?.getGuestSceneAudit?.() ?? {};
    const report = {
      ...audit,
      indoor: {
        activationStarted: jinjuIndoorGuestActivationStarted,
        scheduleRunCount: jinjuIndoorGuestScheduleRunCount,
        spawnAttempts: jinjuIndoorGuestSpawnAttempts,
        maxSpawnAttempts: JINJU_INDOOR_GUEST_MAX_SPAWN_ATTEMPTS,
        retryInMs: Math.max(0, Math.round(jinjuIndoorGuestSpawnRetryAfter - performance.now())),
        walkMode,
        project: activeModelState.config?.file ?? "-",
        activeGuestMaxMark: JINJU_INDOOR_ACTIVE_GUEST_MAX_MARK
      }
    };

    console.info("[jinju-guest-audit]", report);
    console.table({
      guests: report.guestCount,
      enabled: report.enabledGuestCount,
      tourGuestMeshes: report.tourGuestMeshCount,
      animationGroups: report.animationGroupCount,
      skeletons: report.skeletonCount,
      renderObservers: report.renderObserverCount,
      scheduleRuns: report.indoor.scheduleRunCount,
      revealStarted: report.revealAnimStartedCount,
      revealSkipped: report.revealAnimSkippedCount,
      spawnAttempts: report.indoor.spawnAttempts,
      retryInMs: report.indoor.retryInMs
    });

    return report;
  };

  window.jinjuIndoorGuestTestInfo = () => {
    const audit = window.auditJinjuGuestState();
    console.info(
      "[jinju-indoor-guest] manual test -> ramp 1F climb after guests appear; "
      + "scheduleRunCount must stay 1; revealSkipped should rise if re-reveal blocked"
    );
    return audit;
  };

  function clearMovementKeys() {
    keys.clear();
    tpsSystem?.getInputController?.()?.clear();
  }

  function clearFireballs() {
    while (fireballs.length > 0) {
      disposeFireballProjectile(fireballs.pop());
    }
  }

  function getEnemyPatrolPoint(index) {
    const point = ENEMY_SETTINGS.patrolPoints[index];
    return new BABYLON.Vector3(point.x, point.y + ENEMY_SETTINGS.heightOffset, point.z);
  }

  function canUseEnemyInCurrentMode() {
    return isLocalDevEnvironment()
      && walkMode
      && activeModelState.config?.file === ENEMY_SETTINGS.modelFile;
  }

  function updateEnemyHp() {
    updateEnemyHpBar(enemyState.asset?.hpBar, enemyState.hp);
  }

  function resetEnemy() {
    enemyState.spawnToken += 1;

    if (enemyState.spawnTimerId) {
      clearTimeout(enemyState.spawnTimerId);
      enemyState.spawnTimerId = null;
    }

    if (enemyState.asset?.fadeObserver) {
      scene.onBeforeRenderObservable.remove(enemyState.asset.fadeObserver);
      enemyState.asset.fadeObserver = null;
    }

    enemyState.active = false;
    enemyState.dying = false;
    enemyState.defeated = false;
    enemyState.hp = ENEMY_SETTINGS.maxHp;
    enemyState.patrolTargetIndex = 1;
    updateEnemyHp();

    if (enemyState.asset) {
      enemyState.asset.root.position.copyFrom(getEnemyPatrolPoint(0));
      enemyState.asset.root.rotation.set(0, 0, 0);
      enemyState.asset.root.setEnabled(false);
      setEnemyMeshVisibility(enemyState.asset, 1);
      enemyState.asset.hpBar.root.setEnabled(false);
    }
  }

  async function ensureEnemyLoaded() {
    if (enemyState.asset) {
      return enemyState.asset;
    }

    if (!enemyState.loadPromise) {
      enemyState.loadPromise = loadEnemyModel(BABYLON, scene)
        .then((asset) => {
          enemyState.asset = asset;
          updateEnemyHp();
          return asset;
        })
        .catch((error) => {
          console.error("Enemy load failed", error);
          enemyState.loadPromise = null;
          inputDiagnostics.lastFireball = "enemy load failed";
          setStatus("Enemy model could not be loaded.");
          updateInputDebug();
          return null;
        });
    }

    return enemyState.loadPromise;
  }

  function scheduleEnemySpawn() {
    resetEnemy();

    if (!canUseEnemyInCurrentMode()) {
      return;
    }

    const token = enemyState.spawnToken;
    enemyState.spawnTimerId = setTimeout(async () => {
      const asset = await ensureEnemyLoaded();

      if (!asset || token !== enemyState.spawnToken || !canUseEnemyInCurrentMode()) {
        return;
      }

      spawnEnemy();
    }, ENEMY_SETTINGS.spawnDelayMs);
  }

  function spawnEnemy() {
    const asset = enemyState.asset;

    if (!asset || enemyState.active || enemyState.defeated) {
      return;
    }

    enemyState.active = true;
    enemyState.dying = false;
    enemyState.hp = ENEMY_SETTINGS.maxHp;
    enemyState.patrolTargetIndex = 1;
    asset.root.position.copyFrom(getEnemyPatrolPoint(0));
    asset.root.setEnabled(true);
    asset.hpBar.root.setEnabled(true);
    updateEnemyHp();

    const startedAt = performance.now();
    let observer = null;
    setEnemyMeshVisibility(asset, 0);

    observer = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / ENEMY_SETTINGS.fadeInMs, 1);
      setEnemyMeshVisibility(asset, progress);

      if (progress >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        asset.fadeObserver = null;
      }
    });
    asset.fadeObserver = observer;
  }

  function getEnemyHitDistance(origin, direction, maxDistance) {
    if (!enemyState.active || enemyState.dying || enemyState.defeated || !enemyState.asset) {
      return null;
    }

    const position = enemyState.asset.root.position;
    const size = enemyState.asset.hitboxSize;
    const radius = FIREBALL_SETTINGS.radius;
    const min = new BABYLON.Vector3(
      position.x - size.x / 2 - radius,
      position.y - radius,
      position.z - size.z / 2 - radius
    );
    const max = new BABYLON.Vector3(
      position.x + size.x / 2 + radius,
      position.y + size.y + radius,
      position.z + size.z / 2 + radius
    );

    return getRayAabbHitDistance(origin, direction, min, max, maxDistance);
  }

  function damageEnemy() {
    if (!enemyState.active || enemyState.dying || enemyState.defeated) {
      return;
    }

    enemyState.hp = Math.max(0, enemyState.hp - 1);
    updateEnemyHp();

    if (enemyState.hp <= 0) {
      fadeOutEnemy();
    }
  }

  function fadeOutEnemy() {
    const asset = enemyState.asset;

    if (!asset || enemyState.dying) {
      return;
    }

    enemyState.dying = true;
    enemyState.active = false;
    enemyState.defeated = true;
    asset.hpBar.root.setEnabled(false);

    const startedAt = performance.now();
    const blinkInterval = ENEMY_SETTINGS.deathBlinkMs / (ENEMY_SETTINGS.deathBlinkCount * 2);

    asset.fadeObserver = scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startedAt;

      if (elapsed < ENEMY_SETTINGS.deathBlinkMs) {
        const blinkPhase = Math.floor(elapsed / blinkInterval);
        setEnemyMeshVisibility(asset, blinkPhase % 2 === 0 ? 1 : 0);
        return;
      }

      const fadeElapsed = elapsed - ENEMY_SETTINGS.deathBlinkMs;
      const progress = Math.min(fadeElapsed / ENEMY_SETTINGS.fadeOutMs, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setEnemyMeshVisibility(asset, 1 - eased);

      if (progress < 1) {
        return;
      }

      setEnemyMeshVisibility(asset, 0);
      asset.root.setEnabled(false);
      scene.onBeforeRenderObservable.remove(asset.fadeObserver);
      asset.fadeObserver = null;
      enemyState.dying = false;
    });
  }

  function updateEnemy(deltaScale) {
    const asset = enemyState.asset;

    if (!asset || !enemyState.active || enemyState.dying || enemyState.defeated) {
      return;
    }

    const playerPosition = walkCamera.position;
    asset.root.lookAt(new BABYLON.Vector3(playerPosition.x, asset.root.position.y, playerPosition.z));

    const target = getEnemyPatrolPoint(enemyState.patrolTargetIndex);
    const toTarget = target.subtract(asset.root.position);
    const distance = toTarget.length();
    const modelSpeedMultiplier = ANGJI_MOVE_SPEED_MULTIPLIER;
    const patrolSpeed = CONTROLLER_SETTINGS.moveSpeed
      * modelSpeedMultiplier
      * ENEMY_SETTINGS.patrolSpeedMultiplier
      * deltaScale;

    if (distance <= patrolSpeed) {
      asset.root.position.copyFrom(target);
      enemyState.patrolTargetIndex = enemyState.patrolTargetIndex === 0 ? 1 : 0;
    } else if (distance > 0) {
      asset.root.position.addInPlace(toTarget.normalize().scale(patrolSpeed));
    }

    asset.hpBar.root.position.copyFrom(asset.root.position.add(new BABYLON.Vector3(0, asset.hpBarOffsetY, 0)));
  }

  function updateTreeMeshesFacingViewer() {
    if (activeTreeMeshes.length === 0) {
      return;
    }

    const performanceSettings = getPerformanceSettings(activeModelState.config);

    if (!walkMode && performanceSettings.treeFacingInOrbit === false) {
      return;
    }

    // Face the rendering camera (TPS cam in tour), not the character eye/root.
    const viewerPosition = walkMode
      ? (tpsCamera?.position || scene.activeCamera?.position || walkCamera.position)
      : orbitCamera.position;
    treeFacingFrameCounter += 1;

    const movedEnough = !lastTreeViewerPosition
      || BABYLON.Vector3.DistanceSquared(
        viewerPosition,
        lastTreeViewerPosition
      ) >= performanceSettings.treeFacingMinMoveDistance * performanceSettings.treeFacingMinMoveDistance;
    const frameReady = treeFacingFrameCounter % performanceSettings.treeFacingIntervalFrames === 0;

    if (!movedEnough && !frameReady) {
      return;
    }

    if (movedEnough) {
      lastTreeViewerPosition = viewerPosition.clone();
    }

    const rotatedYawPivots = new Set();
    activeTreeMeshes.forEach((mesh) => {
      if (!mesh.isEnabled() || (typeof mesh.visibility === "number" && mesh.visibility <= 0.02)) {
        return;
      }

      const pivot = mesh.metadata?.treeYawPivot;

      if (pivot && rotatedYawPivots.has(pivot.uniqueId)) {
        return;
      }

      if (pivot) {
        rotatedYawPivots.add(pivot.uniqueId);
      }

      faceTreeMeshTowardPlayer(BABYLON, mesh, viewerPosition);
    });
  }

  function setModelState(nextModelState) {
    clearFireballs();
    resetEnemy();
    activeGroundMeshes = nextModelState.walkableGroundMeshes;
    activeCollisionMeshes = nextModelState.collisionMeshes;
    groundMeshSet = new Set(activeGroundMeshes);
    collisionMeshSet = new Set(activeCollisionMeshes);
    localGroundMeshSet = groundMeshSet;
    localCollisionMeshSet = collisionMeshSet;
    projectileHitMeshSet = buildFireballHitMeshSet(nextModelState);
    restoreTreeMeshesInitialRotation(activeTreeMeshes);
    activeTreeMeshes = nextModelState.treeMeshes || [];
    lastLocalMeshPosition = null;
    lastTreeViewerPosition = null;
    treeFacingFrameCounter = 0;
    const previousConfig = activeModelState?.config;
    const previousModelState = activeModelState;
    if (previousModelState && previousModelState !== nextModelState) {
      previousModelState.rlbProximityGlow?.dispose?.();
    }
    resetGuestProjectOnSwitch(previousConfig, nextModelState.config);

    activeModelState = nextModelState;
    ensureAngjiRlbProximityGlow(
      BABYLON,
      scene,
      nextModelState,
      () => scene.activeCamera || orbitCamera
    );
    preloadProjectGuests();
    setColMeshesPickableForMode(walkMode);

    if (isAngjiProjectConfig(nextModelState.config)) {
      if (walkMode) {
        void scheduleIndoorGuestSpawn();
        void scheduleOutdoorGuestSpawn();
      } else {
        void scheduleOutdoorGuestSpawn();
      }
    } else if (isJinjuProjectConfig(nextModelState.config)) {
      if (walkMode) {
        guestCharacterSystem?.disposeGuests({
          onlyIds: [...getJinjuIndoorGuestIds(), ...getJinjuRooftopGuestIds()]
        });
        resetJinjuIndoorGuestLoadingState();
        ensureJinjuWalkTourOutdoorGuests("model state walk");
      } else {
        void scheduleJinjuOrbitGuests();
      }
    } else {
      guestCharacterSystem?.hide();
    }

    clearMovementKeys();
    verticalVelocity = 0;
    stepTargetY = null;
    stepTargetHit = null;
    lastStableGroundPose = null;

    if (walkMode) {
      snapToGround();
    }
  }

  function activateModelState(nextModelState, reason) {
    if (!nextModelState || nextModelState === activeModelState) {
      return;
    }

    const previousModelState = activeModelState;
    setModelState(nextModelState);
    options.onActiveModelStateChange?.(nextModelState, previousModelState, reason);
  }

  function refreshLocalMeshSets(force = false) {
    if (!walkMode) {
      localGroundMeshSet = groundMeshSet;
      localCollisionMeshSet = collisionMeshSet;
      return;
    }

    const performanceSettings = getPerformanceSettings(activeModelState.config);

    if (
      !force
      && lastLocalMeshPosition
      && BABYLON.Vector3.DistanceSquared(walkCamera.position, lastLocalMeshPosition)
        < performanceSettings.localMeshUpdateDistance * performanceSettings.localMeshUpdateDistance
    ) {
      return;
    }

    lastLocalMeshPosition = walkCamera.position.clone();
    const nearbyCollisionMeshes = getMeshesNearPosition(
      BABYLON,
      activeCollisionMeshes,
      walkCamera.position,
      performanceSettings.localCollisionRadius
    );

    localCollisionMeshSet = nearbyCollisionMeshes.length > 0 ? new Set(nearbyCollisionMeshes) : collisionMeshSet;
    localGroundMeshSet = buildLocalGroundMeshSet(
      BABYLON,
      walkCamera.position,
      activeGroundMeshes,
      performanceSettings.localGroundRadius,
      activeModelState.config
    );
  }

  function updateInputDebug() {
    inputDebug.textContent = [
      inputDiagnostics.selfTestText,
      `mode ${walkMode ? "walk" : "orbit"}`,
      `pointer ${inputDiagnostics.pointerLocked ? "locked" : "unlocked"}`,
      `pointerError ${inputDiagnostics.pointerLockError}`,
      `keydown ${inputDiagnostics.keyDownCount}`,
      `keyup ${inputDiagnostics.keyUpCount}`,
      `lastDown ${inputDiagnostics.lastKeyDown}`,
      `lastUp ${inputDiagnostics.lastKeyUp}`,
      `mouse ${inputDiagnostics.mouseMoveCount}`,
      `lastMouse ${inputDiagnostics.lastMouseMove}`,
      `delta ${inputDiagnostics.lastMouseDelta}`,
      `moveCmd ${inputDiagnostics.lastMoveCommand}`,
      `moveDist ${inputDiagnostics.lastMoveDistance}`,
      `collision ${inputDiagnostics.lastCollision}`,
      `ground ${inputDiagnostics.lastGround}`,
      `fireball ${inputDiagnostics.lastFireball}`,
      `local collision ${localCollisionMeshSet.size}/${collisionMeshSet.size}`,
      `local ground ${localGroundMeshSet.size}/${groundMeshSet.size}`,
      `blocked ${inputDiagnostics.movementBlocked ? "yes" : "no"}`,
      `activeKeys ${Array.from(keys).join(",") || "-"}`
    ].join(" / ");
  }

  function getFireballCooldownRemainingMs(now = performance.now()) {
    return Math.max(0, FIREBALL_SETTINGS.cooldownMs - (now - lastFireballAt));
  }

  function isFireballHitMesh(mesh) {
    if (isTourGuestMesh(mesh)) {
      return false;
    }

    return projectileHitMeshSet.has(mesh)
      && mesh.isPickable
      && mesh.isEnabled()
      && (typeof mesh.visibility !== "number" || mesh.visibility > 0.02)
      && !mesh.metadata?.fireballDefeated;
  }

  function tryShootFireball() {
    if (!walkMode || isResettingTour) {
      inputDiagnostics.lastFireball = "walk mode only";
      updateInputDebug();
      return;
    }

    const now = performance.now();
    const cooldownRemaining = getFireballCooldownRemainingMs(now);

    if (cooldownRemaining > 0) {
      inputDiagnostics.lastFireball = `cooldown ${(cooldownRemaining / 1000).toFixed(1)}s`;
      setStatus(`Fireball cooldown: ${(cooldownRemaining / 1000).toFixed(1)}s remaining.`);
      updateInputDebug();
      return;
    }

    if (fireballs.length >= FIREBALL_SETTINGS.maxActive) {
      inputDiagnostics.lastFireball = `limit ${fireballs.length}/${FIREBALL_SETTINGS.maxActive}`;
      setStatus(`Only ${FIREBALL_SETTINGS.maxActive} fireballs can exist at once.`);
      updateInputDebug();
      return;
    }

    fireballs.push(createFireballProjectile(BABYLON, scene, tpsCamera));
    lastFireballAt = now;
    inputDiagnostics.lastFireball = `shot ${fireballs.length}/${FIREBALL_SETTINGS.maxActive}`;
    setStatus("Fireball fired. E can be used again after 0.5 seconds.");
    updateInputDebug();
  }

  function updateFireballs(deltaScale) {
    for (let index = fireballs.length - 1; index >= 0; index -= 1) {
      const fireball = fireballs[index];
      const stepDistance = FIREBALL_SETTINGS.speed * deltaScale;

      if (FIREBALL_SETTINGS.collisionEnabled) {
        const ray = new BABYLON.Ray(fireball.mesh.position, fireball.direction, stepDistance + FIREBALL_SETTINGS.radius);
        // First hit only -> multiPick against the building mesh set was a frame hitch.
        const picked = scene.pickWithRay(ray, isFireballHitMesh);
        const hit = picked?.hit && picked.pickedMesh && picked.pickedPoint ? picked : null;
        const enemyHitDistance = getEnemyHitDistance(fireball.mesh.position, fireball.direction, stepDistance + FIREBALL_SETTINGS.radius);
        const meshHitDistance = typeof hit?.distance === "number" ? hit.distance : Number.POSITIVE_INFINITY;

        if (enemyHitDistance !== null && enemyHitDistance <= meshHitDistance) {
          damageEnemy();
          inputDiagnostics.lastFireball = `enemy hit:${enemyState.hp}/${ENEMY_SETTINGS.maxHp}`;
          setStatus(enemyState.hp > 0 ? `Enemy hit. HP ${enemyState.hp}/${ENEMY_SETTINGS.maxHp}.` : "Enemy defeated.");
          disposeFireballProjectile(fireball);
          fireballs.splice(index, 1);
          continue;
        }

        if (hit) {
          const targetName = hit.pickedMesh.name || hit.pickedMesh.id || "mesh";

          if (isPeopleFireballTarget(hit.pickedMesh, getPerformanceSettings(getActiveModelState()?.config))) {
            animatePeopleFireballHit(BABYLON, scene, hit.pickedMesh);
            inputDiagnostics.lastFireball = `people hit:${targetName}`;
            setStatus("People target hit. The target is fading out.");
          } else {
            inputDiagnostics.lastFireball = `impact:${targetName}`;
          }

          disposeFireballProjectile(fireball);
          fireballs.splice(index, 1);
          continue;
        }
      }

      fireball.mesh.position.addInPlace(fireball.direction.scale(stepDistance));
      fireball.distance += stepDistance;

      if (fireball.distance >= FIREBALL_SETTINGS.maxDistance) {
        disposeFireballProjectile(fireball);
        fireballs.splice(index, 1);
        inputDiagnostics.lastFireball = "expired";
      }
    }
  }

  function requestPointerLockSafe() {
    if (document.pointerLockElement === canvas) {
      inputDiagnostics.pointerLocked = true;
      inputDiagnostics.pointerLockError = "-";
      updateInputDebug();
      return;
    }

    if (typeof canvas.requestPointerLock !== "function") {
      inputDiagnostics.pointerLockError = "unsupported";
      setStatus("Pointer lock is not supported in this browser. Keyboard movement still works.");
      updateInputDebug();
      return;
    }

    const request = canvas.requestPointerLock();

    if (request && typeof request.catch === "function") {
      request.catch((error) => {
        inputDiagnostics.pointerLockError = error?.message || String(error);
        setStatus("Pointer lock failed. Click inside the 3D view and try again.");
        updateInputDebug();
      });
    }
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function getActiveTourCameraConfig() {
    return resolveCameraViewConfig(
      activeModelState.config?.tourCamera || DEFAULT_TOUR_CAMERA,
      { lookDistance: 10 }
    );
  }

  function getWalkSpawnCameraConfig() {
    const tourCamera = getActiveTourCameraConfig();
    const configuredTour = activeModelState.config?.tourCamera;
    const hasExplicitSpawn = Boolean(
      configuredTour?.position
      && (configuredTour.target || typeof configuredTour.rotationY === "number")
    );

    // Prefer project-configured tour spawn (e.g. Geochang rotationY pose) over Tour_Start.
    if (hasExplicitSpawn) {
      return tourCamera;
    }

    const tourStartNode = activeModelState.model?.tourStartNode;

    if (!tourStartNode) {
      return tourCamera;
    }

    tourStartNode.computeWorldMatrix(true);
    const startPosition = tourStartNode.getAbsolutePosition();

    return {
      position: {
        x: startPosition.x,
        y: startPosition.y,
        z: startPosition.z
      },
      target: tourCamera.target || DEFAULT_TOUR_CAMERA.target
    };
  }

  function resetWalkCameraToTourStart() {
    clearFireballs();
    const tourCamera = getWalkSpawnCameraConfig();
    walkCamera.position.set(tourCamera.position.x, tourCamera.position.y, tourCamera.position.z);
    walkCamera.setTarget(new BABYLON.Vector3(tourCamera.target.x, tourCamera.target.y, tourCamera.target.z));
    yaw = Math.atan2(
      tourCamera.target.x - tourCamera.position.x,
      tourCamera.target.z - tourCamera.position.z
    );
    pitch = 0;
    verticalVelocity = 0;
    stepTargetY = null;
    stepTargetHit = null;
    lastStableGroundPose = null;
    lastLocalMeshPosition = null;
    refreshLocalMeshSets(true);
    snapToGround({ force: true });

    const snappedTourCamera = {
      position: {
        x: walkCamera.position.x,
        y: walkCamera.position.y,
        z: walkCamera.position.z
      },
      target: tourCamera.target
    };

    tpsSystem?.reset?.(snappedTourCamera);
  }

  function isWalkCameraOutsideTourBounds() {
    const bounds = activeModelState.model.bounds;
    const horizontalMargin = Math.max(
      TOUR_RESET_MIN_HORIZONTAL_MARGIN,
      Math.max(bounds.size.x, bounds.size.z) * TOUR_RESET_HORIZONTAL_MARGIN_RATIO
    );
    const position = walkCamera.position;
    const outsideHorizontal = position.x < bounds.min.x - horizontalMargin
      || position.x > bounds.max.x + horizontalMargin
      || position.z < bounds.min.z - horizontalMargin
      || position.z > bounds.max.z + horizontalMargin;
    const fellBelowModel = position.y < bounds.min.y - TOUR_RESET_FALL_DISTANCE;

    return outsideHorizontal || fellBelowModel;
  }

  async function resetTourWithFade(reason) {
    if (isResettingTour || !walkMode) {
      return;
    }

    isResettingTour = true;
    clearMovementKeys();
    inputDiagnostics.lastCollision = reason;
    inputDiagnostics.movementBlocked = true;
    tourResetFade?.classList.add("is-active");
    await wait(TOUR_RESET_FADE_MS);
    resetWalkCameraToTourStart();
    inputDiagnostics.lastCollision = "tour reset";
    inputDiagnostics.movementBlocked = false;
    updateDebug();
    await wait(80);
    tourResetFade?.classList.remove("is-active");
    await wait(TOUR_RESET_FADE_MS);
    isResettingTour = false;
  }

  function getForward() {
    return walkCamera.getDirection(BABYLON.Axis.Z).normalize();
  }

  function getFlatAxes() {
    const forward = getForward();
    forward.y = 0;

    if (forward.lengthSquared() > 0) {
      forward.normalize();
    } else {
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
    }

    const right = walkCamera.getDirection(BABYLON.Axis.X);
    right.y = 0;
    if (right.lengthSquared() > 0) right.normalize();

    return { forward, right };
  }

  function snapToGround(options = {}) {
    refreshLocalMeshSets(true);
    const hit = findSpawnGroundHit(BABYLON, scene, walkCamera.position, localGroundMeshSet);

    if (!hit?.pickedPoint) {
      isGrounded = false;
      return false;
    }

    const nextY = hit.pickedPoint.y + EYE_HEIGHT;

    if (options.force || nextY <= walkCamera.position.y + 0.6) {
      walkCamera.position.y = nextY;
      isGrounded = true;
      rememberStableGround(hit, nextY);
      return true;
    }

    return false;
  }

  function rememberStableGround(hit, eyeY) {
    lastStableGroundPose = {
      hit,
      eyeY,
      isStair: Boolean(
        hit?.pickedMesh && (
          isStairSurface(hit.pickedMesh)
          || isColRampGroundMesh(hit.pickedMesh)
          || isColDiscreteStairMesh(hit.pickedMesh)
        )
      ),
      time: performance.now()
    };
  }

  function tryUseGroundGrace() {
    if (!lastStableGroundPose) {
      return false;
    }

    if (!getCenterGroundPose(BABYLON, scene, walkCamera.position, localGroundMeshSet, walkCamera.position.y)) {
      return false;
    }

    const age = performance.now() - lastStableGroundPose.time;
    const verticalGap = Math.abs(walkCamera.position.y - lastStableGroundPose.eyeY);
    const maxAge = lastStableGroundPose.isStair ? STAIR_GROUND_GRACE_MS : GROUND_GRACE_MS;
    const maxVerticalGap = lastStableGroundPose.isStair
      ? STAIR_GROUND_GRACE_VERTICAL_TOLERANCE
      : GROUND_GRACE_VERTICAL_TOLERANCE;

    if (age > maxAge || verticalGap > maxVerticalGap) {
      return false;
    }

    walkCamera.position.y = lastStableGroundPose.eyeY;
    verticalVelocity = 0;
    isGrounded = true;
    inputDiagnostics.lastGround = `grace:${getSurfaceDebugName(lastStableGroundPose.hit)}`;
    return true;
  }

  function getWalkLocomotionState() {
    if (walkFrameLocomotion) {
      return walkFrameLocomotion;
    }

    walkFrameLocomotion = getLocomotionSurfaceState(
      BABYLON,
      scene,
      walkCamera.position,
      localGroundMeshSet,
      { maxRampStepUp: getProjectMaxRampStepUp(activeModelState.config) }
    );

    return walkFrameLocomotion;
  }

  function trySnapToStairWhileStanding() {
    const locomotion = getWalkLocomotionState();
    const { onColRamp, onColStair, onStair } = locomotion;

    if (!onColRamp && !onColStair && !onStair) {
      return false;
    }

    const discreteStair = isColLayerDiscreteStairConfig(activeModelState.config);
    const rampSnapTolerance = getProjectMaxRampStepUp(activeModelState.config);
    const stairSnapTolerance = onColRamp
      ? rampSnapTolerance
      : discreteStair
        ? ANGJI_MAX_STAIR_STEP_UP
        : hasColLayerConfig(activeModelState.config)
          ? MAX_STAIR_STEP_UP
          : STAIR_STAND_SNAP_TOLERANCE;
    const stairPose = getStepPoseAtPosition(BABYLON, scene, walkCamera.position, localGroundMeshSet, walkCamera.position.y, {
      minVerticalDelta: -stairSnapTolerance,
      maxVerticalDelta: stairSnapTolerance,
      slopeFilter: onColRamp ? "ramp" : "stair"
    });

    if (!stairPose) {
      return false;
    }

    const verticalGap = Math.abs(walkCamera.position.y - stairPose.eyeY);

    if (verticalGap > stairSnapTolerance) {
      return false;
    }

    walkCamera.position.y = stairPose.eyeY;
    verticalVelocity = 0;
    isGrounded = true;
    rememberStableGround(stairPose.hit, stairPose.eyeY);
    inputDiagnostics.lastGround = `stair:${getSurfaceDebugName(stairPose.hit)}`;
    return true;
  }

  function integrateVerticalPhysics(deltaScale, state) {
    let { verticalVelocity: vy, isGrounded: grounded, verticalImpulse = 0 } = state;

    const locomotion = getWalkLocomotionState();
    const { onColRamp, onColStair, onRamp, onStair } = locomotion;

    if (
      grounded
      && !onColRamp
      && !onColStair
      && !onRamp
      && !onStair
      && !getCenterGroundPose(BABYLON, scene, walkCamera.position, localGroundMeshSet, walkCamera.position.y)
    ) {
      grounded = false;
      vy = Math.min(vy, 0);
    }

    if (verticalImpulse > 0 && grounded) {
      vy = verticalImpulse;
      grounded = false;
      stepTargetY = null;
      stepTargetHit = null;
      verticalVelocity = vy;
      isGrounded = false;
      walkCamera.position.y += vy * deltaScale;
      return { verticalVelocity: vy, isGrounded: false };
    }

    if (typeof stepTargetY === "number") {
      const nextY = walkCamera.position.y + (stepTargetY - walkCamera.position.y) * Math.min(STEP_SMOOTHING * deltaScale, 1);
      const targetHit = stepTargetHit;

      if (Math.abs(stepTargetY - nextY) <= STEP_SETTLE_EPSILON) {
        walkCamera.position.y = stepTargetY;
        stepTargetY = null;
        stepTargetHit = null;
      } else {
        walkCamera.position.y = nextY;
      }

      verticalVelocity = 0;
      isGrounded = true;
      rememberStableGround(targetHit, walkCamera.position.y);
      return { verticalVelocity, isGrounded };
    }

    const snapStepUp = onColRamp || onRamp
      ? MAX_RAMP_STEP_UP
      : onColStair
        ? ANGJI_MAX_STAIR_STEP_UP
        : onStair
          ? MAX_STAIR_STEP_UP
          : MAX_STEP_UP;
    const groundPose = (onColRamp || onColStair || onRamp || onStair)
      ? getGroundPoseAtPosition(
        BABYLON,
        scene,
        walkCamera.position,
        localGroundMeshSet,
        walkCamera.position.y,
        {
          maxStepUp: snapStepUp,
          compactProbes: grounded && Math.abs(vy) <= 0.02
        }
      )
      : getCenterGroundPose(
        BABYLON,
        scene,
        walkCamera.position,
        localGroundMeshSet,
        walkCamera.position.y
      );

    if (groundPose) {
      const distanceToGround = walkCamera.position.y - groundPose.eyeY;

      if (distanceToGround <= GROUND_SNAP_TOLERANCE && distanceToGround >= -snapStepUp && vy <= 0) {
        walkCamera.position.y = groundPose.eyeY;
        verticalVelocity = 0;
        isGrounded = true;
        rememberStableGround(groundPose.hit, groundPose.eyeY);
        inputDiagnostics.lastGround = getSurfaceDebugName(groundPose.hit);
        return { verticalVelocity, isGrounded };
      }

      if (distanceToGround < -GROUND_SNAP_TOLERANCE && Math.abs(distanceToGround) <= snapStepUp) {
        walkCamera.position.y = groundPose.eyeY;
        verticalVelocity = 0;
        isGrounded = true;
        rememberStableGround(groundPose.hit, groundPose.eyeY);
        inputDiagnostics.lastGround = getSurfaceDebugName(groundPose.hit);
        return { verticalVelocity, isGrounded };
      }
    }

    if (trySnapToStairWhileStanding()) {
      return { verticalVelocity, isGrounded };
    }

    if (tryUseGroundGrace()) {
      return { verticalVelocity, isGrounded };
    }

    const previousY = walkCamera.position.y;
    verticalVelocity = Math.max(vy - CONTROLLER_SETTINGS.gravity * deltaScale, -MAX_FALL_SPEED);
    walkCamera.position.y += verticalVelocity * deltaScale;
    isGrounded = false;

    const sweptGroundPose = getSweptLandingGroundPoseAtPosition(
      BABYLON,
      scene,
      walkCamera.position,
      localGroundMeshSet,
      previousY,
      walkCamera.position.y
    );
    const nextGroundPose = sweptGroundPose
      || getLandingGroundPoseAtPosition(BABYLON, scene, walkCamera.position, localGroundMeshSet, walkCamera.position.y);

    if (nextGroundPose && walkCamera.position.y <= nextGroundPose.eyeY + GROUND_SNAP_TOLERANCE) {
      walkCamera.position.y = nextGroundPose.eyeY;
      verticalVelocity = 0;
      isGrounded = true;
      rememberStableGround(nextGroundPose.hit, nextGroundPose.eyeY);
      inputDiagnostics.lastGround = getSurfaceDebugName(nextGroundPose.hit);
    } else {
      inputDiagnostics.lastGround = "-";
    }

    return { verticalVelocity, isGrounded };
  }

  function applyGravity(deltaScale) {
    const result = integrateVerticalPhysics(deltaScale, {
      verticalVelocity,
      isGrounded,
      verticalImpulse: 0
    });
    verticalVelocity = result.verticalVelocity;
    isGrounded = result.isGrounded;
  }

  function updateDebug() {
    const activeCamera = scene.activeCamera || orbitCamera;
    const activeTarget = activeCamera === tpsCamera
      ? tpsCamera.target?.clone?.() || BABYLON.Vector3.Zero()
      : activeCamera === walkCamera
        ? walkCamera.position.add(getForward().scale(10))
        : (orbitCamera.target || BABYLON.Vector3.Zero());
    const activeKeys = Array.from(keys);

    playerDebug.textContent = [
      `active ${activeCamera.name}`,
      `activePos ${vectorToText(activeCamera.position)}`,
      `activeTarget ${vectorToText(activeTarget)}`,
      `orbitPos ${vectorToText(orbitCamera.position)}`,
      `orbitTarget ${vectorToText(orbitCamera.target)}`,
      `playerEye ${vectorToText(walkCamera.position)}`,
      `tpsCam ${vectorToText(tpsCamera.position)}`,
      `yaw ${yaw.toFixed(2)}`,
      `pitch ${pitch.toFixed(2)}`,
      `vy ${verticalVelocity.toFixed(3)}`,
      `stepTarget ${typeof stepTargetY === "number" ? stepTargetY.toFixed(2) : "-"}`,
      `keys ${activeKeys.join(",") || "-"}`,
      isGrounded ? "grounded" : "air",
      tpsSystem?.isCharacterReady?.() ? "character ready" : "character loading",
      lastTpsRuntimeState?.locomotionState ? `loco ${lastTpsRuntimeState.locomotionState}` : "loco -",
      lastTpsRuntimeState?.activeAction ? `action ${lastTpsRuntimeState.activeAction}` : "action -",
      currentLabel
    ].join(" / ");
    updateInputDebug();
  }

  function updateModeSwitchButtons() {
    if (tourModeButton) {
      tourModeButton.disabled = walkMode;
      tourModeButton.classList.toggle("is-active", walkMode);
      tourModeButton.setAttribute("aria-pressed", walkMode ? "true" : "false");
    }

    if (orbitViewButton) {
      orbitViewButton.disabled = !walkMode;
      orbitViewButton.classList.toggle("is-active", !walkMode);
      orbitViewButton.setAttribute("aria-pressed", walkMode ? "false" : "true");
    }
  }

  // Orbit wheel zoom uses scene.pick; COL collision meshes are invisible but
  // still pickable for walk rays — that makes night close-zooms hitch hard.
  // Keep COL pickable only in walk; orbit/night flares still use intersectsMesh.
  function setColMeshesPickableForMode(pickable) {
    const meshes = activeCollisionMeshes?.length
      ? activeCollisionMeshes
      : (activeModelState?.collisionMeshes || []);

    meshes.forEach((mesh) => {
      if (!mesh || mesh.isDisposed?.()) {
        return;
      }

      if (
        mesh.metadata?.angjiCollisionLayer
        || mesh.metadata?.angjiCollisionInvisible
        || mesh.metadata?.angjiWallSurface
        || mesh.metadata?.angjiFloorSurface
      ) {
        mesh.isPickable = pickable;
      }
    });
  }

  async function enterWalkMode(shouldLockPointer = false, walkEntryOptions = {}) {
    const walkModelState = activeModelState.tourModelState || activeModelState;

    if (!walkEntryOptions.bgmAlreadyStarted) {
      options.tourBgm?.onEnterWalkMode(walkModelState.config, walkEntryOptions);
    }

    orbitCamera.detachControl(canvas);
    clearMovementKeys();
    document.body.classList.add("walk-mode-active");
    canvas.setAttribute("tabindex", "0");
    canvas.focus({ preventScroll: true });
    await tpsSystem?.ensureLoaded?.();
    scene.activeCamera = tpsCamera;
    walkMode = true;
    setColMeshesPickableForMode(true);

    if (walkModelState === activeModelState) {
      setModelState(walkModelState);
    } else {
      activateModelState(walkModelState, "walk");
    }
    isResettingTour = false;
    tourResetFade?.classList.remove("is-active");
    resetWalkCameraToTourStart();
    tpsSystem?.show?.();
    scheduleEnemySpawn();
    options.onModeChange?.("walk");
    currentLabel = "third-person tour";

    if (shouldLockPointer) {
      requestPointerLockSafe();
    }

    floorLabel.textContent = "Walk Mode (TPS)";
    setStatus("Third-person walk mode active. WASD moves, Shift runs, Space jumps (near GUIDE or Guest: talk), J jump-over test, P dances, mouse looks, wheel zooms. Use Orbit View to return.");
    updateModeSwitchButtons();
    updateDebug();

    if (isJinjuProjectConfig(activeModelState.config)) {
      guestCharacterSystem?.disposeGuests({
        onlyIds: [...getJinjuIndoorGuestIds(), ...getJinjuRooftopGuestIds()]
      });
      resetJinjuIndoorGuestLoadingState();
      ensureJinjuWalkTourOutdoorGuests("enter walk mode");
    }
  }

  function enterOrbitMode() {
    walkMode = false;
    document.body.classList.remove("walk-mode-active");
    npcInteractionSystem?.handleEscape?.();
    angjiGuideTourSystem?.dispose?.();
    setColMeshesPickableForMode(false);
    clearFireballs();
    resetEnemy();

    const orbitModelState = activeModelState.orbitModelState || activeModelState;
    const willSkipModelSwitch = orbitModelState === activeModelState;

    if (isAngjiProjectConfig(activeModelState.config)) {
      guestCharacterSystem?.hide({ onlyIds: getAngjiIndoorGuestIds() });
    } else if (isJinjuProjectConfig(activeModelState.config)) {
      resetJinjuGuestSpawnStateForOrbit();
    } else {
      guestCharacterSystem?.hide();
    }

    clearMovementKeys();
    tpsSystem?.hide?.();
    document.exitPointerLock?.();
    const leavingTourConfig = activeModelState.config;
    activateModelState(orbitModelState, "orbit");

    if (isJinjuProjectConfig(orbitModelState.config) && willSkipModelSwitch) {
      void scheduleJinjuOrbitGuests();
    }
    options.tourBgm?.onEnterOrbitMode(leavingTourConfig);
    orbitCamera.attachControl(canvas, false);
    scene.activeCamera = orbitCamera;
    // Restore the project's initial orbit framing after leaving tour.
    applyOrbitCameraStart(BABYLON, orbitCamera, orbitModelState);
    applyOrbitCameraConstraints(BABYLON, orbitCamera, orbitModelState);
    applyOrbitZoomPickPolicy(orbitCamera, options.getIsAngjiNightMode?.());
    floorLabel.textContent = "Orbit View";
    currentLabel = "orbit view";
    setStatus("Orbit view ready. Middle mouse rotates, Shift+middle pans, wheel zooms to cursor. Use Tour Mode to enter walk mode.");
    options.onModeChange?.("orbit");
    updateModeSwitchButtons();
    updateDebug();
  }

  tourModeButton?.addEventListener("click", () => {
    if (walkMode) {
      return;
    }

    const walkModelState = activeModelState.tourModelState || activeModelState;
    options.tourBgm?.onEnterWalkMode(walkModelState.config, { keepBgm: false });
    void enterWalkMode(true, { bgmAlreadyStarted: true });
  });

  orbitViewButton?.addEventListener("click", () => {
    if (!walkMode) {
      return;
    }

    enterOrbitMode();
  });

  updateModeSwitchButtons();

  canvas.addEventListener("click", () => {
    if (walkMode && !isLocalDevPanelBlockingInput() && !isGuideTourBlockingInput()) {
      requestPointerLockSafe();
    }
  });

  canvas.addEventListener("wheel", (event) => {
    if (!walkMode || isLocalDevPanelBlockingInput() || isGuideTourBlockingInput()) {
      return;
    }

    event.preventDefault();
    pendingWheelDelta += event.deltaY;
  }, { passive: false });

  canvas.addEventListener("pointerdown", preventGuideMiddleMouseDefault, true);
  canvas.addEventListener("mousedown", preventGuideMiddleMouseDefault, true);
  canvas.addEventListener("auxclick", preventGuideMiddleMouseDefault, true);
  canvas.addEventListener("pointerdown", startGuideLookDrag, true);
  canvas.addEventListener("pointermove", moveGuideLookDrag, true);
  canvas.addEventListener("pointerup", stopGuideLookDrag, true);
  canvas.addEventListener("pointercancel", stopGuideLookDrag, true);
  window.addEventListener("blur", resetGuideLookDrag);

  window.addEventListener("mousemove", (event) => {
    inputDiagnostics.mouseMoveCount += 1;
    inputDiagnostics.lastMouseMove = walkMode ? "walk" : "orbit";
    inputDiagnostics.lastMouseDelta = `x ${event.movementX || 0}, y ${event.movementY || 0}`;

    if (
      walkMode
      && document.pointerLockElement === canvas
      && !isLocalDevPanelBlockingInput()
      && !isGuideTourBlockingInput()
    ) {
      pendingMouseDeltaX += event.movementX || 0;
      pendingMouseDeltaY += event.movementY || 0;
    }

    updateInputDebug();
  });

  window.addEventListener("keydown", (event) => {
    if (isOverviewAdminEditing(event) || isLocalDevPanelBlockingInput()) {
      clearMovementKeys();
      return;
    }

    const key = getInputKey(event);
    const inputCode = event.code || event.key || "?";

    if (!event.repeat) {
      inputDiagnostics.keyDownCount += 1;
      inputDiagnostics.lastKeyDown = `${key || "unknown"} (${inputCode})`;
    }

    if (
      event.code === "KeyB"
      && !event.repeat
      && isPlacementToolEnabled()
      && !isOverviewAdminEditing(event)
      && !(event.target instanceof HTMLInputElement)
      && !(event.target instanceof HTMLTextAreaElement)
    ) {
      event.preventDefault();
      captureGuestPlacement();
      return;
    }

    const inputBlocked = walkMode && (
      tpsSystem?.isPlayerInputBlocked?.()
      || isDialogSystemBlockingInput()
    );

    if (
      walkMode
      && !event.repeat
      && (event.code === "Escape" || event.key === "Escape")
      && angjiGuideTourSystem?.handleEscape?.()
    ) {
      event.preventDefault();
      clearMovementKeys();
      return;
    }

    if (
      walkMode
      && !event.repeat
      && (event.code === "Escape" || event.key === "Escape")
      && npcInteractionSystem?.handleEscape?.()
    ) {
      event.preventDefault();
      clearMovementKeys();
      return;
    }

    if (
      walkMode
      && !event.repeat
      && (event.code === "Space" || event.key === " ")
      && angjiGuideTourSystem?.handleSpacePress?.()
    ) {
      event.preventDefault();
      return;
    }

    if (
      walkMode
      && !event.repeat
      && (event.code === "Space" || event.key === " ")
      && npcInteractionSystem?.handleSpacePress?.()
    ) {
      event.preventDefault();
      return;
    }

    applyCharacterTpsKeyDown(event, {
      walkMode,
      keys,
      tpsSystem,
      inputBlocked,
      throwEnabled: false,
      onThrowExtra: null
    });

    if (!event.repeat) {
      updateInputDebug();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (isOverviewAdminEditing(event) || isLocalDevPanelBlockingInput()) {
      clearMovementKeys();
      return;
    }

    const key = getInputKey(event);
    inputDiagnostics.keyUpCount += 1;
    inputDiagnostics.lastKeyUp = `${key || "unknown"} (${event.code || event.key || "?"})`;

    if (key === " " || event.code === "Space") {
      angjiGuideTourSystem?.handleSpaceRelease?.();
      npcInteractionSystem?.handleSpaceRelease?.();
    }

    keys.delete(key);
    updateInputDebug();
  });

  window.addEventListener("blur", clearMovementKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearMovementKeys();
  });
  document.addEventListener("pointerlockchange", () => {
    inputDiagnostics.pointerLocked = document.pointerLockElement === canvas;
    inputDiagnostics.pointerLockError = "-";
    document.body.classList.toggle("is-pointer-locked", document.pointerLockElement === canvas);
    updateInputDebug();
  });

  scene.onBeforeRenderObservable.add(() => {
    if (!walkMode) {
      applyOrbitZoomPickPolicy(orbitCamera, options.getIsAngjiNightMode?.());
    }

    updateTreeMeshesFacingViewer();

    if (!walkMode) {
      const deltaScale = Math.min(engine.getDeltaTime() / 16.6667, 4);
      guestCharacterSystem?.update(deltaScale);
      inputDiagnostics.lastCollision = "-";
      inputDiagnostics.movementBlocked = false;
      if (treeFacingFrameCounter % 3 === 0) {
        updateDebug();
      }
      return;
    }

    if (isResettingTour) {
      updateDebug();
      return;
    }

    // Cap at 4 (15 FPS) instead of 2 (30 FPS): jump phases / animations run on
    // real seconds, so a tighter movement cap made night-mode (low FPS) jumps
    // land shorter than day jumps. Do NOT derive deltaSeconds from the capped
    // clock — that desyncs animation-driven jump states and retriggers jumps.
    const deltaScale = Math.min(engine.getDeltaTime() / 16.6667, 4);
    const deltaSeconds = engine.getDeltaTime() / 1000;
    refreshLocalMeshSets();
    walkFrameLocomotion = null;
    const modelSpeedMultiplier = ANGJI_MOVE_SPEED_MULTIPLIER;

    if (isDialogSystemBlockingInput() || isLocalDevPanelBlockingInput()) {
      keys.clear();

      pendingMouseDeltaX = 0;
      pendingMouseDeltaY = 0;
      pendingWheelDelta = 0;

      angjiGuideTourSystem?.update?.(deltaSeconds);
      npcInteractionSystem?.update?.(deltaSeconds);

      guestCharacterSystem?.update(deltaScale);
      updateJinjuGuestFloorLifecycle();

      if (isWalkCameraOutsideTourBounds()) {
        resetTourWithFade("out of bounds");
      }

      if (treeFacingFrameCounter % 3 === 0) {
        updateDebug();
      }

      return;
    }

    angjiGuideTourSystem?.update?.(deltaSeconds);
    npcInteractionSystem?.update?.(deltaSeconds);

    const applyHorizontalMove = (direction, moveSpeed, options = {}) => {
      if (options.ignoreCollision) {
        const next = walkCamera.position.add(direction.scale(moveSpeed));
        walkCamera.position.x = next.x;
        walkCamera.position.z = next.z;
        inputDiagnostics.lastCollision = "jump";
        inputDiagnostics.lastMoveDistance = moveSpeed.toFixed(3);
        inputDiagnostics.movementBlocked = false;
        lastTpsMoveBlocked = false;
        return;
      }

      const colLayer = hasColLayerConfig(activeModelState.config);
      const discreteStair = colLayer && isColLayerDiscreteStairConfig(activeModelState.config);
      const projectMaxRampStepUp = getProjectMaxRampStepUp(activeModelState.config);
      const probeMovement = direction.clone().scale(moveSpeed);
      const locomotion = colLayer ? getWalkLocomotionState() : null;
      const onColRamp = Boolean(locomotion?.onColRamp);
      const onColStair = Boolean(locomotion?.onColStair);
      const onRamp = Boolean(locomotion?.onRamp);
      const onStair = Boolean(locomotion?.onStair);
      const nearColStair = discreteStair && !onColStair && !onColRamp && isNearColDiscreteStairContext(
        BABYLON,
        scene,
        walkCamera.position,
        probeMovement,
        localGroundMeshSet
      );
      const nearColRamp = colLayer && !onColRamp && !onColStair && isNearColRampContext(
        BABYLON,
        scene,
        walkCamera.position,
        probeMovement,
        localGroundMeshSet,
        {
          maxRampStepUp: projectMaxRampStepUp,
          rampFloorBridgeHorizontal: getRampFloorBridgeHorizontal(activeModelState.config)
        }
      );
      const walkSpeedCap = CONTROLLER_SETTINGS.moveSpeed
        * modelSpeedMultiplier
        * CONTROLLER_SETTINGS.walkSpeedMultiplier
        * deltaScale;
      const effectiveMoveSpeed = (onColRamp || onColStair || onStair || onRamp || nearColRamp)
        ? Math.min(moveSpeed, walkSpeedCap)
        : moveSpeed;
      const appliedMovement = direction.clone().scale(effectiveMoveSpeed);
      const moveOptions = colLayer
        ? {
          locomotion,
          nearColRamp,
          stairAssistMode: discreteStair && (onColStair || nearColStair) ? "colDiscrete" : "none",
          preferSlopeTransition: true,
          maxStairStepUp: ANGJI_MAX_STAIR_STEP_UP,
          maxRampStepUp: projectMaxRampStepUp,
          bridgeRampFloorGaps: hasColRampFloorBridgeConfig(activeModelState.config),
          rampFloorBridgeHorizontal: getRampFloorBridgeHorizontal(activeModelState.config)
        }
        : {};
      const useColSubsteps = colLayer
        && (onColStair || onColRamp || nearColRamp)
        && appliedMovement.length() > MOVE_COLLISION_SUBSTEP_STAIR;
      const moveResult = useColSubsteps
        ? tryMoveWithCollisionSubsteps(
          BABYLON,
          scene,
          walkCamera,
          appliedMovement,
          localCollisionMeshSet,
          activeModelState.model.bounds,
          localGroundMeshSet,
          {
            substepSize: MOVE_COLLISION_SUBSTEP_STAIR,
            ...moveOptions,
            allowStepUp: typeof stepTargetY !== "number",
            onSubstep: (stepResult) => {
              if (stepResult.moved && stepResult.groundHit) {
                rememberStableGround(stepResult.groundHit, walkCamera.position.y);
              }
            }
          }
        )
        : tryMoveWithCollision(
          BABYLON,
          scene,
          walkCamera,
          appliedMovement,
          localCollisionMeshSet,
          activeModelState.model.bounds,
          localGroundMeshSet,
          {
            allowStepUp: typeof stepTargetY !== "number",
            ...moveOptions
          }
        );

      if (!useColSubsteps && moveResult.moved && moveResult.groundHit) {
        rememberStableGround(moveResult.groundHit, walkCamera.position.y);
      }

      if (moveResult.losesSupport) {
        isGrounded = false;
        verticalVelocity = Math.min(verticalVelocity, 0);
        lastStableGroundPose = null;
      }

      inputDiagnostics.lastCollision = moveResult.reason;
      inputDiagnostics.lastMoveDistance = moveResult.distance.toFixed(3);
      inputDiagnostics.movementBlocked = !moveResult.moved;
      lastTpsMoveBlocked = !moveResult.moved;
    };

    const tpsState = tpsSystem?.updateFrame?.({
      deltaSeconds,
      deltaScale,
      keys,
      isGrounded,
      verticalVelocity,
      modelSpeedMultiplier,
      forceWalkLocomotion: hasColLayerConfig(activeModelState.config)
        && (() => {
          const locomotion = getWalkLocomotionState();

          return locomotion.onColRamp || locomotion.onColStair || locomotion.onRamp || locomotion.onStair;
        })(),
      clearPlayerKeys: () => tpsSystem?.getInputController?.()?.clear(),
      resolveGroundEyeY: (position) => {
        const groundPose = getLandingGroundPoseAtPosition(
          BABYLON,
          scene,
          position,
          localGroundMeshSet,
          position.y,
          { compactProbes: isGrounded }
        );

        return groundPose?.eyeY ?? position.y;
      },
      integrateVertical: (verticalState) => integrateVerticalPhysics(deltaScale, verticalState),
      applyHorizontalMove,
      mouseDelta: {
        x: pendingMouseDeltaX,
        y: pendingMouseDeltaY
      },
      wheelDelta: pendingWheelDelta,
      onDiagnostics: ({ lastMoveCommand, moved, reason }) => {
        inputDiagnostics.lastMoveCommand = lastMoveCommand;

        if (!moved && reason) {
          inputDiagnostics.lastCollision = reason;
          inputDiagnostics.movementBlocked = false;
          lastTpsMoveBlocked = false;
        }
      }
    });

    pendingMouseDeltaX = 0;
    pendingMouseDeltaY = 0;
    pendingWheelDelta = 0;

    if (typeof tpsState?.verticalVelocity === "number") {
      verticalVelocity = tpsState.verticalVelocity;
    }

    if (typeof tpsState?.isGrounded === "boolean") {
      isGrounded = tpsState.isGrounded;
    }

    if (tpsState) {
      lastTpsRuntimeState = tpsState;
      yaw = tpsState.cameraYaw;
      pitch = tpsState.cameraPitch;
    } else {
      inputDiagnostics.lastMoveCommand = "-";
      inputDiagnostics.lastCollision = "-";
      inputDiagnostics.movementBlocked = false;
      lastTpsMoveBlocked = false;
    }

    updateFireballs(deltaScale);
    updateEnemy(deltaScale);
    guestCharacterSystem?.update(deltaScale);
    updateJinjuGuestFloorLifecycle();

    if (isWalkCameraOutsideTourBounds()) {
      resetTourWithFade("out of bounds");
    }

    if (treeFacingFrameCounter % 3 === 0) {
      updateDebug();
    }
  });

  updateDebug();

  return {
    enterWalkMode,
    enterOrbitMode,
    setModelState,
    getActiveModelState: () => activeModelState,
    isWalkMode: () => walkMode,
    getGuideTourSystem: () => angjiGuideTourSystem,
    refreshAngjiGuestsForNightMode,
    preloadCharacter: () => tpsSystem?.ensureLoaded?.()
  };
}

function createAngjiNightModeController(BABYLON, scene, ambient, sun, options = {}) {
  const DAY_CLEAR_COLOR = scene.clearColor.clone();
  const DAY_AMBIENT_INTENSITY = ambient.intensity;
  const DAY_AMBIENT_GROUND = ambient.groundColor?.clone?.() || new BABYLON.Color3(0.35, 0.32, 0.28);
  const DAY_AMBIENT_DIFFUSE = ambient.diffuse?.clone?.() || new BABYLON.Color3(1, 1, 1);
  const DAY_SUN_INTENSITY = sun.intensity;
  const DAY_SUN_DIFFUSE = sun.diffuse?.clone?.() || new BABYLON.Color3(1, 0.94, 0.82);
  const DAY_SUN_SPECULAR = sun.specular?.clone?.() || BABYLON.Color3.Black();
  const DAY_SUN_DIRECTION = sun.direction?.clone?.() || new BABYLON.Vector3(-0.45, -0.9, 0.25);
  const DAY_SUN_POSITION = sun.position?.clone?.() || new BABYLON.Vector3(80, 120, -60);
  const DAY_FOG_MODE = scene.fogMode;
  const DAY_FOG_COLOR = scene.fogColor?.clone?.() || new BABYLON.Color3(0.62, 0.72, 0.86);
  const DAY_FOG_DENSITY = typeof scene.fogDensity === "number" ? scene.fogDensity : 0.01;
  const DAY_FOG_START = typeof scene.fogStart === "number" ? scene.fogStart : 0;
  const DAY_FOG_END = typeof scene.fogEnd === "number" ? scene.fogEnd : 1000;

  // Deep night sky + cool moonlight wash.
  // Restored to pre-tuning values (same as origin/main night look ~ before
  // the site-darkness experiments).
  const NIGHT_CLEAR_COLOR = new BABYLON.Color4(0.018, 0.028, 0.06, 1);
  const NIGHT_FOG_COLOR = new BABYLON.Color3(0.03, 0.045, 0.09);
  const NIGHT_FOG_DENSITY = 0.008;
  const NIGHT_AMBIENT_INTENSITY = 0.09;
  const NIGHT_AMBIENT_DIFFUSE = new BABYLON.Color3(0.32, 0.4, 0.65);
  const NIGHT_AMBIENT_GROUND = new BABYLON.Color3(0.03, 0.04, 0.08);
  const NIGHT_MOON_INTENSITY = 1.44;
  const NIGHT_MOON_DIFFUSE = new BABYLON.Color3(0.55, 0.68, 1);
  const NIGHT_MOON_SPECULAR = new BABYLON.Color3(0.18, 0.22, 0.35);
  const NIGHT_MOON_DIRECTION = new BABYLON.Vector3(-0.32, -0.88, 0.38).normalize();
  const NIGHT_MOON_POSITION = new BABYLON.Vector3(170, 260, -130);
  const MAX_CLUSTERED_LIGHTS = 8;
  const CLUSTER_MERGE_DISTANCE = 6.5;
  const NIGHT_MATERIAL_CHUNK_SIZE = 32;
  const NIGHT_CREATE_CHUNK = 4;
  const LIGHT_INCLUDE_RADIUS = 18;
  const DOWN01_INITIAL_SPOTS = 8;
  // Bump when receiver/moon policy changes so day→night cache rebuilds.
  const NIGHT_RECEIVER_POLICY_VERSION = 13;
  // Outdoor plaza/site gets strong moon on horizontal normals; tone it down
  // so surroundings don't read brighter than the building walls.
  const NIGHT_SITE_DIFFUSE_SCALE = 0.58;
  const NIGHT_SITE_MATERIAL_RE = /(terrain|landscape|siteground|asphalt|aspalt|asp1|colgasp|paver|groundcover|vegetationgrass|grasslight|ext(?:erior)?floor|externalfloor|대지|조경)/;

  let nightMode = false;
  let nightSetupToken = 0;
  let downlightLights = [];
  let downlight02Flares = [];
  let downlight02TwinkleMaterials = [];
  let downlight02MaterialOverrides = [];
  let nightGlowLayer = null;
  let nightFlareObserver = null;
  let nightSpotCullObserver = null;
  let nightRotationObserver = null;
  let downlight02Fixtures = [];
  let nightFlareTexture = null;
  let nightSharedFlareMaterial = null;
  let nightIncludeMeshes = [];
  let nightIncludeRadius = LIGHT_INCLUDE_RADIUS;
  let nightWallOccluders = [];
  let nightAssetsSuspended = false;
  let nightReceiverPolicyVersion = 0;
  let materialSnapshots = [];
  let siteMaterialSnapshots = [];
  let sceneMaterialLightLimitSnapshots = [];
  let peopleVisibilitySnapshots = [];
  let litModelState = null;
  let moonRoot = null;
  let moonMeshes = [];

  function cancelNightSetup() {
    nightSetupToken += 1;
  }

  function yieldNightFrame() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  function isNightSetupActive(token) {
    return nightMode && token === nightSetupToken;
  }

  function notifyNightModeChange(enabled) {
    // One frame so sky paints first, then guest refresh can start.
    window.requestAnimationFrame(() => {
      if (nightMode !== enabled) {
        return;
      }

      options.onNightModeChange?.(enabled);
    });
  }

  function pickRandomItems(items, count) {
    const pool = [...items];
    const picked = [];

    while (picked.length < count && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }

    return picked;
  }

  function getActiveModelState() {
    return options.getActiveModelState?.() || null;
  }

  function isWalkMode() {
    return Boolean(options.isWalkMode?.());
  }

  function getOrbitCamera() {
    return options.getOrbitCamera?.() || null;
  }

  function applyNightOrbitZoomPolicy(isNight) {
    applyOrbitZoomPickPolicy(getOrbitCamera(), isNight);
    document.body.classList.toggle("is-night-mode", Boolean(isNight));
  }

  function canToggleNightMode() {
    return supportsNightModeConfig(getActiveModelState()?.config)
      && !options.isWalkMode?.();
  }

  function canKeepNightMode() {
    // Tour keeps night lighting; only orbit view may toggle day/night.
    return supportsNightModeConfig(getActiveModelState()?.config);
  }

  function isPeopleMaterialMesh(mesh) {
    return getMaterialNames(mesh).some((name) => {
      const normalized = normalizeName(name);
      // Geochang renamed DefaultMaterial8 -> People; keep both for safety.
      return normalized.includes("people") || normalized.includes("defaultmaterial8");
    });
  }

  function collectNightModelStates() {
    const active = getActiveModelState();

    if (!active) {
      return [];
    }

    const states = [active];

    if (active.tourModelState) {
      states.push(active.tourModelState);
    }

    if (active.orbitModelState) {
      states.push(active.orbitModelState);
    }

    return states;
  }

  function restorePeopleMeshesVisibility() {
    peopleVisibilitySnapshots.forEach((snapshot) => {
      try {
        snapshot.mesh.setEnabled(snapshot.isEnabled);
        snapshot.mesh.visibility = snapshot.visibility;
      } catch {
        // ignore stale people meshes
      }
    });
    peopleVisibilitySnapshots = [];
  }

  function hidePeopleMeshesForNight() {
    restorePeopleMeshesVisibility();

    const seen = new Set();

    collectNightModelStates().forEach((modelState) => {
      (modelState?.meshes || []).forEach((mesh) => {
        if (!mesh || seen.has(mesh.uniqueId) || !isPeopleMaterialMesh(mesh)) {
          return;
        }

        seen.add(mesh.uniqueId);
        peopleVisibilitySnapshots.push({
          mesh,
          isEnabled: mesh.isEnabled(),
          visibility: typeof mesh.visibility === "number" ? mesh.visibility : 1
        });
        mesh.setEnabled(false);
        mesh.visibility = 0;
      });
    });
  }

  function disposeMoonVisual() {
    moonMeshes.forEach((mesh) => {
      try {
        mesh.material?.dispose?.();
        mesh.dispose();
      } catch {
        // ignore stale moon meshes
      }
    });
    moonMeshes = [];

    try {
      moonRoot?.dispose();
    } catch {
      // ignore
    }

    moonRoot = null;
  }

  function ensureMoonVisual() {
    if (moonRoot) {
      moonRoot.setEnabled(true);
      return;
    }

    moonRoot = new BABYLON.TransformNode("angji-moon-root", scene);

    const moon = BABYLON.MeshBuilder.CreateSphere("angji-moon", {
      diameter: 22,
      segments: 24
    }, scene);
    moon.parent = moonRoot;
    moon.position.copyFrom(NIGHT_MOON_POSITION);
    moon.isPickable = false;
    moon.checkCollisions = false;
    moon.applyFog = false;
    moon.infiniteDistance = true;

    const moonMat = new BABYLON.StandardMaterial("angji-moon-mat", scene);
    moonMat.disableLighting = true;
    moonMat.emissiveColor = new BABYLON.Color3(0.92, 0.95, 1);
    moonMat.diffuseColor = BABYLON.Color3.Black();
    moonMat.specularColor = BABYLON.Color3.Black();
    moon.material = moonMat;

    const halo = BABYLON.MeshBuilder.CreateSphere("angji-moon-halo", {
      diameter: 48,
      segments: 16
    }, scene);
    halo.parent = moonRoot;
    halo.position.copyFrom(NIGHT_MOON_POSITION);
    halo.isPickable = false;
    halo.checkCollisions = false;
    halo.applyFog = false;
    halo.infiniteDistance = true;
    halo.visibility = 0.55;

    const haloMat = new BABYLON.StandardMaterial("angji-moon-halo-mat", scene);
    haloMat.disableLighting = true;
    haloMat.emissiveColor = new BABYLON.Color3(0.35, 0.45, 0.85);
    haloMat.diffuseColor = BABYLON.Color3.Black();
    haloMat.specularColor = BABYLON.Color3.Black();
    haloMat.alpha = 0.18;
    haloMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    halo.material = haloMat;

    const glow = BABYLON.MeshBuilder.CreateSphere("angji-moon-glow", {
      diameter: 78,
      segments: 12
    }, scene);
    glow.parent = moonRoot;
    glow.position.copyFrom(NIGHT_MOON_POSITION);
    glow.isPickable = false;
    glow.checkCollisions = false;
    glow.applyFog = false;
    glow.infiniteDistance = true;
    glow.visibility = 0.35;

    const glowMat = new BABYLON.StandardMaterial("angji-moon-glow-mat", scene);
    glowMat.disableLighting = true;
    glowMat.emissiveColor = new BABYLON.Color3(0.12, 0.18, 0.42);
    glowMat.diffuseColor = BABYLON.Color3.Black();
    glowMat.specularColor = BABYLON.Color3.Black();
    glowMat.alpha = 0.08;
    glowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    glow.material = glowMat;

    moonMeshes = [moon, halo, glow];
  }

  function disposeNightFlareSystem() {
    if (nightFlareObserver) {
      scene.onBeforeRenderObservable.remove(nightFlareObserver);
      nightFlareObserver = null;
    }

    if (nightRotationObserver) {
      scene.onBeforeRenderObservable.remove(nightRotationObserver);
      nightRotationObserver = null;
    }

    downlight02Fixtures.forEach((fixture) => {
      releaseDown02Fixture(fixture, { keepDescriptor: false });
    });
    downlight02Fixtures = [];

    downlight02Flares.forEach((flare) => {
      try {
        nightGlowLayer?.removeIncludedOnlyMesh?.(flare.mesh);
        flare.mesh?.dispose();

        if (!flare.sharedMaterial) {
          flare.material?.dispose();
        }
      } catch {
        // ignore stale flares
      }
    });
    downlight02Flares = [];
    downlight02TwinkleMaterials = [];

    try {
      nightGlowLayer?.dispose?.();
    } catch {
      // ignore
    }
    nightGlowLayer = null;

    try {
      nightSharedFlareMaterial?.dispose?.();
    } catch {
      // ignore
    }
    nightSharedFlareMaterial = null;

    try {
      nightFlareTexture?.dispose?.();
    } catch {
      // ignore
    }
    nightFlareTexture = null;
  }

  function ensureNightFlareTexture() {
    if (nightFlareTexture) {
      return nightFlareTexture;
    }

    const size = 128;
    const texture = new BABYLON.DynamicTexture("angji-night-flare-tex", { width: size, height: size }, scene, false);
    const context = texture.getContext();
    const center = size / 2;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    // Match original building-twinkle flare softness.
    gradient.addColorStop(0, "rgba(255, 245, 210, 1)");
    gradient.addColorStop(0.18, "rgba(255, 220, 140, 0.95)");
    gradient.addColorStop(0.45, "rgba(255, 180, 80, 0.35)");
    gradient.addColorStop(1, "rgba(255, 160, 60, 0)");
    context.clearRect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.hasAlpha = true;
    texture.update();
    nightFlareTexture = texture;
    return texture;
  }

  function ensureSharedFlareMaterial() {
    if (nightSharedFlareMaterial) {
      return nightSharedFlareMaterial;
    }

    const texture = ensureNightFlareTexture();
    const material = new BABYLON.StandardMaterial("angji-down02-flare-shared-mat", scene);
    material.diffuseTexture = texture;
    material.opacityTexture = texture;
    material.emissiveTexture = texture;
    material.emissiveColor = new BABYLON.Color3(1, 0.85, 0.45);
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    material.alpha = 0.75;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = false;
    nightSharedFlareMaterial = material;
    return material;
  }

  function ensureNightGlowLayer() {
    if (nightGlowLayer || typeof BABYLON.GlowLayer !== "function") {
      return nightGlowLayer;
    }

    nightGlowLayer = new BABYLON.GlowLayer("angji-night-glow", scene, {
      mainTextureFixedSize: 256,
      blurKernelSize: 64
    });
    nightGlowLayer.intensity = 1.15;
    return nightGlowLayer;
  }

  function createDown02Flare(position, index) {
    const material = ensureSharedFlareMaterial();
    const mesh = BABYLON.MeshBuilder.CreatePlane(`angji-down02-flare-${index}`, {
      width: 1,
      height: 1,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    mesh.position.copyFrom(position);
    // Sit the glow below the fixture / spot origin so it reads better from afar.
    mesh.position.y -= 0.1;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.applyFog = false;
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.renderingGroupId = 0;

    return {
      mesh,
      material,
      sharedMaterial: true,
      baseScale: 0.7,
      phase: Math.random() * Math.PI * 2,
      speed: 1.4 + Math.random() * 1.8,
      sparkChance: 0.012 + Math.random() * 0.02
    };
  }

  function collectMeshesNearPosition(meshes, position, radius) {
    if (!position || !meshes?.length) {
      return [];
    }

    const radiusSq = radius * radius;

    return meshes.filter((mesh) => {
      try {
        const center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld;

        if (!center) {
          return false;
        }

        return BABYLON.Vector3.DistanceSquared(center, position) <= radiusSq;
      } catch {
        return false;
      }
    });
  }

  function collectMeshesNearPositions(meshes, positions, radius) {
    if (!positions?.length) {
      return meshes || [];
    }

    const seen = new Set();
    const result = [];

    positions.forEach((position) => {
      collectMeshesNearPosition(meshes, position, radius).forEach((mesh) => {
        if (seen.has(mesh.uniqueId)) {
          return;
        }

        seen.add(mesh.uniqueId);
        result.push(mesh);
      });
    });

    return result.length ? result : (meshes || []);
  }

  /**
   * SpotLights have no depth occlusion — anything in includedOnlyMeshes within
   * range is lit even through walls. Drop wall receivers and reject meshes whose
   * center is blocked from the fixture by a COL wall slab.
   */
  function isMeshOccludedFromLight(lightPosition, mesh, wallOccluders) {
    if (!lightPosition || !mesh || !wallOccluders?.length) {
      return false;
    }

    let center;

    try {
      center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld;
    } catch {
      return true;
    }

    if (!center) {
      return true;
    }

    const toMesh = center.subtract(lightPosition);
    const distance = toMesh.length();

    if (distance < 0.25) {
      return false;
    }

    const direction = toMesh.scale(1 / distance);
    const ray = new BABYLON.Ray(lightPosition, direction, Math.max(0.05, distance - 0.08));

    for (let index = 0; index < wallOccluders.length; index += 1) {
      const wall = wallOccluders[index];

      if (!wall || wall.isDisposed?.() || wall === mesh) {
        continue;
      }

      // Skip walls that contain / own this mesh (same partition).
      if (wall.uniqueId === mesh.uniqueId) {
        continue;
      }

      let hit;

      try {
        hit = ray.intersectsMesh(wall, true);
      } catch {
        continue;
      }

      if (hit?.hit && typeof hit.distance === "number" && hit.distance < distance - 0.12) {
        return true;
      }
    }

    return false;
  }

  function getNightMeshNameBlob(mesh) {
    return normalizeName([
      mesh?.name || "",
      mesh?.id || "",
      ...getMaterialNames(mesh)
    ].join(" "));
  }

  function isMostlyHorizontalNightSlab(mesh) {
    const bounds = getCachedMeshBounds(BABYLON, mesh);

    if (!bounds?.size) {
      return false;
    }

    const height = bounds.size.y;
    const footprint = Math.max(bounds.size.x, bounds.size.z);

    // Thin wide slabs = plaza / site ground (not walls or tall volumes).
    return footprint >= 2.5 && height <= Math.min(3.8, footprint * 0.42);
  }

  function boundsOverlapHorizontal(a, b, pad = 1.5, yPad = 2.5) {
    if (!a || !b) {
      return false;
    }

    return (
      a.min.x <= b.max.x + pad
      && a.max.x >= b.min.x - pad
      && a.min.z <= b.max.z + pad
      && a.max.z >= b.min.z - pad
      && a.min.y <= b.max.y + yPad
      && a.max.y >= b.min.y - yPad
    );
  }

  function meshOverlapsExternalSiteCol(mesh, externalFloorMeshes) {
    const meshBounds = getCachedMeshBounds(BABYLON, mesh);

    if (!meshBounds) {
      return false;
    }

    return (externalFloorMeshes || []).some((colMesh) => {
      const colBounds = getCachedMeshBounds(BABYLON, colMesh);
      return boundsOverlapHorizontal(meshBounds, colBounds);
    });
  }

  function isNightSiteMaterialName(nameBlob) {
    return NIGHT_SITE_MATERIAL_RE.test(nameBlob || "");
  }

  function isNightSiteScaleReceiver(mesh) {
    if (!mesh) {
      return false;
    }

    // Invisible COL outdoor floors + any mesh tagged during night setup.
    if (mesh.metadata?.angjiExternalFloorSurface || mesh.metadata?.nightSiteScaleReceiver) {
      return true;
    }

    // Never treat building walls as site ground.
    if (mesh.metadata?.angjiWallSurface || mesh.metadata?.angjiCollisionRole === "wall") {
      return false;
    }

    const nameBlob = getNightMeshNameBlob(mesh);

    // Visual outdoor mats: grass / pavers / COL_G_ASP1 asphalt / groundcover.
    // (Old keyword list missed these, so plaza kept Spot + full moon wash.)
    if (isNightSiteMaterialName(nameBlob)) {
      return true;
    }

    return false;
  }

  function markNightSiteScaleReceivers(modelState) {
    const externalFloorMeshes = modelState?.angjiExternalFloorMeshes || [];
    const litMeshes = collectNightLitMeshes(modelState);
    let marked = 0;

    litMeshes.forEach((mesh) => {
      if (!mesh || mesh.isDisposed?.()) {
        return;
      }

      if (mesh.metadata?.angjiWallSurface || mesh.metadata?.angjiCollisionRole === "wall") {
        if (mesh.metadata?.nightSiteScaleReceiver) {
          mesh.metadata.nightSiteScaleReceiver = false;
        }
        return;
      }

      const byMaterial = isNightSiteMaterialName(getNightMeshNameBlob(mesh));
      const byColOverlap = externalFloorMeshes.length > 0
        && isMostlyHorizontalNightSlab(mesh)
        && meshOverlapsExternalSiteCol(mesh, externalFloorMeshes);
      const isSite = Boolean(
        mesh.metadata?.angjiExternalFloorSurface
        || byMaterial
        || byColOverlap
      );

      mesh.metadata = {
        ...(mesh.metadata || {}),
        nightSiteScaleReceiver: isSite
      };

      if (isSite) {
        marked += 1;
      }
    });

    console.info(`[night] site receivers marked=${marked} (moon-only + diffuse scale)`);
    return marked;
  }

  function captureSiteMaterialState(material) {
    return {
      material,
      diffuseColor: material.diffuseColor?.clone?.() || null,
      albedoColor: material.albedoColor?.clone?.() || null
    };
  }

  function applySiteMaterialDarkeningFromSnapshot(snapshot, scale = NIGHT_SITE_DIFFUSE_SCALE) {
    const { material } = snapshot || {};

    if (!material) {
      return;
    }

    if (typeof material.unfreeze === "function") {
      material.unfreeze();
    }

    if (snapshot.diffuseColor && material.diffuseColor?.copyFrom) {
      material.diffuseColor.copyFrom(snapshot.diffuseColor);
      material.diffuseColor.scaleInPlace(scale);
    }

    if (snapshot.albedoColor && material.albedoColor?.copyFrom) {
      material.albedoColor.copyFrom(snapshot.albedoColor);
      material.albedoColor.scaleInPlace(scale);
    }

    if (typeof material.freeze === "function") {
      material.freeze();
    }
  }

  function restoreSiteMaterialState(snapshot) {
    const { material } = snapshot || {};

    if (!material) {
      return;
    }

    if (typeof material.unfreeze === "function") {
      material.unfreeze();
    }

    if (snapshot.diffuseColor && material.diffuseColor?.copyFrom) {
      material.diffuseColor.copyFrom(snapshot.diffuseColor);
    }

    if (snapshot.albedoColor && material.albedoColor?.copyFrom) {
      material.albedoColor.copyFrom(snapshot.albedoColor);
    }

    if (typeof material.freeze === "function") {
      material.freeze();
    }
  }

  function restoreNightSiteMaterials() {
    siteMaterialSnapshots.forEach(restoreSiteMaterialState);
    siteMaterialSnapshots = [];
  }

  function applyNightSiteMaterials(modelState) {
    restoreNightSiteMaterials();

    const siteMeshes = collectNightLitMeshes(modelState).filter((mesh) => isNightSiteScaleReceiver(mesh));
    const materials = collectUniqueMaterialsFromMeshes(siteMeshes);

    siteMaterialSnapshots = materials.map((material) => {
      const snapshot = captureSiteMaterialState(material);
      applySiteMaterialDarkeningFromSnapshot(snapshot);
      return snapshot;
    });
  }

  function filterNightLightReceivers(meshes, lightPosition) {
    const candidates = (meshes || []).filter((mesh) => {
      if (!mesh || mesh.isDisposed?.()) {
        return false;
      }

      // Surrounding site/terrain: moon-only (spots wash large outdoor slabs).
      if (isNightSiteScaleReceiver(mesh)) {
        return false;
      }

      return true;
    });

    if (!lightPosition || !nightWallOccluders.length) {
      return candidates;
    }

    // Drop meshes whose center is behind a COL wall from this fixture.
    return candidates.filter((mesh) => !isMeshOccludedFromLight(lightPosition, mesh, nightWallOccluders));
  }

  function resolveLightIncludeMeshes(position) {
    if (!nightIncludeMeshes.length) {
      return [];
    }

    if (!position) {
      return filterNightLightReceivers(nightIncludeMeshes, null);
    }

    const near = collectMeshesNearPosition(nightIncludeMeshes, position, nightIncludeRadius);
    const pool = near.length ? near : nightIncludeMeshes;
    const filtered = filterNightLightReceivers(pool, position);

    if (filtered.length) {
      return filtered;
    }

    // Occlusion can over-reject (coplanar COL). Keep near non-wall receivers.
    return pool.filter((mesh) => !mesh.metadata?.angjiWallSurface);
  }

  function assignSpotLightReceivers(light, position) {
    const includeMeshes = resolveLightIncludeMeshes(position);

    // Babylon: unset / empty includedOnlyMeshes means "light the whole scene".
    // After wall-occlusion filtering that often left lists empty and washed out night.
    if (includeMeshes.length) {
      light.includedOnlyMeshes = includeMeshes;
      light.metadata = { ...(light.metadata || {}), nightNoReceivers: false };
      return true;
    }

    light.includedOnlyMeshes = [];
    light.setEnabled(false);
    light.metadata = {
      ...(light.metadata || {}),
      nightNoReceivers: true,
      nightRotationActive: false
    };
    return false;
  }

  function refreshNightWallOccluders(modelState) {
    nightWallOccluders = (modelState?.collisionMeshes || []).filter((mesh) => (
      mesh
      && !mesh.isDisposed?.()
      && mesh.isEnabled?.() !== false
      && (
        mesh.metadata?.angjiWallSurface
        || mesh.metadata?.angjiCollisionRole === "wall"
      )
    ));
  }

  function getNightColOccluderMeshes(modelState) {
    return (modelState?.collisionMeshes || []).filter((mesh) => (
      mesh
      && !mesh.isDisposed?.()
      && mesh.isEnabled?.() !== false
      && (
        mesh.metadata?.angjiWallSurface
        || mesh.metadata?.angjiFurnitureSurface
        || mesh.metadata?.angjiCollisionLayer
      )
    ));
  }

  function isDown02FlareOccluded(flarePosition, occluders) {
    const camera = scene.activeCamera;

    if (!camera || !occluders.length) {
      return false;
    }

    const origin = camera.globalPosition || camera.position;
    const toFlare = flarePosition.subtract(origin);
    const distance = toFlare.length();

    if (distance < 0.08) {
      return false;
    }

    const direction = toFlare.scale(1 / distance);
    const ray = new BABYLON.Ray(origin, direction, Math.max(0.05, distance - 0.08));

    // Prefer direct mesh tests so invisible COL walls still block (isVisible=false).
    for (let index = 0; index < occluders.length; index += 1) {
      const mesh = occluders[index];

      if (!mesh || mesh.isDisposed?.()) {
        continue;
      }

      const hit = ray.intersectsMesh(mesh, true);

      if (hit?.hit && hit.distance < distance - 0.05) {
        return true;
      }
    }

    return false;
  }

  function getMeshLightDirection(BABYLON, mesh) {
    mesh.computeWorldMatrix(true);
    // Architectural downlights are authored facing local -Y.
    const localDown = new BABYLON.Vector3(0, -1, 0);
    const worldMatrix = mesh.getWorldMatrix();
    const direction = BABYLON.Vector3.TransformNormal(localDown, worldMatrix);

    if (direction.lengthSquared() < 1e-6) {
      return new BABYLON.Vector3(0, -1, 0);
    }

    return direction.normalize();
  }

  // Down0 fixtures are often authored sideways in the GLB. Always aim world -Y
  // so the wash falls on floors, and walls that sit inside the cone also light.
  function getDown0LightDirection(BABYLON) {
    return new BABYLON.Vector3(0, -1, 0);
  }

  function getWallSignLightDirection(BABYLON, mesh) {
    mesh.computeWorldMatrix(true);
    const center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.()
      || mesh.getAbsolutePosition().clone();
    const faceYaw = getTreeMeshFaceYawOffset(BABYLON, mesh);
    const forward = new BABYLON.Vector3(Math.sin(faceYaw), 0, Math.cos(faceYaw));
    const candidates = [forward, forward.scale(-1)];

    let best = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    candidates.forEach((candidate) => {
      let score = 0;

      nightWallOccluders.forEach((wall) => {
        const wallCenter = wall.getBoundingInfo?.()?.boundingBox?.centerWorld;

        if (!wallCenter) {
          return;
        }

        const toWall = wallCenter.subtract(center);
        toWall.y = 0;
        const distance = toWall.length();

        if (distance < 0.2 || distance > 14) {
          return;
        }

        toWall.scaleInPlace(1 / distance);
        const alignment = BABYLON.Vector3.Dot(candidate, toWall);

        if (alignment > 0) {
          score += alignment * (1 / (0.5 + distance));
        }
      });

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    });

    const direction = best.clone();
    direction.y = -0.18;

    if (direction.lengthSquared() < 1e-6) {
      return new BABYLON.Vector3(0, -0.15, 1).normalize();
    }

    return direction.normalize();
  }

  function meshMatchesMaterialNames(mesh, materialNames) {
    if (!materialNames?.length) {
      return false;
    }

    const targets = materialNames.map((name) => normalizeName(name));

    return getMaterialNames(mesh).some((name) => targets.includes(normalizeName(name)));
  }

  function isDown0FixtureMesh(mesh) {
    return getMaterialNames(mesh).some((name) => (
      isAngjiDownlight0MaterialName(name)
      || isAngjiDownlightMaterialName(name)
      || isAngjiDownlight02MaterialName(name)
      || isAngjiDownlight03MaterialName(name)
    ));
  }

  // Eligible to receive Down0: visible scene geometry inside the Spot range/cone.
  // No fixed wall/floor material list — only skip invisible COL, movers, and fixtures.
  function isDown0RangeReceiver(mesh) {
    if (!mesh || mesh.isDisposed?.()) {
      return false;
    }

    if (mesh.metadata?.angjiCollisionInvisible || mesh.metadata?.angjiCollisionLayer) {
      return false;
    }

    if (
      mesh.metadata?.tourGuest
      || mesh.metadata?.treeMesh
      || mesh.metadata?.peopleYawMesh
    ) {
      return false;
    }

    if (isDown0FixtureMesh(mesh)) {
      return false;
    }

    if (typeof mesh.visibility === "number" && mesh.visibility <= 0.02) {
      return false;
    }

    if (mesh.isEnabled?.() === false) {
      return false;
    }

    return true;
  }

  function collectDown0RangePool(modelState) {
    return collectNightLitMeshes(modelState).filter((mesh) => isDown0RangeReceiver(mesh));
  }

  function resolveDown0RangeReceivers(position, direction, range, options = {}) {
    const searchRadius = Math.max(range + 2, 6);
    const coneCos = typeof options.coneCos === "number"
      ? options.coneCos
      : Math.cos(BABYLON.Tools.ToRadians(70));
    const modelState = litModelState || getActiveModelState();
    const poolSource = options.pool || collectDown0RangePool(modelState);
    const pool = collectMeshesNearPosition(poolSource, position, searchRadius);
    const receivers = [];

    pool.forEach((mesh) => {
      if (!isDown0RangeReceiver(mesh)) {
        return;
      }

      let center;

      try {
        center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld;
      } catch {
        return;
      }

      if (!center) {
        return;
      }

      const toMesh = center.subtract(position);
      const distance = toMesh.length();

      if (distance > range) {
        return;
      }

      if (distance < 0.12) {
        receivers.push(mesh);
        return;
      }

      // Inside Spot cone (world -Y aim by default).
      if (BABYLON.Vector3.Dot(toMesh.normalize(), direction) < coneCos) {
        return;
      }

      receivers.push(mesh);
    });

    return receivers;
  }

  function getRlbLightProfile(type, nightLighting = {}) {
    const base = RLB_NIGHT_LIGHT_PROFILES[type] || {
      intensity: 20,
      range: 10,
      angle: 110
    };
    return {
      intensity: typeof nightLighting.rlbDefaultIntensity === "number"
        ? nightLighting.rlbDefaultIntensity
        : base.intensity,
      range: typeof nightLighting.rlbDefaultRange === "number"
        ? nightLighting.rlbDefaultRange
        : base.range,
      angleDegrees: typeof nightLighting.rlbDefaultAngleDegrees === "number"
        ? nightLighting.rlbDefaultAngleDegrees
        : base.angle
    };
  }

  function instantiateRlbPresetFixture(fixture, type, nightLighting = {}) {
    if (fixture.instantiated || !fixture.center || fixture.mesh?.isDisposed?.()) {
      return false;
    }

    const profile = getRlbLightProfile(type, nightLighting);
    const { mesh, index } = fixture;
    const original = mesh.material;

    if (original && !original.subMaterials) {
      const cloned = original.clone(`angji-rlb-${type}-mat-${index}`);
      mesh.material = cloned;
      const override = {
        mesh,
        originalMaterial: original,
        clonedMaterial: cloned
      };
      downlight02MaterialOverrides.push(override);
      fixture.materialOverride = override;
      applyDownlightEmissive(BABYLON, cloned, {
        emissiveColor: new BABYLON.Color3(1, 0.88, 0.55),
        emissiveIntensity: 2.8
      });
    }

    const light = new BABYLON.SpotLight(
      `angji-rlb-${type}-${index}`,
      fixture.center.clone(),
      new BABYLON.Vector3(0, -1, 0),
      (Math.max(20, profile.angleDegrees) * Math.PI) / 180,
      1.6,
      scene
    );
    light.diffuse = new BABYLON.Color3(1, 0.92, 0.7);
    light.specular = new BABYLON.Color3(0.22, 0.16, 0.08);
    light.intensity = profile.intensity;
    light.range = profile.range;
    light.falloffType = BABYLON.Light.FALLOFF_GLTF;
    light.metadata = {
      nightRotationActive: true,
      nightFixtureGroup: `rlb_${type}`,
      rlbType: type
    };
    assignSpotLightReceivers(light, fixture.center);
    light.setEnabled(true);

    downlightLights.push(light);
    fixture.light = light;
    fixture.instantiated = true;
    fixture.active = true;
    return true;
  }

  function softDeactivateRlbFixture(fixture) {
    if (!fixture) {
      return;
    }

    fixture.active = false;

    if (fixture.light) {
      fixture.light.metadata = { ...(fixture.light.metadata || {}), nightRotationActive: false };
      fixture.light.setEnabled(false);
    }

    if (fixture.materialOverride && fixture.mesh && !fixture.mesh.isDisposed?.()) {
      try {
        fixture.mesh.material = fixture.materialOverride.originalMaterial;
      } catch {
        // ignore
      }
    }
  }

  function softActivateRlbFixture(fixture, nightLighting = {}) {
    if (!fixture?.center || fixture.mesh?.isDisposed?.()) {
      return;
    }

    const type = fixture.rlbType || String(fixture.group || "").replace(/^rlb_/, "");

    if (!type) {
      return;
    }

    if (!fixture.instantiated) {
      instantiateRlbPresetFixture(fixture, type, nightLighting);
      return;
    }

    fixture.active = true;

    if (fixture.light) {
      assignSpotLightReceivers(fixture.light, fixture.center);
      fixture.light.metadata = {
        ...(fixture.light.metadata || {}),
        nightRotationActive: true,
        nightNoReceivers: false
      };
      fixture.light.setEnabled(true);
    }

    if (fixture.materialOverride && fixture.mesh && !fixture.mesh.isDisposed?.()) {
      try {
        fixture.mesh.material = fixture.materialOverride.clonedMaterial;
      } catch {
        // ignore
      }
    }
  }

  function activateNearestRlbFixtures(maxCount, nightLighting = {}) {
    const camera = scene.activeCamera;

    if (!camera?.position) {
      return 0;
    }

    const rlbFixtures = downlight02Fixtures.filter((fixture) => (
      fixture.group?.startsWith("rlb_") && fixture.center
    ));
    const scored = rlbFixtures
      .map((fixture) => ({
        fixture,
        distanceSq: BABYLON.Vector3.DistanceSquared(camera.position, fixture.center)
      }))
      .sort((left, right) => left.distanceSq - right.distanceSq);
    let activated = 0;

    scored.slice(0, Math.max(0, maxCount)).forEach(({ fixture }) => {
      softActivateRlbFixture(fixture, nightLighting);
      fixture._softStamp = performance.now();
      activated += 1;
    });

    return activated;
  }

  function createRlbPresetTypeLights(modelState, nightLighting = {}) {
    const byType = collectAngjiLightsByPresetType(modelState);
    let descriptors = 0;
    const summary = [];

    for (const [type, meshes] of byType.entries()) {
      meshes.forEach((mesh) => {
        const fixture = createFixtureDescriptor(mesh, `rlb_${type}`, descriptors);
        fixture.rlbType = type;
        downlight02Fixtures.push(fixture);
        descriptors += 1;
      });

      summary.push(`${type}:${meshes.length}`);
    }

    console.info(
      `[night] RLB preset descriptors=${descriptors} lazy=on`
      + (summary.length ? ` · ${summary.join(" ")}` : " · none found")
    );
    return { created: 0, descriptors, byType, summary };
  }

  function createDown0WallWashLights(downlight0Meshes, options = {}) {
    const {
      intensity = 24,
      range = 12,
      angleDegrees = 140,
      pool = null
    } = options;
    const angle = (Math.max(20, angleDegrees) * Math.PI) / 180;
    const coneCos = Math.cos(angle * 0.5);
    const worldDown = getDown0LightDirection(BABYLON);
    const receiverPool = pool || collectDown0RangePool(litModelState || getActiveModelState());
    let created = 0;
    let litCount = 0;

    downlight0Meshes.forEach((mesh, index) => {
      mesh.computeWorldMatrix(true);
      const center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.();

      if (!center) {
        console.warn(`[night] Down0 fixture ${index} missing bounds — skipped`);
        return;
      }

      const direction = worldDown.clone();
      const lightOrigin = center.add(new BABYLON.Vector3(0, 0.25, 0));
      const receivers = resolveDown0RangeReceivers(
        lightOrigin,
        direction,
        range,
        { coneCos, pool: receiverPool }
      );

      const light = new BABYLON.SpotLight(
        `angji-down0-wallwash-${index}`,
        lightOrigin,
        direction,
        angle,
        1.15,
        scene
      );
      light.diffuse = new BABYLON.Color3(1, 0.94, 0.78);
      light.specular = new BABYLON.Color3(0.28, 0.22, 0.12);
      light.intensity = intensity;
      light.range = range;
      light.falloffType = BABYLON.Light.FALLOFF_GLTF;

      if (receivers.length) {
        light.includedOnlyMeshes = receivers;
        light.setEnabled(true);
        light.metadata = {
          isDown0: true,
          nightAlwaysOn: true,
          nightRotationActive: true,
          nightNoReceivers: false,
          nightFixtureGroup: "down0",
          nightReceiverMode: "range"
        };
        litCount += 1;
      } else {
        light.includedOnlyMeshes = [];
        light.setEnabled(false);
        light.metadata = {
          isDown0: true,
          nightAlwaysOn: false,
          nightRotationActive: false,
          nightNoReceivers: true,
          nightFixtureGroup: "down0"
        };
        console.warn(`[night] Down0 fixture ${index} has no meshes in range/cone`);
      }

      downlightLights.push(light);
      created += 1;
    });

    console.info(
      `[night] Down0 fixtures mesh=${downlight0Meshes.length} lights=${created} lit=${litCount}`
      + ` aim=world-Y- angle=${angleDegrees} range=${range} mode=range`
    );
    return litCount;
  }

  function createFixtureDescriptor(mesh, group, index) {
    mesh.computeWorldMatrix(true);
    const center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.() || null;

    return {
      mesh,
      group,
      index,
      center,
      light: null,
      flare: null,
      twinkle: null,
      materialOverride: null,
      active: false,
      instantiated: false
    };
  }

  function instantiateDown02Fixture(fixture) {
    if (fixture.instantiated || !fixture.center || fixture.mesh?.isDisposed?.()) {
      return;
    }

    const { mesh, index } = fixture;
    const original = mesh.material;

    if (original && !original.subMaterials) {
      const cloned = original.clone(`angji-down02-twinkle-mat-${index}`);
      mesh.material = cloned;
      const override = {
        mesh,
        originalMaterial: original,
        clonedMaterial: cloned
      };
      downlight02MaterialOverrides.push(override);
      fixture.materialOverride = override;
      applyDownlightEmissive(BABYLON, cloned, {
        emissiveColor: new BABYLON.Color3(1, 0.86, 0.48),
        emissiveIntensity: 3.4
      });
      const twinkleEntry = {
        material: cloned,
        baseIntensity: typeof cloned.emissiveIntensity === "number" ? cloned.emissiveIntensity : 3.4,
        baseColor: cloned.emissiveColor?.clone?.() || new BABYLON.Color3(1, 0.86, 0.48),
        phase: index * 0.73 + Math.random(),
        speed: 1.4 + (index % 5) * 0.25 + Math.random() * 0.6,
        sparkChance: 0.012 + Math.random() * 0.02,
        rotationActive: true
      };
      downlight02TwinkleMaterials.push(twinkleEntry);
      fixture.twinkle = twinkleEntry;
    }

    const light = new BABYLON.SpotLight(
      `angji-down02-spot-${index}`,
      fixture.center.clone(),
      new BABYLON.Vector3(0, -1, 0),
      Math.PI * 0.78,
      1.9,
      scene
    );
    light.diffuse = new BABYLON.Color3(1, 0.9, 0.62);
    light.specular = new BABYLON.Color3(0.2, 0.15, 0.08);
    light.intensity = 7.4;
    light.range = 14;
    light.falloffType = BABYLON.Light.FALLOFF_GLTF;
    light.metadata = { nightRotationActive: true, nightFixtureGroup: fixture.group };
    assignSpotLightReceivers(light, fixture.center);

    downlightLights.push(light);
    fixture.light = light;

    const flareEntry = createDown02Flare(fixture.center.clone(), index);
    flareEntry.rotationActive = true;
    downlight02Flares.push(flareEntry);
    fixture.flare = flareEntry;
    fixture.instantiated = true;
    fixture.active = true;
  }

  function releaseDown02Fixture(fixture, options = {}) {
    const keepDescriptor = options.keepDescriptor !== false;

    if (!fixture?.instantiated && !fixture?.light && !fixture?.flare) {
      if (!keepDescriptor) {
        fixture.active = false;
        fixture.instantiated = false;
      }

      return;
    }

    if (fixture.light) {
      const lightIndex = downlightLights.indexOf(fixture.light);

      if (lightIndex >= 0) {
        downlightLights.splice(lightIndex, 1);
      }

      try {
        fixture.light.dispose();
      } catch {
        // ignore
      }

      fixture.light = null;
    }

    if (fixture.flare) {
      const flareIndex = downlight02Flares.indexOf(fixture.flare);

      if (flareIndex >= 0) {
        downlight02Flares.splice(flareIndex, 1);
      }

      try {
        nightGlowLayer?.removeIncludedOnlyMesh?.(fixture.flare.mesh);
        fixture.flare.mesh?.dispose();
      } catch {
        // ignore
      }

      fixture.flare = null;
    }

    if (fixture.twinkle) {
      const twinkleIndex = downlight02TwinkleMaterials.indexOf(fixture.twinkle);

      if (twinkleIndex >= 0) {
        downlight02TwinkleMaterials.splice(twinkleIndex, 1);
      }

      fixture.twinkle = null;
    }

    if (fixture.materialOverride) {
      const overrideIndex = downlight02MaterialOverrides.indexOf(fixture.materialOverride);

      if (overrideIndex >= 0) {
        downlight02MaterialOverrides.splice(overrideIndex, 1);
      }

      try {
        if (fixture.mesh && !fixture.mesh.isDisposed?.()) {
          fixture.mesh.material = fixture.materialOverride.originalMaterial;
        }
      } catch {
        // ignore
      }

      try {
        fixture.materialOverride.clonedMaterial?.dispose?.();
      } catch {
        // ignore
      }

      fixture.materialOverride = null;
    }

    fixture.active = false;
    fixture.instantiated = false;
  }

  function softDeactivateDown02Fixture(fixture) {
    if (!fixture) {
      return;
    }

    fixture.active = false;

    if (fixture.light) {
      fixture.light.metadata = { ...(fixture.light.metadata || {}), nightRotationActive: false };
      fixture.light.setEnabled(false);
    }

    if (fixture.flare) {
      fixture.flare.rotationActive = false;
      try {
        fixture.flare.mesh.isVisible = false;
      } catch {
        // ignore
      }
    }

    if (fixture.twinkle) {
      fixture.twinkle.rotationActive = false;
    }

    if (fixture.materialOverride && fixture.mesh && !fixture.mesh.isDisposed?.()) {
      try {
        fixture.mesh.material = fixture.materialOverride.originalMaterial;
      } catch {
        // ignore
      }
    }
  }

  function softActivateDown02Fixture(fixture) {
    if (!fixture?.center || fixture.mesh?.isDisposed?.()) {
      return;
    }

    if (!fixture.instantiated) {
      instantiateDown02Fixture(fixture);
      return;
    }

    fixture.active = true;

    if (fixture.light) {
      fixture.light.metadata = { ...(fixture.light.metadata || {}), nightRotationActive: true };
      fixture.light.setEnabled(true);
    }

    if (fixture.flare) {
      fixture.flare.rotationActive = true;
    }

    if (fixture.twinkle) {
      fixture.twinkle.rotationActive = true;
    }

    if (fixture.materialOverride && fixture.mesh && !fixture.mesh.isDisposed?.()) {
      try {
        fixture.mesh.material = fixture.materialOverride.clonedMaterial;
      } catch {
        // ignore
      }
    }
  }

  function trimSoftFixtureCache(groupFixtures, activeCount) {
    // Keep a small warm pool so re-visits are free, but don't let every
    // rotated fixture permanently hold a SpotLight.
    const maxSoft = Math.max(activeCount * 4, activeCount + 6);
    const inactive = groupFixtures
      .filter((fixture) => fixture.instantiated && !fixture.active)
      .sort((left, right) => (left._softStamp || 0) - (right._softStamp || 0));

    while (inactive.length > maxSoft) {
      const oldest = inactive.shift();
      releaseDown02Fixture(oldest, { keepDescriptor: true });
    }
  }

  function applyDownlightFixtureActive(fixture, active) {
    if (active) {
      softActivateDown02Fixture(fixture);
      fixture._softStamp = performance.now();
      return;
    }

    // Soft-off: keep Spot/flare/clone warm for the next cycle so the 10s
    // rotation does not dispose+recreate (the hitch the user sees).
    softDeactivateDown02Fixture(fixture);
    fixture._softStamp = performance.now();
  }

  function hasDownlightRotationConfig(nightLighting) {
    const ratio = nightLighting?.down02RotationMaxRatio;
    const count = nightLighting?.down03RotationActiveCount;

    return (typeof ratio === "number" && ratio > 0 && ratio < 1)
      || (typeof count === "number" && count > 0);
  }

  /**
   * Rotate which Down02/Down03 fixtures are lit so only a small subset is
   * active at once. Changes are queued and applied one fixture per frame so
   * the 10s swap never freezes the main thread.
   */
  function startDownlightRotation(nightLighting) {
    if (nightRotationObserver) {
      return;
    }

    const groups = [];
    const rotationWorkQueue = [];
    const down02 = downlight02Fixtures.filter((fixture) => fixture.group === "down02");
    const down02Ratio = nightLighting.down02RotationMaxRatio;

    if (down02.length && typeof down02Ratio === "number" && down02Ratio > 0 && down02Ratio < 1) {
      const minCount = typeof nightLighting.down02RotationMinCount === "number"
        ? Math.max(1, Math.floor(nightLighting.down02RotationMinCount))
        : 1;

      groups.push({
        fixtures: down02,
        count: Math.min(down02.length, Math.max(minCount, Math.floor(down02.length * down02Ratio))),
        intervalMs: Math.max(1000, nightLighting.down02RotationIntervalMs || 10000),
        mode: "random",
        queue: [],
        nextAt: 0
      });
    }

    const down03 = downlight02Fixtures.filter((fixture) => fixture.group === "down03");
    const down03Count = nightLighting.down03RotationActiveCount;

    if (down03.length && typeof down03Count === "number" && down03Count > 0 && down03Count < down03.length) {
      groups.push({
        fixtures: down03,
        count: Math.floor(down03Count),
        intervalMs: Math.max(1000, nightLighting.down03RotationIntervalMs || 10000),
        // Sequential shuffle: every fixture gets a turn before any repeats.
        mode: "sequence",
        queue: [],
        nextAt: 0
      });
    }

    if (!groups.length) {
      // No rotation: instantiate every descriptor (already the selected subset).
      downlight02Fixtures.forEach((fixture) => applyDownlightFixtureActive(fixture, true));
      return;
    }

    function pickGroupTargets(group) {
      if (group.mode === "sequence") {
        if (group.queue.length < group.count) {
          const refill = group.fixtures.filter((fixture) => !group.queue.includes(fixture));

          for (let i = refill.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [refill[i], refill[j]] = [refill[j], refill[i]];
          }

          group.queue.push(...refill);
        }

        return group.queue.splice(0, group.count);
      }

      return pickRandomItems(group.fixtures, group.count);
    }

    function enqueueGroupRotation(group, options = {}) {
      const immediate = options.immediate === true;
      const picked = pickGroupTargets(group);
      const activeSet = new Set(picked);
      const toDeactivate = [];
      const toActivate = [];

      group.fixtures.forEach((fixture) => {
        const shouldBeActive = activeSet.has(fixture);

        if (shouldBeActive && !fixture.active) {
          toActivate.push(fixture);
        } else if (!shouldBeActive && (fixture.active || fixture.instantiated)) {
          toDeactivate.push(fixture);
        }
      });

      if (immediate) {
        // First paint: activate the lit set now (small — 3+2), soft-off the rest.
        toActivate.forEach((fixture) => applyDownlightFixtureActive(fixture, true));
        toDeactivate.forEach((fixture) => {
          if (fixture.instantiated) {
            softDeactivateDown02Fixture(fixture);
          }
        });
        trimSoftFixtureCache(group.fixtures, group.count);
        return;
      }

      // Deactivate first (cheap soft-off), then activate — one step per frame.
      toDeactivate.forEach((fixture) => {
        rotationWorkQueue.push({ fixture, active: false, group });
      });
      toActivate.forEach((fixture) => {
        rotationWorkQueue.push({ fixture, active: true, group });
      });
      rotationWorkQueue.push({ trimGroup: group });
    }

    const startedAt = performance.now();
    groups.forEach((group) => {
      enqueueGroupRotation(group, { immediate: true });
      group.nextAt = startedAt + group.intervalMs;
    });

    nightRotationObserver = scene.onBeforeRenderObservable.add(() => {
      if (!nightMode || nightAssetsSuspended) {
        return;
      }

      if (rotationWorkQueue.length) {
        const job = rotationWorkQueue.shift();

        if (job.trimGroup) {
          trimSoftFixtureCache(job.trimGroup.fixtures, job.trimGroup.count);
        } else if (job.fixture) {
          applyDownlightFixtureActive(job.fixture, job.active);
        }

        return;
      }

      const now = performance.now();

      groups.forEach((group) => {
        if (now >= group.nextAt) {
          enqueueGroupRotation(group);
          group.nextAt = now + group.intervalMs;
        }
      });
    });
  }

  function startDown02FlareTwinkle() {
    if (nightFlareObserver) {
      return;
    }

    if (!downlight02Flares.length && !downlight02TwinkleMaterials.length) {
      return;
    }

    let flareOcclusionFrame = 0;
    let cachedOccluders = [];
    const nightLighting = () => getActiveModelState()?.config?.nightLighting || {};
    const flareCullRadius = () => {
      const configured = nightLighting().flareCullRadius;
      return typeof configured === "number" && configured > 0 ? configured : Number.POSITIVE_INFINITY;
    };

    nightFlareObserver = scene.onBeforeRenderObservable.add(() => {
      if (!nightMode || nightAssetsSuspended) {
        return;
      }

      const camera = scene.activeCamera;
      const time = performance.now() * 0.001;
      flareOcclusionFrame += 1;
      const inOrbit = typeof isWalkMode === "function" ? !isWalkMode() : false;
      // Orbit zoom already stresses picking/GPU — skip COL flare rays there.
      const interval = inOrbit
        ? Number.POSITIVE_INFINITY
        : Math.max(1, Math.floor(nightLighting().flareOcclusionIntervalFrames || 1));
      const cullRadius = flareCullRadius();
      const cullRadiusSq = cullRadius * cullRadius;

      if (Number.isFinite(interval) && flareOcclusionFrame % interval === 0) {
        cachedOccluders = getNightColOccluderMeshes(getActiveModelState());
      }

      const occluders = cachedOccluders;
      const runOcclusion = Number.isFinite(interval) && flareOcclusionFrame % interval === 0;

      downlight02TwinkleMaterials.forEach((entry) => {
        if (entry.rotationActive === false) {
          return;
        }

        const pulse = 0.7
          + 0.18 * Math.sin(time * entry.speed + entry.phase)
          + 0.1 * Math.sin(time * entry.speed * 2.35 + entry.phase * 1.4);
        const spark = Math.random() < entry.sparkChance ? 0.2 + Math.random() * 0.25 : 0;
        const intensity = Math.min(1.15, Math.max(0.55, pulse + spark));
        entry.material.emissiveIntensity = entry.baseIntensity * intensity;
        entry.material.emissiveColor?.set?.(
          entry.baseColor.r * (0.85 + intensity * 0.2),
          entry.baseColor.g * (0.85 + intensity * 0.2),
          entry.baseColor.b * (0.85 + intensity * 0.2)
        );
      });

      // Same twinkle curve as the earlier building downlight flares.
      downlight02Flares.forEach((flare) => {
        if (flare.rotationActive === false) {
          flare.mesh.isVisible = false;
          return;
        }

        let tooFar = false;

        if (camera?.position && Number.isFinite(cullRadiusSq)) {
          const offset = flare.mesh.position.subtract(camera.position);
          tooFar = offset.lengthSquared() > cullRadiusSq;
        }

        if (tooFar) {
          flare.mesh.isVisible = false;
          return;
        }

        if (runOcclusion) {
          flare._occluded = isDown02FlareOccluded(flare.mesh.position, occluders);
        }

        const occluded = Boolean(flare._occluded);
        flare.mesh.isVisible = !occluded;

        if (occluded) {
          return;
        }

        const twinkle = 0.55
          + 0.28 * Math.sin(time * flare.speed + flare.phase)
          + 0.17 * Math.sin(time * flare.speed * 2.35 + flare.phase * 1.7);
        const spark = Math.random() < flare.sparkChance ? 0.35 + Math.random() * 0.45 : 0;
        const intensity = Math.min(1.35, Math.max(0.25, twinkle + spark));

        flare.material.emissiveColor.set(1 * intensity, 0.82 * intensity, 0.42 * intensity);
        flare.material.alpha = 0.35 + intensity * 0.55;

        let distanceScale = 1;

        if (camera?.position) {
          const distance = BABYLON.Vector3.Distance(camera.position, flare.mesh.position);
          distanceScale = 1 + Math.min(22, distance) * 0.05;
        }

        const scale = flare.baseScale * distanceScale * (0.85 + intensity * 0.45);
        flare.mesh.scaling.set(scale, scale, scale);
      });
    });
  }

  function startNightSpotLightCulling() {
    if (nightSpotCullObserver) {
      return;
    }

    let cullFrame = 0;

    nightSpotCullObserver = scene.onBeforeRenderObservable.add(() => {
      if (!nightMode || nightAssetsSuspended) {
        return;
      }

      const nightLighting = getActiveModelState()?.config?.nightLighting || {};
      const maxActive = typeof nightLighting.maxActiveSpotLights === "number"
        ? Math.max(1, Math.floor(nightLighting.maxActiveSpotLights))
        : Number.POSITIVE_INFINITY;
      const interval = Math.max(1, Math.floor(nightLighting.spotLightCullIntervalFrames || 3));
      const cullRadius = typeof nightLighting.spotLightCullRadius === "number"
        ? Math.max(1, nightLighting.spotLightCullRadius)
        : Number.POSITIVE_INFINITY;

      cullFrame += 1;

      if (cullFrame % interval !== 0) {
        return;
      }

      const camera = scene.activeCamera;

      if (!camera?.position) {
        return;
      }

      const radiusSq = cullRadius * cullRadius;
      const rlbFixtures = downlight02Fixtures.filter((fixture) => (
        fixture.group?.startsWith("rlb_") && fixture.center
      ));

      if (rlbFixtures.length) {
        const scoredFixtures = rlbFixtures
          .map((fixture) => ({
            fixture,
            distanceSq: BABYLON.Vector3.DistanceSquared(camera.position, fixture.center)
          }))
          .sort((left, right) => left.distanceSq - right.distanceSq);
        let rlbEnabled = 0;

        scoredFixtures.forEach((entry) => {
          const withinRadius = entry.distanceSq <= radiusSq;
          const shouldActivate = withinRadius && rlbEnabled < maxActive;

          if (shouldActivate) {
            softActivateRlbFixture(entry.fixture, nightLighting);
            entry.fixture._softStamp = performance.now();
            rlbEnabled += 1;
            return;
          }

          softDeactivateRlbFixture(entry.fixture);
        });

        trimSoftFixtureCache(rlbFixtures, rlbEnabled);
      }

      const staticLights = downlightLights.filter((light) => !light.metadata?.rlbType);

      if (!staticLights.length) {
        return;
      }

      // No budget configured -> keep whatever Babylon already has enabled.
      if (maxActive >= staticLights.length + downlightLights.length && !Number.isFinite(cullRadius)) {
        staticLights.forEach((light) => {
          if (light.metadata?.nightNoReceivers) {
            light.setEnabled(false);
            return;
          }

          light.setEnabled(light.metadata?.nightRotationActive !== false);
        });
        return;
      }

      const scored = staticLights.map((light) => {
        const position = light.getAbsolutePosition?.() || light.position;
        const distanceSq = BABYLON.Vector3.DistanceSquared(camera.position, position);
        return { light, distanceSq };
      });

      scored.sort((left, right) => left.distanceSq - right.distanceSq);

      let enabled = 0;

      // Signboard Down0 always keeps a slot when in range — real wall wash must stay on.
      scored.forEach((entry) => {
        const rotationActive = entry.light.metadata?.nightRotationActive !== false
          && !entry.light.metadata?.nightNoReceivers;
        const withinRadius = entry.distanceSq <= radiusSq;
        const alwaysOn = entry.light.metadata?.nightAlwaysOn === true
          || entry.light.metadata?.isDown0 === true;

        if (!(rotationActive && withinRadius && alwaysOn)) {
          return;
        }

        entry.light.setEnabled(true);
        enabled += 1;
        entry._handled = true;
      });

      scored.forEach((entry) => {
        if (entry._handled) {
          return;
        }

        // Rotation-inactive / no-receiver fixtures stay off and never consume the budget.
        const rotationActive = entry.light.metadata?.nightRotationActive !== false
          && !entry.light.metadata?.nightNoReceivers;
        const withinRadius = entry.distanceSq <= radiusSq;
        const shouldEnable = rotationActive && withinRadius && enabled < maxActive;

        if (shouldEnable) {
          enabled += 1;
        }

        entry.light.setEnabled(shouldEnable);
      });
    });
  }

  function disposeNightSpotLightCulling() {
    if (nightSpotCullObserver) {
      scene.onBeforeRenderObservable.remove(nightSpotCullObserver);
      nightSpotCullObserver = null;
    }
  }

  function disposeDownlightLights() {
    disposeNightSpotLightCulling();
    // Release fixtures first (removes their lights from downlightLights cleanly).
    disposeNightFlareSystem();
    downlightLights.forEach((light) => {
      try {
        light.dispose();
      } catch {
        // ignore stale lights
      }
    });
    downlightLights = [];
  }

  function restoreDownlight02MaterialOverrides() {
    downlight02MaterialOverrides.forEach(({ mesh, originalMaterial, clonedMaterial }) => {
      try {
        if (mesh && !mesh.isDisposed?.()) {
          mesh.material = originalMaterial;
        }
      } catch {
        // ignore stale mesh material restore
      }

      try {
        clonedMaterial?.dispose?.();
      } catch {
        // ignore stale clone dispose
      }
    });
    downlight02MaterialOverrides = [];
  }

  function restoreDownlightMaterials() {
    materialSnapshots.forEach(restoreMaterialEmissiveState);
    materialSnapshots = [];
    restoreNightSiteMaterials();
    restoreDownlight02MaterialOverrides();
  }

  function restoreSceneMaterialLightLimits() {
    sceneMaterialLightLimitSnapshots.forEach((snapshot) => {
      const { material } = snapshot;

      if (!material || !("maxSimultaneousLights" in material)) {
        return;
      }

      if (typeof material.unfreeze === "function") {
        material.unfreeze();
      }

      material.maxSimultaneousLights = snapshot.maxSimultaneousLights;

      if (typeof material.freeze === "function") {
        material.freeze();
      }
    });
    sceneMaterialLightLimitSnapshots = [];
  }

  function prepareModelMaterialLightLimit(material, maxLights = 8) {
    if (!material || !("maxSimultaneousLights" in material)) {
      return;
    }

    const targetLights = Math.max(4, maxLights);

    if ((material.maxSimultaneousLights || 4) >= targetLights) {
      return;
    }

    sceneMaterialLightLimitSnapshots.push({
      material,
      maxSimultaneousLights: material.maxSimultaneousLights
    });

    if (typeof material.unfreeze === "function") {
      material.unfreeze();
    }

    // Ambient + moonlight + Down01/Down02 clustered spots.
    material.maxSimultaneousLights = targetLights;
  }

  async function prepareModelMaterialsForNightLightsChunked(meshes, token, maxLights = 8) {
    restoreSceneMaterialLightLimits();

    const materials = collectUniqueMaterialsFromMeshes(meshes || []);

    for (let index = 0; index < materials.length; index += NIGHT_MATERIAL_CHUNK_SIZE) {
      if (!isNightSetupActive(token)) {
        return false;
      }

      const chunk = materials.slice(index, index + NIGHT_MATERIAL_CHUNK_SIZE);
      chunk.forEach((material) => prepareModelMaterialLightLimit(material, maxLights));

      // Yield only between chunks -> keep night setup to a few frames total.
      if (index + NIGHT_MATERIAL_CHUNK_SIZE < materials.length) {
        await yieldNightFrame();
      }
    }

    return isNightSetupActive(token);
  }

  function collectNightLitMeshes(modelState) {
    return (modelState.meshes || []).filter((mesh) => (
      mesh
      && mesh.isEnabled()
      && (typeof mesh.visibility !== "number" || mesh.visibility > 0.02)
      && !mesh.metadata?.tourGuest
      && !mesh.metadata?.angjiCollisionInvisible
    ));
  }

  function collectDownlightWorldPositions(downlightMeshes, yOffset = -0.35) {
    const positions = [];

    downlightMeshes.forEach((mesh) => {
      mesh.computeWorldMatrix(true);
      const center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld;

      if (!center) {
        return;
      }

      positions.push(center.clone().addInPlace(new BABYLON.Vector3(0, yOffset, 0)));
    });

    return positions;
  }

  function clusterDownlightPositions(BABYLON, positions, options = {}) {
    const mergeDistance = options.mergeDistance ?? CLUSTER_MERGE_DISTANCE;
    const maxClusters = options.maxClusters ?? MAX_CLUSTERED_LIGHTS;
    const clusters = [];

    positions.forEach((position) => {
      let nearest = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      clusters.forEach((cluster) => {
        const distance = BABYLON.Vector3.Distance(position, cluster.center);

        if (distance < nearestDistance) {
          nearest = cluster;
          nearestDistance = distance;
        }
      });

      const canMerge = nearest && nearestDistance <= mergeDistance;

      if (canMerge || clusters.length >= maxClusters) {
        const target = canMerge
          ? nearest
          : clusters.reduce((best, cluster) => {
            const distance = BABYLON.Vector3.Distance(position, cluster.center);
            if (!best || distance < best.distance) {
              return { cluster, distance };
            }
            return best;
          }, null)?.cluster;

        if (target) {
          target.points.push(position);
          target.center = target.points
            .reduce((sum, point) => sum.add(point), BABYLON.Vector3.Zero())
            .scale(1 / target.points.length);
          return;
        }
      }

      clusters.push({
        center: position.clone(),
        points: [position]
      });
    });

    return clusters;
  }

  function applyNightEnvironment() {
    scene.clearColor.copyFrom(NIGHT_CLEAR_COLOR);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor.copyFrom(NIGHT_FOG_COLOR);
    scene.fogDensity = NIGHT_FOG_DENSITY;

    ambient.intensity = NIGHT_AMBIENT_INTENSITY;
    ambient.diffuse?.copyFrom?.(NIGHT_AMBIENT_DIFFUSE);
    ambient.groundColor.copyFrom(NIGHT_AMBIENT_GROUND);

    // Reuse the day sun as cool moonlight so outdoor surfaces get a silver wash.
    sun.intensity = NIGHT_MOON_INTENSITY;
    sun.diffuse.copyFrom(NIGHT_MOON_DIFFUSE);
    sun.specular?.copyFrom?.(NIGHT_MOON_SPECULAR);
    sun.direction.copyFrom(NIGHT_MOON_DIRECTION);
    sun.position.copyFrom(NIGHT_MOON_POSITION);

    ensureMoonVisual();
  }

  function applyNightPeopleVisibility() {
    hidePeopleMeshesForNight();
  }

  function applyDayEnvironment() {
    scene.clearColor.copyFrom(DAY_CLEAR_COLOR);
    scene.fogMode = DAY_FOG_MODE;
    scene.fogColor.copyFrom(DAY_FOG_COLOR);
    scene.fogDensity = DAY_FOG_DENSITY;
    scene.fogStart = DAY_FOG_START;
    scene.fogEnd = DAY_FOG_END;

    ambient.intensity = DAY_AMBIENT_INTENSITY;
    ambient.diffuse?.copyFrom?.(DAY_AMBIENT_DIFFUSE);
    ambient.groundColor.copyFrom(DAY_AMBIENT_GROUND);

    sun.intensity = DAY_SUN_INTENSITY;
    sun.diffuse.copyFrom(DAY_SUN_DIFFUSE);
    sun.specular?.copyFrom?.(DAY_SUN_SPECULAR);
    sun.direction.copyFrom(DAY_SUN_DIRECTION);
    sun.position.copyFrom(DAY_SUN_POSITION);

    if (moonRoot) {
      moonRoot.setEnabled(false);
    }

    restorePeopleMeshesVisibility();
  }

  function createDown01SpotLight(cluster, index, options = {}) {
    const {
      intensity = 13.6,
      range = 18,
      direction = new BABYLON.Vector3(0, -1, 0),
      angle = Math.PI * 0.72,
      exponent = 2.2
    } = options;

    const light = new BABYLON.SpotLight(
      `angji-downlight-spot-${index}`,
      cluster.center.clone(),
      direction.lengthSquared?.() > 1e-6 ? direction : new BABYLON.Vector3(0, -1, 0),
      angle,
      exponent,
      scene
    );
    light.diffuse = new BABYLON.Color3(1, 0.88, 0.55);
    light.specular = new BABYLON.Color3(0.15, 0.12, 0.06);
    light.intensity = intensity;
    light.range = range;
    light.falloffType = BABYLON.Light.FALLOFF_GLTF;
    light.metadata = { isDown01: true, nightRotationActive: true };
    assignSpotLightReceivers(light, cluster.center);

    downlightLights.push(light);
    return light;
  }

  async function createDown01SpotsProgressive(clusters, token, options = {}) {
    const {
      intensityBase = 13.6,
      range = 18,
      initialSpots = DOWN01_INITIAL_SPOTS,
      onInitialReady = null
    } = options;
    let created = 0;

    for (let index = 0; index < clusters.length; index += 1) {
      if (!isNightSetupActive(token)) {
        return created;
      }

      const cluster = clusters[index];
      createDown01SpotLight(cluster, index, {
        intensity: intensityBase + Math.min(cluster.points?.length || 1, 6) * 0.5,
        range,
        direction: cluster.direction || new BABYLON.Vector3(0, -1, 0),
        angle: cluster.angle || Math.PI * 0.72,
        exponent: cluster.exponent || 2.2
      });
      created += 1;

      if (created === Math.min(initialSpots, clusters.length) && typeof onInitialReady === "function") {
        onInitialReady(created);
      }

      if ((index + 1) % NIGHT_CREATE_CHUNK === 0) {
        await yieldNightFrame();
      }
    }

    return created;
  }

  function hasReadyNightDownlights(modelState) {
    return litModelState === modelState
      && nightReceiverPolicyVersion === NIGHT_RECEIVER_POLICY_VERSION
      && (
        downlightLights.length > 0
        || downlight02Fixtures.length > 0
        || downlight02Flares.length > 0
      );
  }

  function suspendNightAssets() {
    nightAssetsSuspended = true;

    downlightLights.forEach((light) => {
      try {
        light.setEnabled(false);
      } catch {
        // ignore
      }
    });

    downlight02Flares.forEach((flare) => {
      try {
        flare.mesh.isVisible = false;
      } catch {
        // ignore
      }
    });

    // Day look: restore original fixture materials but keep clones for resume.
    downlight02MaterialOverrides.forEach(({ mesh, originalMaterial }) => {
      try {
        if (mesh && !mesh.isDisposed?.()) {
          mesh.material = originalMaterial;
        }
      } catch {
        // ignore
      }
    });

    materialSnapshots.forEach(restoreMaterialEmissiveState);
    siteMaterialSnapshots.forEach(restoreSiteMaterialState);
  }

  function resumeNightAssets() {
    nightAssetsSuspended = false;

    materialSnapshots.forEach((snapshot) => {
      if (snapshot?.material) {
        applyDownlightEmissive(BABYLON, snapshot.material);
      }
    });

    siteMaterialSnapshots.forEach((snapshot) => {
      applySiteMaterialDarkeningFromSnapshot(snapshot);
    });

    downlight02MaterialOverrides.forEach(({ mesh, clonedMaterial }) => {
      try {
        if (mesh && !mesh.isDisposed?.() && clonedMaterial) {
          mesh.material = clonedMaterial;
        }
      } catch {
        // ignore
      }
    });

    downlightLights.forEach((light) => {
      try {
        if (light.metadata?.rlbType) {
          return;
        }

        if (light.metadata?.nightNoReceivers) {
          light.setEnabled(false);
          return;
        }

        const rotationActive = light.metadata?.nightRotationActive !== false;
        light.setEnabled(rotationActive);
      } catch {
        // ignore
      }
    });

    const nightLighting = getActiveModelState()?.config?.nightLighting || {};
    const rlbFixtures = downlight02Fixtures.filter((fixture) => fixture.group?.startsWith("rlb_"));

    if (rlbFixtures.length) {
      const maxActive = typeof nightLighting.maxActiveSpotLights === "number"
        ? Math.max(1, Math.floor(nightLighting.maxActiveSpotLights))
        : 8;
      activateNearestRlbFixtures(maxActive, nightLighting);
    }

    downlight02Flares.forEach((flare) => {
      try {
        if (flare.rotationActive !== false) {
          flare.mesh.isVisible = true;
        }
      } catch {
        // ignore
      }
    });

    if (!nightFlareObserver) {
      startDown02FlareTwinkle();
    }

    if (!nightSpotCullObserver && (
      downlightLights.length
      || downlight02Fixtures.some((fixture) => fixture.group?.startsWith("rlb_"))
    )) {
      startNightSpotLightCulling();
    }
  }

  async function runNightDownlightSetup(modelState, token) {
    if (!modelState || !isNightSetupActive(token)) {
      return;
    }

    if (hasReadyNightDownlights(modelState)) {
      applyNightEnvironment();
      applyNightPeopleVisibility();
      resumeNightAssets();
      return;
    }

    applyNightPeopleVisibility();
    disposeDownlightLights();
    restoreDownlightMaterials();
    restoreSceneMaterialLightLimits();
    nightIncludeMeshes = [];
    await yieldNightFrame();

    if (!isNightSetupActive(token)) {
      return;
    }

    const nightLighting = modelState.config?.nightLighting || {};
    const enableRlbPresetLights = nightLighting.enableRlbPresetLights === true;
    const enableDown01 = nightLighting.enableDown01 === true;
    const enableDown02 = nightLighting.enableDown02 === true;
    const enableDown03 = nightLighting.enableDown03 === true;
    const enableDown0 = enableRlbPresetLights
      ? nightLighting.enableDown0 === true
      : nightLighting.enableDown0 !== false;
    const downlight0Meshes = enableDown0 ? collectAngjiDownlight0Meshes(modelState) : [];
    const down0Intensity = typeof nightLighting.down0Intensity === "number"
      ? Math.max(1, nightLighting.down0Intensity)
      : 24;
    const down0LocalRange = typeof nightLighting.down0LocalRange === "number"
      ? Math.max(1, nightLighting.down0LocalRange)
      : 12;
    const down0AngleDegrees = typeof nightLighting.down0AngleDegrees === "number"
      ? Math.max(20, nightLighting.down0AngleDegrees)
      : 140;
    const maxSimultaneousLights = getNightMaxSimultaneousLights(modelState.config);
    nightIncludeRadius = typeof nightLighting.lightIncludeRadius === "number"
      ? Math.max(4, nightLighting.lightIncludeRadius)
      : LIGHT_INCLUDE_RADIUS;

    // Always reset fixture descriptors before rebuilding night lights.
    downlight02Fixtures = [];
    if (enableDown01 || enableDown02 || enableDown03) {
      console.warn("[night] Down01/02/03 requested but current build keeps them disabled for perf");
    }

    let rlbResult = { created: 0, descriptors: 0, summary: [] };
    let seedPositions = [];

    if (enableRlbPresetLights) {
      rlbResult = createRlbPresetTypeLights(modelState, nightLighting);
    } else {
      seedPositions = downlight0Meshes.map((mesh) => {
        mesh.computeWorldMatrix(true);
        return mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.();
      }).filter(Boolean);
    }

    markNightSiteScaleReceivers(modelState);
    applyNightSiteMaterials(modelState);
    refreshNightWallOccluders(modelState);

    // RLB: prep light limits for the full interior pool so any nearby fixture
    // can bind wall/floor receivers when lazily instantiated.
    const rangePool = collectDown0RangePool(modelState);
    nightIncludeMeshes = enableRlbPresetLights
      ? rangePool
      : (seedPositions.length
        ? collectMeshesNearPositions(
          rangePool,
          seedPositions,
          Math.max(nightIncludeRadius, down0LocalRange + 2)
        )
        : rangePool);

    const materialsReady = await prepareModelMaterialsForNightLightsChunked(
      nightIncludeMeshes,
      token,
      maxSimultaneousLights
    );

    if (!materialsReady) {
      return;
    }

    await yieldNightFrame();

    if (!isNightSetupActive(token)) {
      return;
    }

    let down0SpotCount = 0;
    if (enableDown0) {
      down0SpotCount = createDown0WallWashLights(downlight0Meshes, {
        intensity: down0Intensity,
        range: down0LocalRange,
        angleDegrees: down0AngleDegrees,
        pool: rangePool
      });
    }

    // Re-bind RLB receivers now that material light limits are ready.
    if (enableRlbPresetLights) {
      downlightLights.forEach((light) => {
        if (light?.metadata?.rlbType && light.position) {
          assignSpotLightReceivers(light, light.position);
        }
      });
    }

    if (!isNightSetupActive(token)) {
      return;
    }

    if (enableRlbPresetLights || downlightLights.length) {
      startNightSpotLightCulling();

      if (enableRlbPresetLights) {
        const initialActive = typeof nightLighting.maxActiveSpotLights === "number"
          ? Math.max(1, Math.floor(nightLighting.maxActiveSpotLights))
          : 8;
        const activated = activateNearestRlbFixtures(initialActive, nightLighting);
        console.info(`[night] RLB lazy initial active=${activated}/${rlbResult.descriptors || 0}`);
      }
    }

    nightAssetsSuspended = false;
    nightReceiverPolicyVersion = NIGHT_RECEIVER_POLICY_VERSION;
    litModelState = modelState;
    console.info(
      `[night] ${modelState.config?.label || modelState.config?.overviewId || "model"}`
      + (enableRlbPresetLights
        ? ` RLB descriptors=${rlbResult.descriptors || 0} lazy=on`
          + (rlbResult.summary?.length ? ` [${rlbResult.summary.join(", ")}]` : "")
        : ` Down01/02/03=off / Down0 wallwash=${down0SpotCount}`)
      + ` receivers=${nightIncludeMeshes.length}`
      + ` pool=${rangePool.length}`
      + ` maxLights=${maxSimultaneousLights}`
      + ` maxActiveSpots=${typeof nightLighting.maxActiveSpotLights === "number" ? nightLighting.maxActiveSpotLights : "all"}`
    );
  }

  function enableDownlights(modelState) {
    if (!modelState) {
      return;
    }

    if (hasReadyNightDownlights(modelState)) {
      applyNightEnvironment();
      applyNightPeopleVisibility();
      resumeNightAssets();
      return;
    }

    if (litModelState && litModelState !== modelState) {
      disposeNightLightingFully();
    }

    const token = ++nightSetupToken;
    void runNightDownlightSetup(modelState, token);
  }

  function disposeNightLightingFully() {
    cancelNightSetup();
    disposeDownlightLights();
    restoreDownlightMaterials();
    restoreSceneMaterialLightLimits();
    disposeMoonVisual();
    restorePeopleMeshesVisibility();
    nightIncludeMeshes = [];
    nightWallOccluders = [];
    litModelState = null;
    nightReceiverPolicyVersion = 0;
    nightAssetsSuspended = false;
  }

  function clearNightLighting(options = {}) {
    const dispose = options.dispose === true;

    if (dispose || !litModelState) {
      disposeNightLightingFully();
      return;
    }

    cancelNightSetup();
    suspendNightAssets();

    if (moonRoot) {
      moonRoot.setEnabled(false);
    }
  }

  function updateButton() {
    if (!nightModeButton) {
      return;
    }

    const available = canToggleNightMode();
    nightModeButton.hidden = !available;
    nightModeButton.disabled = !available;
    nightModeButton.textContent = nightMode ? "Day Mode" : "Night Mode";
    nightModeButton.classList.toggle("is-night", nightMode);
    nightModeButton.setAttribute("aria-pressed", nightMode ? "true" : "false");
  }

  function setNightMode(enabled) {
    if (enabled === nightMode) {
      updateButton();
      return nightMode;
    }

    if (enabled) {
      const modelState = getActiveModelState();

      if (!supportsNightModeConfig(modelState?.config)) {
        updateButton();
        return nightMode;
      }

      nightMode = true;
      // Paint sky/fog/moon immediately; stagger heavy light/material work.
      applyNightOrbitZoomPolicy(true);
      applyNightEnvironment();
      enableDownlights(modelState);

      collectNightModelStates().forEach((state) => {
        state.rlbProximityGlow?.notifyNightMode?.(true);
      });

      if (isAngjiProjectConfig(modelState?.config)) {
        modelState.rlbProximityGlow?.logStatus?.("night-on");
      } else {
        console.log("[rlb-glow] skipped — RLB shader is Angji-only (current project is not Angji)");
      }
    } else {
      nightMode = false;
      // Keep night assets cached — next toggle resumes instantly.
      applyNightOrbitZoomPolicy(false);
      clearNightLighting({ dispose: false });
      applyDayEnvironment();

      collectNightModelStates().forEach((state) => {
        state.rlbProximityGlow?.notifyNightMode?.(false);
      });

      const modelState = getActiveModelState();

      if (modelState) {
        applyOrbitEnvironmentSettings(BABYLON, sun, modelState.orbitModelState || modelState);
      }
    }

    updateButton();
    notifyNightModeChange(nightMode);
    return nightMode;
  }

  function toggle() {
    if (!canToggleNightMode()) {
      updateButton();
      return nightMode;
    }

    return setNightMode(!nightMode);
  }

  function sync() {
    if (!canKeepNightMode()) {
      if (nightMode) {
        setNightMode(false);
      }

      // Leaving a night-capable model: drop the day-mode cache.
      clearNightLighting({ dispose: true });
      updateButton();
      return;
    }

    if (nightMode) {
      applyNightOrbitZoomPolicy(true);
      applyNightEnvironment();
      applyNightPeopleVisibility();
      enableDownlights(getActiveModelState());
      collectNightModelStates().forEach((state) => {
        state.rlbProximityGlow?.notifyNightMode?.(true);
      });
    }

    updateButton();
  }

  nightModeButton?.addEventListener("click", () => {
    if (!canToggleNightMode()) {
      return;
    }

    toggle();
    options.onToggle?.(nightMode);
  });

  updateButton();

  return {
    isNightMode: () => nightMode,
    setNightMode,
    sync,
    updateButton
  };
}

function setModelSlideOffset(BABYLON, modelState, offsetX) {
  const nextPosition = modelState.baseRootPosition.add(new BABYLON.Vector3(offsetX, 0, 0));
  modelState.model.root.position.copyFrom(nextPosition);
}

function setModelStateEnabled(modelState, enabled) {
  modelState.model.root.setEnabled(enabled);
  setHistoryDisplayBoardsEnabled(modelState.historyDisplays, enabled);
}

function setOrbitVisualMeshesVisible(orbitModelState, visible) {
  (orbitModelState?.meshes || []).forEach((mesh) => {
    if (mesh.metadata?.angjiCollisionLayer) {
      return;
    }

    if (visible) {
      const stored = mesh.metadata?.orbitVisualStored;
      mesh.isVisible = stored?.isVisible ?? true;
      mesh.visibility = typeof stored?.visibility === "number" ? stored.visibility : 1;
      if (mesh.metadata?.orbitVisualStored) {
        const nextMeta = { ...mesh.metadata };
        delete nextMeta.orbitVisualStored;
        mesh.metadata = nextMeta;
      }
      return;
    }

    if (!mesh.metadata?.orbitVisualStored) {
      mesh.metadata = {
        ...(mesh.metadata || {}),
        orbitVisualStored: {
          isVisible: mesh.isVisible !== false,
          visibility: typeof mesh.visibility === "number" ? mesh.visibility : 1
        }
      };
    }

    mesh.isVisible = false;
    mesh.visibility = 0;
  });
}

function setOrbitCollisionCompanionMode(orbitModelState, active) {
  if (!orbitModelState?.model?.root) {
    return;
  }

  orbitModelState.model.root.setEnabled(true);
  setOrbitVisualMeshesVisible(orbitModelState, !active);
  setHistoryDisplayBoardsEnabled(orbitModelState.historyDisplays, !active);
}

function linkTourCollisionFromOrbit(tourModelState, orbitModelState) {
  if (!tourModelState?.config?.tourUseOrbitCollision || !orbitModelState) {
    return;
  }

  if ((orbitModelState.collisionMeshes || []).length === 0) {
    console.warn("[collision] Chungju orbit model has no 0_COL_* meshes for tour inheritance.");
    return;
  }

  if ((tourModelState.collisionMeshes || []).length > 0) {
    return;
  }

  tourModelState.collisionMeshes = orbitModelState.collisionMeshes;
  tourModelState.walkableGroundMeshes = orbitModelState.walkableGroundMeshes;
  tourModelState.rampSurfaceMeshes = orbitModelState.rampSurfaceMeshes;
  tourModelState.stairSurfaceMeshes = orbitModelState.stairSurfaceMeshes;
  tourModelState.floorSurfaceMeshes = orbitModelState.floorSurfaceMeshes;
  tourModelState.angjiBuildingFloor1Meshes = orbitModelState.angjiBuildingFloor1Meshes;
  tourModelState.angjiBuildingFloor2Meshes = orbitModelState.angjiBuildingFloor2Meshes;
  tourModelState.angjiBuildingFloor3Meshes = orbitModelState.angjiBuildingFloor3Meshes;
  tourModelState.angjiExternalFloorMeshes = orbitModelState.angjiExternalFloorMeshes;
  tourModelState.projectileHitMeshes = [
    ...(tourModelState.projectileHitMeshes || []),
    ...orbitModelState.collisionMeshes
  ];
  tourModelState.collisionInheritedFromOrbit = true;
  tourModelState.angjiCollisionLayerCount = orbitModelState.angjiCollisionLayerCount;
  tourModelState.usedCollisionFallback = false;

  console.info(
    `[collision] ${tourModelState.config.label} tour inherits orbit collision `
    + `(meshes=${orbitModelState.collisionMeshes.length})`
  );
}

function formatSunTime(value) {
  const hour = Math.floor(value);
  const minutes = Math.round((value - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getSunPositionFromControls(BABYLON) {
  const seasons = [
    { label: "Winter", altitudeOffset: -18, azimuthOffset: -12 },
    { label: "Spring", altitudeOffset: 0, azimuthOffset: 0 },
    { label: "Summer", altitudeOffset: 20, azimuthOffset: 12 },
    { label: "Autumn", altitudeOffset: 0, azimuthOffset: 0 }
  ];
  const season = seasons[Number(seasonSlider.value)] || seasons[1];
  const time = Number(timeSlider.value);
  const dayProgress = (time - 6) / 12;
  const azimuth = BABYLON.Tools.ToRadians(-105 + dayProgress * 210 + season.azimuthOffset);
  const altitude = BABYLON.Tools.ToRadians(Math.max(8, Math.min(78, Math.sin(dayProgress * Math.PI) * 62 + season.altitudeOffset)));
  const horizontal = Math.cos(altitude);
  const directionToSun = new BABYLON.Vector3(
    Math.sin(azimuth) * horizontal,
    Math.sin(altitude),
    Math.cos(azimuth) * horizontal
  ).normalize();

  return {
    season,
    time,
    directionToSun
  };
}

function updateSunFromControls(BABYLON, sun) {
  const { season, time, directionToSun } = getSunPositionFromControls(BABYLON);

  seasonValue.textContent = season.label;
  timeValue.textContent = formatSunTime(time);
  sun.direction.copyFrom(directionToSun.scale(-1));
  sun.position.copyFrom(directionToSun.scale(140));
}

function setupSunControls(BABYLON, sun) {
  sunToggleButton.addEventListener("click", () => {
    sunPanel.hidden = !sunPanel.hidden;
  });

  [seasonSlider, timeSlider].forEach((input) => {
    input.addEventListener("input", () => updateSunFromControls(BABYLON, sun));
  });

  updateSunFromControls(BABYLON, sun);
}

function applyOrbitEnvironmentSettings(BABYLON, sun, modelState) {
  const orbitTime = modelState.config?.orbitCamera?.time;

  if (typeof orbitTime !== "number") {
    return;
  }

  timeSlider.value = String(orbitTime);
  updateSunFromControls(BABYLON, sun);
}

function resolveCameraTargetFromPose(position, rotationY, lookDistance = 12, targetYOffset = 0) {
  return {
    x: position.x + Math.sin(rotationY) * lookDistance,
    y: position.y + targetYOffset,
    z: position.z + Math.cos(rotationY) * lookDistance
  };
}

function resolveCameraViewConfig(cameraConfig, defaults = {}) {
  if (!cameraConfig?.position) {
    return cameraConfig || defaults;
  }

  if (cameraConfig.target) {
    return cameraConfig;
  }

  if (typeof cameraConfig.rotationY !== "number") {
    return cameraConfig;
  }

  const lookDistance = typeof cameraConfig.lookDistance === "number"
    ? cameraConfig.lookDistance
    : (defaults.lookDistance ?? 12);
  const targetYOffset = typeof cameraConfig.targetYOffset === "number"
    ? cameraConfig.targetYOffset
    : (defaults.targetYOffset ?? 0);

  return {
    ...cameraConfig,
    target: resolveCameraTargetFromPose(
      cameraConfig.position,
      cameraConfig.rotationY,
      lookDistance,
      targetYOffset
    )
  };
}

function getOrbitCameraSettings(modelState) {
  const orbitSettings = resolveCameraViewConfig(modelState?.config?.orbitCamera, {
    lookDistance: 48
  });

  if (orbitSettings?.position && orbitSettings?.target) {
    return orbitSettings;
  }

  return DEFAULT_ORBIT_CAMERA;
}

function getOrbitEnvironmentTime(modelState, fallbackTime) {
  const orbitTime = modelState.config?.orbitCamera?.time;

  if (typeof orbitTime === "number") {
    return orbitTime;
  }

  return fallbackTime;
}

function getOrbitCameraView(BABYLON, orbitSettings) {
  return {
    target: new BABYLON.Vector3(orbitSettings.target.x, orbitSettings.target.y, orbitSettings.target.z),
    position: new BABYLON.Vector3(orbitSettings.position.x, orbitSettings.position.y, orbitSettings.position.z)
  };
}

function captureOrbitCameraView(orbitCamera) {
  return {
    target: orbitCamera.target.clone(),
    position: orbitCamera.position.clone()
  };
}

function interpolateOrbitCameraView(BABYLON, fromView, toView, t) {
  return {
    target: BABYLON.Vector3.Lerp(fromView.target, toView.target, t),
    position: BABYLON.Vector3.Lerp(fromView.position, toView.position, t)
  };
}

function applyOrbitCameraView(BABYLON, orbitCamera, view) {
  const distance = BABYLON.Vector3.Distance(view.position, view.target);

  orbitCamera.target.copyFrom(view.target);
  orbitCamera.setPosition(view.position);
  orbitCamera.radius = distance;
}

function applyOrbitEnvironmentBlend(BABYLON, sun, fromTime, toTime, t) {
  timeSlider.value = String(fromTime + (toTime - fromTime) * t);
  updateSunFromControls(BABYLON, sun);
}

function applyOrbitCameraStart(BABYLON, orbitCamera, modelState) {
  const orbitSettings = getOrbitCameraSettings(modelState);
  const view = getOrbitCameraView(BABYLON, orbitSettings);
  const zoomOutMultiplier = modelState.config?.orbitCamera?.zoomOutMultiplier || 1;
  const distance = BABYLON.Vector3.Distance(view.position, view.target);

  applyOrbitCameraView(BABYLON, orbitCamera, view);
  orbitCamera.maxZ = Math.max(10000, distance * 8);
  orbitCamera.upperRadiusLimit = distance * zoomOutMultiplier;
  orbitCamera.metadata = {
    ...(orbitCamera.metadata || {}),
    baseUpperRadiusLimit: distance
  };
}

function applyOrbitCameraConstraints(BABYLON, orbitCamera, modelState) {
  const orbitSettings = modelState.config?.orbitCamera || {};
  const upperBetaDegrees = orbitSettings.upperBetaDegrees ?? 88;

  if (!orbitSettings.position || !orbitSettings.target) {
    orbitCamera.metadata = {
      ...(orbitCamera.metadata || {}),
      baseUpperRadiusLimit: orbitCamera.metadata?.defaultBaseUpperRadiusLimit || orbitCamera.metadata?.baseUpperRadiusLimit || orbitCamera.upperRadiusLimit
    };
  }

  orbitCamera.upperBetaLimit = Math.min(BABYLON.Tools.ToRadians(upperBetaDegrees), Math.PI / 2 - 0.01);
  orbitCamera.upperRadiusLimit = (orbitCamera.metadata?.baseUpperRadiusLimit || orbitCamera.upperRadiusLimit) * (orbitSettings.zoomOutMultiplier || 1);

  if (typeof orbitSettings.minTargetY === "number" && orbitCamera.target.y < orbitSettings.minTargetY) {
    orbitCamera.target.y = orbitSettings.minTargetY;
  }

  if (orbitCamera.beta > orbitCamera.upperBetaLimit) {
    orbitCamera.beta = orbitCamera.upperBetaLimit;
  }
}

function getSlideDistance(modelStates) {
  const maxWidth = Math.max(...modelStates.map((state) => state.model.focusBounds.size.x || state.model.bounds.size.x || 1));
  return Math.max(maxWidth * 1.35, 80);
}

function renderModelDebug(modelState) {
  const { config, meshes, model, collisionMeshes, walkableGroundMeshes, stairSurfaceMeshes, floorSurfaceMeshes, peopleTargetMeshes } = modelState;

  modelStatus.textContent = `Loaded ${config.label}`;
  modelSource.textContent = `${MODEL_ROOT}${getModelLoadFileName(config)}`;
  modelStats.textContent = `${meshes.length} meshes / collision ${collisionMeshes.length} / walkable ${walkableGroundMeshes.length} / stairSurfaces ${stairSurfaceMeshes.length} / floorSurfaces ${floorSurfaceMeshes.length} / peopleTargets ${peopleTargetMeshes.length} / propPassThrough ${modelState.propPassThroughCount} / furniturePassThrough ${modelState.furniturePassThroughCount || 0} / angjiColLayer ${modelState.angjiCollisionLayerCount ?? "-"} / collisionFallback ${modelState.usedCollisionFallback ? "yes" : "no"} / scale ${model.scale.toExponential(3)} / full ${boundsToText(model.bounds)} / focus ${boundsToText(model.focusBounds)} / ${model.tourStartNode ? "Tour_Start found" : "Tour_Start not found"}`;
  meshList.replaceChildren(
    ...meshes.slice(0, 50).map((mesh) => {
      const item = document.createElement("li");
      item.textContent = mesh.name || mesh.id || "(unnamed mesh)";
      return item;
    })
  );
}

async function processTourMeshesInChunks(meshes, processor, chunkSize = 64) {
  for (let index = 0; index < meshes.length; index += chunkSize) {
    meshes.slice(index, index + chunkSize).forEach(processor);

    if (index + chunkSize < meshes.length) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });
    }
  }
}

async function loadTourModelState(BABYLON, scene, config) {
  const fileName = getModelLoadFileName(config);
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", MODEL_ROOT, fileName, scene);
  let meshes = getGeometryMeshes(result.meshes);
  const model = normalizeModel(BABYLON, scene, result, meshes);

  model.root.name = `tour-building-root-${normalizeName(config.label)}`;
  const performanceSettings = getPerformanceSettings(config);
  meshes = [...meshes, ...splitPeopleTargetMeshes(BABYLON, scene, meshes, performanceSettings)];

  let propPassThroughCount = 0;
  let furniturePassThroughCount = 0;
  const peopleTargetMeshes = [];
  const hasColLayer = hasColLayerConfig(config);
  const treatStairAsRamp = config.collision?.treatStairAsRamp === true
    && !isColLayerDiscreteStairConfig(config);
  const includeVisualStairs = hasColLayer && config.collision?.includeVisualStairs === true;

  await processTourMeshesInChunks(meshes, (mesh) => {
    getCachedMeshBounds(BABYLON, mesh);

    const propPassThrough = isTourPropMesh(mesh);
    const angjiCollisionLayer = hasColLayer && hasAngjiCollisionMaterial(mesh);
    const angjiFurnitureSurface = hasColLayer && hasAngjiFurnitureMaterial(mesh);
    let angjiRampSurface = hasColLayer && hasAngjiRampMaterial(mesh);
    const angjiRampFloorLevel = angjiRampSurface ? getAngjiRampFloorLevel(mesh) : null;
    let angjiStairSurface = hasColLayer && hasAngjiStairMaterial(mesh);
    const angjiVisualStairSurface = includeVisualStairs && hasVisualStairMaterial(mesh);

    if (treatStairAsRamp && angjiStairSurface) {
      angjiRampSurface = true;
      angjiStairSurface = false;
    }

    if (angjiVisualStairSurface) {
      angjiRampSurface = true;
    }
    const angjiBuildingFloor1Surface = hasColLayer && hasAngjiBuildingFloor1Material(mesh);
    const angjiBuildingFloor2Surface = hasColLayer && hasAngjiBuildingFloor2Material(mesh);
    const angjiBuildingFloor3Surface = hasColLayer && hasAngjiBuildingFloor3Material(mesh);
    const angjiExternalFloorSurface = hasColLayer && hasAngjiExternalFloorMaterial(mesh);
    const angjiFloorSurface = angjiBuildingFloor1Surface
      || angjiBuildingFloor2Surface
      || angjiBuildingFloor3Surface
      || angjiExternalFloorSurface;
    const angjiWallSurface = hasColLayer && hasAngjiWallMaterial(mesh);
    const angjiCameraBlockingSurface = angjiWallSurface
      || angjiFurnitureSurface
      || angjiBuildingFloor1Surface
      || angjiBuildingFloor2Surface
      || angjiBuildingFloor3Surface;
    const passThrough = hasColLayer ? !angjiCollisionLayer : propPassThrough;
    const peopleTarget = isPeopleFireballTarget(mesh, performanceSettings);

    if (propPassThrough || (hasColLayer && passThrough)) {
      propPassThroughCount += 1;
    }

    if (peopleTarget && mesh.isEnabled()) {
      peopleTargetMeshes.push(mesh);
    }

    mesh.isPickable = mesh.isEnabled() && (angjiVisualStairSurface || (passThrough ? peopleTarget : true));
    mesh.checkCollisions = passThrough ? false : ENABLE_MODEL_COLLISIONS;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      passThrough,
      peopleTarget,
      furniture: angjiFurnitureSurface,
      tourProp: propPassThrough,
      angjiCollisionLayer,
      angjiCollisionRole: hasColLayer ? getAngjiCollisionMaterialRole(mesh) : null,
      angjiRampSurface,
      angjiRampFloorLevel,
      angjiStairSurface,
      angjiVisualStairSurface,
      angjiWallSurface,
      angjiFurnitureSurface,
      angjiFloorSurface,
      angjiBuildingFloor1Surface,
      angjiBuildingFloor2Surface,
      angjiBuildingFloor3Surface,
      angjiExternalFloorSurface,
      angjiCameraBlockingSurface,
      angjiCameraBlockingRequiresWallNormal: angjiBuildingFloor2Surface
        || angjiBuildingFloor3Surface
    };

    if (hasColLayer && angjiCollisionLayer) {
      applyAngjiCollisionInvisibility(mesh, BABYLON);
    }
  });

  const modelMaterials = collectUniqueMaterialsFromMeshes(meshes);
  softenModelMaterialReflections(BABYLON, modelMaterials);
  hideTourStartMarker(model.tourStartNode, meshes);

  if (booleanParam("clay", CLAY_PREVIEW)) {
    applyClayPreviewMaterial(BABYLON, scene, meshes);
  }

  const treeMeshes = expandMergedDtvTreeMeshes(
    BABYLON,
    scene,
    meshes.filter((mesh) => mesh.isEnabled() && isDtvTreeMesh(mesh)),
    meshes
  );
  const peopleYawMeshes = meshes.filter((mesh) => (
    mesh.isEnabled()
    && isPeopleYawFacingMesh(mesh, performanceSettings)
    && !treeMeshes.some((treeMesh) => treeMesh.uniqueId === mesh.uniqueId)
  ));
  const treeMeshIds = new Set(treeMeshes.map((mesh) => mesh.uniqueId));
  peopleYawMeshes.forEach((mesh) => treeMeshIds.add(mesh.uniqueId));
  const blendOptimized = optimizeModelBlendMaterials(BABYLON, meshes, {
    optimizeDtv: performanceSettings.optimizeDtvBlendToAlphaTest,
    optimizeNonEssential: performanceSettings.optimizeNonEssentialBlendToAlphaTest,
    performanceSettings
  });
  const cutoutAlphaFixed = fixCutoutTextureAlphaOnMeshes(meshes, performanceSettings);
  const dtvFoliagePrepared = prepareDtvFoliageMaterials(BABYLON, meshes);

  let usedCollisionFallback = false;
  let collisionMeshes;

  if (hasColLayer) {
    collisionMeshes = meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiCollisionLayer
      && !treeMeshIds.has(mesh.uniqueId)
    ));

    if (collisionMeshes.length === 0) {
      console.warn(`${config.label} tour model has no 0_COL_* collision meshes.`);
    }
  } else {
    collisionMeshes = meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && !mesh.metadata?.passThrough
      && !treeMeshIds.has(mesh.uniqueId)
    ));

    if (collisionMeshes.length === 0) {
      usedCollisionFallback = true;
      collisionMeshes = meshes.filter((mesh) => (
        mesh.isEnabled()
        && !isDescendantOf(mesh, model.tourStartNode)
        && !treeMeshIds.has(mesh.uniqueId)
      ));
      collisionMeshes.forEach((mesh) => {
        mesh.metadata = { ...(mesh.metadata || {}), passThrough: false, collisionFallback: true };
        mesh.isPickable = true;
      });
    }
  }

  const rampSurfaceMeshes = hasColLayer
    ? meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && mesh.metadata?.angjiRampSurface)
    : [];
  const stairSurfaceMeshes = hasColLayer
    ? meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && mesh.metadata?.angjiStairSurface)
    : meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && isStairSurface(mesh));
  const floorSurfaceMeshes = hasColLayer
    ? meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && mesh.metadata?.angjiFloorSurface)
    : meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && isFloorSurface(mesh));
  const angjiBuildingFloor1Meshes = hasColLayer
    ? meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiBuildingFloor1Surface
    ))
    : [];
  const angjiBuildingFloor2Meshes = hasColLayer
    ? meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiBuildingFloor2Surface
    ))
    : [];
  const angjiBuildingFloor3Meshes = hasColLayer
    ? meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiBuildingFloor3Surface
    ))
    : [];
  const angjiExternalFloorMeshes = hasColLayer
    ? meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiExternalFloorSurface
    ))
    : [];

  [...rampSurfaceMeshes, ...stairSurfaceMeshes, ...floorSurfaceMeshes].forEach((mesh) => {
    mesh.metadata = { ...(mesh.metadata || {}), passThrough: false, groundSurface: true };
    mesh.isPickable = true;
  });

  const collisionMeshMap = new Map(collisionMeshes.map((mesh) => [mesh.uniqueId, mesh]));
  rampSurfaceMeshes.forEach((mesh) => collisionMeshMap.set(mesh.uniqueId, mesh));
  stairSurfaceMeshes.forEach((mesh) => collisionMeshMap.set(mesh.uniqueId, mesh));
  floorSurfaceMeshes.forEach((mesh) => collisionMeshMap.set(mesh.uniqueId, mesh));
  collisionMeshes = Array.from(collisionMeshMap.values());

  const groundMeshMap = new Map();

  if (hasColLayer) {
    rampSurfaceMeshes.forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
    stairSurfaceMeshes.forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
    floorSurfaceMeshes.forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
  } else {
    collisionMeshes
      .filter((mesh) => !isNonWalkableObject(mesh) && !mesh.metadata?.furniture && !treeMeshIds.has(mesh.uniqueId))
      .forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
    stairSurfaceMeshes.forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
    floorSurfaceMeshes.forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
  }

  treeMeshes.forEach((mesh) => {
    attachTreeYawPivot(BABYLON, scene, mesh, model.root);
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      treeMesh: true,
      passThrough: true
    };
  });

  peopleYawMeshes.forEach((mesh) => {
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      peopleYawMesh: true,
      passThrough: true
    };
  });

  const peopleYawBlockGroups = collectPeopleYawBlockGroups(peopleYawMeshes);
  peopleYawBlockGroups.forEach((groupMeshes) => {
    attachPeopleBlockYawPivot(BABYLON, scene, groupMeshes, model.root);
  });

  if (peopleYawBlockGroups.some((group) => group.length > 1)) {
    console.info(
      `[people] ${config.label}: block yaw groups=${peopleYawBlockGroups.length}`
      + ` multi=${peopleYawBlockGroups.filter((group) => group.length > 1).length}`
    );
  }

  // Trees + People cards share the same camera-yaw update path.
  const yawFacingMeshes = [...treeMeshes, ...peopleYawMeshes];

  let rlbProximityGlow = null;

  if (isAngjiProjectConfig(config)) {
    try {
      rlbProximityGlow = setupAngjiRlbProximityGlow(BABYLON, scene, { meshes, model, config, collisionMeshes }, {
        getCamera: () => scene.activeCamera
      });
      // loadTourModelState runs before orbitCamera exists; bind lazily via modelState later.
    } catch (error) {
      console.error("[rlb-glow] setup failed — tour continues without wall spill:", error);
    }
  }

  freezeSceneMaterials(modelMaterials);

  const walkableGroundMeshes = Array.from(groundMeshMap.values());
  const roleCounts = meshes.reduce((counts, mesh) => {
    const role = mesh.metadata?.angjiCollisionRole;

    if (role) {
      counts[role] = (counts[role] || 0) + 1;
    }

    return counts;
  }, {});

  console.info(
    `[collision] ${config.label}: colLayer=${hasColLayer ? "on" : "off"}`,
    `meshes=${meshes.length}`,
    `materials=${modelMaterials.length}`,
    `collision=${collisionMeshes.length}`,
    `walkable=${walkableGroundMeshes.length}`,
    `trees=${treeMeshes.length}`,
    `peopleYaw=${peopleYawMeshes.length}`,
    `blendOpt=${blendOptimized}`,
    `cutoutAlpha=${cutoutAlphaFixed}`,
    `dtvFoliage=${dtvFoliagePrepared}`,
    `roles=${JSON.stringify(roleCounts)}`,
    `fallback=${usedCollisionFallback ? "yes" : "no"}`
  );

  if (hasColLayer && collisionMeshes.length === 0) {
    console.warn(
      `[collision] ${config.label}: colLayer enabled but no 0_COL_* meshes matched. Check material names.`
    );
  }

  if (hasColLayer) {
    auditColRampFloorConnectivity(BABYLON, {
      config,
      meshes,
      model
    });
  }

  if (!hasColLayer && collisionMeshes.length > 500) {
    console.warn(
      `[collision] ${config.label}: non-colLayer path is using ${collisionMeshes.length} collision meshes (heavy).`
    );
  }

  const modelState = {
    config,
    result,
    meshes,
    model,
    baseRootPosition: model.root.position.clone(),
    propPassThroughCount,
    furniturePassThroughCount,
    angjiCollisionLayerCount: hasColLayer ? collisionMeshes.length : undefined,
    usedCollisionFallback,
    collisionMeshes,
    walkableGroundMeshes,
    rampSurfaceMeshes,
    stairSurfaceMeshes,
    floorSurfaceMeshes,
    angjiBuildingFloor1Meshes,
    angjiBuildingFloor2Meshes,
    angjiBuildingFloor3Meshes,
    angjiExternalFloorMeshes,
    peopleTargetMeshes,
    treeMeshes: yawFacingMeshes,
    rlbProximityGlow,
    projectileHitMeshes: meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode)),
    historyDisplays: []
  };

  modelState.historyDisplays = attachHistoryDisplayBoards(BABYLON, scene, modelState);

  return modelState;
}

function registerBabylonFbxLoader(BABYLON) {
  if (!BABYLON?.SceneLoader || typeof BABYLON.SceneLoader.RegisterPlugin !== "function") {
    return;
  }

  const existing = typeof BABYLON.SceneLoader.GetPluginForExtension === "function"
    ? BABYLON.SceneLoader.GetPluginForExtension(".fbx")
    : null;

  if (existing) {
    return;
  }

  const loaderExports = window.FBXLoader;
  const LoaderFactory = loaderExports?.FBXLoader || loaderExports?.default || null;

  if (!LoaderFactory) {
    console.warn("[loader] FBX loader script missing; Devi.fbx guests may fail to load");
    return;
  }

  try {
    const plugin = typeof LoaderFactory.prototype?.createPlugin === "function"
      || typeof LoaderFactory.createPlugin === "function"
      ? (typeof LoaderFactory.createPlugin === "function"
        ? LoaderFactory.createPlugin()
        : new LoaderFactory().createPlugin())
      : new LoaderFactory();

    BABYLON.SceneLoader.RegisterPlugin(plugin);
    console.info("[loader] FBX loader registered for Angji night guests");
  } catch (error) {
    console.warn("[loader] FBX loader registration failed", error);
  }
}

async function start() {
  const BABYLON = window.BABYLON;
  registerBabylonFbxLoader(BABYLON);
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.62, 0.72, 0.86, 1);
  scene.collisionsEnabled = true;

  const ambient = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
  ambient.intensity = 0.55;
  ambient.groundColor = new BABYLON.Color3(0.35, 0.32, 0.28);

  const sun = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.45, -0.9, 0.25), scene);
  sun.position = new BABYLON.Vector3(80, 120, -60);
  sun.intensity = 2.4;
  sun.diffuse = new BABYLON.Color3(1, 0.94, 0.82);
  sun.specular = BABYLON.Color3.Black();
  setupSunControls(BABYLON, sun);
  let angjiNightMode = null;
  let rlbShaderTuningPanel = null;
  setLoadingTargetProgress(LOADING_PROGRESS.engineReady);
  await loadDefaultProjectOverviews();
  loadLocalOverviewOverrides();
  setLoadingTargetProgress(LOADING_PROGRESS.dataReady);

  const tourBgm = createTourBgmController({
    getIsAngjiNightMode: () => angjiNightMode?.isNightMode?.() || false
  });
  const activeModelConfigs = resolveActiveModelConfigs();
  if (!activeModelConfigs.length) {
    setStatus("Requested project was not found.");
    return;
  }

  statusMessage.textContent = `Loading ${activeModelConfigs.map((model) => model.label || model.file).join(", ")}...`;
  const bgmReady = Promise.all(activeModelConfigs.map((config) => tourBgm.preload(config)));

  const modelLoadSteps = countModelLoadSteps(activeModelConfigs);
  let completedModelLoadSteps = 0;

  const modelStates = await Promise.all(activeModelConfigs.map(async (config) => {
    const orbitModelState = await loadTourModelState(BABYLON, scene, config);
    completedModelLoadSteps += 1;
    reportModelLoadProgress(completedModelLoadSteps, modelLoadSteps);

    if (!config.tourFile) {
      return orbitModelState;
    }

    const tourModelState = await loadTourModelState(BABYLON, scene, {
      ...config,
      file: config.tourFile,
      label: `${config.label} 투어`,
      isTourVariant: true
    });
    completedModelLoadSteps += 1;
    reportModelLoadProgress(completedModelLoadSteps, modelLoadSteps);
    orbitModelState.tourModelState = tourModelState;
    tourModelState.orbitModelState = orbitModelState;
    linkTourCollisionFromOrbit(tourModelState, orbitModelState);

    return orbitModelState;
  }));
  void bgmReady.catch((error) => {
    console.warn("Tour BGM preload skipped:", error);
  });
  setLoadingTargetProgress(LOADING_PROGRESS.dataReady + LOADING_PROGRESS.modelsWeight);

  const allModelStates = modelStates.flatMap((modelState) => (
    modelState.tourModelState ? [modelState, modelState.tourModelState] : [modelState]
  ));
  let activeModelIndex = resolveInitialModelIndex(modelStates);
  let displayedModelState = modelStates[activeModelIndex];

  modelStates.forEach((modelState, index) => {
    setModelSlideOffset(BABYLON, modelState, 0);
    setModelStateEnabled(modelState, index === activeModelIndex);
  });
  allModelStates
    .filter((modelState) => modelState.config.isTourVariant)
    .forEach((modelState) => {
      setModelSlideOffset(BABYLON, modelState, 0);
      setModelStateEnabled(modelState, false);
    });

  const orbitCamera = createOrbitCamera(BABYLON, scene);
  const walkCamera = createWalkCamera(BABYLON, scene);
  const resolveSceneCamera = () => scene.activeCamera || orbitCamera;

  allModelStates.forEach((modelState) => {
    ensureAngjiRlbProximityGlow(BABYLON, scene, modelState, resolveSceneCamera);
  });
  let controls = null;

  function updateProjectOverviewVisibility() {
    const isOrbitMode = !controls || !controls.isWalkMode();
    const overviewModelState = modelStates[activeModelIndex];
    const overview = isOrbitMode
      ? getProjectOverview(overviewModelState.config)
      : null;

    renderProjectOverview(overview);

    if (isOverviewAdminUnlocked) {
      renderOverviewAdminEditor(overviewModelState.config);
    } else {
      currentOverviewConfig = overviewModelState.config;
    }
  }

  function showActiveModelState(nextModelState, previousModelState) {
    if (previousModelState && previousModelState !== nextModelState) {
      if (previousModelState.collisionInheritedFromOrbit && previousModelState.orbitModelState) {
        setOrbitCollisionCompanionMode(previousModelState.orbitModelState, false);
      }

      const keepOrbitForTourCollision = (
        nextModelState.collisionInheritedFromOrbit
        && previousModelState === nextModelState.orbitModelState
      );

      if (!keepOrbitForTourCollision) {
        setModelStateEnabled(previousModelState, false);
      }
    }

    setModelSlideOffset(BABYLON, nextModelState, 0);
    setModelStateEnabled(nextModelState, true);

    if (nextModelState.collisionInheritedFromOrbit && nextModelState.orbitModelState) {
      setOrbitCollisionCompanionMode(nextModelState.orbitModelState, true);
    }
    displayedModelState = nextModelState;
    const orbitModelState = nextModelState.orbitModelState || nextModelState;
    applyOrbitCameraStart(BABYLON, orbitCamera, orbitModelState);
    applyOrbitCameraConstraints(BABYLON, orbitCamera, orbitModelState);
    applyOrbitEnvironmentSettings(BABYLON, sun, orbitModelState);
    renderModelDebug(nextModelState);
    updateProjectOverviewVisibility();
    angjiNightMode?.sync();
    rlbShaderTuningPanel?.syncVisibility?.();
  }

  controls = createTourControls(BABYLON, scene, engine, orbitCamera, walkCamera, modelStates[activeModelIndex], {
    tourBgm,
    getIsAngjiNightMode: () => angjiNightMode?.isNightMode?.() || false,
    onModeChange: () => {
      updateProjectOverviewVisibility();
      angjiNightMode?.sync();
      rlbShaderTuningPanel?.syncVisibility?.();
    },
    onActiveModelStateChange: showActiveModelState
  });
  rlbShaderTuningPanel = null;
  void setupLocalRlbShaderTuningPanel({
    getGlowController: () => {
      const modelState = controls?.getActiveModelState?.() || displayedModelState;
      return modelState?.rlbProximityGlow || null;
    },
    isAvailable: () => {
      const modelState = controls?.getActiveModelState?.() || displayedModelState;
      return isAngjiProjectConfig(modelState?.config) && !controls?.isWalkMode?.();
    },
    requestRender: () => {
      scene.render();
    }
  }).then((panel) => {
    rlbShaderTuningPanel = panel;
    panel?.syncVisibility?.();
  });

  angjiNightMode = createAngjiNightModeController(BABYLON, scene, ambient, sun, {
    getActiveModelState: () => controls?.getActiveModelState?.() || displayedModelState,
    isWalkMode: () => controls?.isWalkMode?.() || false,
    getOrbitCamera: () => orbitCamera,
    onNightModeChange: (isNight) => {
      controls?.getGuideTourSystem?.()?.syncGuideNightVisibility?.(isNight);

      void controls?.refreshAngjiGuestsForNightMode?.().catch((error) => {
        console.error("[angji-night] guest refresh failed", error);
      });

      if (controls?.isWalkMode?.()) {
        const activeConfig = controls.getActiveModelState?.()?.config
          || displayedModelState?.config;
        tourBgm.syncNightTourAudio?.(activeConfig, { keepBgm: false });
      }

      rlbShaderTuningPanel?.syncVisibility?.();
    },
    onToggle: (isNight) => {
      setStatus(isNight
        ? "Night Mode active. Guests become Devi. Toggle Day/Night only in Orbit View."
        : "Day Mode restored. Original guests return.");
    }
  });
  controls.setModelState(modelStates[activeModelIndex]);
  angjiNightMode.sync();
  controls.getGuideTourSystem?.()?.syncGuideNightVisibility?.(angjiNightMode?.isNightMode?.() || false);
  void controls.preloadCharacter?.().catch((error) => {
    console.warn("Character preload failed", error);
  });
  canvas.focus();

  renderModelDebug(modelStates[activeModelIndex]);
  applyOrbitCameraStart(BABYLON, orbitCamera, modelStates[activeModelIndex]);
  applyOrbitCameraConstraints(BABYLON, orbitCamera, modelStates[activeModelIndex]);
  applyOrbitEnvironmentSettings(BABYLON, sun, modelStates[activeModelIndex]);
  updateProjectOverviewVisibility();
  initializeOverviewFirebase(activeModelConfigs, updateProjectOverviewVisibility);

  setStatus("Orbit view ready. Middle mouse rotates, Shift+middle pans, wheel zooms to cursor. Use Tour Mode to enter walk mode.");
  setLoadingTargetProgress(LOADING_PROGRESS.sceneReady);

  let hasRenderedFirstFrame = false;

  engine.runRenderLoop(() => {
    if (!controls.isWalkMode()) {
      applyOrbitCameraConstraints(BABYLON, orbitCamera, modelStates[activeModelIndex]);
    }
    scene.render();

    if (!hasRenderedFirstFrame) {
      hasRenderedFirstFrame = true;
      requestLoadingReveal();
    }
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

start().catch((error) => {
  console.error(error);
  hideLoadingOverlay();
  modelStatus.textContent = "Error";
  modelStats.textContent = error.message || String(error);
  setStatus("Failed to start first-person tour.");

  if (localDevToolsEnabled) {
    debugPanel.hidden = false;
  }
});
