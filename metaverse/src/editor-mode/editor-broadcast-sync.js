/**
 * Cross-window sync for editor saves (main metaverse ↔ popup editor).
 * Channels are scoped by ?project= so projects do not overwrite each other.
 */

import { getMetaverseProjectContext } from "../metaverse-project-context.js?v=editor-shared-20260908";

const CLIENT_ID = typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : String(Date.now());

/** @type {Set<(data: unknown, meta: Record<string, unknown>) => void>} */
const tourRemoteListeners = new Set();

/** @type {Set<(bundle: unknown, meta: Record<string, unknown>) => void>} */
const guestRemoteListeners = new Set();

const channelCache = new Map();

function createBroadcastChannel(channelName, onMessage) {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }

  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (event) => {
    if (!event.data || event.data.clientId === CLIENT_ID) {
      return;
    }

    onMessage(event.data);
  };

  return channel;
}

function ensureProjectChannels() {
  const ctx = getMetaverseProjectContext();
  const cached = channelCache.get(ctx.projectId);

  if (cached) {
    return cached;
  }

  const onTour = (payload) => {
    if (payload.type !== "tour-data" || !payload.data) {
      return;
    }

    tourRemoteListeners.forEach((listener) => {
      try {
        listener(payload.data, payload.meta || {});
      } catch (error) {
        console.error("[editor-broadcast-sync] tour remote listener failed", error);
      }
    });
  };

  const onGuest = (payload) => {
    if (payload.type !== "guest-bundle" || !payload.data) {
      return;
    }

    guestRemoteListeners.forEach((listener) => {
      try {
        listener(payload.data, payload.meta || {});
      } catch (error) {
        console.error("[editor-broadcast-sync] guest remote listener failed", error);
      }
    });
  };

  const tourNames = [ctx.broadcast.tour, ...ctx.broadcast.tourAliases];
  const guestNames = [ctx.broadcast.guest, ...ctx.broadcast.guestAliases];
  const tourChannels = tourNames.map((name) => createBroadcastChannel(name, onTour)).filter(Boolean);
  const guestChannels = guestNames.map((name) => createBroadcastChannel(name, onGuest)).filter(Boolean);

  const next = {
    postTour(data, meta) {
      const message = { type: "tour-data", data, meta, clientId: CLIENT_ID };
      tourChannels.forEach((channel) => channel.postMessage(message));
    },
    postGuest(bundle, meta) {
      const message = { type: "guest-bundle", data: bundle, meta, clientId: CLIENT_ID };
      guestChannels.forEach((channel) => channel.postMessage(message));
    }
  };

  channelCache.set(ctx.projectId, next);
  return next;
}

export function postTourDataBroadcast(data, meta = {}) {
  ensureProjectChannels().postTour(data, meta);
}

export function postGuestBundleBroadcast(bundle, meta = {}) {
  ensureProjectChannels().postGuest(bundle, meta);
}

export function subscribeTourDataRemote(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  ensureProjectChannels();
  tourRemoteListeners.add(listener);
  return () => tourRemoteListeners.delete(listener);
}

export function subscribeGuestBundleRemote(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  ensureProjectChannels();
  guestRemoteListeners.add(listener);
  return () => guestRemoteListeners.delete(listener);
}
