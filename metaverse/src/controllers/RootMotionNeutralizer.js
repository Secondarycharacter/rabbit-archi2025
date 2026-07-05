/** hips/pelvis/root + spine chain — primary root-motion carriers in rabbit01.glb */
const ROOT_MOTION_BONE_PATTERN = /hips|pelvis|root|^spine(?:\.|$)/i;
const ROOT_NODE_PATTERN = /hips|pelvis|root|armature|mixamorig|Idle_Standard|^spine(?:\.|$)/i;
const LOCOMOTION_TRANSLATION_STRIP_RANGE = 0.5;

function isKnownRootMotionBone(name) {
  return ROOT_MOTION_BONE_PATTERN.test(name || "");
}

function isRootMotionTarget(target) {
  const name = target?.name || "";
  return isKnownRootMotionBone(name) || ROOT_NODE_PATTERN.test(name);
}

function isRuntimeTranslationBone(boneName) {
  return isKnownRootMotionBone(boneName);
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

  let baseX;
  let baseY;
  let baseZ;

  if (target?.position) {
    baseX = target.position.x;
    baseY = target.position.y;
    baseZ = target.position.z;
  } else {
    const base = keys[0].value;
    baseX = base?.x ?? base?.[0] ?? 0;
    baseY = base?.y ?? base?.[1] ?? 0;
    baseZ = base?.z ?? base?.[2] ?? 0;
  }

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

  let baseX;
  let baseZ;

  if (target?.position) {
    baseX = target.position.x;
    baseZ = target.position.z;
  } else {
    const base = keys[0].value;
    baseX = base?.x ?? base?.[0] ?? 0;
    baseZ = base?.z ?? base?.[2] ?? 0;
  }

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

function shouldStripPositionAnimation(target, animation) {
  if (animation?.targetProperty !== "position") {
    return false;
  }

  if (isRootMotionTarget(target)) {
    return true;
  }

  return getTranslationKeyRange(animation) > LOCOMOTION_TRANSLATION_STRIP_RANGE;
}

export function stripLocomotionRootMotion(BABYLON, animationGroups, clipNames = [], options = {}) {
  const clipSet = new Set(clipNames);
  const preserveVerticalClipNames = new Set(options.preserveVerticalClipNames || []);
  const forceStripAllPosition = Boolean(options.forceStripAllPosition);

  animationGroups.forEach((group) => {
    if (clipSet.size > 0 && !clipSet.has(group.name)) {
      const matchesNamedClip = group.targetedAnimations.some((ta) => clipSet.has(ta.animation?.name));
      if (!matchesNamedClip) {
        return;
      }
    }

    const preserveVertical = preserveVerticalClipNames.has(group.name)
      || group.targetedAnimations.some((ta) => preserveVerticalClipNames.has(ta.animation?.name));

    group.targetedAnimations.forEach((targeted) => {
      const shouldStrip = forceStripAllPosition
        ? targeted.animation?.targetProperty === "position"
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

export function createRootMotionNeutralizer(BABYLON, asset) {
  const restLocalByBone = new Map();
  let rootMotionBone = null;
  let lastRootWorld = null;

  function captureRestPose(skeleton) {
    skeleton.bones.forEach((bone) => {
      if (!isRuntimeTranslationBone(bone.name) || restLocalByBone.has(bone.name)) {
        return;
      }

      restLocalByBone.set(bone.name, bone.getPosition(BABYLON.Space.LOCAL).clone());
    });
  }

  function resolveRootMotionBone() {
    if (rootMotionBone) {
      return rootMotionBone;
    }

    for (const mesh of asset.meshes) {
      const skeleton = mesh.skeleton;
      if (!skeleton) {
        continue;
      }

      rootMotionBone = skeleton.bones.find((bone) => isRuntimeTranslationBone(bone.name)) || null;
      if (rootMotionBone) {
        return rootMotionBone;
      }
    }

    return null;
  }

  asset.meshes.forEach((mesh) => {
    if (mesh.skeleton) {
      captureRestPose(mesh.skeleton);
    }
  });

  function resetRootMotionSample() {
    lastRootWorld = null;
  }

  function consumePlanarRootMotionDelta() {
    const bone = resolveRootMotionBone();
    if (!bone) {
      return null;
    }

    const current = bone.getAbsolutePosition();

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

  function neutralize(options = {}) {
    if (options.skip) {
      return;
    }

    const tempLocalPosition = new BABYLON.Vector3();

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
      const bone = resolveRootMotionBone();
      lastRootWorld = bone ? bone.getAbsolutePosition().clone() : null;
    }
  }

  return {
    neutralize,
    consumePlanarRootMotionDelta,
    resetRootMotionSample
  };
}
