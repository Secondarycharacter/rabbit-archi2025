/**
 * NORMAL MODE runtime for editor Event / Teleport points.
 * Markers stay editor-only; this module has no gizmos or 3D markers.
 */

import { getMetaverseProjectId } from "../metaverse-project-context.js?v=editor-shared-20260908";
import {
  loadEffectiveEventDocument,
  loadEffectiveTeleportDocument,
  loadEffectiveTourDocument
} from "./scene-marker-data.js?v=editor-guide-pose-20260908";

function horizontalDistance(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.z || 0) - (b?.z || 0));
}

function ensureDom() {
  let prompt = document.getElementById("editorEventPrompt");
  let bubble = document.getElementById("editorEventDialog");
  let subtitle = document.getElementById("editorEventSubtitle");

  if (!prompt) {
    prompt = document.createElement("p");
    prompt.id = "editorEventPrompt";
    prompt.className = "editor-event-prompt";
    prompt.hidden = true;
    document.body.appendChild(prompt);
  }

  if (!bubble) {
    bubble = document.createElement("div");
    bubble.id = "editorEventDialog";
    bubble.className = "guide-dialog-bubble";
    bubble.hidden = true;
    bubble.innerHTML = [
      '<div class="guide-dialog-bubble__name"></div>',
      '<div class="guide-dialog-bubble__text"></div>'
    ].join("");
    document.body.appendChild(bubble);
  }

  if (!subtitle) {
    subtitle = document.createElement("div");
    subtitle.id = "editorEventSubtitle";
    subtitle.className = "guide-dialog-subtitle";
    subtitle.hidden = true;
    document.body.appendChild(subtitle);
  }

  return {
    prompt,
    bubble,
    nameEl: bubble.querySelector(".guide-dialog-bubble__name"),
    textEl: bubble.querySelector(".guide-dialog-bubble__text"),
    subtitle
  };
}

export function createSceneMarkerGameplay(options = {}) {
  const {
    getWalkMode = () => false,
    getPlayerPosition = () => null,
    isEditorActive = () => false,
    isBlocked = () => false,
    teleportPlayer = null,
    startNpcDialog = null,
    getNpcWorldPose = () => null,
    onStatus = null,
    getCurrentProjectId = () => getMetaverseProjectId()
  } = options;

  const ui = ensureDom();
  let events = [];
  let teleports = [];
  let tours = [];
  let armedId = null;
  let session = null;
  let audio = null;
  let cooldownUntil = 0;

  async function reload() {
    const [eventDoc, teleportDoc, tourDoc] = await Promise.all([
      loadEffectiveEventDocument(),
      loadEffectiveTeleportDocument(),
      loadEffectiveTourDocument()
    ]);

    events = eventDoc.events || [];
    teleports = teleportDoc.teleports || [];
    tours = tourDoc.tours || [];
  }

  function stopAudio() {
    if (!audio) {
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }

    audio = null;
  }

  function hideDialog() {
    stopAudio();
    session = null;
    ui.bubble.hidden = true;
    ui.subtitle.hidden = true;
    ui.nameEl.textContent = "";
    ui.textEl.textContent = "";
    ui.subtitle.textContent = "";
  }

  function hidePrompt() {
    ui.prompt.hidden = true;
    ui.prompt.textContent = "";
    armedId = null;
  }

  function playVoice(path) {
    stopAudio();

    if (!path) {
      return;
    }

    audio = new Audio(path);
    audio.preload = "auto";
    const playPromise = audio.play();
    playPromise?.catch?.(() => {});
  }

  function showLine(name, line) {
    ui.bubble.hidden = false;
    ui.nameEl.textContent = name || "";
    ui.textEl.textContent = line?.ko || line?.info || "";
    const subtitle = line?.subtitle || line?.en || "";
    ui.subtitle.hidden = !subtitle;
    ui.subtitle.textContent = subtitle;
    playVoice(line?.voice);
  }

  function findNearby() {
    const player = getPlayerPosition();

    if (!player) {
      return null;
    }

    let best = null;
    let bestDist = Infinity;

    events.forEach((event) => {
      if (!event?.transform?.position) {
        return;
      }

      const dist = horizontalDistance(player, event.transform.position);

      if (dist <= event.triggerDistance && dist < bestDist) {
        best = { kind: "event", record: event, dist };
        bestDist = dist;
      }
    });

    teleports.forEach((teleport) => {
      if (!teleport?.transform?.position) {
        return;
      }

      const dist = horizontalDistance(player, teleport.transform.position);

      if (dist <= teleport.triggerDistance && dist < bestDist) {
        best = { kind: "teleport", record: teleport, dist };
        bestDist = dist;
      }
    });

    return best;
  }

  function resolveTeleportArrival(teleport) {
    const pointId = teleport.destination?.pointId;

    if (pointId) {
      const dest = teleports.find((item) => item.id === pointId);

      if (dest) {
        return dest.arrival || dest.transform;
      }
    }

    return teleport.arrival || teleport.transform;
  }

  function runTeleport(teleport) {
    const projectId = String(teleport.destination?.projectId || "").trim();
    const current = getCurrentProjectId();

    if (projectId && projectId !== current) {
      onStatus?.(`다른 프로젝트(${projectId}) 이동은 이 장면에서 지원하지 않습니다.`);
      return false;
    }

    const arrival = resolveTeleportArrival(teleport);
    const ok = teleportPlayer?.(arrival.position, arrival.rotationY);

    if (ok) {
      cooldownUntil = performance.now() + 1600;
      onStatus?.(`${teleport.name} 이동`);
    }

    return Boolean(ok);
  }

  function dialogueLines(event) {
    if (event.eventType === "information") {
      const ko = event.info?.ko || event.dialogue?.[0]?.ko;
      const en = event.info?.en || event.dialogue?.[0]?.en || event.dialogue?.[0]?.subtitle;

      if (!ko && !en) {
        return [{ ko: event.name, en: "", subtitle: "" }];
      }

      return [{ ko: ko || event.name, en: en || "", subtitle: en || "", voice: event.dialogue?.[0]?.voice }];
    }

    const lines = (event.dialogue || []).filter((line) => line.ko || line.en || line.voice);

    if (lines.length) {
      return lines;
    }

    if (event.eventType === "game" || event.eventType === "minigame") {
      return [{ ko: `${event.name} — 게임 트리거`, en: event.name, subtitle: event.name }];
    }

    return [{ ko: event.name, en: "", subtitle: "" }];
  }

  function applyConnection(event) {
    const connection = event.connection || { type: "none" };

    if (!connection.type || connection.type === "none" || !connection.targetId) {
      return;
    }

    if (connection.type === "teleport") {
      const teleport = teleports.find((item) => item.id === connection.targetId);

      if (teleport) {
        runTeleport(teleport);
      }

      return;
    }

    if (connection.type === "tour") {
      const tour = tours.find((item) => (
        item.id === connection.targetId || item.sourceEventId === connection.targetId
      ));

      if (tour?.transform?.position) {
        teleportPlayer?.(tour.transform.position, tour.transform.rotationY);
        cooldownUntil = performance.now() + 1600;
        onStatus?.(`Tour 연결: ${tour.name}`);
      }

      return;
    }

    if (connection.type === "event") {
      const next = events.find((item) => item.id === connection.targetId);

      if (next) {
        beginEvent(next);
      }

      return;
    }

    if (connection.type === "npc") {
      const pose = getNpcWorldPose?.(connection.targetId);

      if (pose?.position) {
        const yaw = Number.isFinite(Number(pose.rotationY)) ? pose.rotationY : 0;
        const standOff = 1.4;
        const approach = {
          x: pose.position.x - Math.sin(yaw) * standOff,
          y: pose.position.y,
          z: pose.position.z - Math.cos(yaw) * standOff
        };
        teleportPlayer?.(approach, yaw);
        cooldownUntil = performance.now() + 900;
      }

      const started = startNpcDialog?.(connection.targetId);

      if (started) {
        onStatus?.(`NPC 대화 연결: ${connection.targetId}`);
      } else {
        onStatus?.(`NPC 연결: ${connection.targetId}`);
      }

      return;
    }

    onStatus?.(`연결 대상: ${connection.type} ${connection.targetId}`);
  }

  function beginEvent(event) {
    const lines = dialogueLines(event);
    session = {
      event,
      lines,
      index: 0
    };
    hidePrompt();
    showLine(event.name, lines[0]);
    onStatus?.(`${event.name} (${event.eventType})`);
  }

  function advanceSession() {
    if (!session) {
      return false;
    }

    session.index += 1;

    if (session.index >= session.lines.length) {
      const event = session.event;
      hideDialog();
      applyConnection(event);
      cooldownUntil = performance.now() + 800;
      return true;
    }

    showLine(session.event.name, session.lines[session.index]);
    return true;
  }

  function handleSpacePress() {
    if (!getWalkMode() || isEditorActive() || isBlocked()) {
      return false;
    }

    if (session) {
      return advanceSession();
    }

    if (performance.now() < cooldownUntil || !armedId) {
      return false;
    }

    const nearby = findNearby();

    if (!nearby || nearby.record.id !== armedId.split(":")[1]) {
      return false;
    }

    if (nearby.kind === "teleport") {
      return runTeleport(nearby.record);
    }

    beginEvent(nearby.record);
    return true;
  }

  function handleEscape() {
    if (!session) {
      return false;
    }

    hideDialog();
    cooldownUntil = performance.now() + 400;
    return true;
  }

  function update() {
    if (!getWalkMode() || isEditorActive()) {
      hidePrompt();
      hideDialog();
      return;
    }

    if (isBlocked() && !session) {
      hidePrompt();
      return;
    }

    if (session) {
      hidePrompt();
      return;
    }

    if (performance.now() < cooldownUntil) {
      hidePrompt();
      return;
    }

    const nearby = findNearby();

    if (!nearby) {
      hidePrompt();
      return;
    }

    armedId = `${nearby.kind}:${nearby.record.id}`;
    ui.prompt.hidden = false;
    ui.prompt.textContent = nearby.kind === "teleport"
      ? `[E] ${nearby.record.name} 이동`
      : `[E] ${nearby.record.name}`;
  }

  function isBusy() {
    return Boolean(session);
  }

  return {
    reload,
    update,
    handleSpacePress,
    handleEscape,
    isBusy,
    dispose() {
      hideDialog();
      hidePrompt();
    }
  };
}
