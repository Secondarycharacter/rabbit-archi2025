import {
  createRootMotionNeutralizer,
  stripLocomotionRootMotion
} from "./controllers/RootMotionNeutralizer.js?v=guest-root-motion-20260629";

export const GUEST_ASSET_ROOT = "./assets/guest/";

function normalizeClipName(name) {
  return String(name || "").trim().toLowerCase();
}

function resolveClip(animationGroups, clipName) {
  if (!clipName || !animationGroups?.length) {
    return null;
  }

  const normalized = normalizeClipName(clipName);

  return animationGroups.find((group) => normalizeClipName(group.name) === normalized)
    || animationGroups.find((group) => group.name === clipName)
    || null;
}

function stopGuestAnimation(guest) {
  guest.sequenceEndObserver?.remove?.();
  guest.sequenceEndObserver = null;

  guest.animationGroups?.forEach((group) => {
    try {
      group.stop();
    } catch {
      // ignore stale groups
    }
  });

  guest.activeAnimationGroup = null;
  resetGuestRootMotion(guest);
}

function resetGuestRootMotion(guest) {
  guest.rootMotionNeutralizer?.neutralize?.({ syncSample: true });
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
  group.start(loop);
  guest.activeAnimationGroup = group;
}

function playGuestLoopClip(guest, clipName) {
  const group = resolveClip(guest.animationGroups, clipName);

  if (!group) {
    console.warn(`[guest] ${guest.spawn.id}: clip not found "${clipName}"`);
    return;
  }

  startGuestClip(guest, group, true);
}

function playGuestAnimation(guest) {
  const { animation } = guest.spawn;
  const { animationGroups } = guest;

  stopGuestAnimation(guest);

  if (guest.spawn.movement?.type === "patrol") {
    playGuestLoopClip(guest, guest.spawn.movement.clip);
    return;
  }

  if (!animation?.clips?.length) {
    return;
  }

  if (animation.type === "loop") {
    const group = resolveClip(animationGroups, animation.clips[0]);

    if (!group) {
      console.warn(`[guest] ${guest.spawn.id}: clip not found "${animation.clips[0]}"`);
      return;
    }

    startGuestClip(guest, group, true);
    return;
  }

  if (animation.type === "sequence") {
    let clipIndex = 0;

    const playNext = () => {
      const clipName = animation.clips[clipIndex];
      const group = resolveClip(animationGroups, clipName);

      if (!group) {
        console.warn(`[guest] ${guest.spawn.id}: clip not found "${clipName}"`);
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

function updateGuestPatrol(guest, deltaScale) {
  const { movement } = guest.spawn;
  const targets = movement?.patrolTargets;

  if (!targets?.length) {
    return;
  }

  const target = targets[guest.patrolTargetIndex];
  const position = guest.root.position;
  const toTarget = {
    x: target.x - position.x,
    y: target.y - position.y,
    z: target.z - position.z
  };
  const distance = Math.hypot(toTarget.x, toTarget.y, toTarget.z);
  const step = (movement.speed ?? 0.135) * deltaScale;

  if (distance <= step) {
    position.set(target.x, target.y, target.z);
    guest.patrolTargetIndex = (guest.patrolTargetIndex + 1) % targets.length;
    return;
  }

  const invDistance = 1 / distance;
  position.x += toTarget.x * invDistance * step;
  position.y += toTarget.y * invDistance * step;
  position.z += toTarget.z * invDistance * step;
  guest.root.rotation.y = Math.atan2(toTarget.x, toTarget.z);
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
    targetHeight = 1.75
  } = helpers;

  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    GUEST_ASSET_ROOT,
    spawn.file,
    scene
  );

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
  const fitScale = targetHeight / rawHeight;
  root.scaling.set(fitScale, fitScale, fitScale);
  updateWorldMatrices(root, meshes);

  meshes.forEach((mesh) => {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = { ...(mesh.metadata || {}), passThrough: true, tourGuest: true, guestId: spawn.id };
  });

  softenModelMaterialReflections(BABYLON, collectMeshMaterials(meshes));

  root.position.set(spawn.position.x, spawn.position.y, spawn.position.z);
  root.rotation.set(0, spawn.rotationY, 0);
  root.setEnabled(false);

  const animationGroups = result.animationGroups || [];
  stripLocomotionRootMotion(BABYLON, animationGroups);
  const rootMotionNeutralizer = createRootMotionNeutralizer(BABYLON, { meshes });

  return {
    spawn,
    root,
    contentRoot,
    meshes,
    animationGroups,
    rootMotionNeutralizer,
    sequenceEndObserver: null,
    activeAnimationGroup: null,
    patrolTargetIndex: 0
  };
}

export function createGuestCharacterSystem(BABYLON, scene, helpers = {}) {
  const guestsById = new Map();
  let visible = false;
  const loadPromises = new Map();

  function getGuests() {
    return [...guestsById.values()];
  }

  function showGuest(guest) {
    if (guest.spawn.movement?.type === "patrol") {
      guest.patrolTargetIndex = 0;
      guest.root.position.set(
        guest.spawn.position.x,
        guest.spawn.position.y,
        guest.spawn.position.z
      );
      guest.root.rotation.set(0, guest.spawn.rotationY, 0);
    }

    guest.root.setEnabled(true);
    playGuestAnimation(guest);
  }

  function show(options = {}) {
    const excludeIds = new Set(options.excludeIds || []);
    visible = true;
    getGuests().forEach((guest) => {
      if (!excludeIds.has(guest.spawn.id)) {
        showGuest(guest);
      }
    });
  }

  function hide() {
    visible = false;
    getGuests().forEach((guest) => {
      stopGuestAnimation(guest);
      guest.patrolTargetIndex = 0;
      guest.root.setEnabled(false);
    });
  }

  async function dispose() {
    hide();

    getGuests().forEach((guest) => {
      stopGuestAnimation(guest);
      guest.meshes?.forEach((mesh) => mesh.dispose());
      guest.contentRoot?.dispose();
      guest.root?.dispose();
    });

    guestsById.clear();
    loadPromises.clear();
  }

  async function loadSpawn(spawn, { showOnLoad = true } = {}) {
    if (guestsById.has(spawn.id)) {
      const existing = guestsById.get(spawn.id);

      if (visible && showOnLoad) {
        showGuest(existing);
      }

      return existing;
    }

    if (loadPromises.has(spawn.id)) {
      return loadPromises.get(spawn.id);
    }

    const loadPromise = loadGuestCharacter(BABYLON, scene, spawn, helpers)
      .then((guest) => {
        guestsById.set(spawn.id, guest);
        loadPromises.delete(spawn.id);

        if (visible && showOnLoad) {
          showGuest(guest);
        }

        return guest;
      })
      .catch((error) => {
        loadPromises.delete(spawn.id);
        console.error(`[guest] failed to load ${spawn.id}`, error);
        return null;
      });

    loadPromises.set(spawn.id, loadPromise);
    return loadPromise;
  }

  async function ensureSpawned(spawns, { parallel = false } = {}) {
    if (parallel) {
      const results = await Promise.all(
        spawns.map((spawn) => loadSpawn(spawn, { showOnLoad: false }))
      );
      const guests = results.filter(Boolean);

      if (visible) {
        guests.forEach(showGuest);
      }

      return guests;
    }

    const results = [];

    for (const spawn of spawns) {
      const guest = await loadSpawn(spawn);

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

    getGuests().forEach((guest) => {
      if (!guest.root.isEnabled()) {
        return;
      }

      resetGuestRootMotion(guest);

      if (guest.spawn.movement?.type === "patrol") {
        updateGuestPatrol(guest, deltaScale);
      }
    });
  }

  return {
    ensureSpawned,
    preload,
    show,
    hide,
    dispose,
    update,
    getGuests,
    isSpawned
  };
}
