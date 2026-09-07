/**
 * Angji GUIDE scripted tour — separate from generic NPC dialog (multi-line bubbles).
 */

import { ANGJI_GUIDE_SPAWN, loadAngjiGuideTourData } from "./angji-guide-tour-config.js?v=line-hold-0-20260906";
import { getGuestHeadLocalY, projectWorldPointToScreen, getGuestDialogAnchorWorldPosition, setGuestDevLabelVisible } from "./guest-dev-label.js?v=guide-label-20260905";
import { findOrbitSequence, normalizeTourData, IDLE_DANCE_RANDOM_VALUE } from "./angji-guide-tour-data.js?v=restore-common-dialogues-20260907";
import { getVoiceVolume, subscribeAudioSettings } from "./metaverse-audio-settings.js?v=audio-mute-20260906";
import {
  estimateSpeechRateForDuration,
  loadTtsPrefs,
  speakTextWithPrefs,
  stopSpeechTts
} from "./editor-mode/speech-tts.js?v=guide-tts-sync-20260906";

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

function tintGuideMeshes(_BABYLON, _guest) {
  // Keep guide materials as authored. The previous green emissive/diffuse mix
  // read as a circulating green outline around the Guide NPC.
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
  let guideLineSpeechToken = 0;
  let guideLineSpeechDone = true;
  const unsubscribeAudioSettings = subscribeAudioSettings((settings) => {
    if (settings?.voiceMuted) {
      stopGuideLineSpeech();
    }
  });
  let guideSpawnPoseLocked = false;
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
  let activeOrbitSpin = null;
  let orbitPreview = null;
  let orbitCenterMesh = null;
  let orbitCenterGizmoManager = null;
  let orbitCenterDragObserver = null;
  let onOrbitCenterChanged = null;
  const DEFAULT_ORBIT_CENTER = { x: -10.54, y: 50, z: 16.37 };
  const LINE_TRANSITION_DELAY_MS = 140;
  const EVENT_DIALOG_START_DELAY_MS = 1000;
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
  let talkingClipIndex = 0;
  let talkingCurrentClipName = null;
  let talkingFadeOutGroup = null;
  let talkingFadeOutT = 0;
  let dialogViewYaw = 0;
  let dialogViewPitch = 0;
  let idleDanceIdleT = 0;
  let idleDancePlaying = false;
  let idleDanceReturning = false;
  let idleDanceHome = null;
  let idleDanceEndObserver = null;
  const GUIDE_DANCE_RETURN_ARRIVE_DISTANCE = 0.15;
  const GUIDE_DANCE_RETURN_SPEED = 0.075;
  const GUIDE_DANCE_RETURN_CLIP_CANDIDATES = [
    "Walking",
    "Walk",
    "WALKING",
    "Running",
    "Run",
    "Run_Fast"
  ];

  const DIALOG_LOOK_MIN_PITCH = -Math.PI * 0.45;
  const DIALOG_LOOK_MAX_PITCH = Math.PI * 0.45;

  function clearIdleDanceObserver() {
    idleDanceEndObserver?.remove?.();
    idleDanceEndObserver = null;
  }

  function resetIdleDanceTimer() {
    idleDanceIdleT = 0;
  }

  /**
   * Some Dance_* clips leave travel on Idle/hips carriers while guest.root (and the
   * GUIDE label parented to it) stay put. Pin carriers + strip hips so mesh and
   * label share one transform again. Optionally bake carrier XZ into the root
   * first (walk-home start) so authored dance travel is not discarded.
   */
  function pinGuideVisualToRoot(guest = guideGuest) {
    if (!guest?.root) {
      return;
    }

    guest.rootMotionNeutralizer?.neutralize?.({
      pinNodes: true,
      resetBones: true,
      syncSample: true
    });
    guest.rootMotionNeutralizer?.resetRootMotionSample?.();
    guest.rootMotionLockUntil = 0;
  }

  function bakeGuideCarrierTravelIntoRoot(guest = guideGuest) {
    if (!guest?.root) {
      return;
    }

    const root = guest.root;
    const carrier = guest.rootMotionNeutralizer?.getPlanarCarrierWorldPosition?.();

    if (!carrier || typeof root.computeWorldMatrix !== "function") {
      return;
    }

    root.computeWorldMatrix(true);
    const rootWorld = root.getAbsolutePosition?.() || root.position;
    const dx = carrier.x - rootWorld.x;
    const dz = carrier.z - rootWorld.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= 0.05) {
      return;
    }

    root.position.x += dx;
    root.position.z += dz;

    const floorY = snapGuideRootFloorY(root.position.x, root.position.z, root.position.y);

    if (Number.isFinite(floorY)) {
      root.position.y = floorY;
    }
  }

  function resyncGuideVisualToRoot(guest = guideGuest) {
    bakeGuideCarrierTravelIntoRoot(guest);
    pinGuideVisualToRoot(guest);
  }

  function clearIdleDanceState() {
    const shouldRestoreHome = Boolean(
      idleDanceHome
      && guideGuest?.root
      && (idleDancePlaying || idleDanceReturning)
    );
    const home = idleDanceHome;

    clearIdleDanceObserver();
    idleDancePlaying = false;
    idleDanceReturning = false;
    idleDanceHome = null;
    resetIdleDanceTimer();

    if (shouldRestoreHome && home && guideGuest?.root) {
      guideGuest.root.position.set(home.x, home.y, home.z);
      guideGuest.root.rotation.y = home.rotationY;
      // Snap mesh to home root — do not bake carrier travel (that would undo home).
      pinGuideVisualToRoot(guideGuest);
    }
  }

  function captureIdleDanceHome() {
    const guest = guideGuest;

    if (!guest?.root) {
      idleDanceHome = null;
      return;
    }

    idleDanceHome = {
      x: guest.root.position.x,
      y: guest.root.position.y,
      z: guest.root.position.z,
      rotationY: guest.root.rotation.y
    };
  }

  function resolveIdleDanceReturnClipName() {
    const groups = guideGuest?.animationGroups || [];

    for (const clipName of GUIDE_DANCE_RETURN_CLIP_CANDIDATES) {
      if (resolveGuideClipGroup(groups, clipName)) {
        return clipName;
      }
    }

    return null;
  }

  function completeIdleDanceReturn() {
    const guest = guideGuest;
    const home = idleDanceHome;

    idleDanceReturning = false;
    idleDancePlaying = false;
    clearIdleDanceObserver();

    if (guest?.root && home) {
      guest.root.position.set(home.x, home.y, home.z);
      guest.root.rotation.y = home.rotationY;
      pinGuideVisualToRoot(guest);
    }

    idleDanceHome = null;
    resetIdleDanceTimer();

    if (state === GUIDE_STATE.IDLE) {
      playGuideClip("Idle", true);
    }
  }

  function beginIdleDanceReturn() {
    const guest = guideGuest;
    const home = idleDanceHome;

    if (state !== GUIDE_STATE.IDLE || !guest?.root || !home) {
      completeIdleDanceReturn();
      return;
    }

    // Mesh may have drifted off guest.root during dance — fold that travel into root
    // before measuring walk-home distance, so GUIDE label and body stay together.
    resyncGuideVisualToRoot(guest);

    const dx = home.x - guest.root.position.x;
    const dz = home.z - guest.root.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= GUIDE_DANCE_RETURN_ARRIVE_DISTANCE) {
      completeIdleDanceReturn();
      return;
    }

    idleDanceReturning = true;
    const clipName = resolveIdleDanceReturnClipName();

    if (!clipName || !playGuideClip(clipName, true)) {
      completeIdleDanceReturn();
    }
  }

  function updateIdleDanceReturn(dt) {
    if (!idleDanceReturning || state !== GUIDE_STATE.IDLE) {
      return;
    }

    const guest = guideGuest;
    const home = idleDanceHome;

    if (!guest?.root || !home) {
      completeIdleDanceReturn();
      return;
    }

    const position = guest.root.position;
    const dx = home.x - position.x;
    const dz = home.z - position.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= GUIDE_DANCE_RETURN_ARRIVE_DISTANCE) {
      completeIdleDanceReturn();
      return;
    }

    // Match guest dance-return pacing (≈0.075 units/frame at 60fps).
    const step = GUIDE_DANCE_RETURN_SPEED * Math.min(Math.max(dt * 60, 0.001), 2);
    const move = Math.min(step, distance);
    const inv = 1 / distance;
    position.x += dx * inv * move;
    position.z += dz * inv * move;

    const floorY = snapGuideRootFloorY(position.x, position.z, position.y);

    if (Number.isFinite(floorY)) {
      position.y = floorY;
    }

    guest.root.rotation.y = Math.atan2(dx, dz);
    pinGuideVisualToRoot(guest);
  }

  function getIdleDanceClips() {
    const selection = String(tourData?.idleDanceClip || "").trim();

    // Fixed single clip from the editor dropdown.
    if (selection && selection !== IDLE_DANCE_RANDOM_VALUE) {
      return [selection];
    }

    // Random: prefer guest clips whose names start with "Dance".
    const groups = guideGuest?.animationGroups || [];
    const danceNamed = groups
      .map((group) => group.name)
      .filter((name) => /^Dance/i.test(String(name || "").trim()));

    if (danceNamed.length) {
      return [...new Set(danceNamed)];
    }

    // Fallback pool (authored list / defaults).
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

    if (state === GUIDE_STATE.IDLE) {
      beginIdleDanceReturn();
      return;
    }

    idleDanceReturning = false;
    idleDanceHome = null;
    resetIdleDanceTimer();
  }

  function attachIdleDanceEndHandler() {
    clearIdleDanceObserver();

    const group = guideGuest?.activeAnimationGroup;

    if (!group) {
      finishIdleDance();
      return;
    }

    idleDanceEndObserver = group.onAnimationGroupEndObservable.add(() => {
      if (state !== GUIDE_STATE.IDLE || !idleDancePlaying || idleDanceReturning) {
        return;
      }

      finishIdleDance();
    });
  }

  function startIdleDance() {
    if (state !== GUIDE_STATE.IDLE || !guideGuest || idleDancePlaying || idleDanceReturning) {
      return;
    }

    const clipName = pickRandomIdleDanceClip();

    if (!clipName) {
      resetIdleDanceTimer();
      return;
    }

    captureIdleDanceHome();
    idleDancePlaying = true;
    idleDanceReturning = false;
    resetIdleDanceTimer();

    if (!playGuideClip(clipName, false)) {
      idleDancePlaying = false;
      idleDanceHome = null;
      resetIdleDanceTimer();
      return;
    }

    attachIdleDanceEndHandler();
  }

  function updateIdleDancePlayback() {
    if (!idleDancePlaying || idleDanceReturning || state !== GUIDE_STATE.IDLE) {
      return;
    }

    const group = guideGuest?.activeAnimationGroup;

    if (!group?.isPlaying) {
      finishIdleDance();
    }
  }

  function updateGuideIdleDance(dt) {
    if (state !== GUIDE_STATE.IDLE || !guideGuest?.root?.isEnabled?.()) {
      if (idleDancePlaying || idleDanceReturning) {
        clearIdleDanceState();
      } else {
        resetIdleDanceTimer();
      }

      return;
    }

    if (idleDanceReturning) {
      updateIdleDanceReturn(dt);
      return;
    }

    if (idleDancePlaying) {
      updateIdleDancePlayback();
      return;
    }

    idleDanceIdleT += dt;
    const delaySeconds = Math.max(tourData?.idleDanceDelaySeconds ?? 180, 1);

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

  function pickNextTalkingClip() {
    const clips = getTalkingClips();

    if (!clips.length) {
      return "Talking01";
    }

    const index = ((talkingClipIndex % clips.length) + clips.length) % clips.length;
    const pick = clips[index];
    talkingClipIndex = (index + 1) % clips.length;
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
    talkingClipIndex = 0;
    scheduleTalkingSwitchDelay();
    playGuideTalkingClip(pickNextTalkingClip());
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
      playGuideTalkingClip(pickNextTalkingClip());
      scheduleTalkingSwitchDelay();
      return;
    }

    talkingSwitchT -= dt;

    if (talkingSwitchT <= 0) {
      playGuideTalkingClip(pickNextTalkingClip());
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

    // Closing sequence always plays one-shot clips in order.
    // Idle is no longer a special "tour complete" marker — completion happens
    // only after every selected clip has finished.
    const played = playGuideClip(clipName, false);

    if (!played) {
      return false;
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
    syncGuideHeadLabel();
  }

  function isOrbitSpinActive() {
    return state === GUIDE_STATE.ORBIT_SPIN && !dialogPaused;
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

  function stopGuideLineSpeech() {
    guideLineSpeechToken += 1;
    guideLineSpeechDone = true;
    stopSpeechTts();
  }

  function resolveLineTextSpeed(line) {
    const speed = Number(line?.textSpeed ?? tourData?.textSpeed ?? 0.035);
    return Number.isFinite(speed) && speed > 0 ? speed : 0.035;
  }

  function speakGuideLine(line) {
    const text = String(line?.ko || line?.en || "").trim();

    if (!text) {
      stopGuideLineSpeech();
      return;
    }

    // Respect 기본설정 목소리 음소거 — skip silent queued speech.
    if (getVoiceVolume() <= 0) {
      stopGuideLineSpeech();
      return;
    }

    const prefs = loadTtsPrefs();
    const typingSeconds = Math.max(text.length * resolveLineTextSpeed(line), 0.45);
    const rate = estimateSpeechRateForDuration(text, typingSeconds, {
      fallbackRate: prefs.rate
    });
    const token = ++guideLineSpeechToken;
    guideLineSpeechDone = false;

    void speakTextWithPrefs(text, prefs, { rate }).then((ok) => {
      if (token !== guideLineSpeechToken) {
        return;
      }

      // Failed / unavailable speech should not block dialogue advance.
      guideLineSpeechDone = true;
      void ok;
    });
  }

  function hideUi() {
    stopGuideLineSpeech();
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
    speakGuideLine(line);
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
        if (Number.isFinite(fallbackY) && snapped < fallbackY - 1) {
          return fallbackY;
        }

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
    // Intentionally empty — guide facing stays at authored gizmo rotation.
  }

  function allowsFreeLook() {
    // PDF 수정 #2: 설명 중 마우스 카메라 회전 비허용
    return false;
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
    // Camera lens height = world Y (카메라 Y). cameraHeight is kept as a compat alias.
    const height = Number.isFinite(spin?.position?.y)
      ? spin.position.y
      : (Number.isFinite(spin?.cameraHeight) ? spin.cameraHeight : 0);
    const target = new BABYLON.Vector3(spin.target.x, spin.target.y, spin.target.z);
    const startPos = new BABYLON.Vector3(spin.position.x, height, spin.position.z);

    return { target, startPos };
  }

  function resolveActiveOrbitSpin(preferredId) {
    return findOrbitSequence(tourData, preferredId || activeOrbitSpin?.id);
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
    const spin = activeOrbitSpin || resolveActiveOrbitSpin();

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
    orbitCam.detachControl?.();
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
    const events = getEvents();
    const candidate = events.find((event) => event.id === "00") || events[0] || null;
    const pos = candidate?.guidePosition;
    const hasWorldPosition = Number.isFinite(pos?.x)
      && Number.isFinite(pos?.y)
      && Number.isFinite(pos?.z)
      && (Math.hypot(pos.x, pos.z) >= 1 || Math.abs(pos.y) >= 1);

    if (hasWorldPosition) {
      return candidate;
    }

    return {
      guidePosition: { ...ANGJI_GUIDE_SPAWN.position },
      guideRotationY: ANGJI_GUIDE_SPAWN.rotationY
    };
  }

  function positionGuideNpcOnly(event, options = {}) {
    const guest = guideGuest;

    if (!guest?.root || !event?.guidePosition) {
      return;
    }

    // Keep the first idle placement. Outdoor guest refresh / npc overlay used to
    // re-snap the GUIDE a few seconds later onto a nearby floor hit.
    if (guideSpawnPoseLocked && options.force !== true) {
      return;
    }

    const x = event.guidePosition.x;
    const z = event.guidePosition.z;
    const fallbackY = event.guidePosition.y;
    const floorY = snapGuideRootFloorY(x, z, fallbackY, event);

    guest.root.position.set(x, floorY, z);
    guest.root.rotation.y = event.guideRotationY;
    baseGuideRotY = event.guideRotationY;
    guideSpawnPoseLocked = true;
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
    positionGuideNpcOnly(event, { force: true });
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
    typedChars = 0;
    typeAccum = 0;
    holdAccum = 0;
    resetDialogLookOffsets();
    applyGuideTransform(event);
    hideUi();
    stopGuideTalkingAnimation();
    setState(GUIDE_STATE.TELEPORT);

    if (advanceLineTimer !== null) {
      window.clearTimeout(advanceLineTimer);
      advanceLineTimer = null;
    }

    // Arrive at the next event pose, then start dialogue after a short beat.
    advanceLineTimer = window.setTimeout(() => {
      advanceLineTimer = null;

      if (eventIndex !== index || dialogPaused) {
        return;
      }

      if (state !== GUIDE_STATE.TELEPORT && state !== GUIDE_STATE.DIALOG) {
        return;
      }

      setState(GUIDE_STATE.DIALOG);
      showLine(getCurrentLine());
    }, EVENT_DIALOG_START_DELAY_MS);
  }

  function isGuideGuestReady(guest = guideGuest) {
    return Boolean(
      guest?.root
      && guest.root.isDisposed?.() !== true
    );
  }

  async function ensureGuideSpawned() {
    const gcs = getGuestCharacterSystem();

    if (!gcs) {
      return guideGuest;
    }

    const liveGuest = gcs.getGuests?.()?.find((g) => g.spawn?.id === ANGJI_GUIDE_SPAWN.id) || null;

    if (isGuideGuestReady(liveGuest)) {
      guideGuest = liveGuest;
    } else {
      guideGuest = null;
    }

    if (!guideGuest) {
      await gcs.ensureSpawned([ANGJI_GUIDE_SPAWN], { parallel: false, showOnLoad: false });
      guideGuest = gcs.getGuests?.()?.find((g) => g.spawn?.id === ANGJI_GUIDE_SPAWN.id) || null;
    }

    if (!guideGuest?.root) {
      console.warn("[angji-guide] spawn failed — Angji-Guide was not added to the scene");
      return null;
    }

    tintGuideMeshes(BABYLON, guideGuest);
    gcs.revealGuest?.(ANGJI_GUIDE_SPAWN.id);
    guideGuest.root.setEnabled(!getIsNightMode());
    gcs.refreshDevLabels?.();
    positionGuideNpcOnly(getGuideSpawnEvent());
    playGuideClip("Idle", true);
    syncGuideHeadLabel();
    console.info("[angji-guide] spawned", {
      night: getIsNightMode(),
      enabled: guideGuest.root.isEnabled(),
      x: Number(guideGuest.root.position.x.toFixed?.(2) ?? guideGuest.root.position.x),
      y: Number(guideGuest.root.position.y.toFixed?.(2) ?? guideGuest.root.position.y),
      z: Number(guideGuest.root.position.z.toFixed?.(2) ?? guideGuest.root.position.z)
    });

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

    // Same RM handoff as startGuestClip: sync sample + brief lock so the first
    // dance frames do not spike, then planar travel applies once per frame.
    guest.rootMotionNeutralizer?.endFootPlantSession?.();
    guest.solePlantActive = false;
    guest.rootMotionNeutralizer?.neutralize?.({
      pinNodes: true,
      resetBones: true,
      syncSample: true
    });
    guest.rootMotionNeutralizer?.resetRootMotionSample?.();
    guest.rootMotionLockUntil = performance.now() + 80;

    if (!/dance/i.test(String(clipName || ""))) {
      guest._recaptureFootPlant = true;
      guest._smoothFootPlantEnter = true;
    }

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
    syncGuideHeadLabel();
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
    positionGuideNpcOnly(getGuideSpawnEvent(), { force: true });
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

  function snapDialogCameraToGuide() {
    const camera = getActiveCamera();
    const guest = guideGuest;
    const body = getPlayerBody();

    if (!camera || !guest?.root || !body?.position) {
      return false;
    }

    const { lookTarget, cam: desired } = resolveDialogCameraFraming(guest, body.position);

    camera.position.copyFrom(desired);
    camera.setTarget(computeDialogLookTarget(camera.position, lookTarget));
    dialogCameraFrozen = true;
    frozenDialogCameraPos = desired.clone();
    frozenDialogLookTarget = lookTarget.clone();
    cameraBlend = 1;
    resetDialogLookOffsets();
    return true;
  }

  function advanceLine(options = {}) {
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

    if (advanceLineTimer !== null) {
      window.clearTimeout(advanceLineTimer);
      advanceLineTimer = null;
    }

    const showNextLine = () => {
      if (state === GUIDE_STATE.DIALOG) {
        showLine(getCurrentLine());
      }
    };

    if (options.showImmediately) {
      showNextLine();
      return;
    }

    advanceLineTimer = window.setTimeout(() => {
      advanceLineTimer = null;
      showNextLine();
    }, LINE_TRANSITION_DELAY_MS);
  }

  function updateGuideGaze(dt) {
    const guest = guideGuest;
    const event = getCurrentEvent();

    if (
      !guest?.root
      || !event
      || (
        state !== GUIDE_STATE.DIALOG
        && state !== GUIDE_STATE.CLOSING_ANIM
        && state !== GUIDE_STATE.TELEPORT
      )
      || dialogPaused
    ) {
      return;
    }

    const targetYaw = Number.isFinite(event.guideRotationY)
      ? event.guideRotationY
      : baseGuideRotY;
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
    closingAnimQueue = (
      tourData?.closingAnimations?.length
        ? tourData.closingAnimations
        : (event?.closingAnimations || ["Greeting_bow", "Greeting_Hand", "Idle"])
    );
    closingAnimIndex = 0;
    hideUi();
    setState(GUIDE_STATE.CLOSING_ANIM);

    if (!playClosingClipAt(0)) {
      advanceClosingAnimStep();
    }
  }

  function startOrbitSpin(sequenceId) {
    const orbitCam = getOrbitCamera();
    const line = getCurrentLine();
    const preferredId = sequenceId
      || line?.postEvent?.checkpointId
      || (line?.orbitAfter ? "orbit_spin" : null);
    const spin = resolveActiveOrbitSpin(preferredId);

    if (!orbitCam || !spin) {
      advanceLine();
      return;
    }

    captureDialogCameraState();
    activeOrbitSpin = spin;

    const { target, startPos } = getOrbitVectors(spin);
    const offset = startPos.subtract(target);
    const radius = offset.length();

    orbitCam.setTarget(target);
    orbitCam.radius = radius;
    orbitCam.beta = getOrbitBeta(spin, offset, radius);
    orbitCam.alpha = Number.isFinite(spin.rotationY)
      ? spin.rotationY
      : Math.atan2(offset.x, offset.z);
    orbitCam.detachControl?.();
    scene.activeCamera = orbitCam;
    orbitSpinT = 0;
    hideUi();
    stopGuideTalkingAnimation();
    setState(GUIDE_STATE.ORBIT_SPIN);
    onStatus?.(`주변을 둘러보는 중… (${spin.name || spin.id})`);
  }

  function finishOrbitSpin() {
    const orbitCam = getOrbitCamera();
    orbitCam?.detachControl?.();
    activeOrbitSpin = null;

    const walkCam = getWalkCamera?.() || getActiveCamera();
    if (walkCam) {
      scene.activeCamera = walkCam;
    }

    dialogCameraFrozen = false;
    frozenDialogCameraPos = null;
    frozenDialogLookTarget = null;
    savedWalkCameraState = null;
    savedCameraController = null;

    applyGuideTransform(getCurrentEvent());
    const body = getPlayerBody();
    const character = getPlayerCharacter();
    character?.syncFromPlayerEye?.(body?.position);
    character?.updateVisual?.(0, false);

    advanceLine({ showImmediately: true });
    snapDialogCameraToGuide();
    onStatus?.(null);
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

  function isGuideHeadLabelVisible() {
    const guest = guideGuest;

    // Hide only after the player accepts the start-tour YES choice (`tourStarted`).
    // Restore when the tour ends, is declined, or is stopped mid-way (ESC → Stop).
    return !getIsNightMode()
      && guest?.root?.isEnabled?.() !== false
      && !tourStarted;
  }

  function syncGuideHeadLabel() {
    const guest = guideGuest;

    if (!guest) {
      return;
    }

    setGuestDevLabelVisible(guest, isGuideHeadLabelVisible());
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

    if (dialogCameraFrozen && frozenDialogCameraPos && frozenDialogLookTarget) {
      camera.position.copyFrom(frozenDialogCameraPos);
      camera.setTarget(computeDialogLookTarget(camera.position, frozenDialogLookTarget));
      return;
    }

    camera.position.copyFrom(desired);
    camera.setTarget(computeDialogLookTarget(camera.position, lookTarget));

    if (cameraBlend >= 1) {
      dialogCameraFrozen = true;
      frozenDialogCameraPos = desired.clone();
      frozenDialogLookTarget = lookTarget.clone();
    }
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
    const speed = resolveLineTextSpeed(line);

    if (typedChars < fullText.length) {
      typeAccum += dt;

      while (typeAccum >= speed && typedChars < fullText.length) {
        typeAccum -= speed;
        typedChars += 1;
      }

      if (ui.textEl) {
        ui.textEl.textContent = fullText.slice(0, typedChars);
      }
    } else if (!guideLineSpeechDone) {
      // Keep the line up until voice catches typing duration / finishes.
      return;
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

    if (!group.isPlaying) {
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
      void ensureGuideSpawned().then((guest) => {
        if (guest?.root) {
          syncGuideNightVisibility(getIsNightMode());
        }
      });
      return;
    }

    guideGuest.root.setEnabled(true);
    getGuestCharacterSystem()?.revealGuest?.(ANGJI_GUIDE_SPAWN.id);
    positionGuideNpcOnly(getGuideSpawnEvent(), { force: true });
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
    if (!tourData) {
      return;
    }

    if (orbitPreview) {
      const spin = orbitPreview.spin;
      const orbitCam = getOrbitCamera();
      orbitPreview.t += dt;

      if (orbitCam && spin) {
        const { target, startPos } = getOrbitVectors(spin);
        const offset = startPos.subtract(target);
        const radius = Math.max(offset.length(), 1);
        const startAlpha = Number.isFinite(spin.rotationY)
          ? spin.rotationY
          : Math.atan2(offset.x, offset.z);
        const beta = getOrbitBeta(spin, offset, radius);
        const turnProgress = orbitPreview.t / (spin.durationSeconds || 10);

        orbitCam.setTarget(target);
        orbitCam.radius = radius;
        orbitCam.beta = beta;
        orbitCam.alpha = startAlpha + turnProgress * Math.PI * 2 * (spin.rotationTurns || 1);
        scene.activeCamera = orbitCam;
      }

      if (orbitPreview.t >= (spin?.durationSeconds || 10)) {
        finishOrbitPreview({
          restore: true,
          message: `오르빗 미리보기 완료: ${spin?.name || spin?.id || ""}`
        });
      }
    }

    if (!getWalkMode()) {
      return;
    }

    if (state === GUIDE_STATE.ORBIT_SPIN && !dialogPaused) {
      lockPlayerToGuideDialogPose();

      const spin = activeOrbitSpin || resolveActiveOrbitSpin();
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
    if (orbitPreview) {
      stopOrbitPreview({ restore: true, message: "오르빗 미리보기를 취소했습니다." });
      return true;
    }

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

    const prompt = tourData?.escPrompt || {
      ko: "투어에서 빠져나가시겠습니까?",
      en: "Would you like to leave the tour?"
    };

    hideUi();

    showChoice(
      prompt,
      () => {
        pendingChoice = null;
        exitGuideTourToTourEntry();
      },
      () => {
        pendingChoice = null;
        resumeEscDialog();
      },
      {
        primaryLabel: tourData?.escChoiceLabels?.stop || "예 / Yes",
        secondaryLabel: tourData?.escChoiceLabels?.continue || "아니오 / No",
        choiceState: GUIDE_STATE.ESC_CHOICE
      }
    );
    pendingChoice = "esc";
    return true;
  }

  function dispose() {
    unsubscribeAudioSettings?.();
    hideUi();
    dialogPaused = false;
    savedOrbitPause = null;
    orbitPreview = null;
    activeOrbitSpin = null;
    hideOrbitCenterGizmo();

    if (orbitCenterGizmoManager) {
      orbitCenterGizmoManager.dispose();
      orbitCenterGizmoManager = null;
    }

    if (orbitCenterMesh && !orbitCenterMesh.isDisposed?.()) {
      orbitCenterMesh.dispose();
    }

    orbitCenterMesh = null;
    orbitCenterDragObserver = null;
    clearClosingAnimObserver();
    clearOrbitPauseState();
    restoreDialogCameraState();
    clearKeysAndBlockInput(false);
    setState(GUIDE_STATE.IDLE);
  }

  async function reloadTourData(nextData) {
    if (!nextData) {
      return false;
    }

    tourData = normalizeTourData(nextData);
    const tourWasActive = isActive();

    if (!tourWasActive) {
      eventIndex = 0;
      lineIndex = 0;
      tourStarted = false;
      tourCompleted = false;
    }

    await ensureGuideSpawned();
    syncGuideNightVisibility(getIsNightMode());
    return !tourWasActive;
  }

  async function previewEventTransform(eventIndex) {
    const event = getEvents()[eventIndex];

    if (!event || getIsNightMode()) {
      return false;
    }

    await ensureGuideSpawned();
    positionGuideNpcOnly(event, { force: true });
    frameOrbitCameraOnGuide();
    return true;
  }

  function frameOrbitCameraOnGuide() {
    if (getWalkMode()) {
      return;
    }

    const orbitCam = getOrbitCamera();
    const guest = guideGuest;

    if (!orbitCam || !guest?.root) {
      return;
    }

    const pos = guest.root.getAbsolutePosition();
    const target = new BABYLON.Vector3(pos.x, pos.y + 0.85, pos.z);
    const radius = 14;

    orbitCam.setTarget(target);
    orbitCam.radius = radius;
    orbitCam.beta = clamp(Number.isFinite(orbitCam.beta) ? orbitCam.beta : 0.95, 0.55, 1.2);
    scene.activeCamera = orbitCam;
  }

  function captureOrbitSpinCamera() {
    const orbitCam = getOrbitCamera();

    if (!orbitCam?.position || !orbitCam?.target) {
      return null;
    }

    const position = orbitCam.position;
    const target = orbitCam.target;

    return {
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z },
      cameraHeight: position.y,
      rotationY: Number.isFinite(orbitCam.alpha)
        ? orbitCam.alpha
        : Math.atan2(position.x - target.x, position.z - target.z)
    };
  }

  function captureOrbitCameraSnapshot(orbitCam) {
    if (!orbitCam) {
      return null;
    }

    return {
      target: orbitCam.target?.clone?.() || null,
      position: orbitCam.position?.clone?.() || null,
      alpha: orbitCam.alpha,
      beta: orbitCam.beta,
      radius: orbitCam.radius,
      activeWasOrbit: scene.activeCamera === orbitCam
    };
  }

  function restoreOrbitCameraSnapshot(snapshot) {
    const orbitCam = getOrbitCamera();

    if (!orbitCam || !snapshot) {
      return;
    }

    if (snapshot.target) {
      orbitCam.setTarget(snapshot.target);
    }

    if (Number.isFinite(snapshot.radius)) {
      orbitCam.radius = snapshot.radius;
    }

    if (Number.isFinite(snapshot.beta)) {
      orbitCam.beta = snapshot.beta;
    }

    if (Number.isFinite(snapshot.alpha)) {
      orbitCam.alpha = snapshot.alpha;
    }

    if (snapshot.position && !snapshot.target) {
      orbitCam.setPosition(snapshot.position);
    }

    if (snapshot.activeWasOrbit) {
      scene.activeCamera = orbitCam;
    }
  }

  function finishOrbitPreview(options = {}) {
    const restore = options.restore !== false;
    const snapshot = orbitPreview?.restore || null;
    orbitPreview = null;

    const orbitCam = getOrbitCamera();
    // Re-enable orbit controls after scripted preview.
    if (orbitCam && !getWalkMode()) {
      orbitCam.attachControl?.(true);
    }

    if (restore) {
      restoreOrbitCameraSnapshot(snapshot);
    }

    onStatus?.(options.message || null);
  }

  function previewOrbitSpin(spin = resolveActiveOrbitSpin(), options = {}) {
    const orbitCam = getOrbitCamera();
    const sequence = spin || resolveActiveOrbitSpin();

    if (!orbitCam || !sequence?.position || !sequence?.target || getIsNightMode()) {
      return false;
    }

    // Prefer Orbit View; walk mode still allowed for editor checks.
    if (getWalkMode() && options.requireOrbitView) {
      return false;
    }

    if (orbitPreview) {
      // Keep the original camera so a restarted preview restores to pre-preview state.
      finishOrbitPreview({ restore: true, message: null });
    }

    const normalized = {
      ...sequence,
      position: {
        x: Number(sequence.position.x) || 0,
        y: Number.isFinite(Number(sequence.position.y))
          ? Number(sequence.position.y)
          : Number(sequence.cameraHeight) || 0,
        z: Number(sequence.position.z) || 0
      },
      target: {
        x: Number(sequence.target.x) || 0,
        y: Number(sequence.target.y) || 0,
        z: Number(sequence.target.z) || 0
      },
      cameraHeight: Number.isFinite(Number(sequence.position.y))
        ? Number(sequence.position.y)
        : Number(sequence.cameraHeight) || 0,
      durationSeconds: Math.max(0.1, Number(sequence.durationSeconds) || 10),
      rotationTurns: Number(sequence.rotationTurns) || 1,
      pitchOffsetDegrees: Number.isFinite(Number(sequence.pitchOffsetDegrees))
        ? Number(sequence.pitchOffsetDegrees)
        : -12,
      rotationY: Number.isFinite(Number(sequence.rotationY)) ? Number(sequence.rotationY) : sequence.rotationY
    };

    const restore = captureOrbitCameraSnapshot(orbitCam);
    const { target, startPos } = getOrbitVectors(normalized);
    const offset = startPos.subtract(target);
    const radius = Math.max(offset.length(), 1);
    const startAlpha = Number.isFinite(normalized.rotationY)
      ? normalized.rotationY
      : Math.atan2(offset.x, offset.z);

    orbitCam.detachControl?.();
    orbitCam.setTarget(target);
    orbitCam.radius = radius;
    orbitCam.beta = getOrbitBeta(normalized, offset, radius);
    orbitCam.alpha = startAlpha;
    scene.activeCamera = orbitCam;

    if (options.animated !== false) {
      orbitPreview = {
        spin: normalized,
        t: 0,
        restore
      };
      onStatus?.(`오르빗 미리보기: ${normalized.name || normalized.id} (ESC로 취소)`);
    } else {
      orbitPreview = null;
      onStatus?.(`오르빗 카메라: ${normalized.name || normalized.id}`);
    }

    return true;
  }

  function stopOrbitPreview(options = {}) {
    if (!orbitPreview) {
      return false;
    }

    finishOrbitPreview({
      restore: options.restore !== false,
      message: options.message || "오르빗 미리보기를 취소했습니다."
    });
    return true;
  }

  function ensureOrbitCenterGizmo() {
    if (orbitCenterMesh && !orbitCenterMesh.isDisposed?.()) {
      return orbitCenterMesh;
    }

    orbitCenterMesh = BABYLON.MeshBuilder.CreateSphere("guide-orbit-center", {
      diameter: 3.2,
      segments: 12
    }, scene);
    orbitCenterMesh.isPickable = true;
    orbitCenterMesh.renderingGroupId = 1;

    const mat = new BABYLON.StandardMaterial("guide-orbit-center-mat", scene);
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.75, 1);
    mat.emissiveColor = new BABYLON.Color3(0.1, 0.45, 0.7);
    mat.alpha = 0.55;
    mat.disableLighting = true;
    orbitCenterMesh.material = mat;

    if (!orbitCenterGizmoManager) {
      orbitCenterGizmoManager = new BABYLON.GizmoManager(scene);
      orbitCenterGizmoManager.usePointerToAttachGizmos = false;
      orbitCenterGizmoManager.positionGizmoEnabled = true;
      orbitCenterGizmoManager.rotationGizmoEnabled = false;
      orbitCenterGizmoManager.scaleGizmoEnabled = false;
      orbitCenterGizmoManager.attachableMeshes = [orbitCenterMesh];
    }

    orbitCenterGizmoManager.attachToMesh(orbitCenterMesh);

    const positionGizmo = orbitCenterGizmoManager.gizmos?.positionGizmo;

    if (positionGizmo && !orbitCenterDragObserver) {
      orbitCenterDragObserver = positionGizmo.onDragEndObservable.add(() => {
        const pos = orbitCenterMesh.position;
        onOrbitCenterChanged?.({
          x: pos.x,
          y: pos.y,
          z: pos.z
        });
      });
    }

    return orbitCenterMesh;
  }

  function showOrbitCenterGizmo(target = null, options = {}) {
    const mesh = ensureOrbitCenterGizmo();
    const point = target || resolveActiveOrbitSpin()?.target || DEFAULT_ORBIT_CENTER;

    mesh.position.set(point.x, point.y, point.z);
    mesh.setEnabled(true);
    orbitCenterGizmoManager?.attachToMesh(mesh);

    if (typeof options.onChanged === "function") {
      onOrbitCenterChanged = options.onChanged;
    }

    return {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z
    };
  }

  function hideOrbitCenterGizmo() {
    onOrbitCenterChanged = null;
    orbitCenterGizmoManager?.attachToMesh(null);

    if (orbitCenterMesh && !orbitCenterMesh.isDisposed?.()) {
      orbitCenterMesh.setEnabled(false);
    }
  }

  function captureOrbitCenterFromGizmo() {
    if (!orbitCenterMesh || orbitCenterMesh.isDisposed?.() || !orbitCenterMesh.isEnabled()) {
      return null;
    }

    return {
      x: orbitCenterMesh.position.x,
      y: orbitCenterMesh.position.y,
      z: orbitCenterMesh.position.z
    };
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
    isOrbitSpinActive,
    blocksPlayerControl,
    allowsFreeLook,
    applyLookInput,
    reloadTourData,
    previewEventTransform,
    previewOrbitSpin,
    stopOrbitPreview,
    showOrbitCenterGizmo,
    hideOrbitCenterGizmo,
    captureOrbitCenterFromGizmo,
    captureOrbitSpinCamera,
    captureGuideTransform,
    getTourDataSnapshot,
    handleSpacePress,
    handleSpaceRelease,
    handleEscape,
    dispose,
    ensureGuideSpawned,
    syncGuideNightVisibility,
    isGuideHeadLabelVisible,
    syncGuideHeadLabel
  };
}
