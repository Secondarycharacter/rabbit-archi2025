import {
  isAngjiDanceAnimationClip,
  shouldAngjiGuestAllowDanceRootMotion
} from "./angji-guest-config.js?v=angji-guest-numbers-20260820";
import {
  createGuestDevLabel,
  disposeGuestDevLabel,
  setGuestDevLabelText,
  setGuestDevLabelVisible,
  updateGuestDevLabelHeight,
  isGuestDevLabelOccluded
} from "./guest-dev-label.js?v=angji-guest-labels-20260823";
import {
  createRootMotionNeutralizer,
  stripLocomotionRootMotion
} from "./controllers/RootMotionNeutralizer.js?v=guest-root-motion-20260705";

export const GUEST_ASSET_ROOT = "./assets/guest/";
const GUEST_TARGET_HEIGHT = 1.75;
const PATROL_FLOOR_RAY_INTERVAL = 3;
const PATROL_DEFAULT_DECEL_DISTANCE = 2.8;
const PATROL_MIN_SPEED_FACTOR = 0.15;
const PATROL_ACCEL_RATE = 0.024;
const PATROL_DEPART_TURN_SPEED = 0.14;
const NIGHT_DEVI_CHASE_TYPE = "nightDeviChase";
const NIGHT_DEVI_ENERGY_MAX = 5;
const NIGHT_DEVI_ENERGY_BAR_WIDTH = 1.2 * 0.2;
const NIGHT_DEVI_ENERGY_BAR_HEIGHT = 0.22 * 0.2;
const NIGHT_DEVI_ENERGY_BAR_GAP = 0.12;
const NIGHT_DEVI_BODY_RADIUS = 0.35;
const NIGHT_DEVI_PROBE_HEIGHT = 1.45;

function applyGuestMeshCollisionFlags(mesh, guestId) {
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.metadata = {
    ...(mesh.metadata || {}),
    passThrough: true,
    tourGuest: true,
    guestId
  };
}

function applyGuestTreeCollisionFlags(root, guestId) {
  if (typeof root?.getChildMeshes !== "function") {
    return;
  }

  root.getChildMeshes(true).forEach((mesh) => {
    applyGuestMeshCollisionFlags(mesh, guestId);
  });
}

function normalizeAngle(angle) {
  let normalized = angle % (Math.PI * 2);

  if (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  }

  if (normalized < -Math.PI) {
    normalized += Math.PI * 2;
  }

  return normalized;
}

function shortestAngleDelta(from, to) {
  return normalizeAngle(to - from);
}

function stepAngleToward(current, target, maxStep) {
  const delta = shortestAngleDelta(current, target);

  if (Math.abs(delta) <= maxStep) {
    return target;
  }

  return current + Math.sign(delta) * maxStep;
}

function smoothstep01(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function getPatrolDecelDistance(movement, baseSpeed) {
  if (typeof movement.decelDistance === "number") {
    return movement.decelDistance;
  }

  return Math.max(2.2, baseSpeed * 21);
}

function encodeGuestAssetPath(filePath) {
  return String(filePath || "")
    .split("/")
    .map((segment) => (/[^A-Za-z0-9._-]/.test(segment) ? encodeURIComponent(segment) : segment))
    .join("/");
}

function normalizeClipName(name) {
  return String(name || "").trim().toLowerCase();
}

function resolveClip(animationGroups, clipName) {
  if (!clipName || !animationGroups?.length) {
    return null;
  }

  const normalized = normalizeClipName(clipName);

  const exact = animationGroups.find((group) => normalizeClipName(group.name) === normalized)
    || animationGroups.find((group) => group.name === clipName);

  if (exact) {
    return exact;
  }

  const compactTarget = normalized.replace(/[_\s-]/g, "");
  const compactMatch = animationGroups.find((group) => (
    normalizeClipName(group.name).replace(/[_\s-]/g, "") === compactTarget
  ));

  if (compactMatch) {
    return compactMatch;
  }

  return animationGroups.find((group) => (
    group.targetedAnimations?.some((targeted) => (
      normalizeClipName(targeted.animation?.name) === normalized
      || targeted.animation?.name === clipName
    ))
  )) || null;
}

function stopGuestAnimation(guest) {
  guest.sequenceEndObserver?.remove?.();
  guest.sequenceEndObserver = null;

  if (guest.arrivalClipTimeoutId) {
    window.clearTimeout(guest.arrivalClipTimeoutId);
    guest.arrivalClipTimeoutId = null;
  }

  if (guest.syncSequenceTimeoutId) {
    window.clearTimeout(guest.syncSequenceTimeoutId);
    guest.syncSequenceTimeoutId = null;
  }

  guest.syncSequenceRunId = null;

  if (guest.activeAnimationGroup) {
    try {
      guest.activeAnimationGroup.stop();
    } catch {
      // ignore stale groups
    }
  }

  guest.activeAnimationGroup = null;
  resetGuestRootMotion(guest);
}

function getGuestLocomotionClipNames(spawn) {
  const movement = spawn.movement;

  if (!movement) {
    return [];
  }

  return [
    movement.clip,
    ...(movement.clips || []),
    movement.cycleRestClip
  ].filter(Boolean);
}

function getGuestRootMotionClipNames(spawn) {
  const locomotionClips = getGuestLocomotionClipNames(spawn);
  const animationClips = spawn.animation?.clips || [];

  return [...new Set([...animationClips, ...locomotionClips])];
}

function stripGuestLocomotionRootMotion(BABYLON, animationGroups, spawn) {
  if (spawn?.movement?.type === "rootMotion") {
    // rootMotion guests intentionally keep translation keys; we apply them to the root transform at runtime.
    return;
  }

  if (spawn?.behavior?.type === NIGHT_DEVI_CHASE_TYPE) {
    const attackNames = (animationGroups || [])
      .map((group) => group.name)
      .filter((name) => normalizeClipName(name).startsWith("attack"));

    stripLocomotionRootMotion(BABYLON, animationGroups, [
      "Idle",
      "IDLE",
      "Walking",
      "WALKING",
      "Run_Fast",
      "Run",
      "Running",
      "Jump_Run",
      ...attackNames
    ], { forceStripAllPosition: true });
    return;
  }

  const clipNames = getGuestRootMotionClipNames(spawn);

  if (shouldAngjiGuestAllowDanceRootMotion(spawn?.id)) {
    const strippedClipNames = new Set([
      ...clipNames.filter((clipName) => !isAngjiDanceAnimationClip(clipName)),
      "Idle",
      "IDLE",
      "Walking",
      "Run_Fast",
      "Running"
    ]);

    stripLocomotionRootMotion(BABYLON, animationGroups, [...strippedClipNames], {
      forceStripAllPosition: spawn.movement?.type === "patrol"
    });
    return;
  }

  if (!clipNames.length) {
    stripLocomotionRootMotion(BABYLON, animationGroups, ["Idle", "IDLE", "Walking"]);
    return;
  }

  stripLocomotionRootMotion(BABYLON, animationGroups, clipNames, {
    forceStripAllPosition: spawn.movement?.type === "patrol"
  });
}

function applyGuestPlanarRootMotion(guest) {
  const delta = guest.rootMotionNeutralizer?.consumePlanarRootMotionDelta?.();

  if (delta) {
    guest.root.position.x += delta.x;
    guest.root.position.z += delta.z;
  }
}

function isGuestPlayingAngjiDanceRootMotion(guest) {
  if (!shouldAngjiGuestAllowDanceRootMotion(guest.spawn?.id)) {
    return false;
  }

  return isAngjiDanceAnimationClip(guest.activeAnimationGroup?.name);
}

function resetGuestRootMotion(guest) {
  guest.rootMotionNeutralizer?.neutralize?.({ syncSample: true });
}

function syncGuestRootMotionSample(guest) {
  guest.rootMotionNeutralizer?.resetRootMotionSample?.();
}

function startGuestClip(guest, group, loop) {
  if (!group) {
    return;
  }

  if (guest.activeAnimationGroup && guest.activeAnimationGroup !== group) {
    try {
      guest.activeAnimationGroup.stop();
    } catch {
      // ignore stale groups
    }
  }

  resetGuestRootMotion(guest);

  try {
    group.stop();
    group.reset();
  } catch {
    // ignore stale groups
  }

  group.speedRatio = 1;
  group.start(loop);
  guest.activeAnimationGroup = group;
}

function warnMissingClip(guest, clipName) {
  const available = guest.animationGroups?.map((item) => item.name).filter(Boolean).join(", ") || "(none)";
  console.warn(`[guest] ${guest.spawn.id}: clip not found "${clipName}" (available: ${available})`);
}

function playGuestLoopClip(guest, clipName) {
  const group = resolveClip(guest.animationGroups, clipName);

  if (!group) {
    warnMissingClip(guest, clipName);
    return;
  }

  startGuestClip(guest, group, true);
}

function pickPatrolLocomotionClip(movement) {
  if (movement.clip) {
    return movement.clip;
  }

  const clips = movement.clips || [];

  if (!clips.length) {
    return "Walking";
  }

  if (movement.randomClip) {
    return clips[Math.floor(Math.random() * clips.length)];
  }

  return clips[0];
}

function playGuestClipNTimes(guest, clipName, times, onComplete) {
  let remaining = Math.max(1, times);

  const playNext = () => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    remaining -= 1;
    playGuestClipOnce(guest, clipName, playNext);
  };

  playNext();
}

function startPatrolLocomotionClip(guest) {
  playGuestLoopClip(guest, pickPatrolLocomotionClip(guest.spawn.movement));
}

function getClipDurationMs(group, fallbackMs = 2000) {
  const lengthSeconds = typeof group.getLength === "function" ? group.getLength() : 0;
  return Math.max(400, Math.round(lengthSeconds * 1000) + 120) || fallbackMs;
}

function playGuestClipOnce(guest, clipName, onComplete) {
  const group = resolveClip(guest.animationGroups, clipName);

  if (!group) {
    warnMissingClip(guest, clipName);
    onComplete?.();
    return;
  }

  guest.sequenceEndObserver?.remove?.();
  guest.arrivalClipTimeoutId && window.clearTimeout(guest.arrivalClipTimeoutId);
  guest.arrivalClipTimeoutId = null;

  let completed = false;
  const finish = () => {
    if (completed) {
      return;
    }

    completed = true;
    guest.sequenceEndObserver?.remove?.();
    guest.sequenceEndObserver = null;

    if (guest.arrivalClipTimeoutId) {
      window.clearTimeout(guest.arrivalClipTimeoutId);
      guest.arrivalClipTimeoutId = null;
    }

    resetGuestRootMotion(guest);
    onComplete?.();
  };

  guest.sequenceEndObserver = group.onAnimationGroupEndObservable.add(finish);
  guest.arrivalClipTimeoutId = window.setTimeout(finish, getClipDurationMs(group));
  startGuestClip(guest, group, false);
}

function playGuestAnimation(guest) {
  const { animation } = guest.spawn;
  const { animationGroups } = guest;

  stopGuestAnimation(guest);

  if (guest.spawn.movement?.type === "patrol") {
    guest.patrolPhase = "moving";
    guest.patrolSpeedFactor = 0;
    startPatrolLocomotionClip(guest);
    return;
  }

  if (!animation?.clips?.length) {
    return;
  }

  if (animation.type === "loop") {
    const clipCandidates = animation.clipAliases?.length
      ? animation.clipAliases
      : animation.clips;

    for (const clipName of clipCandidates) {
      const group = resolveClip(animationGroups, clipName);

      if (group) {
        startGuestClip(guest, group, true);
        return;
      }

      warnMissingClip(guest, clipName);
    }

    return;
  }

  if (animation.type === "sequence") {
    let clipIndex = 0;

    const playNext = () => {
      const clipName = animation.clips[clipIndex];
      const group = resolveClip(animationGroups, clipName);

      if (!group) {
        warnMissingClip(guest, clipName);
        clipIndex = (clipIndex + 1) % animation.clips.length;
        if (clipIndex !== 0) {
          playNext();
        }
        return;
      }

      guest.sequenceEndObserver?.remove?.();
      guest.sequenceEndObserver = group.onAnimationGroupEndObservable.add(() => {
        resetGuestRootMotion(guest);
        clipIndex = (clipIndex + 1) % animation.clips.length;
        playNext();
      });
      startGuestClip(guest, group, false);
    };

    playNext();
  }
}

function haveSameSequenceClips(leftGuest, rightGuest) {
  const leftClips = leftGuest.spawn.animation?.clips || [];
  const rightClips = rightGuest.spawn.animation?.clips || [];

  return leftClips.length > 0
    && leftClips.length === rightClips.length
    && leftClips.every((clip, index) => clip === rightClips[index]);
}

function canSyncSequenceGuests(guests) {
  const sequenceGuests = guests.filter((guest) => guest.spawn.animation?.type === "sequence");

  if (sequenceGuests.length < 2) {
    return false;
  }

  return sequenceGuests.every((guest) => haveSameSequenceClips(sequenceGuests[0], guest));
}

function playSyncedSequenceAnimations(guests) {
  const activeGuests = guests.filter((guest) => guest.root?.isEnabled());

  if (!activeGuests.length) {
    return;
  }

  if (!canSyncSequenceGuests(activeGuests)) {
    activeGuests.forEach((guest) => playGuestAnimation(guest));
    return;
  }

  const clips = activeGuests[0].spawn.animation.clips;
  activeGuests.forEach(stopGuestAnimation);

  let runId = 0;

  const playClipIndex = (clipIndex) => {
    const readyGuests = activeGuests.filter((guest) => guest.root.isEnabled());

    if (!readyGuests.length) {
      return;
    }

    readyGuests.forEach((guest) => {
      if (guest.syncSequenceTimeoutId) {
        window.clearTimeout(guest.syncSequenceTimeoutId);
        guest.syncSequenceTimeoutId = null;
      }
    });

    const currentRunId = ++runId;
    const clipName = clips[clipIndex];
    const entries = readyGuests.map((guest) => ({
      guest,
      group: resolveClip(guest.animationGroups, clipName)
    }));

    entries.forEach(({ guest, group }) => {
      if (!group) {
        warnMissingClip(guest, clipName);
        return;
      }

      guest.syncSequenceRunId = currentRunId;
      startGuestClip(guest, group, false);
    });

    const durations = entries
      .filter((entry) => entry.group)
      .map((entry) => getClipDurationMs(entry.group));
    const waitMs = durations.length ? Math.max(...durations) : 2000;
    const timeoutId = window.setTimeout(() => {
      readyGuests.forEach((guest) => {
        if (guest.syncSequenceTimeoutId === timeoutId) {
          guest.syncSequenceTimeoutId = null;
        }
      });

      if (!readyGuests.every((guest) => guest.root.isEnabled() && guest.syncSequenceRunId === currentRunId)) {
        return;
      }

      playClipIndex((clipIndex + 1) % clips.length);
    }, waitMs);

    readyGuests.forEach((guest) => {
      guest.syncSequenceTimeoutId = timeoutId;
    });
  };

  playClipIndex(0);
}

function pickRandomSpeedRatio(minRatio, maxRatio, step) {
  const ratios = [];
  const stepCount = Math.round((maxRatio - minRatio) / step);

  for (let index = 0; index <= stepCount; index += 1) {
    ratios.push(minRatio + index * step);
  }

  return ratios[Math.floor(Math.random() * ratios.length)];
}

function resolvePatrolBaseSpeed(movement) {
  return movement.speed ?? 0.135;
}

function pickNextPatrolCycleSpeedRatio(movement, currentRatio) {
  const minRatio = movement.speedRatioMin ?? 0.1;
  const maxRatio = movement.speedRatioMax ?? 0.3;
  const step = movement.speedRatioStep ?? 0.1;

  if (typeof currentRatio !== "number") {
    return pickRandomSpeedRatio(minRatio, maxRatio, step);
  }

  const choices = [currentRatio];

  if (currentRatio + step <= maxRatio + 0.0001) {
    choices.push(currentRatio + step);
  }

  if (currentRatio - step >= minRatio - 0.0001) {
    choices.push(currentRatio - step);
  }

  return choices[Math.floor(Math.random() * choices.length)];
}

function applyPatrolCycleSpeed(guest, movement, nextRatio) {
  const baseSpeed = resolvePatrolBaseSpeed(movement);
  guest.patrolCycleSpeedRatio = nextRatio;
  guest.patrolActiveSpeed = baseSpeed * nextRatio;
}

function initPatrolCycleSpeed(guest) {
  const movement = guest.spawn.movement;

  if (!movement?.randomSpeedCycle) {
    guest.patrolCycleSpeedRatio = undefined;
    guest.patrolActiveSpeed = undefined;
    return;
  }

  applyPatrolCycleSpeed(guest, movement, pickNextPatrolCycleSpeedRatio(movement));
}

function rollPatrolCycleSpeedForNextCycle(guest) {
  const movement = guest.spawn.movement;

  if (!movement?.randomSpeedCycle) {
    return;
  }

  applyPatrolCycleSpeed(
    guest,
    movement,
    pickNextPatrolCycleSpeedRatio(movement, guest.patrolCycleSpeedRatio)
  );
}

function advancePatrolTarget(guest) {
  const movement = guest.spawn.movement;
  const targets = movement?.patrolTargets || [];
  const previousIndex = guest.patrolTargetIndex;
  guest.patrolTargetIndex = (previousIndex + 1) % targets.length;
  guest.patrolSpeedFactor = 0;

  if (
    movement?.randomSpeedCycle
    && targets.length > 0
    && previousIndex === targets.length - 1
  ) {
    rollPatrolCycleSpeedForNextCycle(guest);
  }
}

function resolveArrivalLookYaw(movement, position) {
  const lookAt = movement.arrivalLookAt;

  if (!lookAt) {
    return null;
  }

  return Math.atan2(lookAt.x - position.x, lookAt.z - position.z);
}

function updatePatrolTurnToward(guest, deltaScale, targetYaw, onComplete) {
  const nextYaw = stepAngleToward(
    guest.root.rotation.y,
    targetYaw,
    PATROL_DEPART_TURN_SPEED * deltaScale
  );

  guest.root.rotation.y = nextYaw;
  syncGuestRootMotionSample(guest);

  if (Math.abs(shortestAngleDelta(nextYaw, targetYaw)) <= 0.02) {
    guest.root.rotation.y = targetYaw;
    onComplete?.();
  }
}

function beginPatrolWaypointIdle(guest) {
  const { movement } = guest.spawn;
  const arrivalClip = movement?.arrivalClip;

  if (!arrivalClip) {
    resumePatrolAfterWaypoint(guest);
    return;
  }

  guest.patrolPhase = "idle";
  playGuestClipOnce(guest, arrivalClip, () => {
    guest.patrolArrivalPending = false;
    guest.patrolArrivalLookYaw = null;

    if (!guest.root.isEnabled()) {
      return;
    }

    resumePatrolAfterWaypoint(guest);
  });
}

function beginPatrolArrivalFacing(guest) {
  const { movement } = guest.spawn;
  const lookYaw = resolveArrivalLookYaw(movement, guest.root.position);

  if (lookYaw === null) {
    beginPatrolWaypointIdle(guest);
    return;
  }

  guest.patrolArrivalLookYaw = lookYaw;
  guest.patrolPhase = "turningToArrivalLook";
}

function resumePatrolAfterWaypoint(guest) {
  const { movement } = guest.spawn;
  advancePatrolTarget(guest);

  if (movement.faceSpawnRotationOnDepart) {
    guest.patrolPhase = "turningToDepart";
    guest.patrolDepartRotationY = guest.spawn.rotationY;
    return;
  }

  guest.patrolPhase = "moving";
  startPatrolLocomotionClip(guest);
}

function updatePatrolDepartTurn(guest, deltaScale) {
  const targetYaw = guest.patrolDepartRotationY ?? guest.spawn.rotationY;

  updatePatrolTurnToward(guest, deltaScale, targetYaw, () => {
    guest.patrolPhase = "moving";
    startPatrolLocomotionClip(guest);
  });
}

function handlePatrolArrival(guest) {
  const { movement } = guest.spawn;
  const targets = movement?.patrolTargets || [];
  const isCycleHome = Boolean(
    movement?.cycleRestClip
    && targets.length > 0
    && guest.patrolTargetIndex === targets.length - 1
  );

  if (isCycleHome) {
    if (guest.patrolArrivalPending) {
      return;
    }

    guest.patrolArrivalPending = true;
    guest.patrolPhase = "idle";
    playGuestClipNTimes(guest, movement.cycleRestClip, movement.cycleRestCount ?? 1, () => {
      guest.patrolArrivalPending = false;

      if (!guest.root.isEnabled()) {
        return;
      }

      advancePatrolTarget(guest);
      guest.patrolPhase = "moving";
      startPatrolLocomotionClip(guest);
    });
    return;
  }

  const arrivalClip = movement?.arrivalClip;

  if (!arrivalClip) {
    resumePatrolAfterWaypoint(guest);
    return;
  }

  if (guest.patrolArrivalPending) {
    return;
  }

  guest.patrolArrivalPending = true;

  if (movement.arrivalLookAt) {
    beginPatrolArrivalFacing(guest);
    return;
  }

  beginPatrolWaypointIdle(guest);
}

function blendPatrolHeight(position, targetY, deltaScale) {
  const blend = Math.min(0.3 * deltaScale, 1);
  position.y += (targetY - position.y) * blend;
}

export function shouldSnapPatrolFloorAtTarget(movement, patrolTargetIndex) {
  if (!movement?.snapToFloor) {
    return false;
  }

  const segments = movement.snapToFloorSegments;

  if (!segments?.length) {
    return true;
  }

  const targetMark = patrolTargetIndex + 2;

  return segments.some((segment) => {
    const fromMark = segment.fromMark ?? segment.toMark;
    const toMark = segment.toMark ?? segment.fromMark;
    return targetMark >= fromMark && targetMark <= toMark;
  });
}

function resolvePatrolHeight(x, z, fallbackY, movement, resolveFloorY, patrolTargetIndex) {
  if (!shouldSnapPatrolFloorAtTarget(movement, patrolTargetIndex)) {
    return fallbackY;
  }

  return resolveFloorY?.(x, z, fallbackY) ?? fallbackY;
}

function updateGuestPatrol(guest, deltaScale, resolveFloorY) {
  const { movement } = guest.spawn;
  const targets = movement?.patrolTargets;

  if (!targets?.length) {
    return;
  }

  if (guest.patrolPhase === "turningToArrivalLook") {
    updatePatrolTurnToward(guest, deltaScale, guest.patrolArrivalLookYaw, () => {
      beginPatrolWaypointIdle(guest);
    });
    return;
  }

  if (guest.patrolPhase === "turningToDepart") {
    updatePatrolDepartTurn(guest, deltaScale);
    return;
  }

  if (guest.patrolPhase === "idle") {
    if (typeof guest.patrolArrivalLookYaw === "number") {
      guest.root.rotation.y = guest.patrolArrivalLookYaw;
      syncGuestRootMotionSample(guest);
    }

    return;
  }

  const target = targets[guest.patrolTargetIndex];
  const position = guest.root.position;
  const toTargetX = target.x - position.x;
  const toTargetZ = target.z - position.z;
  const distance = Math.hypot(toTargetX, toTargetZ);
  const baseSpeed = movement.randomSpeedCycle && typeof guest.patrolActiveSpeed === "number"
    ? guest.patrolActiveSpeed
    : resolvePatrolBaseSpeed(movement);
  const targetY = typeof target.y === "number" ? target.y : position.y;
  let speedFactor = 1;

  if (movement.easeSpeed !== false) {
    const minSpeedFactor = movement.minSpeedFactor ?? PATROL_MIN_SPEED_FACTOR;
    const decelDistance = getPatrolDecelDistance(movement, baseSpeed);
    const accelRate = movement.accelRate ?? PATROL_ACCEL_RATE;

    guest.patrolSpeedFactor = Math.min(1, (guest.patrolSpeedFactor ?? 0) + accelRate * deltaScale);

    let approachFactor = 1;

    if (decelDistance > 0 && distance < decelDistance) {
      approachFactor = smoothstep01(distance / decelDistance);
      approachFactor = Math.max(approachFactor, minSpeedFactor);
    }

    speedFactor = Math.min(guest.patrolSpeedFactor, approachFactor);
  } else {
    guest.patrolSpeedFactor = 1;
  }

  const step = baseSpeed * speedFactor * deltaScale;

  if (distance <= Math.max(step, 0.04)) {
    position.x = target.x;
    position.z = target.z;
    position.y = resolvePatrolHeight(
      target.x,
      target.z,
      targetY,
      movement,
      resolveFloorY,
      guest.patrolTargetIndex
    );
    handlePatrolArrival(guest);
    return;
  }

  const invDistance = 1 / distance;
  position.x += toTargetX * invDistance * step;
  position.z += toTargetZ * invDistance * step;

  if (shouldSnapPatrolFloorAtTarget(movement, guest.patrolTargetIndex)) {
    guest.patrolFloorTick = (guest.patrolFloorTick || 0) + 1;

    if (guest.patrolFloorTick % PATROL_FLOOR_RAY_INTERVAL === 0 || distance <= step) {
      position.y = resolvePatrolHeight(
        position.x,
        position.z,
        position.y,
        movement,
        resolveFloorY,
        guest.patrolTargetIndex
      );
    }
  } else {
    blendPatrolHeight(position, targetY, deltaScale);
  }

  guest.root.rotation.y = Math.atan2(toTargetX, toTargetZ);
  syncGuestRootMotionSample(guest);
}

function isNightDeviChaseGuest(guest) {
  return guest?.spawn?.behavior?.type === NIGHT_DEVI_CHASE_TYPE;
}

function ensureNightDeviChaseState(guest) {
  if (!isNightDeviChaseGuest(guest)) {
    return null;
  }

  if (!guest.nightChase) {
    const position = guest.root?.position;
    guest.nightChase = {
      phase: "idle",
      engaged: false,
      path: [],
      returnPath: [],
      returnIndex: 0,
      leashAwaySince: null,
      chaseStartedAt: null,
      chaseDurationMs: 0,
      returnStartedAt: null,
      returnDeadlineMs: 0,
      home: position
        ? {
          x: position.x,
          y: position.y,
          z: position.z,
          rotationY: guest.root.rotation?.y ?? guest.spawn.rotationY ?? 0
        }
        : {
          x: guest.spawn.position.x,
          y: guest.spawn.position.y,
          z: guest.spawn.position.z,
          rotationY: guest.spawn.rotationY ?? 0
        }
    };
  }

  return guest.nightChase;
}

function captureNightDeviHome(guest) {
  const chase = ensureNightDeviChaseState(guest);

  if (!chase || !guest.root) {
    return;
  }

  chase.home = {
    x: guest.root.position.x,
    y: guest.root.position.y,
    z: guest.root.position.z,
    rotationY: guest.root.rotation.y
  };
}

function horizontalDistanceXZ(ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.hypot(dx, dz);
}

function recordNightDeviPathPoint(guest, chase, behavior) {
  const position = guest.root.position;
  const path = chase.path;
  const last = path[path.length - 1];
  const minDistance = behavior.pathRecordDistance ?? 0.45;

  if (!last) {
    path.push({ x: position.x, y: position.y, z: position.z });
    return;
  }

  if (horizontalDistanceXZ(last.x, last.z, position.x, position.z) >= minDistance) {
    path.push({ x: position.x, y: position.y, z: position.z });
  }
}

function listNightDeviAttackClipNames(guest) {
  const prefix = normalizeClipName(guest.spawn.behavior?.attackClipPrefix || "Attack");

  return (guest.animationGroups || [])
    .map((group) => group.name)
    .filter((name) => normalizeClipName(name).startsWith(prefix));
}

function pickRandomNightDeviAttackClip(guest) {
  const clips = listNightDeviAttackClipNames(guest);

  if (!clips.length) {
    return null;
  }

  return clips[Math.floor(Math.random() * clips.length)];
}

function resolveNightDeviRunClip(guest) {
  const behavior = guest.spawn.behavior;
  const aliases = behavior.runClipAliases?.length
    ? behavior.runClipAliases
    : [behavior.runClip || "Run_Fast"];

  for (const clipName of aliases) {
    if (resolveClip(guest.animationGroups, clipName)) {
      return clipName;
    }
  }

  return aliases[0];
}

function playNightDeviLoop(guest, clipName) {
  if (guest.activeAnimationGroup && normalizeClipName(guest.activeAnimationGroup.name) === normalizeClipName(clipName)) {
    return;
  }

  playGuestLoopClip(guest, clipName);
}

function resolveNightDeviWalkClip(guest) {
  const behavior = guest.spawn.behavior;
  return behavior.chaseClip || behavior.walkClip || "Walking";
}

function getNightDeviChaseSpeed(behavior) {
  return (behavior.runSpeed ?? 0.2) * 0.5;
}

function beginNightDeviReturn(guest, chase) {
  const home = chase.home;
  const position = guest.root.position;
  const now = performance.now();
  const path = chase.path || [];

  chase.chaseDurationMs = chase.chaseStartedAt != null
    ? Math.max(0, now - chase.chaseStartedAt)
    : 0;
  chase.returnStartedAt = now;
  // If still not home after 75% of chase time, snap home (stuck fallback).
  chase.returnDeadlineMs = chase.chaseDurationMs * 0.75;

  const last = path[path.length - 1];
  if (!last || horizontalDistanceXZ(last.x, last.z, position.x, position.z) > 0.05) {
    path.push({ x: position.x, y: position.y, z: position.z });
  }

  const returnPath = [...path].reverse();

  if (!returnPath.length || horizontalDistanceXZ(
    returnPath[returnPath.length - 1].x,
    returnPath[returnPath.length - 1].z,
    home.x,
    home.z
  ) > 0.2) {
    returnPath.push({ x: home.x, y: home.y, z: home.z });
  }

  chase.phase = "returning";
  chase.returnPath = returnPath;
  chase.returnIndex = 0;
  chase.leashAwaySince = null;
  chase.engaged = false;
  playNightDeviLoop(guest, resolveNightDeviWalkClip(guest));
  syncGuestEnergyBar(guest);
}

function finishNightDeviReturn(guest, chase) {
  const home = chase.home;
  guest.root.position.set(home.x, home.y, home.z);
  guest.root.rotation.y = home.rotationY;
  chase.phase = "idle";
  chase.engaged = false;
  chase.path = [];
  chase.returnPath = [];
  chase.returnIndex = 0;
  chase.leashAwaySince = null;
  chase.chaseStartedAt = null;
  chase.chaseDurationMs = 0;
  chase.returnStartedAt = null;
  chase.returnDeadlineMs = 0;
  playNightDeviLoop(guest, guest.spawn.behavior.idleClip || "Idle");
  syncGuestRootMotionSample(guest);
  syncGuestEnergyBar(guest);
}

function createGuestEnergyBar(BABYLON, scene, guestId) {
  const root = new BABYLON.TransformNode(`guest-energy-root-${guestId}`, scene);
  const texture = new BABYLON.DynamicTexture(`guest-energy-texture-${guestId}`, {
    width: 256,
    height: 48
  }, scene);
  const material = new BABYLON.StandardMaterial(`guest-energy-material-${guestId}`, scene);
  const plane = BABYLON.MeshBuilder.CreatePlane(`guest-energy-plane-${guestId}`, {
    width: NIGHT_DEVI_ENERGY_BAR_WIDTH,
    height: NIGHT_DEVI_ENERGY_BAR_HEIGHT
  }, scene);

  texture.hasAlpha = true;
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.emissiveColor = BABYLON.Color3.White();
  material.diffuseColor = BABYLON.Color3.White();
  material.specularColor = BABYLON.Color3.Black();
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  material.useAlphaFromDiffuseTexture = true;

  plane.parent = root;
  plane.material = material;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  plane.checkCollisions = false;
  plane.applyFog = false;
  plane.renderingGroupId = 1;
  plane.alwaysSelectAsActiveMesh = true;

  return {
    root,
    plane,
    texture,
    material,
    energy: NIGHT_DEVI_ENERGY_MAX,
    maxEnergy: NIGHT_DEVI_ENERGY_MAX,
    offsetY: 1.95
  };
}

function updateGuestEnergyBar(energyBar) {
  if (!energyBar?.texture) {
    return;
  }

  const context = energyBar.texture.getContext();
  const width = energyBar.texture.getSize().width;
  const height = energyBar.texture.getSize().height;
  const padding = 4;
  const gap = 3;
  const segmentCount = energyBar.maxEnergy || NIGHT_DEVI_ENERGY_MAX;
  const segmentWidth = (width - padding * 2 - gap * (segmentCount - 1)) / segmentCount;
  const segmentHeight = height - padding * 2;
  const filled = Math.max(0, Math.min(segmentCount, energyBar.energy ?? segmentCount));

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(0, 0, 0, 0.78)";
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < segmentCount; index += 1) {
    const x = padding + index * (segmentWidth + gap);
    context.fillStyle = index < filled ? "rgb(20, 230, 60)" : "rgba(20, 45, 25, 0.85)";
    context.fillRect(x, padding, segmentWidth, segmentHeight);
  }

  energyBar.texture.update();
}

function shouldShowGuestEnergyBar(guest) {
  if (!guest?.root?.isEnabled?.()) {
    return false;
  }

  const chase = guest.nightChase;
  if (!chase?.engaged) {
    return false;
  }

  // Visible only while actively recognizing/chasing the rabbit.
  return chase.phase === "chasing" || chase.phase === "attacking";
}

function attachGuestEnergyBar(BABYLON, scene, guest) {
  if (!isNightDeviChaseGuest(guest) || guest.energyBar) {
    return;
  }

  const energyBar = createGuestEnergyBar(BABYLON, scene, guest.spawn.id);
  energyBar.root.parent = guest.root;
  energyBar.root.position.set(0, energyBar.offsetY, 0);
  updateGuestEnergyBar(energyBar);
  energyBar.root.setEnabled(false);
  guest.energyBar = energyBar;
  syncGuestEnergyBar(guest);
}

function disposeGuestEnergyBar(guest) {
  if (!guest?.energyBar) {
    return;
  }

  try {
    guest.energyBar.plane?.dispose();
    guest.energyBar.material?.dispose();
    guest.energyBar.texture?.dispose();
    guest.energyBar.root?.dispose();
  } catch {
    // ignore stale energy bars
  }

  guest.energyBar = null;
}

function syncGuestEnergyBar(guest) {
  if (!guest?.energyBar?.root || !guest.root) {
    return;
  }

  // guest.root already has fitScale. Use local-space height and inverse scale
  // so the bar stays above the head at a readable world size.
  const fitScale = Math.max(guest.fitScale || 1, 1e-6);
  const invScale = 1 / fitScale;
  const localHeight = Math.max(guest.rawHeight || 0, 1.6 * invScale);
  const visible = shouldShowGuestEnergyBar(guest);

  guest.energyBar.offsetY = localHeight + NIGHT_DEVI_ENERGY_BAR_GAP * invScale;
  guest.energyBar.root.position.set(0, guest.energyBar.offsetY, 0);
  guest.energyBar.root.scaling.set(invScale, invScale, invScale);
  guest.energyBar.root.setEnabled(visible);
  guest.energyBar.plane?.setEnabled?.(visible);
}

function getCollisionMeshCollectionSize(meshes) {
  if (!meshes) {
    return 0;
  }

  if (typeof meshes.size === "number") {
    return meshes.size;
  }

  if (typeof meshes.length === "number") {
    return meshes.length;
  }

  return 0;
}

function toCollisionMeshSet(meshes) {
  if (!meshes) {
    return new Set();
  }

  return meshes instanceof Set ? meshes : new Set(meshes);
}

function hasNightDeviLineOfSight(BABYLON, scene, fromPosition, toPosition, helpers = {}) {
  const { getCollisionMeshes, hasGuestLineOfSight } = helpers;

  if (typeof hasGuestLineOfSight === "function") {
    return hasGuestLineOfSight(fromPosition, toPosition);
  }

  if (getCollisionMeshCollectionSize(typeof getCollisionMeshes === "function" ? getCollisionMeshes() : null) <= 0) {
    return true;
  }

  const collisionSet = toCollisionMeshSet(getCollisionMeshes());
  const origin = new BABYLON.Vector3(
    fromPosition.x,
    fromPosition.y + NIGHT_DEVI_PROBE_HEIGHT,
    fromPosition.z
  );
  const target = new BABYLON.Vector3(
    toPosition.x,
    (toPosition.y || fromPosition.y) + NIGHT_DEVI_PROBE_HEIGHT,
    toPosition.z
  );
  const delta = target.subtract(origin);
  const distance = delta.length();

  if (distance <= 0.05) {
    return true;
  }

  const direction = delta.normalize();
  const ray = new BABYLON.Ray(origin, direction, Math.max(0.05, distance - 0.2));
  const hits = typeof scene.multiPickWithRay === "function"
    ? (scene.multiPickWithRay(ray, (mesh) => (
      collisionSet.has(mesh)
      && mesh.isEnabled()
      && mesh.isPickable
      && !mesh.metadata?.passThrough
      && !mesh.metadata?.tourGuest
    )) || []).filter((hit) => hit?.hit).sort((a, b) => a.distance - b.distance)
    : (() => {
      const hit = scene.pickWithRay(ray, (mesh) => (
        collisionSet.has(mesh)
        && mesh.isEnabled()
        && mesh.isPickable
        && !mesh.metadata?.passThrough
        && !mesh.metadata?.tourGuest
      ));
      return hit?.hit ? [hit] : [];
    })();

  return hits.length === 0;
}

function canNightDeviStep(BABYLON, scene, fromPosition, dirX, dirZ, stepDistance, helpers = {}) {
  const { getCollisionMeshes, canGuestMoveHorizontal } = helpers;

  if (stepDistance <= 0.001) {
    return true;
  }

  const horizontal = Math.hypot(dirX, dirZ);

  if (horizontal < 1e-6) {
    return true;
  }

  if (typeof canGuestMoveHorizontal === "function") {
    return canGuestMoveHorizontal(fromPosition, dirX / horizontal, dirZ / horizontal, stepDistance);
  }

  if (getCollisionMeshCollectionSize(typeof getCollisionMeshes === "function" ? getCollisionMeshes() : null) <= 0) {
    return true;
  }

  const collisionSet = toCollisionMeshSet(getCollisionMeshes());
  const direction = new BABYLON.Vector3(dirX / horizontal, 0, dirZ / horizontal);
  const rayDistance = stepDistance + NIGHT_DEVI_BODY_RADIUS + 0.25;
  const heightOffsets = [1.45, 0.95, 0.45];
  const lateralOffsets = [-NIGHT_DEVI_BODY_RADIUS * 0.75, 0, NIGHT_DEVI_BODY_RADIUS * 0.75];
  const lateralAxis = new BABYLON.Vector3(direction.z, 0, -direction.x);

  for (const heightOffset of heightOffsets) {
    for (const lateralOffset of lateralOffsets) {
      const lateral = lateralAxis.scale(lateralOffset);
      const rayOrigin = new BABYLON.Vector3(
        fromPosition.x + lateral.x,
        fromPosition.y + heightOffset,
        fromPosition.z + lateral.z
      );
      const ray = new BABYLON.Ray(rayOrigin, direction, rayDistance);
      const hit = scene.pickWithRay(ray, (mesh) => (
        collisionSet.has(mesh)
        && mesh.isEnabled()
        && mesh.isPickable
        && !mesh.metadata?.passThrough
        && !mesh.metadata?.tourGuest
      ));

      if (hit?.hit && hit.distance <= rayDistance) {
        const normal = hit.getNormal?.(true);
        const isWallMeta = hit.pickedMesh?.metadata?.angjiWallSurface
          || hit.pickedMesh?.metadata?.angjiFurnitureSurface;

        if (isWallMeta || !normal || normal.y < 0.55) {
          return false;
        }
      }
    }
  }

  return true;
}

function moveNightDeviToward(guest, targetX, targetZ, targetY, speed, deltaScale, resolveFloorY, helpers = {}) {
  const { BABYLON, scene } = helpers;
  const position = guest.root.position;
  const toX = targetX - position.x;
  const toZ = targetZ - position.z;
  const distance = Math.hypot(toX, toZ);
  const step = speed * deltaScale;

  const tryMove = (moveX, moveZ, moveStep) => {
    if (!BABYLON || !scene) {
      return true;
    }

    return canNightDeviStep(BABYLON, scene, position, moveX, moveZ, moveStep, helpers);
  };

  const applyMove = (nextX, nextZ) => {
    position.x = nextX;
    position.z = nextZ;
    position.y = resolveFloorY?.(nextX, nextZ, targetY ?? position.y) ?? (targetY ?? position.y);
    guest.root.rotation.y = Math.atan2(toX, toZ);
    syncGuestRootMotionSample(guest);
  };

  if (distance <= Math.max(step, 0.04)) {
    if (!tryMove(toX, toZ, distance)) {
      guest.root.rotation.y = Math.atan2(toX, toZ);
      syncGuestRootMotionSample(guest);
      return distance;
    }

    applyMove(targetX, targetZ);
    return 0;
  }

  const inv = 1 / distance;
  const stepX = toX * inv * step;
  const stepZ = toZ * inv * step;

  if (tryMove(toX, toZ, step)) {
    applyMove(position.x + stepX, position.z + stepZ);
    return distance - step;
  }

  // Axis slide so Devi can follow corridors instead of freezing against a wall.
  if (Math.abs(stepX) > 0.001 && tryMove(stepX, 0, Math.abs(stepX))) {
    applyMove(position.x + stepX, position.z);
    return Math.hypot(targetX - position.x, targetZ - position.z);
  }

  if (Math.abs(stepZ) > 0.001 && tryMove(0, stepZ, Math.abs(stepZ))) {
    applyMove(position.x, position.z + stepZ);
    return Math.hypot(targetX - position.x, targetZ - position.z);
  }

  guest.root.rotation.y = Math.atan2(toX, toZ);
  syncGuestRootMotionSample(guest);
  return distance;
}

function startNightDeviAttack(guest, chase, getPlayerPosition) {
  const behavior = guest.spawn.behavior;
  const clipName = pickRandomNightDeviAttackClip(guest);

  if (!clipName) {
    chase.phase = "chasing";
    playNightDeviLoop(guest, resolveNightDeviWalkClip(guest));
    return;
  }

  chase.phase = "attacking";
  playGuestClipOnce(guest, clipName, () => {
    if (!guest.root?.isEnabled?.() || !guest.nightChase || guest.nightChase !== chase) {
      return;
    }

    const playerPosition = typeof getPlayerPosition === "function" ? getPlayerPosition() : null;

    if (playerPosition) {
      const distance = horizontalDistanceXZ(
        guest.root.position.x,
        guest.root.position.z,
        playerPosition.x,
        playerPosition.z
      );

      if (distance <= (behavior.attackRange ?? 1)) {
        startNightDeviAttack(guest, chase, getPlayerPosition);
        return;
      }
    }

    chase.phase = "chasing";
  });
}

function updateNightDeviChase(guest, deltaScale, resolveFloorY, getPlayerPosition, helpers = {}) {
  const behavior = guest.spawn.behavior;
  const chase = ensureNightDeviChaseState(guest);
  const chaseSpeed = getNightDeviChaseSpeed(behavior);
  const chaseRange = behavior.chaseRange ?? 10;
  const chaseClip = resolveNightDeviWalkClip(guest);
  const { BABYLON, scene, getCollisionMeshes, canGuestMoveHorizontal, hasGuestLineOfSight } = helpers;
  const moveHelpers = {
    BABYLON,
    scene,
    getCollisionMeshes,
    canGuestMoveHorizontal,
    hasGuestLineOfSight
  };

  if (!chase || !guest.root?.isEnabled?.()) {
    return;
  }

  syncGuestEnergyBar(guest);

  const playerPosition = typeof getPlayerPosition === "function" ? getPlayerPosition() : null;

  if (!playerPosition) {
    if (chase.phase !== "idle" && chase.phase !== "returning" && chase.phase !== "attacking") {
      chase.phase = "idle";
      playNightDeviLoop(guest, behavior.idleClip || "Idle");
    }

    if (chase.phase === "returning") {
      updateNightDeviReturn(guest, chase, behavior, deltaScale, resolveFloorY, moveHelpers);
    }

    return;
  }

  const distance = horizontalDistanceXZ(
    guest.root.position.x,
    guest.root.position.z,
    playerPosition.x,
    playerPosition.z
  );
  const hasLineOfSight = !BABYLON || !scene
    ? true
    : hasNightDeviLineOfSight(BABYLON, scene, guest.root.position, playerPosition, helpers);
  const sensedDistance = hasLineOfSight ? distance : Number.POSITIVE_INFINITY;

  if (chase.phase === "returning") {
    if (sensedDistance <= behavior.aggroRange) {
      chase.engaged = true;
      chase.phase = "chasing";
      chase.returnPath = [];
      chase.returnIndex = 0;
      chase.leashAwaySince = null;
      chase.chaseStartedAt = performance.now();
      chase.returnStartedAt = null;
      chase.returnDeadlineMs = 0;
      if (!chase.path.length) {
        chase.path.push({ ...chase.home });
      }
      recordNightDeviPathPoint(guest, chase, behavior);
      playNightDeviLoop(guest, chaseClip);
    } else {
      updateNightDeviReturn(guest, chase, behavior, deltaScale, resolveFloorY, moveHelpers);
      return;
    }
  }

  if (chase.phase === "attacking") {
    guest.root.rotation.y = Math.atan2(
      playerPosition.x - guest.root.position.x,
      playerPosition.z - guest.root.position.z
    );

    if (chase.engaged && (distance >= behavior.leashRange || !hasLineOfSight)) {
      if (chase.leashAwaySince == null) {
        chase.leashAwaySince = performance.now();
      } else if (performance.now() - chase.leashAwaySince >= behavior.leashTimeoutMs) {
        beginNightDeviReturn(guest, chase);
      }
    } else {
      chase.leashAwaySince = null;
    }

    return;
  }

  if (!chase.engaged) {
    if (sensedDistance > behavior.aggroRange) {
      if (chase.phase !== "idle") {
        chase.phase = "idle";
        playNightDeviLoop(guest, behavior.idleClip || "Idle");
      }

      return;
    }

    chase.engaged = true;
    chase.phase = "chasing";
    chase.path = [{ ...chase.home }];
    chase.leashAwaySince = null;
    chase.chaseStartedAt = performance.now();
    chase.returnStartedAt = null;
    chase.returnDeadlineMs = 0;
    recordNightDeviPathPoint(guest, chase, behavior);
    playNightDeviLoop(guest, chaseClip);
  }

  if (distance >= behavior.leashRange || !hasLineOfSight) {
    if (chase.leashAwaySince == null) {
      chase.leashAwaySince = performance.now();
    } else if (performance.now() - chase.leashAwaySince >= behavior.leashTimeoutMs) {
      beginNightDeviReturn(guest, chase);
      updateNightDeviReturn(guest, chase, behavior, deltaScale, resolveFloorY, moveHelpers);
      return;
    }
  } else {
    chase.leashAwaySince = null;
  }

  if (!hasLineOfSight) {
    playNightDeviLoop(guest, behavior.idleClip || "Idle");
    return;
  }

  if (distance <= behavior.attackRange) {
    startNightDeviAttack(guest, chase, getPlayerPosition);
    return;
  }

  // Past attack range through chaseRange: follow at half run speed.
  if (distance <= chaseRange) {
    chase.phase = "chasing";
    playNightDeviLoop(guest, chaseClip);
    moveNightDeviToward(
      guest,
      playerPosition.x,
      playerPosition.z,
      playerPosition.y,
      chaseSpeed,
      deltaScale,
      resolveFloorY,
      moveHelpers
    );
    recordNightDeviPathPoint(guest, chase, behavior);
    return;
  }

  // Engaged but beyond chase range: hold and face until leash return triggers.
  guest.root.rotation.y = Math.atan2(
    playerPosition.x - guest.root.position.x,
    playerPosition.z - guest.root.position.z
  );
  playNightDeviLoop(guest, behavior.idleClip || "Idle");
}

function updateNightDeviReturn(guest, chase, behavior, deltaScale, resolveFloorY, moveHelpers = {}) {
  const returnPath = chase.returnPath || [];
  const home = chase.home;
  const now = performance.now();
  const returnElapsed = chase.returnStartedAt != null ? now - chase.returnStartedAt : 0;

  if (!returnPath.length) {
    finishNightDeviReturn(guest, chase);
    return;
  }

  // If return takes longer than 75% of chase time and still not home, teleport.
  if (
    chase.returnDeadlineMs > 0
    && returnElapsed >= chase.returnDeadlineMs
    && horizontalDistanceXZ(
      guest.root.position.x,
      guest.root.position.z,
      home.x,
      home.z
    ) > 0.25
  ) {
    finishNightDeviReturn(guest, chase);
    return;
  }

  playNightDeviLoop(guest, resolveNightDeviWalkClip(guest));

  if (chase.returnIndex >= returnPath.length) {
    finishNightDeviReturn(guest, chase);
    return;
  }

  const target = returnPath[chase.returnIndex];
  const remaining = moveNightDeviToward(
    guest,
    target.x,
    target.z,
    target.y,
    behavior.walkSpeed ?? 0.075,
    deltaScale,
    resolveFloorY,
    moveHelpers
  );

  if (remaining > 0.05) {
    // Stay on this waypoint while walking (or blocked). Timeout handles stuck cases.
    return;
  }

  chase.returnIndex += 1;

  if (chase.returnIndex >= returnPath.length) {
    finishNightDeviReturn(guest, chase);
  }
}

function collectMeshMaterials(meshes) {
  const materials = new Set();

  meshes.forEach((mesh) => {
    if (mesh.material) {
      materials.add(mesh.material);
    }

    mesh.material?.subMaterials?.forEach((material) => {
      if (material) {
        materials.add(material);
      }
    });
  });

  return [...materials];
}

function attachImportRoots(result, contentRoot, root, getRootNodes) {
  const importRoots = result.rootNodes?.length
    ? result.rootNodes
    : getRootNodes(result);

  importRoots.forEach((node) => {
    if (node !== root && node !== contentRoot) {
      node.setParent(contentRoot);
    }
  });
}

async function loadGuestCharacter(BABYLON, scene, spawn, helpers) {
  const {
    getGeometryMeshes,
    getRootNodes,
    updateWorldMatrices,
    getFullBounds,
    softenModelMaterialReflections,
    targetHeight = GUEST_TARGET_HEIGHT
  } = helpers;

  console.info(`[guest-spawn] loading ${spawn.id} (${spawn.file})`);

  const assetRoot = spawn.assetRoot || GUEST_ASSET_ROOT;
  const encodedFile = encodeGuestAssetPath(spawn.file);
  const result = await Promise.race([
    BABYLON.SceneLoader.ImportMeshAsync("", assetRoot, encodedFile, scene),
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`guest load timeout: ${spawn.id}`));
      }, 45000);
    })
  ]);

  const root = new BABYLON.TransformNode(`guest-root-${spawn.id}`, scene);
  const contentRoot = new BABYLON.TransformNode(`guest-content-${spawn.id}`, scene);
  const meshes = getGeometryMeshes(result.meshes);

  contentRoot.parent = root;
  attachImportRoots(result, contentRoot, root, getRootNodes);

  updateWorldMatrices(root, meshes);
  const bounds = getFullBounds(BABYLON, meshes);

  if (bounds) {
    const center = bounds.center;
    contentRoot.position.addInPlace(new BABYLON.Vector3(-center.x, -bounds.min.y, -center.z));
  }

  updateWorldMatrices(root, meshes);
  const alignedBounds = getFullBounds(BABYLON, meshes);
  const rawHeight = Math.max(alignedBounds?.size?.y || 0, 0.001);
  const guestTargetHeight = Number.isFinite(spawn.targetHeight)
    ? spawn.targetHeight
    : targetHeight;
  const scaleMultiplier = spawn.scaleMultiplier ?? 1;
  const baseFitScale = guestTargetHeight / rawHeight;
  const fitScale = baseFitScale * scaleMultiplier;

  console.info(
    `[guest] ${spawn.id}: rawHeight=${rawHeight.toFixed(3)}m fitScale=${fitScale.toFixed(3)} file=${spawn.file}`
  );

  root.scaling.set(fitScale, fitScale, fitScale);
  updateWorldMatrices(root, meshes);

  applyGuestTreeCollisionFlags(root, spawn.id);
  const guestMeshes = typeof root.getChildMeshes === "function"
    ? root.getChildMeshes(true).filter((mesh) => typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() > 0)
    : meshes;

  softenModelMaterialReflections(BABYLON, collectMeshMaterials(guestMeshes));

  root.position.set(spawn.position.x, spawn.position.y, spawn.position.z);
  root.rotation.set(0, spawn.rotationY, 0);
  root.setEnabled(false);

  const animationGroups = result.animationGroups || [];
  stripGuestLocomotionRootMotion(BABYLON, animationGroups, spawn);
  const rootMotionNeutralizer = createRootMotionNeutralizer(BABYLON, { meshes: guestMeshes });

  return {
    spawn,
    root,
    contentRoot,
    meshes: guestMeshes,
    animationGroups,
    rootMotionNeutralizer,
    sequenceEndObserver: null,
    activeAnimationGroup: null,
    patrolTargetIndex: 0,
    patrolPhase: "moving",
    patrolArrivalPending: false,
    patrolFloorTick: 0,
    patrolSpeedFactor: 0,
    isVisibleShown: false,
    fitScale,
    baseFitScale,
    rawHeight,
    scaleMultiplier
  };
}

function applyGuestScale(guest, spawn) {
  const scaleMultiplier = spawn.scaleMultiplier ?? 1;
  const baseFitScale = guest.baseFitScale ?? guest.fitScale;
  guest.scaleMultiplier = scaleMultiplier;
  guest.fitScale = baseFitScale * scaleMultiplier;
  guest.root.scaling.set(guest.fitScale, guest.fitScale, guest.fitScale);
  syncGuestEnergyBar(guest);
  updateGuestDevLabelHeight(guest);
}

function serializeGuestAnimation(animation) {
  if (!animation) {
    return "";
  }

  return JSON.stringify({
    type: animation.type,
    clips: animation.clips || []
  });
}

function serializeGuestMovement(movement) {
  if (!movement) {
    return "";
  }

  return JSON.stringify(movement);
}

function resetGuestPatrolState(guest) {
  guest.patrolTargetIndex = 0;
  guest.patrolPhase = "moving";
  guest.patrolArrivalPending = false;
  guest.patrolSpeedFactor = 0;
  guest.patrolFloorTick = 0;
  initPatrolCycleSpeed(guest);
}

function disposeGuestRuntimeResources(guest) {
  stopGuestAnimation(guest);
  disposeGuestDevLabel(guest);

  guest.animationGroups?.forEach((group) => {
    try {
      group.stop();
      group.dispose();
    } catch {
      // ignore stale animation groups
    }
  });
  guest.animationGroups = [];

  const skeletons = new Set();
  guest.meshes?.forEach((mesh) => {
    if (mesh.skeleton) {
      skeletons.add(mesh.skeleton);
    }
  });

  guest.meshes?.forEach((mesh) => {
    try {
      mesh.dispose();
    } catch {
      // ignore stale meshes
    }
  });
  guest.meshes = [];

  skeletons.forEach((skeleton) => {
    try {
      skeleton.dispose();
    } catch {
      // ignore stale skeletons
    }
  });

  disposeGuestEnergyBar(guest);
  guest.contentRoot?.dispose();
  guest.root?.dispose();
  guest.contentRoot = null;
  guest.root = null;
  guest.resolvedSpawn = null;
  guest.nightChase = null;
}

export function createGuestCharacterSystem(BABYLON, scene, helpers = {}) {
  const guestsById = new Map();
  let visible = false;
  const loadPromises = new Map();
  let guestProjectEpoch = 0;
  let revealAnimStartedCount = 0;
  let revealAnimSkippedCount = 0;
  let sequenceNeutralizeFrame = 0;
  const {
    resolveSpawnPosition,
    resolveGuestFloorY,
    showDevLabels = false,
    resolveGuestLabelText = null,
    shouldAttachGuestLabel = null,
    isGuestLabelVisible = null,
    isGuestLabelOccluded = null,
    getPlayerPosition = null,
    getCollisionMeshes = null,
    canGuestMoveHorizontal = null,
    hasGuestLineOfSight = null
  } = helpers;

  function getGuestLabelText(guestOrSpawn) {
    const spawn = guestOrSpawn?.spawn || guestOrSpawn;

    if (typeof resolveGuestLabelText === "function") {
      return resolveGuestLabelText(spawn) || "";
    }

    return spawn?.devLabel || "";
  }

  function canAttachGuestLabel(guest) {
    const text = getGuestLabelText(guest);

    if (!text) {
      return false;
    }

    if (typeof shouldAttachGuestLabel === "function") {
      return shouldAttachGuestLabel(guest.spawn, text);
    }

    return showDevLabels === true;
  }

  function shouldGuestLabelBeVisible(guest) {
    if (!guest?.devLabel) {
      return false;
    }

    let visible = false;

    if (typeof isGuestLabelVisible === "function") {
      visible = isGuestLabelVisible(guest) === true;
    } else {
      visible = showDevLabels === true;
    }

    if (!visible) {
      return false;
    }

    if (typeof isGuestLabelOccluded === "function" && isGuestLabelOccluded(guest)) {
      return false;
    }

    return true;
  }

  function syncGuestDevLabelVisibility(guest) {
    setGuestDevLabelVisible(guest, shouldGuestLabelBeVisible(guest));
  }

  function resetRevealDiagnostics() {
    revealAnimStartedCount = 0;
    revealAnimSkippedCount = 0;
  }

  function attachGuestDevLabel(guest) {
    if (!canAttachGuestLabel(guest)) {
      disposeGuestDevLabel(guest);
      return;
    }

    disposeGuestDevLabel(guest);
    guest.devLabel = createGuestDevLabel(BABYLON, scene, guest, getGuestLabelText(guest));
    syncGuestDevLabelVisibility(guest);
  }

  function resolveGuestSpawn(spawn, guest = null) {
    const incomingIdentity = `${spawn.file || ""}::${spawn.assetRoot || ""}`;

    if (guest?.resolvedSpawn) {
      const cachedIdentity = `${guest.resolvedSpawn.file || ""}::${guest.resolvedSpawn.assetRoot || ""}`;

      if (cachedIdentity === incomingIdentity) {
        const latest = resolveSpawnPosition?.(spawn);
        const refreshed = {
          ...guest.resolvedSpawn,
          ...spawn,
          ...(latest || {}),
          position: latest?.position || guest.resolvedSpawn.position,
          movement: latest?.movement || guest.resolvedSpawn.movement
        };
        guest.resolvedSpawn = refreshed;
        return refreshed;
      }

      guest.resolvedSpawn = null;
    }

    const resolvedSpawn = resolveSpawnPosition?.(spawn);

    if (!resolvedSpawn || resolvedSpawn === spawn) {
      if (guest) {
        guest.resolvedSpawn = spawn;
      }

      return spawn;
    }

    if (guest) {
      guest.resolvedSpawn = resolvedSpawn;
    }

    return resolvedSpawn;
  }

  function getGuests() {
    return [...guestsById.values()];
  }

  function placeGuestAtResolvedSpawn(guest, resolvedSpawn) {
    guest.root.position.set(
      resolvedSpawn.position.x,
      resolvedSpawn.position.y,
      resolvedSpawn.position.z
    );
    guest.root.rotation.set(0, resolvedSpawn.rotationY, 0);
  }

  function startGuestPatrolIfNeeded(guest, wasVisible) {
    if (guest.spawn.movement?.type !== "patrol" || wasVisible) {
      return;
    }

    guest.patrolTargetIndex = 0;
    guest.patrolPhase = "moving";
    guest.patrolArrivalPending = false;
    guest.patrolSpeedFactor = 0;
    initPatrolCycleSpeed(guest);
  }

  function showGuest(guest, { force = false } = {}) {
    const resolvedSpawn = resolveGuestSpawn(guest.spawn, guest);
    guest.spawn = resolvedSpawn;
    const wasVisible = guest.isVisibleShown && guest.root.isEnabled();

    startGuestPatrolIfNeeded(guest, wasVisible);

    if (!wasVisible) {
      placeGuestAtResolvedSpawn(guest, resolvedSpawn);
    }

    guest.root.setEnabled(true);
    setGuestDevLabelVisible(guest, shouldGuestLabelBeVisible(guest));

    if (isNightDeviChaseGuest(guest) && !guest.nightChase?.engaged) {
      ensureNightDeviChaseState(guest);
      captureNightDeviHome(guest);
      attachGuestEnergyBar(BABYLON, scene, guest);
      syncGuestEnergyBar(guest);
    }

    if (!wasVisible || force) {
      guest.isVisibleShown = true;
      requestAnimationFrame(() => {
        if (!guest.root.isEnabled()) {
          return;
        }

        playGuestAnimation(guest);
      });
    }
  }

  function revealGuest(guestId) {
    revealGuests([guestId]);
  }

  function revealGuests(guestIds, options = {}) {
    if (!guestIds?.length) {
      return;
    }

    const idSet = new Set(guestIds);
    visible = true;
    const guests = getGuests().filter((guest) => idSet.has(guest.spawn.id));
    const guestsToAnimate = [];

    guests.forEach((guest) => {
      const resolvedSpawn = resolveGuestSpawn(guest.spawn, guest);
      guest.spawn = resolvedSpawn;
      const wasVisible = guest.isVisibleShown && guest.root.isEnabled();

      startGuestPatrolIfNeeded(guest, wasVisible);

      if (!wasVisible) {
        placeGuestAtResolvedSpawn(guest, resolvedSpawn);
      }
      guest.root.setEnabled(true);
      guest.isVisibleShown = true;
      setGuestDevLabelVisible(guest, shouldGuestLabelBeVisible(guest));

      if (isNightDeviChaseGuest(guest) && !guest.nightChase?.engaged) {
        ensureNightDeviChaseState(guest);
        captureNightDeviHome(guest);
        attachGuestEnergyBar(BABYLON, scene, guest);
        syncGuestEnergyBar(guest);
      }

      if (!wasVisible) {
        guestsToAnimate.push(guest);
      } else {
        revealAnimSkippedCount += 1;
      }
    });

    if (options.syncAnimations) {
      playSyncedSequenceAnimations(guests);
      return;
    }

    if (!guestsToAnimate.length) {
      return;
    }

    requestAnimationFrame(() => {
      guestsToAnimate.forEach((guest) => {
        if (!guest.root?.isEnabled()) {
          return;
        }

        revealAnimStartedCount += 1;
        playGuestAnimation(guest);
      });
    });
  }

  function show(options = {}) {
    const excludeIds = new Set(options.excludeIds || []);
    const includeIds = options.includeIds?.length ? new Set(options.includeIds) : null;
    visible = true;
    getGuests().forEach((guest) => {
      const guestId = guest.spawn.id;

      if (includeIds && !includeIds.has(guestId)) {
        return;
      }

      if (excludeIds.has(guestId)) {
        return;
      }

      showGuest(guest);
    });
  }

  function hide(options = {}) {
    const onlyIds = options.onlyIds?.length ? new Set(options.onlyIds) : null;

    getGuests().forEach((guest) => {
      const guestId = guest.spawn.id;

      if (onlyIds && !onlyIds.has(guestId)) {
        return;
      }

      stopGuestAnimation(guest);
      guest.patrolTargetIndex = 0;
      guest.patrolPhase = "moving";
      guest.patrolArrivalPending = false;
      guest.patrolFloorTick = 0;
      guest.patrolSpeedFactor = 0;
      guest.isVisibleShown = false;
      guest.root.setEnabled(false);
      setGuestDevLabelVisible(guest, false);
    });

    if (!onlyIds) {
      visible = false;
      return;
    }

    visible = getGuests().some((guest) => guest.root.isEnabled());
  }

  function disposeGuests(options = {}) {
    const onlyIds = options.onlyIds?.length ? new Set(options.onlyIds) : null;
    guestProjectEpoch += 1;

    getGuests().forEach((guest) => {
      const guestId = guest.spawn.id;

      if (onlyIds && !onlyIds.has(guestId)) {
        return;
      }

      disposeGuestRuntimeResources(guest);
      guestsById.delete(guestId);
      loadPromises.delete(guestId);
    });

    if (!onlyIds) {
      visible = false;
      return;
    }

    visible = getGuests().some((guest) => guest.root.isEnabled());
  }

  async function dispose() {
    hide();
    guestProjectEpoch += 1;

    getGuests().forEach((guest) => {
      disposeGuestRuntimeResources(guest);
    });

    guestsById.clear();
    loadPromises.clear();
  }

  async function disposeGuestInstance(guest) {
    disposeGuestRuntimeResources(guest);
  }

  function getGuestSceneAudit() {
    const guests = getGuests();
    const tourGuestMeshes = scene.meshes.filter((mesh) => mesh.metadata?.tourGuest);
    const enabledGuests = guests.filter((guest) => guest.root?.isEnabled?.());

    return {
      guestCount: guests.length,
      enabledGuestCount: enabledGuests.length,
      tourGuestMeshCount: tourGuestMeshes.length,
      animationGroupCount: scene.animationGroups?.length ?? 0,
      skeletonCount: scene.skeletons?.length ?? 0,
      renderObserverCount: scene.onBeforeRenderObservable?.observers?.length ?? 0,
      guestIds: guests.map((guest) => guest.spawn.id),
      enabledGuestIds: enabledGuests.map((guest) => guest.spawn.id),
      revealAnimStartedCount,
      revealAnimSkippedCount
    };
  }

  async function loadSpawn(spawn, { showOnLoad = true } = {}) {
    const existingGuest = guestsById.get(spawn.id);

    // Compare against the incoming spawn BEFORE resolveGuestSpawn, so a stale
    // resolvedSpawn cache (e.g. day Monkey preload for Mark-4/5/6) cannot block
    // a night Devi reload.
    if (existingGuest) {
      if (
        existingGuest.spawn?.file !== spawn.file
        || (existingGuest.spawn?.assetRoot || "") !== (spawn.assetRoot || "")
      ) {
        await disposeGuestInstance(existingGuest);
        guestsById.delete(spawn.id);
        loadPromises.delete(spawn.id);
      }
    }

    const resolvedSpawn = resolveGuestSpawn(spawn, guestsById.get(spawn.id));

    if (guestsById.has(resolvedSpawn.id)) {
      const existing = guestsById.get(resolvedSpawn.id);
      const previousMovementKey = serializeGuestMovement(existing.spawn?.movement);
      const nextMovementKey = serializeGuestMovement(resolvedSpawn.movement);
      const previousAnimationKey = serializeGuestAnimation(existing.spawn?.animation);
      const nextAnimationKey = serializeGuestAnimation(resolvedSpawn.animation);
      existing.spawn = resolvedSpawn;
      applyGuestScale(existing, resolvedSpawn);
      attachGuestDevLabel(existing);

      const movementChanged = previousMovementKey !== nextMovementKey;
      const alreadyPatrolling = existing.isVisibleShown
        && existing.root.isEnabled()
        && existing.spawn.movement?.type === "patrol"
        && !movementChanged;

      if (!alreadyPatrolling) {
        existing.root.position.set(
          resolvedSpawn.position.x,
          resolvedSpawn.position.y,
          resolvedSpawn.position.z
        );
      }

      if (isNightDeviChaseGuest(existing) && !existing.nightChase?.engaged) {
        captureNightDeviHome(existing);
        attachGuestEnergyBar(BABYLON, scene, existing);
        syncGuestEnergyBar(existing);
      }

      if (previousMovementKey !== nextMovementKey && resolvedSpawn.movement?.type === "patrol") {
        resetGuestPatrolState(existing);

        if (existing.isVisibleShown && existing.root.isEnabled()) {
          stopGuestAnimation(existing);
          playGuestAnimation(existing);
        }
      } else if (
        previousAnimationKey !== nextAnimationKey
        && existing.isVisibleShown
        && existing.root.isEnabled()
      ) {
        stopGuestAnimation(existing);
        playGuestAnimation(existing);
      }

      if (visible && showOnLoad) {
        showGuest(existing);
      }

      return existing;
    }

    if (loadPromises.has(resolvedSpawn.id)) {
      return loadPromises.get(resolvedSpawn.id);
    }

    const loadEpoch = guestProjectEpoch;
    const loadPromise = loadGuestCharacter(BABYLON, scene, resolvedSpawn, helpers)
      .then((guest) => {
        if (!guest || loadEpoch !== guestProjectEpoch) {
          if (guest) {
            disposeGuestInstance(guest);
          }

          return null;
        }

        guest.spawn = resolvedSpawn;
        guest.resolvedSpawn = resolvedSpawn;
        guestsById.set(resolvedSpawn.id, guest);
        loadPromises.delete(resolvedSpawn.id);
        attachGuestDevLabel(guest);

        if (isNightDeviChaseGuest(guest)) {
          ensureNightDeviChaseState(guest);
          captureNightDeviHome(guest);
          attachGuestEnergyBar(BABYLON, scene, guest);
          syncGuestEnergyBar(guest);
        }

        if (visible && showOnLoad) {
          showGuest(guest);
        }

        return guest;
      })
      .catch((error) => {
        loadPromises.delete(resolvedSpawn.id);
        console.error(`[guest] failed to load ${resolvedSpawn.id}`, error);
        return null;
      });

    loadPromises.set(resolvedSpawn.id, loadPromise);
    return loadPromise;
  }

  async function ensureSpawned(spawns, { parallel = false, showOnLoad = true, yieldBetweenLoads = 0 } = {}) {
    if (parallel && !yieldBetweenLoads) {
      const results = await Promise.all(
        spawns.map((spawn) => loadSpawn(spawn, { showOnLoad: false }))
      );
      const guests = results.filter(Boolean);

      if (visible && showOnLoad) {
        guests.forEach(showGuest);
      }

      return guests;
    }

    const results = [];

    for (let index = 0; index < spawns.length; index += 1) {
      const guest = await loadSpawn(spawns[index], { showOnLoad: parallel ? false : showOnLoad });

      if (guest) {
        results.push(guest);
      }

      if (yieldBetweenLoads > 0 && index < spawns.length - 1) {
        await new Promise((resolve) => {
          let remaining = yieldBetweenLoads;
          const step = () => {
            remaining -= 1;
            if (remaining <= 0) {
              resolve();
              return;
            }
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }
    }

    if (visible && showOnLoad && parallel) {
      results.forEach(showGuest);
    }

    return results;
  }

  async function preloadAsset(spawn) {
    // Warm the browser HTTP cache for repeated night Devi loads.
    try {
      const assetRoot = spawn.assetRoot || GUEST_ASSET_ROOT;
      const encodedFile = encodeGuestAssetPath(spawn.file);
      await fetch(`${assetRoot}${encodedFile}`, { cache: "force-cache" });
      return true;
    } catch (error) {
      console.warn(`[guest-spawn] preloadAsset failed for ${spawn.file}`, error);
      return false;
    }
  }

  async function preload(spawns, options = {}) {
    return ensureSpawned(spawns, options);
  }

  function isSpawned(spawnId) {
    return guestsById.has(spawnId);
  }

  function update(deltaScale) {
    if (!visible) {
      return;
    }

    sequenceNeutralizeFrame += 1;
    const shouldNeutralizeSequence = sequenceNeutralizeFrame % 2 === 0;

    getGuests().forEach((guest) => {
      if (!guest.root?.isEnabled()) {
        return;
      }

      if (guest.devLabel) {
        updateGuestDevLabelHeight(guest);
        syncGuestDevLabelVisibility(guest);
      }

      if (isNightDeviChaseGuest(guest)) {
        updateNightDeviChase(guest, deltaScale, resolveGuestFloorY, getPlayerPosition, {
          BABYLON,
          scene,
          getCollisionMeshes,
          canGuestMoveHorizontal,
          hasGuestLineOfSight
        });
        return;
      }

      if (guest.spawn.movement?.type === "patrol") {
        updateGuestPatrol(guest, deltaScale, resolveGuestFloorY);

        if (guest.patrolPhase === "idle" && isGuestPlayingAngjiDanceRootMotion(guest)) {
          applyGuestPlanarRootMotion(guest);
        }

        return;
      }

      if (guest.spawn.movement?.type === "rootMotion") {
        applyGuestPlanarRootMotion(guest);
        return;
      }

      if (isGuestPlayingAngjiDanceRootMotion(guest)) {
        applyGuestPlanarRootMotion(guest);
        return;
      }

      if (guest.spawn.animation?.type === "sequence" && shouldNeutralizeSequence) {
        guest.rootMotionNeutralizer?.neutralize?.({ syncSample: true });
      }
    });
  }

  function refreshDevLabels() {
    getGuests().forEach((guest) => {
      attachGuestDevLabel(guest);
      updateGuestDevLabelHeight(guest);
      syncGuestDevLabelVisibility(guest);
    });
  }

  function applyGuestLabelTexts() {
    getGuests().forEach((guest) => {
      const text = getGuestLabelText(guest);

      if (!text) {
        return;
      }

      if (guest.devLabel) {
        setGuestDevLabelText(guest, text);
      } else if (canAttachGuestLabel(guest)) {
        attachGuestDevLabel(guest);
      }

      updateGuestDevLabelHeight(guest);
      syncGuestDevLabelVisibility(guest);
    });
  }

  return {
    ensureSpawned,
    preload,
    preloadAsset,
    show,
    revealGuest,
    revealGuests,
    hide,
    disposeGuests,
    dispose,
    update,
    refreshDevLabels,
    applyGuestLabelTexts,
    getGuests,
    getGuestSceneAudit,
    resetRevealDiagnostics,
    isSpawned
  };
}
