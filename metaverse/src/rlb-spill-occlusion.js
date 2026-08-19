/**
 * Spill line-of-sight: thin wall/floor AABBs block, Win_Glass portals let light through.
 */

export const RLB_SPILL_OCCLUSION_MARGIN = 0.12;
export const RLB_SPILL_OCCLUSION_SAMPLE_CAP = 24;
export const RLB_SHADER_MAX_OCCLUDERS = 48;
export const RLB_SHADER_MAX_PORTALS = 24;
export const RLB_OCCLUDER_SLAB_THICKNESS = 2.4;

function normalizeRlbMaterialName(name) {
  return String(name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function getMeshMaterialNames(mesh) {
  if (!mesh?.material) {
    return [];
  }

  if (Array.isArray(mesh.material.subMaterials)) {
    return mesh.material.subMaterials.map((material) => material?.name || material?.id || "").filter(Boolean);
  }

  return [mesh.material.name || mesh.material.id || ""].filter(Boolean);
}

/** Window glass — light may pass; do not treat as a wall occluder. */
export function isRlbLightPassThroughMaterialName(name) {
  const normalized = normalizeRlbMaterialName(name);

  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("winglass")
    || normalized === "0m2winglass"
    || normalized.includes("translucentglass")
  );
}

export function isRlbOpaqueWallMaterialName(name) {
  const normalized = normalizeRlbMaterialName(name);

  if (!normalized || isRlbLightPassThroughMaterialName(name)) {
    return false;
  }

  if (normalized.includes("winframe")) {
    return true;
  }

  return (
    normalized.includes("wallwood")
    || normalized.includes("wallpaint")
    || normalized.includes("wallpainr")
    || normalized.startsWith("0m2wall")
  );
}

function meshHasPassThroughMaterial(mesh) {
  return getMeshMaterialNames(mesh).some((name) => isRlbLightPassThroughMaterialName(name));
}

function meshHasOpaqueWallMaterial(mesh) {
  return getMeshMaterialNames(mesh).some((name) => isRlbOpaqueWallMaterialName(name));
}

function distanceSqToAabbCenter(bounds, point) {
  if (!point) {
    return Number.POSITIVE_INFINITY;
  }

  const cx = (bounds.min[0] + bounds.max[0]) * 0.5;
  const cy = (bounds.min[1] + bounds.max[1]) * 0.5;
  const cz = (bounds.min[2] + bounds.max[2]) * 0.5;
  const dx = cx - point.x;
  const dy = cy - point.y;
  const dz = cz - point.z;

  return dx * dx + dy * dy + dz * dz;
}

function isUsableOccluderMesh(mesh) {
  return Boolean(mesh) && mesh.isDisposed?.() !== true && mesh.isEnabled?.() !== false;
}

/** Invisible COL slabs: walls, floors (upper floor slab blocks spill into room below). */
export function collectRlbColOccluderMeshes(meshes) {
  return (meshes || []).filter((mesh) => {
    if (!isUsableOccluderMesh(mesh) || meshHasPassThroughMaterial(mesh)) {
      return false;
    }

    if (!mesh.metadata?.angjiCollisionLayer) {
      return false;
    }

    const role = mesh.metadata?.angjiCollisionRole;

    return role === "wall" || role === "floor";
  });
}

/** Visible interior walls — COL wall meshes are too few/fat to stop room-to-room leak. */
export function collectRlbVisualWallOccluderMeshes(meshes) {
  return (meshes || []).filter((mesh) => {
    if (!isUsableOccluderMesh(mesh) || meshHasPassThroughMaterial(mesh)) {
      return false;
    }

    if (mesh.metadata?.angjiCollisionLayer) {
      return false;
    }

    return meshHasOpaqueWallMaterial(mesh);
  });
}

export function collectRlbSpillOccluderMeshes(collisionMeshes, visualMeshes = []) {
  const seen = new Set();
  const merged = [];

  [...collectRlbColOccluderMeshes(collisionMeshes), ...collectRlbVisualWallOccluderMeshes(visualMeshes)].forEach((mesh) => {
    const id = mesh.uniqueId ?? mesh.name;

    if (seen.has(id)) {
      return;
    }

    seen.add(id);
    merged.push(mesh);
  });

  return merged;
}

export function collectRlbPassThroughPortalMeshes(meshes) {
  const windowGlass = [];
  const otherGlass = [];

  (meshes || []).forEach((mesh) => {
    if (!isUsableOccluderMesh(mesh) || !meshHasPassThroughMaterial(mesh)) {
      return;
    }

    const isWindowGlass = getMeshMaterialNames(mesh).some((name) => (
      normalizeRlbMaterialName(name).includes("winglass")
    ));

    if (isWindowGlass) {
      windowGlass.push(mesh);
    } else {
      otherGlass.push(mesh);
    }
  });

  return [...windowGlass, ...otherGlass];
}

export function collectRlbSpillSamplePoints(BABYLON, receiverMeshes, maxCount = RLB_SPILL_OCCLUSION_SAMPLE_CAP) {
  const points = [];

  (receiverMeshes || []).forEach((mesh) => {
    if (!mesh || mesh.isDisposed?.() || points.length >= maxCount) {
      return;
    }

    try {
      mesh.computeWorldMatrix(true);
      mesh.refreshBoundingInfo?.(true, true);
      const center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld
        || mesh.getAbsolutePosition?.();

      if (center) {
        points.push(center.clone?.() || center);
      }
    } catch {
      // ignore
    }
  });

  return points;
}

export function isRlbSpillRayBlocked(BABYLON, lightPosition, targetPosition, occluderMeshes) {
  if (!lightPosition || !targetPosition || !occluderMeshes?.length) {
    return false;
  }

  const target = targetPosition.clone?.() || targetPosition;
  const toTarget = target.subtract(lightPosition);
  const distance = toTarget.length();

  if (distance < 0.25) {
    return false;
  }

  const direction = toTarget.scale(1 / distance);
  const ray = new BABYLON.Ray(
    lightPosition,
    direction,
    Math.max(0.05, distance - RLB_SPILL_OCCLUSION_MARGIN)
  );

  for (let index = 0; index < occluderMeshes.length; index += 1) {
    const mesh = occluderMeshes[index];

    if (!mesh || mesh.isDisposed?.()) {
      continue;
    }

    let hit;

    try {
      hit = ray.intersectsMesh(mesh, true);
    } catch {
      continue;
    }

    if (hit?.hit && typeof hit.distance === "number" && hit.distance < distance - RLB_SPILL_OCCLUSION_MARGIN) {
      return true;
    }
  }

  return false;
}

/**
 * Fraction of interior sample points reachable from the light (0 = fully blocked).
 * Applied to GPU light weight — coarse but avoids extra fragment uniforms.
 */
export function computeRlbLightOcclusionWeight(BABYLON, lightPosition, samplePoints, occluderMeshes, maxDistance = 28) {
  if (!lightPosition || !samplePoints?.length || !occluderMeshes?.length) {
    return 1;
  }

  const maxDistSq = Math.max(maxDistance, 8) * Math.max(maxDistance, 8);
  let nearby = 0;
  let visible = 0;

  for (let index = 0; index < samplePoints.length; index += 1) {
    const point = samplePoints[index];

    if (!point) {
      continue;
    }

    const dx = point.x - lightPosition.x;
    const dy = point.y - lightPosition.y;
    const dz = point.z - lightPosition.z;

    if ((dx * dx) + (dy * dy) + (dz * dz) > maxDistSq) {
      continue;
    }

    nearby += 1;

    if (!isRlbSpillRayBlocked(BABYLON, lightPosition, point, occluderMeshes)) {
      visible += 1;
    }
  }

  // Building-wide samples made almost every fixture look fully blocked.
  if (nearby < 2) {
    return 1;
  }

  return visible / nearby;
}

function getMeshWorldAabb(mesh) {
  try {
    mesh.computeWorldMatrix?.(true);
    mesh.refreshBoundingInfo?.(true, true);
    const box = mesh.getBoundingInfo?.()?.boundingBox;

    if (!box?.minimumWorld || !box?.maximumWorld) {
      return null;
    }

    return {
      min: [box.minimumWorld.x, box.minimumWorld.y, box.minimumWorld.z],
      max: [box.maximumWorld.x, box.maximumWorld.y, box.maximumWorld.z]
    };
  } catch {
    return null;
  }
}

function aabbExtent(bounds) {
  return [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2]
  ];
}

function shrinkRlbSlabAabb(bounds, inset = 0.16) {
  if (!bounds?.min || !bounds?.max) {
    return bounds;
  }

  const extent = aabbExtent(bounds);
  let thinIndex = 0;

  if (extent[1] < extent[thinIndex]) {
    thinIndex = 1;
  }
  if (extent[2] < extent[thinIndex]) {
    thinIndex = 2;
  }

  const halfInset = Math.min(inset, Math.max(0, extent[thinIndex] * 0.35));
  const min = [...bounds.min];
  const max = [...bounds.max];
  min[thinIndex] += halfInset;
  max[thinIndex] -= halfInset;

  if (min[thinIndex] >= max[thinIndex]) {
    return bounds;
  }

  return { min, max };
}

/** Thin wall/floor slabs only — fat volumes false-positive every ray. */
export function isRlbSlabOccluderAabb(bounds) {
  if (!bounds?.min || !bounds?.max) {
    return false;
  }

  const extent = aabbExtent(bounds);
  return Math.min(extent[0], extent[1], extent[2]) < RLB_OCCLUDER_SLAB_THICKNESS;
}

function aabbDistanceSqToPoint(bounds, point) {
  if (!point) {
    return Number.POSITIVE_INFINITY;
  }

  const x = Math.min(Math.max(point.x, bounds.min[0]), bounds.max[0]);
  const y = Math.min(Math.max(point.y, bounds.min[1]), bounds.max[1]);
  const z = Math.min(Math.max(point.z, bounds.min[2]), bounds.max[2]);
  const dx = point.x - x;
  const dy = point.y - y;
  const dz = point.z - z;
  return dx * dx + dy * dy + dz * dz;
}

function scoreOccluderBounds(bounds, focus, lightPositions) {
  let best = aabbDistanceSqToPoint(bounds, focus);

  (lightPositions || []).forEach((point) => {
    if (!point) {
      return;
    }

    const lightDist = aabbDistanceSqToPoint(bounds, point);
    const focusDist = focus
      ? ((point.x - focus.x) ** 2) + ((point.y - focus.y) ** 2) + ((point.z - focus.z) ** 2)
      : 0;
    best = Math.min(best, lightDist + focusDist * 0.28);
  });

  return best;
}

export function bakeRlbOccluderAabbs(meshes) {
  const baked = [];

  (meshes || []).forEach((mesh) => {
    if (!isUsableOccluderMesh(mesh)) {
      return;
    }

    const bounds = getMeshWorldAabb(mesh);

    if (!bounds || !isRlbSlabOccluderAabb(bounds)) {
      return;
    }

    baked.push(shrinkRlbSlabAabb(bounds));
  });

  return baked;
}

export function bakeRlbPortalAabbs(meshes, maxCount = RLB_SHADER_MAX_PORTALS) {
  const baked = [];

  (meshes || []).forEach((mesh) => {
    if (baked.length >= maxCount || !isUsableOccluderMesh(mesh)) {
      return;
    }

    const bounds = getMeshWorldAabb(mesh);

    if (!bounds) {
      return;
    }

    baked.push(bounds);
  });

  return baked.slice(0, Math.max(0, maxCount));
}

/** Nearest thin wall/floor AABBs for GPU ray tests (camera + nearby lights). */
export function collectNearestRlbOccluderAabbs(
  occluderMeshes,
  focus,
  maxCount = RLB_SHADER_MAX_OCCLUDERS,
  lightPositions = []
) {
  return selectNearestRlbOccluderAabbs(
    bakeRlbOccluderAabbs(occluderMeshes),
    focus,
    maxCount,
    lightPositions
  );
}

export function selectNearestRlbOccluderAabbs(
  allBounds,
  focus,
  maxCount = RLB_SHADER_MAX_OCCLUDERS,
  lightPositions = []
) {
  if (!Array.isArray(allBounds) || !allBounds.length) {
    return [];
  }

  return allBounds
    .map((bounds) => ({
      min: bounds.min,
      max: bounds.max,
      distanceSq: scoreOccluderBounds(bounds, focus, lightPositions)
    }))
    .sort((left, right) => left.distanceSq - right.distanceSq)
    .slice(0, Math.max(0, maxCount))
    .map(({ min, max }) => ({ min, max }));
}

export function selectRlbOccludersForPoints(allBounds, points, maxCount) {
  if (!Array.isArray(allBounds) || !allBounds.length || !Array.isArray(points) || !points.length) {
    return [];
  }

  return allBounds
    .map((bounds) => {
      let best = Number.POSITIVE_INFINITY;

      points.forEach((point) => {
        if (!point) {
          return;
        }

        best = Math.min(best, distanceSqToAabbCenter(bounds, point));
      });

      return { bounds, distanceSq: best };
    })
    .sort((left, right) => left.distanceSq - right.distanceSq)
    .slice(0, Math.max(0, maxCount || allBounds.length))
    .map(({ bounds }) => bounds);
}
