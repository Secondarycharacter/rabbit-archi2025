/**
 * Angji RLB proximity lighting:
 * - fixture emissive (sync at load)
 * - wall/floor spill via MaterialPlugin shader (priority sync + deferred rest)
 * - mesh overlay fallback near active lights
 */

import {
  listPresentRlbTuningTypes,
  resolveRlbFixtureTypeFromMesh,
  isRlbSpotlightAimMaterialName
} from "./rlb-fixture-types.js";
import {
  applyRlbTuningToShaderOptions,
  ensureRlbGroupState,
  getRlbProfileForLightEntry,
  isRlbLightEntryEnabled,
  loadRlbTuningState,
  makeRlbLightId,
  remapRlbGroupMemberIds,
  resolveRlbLightSourceName,
  saveRlbTuningState
} from "./rlb-shader-tuning.js?v=rlb-shader-proximity-20260820-group-v50";
import {
  bakeRlbOccluderAabbs,
  bakeRlbPortalAabbs,
  collectRlbPassThroughPortalMeshes,
  collectRlbSpillOccluderMeshes,
  collectRlbSpillSamplePoints,
  RLB_SHADER_MAX_OCCLUDERS,
  selectNearestRlbOccluderAabbs
} from "./rlb-spill-occlusion.js?v=rlb-shader-proximity-20260818-group-v40";
import {
  attachRlbProximityShaderPluginsChunked,
  attachRlbProximityShaderPluginsSync,
  isRlbSpillExcludedMaterialName,
  isRlbInteriorGlassReceiverMaterialName,
  registerRlbProximityShaderPlugin,
  resolveRlbLightWorldPosition,
  resolveRlbLightWorldDirection,
  updateRlbProximityShaderLights,
  RLB_SHADER_MAX_LIGHTS
} from "./rlb-proximity-shader-plugin.js?v=rlb-shader-proximity-20260819-group-v46";

const SPILL_SAMPLE_REFRESH_FRAMES = 45;
const SPILL_OCCLUSION_REFRESH_FRAMES = 45;

export const RLB_PROXIMITY_INNER_RADIUS = 12;
export const RLB_PROXIMITY_OUTER_RADIUS = 22;
export const RLB_FIXTURE_EMISSIVE_COLOR = Object.freeze({ r: 1, g: 0.92, b: 0.72 });
export const RLB_FIXTURE_EMISSIVE_INTENSITY = 2.45;
export const RLB_COVE_EMISSIVE_COLOR = Object.freeze({ r: 1, g: 0.96, b: 0.82 });
export const RLB_COVE_EMISSIVE_INTENSITY = 4.6;

const UPDATE_INTERVAL_WALK_FRAMES = 4;
const UPDATE_INTERVAL_ORBIT_FRAMES = 6;
const LIGHT_REFRESH_FRAMES = 45;

function normalizeRlbName(name) {
  return String(name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function isRlbLightFixtureMaterialName(name) {
  const normalized = normalizeRlbName(name);
  return normalized.startsWith("rlb")
    && !normalized.includes("lightcover")
    && !isRlbSpotlightAimMaterialName(name);
}

export function isAngjiInteriorPriorityMaterialName(name) {
  const normalized = normalizeRlbName(name);

  if (!normalized || isRlbSpillExcludedMaterialName(name)) {
    return false;
  }

  if (isRlbInteriorGlassReceiverMaterialName(name)) {
    return true;
  }

  if (normalized.includes("wallwood") || normalized.includes("wallpaint") || normalized.includes("wallpainr") || normalized.includes("0m2wall")) {
    return true;
  }

  if (normalized.includes("floorm") || normalized.startsWith("0m1floor")) {
    return true;
  }

  if (normalized.includes("waterlight") || (normalized.includes("water") && !normalized.includes("waterfall"))) {
    return true;
  }

  if (normalized.includes("colorm03") || normalized.includes("colorm02")) {
    return true;
  }

  if (
    normalized.includes("ceiling")
    || normalized.includes("celpaint")
    || normalized.startsWith("0m3cel")
  ) {
    return true;
  }

  return false;
}

function isRlbLightFixtureMesh(mesh) {
  return getMaterialNamesFromMesh(mesh).some((name) => isRlbLightFixtureMaterialName(name));
}

function isPriorityReceiverMesh(mesh) {
  return getMaterialNamesFromMesh(mesh).some((name) => isAngjiInteriorPriorityMaterialName(name));
}

export function shouldSkipMaterialFreeze(material) {
  return Boolean(material?.metadata?.rlbProximityReceiverTracked);
}

function getMaterialNamesFromMesh(mesh) {
  if (!mesh?.material) {
    return [];
  }

  if (Array.isArray(mesh.material.subMaterials)) {
    return mesh.material.subMaterials.map((material) => material?.name || material?.id || "").filter(Boolean);
  }

  return [mesh.material.name || mesh.material.id || ""].filter(Boolean);
}

function collectMaterialsFromMesh(mesh, materials) {
  if (!mesh?.material) {
    return;
  }

  if (Array.isArray(mesh.material.subMaterials)) {
    mesh.material.subMaterials.filter(Boolean).forEach((material) => {
      if (!isRlbSpillExcludedMaterialName(material.name || material.id)) {
        materials.add(material);
      }
    });
    return;
  }

  if (!isRlbSpillExcludedMaterialName(mesh.material.name || mesh.material.id)) {
    materials.add(mesh.material);
  }
}

function meshHasSpillReceiverMaterial(mesh) {
  return getMaterialNamesFromMesh(mesh).some((name) => !isRlbSpillExcludedMaterialName(name));
}

function maybeRefreshLightPositions(BABYLON, lightEntries, lifecycle, interval = LIGHT_REFRESH_FRAMES) {
  lifecycle.lightRefreshTick = (lifecycle.lightRefreshTick || 0) + 1;

  if (lifecycle.lightRefreshTick % interval !== 0) {
    return;
  }

  lightEntries.forEach((entry) => {
    resolveRlbLightWorldPosition(BABYLON, entry);
    resolveRlbLightWorldDirection(BABYLON, entry);
  });
}

function maybeRefreshSpillSamplePoints(BABYLON, lifecycle, receiverMeshes, interval = SPILL_SAMPLE_REFRESH_FRAMES) {
  lifecycle.spillSampleRefreshTick = (lifecycle.spillSampleRefreshTick || 0) + 1;

  if (lifecycle.spillSampleRefreshTick % interval !== 0 && lifecycle.spillSamplePoints?.length) {
    return lifecycle.spillSamplePoints;
  }

  lifecycle.spillSamplePoints = collectRlbSpillSamplePoints(BABYLON, receiverMeshes);
  return lifecycle.spillSamplePoints;
}

function maybeRefreshLightOcclusionWeights(
  BABYLON,
  lifecycle,
  lightEntries,
  occluderAabbCache,
  focus,
  interval = SPILL_OCCLUSION_REFRESH_FRAMES
) {
  lifecycle.spillOcclusionRefreshTick = (lifecycle.spillOcclusionRefreshTick || 0) + 1;

  if (
    lifecycle.spillOcclusionRefreshTick % interval !== 0
    && lifecycle.occluderAabbs?.length
  ) {
    return lifecycle.lightOcclusionWeights;
  }

  const lightPositions = (lightEntries || [])
    .map((entry) => entry?.position)
    .filter(Boolean);
  const weights = new Map();
  lifecycle.occluderAabbs = selectNearestRlbOccluderAabbs(
    occluderAabbCache,
    focus || null,
    RLB_SHADER_MAX_OCCLUDERS,
    lightPositions
  );
  lifecycle.lightOcclusionWeights = weights;
  return weights;
}

function getMeshWorldCenter(BABYLON, mesh, lightweight = false) {
  if (lightweight) {
    mesh.computeWorldMatrix(true);
    return mesh.getAbsolutePosition?.()?.clone?.()
      || mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.()
      || null;
  }

  mesh.computeWorldMatrix(true);
  mesh.refreshBoundingInfo?.(true, true);
  return mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.()
    || mesh.getAbsolutePosition?.()?.clone?.()
    || null;
}

function getSceneCameraPosition(BABYLON, scene, options = {}) {
  const camera = options.getCamera?.() || scene.activeCamera;

  if (!camera) {
    return null;
  }

  return camera.globalPosition?.clone?.()
    || camera.position?.clone?.()
    || null;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / Math.max(edge1 - edge0, 0.0001)));
  return t * t * (3 - 2 * t);
}

export function computeRlbSpillBoostAtPoint(BABYLON, point, lightEntries, options = {}) {
  if (!point || !Array.isArray(lightEntries) || !lightEntries.length) {
    return 0;
  }

  const innerRadius = typeof options.innerRadius === "number" ? options.innerRadius : RLB_PROXIMITY_INNER_RADIUS;
  const outerRadius = typeof options.outerRadius === "number" ? options.outerRadius : RLB_PROXIMITY_OUTER_RADIUS;
  const maxLights = typeof options.maxLights === "number" ? options.maxLights : 12;
  const weightRadius = typeof options.weightRadius === "number"
    ? options.weightRadius
    : (typeof options.cullRadius === "number" ? options.cullRadius : 180);
  const scored = [];

  for (let index = 0; index < lightEntries.length; index += 1) {
    const entry = lightEntries[index];
    const position = resolveRlbLightWorldPosition(BABYLON, entry);

    if (!position) {
      continue;
    }

    const distanceSq = BABYLON.Vector3.DistanceSquared(point, position);
    scored.push({ position, distanceSq });
  }

  scored.sort((left, right) => left.distanceSq - right.distanceSq);

  let boost = 0;

  for (let index = 0; index < Math.min(scored.length, maxLights); index += 1) {
    const { position, distanceSq } = scored[index];
    const dx = point.x - position.x;
    const dy = point.y - position.y;
    const dz = point.z - position.z;
    const dist = Math.hypot(dx, dy, dz);
    const cone = dist > 0.0001 ? Math.max(0, -dy / dist) : 0;
    const coneMask = Math.min(1, Math.max(0, (cone - 0.08) / 0.57));
    const inner = (1 - smoothstep(0, innerRadius, dist)) * coneMask;
    const outer = (1 - smoothstep(innerRadius, outerRadius, dist)) * coneMask * 0.85;
    const falloff = Math.max(inner * 1.25 + outer, 0);
    const weight = 0.55 + Math.max(0, 1 - Math.sqrt(distanceSq) / weightRadius) * 0.45;

    boost += falloff * weight;
  }

  return boost;
}

export function applyRlbFixtureEmissive(BABYLON, material, options = {}) {
  if (!material || material.metadata?.rlbFixtureEmissiveApplied) {
    return false;
  }

  const color = options.color || RLB_FIXTURE_EMISSIVE_COLOR;
  const intensity = typeof options.intensity === "number"
    ? options.intensity
    : RLB_FIXTURE_EMISSIVE_INTENSITY;

  material.unfreeze?.();

  if ("emissiveColor" in material && material.emissiveColor?.set) {
    material.emissiveColor.set(color.r, color.g, color.b);
  }

  if ("emissiveIntensity" in material) {
    material.emissiveIntensity = intensity;
  }

  if (options.selfLit) {
    if ("useEmissiveAsIllumination" in material) {
      material.useEmissiveAsIllumination = true;
    }
  }

  material.metadata = {
    ...(material.metadata || {}),
    rlbFixtureEmissiveApplied: true
  };
  return true;
}

function getPrimaryRlbMaterialName(mesh) {
  return getMaterialNamesFromMesh(mesh).find((name) => isRlbLightFixtureMaterialName(name)) || null;
}

function collectRlbLightEntries(BABYLON, meshes) {
  const entries = [];

  meshes.forEach((mesh) => {
    if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.() === false || !isRlbLightFixtureMesh(mesh)) {
      return;
    }

    const rlbType = resolveRlbFixtureTypeFromMesh(mesh) || "Default";
    const entry = {
      mesh,
      position: null,
      rlbType,
      rlbMaterialName: getPrimaryRlbMaterialName(mesh),
      direction: null
    };
    const origin = resolveRlbLightWorldPosition(BABYLON, entry) || getMeshWorldCenter(BABYLON, mesh);

    if (origin) {
      entry.position = origin;
      entry.lightId = makeRlbLightId(entry);
      if (!entry.direction) {
        entry.direction = resolveRlbLightWorldDirection(BABYLON, entry);
      }
      entries.push(entry);
    }
  });

  return entries;
}

function countRlbSpillTargets(lightEntries, tuningState) {
  const byType = {};
  let total = 0;
  let enabled = 0;

  (lightEntries || []).forEach((entry) => {
    const typeName = entry?.rlbType || "Default";
    total += 1;
    byType[typeName] = byType[typeName] || { total: 0, enabled: 0 };
    byType[typeName].total += 1;

    if (isRlbLightEntryEnabled(entry, tuningState)) {
      enabled += 1;
      byType[typeName].enabled += 1;
    }
  });

  return { total, enabled, byType };
}

function buildRlbLightCatalog(lightEntries) {
  const typeCounters = {};
  const items = (lightEntries || []).map((entry) => {
    const typeName = entry?.rlbType || "Default";
    typeCounters[typeName] = (typeCounters[typeName] || 0) + 1;
    const pos = entry?.position;

    if (!entry.lightId) {
      entry.lightId = makeRlbLightId(entry);
    }

    const sourceName = resolveRlbLightSourceName(entry);
    const indexLabel = String(typeCounters[typeName]).padStart(2, "0");
    const baseName = sourceName || `${typeName} ${indexLabel}`;

    return {
      id: entry.lightId,
      type: typeName,
      name: baseName,
      sourceName,
      meshName: entry.mesh?.name || entry.mesh?.id || "",
      materialName: entry.rlbMaterialName || "",
      indexLabel,
      x: pos?.x ?? null,
      y: pos?.y ?? null,
      z: pos?.z ?? null
    };
  });
  const nameCounts = {};

  items.forEach((item) => {
    nameCounts[item.name] = (nameCounts[item.name] || 0) + 1;
  });
  items.forEach((item) => {
    if (item.sourceName && nameCounts[item.name] > 1) {
      item.name = `${item.sourceName} ${item.indexLabel}`;
    }
  });

  return items;
}

function buildRlbLightTypeInfo(lightEntries) {
  const counts = {};
  const materialNames = {};

  lightEntries.forEach((entry) => {
    const key = entry.rlbType || "Default";
    counts[key] = (counts[key] || 0) + 1;

    if (!materialNames[key] && entry.rlbMaterialName) {
      materialNames[key] = entry.rlbMaterialName;
    }
  });

  return { counts, materialNames };
}

function collectAngjiProximityReceiverMeshes(meshes) {
  return meshes.filter((mesh) => {
    if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.() === false) {
      return false;
    }

    if (typeof mesh.visibility === "number" && mesh.visibility <= 0.02) {
      return false;
    }

    if (mesh.metadata?.angjiCollisionInvisible || mesh.metadata?.angjiCollisionLayer) {
      return false;
    }

    if (
      mesh.metadata?.tourGuest
      || mesh.metadata?.treeMesh
      || mesh.metadata?.peopleYawMesh
      || mesh.metadata?.tourProp
    ) {
      return false;
    }

    if (isRlbLightFixtureMesh(mesh)) {
      return false;
    }

    if (mesh.metadata?.angjiExternalFloorSurface) {
      return false;
    }

    if (!meshHasSpillReceiverMaterial(mesh)) {
      return false;
    }

    return true;
  });
}

function collectReceiverMaterials(receiverMeshes, filterFn = null) {
  const materials = new Set();

  receiverMeshes.forEach((mesh) => {
    if (filterFn && !filterFn(mesh)) {
      return;
    }

    collectMaterialsFromMesh(mesh, materials);
  });

  return materials;
}

function augmentPriorityMaterialsFromScene(scene, priorityMaterials) {
  const augmented = new Set(priorityMaterials);

  (scene?.materials || []).forEach((material) => {
    if (!material || material.subMaterials || augmented.has(material)) {
      return;
    }

    const label = material.name || material.id || "";

    if (!isRlbSpillExcludedMaterialName(label) && isAngjiInteriorPriorityMaterialName(label)) {
      augmented.add(material);
    }
  });

  return augmented;
}

function logRlbGlow(message, level = "log") {
  const line = `[rlb-glow] ${message}`;

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

function updateReceiverOverlaySpill(BABYLON, scene, overlayMeshes, lightEntries, glowOptions, lifecycle, stats) {
  const activeOnlyAtNight = glowOptions.activeOnlyAtNight !== false;
  const isNight = lifecycle.isNight ?? (
    typeof document !== "undefined" && document.body.classList.contains("is-night-mode")
  );

  if (activeOnlyAtNight && !isNight) {
    overlayMeshes.forEach((mesh) => {
      if (mesh?.renderOverlay) {
        mesh.renderOverlay = false;
      }
    });
    lifecycle.overlayActive = false;
    return;
  }

  const cameraPosition = getSceneCameraPosition(BABYLON, scene, glowOptions);

  if (!cameraPosition) {
    lifecycle.overlayActive = false;
    return;
  }

  const spillOptions = {
    innerRadius: glowOptions.innerRadius ?? RLB_PROXIMITY_INNER_RADIUS,
    outerRadius: glowOptions.outerRadius ?? RLB_PROXIMITY_OUTER_RADIUS,
    maxLights: glowOptions.shaderMaxLights ?? 10,
    weightRadius: glowOptions.shaderWeightRadius ?? 180
  };
  const overlayStrength = typeof glowOptions.overlayStrength === "number"
    ? glowOptions.overlayStrength
    : 0.85;
  const cameraRadiusSq = OVERLAY_MESH_RADIUS * OVERLAY_MESH_RADIUS;
  let overlayCount = 0;

  overlayMeshes.forEach((mesh) => {
    if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.() === false) {
      return;
    }

    const center = getMeshWorldCenter(BABYLON, mesh);

    if (!center) {
      return;
    }

    if (BABYLON.Vector3.DistanceSquared(cameraPosition, center) > cameraRadiusSq) {
      if (mesh.renderOverlay) {
        mesh.renderOverlay = false;
      }
      return;
    }

    const boost = computeRlbSpillBoostAtPoint(BABYLON, center, lightEntries, spillOptions);

    if (boost <= 0.008) {
      mesh.renderOverlay = false;
      return;
    }

    const intensity = Math.min(1, boost * overlayStrength);

    mesh.renderOverlay = true;
    overlayCount += 1;

    if (!mesh.overlayColor) {
      mesh.overlayColor = new BABYLON.Color3(1, 0.88, 0.5);
    }

    mesh.overlayColor.set(
      0.45 + intensity * 0.55,
      0.36 + intensity * 0.52,
      0.1 + intensity * 0.42
    );
  });

  lifecycle.overlayActive = overlayCount > 0;
  stats.overlayMeshCount = overlayCount;
}

/**
 * Angji-only RLB glow: fixture emissive + shader proximity spill + overlay fallback.
 */
export function setupAngjiRlbProximityGlow(BABYLON, scene, modelState, options = {}) {
  const meshes = modelState?.meshes || [];
  const glowOptions = { ...(modelState?.config?.rlbProximityGlow || {}), ...options };
  const tuningState = glowOptions.tuningState || loadRlbTuningState();
  glowOptions.tuningState = ensureRlbGroupState(tuningState);
  const lightEntries = collectRlbLightEntries(BABYLON, meshes);
  const remappedGroupMembers = remapRlbGroupMemberIds(
    glowOptions.tuningState,
    buildRlbLightCatalog(lightEntries)
  );

  if (remappedGroupMembers > 0) {
    saveRlbTuningState(glowOptions.tuningState);
    logRlbGlow(`restored ${remappedGroupMembers} grouped lights after id remap`);
  }

  const spillOcclusionEnabled = glowOptions.spillOcclusion !== false;
  const occluderMeshes = spillOcclusionEnabled
    ? collectRlbSpillOccluderMeshes(modelState?.collisionMeshes || [], meshes)
    : [];
  const portalMeshes = spillOcclusionEnabled
    ? collectRlbPassThroughPortalMeshes(meshes)
    : [];
  const occluderAabbCache = spillOcclusionEnabled ? bakeRlbOccluderAabbs(occluderMeshes) : [];
  const portalAabbs = spillOcclusionEnabled ? bakeRlbPortalAabbs(portalMeshes) : [];
  const receiverMeshes = collectAngjiProximityReceiverMeshes(meshes);
  const priorityMeshes = receiverMeshes.filter((mesh) => isPriorityReceiverMesh(mesh));
  const overlayMeshes = priorityMeshes.length > 0 ? priorityMeshes : receiverMeshes;
  const receiverMaterials = collectReceiverMaterials(receiverMeshes);
  const priorityMaterials = augmentPriorityMaterialsFromScene(
    scene,
    collectReceiverMaterials(receiverMeshes, isPriorityReceiverMesh)
  );
  const deferredMaterials = new Set([...receiverMaterials].filter((material) => !priorityMaterials.has(material)));
  const shaderEnabled = glowOptions.useShaderProximity !== false;
  const shaderPriorityOnly = glowOptions.shaderPriorityOnly !== false;
  const overlayEnabled = glowOptions.useOverlayFallback === true;
  let fixtureMaterials = 0;
  const seenFixtureMaterials = new Set();
  const stats = {
    fixtureMaterials: 0,
    lightCount: lightEntries.length,
    receiverMeshes: receiverMeshes.length,
    priorityMeshes: priorityMeshes.length,
    overlayMeshes: overlayMeshes.length,
    receiverMaterials: receiverMaterials.size,
    priorityMaterials: priorityMaterials.size,
    pluginMaterialsAttached: 0,
    priorityPluginAttached: 0,
    overlayMeshCount: 0,
    shaderReady: false,
    shaderEnabled,
    overlayEnabled,
    attachPending: shaderEnabled && !shaderPriorityOnly && deferredMaterials.size > 0,
    spillOcclusionEnabled,
    occluderMeshes: occluderMeshes.length,
    portalMeshes: portalMeshes.length
  };
  const lifecycle = {
    disposed: false,
    shaderReady: false,
    overlayActive: false,
    isNight: typeof document !== "undefined"
      && document.body.classList.contains("is-night-mode"),
    observer: null,
    frameCounter: 0,
    attachedMaterials: [],
    spillSamplePoints: collectRlbSpillSamplePoints(BABYLON, priorityMeshes),
    spillSampleRefreshTick: 0,
    lightOcclusionWeights: new Map(),
    spillOcclusionRefreshTick: 0,
    occluderAabbs: [],
    occluderAabbCache,
    portalAabbs,
    previewActive: false,
    nameLabels: null,
    nameLabelsLoading: false,
    nameLabelsWantedVisible: false,
    nameLabelsFocusedId: null,
    nameLabelsHoveredId: null
  };

  meshes.forEach((mesh) => {
    const material = mesh.material;

    if (!material || material.subMaterials || seenFixtureMaterials.has(material)) {
      return;
    }

    if (!isRlbLightFixtureMesh(mesh)) {
      return;
    }

    seenFixtureMaterials.add(material);

    const rlbType = resolveRlbFixtureTypeFromMesh(mesh) || "Default";
    const fixtureGlow = rlbType === "CoveLight"
      ? {
          ...glowOptions,
          color: glowOptions.coveEmissiveColor || RLB_COVE_EMISSIVE_COLOR,
          intensity: glowOptions.coveEmissiveIntensity ?? RLB_COVE_EMISSIVE_INTENSITY,
          selfLit: true
        }
      : glowOptions;

    if (applyRlbFixtureEmissive(BABYLON, material, fixtureGlow)) {
      fixtureMaterials += 1;
    }
  });

  stats.fixtureMaterials = fixtureMaterials;

  logRlbGlow(
    `init fixtures=${fixtureMaterials} lights=${lightEntries.length}`
    + ` receivers=${receiverMeshes.length} priority=${priorityMeshes.length}`
    + ` shader=${shaderEnabled ? (shaderPriorityOnly ? "priority-only" : "all") : "off"}`
    + ` occlusion=${spillOcclusionEnabled ? `${occluderAabbCache.length}/${occluderMeshes.length} portals=${portalAabbs.length}` : "off"}`
    + ` overlay=${overlayEnabled ? "fallback" : "off"}`
  );

  if (!shaderEnabled) {
    logRlbGlow("shader disabled in config", "warn");
  } else if (receiverMaterials.size === 0) {
    logRlbGlow("no receiver materials — wall spill skipped", "warn");
  } else if (!BABYLON?.MaterialPluginBase) {
    logRlbGlow("MaterialPluginBase missing — update Babylon or disable useShaderProximity", "warn");
  }

  if (shaderEnabled && priorityMaterials.size > 0 && BABYLON?.MaterialPluginBase) {
    registerRlbProximityShaderPlugin(BABYLON);
    stats.priorityPluginAttached = attachRlbProximityShaderPluginsSync(BABYLON, priorityMaterials, {
      logMaterialNames: glowOptions.logShaderMaterialNames === true
    });
    stats.pluginMaterialsAttached = stats.priorityPluginAttached;

    if (stats.priorityPluginAttached > 0) {
      lifecycle.shaderReady = true;
      stats.shaderReady = true;
      stats.attachPending = deferredMaterials.size > 0;
      logRlbGlow(`priority shader attach ${stats.priorityPluginAttached}/${priorityMaterials.size} (pre-freeze)`);
    }
  }

  const debug = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("rlbGlowDebug") === "1";

  const spillUpdateOptions = () => {
    const tuning = glowOptions.tuningState || loadRlbTuningState();
    const cameraPosition = getSceneCameraPosition(BABYLON, scene, glowOptions);
    const camera = glowOptions.getCamera?.() || scene.activeCamera;
    const isNightActive = lifecycle.isNight
      || (typeof document !== "undefined" && document.body.classList.contains("is-night-mode"));
    const base = {
      camera,
      cameraPosition,
      activeOnlyAtNight: glowOptions.activeOnlyAtNight !== false,
      isNight: isNightActive,
      previewActive: lifecycle.previewActive === true,
      scene,
      tuningState: tuning,
      spillOcclusion: spillOcclusionEnabled,
      lightOcclusionWeights: spillOcclusionEnabled ? lifecycle.lightOcclusionWeights : null,
      occluderAabbs: spillOcclusionEnabled ? lifecycle.occluderAabbs : null,
      portalAabbs: spillOcclusionEnabled ? lifecycle.portalAabbs : null,
      getLightProfile: (entry) => getRlbProfileForLightEntry(entry, tuning),
      isLightEntryEnabled: (entry) => isRlbLightEntryEnabled(entry, tuning),
      maxLights: glowOptions.shaderMaxLights ?? RLB_SHADER_MAX_LIGHTS
    };

    return applyRlbTuningToShaderOptions(BABYLON, tuning, base);
  };

  const applyTuning = (nextTuningState) => {
    glowOptions.tuningState = ensureRlbGroupState(nextTuningState || loadRlbTuningState());
    return runUpdate();
  };

  const setPreviewActive = (active) => {
    lifecycle.previewActive = Boolean(active);
    return runUpdate();
  };

  const ensureNameLabels = () => {
    if (lifecycle.disposed) {
      return null;
    }

    if (lifecycle.nameLabels) {
      return lifecycle.nameLabels;
    }

    if (lifecycle.nameLabelsLoading) {
      return null;
    }

    lifecycle.nameLabelsLoading = true;
    import("./rlb-light-name-labels.js?v=rlb-shader-proximity-20260820-group-v49")
      .then((mod) => {
        if (lifecycle.disposed || lifecycle.nameLabels || typeof mod.createRlbLightNameLabelLayer !== "function") {
          return;
        }

        const catalog = buildRlbLightCatalog(lightEntries);
        const namesById = new Map(catalog.map((item) => [item.id, item.name]));
        lifecycle.nameLabels = mod.createRlbLightNameLabelLayer(
          BABYLON,
          scene,
          lightEntries,
          (entry) => namesById.get(entry.lightId)
        );
        lifecycle.nameLabels.setVisible(lifecycle.nameLabelsWantedVisible);
        lifecycle.nameLabels.setFocused?.(lifecycle.nameLabelsFocusedId);
        lifecycle.nameLabels.setHovered?.(lifecycle.nameLabelsHoveredId);
      })
      .catch((error) => {
        lifecycle.nameLabelsLoading = false;
        console.info("[rlb-glow] light name labels unavailable", error?.message || error);
      });

    return lifecycle.nameLabels;
  };

  const setNameLabelsVisible = (visible) => {
    lifecycle.nameLabelsWantedVisible = Boolean(visible);

    if (!visible && !lifecycle.nameLabels) {
      return;
    }

    ensureNameLabels()?.setVisible(visible);
  };

  const setFocusedLight = (lightId) => {
    lifecycle.nameLabelsFocusedId = lightId || null;

    if (!lightId && !lifecycle.nameLabels) {
      return;
    }

    ensureNameLabels()?.setFocused(lightId || null);
  };

  const setHoveredLight = (lightId) => {
    lifecycle.nameLabelsHoveredId = lightId || null;

    if (!lightId && !lifecycle.nameLabels) {
      return;
    }

    ensureNameLabels()?.setHovered(lightId || null);
  };

  const runUpdate = () => {
    if (lifecycle.disposed) {
      return 0;
    }

    let active = 0;
    const refreshInterval = glowOptions.lightRefreshFrames ?? LIGHT_REFRESH_FRAMES;

    maybeRefreshLightPositions(BABYLON, lightEntries, lifecycle, refreshInterval);

    if (spillOcclusionEnabled) {
      maybeRefreshSpillSamplePoints(BABYLON, lifecycle, priorityMeshes);
      maybeRefreshLightOcclusionWeights(
        BABYLON,
        lifecycle,
        lightEntries,
        lifecycle.occluderAabbCache,
        (() => {
          const camera = glowOptions.getCamera?.() || scene.activeCamera;
          return camera?.getTarget?.()
            || camera?.globalPosition
            || getSceneCameraPosition(BABYLON, scene, glowOptions);
        })()
      );
    }

    if (lifecycle.shaderReady && shaderEnabled) {
      active = updateRlbProximityShaderLights(BABYLON, lightEntries, spillUpdateOptions());
    }

    // CPU overlay is expensive (O(meshes × lights)); only when shader failed to attach.
    if (overlayEnabled && !lifecycle.shaderReady && overlayMeshes.length > 0) {
      updateReceiverOverlaySpill(BABYLON, scene, overlayMeshes, lightEntries, glowOptions, lifecycle, stats);
    } else if (!overlayEnabled && lifecycle.overlayActive) {
      overlayMeshes.forEach((mesh) => {
        if (mesh?.renderOverlay) {
          mesh.renderOverlay = false;
        }
      });
      lifecycle.overlayActive = false;
      stats.overlayMeshCount = 0;
    }

    stats.lastActiveLights = active;
    return active;
  };

  const startObserver = () => {
    if (lifecycle.observer || lifecycle.disposed) {
      return;
    }

    lifecycle.observer = scene.onBeforeRenderObservable.add(() => {
      if (lifecycle.disposed) {
        return;
      }

      lifecycle.frameCounter += 1;
      const isOrbitView = scene.activeCamera?.getClassName?.() === "ArcRotateCamera";
      const interval = lifecycle.previewActive
        ? 1
        : (isOrbitView ? UPDATE_INTERVAL_ORBIT_FRAMES : UPDATE_INTERVAL_WALK_FRAMES);

      if (lifecycle.frameCounter % interval !== 0) {
        return;
      }

      const active = runUpdate();

      if (debug && lifecycle.frameCounter % 120 === 0) {
        logRlbGlow(
          `debug activeLights=${active}/${lightEntries.length}`
          + ` overlayMeshes=${stats.overlayMeshCount}`
        );
      }
    });
  };

  const notifyNightMode = (isNight) => {
    lifecycle.isNight = Boolean(isNight);
    return runUpdate();
  };

  if (lifecycle.shaderReady || overlayEnabled) {
    runUpdate();
    startObserver();
  }

  void (async () => {
    if (!shaderEnabled || lifecycle.disposed || deferredMaterials.size === 0 || shaderPriorityOnly) {
      stats.attachPending = false;

      if (shaderPriorityOnly && shaderEnabled && stats.shaderReady) {
        logRlbGlow(`shader priority-only ${stats.priorityPluginAttached} materials (skipped ${deferredMaterials.size} deferred for perf)`);
      }

      return;
    }

    try {
      const attached = await attachRlbProximityShaderPluginsChunked(BABYLON, deferredMaterials, {
        chunkSize: glowOptions.shaderAttachChunkSize ?? 8,
        logMaterialNames: debug
      });

      stats.attachPending = false;
      stats.pluginMaterialsAttached += attached;

      if (lifecycle.disposed) {
        return;
      }

      if (!lifecycle.shaderReady && attached > 0) {
        lifecycle.shaderReady = true;
        stats.shaderReady = true;
      }

      logRlbGlow(`deferred shader attach ${attached}/${deferredMaterials.size}`);

      if (!stats.shaderReady) {
        logRlbGlow("0 plugins attached — using overlay fallback only", "warn");
      } else {
        runUpdate();
        logRlbGlow(
          `ready totalPlugins=${stats.pluginMaterialsAttached}/${receiverMaterials.size}`
          + ` activeLights=${stats.lastActiveLights || 0}`
          + ` nightOnly=${glowOptions.activeOnlyAtNight !== false}`
        );
      }
    } catch (error) {
      stats.attachPending = false;
      logRlbGlow(`deferred shader init failed: ${error?.message || error}`, "error");
    }
  })();

  const logStatus = (reason = "status") => {
    if (lifecycle.disposed) {
      logRlbGlow(
        `${reason} DISPOSED fixtures=${stats.lightCount} — glow was disposed (project switch or setModelState); needs re-setup`,
        "warn"
      );
      return { ...stats, activeLights: 0, disposed: true };
    }

    const active = runUpdate();
    const isNight = lifecycle.isNight
      || (typeof document !== "undefined" && document.body.classList.contains("is-night-mode"));
    const shared = BABYLON.RlbProximityShaderPlugin?.sharedState;
    const nearest = shared?.nearestLightDistance;
    const resolved = shared?.lastResolvedCount;
    const enabledCount = shared?.lastEnabledCount;
    const skip = shared?.lastSkipReason;

    logRlbGlow(
      `${reason} shaderReady=${stats.shaderReady} attachPending=${stats.attachPending}`
      + ` plugins=${stats.pluginMaterialsAttached}/${stats.receiverMaterials}`
      + ` fixtures=${stats.lightCount} spillEnabled=${enabledCount ?? "?"} packed=${active}`
      + ` cap=${RLB_SHADER_MAX_LIGHTS}`
      + ` nearest=${nearest != null ? nearest.toFixed(1) : "-"}m`
      + ` night=${isNight} overlay=${lifecycle.overlayActive} overlayMeshes=${stats.overlayMeshCount || 0}`
      + (skip ? ` skip=${skip}` : "")
    );
    return {
      ...stats,
      activeLights: active,
      isNight,
      overlayActive: lifecycle.overlayActive
    };
  };

  return {
    lightEntries,
    receiverMeshes,
    priorityMeshes,
    notifyNightMode,
    applyTuning,
    setPreviewActive,
    setNameLabelsVisible,
    setFocusedLight,
    setHoveredLight,
    getTuningState: () => glowOptions.tuningState,
    getLightTypeCounts: () => buildRlbLightTypeInfo(lightEntries).counts,
    getLightTypeInfo: () => buildRlbLightTypeInfo(lightEntries),
    getLightCatalog: () => buildRlbLightCatalog(lightEntries),
    getSpillCounts: () => {
      const targets = countRlbSpillTargets(lightEntries, glowOptions.tuningState);
      const packed = BABYLON.RlbProximityShaderPlugin?.sharedState?.lightCount ?? 0;
      return {
        ...targets,
        packed,
        cap: RLB_SHADER_MAX_LIGHTS
      };
    },
    getPresentLightTypes: () => listPresentRlbTuningTypes(buildRlbLightTypeInfo(lightEntries).counts),
    logStatus,
    isDisposed: () => lifecycle.disposed,
    getStatus: () => logStatus("getStatus"),
    dispose() {
      lifecycle.disposed = true;
      stats.attachPending = false;
      lifecycle.nameLabels?.dispose();
      lifecycle.nameLabels = null;

      if (lifecycle.observer) {
        scene.onBeforeRenderObservable.remove(lifecycle.observer);
        lifecycle.observer = null;
      }

      overlayMeshes.forEach((mesh) => {
        if (mesh?.renderOverlay) {
          mesh.renderOverlay = false;
        }
      });

      if (BABYLON.RlbProximityShaderPlugin?.sharedState) {
        BABYLON.RlbProximityShaderPlugin.sharedState.lightCount = 0;
        BABYLON.RlbProximityShaderPlugin.sharedState.occCount = 0;
        BABYLON.RlbProximityShaderPlugin.sharedState.occMin?.fill(0);
        BABYLON.RlbProximityShaderPlugin.sharedState.occMax?.fill(0);
        BABYLON.RlbProximityShaderPlugin.sharedState.lightTexData?.fill(0);
        BABYLON.RlbProximityShaderPlugin.sharedState.lightTexture?.dispose?.();
        BABYLON.RlbProximityShaderPlugin.sharedState.lightTexture = null;
      }
    }
  };
}
