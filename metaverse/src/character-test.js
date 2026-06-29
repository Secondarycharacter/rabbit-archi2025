import { createTpsSystem } from "./controllers/createTpsSystem.js?v=tps-tour-test-sync-20260629";
import {
  ANGJI_GROUND_Y,
  ANGJI_MOVE_SPEED_MULTIPLIER,
  ANGJI_TOUR_CAMERA,
  CONTROLLER_SETTINGS,
  EYE_HEIGHT,
  GROUND_SNAP_TOLERANCE,
  MAX_FALL_SPEED,
  createAngjiTpsOptions
} from "./angji-character-config.js?v=tps-tour-test-sync-20260629";
import { bindCharacterTpsKeyboard } from "./character-tps-bindings.js?v=tps-tour-test-sync-20260629";
import { isLocalDevEnvironment } from "./local-dev.js?v=local-dev-20260629";

if (!isLocalDevEnvironment()) {
  window.location.replace("./index.html");
}

const BABYLON = window.BABYLON;

const ARENA_HALF = 30;

const canvas = document.getElementById("gameCanvas");
const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");
const statusLine = document.getElementById("statusLine");
const locomotionStateEl = document.getElementById("locomotionState");
const activeActionEl = document.getElementById("activeAction");
const groundStateEl = document.getElementById("groundState");
const activeKeysEl = document.getElementById("activeKeys");
const availableClipsEl = document.getElementById("availableClips");

const keys = new Set();
let walkMode = false;
let isGrounded = true;
let verticalVelocity = 0;
let pendingMouseDeltaX = 0;
let pendingMouseDeltaY = 0;
let pendingWheelDelta = 0;

function createWalkCamera(scene) {
  const camera = new BABYLON.UniversalCamera(
    "walkCamera",
    new BABYLON.Vector3(
      ANGJI_TOUR_CAMERA.position.x,
      ANGJI_TOUR_CAMERA.position.y,
      ANGJI_TOUR_CAMERA.position.z
    ),
    scene
  );

  camera.minZ = 0.03;
  camera.maxZ = 10000;
  camera.fov = BABYLON.Tools.ToRadians(72);
  camera.applyGravity = false;
  camera.checkCollisions = false;
  camera.inputs.clear();
  camera.setTarget(new BABYLON.Vector3(
    ANGJI_TOUR_CAMERA.target.x,
    ANGJI_TOUR_CAMERA.target.y,
    ANGJI_TOUR_CAMERA.target.z
  ));

  return camera;
}

function createTpsCamera(scene, sourceCamera) {
  const camera = new BABYLON.UniversalCamera("tpsCamera", sourceCamera.position.clone(), scene);
  camera.minZ = 0.03;
  camera.maxZ = 10000;
  camera.fov = BABYLON.Tools.ToRadians(72);
  camera.inputs.clear();
  return camera;
}

function createTestArena(scene) {
  scene.clearColor = new BABYLON.Color4(0.55, 0.72, 0.82, 1);

  const light = new BABYLON.HemisphericLight("sun", new BABYLON.Vector3(0.4, 1, 0.2), scene);
  light.intensity = 1.05;
  light.groundColor = new BABYLON.Color3(0.35, 0.38, 0.42);

  const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.62, 0.66, 0.7);
  groundMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

  const rampMaterial = new BABYLON.StandardMaterial("rampMat", scene);
  rampMaterial.diffuseColor = new BABYLON.Color3(0.56, 0.6, 0.66);

  const stairMaterial = new BABYLON.StandardMaterial("stairMat", scene);
  stairMaterial.diffuseColor = new BABYLON.Color3(0.52, 0.55, 0.6);

  const ground = BABYLON.MeshBuilder.CreateGround("testGround", {
    width: ARENA_HALF * 2,
    height: ARENA_HALF * 2,
    subdivisions: 2
  }, scene);
  ground.position.y = ANGJI_GROUND_Y;
  ground.receiveShadows = true;
  ground.isPickable = true;
  ground.material = groundMaterial;

  const grid = BABYLON.MeshBuilder.CreateGround("testGrid", {
    width: ARENA_HALF * 2,
    height: ARENA_HALF * 2,
    subdivisions: 24
  }, scene);
  grid.position.y = ANGJI_GROUND_Y + 0.02;
  grid.isPickable = false;

  const gridMaterial = new BABYLON.StandardMaterial("gridMat", scene);
  gridMaterial.wireframe = true;
  gridMaterial.emissiveColor = new BABYLON.Color3(0.18, 0.22, 0.28);
  gridMaterial.alpha = 0.35;
  grid.material = gridMaterial;

  const ramp = BABYLON.MeshBuilder.CreateBox("testRamp", {
    width: 5,
    height: 0.25,
    depth: 12
  }, scene);
  ramp.rotation.x = BABYLON.Tools.ToRadians(-14);
  ramp.position.set(-14, ANGJI_GROUND_Y + 1.35, -6);
  ramp.isPickable = true;
  ramp.material = rampMaterial;

  const stairRise = 0.15;
  const stairDepth = 0.38;
  const stairWidth = 3.2;
  const stairOriginX = 10;
  const stairOriginZ = 4;
  const stairs = [];

  for (let i = 0; i < 5; i += 1) {
    const step = BABYLON.MeshBuilder.CreateBox(`testStair${i}`, {
      width: stairWidth,
      height: stairRise,
      depth: stairDepth
    }, scene);
    step.position.set(
      stairOriginX,
      ANGJI_GROUND_Y + stairRise * (i + 0.5),
      stairOriginZ + i * stairDepth
    );
    step.isPickable = true;
    step.material = stairMaterial;
    stairs.push(step);
  }

  const markerMaterial = new BABYLON.StandardMaterial("markerMat", scene);
  markerMaterial.emissiveColor = new BABYLON.Color3(0.9, 0.35, 0.25);

  const centerMarker = BABYLON.MeshBuilder.CreateBox("centerMarker", { size: 0.4 }, scene);
  centerMarker.position.set(0, ANGJI_GROUND_Y + 0.2, 0);
  centerMarker.isPickable = false;
  centerMarker.material = markerMaterial;

  const rampMarker = BABYLON.MeshBuilder.CreateBox("rampMarker", { size: 0.35 }, scene);
  rampMarker.position.set(-14, ANGJI_GROUND_Y + 0.25, -12);
  rampMarker.isPickable = false;
  rampMarker.material = markerMaterial;

  const groundMeshSet = new Set([ground, ramp, ...stairs]);

  return { ground, ramp, stairs, groundMeshSet };
}

function getGroundEyeY(scene, position, groundMeshSet) {
  const rayOrigin = new BABYLON.Vector3(position.x, position.y + 40, position.z);
  const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), 160);
  const hit = scene.pickWithRay(ray, (mesh) => groundMeshSet.has(mesh));

  if (!hit?.hit || !hit.pickedPoint) {
    return ANGJI_GROUND_Y + EYE_HEIGHT;
  }

  return hit.pickedPoint.y + EYE_HEIGHT;
}

function clampToArena(position) {
  position.x = Math.max(-ARENA_HALF + 0.5, Math.min(ARENA_HALF - 0.5, position.x));
  position.z = Math.max(-ARENA_HALF + 0.5, Math.min(ARENA_HALF - 0.5, position.z));
}

function applyHorizontalMove(walkCamera, direction, moveSpeed) {
  const next = walkCamera.position.add(direction.scale(moveSpeed));
  clampToArena(next);
  walkCamera.position.x = next.x;
  walkCamera.position.z = next.z;
}

function snapCameraToGround(scene, walkCamera, groundMeshSet) {
  const groundEyeY = getGroundEyeY(scene, walkCamera.position, groundMeshSet);
  walkCamera.position.y = groundEyeY;
  verticalVelocity = 0;
  isGrounded = true;
}

function integrateVerticalPhysics(scene, walkCamera, groundMeshSet, deltaScale, state) {
  let { verticalVelocity, isGrounded: grounded, verticalImpulse = 0 } = state;

  if (verticalImpulse > 0 && grounded) {
    verticalVelocity = verticalImpulse;
    grounded = false;
    walkCamera.position.y += verticalVelocity * deltaScale;
    return { verticalVelocity, isGrounded: grounded };
  }

  const groundEyeY = getGroundEyeY(scene, walkCamera.position, groundMeshSet);
  const distanceToGround = walkCamera.position.y - groundEyeY;

  if (distanceToGround <= GROUND_SNAP_TOLERANCE && verticalVelocity <= 0) {
    walkCamera.position.y = groundEyeY;
    verticalVelocity = 0;
    grounded = true;
    return { verticalVelocity, isGrounded: grounded };
  }

  verticalVelocity = Math.max(
    verticalVelocity - CONTROLLER_SETTINGS.gravity * deltaScale,
    -MAX_FALL_SPEED
  );
  walkCamera.position.y += verticalVelocity * deltaScale;
  grounded = false;

  if (walkCamera.position.y <= groundEyeY + GROUND_SNAP_TOLERANCE) {
    walkCamera.position.y = groundEyeY;
    verticalVelocity = 0;
    grounded = true;
  }

  return { verticalVelocity, isGrounded: grounded };
}

function applyGravity(scene, walkCamera, groundMeshSet, deltaScale) {
  const result = integrateVerticalPhysics(scene, walkCamera, groundMeshSet, deltaScale, {
    verticalVelocity,
    isGrounded,
    verticalImpulse: 0
  });
  verticalVelocity = result.verticalVelocity;
  isGrounded = result.isGrounded;
}

function updateHud(tpsState) {
  locomotionStateEl.textContent = tpsState?.locomotionState || "-";
  activeActionEl.textContent = tpsState?.activeAction || "-";
  groundStateEl.textContent = `${isGrounded ? "grounded" : "air"} / vy ${verticalVelocity.toFixed(3)}`;
  activeKeysEl.textContent = Array.from(keys).join(", ") || "-";
  availableClipsEl.textContent = (tpsState?.availableClips || []).join(", ") || "-";
}

function clearMovementKeys(tpsSystem) {
  keys.clear();
  tpsSystem?.getInputController?.()?.clear();
}

async function main() {
  let tpsSystem = null;
  let sceneRef = null;
  let walkCameraRef = null;
  let groundMeshSetRef = null;

  function enterWalkMode() {
    if (walkMode) {
      return;
    }

    walkMode = true;
    startOverlay.classList.add("is-hidden");
    canvas.focus({ preventScroll: true });

    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }

    if (sceneRef && walkCameraRef && groundMeshSetRef) {
      snapCameraToGround(sceneRef, walkCameraRef, groundMeshSetRef);
    }
  }

  startButton.addEventListener("click", enterWalkMode);
  canvas.addEventListener("click", () => {
    if (!walkMode) {
      enterWalkMode();
    } else if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }
  });

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true
  });

  const scene = new BABYLON.Scene(engine);
  scene.collisionsEnabled = false;
  sceneRef = scene;

  const { groundMeshSet } = createTestArena(scene);
  groundMeshSetRef = groundMeshSet;
  const walkCamera = createWalkCamera(scene);
  walkCameraRef = walkCamera;
  const tpsCamera = createTpsCamera(scene, walkCamera);
  scene.activeCamera = tpsCamera;

  tpsSystem = createTpsSystem(
    BABYLON,
    scene,
    tpsCamera,
    createAngjiTpsOptions(walkCamera, {
      onLoadError: (error) => {
        console.error(error);
        statusLine.textContent = "Character load failed. Check rabbit_Explorer_Ver2.glb path.";
      }
    })
  );

  const loaded = await tpsSystem.ensureLoaded();

  if (loaded) {
    tpsSystem.show();
    tpsSystem.reset(ANGJI_TOUR_CAMERA);
    snapCameraToGround(scene, walkCamera, groundMeshSet);
    statusLine.textContent = "Angji character settings loaded. Click to start.";
  } else {
    statusLine.textContent = "Character could not be loaded.";
  }

  canvas.addEventListener("wheel", (event) => {
    if (!walkMode) {
      return;
    }

    event.preventDefault();
    pendingWheelDelta += event.deltaY;
  }, { passive: false });

  window.addEventListener("mousemove", (event) => {
    if (!walkMode || document.pointerLockElement !== canvas) {
      return;
    }

    pendingMouseDeltaX += event.movementX || 0;
    pendingMouseDeltaY += event.movementY || 0;
  });

  bindCharacterTpsKeyboard(window, {
    canvas,
    keys,
    getWalkMode: () => walkMode,
    getTpsSystem: () => tpsSystem,
    onClearKeys: () => clearMovementKeys(tpsSystem)
  });

  scene.onBeforeRenderObservable.add(() => {
    if (!walkMode || !tpsSystem.isCharacterReady()) {
      return;
    }

    const deltaScale = Math.min(engine.getDeltaTime() / 16.6667, 2);
    const deltaSeconds = engine.getDeltaTime() / 1000;

    const tpsState = tpsSystem.updateFrame({
      deltaSeconds,
      deltaScale,
      keys,
      isGrounded,
      verticalVelocity,
      modelSpeedMultiplier: ANGJI_MOVE_SPEED_MULTIPLIER,
      clearPlayerKeys: () => tpsSystem.getInputController()?.clear(),
      resolveGroundEyeY: (position) => getGroundEyeY(scene, position, groundMeshSet),
      integrateVertical: (verticalState) => integrateVerticalPhysics(
        scene,
        walkCamera,
        groundMeshSet,
        deltaScale,
        verticalState
      ),
      applyHorizontalMove: (direction, moveSpeed) => {
        applyHorizontalMove(walkCamera, direction, moveSpeed);
      },
      mouseDelta: {
        x: pendingMouseDeltaX,
        y: pendingMouseDeltaY
      },
      wheelDelta: pendingWheelDelta
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

    updateHud(tpsState);
  });

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());
}

main().catch((error) => {
  console.error(error);
  statusLine.textContent = `Init failed: ${error.message}`;
});
