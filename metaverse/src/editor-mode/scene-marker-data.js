/**
 * Rabbit Metaverse Editor — Event / Teleport / Tour point data (PHASE 3).
 */

export const MARKER_DATA_VERSION = "1.0";
export const EVENT_DATA_URL = "./data/editor/events.json";
export const TELEPORT_DATA_URL = "./data/editor/teleports.json";
export const TOUR_DATA_URL = "./data/editor/tours.json";
export const EVENT_STORAGE_KEY = "rabbit-metaverse-events-v1";
export const TELEPORT_STORAGE_KEY = "rabbit-metaverse-teleports-v1";
export const TOUR_STORAGE_KEY = "rabbit-metaverse-tours-v1";

export const EDITOR_LAYERS = {
  NPC: "npc",
  EVENT: "event",
  TELEPORT: "teleport",
  TOUR: "tour"
};

export const EVENT_TYPES = [
  { id: "dialogue", label: "Dialogue Trigger" },
  { id: "game", label: "Game Trigger" },
  { id: "minigame", label: "Mini Game Trigger" },
  { id: "information", label: "Information Point" },
  { id: "interaction", label: "Interaction Point" }
];

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePosition(raw = {}, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: asNumber(raw.x, fallback.x),
    y: asNumber(raw.y, fallback.y),
    z: asNumber(raw.z, fallback.z)
  };
}

export function degreesToRadians(deg) {
  return (asNumber(deg) * Math.PI) / 180;
}

export function radiansToDegrees(rad) {
  return (asNumber(rad) * 180) / Math.PI;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function nextPrefixedId(prefix, existingIds = []) {
  const used = new Set(existingIds.map(String));
  let index = 1;

  while (used.has(`${prefix}${String(index).padStart(3, "0")}`)) {
    index += 1;
  }

  return `${prefix}${String(index).padStart(3, "0")}`;
}

function normalizeTransform(raw = {}, fallback = {}) {
  const rotationY = Number.isFinite(Number(raw.rotationY))
    ? asNumber(raw.rotationY)
    : radiansToDegrees(asNumber(raw.rotationYRadians, 0));

  return {
    position: normalizePosition(raw.position, fallback.position),
    rotationY
  };
}

export const CONNECTION_TYPES = [
  { id: "none", label: "없음" },
  { id: "teleport", label: "Teleport" },
  { id: "tour", label: "Tour Point" },
  { id: "event", label: "Event" },
  { id: "npc", label: "NPC" }
];

function normalizeDialogueLine(raw = {}, index = 0) {
  const en = String(raw.en || raw.englishSubtitle || "");
  const subtitle = String(raw.subtitle || "");

  return {
    id: String(raw.id || `line_${index + 1}`),
    ko: String(raw.ko || raw.koreanText || ""),
    en: en || subtitle,
    voice: String(raw.voice || raw.audioFile || ""),
    subtitle: subtitle || en
  };
}

function normalizeConnection(raw = {}) {
  const type = CONNECTION_TYPES.some((item) => item.id === raw.type) ? raw.type : "none";

  return {
    type,
    targetId: String(raw.targetId || "")
  };
}

export function normalizeEventRecord(raw = {}) {
  const id = String(raw.id || "").trim();

  if (!id) {
    return null;
  }

  const eventType = EVENT_TYPES.some((type) => type.id === raw.eventType)
    ? raw.eventType
    : "interaction";

  const dialogue = Array.isArray(raw.dialogue)
    ? raw.dialogue.map(normalizeDialogueLine)
    : [];

  return {
    id,
    name: String(raw.name || id),
    type: "event",
    eventType,
    triggerDistance: Math.max(0.4, asNumber(raw.triggerDistance, 1.8)),
    transform: normalizeTransform(raw.transform),
    dialogue,
    info: {
      ko: String(raw.info?.ko || ""),
      en: String(raw.info?.en || "")
    },
    animation: {
      default: String(raw.animation?.default || "")
    },
    connection: normalizeConnection(raw.connection)
  };
}

export function normalizeTeleportRecord(raw = {}) {
  const id = String(raw.id || "").trim();

  if (!id) {
    return null;
  }

  const transform = normalizeTransform(raw.transform);
  const arrival = normalizeTransform(raw.arrival, transform);

  return {
    id,
    name: String(raw.name || id),
    type: "teleport",
    transform,
    arrival: {
      position: arrival.position,
      rotationY: arrival.rotationY
    },
    triggerDistance: Math.max(0.4, asNumber(raw.triggerDistance, 1.5)),
    destination: {
      projectId: String(raw.destination?.projectId || raw.destinationProject || ""),
      pointId: String(raw.destination?.pointId || raw.destinationPoint || "")
    }
  };
}

export function normalizeTourRecord(raw = {}) {
  const id = String(raw.id || "").trim();

  if (!id) {
    return null;
  }

  return {
    id,
    name: String(raw.name || id),
    type: "tour",
    sourceEventId: String(raw.sourceEventId || ""),
    duration: Math.max(0, asNumber(raw.duration, 10)),
    script: {
      ko: String(raw.script?.ko || raw.ko || ""),
      en: String(raw.script?.en || raw.en || ""),
      voice: String(raw.script?.voice || raw.voice || "")
    },
    transform: normalizeTransform(raw.transform)
  };
}

function normalizeCollection(raw, key, normalizeItem, projectId = "angji") {
  const items = Array.isArray(raw?.[key])
    ? raw[key].map(normalizeItem).filter(Boolean)
    : [];

  return {
    version: String(raw?.version || MARKER_DATA_VERSION),
    projectId: String(raw?.projectId || projectId),
    [key]: items
  };
}

export function normalizeEventDocument(raw = {}) {
  return normalizeCollection(raw, "events", normalizeEventRecord);
}

export function normalizeTeleportDocument(raw = {}) {
  return normalizeCollection(raw, "teleports", normalizeTeleportRecord);
}

export function normalizeTourDocument(raw = {}) {
  return normalizeCollection(raw, "tours", normalizeTourRecord);
}

export function mergeMarkerDocuments(baseDoc, overlayDoc, key, normalizeDoc) {
  const base = normalizeDoc(baseDoc);
  const overlay = normalizeDoc(overlayDoc);
  const byId = new Map((base[key] || []).map((item) => [item.id, item]));

  (overlay[key] || []).forEach((item) => {
    byId.set(item.id, { ...byId.get(item.id), ...item });
  });

  return {
    ...base,
    version: overlay.version || base.version,
    projectId: overlay.projectId || base.projectId,
    [key]: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  };
}

function readStorage(key, normalizeDoc) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    return normalizeDoc(JSON.parse(raw));
  } catch (error) {
    console.warn("[scene-marker-data] storage read failed", key, error);
    return null;
  }
}

export function writeEventStorage(document) {
  const normalized = normalizeEventDocument(document);
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function writeTeleportStorage(document) {
  const normalized = normalizeTeleportDocument(document);
  localStorage.setItem(TELEPORT_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function writeTourStorage(document) {
  const normalized = normalizeTourDocument(document);
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

async function loadBaseDocument(url, normalizeDoc) {
  try {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-cache" });

    if (!response.ok) {
      return null;
    }

    return normalizeDoc(await response.json());
  } catch (error) {
    console.warn("[scene-marker-data] base JSON load failed", url, error);
    return null;
  }
}

function pickEffective(base, stored, seed, key, normalizeDoc) {
  const seeded = normalizeDoc(seed);
  const fromFile = base?.[key]?.length ? base : seeded;
  const overlay = stored?.[key]?.length ? stored : null;

  if (overlay) {
    return mergeMarkerDocuments(fromFile, overlay, key, normalizeDoc);
  }

  return fromFile;
}

export async function loadEffectiveEventDocument() {
  const stored = readStorage(EVENT_STORAGE_KEY, normalizeEventDocument);
  const base = await loadBaseDocument(EVENT_DATA_URL, normalizeEventDocument);
  return pickEffective(base, stored, { events: [] }, "events", normalizeEventDocument);
}

export async function loadEffectiveTeleportDocument() {
  const stored = readStorage(TELEPORT_STORAGE_KEY, normalizeTeleportDocument);
  const base = await loadBaseDocument(TELEPORT_DATA_URL, normalizeTeleportDocument);
  return pickEffective(base, stored, { teleports: [] }, "teleports", normalizeTeleportDocument);
}

export function tourPointsFromGuideEvents(events = []) {
  return (events || []).map((event, index) => normalizeTourRecord({
    id: `tour_${String(event.id ?? index).padStart(3, "0")}`,
    name: event.title || `Tour ${event.id ?? index}`,
    sourceEventId: String(event.id ?? ""),
    duration: 10,
    transform: {
      position: event.guidePosition,
      rotationY: radiansToDegrees(event.guideRotationY)
    }
  })).filter(Boolean);
}

export async function loadEffectiveTourDocument(guideEvents = []) {
  const stored = readStorage(TOUR_STORAGE_KEY, normalizeTourDocument);
  const base = await loadBaseDocument(TOUR_DATA_URL, normalizeTourDocument);
  const seed = { tours: tourPointsFromGuideEvents(guideEvents) };
  return pickEffective(base, stored, seed, "tours", normalizeTourDocument);
}

function nextGuideEventId(existingIds = []) {
  const used = new Set(existingIds.map(String));
  const numeric = [...used]
    .map((id) => Number.parseInt(id, 10))
    .filter((value) => Number.isFinite(value));
  let index = numeric.length ? Math.max(...numeric) + 1 : 0;

  while (used.has(String(index).padStart(2, "0")) || used.has(String(index))) {
    index += 1;
  }

  return String(index).padStart(2, "0");
}

function applyTourMarkerToGuideEvent(event, tour) {
  const next = {
    ...event,
    title: String(tour.name || event.title || event.id),
    guidePosition: cloneJson(tour.transform?.position || event.guidePosition || { x: 0, y: 0, z: 0 }),
    guideRotationY: Number.isFinite(Number(tour.transform?.rotationY))
      ? degreesToRadians(tour.transform.rotationY)
      : asNumber(event.guideRotationY, 0)
  };

  const scriptKo = String(tour.script?.ko || "").trim();
  const scriptEn = String(tour.script?.en || "").trim();

  if (scriptKo || scriptEn) {
    const dialogues = Array.isArray(event.dialogues) ? event.dialogues.map((line) => ({ ...line })) : [];

    if (!dialogues.length) {
      dialogues.push({
        id: `${next.id}_01`,
        ko: "",
        en: "",
        startTourChoice: false,
        orbitAfter: false,
        postEvent: { type: "none", comment: "", checkpointId: "" }
      });
    }

    if (scriptKo) {
      dialogues[0].ko = scriptKo;
    }

    if (scriptEn) {
      dialogues[0].en = scriptEn;
    }

    next.dialogues = dialogues;
  }

  return next;
}

/**
 * Push 3D Tour markers into GUIDE tour events (create missing events, update linked ones).
 * With pruneUnlinkedEvents, GUIDE events that no longer have a Tour marker are removed.
 */
export function applyEditorToursToGuideData(tourData, toursDoc = null, options = {}) {
  const pruneUnlinkedEvents = options.pruneUnlinkedEvents !== false;
  const overlay = normalizeTourDocument(toursDoc || readStorage(TOUR_STORAGE_KEY, normalizeTourDocument) || {});
  const base = cloneJson(tourData || { events: [] });
  let events = Array.isArray(base.events) ? base.events.map((event) => ({ ...event })) : [];
  const byId = new Map(events.map((event) => [String(event.id), event]));
  const tours = (overlay.tours || []).map((tour) => cloneJson(tour));

  tours.forEach((tour) => {
    if (!tour?.transform?.position) {
      return;
    }

    const sourceId = String(tour.sourceEventId || "").trim();
    let event = sourceId ? byId.get(sourceId) : null;

    if (!event) {
      // Prefer the linked sourceEventId so Undo can restore the same GUIDE event id.
      const id = sourceId && !byId.has(sourceId)
        ? sourceId
        : nextGuideEventId([...byId.keys()]);
      event = {
        id,
        title: tour.name || `새 이벤트 ${id}`,
        guidePosition: cloneJson(tour.transform.position),
        guideRotationY: degreesToRadians(tour.transform.rotationY),
        keepConfiguredY: false,
        dialogues: [{
          id: `${id}_01`,
          ko: String(tour.script?.ko || ""),
          en: String(tour.script?.en || ""),
          startTourChoice: false,
          orbitAfter: false,
          postEvent: { type: "none", comment: "", checkpointId: "" }
        }]
      };
      events.push(event);
      byId.set(id, event);
      tour.sourceEventId = id;
      return;
    }

    const updated = applyTourMarkerToGuideEvent(event, tour);
    const index = events.findIndex((item) => String(item.id) === String(event.id));

    if (index >= 0) {
      events[index] = updated;
      byId.set(String(updated.id), updated);
    }
  });

  if (pruneUnlinkedEvents) {
    const keep = new Set(
      tours.map((tour) => String(tour.sourceEventId || "").trim()).filter(Boolean)
    );
    events = events.filter((event) => keep.has(String(event.id)));
  }

  return {
    tourData: {
      ...base,
      events
    },
    toursDoc: {
      ...overlay,
      tours
    }
  };
}

/**
 * Rebuild editor Tour markers from GUIDE events (1:1 add/update/delete).
 */
export function applyGuideDataToEditorTours(tourData, toursDoc = null) {
  const overlay = normalizeTourDocument(toursDoc || readStorage(TOUR_STORAGE_KEY, normalizeTourDocument) || {});
  const events = Array.isArray(tourData?.events) ? tourData.events : [];
  const existingBySource = new Map();

  (overlay.tours || []).forEach((tour) => {
    const sourceId = String(tour.sourceEventId || "").trim();

    if (sourceId && !existingBySource.has(sourceId)) {
      existingBySource.set(sourceId, tour);
    }
  });

  const usedTourIds = new Set();
  const tours = events.map((event) => {
    const existing = existingBySource.get(String(event.id));
    const id = existing?.id || nextPrefixedId("tour_", [...usedTourIds]);
    usedTourIds.add(id);
    const firstLine = event.dialogues?.[0] || {};

    return normalizeTourRecord({
      id,
      name: event.title || existing?.name || `Tour ${event.id}`,
      sourceEventId: String(event.id),
      duration: existing?.duration ?? 10,
      script: {
        ko: String(existing?.script?.ko || firstLine.ko || ""),
        en: String(existing?.script?.en || firstLine.en || firstLine.subtitle || ""),
        voice: String(existing?.script?.voice || "")
      },
      transform: {
        position: event.guidePosition || existing?.transform?.position,
        rotationY: Number.isFinite(Number(event.guideRotationY))
          ? radiansToDegrees(event.guideRotationY)
          : existing?.transform?.rotationY
      }
    });
  }).filter(Boolean);

  return {
    tourData,
    toursDoc: {
      ...overlay,
      tours
    }
  };
}

/**
 * Runtime overlay: update linked GUIDE events from Tour markers (no new events).
 */
export function overlayGuideTourWithEditorMarkers(tourData, toursDoc = null) {
  const overlay = toursDoc || readStorage(TOUR_STORAGE_KEY, normalizeTourDocument);

  if (!tourData?.events?.length || !overlay?.tours?.length) {
    return tourData;
  }

  const bySource = new Map();
  overlay.tours.forEach((tour) => {
    if (tour.sourceEventId) {
      bySource.set(String(tour.sourceEventId), tour);
    }
  });

  if (!bySource.size) {
    return tourData;
  }

  return {
    ...tourData,
    events: tourData.events.map((event) => {
      const marker = bySource.get(String(event.id));

      if (!marker?.transform?.position) {
        return event;
      }

      return applyTourMarkerToGuideEvent(event, marker);
    })
  };
}

export function exportMarkerJson(document, pretty = true) {
  return JSON.stringify(document, null, pretty ? 2 : 0);
}

export function getEventTypeLabel(eventType) {
  return EVENT_TYPES.find((type) => type.id === eventType)?.label || eventType || "Event";
}

export function offsetTransform(transform, dx = 1, dz = 1) {
  return {
    ...transform,
    position: {
      x: asNumber(transform?.position?.x) + dx,
      y: asNumber(transform?.position?.y),
      z: asNumber(transform?.position?.z) + dz
    }
  };
}
