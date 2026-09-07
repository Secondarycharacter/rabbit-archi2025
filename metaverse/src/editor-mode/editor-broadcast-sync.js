/**
 * Cross-window sync for editor saves (main metaverse ↔ popup editor).
 */

const CLIENT_ID = typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : String(Date.now());

/** @type {Set<(data: unknown, meta: Record<string, unknown>) => void>} */
const tourRemoteListeners = new Set();

/** @type {Set<(bundle: unknown, meta: Record<string, unknown>) => void>} */
const guestRemoteListeners = new Set();

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

const tourBroadcast = createBroadcastChannel("angji-guide-tour-data-v1", (payload) => {
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
});

const guestBroadcast = createBroadcastChannel("angji-guest-bundle-v1", (payload) => {
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
});

export function postTourDataBroadcast(data, meta = {}) {
  tourBroadcast?.postMessage({
    type: "tour-data",
    data,
    meta,
    clientId: CLIENT_ID
  });
}

export function postGuestBundleBroadcast(bundle, meta = {}) {
  guestBroadcast?.postMessage({
    type: "guest-bundle",
    data: bundle,
    meta,
    clientId: CLIENT_ID
  });
}

export function subscribeTourDataRemote(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  tourRemoteListeners.add(listener);
  return () => tourRemoteListeners.delete(listener);
}

export function subscribeGuestBundleRemote(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  guestRemoteListeners.add(listener);
  return () => guestRemoteListeners.delete(listener);
}
