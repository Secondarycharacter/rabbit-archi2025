/**
 * Single owner for Angji day/night guest cast.
 * Shipped kinds/positions come from angji-guest-config; editor only overlays poses.
 */

import {
  ANGJI_NIGHT_DEVI_FILE,
  ANGJI_NIGHT_MARIE_GUEST_ID,
  ANGJI_PRIORITY_GUEST_IDS,
  ANGJI_SIMULTANEOUS_GUEST_IDS,
  getAngjiAllGuestIds,
  getAngjiIndoorGuestSpawns,
  getAngjiNightExtraGuestSpawns,
  getAngjiOutdoorGuestSpawns,
  isAngjiGuestId,
  mapAngjiGuestSpawnsForMode
} from "./angji-guest-config.js?v=dance-floor-snap-20260907";

const ANGJI_GUIDE_ID = "Angji-Guide";

function cloneSpawn(spawn) {
  if (!spawn) {
    return null;
  }

  return {
    ...spawn,
    position: spawn.position ? { ...spawn.position } : spawn.position,
    animation: spawn.animation
      ? {
        ...spawn.animation,
        clips: Array.isArray(spawn.animation.clips) ? [...spawn.animation.clips] : spawn.animation.clips,
        clipAliases: Array.isArray(spawn.animation.clipAliases)
          ? [...spawn.animation.clipAliases]
          : spawn.animation.clipAliases
      }
      : spawn.animation,
    behavior: spawn.behavior ? { ...spawn.behavior } : spawn.behavior,
    movement: spawn.movement ? JSON.parse(JSON.stringify(spawn.movement)) : spawn.movement
  };
}

/**
 * @param {object} deps
 */
export function createAngjiGuestCastController(deps = {}) {
  const {
    getGuestSystem = () => null,
    isWalkMode = () => false,
    isNightMode = () => false,
    isEditorActive = () => false,
    isAngjiProject = () => false,
    yieldFrames = async () => {},
    applyPoseOverlay = async () => {},
    applyGuestPose = null,
    ensureGuideVisible = async () => {},
    scene = null
  } = deps;

  let castToken = 0;
  let inFlight = null;
  let queuedReason = null;
  let settledToken = 0;
  const settleWaiters = [];
  let reconcileRetryTimer = null;
  let reconcileRetryCount = 0;
  const MAX_DEFERRED_RECONCILE_RETRIES = 2;

  function resolveCastIntent() {
    if (!isAngjiProject()) {
      return "none";
    }

    const night = isNightMode() === true;
    const editor = isEditorActive() === true;
    const walk = isWalkMode() === true;

    if (editor) {
      return night ? "editor-night" : "editor-day";
    }

    if (walk) {
      return night ? "walk-night" : "walk-day";
    }

    return night ? "orbit-night" : "orbit-day";
  }

  function getDesiredCast(intent = resolveCastIntent()) {
    if (intent === "none") {
      return {
        intent,
        night: false,
        spawns: [],
        presentIds: [],
        visibleIds: [],
        revealPlan: { priority: [], simultaneous: [], background: [] }
      };
    }

    const night = intent.endsWith("-night");
    const includeIndoor = intent.startsWith("walk-") || intent.startsWith("editor-");
    const outdoor = mapAngjiGuestSpawnsForMode(
      getAngjiOutdoorGuestSpawns().map(cloneSpawn),
      night
    );
    const indoor = includeIndoor
      ? mapAngjiGuestSpawnsForMode(getAngjiIndoorGuestSpawns().map(cloneSpawn), night)
      : [];
    const extras = night ? getAngjiNightExtraGuestSpawns().map(cloneSpawn) : [];
    const spawns = [...outdoor, ...indoor, ...extras].filter(Boolean);
    const presentIds = spawns.map((spawn) => spawn.id);
    const visibleIds = [...presentIds];

    const priority = night
      ? [...ANGJI_PRIORITY_GUEST_IDS, ANGJI_NIGHT_MARIE_GUEST_ID].filter((id) => presentIds.includes(id))
      : ANGJI_PRIORITY_GUEST_IDS.filter((id) => presentIds.includes(id));

    const simultaneous = includeIndoor
      ? ANGJI_SIMULTANEOUS_GUEST_IDS.filter((id) => presentIds.includes(id))
      : [];

    const background = presentIds.filter((id) => (
      !priority.includes(id) && !simultaneous.includes(id)
    ));

    return {
      intent,
      night,
      spawns,
      presentIds,
      visibleIds,
      revealPlan: {
        priority,
        simultaneous,
        background
      }
    };
  }

  function hideOrphanTourGuestMeshes(liveGuests) {
    if (!scene?.meshes) {
      return;
    }

    const liveNodes = new Set();

    (liveGuests || []).forEach((guest) => {
      if (guest?.root) {
        liveNodes.add(guest.root);
      }
      if (guest?.contentRoot) {
        liveNodes.add(guest.contentRoot);
      }
      (guest?.meshes || []).forEach((mesh) => liveNodes.add(mesh));
    });

    const isOwned = (node) => {
      let current = node;
      while (current) {
        if (liveNodes.has(current)) {
          return true;
        }
        current = current.parent;
      }
      return false;
    };

    scene.meshes.forEach((mesh) => {
      if (!mesh || mesh.isDisposed?.() || !mesh.metadata?.tourGuest) {
        return;
      }

      if (isOwned(mesh)) {
        return;
      }

      try {
        mesh.setEnabled?.(false);
        mesh.isVisible = false;
      } catch {
        // ignore
      }
    });
  }

  function collectReloadAndExtraIds(desired, presentIdSet) {
    const gcs = getGuestSystem();
    const live = gcs?.getGuests?.() || [];
    const reloadIds = [];
    const extraIds = [];

    live.forEach((guest) => {
      const id = guest?.spawn?.id;

      if (!id || id === ANGJI_GUIDE_ID) {
        return;
      }

      if (!presentIdSet.has(id)) {
        if (desired.intent.startsWith("editor-") && String(id).startsWith("npc_")) {
          return;
        }
        extraIds.push(id);
        return;
      }

      const want = desired.spawns.find((spawn) => spawn.id === id);

      if (!want) {
        return;
      }

      if (
        String(guest.spawn?.file || "") !== String(want.file || "")
        || String(guest.spawn?.assetRoot || "") !== String(want.assetRoot || "")
      ) {
        reloadIds.push(id);
      }
    });

    const staleIds = getAngjiAllGuestIds().filter((id) => !presentIdSet.has(id));
    staleIds.forEach((id) => {
      if (!extraIds.includes(id)) {
        extraIds.push(id);
      }
    });

    return { reloadIds, extraIds };
  }

  function getMissingOrWrongSpawns(gcs, desired) {
    const liveById = new Map(
      (gcs?.getGuests?.() || [])
        .filter((guest) => guest?.spawn?.id)
        .map((guest) => [guest.spawn.id, guest])
    );

    return desired.spawns.filter((spawn) => {
      const guest = liveById.get(spawn.id);

      return !guest
        || String(guest.spawn?.file || "") !== String(spawn.file || "")
        || String(guest.spawn?.assetRoot || "") !== String(spawn.assetRoot || "");
    });
  }

  async function ensureDesiredSpawns(gcs, desired, abortIf, maxAttempts = 3) {
    let missing = getMissingOrWrongSpawns(gcs, desired);
    const deferredRevealIds = new Set(desired.revealPlan?.simultaneous || []);

    for (let attempt = 1; missing.length && attempt <= maxAttempts; attempt += 1) {
      if (abortIf()) {
        gcs.cancelPendingLoads?.();
        return false;
      }

      const wrongLoadedIds = missing
        .filter((spawn) => gcs.getGuests?.().some((guest) => guest?.spawn?.id === spawn.id))
        .map((spawn) => spawn.id);

      if (wrongLoadedIds.length) {
        gcs.disposeGuests?.({ onlyIds: wrongLoadedIds });
      }

      // Load one at a time and reveal immediately (except synchronized dancers).
      // Mark-4/5/6 must stay hidden until the final syncAnimations reveal; early
      // solo reveal starts Thriller, then sync stop+restart looks like a hitch.
      // Night remains sequential for the shared heavy Devi GLB.
      for (const spawn of missing) {
        if (abortIf()) {
          break;
        }

        await gcs.ensureSpawned([spawn], {
          parallel: false,
          showOnLoad: false,
          yieldBetweenLoads: 0,
          maxConcurrency: 1,
          abortIf
        });

        const loaded = (gcs.getGuests?.() || []).find((guest) => (
          guest?.spawn?.id === spawn.id
          && String(guest.spawn?.file || "") === String(spawn.file || "")
          && String(guest.spawn?.assetRoot || "") === String(spawn.assetRoot || "")
        ));

        if (loaded && !abortIf()) {
          // Apply edited height/pivots BEFORE the first reveal so the opening
          // animation frame is already at the authored pose (not builtin sitY).
          if (typeof applyGuestPose === "function") {
            await applyGuestPose(spawn.id, { abortIf });
          }

          if (!abortIf() && !deferredRevealIds.has(spawn.id)) {
            gcs.revealGuest?.(spawn.id);
          }
        }
      }

      if (abortIf()) {
        gcs.cancelPendingLoads?.();
        return false;
      }

      missing = getMissingOrWrongSpawns(gcs, desired);

      if (missing.length && attempt < maxAttempts) {
        console.warn(
          `[angji-cast] retry ${attempt}/${maxAttempts - 1} `
          + `${desired.intent}: ${missing.map((spawn) => spawn.id).join(", ")}`
        );
        await yieldFrames(2);
      }
    }

    if (missing.length) {
      console.error(
        `[angji-cast] incomplete ${desired.intent}: `
        + `${missing.map((spawn) => `${spawn.id}(${spawn.file})`).join(", ")}`
      );
      return false;
    }

    return true;
  }

  async function runCast(reason, token) {
    const gcs = getGuestSystem();

    if (!gcs || !isAngjiProject()) {
      return;
    }

    const intentAtStart = resolveCastIntent();
    const desired = getDesiredCast(intentAtStart);
    const presentIdSet = new Set(desired.presentIds);
    const abortIf = () => (
      token !== castToken
      || resolveCastIntent() !== intentAtStart
    );

    // Drop any in-flight ImportMesh from a previous (possibly aborted) cast.
    // Without this, day ensureSpawned reuses a night Devi promise and wrongKind
    // then deletes the impostor → empty orbit/tour.
    gcs.cancelPendingLoads?.();

    if (abortIf()) {
      return;
    }

    const { reloadIds, extraIds } = collectReloadAndExtraIds(desired, presentIdSet);

    // Targeted hide/dispose only — never blank the whole registry first.
    // Blanket hide() + mid-cast abort left orbit/tour permanently empty.
    if (extraIds.length) {
      gcs.hide?.({ onlyIds: extraIds });
      gcs.disposeGuests?.({ onlyIds: extraIds });
    }

    if (reloadIds.length) {
      gcs.hide?.({ onlyIds: reloadIds });
      gcs.disposeGuests?.({ onlyIds: reloadIds });
    }

    await yieldFrames(1);

    if (abortIf()) {
      gcs.cancelPendingLoads?.();
      return;
    }

    await ensureDesiredSpawns(gcs, desired, abortIf);

    if (abortIf()) {
      gcs.cancelPendingLoads?.();
      return;
    }

    await applyPoseOverlay({
      night: desired.night,
      presentIds: desired.presentIds,
      abortIf
    });

    if (abortIf()) {
      gcs.cancelPendingLoads?.();
      return;
    }

    // Drop anyone who still shouldn't be present after overlay.
    const afterOverlay = collectReloadAndExtraIds(desired, presentIdSet);

    if (afterOverlay.extraIds.length) {
      gcs.disposeGuests?.({ onlyIds: afterOverlay.extraIds });
    }

    if (afterOverlay.reloadIds.length) {
      // Overlay must never resurrect wrong kind — force another load pass.
      gcs.disposeGuests?.({ onlyIds: afterOverlay.reloadIds });
      await ensureDesiredSpawns(gcs, desired, abortIf);

      if (abortIf()) {
        gcs.cancelPendingLoads?.();
        return;
      }
    }

    hideOrphanTourGuestMeshes(gcs.getGuests?.() || []);

    const { priority, simultaneous, background } = desired.revealPlan;

    if (priority.length) {
      gcs.revealGuests?.(priority);
    }

    if (simultaneous.length) {
      gcs.revealGuests?.(simultaneous, { syncAnimations: !desired.night });
    }

    for (const id of background) {
      if (abortIf()) {
        gcs.cancelPendingLoads?.();
        return;
      }
      gcs.revealGuest?.(id);
      if (!desired.night) {
        await yieldFrames(1);
      }
    }

    if (abortIf()) {
      gcs.cancelPendingLoads?.();
      return;
    }

    gcs.show?.({ includeIds: desired.visibleIds });
    hideOrphanTourGuestMeshes(gcs.getGuests?.() || []);

    if (!desired.night) {
      // Do not force-restart already-walking patrol NPCs after cast settle.
      gcs.refreshPatrolGuests?.({ force: false });
      gcs.refreshGuestAnimations?.({ force: true });
    }

    gcs.refreshDevLabels?.();
    await ensureGuideVisible();

    if (abortIf()) {
      return;
    }

    // Final sweep: wrong-kind leftovers only (never wipe a healthy cast).
    const wrongKind = (gcs.getGuests?.() || [])
      .filter((guest) => {
        const id = guest?.spawn?.id;
        if (!id || id === ANGJI_GUIDE_ID) {
          return false;
        }
        if (!presentIdSet.has(id)) {
          if (desired.intent.startsWith("editor-") && String(id).startsWith("npc_")) {
            return false;
          }
          return true;
        }
        if (!desired.night && (
          id === ANGJI_NIGHT_MARIE_GUEST_ID
          || guest.spawn?.behavior?.type === "nightDeviChase"
          || String(guest.spawn?.file || "") === ANGJI_NIGHT_DEVI_FILE
        )) {
          return true;
        }
        if (
          desired.night
          && isAngjiGuestId(id)
          && String(guest.spawn?.file || "") !== ANGJI_NIGHT_DEVI_FILE
        ) {
          return true;
        }
        return false;
      })
      .map((guest) => guest.spawn.id);

    if (wrongKind.length) {
      gcs.disposeGuests?.({ onlyIds: wrongKind });
      // Immediately refill so orbit/tour never stays empty after a sweep.
      const refill = desired.spawns.filter((spawn) => wrongKind.includes(spawn.id));

      if (refill.length) {
        await ensureDesiredSpawns(gcs, desired, abortIf);

        if (!abortIf()) {
          gcs.show?.({ includeIds: desired.visibleIds });
          refill.forEach((spawn) => gcs.revealGuest?.(spawn.id));
        }
      }

      console.info(`[angji-cast] replaced wrong-kind guests after ${reason}: ${wrongKind.join(", ")}`);
    }

    hideOrphanTourGuestMeshes(gcs.getGuests?.() || []);
    const remaining = getMissingOrWrongSpawns(gcs, desired);
    const outcome = remaining.length ? "pending-retry" : "settled";
    console.info(
      `[angji-cast] ${outcome} intent=${desired.intent} `
      + `reason=${reason} present=${desired.presentIds.length}`
    );
  }

  function resolveSettledWaiters() {
    for (let index = settleWaiters.length - 1; index >= 0; index -= 1) {
      if (settleWaiters[index].token <= settledToken) {
        settleWaiters[index].resolve();
        settleWaiters.splice(index, 1);
      }
    }
  }

  function isCurrentCastConverged() {
    if (!isAngjiProject()) {
      return true;
    }

    const gcs = getGuestSystem();
    const desired = getDesiredCast();

    if (!gcs || getMissingOrWrongSpawns(gcs, desired).length) {
      return false;
    }

    const visibleIds = new Set(desired.visibleIds);
    return (gcs.getGuests?.() || []).every((guest) => (
      !visibleIds.has(guest?.spawn?.id)
      || guest.root?.isEnabled?.() !== false
    ));
  }

  function scheduleDeferredReconcile(reason) {
    if (
      reconcileRetryTimer
      || reconcileRetryCount >= MAX_DEFERRED_RECONCILE_RETRIES
    ) {
      return;
    }

    reconcileRetryCount += 1;
    reconcileRetryTimer = globalThis.setTimeout(() => {
      reconcileRetryTimer = null;
      void requestCast(`${reason}-auto-retry-${reconcileRetryCount}`);
    }, 750);
  }

  function startDrain() {
    if (inFlight) {
      return;
    }

    // Assign inFlight before any cast side effect can run. This prevents a
    // synchronous disposal callback from starting a second drain.
    inFlight = Promise.resolve().then(async () => {
      while (settledToken < castToken) {
        const token = castToken;
        const reasonNow = queuedReason || "request";
        const intentAtDispatch = resolveCastIntent();
        queuedReason = null;

        try {
          await runCast(reasonNow, token);
        } catch (error) {
          console.error(`[angji-cast] ${reasonNow} failed`, error);
          getGuestSystem()?.cancelPendingLoads?.();
        }

        // An intent may change synchronously before its paired UI callback queues
        // requestCast. Re-enter immediately instead of settling a stale teardown.
        if (token === castToken && resolveCastIntent() !== intentAtDispatch) {
          queuedReason = `${reasonNow}-intent-reconcile`;
          castToken += 1;
          continue;
        }

        // A newer request aborts this run and is handled by the next iteration.
        if (token === castToken) {
          settledToken = token;
          resolveSettledWaiters();

          if (isCurrentCastConverged()) {
            reconcileRetryCount = 0;
          } else {
            scheduleDeferredReconcile(reasonNow);
          }
        }
      }
    }).finally(() => {
      inFlight = null;

      if (settledToken < castToken) {
        startDrain();
      }
    });
  }

  function requestCast(reason = "request") {
    if (!String(reason).includes("-auto-retry-")) {
      reconcileRetryCount = 0;
      if (reconcileRetryTimer) {
        globalThis.clearTimeout(reconcileRetryTimer);
        reconcileRetryTimer = null;
      }
    }

    if (inFlight) {
      // Supersede an active ImportMesh wait immediately. ensureSpawned observes
      // the token change and exits through awaitLoadOrAbort instead of blocking
      // the latest day/night request until the old GLB finishes or times out.
      getGuestSystem()?.cancelPendingLoads?.();
    }

    queuedReason = reason;
    const requestToken = ++castToken;
    const settled = new Promise((resolve) => {
      settleWaiters.push({ token: requestToken, resolve });
    });

    startDrain();
    return settled;
  }

  let watchdogFrame = 0;
  scene?.onBeforeRenderObservable?.add?.(() => {
    watchdogFrame += 1;

    if (
      watchdogFrame % 300 === 0
      && !inFlight
      && isAngjiProject()
      && !isCurrentCastConverged()
    ) {
      void requestCast("watchdog-reconcile");
    }
  });

  function hideForNightTransition() {
    // Only hide outdoor Marks that will become Devi — keep scene from going blank
    // if the following cast is aborted mid-load.
    const gcs = getGuestSystem();
    const outdoorIds = getAngjiOutdoorGuestSpawns().map((spawn) => spawn.id);
    gcs?.hide?.({ onlyIds: outdoorIds });
    hideOrphanTourGuestMeshes(gcs?.getGuests?.() || []);
  }

  function preloadForOrbit() {
    if (!isAngjiProject() || isWalkMode() || isEditorActive()) {
      return;
    }

    const token = castToken;
    const night = isNightMode() === true;
    const desired = getDesiredCast(night ? "orbit-night" : "orbit-day");
    const gcs = getGuestSystem();

    if (!gcs?.preload) {
      return;
    }

    void gcs.preload(desired.spawns, {
      parallel: !night,
      showOnLoad: false,
      yieldBetweenLoads: night ? 1 : 0,
      abortIf: () => token !== castToken || isNightMode() !== night || isWalkMode() || isEditorActive()
    });
  }

  return {
    requestCast,
    awaitCastSettled: () => inFlight || Promise.resolve(),
    hideForNightTransition,
    preloadForOrbit,
    resolveCastIntent,
    getDesiredCast
  };
}
