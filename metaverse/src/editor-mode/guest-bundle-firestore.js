/**
 * Editor Mode — Firestore deploy + current-value (base) save/load for guest bundle JSON.
 * NORMAL MODE loads Firestore data when localStorage overlay is absent.
 */

import { FIREBASE_CONFIG } from "../firebase-config.js?v=guest-bundle-firestore-20260902";
import { normalizeGuestBundle } from "../npc-guest-data.js?v=npc-conversation-events-20260905";

export const GUEST_BUNDLE_FIRESTORE_COLLECTION = "metaverseGuestBundles";
export const ANGJI_GUEST_BUNDLE_DOC_ID = "angji";
export const GUEST_BASE_MANIFEST_DOC_ID = "angji_base_manifest";

/** Current value + up to 3 rotated backups (same collection). */
export const GUEST_BASE_DOC_IDS = {
  current: ANGJI_GUEST_BUNDLE_DOC_ID,
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

export function isGuestBundleFirestoreConfigured() {
  return Boolean(
    FIREBASE_CONFIG.apiKey
    && FIREBASE_CONFIG.authDomain
    && FIREBASE_CONFIG.projectId
  );
}

async function ensureGuestBundleFirestore() {
  if (firestoreState.enabled) {
    return firestoreState;
  }

  if (!isGuestBundleFirestoreConfigured()) {
    throw new Error("Firebase config is missing.");
  }

  if (!firestoreState.initPromise) {
    firestoreState.initPromise = (async () => {
      const [{ initializeApp }, firestoreModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
      ]);

      const app = initializeApp(FIREBASE_CONFIG, "guest-bundle-editor");
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
  const {
    updatedAt: _updatedAt,
    baseSavedAt: _baseSavedAt,
    baseVersionId: _baseVersionId,
    ...rest
  } = raw;
  return rest;
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

async function readGuestDoc(docId) {
  const { db, firestore } = await ensureGuestBundleFirestore();
  const snapshot = await firestore.getDoc(
    firestore.doc(db, GUEST_BUNDLE_FIRESTORE_COLLECTION, docId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  const raw = snapshot.data() || {};
  return {
    data: normalizeGuestBundle(stripFirestoreMeta(raw)),
    savedAt: toIsoTimestamp(raw.baseSavedAt) || toIsoTimestamp(raw.updatedAt)
  };
}

async function writeGuestDoc(docId, bundle, extra = {}) {
  const { db, firestore } = await ensureGuestBundleFirestore();
  const normalized = normalizeGuestBundle(bundle);
  const docRef = firestore.doc(db, GUEST_BUNDLE_FIRESTORE_COLLECTION, docId);

  await firestore.setDoc(docRef, {
    ...normalized,
    ...extra,
    updatedAt: firestore.serverTimestamp()
  });

  return normalized;
}

async function readBaseManifest() {
  const { db, firestore } = await ensureGuestBundleFirestore();
  const snapshot = await firestore.getDoc(
    firestore.doc(db, GUEST_BUNDLE_FIRESTORE_COLLECTION, GUEST_BASE_MANIFEST_DOC_ID)
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
  const { db, firestore } = await ensureGuestBundleFirestore();
  const docRef = firestore.doc(db, GUEST_BUNDLE_FIRESTORE_COLLECTION, GUEST_BASE_MANIFEST_DOC_ID);

  await firestore.setDoc(docRef, {
    versions: manifest.versions || [],
    updatedAt: firestore.serverTimestamp()
  });
}

export async function loadGuestBundleFromFirestore(docId = ANGJI_GUEST_BUNDLE_DOC_ID) {
  if (!isGuestBundleFirestoreConfigured()) {
    return null;
  }

  const loaded = await readGuestDoc(docId);
  return loaded?.data || null;
}

export async function saveGuestBundleToFirestore(bundle, docId = ANGJI_GUEST_BUNDLE_DOC_ID) {
  const extra = {};

  if (docId === ANGJI_GUEST_BUNDLE_DOC_ID) {
    extra.baseVersionId = "current";
  }

  return writeGuestDoc(docId, bundle, extra);
}

export async function listGuestBaseVersionsFromFirestore() {
  if (!isGuestBundleFirestoreConfigured()) {
    throw new Error("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
  }

  let manifest = await readBaseManifest();

  if (!manifest.versions?.length) {
    const current = await readGuestDoc(GUEST_BASE_DOC_IDS.current);
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

export async function loadGuestBaseVersionFromFirestore(versionId = "current") {
  if (!isGuestBundleFirestoreConfigured()) {
    throw new Error("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
  }

  const id = GUEST_BASE_DOC_IDS[versionId] ? versionId : "current";
  const docId = GUEST_BASE_DOC_IDS[id];
  const loaded = await readGuestDoc(docId);

  if (!loaded?.data) {
    if (id === "current") {
      throw new Error("Firestore에 저장된 현재값이 없습니다. 먼저「현재값 쓰기」또는「Firestore 배포」를 하세요.");
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

export async function saveGuestBaseVersionToFirestore(bundle) {
  if (!isGuestBundleFirestoreConfigured()) {
    throw new Error("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
  }

  const previousManifest = await readBaseManifest();
  const previousById = new Map((previousManifest.versions || []).map((item) => [item.id, item]));
  const nowIso = new Date().toISOString();

  const current = await readGuestDoc(GUEST_BASE_DOC_IDS.current);
  const backup1 = await readGuestDoc(GUEST_BASE_DOC_IDS["backup-1"]);
  const backup2 = await readGuestDoc(GUEST_BASE_DOC_IDS["backup-2"]);

  if (backup2?.data) {
    await writeGuestDoc(GUEST_BASE_DOC_IDS["backup-3"], backup2.data, {
      baseVersionId: "backup-3",
      baseSavedAt: previousById.get("backup-2")?.savedAt || backup2.savedAt || nowIso
    });
  }

  if (backup1?.data) {
    await writeGuestDoc(GUEST_BASE_DOC_IDS["backup-2"], backup1.data, {
      baseVersionId: "backup-2",
      baseSavedAt: previousById.get("backup-1")?.savedAt || backup1.savedAt || nowIso
    });
  }

  if (current?.data) {
    await writeGuestDoc(GUEST_BASE_DOC_IDS["backup-1"], current.data, {
      baseVersionId: "backup-1",
      baseSavedAt: previousById.get("current")?.savedAt || current.savedAt || nowIso
    });
  }

  const normalized = await writeGuestDoc(GUEST_BASE_DOC_IDS.current, bundle, {
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
