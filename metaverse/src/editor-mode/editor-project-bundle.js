/**
 * Rabbit Metaverse Editor — project JSON bundle (NPC + Event + Teleport + Tour).
 * Spec §30–33: final deliverable is exported JSON, not localStorage alone.
 */

import {
  normalizeNpcSceneDocument,
  exportNpcSceneJson
} from "./npc-scene-editor-data.js?v=npc-pivot-offset-20260903";
import {
  normalizeEventDocument,
  normalizeTeleportDocument,
  normalizeTourDocument,
  exportMarkerJson
} from "./scene-marker-data.js?v=guide-tour-bidirectional-20260903";

export const PROJECT_BUNDLE_KIND = "rabbit-metaverse-project";
export const PROJECT_BUNDLE_VERSION = "1.0";
export const PROJECT_IMPORT_BACKUP_KEY = "rabbit-metaverse-project-import-backup-v1";

export function isEditorProjectBundle(raw) {
  return Boolean(
    raw
    && (raw.kind === PROJECT_BUNDLE_KIND || raw.type === PROJECT_BUNDLE_KIND)
    && (raw.npcs || raw.events || raw.teleports || raw.tours)
  );
}

export function buildEditorProjectBundle({
  projectId = "angji",
  npcs = null,
  events = null,
  teleports = null,
  tours = null
} = {}) {
  const npcDoc = normalizeNpcSceneDocument(npcs || { npcs: [] });
  const eventDoc = normalizeEventDocument(events || { events: [] });
  const teleportDoc = normalizeTeleportDocument(teleports || { teleports: [] });
  const tourDoc = normalizeTourDocument(tours || { tours: [] });

  return {
    kind: PROJECT_BUNDLE_KIND,
    version: PROJECT_BUNDLE_VERSION,
    projectId: String(projectId || npcDoc.projectId || "angji"),
    exportedAt: new Date().toISOString(),
    npcs: npcDoc,
    events: eventDoc,
    teleports: teleportDoc,
    tours: tourDoc
  };
}

export function normalizeEditorProjectBundle(raw = {}) {
  if (!isEditorProjectBundle(raw)) {
    return null;
  }

  return buildEditorProjectBundle({
    projectId: raw.projectId,
    npcs: raw.npcs,
    events: raw.events,
    teleports: raw.teleports,
    tours: raw.tours
  });
}

export function exportEditorProjectBundleJson(bundle, pretty = true) {
  const normalized = normalizeEditorProjectBundle(bundle) || buildEditorProjectBundle(bundle);
  return `${JSON.stringify(normalized, null, pretty ? 2 : 0)}\n`;
}

export function downloadJsonFile(filename, text) {
  const blob = new Blob([String(text ?? "")], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function summarizeProjectBundle(bundle) {
  const normalized = normalizeEditorProjectBundle(bundle) || buildEditorProjectBundle(bundle);

  return {
    projectId: normalized.projectId,
    npcCount: (normalized.npcs?.npcs || []).filter((npc) => !npc.deleted).length,
    eventCount: normalized.events?.events?.length || 0,
    teleportCount: normalized.teleports?.teleports?.length || 0,
    tourCount: normalized.tours?.tours?.length || 0
  };
}

/**
 * Spec §31 — validate before applying Import. Does not mutate input.
 */
export function validateEditorProjectBundle(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "JSON 객체가 아닙니다." };
  }

  if (!isEditorProjectBundle(raw)) {
    return {
      ok: false,
      error: "rabbit-metaverse-project 형식이 아닙니다. (kind/version + npcs|events|teleports|tours)"
    };
  }

  const version = String(raw.version || "").trim();

  if (version && version !== PROJECT_BUNDLE_VERSION) {
    console.warn(`[editor-project] version ${version} ≠ ${PROJECT_BUNDLE_VERSION}, normalizing`);
  }

  const normalized = normalizeEditorProjectBundle(raw);

  if (!normalized) {
    return { ok: false, error: "프로젝트 JSON 정규화에 실패했습니다." };
  }

  return {
    ok: true,
    bundle: normalized,
    summary: summarizeProjectBundle(normalized)
  };
}

export function writeProjectImportBackup(bundle) {
  try {
    const normalized = normalizeEditorProjectBundle(bundle) || buildEditorProjectBundle(bundle);
    localStorage.setItem(PROJECT_IMPORT_BACKUP_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      bundle: normalized
    }));
    return true;
  } catch (error) {
    console.warn("[editor-project] import backup failed", error);
    return false;
  }
}

export function readProjectImportBackup() {
  try {
    const raw = localStorage.getItem(PROJECT_IMPORT_BACKUP_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const bundle = normalizeEditorProjectBundle(parsed?.bundle);

    if (!bundle) {
      return null;
    }

    return {
      savedAt: parsed.savedAt || null,
      bundle
    };
  } catch {
    return null;
  }
}

export {
  exportNpcSceneJson,
  exportMarkerJson
};
