import { computeJumpOverVisualOffsetY } from "../angji-character-config.js?v=tps-tour-test-sync-20260629";

export const LOCOMOTION = {
  IDLE: "idle",
  WALK: "walk",
  RUN: "run"
};

export const ACTION = {
  JUMP_STAND: "jumpStand",
  JUMP_RUNNING: "jumpRunning",
  JUMP_OVER: "jumpOver",
  THROW: "throw",
  DANCE: "dance"
};

export const WALK_JUMP_PHASE = {
  DECEL: "decel",
  ANIM: "anim",
  POST_LOCK: "postLock"
};

/** PDF §4 priority: Jump_Over > Throw > Jump > Run > Walk > Idle */
export const STATE_PRIORITY = {
  [ACTION.JUMP_OVER]: 100,
  [ACTION.THROW]: 90,
  [ACTION.DANCE]: 89,
  [ACTION.JUMP_RUNNING]: 80,
  [ACTION.JUMP_STAND]: 80,
  [LOCOMOTION.RUN]: 40,
  [LOCOMOTION.WALK]: 30,
  [LOCOMOTION.IDLE]: 10
};

const JUMP_ACTIONS = new Set([
  ACTION.JUMP_STAND,
  ACTION.JUMP_RUNNING,
  ACTION.JUMP_OVER
]);

const BLOCKING_ACTIONS = new Set([
  ACTION.THROW,
  ACTION.DANCE
]);

export function isLocomotionJumpRequest(jumpRequest) {
  if (!jumpRequest?.hasMovement) {
    return false;
  }

  return jumpRequest.action === ACTION.JUMP_STAND
    || jumpRequest.action === ACTION.JUMP_OVER;
}

/** @deprecated use isLocomotionJumpRequest */
export function isWalkJumpRequest(jumpRequest) {
  return isLocomotionJumpRequest(jumpRequest);
}

/** Reserved for future vertical-physics jumps. Run jump over uses the locomotion timeline only. */
export function jumpRequestUsesPhysics() {
  return false;
}

function normalizePlanarDirection(movement) {
  const length = Math.hypot(movement?.x ?? 0, movement?.z ?? 0);

  if (length <= 0.000001) {
    return null;
  }

  return {
    x: movement.x / length,
    z: movement.z / length
  };
}

export function createCharacterStateMachine(options = {}) {
  const {
    landingAnimDelayMs = 0,
    walkJumpDecelSeconds = 0.5,
    walkJumpPostLockSeconds = 0.15,
    runJumpDecelSeconds = 0,
    runJumpPostLockSeconds = 0.2,
    runJumpPostLandingMoveSeconds = 0.5,
    runJumpLiftoffSeconds = 0.601,
    runJumpLandingSeconds = 1.6,
    runJumpClipEndSeconds = 2.3,
    runJumpAirborneSeconds = 0.999,
    walkJumpLiftoffSeconds = 0.405,
    walkJumpLandingSeconds = 0.764,
    walkJumpMoveStartSeconds = 0.605,
    walkJumpMoveEndSeconds = 1.264,
    runAnimHoldSpeedThreshold = 0.035
  } = options;

  let locomotionState = LOCOMOTION.IDLE;
  let activeAction = null;
  let resumeLocomotion = LOCOMOTION.IDLE;
  let locomotionAnimLockUntil = 0;
  let airborneFromJump = false;
  let jumpRetrigger = false;
  let walkJumpPhase = null;
  let walkJumpElapsed = 0;
  let walkJumpAnimElapsed = 0;
  let walkJumpTimelineElapsed = 0;
  let walkJumpDirection = null;
  let walkJumpIsRunning = false;

  function getActivePriority() {
    if (activeAction) {
      return STATE_PRIORITY[activeAction] ?? 0;
    }

    return STATE_PRIORITY[locomotionState] ?? 0;
  }

  function canOverrideWith(nextState) {
    const nextPriority = STATE_PRIORITY[nextState] ?? 0;

    if (!activeAction) {
      return true;
    }

    if (JUMP_ACTIONS.has(activeAction) && nextState === ACTION.JUMP_OVER) {
      return true;
    }

    return nextPriority > getActivePriority();
  }

  function beginAction(action, locomotionSnapshot) {
    if (!canOverrideWith(action)) {
      return false;
    }

    if (!activeAction) {
      resumeLocomotion = locomotionSnapshot;
    }

    activeAction = action;
    return true;
  }

  function endAction() {
    activeAction = null;
    locomotionState = resumeLocomotion;
  }

  function clearWalkJump() {
    walkJumpPhase = null;
    walkJumpElapsed = 0;
    walkJumpAnimElapsed = 0;
    walkJumpTimelineElapsed = 0;
    walkJumpDirection = null;
    walkJumpIsRunning = false;
  }

  function startWalkJump(input, jumpRequest) {
    walkJumpElapsed = 0;
    walkJumpAnimElapsed = 0;
    walkJumpTimelineElapsed = 0;
    walkJumpDirection = normalizePlanarDirection(input.movement);
    walkJumpIsRunning = Boolean(
      jumpRequest?.isRunning || jumpRequest?.action === ACTION.JUMP_OVER
    );

    if (walkJumpIsRunning) {
      resumeLocomotion = LOCOMOTION.RUN;
      walkJumpPhase = WALK_JUMP_PHASE.ANIM;
      return;
    }

    walkJumpPhase = WALK_JUMP_PHASE.DECEL;
  }

  function resolveLocomotion(input, horizontalSpeed = 0) {
    if (walkJumpPhase === WALK_JUMP_PHASE.ANIM || walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK) {
      return LOCOMOTION.IDLE;
    }

    if (activeAction && !JUMP_ACTIONS.has(activeAction)) {
      return locomotionState;
    }

    const hasInputMove = input.hasMovementInput && !input.blocksLocomotion;

    if (!hasInputMove) {
      return LOCOMOTION.IDLE;
    }

    return input.wantsRun ? LOCOMOTION.RUN : LOCOMOTION.WALK;
  }

  function resolveAnimLocomotion(physicsLocomotion) {
    if (landingAnimDelayMs > 0 && performance.now() < locomotionAnimLockUntil) {
      return LOCOMOTION.IDLE;
    }

    if (walkJumpPhase === WALK_JUMP_PHASE.DECEL) {
      return walkJumpIsRunning ? LOCOMOTION.RUN : LOCOMOTION.WALK;
    }

    return physicsLocomotion;
  }

  function lockLocomotionAnimAfterLanding() {
    if (landingAnimDelayMs <= 0) {
      return;
    }

    locomotionAnimLockUntil = performance.now() + landingAnimDelayMs;
  }

  function getWalkJumpDecelSeconds() {
    return walkJumpIsRunning ? runJumpDecelSeconds : walkJumpDecelSeconds;
  }

  function getRunJumpClipEndSeconds() {
    return Math.max(runJumpClipEndSeconds, 0.001);
  }

  function getRunJumpSequenceEndSeconds() {
    return getRunJumpClipEndSeconds();
  }

  function getRunJumpHorizontalMoveEndSeconds() {
    return getRunJumpClipEndSeconds();
  }

  function getWalkJumpPostLockSeconds() {
    return walkJumpIsRunning ? runJumpPostLockSeconds : walkJumpPostLockSeconds;
  }

  function shouldBlockPlayerInput() {
    if (walkJumpIsRunning && walkJumpPhase) {
      return walkJumpTimelineElapsed < getRunJumpInputUnlockSeconds();
    }

    if (walkJumpPhase === WALK_JUMP_PHASE.ANIM || walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK) {
      return true;
    }

    if (walkJumpPhase === WALK_JUMP_PHASE.DECEL && !walkJumpIsRunning) {
      return true;
    }

    return Boolean(activeAction && JUMP_ACTIONS.has(activeAction));
  }

  function buildPreviewState(isGrounded = true) {
    const isWalkJumpAnim = walkJumpPhase === WALK_JUMP_PHASE.ANIM;
    const jumpOnGround = Boolean(
      activeAction
      && JUMP_ACTIONS.has(activeAction)
      && isGrounded
      && !airborneFromJump
      && !isWalkJumpAnim
    );

    return {
      locomotionState,
      blocksHorizontalMovement: Boolean(
        activeAction && (BLOCKING_ACTIONS.has(activeAction) || jumpOnGround)
      ),
      isJumpAction: Boolean(activeAction && JUMP_ACTIONS.has(activeAction)),
      walkJumpPhase
    };
  }

  function finishWalkJump() {
    if (activeAction === ACTION.JUMP_STAND) {
      endAction();
    }

    clearWalkJump();
  }

  function finishRunJumpOver() {
    if (activeAction === ACTION.JUMP_OVER) {
      endAction();
    }

    clearWalkJump();
  }

  function enterWalkJumpPostLock() {
    if (walkJumpPhase !== WALK_JUMP_PHASE.ANIM) {
      return;
    }

    walkJumpPhase = WALK_JUMP_PHASE.POST_LOCK;
    walkJumpElapsed = 0;
  }

  function getRunJumpAirborneSeconds() {
    return Math.max(runJumpAirborneSeconds, 0.001);
  }

  function getRunJumpMoveEndSeconds() {
    return runJumpLandingSeconds + runJumpPostLandingMoveSeconds;
  }

  function getRunJumpInputUnlockSeconds() {
    return getRunJumpClipEndSeconds();
  }

  function getWalkJumpLiftoffSeconds() {
    return walkJumpIsRunning ? runJumpLiftoffSeconds : walkJumpLiftoffSeconds;
  }

  function getWalkJumpLandingSeconds() {
    return walkJumpIsRunning ? runJumpLandingSeconds : walkJumpLandingSeconds;
  }

  function tryStartLocomotionJump(input, jumpRequest) {
    const isRunJumpOver = jumpRequest.action === ACTION.JUMP_OVER && Boolean(jumpRequest.isRunning);

    if (!isLocomotionJumpRequest(jumpRequest) && !isRunJumpOver) {
      return false;
    }

    const targetAction = isRunJumpOver ? ACTION.JUMP_OVER : ACTION.JUMP_STAND;

    if (activeAction && !canOverrideWith(targetAction)) {
      return false;
    }

    startWalkJump(input, jumpRequest);

    if (walkJumpIsRunning) {
      beginAction(ACTION.JUMP_OVER, locomotionState);
    }

    return true;
  }

  function update(input, context) {
    const {
      isGrounded,
      horizontalSpeed = 0,
      justLanded = false,
      actionFinished = null,
      deltaSeconds = 0
    } = context;

    jumpRetrigger = false;

    if (actionFinished === ACTION.JUMP_STAND && walkJumpPhase === WALK_JUMP_PHASE.ANIM) {
      enterWalkJumpPostLock();
    } else if (
      actionFinished === ACTION.JUMP_OVER
      && walkJumpPhase === WALK_JUMP_PHASE.ANIM
      && walkJumpIsRunning
    ) {
      // Run locomotion jump: POST_LOCK is driven by landing timeline only.
    } else if (actionFinished && activeAction === actionFinished) {
      if (!JUMP_ACTIONS.has(actionFinished) || isGrounded) {
        endAction();
      }
    }

    if (justLanded && airborneFromJump) {
      lockLocomotionAnimAfterLanding();
      airborneFromJump = false;
    }

    if (input.jumpRequest && isGrounded && !walkJumpPhase) {
      if (!tryStartLocomotionJump(input, input.jumpRequest)) {
        if (activeAction && JUMP_ACTIONS.has(activeAction) && input.jumpRequest.action === activeAction) {
          jumpRetrigger = true;
        } else if (activeAction !== input.jumpRequest.action && canOverrideWith(input.jumpRequest.action)) {
          beginAction(input.jumpRequest.action, locomotionState);
        } else if (!activeAction && canOverrideWith(input.jumpRequest.action)) {
          beginAction(input.jumpRequest.action, locomotionState);
        }
      }
    } else if (input.jumpRequest && !isGrounded && activeAction && JUMP_ACTIONS.has(activeAction)
      && input.jumpRequest.action === activeAction) {
      jumpRetrigger = true;
    } else if (input.throwRequest && activeAction !== ACTION.THROW && canOverrideWith(ACTION.THROW)) {
      beginAction(ACTION.THROW, locomotionState);
    } else if (input.danceRequest && activeAction !== ACTION.DANCE && canOverrideWith(ACTION.DANCE)) {
      beginAction(ACTION.DANCE, locomotionState);
    }

    if (walkJumpPhase === WALK_JUMP_PHASE.DECEL && !walkJumpIsRunning) {
      walkJumpElapsed += deltaSeconds;

      if (walkJumpElapsed >= getWalkJumpDecelSeconds()) {
        beginAction(ACTION.JUMP_STAND, locomotionState);
        walkJumpPhase = WALK_JUMP_PHASE.ANIM;
        walkJumpElapsed = 0;
        walkJumpAnimElapsed = 0;
        walkJumpTimelineElapsed = 0;
      }
    } else if (walkJumpPhase === WALK_JUMP_PHASE.ANIM) {
      walkJumpAnimElapsed += deltaSeconds;
      walkJumpTimelineElapsed += deltaSeconds;

      if (walkJumpIsRunning && walkJumpTimelineElapsed >= getRunJumpClipEndSeconds()) {
        finishRunJumpOver();
      }
    } else if (walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK) {
      walkJumpElapsed += deltaSeconds;
      walkJumpTimelineElapsed += deltaSeconds;

      if (walkJumpIsRunning) {
        finishRunJumpOver();
      } else if (walkJumpElapsed >= getWalkJumpPostLockSeconds()) {
        finishWalkJump();
      }
    }

    locomotionState = resolveLocomotion(input, horizontalSpeed);

    if (activeAction && JUMP_ACTIONS.has(activeAction) && isGrounded && !input.jumpRequest) {
      resumeLocomotion = locomotionState;
    }

    const animLocomotionState = resolveAnimLocomotion(locomotionState);
    const isWalkJumpAnim = walkJumpPhase === WALK_JUMP_PHASE.ANIM;
    const walkJumpHorizontalMoveActive = walkJumpIsRunning
      ? (
        Boolean(walkJumpPhase)
        && walkJumpTimelineElapsed >= getWalkJumpLiftoffSeconds()
        && walkJumpTimelineElapsed < getRunJumpHorizontalMoveEndSeconds()
      )
      : (
        (walkJumpPhase === WALK_JUMP_PHASE.ANIM || walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK)
        && walkJumpTimelineElapsed >= walkJumpMoveStartSeconds
        && walkJumpTimelineElapsed < walkJumpMoveEndSeconds
      );
    const walkJumpAnimInAirborne = isWalkJumpAnim
      && (
        walkJumpIsRunning
          ? walkJumpTimelineElapsed >= getWalkJumpLiftoffSeconds()
            && walkJumpTimelineElapsed < getWalkJumpLandingSeconds()
          : walkJumpTimelineElapsed >= getWalkJumpLiftoffSeconds()
            && walkJumpTimelineElapsed < getWalkJumpLandingSeconds()
      );
    const walkJumpVerticalOffsetY = walkJumpIsRunning && walkJumpPhase
      ? computeJumpOverVisualOffsetY(
        walkJumpTimelineElapsed,
        walkJumpPhase,
        getWalkJumpLiftoffSeconds(),
        getWalkJumpLandingSeconds()
      )
      : 0;
    const jumpOnGround = Boolean(
      activeAction
      && JUMP_ACTIONS.has(activeAction)
      && isGrounded
      && !airborneFromJump
      && !isWalkJumpAnim
    );

    return {
      locomotionState,
      animLocomotionState,
      activeAction,
      resumeLocomotion,
      locomotionAnimLocked: landingAnimDelayMs > 0 && performance.now() < locomotionAnimLockUntil,
      blocksHorizontalMovement: Boolean(
        activeAction && (BLOCKING_ACTIONS.has(activeAction) || jumpOnGround)
      ),
      blocksPlayerInput: shouldBlockPlayerInput(),
      isJumpAction: Boolean(activeAction && JUMP_ACTIONS.has(activeAction)),
      allowsAirMove: Boolean(activeAction && JUMP_ACTIONS.has(activeAction)),
      jumpRetrigger,
      walkJumpPhase,
      walkJumpDecelProgress: walkJumpPhase === WALK_JUMP_PHASE.DECEL
        ? Math.min(walkJumpElapsed / getWalkJumpDecelSeconds(), 1)
        : 0,
      walkJumpAnimElapsed,
      walkJumpTimelineElapsed,
      walkJumpAnimInAirborne,
      walkJumpHorizontalMoveActive,
      walkJumpUsesAnimRootMotion: false,
      walkJumpIsRunning,
      walkJumpDirection,
      walkJumpVerticalOffsetY,
      walkJumpFreezeActionClip: false
    };
  }

  function reset() {
    locomotionState = LOCOMOTION.IDLE;
    activeAction = null;
    resumeLocomotion = LOCOMOTION.IDLE;
    locomotionAnimLockUntil = 0;
    airborneFromJump = false;
    jumpRetrigger = false;
    clearWalkJump();
  }

  function forceEndAction() {
    activeAction = null;
    clearWalkJump();
  }

  return {
    update,
    reset,
    forceEndAction,
    getLocomotionState: () => locomotionState,
    getActiveAction: () => activeAction,
    isJumpAction: () => Boolean(activeAction && JUMP_ACTIONS.has(activeAction)),
    blocksPlayerInput: shouldBlockPlayerInput,
    blocksHorizontalMovement: () => Boolean(activeAction && BLOCKING_ACTIONS.has(activeAction)),
    getPreviewState: buildPreviewState
  };
}
