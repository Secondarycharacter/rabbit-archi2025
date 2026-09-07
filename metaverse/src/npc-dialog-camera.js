/**
 * Shared NPC dialog camera framing (runtime + editor preview).
 */

export const NPC_DIALOG_CAMERA_DEFAULTS = {
  hidePlayerDuringDialog: true,
  dialogDistance: 1.2,
  cameraHeight: 1.55,
  cameraLookLift: 0.35,
  cameraMinDistance: 1.15,
  cameraMaxDistance: 2.8,
  cameraYawOffset: 0,
  cameraPitchOffset: 0,
  /** Meters; + = camera right of the NPC↔player axis, − = left. */
  cameraLateralOffset: 0,
  cameraDistance: null
};

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeNpcDialogCameraSettings(raw = {}, defaults = NPC_DIALOG_CAMERA_DEFAULTS) {
  const merged = { ...NPC_DIALOG_CAMERA_DEFAULTS, ...defaults };
  const cameraDistance = raw.cameraDistance == null || raw.cameraDistance === ""
    ? null
    : asNumber(raw.cameraDistance, null);

  return {
    hidePlayerDuringDialog: asBool(raw.hidePlayerDuringDialog, merged.hidePlayerDuringDialog),
    dialogDistance: asNumber(raw.dialogDistance, merged.dialogDistance),
    cameraHeight: asNumber(raw.cameraHeight, merged.cameraHeight),
    cameraLookLift: asNumber(raw.cameraLookLift, merged.cameraLookLift),
    cameraMinDistance: asNumber(raw.cameraMinDistance, merged.cameraMinDistance),
    cameraMaxDistance: asNumber(raw.cameraMaxDistance, merged.cameraMaxDistance),
    cameraYawOffset: asNumber(raw.cameraYawOffset, merged.cameraYawOffset),
    cameraPitchOffset: asNumber(raw.cameraPitchOffset, merged.cameraPitchOffset),
    cameraLateralOffset: asNumber(raw.cameraLateralOffset, merged.cameraLateralOffset),
    cameraDistance
  };
}

/**
 * Compute dialog camera position + look target.
 * playerEyePosition should already be the aligned eye pose (dialogDistance in front of NPC).
 *
 * cameraHeight  = absolute camera lens height (meters above NPC feet / ground)
 * cameraPitchOffset = view tilt only (does not move the camera; changes look direction)
 * cameraYawOffset = orbit the camera horizontally around the NPC
 * cameraLateralOffset = slide camera left/right along the orbit tangent (meters)
 */
export function resolveNpcDialogCameraFraming(BABYLON, options = {}) {
  const {
    guestPosition,
    guestHeadLocalY = 1.55,
    fitScale = 1,
    playerEyePosition,
    eyeHeight = 1.7,
    settings = {}
  } = options;

  const cam = normalizeNpcDialogCameraSettings(settings);
  const guestPos = guestPosition;
  const scale = Math.max(fitScale || 1, 0.001);
  const headY = guestPos.y + guestHeadLocalY * scale;

  let fromPlayer = new BABYLON.Vector3(
    playerEyePosition.x - guestPos.x,
    0,
    playerEyePosition.z - guestPos.z
  );

  if (fromPlayer.lengthSquared() < 1e-6) {
    fromPlayer.set(0, 0, 1);
  } else {
    fromPlayer.normalize();
  }

  const yaw = (cam.cameraYawOffset * Math.PI) / 180;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  fromPlayer = new BABYLON.Vector3(
    fromPlayer.x * cosY - fromPlayer.z * sinY,
    0,
    fromPlayer.x * sinY + fromPlayer.z * cosY
  );

  const baseDist = cam.cameraDistance == null
    ? cam.dialogDistance + 0.55
    : cam.cameraDistance;
  const dist = clamp(baseDist, cam.cameraMinDistance, cam.cameraMaxDistance);

  // Right relative to the camera approach vector (horizontal).
  const lateral = new BABYLON.Vector3(fromPlayer.z, 0, -fromPlayer.x).scale(
    cam.cameraLateralOffset || 0
  );

  // Height: place the camera lens. Pitch does NOT raise/lower the camera.
  const cameraPos = guestPos.add(fromPlayer.scale(dist)).add(lateral);
  cameraPos.y = guestPos.y + cam.cameraHeight;

  // Neutral look = NPC head (+ lookLift). Pitch tilts the view around the camera.
  const lookBase = new BABYLON.Vector3(
    guestPos.x,
    headY - 0.15 + cam.cameraLookLift * 0.15,
    guestPos.z
  );
  const toLook = lookBase.subtract(cameraPos);
  const flatDist = Math.hypot(toLook.x, toLook.z) || 0.001;
  const pitch = clamp((cam.cameraPitchOffset * Math.PI) / 180, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  const look = new BABYLON.Vector3(
    lookBase.x,
    cameraPos.y + Math.tan(pitch) * flatDist,
    lookBase.z
  );

  return {
    look,
    cam: cameraPos,
    settings: cam
  };
}

/**
 * Simulated player eye in front of NPC (for editor preview without walk mode).
 */
export function resolvePreviewPlayerEye(BABYLON, guestPosition, guestRotationY, dialogDistance, eyeHeight) {
  const yaw = Number.isFinite(guestRotationY) ? guestRotationY : 0;
  const dist = Math.max(0.4, Number(dialogDistance) || 1.2);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);

  return new BABYLON.Vector3(
    guestPosition.x + fx * dist,
    guestPosition.y + eyeHeight,
    guestPosition.z + fz * dist
  );
}
