/**
 * Offline cross-tests for character state/input timing.
 * Run: node metaverse/scripts/character-cross-test.mjs
 */
import { createCharacterStateMachine, ACTION, LOCOMOTION, WALK_JUMP_PHASE } from "../src/controllers/CharacterStateMachine.js";
import { createMovementController } from "../src/controllers/MovementController.js";
import { CONTROLLER_SETTINGS, resolveJumpControllerSettings } from "../src/angji-character-config.js";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${name}`);
    return;
  }

  failed += 1;
  console.error(`  FAIL ${name}`);
}

function baseInput(overrides = {}) {
  return {
    hasMovementInput: false,
    wantsRun: false,
    blocksLocomotion: false,
    jumpRequest: null,
    throwRequest: false,
    danceRequest: false,
    ...overrides
  };
}

console.log("Character cross-tests\n");

{
  console.log("1) No jump input lock (PDF: air move allowed)");
  const sm = createCharacterStateMachine();

  sm.update(baseInput({
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false }
  }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("jump action active after request", sm.isJumpAction());

  sm.update(baseInput({ hasMovementInput: true, wantsRun: true }), {
    isGrounded: false,
    deltaSeconds: 0.016,
    horizontalSpeed: 0.04,
    justLanded: false,
    actionFinished: null
  });

  assert("run state while airborne with shift", sm.getLocomotionState() === LOCOMOTION.RUN);
}

{
  console.log("\n2b) Shift release drops to walk even while moving");
  const sm = createCharacterStateMachine();
  sm.update(baseInput({ wantsRun: true, hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0.08,
    justLanded: false,
    actionFinished: null
  });

  sm.update(baseInput({ hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0.08,
    justLanded: false,
    actionFinished: null
  });

  assert("shift release with movement drops to walk", sm.getLocomotionState() === LOCOMOTION.WALK);
}

{
  console.log("\n2) Direct run on Shift+move (no run inertia)");
  const sm = createCharacterStateMachine();

  sm.update(baseInput({ wantsRun: true, hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("shift+move enters run immediately", sm.getLocomotionState() === LOCOMOTION.RUN);

  sm.update(baseInput({ hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("release shift drops to walk", sm.getLocomotionState() === LOCOMOTION.WALK);
}

{
  console.log("\n3) Idle when keys released even with momentum");
  const sm = createCharacterStateMachine();
  sm.update(baseInput(), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 0.1,
    horizontalSpeed: 0.05,
    justLanded: false,
    actionFinished: null
  });

  assert("no input -> idle even while coasting", sm.getLocomotionState() === LOCOMOTION.IDLE);
}

{
  console.log("\n3b) Walk starts immediately on movement input");
  const sm = createCharacterStateMachine();
  sm.update(baseInput({ hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 0.02,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("walk on input even with low movement blend", sm.getLocomotionState() === LOCOMOTION.WALK);
}

{
  console.log("\n4) Throw blocks locomotion state retention");
  const sm = createCharacterStateMachine();
  sm.update(baseInput({ throwRequest: true, hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("throw becomes active action", sm.getActiveAction() === ACTION.THROW);
  assert("throw blocks horizontal movement", sm.blocksHorizontalMovement());
}

{
  console.log("\n5) Jump action persists until clip finishes on ground");
  const sm = createCharacterStateMachine();
  sm.update(baseInput({
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false }
  }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("jump action active after request", sm.isJumpAction());

  sm.update(baseInput({ hasMovementInput: true }), {
    isGrounded: false,
    deltaSeconds: 0.016,
    horizontalSpeed: 0.04,
    justLanded: false,
    actionFinished: null
  });

  assert("jump action kept while airborne", sm.isJumpAction());

  sm.update(baseInput({ hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    horizontalSpeed: 0.02,
    justLanded: true,
    actionFinished: null
  });

  assert("jump persists through landing until clip ends", sm.isJumpAction());

  sm.update(baseInput({ hasMovementInput: true }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    horizontalSpeed: 0.02,
    justLanded: false,
    actionFinished: ACTION.JUMP_STAND
  });

  assert("jump ends after clip finishes on ground", !sm.isJumpAction());
}

{
  console.log("\n6) Movement input allowed during jump action");
  const sm = createCharacterStateMachine();

  sm.update(baseInput({
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false },
    hasMovementInput: true
  }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("jump action active", sm.isJumpAction());
  assert("does not block horizontal movement during jump", !sm.blocksHorizontalMovement());
}

{
  console.log("\n7) Walk jump carries horizontal speed proportional to movement");
  const BABYLON = {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }

      clone() {
        return new BABYLON.Vector3(this.x, this.y, this.z);
      }

      normalize() {
        const len = Math.hypot(this.x, this.y, this.z) || 1;
        this.x /= len;
        this.y /= len;
        this.z /= len;
        return this;
      }
    }
  };

  const movement = createMovementController(CONTROLLER_SETTINGS);
  const stateOutput = {
    locomotionState: LOCOMOTION.WALK,
    blocksHorizontalMovement: false,
    isJumpAction: false
  };

  for (let i = 0; i < 30; i += 1) {
    movement.computeMovement({
      hasMovementInput: true,
      wantsRun: false,
      movement: new BABYLON.Vector3(0, 0, -1),
      jumpRequest: null,
      blocksLocomotion: false
    }, stateOutput, {
      isGrounded: true,
      deltaSeconds: 0.016,
      deltaScale: 1,
      modelSpeedMultiplier: 3,
      facingYaw: 0,
      BABYLON
    });
  }

  const beforeJump = movement.getHorizontalSpeed();
  const walkJumpState = {
    locomotionState: LOCOMOTION.WALK,
    blocksHorizontalMovement: false,
    isJumpAction: false,
    walkJumpPhase: WALK_JUMP_PHASE.DECEL,
    walkJumpDecelProgress: 0,
    walkJumpDirection: { x: 0, z: -1 }
  };

  movement.computeMovement({
    hasMovementInput: true,
    wantsRun: false,
    movement: new BABYLON.Vector3(0, 0, -1),
    jumpRequest: null,
    blocksLocomotion: false
  }, walkJumpState, {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON
  });

  const duringDecel = movement.getHorizontalSpeed();
  assert("walk speed builds before jump", beforeJump > 0.02);
  assert("walk jump decel keeps some speed at start", duringDecel > 0.02);

  movement.computeMovement({
    hasMovementInput: false,
    wantsRun: false,
    movement: new BABYLON.Vector3(0, 0, 0),
    jumpRequest: null,
    blocksLocomotion: true
  }, {
    ...walkJumpState,
    walkJumpDecelProgress: 1,
    walkJumpPhase: WALK_JUMP_PHASE.ANIM,
    walkJumpAnimInAirborne: false,
    walkJumpHorizontalMoveActive: false,
    isJumpAction: true
  }, {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON
  });

  assert("walk jump anim on ground before move window holds still", movement.getHorizontalSpeed() < 0.001);

  movement.computeMovement({
    hasMovementInput: false,
    wantsRun: false,
    movement: new BABYLON.Vector3(0, 0, 0),
    jumpRequest: null,
    blocksLocomotion: true
  }, {
    ...walkJumpState,
    walkJumpDecelProgress: 1,
    walkJumpPhase: WALK_JUMP_PHASE.ANIM,
    walkJumpAnimInAirborne: true,
    walkJumpHorizontalMoveActive: true,
    isJumpAction: true
  }, {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON
  });

  const walkSpeed = movement.getTargetSpeed(false, 3);
  const duringAnim = movement.getHorizontalSpeed();
  assert("walk jump moves at walking speed during move window", Math.abs(duringAnim - walkSpeed) < 0.001);
  assert("idle jump without movement stays near zero", (() => {
    const idleMove = createMovementController(CONTROLLER_SETTINGS);
    idleMove.computeMovement({
      hasMovementInput: false,
      wantsRun: false,
      movement: new BABYLON.Vector3(0, 0, 0),
      jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: false },
      blocksLocomotion: false
    }, stateOutput, {
      isGrounded: true,
      deltaSeconds: 0.016,
      deltaScale: 1,
      modelSpeedMultiplier: 3,
      facingYaw: 0,
      jumpForce: CONTROLLER_SETTINGS.jumpForce,
      BABYLON
    });
    return idleMove.getHorizontalSpeed() < 0.001;
  })());
}

{
  console.log("\n7b) Walk jump move: liftoff+0.2s through landing+0.5s");
  const jumpSettings = resolveJumpControllerSettings(CONTROLLER_SETTINGS);
  assert(
    "move starts at liftoff + 0.2s",
    Math.abs(
      jumpSettings.walkJumpMoveStartSeconds
      - (jumpSettings.walkJumpLiftoffSeconds + 0.2)
    ) < 0.001
  );
  assert(
    "move ends at landing + 0.5s",
    Math.abs(
      jumpSettings.walkJumpMoveEndSeconds
      - (jumpSettings.walkJumpLandingSeconds + 0.5)
    ) < 0.001
  );

  const sm = createCharacterStateMachine({
    walkJumpDecelSeconds: 0.01,
    walkJumpPostLockSeconds: 0.05,
    walkJumpLiftoffSeconds: 0.4,
    walkJumpLandingSeconds: 0.8,
    walkJumpMoveStartSeconds: 0.6,
    walkJumpMoveEndSeconds: 1.3
  });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: false,
    movement: { x: 0, y: 0, z: -1 },
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: true },
    blocksLocomotion: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.02,
    horizontalSpeed: 0.05,
    justLanded: false,
    actionFinished: null
  };

  sm.update(moveInput, ctx);
  let state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  while (state.walkJumpPhase === WALK_JUMP_PHASE.DECEL) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }

  while (state.walkJumpPhase === WALK_JUMP_PHASE.ANIM && state.walkJumpTimelineElapsed + ctx.deltaSeconds < 0.6) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("no horizontal move before liftoff + 0.2s", !state.walkJumpHorizontalMoveActive);

  state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  assert("horizontal move active after liftoff + 0.2s", state.walkJumpHorizontalMoveActive);

  while (state.walkJumpHorizontalMoveActive) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("horizontal move stops after landing + 0.5s", !state.walkJumpHorizontalMoveActive);
  assert(
    "move ended at landing + 0.5s on timeline",
    state.walkJumpTimelineElapsed >= 1.3 - ctx.deltaSeconds
  );
}

{
  console.log("\n7c) Post walk jump speed ramp (walk 0.5s / run 1s)");
  const BABYLON = {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }

      clone() {
        return new BABYLON.Vector3(this.x, this.y, this.z);
      }

      normalize() {
        const len = Math.hypot(this.x, this.z);
        if (len <= 0.000001) {
          return this;
        }
        this.x /= len;
        this.z /= len;
        return this;
      }
    }
  };
  const movement = createMovementController({
    ...CONTROLLER_SETTINGS,
    walkJumpPostMoveRampWalkSeconds: 0.5,
    walkJumpPostMoveRampRunSeconds: 1
  });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: false,
    movement: new BABYLON.Vector3(0, 0, -1),
    jumpRequest: null,
    blocksLocomotion: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.1,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    BABYLON
  };
  const animState = {
    locomotionState: LOCOMOTION.WALK,
    blocksHorizontalMovement: false,
    isJumpAction: true,
    walkJumpPhase: WALK_JUMP_PHASE.ANIM,
    walkJumpIsRunning: false,
    walkJumpHorizontalMoveActive: true,
    walkJumpDirection: { x: 0, z: -1 }
  };

  movement.computeMovement(moveInput, animState, ctx);
  const postLockState = {
    locomotionState: LOCOMOTION.WALK,
    blocksHorizontalMovement: false,
    isJumpAction: false,
    walkJumpPhase: WALK_JUMP_PHASE.POST_LOCK,
    walkJumpHorizontalMoveActive: false
  };

  movement.computeMovement(moveInput, postLockState, ctx);
  const afterJump = movement.computeMovement(moveInput, {
    ...postLockState,
    walkJumpPhase: null,
    locomotionState: LOCOMOTION.WALK
  }, ctx);
  const fullWalkSpeed = movement.getTargetSpeed(false, 3);
  assert("walk ramp starts below full walk speed", afterJump.horizontalSpeed < fullWalkSpeed * 0.5);

  let rampDone = afterJump;
  for (let i = 0; i < 6; i += 1) {
    rampDone = movement.computeMovement(moveInput, {
      locomotionState: LOCOMOTION.WALK,
      blocksHorizontalMovement: false,
      isJumpAction: false,
      walkJumpPhase: null
    }, ctx);
  }
  assert("walk ramp reaches full walk speed", Math.abs(rampDone.horizontalSpeed - fullWalkSpeed) < 0.001);
}

{
  console.log("\n8) Re-jump during active jumpStand retriggers animation");
  const sm = createCharacterStateMachine();

  sm.update(baseInput({
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: false }
  }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("first jump active", sm.isJumpAction());

  const second = sm.update(baseInput({
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: false }
  }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("re-jump sets jumpRetrigger", second.jumpRetrigger === true);
  assert("still in jump action after re-jump", sm.isJumpAction());
}

{
  console.log("\n9) Run jump over: immediate Jump_Over, walk-speed airborne, no root motion");
  const jumpSettings = resolveJumpControllerSettings(CONTROLLER_SETTINGS);
  assert("run jump has no decel phase", jumpSettings.runJumpDecelSeconds === 0);
  assert("run jump input unlock at clip end", jumpSettings.runJumpInputUnlockSeconds === 2.3);
  assert("run jump post-landing move default is 0.5s", jumpSettings.runJumpPostLandingMoveSeconds === 0.5);
  assert("run jump landing matches Jump_Over clip frame", jumpSettings.runJumpLandingSeconds === 1.6);
  assert("run jump airborne window", Math.abs(jumpSettings.runJumpAirborneSeconds - 0.999) < 0.01);
  assert("run jump move duration is landing + 0.5s", Math.abs(jumpSettings.runJumpMoveDurationSeconds - 2.1) < 0.01);
  assert("run jump clip end matches Jump_Over duration", jumpSettings.runJumpClipEndSeconds === 2.3);
  assert("run jump sequence ends at clip end", jumpSettings.runJumpSequenceEndSeconds === 2.3);
  assert("walk jump still plays Jump_Stand in ~2s", jumpSettings.jumpAnimPlaySeconds === 2);

  const sm = createCharacterStateMachine({
    runJumpPostLockSeconds: 0.2,
    runJumpPostLandingMoveSeconds: 0.5,
    runJumpLandingSeconds: 0.3,
    runJumpLiftoffSeconds: 0.1,
    runJumpClipEndSeconds: 0.35
  });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: true,
    movement: { x: 0, y: 0, z: -1 },
    jumpRequest: { action: ACTION.JUMP_OVER, isRunning: true, isDoubleTap: false, hasMovement: true },
    blocksLocomotion: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.02,
    horizontalSpeed: 0.12,
    justLanded: false,
    actionFinished: null
  };

  const start = sm.update(moveInput, ctx);
  assert("run jump starts anim immediately", start.walkJumpPhase === WALK_JUMP_PHASE.ANIM);
  assert("run jump flagged as running", start.walkJumpIsRunning === true);
  assert("run jump Jump_Over active immediately", start.activeAction === ACTION.JUMP_OVER);
  assert("run jump input blocked from start", start.blocksPlayerInput === true);
  assert("run jump does not use root motion", start.walkJumpUsesAnimRootMotion === false);

  let state = start;
  while (state.walkJumpTimelineElapsed < 0.15) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("run jump input locked mid-anim", state.blocksPlayerInput === true);
  assert("run jump horizontal move active mid-anim", state.walkJumpHorizontalMoveActive === true);

  while (state.walkJumpPhase === WALK_JUMP_PHASE.ANIM) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("run jump ends at clip end without post-lock hold", state.walkJumpPhase === null);
  assert("run jump action cleared at clip end", state.activeAction === null);
  assert("run jump input unblocked when sequence ends", !state.blocksPlayerInput);
  assert("run jump horizontal move ended with sequence", !state.walkJumpHorizontalMoveActive);

  const BABYLON = {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }

      clone() {
        return new BABYLON.Vector3(this.x, this.y, this.z);
      }

      normalize() {
        return this;
      }
    }
  };
  const movement = createMovementController(CONTROLLER_SETTINGS);
  let anyImpulse = false;
  for (let i = 0; i < 30; i += 1) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
    const result = movement.computeMovement({
      hasMovementInput: true,
      wantsRun: true,
      movement: new BABYLON.Vector3(0, 0, -1),
      jumpRequest: null,
      blocksLocomotion: true
    }, state, {
      isGrounded: true,
      deltaSeconds: 0.016,
      deltaScale: 1,
      modelSpeedMultiplier: 3,
      facingYaw: 0,
      jumpForce: CONTROLLER_SETTINGS.jumpForce,
      BABYLON
    });

    if (result.verticalImpulse > 0) {
      anyImpulse = true;
      break;
    }
  }

  assert("run jump never applies vertical impulse", !anyImpulse);

  const runJumpMove = movement.computeMovement({
    hasMovementInput: true,
    wantsRun: true,
    movement: new BABYLON.Vector3(0, 0, -1),
    jumpRequest: null,
    blocksLocomotion: true
  }, {
    ...state,
    walkJumpPhase: WALK_JUMP_PHASE.ANIM,
    walkJumpIsRunning: true,
    walkJumpUsesAnimRootMotion: false,
    walkJumpHorizontalMoveActive: true,
    walkJumpDirection: { x: 0, z: -1 },
    isJumpAction: true
  }, {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON
  });
  const walkTargetSpeed = movement.getTargetSpeed(false, 3);
  assert("run jump airborne move uses walk speed", Math.abs(runJumpMove.horizontalSpeed - walkTargetSpeed) < 0.001);

  movement.computeMovement({
    hasMovementInput: true,
    wantsRun: true,
    movement: new BABYLON.Vector3(0, 0, -1),
    jumpRequest: null,
    blocksLocomotion: false
  }, {
    ...state,
    walkJumpPhase: WALK_JUMP_PHASE.ANIM,
    walkJumpIsRunning: true,
    walkJumpUsesAnimRootMotion: false,
    walkJumpHorizontalMoveActive: true,
    walkJumpDirection: { x: 0, z: -1 },
    isJumpAction: true,
    locomotionState: LOCOMOTION.RUN
  }, {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON
  });

  const exitMove = movement.computeMovement({
    hasMovementInput: true,
    wantsRun: false,
    movement: new BABYLON.Vector3(0, 0, -1),
    jumpRequest: null,
    blocksLocomotion: false
  }, {
    locomotionState: LOCOMOTION.RUN,
    blocksHorizontalMovement: false,
    isJumpAction: false,
    walkJumpPhase: null,
    walkJumpIsRunning: false
  }, {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON
  });
  assert("run jump exit keeps walk-speed momentum", Math.abs(exitMove.horizontalSpeed - walkTargetSpeed) < 0.001);
  assert("run jump exit seeds locomotion blend", movement.getMovementBlend() >= 0.99);
}

{
  console.log("\n9b) Run jump over double-tap uses locomotion timeline (not physics impulse)");
  const sm = createCharacterStateMachine({
    runJumpPostLockSeconds: 0.2,
    runJumpPostLandingMoveSeconds: 0.5,
    runJumpLandingSeconds: 0.3,
    runJumpLiftoffSeconds: 0.1,
    runJumpClipEndSeconds: 0.35
  });
  const start = sm.update({
    hasMovementInput: true,
    wantsRun: true,
    movement: { x: 0, z: -1 },
    blocksLocomotion: false,
    jumpRequest: {
      action: ACTION.JUMP_OVER,
      isRunning: true,
      isDoubleTap: true,
      hasMovement: true
    },
    throwRequest: false,
    danceRequest: false
  }, {
    isGrounded: true,
    deltaSeconds: 0.016,
    horizontalSpeed: 0.2,
    justLanded: false,
    actionFinished: null
  });

  assert("double-tap run jump starts walk-jump timeline", start.walkJumpPhase === WALK_JUMP_PHASE.ANIM);
  assert("double-tap run jump activates Jump_Over", start.activeAction === ACTION.JUMP_OVER);
  assert("double-tap run jump does not use physics flag", start.walkJumpUsesAnimRootMotion === false);
  assert("double-tap run jump enables horizontal move after liftoff", start.walkJumpHorizontalMoveActive === false);
  let afterLiftoff = start;
  while (afterLiftoff.walkJumpTimelineElapsed < 0.12) {
    afterLiftoff = sm.update({
      hasMovementInput: true,
      wantsRun: true,
      movement: { x: 0, z: -1 },
      blocksLocomotion: false,
      jumpRequest: null,
      throwRequest: false,
      danceRequest: false
    }, {
      isGrounded: true,
      deltaSeconds: 0.016,
      horizontalSpeed: 0.2,
      justLanded: false,
      actionFinished: null
    });
  }
  assert("double-tap run jump moves after hand-plant liftoff", afterLiftoff.walkJumpHorizontalMoveActive === true);
}

{
  console.log("\n10) Stand jump (idle + space) uses animation only — no vertical impulse");
  const BABYLON = {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }

      clone() {
        return new BABYLON.Vector3(this.x, this.y, this.z);
      }

      normalize() {
        return this;
      }
    }
  };

  const movement = createMovementController({
    ...CONTROLLER_SETTINGS,
    jumpTakeoffDelaySeconds: 0.05
  });
  const jumpState = {
    locomotionState: LOCOMOTION.IDLE,
    blocksHorizontalMovement: true,
    isJumpAction: true,
    jumpRetrigger: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON
  };

  movement.computeMovement({
    hasMovementInput: false,
    wantsRun: false,
    movement: new BABYLON.Vector3(0, 0, 0),
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: false },
    blocksLocomotion: false
  }, jumpState, ctx);

  let anyImpulse = false;
  for (let i = 0; i < 20; i += 1) {
    const result = movement.computeMovement({
      hasMovementInput: false,
      wantsRun: false,
      movement: new BABYLON.Vector3(0, 0, 0),
      jumpRequest: null,
      blocksLocomotion: false
    }, jumpState, ctx);

    if (result.verticalImpulse > 0) {
      anyImpulse = true;
      break;
    }
  }

  assert("stand jump never applies vertical impulse", !anyImpulse);
}

{
  console.log("\n11) Walk jump phases: decel → anim → post-lock input freeze");
  const sm = createCharacterStateMachine({
    walkJumpDecelSeconds: 0.05,
    walkJumpPostLockSeconds: 0.05
  });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: false,
    movement: { x: 0, y: 0, z: -1 },
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: true },
    blocksLocomotion: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.02,
    horizontalSpeed: 0.05,
    justLanded: false,
    actionFinished: null
  };

  const start = sm.update(moveInput, ctx);
  assert("walk jump starts in decel", start.blocksPlayerInput);
  assert("input blocked during decel", start.blocksPlayerInput === true);

  const mid = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  let animState = mid;
  for (let i = 0; i < 4 && animState.walkJumpPhase === WALK_JUMP_PHASE.DECEL; i += 1) {
    animState = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("walk jump enters anim after decel", animState.walkJumpPhase === WALK_JUMP_PHASE.ANIM);
  assert("input blocked during anim", animState.blocksPlayerInput === true);
  assert("jump stand active during anim", animState.activeAction === ACTION.JUMP_STAND);

  const afterAnim = sm.update({ ...moveInput, jumpRequest: null }, {
    ...ctx,
    actionFinished: ACTION.JUMP_STAND
  });
  assert("walk jump enters post-lock after anim", afterAnim.walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK);
  assert("walk jump keeps action during post-lock", afterAnim.activeAction === ACTION.JUMP_STAND);
  assert("input blocked during post-lock", afterAnim.blocksPlayerInput === true);

  let released = afterAnim;
  for (let i = 0; i < 4 && released.walkJumpPhase === WALK_JUMP_PHASE.POST_LOCK; i += 1) {
    released = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("walk jump releases input after post-lock", !released.walkJumpPhase);
  assert("input unblocked after post-lock", !released.blocksPlayerInput);
}

{
  console.log("\n12) Stand jump blocks all player input");
  const sm = createCharacterStateMachine();

  sm.update(baseInput({
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: false }
  }), {
    isGrounded: true,
    deltaSeconds: 0.016,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("stand jump blocks input", sm.blocksPlayerInput() === true);
}

{
  console.log("\n13) Walk-jump DECEL ignores duplicate jump (no parallel direct action)");
  const sm = createCharacterStateMachine({ walkJumpDecelSeconds: 0.05 });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: false,
    movement: { x: 0, y: 0, z: -1 },
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: true },
    blocksLocomotion: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.02,
    horizontalSpeed: 0.05,
    justLanded: false,
    actionFinished: null
  };

  const start = sm.update(moveInput, ctx);
  assert("walk jump decel active", start.walkJumpPhase === WALK_JUMP_PHASE.DECEL);

  const duplicate = sm.update(moveInput, ctx);
  assert("duplicate jump ignored during walk decel", duplicate.activeAction === null);
  assert("still in decel after duplicate jump", duplicate.walkJumpPhase === WALK_JUMP_PHASE.DECEL);
}

{
  console.log("\n14) Run jump finishes at clip-end timeline (not early clip end)");
  const sm = createCharacterStateMachine({
    runJumpLiftoffSeconds: 0.1,
    runJumpLandingSeconds: 0.4,
    runJumpClipEndSeconds: 0.6,
    runJumpPostLockSeconds: 0.2,
    runJumpPostLandingMoveSeconds: 0.5
  });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: true,
    movement: { x: 0, y: 0, z: -1 },
    jumpRequest: null,
    blocksLocomotion: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.02,
    horizontalSpeed: 0.12,
    justLanded: false,
    actionFinished: null
  };

  sm.update({
    ...moveInput,
    jumpRequest: { action: ACTION.JUMP_OVER, isRunning: true, isDoubleTap: false, hasMovement: true }
  }, ctx);

  const earlyClipEnd = sm.update(moveInput, {
    ...ctx,
    actionFinished: ACTION.JUMP_OVER
  });
  assert("early clip end keeps anim phase", earlyClipEnd.walkJumpPhase === WALK_JUMP_PHASE.ANIM);
  assert("run jump action stays active after early clip end", earlyClipEnd.activeAction === ACTION.JUMP_OVER);

  let landed = earlyClipEnd;
  while (landed.walkJumpPhase === WALK_JUMP_PHASE.ANIM) {
    landed = sm.update(moveInput, ctx);
  }
  assert("sequence finishes at clip-end timeline", landed.walkJumpPhase === null);
}

{
  console.log("\n15) Preview state exposes walk-jump phase for blend gating");
  const sm = createCharacterStateMachine({ walkJumpDecelSeconds: 0.05 });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: false,
    movement: { x: 0, y: 0, z: -1 },
    jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: true },
    blocksLocomotion: false
  };
  const ctx = {
    isGrounded: true,
    deltaSeconds: 0.02,
    horizontalSpeed: 0.05,
    justLanded: false,
    actionFinished: null
  };

  sm.update(moveInput, ctx);
  let preview = sm.getPreviewState(true);
  while (preview.walkJumpPhase === WALK_JUMP_PHASE.DECEL) {
    sm.update({ ...moveInput, jumpRequest: null }, ctx);
    preview = sm.getPreviewState(true);
  }

  assert("preview includes anim phase", preview.walkJumpPhase === WALK_JUMP_PHASE.ANIM);
}

{
  console.log("\n15) Run jump over — 3 principles cross-check");
  const settings = resolveJumpControllerSettings(CONTROLLER_SETTINGS);
  assert("principle 1: run jump has zero decel", settings.runJumpDecelSeconds === 0);
  assert("principle 2: airborne window from liftoff to landing", Math.abs(settings.runJumpAirborneSeconds - 0.999) < 0.01);
  assert("principle 2: move window adds 0.5s after landing", Math.abs(settings.runJumpMoveDurationSeconds - 2.1) < 0.01);
  assert("principle 3: keyboard unlock at clip end", settings.runJumpInputUnlockSeconds === 2.3);

  const sm = createCharacterStateMachine({
    runJumpPostLockSeconds: 0.2,
    runJumpPostLandingMoveSeconds: 0.5,
    runJumpLandingSeconds: 0.3,
    runJumpLiftoffSeconds: 0.1,
    runJumpClipEndSeconds: 0.35
  });
  const moveInput = {
    hasMovementInput: true,
    wantsRun: true,
    movement: { x: 0, y: 0, z: -1 },
    jumpRequest: { action: ACTION.JUMP_OVER, isRunning: true, isDoubleTap: false, hasMovement: true },
    blocksLocomotion: false
  };
  const ctx = { isGrounded: true, deltaSeconds: 0.02, horizontalSpeed: 0.12, justLanded: false, actionFinished: null };

  const start = sm.update(moveInput, ctx);
  assert("principle 1: Jump_Over active on first frame", start.activeAction === ACTION.JUMP_OVER);
  assert("principle 1: keyboard blocked on first frame", start.blocksPlayerInput === true);

  let state = start;
  while (state.walkJumpTimelineElapsed < 0.15) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("principle 2: vertical offset lifts off ground mid-air", state.walkJumpVerticalOffsetY > 0);

  while (state.walkJumpTimelineElapsed < 0.25) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("principle 2: walk-speed move active during air window", state.walkJumpHorizontalMoveActive === true);

  while (state.walkJumpPhase && state.walkJumpTimelineElapsed < 0.34) {
    state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  }
  assert("principle 3: keyboard blocked until clip end", state.blocksPlayerInput === true);
  state = sm.update({ ...moveInput, jumpRequest: null }, ctx);
  assert("principle 3: keyboard unlocks with animation completion", !state.blocksPlayerInput);
}

{
  console.log("\n16) Jump over visual offset peaks mid-air, zero before liftoff");
  const { computeJumpOverVisualOffsetY } = await import("../src/angji-character-config.js");
  assert("no offset before liftoff", computeJumpOverVisualOffsetY(0.3, "anim", 0.601, 1.6) === 0);
  const midAir = computeJumpOverVisualOffsetY(1.1, "anim", 0.601, 1.6);
  assert("mid-air offset is positive", midAir > 0.2);
  assert("landing offset returns to zero", computeJumpOverVisualOffsetY(1.6, "anim", 0.601, 1.6) === 0);
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
