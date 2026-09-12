/**
 * Local vs GitHub night RLB parity check.
 * Console: window.rlbNightDiag()  |  reset: window.rlbNightDiag.resetToBaked()
 */

import {
  RLB_TUNING_STORAGE_KEY,
  loadRlbTuningState
} from "./rlb-shader-tuning.js?v=editor-shared-20260908";
import { RLB_ANGJI_NIGHT_PRESET } from "./rlb-angji-night-preset.js?v=rlb-range-restore-20260907j";
import { isLocalDevEnvironment } from "./local-dev.js?v=local-dev-20260819";

const FALLBACK_KEYS = [
  "angji-rlb-shader-tuning-v10",
  "angji-rlb-shader-tuning-v8",
  "angji-rlb-shader-tuning-v7",
  "angji-rlb-shader-tuning-v6"
];

function summarizeTuning(state) {
  const types = state?.types || {};
  const enabledTypes = Object.entries(types).filter(([, profile]) => profile?.shaderEnabled !== false);
  const groups = Object.values(state?.groups || {});
  const lightGroups = Object.keys(state?.lightGroups || {});

  return {
    version: state?.version ?? null,
    global: state?.global
      ? {
          innerRadius: state.global.innerRadius,
          outerRadius: state.global.outerRadius,
          spillOpacity: state.global.spillOpacity,
          spillMaxBlend: state.global.spillMaxBlend
        }
      : null,
    typeCount: Object.keys(types).length,
    enabledTypeCount: enabledTypes.length,
    groupCount: groups.length,
    lightGroupCount: lightGroups.length,
    heavyTypes: enabledTypes
      .filter(([, profile]) => (profile.outerRadius || 0) >= 20 || (profile.spillMultiplier || 0) >= 3)
      .map(([name, profile]) => ({
        name,
        outerRadius: profile.outerRadius,
        spillMultiplier: profile.spillMultiplier,
        intensity: profile.intensity
      }))
  };
}

function readStorageSnapshot() {
  const primary = localStorage.getItem(RLB_TUNING_STORAGE_KEY);
  const fallbacks = FALLBACK_KEYS
    .map((key) => ({ key, bytes: localStorage.getItem(key)?.length || 0 }))
    .filter((entry) => entry.bytes > 0);

  return {
    host: window.location.hostname,
    isLocalDev: isLocalDevEnvironment(),
    primaryKey: RLB_TUNING_STORAGE_KEY,
    primaryPresent: Boolean(primary),
    primaryBytes: primary?.length || 0,
    fallbacks
  };
}

function stableJson(value) {
  return JSON.stringify(value);
}

/**
 * @param {{ getGlow?: () => any, getModelConfig?: () => any, getIsNight?: () => boolean, getScene?: () => any }} [deps]
 */
export function createRlbNightDiag(deps = {}) {
  const {
    getGlow = () => null,
    getModelConfig = () => null,
    getIsNight = () => document.body.classList.contains("is-night-mode"),
    getScene = () => null
  } = deps;

  function listBabylonLights() {
    const scene = getScene?.();
    const lights = scene?.lights || [];

    return lights.map((light) => {
      const included = light.includedOnlyMeshes;
      const excluded = light.excludedMeshes;
      return {
        name: light.name,
        className: light.getClassName?.() || light.constructor?.name || "Light",
        enabled: light.isEnabled?.() !== false,
        intensity: light.intensity,
        range: light.range,
        includedOnlyCount: Array.isArray(included) ? included.length : (included ? "?" : "all"),
        excludedCount: Array.isArray(excluded) ? excluded.length : 0
      };
    });
  }

  function run(reason = "manual") {
    const storage = readStorageSnapshot();
    const baked = summarizeTuning(RLB_ANGJI_NIGHT_PRESET);
    const activeTuning = loadRlbTuningState();
    const activeSummary = summarizeTuning(activeTuning);
    const storageOverride = storage.primaryPresent || storage.fallbacks.length > 0;
    // GitHub Pages never reads localStorage; localhost does when a key exists.
    const matchesBaked = !storageOverride
      || (
        stableJson(activeSummary.global) === stableJson(baked.global)
        && activeSummary.lightGroupCount === baked.lightGroupCount
        && activeSummary.enabledTypeCount === baked.enabledTypeCount
        && stableJson(activeSummary.heavyTypes) === stableJson(baked.heavyTypes)
      );

    const glow = getGlow?.();
    const config = getModelConfig?.() || {};
    const nightLighting = config.nightLighting || {};
    const rlbProximityGlow = config.rlbProximityGlow || {};
    let glowStatus = null;
    let spillCounts = null;

    try {
      glowStatus = glow?.logStatus?.(`diag:${reason}`) || null;
    } catch (error) {
      glowStatus = { error: error?.message || String(error) };
    }

    try {
      spillCounts = glow?.getSpillCounts?.() || null;
    } catch {
      spillCounts = null;
    }

    const babylonLights = listBabylonLights();
    const realSpotOrPoint = babylonLights.filter((light) => (
      /SpotLight|PointLight/i.test(light.className) && light.enabled && light.intensity > 0
    ));

    const report = {
      reason,
      when: new Date().toISOString(),
      nightMode: Boolean(getIsNight?.()),
      storage,
      tuningSource: !storage.isLocalDev
        ? "baked preset (non-local host — localStorage ignored)"
        : (storageOverride ? "localStorage (localhost override)" : "baked preset (no localStorage)"),
      storageOverride,
      matchesBaked,
      baked,
      active: activeSummary,
      config: {
        enableDown0: nightLighting.enableDown0,
        enableDown01: nightLighting.enableDown01,
        enableDown02: nightLighting.enableDown02,
        enableDown03: nightLighting.enableDown03,
        enableRlbPresetLights: nightLighting.enableRlbPresetLights,
        shaderMaxLights: rlbProximityGlow.shaderMaxLights,
        spillOcclusion: rlbProximityGlow.spillOcclusion,
        useShaderProximity: rlbProximityGlow.useShaderProximity,
        shaderPriorityOnly: rlbProximityGlow.shaderPriorityOnly
      },
      runtime: {
        glowReady: Boolean(glow) && !glow?.isDisposed?.(),
        spillCounts,
        babylonLights,
        realSpotOrPointCount: realSpotOrPoint.length,
        realSpotOrPoint,
        glowStatus: glowStatus
          ? {
              shaderReady: glowStatus.shaderReady,
              activeLights: glowStatus.activeLights,
              lightCount: glowStatus.lightCount,
              pluginMaterialsAttached: glowStatus.pluginMaterialsAttached,
              receiverMaterials: glowStatus.receiverMaterials,
              isNight: glowStatus.isNight,
              overlayActive: glowStatus.overlayActive,
              overlayMeshCount: glowStatus.overlayMeshCount
            }
          : null
      }
    };

    console.info("[rlb-night-diag]", report);
    console.table(babylonLights);
    console.info(
      "[rlb-night-diag] summary:",
      `source=${report.tuningSource}`,
      `matchesBaked=${matchesBaked}`,
      `packed=${spillCounts?.packed ?? "?"}/${spillCounts?.cap ?? "?"}`,
      `fixtures=${glowStatus?.lightCount ?? "?"}`,
      `plugins=${glowStatus?.pluginMaterialsAttached ?? "?"}/${glowStatus?.receiverMaterials ?? "?"}`,
      `babylonLights=${babylonLights.length}`,
      `spotOrPoint=${realSpotOrPoint.length}`,
      `storage=${storage.primaryPresent ? `${storage.primaryBytes}B` : "none"}`
    );

    if (storage.isLocalDev && storageOverride) {
      console.warn(
        "[rlb-night-diag] localhost is using localStorage RLB tuning.",
        matchesBaked
          ? "Values look like the baked preset, but GitHub ignores storage — clear anyway if FPS differs."
          : "Values differ from baked GitHub preset.",
        "Run: window.rlbNightDiag.resetToBaked() then hard-refresh."
      );
    }

    return report;
  }

  function resetToBaked() {
    try {
      localStorage.removeItem(RLB_TUNING_STORAGE_KEY);
      FALLBACK_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("[rlb-night-diag] reset failed", error);
      return { ok: false, error: error?.message || String(error) };
    }

    console.info(
      "[rlb-night-diag] cleared RLB localStorage keys.",
      "Hard-refresh now so glow reloads the baked night preset (same as GitHub)."
    );
    return {
      ok: true,
      clearedKey: RLB_TUNING_STORAGE_KEY,
      hint: "Hard-refresh required for GPU/shader path to pick up baked preset."
    };
  }

  run.resetToBaked = resetToBaked;
  run.storageKey = RLB_TUNING_STORAGE_KEY;
  return run;
}

export function shouldAutoRunRlbNightDiag() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("rlbDiag") === "1" || params.get("rlbDiag") === "true") {
      return true;
    }
  } catch {
    // ignore
  }

  return isLocalDevEnvironment();
}
