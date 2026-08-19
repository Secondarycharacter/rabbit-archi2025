/**
 * RLB proximity shader tuning — per-type profiles + localStorage persistence.
 *
 * Global: scene-wide spill blend (opacity, max blend, color, default radii).
 * Per-type: per-fixture spill strength, radii, shape, color temperature, on/off.
 */

import {
  RLB_SHAPE,
  RLB_TUNING_TYPE_ORDER,
  resolveRlbSpillShapeCode
} from "./rlb-fixture-types.js";
import { RLB_ANGJI_NIGHT_PRESET } from "./rlb-angji-night-preset.js?v=rlb-shader-proximity-20260819-group-v47";

export const RLB_TUNING_STORAGE_KEY = "angji-rlb-shader-tuning-v9";
const RLB_TUNING_STORAGE_FALLBACK_KEYS = [
  "angji-rlb-shader-tuning-v10",
  "angji-rlb-shader-tuning-v8",
  "angji-rlb-shader-tuning-v7",
  "angji-rlb-shader-tuning-v6"
];

/** Per-light strength — night interiors must read as lit vs unlit. */
export const RLB_DEFAULT_SPILL_MULTIPLIER = 3.6;
/** Global mix — visible wall/floor wash without flattening albedo completely. */
export const RLB_DEFAULT_SPILL_OPACITY = 0.82;
export const RLB_DEFAULT_SPILL_MAX_BLEND = 1.15;
export const RLB_DEFAULT_SPILL_ACCUM_CAP = 1.85;
export const RLB_DEFAULT_COLOR_TEMP_K = 6500;

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

/** Black-body approx. (1000–40000 K) → linear RGB 0–1. */
export function kelvinToSpillRgb(kelvin) {
  const temp = clampNumber(kelvin, 1000, 40000, RLB_DEFAULT_COLOR_TEMP_K) / 100;
  let r;
  let g;
  let b;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * ((temp - 60) ** -0.1332047592);
    g = 288.1221695283 * ((temp - 60) ** -0.0755148492);
    b = 255;
  }

  return {
    r: Math.min(1, Math.max(0, r / 255)),
    g: Math.min(1, Math.max(0, g / 255)),
    b: Math.min(1, Math.max(0, b / 255))
  };
}

export function resolveRlbSpillColor(global) {
  const kelvin = clampNumber(
    global?.colorTemperatureK,
    1800,
    12000,
    RLB_DEFAULT_COLOR_TEMP_K
  );

  return kelvinToSpillRgb(kelvin);
}

export function syncSpillColorFromTemperature(global) {
  if (!global) {
    return kelvinToSpillRgb(RLB_DEFAULT_COLOR_TEMP_K);
  }

  global.colorTemperatureK = clampNumber(
    global.colorTemperatureK,
    1800,
    12000,
    RLB_DEFAULT_COLOR_TEMP_K
  );
  global.spillColor = resolveRlbSpillColor(global);
  return global.spillColor;
}

export function cloneRlbProfile(profile) {
  return { ...(profile || {}) };
}

export function makeRlbLightId(entry) {
  const typeName = entry?.rlbType || "Default";
  const meshName = String(entry?.mesh?.name || entry?.mesh?.id || "light").trim() || "light";
  const pos = entry?.position;
  const x = Number.isFinite(pos?.x) ? pos.x.toFixed(2) : "0.00";
  const y = Number.isFinite(pos?.y) ? pos.y.toFixed(2) : "0.00";
  const z = Number.isFinite(pos?.z) ? pos.z.toFixed(2) : "0.00";
  return `${typeName}|${meshName}|${x}|${y}|${z}`;
}

export function parseRlbLightId(lightId) {
  const parts = String(lightId || "").split("|");

  if (parts.length < 2) {
    return null;
  }

  const typeName = parts[0];
  const last = parts[parts.length - 1];
  const mid = parts[parts.length - 2];
  const left = parts[parts.length - 3];
  const hasPos = parts.length >= 5
    && Number.isFinite(Number.parseFloat(left))
    && Number.isFinite(Number.parseFloat(mid))
    && Number.isFinite(Number.parseFloat(last));

  if (hasPos) {
    return {
      typeName,
      meshName: parts.slice(1, -3).join("|"),
      x: Number.parseFloat(left),
      y: Number.parseFloat(mid),
      z: Number.parseFloat(last)
    };
  }

  return {
    typeName,
    meshName: parts.slice(1).join("|"),
    x: Number.NaN,
    y: Number.NaN,
    z: Number.NaN
  };
}

function catalogItemDistance(item, parsed) {
  if (!Number.isFinite(parsed?.x) || !Number.isFinite(item?.x)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.hypot(
    item.x - parsed.x,
    (item.y ?? 0) - parsed.y,
    (item.z ?? 0) - parsed.z
  );
}

function scoreRlbGroupIdMatch(item, parsed) {
  if (!item || !parsed || (parsed.typeName && item.type !== parsed.typeName)) {
    return -1;
  }

  let score = 0;
  const meshMatch = parsed.meshName && item.meshName === parsed.meshName;
  const sourceMatch = parsed.meshName && item.sourceName === parsed.meshName;

  if (meshMatch) {
    score += 100;
  } else if (sourceMatch) {
    score += 70;
  }

  const dist = catalogItemDistance(item, parsed);

  if (Number.isFinite(dist) && dist <= 2.5) {
    score += Math.max(0, 50 - dist * 20);
  } else if (!meshMatch && !sourceMatch) {
    return -1;
  }

  return score;
}

/** Reattach saved group members when light IDs drifted after origin/shape changes. */
export function remapRlbGroupMemberIds(tuningState, catalogItems) {
  const state = ensureRlbGroupState(tuningState);
  const catalog = Array.isArray(catalogItems) ? catalogItems : [];
  const assigned = new Set();
  let remapped = 0;

  const takeMatch = (oldId) => {
    const exact = catalog.find((item) => item.id === oldId && !assigned.has(item.id));

    if (exact) {
      assigned.add(exact.id);
      return exact.id;
    }

    const parsed = parseRlbLightId(oldId);

    if (!parsed) {
      return null;
    }

    let best = null;
    let bestScore = 19;

    catalog.forEach((item) => {
      if (assigned.has(item.id)) {
        return;
      }

      const score = scoreRlbGroupIdMatch(item, parsed);

      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    });

    if (!best) {
      return null;
    }

    assigned.add(best.id);
    return best.id;
  };

  Object.values(state.groups).forEach((group) => {
    const nextIds = [];
    const seen = new Set();

    (group.memberIds || []).forEach((oldId) => {
      const nextId = takeMatch(oldId) || oldId;

      if (!nextId || seen.has(nextId)) {
        return;
      }

      seen.add(nextId);
      nextIds.push(nextId);

      if (nextId !== oldId) {
        remapped += 1;
      }
    });

    group.memberIds = nextIds;
  });

  rebuildRlbLightGroups(state);
  return remapped;
}

export function isGenericRlbNodeName(name) {
  const value = String(name || "").trim();
  return !value
    || value === "."
    || /^mesh\d+$/i.test(value)
    || /^3dgeom/i.test(value)
    || /^__root__/i.test(value)
    || /^root$/i.test(value)
    || /^node[_-]?\d+$/i.test(value)
    || /^primitive/i.test(value)
    || /^gltf[_-]?node/i.test(value);
}

export function resolveRlbLightSourceName(entry) {
  const collected = [];
  let node = entry?.mesh;
  let depth = 0;

  while (node && depth < 8) {
    const name = String(node.name || node.id || "").trim();

    if (!isGenericRlbNodeName(name) && !collected.includes(name)) {
      collected.push(name);
    }

    node = node.parent;
    depth += 1;
  }

  return collected[0] || "";
}

export function formatRlbLightLabel(entry, typeIndex = 1) {
  const typeName = entry?.rlbType || "Light";
  const indexLabel = String(typeIndex).padStart(2, "0");
  const sourceName = resolveRlbLightSourceName(entry);

  if (sourceName) {
    return sourceName;
  }

  return `${typeName} ${indexLabel}`;
}

export function ensureRlbGroupState(tuningState) {
  const state = tuningState || createDefaultRlbTuningState();

  if (!state.groups || typeof state.groups !== "object") {
    state.groups = {};
  }

  if (!state.lightGroups || typeof state.lightGroups !== "object") {
    state.lightGroups = {};
  }

  return state;
}

export function rebuildRlbLightGroups(tuningState) {
  const state = ensureRlbGroupState(tuningState);
  const lightGroups = {};

  Object.values(state.groups).forEach((group) => {
    if (!group?.id) {
      return;
    }

    group.memberIds = Array.isArray(group.memberIds) ? group.memberIds.map(String) : [];
    group.memberIds.forEach((lightId) => {
      lightGroups[lightId] = group.id;
    });
  });

  state.lightGroups = lightGroups;
  return state;
}

export function getRlbGroupsForType(tuningState, typeName) {
  const state = ensureRlbGroupState(tuningState);
  return Object.values(state.groups).filter((group) => group?.typeName === typeName);
}

export function resolveRlbGroupForLight(entry, tuningState) {
  const state = ensureRlbGroupState(tuningState);
  const lightId = entry?.lightId || makeRlbLightId(entry);
  const groupId = state.lightGroups?.[lightId];
  const group = groupId ? state.groups?.[groupId] : null;

  if (!group || (entry?.rlbType && group.typeName && group.typeName !== entry.rlbType)) {
    return null;
  }

  return group;
}

export function createRlbLightGroup(tuningState, typeName, name, memberIds) {
  const state = ensureRlbGroupState(tuningState);
  const id = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const base = getDefaultTypeProfile(typeName);
  const existing = state.types?.[typeName];
  const group = {
    id,
    name: String(name || `${typeName} 그룹`).trim() || `${typeName} 그룹`,
    typeName,
    memberIds: [...new Set((memberIds || []).map(String))],
    profile: cloneRlbProfile(existing || base)
  };

  state.groups[id] = group;
  rebuildRlbLightGroups(state);
  return group;
}

function createBaseTypeProfile(overrides = {}) {
  return {
    shaderEnabled: true,
    innerRadius: 12,
    outerRadius: 22,
    spillMultiplier: RLB_DEFAULT_SPILL_MULTIPLIER,
    intensity: 1,
    coneSoftness: 0.65,
    shape: RLB_SHAPE.AUTO,
    colorTemperatureK: null,
    ...overrides
  };
}

export function resolveRlbTypeColorTemperatureK(typeProfile, global) {
  const globalK = clampNumber(
    global?.colorTemperatureK,
    1800,
    12000,
    RLB_DEFAULT_COLOR_TEMP_K
  );

  if (typeProfile?.colorTemperatureK == null) {
    return globalK;
  }

  return clampNumber(typeProfile.colorTemperatureK, 1800, 12000, globalK);
}

export function resolveRlbTypeSpillColor(typeProfile, global) {
  return kelvinToSpillRgb(resolveRlbTypeColorTemperatureK(typeProfile, global));
}

export function createDefaultRlbTuningState() {
  const types = {};

  RLB_TUNING_TYPE_ORDER.forEach((typeName) => {
    if (typeName === "Global") {
      return;
    }

    types[typeName] = createBaseTypeProfile();

    if (typeName === "CoveLight") {
      types[typeName].innerRadius = 8;
      types[typeName].outerRadius = 20;
      types[typeName].spillMultiplier = 3.6;
      types[typeName].shape = RLB_SHAPE.LINE;
    } else if (typeName === "LineLight" || typeName === "StairLight") {
      types[typeName].innerRadius = 10;
      types[typeName].outerRadius = 28;
      types[typeName].spillMultiplier = 3.2;
      types[typeName].shape = RLB_SHAPE.LINE;
    } else if (typeName === "PanelLight") {
      types[typeName].innerRadius = 14;
      types[typeName].outerRadius = 26;
      types[typeName].spillMultiplier = 4.2;
      types[typeName].shape = RLB_SHAPE.RECT;
    } else if (typeName === "DownLight" || typeName === "Down02") {
      types[typeName].spillMultiplier = 4.4;
    } else if (typeName === "WallLight") {
      types[typeName].innerRadius = 14;
      types[typeName].outerRadius = 26;
      types[typeName].spillMultiplier = 4.0;
      types[typeName].coneSoftness = 0.55;
      types[typeName].shape = RLB_SHAPE.AUTO;
    } else if (typeName === "SpotLight") {
      types[typeName].innerRadius = 10;
      types[typeName].outerRadius = 20;
      types[typeName].spillMultiplier = 4.0;
      types[typeName].coneSoftness = 0.65;
    }
  });

  return {
    version: 9,
    global: {
      innerRadius: 12,
      outerRadius: 22,
      colorTemperatureK: RLB_DEFAULT_COLOR_TEMP_K,
      spillColor: kelvinToSpillRgb(RLB_DEFAULT_COLOR_TEMP_K),
      spillOpacity: RLB_DEFAULT_SPILL_OPACITY,
      spillMaxBlend: RLB_DEFAULT_SPILL_MAX_BLEND,
      spillLumaPreserve: 0.32
    },
    types,
    groups: {},
    lightGroups: {}
  };
}

function normalizeSavedProfile(typeName, savedProfile, defaults) {
  const base = defaults.types[typeName] || defaults.types.Default || createBaseTypeProfile();
  const merged = {
    ...base,
    ...(savedProfile || {})
  };

  if (!Number.isFinite(merged.spillMultiplier) || merged.spillMultiplier < 0) {
    merged.spillMultiplier = base.spillMultiplier;
  } else {
    merged.spillMultiplier = clampNumber(merged.spillMultiplier, 0, 40, base.spillMultiplier);
  }

  if (typeof merged.intensity !== "number" || merged.intensity <= 0) {
    merged.intensity = base.intensity;
  }

  if (typeof merged.shaderEnabled !== "boolean") {
    merged.shaderEnabled = true;
  }

  if (merged.colorTemperatureK != null) {
    merged.colorTemperatureK = clampNumber(
      merged.colorTemperatureK,
      1800,
      12000,
      defaults.global.colorTemperatureK
    );
  }

  return merged;
}

function mergeTuningState(saved) {
  const defaults = createDefaultRlbTuningState();

  if (!saved || typeof saved !== "object") {
    return defaults;
  }

  const savedGlobal = saved.global || {};
  const global = {
    ...defaults.global,
    innerRadius: savedGlobal.innerRadius ?? defaults.global.innerRadius,
    outerRadius: savedGlobal.outerRadius ?? defaults.global.outerRadius,
    spillLumaPreserve: clampNumber(
      savedGlobal.spillLumaPreserve,
      0,
      1,
      defaults.global.spillLumaPreserve
    ),
    colorTemperatureK: clampNumber(
      savedGlobal.colorTemperatureK,
      1800,
      12000,
      defaults.global.colorTemperatureK
    ),
    spillOpacity: clampNumber(savedGlobal.spillOpacity, 0, 1, defaults.global.spillOpacity),
    spillMaxBlend: clampNumber(savedGlobal.spillMaxBlend, 0.05, 2.5, defaults.global.spillMaxBlend),
    spillColor: resolveRlbSpillColor({
      colorTemperatureK: savedGlobal.colorTemperatureK ?? defaults.global.colorTemperatureK
    })
  };

  const types = { ...defaults.types };

  Object.keys(defaults.types).forEach((typeName) => {
    types[typeName] = normalizeSavedProfile(typeName, saved.types?.[typeName], defaults);
  });

  const groups = {};
  const savedGroups = saved.groups && typeof saved.groups === "object" ? saved.groups : {};

  Object.entries(savedGroups).forEach(([id, group]) => {
    if (!group || typeof group !== "object") {
      return;
    }

    const typeName = group.typeName || "Default";
    groups[id] = {
      id,
      name: String(group.name || `${typeName} 그룹`).trim() || `${typeName} 그룹`,
      typeName,
      memberIds: Array.isArray(group.memberIds) ? group.memberIds.map(String) : [],
      profile: normalizeSavedProfile(typeName, group.profile, defaults)
    };
  });

  const merged = { version: 9, global, types, groups, lightGroups: {} };
  rebuildRlbLightGroups(merged);
  return merged;
}

function isRlbLocalDevHost() {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname;

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return true;
  }

  const devParam = new URLSearchParams(window.location.search).get("dev");
  return devParam === "1" || devParam === "true";
}

function bakedNightPresetState() {
  return mergeTuningState(RLB_ANGJI_NIGHT_PRESET);
}

function maybeCaptureLocalTuningPreset(raw) {
  if (!isRlbLocalDevHost() || !raw || typeof fetch !== "function") {
    return;
  }

  fetch("http://127.0.0.1:8766/rlb-preset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw
  }).catch(() => {});
}

function readStoredTuningRaw() {
  const primary = localStorage.getItem(RLB_TUNING_STORAGE_KEY);

  if (primary) {
    return { raw: primary, source: RLB_TUNING_STORAGE_KEY };
  }

  for (let index = 0; index < RLB_TUNING_STORAGE_FALLBACK_KEYS.length; index += 1) {
    const key = RLB_TUNING_STORAGE_FALLBACK_KEYS[index];
    const raw = localStorage.getItem(key);

    if (raw) {
      return { raw, source: key };
    }
  }

  return { raw: null, source: null };
}

export function loadRlbTuningState() {
  if (typeof window === "undefined") {
    return bakedNightPresetState();
  }

  if (!isRlbLocalDevHost()) {
    return bakedNightPresetState();
  }

  try {
    const stored = readStoredTuningRaw();

    if (!stored.raw) {
      return bakedNightPresetState();
    }

    maybeCaptureLocalTuningPreset(stored.raw);
    const merged = mergeTuningState(JSON.parse(stored.raw));

    if (stored.source && stored.source !== RLB_TUNING_STORAGE_KEY) {
      saveRlbTuningState(merged);
      console.info(`[rlb-tune] restored settings from ${stored.source}`);
    }

    return merged;
  } catch (error) {
    console.warn("[rlb-tune] load failed, using baked night preset:", error);
    return bakedNightPresetState();
  }
}

export function saveRlbTuningState(state) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(RLB_TUNING_STORAGE_KEY, raw);
    maybeCaptureLocalTuningPreset(raw);
    return true;
  } catch (error) {
    console.warn("[rlb-tune] save failed:", error);
    return false;
  }
}

export function resetRlbTuningState() {
  const defaults = createDefaultRlbTuningState();
  saveRlbTuningState(defaults);
  return defaults;
}

export function getDefaultTypeProfile(typeName) {
  const defaults = createDefaultRlbTuningState();
  return {
    ...(defaults.types[typeName] || defaults.types.Default || createBaseTypeProfile())
  };
}

export function isRlbTypeShaderEnabled(typeName, tuningState) {
  const tuning = tuningState || createDefaultRlbTuningState();
  const profile = tuning.types?.[typeName] || tuning.types?.Default || {};
  return profile.shaderEnabled !== false;
}

export function isRlbLightEntryEnabled(entry, tuningState) {
  return getRlbProfileForLightEntry(entry, tuningState).shaderEnabled !== false;
}

export function getRlbProfileForLightEntry(entry, tuningState) {
  const tuning = ensureRlbGroupState(tuningState || createDefaultRlbTuningState());
  const typeName = entry?.rlbType || "Default";
  const group = resolveRlbGroupForLight(entry, tuning);
  const typeProfile = tuning.types[typeName] || tuning.types.Default || createBaseTypeProfile();
  const profileSource = group?.profile || typeProfile;
  const global = tuning.global || {};
  const shaderEnabled = profileSource.shaderEnabled !== false;

  const innerRadius = clampNumber(
    profileSource.innerRadius ?? global.innerRadius,
    1,
    80,
    12
  );
  const outerRadius = clampNumber(
    Math.max(profileSource.outerRadius ?? global.outerRadius, innerRadius + 1),
    2,
    120,
    22
  );
  const spillMultiplier = clampNumber(
    (profileSource.spillMultiplier ?? RLB_DEFAULT_SPILL_MULTIPLIER) * (profileSource.intensity ?? 1),
    0,
    40,
    RLB_DEFAULT_SPILL_MULTIPLIER
  );
  const coneSoftness = clampNumber(profileSource.coneSoftness, 0, 1, 0.65);
  const isLineType = typeName === "LineLight" || typeName === "CoveLight" || typeName === "StairLight";
  const shapeCode = resolveRlbSpillShapeCode(
    typeName,
    isLineType ? RLB_SHAPE.LINE : (profileSource.shape || RLB_SHAPE.AUTO)
  );
  const colorTemperatureK = resolveRlbTypeColorTemperatureK(profileSource, global);
  const spillColor = resolveRlbTypeSpillColor(profileSource, global);
  const usesGlobalColorTemperature = profileSource.colorTemperatureK == null;

  return {
    typeName,
    groupId: group?.id || null,
    groupName: group?.name || null,
    shaderEnabled,
    innerRadius,
    outerRadius,
    spillMultiplier,
    coneSoftness,
    shapeCode,
    colorTemperatureK,
    spillColor,
    usesGlobalColorTemperature
  };
}

export function applyRlbTuningToShaderOptions(BABYLON, tuningState, spillOptions = {}) {
  const tuning = tuningState || createDefaultRlbTuningState();
  const color = syncSpillColorFromTemperature(tuning.global);

  return {
    ...spillOptions,
    innerRadius: tuning.global.innerRadius,
    outerRadius: tuning.global.outerRadius,
    spillOpacity: tuning.global.spillOpacity,
    spillMaxBlend: tuning.global.spillMaxBlend,
    spillLumaPreserve: tuning.global.spillLumaPreserve,
    colorTemperatureK: tuning.global.colorTemperatureK,
    tuningState: tuning,
    spillColor: spillOptions.spillColor instanceof BABYLON.Color3
      ? spillOptions.spillColor
      : new BABYLON.Color3(color.r, color.g, color.b)
  };
}
