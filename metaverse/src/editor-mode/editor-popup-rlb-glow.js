/**
 * Sync RLB glow facade for editor popup — caches snapshot from main metaverse window.
 */

import {
  ensureRlbGroupState,
  createDefaultRlbTuningState,
  rebuildRlbLightGroups
} from "../rlb-shader-tuning.js?v=editor-shared-20260908";

function mergeProfile(baseProfile, incomingProfile) {
  return {
    ...(baseProfile || {}),
    ...(incomingProfile || {})
  };
}

/** Merge a remote snapshot onto defaults without re-reading popup localStorage. */
function mergeTuningState(remoteState) {
  const defaults = createDefaultRlbTuningState();
  const incoming = remoteState && typeof remoteState === "object" ? remoteState : {};

  const typeNames = new Set([
    ...Object.keys(defaults.types || {}),
    ...Object.keys(incoming.types || {})
  ]);
  const types = {};

  typeNames.forEach((typeName) => {
    types[typeName] = mergeProfile(defaults.types?.[typeName], incoming.types?.[typeName]);
  });

  const groups = {};
  Object.entries(incoming.groups || {}).forEach(([groupId, incomingGroup]) => {
    if (!incomingGroup || typeof incomingGroup !== "object") {
      return;
    }

    groups[groupId] = {
      ...incomingGroup,
      id: groupId,
      name: String(incomingGroup.name || groupId),
      typeName: incomingGroup.typeName || "Default",
      memberIds: Array.isArray(incomingGroup.memberIds)
        ? incomingGroup.memberIds.map(String)
        : [],
      profile: mergeProfile(
        defaults.types?.[incomingGroup.typeName || "Default"],
        incomingGroup.profile
      )
    };
  });

  const merged = ensureRlbGroupState({
    version: incoming.version ?? defaults.version,
    global: {
      ...defaults.global,
      ...(incoming.global || {})
    },
    types,
    groups,
    lightGroups: {
      ...(incoming.lightGroups || {})
    }
  });

  return rebuildRlbLightGroups(merged);
}

export function createRlbGlowRemote(rpc) {
  let cache = {
    catalog: [],
    typeInfo: { counts: {}, materialNames: {} },
    tabs: ["Global"],
    tuningState: mergeTuningState(null),
    spillCounts: null
  };

  async function refresh() {
    const snapshot = await rpc.call("rlbGetSnapshot");

    if (snapshot) {
      cache = {
        catalog: Array.isArray(snapshot.catalog) ? snapshot.catalog : [],
        typeInfo: snapshot.typeInfo || { counts: {}, materialNames: {} },
        tabs: Array.isArray(snapshot.tabs) && snapshot.tabs.length ? snapshot.tabs : ["Global"],
        tuningState: mergeTuningState(snapshot.tuningState),
        spillCounts: snapshot.spillCounts ?? null
      };
    } else {
      cache.tuningState = mergeTuningState(null);
    }

    return cache;
  }

  function invoke(method, args = []) {
    void rpc.call("rlbGlowInvoke", method, args).catch((error) => {
      console.warn(`[rlb-remote] ${method} failed`, error);
    });
  }

  return {
    refresh,
    getLightCatalog: () => cache.catalog,
    getLightTypeInfo: () => cache.typeInfo,
    getPresentLightTypes: () => cache.tabs,
    getTuningState: () => cache.tuningState,
    getSpillCounts: () => cache.spillCounts,
    applyTuning: (state) => {
      // Pass panel state through as-is — do not re-merge with a second
      // localStorage copy (that silently fought live slider edits).
      cache.tuningState = ensureRlbGroupState(state || cache.tuningState);
      invoke("applyTuning", [cache.tuningState]);
      return cache.spillCounts?.packed ?? 0;
    },
    setPreviewActive: (active) => invoke("setPreviewActive", [active]),
    setNameLabelsVisible: (visible) => invoke("setNameLabelsVisible", [visible]),
    setFocusedLight: (lightId) => invoke("setFocusedLight", [lightId]),
    setHoveredLight: (lightId) => invoke("setHoveredLight", [lightId])
  };
}
