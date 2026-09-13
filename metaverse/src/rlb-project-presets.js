/**
 * Project-scoped baked RLB night presets for production (non-localhost) hosts.
 * Localhost still prefers localStorage overrides when present.
 */

import { RLB_ANGJI_NIGHT_PRESET } from "./rlb-angji-night-preset.js?v=rlb-project-preset-20260913";
import { RLB_GEOCHANG_NIGHT_PRESET } from "./rlb-geochang-night-preset.js?v=rlb-project-preset-20260913";
import { getMetaverseProjectId } from "./metaverse-project-context.js?v=editor-shared-20260908";

const PROJECT_BAKED_PRESETS = {
  angji: RLB_ANGJI_NIGHT_PRESET,
  geochang: RLB_GEOCHANG_NIGHT_PRESET
};

export function getRlbBakedPresetProjectIds() {
  return Object.keys(PROJECT_BAKED_PRESETS);
}

export function hasDedicatedRlbBakedPreset(projectId = getMetaverseProjectId()) {
  return Object.prototype.hasOwnProperty.call(PROJECT_BAKED_PRESETS, projectId);
}

export function getRlbBakedNightPreset(projectId = getMetaverseProjectId()) {
  return PROJECT_BAKED_PRESETS[projectId] || RLB_ANGJI_NIGHT_PRESET;
}

export function getRlbPresetExportName(projectId = getMetaverseProjectId()) {
  const id = String(projectId || "angji").trim().toLowerCase() || "angji";

  if (id === "angji") {
    return "RLB_ANGJI_NIGHT_PRESET";
  }

  return `RLB_${id.replace(/[^a-z0-9]+/g, "_").toUpperCase()}_NIGHT_PRESET`;
}

export function getRlbPresetFileName(projectId = getMetaverseProjectId()) {
  const id = String(projectId || "angji").trim().toLowerCase() || "angji";
  return `rlb-${id}-night-preset.js`;
}
