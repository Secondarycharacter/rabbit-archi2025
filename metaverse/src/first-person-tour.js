import { FIREBASE_CONFIG, OVERVIEW_ADMIN_PASSCODE } from "./firebase-config.js?v=tps-jump-nocol-20260629";
import { createTpsSystem } from "./controllers/createTpsSystem.js?v=floor2-ceiling-camera-20260629";
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
import { createGuestPlacementTool } from "./guest-placement-tool.js?v=tps-jump-nocol-20260629";
import {
  getAngjiBackgroundGuestSpawns,
  getAngjiPriorityGuestSpawns,
  getAngjiSimultaneousGuestSpawns,
  ANGJI_SIMULTANEOUS_GUEST_IDS,
  ANGJI_PRIORITY_GUEST_IDS,
  getAngjiGuestPositionYOffset
} from "./angji-guest-config.js?v=angji-mark3-height-20260629";
import { createGuestCharacterSystem } from "./guest-character-system.js?v=angji-guest-priority-20260629";
import { applyLocalDevToolsVisibility, isLocalDevEnvironment } from "./local-dev.js?v=local-dev-20260629";

const MODEL_ROOT = "./assets/models/";
const ENEMY_ROOT = "./assets/guest/";
const AUDIO_BGM_ROOT = "./assets/audio/bgm/";
const TOUR_BGM_FADE_MS = 3000;
const TOUR_BGM_VOLUME = 1;
const TOUR_BGM_ENABLED = true;

function canUseTourBgm() {
  return TOUR_BGM_ENABLED && isLocalDevEnvironment();
}
const DEFAULT_MODEL_FILE = "Angji.glb";
const MODEL_CONFIGS = [
  {
    file: "Jinju.glb",
    label: "Glocal Jinju",
    overviewId: "jinju"
  },
  {
    file: "Angji.glb",
    label: "앵지",
    overviewId: "angji",
    tourBgm: "angji/angji_tour_bgm.mp3",
    moveSpeedMultiplier: 3,
    performance: {
      localCollisionRadius: 18,
      localGroundRadius: 24,
      localMeshUpdateDistance: 4,
      treeFacingMinMoveDistance: 0.35,
      treeFacingIntervalFrames: 3
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
    tourFile: "Chungju_tour.glb",
    label: "충주",
    overviewId: "chungju",
    moveSpeedMultiplier: 3,
    performance: {
      localCollisionRadius: 18,
      localGroundRadius: 24,
      localMeshUpdateDistance: 4,
      treeFacingMinMoveDistance: 0.35,
      treeFacingIntervalFrames: 3
    },
    orbitCamera: {
      position: { x: 50.91, y: 40.94, z: 74.48 },
      target: { x: 10.67, y: 16.05, z: 24.47 },
      time: 11
    },
    tourCamera: {
      position: { x: 28.63, y: 6.51, z: 35.81 },
      target: { x: 21.50, y: 6.80, z: 28.80 }
    }
  },
  {
    file: "Geochang.glb",
    label: "거창",
    overviewId: "geochang",
    orbitCamera: {
      position: { x: 10.80, y: 58.49, z: 98.94 },
      target: { x: 10.31, y: 12.44, z: 28.26 }
    },
    tourCamera: {
      position: { x: 2.04, y: 27.77, z: 20.58 },
      target: { x: 1.89, y: 26.83, z: 18.54 }
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
  treeFacingIntervalFrames: 2
};
const FURNITURE_MATERIAL_PREFIXES = ["chair", "sofa", "table"];
const TOUR_RESET_HORIZONTAL_MARGIN_RATIO = 0.08;
const TOUR_RESET_MIN_HORIZONTAL_MARGIN = 30;
const TOUR_RESET_FALL_DISTANCE = 8;
const TOUR_RESET_FADE_MS = 450;
const MAX_STEP_UP = 0.32;
const MAX_STAIR_STEP_UP = 0.48;
const ANGJI_MAX_STAIR_STEP_UP = 1.05;
const MAX_STEP_DOWN = 0.85;
const MIN_STEP_DOWN = 0.025;
const MIN_STEP_UP = 0.035;
const STEP_PROBE_DISTANCES = [0.12, 0.2, 0.32, 0.45, 0.62];
const ANGJI_STAIR_PROBE_DISTANCES = [...STEP_PROBE_DISTANCES, 0.85, 1.1, 1.4];
const STAIR_MATERIAL_KEYWORDS = ["polishedconcreteold", "stone01", "stair01", "stair02"];
const STAIR_NODE_KEYWORDS = ["3dgeom126", "3dgeom292", "3dgeom599", "3dgeom600", "stair01", "stair02"];
const ANGJI_BUILDING_WALL_PREFIXES = ["0_col_b_wall"];
const ANGJI_BUILDING_FLOOR1_PREFIXES = ["0_col_b_floor1"];
const ANGJI_BUILDING_FLOOR2_PREFIXES = ["0_col_b_floor2"];
const ANGJI_BUILDING_FLOOR_PREFIXES = [...ANGJI_BUILDING_FLOOR1_PREFIXES, ...ANGJI_BUILDING_FLOOR2_PREFIXES];
const ANGJI_BUILDING_STAIR_PREFIXES = ["0_col_b_stair"];
const ANGJI_BUILDING_FURNITURE_PREFIXES = ["0_col_b_fur"];
const ANGJI_EXTERNAL_FLOOR_PREFIXES = ["0_col_c_floor", "00_col_c_floor"];
const ANGJI_EXTERNAL_WALL_PREFIXES = ["0_col_c_wall"];
const ANGJI_EXTERNAL_STAIR_PREFIXES = ["0_col_c_stair"];
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
const WALL_NORMAL_MAX_Y = 0.9;
const MIN_COLLISION_DISTANCE = 0.04;
const STEP_SMOOTHING = 0.35;
const STEP_SETTLE_EPSILON = 0.015;
const GROUND_GRACE_MS = 180;
const GROUND_GRACE_VERTICAL_TOLERANCE = 0.18;
const STAIR_GROUND_GRACE_MS = 1600;
const STAIR_GROUND_GRACE_VERTICAL_TOLERANCE = 0.52;
const STAIR_STAND_SNAP_TOLERANCE = 0.42;
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
  hitRotationRadians: Math.PI / 2
};
const MATERIAL_REFLECTION_SETTINGS = {
  specularIntensity: 0,
  specularPower: 8,
  roughness: 1,
  metallic: 0
};
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
const modelSwitcher = document.getElementById("modelSwitcher");
const previousModelButton = document.getElementById("previousModelButton");
const nextModelButton = document.getElementById("nextModelButton");
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

function countModelLoadSteps() {
  return MODEL_CONFIGS.reduce((total, config) => total + (config.tourFile ? 2 : 1), 0);
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
}

startLoadingOverlay();

canvas.tabIndex = 0;

projectTitle.textContent = "First Person Architecture Tour";
floorLabel.textContent = "Orbit View";
healthLabel.textContent = "Human scale";
monsterLabel.textContent = "Object collision";
statusMessage.textContent = `Loading ${MODEL_CONFIGS.map((model) => model.file).join(", ")}...`;

function isPlacementToolEnabled() {
  return localDevToolsEnabled && (!debugPanel.hidden || booleanParam("placement", false));
}

function renderGuestPlacementList(markers) {
  if (!guestPlacementList) {
    return;
  }

  guestPlacementList.innerHTML = markers.length === 0
    ? "<li>아직 마커가 없습니다.</li>"
    : markers.map((marker) => (
      `<li><strong>${marker.label}</strong>`
      + `${marker.file ? ` / ${marker.file}` : ""}`
      + `<br>pos x ${marker.position.x}, y ${marker.position.y}, z ${marker.position.z}`
      + `<br>rotY ${marker.rotationY} (${marker.rotationYDeg}°)`
      + `</li>`
    )).join("");
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
  mesh.visibility = 1;

  collectMeshMaterials(mesh).forEach((material) => {
    material.alpha = 0;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
  });
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
    if (mesh.metadata?.angjiStairSurface) angjiLayers.push("stair");

    if (angjiLayers.length > 1) {
      categories.angjiLayerConflicts.push(`${entry} -> ${angjiLayers.join("+")}`);
    } else if (angjiLayers.length === 1) {
      const layer = angjiLayers[0];

      if (layer === "wall") categories.angjiWalls.push(entry);
      else if (layer === "furniture") categories.angjiFurniture.push(entry);
      else if (layer === "floor") categories.angjiFloors.push(entry);
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

function getTourBgmUrl(config) {
  if (!canUseTourBgm()) {
    return null;
  }

  const fileName = config?.tourBgm;

  if (!fileName) {
    return null;
  }

  return `${AUDIO_BGM_ROOT}${fileName}`;
}

function createTourBgmController() {
  let audio = null;
  let fadeFrameId = null;
  let loadedUrl = null;

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

    if (keepBgm && !track.paused) {
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

  function preload(config) {
    const url = getTourBgmUrl(config);

    if (!url) {
      return Promise.resolve();
    }

    const track = getTrack(url);

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

  function stopTourBgm({ fadeOut = true } = {}) {
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
      playTourBgm(config, walkEntryOptions);
    },
    onEnterOrbitMode(config) {
      if (!getTourBgmUrl(config)) {
        return;
      }

      stopTourBgm({ fadeOut: true });
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
    if (material && typeof material.freeze === "function") {
      material.freeze();
    }
  });
}

function isDtvTreeMesh(mesh) {
  return getMaterialNames(mesh).some((name) => normalizeName(name).startsWith("dtv"));
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

function attachTreeYawPivot(BABYLON, scene, mesh, modelRoot) {
  mesh.billboardMode = 0;
  modelRoot.computeWorldMatrix(true);
  mesh.computeWorldMatrix(true);

  const worldPos = mesh.getAbsolutePosition().clone();
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

function isPeopleFireballTarget(mesh) {
  return hasMaterialKeyword(mesh, PASS_THROUGH_MATERIAL_KEYWORDS);
}

function isLikelyWalkableSurface(mesh) {
  if (mesh.metadata?.angjiWallSurface || mesh.metadata?.angjiFurnitureSurface) {
    return false;
  }

  return isStairSurface(mesh) || isFloorSurface(mesh);
}

function pickAngjiGuestFloorY(BABYLON, scene, x, z, floor1Meshes, externalFloorMeshes) {
  const floor1Set = new Set(floor1Meshes || []);
  const externalSet = new Set(externalFloorMeshes || []);
  const rayOrigin = new BABYLON.Vector3(x, GROUND_RAY_UP + 120, z);
  const ray = new BABYLON.Ray(rayOrigin, new BABYLON.Vector3(0, -1, 0), GROUND_RAY_UP + GROUND_RAY_DOWN + 120);

  const pickTopFloorY = (meshSet) => {
    if (!meshSet.size) {
      return null;
    }

    const hits = getRayHits(scene, ray, (mesh) => (
      meshSet.has(mesh)
      && mesh.isEnabled()
      && mesh.isPickable !== false
    ));

    const topHit = hits
      .filter((hit) => {
        const normal = hit.getNormal?.(true);
        return !normal || normal.y >= CLASSIFIED_GROUND_NORMAL_MIN_Y;
      })
      .sort((a, b) => b.pickedPoint.y - a.pickedPoint.y)[0];

    return topHit?.pickedPoint?.y ?? null;
  };

  const floor1Y = pickTopFloorY(floor1Set);

  if (floor1Y !== null) {
    return floor1Y;
  }

  return pickTopFloorY(externalSet);
}

function resolveAngjiGuestSpawn(BABYLON, scene, spawn, floor1Meshes, externalFloorMeshes) {
  const snapFloorY = (x, z, fallbackY) => {
    const groundY = pickAngjiGuestFloorY(BABYLON, scene, x, z, floor1Meshes, externalFloorMeshes);
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
      patrolTargets: spawn.movement.patrolTargets.map((target) => ({
        ...target,
        y: snapFloorY(target.x, target.z, target.y)
      }))
    }
  };
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

  if (isFloorSurface(hit.pickedMesh) || isStairSurface(hit.pickedMesh)) {
    return !normal || Math.abs(normal.y) >= CLASSIFIED_GROUND_NORMAL_MIN_Y ? hit : null;
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
  material.emissiveColor = new BABYLON.Color3(1, 0.28, 0.02);
  material.specularColor = new BABYLON.Color3(1, 0.65, 0.18);
  return material;
}

function createFireballProjectile(BABYLON, scene, camera) {
  const direction = camera.getDirection(BABYLON.Axis.Z).normalize();
  const position = camera.position.add(direction.scale(FIREBALL_SETTINGS.spawnDistance));
  const mesh = BABYLON.MeshBuilder.CreateSphere("tour-fireball", {
    diameter: FIREBALL_SETTINGS.radius * 2,
    segments: 16
  }, scene);

  mesh.position.copyFrom(position);
  mesh.material = getFireballMaterial(BABYLON, scene);
  mesh.isPickable = false;

  const light = new BABYLON.PointLight("tour-fireball-light", BABYLON.Vector3.Zero(), scene);
  light.parent = mesh;
  light.position.set(0, 0, 0);
  light.intensity = 0.8;
  light.range = 5;
  light.diffuse = new BABYLON.Color3(1, 0.35, 0.05);

  return {
    mesh,
    light,
    direction,
    distance: 0
  };
}

function disposeFireballProjectile(projectile) {
  projectile.light?.dispose();
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

function splitPeopleTargetMeshes(BABYLON, scene, meshes) {
  const generatedMeshes = [];

  meshes.slice().forEach((mesh) => {
    if (!isPeopleFireballTarget(mesh) || mesh.metadata?.fireballSplitComponent) {
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

function findGroundHit(BABYLON, scene, position, groundMeshSet) {
  const rayOrigin = new BABYLON.Vector3(position.x, position.y + GROUND_RAY_UP, position.z);
  const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), GROUND_RAY_UP + GROUND_RAY_DOWN);
  const hits = getRayHits(scene, ray, (mesh) => groundMeshSet.has(mesh) && mesh.isPickable && mesh.isEnabled());
  return hits.map(getValidGroundHit).find(Boolean) || null;
}

function getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet) {
  const hits = [];

  for (const [offsetX, offsetZ] of GROUND_PROBE_OFFSETS) {
    const rayOrigin = new BABYLON.Vector3(
      position.x + offsetX,
      position.y + GROUND_RAY_UP,
      position.z + offsetZ
    );
    const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), GROUND_RAY_UP + GROUND_RAY_DOWN);
    hits.push(...getRayHits(scene, ray, (mesh) => groundMeshSet.has(mesh) && mesh.isPickable && mesh.isEnabled()));
  }

  return hits
    .map(getValidGroundHit)
    .filter(Boolean)
    .sort((a, b) => b.pickedPoint.y - a.pickedPoint.y);
}

function getGroundPoseAtPosition(BABYLON, scene, position, groundMeshSet, referenceEyeY = null) {
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet);
  let hit = groundHits[0] || null;

  if (typeof referenceEyeY === "number") {
    hit = groundHits
      .map((candidate) => ({
        hit: candidate,
        eyeY: candidate.pickedPoint.y + EYE_HEIGHT,
        delta: candidate.pickedPoint.y + EYE_HEIGHT - referenceEyeY
      }))
      .filter((candidate) => candidate.delta >= -MAX_STEP_DOWN && candidate.delta <= MAX_STEP_UP)
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0]?.hit || null;
  }

  if (!hit?.pickedPoint) {
    return null;
  }

  return {
    hit,
    groundY: hit.pickedPoint.y,
    eyeY: hit.pickedPoint.y + EYE_HEIGHT
  };
}

function getLandingGroundPoseAtPosition(BABYLON, scene, position, groundMeshSet, referenceEyeY) {
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet);
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
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet);
  const stepCandidate = groundHits
    .filter((candidate) => isStairSurface(candidate.pickedMesh))
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

function isRayPickableCollisionMesh(mesh, collisionMeshSet) {
  return collisionMeshSet.has(mesh) && mesh.isPickable && mesh.isEnabled() && !mesh.metadata?.passThrough;
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
      const hit = hits.map(getBlockingBodyHit).find(Boolean);

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
  return Boolean(hit?.pickedMesh && isStairSurface(hit.pickedMesh));
}

function findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, options = {}) {
  const moveDistance = movement.length();

  if (moveDistance <= 0) {
    return null;
  }

  const direction = movement.normalizeToNew();
  const probeDistances = options.probeDistances ?? STEP_PROBE_DISTANCES;

  for (const distance of probeDistances) {
    const probeDistance = Math.max(distance, moveDistance);
    const probePosition = previousPosition.add(direction.scale(probeDistance));
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

  return null;
}

function applyStepUp(BABYLON, camera, movement, stepPose) {
  const previousPosition = camera.position.clone();
  const desiredPosition = previousPosition.add(movement);

  camera.position.set(desiredPosition.x, previousPosition.y, desiredPosition.z);

  return {
    moved: true,
    reason: `step ${stepPose.verticalDelta.toFixed(2)}`,
    distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
    previousPosition,
    stepTargetY: stepPose.eyeY,
    stepTargetHit: stepPose.hit
  };
}

function tryMoveWithCollision(BABYLON, scene, camera, movement, collisionMeshSet, modelBounds, groundMeshSet, options = {}) {
  const previousPosition = camera.position.clone();
  const desiredPosition = previousPosition.add(movement);
  const canStepUp = options.allowStepUp !== false;
  const maxStairStepUp = options.maxStairStepUp ?? MAX_STAIR_STEP_UP;
  const stairStepOptions = {
    maxVerticalDelta: maxStairStepUp,
    probeDistances: options.stairProbeDistances ?? STEP_PROBE_DISTANCES
  };
  const initialCollisionHit = findBodyCollision(BABYLON, scene, previousPosition, movement, collisionMeshSet, modelBounds);
  const leadingStepPose = canStepUp
    ? findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, stairStepOptions)
    : null;

  if (leadingStepPose) {
    if (!initialCollisionHit || isLowStepCollision(initialCollisionHit) || isStairCollisionHit(initialCollisionHit)) {
      return applyStepUp(BABYLON, camera, movement, leadingStepPose);
    }

    return {
      moved: false,
      reason: `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "object"}`,
      distance: 0,
      previousPosition
    };
  }

  const groundPose = getGroundPoseAtPosition(BABYLON, scene, desiredPosition, groundMeshSet, previousPosition.y);

  if (!groundPose) {
    if (!initialCollisionHit) {
      camera.position.set(desiredPosition.x, previousPosition.y, desiredPosition.z);
      return {
        moved: true,
        reason: "flat",
        distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
        previousPosition
      };
    }

    return {
      moved: false,
      reason: `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "object"}`,
      distance: 0,
      previousPosition
    };
  }

  const verticalDelta = groundPose.eyeY - previousPosition.y;

  if (verticalDelta >= MIN_STEP_UP && verticalDelta <= MAX_STEP_UP) {
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
      return {
        moved: false,
        reason: `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "object"}`,
        distance: 0,
        previousPosition
      };
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

  if (verticalDelta > MAX_STEP_UP) {
    if (canStepUp && verticalDelta <= maxStairStepUp) {
      const stepPose = findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, stairStepOptions);

      if (stepPose) {
        return applyStepUp(BABYLON, camera, movement, stepPose);
      }
    }

    const aheadIsStair = Boolean(groundPose?.hit?.pickedMesh && isStairSurface(groundPose.hit.pickedMesh));

    if (initialCollisionHit || aheadIsStair) {
      return {
        moved: false,
        reason: `wall:${aheadIsStair ? "stair" : initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "too high"}`,
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
      return {
        moved: false,
        reason: `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "drop"}`,
        distance: 0,
        previousPosition
      };
    }

    camera.position.set(desiredPosition.x, previousPosition.y, desiredPosition.z);

    return {
      moved: true,
      reason: "flat drop-skip",
      distance: BABYLON.Vector3.Distance(previousPosition, camera.position),
      previousPosition
    };
  }

  const collisionHit = findBodyCollision(BABYLON, scene, previousPosition, movement, collisionMeshSet, modelBounds, {
    skipLowProbe: verticalDelta > 0.05
  });

  if (collisionHit) {
    const stepPose = canStepUp
      ? findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet, stairStepOptions)
      : null;

    if (stepPose && (isLowStepCollision(collisionHit) || isStairCollisionHit(collisionHit))) {
      return applyStepUp(BABYLON, camera, movement, stepPose);
    }

    return {
      moved: false,
      reason: `wall:${collisionHit.pickedMesh?.name || collisionHit.pickedMesh?.id || "object"}`,
      distance: 0,
      previousPosition
    };
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
  let projectileHitMeshSet = new Set(initialModelState.projectileHitMeshes);
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
  let lastTpsRuntimeState = null;
  let guestPlacementTool = null;
  let guestCharacterSystem = null;
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
        localCollisionMeshSet.has(mesh)
        || Boolean(mesh.metadata?.angjiCameraBlockingSurface)
        || Boolean(mesh.metadata?.angjiCollisionLayer)
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
    getGeometryMeshes,
    getRootNodes,
    updateWorldMatrices,
    getFullBounds,
    softenModelMaterialReflections,
    targetHeight: 1.75,
    resolveSpawnPosition: (spawn) => {
      const walkModelState = activeModelState.tourModelState || activeModelState;

      if (!isAngjiProjectConfig(walkModelState.config)) {
        return null;
      }

      return resolveAngjiGuestSpawn(
        BABYLON,
        scene,
        spawn,
        walkModelState.angjiBuildingFloor1Meshes,
        walkModelState.angjiExternalFloorMeshes
      );
    },
    resolveGuestFloorY: (x, z, fallbackY) => {
      const walkModelState = activeModelState.tourModelState || activeModelState;

      if (!isAngjiProjectConfig(walkModelState.config)) {
        return fallbackY;
      }

      return pickAngjiGuestFloorY(
        BABYLON,
        scene,
        x,
        z,
        walkModelState.angjiBuildingFloor1Meshes,
        walkModelState.angjiExternalFloorMeshes
      ) ?? fallbackY;
    }
  });
  preloadAngjiPriorityGuests();

  function preloadAngjiPriorityGuests() {
    if (!isAngjiProjectConfig(activeModelState.config)) {
      return;
    }

    const run = () => {
      void guestCharacterSystem?.preload(getAngjiPriorityGuestSpawns(), { parallel: true });
      void guestCharacterSystem?.preload(getAngjiSimultaneousGuestSpawns(), { parallel: true });
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 4000 });
      return;
    }

    window.setTimeout(run, 2000);
  }

  function canUseAngjiGuests() {
    return walkMode && isAngjiProjectConfig(activeModelState.config);
  }

  async function scheduleGuestSpawn() {
    if (!canUseAngjiGuests()) {
      guestCharacterSystem?.hide();
      return;
    }

    guestCharacterSystem.hide();

    try {
      await guestCharacterSystem.ensureSpawned(getAngjiPriorityGuestSpawns(), { parallel: true });
      guestCharacterSystem.show({ includeIds: ANGJI_PRIORITY_GUEST_IDS });

      await guestCharacterSystem.ensureSpawned(getAngjiSimultaneousGuestSpawns(), { parallel: true });
      guestCharacterSystem.show({
        includeIds: [...ANGJI_PRIORITY_GUEST_IDS, ...ANGJI_SIMULTANEOUS_GUEST_IDS]
      });

      for (const spawn of getAngjiBackgroundGuestSpawns()) {
        await guestCharacterSystem.ensureSpawned([spawn]);
        guestCharacterSystem.show();
      }

      window.auditAngjiTourElements?.();
    } catch (error) {
      console.error("Guest spawn failed", error);
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
    setStatus(`Guest placement saved: ${marker.label}`);
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
    const viewerPosition = walkMode ? walkCamera.position : orbitCamera.position;
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

    activeTreeMeshes.forEach((mesh) => {
      if (!mesh.isEnabled() || (typeof mesh.visibility === "number" && mesh.visibility <= 0.02)) {
        return;
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
    projectileHitMeshSet = new Set(nextModelState.projectileHitMeshes);
    restoreTreeMeshesInitialRotation(activeTreeMeshes);
    activeTreeMeshes = nextModelState.treeMeshes || [];
    lastLocalMeshPosition = null;
    lastTreeViewerPosition = null;
    treeFacingFrameCounter = 0;
    activeModelState = nextModelState;
    preloadAngjiPriorityGuests();

    if (walkMode && isAngjiProjectConfig(nextModelState.config)) {
      void scheduleGuestSpawn();
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
    const nearbyGroundMeshes = getMeshesNearPosition(
      BABYLON,
      activeGroundMeshes,
      walkCamera.position,
      performanceSettings.localGroundRadius
    );

    localCollisionMeshSet = nearbyCollisionMeshes.length > 0 ? new Set(nearbyCollisionMeshes) : collisionMeshSet;
    localGroundMeshSet = nearbyGroundMeshes.length > 0 ? new Set(nearbyGroundMeshes) : groundMeshSet;
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
      const ray = new BABYLON.Ray(fireball.mesh.position, fireball.direction, stepDistance + FIREBALL_SETTINGS.radius);
      const hit = getRayHits(scene, ray, isFireballHitMesh)[0] || null;
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

        if (isPeopleFireballTarget(hit.pickedMesh)) {
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
    return activeModelState.config?.tourCamera || DEFAULT_TOUR_CAMERA;
  }

  function getWalkSpawnCameraConfig() {
    const tourCamera = getActiveTourCameraConfig();
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
    const hit = findGroundHit(BABYLON, scene, walkCamera.position, localGroundMeshSet);

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
      isStair: Boolean(hit?.pickedMesh && isStairSurface(hit.pickedMesh)),
      time: performance.now()
    };
  }

  function tryUseGroundGrace() {
    if (!lastStableGroundPose) {
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

  function trySnapToStairWhileStanding() {
    const stairPose = getStepPoseAtPosition(BABYLON, scene, walkCamera.position, localGroundMeshSet, walkCamera.position.y, {
      minVerticalDelta: -STAIR_STAND_SNAP_TOLERANCE,
      maxVerticalDelta: STAIR_STAND_SNAP_TOLERANCE
    });

    if (!stairPose) {
      return false;
    }

    const verticalGap = Math.abs(walkCamera.position.y - stairPose.eyeY);

    if (verticalGap > STAIR_STAND_SNAP_TOLERANCE) {
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

    const groundPose = getLandingGroundPoseAtPosition(BABYLON, scene, walkCamera.position, localGroundMeshSet, walkCamera.position.y);

    if (groundPose) {
      const distanceToGround = walkCamera.position.y - groundPose.eyeY;

      if (distanceToGround <= GROUND_SNAP_TOLERANCE && distanceToGround >= -MAX_STEP_UP && vy <= 0) {
        walkCamera.position.y = groundPose.eyeY;
        verticalVelocity = 0;
        isGrounded = true;
        rememberStableGround(groundPose.hit, groundPose.eyeY);
        inputDiagnostics.lastGround = getSurfaceDebugName(groundPose.hit);
        return { verticalVelocity, isGrounded };
      }

      if (distanceToGround < -GROUND_SNAP_TOLERANCE && Math.abs(distanceToGround) <= MAX_STEP_UP) {
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
    void scheduleGuestSpawn();
    options.onModeChange?.("walk");
    currentLabel = "third-person tour";

    if (shouldLockPointer) {
      requestPointerLockSafe();
    }

    floorLabel.textContent = "Walk Mode (TPS)";
    setStatus("Third-person walk mode active. WASD moves, Shift runs, Space jumps, J jump-over test, E throws, P dances, mouse looks, wheel zooms. Use Orbit View to return.");
    updateModeSwitchButtons();
    updateDebug();
  }

  function enterOrbitMode() {
    walkMode = false;
    document.body.classList.remove("walk-mode-active");
    clearFireballs();
    resetEnemy();
    guestCharacterSystem?.hide();
    clearMovementKeys();
    tpsSystem?.hide?.();
    document.exitPointerLock?.();
    const leavingTourConfig = activeModelState.config;
    activateModelState(activeModelState.orbitModelState || activeModelState, "orbit");
    options.tourBgm?.onEnterOrbitMode(leavingTourConfig);
    orbitCamera.attachControl(canvas, false);
    scene.activeCamera = orbitCamera;
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
    if (walkMode) {
      requestPointerLockSafe();
    }
  });

  canvas.addEventListener("wheel", (event) => {
    if (!walkMode) {
      return;
    }

    event.preventDefault();
    pendingWheelDelta += event.deltaY;
  }, { passive: false });

  window.addEventListener("mousemove", (event) => {
    inputDiagnostics.mouseMoveCount += 1;
    inputDiagnostics.lastMouseMove = walkMode ? "walk" : "orbit";
    inputDiagnostics.lastMouseDelta = `x ${event.movementX || 0}, y ${event.movementY || 0}`;

    if (walkMode && document.pointerLockElement === canvas) {
      pendingMouseDeltaX += event.movementX || 0;
      pendingMouseDeltaY += event.movementY || 0;
    }

    updateInputDebug();
  });

  window.addEventListener("keydown", (event) => {
    if (isOverviewAdminEditing(event)) {
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

    const inputBlocked = walkMode && tpsSystem?.isPlayerInputBlocked?.();
    applyCharacterTpsKeyDown(event, {
      walkMode,
      keys,
      tpsSystem,
      inputBlocked,
      onThrowExtra: tryShootFireball
    });

    if (!event.repeat) {
      updateInputDebug();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (isOverviewAdminEditing(event)) {
      clearMovementKeys();
      return;
    }

    const key = getInputKey(event);
    inputDiagnostics.keyUpCount += 1;
    inputDiagnostics.lastKeyUp = `${key || "unknown"} (${event.code || event.key || "?"})`;
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
    updateTreeMeshesFacingViewer();

    if (!walkMode) {
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

    const deltaScale = Math.min(engine.getDeltaTime() / 16.6667, 2);
    const deltaSeconds = engine.getDeltaTime() / 1000;
    refreshLocalMeshSets();
    const modelSpeedMultiplier = ANGJI_MOVE_SPEED_MULTIPLIER;

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

      const appliedMovement = direction.clone().scale(moveSpeed);
      const angjiMoveOptions = isAngjiProjectConfig(activeModelState.config)
        ? {
          maxStairStepUp: ANGJI_MAX_STAIR_STEP_UP,
          stairProbeDistances: ANGJI_STAIR_PROBE_DISTANCES
        }
        : {};
      const moveResult = tryMoveWithCollision(BABYLON, scene, walkCamera, appliedMovement, localCollisionMeshSet, activeModelState.model.bounds, localGroundMeshSet, {
        allowStepUp: typeof stepTargetY !== "number",
        ...angjiMoveOptions
      });

      if (typeof moveResult.stepTargetY === "number" && typeof stepTargetY !== "number") {
        const targetDelta = moveResult.stepTargetY - walkCamera.position.y;
        const maxStepTarget = isAngjiProjectConfig(activeModelState.config) ? ANGJI_MAX_STAIR_STEP_UP : MAX_STEP_UP;

        if (targetDelta >= MIN_STEP_UP && targetDelta <= maxStepTarget) {
          stepTargetY = moveResult.stepTargetY;
          stepTargetHit = moveResult.stepTargetHit || null;
        }
      }

      if (moveResult.moved && moveResult.groundHit) {
        rememberStableGround(moveResult.groundHit, walkCamera.position.y);
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
      clearPlayerKeys: () => tpsSystem?.getInputController?.()?.clear(),
      resolveGroundEyeY: (position) => {
        const groundPose = getLandingGroundPoseAtPosition(
          BABYLON,
          scene,
          position,
          localGroundMeshSet,
          position.y
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
    isWalkMode: () => walkMode,
    preloadCharacter: () => tpsSystem?.ensureLoaded?.()
  };
}

function setModelSlideOffset(BABYLON, modelState, offsetX) {
  const nextPosition = modelState.baseRootPosition.add(new BABYLON.Vector3(offsetX, 0, 0));
  modelState.model.root.position.copyFrom(nextPosition);
}

function setModelStateEnabled(modelState, enabled) {
  modelState.model.root.setEnabled(enabled);
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

function getOrbitCameraSettings(modelState) {
  const orbitSettings = modelState?.config?.orbitCamera;

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
  modelSource.textContent = `${MODEL_ROOT}${config.file}`;
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
  const fileName = `${config.file}?v=${Date.now()}`;
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", MODEL_ROOT, fileName, scene);
  let meshes = getGeometryMeshes(result.meshes);
  const model = normalizeModel(BABYLON, scene, result, meshes);

  model.root.name = `tour-building-root-${normalizeName(config.label)}`;
  meshes = [...meshes, ...splitPeopleTargetMeshes(BABYLON, scene, meshes)];

  let propPassThroughCount = 0;
  let furniturePassThroughCount = 0;
  const peopleTargetMeshes = [];
  const isAngjiProject = isAngjiProjectConfig(config);

  await processTourMeshesInChunks(meshes, (mesh) => {
    getCachedMeshBounds(BABYLON, mesh);

    const furniture = isChungjuProjectConfig(config) && isFurnitureMesh(mesh);
    const propPassThrough = isTourPropMesh(mesh);
    const angjiCollisionLayer = isAngjiProject && hasAngjiCollisionMaterial(mesh);
    const angjiFurnitureSurface = isAngjiProject && hasAngjiFurnitureMaterial(mesh);
    const angjiStairSurface = isAngjiProject && hasAngjiStairMaterial(mesh);
    const angjiBuildingFloor1Surface = isAngjiProject && hasAngjiBuildingFloor1Material(mesh);
    const angjiBuildingFloor2Surface = isAngjiProject && hasAngjiBuildingFloor2Material(mesh);
    const angjiExternalFloorSurface = isAngjiProject && hasAngjiExternalFloorMaterial(mesh);
    const angjiFloorSurface = angjiBuildingFloor1Surface || angjiBuildingFloor2Surface || angjiExternalFloorSurface;
    const angjiWallSurface = isAngjiProject && hasAngjiWallMaterial(mesh);
    const angjiCameraBlockingSurface = angjiWallSurface
      || angjiFurnitureSurface
      || angjiBuildingFloor1Surface
      || angjiBuildingFloor2Surface;
    const passThrough = isAngjiProject ? !angjiCollisionLayer : (propPassThrough || furniture);
    const peopleTarget = isPeopleFireballTarget(mesh);

    if (propPassThrough || (isAngjiProject && passThrough)) {
      propPassThroughCount += 1;
    }

    if (furniture) {
      furniturePassThroughCount += 1;
    }

    if (peopleTarget && mesh.isEnabled()) {
      peopleTargetMeshes.push(mesh);
    }

    mesh.isPickable = mesh.isEnabled() && (passThrough ? peopleTarget : true);
    mesh.checkCollisions = passThrough ? false : ENABLE_MODEL_COLLISIONS;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      passThrough,
      peopleTarget,
      furniture: furniture || angjiFurnitureSurface,
      tourProp: propPassThrough,
      angjiCollisionLayer,
      angjiCollisionRole: isAngjiProject ? getAngjiCollisionMaterialRole(mesh) : null,
      angjiStairSurface,
      angjiWallSurface,
      angjiFurnitureSurface,
      angjiFloorSurface,
      angjiBuildingFloor1Surface,
      angjiBuildingFloor2Surface,
      angjiExternalFloorSurface,
      angjiCameraBlockingSurface,
      angjiCameraBlockingRequiresWallNormal: angjiBuildingFloor2Surface
    };

    if (isAngjiProject && angjiCollisionLayer) {
      applyAngjiCollisionInvisibility(mesh, BABYLON);
    }
  });

  softenModelMaterialReflections(BABYLON, scene.materials);
  hideTourStartMarker(model.tourStartNode, meshes);

  if (booleanParam("clay", CLAY_PREVIEW)) {
    applyClayPreviewMaterial(BABYLON, scene, meshes);
  }

  const treeMeshes = meshes.filter((mesh) => mesh.isEnabled() && isDtvTreeMesh(mesh));
  const treeMeshIds = new Set(treeMeshes.map((mesh) => mesh.uniqueId));

  let usedCollisionFallback = false;
  let collisionMeshes;

  if (isAngjiProject) {
    collisionMeshes = meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiCollisionLayer
      && !treeMeshIds.has(mesh.uniqueId)
    ));

    if (collisionMeshes.length === 0) {
      console.warn("Angji tour model has no 0_COL_* collision meshes.");
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

  const stairSurfaceMeshes = isAngjiProject
    ? meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && mesh.metadata?.angjiStairSurface)
    : meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && isStairSurface(mesh));
  const floorSurfaceMeshes = isAngjiProject
    ? meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && mesh.metadata?.angjiFloorSurface)
    : meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && isFloorSurface(mesh));
  const angjiBuildingFloor1Meshes = isAngjiProject
    ? meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiBuildingFloor1Surface
    ))
    : [];
  const angjiExternalFloorMeshes = isAngjiProject
    ? meshes.filter((mesh) => (
      mesh.isEnabled()
      && !isDescendantOf(mesh, model.tourStartNode)
      && mesh.metadata?.angjiExternalFloorSurface
    ))
    : [];

  [...stairSurfaceMeshes, ...floorSurfaceMeshes].forEach((mesh) => {
    mesh.metadata = { ...(mesh.metadata || {}), passThrough: false, groundSurface: true };
    mesh.isPickable = true;
  });

  const collisionMeshMap = new Map(collisionMeshes.map((mesh) => [mesh.uniqueId, mesh]));
  stairSurfaceMeshes.forEach((mesh) => collisionMeshMap.set(mesh.uniqueId, mesh));
  floorSurfaceMeshes.forEach((mesh) => collisionMeshMap.set(mesh.uniqueId, mesh));
  collisionMeshes = Array.from(collisionMeshMap.values());

  const groundMeshMap = new Map();

  if (isAngjiProject) {
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

  freezeSceneMaterials(scene.materials);

  return {
    config,
    result,
    meshes,
    model,
    baseRootPosition: model.root.position.clone(),
    propPassThroughCount,
    furniturePassThroughCount,
    angjiCollisionLayerCount: isAngjiProject ? collisionMeshes.length : undefined,
    usedCollisionFallback,
    collisionMeshes,
    walkableGroundMeshes: Array.from(groundMeshMap.values()),
    stairSurfaceMeshes,
    floorSurfaceMeshes,
    angjiBuildingFloor1Meshes,
    angjiExternalFloorMeshes,
    peopleTargetMeshes,
    treeMeshes,
    projectileHitMeshes: meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode))
  };
}

async function start() {
  const BABYLON = window.BABYLON;
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
  setLoadingTargetProgress(LOADING_PROGRESS.engineReady);
  await loadDefaultProjectOverviews();
  loadLocalOverviewOverrides();
  setLoadingTargetProgress(LOADING_PROGRESS.dataReady);

  const tourBgm = createTourBgmController();
  const bgmReady = Promise.all(MODEL_CONFIGS.map((config) => tourBgm.preload(config)));

  const modelLoadSteps = countModelLoadSteps();
  let completedModelLoadSteps = 0;

  const modelStates = await Promise.all(MODEL_CONFIGS.map(async (config) => {
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

    return orbitModelState;
  }));
  void bgmReady.catch((error) => {
    console.warn("Tour BGM preload skipped:", error);
  });
  setLoadingTargetProgress(LOADING_PROGRESS.dataReady + LOADING_PROGRESS.modelsWeight);

  const allModelStates = modelStates.flatMap((modelState) => (
    modelState.tourModelState ? [modelState, modelState.tourModelState] : [modelState]
  ));
  const slideDistance = getSlideDistance(modelStates);
  let activeModelIndex = Math.max(0, MODEL_CONFIGS.findIndex((config) => config.file === DEFAULT_MODEL_FILE));
  let displayedModelState = modelStates[activeModelIndex];
  let transitionState = null;
  let isTransitioning = false;

  modelStates.forEach((modelState, index) => {
    setModelSlideOffset(BABYLON, modelState, index === activeModelIndex ? 0 : slideDistance);
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
  let controls = null;

  function updateModelSwitcherVisibility() {
    const shouldShow = Boolean(controls && !controls.isWalkMode() && !isTransitioning && modelStates.length > 1);
    modelSwitcher.classList.toggle("is-hidden", !shouldShow);
    previousModelButton.disabled = isTransitioning;
    nextModelButton.disabled = isTransitioning;
  }

  function updateProjectOverviewVisibility() {
    const isOrbitMode = !controls || !controls.isWalkMode();
    const overviewModelState = modelStates[activeModelIndex];
    const overview = !isTransitioning && isOrbitMode
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
      setModelStateEnabled(previousModelState, false);
    }

    setModelSlideOffset(BABYLON, nextModelState, 0);
    setModelStateEnabled(nextModelState, true);
    displayedModelState = nextModelState;
    const orbitModelState = nextModelState.orbitModelState || nextModelState;
    applyOrbitCameraStart(BABYLON, orbitCamera, orbitModelState);
    applyOrbitCameraConstraints(BABYLON, orbitCamera, orbitModelState);
    applyOrbitEnvironmentSettings(BABYLON, sun, orbitModelState);
    renderModelDebug(nextModelState);
    updateProjectOverviewVisibility();
  }

  function easeOutCubic(value) {
    return 1 - ((1 - value) ** 3);
  }

  function startModelTransition(direction) {
    if (isTransitioning || controls?.isWalkMode() || modelStates.length < 2) {
      return;
    }

    const nextModelIndex = (activeModelIndex + direction + modelStates.length) % modelStates.length;

    if (nextModelIndex === activeModelIndex) {
      return;
    }

    const currentModelState = modelStates[activeModelIndex];
    const nextModelState = modelStates[nextModelIndex];
    const nextStartOffset = direction > 0 ? slideDistance : -slideDistance;
    const currentEndOffset = direction > 0 ? -slideDistance : slideDistance;
    const fromEnvironmentTime = Number(timeSlider.value);

    isTransitioning = true;
    setModelStateEnabled(nextModelState, true);
    setModelSlideOffset(BABYLON, nextModelState, nextStartOffset);
    updateModelSwitcherVisibility();
    updateProjectOverviewVisibility();
    setStatus(`Switching to ${nextModelState.config.label}...`);

    transitionState = {
      startedAt: performance.now(),
      duration: 900,
      currentModelState,
      nextModelState,
      nextModelIndex,
      nextStartOffset,
      currentEndOffset,
      fromCameraView: captureOrbitCameraView(orbitCamera),
      toCameraView: getOrbitCameraView(BABYLON, getOrbitCameraSettings(nextModelState)),
      fromEnvironmentTime,
      toEnvironmentTime: getOrbitEnvironmentTime(nextModelState, fromEnvironmentTime)
    };
  }

  function updateModelTransition() {
    if (!transitionState) {
      return;
    }

    const elapsed = performance.now() - transitionState.startedAt;
    const progress = Math.min(elapsed / transitionState.duration, 1);
    const eased = easeOutCubic(progress);
    const currentOffset = transitionState.currentEndOffset * eased;
    const nextOffset = transitionState.nextStartOffset * (1 - eased);

    setModelSlideOffset(BABYLON, transitionState.currentModelState, currentOffset);
    setModelSlideOffset(BABYLON, transitionState.nextModelState, nextOffset);
    applyOrbitCameraView(
      BABYLON,
      orbitCamera,
      interpolateOrbitCameraView(BABYLON, transitionState.fromCameraView, transitionState.toCameraView, eased)
    );
    applyOrbitEnvironmentBlend(
      BABYLON,
      sun,
      transitionState.fromEnvironmentTime,
      transitionState.toEnvironmentTime,
      eased
    );

    if (progress < 1) {
      return;
    }

    setModelSlideOffset(BABYLON, transitionState.nextModelState, 0);
    setModelSlideOffset(BABYLON, transitionState.currentModelState, transitionState.currentEndOffset);
    setModelStateEnabled(transitionState.currentModelState, false);

    activeModelIndex = transitionState.nextModelIndex;
    displayedModelState = transitionState.nextModelState;
    controls.setModelState(transitionState.nextModelState);
    applyOrbitCameraStart(BABYLON, orbitCamera, transitionState.nextModelState);
    applyOrbitCameraConstraints(BABYLON, orbitCamera, transitionState.nextModelState);
    applyOrbitEnvironmentSettings(BABYLON, sun, transitionState.nextModelState);
    renderModelDebug(transitionState.nextModelState);
    setStatus(`${transitionState.nextModelState.config.label} orbit view ready. Middle mouse rotates, Shift+middle pans, wheel zooms to cursor. Use Tour Mode to enter walk mode.`);

    transitionState = null;
    isTransitioning = false;
    updateModelSwitcherVisibility();
    updateProjectOverviewVisibility();
  }

  controls = createTourControls(BABYLON, scene, engine, orbitCamera, walkCamera, modelStates[activeModelIndex], {
    tourBgm,
    onModeChange: () => {
      updateModelSwitcherVisibility();
      updateProjectOverviewVisibility();
    },
    onActiveModelStateChange: showActiveModelState
  });
  void controls.preloadCharacter?.().catch((error) => {
    console.warn("Character preload failed", error);
  });
  previousModelButton.addEventListener("click", () => startModelTransition(-1));
  nextModelButton.addEventListener("click", () => startModelTransition(1));
  canvas.focus();

  renderModelDebug(modelStates[activeModelIndex]);
  applyOrbitCameraStart(BABYLON, orbitCamera, modelStates[activeModelIndex]);
  applyOrbitCameraConstraints(BABYLON, orbitCamera, modelStates[activeModelIndex]);
  applyOrbitEnvironmentSettings(BABYLON, sun, modelStates[activeModelIndex]);
  updateModelSwitcherVisibility();
  updateProjectOverviewVisibility();
  initializeOverviewFirebase(MODEL_CONFIGS, updateProjectOverviewVisibility);

  setStatus("Orbit view ready. Middle mouse rotates, Shift+middle pans, wheel zooms to cursor. Use Tour Mode to enter walk mode.");
  setLoadingTargetProgress(LOADING_PROGRESS.sceneReady);

  let hasRenderedFirstFrame = false;

  engine.runRenderLoop(() => {
    updateModelTransition();
    if (!controls.isWalkMode() && !isTransitioning) {
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
