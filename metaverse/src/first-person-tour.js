import { FIREBASE_CONFIG, OVERVIEW_ADMIN_PASSCODE } from "./firebase-config.js";

const MODEL_ROOT = "./assets/models/";
const DEFAULT_MODEL_FILE = "Angji.glb";
const MODEL_CONFIGS = [
  {
    file: "Jinju.glb",
    label: "Glocal Jinju"
  },
  {
    file: "Angji.glb",
    tourFile: "Angji_tour.glb",
    label: "앵지",
    overviewId: "angji",
    moveSpeedMultiplier: 3,
    orbitCamera: {
      position: { x: -105.81, y: 53.81, z: 49.34 },
      target: { x: 1.52, y: 7.40, z: 4.64 },
      upperBetaDegrees: 82,
      minTargetY: 6.81,
      zoomOutMultiplier: 3
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
    label: "충주",
    orbitCamera: {
      position: { x: 76.28, y: 45.34, z: 89.47 },
      target: { x: 10.34, y: 12.58, z: 28.13 }
    },
    tourCamera: {
      position: { x: 44.89, y: 18.09, z: 35.64 },
      target: { x: 3.82, y: 5.71, z: -3.36 }
    }
  },
  {
    file: "Geochang.glb",
    label: "거창",
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
const EYE_HEIGHT = 1.7;
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
const TOUR_RESET_HORIZONTAL_MARGIN_RATIO = 0.08;
const TOUR_RESET_MIN_HORIZONTAL_MARGIN = 30;
const TOUR_RESET_FALL_DISTANCE = 8;
const TOUR_RESET_FADE_MS = 450;
const MAX_STEP_UP = 0.32;
const MAX_STAIR_STEP_UP = 0.48;
const MAX_STEP_DOWN = 0.85;
const MIN_STEP_DOWN = 0.025;
const MIN_STEP_UP = 0.035;
const STEP_PROBE_DISTANCES = [0.12, 0.2, 0.32, 0.45, 0.62];
const STAIR_MATERIAL_KEYWORDS = ["polishedconcreteold", "stone01", "stair01", "stair02"];
const STAIR_NODE_KEYWORDS = ["3dgeom126", "3dgeom292", "3dgeom599", "3dgeom600", "stair01", "stair02"];
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
  "woodfloor"
];
const PASS_THROUGH_MATERIAL_KEYWORDS = ["defaultmaterial8", "people"];
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
const GROUND_SNAP_TOLERANCE = 0.08;
const MAX_FALL_SPEED = 0.85;
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

const CONTROLLER_SETTINGS = {
  mouseSensitivity: 0.0022,
  moveSpeed: 0.09,
  runMultiplier: 2.3,
  jumpForce: 0,
  gravity: 0.018,
  maxLookDegrees: 70
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

const canvas = document.getElementById("gameCanvas");
const statusMessage = document.getElementById("statusMessage");
const projectTitle = document.getElementById("projectTitle");
const floorLabel = document.getElementById("floorLabel");
const healthLabel = document.getElementById("healthLabel");
const monsterLabel = document.getElementById("monsterLabel");
const lockPointerButton = document.getElementById("lockPointerButton");
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

canvas.tabIndex = 0;

projectTitle.textContent = "First Person Architecture Tour";
floorLabel.textContent = "Orbit View";
healthLabel.textContent = "Human scale";
monsterLabel.textContent = "Object collision";
statusMessage.textContent = `Loading ${MODEL_CONFIGS.map((model) => model.file).join(", ")}...`;

debugToggleButton.addEventListener("click", () => {
  debugPanel.hidden = !debugPanel.hidden;
});

copyDebugButton.addEventListener("click", async () => {
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
        const unsubscribe = firestoreModule.onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            projectOverviewStore.set(overviewId, normalizeOverview(snapshot.data()));
            onChange?.();
          }
        });
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

function isNonWalkableObject(node) {
  const nonWalkableNames = [
    "car",
    "vehicle",
    "auto",
    "tree",
    "trunk",
    "plant",
    "bush",
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

function hasMaterialKeyword(mesh, keywords) {
  return getMaterialNames(mesh).some((name) => {
    const normalizedName = normalizeName(name);
    return keywords.some((keyword) => normalizedName.includes(keyword));
  });
}

function isStairSurface(mesh) {
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
  return isStairSurface(mesh) || isFloorSurface(mesh);
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
    KeyG: "g",
    KeyR: "r",
    KeyF: "f",
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

  const normal = hit.getNormal?.(true);

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

function findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet) {
  const moveDistance = movement.length();

  if (moveDistance <= 0) {
    return null;
  }

  const direction = movement.normalizeToNew();

  for (const distance of STEP_PROBE_DISTANCES) {
    const probeDistance = Math.max(distance, moveDistance);
    const probePosition = previousPosition.add(direction.scale(probeDistance));
    const stepPose = getStepPoseAtPosition(BABYLON, scene, probePosition, groundMeshSet, previousPosition.y);

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
  const initialCollisionHit = findBodyCollision(BABYLON, scene, previousPosition, movement, collisionMeshSet, modelBounds);
  const leadingStepPose = canStepUp ? findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet) : null;

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
    if (initialCollisionHit) {
      return {
        moved: false,
        reason: `wall:${initialCollisionHit.pickedMesh?.name || initialCollisionHit.pickedMesh?.id || "too high"}`,
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
    const stepPose = canStepUp ? findStepUpPose(BABYLON, scene, previousPosition, movement, groundMeshSet) : null;

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

function createTourControls(BABYLON, scene, engine, orbitCamera, walkCamera, initialModelState, options = {}) {
  let activeGroundMeshes = initialModelState.walkableGroundMeshes;
  let activeCollisionMeshes = initialModelState.collisionMeshes;
  let groundMeshSet = new Set(activeGroundMeshes);
  let collisionMeshSet = new Set(activeCollisionMeshes);
  let localGroundMeshSet = groundMeshSet;
  let localCollisionMeshSet = collisionMeshSet;
  let projectileHitMeshSet = new Set(initialModelState.projectileHitMeshes);
  let lastLocalMeshPosition = null;
  let activeModelState = initialModelState;
  const keys = new Set();
  const fireballs = [];
  const inputDiagnostics = createInputDiagnostics();
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

  window.tourControllerSettings = CONTROLLER_SETTINGS;
  window.tourInputDiagnostics = inputDiagnostics;

  function clearMovementKeys() {
    keys.clear();
  }

  function clearFireballs() {
    while (fireballs.length > 0) {
      disposeFireballProjectile(fireballs.pop());
    }
  }

  function setModelState(nextModelState) {
    clearFireballs();
    activeGroundMeshes = nextModelState.walkableGroundMeshes;
    activeCollisionMeshes = nextModelState.collisionMeshes;
    groundMeshSet = new Set(activeGroundMeshes);
    collisionMeshSet = new Set(activeCollisionMeshes);
    localGroundMeshSet = groundMeshSet;
    localCollisionMeshSet = collisionMeshSet;
    projectileHitMeshSet = new Set(nextModelState.projectileHitMeshes);
    lastLocalMeshPosition = null;
    activeModelState = nextModelState;
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

    if (
      !force
      && lastLocalMeshPosition
      && BABYLON.Vector3.DistanceSquared(walkCamera.position, lastLocalMeshPosition) < LOCAL_MESH_UPDATE_DISTANCE * LOCAL_MESH_UPDATE_DISTANCE
    ) {
      return;
    }

    lastLocalMeshPosition = walkCamera.position.clone();
    const nearbyCollisionMeshes = getMeshesNearPosition(BABYLON, activeCollisionMeshes, walkCamera.position, LOCAL_COLLISION_RADIUS);
    const nearbyGroundMeshes = getMeshesNearPosition(BABYLON, activeGroundMeshes, walkCamera.position, LOCAL_GROUND_RADIUS);

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

    fireballs.push(createFireballProjectile(BABYLON, scene, walkCamera));
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

  function resetWalkCameraToTourStart() {
    clearFireballs();
    const tourCamera = getActiveTourCameraConfig();
    walkCamera.position.set(tourCamera.position.x, tourCamera.position.y, tourCamera.position.z);
    walkCamera.setTarget(new BABYLON.Vector3(tourCamera.target.x, tourCamera.target.y, tourCamera.target.z));
    yaw = walkCamera.rotation.y;
    pitch = walkCamera.rotation.x;
    verticalVelocity = 0;
    stepTargetY = null;
    stepTargetHit = null;
    lastStableGroundPose = null;
    lastLocalMeshPosition = null;
    refreshLocalMeshSets(true);
    snapToGround();
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

  function snapToGround() {
    refreshLocalMeshSets(true);
    const hit = findGroundHit(BABYLON, scene, walkCamera.position, localGroundMeshSet);

    if (!hit?.pickedPoint) {
      isGrounded = false;
      return;
    }

    const nextY = hit.pickedPoint.y + EYE_HEIGHT;

    if (nextY <= walkCamera.position.y + 0.6) {
      walkCamera.position.y = nextY;
      isGrounded = true;
      rememberStableGround(hit, nextY);
    }
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

  function applyGravity(deltaScale) {
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
      return;
    }

    const groundPose = getLandingGroundPoseAtPosition(BABYLON, scene, walkCamera.position, localGroundMeshSet, walkCamera.position.y);

    if (groundPose) {
      const distanceToGround = walkCamera.position.y - groundPose.eyeY;

      if (distanceToGround <= GROUND_SNAP_TOLERANCE && distanceToGround >= -MAX_STEP_UP) {
        walkCamera.position.y = groundPose.eyeY;
        verticalVelocity = 0;
        isGrounded = true;
        rememberStableGround(groundPose.hit, groundPose.eyeY);
        inputDiagnostics.lastGround = getSurfaceDebugName(groundPose.hit);
        return;
      }

      if (distanceToGround < -GROUND_SNAP_TOLERANCE && Math.abs(distanceToGround) <= MAX_STEP_UP) {
        walkCamera.position.y = groundPose.eyeY;
        verticalVelocity = 0;
        isGrounded = true;
        rememberStableGround(groundPose.hit, groundPose.eyeY);
        inputDiagnostics.lastGround = getSurfaceDebugName(groundPose.hit);
        return;
      }
    }

    if (trySnapToStairWhileStanding()) {
      return;
    }

    if (tryUseGroundGrace()) {
      return;
    }

    const previousY = walkCamera.position.y;
    verticalVelocity = Math.max(verticalVelocity - CONTROLLER_SETTINGS.gravity * deltaScale, -MAX_FALL_SPEED);
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
  }

  function updateDebug() {
    const activeCamera = scene.activeCamera || orbitCamera;
    const activeTarget = activeCamera === walkCamera
      ? walkCamera.position.add(getForward().scale(10))
      : (orbitCamera.target || BABYLON.Vector3.Zero());

    playerDebug.textContent = [
      `active ${activeCamera.name}`,
      `activePos ${vectorToText(activeCamera.position)}`,
      `activeTarget ${vectorToText(activeTarget)}`,
      `orbitPos ${vectorToText(orbitCamera.position)}`,
      `orbitTarget ${vectorToText(orbitCamera.target)}`,
      `walkPos ${vectorToText(walkCamera.position)}`,
      `walkTarget ${vectorToText(walkCamera.position.add(getForward().scale(10)))}`,
      `yaw ${yaw.toFixed(2)}`,
      `pitch ${pitch.toFixed(2)}`,
      `vy ${verticalVelocity.toFixed(3)}`,
      `stepTarget ${typeof stepTargetY === "number" ? stepTargetY.toFixed(2) : "-"}`,
      `keys ${Array.from(keys).join(",") || "-"}`,
      isGrounded ? "grounded" : "air",
      currentLabel
    ].join(" / ");
    updateInputDebug();
  }

  function enterWalkMode(shouldLockPointer = false) {
    orbitCamera.detachControl(canvas);
    clearMovementKeys();
    canvas.focus();
    scene.activeCamera = walkCamera;
    activateModelState(activeModelState.tourModelState || activeModelState, "walk");
    isResettingTour = false;
    tourResetFade?.classList.remove("is-active");
    resetWalkCameraToTourStart();
    walkMode = true;
    options.onModeChange?.("walk");
    currentLabel = "fixed tour start";

    if (shouldLockPointer) {
      requestPointerLockSafe();
    }

    floorLabel.textContent = "Walk Mode";
    setStatus("Walk mode active. WASD moves, Shift runs, gravity is enabled, stairs can be climbed.");
    updateDebug();
  }

  function enterOrbitMode() {
    walkMode = false;
    clearFireballs();
    clearMovementKeys();
    document.exitPointerLock?.();
    activateModelState(activeModelState.orbitModelState || activeModelState, "orbit");
    orbitCamera.attachControl(canvas, false);
    scene.activeCamera = orbitCamera;
    floorLabel.textContent = "Orbit View";
    currentLabel = "orbit view";
    setStatus("Orbit view ready. Middle mouse rotates, Shift+middle pans, wheel zooms to cursor. Click to Play starts walk mode.");
    options.onModeChange?.("orbit");
    updateDebug();
  }

  lockPointerButton.addEventListener("click", () => {
    enterWalkMode(true);
  });

  canvas.addEventListener("click", () => {
    if (walkMode) {
      requestPointerLockSafe();
    }
  });

  window.addEventListener("mousemove", (event) => {
    inputDiagnostics.mouseMoveCount += 1;
    inputDiagnostics.lastMouseMove = walkMode ? "walk" : "orbit";
    inputDiagnostics.lastMouseDelta = `x ${event.movementX || 0}, y ${event.movementY || 0}`;

    if (!walkMode || document.pointerLockElement !== canvas) {
      updateInputDebug();
      return;
    }

    const maxPitch = BABYLON.Tools.ToRadians(CONTROLLER_SETTINGS.maxLookDegrees);
    yaw += event.movementX * CONTROLLER_SETTINGS.mouseSensitivity;
    pitch += event.movementY * CONTROLLER_SETTINGS.mouseSensitivity;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
    walkCamera.rotation.set(pitch, yaw, 0);
    updateInputDebug();
  });

  window.addEventListener("keydown", (event) => {
    if (isOverviewAdminEditing(event)) {
      clearMovementKeys();
      return;
    }

    const key = getInputKey(event);
    const inputCode = event.code || event.key || "?";
    const movementKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", " "];

    inputDiagnostics.keyDownCount += 1;
    inputDiagnostics.lastKeyDown = `${key || "unknown"} (${inputCode})`;

    if (key === "f" && !event.repeat) {
      enterOrbitMode();
    }

    if (key === "r" && !event.repeat) {
      enterWalkMode(document.pointerLockElement === canvas);
    }

    if (key === "e" && !event.repeat) {
      event.preventDefault();
      tryShootFireball();
    }

    if (movementKeys.includes(key)) {
      event.preventDefault();

      if (walkMode) {
        keys.add(key);
      }
    }

    updateInputDebug();
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

  document.addEventListener("keyup", (event) => {
    if (isOverviewAdminEditing(event)) {
      clearMovementKeys();
      return;
    }

    const key = getInputKey(event);
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

    if (document.pointerLockElement !== canvas) clearMovementKeys();

    updateInputDebug();
  });

  scene.onBeforeRenderObservable.add(() => {
    if (!walkMode) {
      inputDiagnostics.lastCollision = "-";
      inputDiagnostics.movementBlocked = false;
      updateDebug();
      return;
    }

    if (isResettingTour) {
      updateDebug();
      return;
    }

    const deltaScale = Math.min(engine.getDeltaTime() / 16.6667, 2);
    refreshLocalMeshSets();
    const modelSpeedMultiplier = activeModelState.config?.moveSpeedMultiplier || 1;
    const speed = CONTROLLER_SETTINGS.moveSpeed * modelSpeedMultiplier * (keys.has("shift") ? CONTROLLER_SETTINGS.runMultiplier : 1) * deltaScale;
    const axes = getFlatAxes();
    const movement = BABYLON.Vector3.Zero();

    if (keys.has("w") || keys.has("arrowup")) movement.addInPlace(axes.forward);
    if (keys.has("s") || keys.has("arrowdown")) movement.subtractInPlace(axes.forward);
    if (keys.has("d") || keys.has("arrowright")) movement.addInPlace(axes.right);
    if (keys.has("a") || keys.has("arrowleft")) movement.subtractInPlace(axes.right);

    if (movement.lengthSquared() > 0) {
      movement.normalize().scaleInPlace(speed);
      inputDiagnostics.lastMoveCommand = Array.from(keys).join(",") || "-";
      const moveResult = tryMoveWithCollision(BABYLON, scene, walkCamera, movement, localCollisionMeshSet, activeModelState.model.bounds, localGroundMeshSet, {
        allowStepUp: typeof stepTargetY !== "number"
      });

      if (typeof moveResult.stepTargetY === "number" && typeof stepTargetY !== "number") {
        const targetDelta = moveResult.stepTargetY - walkCamera.position.y;

        if (targetDelta >= MIN_STEP_UP && targetDelta <= MAX_STEP_UP) {
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
    } else {
      inputDiagnostics.lastMoveCommand = "-";
      inputDiagnostics.lastCollision = "-";
      inputDiagnostics.movementBlocked = false;
    }

    applyGravity(deltaScale);
    updateFireballs(deltaScale);

    if (isWalkCameraOutsideTourBounds()) {
      resetTourWithFade("out of bounds");
    }

    updateDebug();
  });

  updateDebug();

  return { enterWalkMode, enterOrbitMode, setModelState, isWalkMode: () => walkMode };
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

function applyOrbitCameraStart(BABYLON, orbitCamera, modelState) {
  const orbitSettings = modelState.config?.orbitCamera;

  if (!orbitSettings?.position || !orbitSettings?.target) {
    return;
  }

  const position = new BABYLON.Vector3(orbitSettings.position.x, orbitSettings.position.y, orbitSettings.position.z);
  const target = new BABYLON.Vector3(orbitSettings.target.x, orbitSettings.target.y, orbitSettings.target.z);
  const distance = BABYLON.Vector3.Distance(position, target);

  orbitCamera.target.copyFrom(target);
  orbitCamera.setPosition(position);
  orbitCamera.radius = distance;
  orbitCamera.maxZ = Math.max(10000, distance * 8);
  orbitCamera.upperRadiusLimit = distance * (orbitSettings.zoomOutMultiplier || 1);
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
  modelStats.textContent = `${meshes.length} meshes / collision ${collisionMeshes.length} / walkable ${walkableGroundMeshes.length} / stairSurfaces ${stairSurfaceMeshes.length} / floorSurfaces ${floorSurfaceMeshes.length} / peopleTargets ${peopleTargetMeshes.length} / humanPassThrough ${modelState.humanPassThroughCount} / collisionFallback ${modelState.usedCollisionFallback ? "yes" : "no"} / scale ${model.scale.toExponential(3)} / full ${boundsToText(model.bounds)} / focus ${boundsToText(model.focusBounds)} / ${model.tourStartNode ? "Tour_Start found" : "Tour_Start not found"}`;
  meshList.replaceChildren(
    ...meshes.slice(0, 50).map((mesh) => {
      const item = document.createElement("li");
      item.textContent = mesh.name || mesh.id || "(unnamed mesh)";
      return item;
    })
  );
}

async function loadTourModelState(BABYLON, scene, config) {
  const fileName = `${config.file}?v=${Date.now()}`;
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", MODEL_ROOT, fileName, scene);
  let meshes = getGeometryMeshes(result.meshes);
  const model = normalizeModel(BABYLON, scene, result, meshes);

  model.root.name = `tour-building-root-${normalizeName(config.label)}`;
  meshes = [...meshes, ...splitPeopleTargetMeshes(BABYLON, scene, meshes)];

  let humanPassThroughCount = 0;
  const peopleTargetMeshes = [];

  meshes.forEach((mesh) => {
    getCachedMeshBounds(BABYLON, mesh);

    const passThrough = isNonCollisionProp(mesh);
    const peopleTarget = isPeopleFireballTarget(mesh);

    if (passThrough) {
      humanPassThroughCount += 1;
    }

    if (peopleTarget && mesh.isEnabled()) {
      peopleTargetMeshes.push(mesh);
    }

    mesh.isPickable = mesh.isEnabled() && (passThrough ? peopleTarget : true);
    mesh.checkCollisions = passThrough ? false : ENABLE_MODEL_COLLISIONS;
    mesh.metadata = { ...(mesh.metadata || {}), passThrough, peopleTarget };
  });

  scene.materials.forEach((material) => {
    material.backFaceCulling = false;
  });
  hideTourStartMarker(model.tourStartNode, meshes);

  if (booleanParam("clay", CLAY_PREVIEW)) {
    applyClayPreviewMaterial(BABYLON, scene, meshes);
  }

  let usedCollisionFallback = false;
  let collisionMeshes = meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && !mesh.metadata?.passThrough);

  if (collisionMeshes.length === 0) {
    usedCollisionFallback = true;
    collisionMeshes = meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode));
    collisionMeshes.forEach((mesh) => {
      mesh.metadata = { ...(mesh.metadata || {}), passThrough: false, collisionFallback: true };
      mesh.isPickable = true;
    });
  }

  const stairSurfaceMeshes = meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && isStairSurface(mesh));
  const floorSurfaceMeshes = meshes.filter((mesh) => mesh.isEnabled() && !isDescendantOf(mesh, model.tourStartNode) && isFloorSurface(mesh));

  [...stairSurfaceMeshes, ...floorSurfaceMeshes].forEach((mesh) => {
    mesh.metadata = { ...(mesh.metadata || {}), passThrough: false, groundSurface: true };
    mesh.isPickable = true;
  });

  const collisionMeshMap = new Map(collisionMeshes.map((mesh) => [mesh.uniqueId, mesh]));
  stairSurfaceMeshes.forEach((mesh) => collisionMeshMap.set(mesh.uniqueId, mesh));
  floorSurfaceMeshes.forEach((mesh) => collisionMeshMap.set(mesh.uniqueId, mesh));
  collisionMeshes = Array.from(collisionMeshMap.values());

  const groundMeshMap = new Map();

  collisionMeshes
    .filter((mesh) => !isNonWalkableObject(mesh))
    .forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
  stairSurfaceMeshes.forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));
  floorSurfaceMeshes.forEach((mesh) => groundMeshMap.set(mesh.uniqueId, mesh));

  return {
    config,
    result,
    meshes,
    model,
    baseRootPosition: model.root.position.clone(),
    humanPassThroughCount,
    usedCollisionFallback,
    collisionMeshes,
    walkableGroundMeshes: Array.from(groundMeshMap.values()),
    stairSurfaceMeshes,
    floorSurfaceMeshes,
    peopleTargetMeshes,
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
  sun.specular = new BABYLON.Color3(1, 0.9, 0.75);
  setupSunControls(BABYLON, sun);
  await loadDefaultProjectOverviews();
  loadLocalOverviewOverrides();
  const modelStates = await Promise.all(MODEL_CONFIGS.map(async (config) => {
    const orbitModelState = await loadTourModelState(BABYLON, scene, config);

    if (!config.tourFile) {
      return orbitModelState;
    }

    const tourModelState = await loadTourModelState(BABYLON, scene, {
      ...config,
      file: config.tourFile,
      label: `${config.label} 투어`,
      isTourVariant: true
    });
    orbitModelState.tourModelState = tourModelState;
    tourModelState.orbitModelState = orbitModelState;

    return orbitModelState;
  }));
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
    applyOrbitCameraStart(BABYLON, orbitCamera, nextModelState.orbitModelState || nextModelState);
    applyOrbitCameraConstraints(BABYLON, orbitCamera, nextModelState.orbitModelState || nextModelState);
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
      currentEndOffset
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
    renderModelDebug(transitionState.nextModelState);
    setStatus(`${transitionState.nextModelState.config.label} orbit view ready. Middle mouse rotates, Shift+middle pans, wheel zooms to cursor. Click to Play starts walk mode.`);

    transitionState = null;
    isTransitioning = false;
    updateModelSwitcherVisibility();
    updateProjectOverviewVisibility();
  }

  controls = createTourControls(BABYLON, scene, engine, orbitCamera, walkCamera, modelStates[activeModelIndex], {
    onModeChange: () => {
      updateModelSwitcherVisibility();
      updateProjectOverviewVisibility();
    },
    onActiveModelStateChange: showActiveModelState
  });
  previousModelButton.addEventListener("click", () => startModelTransition(-1));
  nextModelButton.addEventListener("click", () => startModelTransition(1));
  canvas.focus();

  renderModelDebug(modelStates[activeModelIndex]);
  applyOrbitCameraStart(BABYLON, orbitCamera, modelStates[activeModelIndex]);
  applyOrbitCameraConstraints(BABYLON, orbitCamera, modelStates[activeModelIndex]);
  updateModelSwitcherVisibility();
  updateProjectOverviewVisibility();
  initializeOverviewFirebase(MODEL_CONFIGS, updateProjectOverviewVisibility);

  setStatus("Orbit view ready. Middle mouse rotates, Shift+middle pans, wheel zooms to cursor. Click to Play starts walk mode.");

  engine.runRenderLoop(() => {
    updateModelTransition();
    if (!controls.isWalkMode()) {
      applyOrbitCameraConstraints(BABYLON, orbitCamera, modelStates[activeModelIndex]);
    }
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

start().catch((error) => {
  console.error(error);
  modelStatus.textContent = "Error";
  modelStats.textContent = error.message || String(error);
  setStatus("Failed to start first-person tour.");
  debugPanel.hidden = false;
});
