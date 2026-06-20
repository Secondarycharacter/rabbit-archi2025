export const CHARACTER_ROOT = "./assets/character/";
export const CHARACTER_FILE = "rabbit01.glb";

function dampAngle(current, target, lambda, deltaSeconds) {
  let delta = target - current;

  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  return current + delta * (1 - Math.exp(-lambda * deltaSeconds));
}

export async function loadCharacterModel(BABYLON, scene, options = {}) {
  const {
    rootPath = CHARACTER_ROOT,
    file = CHARACTER_FILE,
    scale = 1,
    targetHeight = 1.75
  } = options;

  const fileName = `${file}?v=${Date.now()}`;
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", rootPath, fileName, scene);
  const root = new BABYLON.TransformNode("tps-character-root", scene);
  const contentRoot = new BABYLON.TransformNode("tps-character-content", scene);
  const meshes = result.meshes.filter((mesh) => typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() > 0);

  contentRoot.parent = root;

  const importedNodes = [...result.meshes, ...(result.transformNodes || [])];
  importedNodes.forEach((node) => {
    if (node !== root && node !== contentRoot && !node.parent) {
      node.setParent(contentRoot);
    }
  });

  root.computeWorldMatrix(true);
  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));

  const bounds = meshes.reduce((combined, mesh) => {
    mesh.computeWorldMatrix(true);
    const info = mesh.getBoundingInfo?.();
    if (!info) {
      return combined;
    }

    const min = info.boundingBox.minimumWorld;
    const max = info.boundingBox.maximumWorld;

    if (!combined) {
      return {
        min: min.clone(),
        max: max.clone()
      };
    }

    combined.min.minimizeInPlace(min);
    combined.max.maximizeInPlace(max);
    return combined;
  }, null);

  let rawHeight = 1.75;

  if (bounds) {
    const center = bounds.min.add(bounds.max).scale(0.5);
    contentRoot.position.addInPlace(new BABYLON.Vector3(-center.x, -bounds.min.y, -center.z));
    rawHeight = Math.max(bounds.max.y - bounds.min.y, 0.001);
  }

  const fitScale = (targetHeight / rawHeight) * scale;
  root.scaling.set(fitScale, fitScale, fitScale);
  root.computeWorldMatrix(true);
  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));

  const visualHeight = rawHeight * fitScale;

  meshes.forEach((mesh) => {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = { ...(mesh.metadata || {}), passThrough: true, playerCharacter: true };
  });

  root.setEnabled(false);

  return {
    root,
    contentRoot,
    meshes,
    visualHeight,
    animationGroups: result.animationGroups || scene.getAnimationGroups?.() || []
  };
}

export function createCharacterController(BABYLON, asset, options = {}) {
  const {
    eyeHeight = 1.7,
    rotationDamping = 8
  } = options;

  let facingYaw = 0;
  const visualPosition = new BABYLON.Vector3();

  function getFeetPosition(playerEye) {
    return new BABYLON.Vector3(playerEye.x, playerEye.y - eyeHeight, playerEye.z);
  }

  function snapVisualToPlayerEye(playerEye) {
    visualPosition.copyFrom(getFeetPosition(playerEye));
    asset.root.position.copyFrom(visualPosition);
  }

  function updateVisual(_deltaSeconds, playerEye, options = {}) {
    const target = getFeetPosition(playerEye);
    const verticalOffset = options.verticalOffset ?? 0;
    target.y += verticalOffset;
    visualPosition.copyFrom(target);
    asset.root.position.copyFrom(visualPosition);
  }

  function syncFromPlayerEye(playerEye) {
    snapVisualToPlayerEye(playerEye);
  }

  function show() {
    asset.root.setEnabled(true);
  }

  function hide() {
    asset.root.setEnabled(false);
  }

  function reset(playerEye, initialYaw = 0) {
    snapVisualToPlayerEye(playerEye);
    facingYaw = initialYaw;
    asset.root.rotation.y = facingYaw;
  }

  function updateRotation(deltaSeconds, moveDirection) {
    if (!moveDirection || moveDirection.lengthSquared() <= 0.0001) {
      return;
    }

    const targetYaw = Math.atan2(moveDirection.x, moveDirection.z);
    facingYaw = dampAngle(facingYaw, targetYaw, rotationDamping, deltaSeconds);
    asset.root.rotation.y = facingYaw;
  }

  function getFacingYaw() {
    return facingYaw;
  }

  function getRoot() {
    return asset.root;
  }

  function getVisualHeight() {
    return asset.visualHeight || 1.75;
  }

  function getVisualPosition() {
    return visualPosition;
  }

  return {
    show,
    hide,
    reset,
    syncFromPlayerEye,
    updateVisual,
    updateRotation,
    getFacingYaw,
    getRoot,
    getVisualHeight,
    getVisualPosition
  };
}
