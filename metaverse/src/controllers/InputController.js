import { ACTION } from "./CharacterStateMachine.js?v=jump-over-fix22-tour-20260620";

const EMPTY_INPUT = {
  movement: null,
  hasMovementInput: false,
  wantsRun: false,
  hasForwardInput: false,
  hasBackwardInput: false,
  jumpRequest: null,
  throwRequest: false,
  danceRequest: false,
  blocksLocomotion: true
};

export function createInputController(options = {}) {
  const doubleTapMs = options.doubleTapMs ?? 320;

  let pendingJump = null;
  let pendingJumpOver = false;
  let pendingThrow = false;
  let pendingDance = false;
  let lastSpaceAt = null;
  let inputBlocked = false;

  function setInputBlocked(blocked) {
    inputBlocked = Boolean(blocked);

    if (inputBlocked) {
      pendingJump = null;
      pendingThrow = false;
      pendingDance = false;
    }
  }

  function buildJumpOverRequest(move, axes, BABYLON) {
    let movement = move.movement;
    let hasMovementInput = move.hasMovementInput;

    if (!hasMovementInput) {
      movement = axes.forward.clone().scale(-1);
      if (movement.lengthSquared() <= 0.000001) {
        movement = new BABYLON.Vector3(0, 0, -1);
      }
      hasMovementInput = true;
    }

    return {
      ...move,
      movement,
      hasMovementInput,
      wantsRun: true,
      jumpRequest: {
        action: ACTION.JUMP_OVER,
        isRunning: true,
        isDoubleTap: false,
        hasMovement: true
      },
      throwRequest: false,
      danceRequest: false,
      blocksLocomotion: false
    };
  }

  function queueJumpOver() {
    pendingJumpOver = true;
  }

  function isInputBlocked() {
    return inputBlocked;
  }

  function queueJump() {
    if (inputBlocked) {
      return;
    }

    const now = performance.now();
    pendingJump = lastSpaceAt !== null && now - lastSpaceAt <= doubleTapMs ? "double" : "single";
    lastSpaceAt = now;
  }

  function queueThrow() {
    if (inputBlocked) {
      return;
    }

    pendingThrow = true;
  }

  function queueDance() {
    if (inputBlocked) {
      return;
    }

    pendingDance = true;
  }

  function clear() {
    pendingJump = null;
    pendingJumpOver = false;
    pendingThrow = false;
    pendingDance = false;
    lastSpaceAt = null;
  }

  function readMovement(keys, axes, BABYLON) {
    const hasForwardInput = keys.has("w") || keys.has("arrowup");
    const hasBackwardInput = keys.has("s") || keys.has("arrowdown");
    const hasLeftInput = keys.has("a") || keys.has("arrowleft");
    const hasRightInput = keys.has("d") || keys.has("arrowright");
    const wantsRun = keys.has("shift") && (hasForwardInput || hasBackwardInput || hasLeftInput || hasRightInput);

    const movement = new BABYLON.Vector3(0, 0, 0);

    // Project WASD convention (camera-relative, inverted W/S + swapped A/D).
    if (hasForwardInput) movement.subtractInPlace(axes.forward);
    if (hasBackwardInput) movement.addInPlace(axes.forward);
    if (hasRightInput) movement.subtractInPlace(axes.right);
    if (hasLeftInput) movement.addInPlace(axes.right);

    return {
      movement,
      hasMovementInput: movement.lengthSquared() > 0,
      wantsRun,
      hasForwardInput,
      hasBackwardInput
    };
  }

  function buildJumpRequest(jumpPress, move, locomotionIsRun = false) {
    if (!jumpPress) {
      return null;
    }

    const wantsRun = move.wantsRun || locomotionIsRun;

    if (wantsRun) {
      return {
        action: ACTION.JUMP_OVER,
        isRunning: true,
        isDoubleTap: jumpPress === "double",
        hasMovement: move.hasMovementInput
      };
    }

    return {
      action: ACTION.JUMP_STAND,
      isRunning: false,
      isDoubleTap: false,
      hasMovement: move.hasMovementInput
    };
  }

  function consumeFrame(keys, axes, BABYLON, locomotionState) {
    if (pendingJumpOver) {
      pendingJumpOver = false;
      return buildJumpOverRequest(readMovement(keys, axes, BABYLON), axes, BABYLON);
    }

    if (inputBlocked) {
      pendingJump = null;
      pendingThrow = false;
      pendingDance = false;
      return { ...EMPTY_INPUT };
    }

    const move = readMovement(keys, axes, BABYLON);
    const jumpRequest = buildJumpRequest(pendingJump, move, locomotionState === "run");
    const throwRequest = pendingThrow;
    const danceRequest = pendingDance;

    pendingJump = null;
    pendingThrow = false;
    pendingDance = false;

    return {
      ...move,
      jumpRequest,
      throwRequest,
      danceRequest,
      blocksLocomotion: false
    };
  }

  return {
    queueJump,
    queueJumpOver,
    queueThrow,
    queueDance,
    clear,
    setInputBlocked,
    isInputBlocked,
    consumeFrame,
    readMovement
  };
}
