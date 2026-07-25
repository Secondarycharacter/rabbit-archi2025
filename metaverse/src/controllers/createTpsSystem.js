import { createAnimationController } from "./AnimationController.js?v=tps-jump-nocol-20260629";
import { createCameraController } from "./CameraController.js?v=floor2-ceiling-camera-20260629";
import { createCharacterStateMachine, ACTION } from "./CharacterStateMachine.js?v=tps-jump-nocol-20260629";
import { createInputController } from "./InputController.js?v=tps-jump-nocol-20260629";
import { createMovementController } from "./MovementController.js?v=tps-jump-nocol-20260629";
import {
  createCharacterController,
  loadCharacterModel,
  CHARACTER_FILE,
  CHARACTER_ROOT
} from "./CharacterController.js?v=character-spawn-fix-20260701";
import { CLIP_NAMES } from "./AnimationController.js?v=tps-jump-nocol-20260629";
import { createRootMotionNeutralizer, stripLocomotionRootMotion } from "./RootMotionNeutralizer.js?v=tps-jump-nocol-20260629";

function shouldIgnoreCollisionDuringJump(stateOutput, isGrounded) {
  // Cover the WHOLE jump action, including the grounded wind-up before takeoff.
  // Collision-checked wind-up frames were clamped/blocked more often at low FPS
  // (larger per-frame steps), making night-mode run jumps land shorter than day.
  void isGrounded;
  return Boolean(
    stateOutput.walkJumpHorizontalMoveActive
    || stateOutput.walkJumpAnimInAirborne
    || stateOutput.isJumpAction
  );
}

export function createTpsSystem(BABYLON, scene, camera, options = {}) {
  const {
    eyeHeight = 1.7,
    playerBody,
    controllerSettings = {},
    getCollisionMask = () => () => false,
    onLoadError = null
  } = options;

  let asset = null;
  let loadPromise = null;

  const characterOptions = {
    eyeHeight,
    rotationDamping: controllerSettings.characterRotationDamping ?? 8
  };

  let character = null;
  let animation = null;
  let rootMotionNeutralizer = null;
  const stateMachine = createCharacterStateMachine({
    landingAnimDelayMs: controllerSettings.landingAnimDelayMs ?? 0,
    runAnimHoldSpeedThreshold: controllerSettings.runAnimHoldSpeedThreshold ?? 0.035,
    walkJumpDecelSeconds: controllerSettings.walkJumpDecelSeconds ?? 0.5,
    walkJumpPostLockSeconds: controllerSettings.walkJumpPostLockSeconds ?? 0.15,
    runJumpDecelSeconds: controllerSettings.runJumpDecelSeconds ?? 0,
    runJumpPostLockSeconds: controllerSettings.runJumpPostLockSeconds ?? 0.2,
    runJumpPostLandingMoveSeconds: controllerSettings.runJumpPostLandingMoveSeconds ?? 0.5,
    runJumpLiftoffSeconds: controllerSettings.runJumpLiftoffSeconds ?? 0.601,
    runJumpLandingSeconds: controllerSettings.runJumpLandingSeconds ?? 1.6,
    runJumpClipEndSeconds: controllerSettings.runJumpClipEndSeconds ?? 2.3,
    runJumpAirborneSeconds: controllerSettings.runJumpAirborneSeconds ?? 0.999,
    walkJumpLiftoffSeconds: controllerSettings.walkJumpLiftoffSeconds ?? 0.405,
    walkJumpLandingSeconds: controllerSettings.walkJumpLandingSeconds ?? 0.764,
    walkJumpMoveStartSeconds: controllerSettings.walkJumpMoveStartSeconds ?? 0.605,
    walkJumpMoveEndSeconds: controllerSettings.walkJumpMoveEndSeconds ?? 1.264,
    runAnimHoldSpeedThreshold: controllerSettings.runAnimHoldSpeedThreshold ?? 0.035
  });
  const inputController = createInputController({
    doubleTapMs: controllerSettings.jumpDoubleTapMs ?? 320
  });
  const movementController = createMovementController(controllerSettings);
  const ignoreCollisionDuringJump = controllerSettings.ignoreCollisionDuringJump !== false;

  const cameraController = createCameraController(BABYLON, scene, camera, {
    mouseSensitivity: controllerSettings.mouseSensitivity ?? 0.0022,
    defaultDistance: controllerSettings.cameraDistance ?? 4,
    minDistance: controllerSettings.cameraMinDistance ?? 2,
    maxDistance: controllerSettings.cameraMaxDistance ?? 8,
    heightOffset: controllerSettings.cameraHeight ?? 1.65,
    shoulderOffset: controllerSettings.cameraShoulder ?? 0.4,
    minPitch: controllerSettings.cameraMinPitch ?? -30,
    maxPitch: controllerSettings.cameraMaxPitch ?? 60,
    autoReturnDelayMs: controllerSettings.cameraAutoReturnDelayMs ?? 1800,
    stopReturnDelayMs: controllerSettings.cameraStopReturnDelayMs ?? 400,
    autoReturnSpeed: controllerSettings.cameraAutoReturnSpeed ?? 2.4,
    positionDamping: controllerSettings.cameraPositionDamping ?? 8,
    stopPositionDamping: controllerSettings.cameraStopPositionDamping ?? 18,
    cameraFloor2WallNormalMaxY: controllerSettings.cameraFloor2WallNormalMaxY ?? 0.35,
    cameraFloor2CeilingMargin: controllerSettings.cameraFloor2CeilingMargin ?? 0.12,
    collisionMask: (mesh) => getCollisionMask()(mesh)
  });

  const physicsAnchor = new BABYLON.Vector3();
  let previousLocomotionState = "idle";
  let previousActiveAction = null;

  function getPhysicsAnchor() {
    physicsAnchor.set(playerBody.position.x, playerBody.position.y - eyeHeight, playerBody.position.z);
    return physicsAnchor;
  }

  async function ensureLoaded() {
    if (asset) {
      return asset;
    }

    if (!loadPromise) {
      loadPromise = loadCharacterModel(BABYLON, scene, {
        rootPath: CHARACTER_ROOT,
        file: CHARACTER_FILE,
        scale: controllerSettings.characterScale ?? 1,
        targetHeight: controllerSettings.characterTargetHeight ?? 1.75
      })
        .then((loadedAsset) => {
          stripLocomotionRootMotion(BABYLON, loadedAsset.animationGroups, [
            CLIP_NAMES.walking,
            CLIP_NAMES.running,
            CLIP_NAMES.idleStandard,
            CLIP_NAMES.idleDwarg,
            CLIP_NAMES.jumpOver
          ], {
            preserveVerticalClipNames: [CLIP_NAMES.jumpOver]
          });
          asset = loadedAsset;
          rootMotionNeutralizer = createRootMotionNeutralizer(BABYLON, loadedAsset);
          character = createCharacterController(BABYLON, asset, characterOptions);
          animation = createAnimationController(BABYLON, asset.animationGroups, {
            blendIdleWalk: controllerSettings.blendIdleWalk ?? 0.4,
            blendWalkRun: controllerSettings.blendWalkRun ?? 0.3,
            blendRunIdle: controllerSettings.blendRunIdle ?? 0.28,
            blendStopIdle: controllerSettings.blendStopIdle ?? 0.1,
            blendJump: controllerSettings.blendJump ?? 0.05,
            blendAction: controllerSettings.blendAction ?? 0.2,
            jumpAnimSpeedRatio: controllerSettings.jumpAnimSpeedRatio ?? (2.567 / 2),
            jumpOverAnimSpeedRatio: controllerSettings.runJumpAnimSpeedRatio ?? 1,
            jumpOverLiftoffSeconds: controllerSettings.runJumpLiftoffClipTime ?? 0.601,
            jumpOverLandingSeconds: controllerSettings.runJumpLandingClipTime ?? 1.6,
            jumpOverClipEndSeconds: controllerSettings.runJumpClipEndSeconds ?? 2.3
          });
          animation.bootstrap();
          return loadedAsset;
        })
        .catch((error) => {
          console.error("TPS character load failed", error);
          loadPromise = null;
          onLoadError?.(error);
          return null;
        });
    }

    return loadPromise;
  }

  function reset(tourCameraConfig) {
    const initialYaw = Math.atan2(
      tourCameraConfig.target.x - tourCameraConfig.position.x,
      tourCameraConfig.target.z - tourCameraConfig.position.z
    );

    playerBody.position.set(
      tourCameraConfig.position.x,
      tourCameraConfig.position.y,
      tourCameraConfig.position.z
    );

    cameraController.reset(initialYaw);
    character?.reset(playerBody.position, initialYaw);
    character?.syncFromPlayerEye(playerBody.position);
    stateMachine.reset();
    movementController.reset();
    inputController.clear();
    previousLocomotionState = "idle";
    animation?.applyLocomotionState("idle");
  }

  function show() {
    character?.show();
  }

  function hide() {
    character?.hide();
  }

  function getMovementAxes() {
    return cameraController.getFlatAxes();
  }

  function updateFrame(frame) {
    const {
      deltaSeconds,
      deltaScale,
      keys,
      isGrounded,
      modelSpeedMultiplier = 1,
      applyHorizontalMove,
      forceWalkLocomotion = false,
      mouseDelta = { x: 0, y: 0 },
      wheelDelta = 0,
      onDiagnostics = null
    } = frame;

    cameraController.applyMouseDelta(mouseDelta.x, mouseDelta.y);
    cameraController.applyWheelDelta(wheelDelta);

    if (!character || !animation) {
      cameraController.update(
        deltaSeconds,
        getPhysicsAnchor(),
        cameraController.getYaw() - Math.PI,
        1.75,
        false
      );

      return {
        cameraYaw: cameraController.getYaw(),
        cameraPitch: cameraController.getPitch(),
        verticalImpulse: 0,
        availableClips: []
      };
    }

    const finishedActionKey = animation.consumeFinishedAction();

    inputController.setInputBlocked(stateMachine.blocksPlayerInput());

    const axes = cameraController.getFlatAxes();
    const inputFrame = inputController.consumeFrame(
      keys,
      axes,
      BABYLON,
      stateMachine.getLocomotionState()
    );

    const previewState = stateMachine.getPreviewState(isGrounded);

    inputFrame.blocksLocomotion = previewState.blocksHorizontalMovement;

    if (forceWalkLocomotion) {
      inputFrame.wantsRun = false;
    }

    movementController.updateBlend(
      inputFrame,
      previewState,
      deltaSeconds,
      isGrounded
    );

    const justLanded = movementController.isJustLanded(isGrounded);
    const horizontalSpeed = movementController.getHorizontalSpeed();

    const stateOutput = stateMachine.update(inputFrame, {
      isGrounded,
      deltaSeconds,
      horizontalSpeed,
      justLanded,
      actionFinished: finishedActionKey
    });

    if (stateOutput.blocksPlayerInput) {
      inputFrame.hasMovementInput = false;
      inputFrame.wantsRun = false;
      inputFrame.jumpRequest = null;
      inputFrame.throwRequest = false;
      inputFrame.danceRequest = false;
      inputFrame.movement = new BABYLON.Vector3(0, 0, 0);
      inputFrame.blocksLocomotion = true;
    }

    inputController.setInputBlocked(stateOutput.blocksPlayerInput);

    const movementResult = movementController.computeMovement(inputFrame, stateOutput, {
      isGrounded,
      deltaSeconds,
      deltaScale,
      modelSpeedMultiplier,
      facingYaw: character.getFacingYaw(),
      jumpForce: controllerSettings.jumpForce ?? 0.22,
      BABYLON
    });

    if (movementResult.moveDirection && movementResult.moveSpeed > 0.000001 && applyHorizontalMove) {
      applyHorizontalMove(movementResult.moveDirection, movementResult.moveSpeed, {
        ignoreCollision: ignoreCollisionDuringJump
          && shouldIgnoreCollisionDuringJump(stateOutput, isGrounded)
      });
      onDiagnostics?.({
        lastMoveCommand: Array.from(keys).join(",") || "-",
        moved: true
      });
    } else if (onDiagnostics) {
      const reason = stateOutput.blocksHorizontalMovement
        ? "action lock"
        : (inputFrame.hasMovementInput ? "no velocity" : "no input");
      onDiagnostics({
        lastMoveCommand: inputFrame.hasMovementInput ? Array.from(keys).join(",") || "-" : "-",
        moved: false,
        reason
      });
    }

    const stoppedLocomoting = previousLocomotionState !== "idle"
      && stateOutput.locomotionState === "idle"
      && !inputFrame.hasMovementInput;

    // Jump animation starts before vertical physics (space → anim → impulse).
    animation.applyStateMachineOutput(stateOutput, { fastStop: stoppedLocomoting });
    animation.update(deltaSeconds);

    if (
      stateOutput.walkJumpUsesAnimRootMotion
      && stateOutput.activeAction === ACTION.JUMP_OVER
      && previousActiveAction !== ACTION.JUMP_OVER
    ) {
      rootMotionNeutralizer?.resetRootMotionSample?.();
    }

    if (
      previousActiveAction === ACTION.JUMP_OVER
      && stateOutput.activeAction !== ACTION.JUMP_OVER
    ) {
      rootMotionNeutralizer?.resetRootMotionSample?.();
    }

    if (stateOutput.walkJumpUsesAnimRootMotion && applyHorizontalMove) {
      const rootDelta = rootMotionNeutralizer?.consumePlanarRootMotionDelta?.();
      if (rootDelta) {
        const rootDistance = Math.hypot(rootDelta.x, rootDelta.z);
        if (rootDistance > 0.000001) {
          applyHorizontalMove(
            new BABYLON.Vector3(rootDelta.x / rootDistance, 0, rootDelta.z / rootDistance),
            rootDistance,
            {
              ignoreCollision: ignoreCollisionDuringJump
                && shouldIgnoreCollisionDuringJump(stateOutput, isGrounded)
            }
          );
        }
      }
      rootMotionNeutralizer?.neutralize?.({ syncSample: true });
    } else {
      const skipNeutralize = stateOutput.activeAction !== ACTION.JUMP_OVER
        && Boolean(stateOutput.walkJumpPhase);
      rootMotionNeutralizer?.neutralize?.({
        skip: skipNeutralize,
        syncSample: !skipNeutralize
      });
    }

    previousActiveAction = stateOutput.activeAction ?? null;

    let groundedAfterVertical = isGrounded;
    let verticalVelocityAfter = frame.verticalVelocity ?? 0;
    const jumpVerticalOffsetY = stateOutput.walkJumpVerticalOffsetY ?? 0;
    const animationOnlyVertical = Boolean(stateOutput.walkJumpPhase)
      || (Boolean(stateOutput.isJumpAction && stateOutput.blocksPlayerInput));

    if (animationOnlyVertical && typeof frame.resolveGroundEyeY === "function") {
      const groundEyeY = frame.resolveGroundEyeY(playerBody.position);
      playerBody.position.y = groundEyeY + jumpVerticalOffsetY;
      verticalVelocityAfter = 0;
      groundedAfterVertical = true;
    } else if (typeof frame.integrateVertical === "function") {
      const verticalState = frame.integrateVertical({
        verticalVelocity: verticalVelocityAfter,
        isGrounded: groundedAfterVertical,
        deltaScale,
        verticalImpulse: movementResult.verticalImpulse
      });

      verticalVelocityAfter = verticalState.verticalVelocity ?? verticalVelocityAfter;
      groundedAfterVertical = verticalState.isGrounded ?? groundedAfterVertical;
    }

    const actionActive = Boolean(animation.getCurrentAction());
    const jumpAction = animation.isJumpAction();
    const airborneAfterVertical = !groundedAfterVertical;
    const locomotionJumpActive = Boolean(stateOutput.walkJumpPhase);
    let facingDirection = movementResult.moveDirection;

    if (!facingDirection && locomotionJumpActive && stateOutput.walkJumpDirection) {
      facingDirection = new BABYLON.Vector3(
        stateOutput.walkJumpDirection.x,
        0,
        stateOutput.walkJumpDirection.z
      );
    }

    const shouldRotate = facingDirection
      && (!actionActive || jumpAction || movementResult.isAirborne || airborneAfterVertical)
      && (
        movementResult.isAirborne
        || airborneAfterVertical
        || movementResult.movementBlend > 0.12
        || inputFrame.hasMovementInput
        || locomotionJumpActive
      );

    if (shouldRotate) {
      character.updateRotation(deltaSeconds, facingDirection);
    }

    character.updateVisual(deltaSeconds, playerBody.position);

    previousLocomotionState = stateOutput.locomotionState;

    const jumpOverCameraLead = stateOutput.activeAction === ACTION.JUMP_OVER
      || movementResult.postWalkJumpRampActive
      || (Boolean(stateOutput.walkJumpPhase) && stateOutput.walkJumpIsRunning);

    const cameraFollowsMovement = inputFrame.hasMovementInput
      || movementResult.movementBlend > 0.05
      || movementResult.isAirborne
      || airborneAfterVertical
      || jumpAction
      || locomotionJumpActive
      || movementResult.postWalkJumpRampActive
      || jumpOverCameraLead
      || Boolean(inputFrame.jumpRequest);

    const preferCameraCharacterYaw = jumpOverCameraLead || locomotionJumpActive;

    cameraController.update(
      deltaSeconds,
      getPhysicsAnchor(),
      character.getFacingYaw(),
      character.getVisualHeight(),
      cameraFollowsMovement,
      { preferCharacterYaw: preferCameraCharacterYaw }
    );

    return {
      cameraYaw: cameraController.getYaw(),
      cameraPitch: cameraController.getPitch(),
      cameraDistance: cameraController.getDistance(),
      verticalImpulse: movementResult.verticalImpulse,
      verticalVelocity: verticalVelocityAfter,
      isGrounded: groundedAfterVertical,
      locomotionState: stateOutput.locomotionState,
      activeAction: stateOutput.activeAction,
      movementBlend: movementResult.movementBlend,
      availableClips: animation.getAvailableClips()
    };
  }

  return {
    ensureLoaded,
    reset,
    show,
    hide,
    getMovementAxes,
    updateFrame,
    getInputController: () => inputController,
    getStateMachine: () => stateMachine,
    getMovementController: () => movementController,
    getCharacter: () => character,
    getCameraController: () => cameraController,
    getAnimation: () => animation,
    isCharacterReady: () => Boolean(asset && character && animation),
    isPlayerInputBlocked: () => inputController.isInputBlocked()
  };
}
