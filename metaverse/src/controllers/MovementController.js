import {
  jumpRequestUsesPhysics,
  WALK_JUMP_PHASE
} from "./CharacterStateMachine.js?v=jump-over-fix22-tour-20260620";

export function createMovementController(settings = {}) {
  const {
    moveSpeed = 0.09,
    walkSpeedMultiplier = 0.5,
    runMultiplier = 2.3,
    movementBlendInSpeed = 5.5,
    movementBlendOutSpeed = 7,
    groundVelocityAccel = 14,
    jumpHorizontalCarryWalk = 1,
    jumpHorizontalCarryRun = 1,
    maxJumpHorizontalRatio = 1,
    airControlMultiplier = 0.28,
    airControlAccel = 4.5,
    airHorizontalDrag = 3.2,
    maxAirSpeedRatio = 0.45,
    landingHorizontalFriction = 0.86,
    jumpTakeoffDelaySeconds = 0.28,
    walkJumpPostMoveRampWalkSeconds = 0.5,
    walkJumpPostMoveRampRunSeconds = 1
  } = settings;

  let movementBlend = 0;
  let velocityX = 0;
  let velocityZ = 0;
  let wasGrounded = true;
  let lastLocomotionWasRun = false;
  let pendingJumpTakeoff = false;
  let pendingJumpElapsed = 0;
  let walkJumpDecelInitialSpeed = 0;
  let lastWalkJumpPhase = null;
  let postWalkJumpRampActive = false;
  let postWalkJumpRampElapsed = 0;
  let postWalkJumpRampDuration = 0;
  let postWalkJumpRampDirection = null;
  let lastWalkJumpDirection = null;
  let lastWalkJumpWasRunning = false;
  let lastWalkJumpUsesWalkSpeed = false;
  let postWalkJumpRampUsesWalkSpeed = false;

  function reset() {
    movementBlend = 0;
    velocityX = 0;
    velocityZ = 0;
    wasGrounded = true;
    lastLocomotionWasRun = false;
    pendingJumpTakeoff = false;
    pendingJumpElapsed = 0;
    walkJumpDecelInitialSpeed = 0;
    lastWalkJumpPhase = null;
    postWalkJumpRampActive = false;
    postWalkJumpRampElapsed = 0;
    postWalkJumpRampDuration = 0;
    postWalkJumpRampDirection = null;
    lastWalkJumpDirection = null;
    lastWalkJumpWasRunning = false;
    lastWalkJumpUsesWalkSpeed = false;
    postWalkJumpRampUsesWalkSpeed = false;
  }

  function getTargetSpeed(isRunning, modelSpeedMultiplier) {
    return moveSpeed * modelSpeedMultiplier
      * (isRunning ? runMultiplier : walkSpeedMultiplier);
  }

  function getHorizontalSpeed() {
    return Math.hypot(velocityX, velocityZ);
  }

  function isJustLanded(isGrounded) {
    return !wasGrounded && isGrounded;
  }

  function clampHorizontalSpeed(maxSpeed) {
    const speed = getHorizontalSpeed();
    if (speed <= maxSpeed || speed <= 0.000001) {
      return;
    }

    const scale = maxSpeed / speed;
    velocityX *= scale;
    velocityZ *= scale;
  }

  function setPlanarVelocity(direction, speed) {
    if (!direction || speed <= 0.000001) {
      velocityX = 0;
      velocityZ = 0;
      return;
    }

    velocityX = direction.x * speed;
    velocityZ = direction.z * speed;
  }

  function applyGroundVelocity(input, stateOutput, modelSpeedMultiplier, deltaSeconds) {
    if (postWalkJumpRampActive && postWalkJumpRampDirection) {
      postWalkJumpRampElapsed += deltaSeconds;
      const isRunning = !postWalkJumpRampUsesWalkSpeed && (
        lastLocomotionWasRun
        || input.wantsRun
        || stateOutput.locomotionState === "run"
      );
      const targetSpeed = getTargetSpeed(isRunning, modelSpeedMultiplier);
      const rampRatio = Math.min(postWalkJumpRampElapsed / postWalkJumpRampDuration, 1);

      setPlanarVelocity(postWalkJumpRampDirection, targetSpeed * rampRatio);

      if (rampRatio >= 1) {
        postWalkJumpRampActive = false;
        postWalkJumpRampDirection = null;
        postWalkJumpRampUsesWalkSpeed = false;
      }
      return;
    }

    if (input.hasMovementInput) {
      const direction = input.movement.clone().normalize();
      const isRunning = input.wantsRun;
      lastLocomotionWasRun = isRunning;
      const targetSpeed = getTargetSpeed(isRunning, modelSpeedMultiplier);

      const targetX = direction.x * targetSpeed;
      const targetZ = direction.z * targetSpeed;
      const accel = 1 - Math.exp(-groundVelocityAccel * deltaSeconds);

      velocityX += (targetX - velocityX) * accel;
      velocityZ += (targetZ - velocityZ) * accel;
      return;
    }

    postWalkJumpRampActive = false;
    postWalkJumpRampElapsed = 0;
    postWalkJumpRampDirection = null;
    lastLocomotionWasRun = false;
    velocityX = 0;
    velocityZ = 0;
  }

  function beginPostWalkJumpRamp(input, jumpContext = {}) {
    const planarDirection = input.hasMovementInput
      ? { x: input.movement.x, z: input.movement.z }
      : jumpContext.walkJumpDirection;

    if (!planarDirection) {
      return;
    }

    const length = Math.hypot(planarDirection.x, planarDirection.z);
    if (length <= 0.000001) {
      return;
    }

    postWalkJumpRampDirection = {
      x: planarDirection.x / length,
      z: planarDirection.z / length
    };

    const isRunning = !postWalkJumpRampUsesWalkSpeed && (
      input.wantsRun
      || jumpContext.walkJumpIsRunning
      || jumpContext.locomotionState === "run"
      || lastWalkJumpWasRunning
    );
    postWalkJumpRampUsesWalkSpeed = Boolean(jumpContext.walkJumpUsesWalkSpeed ?? lastWalkJumpUsesWalkSpeed);
    postWalkJumpRampActive = true;
    postWalkJumpRampElapsed = 0;
    postWalkJumpRampDuration = isRunning
      ? walkJumpPostMoveRampRunSeconds
      : walkJumpPostMoveRampWalkSeconds;
    lastLocomotionWasRun = isRunning;
  }

  function applyAirVelocity(input, stateOutput, modelSpeedMultiplier, deltaSeconds) {
    const drag = Math.exp(-airHorizontalDrag * deltaSeconds);
    velocityX *= drag;
    velocityZ *= drag;

    if (input.hasMovementInput && !stateOutput.blocksHorizontalMovement) {
      const direction = input.movement.clone().normalize();
      const isRunning = input.wantsRun;
      lastLocomotionWasRun = isRunning;
      const wishSpeed = getTargetSpeed(isRunning, modelSpeedMultiplier)
        * airControlMultiplier
        * Math.max(movementBlend, 0.35);
      const wishX = direction.x * wishSpeed;
      const wishZ = direction.z * wishSpeed;
      const accel = 1 - Math.exp(-airControlAccel * deltaSeconds);

      velocityX += (wishX - velocityX) * accel;
      velocityZ += (wishZ - velocityZ) * accel;
    }

    const maxAirSpeed = getTargetSpeed(lastLocomotionWasRun, modelSpeedMultiplier) * maxAirSpeedRatio;
    clampHorizontalSpeed(maxAirSpeed);

    if (getHorizontalSpeed() < 0.0003) {
      velocityX = 0;
      velocityZ = 0;
    }
  }

  function applyJumpHorizontalImpulse(input, stateOutput, modelSpeedMultiplier, facingYaw, BABYLON) {
    const isRunning = input.jumpRequest.isRunning
      || stateOutput.locomotionState === "run"
      || lastLocomotionWasRun;
    const hasMovement = input.jumpRequest.hasMovement || input.hasMovementInput;

    if (!hasMovement) {
      velocityX = 0;
      velocityZ = 0;
      lastLocomotionWasRun = isRunning;
      return;
    }

    if (stateOutput.blocksHorizontalMovement) {
      const forwardX = Math.sin(facingYaw);
      const forwardZ = Math.cos(facingYaw);
      const fallbackSpeed = getTargetSpeed(isRunning, modelSpeedMultiplier) * 0.35;
      velocityX = forwardX * fallbackSpeed;
      velocityZ = forwardZ * fallbackSpeed;
      lastLocomotionWasRun = isRunning;
      return;
    }

    const direction = input.movement.clone().normalize();
    const walkSpeed = getTargetSpeed(false, modelSpeedMultiplier) * jumpHorizontalCarryWalk;
    const runSpeed = getTargetSpeed(true, modelSpeedMultiplier) * jumpHorizontalCarryRun;
    const travelSpeed = isRunning ? runSpeed : walkSpeed;
    const currentSpeed = getHorizontalSpeed();
    const speed = currentSpeed > 0.000001
      ? Math.min(travelSpeed, Math.max(currentSpeed, travelSpeed * 0.85))
      : travelSpeed;

    velocityX = direction.x * speed;
    velocityZ = direction.z * speed;
    clampHorizontalSpeed(getTargetSpeed(isRunning, modelSpeedMultiplier) * maxJumpHorizontalRatio);
    lastLocomotionWasRun = isRunning;
  }

  function applyWalkJumpDecel(stateOutput, modelSpeedMultiplier) {
    const usesRunSpeed = Boolean(stateOutput.walkJumpIsRunning);

    if (lastWalkJumpPhase !== WALK_JUMP_PHASE.DECEL) {
      const currentSpeed = getHorizontalSpeed();
      walkJumpDecelInitialSpeed = currentSpeed > 0.000001
        ? currentSpeed
        : getTargetSpeed(usesRunSpeed, modelSpeedMultiplier);
    }

    const decelRatio = stateOutput.walkJumpDecelProgress ?? 0;
    const speed = walkJumpDecelInitialSpeed * (1 - decelRatio);
    const direction = stateOutput.walkJumpDirection;

    if (direction) {
      setPlanarVelocity(direction, speed);
      return;
    }

    const currentSpeed = getHorizontalSpeed();

    if (currentSpeed <= 0.000001) {
      velocityX = 0;
      velocityZ = 0;
      return;
    }

    const scale = speed / currentSpeed;
    velocityX *= scale;
    velocityZ *= scale;
  }

  function applyWalkJumpAnimVelocity(stateOutput, modelSpeedMultiplier) {
    const travelSpeed = getTargetSpeed(false, modelSpeedMultiplier);
    setPlanarVelocity(stateOutput.walkJumpDirection, travelSpeed);
    lastWalkJumpUsesWalkSpeed = Boolean(stateOutput.walkJumpIsRunning);
    lastLocomotionWasRun = Boolean(stateOutput.walkJumpIsRunning) && !lastWalkJumpUsesWalkSpeed;
  }

  function updateBlend(input, stateOutput, deltaSeconds, isGrounded) {
    const blocksMovement = stateOutput.blocksHorizontalMovement
      || stateOutput.walkJumpPhase === WALK_JUMP_PHASE.ANIM
      || stateOutput.walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK;

    if (input.hasMovementInput && !blocksMovement && isGrounded) {
      movementBlend = Math.min(1, movementBlend + movementBlendInSpeed * deltaSeconds);
      return;
    }

    if (!isGrounded) {
      movementBlend = Math.max(0, movementBlend - movementBlendOutSpeed * 0.25 * deltaSeconds);
      return;
    }

    const blendOutRate = input.hasMovementInput
      ? movementBlendOutSpeed
      : movementBlendOutSpeed * 3.5;
    movementBlend = Math.max(0, movementBlend - blendOutRate * deltaSeconds);
  }

  function computeMovement(input, stateOutput, context) {
    const {
      isGrounded,
      deltaSeconds,
      deltaScale,
      modelSpeedMultiplier = 1,
      facingYaw = 0,
      BABYLON
    } = context;

    const justLanded = !wasGrounded && isGrounded;
    let verticalImpulse = 0;
    const walkJumpPhase = stateOutput.walkJumpPhase ?? null;
    const justFinishedWalkJump = Boolean(lastWalkJumpPhase) && !walkJumpPhase;

    if (walkJumpPhase && stateOutput.walkJumpDirection) {
      lastWalkJumpDirection = {
        x: stateOutput.walkJumpDirection.x,
        z: stateOutput.walkJumpDirection.z
      };
      lastWalkJumpWasRunning = Boolean(stateOutput.walkJumpIsRunning);
    }

    if (justFinishedWalkJump) {
      const carrySpeed = lastWalkJumpUsesWalkSpeed
        ? getTargetSpeed(false, modelSpeedMultiplier)
        : getTargetSpeed(lastWalkJumpWasRunning, modelSpeedMultiplier);

      if (lastWalkJumpUsesWalkSpeed) {
        if (lastWalkJumpDirection) {
          setPlanarVelocity(lastWalkJumpDirection, carrySpeed);
        }

        movementBlend = 1;
        lastLocomotionWasRun = Boolean(input.wantsRun || lastWalkJumpWasRunning);
      } else {
        if (getHorizontalSpeed() < carrySpeed * 0.5 && lastWalkJumpDirection) {
          setPlanarVelocity(lastWalkJumpDirection, carrySpeed);
        }

        beginPostWalkJumpRamp(input, {
          walkJumpDirection: lastWalkJumpDirection,
          walkJumpIsRunning: lastWalkJumpWasRunning,
          walkJumpUsesWalkSpeed: lastWalkJumpUsesWalkSpeed,
          locomotionState: stateOutput.locomotionState
        });
      }
    }

    if (input.jumpRequest && isGrounded && jumpRequestUsesPhysics(input.jumpRequest)) {
      pendingJumpTakeoff = true;
      pendingJumpElapsed = 0;
      applyJumpHorizontalImpulse(input, stateOutput, modelSpeedMultiplier, facingYaw, BABYLON);
    } else if (pendingJumpTakeoff && stateOutput.jumpRetrigger) {
      pendingJumpElapsed = 0;
    }

    if (pendingJumpTakeoff) {
      pendingJumpElapsed += deltaSeconds;

      if (!stateOutput.isJumpAction || !isGrounded) {
        pendingJumpTakeoff = false;
        pendingJumpElapsed = 0;
      } else if (pendingJumpElapsed >= jumpTakeoffDelaySeconds) {
        verticalImpulse = context.jumpForce ?? 0.22;
        pendingJumpTakeoff = false;
        pendingJumpElapsed = 0;
      }
    }

    if (walkJumpPhase === WALK_JUMP_PHASE.DECEL) {
      applyWalkJumpDecel(stateOutput, modelSpeedMultiplier);
    } else if (walkJumpPhase === WALK_JUMP_PHASE.ANIM || walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK) {
      if (stateOutput.walkJumpHorizontalMoveActive) {
        applyWalkJumpAnimVelocity(stateOutput, modelSpeedMultiplier);
      } else {
        velocityX = 0;
        velocityZ = 0;
      }
    } else if (input.jumpRequest && isGrounded && !jumpRequestUsesPhysics(input.jumpRequest)) {
      velocityX = 0;
      velocityZ = 0;
    } else if (verticalImpulse > 0) {
      // Run/over jump takeoff — vertical physics handled by integrateVertical.
    } else if (isGrounded) {
      applyGroundVelocity(input, stateOutput, modelSpeedMultiplier, deltaSeconds);

      if (!stateOutput.isJumpAction) {
        pendingJumpTakeoff = false;
        pendingJumpElapsed = 0;
      }

      if (justLanded && !stateOutput.isJumpAction) {
        velocityX *= landingHorizontalFriction;
        velocityZ *= landingHorizontalFriction;
      }
    } else if (stateOutput.isJumpAction) {
      // Run jump: keep takeoff horizontal speed.
    } else {
      applyAirVelocity(input, stateOutput, modelSpeedMultiplier, deltaSeconds);
    }

    if (walkJumpPhase !== WALK_JUMP_PHASE.DECEL) {
      walkJumpDecelInitialSpeed = 0;
    }

    lastWalkJumpPhase = walkJumpPhase;
    wasGrounded = isGrounded;

    let moveDirection = null;
    let moveSpeed = 0;
    const horizontalSpeed = getHorizontalSpeed();

    if (horizontalSpeed > 0.000001) {
      moveDirection = new BABYLON.Vector3(velocityX / horizontalSpeed, 0, velocityZ / horizontalSpeed);
      moveSpeed = horizontalSpeed * deltaScale;
    }

    return {
      moveDirection,
      moveSpeed,
      movementBlend,
      verticalImpulse,
      horizontalSpeed,
      isAirborne: !isGrounded,
      postWalkJumpRampActive
    };
  }

  return {
    updateBlend,
    computeMovement,
    reset,
    getMovementBlend: () => movementBlend,
    getHorizontalSpeed,
    isJustLanded,
    getHorizontalVelocity: () => ({ x: velocityX, z: velocityZ }),
    getTargetSpeed
  };
}
