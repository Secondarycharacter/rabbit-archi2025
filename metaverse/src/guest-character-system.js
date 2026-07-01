import {
  createRootMotionNeutralizer,
  stripLocomotionRootMotion
} from "./controllers/RootMotionNeutralizer.js?v=guest-root-motion-20260629";

export const GUEST_ASSET_ROOT = "./assets/guest/";

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

function updateGuestPatrol(guest, deltaScale, resolveFloorY) {
  const { movement } = guest.spawn;
  const targets = movement?.patrolTargets;

  if (!targets?.length) {
    return;
  }

  const target = targets[guest.patrolTargetIndex];
  const position = guest.root.position;
  const toTargetX = target.x - position.x;
  const toTargetZ = target.z - position.z;
  const distance = Math.hypot(toTargetX, toTargetZ);
  const step = (movement.speed ?? 0.135) * deltaScale;
  const snapY = (x, z, fallbackY) => resolveFloorY?.(x, z, fallbackY) ?? fallbackY;

  if (distance <= step) {
    position.x = target.x;
    position.z = target.z;
    position.y = snapY(target.x, target.z, target.y);
    guest.patrolTargetIndex = (guest.patrolTargetIndex + 1) % targets.length;
    return;
  }

  const invDistance = 1 / distance;
  position.x += toTargetX * invDistance * step;
  position.z += toTargetZ * invDistance * step;
  position.y = snapY(position.x, position.z, position.y);
  guest.root.rotation.y = Math.atan2(toTargetX, toTargetZ);
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

  const encodedFile = encodeGuestAssetPath(spawn.file);
  const loadTask = BABYLON.SceneLoader.ImportMeshAsync(
    "",
    GUEST_ASSET_ROOT,
    encodedFile,
    scene
  );
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
  const { resolveSpawnPosition, resolveGuestFloorY } = helpers;

  function resolveGuestSpawn(spawn) {
    const resolvedSpawn = resolveSpawnPosition?.(spawn);

    if (!resolvedSpawn || resolvedSpawn === spawn) {
      return spawn;
    }

    return resolvedSpawn;
  }

  function getGuests() {
    return [...guestsById.values()];
  }

  function showGuest(guest) {
    const resolvedSpawn = resolveGuestSpawn(guest.spawn);
    guest.spawn = resolvedSpawn;

    if (guest.spawn.movement?.type === "patrol") {
      guest.patrolTargetIndex = 0;
    }

    guest.root.position.set(
      resolvedSpawn.position.x,
      resolvedSpawn.position.y,
      resolvedSpawn.position.z
    );
    guest.root.rotation.set(0, resolvedSpawn.rotationY, 0);
    guest.root.setEnabled(true);
    playGuestAnimation(guest);
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
    const resolvedSpawn = resolveGuestSpawn(spawn);

    if (guestsById.has(resolvedSpawn.id)) {
      const existing = guestsById.get(resolvedSpawn.id);
      existing.spawn = resolvedSpawn;
      existing.root.position.set(
        resolvedSpawn.position.x,
        resolvedSpawn.position.y,
        resolvedSpawn.position.z
      );

      if (visible && showOnLoad) {
        showGuest(existing);
      }

      return existing;
    }

    if (loadPromises.has(resolvedSpawn.id)) {
      return loadPromises.get(resolvedSpawn.id);
    }

    const loadPromise = loadGuestCharacter(BABYLON, scene, resolvedSpawn, helpers)
      .then((guest) => {
        guest.spawn = resolvedSpawn;
        guestsById.set(resolvedSpawn.id, guest);
        loadPromises.delete(resolvedSpawn.id);

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
        updateGuestPatrol(guest, deltaScale, resolveGuestFloorY);
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
