/**
 * Compatibility wrapper — NPC interaction configs now come from npc-guest-data.
 */

import {
  NPC_GLOBAL_DEFAULTS,
  NPC_GUEST_DATA_VERSION,
  loadEffectiveGuestBundle,
  resolveInteractionConfigs,
  loadConversationProgress
} from "./npc-guest-data.js?v=angji-npc-manager-20260820";

export const NPC_INTERACTION_CONFIG_VERSION = NPC_GUEST_DATA_VERSION;
export const NPC_INTERACTION_DEFAULTS = { ...NPC_GLOBAL_DEFAULTS };

export async function loadAngjiNpcInteractionConfigs() {
  const bundle = await loadEffectiveGuestBundle();
  return resolveInteractionConfigs(bundle, loadConversationProgress());
}

/** Sync helper for panels that already hold a bundle. */
export function getAngjiNpcInteractionConfigsFromBundle(bundle) {
  return resolveInteractionConfigs(bundle, loadConversationProgress());
}

/**
 * @deprecated Prefer loadAngjiNpcInteractionConfigs(). Kept for sync boot fallback.
 */
export function getAngjiNpcInteractionConfigs() {
  return [];
}
