import {
  isAngjiDanceAnimationClip,
  shouldAngjiGuestAllowDanceRootMotion
} from "./angji-guest-config.js?v=angji-guest-mark21-22-offset-20260713";
import {
  createGuestDevLabel,
  disposeGuestDevLabel,
  setGuestDevLabelVisible,
  updateGuestDevLabelHeight
} from "./guest-dev-label.js?v=jinju-guest-label-scale-fix-20260705";
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
  const loadTask = BABYLON.SceneLoader.ImportMeshAsync("", assetRoot, encodedFile, scene);
  const result = await Promise.race([
    loadTask,
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
  const scaleMultiplier = spawn.scaleMultiplier ?? 1;
  const baseFitScale = targetHeight / rawHeight;
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

  guest.contentRoot?.dispose();
  guest.root?.dispose();
  guest.contentRoot = null;
  guest.root = null;
  guest.resolvedSpawn = null;
}

export function createGuestCharacterSystem(BABYLON, scene, helpers = {}) {
  const guestsById = new Map();
  let visible = false;
  const loadPromises = new Map();
  let guestProjectEpoch = 0;
  let revealAnimStartedCount = 0;
  let revealAnimSkippedCount = 0;
  let sequenceNeutralizeFrame = 0;
  const { resolveSpawnPosition, resolveGuestFloorY, showDevLabels = false } = helpers;

  function resetRevealDiagnostics() {
    revealAnimStartedCount = 0;
    revealAnimSkippedCount = 0;
  }

  function attachGuestDevLabel(guest) {
    if (!showDevLabels || !guest.spawn?.devLabel) {
      return;
    }

    disposeGuestDevLabel(guest);
    guest.devLabel = createGuestDevLabel(BABYLON, scene, guest, guest.spawn.devLabel);
  }

  function resolveGuestSpawn(spawn, guest = null) {
    if (guest?.resolvedSpawn) {
      return guest.resolvedSpawn;
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

  function showGuest(guest, { force = false } = {}) {
    const resolvedSpawn = resolveGuestSpawn(guest.spawn, guest);
    guest.spawn = resolvedSpawn;
    const wasVisible = guest.isVisibleShown && guest.root.isEnabled();

    if (!wasVisible && guest.spawn.movement?.type === "patrol") {
      guest.patrolTargetIndex = 0;
      guest.patrolPhase = "moving";
      guest.patrolArrivalPending = false;
      guest.patrolSpeedFactor = 0;
      initPatrolCycleSpeed(guest);
    }

    guest.root.position.set(
      resolvedSpawn.position.x,
      resolvedSpawn.position.y,
      resolvedSpawn.position.z
    );
    guest.root.rotation.set(0, resolvedSpawn.rotationY, 0);
    guest.root.setEnabled(true);
    setGuestDevLabelVisible(guest, true);

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

      if (!wasVisible && guest.spawn.movement?.type === "patrol") {
        guest.patrolTargetIndex = 0;
        guest.patrolPhase = "moving";
        guest.patrolArrivalPending = false;
        guest.patrolSpeedFactor = 0;
        initPatrolCycleSpeed(guest);
      }

      guest.root.position.set(
        resolvedSpawn.position.x,
        resolvedSpawn.position.y,
        resolvedSpawn.position.z
      );
      guest.root.rotation.set(0, resolvedSpawn.rotationY, 0);
      guest.root.setEnabled(true);
      guest.isVisibleShown = true;
      setGuestDevLabelVisible(guest, true);

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
    const resolvedSpawn = resolveGuestSpawn(spawn, existingGuest);

    if (guestsById.has(resolvedSpawn.id)) {
      const existing = guestsById.get(resolvedSpawn.id);

      if (existing.spawn?.file !== resolvedSpawn.file) {
        await disposeGuestInstance(existing);
        guestsById.delete(resolvedSpawn.id);
        loadPromises.delete(resolvedSpawn.id);
      } else {
        const previousMovementKey = serializeGuestMovement(existing.spawn?.movement);
        const nextMovementKey = serializeGuestMovement(resolvedSpawn.movement);
        const previousAnimationKey = serializeGuestAnimation(existing.spawn?.animation);
        const nextAnimationKey = serializeGuestAnimation(resolvedSpawn.animation);
        existing.spawn = resolvedSpawn;
        existing.root.position.set(
          resolvedSpawn.position.x,
          resolvedSpawn.position.y,
          resolvedSpawn.position.z
        );
        applyGuestScale(existing, resolvedSpawn);
        attachGuestDevLabel(existing);

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

  async function ensureSpawned(spawns, { parallel = false, showOnLoad = true } = {}) {
    if (parallel) {
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

    for (const spawn of spawns) {
      const guest = await loadSpawn(spawn, { showOnLoad });

      if (guest) {
        results.push(guest);
      }
    }

    return results;
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

  return {
    ensureSpawned,
    preload,
    show,
    revealGuest,
    revealGuests,
    hide,
    disposeGuests,
    dispose,
    update,
    getGuests,
    getGuestSceneAudit,
    resetRevealDiagnostics,
    isSpawned
  };
}
