/**
 * TPS character settings — aligned with game controller.pdf (GTA/Unreal-style).
 * WASD axis mapping stays inverted in InputController (project convention).
 */

export const EYE_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.35;
export const PLAYER_HEIGHT = 1.7;
export const MAX_FALL_SPEED = 0.85;
export const GROUND_SNAP_TOLERANCE = 0.08;

export const ANGJI_MOVE_SPEED_MULTIPLIER = 3;

export const ANGJI_TOUR_CAMERA = {
  position: { x: -46.61, y: 24.44, z: 30.49 },
  target: { x: 0, y: 6.81, z: 0 }
};

export const ANGJI_GROUND_Y = ANGJI_TOUR_CAMERA.target.y;

export const JUMP_STAND_CLIP_DURATION_SECONDS = 2.567;

/** rabbit01.glb Jump_Over — 69 keys @ 30fps, t=0.033…2.300s */
export const JUMP_OVER_CLIP_DURATION_SECONDS = 2.3;

/** Jump_Over Idle_Standard root translation — seconds in source clip */
export const JUMP_OVER_LIFTOFF_CLIP_TIME_SECONDS = 0.601;
export const JUMP_OVER_LANDING_CLIP_TIME_SECONDS = 1.6;

/** Visual lift while capsule stays grounded (matches ~GLB arc peak after scale). */
export const JUMP_OVER_VISUAL_PEAK_METERS = 0.42;

export function computeJumpOverVisualOffsetY(
  timelineElapsed,
  walkJumpPhase,
  liftoffSeconds,
  landingSeconds
) {
  if (walkJumpPhase !== "anim" && walkJumpPhase !== "postLock") {
    return 0;
  }

  if (timelineElapsed < liftoffSeconds || timelineElapsed >= landingSeconds) {
    return 0;
  }

  const window = Math.max(landingSeconds - liftoffSeconds, 0.001);
  const t = (timelineElapsed - liftoffSeconds) / window;
  return Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * JUMP_OVER_VISUAL_PEAK_METERS;
}

export function resolveJumpControllerSettings(settings = {}) {
  const jumpAnimPlaySeconds = settings.jumpAnimPlaySeconds ?? 2;
  const walkClipDuration = settings.jumpClipDurationSeconds ?? JUMP_STAND_CLIP_DURATION_SECONDS;
  const jumpAnimSpeedRatio = settings.jumpAnimSpeedRatio ?? (
    walkClipDuration / jumpAnimPlaySeconds
  );

  const runJumpClipDuration = settings.runJumpClipDurationSeconds
    ?? JUMP_OVER_CLIP_DURATION_SECONDS;
  const runJumpAnimPlaySeconds = settings.runJumpAnimPlaySeconds ?? runJumpClipDuration;
  const runJumpAnimSpeedRatio = settings.runJumpAnimSpeedRatio ?? (
    runJumpClipDuration / runJumpAnimPlaySeconds
  );

  const liftoffClipTime = settings.walkJumpLiftoffClipTime
    ?? settings.walkJumpAirborneClipStart
    ?? 0.52;
  const landingClipTime = settings.walkJumpLandingClipTime
    ?? settings.walkJumpAirborneClipEnd
    ?? 0.98;
  const moveStartAfterLiftoff = settings.walkJumpMoveStartAfterLiftoffSeconds ?? 0.2;
  const moveEndAfterLanding = settings.walkJumpMoveEndAfterLandingSeconds ?? 0.5;
  const walkJumpLiftoffSeconds = settings.walkJumpLiftoffSeconds ?? (
    liftoffClipTime / jumpAnimSpeedRatio
  );
  const walkJumpLandingSeconds = settings.walkJumpLandingSeconds ?? (
    landingClipTime / jumpAnimSpeedRatio
  );
  const walkJumpMoveStartSeconds = settings.walkJumpMoveStartSeconds ?? (
    walkJumpLiftoffSeconds + moveStartAfterLiftoff
  );
  const walkJumpMoveEndSeconds = settings.walkJumpMoveEndSeconds ?? (
    walkJumpLandingSeconds + moveEndAfterLanding
  );

  const runLiftoffClipTime = settings.runJumpLiftoffClipTime
    ?? JUMP_OVER_LIFTOFF_CLIP_TIME_SECONDS;
  const runLandingClipTime = settings.runJumpLandingClipTime
    ?? JUMP_OVER_LANDING_CLIP_TIME_SECONDS;
  const runJumpLiftoffSeconds = settings.runJumpLiftoffSeconds ?? (
    runLiftoffClipTime / runJumpAnimSpeedRatio
  );
  const runJumpLandingSeconds = settings.runJumpLandingSeconds ?? (
    runLandingClipTime / runJumpAnimSpeedRatio
  );
  const runJumpAirborneSeconds = Math.max(
    runJumpLandingSeconds - runJumpLiftoffSeconds,
    0.001
  );
  const runJumpPostLandingMoveSeconds = settings.runJumpPostLandingMoveSeconds
    ?? settings.walkJumpMoveEndAfterLandingSeconds
    ?? 0.5;
  const runJumpClipEndSeconds = settings.runJumpClipEndSeconds ?? runJumpAnimPlaySeconds;
  const runJumpMoveDurationSeconds = runJumpLandingSeconds + runJumpPostLandingMoveSeconds;
  const runJumpSequenceEndSeconds = runJumpClipEndSeconds;
  const runJumpInputUnlockSeconds = settings.runJumpInputUnlockSeconds ?? runJumpClipEndSeconds;

  return {
    ...settings,
    jumpAnimSpeedRatio,
    runJumpAnimSpeedRatio,
    runJumpClipDurationSeconds: runJumpClipDuration,
    runJumpAnimPlaySeconds: runJumpAnimPlaySeconds,
    runJumpLiftoffClipTime: runLiftoffClipTime,
    runJumpLandingClipTime: runLandingClipTime,
    runJumpLiftoffSeconds,
    runJumpLandingSeconds,
    runJumpAirborneSeconds,
    runJumpPostLandingMoveSeconds,
    runJumpClipEndSeconds,
    runJumpMoveDurationSeconds,
    runJumpSequenceEndSeconds,
    runJumpInputUnlockSeconds,
    walkJumpLiftoffClipTime: liftoffClipTime,
    walkJumpLandingClipTime: landingClipTime,
    walkJumpMoveStartAfterLiftoffSeconds: moveStartAfterLiftoff,
    walkJumpMoveEndAfterLandingSeconds: moveEndAfterLanding,
    walkJumpLiftoffSeconds,
    walkJumpLandingSeconds,
    walkJumpMoveStartSeconds,
    walkJumpMoveEndSeconds,
    walkJumpAirborneStartSeconds: settings.walkJumpAirborneStartSeconds ?? walkJumpLiftoffSeconds,
    walkJumpAirborneEndSeconds: settings.walkJumpAirborneEndSeconds ?? walkJumpLandingSeconds
  };
}

/** PDF ref: walk 2.5 / run 6 → run is 2.4× walk */
const BASE_CONTROLLER_SETTINGS = {
  mouseSensitivity: 0.0022,
  moveSpeed: 0.09,
  walkSpeedMultiplier: 0.278,
  runMultiplier: 0.667,
  jumpForce: 0.22,
  gravity: 0.018,
  jumpTakeoffDelaySeconds: 0.28,
  walkJumpDecelSeconds: 0.5,
  walkJumpPostLockSeconds: 0.15,
  runJumpDecelSeconds: 0,
  runJumpPostLockSeconds: 0.2,
  runJumpPostLandingMoveSeconds: 0.5,
  walkJumpLiftoffClipTime: 0.52,
  walkJumpLandingClipTime: 0.98,
  walkJumpMoveStartAfterLiftoffSeconds: 0.2,
  walkJumpMoveEndAfterLandingSeconds: 0.5,
  walkJumpPostMoveRampWalkSeconds: 0.5,
  walkJumpPostMoveRampRunSeconds: 1,
  walkJumpAirborneClipStart: 0.52,
  walkJumpAirborneClipEnd: 0.98,
  jumpAnimPlaySeconds: 2,
  jumpClipDurationSeconds: JUMP_STAND_CLIP_DURATION_SECONDS,
  runJumpClipDurationSeconds: JUMP_OVER_CLIP_DURATION_SECONDS,
  runJumpAnimPlaySeconds: JUMP_OVER_CLIP_DURATION_SECONDS,
  runJumpLiftoffClipTime: JUMP_OVER_LIFTOFF_CLIP_TIME_SECONDS,
  runJumpLandingClipTime: JUMP_OVER_LANDING_CLIP_TIME_SECONDS,
  characterScale: 1,
  characterTargetHeight: 1.75,
  cameraDistance: 4,
  cameraMinDistance: 2,
  cameraMaxDistance: 8,
  cameraHeight: 1.65,
  cameraShoulder: 0.4,
  cameraMinPitch: -30,
  cameraMaxPitch: 60,
  cameraAutoReturnDelayMs: 1800,
  cameraStopReturnDelayMs: 400,
  cameraAutoReturnSpeed: 2.4,
  cameraPositionDamping: 8,
  cameraStopPositionDamping: 18,
  movementBlendInSpeed: 6.5,
  movementBlendOutSpeed: 7,
  characterRotationDamping: 10,
  groundVelocityAccel: 9.5,
  jumpHorizontalCarryWalk: 1,
  jumpHorizontalCarryRun: 1,
  maxJumpHorizontalRatio: 1,
  airControlMultiplier: 0.35,
  airControlAccel: 5,
  airHorizontalDrag: 2.8,
  maxAirSpeedRatio: 0.45,
  landingHorizontalFriction: 0.88,
  runAnimHoldSpeedThreshold: 0.035,
  landingAnimDelayMs: 0,
  jumpDoubleTapMs: 320,
  blendIdleWalk: 0.4,
  blendWalkRun: 0.3,
  blendRunIdle: 0.28,
  blendStopIdle: 0.1,
  blendJump: 0.05,
  blendJumpRelease: 0.2,
  blendAction: 0.2,
  ignoreCollisionDuringJump: true
};

export const CONTROLLER_SETTINGS = resolveJumpControllerSettings(BASE_CONTROLLER_SETTINGS);

export function createAngjiTpsOptions(walkCamera, overrides = {}) {
  const controllerSettings = resolveJumpControllerSettings({
    ...CONTROLLER_SETTINGS,
    ...(overrides.controllerSettings || {})
  });

  return {
    eyeHeight: EYE_HEIGHT,
    playerBody: walkCamera,
    getCollisionMask: () => () => false,
    ...overrides,
    controllerSettings
  };
}
