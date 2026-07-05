import { createGuestCharacterSystem } from "./guest-character-system.js?v=jinju-indoor-all16-outdoor-keep-20260705";
import {
  getJinjuIndoorGuestSpawns,
  getJinjuIndoorBackgroundGuestSpawns,
  JINJU_INDOOR_PRIORITY_GUEST_IDS,
  JINJU_INDOOR_ACTIVE_GUEST_MAX_MARK,
  getJinjuIndoorGuestLoadYieldFrames,
  getJinjuIndoorGuestRevealDelayMs,
  resetJinjuIndoorGuestSession,
  JINJU_INDOOR_GUEST_CONFIG_VERSION
} from "./jinju-indoor-guest-config.js?v=jinju-indoor-all16-outdoor-keep-20260705";

const FREEZE_THRESHOLD_MS = 500;
const JANK_THRESHOLD_MS = 100;

function parseTestOptions() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "default";

  return {
    /** default: cold ramp 16 guests | quick: marks 1-6 + spawn-once retrigger | full: cold + preload scenarios */
    mode,
    maxMark: mode === "quick" ? JINJU_INDOOR_ACTIVE_GUEST_MAX_MARK : 16,
    scenarios: mode === "full"
      ? ["cold-ramp", "orbit-preload-then-ramp"]
      : mode === "quick"
        ? ["cold-ramp", "spawn-once-retrigger"]
        : ["cold-ramp"],
    skipRevealDelay: mode !== "full"
  };
}

function filterSpawnsByMark(spawns, maxMark) {
  return spawns.filter((spawn) => {
    const mark = Number(String(spawn.id).replace("Jinju-Indoor-Mark-", ""));

    return Number.isFinite(mark) && mark <= maxMark;
  });
}

function getGeometryMeshes(meshes) {
  return meshes.filter((mesh) => typeof mesh.getTotalVertices === "function" && mesh.getTotalVertices() > 0);
}

function getMeshBounds(BABYLON, mesh) {
  if (!mesh.getBoundingInfo) {
    return null;
  }

  mesh.computeWorldMatrix(true);
  const boundingBox = mesh.getBoundingInfo().boundingBox;
  const min = boundingBox.minimumWorld.clone();
  const max = boundingBox.maximumWorld.clone();
  const size = max.subtract(min);
  const center = min.add(size.scale(0.5));
  const maxDimension = Math.max(size.x, size.y, size.z);

  return { min, max, size, center, maxDimension };
}

function combineBounds(BABYLON, boundsList) {
  const min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  boundsList.forEach((bounds) => {
    min.minimizeInPlace(bounds.min);
    max.maximizeInPlace(bounds.max);
  });

  const size = max.subtract(min);
  const center = min.add(size.scale(0.5));

  return { min, max, size, center };
}

function getFullBounds(BABYLON, meshes) {
  const boundsList = meshes.map((mesh) => getMeshBounds(BABYLON, mesh)).filter(Boolean);

  if (boundsList.length === 0) {
    return {
      min: BABYLON.Vector3.Zero(),
      max: BABYLON.Vector3.One(),
      size: BABYLON.Vector3.One(),
      center: BABYLON.Vector3.Zero()
    };
  }

  return combineBounds(BABYLON, boundsList);
}

function getRootNodes(result) {
  const nodes = [...result.meshes, ...(result.transformNodes || [])];
  const roots = nodes.filter((node) => !node.parent);
  return roots.length > 0 ? roots : result.meshes;
}

function updateWorldMatrices(root, meshes) {
  root.computeWorldMatrix(true);
  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
}

function softenModelMaterialReflections(BABYLON, materials) {
  materials.forEach((material) => {
    if (!material) {
      return;
    }

    material.backFaceCulling = false;

    if ("specularColor" in material) {
      material.specularColor = BABYLON.Color3.Black();
    }
  });
}

function createGuestLoaderHelpers(BABYLON) {
  return {
    getGeometryMeshes,
    getRootNodes,
    updateWorldMatrices,
    getFullBounds: (babylon, meshes) => getFullBounds(babylon || BABYLON, meshes),
    softenModelMaterialReflections: (babylon, materials) => softenModelMaterialReflections(babylon || BABYLON, materials),
    targetHeight: 1.75
  };
}

function yieldFrames(frameCount = 2) {
  return new Promise((resolve) => {
    let remaining = frameCount;

    const step = () => {
      remaining -= 1;

      if (remaining <= 0) {
        resolve();
        return;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createFrameMonitor() {
  const events = [];
  let lastTs = performance.now();
  let running = true;
  let phase = "idle";
  let guestIndex = 0;
  let guestId = "";

  const tick = (ts) => {
    if (!running) {
      return;
    }

    const delta = ts - lastTs;
    lastTs = ts;

    if (delta >= JANK_THRESHOLD_MS) {
      events.push({
        type: delta >= FREEZE_THRESHOLD_MS ? "freeze" : "jank",
        deltaMs: Math.round(delta),
        phase,
        guestIndex,
        guestId,
        atMs: Math.round(ts)
      });
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  return {
    setContext(nextPhase, index = 0, id = "") {
      phase = nextPhase;
      guestIndex = index;
      guestId = id;
    },
    stop() {
      running = false;
    },
    resetEvents() {
      events.length = 0;
      lastTs = performance.now();
    },
    getEvents() {
      return events;
    }
  };
}

async function preloadJinjuIndoorGuests(guestCharacterSystem, monitor, testOptions) {
  monitor.setContext("preload", 0, "");
  const spawns = filterSpawnsByMark(getJinjuIndoorGuestSpawns(), testOptions.maxMark);

  for (let index = 0; index < spawns.length; index += 1) {
    const spawn = spawns[index];

    if (guestCharacterSystem.isSpawned(spawn.id)) {
      continue;
    }

    await yieldFrames(1);
    monitor.setContext("preload-load", index + 1, spawn.id);
    await yieldFrames(getJinjuIndoorGuestLoadYieldFrames(spawn.id));
    await guestCharacterSystem.ensureSpawned([spawn], { parallel: false, showOnLoad: false });
  }
}

/** Mirrors scheduleJinjuIndoorGuestSpawn in first-person-tour.js */
async function runRampActivationSpawn(guestCharacterSystem, monitor, testOptions) {
  const allIndoorSpawns = filterSpawnsByMark(getJinjuIndoorGuestSpawns(), testOptions.maxMark);
  const backgroundSpawns = filterSpawnsByMark(getJinjuIndoorBackgroundGuestSpawns(), testOptions.maxMark);
  const loadTimings = [];
  const revealTimings = [];

  monitor.setContext("activation", 0, "");

  for (let index = 0; index < allIndoorSpawns.length; index += 1) {
    const spawn = allIndoorSpawns[index];

    if (guestCharacterSystem.isSpawned(spawn.id)) {
      continue;
    }

    monitor.setContext("load", index + 1, spawn.id);
    const loadStart = performance.now();
    await yieldFrames(getJinjuIndoorGuestLoadYieldFrames(spawn.id));
    await guestCharacterSystem.ensureSpawned([spawn], { parallel: false, showOnLoad: false });
    loadTimings.push({
      guestIndex: index + 1,
      guestId: spawn.id,
      devLabel: spawn.devLabel,
      durationMs: Math.round(performance.now() - loadStart)
    });
  }

  const priorityIds = JINJU_INDOOR_PRIORITY_GUEST_IDS.filter((guestId) => (
    guestCharacterSystem.isSpawned(guestId)
  ));

  if (priorityIds.length) {
    monitor.setContext("reveal-priority", 0, priorityIds.join(","));
    guestCharacterSystem.revealGuests(priorityIds);
    await yieldFrames(4);
  }

  for (let index = 0; index < backgroundSpawns.length; index += 1) {
    const spawn = backgroundSpawns[index];

    if (!guestCharacterSystem.isSpawned(spawn.id)) {
      continue;
    }

    monitor.setContext("reveal", index + 1, spawn.id);
    const revealStart = performance.now();
    await yieldFrames(getJinjuIndoorGuestLoadYieldFrames(spawn.id));
    guestCharacterSystem.revealGuest(spawn.id);

    const delayMs = testOptions.skipRevealDelay ? 0 : getJinjuIndoorGuestRevealDelayMs(spawn.id);

    if (delayMs > 0) {
      await wait(delayMs);
    }

    revealTimings.push({
      guestIndex: index + 1,
      guestId: spawn.id,
      devLabel: spawn.devLabel,
      durationMs: Math.round(performance.now() - revealStart)
    });
  }

  return { loadTimings, revealTimings };
}

/** Simulates standing on ramp after spawn — re-reveal must skip animation restart. */
async function runSpawnOnceRetriggerTest(guestCharacterSystem, monitor, testOptions) {
  const spawns = filterSpawnsByMark(getJinjuIndoorGuestSpawns(), testOptions.maxMark);

  // Drain reveal animation rAFs from the initial ramp spawn before measuring retrigger.
  await yieldFrames(8);
  guestCharacterSystem.resetRevealDiagnostics?.();
  monitor.setContext("retrigger", 0, "batch-reveal");

  for (const spawn of spawns) {
    guestCharacterSystem.revealGuest(spawn.id);
  }

  await yieldFrames(6);

  const audit = guestCharacterSystem.getGuestSceneAudit?.() ?? {};

  return {
    expectedGuests: spawns.length,
    revealAnimSkipped: audit.revealAnimSkippedCount ?? 0,
    revealAnimStarted: audit.revealAnimStartedCount ?? 0,
    spawnOnceOk: audit.revealAnimSkippedCount === spawns.length && audit.revealAnimStartedCount === 0
  };
}

function summarize(events, loadTimings, revealTimings, scenario, testOptions, extra = {}) {
  const freezes = events.filter((event) => event.type === "freeze");
  const janks = events.filter((event) => event.type === "jank");
  const loadPhaseEvents = events.filter((event) => event.phase.startsWith("load") || event.phase === "preload-load");
  const revealPhaseEvents = events.filter((event) => event.phase.startsWith("reveal"));
  const expectedGuests = testOptions.maxMark;
  const expectedReveals = Math.max(0, expectedGuests - JINJU_INDOOR_PRIORITY_GUEST_IDS.length);
  const guestsLoaded = loadTimings.length + (extra.preloadedCount || 0);
  const guestsRevealed = revealTimings.length + (extra.priorityRevealed ? 1 : 0);

  return {
    scenario,
    mode: testOptions.mode,
    configVersion: JINJU_INDOOR_GUEST_CONFIG_VERSION,
    guestsLoaded,
    guestsRevealed,
    expectedGuests,
    freezeCount: freezes.length,
    jankCount: janks.length,
    maxFrameMs: events.length ? Math.max(...events.map((event) => event.deltaMs)) : 0,
    freezes,
    janksDuringLoad: loadPhaseEvents.filter((event) => event.type === "freeze"),
    janksDuringReveal: revealPhaseEvents.filter((event) => event.type === "freeze"),
    loadTimings,
    revealTimings,
    revealAnimSkipped: extra.revealAnimSkipped,
    revealAnimStarted: extra.revealAnimStarted,
    spawnOnceOk: extra.spawnOnceOk,
    passed: extra.spawnOnceOk !== undefined
      ? extra.spawnOnceOk && freezes.length === 0
      : freezes.length === 0 && guestsLoaded >= expectedGuests && guestsRevealed >= expectedReveals
  };
}

async function runScenario(scenario, guestCharacterSystem, monitor, testOptions) {
  resetJinjuIndoorGuestSession();
  guestCharacterSystem.dispose();
  monitor.setContext("reset", 0, scenario);

  if (scenario === "orbit-preload-then-ramp") {
    await preloadJinjuIndoorGuests(guestCharacterSystem, monitor, testOptions);
    const preloadedCount = filterSpawnsByMark(getJinjuIndoorGuestSpawns(), testOptions.maxMark)
      .filter((spawn) => guestCharacterSystem.isSpawned(spawn.id)).length;
    monitor.resetEvents();
    const result = await runRampActivationSpawn(guestCharacterSystem, monitor, testOptions);
    return summarize(monitor.getEvents(), result.loadTimings, result.revealTimings, scenario, testOptions, {
      preloadedCount,
      priorityRevealed: true
    });
  }

  if (scenario === "spawn-once-retrigger") {
    const result = await runRampActivationSpawn(guestCharacterSystem, monitor, testOptions);
    monitor.resetEvents();
    const retrigger = await runSpawnOnceRetriggerTest(guestCharacterSystem, monitor, testOptions);
    return summarize(monitor.getEvents(), result.loadTimings, result.revealTimings, scenario, testOptions, {
      priorityRevealed: true,
      revealAnimSkipped: retrigger.revealAnimSkipped,
      revealAnimStarted: retrigger.revealAnimStarted,
      spawnOnceOk: retrigger.spawnOnceOk
    });
  }

  const result = await runRampActivationSpawn(guestCharacterSystem, monitor, testOptions);
  return summarize(monitor.getEvents(), result.loadTimings, result.revealTimings, scenario, testOptions, {
    priorityRevealed: true
  });
}

export async function runJinjuIndoorGuestSpawnTest(BABYLON, canvas) {
  const testOptions = parseTestOptions();
  const startedAt = performance.now();
  resetJinjuIndoorGuestSession();

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false
  });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.45, 0.58, 0.68, 1);

  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.2, 1, 0.3), scene);
  light.intensity = 1.05;

  const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 8, -12), scene);
  camera.setTarget(new BABYLON.Vector3(0, 5.9, 0));
  camera.attachControl(canvas, true);

  const guestCharacterSystem = createGuestCharacterSystem(BABYLON, scene, {
    showDevLabels: false,
    ...createGuestLoaderHelpers(BABYLON)
  });

  engine.runRenderLoop(() => {
    guestCharacterSystem.update(engine.getDeltaTime() / (1000 / 60));
    scene.render();
  });

  const monitor = createFrameMonitor();
  const results = [];

  for (const scenario of testOptions.scenarios) {
    monitor.resetEvents();
    monitor.setContext("scenario-start", 0, scenario);
    results.push(await runScenario(scenario, guestCharacterSystem, monitor, testOptions));
  }

  monitor.stop();
  engine.stopRenderLoop();
  engine.dispose();

  const overall = {
    mode: testOptions.mode,
    durationMs: Math.round(performance.now() - startedAt),
    configVersion: JINJU_INDOOR_GUEST_CONFIG_VERSION,
    freezeThresholdMs: FREEZE_THRESHOLD_MS,
    jankThresholdMs: JANK_THRESHOLD_MS,
    scenarios: results,
    passed: results.every((result) => result.passed),
    reproducedFreeze: results.some((result) => result.freezeCount > 0)
  };

  window.__JINJU_SPAWN_TEST_RESULT__ = overall;
  return overall;
}
