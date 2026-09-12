/**
 * Per-project identity for the shared editor / guide / guest stack.
 * Angji keeps its existing file and localStorage keys so current data still loads.
 * Other (and future) projects get isolated paths and keys from ?project=.
 */

const DEFAULT_PROJECT_ID = "angji";

const PROJECT_FEATURE_DEFAULTS = {
  guide: true,
  guest: true,
  rlb: true
};

const PROJECT_FEATURES = {
  angji: { guide: true, guest: true, rlb: true },
  jinju: { guide: true, guest: true, rlb: true },
  geochang: { guide: true, guest: true, rlb: true },
  chungju: { guide: true, guest: true, rlb: true }
};

export function normalizeProjectId(value) {
  const id = String(value || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,47}$/.test(id) ? id : DEFAULT_PROJECT_ID;
}

export function getMetaverseProjectId(explicit) {
  if (explicit != null && String(explicit).trim()) {
    return normalizeProjectId(explicit);
  }

  try {
    const fromUrl = new URLSearchParams(window.location.search).get("project");

    if (fromUrl) {
      return normalizeProjectId(fromUrl);
    }
  } catch {
    // ignore
  }

  return DEFAULT_PROJECT_ID;
}

function scopedKey(base, projectId) {
  return projectId === DEFAULT_PROJECT_ID ? base : `${base}:${projectId}`;
}

export function getGuideFirestoreDocIds(projectId) {
  const id = getMetaverseProjectId(projectId);

  return {
    current: id,
    manifest: `${id}_base_manifest`,
    "backup-1": `${id}_base_backup_1`,
    "backup-2": `${id}_base_backup_2`,
    "backup-3": `${id}_base_backup_3`
  };
}

export function getGuestFirestoreDocIds(projectId) {
  return getGuideFirestoreDocIds(projectId);
}

export function getMetaverseProjectContext(explicit) {
  const projectId = getMetaverseProjectId(explicit);
  const isDefault = projectId === DEFAULT_PROJECT_ID;
  const features = {
    ...PROJECT_FEATURE_DEFAULTS,
    ...(PROJECT_FEATURES[projectId] || {})
  };

  return {
    projectId,
    features,
    npc: {
      dataUrl: isDefault ? "./data/npc/npcs.json" : `./data/npc/${projectId}/npcs.json`,
      guestsUrl: isDefault ? "./data/npc/guests.json" : `./data/npc/${projectId}/guests.json`,
      storageKey: scopedKey("rabbit-metaverse-npc-placements-v1", projectId),
      guestStorageKey: scopedKey("angji-npc-guest-manager-v1", projectId),
      progressKey: scopedKey("angji-npc-conversation-progress-v1", projectId)
    },
    markers: {
      eventsUrl: isDefault ? "./data/editor/events.json" : `./data/editor/${projectId}/events.json`,
      teleportsUrl: isDefault ? "./data/editor/teleports.json" : `./data/editor/${projectId}/teleports.json`,
      toursUrl: isDefault ? "./data/editor/tours.json" : `./data/editor/${projectId}/tours.json`,
      eventsStorageKey: scopedKey("rabbit-metaverse-events-v1", projectId),
      teleportsStorageKey: scopedKey("rabbit-metaverse-teleports-v1", projectId),
      toursStorageKey: scopedKey("rabbit-metaverse-tours-v1", projectId)
    },
    guide: {
      dataUrl: isDefault
        ? "./data/guide/angji-guide-tour.json"
        : `./data/guide/${projectId}-guide-tour.json`,
      storageKey: scopedKey("angji-guide-tour-manager-v1", projectId),
      firestore: getGuideFirestoreDocIds(projectId)
    },
    guest: {
      firestore: getGuestFirestoreDocIds(projectId)
    },
    rlb: {
      storageKey: scopedKey("angji-rlb-shader-tuning-v9", projectId),
      presetBuildKey: scopedKey("angji-rlb-preset-build", projectId)
    },
    bundle: {
      importBackupKey: scopedKey("rabbit-metaverse-project-import-backup-v1", projectId)
    },
    broadcast: {
      tour: `metaverse-guide-tour-data-v1:${projectId}`,
      guest: `metaverse-guest-bundle-v1:${projectId}`,
      tourAliases: isDefault ? ["angji-guide-tour-data-v1"] : [],
      guestAliases: isDefault ? ["angji-guest-bundle-v1"] : []
    }
  };
}
