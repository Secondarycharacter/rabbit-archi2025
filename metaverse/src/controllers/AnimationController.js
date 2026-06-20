import { ACTION, LOCOMOTION, WALK_JUMP_PHASE } from "./CharacterStateMachine.js?v=jump-over-fix22-tour-20260620";

export const CLIP_NAMES = {
  idleStandard: "Idle_Standard",
  idleDwarg: "Idle_Dwarf",
  walking: "Walking",
  running: "Running",
  throw: "Throw",
  jumpRunning: "Jump_Running",
  jumpStand: "Jump_Stand",
  jumpOver: "Jump_Over",
  dance: "Dance_Hip hop"
};

const ACTION_CLIP = {
  [ACTION.JUMP_STAND]: CLIP_NAMES.jumpStand,
  [ACTION.JUMP_RUNNING]: CLIP_NAMES.jumpOver,
  [ACTION.JUMP_OVER]: CLIP_NAMES.jumpOver,
  [ACTION.THROW]: CLIP_NAMES.throw,
  [ACTION.DANCE]: CLIP_NAMES.dance
};

/** Never play these clips — Jump_Stand / Jump_Over are used instead. */
const BLOCKED_CLIP_NAMES = new Set([
  "Jump_Down",
  "Jump_Running"
]);

const JUMP_ACTION_KEYS = new Set([
  ACTION.JUMP_STAND,
  ACTION.JUMP_RUNNING,
  ACTION.JUMP_OVER
]);

const BLEND_DURATIONS = {
  idleWalk: 0.4,
  walkRun: 0.3,
  runIdle: 0.4,
  jump: 0.05,
  action: 0.2
};

const LOOPING_LOCOMOTION = new Set([
  CLIP_NAMES.walking,
  CLIP_NAMES.running
]);

function normalizeClipName(name) {
  return String(name || "").toLowerCase().replace(/[\s_-]+/g, "");
}

function findAnimationGroup(groups, clipName) {
  if (BLOCKED_CLIP_NAMES.has(clipName)) {
    return null;
  }

  const normalizedTarget = normalizeClipName(clipName);

  return groups.find((group) => {
    if (BLOCKED_CLIP_NAMES.has(group.name)) {
      return false;
    }

    const groupName = normalizeClipName(group.name);
    if (groupName === normalizedTarget) {
      return true;
    }

    return group.targetedAnimations.some((targeted) => (
      normalizeClipName(targeted.animation?.name) === normalizedTarget
    ));
  }) || null;
}

function locomotionClip(state, idleVariants, idleVariantIndex) {
  if (state === LOCOMOTION.WALK) {
    return CLIP_NAMES.walking;
  }

  if (state === LOCOMOTION.RUN) {
    return CLIP_NAMES.running;
  }

  return idleVariants[idleVariantIndex];
}

export function createAnimationController(BABYLON, animationGroups, options = {}) {
  const {
    idleVariants = [CLIP_NAMES.idleStandard, CLIP_NAMES.idleDwarg],
    blendIdleWalk = BLEND_DURATIONS.idleWalk,
    blendWalkRun = BLEND_DURATIONS.walkRun,
    blendRunIdle = BLEND_DURATIONS.runIdle,
    blendJump = BLEND_DURATIONS.jump,
    blendAction = BLEND_DURATIONS.action,
    blendStopIdle = 0.1,
    jumpAnimSpeedRatio = 2.567 / 2,
    jumpOverAnimSpeedRatio = 1,
    jumpOverLiftoffSeconds = 0.601,
    jumpOverLandingSeconds = 1.6,
    jumpOverClipEndSeconds = 2.3
  } = options;

  const blendDurations = {
    idleWalk: blendIdleWalk,
    walkRun: blendWalkRun,
    runIdle: blendRunIdle,
    jump: blendJump,
    action: blendAction,
    stopIdle: blendStopIdle
  };

  function resolveJumpSpeedRatio(actionKey) {
    if (actionKey === ACTION.JUMP_OVER) {
      return jumpOverAnimSpeedRatio;
    }

    if (JUMP_ACTION_KEYS.has(actionKey)) {
      return jumpAnimSpeedRatio;
    }

    return 1;
  }

  function resolveBlendDuration(fromClip, toClip) {
    const idleSet = new Set([CLIP_NAMES.idleStandard, CLIP_NAMES.idleDwarg]);
    const isFromIdle = idleSet.has(fromClip);
    const isToIdle = idleSet.has(toClip);
    const isFromWalk = fromClip === CLIP_NAMES.walking;
    const isToWalk = toClip === CLIP_NAMES.walking;
    const isFromRun = fromClip === CLIP_NAMES.running;
    const isToRun = toClip === CLIP_NAMES.running;
    const jumpSet = new Set([CLIP_NAMES.jumpStand, CLIP_NAMES.jumpRunning, CLIP_NAMES.jumpOver]);
    const actionSet = new Set([CLIP_NAMES.throw, CLIP_NAMES.dance]);

    if (jumpSet.has(toClip)) {
      return blendDurations.jump;
    }

    if (actionSet.has(toClip)) {
      return blendDurations.action;
    }

    if ((isFromIdle && isToWalk) || (isFromWalk && isToIdle)) {
      return blendDurations.idleWalk;
    }

    if ((isFromWalk && isToRun) || (isFromRun && isToWalk)) {
      return blendDurations.walkRun;
    }

    if (isFromRun && isToIdle) {
      return blendDurations.runIdle;
    }

    return blendDurations.idleWalk;
  }

  const groupsByName = {};
  Object.entries(CLIP_NAMES).forEach(([key, clipName]) => {
    groupsByName[key] = findAnimationGroup(animationGroups, clipName);
  });

  function getGroup(clipName) {
    if (!clipName) {
      return null;
    }

    const entry = Object.entries(CLIP_NAMES).find(([, name]) => name === clipName);
    if (entry) {
      return groupsByName[entry[0]] || null;
    }

    return findAnimationGroup(animationGroups, clipName);
  }

  let locomotionState = LOCOMOTION.IDLE;
  let idleVariantIndex = 0;
  let currentClip = idleVariants[0];
  let currentActionClip = null;
  let currentActionKey = null;
  let pendingFinishedActionKey = null;
  let blendDuration = blendDurations.idleWalk;
  let blendFromWeight = 1;
  let blendToWeight = 0;
  let blendElapsed = 1;
  let blendFromGroup = null;
  let blendToGroup = null;
  let idleEndObserver = null;
  let actionEndObserver = null;
  let lastWalkJumpFreezeClip = false;
  const activeGroupWeights = new Map();

  function setGroupWeight(group, weight) {
    if (!group) {
      return;
    }

    const clamped = Math.max(0, Math.min(1, weight));
    group.setWeightForAllAnimatables(clamped);
    activeGroupWeights.set(group, clamped);
  }

  function getGroupWeight(group) {
    return activeGroupWeights.get(group) ?? 0;
  }

  function isLoopingLocomotionClip(clipName) {
    return LOOPING_LOCOMOTION.has(clipName);
  }

  function configureLoopingLocomotionGroup(group) {
    if (!group) {
      return;
    }

    group.loopAnimation = true;
    group.targetedAnimations?.forEach(({ animation }) => {
      if (animation && BABYLON.Animation?.ANIMATIONLOOPMODE_CYCLE !== undefined) {
        animation.loopMode = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
      }
    });
  }

  function isGroupActive(group, clipName = currentClip) {
    if (!group) {
      return false;
    }

    const weight = getGroupWeight(group);

    if (weight <= 0.02) {
      return false;
    }

    if (isLoopingLocomotionClip(clipName)) {
      return group.isStarted;
    }

    return group.isPlaying || group.isStarted;
  }

  function getExpectedLocomotionClip(state = locomotionState) {
    return locomotionClip(state, idleVariants, idleVariantIndex);
  }

  function isClipAlignedWithState(clipName = currentClip, state = locomotionState) {
    return clipName === getExpectedLocomotionClip(state);
  }

  function muteInactiveLocomotionClips(keepClip = null) {
    [CLIP_NAMES.walking, CLIP_NAMES.running].forEach((clipName) => {
      if (clipName !== keepClip) {
        muteGroup(getGroup(clipName));
      }
    });
  }

  function prepareLocomotionOutro(fromClipName) {
    const group = getGroup(fromClipName);
    if (!group || !isLoopingLocomotionClip(fromClipName)) {
      return;
    }

    group.loopAnimation = false;
  }

  function freezeLocomotionClip(clipName) {
    const group = getGroup(clipName);
    if (!group || !isLoopingLocomotionClip(clipName)) {
      return;
    }

    group.loopAnimation = false;

    if (typeof group.pause === "function" && group.isPlaying) {
      group.pause();
    }
  }

  /** Single path for walk/run → idle outro (stop / run-stop). */
  function beginLocomotionToIdle(fromClipName, fastStop = false) {
    if (!isLoopingLocomotionClip(fromClipName)) {
      return;
    }

    if (fastStop) {
      freezeLocomotionClip(fromClipName);
    } else {
      prepareLocomotionOutro(fromClipName);
    }

    muteInactiveLocomotionClips(fromClipName);
  }

  function resolveLocomotionBlendDuration(fromClip, toClip, fastStop = false) {
    if (fastStop && isIdleClip(toClip) && isLoopingLocomotionClip(fromClip)) {
      return blendDurations.stopIdle;
    }

    return resolveBlendDuration(fromClip, toClip);
  }

  function resumeLoopingLocomotionGroup(group, clipName) {
    if (!group || !isLoopingLocomotionClip(clipName)) {
      return;
    }

    if (!isClipAlignedWithState(clipName)) {
      muteGroup(group);
      return;
    }

    configureLoopingLocomotionGroup(group);
    group.speedRatio = 1;

    if (!group.isPlaying) {
      group.play(true);
    }

    setGroupWeight(group, 1);
  }

  function isBlendActive() {
    return Boolean(blendToGroup && blendElapsed < blendDuration);
  }

  function ensureClipPlaying(group, loop, speedRatio = 1, restart = false) {
    if (!group) {
      return null;
    }

    group.speedRatio = speedRatio;
    group.loopAnimation = loop;

    if (loop && group.isStarted && group.isPlaying) {
      setGroupWeight(group, Math.max(getGroupWeight(group), 1));
      return group;
    }

    if (restart) {
      group.play(loop);
      return group;
    }

    if (!group.isPlaying) {
      group.play(loop);
    }

    return group;
  }

  function muteGroup(group) {
    if (!group) {
      return;
    }

    setGroupWeight(group, 0);
  }

  function stopGroup(group) {
    if (!group) {
      return;
    }

    setGroupWeight(group, 0);
    activeGroupWeights.delete(group);
    group.stop();
  }

  function startBlend(fromClipName, toClipName, toLoop, duration, restartTarget = false) {
    blendFromGroup = fromClipName ? getGroup(fromClipName) : null;
    blendToGroup = toClipName ? getGroup(toClipName) : null;
    blendDuration = duration;
    blendElapsed = 0;
    blendFromWeight = 1;
    blendToWeight = 0;

    if (toClipName && blendToGroup) {
      if (toLoop) {
        configureLoopingLocomotionGroup(blendToGroup);
      }

      const shouldRestart = restartTarget && !blendToGroup.isPlaying;
      ensureClipPlaying(blendToGroup, toLoop, 1, shouldRestart);
      blendToGroup = getGroup(toClipName);
    }
  }

  function finishBlend() {
    if (blendToGroup) {
      setGroupWeight(blendToGroup, 1);
    }

    if (blendFromGroup && blendFromGroup !== blendToGroup) {
      muteGroup(blendFromGroup);
    }

    blendFromGroup = null;
    blendToGroup = null;
    blendElapsed = blendDuration;
    blendFromWeight = 0;
    blendToWeight = 1;
  }

  function stopLocomotionClips() {
    [CLIP_NAMES.walking, CLIP_NAMES.running].forEach((clipName) => {
      const group = getGroup(clipName);
      if (!group) {
        return;
      }

      muteGroup(group);
      group.loopAnimation = false;

      if (typeof group.stop === "function") {
        group.stop();
      }
    });
  }

  /** Instant idle on key release — no walk/run blend-out slide. */
  function snapToIdle(idleClipName) {
    stopLocomotionClips();

    if (blendFromGroup) {
      muteGroup(blendFromGroup);
    }

    if (blendToGroup) {
      muteGroup(blendToGroup);
    }

    blendFromGroup = null;
    blendToGroup = null;
    blendElapsed = 1;
    blendFromWeight = 0;
    blendToWeight = 1;

    currentClip = idleClipName;
    locomotionState = LOCOMOTION.IDLE;
    ensureIdlePlayback(idleClipName, true);
    scheduleNextIdleVariant(idleClipName);
  }

  function clearActionEndObserver() {
    if (actionEndObserver) {
      actionEndObserver.remove();
      actionEndObserver = null;
    }
  }

  function isIdleClip(clipName) {
    return idleVariants.includes(clipName);
  }

  function clipShouldLoop(clipName) {
    return !isIdleClip(clipName);
  }

  function pickNextIdleIndex(currentIndex) {
    if (idleVariants.length <= 1) {
      return currentIndex;
    }

    let nextIndex = currentIndex;

    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * idleVariants.length);
    }

    return nextIndex;
  }

  function ensureIdlePlayback(clipName = currentClip, restart = false) {
    const group = getGroup(clipName);
    if (!group || !isIdleClip(clipName)) {
      return;
    }

    group.loopAnimation = false;
    ensureClipPlaying(group, false, 1, restart);
    setGroupWeight(group, 1);
  }

  function scheduleNextIdleVariant(finishedClip) {
    if (idleEndObserver) {
      idleEndObserver.remove();
      idleEndObserver = null;
    }

    const finishedGroup = getGroup(finishedClip);
    if (!finishedGroup) {
      return;
    }

    idleEndObserver = finishedGroup.onAnimationGroupEndObservable.add(() => {
      if (currentActionClip || locomotionState !== LOCOMOTION.IDLE) {
        return;
      }

      idleVariantIndex = pickNextIdleIndex(idleVariantIndex);
      const nextIdleClip = idleVariants[idleVariantIndex];
      startBlend(currentClip, nextIdleClip, false, blendDurations.idleWalk, true);
      currentClip = nextIdleClip;
      scheduleNextIdleVariant(nextIdleClip);
    });
  }

  function pauseLocomotion(exceptGroup = null) {
    [CLIP_NAMES.walking, CLIP_NAMES.running, ...idleVariants].forEach((clipName) => {
      const group = getGroup(clipName);
      if (group && group !== exceptGroup) {
        muteGroup(group);
      }
    });
  }

  function ensureIdleCycle() {
    if (currentActionClip || locomotionState !== LOCOMOTION.IDLE || !isIdleClip(currentClip)) {
      return;
    }

    const group = getGroup(currentClip);
    if (!isGroupActive(group, currentClip)) {
      ensureIdlePlayback(currentClip, true);
    }

    if (!idleEndObserver) {
      scheduleNextIdleVariant(currentClip);
    }
  }

  function muteBlockedClips() {
    animationGroups.forEach((group) => {
      if (!BLOCKED_CLIP_NAMES.has(group.name)) {
        return;
      }

      setGroupWeight(group, 0);
      group.stop?.();
    });
  }

  function getActionKeyForClip(clipName) {
    return Object.entries(ACTION_CLIP).find(([, clip]) => clip === clipName)?.[0] || null;
  }

  /** Babylon AnimationGroup goToFrame/start use frame indices, not seconds. */
  function resolveClipFrame(actionGroup, timeSeconds) {
    const animation = actionGroup?.targetedAnimations?.[0]?.animation;
    const fps = animation?.framePerSecond || 1;
    return timeSeconds * fps;
  }

  /** Play full Jump_Over from clip start (includes hand-plant before roll). */
  function startJumpOverClip(actionGroup, speedRatio) {
    actionGroup.stop?.(true);
    actionGroup.loopAnimation = false;
    actionGroup.speedRatio = speedRatio;
    actionGroup.play(false);
    setGroupWeight(actionGroup, 1);
  }

  function resumeJumpOverClip(actionGroup) {
    actionGroup.play(false);
    setGroupWeight(actionGroup, 1);
  }

  function freezeJumpOverClip(actionGroup) {
    if (typeof actionGroup.pause === "function") {
      actionGroup.pause();
    }

    setGroupWeight(actionGroup, 1);
  }

  function registerActionEndObserver(actionGroup, clipName, actionKey) {
    actionEndObserver = actionGroup.onAnimationGroupEndObservable.add(() => {
      if (currentActionClip !== clipName) {
        return;
      }

      if (currentActionKey && JUMP_ACTION_KEYS.has(currentActionKey)) {
        setGroupWeight(actionGroup, 1);

        if (currentActionKey === ACTION.JUMP_OVER) {
          if (lastWalkJumpFreezeClip) {
            freezeJumpOverClip(actionGroup);
          }

          return;
        }

        if (typeof actionGroup.pause === "function") {
          actionGroup.pause();
        }

        pendingFinishedActionKey = currentActionKey;
        return;
      }

      pendingFinishedActionKey = currentActionKey || getActionKeyForClip(clipName);
      currentActionClip = null;
      currentActionKey = null;
      clearActionEndObserver();
    });
  }

  function replayAction(clipName, actionKey) {
    const actionGroup = getGroup(clipName);
    if (!actionGroup) {
      return false;
    }

    clearActionEndObserver();
    stopLocomotionClips();
    pauseLocomotion();
    muteBlockedClips();

    if (blendFromGroup) {
      muteGroup(blendFromGroup);
    }

    if (blendToGroup) {
      muteGroup(blendToGroup);
    }

    blendFromGroup = null;
    blendToGroup = null;
    blendElapsed = 1;

    pendingFinishedActionKey = null;
    currentActionClip = clipName;
    currentActionKey = actionKey;

    actionGroup.loopAnimation = false;
    actionGroup.speedRatio = resolveJumpSpeedRatio(actionKey);

    if (actionKey === ACTION.JUMP_OVER) {
      startJumpOverClip(actionGroup, resolveJumpSpeedRatio(actionKey));
    } else {
      actionGroup.stop?.();
      actionGroup.play(false);
      setGroupWeight(actionGroup, 1);
    }

    registerActionEndObserver(actionGroup, clipName, actionKey);
    return true;
  }

  function playAction(clipName, actionKey = null) {
    const actionGroup = getGroup(clipName);
    if (!actionGroup) {
      return false;
    }

    clearActionEndObserver();
    pauseLocomotion();
    muteBlockedClips();
    pendingFinishedActionKey = null;
    currentActionClip = clipName;
    currentActionKey = actionKey || getActionKeyForClip(clipName);
    actionGroup.speedRatio = 1;
    startBlend(currentClip, clipName, false, resolveBlendDuration(currentClip, clipName), true);

    registerActionEndObserver(actionGroup, clipName, currentActionKey);
    return true;
  }

  function applyLocomotionState(nextState, options = {}) {
    const { fastStop = false } = options;
    if (currentActionClip) {
      locomotionState = nextState;
      return;
    }

    const nextClip = locomotionClip(nextState, idleVariants, idleVariantIndex);

    if (!nextClip) {
      locomotionState = nextState;
      return;
    }

    if (nextClip === currentClip) {
      locomotionState = nextState;

      if (nextState === LOCOMOTION.IDLE) {
        ensureIdleCycle();
        return;
      }

      const group = getGroup(currentClip);

      if (group && isLoopingLocomotionClip(currentClip) && (
        getGroupWeight(group) <= 0.02 || !group.isPlaying
      )) {
        resumeLoopingLocomotionGroup(group, currentClip);
      }

      return;
    }

    const targetGroup = getGroup(nextClip);
    const enteringIdle = isIdleClip(nextClip);
    const toLoop = clipShouldLoop(nextClip);

    if (enteringIdle && fastStop && isLoopingLocomotionClip(currentClip)) {
      snapToIdle(nextClip);
      return;
    }

    if (enteringIdle) {
      beginLocomotionToIdle(currentClip, fastStop);
    }

    if (isLoopingLocomotionClip(nextClip)) {
      configureLoopingLocomotionGroup(targetGroup);
    }

    const restartTarget = enteringIdle
      || (isLoopingLocomotionClip(nextClip) && !targetGroup?.isPlaying)
      || (!isLoopingLocomotionClip(nextClip) && !targetGroup?.isStarted);
    startBlend(
      currentClip,
      nextClip,
      toLoop,
      resolveLocomotionBlendDuration(currentClip, nextClip, fastStop),
      restartTarget
    );
    currentClip = nextClip;
    locomotionState = nextState;

    if (nextState === LOCOMOTION.IDLE) {
      scheduleNextIdleVariant(nextClip);
    } else if (idleEndObserver) {
      idleEndObserver.remove();
      idleEndObserver = null;
    }
  }

  function applyStateMachineOutput(stateOutput, options = {}) {
    const { animLocomotionState, locomotionState: physicsLocomotion, activeAction, jumpRetrigger = false } = stateOutput;
    const nextLocomotion = animLocomotionState ?? physicsLocomotion;

    lastWalkJumpFreezeClip = Boolean(stateOutput.walkJumpFreezeActionClip);

    if (stateOutput.walkJumpFreezeActionClip && currentActionClip && currentActionKey) {
      const actionGroup = getGroup(currentActionClip);

      if (actionGroup && currentActionKey === ACTION.JUMP_OVER) {
        freezeJumpOverClip(actionGroup);
        locomotionState = physicsLocomotion;
        return;
      }

      if (actionGroup && JUMP_ACTION_KEYS.has(currentActionKey)) {
        if (typeof actionGroup.pause === "function") {
          actionGroup.pause();
        }

        setGroupWeight(actionGroup, 1);
        locomotionState = physicsLocomotion;
        return;
      }
    }

    if (activeAction && ACTION_CLIP[activeAction]) {
      const clipName = ACTION_CLIP[activeAction];
      const isJumpAction = JUMP_ACTION_KEYS.has(activeAction);
      const actionGroup = getGroup(clipName);
      const jumpOverStalled = activeAction === ACTION.JUMP_OVER
        && stateOutput.walkJumpPhase === WALK_JUMP_PHASE.ANIM
        && !stateOutput.walkJumpFreezeActionClip
        && actionGroup
        && (
          !actionGroup.isPlaying
          || !actionGroup.isStarted
        )
        && getGroupWeight(actionGroup) > 0.02;
      const shouldStartAction = jumpRetrigger
        || currentActionClip !== clipName
        || currentActionKey !== activeAction
        || jumpOverStalled;
      const canStartAction = jumpRetrigger || pendingFinishedActionKey !== activeAction;

      if (jumpOverStalled) {
        resumeJumpOverClip(actionGroup);
      } else if (shouldStartAction && canStartAction) {
        if (isJumpAction) {
          replayAction(clipName, activeAction);
        } else {
          playAction(clipName, activeAction);
        }
      }

      locomotionState = physicsLocomotion;
      return;
    }

    if (currentActionClip) {
      if (!activeAction && currentActionKey && JUMP_ACTION_KEYS.has(currentActionKey)) {
        muteGroup(getGroup(currentActionClip));
        currentActionClip = null;
        currentActionKey = null;
        clearActionEndObserver();
        muteBlockedClips();
        applyLocomotionState(nextLocomotion, options);
        return;
      }

      locomotionState = physicsLocomotion;
      return;
    }

    applyLocomotionState(nextLocomotion, options);
  }

  function update(deltaSeconds) {
    if (blendToGroup && blendElapsed < blendDuration) {
      blendElapsed += deltaSeconds;
      const t = Math.min(blendElapsed / blendDuration, 1);
      const eased = t * t * (3 - 2 * t);
      blendToWeight = eased;
      blendFromWeight = 1 - eased;
      setGroupWeight(blendFromGroup, blendFromWeight);
      setGroupWeight(blendToGroup, blendToWeight);

      if (t >= 1) {
        finishBlend();
      }
    }

    if (currentActionClip || isBlendActive()) {
      muteBlockedClips();
      return;
    }

    if (locomotionState === LOCOMOTION.IDLE) {
      if (isLoopingLocomotionClip(currentClip)) {
        snapToIdle(getExpectedLocomotionClip(LOCOMOTION.IDLE));
        return;
      }

      ensureIdleCycle();
      return;
    }

    if (!isLoopingLocomotionClip(currentClip)) {
      return;
    }

    const locomotionGroup = getGroup(currentClip);
    if (!locomotionGroup) {
      return;
    }

    if (!isClipAlignedWithState()) {
      muteInactiveLocomotionClips(currentClip);
    } else if (getGroupWeight(locomotionGroup) <= 0.02 || !locomotionGroup.isPlaying) {
      resumeLoopingLocomotionGroup(locomotionGroup, currentClip);
    }
  }

  function consumeFinishedAction() {
    const key = pendingFinishedActionKey;
    pendingFinishedActionKey = null;
    return key;
  }

  function bootstrap() {
    animationGroups.forEach((group) => {
      stopGroup(group);
    });

    clearActionEndObserver();
    muteBlockedClips();
    [CLIP_NAMES.walking, CLIP_NAMES.running].forEach((clipName) => {
      configureLoopingLocomotionGroup(getGroup(clipName));
    });
    idleVariantIndex = Math.floor(Math.random() * idleVariants.length);
    currentClip = idleVariants[idleVariantIndex];
    locomotionState = LOCOMOTION.IDLE;
    currentActionClip = null;
    currentActionKey = null;
    pendingFinishedActionKey = null;
    ensureIdlePlayback(currentClip, true);
    scheduleNextIdleVariant(currentClip);
  }

  const jumpClipSet = new Set([
    CLIP_NAMES.jumpStand
  ]);

  return {
    bootstrap,
    update,
    applyStateMachineOutput,
    applyLocomotionState,
    consumeFinishedAction,
    getLocomotionState: () => locomotionState,
    getCurrentAction: () => currentActionClip,
    getCurrentActionKey: () => currentActionKey,
    isJumpAction: () => Boolean(currentActionKey && JUMP_ACTION_KEYS.has(currentActionKey)),
    blocksHorizontalMovement: () => Boolean(currentActionClip) && !JUMP_ACTION_KEYS.has(currentActionKey),
    hasClip: (clipName) => Boolean(getGroup(clipName)),
    getAvailableClips: () => Object.entries(CLIP_NAMES)
      .filter(([, clipName]) => Boolean(getGroup(clipName)))
      .map(([key, clipName]) => `${key}:${clipName}`)
  };
}
