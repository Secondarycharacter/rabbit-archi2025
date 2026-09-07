/**
 * NPC「현재값」save/load via Firestore (up to 3 backups).
 * Mirrors guide-base-file.js for the guest bundle.
 */

import {
  isGuestBundleFirestoreConfigured,
  listGuestBaseVersionsFromFirestore,
  loadGuestBaseVersionFromFirestore,
  saveGuestBaseVersionToFirestore
} from "./guest-bundle-firestore.js?v=guest-base-firestore-20260905";

export function isGuestBaseStoreAvailable() {
  return isGuestBundleFirestoreConfigured();
}

export async function listGuestBaseVersions() {
  return listGuestBaseVersionsFromFirestore();
}

export async function loadGuestBaseVersion(versionId = "current") {
  return loadGuestBaseVersionFromFirestore(versionId);
}

export async function saveGuestBaseVersion(bundle) {
  return saveGuestBaseVersionToFirestore(bundle);
}
