/**
 * Guest dance GLBs store planar travel on an Idle/IDLE root node (not Mixamo Hips).
 * Prefer that node, then classic hips/pelvis/root/spine.
 */
const ROOT_MOTION_BONE_PATTERN = /^(idle|hips|pelvis|root|spine)(?:\.|$)/i;
const ROOT_NODE_PATTERN = /hips|pelvis|root|armature|mixamorig|Idle_Standard|^idle$|^spine(?:\.|$)/i;
const LOCOMOTION_TRANSLATION_STRIP_RANGE = 0.5;

function isKnownRootMotionBone(name) {
  return ROOT_MOTION_BONE_PATTERN.test(String(name || ""));
}

function isRootMotionTarget(target) {
  const name = target?.name || "";
  return isKnownRootMotionBone(name) || ROOT_NODE_PATTERN.test(name);
}

function isRuntimeTranslationBone(boneName) {
  return isKnownRootMotionBone(boneName);
}

/** Higher score = better root-motion carrier. */
function scoreRootMotionBoneName(name) {
  const n = String(name || "");

  if (/^idle(_standard|_dwarf)?$/i.test(n)) {
    return 100;
  }

  if (/^(mixamorig[:_]?)?hips$/i.test(n)) {
    return 90;
  }

  if (/^(mixamorig[:_]?)?pelvis$/i.test(n)) {
    return 80;
  }

  if (/^root$/i.test(n)) {
    return 70;
  }

  if (/^spine$/i.test(n)) {
    return 60;
  }

  if (/^spine\.\d+/i.test(n)) {
    return 5;
  }

  if (isRuntimeTranslationBone(n)) {
    return 1;
  }

  return -1;
}

function getTranslationKeyRange(animation) {
  const keys = animation.getKeys?.() || [];
  if (keys.length <= 1) {
    return 0;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  keys.forEach((key) => {
    const value = key.value;
    const x = value?.x ?? value?.[0] ?? 0;
    const y = value?.y ?? value?.[1] ?? 0;
    const z = value?.z ?? value?.[2] ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  return Math.max(maxX - minX, maxY - minY, maxZ - minZ);
}

function flattenRootPositionKeys(BABYLON, animation, target = null) {
  const keys = animation.getKeys?.() || [];
  if (keys.length <= 1) {
    return;
  }

  const base = keys[0].value;
  const baseX = base?.x ?? base?.[0] ?? 0;
  const baseY = base?.y ?? base?.[1] ?? 0;
  const baseZ = base?.z ?? base?.[2] ?? 0;

  keys.forEach((key) => {
    if (key.value?.clone) {
      key.value.x = baseX;
      key.value.y = baseY;
      key.value.z = baseZ;
    } else if (Array.isArray(key.value)) {
      key.value[0] = baseX;
      key.value[1] = baseY;
      key.value[2] = baseZ;
    } else if (key.value && typeof key.value === "object") {
      key.value.x = baseX;
      key.value.y = baseY;
      key.value.z = baseZ;
    }
  });

  animation.setKeys(keys);
}

/** Jump_Over: keep Idle_Standard Y arc; strip only horizontal root drift on the capsule. */
function flattenRootPositionKeysPlanar(_BABYLON, animation, target = null) {
  const keys = animation.getKeys?.() || [];
  if (keys.length <= 1) {
    return;
  }

  const base = keys[0].value;
  const baseX = base?.x ?? base?.[0] ?? 0;
  const baseZ = base?.z ?? base?.[2] ?? 0;

  keys.forEach((key) => {
    if (key.value?.clone) {
      key.value.x = baseX;
      key.value.z = baseZ;
    } else if (Array.isArray(key.value)) {
      key.value[0] = baseX;
      key.value[2] = baseZ;
    } else if (key.value && typeof key.value === "object") {
      key.value.x = baseX;
      key.value.z = baseZ;
    }
  });

  animation.setKeys(keys);
}

function isPositionTargetProperty(prop) {
  const name = String(prop || "");
  return name === "position" || name.startsWith("position.");
}

function shouldStripPositionAnimation(target, animation) {
  if (!isPositionTargetProperty(animation?.targetProperty)) {
    return false;
  }

  if (isRootMotionTarget(target)) {
    return true;
  }

  return getTranslationKeyRange(animation) > LOCOMOTION_TRANSLATION_STRIP_RANGE;
}

function normalizeClipKey(name) {
  return String(name || "").trim().toLowerCase();
}

function flattenToFirstKey(animation) {
  const keys = animation.getKeys?.() || [];
  if (keys.length <= 1) {
    return;
  }

  const base = keys[0].value;
  const baseX = base?.x ?? base?.[0] ?? 0;
  const baseY = base?.y ?? base?.[1] ?? 0;
  const baseZ = base?.z ?? base?.[2] ?? 0;

  keys.forEach((key) => {
    if (key.value?.clone) {
      key.value.x = baseX;
      key.value.y = baseY;
      key.value.z = baseZ;
    } else if (Array.isArray(key.value)) {
      key.value[0] = baseX;
      key.value[1] = baseY;
      key.value[2] = baseZ;
    } else if (key.value && typeof key.value === "object") {
      key.value.x = baseX;
      key.value.y = baseY;
      key.value.z = baseZ;
    }
  });

  animation.setKeys(keys);
}

/** Freeze Idle/IDLE/Idle_Standard translation so idle/walk cannot skate. */
export function freezeIdleCarrierTranslation(animationGroups, clipNames = [], options = {}) {
  const clipSet = new Set((clipNames || []).map(normalizeClipKey).filter(Boolean));
  const skipClipNames = new Set((options.skipClipNames || []).map(normalizeClipKey).filter(Boolean));

  animationGroups.forEach((group) => {
    const groupName = normalizeClipKey(group.name);

    if (skipClipNames.has(groupName)) {
      return;
    }

    if (clipSet.size > 0 && !clipSet.has(groupName)) {
      const matchesNamedClip = group.targetedAnimations?.some((ta) => (
        clipSet.has(normalizeClipKey(ta.animation?.name))
      ));
      if (!matchesNamedClip) {
        return;
      }
    }

    const targeted = [...(group.targetedAnimations || [])];

    targeted.forEach((item) => {
      if (!isPositionTargetProperty(item.animation?.targetProperty)) {
        return;
      }

      if (!isIdleTransformCarrierName(item.target?.name)) {
        return;
      }

      const keys = item.animation.getKeys?.() || [];
      const first = keys[0]?.value;
      const preferStandard = /^(idle|idle_standard)$/i.test(groupName);
      const alreadyPreferred = item.target._idleCarrierRestPreferred === true;

      // Reuse Idle_Standard rest for Idle_Dwarf etc. so clip switches do not jump.
      let rest;
      if (alreadyPreferred && item.target.position && !preferStandard) {
        rest = {
          x: item.target.position.x,
          y: item.target.position.y,
          z: item.target.position.z
        };
      } else {
        rest = {
          x: first?.x ?? first?.[0] ?? 0,
          y: first?.y ?? first?.[1] ?? 0,
          z: first?.z ?? first?.[2] ?? 0
        };
      }

      flattenToRestValue(item.animation, rest);

      if (preferStandard || !alreadyPreferred) {
        if (item.target.position) {
          item.target.position.x = rest.x;
          item.target.position.y = rest.y;
          item.target.position.z = rest.z;
        }

        if (typeof item.target.setPosition === "function") {
          try {
            item.target.setPosition(item.target.position);
          } catch {
            // Bone.setPosition(space) signatures vary by Babylon version.
          }
        }

        item.target._idleCarrierRestPreferred = preferStandard;
      }

      const scene = item.target.getScene?.();
      try {
        scene?.stopAnimation?.(item.target, item.animation.targetProperty);
      } catch {
        // ignore
      }

      try {
        group.removeTargetedAnimation?.(item.animation);
      } catch {
        // ignore
      }

      const index = group.targetedAnimations?.indexOf(item) ?? -1;
      if (index >= 0) {
        group.targetedAnimations.splice(index, 1);
      }
    });
  });
}

function flattenToRestValue(animation, rest) {
  const keys = animation.getKeys?.() || [];
  if (keys.length <= 1) {
    if (keys.length === 1) {
      const key = keys[0];
      if (key.value?.clone) {
        key.value.x = rest.x;
        key.value.y = rest.y;
        key.value.z = rest.z;
      } else if (Array.isArray(key.value)) {
        key.value[0] = rest.x;
        key.value[1] = rest.y;
        key.value[2] = rest.z;
      } else if (key.value && typeof key.value === "object") {
        key.value.x = rest.x;
        key.value.y = rest.y;
        key.value.z = rest.z;
      }
      animation.setKeys(keys);
    }
    return;
  }

  keys.forEach((key) => {
    if (key.value?.clone) {
      key.value.x = rest.x;
      key.value.y = rest.y;
      key.value.z = rest.z;
    } else if (Array.isArray(key.value)) {
      key.value[0] = rest.x;
      key.value[1] = rest.y;
      key.value[2] = rest.z;
    } else if (key.value && typeof key.value === "object") {
      key.value.x = rest.x;
      key.value.y = rest.y;
      key.value.z = rest.z;
    }
  });

  animation.setKeys(keys);
}

export function stripLocomotionRootMotion(BABYLON, animationGroups, clipNames = [], options = {}) {
  const clipSet = new Set((clipNames || []).map(normalizeClipKey).filter(Boolean));
  const preserveVerticalClipNames = new Set(
    (options.preserveVerticalClipNames || []).map(normalizeClipKey).filter(Boolean)
  );
  const forceStripAllPosition = Boolean(options.forceStripAllPosition);

  animationGroups.forEach((group) => {
    const groupName = normalizeClipKey(group.name);

    if (clipSet.size > 0 && !clipSet.has(groupName)) {
      const matchesNamedClip = group.targetedAnimations.some((ta) => (
        clipSet.has(normalizeClipKey(ta.animation?.name))
      ));
      if (!matchesNamedClip) {
        return;
      }
    }

    const preserveVertical = preserveVerticalClipNames.has(groupName)
      || group.targetedAnimations.some((ta) => (
        preserveVerticalClipNames.has(normalizeClipKey(ta.animation?.name))
      ));

    group.targetedAnimations.forEach((targeted) => {
      const shouldStrip = forceStripAllPosition
        ? isPositionTargetProperty(targeted.animation?.targetProperty)
        : shouldStripPositionAnimation(targeted.target, targeted.animation);

      if (!shouldStrip) {
        return;
      }

      if (preserveVertical) {
        flattenRootPositionKeysPlanar(BABYLON, targeted.animation, targeted.target);
      } else {
        flattenRootPositionKeys(BABYLON, targeted.animation, targeted.target);
      }
    });
  });
}

function isIdleTransformCarrierName(name) {
  return /^(idle|idle_standard|idle_dwarf)$/i.test(String(name || ""));
}

function isSkeletonBoneTarget(target) {
  return Boolean(target?.getIndex)
    || Boolean(target?.getSkeleton)
    || /bone/i.test(target?.getClassName?.() || "");
}

function isUnderContentRoot(node, contentRoot) {
  if (!node || !contentRoot) {
    return false;
  }

  let current = node;
  const seen = new Set();

  while (current && !seen.has(current)) {
    if (current === contentRoot) {
      return true;
    }

    seen.add(current);
    current = current.parent;
  }

  return false;
}

/**
 * PlayerRoot in-place policy (player TPS only):
 * - Movement lives on asset.root (PlayerRoot)
 * - GLB under contentRoot is visual-only for Idle/Walk/Run
 * - Strip TransformNode planar/full translation keys (not every bone — keeps gestures)
 * - Jump clips may preserve vertical translation via options.preserveVerticalClipNames
 *
 * Returns the rest local positions captured for runtime pinning.
 */
export function applyPlayerRootInPlacePolicy(BABYLON, asset, animationGroups, clipNames = [], options = {}) {
  const clipSet = new Set((clipNames || []).map(normalizeClipKey).filter(Boolean));
  const skipClipNames = new Set((options.skipClipNames || []).map(normalizeClipKey).filter(Boolean));
  const preserveVerticalClipNames = new Set(
    (options.preserveVerticalClipNames || []).map(normalizeClipKey).filter(Boolean)
  );
  const restByNode = new Map();

  // Classic hips/root strip (bones + known carriers).
  stripLocomotionRootMotion(BABYLON, animationGroups, clipNames, {
    preserveVerticalClipNames: options.preserveVerticalClipNames || []
  });

  // Freeze / detach Idle_Standard style carriers from locomotion clips.
  freezeIdleCarrierTranslation(animationGroups, clipNames, {
    skipClipNames: options.skipClipNames || []
  });

  // Extra pass: any remaining TransformNode position tracks under content
  // (not skeleton bones) for in-place clips — ignore root motion on the mesh.
  animationGroups.forEach((group) => {
    const groupName = normalizeClipKey(group.name);

    if (skipClipNames.has(groupName)) {
      return;
    }

    if (clipSet.size > 0 && !clipSet.has(groupName)) {
      const matchesNamedClip = group.targetedAnimations?.some((ta) => (
        clipSet.has(normalizeClipKey(ta.animation?.name))
      ));
      if (!matchesNamedClip) {
        return;
      }
    }

    const preserveVertical = preserveVerticalClipNames.has(groupName);
    const targeted = [...(group.targetedAnimations || [])];

    targeted.forEach((item) => {
      if (!isPositionTargetProperty(item.animation?.targetProperty)) {
        return;
      }

      const target = item.target;
      if (!target || isSkeletonBoneTarget(target)) {
        return;
      }

      const underContent = isUnderContentRoot(target, asset?.contentRoot);
      const isCarrier = isIdleTransformCarrierName(target.name)
        || isRootMotionTarget(target);

      if (!underContent && !isCarrier) {
        return;
      }

      if (preserveVertical) {
        flattenRootPositionKeysPlanar(BABYLON, item.animation, target);
      } else {
        flattenRootPositionKeys(BABYLON, item.animation, target);
      }

      if (target.position?.clone && !restByNode.has(target)) {
        restByNode.set(target, target.position.clone());
      }
    });
  });

  // Content attach point is fixed — PlayerRoot alone translates in world space.
  if (asset?.contentRoot?.position) {
    asset._playerContentRest = asset.contentRoot.position.clone();
    asset._playerRootInPlace = true;
  }

  return restByNode;
}

function captureNodeRotation(node) {
  return {
    rotation: node?.rotation?.clone?.() || null,
    rotationQuaternion: node?.rotationQuaternion?.clone?.() || null
  };
}

function applyNodeRotation(node, restRot) {
  if (!node || !restRot) {
    return;
  }

  if (restRot.rotationQuaternion && node.rotationQuaternion) {
    node.rotationQuaternion.copyFrom(restRot.rotationQuaternion);
    return;
  }

  if (restRot.rotation && node.rotation) {
    node.rotation.copyFrom(restRot.rotation);
  }
}

function isSoleBoneName(name) {
  const n = String(name || "");
  return /^toe\.[lr]$/i.test(n)
    || /^(mixamorig[:_]?)?(left|right)(toe|toebase)$/i.test(n);
}

function isAnkleBoneName(name) {
  const n = String(name || "");
  return /^foot\.[lr]$/i.test(n)
    || /^(mixamorig[:_]?)?(left|right)foot$/i.test(n);
}

export function createRootMotionNeutralizer(BABYLON, asset) {
  const restLocalByBone = new Map();
  const restLocalByNode = new Map();
  const restRotByNode = new Map();
  const restLocalByIdleBone = new Map();
  const restRotByIdleBone = new Map();
  const pinTransformCarriers = Boolean(asset?.pinTransformCarriers);
  const captureIdleNodes = pinTransformCarriers || Boolean(asset?.captureIdleNodes);
  let rootMotionBone = null;
  let rootMotionNode = null;
  let lastRootWorld = null;
  let lastLocal = null;
  const tempLocalDelta = new BABYLON.Vector3();
  const tempWorldDelta = new BABYLON.Vector3();
  const defaultContentRoot = asset.contentRoot?.position?.clone?.() || new BABYLON.Vector3();
  const restContentRoot = defaultContentRoot.clone();
  const restFootLocal = new BABYLON.Vector3();
  let hasFootPlant = false;
  let footPlantActive = false;
  let plantOffsetBlend = 1;

  function captureRestPose(skeleton) {
    skeleton.bones.forEach((bone) => {
      if (!isRuntimeTranslationBone(bone.name) || restLocalByBone.has(bone.name)) {
        return;
      }

      restLocalByBone.set(bone.name, bone.getPosition(BABYLON.Space.LOCAL).clone());
    });
  }

  function captureIdleBones(skeleton) {
    if (!captureIdleNodes || !skeleton?.bones) {
      return;
    }

    skeleton.bones.forEach((bone) => {
      if (!isIdleTransformCarrierName(bone.name) || restLocalByIdleBone.has(bone)) {
        return;
      }

      const linked = bone.getTransformNode?.();
      const rest = linked?.position?.clone?.()
        || bone.getPosition(BABYLON.Space.LOCAL).clone();
      restLocalByIdleBone.set(bone, rest);

      if (!restRotByIdleBone.has(bone) && bone.getRotation) {
        restRotByIdleBone.set(bone, bone.getRotation(BABYLON.Space.LOCAL).clone());
      }

      if (linked?.position && !restLocalByNode.has(linked)) {
        restLocalByNode.set(linked, rest.clone());
        restRotByNode.set(linked, captureNodeRotation(linked));
      }
    });
  }

  function resolveRootMotionBone() {
    if (rootMotionBone) {
      return rootMotionBone;
    }

    let best = null;
    let bestScore = -1;

    for (const mesh of asset.meshes) {
      const skeleton = mesh.skeleton;
      if (!skeleton?.bones) {
        continue;
      }

      skeleton.bones.forEach((bone) => {
        const score = scoreRootMotionBoneName(bone.name);

        if (score > bestScore) {
          bestScore = score;
          best = bone;
        }
      });
    }

    rootMotionBone = bestScore > 0 ? best : null;
    return rootMotionBone;
  }

  function visitTransformNode(node, visited) {
    if (!node || visited.has(node)) {
      return;
    }

    visited.add(node);

    if (isIdleTransformCarrierName(node.name) && node.position?.clone && !restLocalByNode.has(node)) {
      restLocalByNode.set(node, node.position.clone());
      restRotByNode.set(node, captureNodeRotation(node));
    }

    const children = typeof node.getChildren === "function"
      ? node.getChildren()
      : (node.getChildTransformNodes?.(false) || []);

    children.forEach((child) => visitTransformNode(child, visited));
  }

  function captureTransformCarriers() {
    if (!captureIdleNodes) {
      return;
    }

    const visited = new Set();

    [asset.contentRoot, asset.root, ...(asset.meshes || [])].forEach((node) => {
      let current = node;
      const climbed = new Set();

      while (current && !climbed.has(current)) {
        climbed.add(current);
        visitTransformNode(current, visited);
        current = current.parent;
      }
    });
  }

  let cachedFootBones = null;

  function collectFootBones() {
    if (cachedFootBones) {
      return cachedFootBones;
    }

    const soles = [];
    const seenSoles = new Set();
    const ankles = [];
    const seenAnkles = new Set();

    (asset.meshes || []).forEach((mesh) => {
      mesh.skeleton?.bones.forEach((bone) => {
        if (isSoleBoneName(bone.name) && !seenSoles.has(bone.name)) {
          seenSoles.add(bone.name);
          soles.push(bone);
        } else if (isAnkleBoneName(bone.name) && !seenAnkles.has(bone.name)) {
          seenAnkles.add(bone.name);
          ankles.push(bone);
        }
      });
    });

    cachedFootBones = soles.length >= 2 ? soles : ankles;
    return cachedFootBones;
  }

  function prepareFootSkeletons() {
    const skeletons = new Set();
    (asset.meshes || []).forEach((mesh) => {
      if (mesh.skeleton) {
        skeletons.add(mesh.skeleton);
      }
    });
    skeletons.forEach((skeleton) => {
      try {
        skeleton.prepare();
      } catch {
        // ignore
      }

      try {
        skeleton.computeAbsoluteTransforms();
      } catch {
        // ignore
      }
    });
    asset.root?.computeWorldMatrix?.(true);
    asset.contentRoot?.computeWorldMatrix?.(true);
  }

  function getBoneWorldPosition(bone) {
    const linked = bone.getTransformNode?.();

    if (linked) {
      linked.computeWorldMatrix?.(true);
      const fromLinked = linked.getAbsolutePosition?.() || linked.absolutePosition;
      if (fromLinked) {
        return fromLinked;
      }
    }

    return bone.getAbsolutePosition?.()
      || bone.getPosition?.(BABYLON.Space.WORLD)
      || null;
  }

  function getFootMidpointInRoot() {
    const root = asset.root;
    const bones = collectFootBones();

    if (!root?.getWorldMatrix || bones.length === 0) {
      return null;
    }

    prepareFootSkeletons();

    const midpoint = new BABYLON.Vector3();
    let count = 0;

    bones.forEach((bone) => {
      const world = getBoneWorldPosition(bone);
      if (!world) {
        return;
      }

      midpoint.addInPlace(world);
      count += 1;
    });

    if (count < 1) {
      return null;
    }

    midpoint.scaleInPlace(1 / count);
    const inverse = root.getWorldMatrix().clone().invert();
    return BABYLON.Vector3.TransformCoordinates(midpoint, inverse);
  }

  /**
   * Sample sole midpoint while contentRoot is at its authored default.
   * Sole-only reference (toe/foot) — this is what previously stopped idle skate.
   */
  function captureFootPlant(sample = null) {
    if (!asset.contentRoot?.position) {
      return false;
    }

    asset.contentRoot.position.x = defaultContentRoot.x;
    asset.contentRoot.position.z = defaultContentRoot.z;
    restContentRoot.copyFrom(defaultContentRoot);

    const foot = sample || getFootMidpointInRoot();

    if (!foot) {
      hasFootPlant = false;
      return false;
    }

    restFootLocal.copyFrom(foot);
    hasFootPlant = true;
    plantOffsetBlend = 1;
    return true;
  }

  /** Capture current sole midpoint without mutating contentRoot (walk-stop sample). */
  function sampleFootPlantAnchor() {
    if (!asset.contentRoot?.position) {
      return null;
    }

    const savedX = asset.contentRoot.position.x;
    const savedZ = asset.contentRoot.position.z;
    asset.contentRoot.position.x = defaultContentRoot.x;
    asset.contentRoot.position.z = defaultContentRoot.z;

    const foot = getFootMidpointInRoot();

    asset.contentRoot.position.x = savedX;
    asset.contentRoot.position.z = savedZ;
    return foot ? foot.clone() : null;
  }

  function resetFootPlantOffset() {
    if (!asset.contentRoot?.position) {
      return;
    }

    asset.contentRoot.position.x = defaultContentRoot.x;
    asset.contentRoot.position.z = defaultContentRoot.z;
    plantOffsetBlend = 1;
  }

  function beginFootPlantSession(options = {}) {
    if (!hasFootPlant) {
      captureFootPlant();
    }

    footPlantActive = hasFootPlant;

    if (options.smooth === true) {
      plantOffsetBlend = 0;
    } else {
      plantOffsetBlend = 1;
    }

    return footPlantActive;
  }

  function isFootPlantActive() {
    return footPlantActive && hasFootPlant;
  }

  function endFootPlantSession() {
    footPlantActive = false;
    hasFootPlant = false;
    plantOffsetBlend = 1;
    resetFootPlantOffset();
  }

  /**
   * Sole reference plant: keep toe/foot midpoint fixed in PlayerRoot space.
   * Do not combine with pinIdleNodes — the two fight and reintroduce skate/pop.
   */
  function plantFeet(options = {}) {
    if (!footPlantActive || !hasFootPlant || !asset.contentRoot?.position) {
      return;
    }

    const blendSeconds = Number.isFinite(options.blendSeconds) ? options.blendSeconds : 0;
    const dt = Number.isFinite(options.deltaSeconds) ? Math.max(options.deltaSeconds, 0) : 0;

    if (blendSeconds > 0 && plantOffsetBlend < 1) {
      plantOffsetBlend = Math.min(1, plantOffsetBlend + dt / blendSeconds);
    } else if (!(blendSeconds > 0)) {
      plantOffsetBlend = 1;
    }

    // Absolute recompute from rest (stable when called once after animations).
    asset.contentRoot.position.x = restContentRoot.x;
    asset.contentRoot.position.z = restContentRoot.z;

    const current = getFootMidpointInRoot();
    if (!current) {
      return;
    }

    const targetX = restContentRoot.x - (current.x - restFootLocal.x);
    const targetZ = restContentRoot.z - (current.z - restFootLocal.z);
    const t = plantOffsetBlend * plantOffsetBlend * (3 - 2 * plantOffsetBlend);

    asset.contentRoot.position.x = restContentRoot.x + (targetX - restContentRoot.x) * t;
    asset.contentRoot.position.z = restContentRoot.z + (targetZ - restContentRoot.z) * t;
  }

  function resolveRootMotionNode() {
    if (!pinTransformCarriers) {
      return null;
    }

    if (rootMotionNode) {
      return rootMotionNode;
    }

    let best = null;
    let bestScore = -1;

    restLocalByNode.forEach((_rest, node) => {
      const score = scoreRootMotionBoneName(node.name);

      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    });

    rootMotionNode = bestScore > 0 ? best : null;
    return rootMotionNode;
  }

  asset.meshes.forEach((mesh) => {
    if (mesh.skeleton) {
      captureRestPose(mesh.skeleton);
      captureIdleBones(mesh.skeleton);
    }
  });
  captureTransformCarriers();
  captureFootPlant();

  function getCarrierWorldPosition() {
    const node = resolveRootMotionNode();

    if (node) {
      node.computeWorldMatrix?.(true);
      return node.getAbsolutePosition?.() || node.absolutePosition || null;
    }

    const bone = resolveRootMotionBone();
    return bone?.getAbsolutePosition?.() || null;
  }

  function getCarrierLocalPosition() {
    const node = resolveRootMotionNode();

    if (node?.position) {
      return node.position.clone();
    }

    const bone = resolveRootMotionBone();
    return bone ? bone.getPosition(BABYLON.Space.LOCAL) : null;
  }

  function getCarrierParentWorldMatrix() {
    const node = resolveRootMotionNode();

    if (node?.parent?.computeWorldMatrix && node.parent.getWorldMatrix) {
      node.parent.computeWorldMatrix(true);
      return node.parent.getWorldMatrix();
    }

    return BABYLON.Matrix.Identity();
  }

  function resetRootMotionSample() {
    lastRootWorld = null;
    lastLocal = null;
  }

  function commitRootMotionSample() {
    if (pinTransformCarriers) {
      const local = getCarrierLocalPosition();
      lastLocal = local ? local.clone() : null;
      return;
    }

    const current = getCarrierWorldPosition();
    lastRootWorld = current ? current.clone() : null;
  }

  function consumePlanarRootMotionDelta() {
    if (pinTransformCarriers) {
      const local = getCarrierLocalPosition();
      if (!local) {
        return null;
      }

      if (!lastLocal) {
        lastLocal = local.clone();
        return { x: 0, z: 0 };
      }

      tempLocalDelta.set(local.x - lastLocal.x, 0, local.z - lastLocal.z);
      lastLocal.copyFrom(local);
      BABYLON.Vector3.TransformNormalToRef(tempLocalDelta, getCarrierParentWorldMatrix(), tempWorldDelta);
      return { x: tempWorldDelta.x, z: tempWorldDelta.z };
    }

    const current = getCarrierWorldPosition();
    if (!current) {
      return null;
    }

    if (!lastRootWorld) {
      lastRootWorld = current.clone();
      return { x: 0, z: 0 };
    }

    const delta = {
      x: current.x - lastRootWorld.x,
      z: current.z - lastRootWorld.z
    };
    lastRootWorld.copyFrom(current);
    return delta;
  }

  function rememberIdleCarrier(target) {
    if (!target || !isIdleTransformCarrierName(target.name)) {
      return;
    }

    if (target.position?.clone && !restLocalByNode.has(target)) {
      restLocalByNode.set(target, target.position.clone());
      restRotByNode.set(target, captureNodeRotation(target));
    }

    if (target.getClassName?.() === "Bone") {
      if (!restLocalByIdleBone.has(target)) {
        restLocalByIdleBone.set(target, target.getPosition(BABYLON.Space.LOCAL).clone());
      }

      if (!restRotByIdleBone.has(target) && target.getRotation) {
        restRotByIdleBone.set(target, target.getRotation(BABYLON.Space.LOCAL).clone());
      }
    }
  }

  function discoverIdleCarriers() {
    const visit = (node) => {
      rememberIdleCarrier(node);
    };

    const scan = (root) => {
      visit(root);
      root?.getChildTransformNodes?.(false)?.forEach(visit);
    };

    scan(asset.root);
    scan(asset.contentRoot);
    (asset.meshes || []).forEach((mesh) => {
      visit(mesh);
      mesh.skeleton?.bones.forEach((bone) => rememberIdleCarrier(bone));
    });
  }

  function pinIdleNodes(options = {}) {
    // Default: pin translation only. Locking Idle_Standard rotation kills
    // authored dwarf/upper-body sway while looking like a frozen pelvis.
    const pinRotation = options.pinRotation === true;
    discoverIdleCarriers();

    restLocalByNode.forEach((rest, node) => {
      if (node?.position) {
        node.position.copyFrom(rest);
      }

      if (pinRotation) {
        applyNodeRotation(node, restRotByNode.get(node));
      }
    });

    restLocalByIdleBone.forEach((rest, bone) => {
      const linked = bone.getTransformNode?.();
      const useRest = (linked && restLocalByNode.get(linked)) || rest;
      try {
        bone.setPosition(useRest, BABYLON.Space.LOCAL);
      } catch {
        if (bone.position) {
          bone.position.copyFrom(useRest);
        }
      }

      if (pinRotation) {
        const boneRot = restRotByIdleBone.get(bone);
        if (boneRot && bone.setRotation) {
          try {
            bone.setRotation(boneRot, BABYLON.Space.LOCAL);
          } catch {
            // ignore
          }
        }
      }

      if (linked?.position) {
        linked.position.copyFrom(useRest);
      }

      if (pinRotation) {
        applyNodeRotation(linked, restRotByNode.get(linked));
      }
    });

    const skeletons = new Set();
    (asset.meshes || []).forEach((mesh) => {
      if (mesh.skeleton) {
        skeletons.add(mesh.skeleton);
      }
    });
    restLocalByIdleBone.forEach((_rest, bone) => {
      const skeleton = bone.getSkeleton?.();
      if (skeleton) {
        skeletons.add(skeleton);
      }
    });

    skeletons.forEach((skeleton) => {
      try {
        skeleton.prepare();
      } catch {
        // ignore
      }

      try {
        skeleton.computeAbsoluteTransforms();
      } catch {
        // ignore
      }
    });
  }

  function neutralize(options = {}) {
    if (options.skip) {
      return;
    }

    const tempLocalPosition = new BABYLON.Vector3();

    if (options.pinNodes === true) {
      restLocalByNode.forEach((rest, node) => {
        if (node?.position) {
          node.position.copyFrom(rest);
        }
      });
    }

    // Per-frame dance travel: pin Idle carriers only (bones keep authored gesture motion).
    // Dance end / clip handoff: also reset hips-style translation bones so the mesh
    // cannot sit away from guest.root while the GUIDE label stays on the root.
    if (options.pinNodes === true && options.resetBones !== true) {
      if (options.syncSample) {
        commitRootMotionSample();
      }

      return;
    }

    asset.meshes.forEach((mesh) => {
      const skeleton = mesh.skeleton;
      if (!skeleton) {
        return;
      }

      skeleton.bones.forEach((bone) => {
        if (!isRuntimeTranslationBone(bone.name)) {
          return;
        }

        const rest = restLocalByBone.get(bone.name);
        if (!rest) {
          return;
        }

        tempLocalPosition.copyFrom(rest);
        bone.setPosition(tempLocalPosition, BABYLON.Space.LOCAL);
      });
    });

    if (options.syncSample) {
      commitRootMotionSample();
    }
  }

  return {
    neutralize,
    pinIdleNodes,
    plantFeet,
    captureFootPlant,
    sampleFootPlantAnchor,
    beginFootPlantSession,
    endFootPlantSession,
    isFootPlantActive,
    resetFootPlantOffset,
    consumePlanarRootMotionDelta,
    commitRootMotionSample,
    resetRootMotionSample,
    getPlanarCarrierWorldPosition: getCarrierWorldPosition
  };
}
