/**
 * GUIDE「현재값」save/load via Firestore (up to 3 backups).
 * Replaces the local editor write-server path for guide base values.
 */

import {
  isGuideTourFirestoreConfigured,
  listGuideBaseVersionsFromFirestore,
  loadGuideBaseVersionFromFirestore,
  saveGuideBaseVersionToFirestore
} from "./guide-tour-firestore.js?v=project-scope-20260908";

export function isGuideBaseStoreAvailable() {
  return isGuideTourFirestoreConfigured();
}

/** @deprecated Use isGuideBaseStoreAvailable — kept for older call sites. */
export async function isEditorWriteServerAvailable() {
  return isGuideBaseStoreAvailable();
}

export async function listGuideBaseVersions() {
  return listGuideBaseVersionsFromFirestore();
}

export async function loadGuideBaseVersion(versionId = "current") {
  return loadGuideBaseVersionFromFirestore(versionId);
}

export async function saveGuideBaseVersion(tourData) {
  return saveGuideBaseVersionToFirestore(tourData);
}
