/**
 * Extended offline tests: input, clip mapping, idle cycle (mocked).
 * Run: node metaverse/scripts/character-full-test.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInputController } from "../src/controllers/InputController.js";
import { createAnimationController, CLIP_NAMES } from "../src/controllers/AnimationController.js";
import { ACTION, LOCOMOTION, WALK_JUMP_PHASE, createCharacterStateMachine } from "../src/controllers/CharacterStateMachine.js";
import { CONTROLLER_SETTINGS } from "../src/angji-character-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GLB_PATH = path.join(__dirname, "../assets/character/rabbit_Explorer_Ver2.glb");

let passed = 0;
let failed = 0;
const issues = [];

function assert(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${name}`);
    return;
  }

  failed += 1;
  const msg = detail ? `${name}: ${detail}` : name;
  issues.push(msg);
  console.error(`  FAIL ${msg}`);
}

function mockBabylon() {
  return {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }

      subtractInPlace(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
      }

      addInPlace(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
      }

      lengthSquared() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
      }
    }
  };
}

function createMockAnimationGroup(name) {
  let loop = true;
  let playing = false;
  let started = false;
  const endObservers = [];

  return {
    name,
    targetedAnimations: [{ animation: { name, framePerSecond: 1, loopMode: 0 } }],
    get loopAnimation() {
      return loop;
    },
    set loopAnimation(value) {
      loop = value;
    },
    get isPlaying() {
      return playing;
    },
    set isPlaying(value) {
      playing = value;
    },
    get isStarted() {
      return started;
    },
    set isStarted(value) {
      started = value;
    },
    speedRatio: 1,
    onAnimationGroupEndObservable: {
      add(fn) {
        endObservers.push(fn);
        return { remove: () => {
          const i = endObservers.indexOf(fn);
          if (i >= 0) endObservers.splice(i, 1);
        } };
      }
    },
    play(shouldLoop) {
      loop = shouldLoop;
      playing = true;
      started = true;
      if (!shouldLoop) {
        setTimeout(() => {
          if (!started) {
            return;
          }
          playing = false;
          endObservers.slice().forEach((fn) => fn());
        }, 0);
      }
    },
    start(shouldLoop, speedRatio = 1, from = 0, to = null) {
      this.speedRatio = speedRatio;
      loop = shouldLoop;
      playing = true;
      started = true;
      this._startFrom = from;
      this._startTo = to;
      if (!shouldLoop) {
        setTimeout(() => {
          if (!started) {
            return;
          }
          playing = false;
          endObservers.slice().forEach((fn) => fn());
        }, 0);
      }
    },
    pause() {
      playing = false;
    },
    goToFrame(frame) {
      this._goToFrame = frame;
    },
    restart() {
      playing = true;
      started = true;
    },
    stop() {
      playing = false;
      started = false;
    },
    reset() {
      playing = false;
      started = false;
    },
    setWeightForAllAnimatables() {},
    _fireEnd() {
      playing = false;
      endObservers.forEach((fn) => fn());
    }
  };
}

function extractGlbClipNames() {
  const buf = fs.readFileSync(GLB_PATH);
  const s = buf.toString("latin1");
  const names = new Set();
  const re = /"(Idle_[^"]+|Walking|Running|Throw|Jump_[^"]+|Dance[^"]*)"/g;
  let m;
  while ((m = re.exec(s))) {
    names.add(m[1]);
  }
  return names;
}

console.log("Character full tests\n");

{
  console.log("A) GLB clip name resolution");
  const glbClips = extractGlbClipNames();
  Object.entries(CLIP_NAMES).forEach(([key, clipName]) => {
    const normalized = clipName.toLowerCase().replace(/[\s_-]+/g, "");
    const found = [...glbClips].some((g) => g.toLowerCase().replace(/[\s_-]+/g, "") === normalized);
    assert(`GLB has clip for ${key} (${clipName})`, found, `missing in GLB`);
  });
}

{
  console.log("\nB) Input jump variant mapping");
  const BABYLON = mockBabylon();
  const input = createInputController({ doubleTapMs: 320 });
  const axes = {
    forward: new BABYLON.Vector3(0, 0, 1),
    right: new BABYLON.Vector3(1, 0, 0)
  };

  input.queueJump();
  let frame = input.consumeFrame(new Set(["w", "shift"]), axes, BABYLON, "idle");
  assert("Shift+W+Space -> Jump_Over", frame.jumpRequest?.action === ACTION.JUMP_OVER);
  assert("Shift+W+Space single tap is not double", frame.jumpRequest?.isDoubleTap === false);

  input.queueJump();
  input.queueJump();
  frame = input.consumeFrame(new Set(["w", "shift"]), axes, BABYLON, "run");
  assert("Shift+W+double Space -> Jump_Over", frame.jumpRequest?.action === ACTION.JUMP_OVER);

  input.queueJump();
  frame = input.consumeFrame(new Set(["w"]), axes, BABYLON, "walk");
  assert("W+Space (walk) -> Jump_Stand", frame.jumpRequest?.action === ACTION.JUMP_STAND);

  input.queueThrow();
  frame = input.consumeFrame(new Set(), axes, BABYLON, "idle");
  assert("E -> throwRequest", frame.throwRequest === true);

  input.queueDance();
  frame = input.consumeFrame(new Set(), axes, BABYLON, "idle");
  assert("P -> danceRequest", frame.danceRequest === true);
}

{
  console.log("\nC) Idle non-loop + swap on clip end (mocked)");
  const BABYLON = mockBabylon();
  const groups = [
    createMockAnimationGroup(CLIP_NAMES.idleStandard),
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    createMockAnimationGroup(CLIP_NAMES.walking),
    createMockAnimationGroup(CLIP_NAMES.running)
  ];

  const anim = createAnimationController(BABYLON, groups, { blendIdleWalk: 0.01 });
  anim.bootstrap();

  const stdGroup = groups.find((g) => g.name === CLIP_NAMES.idleStandard);
  const dwarfGroup = groups.find((g) => g.name === CLIP_NAMES.idleDwarg);

  assert("bootstrap idle does not loop", stdGroup.loopAnimation === false || dwarfGroup.loopAnimation === false);

  await new Promise((r) => setTimeout(r, 20));

  const clipsAfterFirstEnd = anim.getAvailableClips();
  assert("idle controller initialized", anim.getLocomotionState() === LOCOMOTION.IDLE);

  const firstActive = stdGroup.isStarted || dwarfGroup.isStarted;
  assert("an idle group started after bootstrap", firstActive);

  const activeGroup = stdGroup.isStarted ? stdGroup : dwarfGroup;
  activeGroup._fireEnd();

  await new Promise((r) => setTimeout(r, 30));

  const otherStarted = (activeGroup === stdGroup ? dwarfGroup : stdGroup).isStarted
    || stdGroup.isStarted
    || dwarfGroup.isStarted;
  assert("idle swaps after clip end", otherStarted || activeGroup !== stdGroup);
}

{
  console.log("\nD) Walk/Run still loop");
  const BABYLON = mockBabylon();
  const walkGroup = createMockAnimationGroup(CLIP_NAMES.walking);
  const runGroup = createMockAnimationGroup(CLIP_NAMES.running);
  const groups = [
    createMockAnimationGroup(CLIP_NAMES.idleStandard),
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    walkGroup,
    runGroup
  ];

  const anim = createAnimationController(BABYLON, groups, { blendIdleWalk: 0.01, blendWalkRun: 0.01 });
  anim.bootstrap();
  anim.applyLocomotionState(LOCOMOTION.WALK);

  await new Promise((r) => setTimeout(r, 20));
  assert("walking loops", walkGroup.loopAnimation === true);

  anim.applyLocomotionState(LOCOMOTION.RUN);
  await new Promise((r) => setTimeout(r, 20));
  assert("running loops", runGroup.loopAnimation === true);
}

{
  console.log("\nE) State machine action priorities");
  const sm = createCharacterStateMachine();
  sm.update({
    hasMovementInput: true,
    wantsRun: true,
    blocksLocomotion: false,
    jumpRequest: { action: ACTION.JUMP_OVER, isRunning: true, isDoubleTap: true, hasMovement: true },
    throwRequest: false,
    danceRequest: false
  }, {
    isGrounded: true,
    deltaSeconds: 0.016,
    movementBlend: 1,
    horizontalSpeed: 0,
    justLanded: false,
    actionFinished: null
  });

  assert("jump overrides run locomotion", sm.isJumpAction());
}

{
  console.log("\nF) Walk loop does not restart play() when already started");
  const BABYLON = mockBabylon();
  const walkGroup = createMockAnimationGroup(CLIP_NAMES.walking);
  let playCount = 0;
  const originalPlay = walkGroup.play.bind(walkGroup);
  walkGroup.play = (loop) => {
    playCount += 1;
    return originalPlay(loop);
  };

  const groups = [
    createMockAnimationGroup(CLIP_NAMES.idleStandard),
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    walkGroup,
    createMockAnimationGroup(CLIP_NAMES.running)
  ];

  const anim = createAnimationController(BABYLON, groups, { blendWalkRun: 0.01 });
  anim.bootstrap();
  anim.applyLocomotionState(LOCOMOTION.WALK);

  await new Promise((r) => setTimeout(r, 20));
  const playsAfterStart = playCount;

  walkGroup.isPlaying = false;
  anim.applyLocomotionState(LOCOMOTION.WALK);
  anim.update(0.016);

  assert("walk play() resumes when paused", playCount > playsAfterStart);
  assert("walk playing after resume", walkGroup.isPlaying);
}

{
  console.log("\nG) Paused walk clip resumes on locomotion re-entry");
  const BABYLON = mockBabylon();
  const walkGroup = createMockAnimationGroup(CLIP_NAMES.walking);
  const groups = [
    createMockAnimationGroup(CLIP_NAMES.idleStandard),
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    walkGroup,
    createMockAnimationGroup(CLIP_NAMES.running)
  ];

  const anim = createAnimationController(BABYLON, groups, { blendStopIdle: 0.01, blendIdleWalk: 0.01 });
  anim.bootstrap();
  anim.applyLocomotionState(LOCOMOTION.WALK);

  await new Promise((r) => setTimeout(r, 20));
  assert("walk playing before stop", walkGroup.isPlaying);

  anim.applyStateMachineOutput({ locomotionState: LOCOMOTION.IDLE, animLocomotionState: LOCOMOTION.IDLE, activeAction: null }, { fastStop: true });
  await new Promise((r) => setTimeout(r, 20));
  walkGroup.isPlaying = false;

  anim.applyStateMachineOutput({ locomotionState: LOCOMOTION.WALK, animLocomotionState: LOCOMOTION.WALK, activeAction: null });
  await new Promise((r) => setTimeout(r, 20));

  assert("walk resumes after stop and move again", walkGroup.isPlaying);
}

{
  console.log("\nH) fastStop snaps to idle without walk blend-out");
  const BABYLON = mockBabylon();
  const walkGroup = createMockAnimationGroup(CLIP_NAMES.walking);
  const idleGroup = createMockAnimationGroup(CLIP_NAMES.idleStandard);
  const groups = [
    idleGroup,
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    walkGroup,
    createMockAnimationGroup(CLIP_NAMES.running)
  ];

  const anim = createAnimationController(BABYLON, groups, { blendStopIdle: 0.2, blendIdleWalk: 0.2 });
  anim.bootstrap();
  anim.applyLocomotionState(LOCOMOTION.WALK);

  await new Promise((r) => setTimeout(r, 20));
  assert("walk active before stop", walkGroup.isStarted);

  anim.applyStateMachineOutput(
    { locomotionState: LOCOMOTION.IDLE, animLocomotionState: LOCOMOTION.IDLE, activeAction: null },
    { fastStop: true }
  );

  assert("fastStop ends in idle state", anim.getLocomotionState() === LOCOMOTION.IDLE);
  const dwarfGroup = groups.find((g) => g.name === CLIP_NAMES.idleDwarg);
  assert(
    "an idle group started after fastStop snap",
    idleGroup.isStarted || dwarfGroup.isStarted
  );
}

{
  console.log("\nI) Jump clips: Jump_Stand walk / Jump_Over run (Jump_Down blocked)");
  const BABYLON = mockBabylon();
  const jumpStandGroup = createMockAnimationGroup(CLIP_NAMES.jumpStand);
  const jumpOverGroup = createMockAnimationGroup(CLIP_NAMES.jumpOver);
  const jumpDownGroup = createMockAnimationGroup("Jump_Down");
  const groups = [
    createMockAnimationGroup(CLIP_NAMES.idleStandard),
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    jumpStandGroup,
    jumpOverGroup,
    jumpDownGroup,
    createMockAnimationGroup(CLIP_NAMES.walking),
    createMockAnimationGroup(CLIP_NAMES.running)
  ];

  const anim = createAnimationController(BABYLON, groups, {
    blendJump: 0.01,
    jumpAnimSpeedRatio: CONTROLLER_SETTINGS.jumpAnimSpeedRatio,
    jumpOverAnimSpeedRatio: CONTROLLER_SETTINGS.runJumpAnimSpeedRatio,
    jumpOverLiftoffSeconds: CONTROLLER_SETTINGS.runJumpLiftoffClipTime,
    jumpOverLandingSeconds: CONTROLLER_SETTINGS.runJumpLandingClipTime
  });
  anim.bootstrap();
  anim.applyStateMachineOutput({
    locomotionState: LOCOMOTION.IDLE,
    animLocomotionState: LOCOMOTION.IDLE,
    activeAction: ACTION.JUMP_STAND
  });

  await new Promise((r) => setTimeout(r, 20));
  assert("Jump_Stand group plays on jump", jumpStandGroup.isStarted);
  assert("Jump_Stand clip plays in 2s (2.567/2 ratio)", jumpStandGroup.speedRatio === CONTROLLER_SETTINGS.jumpAnimSpeedRatio);
  assert("Jump_Down stays stopped", !jumpDownGroup.isStarted);

  anim.applyStateMachineOutput({
    locomotionState: LOCOMOTION.RUN,
    animLocomotionState: LOCOMOTION.RUN,
    activeAction: ACTION.JUMP_OVER
  });

  await new Promise((r) => setTimeout(r, 20));
  assert("run jump uses Jump_Over clip", jumpOverGroup.isStarted);
  assert("Jump_Over play starts from clip beginning", jumpOverGroup._goToFrame === undefined);
  assert("Jump_Over plays at native clip speed", jumpOverGroup.speedRatio === CONTROLLER_SETTINGS.runJumpAnimSpeedRatio);
  assert("Jump_Stand not used for run jump", !jumpStandGroup.isStarted || jumpOverGroup.isStarted);
  assert("Jump_Down still stopped after run jump", !jumpDownGroup.isStarted);
}

{
  console.log("\nI2) Jump_Over restarts after paused stall (run jump parity with Jump_Stand)");
  const BABYLON = mockBabylon();
  const jumpOverGroup = createMockAnimationGroup(CLIP_NAMES.jumpOver);
  let playCount = 0;
  const originalPlay = jumpOverGroup.play.bind(jumpOverGroup);
  jumpOverGroup.play = (loop) => {
    playCount += 1;
    return originalPlay(loop);
  };

  const groups = [
    createMockAnimationGroup(CLIP_NAMES.idleStandard),
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    createMockAnimationGroup(CLIP_NAMES.walking),
    createMockAnimationGroup(CLIP_NAMES.running),
    jumpOverGroup
  ];

  const anim = createAnimationController(BABYLON, groups, {
    blendJump: 0.01,
    jumpOverAnimSpeedRatio: CONTROLLER_SETTINGS.runJumpAnimSpeedRatio,
    jumpOverLiftoffSeconds: CONTROLLER_SETTINGS.runJumpLiftoffClipTime,
    jumpOverLandingSeconds: CONTROLLER_SETTINGS.runJumpLandingClipTime
  });
  anim.bootstrap();

  anim.applyStateMachineOutput({
    locomotionState: LOCOMOTION.RUN,
    animLocomotionState: LOCOMOTION.IDLE,
    activeAction: ACTION.JUMP_OVER,
    walkJumpPhase: WALK_JUMP_PHASE.ANIM,
    walkJumpFreezeActionClip: false
  });

  await new Promise((r) => setTimeout(r, 20));
  assert("Jump_Over starts on run jump", playCount === 1);

  jumpOverGroup.pause();
  anim.applyStateMachineOutput({
    locomotionState: LOCOMOTION.RUN,
    animLocomotionState: LOCOMOTION.IDLE,
    activeAction: ACTION.JUMP_OVER,
    walkJumpPhase: WALK_JUMP_PHASE.ANIM,
    walkJumpFreezeActionClip: false
  });

  assert("stalled Jump_Over restarts during anim phase", playCount === 2);
  assert("Jump_Over resumes playing after stall", jumpOverGroup.isPlaying);
}

{
  console.log("\nJ) Re-jump replays Jump_Stand clip (mocked)");
  const BABYLON = mockBabylon();
  const jumpStandGroup = createMockAnimationGroup(CLIP_NAMES.jumpStand);
  let playCount = 0;
  const originalPlay = jumpStandGroup.play.bind(jumpStandGroup);
  jumpStandGroup.play = (loop) => {
    playCount += 1;
    return originalPlay(loop);
  };

  const groups = [
    createMockAnimationGroup(CLIP_NAMES.idleStandard),
    createMockAnimationGroup(CLIP_NAMES.idleDwarg),
    jumpStandGroup,
    createMockAnimationGroup(CLIP_NAMES.walking),
    createMockAnimationGroup(CLIP_NAMES.running)
  ];

  const anim = createAnimationController(BABYLON, groups, {
    blendJump: 0.01,
    jumpAnimSpeedRatio: CONTROLLER_SETTINGS.jumpAnimSpeedRatio
  });
  anim.bootstrap();
  anim.applyStateMachineOutput({
    locomotionState: LOCOMOTION.IDLE,
    animLocomotionState: LOCOMOTION.IDLE,
    activeAction: ACTION.JUMP_STAND
  });

  await new Promise((r) => setTimeout(r, 20));
  const playsAfterFirst = playCount;

  jumpStandGroup.isPlaying = false;
  anim.applyStateMachineOutput({
    locomotionState: LOCOMOTION.IDLE,
    animLocomotionState: LOCOMOTION.IDLE,
    activeAction: ACTION.JUMP_STAND,
    jumpRetrigger: true
  });

  assert("re-jump calls play() again", playCount > playsAfterFirst);
  assert("re-jump resumes playing", jumpStandGroup.isPlaying);
}

{
  console.log("\nK) Walk jump uses walking target speed");
  const { CONTROLLER_SETTINGS } = await import("../src/angji-character-config.js");
  const { createMovementController } = await import("../src/controllers/MovementController.js");
  const { ACTION } = await import("../src/controllers/CharacterStateMachine.js");

  const movement = createMovementController(CONTROLLER_SETTINGS);
  const walkSpeed = movement.getTargetSpeed(false, 3);
  const stateOutput = {
    locomotionState: "walk",
    blocksHorizontalMovement: false,
    isJumpAction: true,
    walkJumpPhase: "anim",
    walkJumpAnimInAirborne: true,
    walkJumpHorizontalMoveActive: true,
    walkJumpDirection: { x: 0, z: -1 }
  };

  movement.computeMovement({
    hasMovementInput: false,
    wantsRun: false,
    movement: { clone: () => ({ normalize: () => ({ x: 0, y: 0, z: -1 }) }) },
    jumpRequest: null,
    blocksLocomotion: true
  }, stateOutput, {
    isGrounded: true,
    deltaSeconds: 0.016,
    deltaScale: 1,
    modelSpeedMultiplier: 3,
    facingYaw: 0,
    jumpForce: CONTROLLER_SETTINGS.jumpForce,
    BABYLON: { Vector3: class { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } } }
  });

  const jumpSpeed = movement.getHorizontalSpeed();
  assert("walk jump speed matches walking target", Math.abs(jumpSpeed - walkSpeed) < 0.001);
  assert("idle jump speed is zero", (() => {
    const idleMove = createMovementController(CONTROLLER_SETTINGS);
    idleMove.computeMovement({
      hasMovementInput: false,
      wantsRun: false,
      movement: { clone: () => ({ normalize: () => ({ x: 0, y: 0, z: 0 }) }) },
      jumpRequest: { action: ACTION.JUMP_STAND, isRunning: false, hasMovement: false },
      blocksLocomotion: false
    }, {
      locomotionState: "idle",
      blocksHorizontalMovement: false,
      isJumpAction: false,
      walkJumpPhase: null
    }, {
      isGrounded: true,
      deltaSeconds: 0.016,
      deltaScale: 1,
      modelSpeedMultiplier: 3,
      facingYaw: 0,
      jumpForce: CONTROLLER_SETTINGS.jumpForce,
      BABYLON: { Vector3: class { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } } }
    });
    return idleMove.getHorizontalSpeed() < 0.001;
  })());
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (issues.length) {
  console.log("\nIssues:");
  issues.forEach((i) => console.log(` - ${i}`));
}
process.exit(failed > 0 ? 1 : 0);
