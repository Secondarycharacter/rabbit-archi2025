/**
 * Editor Mode — Firestore deploy + current-value (base) save/load for guide tour JSON.
 * NORMAL MODE loads Firestore data when localStorage overlay is absent.
 */

import { FIREBASE_CONFIG } from "../firebase-config.js?v=guide-tour-firestore-20260902";
import { normalizeTourData } from "../angji-guide-tour-data.js?v=guide-orbit-sequences-20260905";

export const GUIDE_TOUR_FIRESTORE_COLLECTION = "metaverseGuideTours";
export const ANGJI_GUIDE_TOUR_DOC_ID = "angji";
export const GUIDE_BASE_MANIFEST_DOC_ID = "angji_base_manifest";

/** Current value + up to 3 rotated backups (same collection). */
export const GUIDE_BASE_DOC_IDS = {
  current: ANGJI_GUIDE_TOUR_DOC_ID,
  "backup-1": "angji_base_backup_1",
  "backup-2": "angji_base_backup_2",
  "backup-3": "angji_base_backup_3"
};

const firestoreState = {
  enabled: false,
  db: null,
  firestore: null,
  initPromise: null
};

export function isGuideTourFirestoreConfigured() {
  return Boolean(
    FIREBASE_CONFIG.apiKey
    && FIREBASE_CONFIG.authDomain
    && FIREBASE_CONFIG.projectId
  );
}

async function ensureGuideTourFirestore() {
  if (firestoreState.enabled) {
    return firestoreState;
  }

  if (!isGuideTourFirestoreConfigured()) {
    throw new Error("Firebase config is missing.");
  }

  if (!firestoreState.initPromise) {
    firestoreState.initPromise = (async () => {
      const [{ initializeApp }, firestoreModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
      ]);

      const app = initializeApp(FIREBASE_CONFIG, "guide-tour-editor");
      const db = firestoreModule.getFirestore(app);

      firestoreState.db = db;
      firestoreState.firestore = firestoreModule;
      firestoreState.enabled = true;
      return firestoreState;
    })();
  }

  return firestoreState.initPromise;
}

function stripFirestoreMeta(raw = {}) {
  const next = { ...raw };
  delete next.updatedAt;
  delete next.baseVersionId;
  delete next.baseSavedAt;
  delete next.versions;
  return next;
}

function toIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }

  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }

  return null;
}

function formatSavedAtLabel(iso) {
  if (!iso) {
    return "";
  }

  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString("ko-KR", { hour12: false });
  } catch {
    return "";
  }
}

function buildVersionRows(manifest = {}) {
  const metaById = new Map((manifest.versions || []).map((item) => [item.id, item]));

  return ["current", "backup-1", "backup-2", "backup-3"].map((id) => {
    const savedAt = metaById.get(id)?.savedAt || null;
    const stamp = formatSavedAtLabel(savedAt);
    let label = id === "current" ? "현재값 (Firestore)" : `백업 ${id.replace("backup-", "")}`;

    if (stamp) {
      label = `${label} · ${stamp}`;
    }

    return { id, label, savedAt };
  });
}

async function readTourDoc(docId) {
  const { db, firestore } = await ensureGuideTourFirestore();
  const snapshot = await firestore.getDoc(
    firestore.doc(db, GUIDE_TOUR_FIRESTORE_COLLECTION, docId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  const raw = snapshot.data() || {};
  return {
    data: normalizeTourData(stripFirestoreMeta(raw)),
    savedAt: toIsoTimestamp(raw.baseSavedAt) || toIsoTimestamp(raw.updatedAt)
  };
}

async function writeTourDoc(docId, tourData, extra = {}) {
  const { db, firestore } = await ensureGuideTourFirestore();
  const normalized = normalizeTourData(tourData);
  const docRef = firestore.doc(db, GUIDE_TOUR_FIRESTORE_COLLECTION, docId);

  await firestore.setDoc(docRef, {
    ...normalized,
    ...extra,
    updatedAt: firestore.serverTimestamp()
  });

  return normalized;
}

async function readBaseManifest() {
  const { db, firestore } = await ensureGuideTourFirestore();
  const snapshot = await firestore.getDoc(
    firestore.doc(db, GUIDE_TOUR_FIRESTORE_COLLECTION, GUIDE_BASE_MANIFEST_DOC_ID)
  );

  if (!snapshot.exists()) {
    return { versions: [], updatedAt: null };
  }

  const raw = snapshot.data() || {};
  return {
    versions: Array.isArray(raw.versions) ? raw.versions : [],
    updatedAt: toIsoTimestamp(raw.updatedAt)
  };
}

async function writeBaseManifest(manifest) {
  const { db, firestore } = await ensureGuideTourFirestore();
  const docRef = firestore.doc(db, GUIDE_TOUR_FIRESTORE_COLLECTION, GUIDE_BASE_MANIFEST_DOC_ID);

  await firestore.setDoc(docRef, {
    versions: manifest.versions || [],
    updatedAt: firestore.serverTimestamp()
  });
}

export async function loadGuideTourFromFirestore(docId = ANGJI_GUIDE_TOUR_DOC_ID) {
  if (!isGuideTourFirestoreConfigured()) {
    return null;
  }

  const loaded = await readTourDoc(docId);
  return loaded?.data || null;
}

export async function saveGuideTourToFirestore(data, docId = ANGJI_GUIDE_TOUR_DOC_ID) {
  const extra = {};

  if (docId === ANGJI_GUIDE_TOUR_DOC_ID) {
    extra.baseVersionId = "current";
  }

  return writeTourDoc(docId, data, extra);
}

/**
 * List current Firestore value + backup slots for the guide base toolbar.
 */
export async function listGuideBaseVersionsFromFirestore() {
  if (!isGuideTourFirestoreConfigured()) {
    throw new Error("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
  }

  let manifest = await readBaseManifest();

  // Bootstrap labels from live docs when manifest is empty.
  if (!manifest.versions?.length) {
    const current = await readTourDoc(GUIDE_BASE_DOC_IDS.current);
    manifest = {
      versions: [
        { id: "current", savedAt: current?.savedAt || null },
        { id: "backup-1", savedAt: null },
        { id: "backup-2", savedAt: null },
        { id: "backup-3", savedAt: null }
      ],
      updatedAt: current?.savedAt || null
    };
  }

  return {
    ok: true,
    versions: buildVersionRows(manifest),
    manifest
  };
}

/**
 * Load a base version (`current` | `backup-1` | …) from Firestore.
 */
export async function loadGuideBaseVersionFromFirestore(versionId = "current") {
  if (!isGuideTourFirestoreConfigured()) {
    throw new Error("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
  }

  const id = GUIDE_BASE_DOC_IDS[versionId] ? versionId : "current";
  const docId = GUIDE_BASE_DOC_IDS[id];
  const loaded = await readTourDoc(docId);

  if (!loaded?.data) {
    if (id === "current") {
      throw new Error("Firestore에 저장된 현재값이 없습니다. 먼저「기본값 저장」또는「Firestore 배포」를 하세요.");
    }
    throw new Error(`「${id}」백업이 Firestore에 없습니다.`);
  }

  return {
    ok: true,
    id,
    data: loaded.data,
    savedAt: loaded.savedAt
  };
}

/**
 * Write current editor values to Firestore as「현재값」, rotating up to 3 backups.
 */
export async function saveGuideBaseVersionToFirestore(tourData) {
  if (!isGuideTourFirestoreConfigured()) {
    throw new Error("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
  }

  const previousManifest = await readBaseManifest();
  const previousById = new Map((previousManifest.versions || []).map((item) => [item.id, item]));
  const nowIso = new Date().toISOString();

  const current = await readTourDoc(GUIDE_BASE_DOC_IDS.current);
  const backup1 = await readTourDoc(GUIDE_BASE_DOC_IDS["backup-1"]);
  const backup2 = await readTourDoc(GUIDE_BASE_DOC_IDS["backup-2"]);

  // Rotate: current → backup-1 → backup-2 → backup-3
  if (backup2?.data) {
    await writeTourDoc(GUIDE_BASE_DOC_IDS["backup-3"], backup2.data, {
      baseVersionId: "backup-3",
      baseSavedAt: previousById.get("backup-2")?.savedAt || backup2.savedAt || nowIso
    });
  }

  if (backup1?.data) {
    await writeTourDoc(GUIDE_BASE_DOC_IDS["backup-2"], backup1.data, {
      baseVersionId: "backup-2",
      baseSavedAt: previousById.get("backup-1")?.savedAt || backup1.savedAt || nowIso
    });
  }

  if (current?.data) {
    await writeTourDoc(GUIDE_BASE_DOC_IDS["backup-1"], current.data, {
      baseVersionId: "backup-1",
      baseSavedAt: previousById.get("current")?.savedAt || current.savedAt || nowIso
    });
  }

  const normalized = await writeTourDoc(GUIDE_BASE_DOC_IDS.current, tourData, {
    baseVersionId: "current",
    baseSavedAt: nowIso
  });

  const nextVersionsMeta = {
    current: { savedAt: nowIso },
    "backup-1": {
      savedAt: current?.data
        ? (previousById.get("current")?.savedAt || current.savedAt || nowIso)
        : null
    },
    "backup-2": {
      savedAt: backup1?.data
        ? (previousById.get("backup-1")?.savedAt || backup1.savedAt || null)
        : null
    },
    "backup-3": {
      savedAt: backup2?.data
        ? (previousById.get("backup-2")?.savedAt || backup2.savedAt || null)
        : null
    }
  };

  const manifest = {
    updatedAt: nowIso,
    versions: Object.entries(nextVersionsMeta).map(([id, meta]) => ({
      id,
      savedAt: meta.savedAt
    }))
  };

  await writeBaseManifest(manifest);

  return {
    ok: true,
    message: "Firestore 현재값으로 저장했습니다. (이전 값 최대 3개 백업)",
    data: normalized,
    manifest: {
      ...manifest,
      versions: buildVersionRows(manifest)
    }
  };
}
