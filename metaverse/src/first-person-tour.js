const MODEL_ROOT = "./assets/models/";
const MODEL_CONFIGS = [
  {
    file: "Glocal_Jinju.glb",
    label: "Glocal Jinju"
  },
  {
    file: "Angji.glb",
    label: "앵지",
    moveSpeedMultiplier: 3,
    tourCamera: {
      position: { x: -46.61, y: 24.44, z: 30.49 },
      target: { x: 0, y: 6.81, z: 0 }
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
const MAX_STEP_UP = 0.32;
const MAX_STEP_DOWN = 0.85;
const MIN_STEP_DOWN = 0.025;
const MIN_STEP_UP = 0.035;
const STEP_PROBE_DISTANCES = [0.12, 0.2, 0.32, 0.45, 0.62];
const STAIR_MATERIAL_KEYWORDS = ["polishedconcreteold"];
const STAIR_NODE_KEYWORDS = ["3dgeom126", "3dgeom292", "3dgeom599", "3dgeom600"];
const FLOOR_MATERIAL_KEYWORDS = ["colorm00", "m00", "colord05", "d05"];
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
const ORBIT_WALL_PADDING = 1.2;
const GROUND_SNAP_TOLERANCE = 0.08;
const MAX_FALL_SPEED = 0.85;
const STEP_SMOOTHING = 0.35;
const STEP_SETTLE_EPSILON = 0.015;
const GROUND_GRACE_MS = 180;
const GROUND_GRACE_VERTICAL_TOLERANCE = 0.18;
const STAIR_GROUND_GRACE_MS = 420;
const STAIR_GROUND_GRACE_VERTICAL_TOLERANCE = 0.38;
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
const DEFAULT_TOUR_CAMERA = {
  position: { x: 65.91, y: 2.12, z: 4.21 },
  target: { x: 56.18, y: 0.24, z: 5.54 }
};

const CONTROLLER_SETTINGS = {
  mouseSensitivity: 0.0022,
  moveSpeed: 0.09,
  runMultiplier: 2.3,
  jumpForce: 0,
  gravity: 0.018,
  maxLookDegrees: 70
};

const canvas = document.getElementById("gameCanvas");
const statusMessage = document.getElementById("statusMessage");
const projectTitle = document.getElementById("projectTitle");
const floorLabel = document.getElementById("floorLabel");
const healthLabel = document.getElementById("healthLabel");
const monsterLabel = document.getElementById("monsterLabel");
const lockPointerButton = document.getElementById("lockPointerButton");
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
    "defaultmaterial8",
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

  if (materialNames.some((name) => passThroughNames.some((keyword) => normalizeName(name).includes(keyword)))) {
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
  camera.wheelPrecision = 20;
  camera.wheelDeltaPercentage = 0.015;
  camera.inertia = 0.65;
  camera.panningInertia = 0.65;
  camera.checkCollisions = false;
  camera.collisionRadius = new BABYLON.Vector3(1, 1, 1);
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  return camera;
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

function getStepPoseAtPosition(BABYLON, scene, position, groundMeshSet, referenceEyeY) {
  const groundHits = getGroundHitsAtPosition(BABYLON, scene, position, groundMeshSet);
  const stepCandidate = groundHits
    .filter((candidate) => isStairSurface(candidate.pickedMesh))
    .map((candidate) => ({
      hit: candidate,
      eyeY: candidate.pickedPoint.y + EYE_HEIGHT,
      verticalDelta: candidate.pickedPoint.y + EYE_HEIGHT - referenceEyeY
    }))
    .filter((candidate) => candidate.verticalDelta >= MIN_STEP_UP && candidate.verticalDelta <= MAX_STEP_UP)
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
    if (!initialCollisionHit || isLowStepCollision(initialCollisionHit)) {
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

    if (stepPose && isLowStepCollision(collisionHit)) {
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

function keepOrbitCameraOutsideWalls(BABYLON, scene, orbitCamera, collisionMeshSet) {
  const target = orbitCamera.target;
  const toCamera = orbitCamera.position.subtract(target);
  const distance = toCamera.length();

  if (distance <= 0) {
    return null;
  }

  const direction = toCamera.scale(1 / distance);
  const rayDistance = Math.max(distance + ORBIT_WALL_PADDING, orbitCamera.upperRadiusLimit || distance);
  const ray = new BABYLON.Ray(target, direction, rayDistance);
  const hit = getRayHits(scene, ray, (mesh) => isRayPickableCollisionMesh(mesh, collisionMeshSet))
    .map(getBlockingBodyHit)
    .find(Boolean);

  if (!hit?.hit || !hit.pickedPoint) {
    return null;
  }

  const minimumDistance = hit.distance + ORBIT_WALL_PADDING;

  if (distance < minimumDistance) {
    orbitCamera.setPosition(target.add(direction.scale(minimumDistance)));
    orbitCamera.radius = Math.max(orbitCamera.radius, minimumDistance);
    return hit;
  }

  return null;
}

function createTourControls(BABYLON, scene, engine, orbitCamera, walkCamera, initialModelState, options = {}) {
  let activeGroundMeshes = initialModelState.walkableGroundMeshes;
  let activeCollisionMeshes = initialModelState.collisionMeshes;
  let groundMeshSet = new Set(activeGroundMeshes);
  let collisionMeshSet = new Set(activeCollisionMeshes);
  let localGroundMeshSet = groundMeshSet;
  let localCollisionMeshSet = collisionMeshSet;
  let lastLocalMeshPosition = null;
  let activeModelState = initialModelState;
  const keys = new Set();
  const inputDiagnostics = createInputDiagnostics();
  let walkMode = false;
  let isGrounded = false;
  let verticalVelocity = 0;
  let stepTargetY = null;
  let stepTargetHit = null;
  let lastStableGroundPose = null;
  let yaw = walkCamera.rotation.y;
  let pitch = walkCamera.rotation.x;
  let currentLabel = "orbit view";

  window.tourControllerSettings = CONTROLLER_SETTINGS;
  window.tourInputDiagnostics = inputDiagnostics;

  function clearMovementKeys() {
    keys.clear();
  }

  function setModelState(nextModelState) {
    activeGroundMeshes = nextModelState.walkableGroundMeshes;
    activeCollisionMeshes = nextModelState.collisionMeshes;
    groundMeshSet = new Set(activeGroundMeshes);
    collisionMeshSet = new Set(activeCollisionMeshes);
    localGroundMeshSet = groundMeshSet;
    localCollisionMeshSet = collisionMeshSet;
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
      `local collision ${localCollisionMeshSet.size}/${collisionMeshSet.size}`,
      `local ground ${localGroundMeshSet.size}/${groundMeshSet.size}`,
      `blocked ${inputDiagnostics.movementBlocked ? "yes" : "no"}`,
      `activeKeys ${Array.from(keys).join(",") || "-"}`
    ].join(" / ");
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
    const tourCamera = activeModelState.config?.tourCamera || DEFAULT_TOUR_CAMERA;
    walkCamera.position.set(tourCamera.position.x, tourCamera.position.y, tourCamera.position.z);
    walkCamera.setTarget(new BABYLON.Vector3(tourCamera.target.x, tourCamera.target.y, tourCamera.target.z));
    yaw = walkCamera.rotation.y;
    pitch = walkCamera.rotation.x;
    verticalVelocity = 0;
    stepTargetY = null;
    stepTargetHit = null;
    lastStableGroundPose = null;
    snapToGround();
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
    clearMovementKeys();
    document.exitPointerLock?.();
    orbitCamera.attachControl(canvas, true);
    scene.activeCamera = orbitCamera;
    floorLabel.textContent = "Orbit View";
    currentLabel = "orbit view";
    setStatus("Orbit view ready. Mouse rotates, wheel zooms. Click to Play starts walk mode.");
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

    if (movementKeys.includes(key)) {
      event.preventDefault();

      if (walkMode) {
        keys.add(key);
      }
    }

    updateInputDebug();
  });

  window.addEventListener("keyup", (event) => {
    const key = getInputKey(event);
    inputDiagnostics.keyUpCount += 1;
    inputDiagnostics.lastKeyUp = `${key || "unknown"} (${event.code || event.key || "?"})`;
    keys.delete(key);
    updateInputDebug();
  });

  document.addEventListener("keyup", (event) => {
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
      const orbitHit = keepOrbitCameraOutsideWalls(BABYLON, scene, orbitCamera, collisionMeshSet);
      inputDiagnostics.lastCollision = orbitHit?.pickedMesh ? `orbit:${orbitHit.pickedMesh.name || orbitHit.pickedMesh.id}` : "-";
      inputDiagnostics.movementBlocked = Boolean(orbitHit);
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

function getSlideDistance(modelStates) {
  const maxWidth = Math.max(...modelStates.map((state) => state.model.focusBounds.size.x || state.model.bounds.size.x || 1));
  return Math.max(maxWidth * 1.35, 80);
}

function renderModelDebug(modelState) {
  const { config, meshes, model, collisionMeshes, walkableGroundMeshes, stairSurfaceMeshes, floorSurfaceMeshes } = modelState;

  modelStatus.textContent = `Loaded ${config.label}`;
  modelSource.textContent = `${MODEL_ROOT}${config.file}`;
  modelStats.textContent = `${meshes.length} meshes / collision ${collisionMeshes.length} / walkable ${walkableGroundMeshes.length} / stairSurfaces ${stairSurfaceMeshes.length} / floorSurfaces ${floorSurfaceMeshes.length} / humanPassThrough ${modelState.humanPassThroughCount} / collisionFallback ${modelState.usedCollisionFallback ? "yes" : "no"} / scale ${model.scale.toExponential(3)} / full ${boundsToText(model.bounds)} / focus ${boundsToText(model.focusBounds)} / ${model.tourStartNode ? "Tour_Start found" : "Tour_Start not found"}`;
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
  const meshes = getGeometryMeshes(result.meshes);
  const model = normalizeModel(BABYLON, scene, result, meshes);

  model.root.name = `tour-building-root-${normalizeName(config.label)}`;

  let humanPassThroughCount = 0;

  meshes.forEach((mesh) => {
    getCachedMeshBounds(BABYLON, mesh);

    const passThrough = isNonCollisionProp(mesh);

    if (passThrough) {
      humanPassThroughCount += 1;
    }

    mesh.isPickable = !passThrough;
    mesh.checkCollisions = passThrough ? false : ENABLE_MODEL_COLLISIONS;
    mesh.metadata = { ...(mesh.metadata || {}), passThrough };
  });

  scene.materials.forEach((material) => {
    material.backFaceCulling = false;
  });
  hideTourStartMarker(model.tourStartNode, meshes);

  if (booleanParam("clay", CLAY_PREVIEW)) {
    applyClayPreviewMaterial(BABYLON, scene, meshes);
  }

  let usedCollisionFallback = false;
  let collisionMeshes = meshes.filter((mesh) => !isDescendantOf(mesh, model.tourStartNode) && !mesh.metadata?.passThrough);

  if (collisionMeshes.length === 0) {
    usedCollisionFallback = true;
    collisionMeshes = meshes.filter((mesh) => !isDescendantOf(mesh, model.tourStartNode));
    collisionMeshes.forEach((mesh) => {
      mesh.metadata = { ...(mesh.metadata || {}), passThrough: false, collisionFallback: true };
      mesh.isPickable = true;
    });
  }

  const stairSurfaceMeshes = meshes.filter((mesh) => !isDescendantOf(mesh, model.tourStartNode) && isStairSurface(mesh));
  const floorSurfaceMeshes = meshes.filter((mesh) => !isDescendantOf(mesh, model.tourStartNode) && isFloorSurface(mesh));

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
    floorSurfaceMeshes
  };
}

async function start() {
  const BABYLON = window.BABYLON;
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.62, 0.72, 0.86, 1);
  scene.collisionsEnabled = true;

  const ambient = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
  ambient.intensity = 0.72;
  ambient.groundColor = new BABYLON.Color3(0.48, 0.45, 0.4);

  const sun = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.45, -0.9, 0.25), scene);
  sun.position = new BABYLON.Vector3(80, 120, -60);
  sun.intensity = 1.8;
  sun.diffuse = new BABYLON.Color3(1, 0.94, 0.82);
  sun.specular = new BABYLON.Color3(1, 0.9, 0.75);

  const cameraFillLight = new BABYLON.DirectionalLight("cameraFillLight", new BABYLON.Vector3(0, -0.35, 1), scene);
  cameraFillLight.intensity = 1.35;
  cameraFillLight.diffuse = new BABYLON.Color3(1, 0.96, 0.86);
  cameraFillLight.specular = new BABYLON.Color3(0.24, 0.22, 0.18);

  const modelStates = await Promise.all(MODEL_CONFIGS.map((config) => loadTourModelState(BABYLON, scene, config)));
  const slideDistance = getSlideDistance(modelStates);
  let activeModelIndex = 0;
  let transitionState = null;
  let isTransitioning = false;

  modelStates.forEach((modelState, index) => {
    setModelSlideOffset(BABYLON, modelState, index === activeModelIndex ? 0 : slideDistance);
    setModelStateEnabled(modelState, index === activeModelIndex);
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
    controls.setModelState(transitionState.nextModelState);
    renderModelDebug(transitionState.nextModelState);
    setStatus(`${transitionState.nextModelState.config.label} orbit view ready. Mouse rotates, wheel zooms. Click to Play starts walk mode.`);

    transitionState = null;
    isTransitioning = false;
    updateModelSwitcherVisibility();
  }

  controls = createTourControls(BABYLON, scene, engine, orbitCamera, walkCamera, modelStates[activeModelIndex], {
    onModeChange: updateModelSwitcherVisibility
  });
  previousModelButton.addEventListener("click", () => startModelTransition(-1));
  nextModelButton.addEventListener("click", () => startModelTransition(1));
  canvas.focus();

  renderModelDebug(modelStates[activeModelIndex]);
  updateModelSwitcherVisibility();

  setStatus("Orbit view ready. Mouse rotates, wheel zooms. Click to Play starts walk mode.");

  engine.runRenderLoop(() => {
    updateModelTransition();
    const activeCamera = scene.activeCamera || orbitCamera;
    const viewDirection = activeCamera.getForwardRay?.().direction || activeCamera.getDirection(BABYLON.Axis.Z);
    cameraFillLight.direction = viewDirection.scale(-1).add(new BABYLON.Vector3(0, -0.35, 0)).normalize();
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
