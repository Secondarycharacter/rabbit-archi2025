/**
 * Angji GUIDE scripted tour — separate from generic NPC dialog (multi-line bubbles).
 */

import { ANGJI_GUIDE_SPAWN, loadAngjiGuideTourData } from "./angji-guide-tour-config.js?v=angji-guide-tour-20260822-v22";
import { getGuestHeadLocalY, projectWorldPointToScreen, getGuestDialogAnchorWorldPosition, setGuestDevLabelVisible } from "./guest-dev-label.js?v=angji-guest-labels-20260823";
import { normalizeTourData } from "./angji-guide-tour-data.js?v=angji-guide-manager-20260822";

const GUIDE_STATE = {
  IDLE: "IDLE",
  APPROACH: "APPROACH",
  DIALOG: "DIALOG",
  CHOICE: "CHOICE",
  ESC_CHOICE: "ESC_CHOICE",
  ORBIT_SPIN: "ORBIT_SPIN",
  TELEPORT: "TELEPORT",
  CLOSING_ANIM: "CLOSING_ANIM",
  COMPLETE: "COMPLETE"
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dampAngle(current, target, lambda, dt) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function ensureGuideDom() {
  let stack = document.getElementById("guideDialogBubble");
  let subtitle = document.getElementById("guideDialogSubtitle");
  let choices = document.getElementById("guideDialogChoices");

  if (!stack) {
    stack = document.createElement("div");
    stack.id = "guideDialogBubble";
    stack.className = "guide-dialog-bubble";
    stack.hidden = true;
    stack.innerHTML = [
      '<div class="guide-dialog-bubble__name">GUIDE</div>',
      '<div class="guide-dialog-bubble__text" id="guideDialogBubbleText"></div>'
    ].join("");
    document.body.appendChild(stack);
  }

  if (!subtitle) {
    subtitle = document.createElement("div");
    subtitle.id = "guideDialogSubtitle";
    subtitle.className = "guide-dialog-subtitle";
    subtitle.hidden = true;
    document.body.appendChild(subtitle);
  }

  if (!choices) {
    choices = document.createElement("div");
    choices.id = "guideDialogChoices";
    choices.className = "guide-dialog-choices";
    choices.hidden = true;
    document.body.appendChild(choices);
  }

  return {
    bubble: stack,
    nameEl: stack.querySelector(".guide-dialog-bubble__name"),
    textEl: document.getElementById("guideDialogBubbleText"),
    subtitle,
    choices
  };
}

function tintGuideMeshes(BABYLON, guest) {
  (guest?.meshes || []).forEach((mesh) => {
    const mat = mesh?.material;

    if (!mat) {
      return;
    }

    mat.emissiveColor = new BABYLON.Color3(0.04, 0.28, 0.08);

    if (mat.diffuseColor) {
      mat.diffuseColor = mat.diffuseColor.scale(0.65).add(new BABYLON.Color3(0.08, 0.22, 0.1));
    }
  });
}

export function createAngjiGuideTourSystem(BABYLON, scene, options = {}) {
  const {
    getWalkMode = () => false,
    getPlayerBody = () => null,
    getPlayerCharacter = () => null,
    getTpsSystem = () => null,
    getGuestCharacterSystem = () => null,
    getActiveCamera = () => scene.activeCamera,
    getWalkCamera = () => null,
    getOrbitCamera = () => null,
    eyeHeight = 1.7,
    resolveGroundEyeY = null,
    getGuideFloorY = null,
    snapPlayerGroundAt = null,
    restoreTourEntryState = null,
    getIsNightMode = () => false,
    onStatus = null,
    onTourActiveChange = null
  } = options;

  const ui = ensureGuideDom();
  let tourData = null;
  let state = GUIDE_STATE.IDLE;
  let eventIndex = 0;
  let lineIndex = 0;
  let typedChars = 0;
  let typeAccum = 0;
  let holdAccum = 0;
  let guideGuest = null;
  let baseGuideRotY = ANGJI_GUIDE_SPAWN.rotationY;
  let tourStarted = false;
  let tourCompleted = false;
  let escResumeEventIndex = 0;
  let escResumeLineIndex = 0;
  let pendingChoice = null;
  let orbitSpinT = 0;
  let closingAnimQueue = [];
  let closingAnimIndex = 0;
  let closingAnimEndObserver = null;
  let closingAnimPending = false;
  let savedWalkCameraState = null;
  let savedInputBlocked = false;
  let spaceLatch = false;
  let cameraBlend = 0;
  let savedCameraController = null;
  let alignYawPlayer = 0;
  let dialogPaused = false;
  let escResumeState = GUIDE_STATE.DIALOG;
  let savedOrbitPause = null;
  let dialogCameraFrozen = false;
  let frozenDialogCameraPos = null;
  let frozenDialogLookTarget = null;
  let advanceLineTimer = null;
  let declineTimer = null;
  let talkingActive = false;
  let talkingSwitchT = 0;
  let talkingCurrentClipName = null;
  let talkingFadeOutGroup = null;
  let talkingFadeOutT = 0;
  let dialogViewYaw = 0;
  let dialogViewPitch = 0;
  let idleDanceIdleT = 0;
  let idleDancePlaying = false;
  let idleDanceEndObserver = null;

  const DIALOG_LOOK_MIN_PITCH = -Math.PI * 0.45;
  const DIALOG_LOOK_MAX_PITCH = Math.PI * 0.45;

  function clearIdleDanceObserver() {
    idleDanceEndObserver?.remove?.();
    idleDanceEndObserver = null;
  }

  function resetIdleDanceTimer() {
    idleDanceIdleT = 0;
  }

  function clearIdleDanceState() {
    clearIdleDanceObserver();
    idleDancePlaying = false;
    resetIdleDanceTimer();
  }

  function getIdleDanceClips() {
    return tourData?.idleDanceClips?.length
      ? tourData.idleDanceClips
      : [
        "Dance_Samba01",
        "Dance_Samba02",
        "Dance_Samba03",
        "Dance_Samba04",
        "Dance_Samba05",
        "Dance_Samba06",
        "Dance_Samba07"
      ];
  }

  function getResolvedIdleDanceClips() {
    const groups = guideGuest?.animationGroups || [];
    const configured = getIdleDanceClips();
    const resolved = configured.filter((clipName) => resolveGuideClipGroup(groups, clipName));

    if (resolved.length) {
      return resolved;
    }

    return groups
      .map((group) => group.name)
      .filter((name) => /dance/i.test(String(name || "")));
  }

  function pickRandomIdleDanceClip(exclude = null) {
    const clips = getResolvedIdleDanceClips();

    if (!clips.length) {
      return null;
    }

    const pool = exclude
      ? clips.filter((clipName) => normalizeGuideClipName(clipName) !== normalizeGuideClipName(exclude))
      : clips;

    const choices = pool.length ? pool : clips;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function finishIdleDance() {
    clearIdleDanceObserver();
    idleDancePlaying = false;
    resetIdleDanceTimer();

    if (state === GUIDE_STATE.IDLE) {
      playGuideClip("Idle", true);
    }
  }

  function attachIdleDanceEndHandler() {
    clearIdleDanceObserver();

    const group = guideGuest?.activeAnimationGroup;

    if (!group) {
      finishIdleDance();
      return;
    }

    idleDanceEndObserver = group.onAnimationGroupEndObservable.add(() => {
      if (state !== GUIDE_STATE.IDLE || !idleDancePlaying) {
        return;
      }

      finishIdleDance();
    });
  }

  function startIdleDance() {
    if (state !== GUIDE_STATE.IDLE || !guideGuest || idleDancePlaying) {
      return;
    }

    const clipName = pickRandomIdleDanceClip();

    if (!clipName) {
      resetIdleDanceTimer();
      return;
    }

    idleDancePlaying = true;
    resetIdleDanceTimer();

    if (!playGuideClip(clipName, false)) {
      idleDancePlaying = false;
      resetIdleDanceTimer();
      return;
    }

    attachIdleDanceEndHandler();
  }

  function updateIdleDancePlayback() {
    if (!idleDancePlaying || state !== GUIDE_STATE.IDLE) {
      return;
    }

    const group = guideGuest?.activeAnimationGroup;

    if (!group?.isPlaying) {
      finishIdleDance();
    }
  }

  function updateGuideIdleDance(dt) {
    if (state !== GUIDE_STATE.IDLE || !guideGuest?.root?.isEnabled?.()) {
      if (idleDancePlaying) {
        finishIdleDance();
      } else {
        resetIdleDanceTimer();
      }

      return;
    }

    if (idleDancePlaying) {
      updateIdleDancePlayback();
      return;
    }

    idleDanceIdleT += dt;
    const delaySeconds = Math.max(tourData?.idleDanceDelaySeconds ?? 300, 1);

    if (idleDanceIdleT >= delaySeconds) {
      startIdleDance();
    }
  }

  function clearPendingTimers() {
    if (advanceLineTimer !== null) {
      window.clearTimeout(advanceLineTimer);
      advanceLineTimer = null;
    }

    if (declineTimer !== null) {
      window.clearTimeout(declineTimer);
      declineTimer = null;
    }
  }

  function getTalkingClips() {
    return tourData?.talkingClips?.length
      ? tourData.talkingClips
      : ["Talking01", "Talking02"];
  }

  function isGuideTalkingClip(group) {
    if (!group?.name) {
      return false;
    }

    return getTalkingClips().some((clip) => (
      normalizeGuideClipName(group.name) === normalizeGuideClipName(clip)
      || normalizeGuideClipName(group.name).includes(normalizeGuideClipName(clip))
    ));
  }

  function getTalkingBlendSpeed() {
    return tourData?.talkingBlendSpeed ?? 0.045;
  }

  function getTalkingCrossfadeSeconds() {
    return tourData?.talkingCrossfadeSeconds ?? 0.45;
  }

  function pickRandomTalkingClip(excludeClipName = null) {
    const clips = getTalkingClips();

    if (!clips.length) {
      return "Talking01";
    }

    if (clips.length === 1) {
      return clips[0];
    }

    const exclude = normalizeGuideClipName(excludeClipName);
    let pick = clips[Math.floor(Math.random() * clips.length)];
    let guard = 0;

    while (
      exclude
      && normalizeGuideClipName(pick) === exclude
      && guard < 8
    ) {
      pick = clips[Math.floor(Math.random() * clips.length)];
      guard += 1;
    }

    return pick;
  }

  function scheduleTalkingSwitchDelay() {
    const cfg = tourData?.talkingSwitchSeconds || { min: 3, max: 6 };
    const min = cfg.min ?? 3;
    const max = cfg.max ?? 6;
    talkingSwitchT = min + Math.random() * Math.max(0, max - min);
  }

  function resetGuideGroupWeight(group) {
    if (group && typeof group.weight === "number") {
      group.weight = 1;
    }
  }

  function stopOtherGuideGroups(keepGroup) {
    guideGuest?.animationGroups?.forEach((group) => {
      if (group === keepGroup) {
        return;
      }

      try {
        group.stop();
      } catch {
        // ignore stale groups
      }

      resetGuideGroupWeight(group);
    });
  }

  function updateTalkingCrossfade(dt) {
    if (!talkingFadeOutGroup) {
      return;
    }

    talkingFadeOutT += dt;
    const duration = getTalkingCrossfadeSeconds();
    const t = clamp(talkingFadeOutT / Math.max(duration, 0.05), 0, 1);

    if (typeof talkingFadeOutGroup.weight === "number") {
      talkingFadeOutGroup.weight = 1 - t;
    }

    if (t >= 1) {
      try {
        talkingFadeOutGroup.stop();
      } catch {
        // ignore stale groups
      }

      resetGuideGroupWeight(talkingFadeOutGroup);
      talkingFadeOutGroup = null;
      talkingFadeOutT = 0;
    }
  }

  function playGuideTalkingClip(clipName) {
    const guest = guideGuest;

    if (!guest) {
      return false;
    }

    const nextGroup = resolveGuideClipGroup(guest.animationGroups, clipName);

    if (!nextGroup) {
      return false;
    }

    const prevGroup = guest.activeAnimationGroup;
    const sameClip = (
      prevGroup === nextGroup
      && normalizeGuideClipName(talkingCurrentClipName) === normalizeGuideClipName(clipName)
      && prevGroup?.isPlaying
    );

    if (sameClip) {
      return true;
    }

    try {
      nextGroup.stop();
      nextGroup.reset();
    } catch {
      // ignore stale groups
    }

    nextGroup.enableBlending = true;
    nextGroup.blendingSpeed = getTalkingBlendSpeed();
    resetGuideGroupWeight(nextGroup);
    nextGroup.start(true, 1, nextGroup.from, nextGroup.to, false);
    guest.activeAnimationGroup = nextGroup;
    talkingCurrentClipName = clipName;

    if (prevGroup && prevGroup !== nextGroup && isGuideTalkingClip(prevGroup)) {
      talkingFadeOutGroup = prevGroup;
      talkingFadeOutT = 0;
      resetGuideGroupWeight(prevGroup);
    } else {
      talkingFadeOutGroup = null;
      talkingFadeOutT = 0;
      stopOtherGuideGroups(nextGroup);
    }

    return true;
  }

  function stopGuideTalkingAnimation() {
    if (!talkingActive) {
      return;
    }

    talkingActive = false;
    talkingSwitchT = 0;
    talkingCurrentClipName = null;
    talkingFadeOutGroup = null;
    talkingFadeOutT = 0;

    if (state !== GUIDE_STATE.CLOSING_ANIM) {
      playGuideClip("Idle", true);
    }
  }

  function startGuideTalkingAnimation() {
    talkingActive = true;
    scheduleTalkingSwitchDelay();
    playGuideTalkingClip(pickRandomTalkingClip());
  }

  function updateGuideTalkingAnimation(dt) {
    if (state !== GUIDE_STATE.DIALOG || dialogPaused) {
      stopGuideTalkingAnimation();
      return;
    }

    updateTalkingCrossfade(dt);

    if (!talkingActive) {
      startGuideTalkingAnimation();
      return;
    }

    const guest = guideGuest;
    const group = guest?.activeAnimationGroup;

    if ((!group?.isPlaying || !isGuideTalkingClip(group)) && !talkingFadeOutGroup) {
      playGuideTalkingClip(pickRandomTalkingClip(talkingCurrentClipName));
      scheduleTalkingSwitchDelay();
      return;
    }

    talkingSwitchT -= dt;

    if (talkingSwitchT <= 0) {
      playGuideTalkingClip(pickRandomTalkingClip(talkingCurrentClipName));
      scheduleTalkingSwitchDelay();
    }
  }

  function normalizeGuideClipName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function resolveGuideClipGroup(groups, clipName) {
    if (!clipName || !groups?.length) {
      return null;
    }

    const normalized = normalizeGuideClipName(clipName);
    const exact = groups.find((group) => (
      normalizeGuideClipName(group.name) === normalized
      || group.name === clipName
    ));

    if (exact) {
      return exact;
    }

    const compactTarget = normalized.replace(/[_\s-]/g, "");
    const compactMatch = groups.find((group) => (
      normalizeGuideClipName(group.name).replace(/[_\s-]/g, "") === compactTarget
    ));

    if (compactMatch) {
      return compactMatch;
    }

    return groups.find((group) => normalizeGuideClipName(group.name).includes(normalized)) || null;
  }

  function clearClosingAnimObserver() {
    closingAnimEndObserver?.remove?.();
    closingAnimEndObserver = null;
    closingAnimPending = false;
  }

  function isIdleClipName(clipName) {
    return normalizeGuideClipName(clipName) === "idle";
  }

  function completeTourAfterClosing() {
    clearClosingAnimObserver();
    tourCompleted = true;
    setState(GUIDE_STATE.COMPLETE);
    clearKeysAndBlockInput(false);
    onStatus?.("GUIDE 투어가 완료되었습니다.");
    exitGuideTourToTourEntry({ keepTourCompleted: true });
  }

  function playClosingClipAt(index) {
    const clipName = closingAnimQueue[index];

    if (!clipName) {
      completeTourAfterClosing();
      return false;
    }

    const loop = isIdleClipName(clipName);
    const played = playGuideClip(clipName, loop);

    if (!played) {
      return false;
    }

    if (loop) {
      completeTourAfterClosing();
      return true;
    }

    attachClosingAnimEndHandler();
    return true;
  }

  function advanceClosingAnimStep() {
    if (state !== GUIDE_STATE.CLOSING_ANIM) {
      return;
    }

    clearClosingAnimObserver();
    closingAnimIndex += 1;

    if (closingAnimIndex >= closingAnimQueue.length) {
      completeTourAfterClosing();
      return;
    }

    if (!playClosingClipAt(closingAnimIndex)) {
      advanceClosingAnimStep();
    }
  }

  function attachClosingAnimEndHandler() {
    clearClosingAnimObserver();

    const group = guideGuest?.activeAnimationGroup;

    if (!group) {
      window.setTimeout(() => advanceClosingAnimStep(), 0);
      return;
    }

    closingAnimPending = true;

    closingAnimEndObserver = group.onAnimationGroupEndObservable.add(() => {
      if (state !== GUIDE_STATE.CLOSING_ANIM) {
        return;
      }

      advanceClosingAnimStep();
    });
  }

  function setState(next) {
    if (next !== GUIDE_STATE.IDLE && state === GUIDE_STATE.IDLE) {
      clearIdleDanceState();
    }

    if (next === GUIDE_STATE.IDLE && state !== GUIDE_STATE.IDLE) {
      clearIdleDanceState();
    }

    state = next;
    onTourActiveChange?.(isActive());
  }

  function isActive() {
    return state !== GUIDE_STATE.IDLE && state !== GUIDE_STATE.COMPLETE;
  }

  function blocksPlayerControl() {
    return isActive() || state === GUIDE_STATE.APPROACH;
  }

  function getEvents() {
    return tourData?.events || [];
  }

  function getCurrentEvent() {
    return getEvents()[eventIndex] || null;
  }

  function getCurrentLine() {
    return getCurrentEvent()?.dialogues?.[lineIndex] || null;
  }

  function clearKeysAndBlockInput(blocked) {
    const tps = getTpsSystem();
    const input = tps?.getInputController?.();

    if (!input) {
      return;
    }

    if (blocked) {
      savedInputBlocked = input.isInputBlocked?.() || false;
      input.clear?.();
      input.setInputBlocked?.(true);
    } else {
      input.setInputBlocked?.(savedInputBlocked);
      input.clear?.();
    }
  }

  function hideUi() {
    ui.bubble.hidden = true;
    ui.subtitle.hidden = true;
    ui.choices.hidden = true;
    ui.choices.innerHTML = "";

    if (ui.textEl) {
      ui.textEl.textContent = "";
    }
  }

  function showLine(line) {
    if (!line) {
      return;
    }

    ui.bubble.hidden = false;
    ui.subtitle.hidden = false;

    if (ui.nameEl) {
      ui.nameEl.textContent = tourData?.guideDisplayName || ANGJI_GUIDE_SPAWN.devLabel || "GUIDE";
    }

    if (ui.textEl) {
      ui.textEl.textContent = "";
    }

    ui.subtitle.textContent = line.en || "";
    typedChars = 0;
    typeAccum = 0;
    holdAccum = 0;
    dialogCameraFrozen = false;
    frozenDialogCameraPos = null;
    frozenDialogLookTarget = null;
  }

  function getLineHoldSeconds(line) {
    const base = tourData?.lineHoldSeconds ?? 0.6;
    const perChar = tourData?.lineHoldPerChar ?? 0.012;
    const maxExtra = tourData?.lineHoldMaxExtra ?? 2.0;
    const extra = Math.min(maxExtra, (line?.ko?.length || 0) * perChar);

    return base + extra;
  }

  function showChoice(prompt, onPrimary, onSecondary, options = {}) {
    ui.choices.hidden = false;
    ui.choices.innerHTML = "";

    const label = document.createElement("p");
    label.className = "guide-dialog-choices__prompt";
    label.textContent = prompt.ko || "";
    ui.choices.appendChild(label);

    if (prompt.en) {
      ui.subtitle.hidden = false;
      ui.subtitle.textContent = prompt.en;
    }

    const row = document.createElement("div");
    row.className = "guide-dialog-choices__row";

    const primaryBtn = document.createElement("button");
    primaryBtn.type = "button";
    primaryBtn.textContent = options.primaryLabel || "예 / Yes";
    primaryBtn.addEventListener("click", () => {
      ui.choices.hidden = true;
      onPrimary?.();
    });

    const secondaryBtn = document.createElement("button");
    secondaryBtn.type = "button";
    secondaryBtn.textContent = options.secondaryLabel || "아니오 / No";
    secondaryBtn.addEventListener("click", () => {
      ui.choices.hidden = true;
      onSecondary?.();
    });

    row.append(primaryBtn, secondaryBtn);
    ui.choices.appendChild(row);
    setState(options.choiceState || GUIDE_STATE.CHOICE);
  }

  function resolveGuideGazeTarget(guest, event, line) {
    const guestPos = guest.root.getAbsolutePosition();
    const rotY = Number.isFinite(event?.guideRotationY)
      ? event.guideRotationY
      : guest.root.rotation.y;
    const forwardX = Math.sin(rotY);
    const forwardZ = Math.cos(rotY);
    const effect = line?.cameraEffect || event?.cameraEffect || "default";
    const fitScale = Math.max(guest.fitScale || 1, 0.001);
    const headY = guestPos.y + getGuestHeadLocalY(guest) * fitScale;

    if (effect === "lookUp") {
      return new BABYLON.Vector3(guestPos.x, guestPos.y + 14, guestPos.z);
    }

    if (effect === "building") {
      return new BABYLON.Vector3(
        guestPos.x + forwardX * 20,
        guestPos.y + 10,
        guestPos.z + forwardZ * 20
      );
    }

    if (effect === "outdoor") {
      return new BABYLON.Vector3(
        guestPos.x + forwardX * 24,
        guestPos.y + 5,
        guestPos.z + forwardZ * 24
      );
    }

    if (effect === "landscape") {
      return new BABYLON.Vector3(
        guestPos.x + forwardX * 32,
        guestPos.y + 12,
        guestPos.z + forwardZ * 32
      );
    }

    if (effect === "hall") {
      return new BABYLON.Vector3(guestPos.x, guestPos.y + 4, guestPos.z);
    }

    return new BABYLON.Vector3(guestPos.x, headY - 0.1, guestPos.z);
  }

  function resolveDialogCameraLookTarget(guest) {
    const guestPos = guest.root.getAbsolutePosition();
    const fitScale = Math.max(guest.fitScale || 1, 0.001);
    const headY = guestPos.y + getGuestHeadLocalY(guest) * fitScale;

    return new BABYLON.Vector3(guestPos.x, headY - 0.1, guestPos.z);
  }

  function snapGuideRootFloorY(x, z, fallbackY, event = null) {
    if (event?.keepConfiguredY) {
      return fallbackY;
    }

    if (typeof getGuideFloorY === "function") {
      const snapped = getGuideFloorY(x, z, fallbackY);

      if (Number.isFinite(snapped)) {
        return snapped;
      }
    }

    return fallbackY;
  }

  function snapPlayerToGround(playerPos, event = null) {
    if (typeof snapPlayerGroundAt === "function") {
      snapPlayerGroundAt(playerPos, {
        lockConfiguredEyeY: event?.keepConfiguredY === true
      });
      return;
    }

    const body = getPlayerBody();

    if (!body?.position) {
      return;
    }

    body.position.set(playerPos.x, playerPos.y, playerPos.z);
    getPlayerCharacter()?.syncFromPlayerEye?.(body.position);
  }

  function resetDialogLookOffsets() {
    dialogViewYaw = 0;
    dialogViewPitch = 0;
  }

  function syncDialogLookCamera() {
    resetDialogLookOffsets();
    cameraBlend = 1;
  }

  function snapGuideGazeToPlayer() {
    const guest = guideGuest;
    const body = getPlayerBody();

    if (!guest?.root || !body?.position) {
      return;
    }

    guest.root.computeWorldMatrix(true);
    const guestPos = guest.root.getAbsolutePosition();
    const targetYaw = Math.atan2(
      body.position.x - guestPos.x,
      body.position.z - guestPos.z
    );

    guest.root.rotation.y = targetYaw;
    baseGuideRotY = targetYaw;
  }

  function allowsFreeLook() {
    return getWalkMode() && state === GUIDE_STATE.DIALOG && !dialogPaused;
  }

  function computeDialogLookTarget(cameraPos, baseLookTarget) {
    const baseDir = baseLookTarget.subtract(cameraPos);
    const horiz = Math.hypot(baseDir.x, baseDir.z);
    const baseYaw = Math.atan2(baseDir.x, baseDir.z);
    const basePitch = Math.atan2(baseDir.y, Math.max(horiz, 1e-6));
    const yaw = baseYaw + dialogViewYaw;
    const pitch = clamp(
      basePitch + dialogViewPitch,
      DIALOG_LOOK_MIN_PITCH,
      DIALOG_LOOK_MAX_PITCH
    );
    const cosPitch = Math.cos(pitch);
    const lookDistance = tourData?.dialogLookDistance ?? 10;

    return cameraPos.add(new BABYLON.Vector3(
      Math.sin(yaw) * cosPitch * lookDistance,
      Math.sin(pitch) * lookDistance,
      Math.cos(yaw) * cosPitch * lookDistance
    ));
  }

  function applyLookInput(deltaX, deltaY) {
    if (!allowsFreeLook()) {
      return;
    }

    const sensitivity = tourData?.dialogLookSensitivity ?? 0.0022;
    const maxPitchOffset = Math.PI * 0.45;

    dialogViewYaw += deltaX * sensitivity;
    dialogViewPitch = clamp(
      dialogViewPitch - deltaY * sensitivity,
      -maxPitchOffset,
      maxPitchOffset
    );
  }

  function captureDialogCameraState() {
    const camera = getWalkCamera?.() || getActiveCamera();
    const cameraController = getTpsSystem()?.getCameraController?.();

    savedWalkCameraState = {
      walkCam: camera?.position?.clone?.(),
      walkTarget: camera?.getTarget?.()?.clone?.()
    };
    savedCameraController = cameraController?.captureState?.() || null;
    cameraBlend = 0;
    dialogCameraFrozen = false;
    frozenDialogCameraPos = null;
    frozenDialogLookTarget = null;
  }

  function restoreDialogCameraState() {
    const cameraController = getTpsSystem()?.getCameraController?.();

    cameraController?.restoreState?.(savedCameraController || null);
    savedWalkCameraState = null;
    savedCameraController = null;
    cameraBlend = 0;
    dialogCameraFrozen = false;
    frozenDialogCameraPos = null;
    frozenDialogLookTarget = null;
  }

  function getOrbitBeta(spin, offset, radius) {
    // Negative pitchOffsetDegrees tilts the orbit camera toward the ground.
    const pitchOffsetRad = ((spin.pitchOffsetDegrees ?? -12) * Math.PI) / 180;
    const baseBeta = Math.acos(clamp(offset.y / Math.max(radius, 0.001), -1, 1));

    return clamp(baseBeta + pitchOffsetRad, 0.15, Math.PI - 0.15);
  }

  function getOrbitVectors(spin) {
    const target = new BABYLON.Vector3(spin.target.x, spin.target.y, spin.target.z);
    const startPos = new BABYLON.Vector3(spin.position.x, spin.position.y, spin.position.z);

    return { target, startPos };
  }

  function restoreWalkCameraFromOrbit() {
    const walkCam = getWalkCamera?.() || getActiveCamera();
    const orbitCam = getOrbitCamera();

    orbitCam?.detachControl?.();
    scene.activeCamera = walkCam;

    if (savedWalkCameraState?.walkCam && walkCam) {
      walkCam.position.copyFrom(savedWalkCameraState.walkCam);

      if (savedWalkCameraState.walkTarget) {
        walkCam.setTarget(savedWalkCameraState.walkTarget);
      }
    }
  }

  function pauseOrbitForEsc() {
    if (state !== GUIDE_STATE.ORBIT_SPIN) {
      return;
    }

    savedOrbitPause = {
      orbitSpinT,
      walkCameraState: savedWalkCameraState
    };
    restoreWalkCameraFromOrbit();
  }

  function resumeOrbitFromEsc() {
    const orbitCam = getOrbitCamera();
    const spin = tourData?.orbitSpin;

    if (!savedOrbitPause || !orbitCam || !spin) {
      return;
    }

    const { target, startPos } = getOrbitVectors(spin);
    const offset = startPos.subtract(target);
    const radius = offset.length();
    const startAlpha = Number.isFinite(spin.rotationY)
      ? spin.rotationY
      : Math.atan2(offset.x, offset.z);

    orbitCam.setTarget(target);
    orbitCam.radius = radius;
    orbitCam.beta = getOrbitBeta(spin, offset, radius);
    orbitCam.alpha = startAlpha + (savedOrbitPause.orbitSpinT / (spin.durationSeconds || 10)) * Math.PI * 2 * (spin.rotationTurns || 1);
    orbitCam.attachControl(scene.getEngine().getRenderingCanvas(), false);
    scene.activeCamera = orbitCam;
    orbitSpinT = savedOrbitPause.orbitSpinT;
    savedWalkCameraState = savedOrbitPause.walkCameraState;
    savedOrbitPause = null;
    hideUi();
    setState(GUIDE_STATE.ORBIT_SPIN);
  }

  function clearOrbitPauseState() {
    savedOrbitPause = null;
    getOrbitCamera()?.detachControl?.();
    restoreWalkCameraFromOrbit();
    savedWalkCameraState = null;
  }

  function getGuideSpawnEvent() {
    return getEvents()[0] || {
      guidePosition: ANGJI_GUIDE_SPAWN.position,
      guideRotationY: ANGJI_GUIDE_SPAWN.rotationY
    };
  }

  function positionGuideNpcOnly(event) {
    const guest = guideGuest;

    if (!guest?.root || !event) {
      return;
    }

    guest.root.position.set(
      event.guidePosition.x,
      snapGuideRootFloorY(event.guidePosition.x, event.guidePosition.z, event.guidePosition.y, event),
      event.guidePosition.z
    );
    guest.root.rotation.y = event.guideRotationY;
    baseGuideRotY = event.guideRotationY;
  }

  function resolveDialogCameraFraming(guest, playerEyePos) {
    const guestPos = guest.root.getAbsolutePosition();
    const lookTarget = resolveDialogCameraLookTarget(guest);
    const fromPlayer = new BABYLON.Vector3(
      playerEyePos.x - guestPos.x,
      0,
      playerEyePos.z - guestPos.z
    );

    if (fromPlayer.lengthSquared() < 1e-6) {
      fromPlayer.set(0, 0, 1);
    } else {
      fromPlayer.normalize();
    }

    const dialogDist = tourData?.dialogDistance ?? 1.2;
    const dist = clamp(dialogDist + 0.55, 1.8, 4.5);
    const cam = lookTarget.add(fromPlayer.scale(dist));
    cam.y = playerEyePos.y - eyeHeight + (tourData?.dialogCameraHeight ?? 1.65);

    return { lookTarget, cam };
  }

  function lockPlayerToGuideDialogPose() {
    const guest = guideGuest;
    const event = getCurrentEvent() || getGuideSpawnEvent();
    const body = getPlayerBody();
    const character = getPlayerCharacter();

    if (!guest?.root || !body?.position || !event) {
      return;
    }

    guest.root.computeWorldMatrix(true);
    const guidePos = guest.root.getAbsolutePosition();
    const dist = tourData?.dialogDistance ?? 1.2;
    const playerPos = computePlayerPosition(
      { x: guidePos.x, y: guidePos.y, z: guidePos.z },
      event.guideRotationY,
      dist,
      event
    );

    body.position.set(playerPos.x, playerPos.y, playerPos.z);
    character?.syncFromPlayerEye?.(body.position);
    character?.setFacingYaw?.(alignYawPlayer);
    character?.updateVisual?.(0, false);
    snapPlayerToGround(body.position, event);
  }

  function shouldLockPlayerPose() {
    if (state === GUIDE_STATE.ORBIT_SPIN) {
      return false;
    }

    return (
      state === GUIDE_STATE.DIALOG
      || state === GUIDE_STATE.TELEPORT
      || state === GUIDE_STATE.CHOICE
      || state === GUIDE_STATE.CLOSING_ANIM
      || state === GUIDE_STATE.ESC_CHOICE
      || dialogPaused
    );
  }

  function computePlayerPosition(guidePos, guideRotY, distance, event = null) {
    const fx = Math.sin(guideRotY);
    const fz = Math.cos(guideRotY);
    const pos = {
      x: guidePos.x + fx * distance,
      y: guidePos.y,
      z: guidePos.z + fz * distance
    };

    if (event?.keepConfiguredY && Number.isFinite(event.guidePosition?.y)) {
      pos.y = event.guidePosition.y + eyeHeight;
      alignYawPlayer = Math.atan2(guidePos.x - pos.x, guidePos.z - pos.z);
      return pos;
    }

    if (typeof resolveGroundEyeY === "function") {
      const eyeY = resolveGroundEyeY(new BABYLON.Vector3(pos.x, pos.y, pos.z));

      if (Number.isFinite(eyeY)) {
        pos.y = eyeY;
      }
    }

    alignYawPlayer = Math.atan2(guidePos.x - pos.x, guidePos.z - pos.z);
    return pos;
  }

  function applyGuideTransform(event) {
    positionGuideNpcOnly(event);
    lockPlayerToGuideDialogPose();
    snapGuideGazeToPlayer();
  }

  function teleportToEvent(index) {
    const event = getEvents()[index];

    if (!event) {
      return;
    }

    captureDialogCameraState();
    eventIndex = index;
    lineIndex = 0;
    resetDialogLookOffsets();
    applyGuideTransform(event);
    setState(GUIDE_STATE.DIALOG);
    showLine(getCurrentLine());
  }

  async function ensureGuideSpawned() {
    const gcs = getGuestCharacterSystem();

    if (!gcs || guideGuest) {
      return guideGuest;
    }

    await gcs.ensureSpawned([ANGJI_GUIDE_SPAWN], { parallel: false, showOnLoad: true });
    guideGuest = gcs.getGuests?.()?.find((g) => g.spawn?.id === ANGJI_GUIDE_SPAWN.id) || null;

    if (guideGuest) {
      tintGuideMeshes(BABYLON, guideGuest);
      gcs.revealGuest?.(ANGJI_GUIDE_SPAWN.id);
      gcs.refreshDevLabels?.();
      positionGuideNpcOnly(getGuideSpawnEvent());
      playGuideClip("Idle", true);
      syncGuideHeadLabel();
    }

    return guideGuest;
  }

  function playGuideClip(clipName, loop = false) {
    const guest = guideGuest;
    const groups = guest?.animationGroups || [];
    const group = resolveGuideClipGroup(groups, clipName);

    if (!group) {
      return false;
    }

    groups.forEach((g) => g.stop());
    group.start(loop, 1, group.from, group.to, false);
    guest.activeAnimationGroup = group;
    return true;
  }

  function acceptTourChoice() {
    tourStarted = true;
    dialogPaused = false;
    clearKeysAndBlockInput(true);
    lineIndex += 1;
    syncDialogLookCamera();
    showLine(getCurrentLine());
    setState(GUIDE_STATE.DIALOG);
    onStatus?.("GUIDE 투어를 시작합니다.");
  }

  function exitGuideTourToTourEntry(options = {}) {
    const keepTourCompleted = options.keepTourCompleted === true;

    clearPendingTimers();
    clearClosingAnimObserver();
    clearIdleDanceState();
    stopGuideTalkingAnimation();
    hideUi();
    tourStarted = false;
    dialogPaused = false;
    savedOrbitPause = null;

    if (!keepTourCompleted) {
      tourCompleted = false;
    }

    eventIndex = 0;
    lineIndex = 0;
    clearOrbitPauseState();
    positionGuideNpcOnly(getGuideSpawnEvent());
    restoreDialogCameraState();
    restoreTourEntryState?.();
    playGuideClip("Idle", true);
    clearKeysAndBlockInput(false);
    setState(GUIDE_STATE.IDLE);
    onStatus?.(null);
  }

  function resetToSpawnIdle(options = {}) {
    const keepTourCompleted = options.keepTourCompleted === true;

    clearPendingTimers();
    clearIdleDanceState();
    stopGuideTalkingAnimation();
    hideUi();
    tourStarted = false;
    dialogPaused = false;
    savedOrbitPause = null;

    if (!keepTourCompleted) {
      tourCompleted = false;
    }

    eventIndex = 0;
    lineIndex = 0;
    clearOrbitPauseState();
    applyGuideTransform(getGuideSpawnEvent());
    restoreDialogCameraState();
    playGuideClip("Idle", true);
    clearKeysAndBlockInput(false);
    setState(GUIDE_STATE.IDLE);
    onStatus?.(null);
  }

  function declineAndReset() {
    const msg = tourData?.declineMessage;

    ui.bubble.hidden = false;
    ui.subtitle.hidden = false;
    ui.subtitle.textContent = msg?.en || "";
    ui.textEl.textContent = msg?.ko || "";
    typedChars = msg?.ko?.length || 0;
    holdAccum = 0;
    dialogPaused = true;
    clearKeysAndBlockInput(true);
    setState(GUIDE_STATE.DIALOG);

    window.clearTimeout(declineTimer);
    declineTimer = window.setTimeout(() => {
      declineTimer = null;
      exitGuideTourToTourEntry();
    }, 2200);
  }

  function advanceLine() {
    const event = getCurrentEvent();
    const lines = event?.dialogues || [];
    lineIndex += 1;
    typedChars = 0;
    typeAccum = 0;
    holdAccum = 0;

    hideUi();

    if (lineIndex >= lines.length) {
      finishCurrentEvent();
      return;
    }

    setState(GUIDE_STATE.DIALOG);
    dialogCameraFrozen = false;
    frozenDialogCameraPos = null;
    frozenDialogLookTarget = null;

    if (advanceLineTimer !== null) {
      window.clearTimeout(advanceLineTimer);
    }

    advanceLineTimer = window.setTimeout(() => {
      advanceLineTimer = null;

      if (state === GUIDE_STATE.DIALOG) {
        showLine(getCurrentLine());
      }
    }, 140);
  }

  function updateGuideGaze(dt) {
    const guest = guideGuest;
    const body = getPlayerBody();
    const event = getCurrentEvent();
    const line = getCurrentLine();

    if (
      !guest?.root
      || !body?.position
      || (
        state !== GUIDE_STATE.DIALOG
        && state !== GUIDE_STATE.CLOSING_ANIM
        && state !== GUIDE_STATE.TELEPORT
      )
      || dialogPaused
    ) {
      return;
    }

    const guestPos = guest.root.getAbsolutePosition();
    const effect = line?.cameraEffect || "default";
    let targetYaw = Math.atan2(body.position.x - guestPos.x, body.position.z - guestPos.z);

    if (effect !== "default") {
      const lookTarget = resolveGuideGazeTarget(guest, event, line);
      targetYaw = Math.atan2(lookTarget.x - guestPos.x, lookTarget.z - guestPos.z);
    }

    guest.root.rotation.y = dampAngle(guest.root.rotation.y, targetYaw, 8, dt);
  }

  function showTransitionChoice() {
    const prompt = tourData?.transitionPrompt || {
      ko: "다음 설명으로 넘어갈까요?",
      en: "Shall we move on to the next explanation?"
    };

    showChoice(
      prompt,
      () => {
        setState(GUIDE_STATE.TELEPORT);
        teleportToEvent(eventIndex + 1);
      },
      () => exitGuideTourToTourEntry(),
      {
        primaryLabel: "예 / Yes",
        secondaryLabel: "아니오 / No"
      }
    );
  }

  function finishCurrentEvent() {
    hideUi();

    if (eventIndex >= getEvents().length - 1) {
      startClosingAnimations(getCurrentEvent());
      return;
    }

    showTransitionChoice();
  }

  function startClosingAnimations(event) {
    stopGuideTalkingAnimation();
    talkingActive = false;
    clearClosingAnimObserver();
    closingAnimQueue = event?.closingAnimations || ["Greeting_bow", "Greeting_Hand", "Idle"];
    closingAnimIndex = 0;
    hideUi();
    setState(GUIDE_STATE.CLOSING_ANIM);

    if (!playClosingClipAt(0)) {
      advanceClosingAnimStep();
    }
  }

  function startOrbitSpin() {
    const orbitCam = getOrbitCamera();
    const spin = tourData?.orbitSpin;

    if (!orbitCam || !spin) {
      advanceLine();
      return;
    }

    captureDialogCameraState();

    const { target, startPos } = getOrbitVectors(spin);
    const offset = startPos.subtract(target);
    const radius = offset.length();

    orbitCam.setTarget(target);
    orbitCam.radius = radius;
    orbitCam.beta = getOrbitBeta(spin, offset, radius);
    orbitCam.alpha = Number.isFinite(spin.rotationY)
      ? spin.rotationY
      : Math.atan2(offset.x, offset.z);
    orbitCam.attachControl(scene.getEngine().getRenderingCanvas(), false);
    scene.activeCamera = orbitCam;
    orbitSpinT = 0;
    hideUi();
    stopGuideTalkingAnimation();
    setState(GUIDE_STATE.ORBIT_SPIN);
    onStatus?.("주변을 둘러보는 중…");
  }

  function finishOrbitSpin() {
    restoreWalkCameraFromOrbit();
    dialogCameraFrozen = false;
    frozenDialogCameraPos = null;
    frozenDialogLookTarget = null;
    captureDialogCameraState();
    resetDialogLookOffsets();
    applyGuideTransform(getCurrentEvent());
    advanceLine();
  }

  function updateBubblePosition() {
    const guest = guideGuest;
    const camera = getActiveCamera();

    if (!guest?.root || !camera) {
      return;
    }

    const anchor = getGuestDialogAnchorWorldPosition(guest, 0.35);

    if (!anchor) {
      return;
    }

    const projected = projectWorldPointToScreen(BABYLON, scene, camera, anchor);

    if (!projected?.visible) {
      ui.bubble.hidden = true;
      return;
    }

    if (state === GUIDE_STATE.DIALOG && !dialogPaused && getCurrentLine()) {
      ui.bubble.hidden = false;
    }

    ui.bubble.style.left = `${projected.x}px`;
    ui.bubble.style.top = `${projected.y}px`;
    syncGuideHeadLabel();
  }

  function syncGuideHeadLabel() {
    const guest = guideGuest;
    const gcs = getGuestCharacterSystem();

    if (!guest || !gcs) {
      return;
    }

    const showLabel = isActive()
      && state !== GUIDE_STATE.ORBIT_SPIN
      && state !== GUIDE_STATE.IDLE
      && state !== GUIDE_STATE.COMPLETE
      && !dialogPaused;

    setGuestDevLabelVisible(guest, showLabel && guest.root?.isEnabled?.() !== false);
  }

  function updateDialogCamera(dt) {
    const camera = getActiveCamera();
    const guest = guideGuest;
    const body = getPlayerBody();

    if (
      !camera
      || !guest?.root
      || !body?.position
      || state === GUIDE_STATE.ORBIT_SPIN
      || dialogPaused
      || state === GUIDE_STATE.ESC_CHOICE
      || state === GUIDE_STATE.CHOICE
    ) {
      return;
    }

    if (
      state !== GUIDE_STATE.DIALOG
      && state !== GUIDE_STATE.CLOSING_ANIM
      && state !== GUIDE_STATE.TELEPORT
    ) {
      return;
    }

    const framing = resolveDialogCameraFraming(guest, body.position);
    const { lookTarget, cam: desired } = framing;
    const blendSeconds = Math.max(tourData?.cameraBlendSeconds ?? 0.85, 0.2);

    if (savedWalkCameraState?.walkCam && cameraBlend < 1) {
      cameraBlend = Math.min(1, cameraBlend + dt / blendSeconds);
      const t = cameraBlend * cameraBlend * (3 - 2 * cameraBlend);
      camera.position = BABYLON.Vector3.Lerp(savedWalkCameraState.walkCam, desired, t);

      const blendLookTarget = savedWalkCameraState.walkTarget
        ? BABYLON.Vector3.Lerp(savedWalkCameraState.walkTarget, lookTarget, t)
        : lookTarget;

      camera.setTarget(computeDialogLookTarget(camera.position, blendLookTarget));
      return;
    }

    camera.position.copyFrom(desired);
    camera.setTarget(computeDialogLookTarget(camera.position, lookTarget));
  }

  function updateDialogTyping(dt) {
    const line = getCurrentLine();

    if (
      !line
      || state !== GUIDE_STATE.DIALOG
      || dialogPaused
      || advanceLineTimer !== null
    ) {
      return;
    }

    const fullText = line.ko || "";
    const speed = line?.textSpeed ?? tourData?.textSpeed ?? 0.035;

    if (typedChars < fullText.length) {
      typeAccum += dt;

      while (typeAccum >= speed && typedChars < fullText.length) {
        typeAccum -= speed;
        typedChars += 1;
      }

      if (ui.textEl) {
        ui.textEl.textContent = fullText.slice(0, typedChars);
      }
    } else {
      holdAccum += dt;
      const holdTarget = getLineHoldSeconds(line);

      if (holdAccum >= holdTarget) {
        if (line?.startTourChoice && !tourStarted) {
          showChoice(
            { ko: line.ko, en: line.en },
            () => acceptTourChoice(),
            () => declineAndReset()
          );
          return;
        }

        if (line?.orbitAfter) {
          startOrbitSpin();
          return;
        }

        advanceLine();
      }
    }
  }

  function updateClosingAnim(dt) {
    void dt;

    if (state !== GUIDE_STATE.CLOSING_ANIM || closingAnimPending) {
      return;
    }

    const group = guideGuest?.activeAnimationGroup;

    if (!group) {
      advanceClosingAnimStep();
      return;
    }

    if (!group.isPlaying && !isIdleClipName(closingAnimQueue[closingAnimIndex])) {
      advanceClosingAnimStep();
    }
  }

  function syncGuideNightVisibility(isNight = getIsNightMode()) {
    if (isNight) {
      clearIdleDanceState();
      hideUi();
      stopGuideTalkingAnimation();

      if (isActive()) {
        if (getWalkMode()) {
          exitGuideTourToTourEntry({ keepTourCompleted: tourCompleted });
        } else {
          clearPendingTimers();
          clearClosingAnimObserver();
          tourStarted = false;
          dialogPaused = false;
          setState(GUIDE_STATE.IDLE);
        }
      }

      if (guideGuest?.root) {
        guideGuest.root.setEnabled(false);
        setGuestDevLabelVisible(guideGuest, false);
      }

      return;
    }

    if (!guideGuest?.root) {
      void ensureGuideSpawned().then(() => syncGuideNightVisibility(false));
      return;
    }

    guideGuest.root.setEnabled(true);
    getGuestCharacterSystem()?.revealGuest?.(ANGJI_GUIDE_SPAWN.id);
    positionGuideNpcOnly(getGuideSpawnEvent());
    playGuideClip("Idle", true);
    setState(GUIDE_STATE.IDLE);
    syncGuideHeadLabel();
    getGuestCharacterSystem()?.refreshDevLabels?.();
  }

  async function init() {
    tourData = await loadAngjiGuideTourData();
    await ensureGuideSpawned();
    syncGuideNightVisibility(getIsNightMode());
  }

  function update(dt) {
    if (!tourData || !getWalkMode()) {
      return;
    }

    if (state === GUIDE_STATE.ORBIT_SPIN && !dialogPaused) {
      const spin = tourData.orbitSpin;
      const orbitCam = getOrbitCamera();
      orbitSpinT += dt;

      if (orbitCam && spin) {
        const { target, startPos } = getOrbitVectors(spin);
        const offset = startPos.subtract(target);
        const radius = offset.length();
        const startAlpha = Number.isFinite(spin.rotationY)
          ? spin.rotationY
          : Math.atan2(offset.x, offset.z);
        const beta = getOrbitBeta(spin, offset, radius);
        const turnProgress = orbitSpinT / (spin.durationSeconds || 10);

        orbitCam.setTarget(target);
        orbitCam.radius = radius;
        orbitCam.beta = beta;
        orbitCam.alpha = startAlpha + turnProgress * Math.PI * 2 * (spin.rotationTurns || 1);
      }

      if (orbitSpinT >= (spin?.durationSeconds || 10)) {
        finishOrbitSpin();
      }

      return;
    }

    if (isActive()) {
      if (shouldLockPlayerPose()) {
        lockPlayerToGuideDialogPose();
      }

      if (!dialogPaused) {
        updateBubblePosition();
        updateGuideGaze(dt);
        updateDialogCamera(dt);
        updateDialogTyping(dt);

        if (state === GUIDE_STATE.DIALOG) {
          updateGuideTalkingAnimation(dt);
        }

        if (state === GUIDE_STATE.CLOSING_ANIM) {
          updateClosingAnim(dt);
        }
      }
    } else if (state === GUIDE_STATE.IDLE) {
      updateGuideIdleDance(dt);
    }
  }

  function handleSpacePress() {
    if (!getWalkMode() || spaceLatch) {
      return isActive();
    }

    if (isActive()) {
      if (state === GUIDE_STATE.DIALOG) {
        const line = getCurrentLine();
        const fullText = line?.ko || "";

        if (typedChars < fullText.length && ui.textEl) {
          typedChars = fullText.length;
          ui.textEl.textContent = fullText;
        }
      }

      return true;
    }

    const guest = guideGuest;
    const body = getPlayerBody();

    if (!guest?.root || !body?.position) {
      return false;
    }

    const dist = horizontalDistance(
      body.position,
      guest.root.getAbsolutePosition()
    );

    if (dist > (tourData?.interactionDistance ?? 2)) {
      return false;
    }

    spaceLatch = true;

    if (tourCompleted) {
      showChoice(
        tourData?.restartTourPrompt || {
          ko: "GUIDE 투어를 다시 시작하시겠습니까?",
          en: "Would you like to start the GUIDE tour again?"
        },
        () => {
          tourCompleted = false;
          tourStarted = false;
          eventIndex = 0;
          lineIndex = 0;
          dialogPaused = false;
          captureDialogCameraState();
          clearKeysAndBlockInput(true);
          resetDialogLookOffsets();
          applyGuideTransform(getEvents()[0]);
          showLine(getCurrentLine());
          setState(GUIDE_STATE.DIALOG);
        },
        () => {
          setState(GUIDE_STATE.IDLE);
        }
      );
      return true;
    }

    if (!tourStarted) {
      eventIndex = 0;
      lineIndex = 0;
      dialogPaused = false;
      captureDialogCameraState();
      clearKeysAndBlockInput(true);
      resetDialogLookOffsets();
      applyGuideTransform(getEvents()[0]);
      showLine(getCurrentLine());
      setState(GUIDE_STATE.DIALOG);
    }

    return true;
  }

  function handleSpaceRelease() {
    spaceLatch = false;
  }

  function resumeEscDialog() {
    dialogPaused = false;
    eventIndex = escResumeEventIndex;
    lineIndex = escResumeLineIndex;

    if (escResumeState === GUIDE_STATE.ORBIT_SPIN) {
      resumeOrbitFromEsc();
      return;
    }

    if (escResumeState === GUIDE_STATE.CHOICE) {
      const line = getEvents()[eventIndex]?.dialogues?.[lineIndex];

      if (line?.startTourChoice && !tourStarted) {
        showChoice(
          { ko: line.ko, en: line.en },
          () => acceptTourChoice(),
          () => declineAndReset()
        );
        return;
      }
    }

    showLine(getCurrentLine());
    setState(GUIDE_STATE.DIALOG);
  }

  function handleEscape() {
    if (!isActive() || state === GUIDE_STATE.ESC_CHOICE) {
      return false;
    }

    escResumeEventIndex = eventIndex;
    escResumeLineIndex = lineIndex;
    escResumeState = state;
    dialogPaused = true;

    if (state === GUIDE_STATE.ORBIT_SPIN) {
      pauseOrbitForEsc();
    }

    const prompt = tourData?.escPrompt;

    hideUi();

    const escLabels = tourData?.escChoiceLabels || {};

    showChoice(
      prompt,
      () => {
        exitGuideTourToTourEntry();
      },
      () => {
        resumeEscDialog();
      },
      {
        primaryLabel: escLabels.stop || "중지 / Stop",
        secondaryLabel: escLabels.continue || "계속 / Continue",
        choiceState: GUIDE_STATE.ESC_CHOICE
      }
    );
    pendingChoice = "esc";
    return true;
  }

  function dispose() {
    hideUi();
    dialogPaused = false;
    savedOrbitPause = null;
    clearClosingAnimObserver();
    clearOrbitPauseState();
    restoreDialogCameraState();
    clearKeysAndBlockInput(false);
    setState(GUIDE_STATE.IDLE);
  }

  function reloadTourData(nextData) {
    if (!nextData) {
      return false;
    }

    tourData = normalizeTourData(nextData);

    if (isActive()) {
      return false;
    }

    eventIndex = 0;
    lineIndex = 0;
    tourStarted = false;
    tourCompleted = false;
    positionGuideNpcOnly(getGuideSpawnEvent());
    playGuideClip("Idle", true);
    return true;
  }

  function previewEventTransform(eventIndex) {
    const event = getEvents()[eventIndex];

    if (!event) {
      return false;
    }

    positionGuideNpcOnly(event);
    return true;
  }

  function captureGuideTransform() {
    const guest = guideGuest;

    if (!guest?.root) {
      return null;
    }

    return {
      x: guest.root.position.x,
      y: guest.root.position.y,
      z: guest.root.position.z,
      rotationY: guest.root.rotation.y
    };
  }

  function getTourDataSnapshot() {
    return tourData ? JSON.parse(JSON.stringify(tourData)) : null;
  }

  return {
    init,
    update,
    isActive,
    blocksPlayerControl,
    allowsFreeLook,
    applyLookInput,
    reloadTourData,
    previewEventTransform,
    captureGuideTransform,
    getTourDataSnapshot,
    handleSpacePress,
    handleSpaceRelease,
    handleEscape,
    dispose,
    ensureGuideSpawned,
    syncGuideNightVisibility
  };
}
