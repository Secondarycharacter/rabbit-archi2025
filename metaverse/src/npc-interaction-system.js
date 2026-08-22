/**
 * Reusable NPC interaction + dialog state machine.
 * Data-driven guests; Space near NPC starts dialog; ESC cancels anytime.
 */

import {
  getGuestDialogAnchorWorldPosition,
  getGuestHeadLocalY,
  projectWorldPointToScreen,
  updateGuestDevLabelHeight
} from "./guest-dev-label.js?v=angji-guest-labels-20260823";
import { markConversationCompleted } from "./npc-guest-data.js?v=angji-npc-korean-names-20260822";

export const NPC_INTERACTION_STATE = {
  IDLE: "IDLE",
  IN_RANGE: "IN_RANGE",
  INTERACTION_READY: "INTERACTION_READY",
  DIALOG_PREPARING: "DIALOG_PREPARING",
  MOVING_TO_POSITION: "MOVING_TO_POSITION",
  ALIGNING: "ALIGNING",
  DIALOG_CAMERA_START: "DIALOG_CAMERA_START",
  DIALOG_PLAYING: "DIALOG_PLAYING",
  DIALOG_END: "DIALOG_END",
  DIALOG_CANCEL: "DIALOG_CANCEL",
  RESET: "RESET"
};

const DIALOG_ACTIVE_STATES = new Set([
  NPC_INTERACTION_STATE.DIALOG_PREPARING,
  NPC_INTERACTION_STATE.MOVING_TO_POSITION,
  NPC_INTERACTION_STATE.ALIGNING,
  NPC_INTERACTION_STATE.DIALOG_CAMERA_START,
  NPC_INTERACTION_STATE.DIALOG_PLAYING,
  NPC_INTERACTION_STATE.DIALOG_END,
  NPC_INTERACTION_STATE.DIALOG_CANCEL,
  NPC_INTERACTION_STATE.RESET
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function shortestAngleDelta(from, to) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function dampAngle(current, target, lambda, dt) {
  return current + shortestAngleDelta(current, target) * (1 - Math.exp(-lambda * dt));
}

function horizontalDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function ensureDialogDom() {
  let bubble = document.getElementById("npcDialogBubble");
  let subtitle = document.getElementById("npcDialogSubtitle");

  if (!bubble) {
    bubble = document.createElement("div");
    bubble.id = "npcDialogBubble";
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
    subtitle.id = "npcDialogSubtitle";
    subtitle.className = "guide-dialog-subtitle";
    subtitle.hidden = true;
    document.body.appendChild(subtitle);
  }

  return {
    bubble,
    nameEl: bubble.querySelector(".guide-dialog-bubble__name"),
    textEl: bubble.querySelector(".guide-dialog-bubble__text"),
    subtitle
  };
}

function getLineHoldSeconds(line, config) {
  const base = config?.lineHoldSeconds ?? 1.0;
  const perChar = config?.lineHoldPerChar ?? 0.02;
  const maxExtra = config?.lineHoldMaxExtra ?? 3.33;
  const extra = Math.min(maxExtra, (line?.koreanText?.length || 0) * perChar);

  return base + extra;
}

export function createNpcInteractionSystem(BABYLON, scene, options = {}) {
  const {
    configs = [],
    getWalkMode = () => false,
    getPlayerEyePosition = () => null,
    getPlayerBody = () => null,
    getPlayerCharacter = () => null,
    getTpsSystem = () => null,
    getGuestById = () => null,
    getCollisionMeshes = () => [],
    resolveGroundEyeY = null,
    eyeHeight = 1.7,
    getActiveCamera = () => scene.activeCamera,
    onStatus = null,
    onConfigsChanged = null
  } = options;

  let configByGuestId = new Map();
  const ui = ensureDialogDom();

  let state = NPC_INTERACTION_STATE.IDLE;
  let activeGuestId = null;
  let activeConfig = null;
  let hoverGuestId = null;
  let hoverScale = 1;
  let hoverTargetScale = 1;
  let spaceLatch = false;
  let cancelRequested = false;
  let endedNormally = false;
  let lineIndex = 0;
  let typedChars = 0;
  let typeAccum = 0;
  let holdAccum = 0;
  let audio = null;
  let audioEnded = false;
  let alignTarget = null;
  let alignYawPlayer = 0;
  let alignYawGuest = 0;
  let cameraBlend = 0;
  let savedCamera = null;
  let savedFov = null;
  let gameplayEyePosition = null;
  let alignmentCompleted = false;
  let dialogLookTarget = new BABYLON.Vector3();
  let dialogCameraPos = new BABYLON.Vector3();
  let savedInputBlocked = false;

  function setConfigs(nextConfigs = []) {
    configByGuestId = new Map(
      (nextConfigs || [])
        .filter((config) => config?.guestId)
        .map((config) => [config.guestId, config])
    );
    onConfigsChanged?.(getConfigs());
  }

  function getConfigs() {
    return [...configByGuestId.values()];
  }

  setConfigs(configs);

  function setState(next) {
    state = next;
  }

  function isDialogBusy() {
    return DIALOG_ACTIVE_STATES.has(state);
  }

  function isActive() {
    return isDialogBusy();
  }

  function getActiveGuest() {
    return activeGuestId ? getGuestById(activeGuestId) : null;
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

  function setLabelHover(guest, scale) {
    if (!guest?.devLabel) {
      return;
    }

    guest.devLabel.interactionHoverScale = scale;
    updateGuestDevLabelHeight(guest);
  }

  function refreshHoverScales(dt) {
    const lambda = 12;
    hoverScale = damp(hoverScale, hoverTargetScale, lambda, dt);

    configByGuestId.forEach((config, guestId) => {
      const guest = getGuestById(guestId);

      if (!guest || config.hoverEffect === false) {
        return;
      }

      const target = guestId === hoverGuestId ? hoverScale : 1;
      const current = guest.devLabel?.interactionHoverScale ?? 1;
      const next = damp(current, target, lambda, dt);
      setLabelHover(guest, next);
    });
  }

  function guestCanInteract(config) {
    if (!config) {
      return false;
    }

    if (config.canInteract != null) {
      return Boolean(config.canInteract);
    }

    return Boolean(
      config.interactionEnabled
      && (config.dialogLines || []).length > 0
      && (config.repeatable || !config.conversationCompleted)
    );
  }

  function findNearestInRange(playerPos) {
    let best = null;
    let bestDist = Infinity;

    configByGuestId.forEach((config, guestId) => {
      if (!guestCanInteract(config)) {
        return;
      }

      const guest = getGuestById(guestId);

      if (!guest?.root?.isEnabled?.() || guest.isVisibleShown === false) {
        return;
      }

      const guestPos = guest.root.getAbsolutePosition();
      const dist = horizontalDistance(playerPos, guestPos);

      if (dist <= config.interactionDistance && dist < bestDist) {
        bestDist = dist;
        best = { guestId, config, guest, dist };
      }
    });

    return best;
  }

  function computeAlignTarget(playerPos, guestPos, dialogDistance) {
    const dx = playerPos.x - guestPos.x;
    const dz = playerPos.z - guestPos.z;
    const len = Math.hypot(dx, dz);

    if (len < 1e-4) {
      return {
        x: guestPos.x + dialogDistance,
        y: playerPos.y,
        z: guestPos.z
      };
    }

    const nx = dx / len;
    const nz = dz / len;
    let target = {
      x: guestPos.x + nx * dialogDistance,
      y: playerPos.y,
      z: guestPos.z + nz * dialogDistance
    };

    const collisionMeshes = getCollisionMeshes() || [];
    const meshSet = collisionMeshes instanceof Set ? collisionMeshes : new Set(collisionMeshes);

    if (meshSet.size && BABYLON?.Ray) {
      const origin = new BABYLON.Vector3(guestPos.x, guestPos.y + 0.9, guestPos.z);
      const dir = new BABYLON.Vector3(nx, 0, nz);
      const ray = new BABYLON.Ray(origin, dir, dialogDistance + 0.35);
      const hit = scene.pickWithRay?.(ray, (mesh) => (
        meshSet.has(mesh)
        && mesh.isEnabled?.() !== false
        && !mesh.metadata?.tourGuest
      ));

      if (hit?.hit && typeof hit.distance === "number" && hit.distance < dialogDistance + 0.05) {
        const safe = Math.max(0.55, hit.distance - 0.35);
        target = {
          x: guestPos.x + nx * safe,
          y: playerPos.y,
          z: guestPos.z + nz * safe
        };
      }
    }

    if (typeof resolveGroundEyeY === "function") {
      const eyeY = resolveGroundEyeY(new BABYLON.Vector3(target.x, playerPos.y, target.z));

      if (Number.isFinite(eyeY)) {
        target.y = eyeY;
      }
    }

    return target;
  }

  function hideDialogUi() {
    ui.bubble.hidden = true;
    ui.subtitle.hidden = true;
    ui.subtitle.textContent = "";

    if (ui.textEl) {
      ui.textEl.textContent = "";
    }
  }

  function stopAudio() {
    if (!audio) {
      audioEnded = true;
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }

    audio = null;
    audioEnded = true;
  }

  function playLineAudio(line) {
    stopAudio();
    audioEnded = false;

    if (!line?.voiceEnabled || !line?.audioFile) {
      audioEnded = true;
      return;
    }

    audio = new Audio(line.audioFile);
    audio.preload = "auto";
    audio.volume = clamp(line.voiceVolume ?? 1, 0, 1);
    audio.playbackRate = clamp(line.voicePlaybackSpeed ?? 1, 0.5, 2);
    audio.addEventListener("ended", () => {
      audioEnded = true;
    });
    audio.addEventListener("error", () => {
      audioEnded = true;
    });

    const playPromise = audio.play();

    if (playPromise?.catch) {
      playPromise.catch(() => {
        audioEnded = true;
      });
    }
  }

  function showLine(line) {
    if (!line) {
      return;
    }

    ui.bubble.hidden = false;
    ui.subtitle.hidden = false;

    if (ui.nameEl) {
      ui.nameEl.textContent = activeConfig?.labelId || activeConfig?.displayName || "NPC";
    }

    if (ui.textEl) {
      ui.textEl.textContent = "";
    }

    ui.subtitle.textContent = line.englishSubtitle || "";
    typedChars = 0;
    typeAccum = 0;
    holdAccum = 0;
    playLineAudio(line);
  }

  function captureGameplayEyeFromBody() {
    const body = getPlayerBody();

    if (!body?.position) {
      return;
    }

    gameplayEyePosition = {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z
    };
  }

  function restoreGameplayPose() {
    const body = getPlayerBody();
    const character = getPlayerCharacter();
    const camera = getActiveCamera();
    const cameraController = getTpsSystem()?.getCameraController?.();

    // Dialog framing reuses walkCamera as the active camera. Never snap the
    // player back to the pre-dialog orbit camera position — keep the 1.2m
    // (dialogDistance) aligned eye pose so gameplay continues from there.
    if (body?.position && gameplayEyePosition) {
      body.position.set(
        gameplayEyePosition.x,
        gameplayEyePosition.y,
        gameplayEyePosition.z
      );
      character?.syncFromPlayerEye?.(body.position);

      if (Number.isFinite(alignYawPlayer)) {
        character?.setFacingYaw?.(alignYawPlayer);
      }

      character?.updateVisual?.(0, false);
    }

    if (typeof savedFov === "number" && camera) {
      camera.fov = savedFov;
    }

    cameraController?.restoreState?.(savedCamera?.controllerState || null);
  }

  function captureCamera() {
    const camera = getActiveCamera();
    const cameraController = getTpsSystem()?.getCameraController?.();

    if (!camera) {
      savedCamera = null;
      return;
    }

    savedFov = camera.fov;
    savedCamera = {
      position: camera.position.clone(),
      rotation: camera.rotation?.clone?.() || null,
      target: camera.getTarget?.()?.clone?.() || null,
      fov: camera.fov,
      controllerState: cameraController?.captureState?.() || null
    };
  }

  function restoreCamera(instant = false) {
    void instant;
    restoreGameplayPose();
  }

  function updateBubblePosition(guest) {
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

    if (state === NPC_INTERACTION_STATE.DIALOG_PLAYING && activeConfig?.dialogLines?.[lineIndex]) {
      ui.bubble.hidden = false;
    }

    ui.bubble.style.left = `${projected.x}px`;
    ui.bubble.style.top = `${projected.y}px`;
  }

  function startDialog(guestId, startOptions = {}) {
    const config = configByGuestId.get(guestId);
    const guest = getGuestById(guestId);
    const playerPos = getPlayerEyePosition();

    if (!config || !guest || !playerPos || isDialogBusy()) {
      return false;
    }

    if (!startOptions.force && !guestCanInteract(config)) {
      return false;
    }

    if (!(config.dialogLines || []).length) {
      onStatus?.("등록된 대사가 없습니다.");
      return false;
    }

    activeGuestId = guestId;
    activeConfig = config;
    cancelRequested = false;
    endedNormally = false;
    alignmentCompleted = false;
    gameplayEyePosition = null;
    lineIndex = 0;
    hoverGuestId = guestId;
    hoverTargetScale = config.interactionScale;
    setLabelHover(guest, config.interactionScale);

    // walkCamera is shared with the TPS orbit camera. Snap it to the character
    // eye before alignment so spacing is measured from the avatar, not the lens.
    const body = getPlayerBody();
    const character = getPlayerCharacter();
    const visualPosition = character?.getVisualPosition?.();

    if (body?.position && visualPosition) {
      body.position.set(
        visualPosition.x,
        visualPosition.y + eyeHeight,
        visualPosition.z
      );
      character.syncFromPlayerEye?.(body.position);
    }

    const guestPos = guest.root.getAbsolutePosition();
    const eyeForAlign = body?.position || playerPos;
    alignTarget = computeAlignTarget(eyeForAlign, guestPos, config.dialogDistance);
    alignYawPlayer = Math.atan2(guestPos.x - alignTarget.x, guestPos.z - alignTarget.z);
    alignYawGuest = Math.atan2(alignTarget.x - guestPos.x, alignTarget.z - guestPos.z);

    clearKeysAndBlockInput(true);
    captureCamera();
    setState(NPC_INTERACTION_STATE.DIALOG_PREPARING);
    onStatus?.(startOptions.preview ? "대화 테스트 중…" : "대화 준비 중…");
    setState(NPC_INTERACTION_STATE.MOVING_TO_POSITION);
    return true;
  }

  function finishReset() {
    hideDialogUi();
    stopAudio();
    clearKeysAndBlockInput(false);
    spaceLatch = true;

    activeGuestId = null;
    activeConfig = null;
    alignTarget = null;
    savedCamera = null;
    savedFov = null;
    gameplayEyePosition = null;
    alignmentCompleted = false;
    cameraBlend = 0;
    cancelRequested = false;
    endedNormally = false;
    setState(NPC_INTERACTION_STATE.IDLE);
    onStatus?.(null);
  }

  function cancelDialog() {
    if (!isDialogBusy()) {
      return;
    }

    setState(NPC_INTERACTION_STATE.DIALOG_CANCEL);
    hideDialogUi();
    stopAudio();

    const guest = getActiveGuest();

    if (guest?.devLabel) {
      setLabelHover(guest, hoverGuestId === guest.spawn.id ? hoverTargetScale : 1);
    }

    // ESC: keep current (or aligned) spacing — never teleport to pre-dialog pose.
    if (!gameplayEyePosition) {
      captureGameplayEyeFromBody();
    }

    restoreGameplayPose();
    clearKeysAndBlockInput(false);
    setState(NPC_INTERACTION_STATE.RESET);
    finishReset();
  }

  function handleSpacePress() {
    if (!getWalkMode()) {
      return false;
    }

    if (spaceLatch) {
      return true;
    }

    if (isDialogBusy()) {
      return true;
    }

    const playerPos = getPlayerEyePosition();

    if (!playerPos) {
      return false;
    }

    const nearest = findNearestInRange(playerPos);

    if (!nearest) {
      return false;
    }

    spaceLatch = true;
    startDialog(nearest.guestId);
    return true;
  }

  function handleSpaceRelease() {
    spaceLatch = false;
  }

  function handleEscape() {
    if (!isDialogBusy()) {
      return false;
    }

    cancelDialog();
    return true;
  }

  function updateMovingToPosition(dt) {
    const body = getPlayerBody();
    const character = getPlayerCharacter();
    const guest = getActiveGuest();

    if (!body || !alignTarget || !guest) {
      cancelDialog();
      return;
    }

    const pos = body.position;
    const dx = alignTarget.x - pos.x;
    const dz = alignTarget.z - pos.z;
    const dist = Math.hypot(dx, dz);
    const speed = activeConfig.alignMoveSpeed * dt;

    if (dist <= Math.max(0.04, speed)) {
      pos.x = alignTarget.x;
      pos.z = alignTarget.z;
      pos.y = alignTarget.y;
      character?.syncFromPlayerEye?.(pos);
      captureGameplayEyeFromBody();
      alignmentCompleted = true;
      setState(NPC_INTERACTION_STATE.ALIGNING);
      return;
    }

    const inv = 1 / dist;
    pos.x += dx * inv * speed;
    pos.z += dz * inv * speed;

    if (typeof resolveGroundEyeY === "function") {
      const eyeY = resolveGroundEyeY(pos);

      if (Number.isFinite(eyeY)) {
        pos.y = eyeY;
      }
    }

    character?.syncFromPlayerEye?.(pos);
    character?.setFacingYaw?.(Math.atan2(dx, dz));
    character?.updateVisual?.(0, false);
  }

  function updateAligning(dt) {
    const character = getPlayerCharacter();
    const guest = getActiveGuest();

    if (!character || !guest) {
      cancelDialog();
      return;
    }

    const playerYaw = character.getFacingYaw?.() ?? 0;
    const nextPlayerYaw = dampAngle(playerYaw, alignYawPlayer, activeConfig.alignRotateSpeed, dt);
    character.setFacingYaw?.(nextPlayerYaw);

    const guestYaw = guest.root.rotation.y;
    guest.root.rotation.y = dampAngle(guestYaw, alignYawGuest, activeConfig.alignRotateSpeed, dt);

    const playerDone = Math.abs(shortestAngleDelta(nextPlayerYaw, alignYawPlayer)) < 0.04;
    const guestDone = Math.abs(shortestAngleDelta(guest.root.rotation.y, alignYawGuest)) < 0.04;

    if (playerDone && guestDone) {
      character.setFacingYaw?.(alignYawPlayer);
      guest.root.rotation.y = alignYawGuest;
      captureGameplayEyeFromBody();
      alignmentCompleted = true;
      cameraBlend = 0;
      setState(NPC_INTERACTION_STATE.DIALOG_CAMERA_START);
      onStatus?.("대화 시작");
    }
  }

  function resolveDialogCamera(guest, playerPos) {
    const guestPos = guest.root.getAbsolutePosition();
    const fitScale = Math.max(guest.fitScale || 1, 0.001);
    const lookLift = activeConfig.cameraLookLift ?? 0.35;
    const headY = guestPos.y + getGuestHeadLocalY(guest) * fitScale;
    const look = new BABYLON.Vector3(guestPos.x, headY - 0.15 + lookLift * 0.15, guestPos.z);
    const fromPlayer = new BABYLON.Vector3(
      playerPos.x - guestPos.x,
      0,
      playerPos.z - guestPos.z
    );

    if (fromPlayer.lengthSquared() < 1e-6) {
      fromPlayer.set(0, 0, 1);
    } else {
      fromPlayer.normalize();
    }

    const dist = clamp(
      activeConfig.dialogDistance + 0.55,
      activeConfig.cameraMinDistance,
      activeConfig.cameraMaxDistance
    );
    const cam = look.add(fromPlayer.scale(dist));
    cam.y = playerPos.y - eyeHeight + activeConfig.cameraHeight;

    return { look, cam };
  }

  function updateDialogCamera(dt) {
    const camera = getActiveCamera();
    const guest = getActiveGuest();
    const playerPos = getPlayerEyePosition();

    if (!camera || !guest || !playerPos || !savedCamera) {
      cancelDialog();
      return;
    }

    const framing = resolveDialogCamera(guest, playerPos);
    dialogLookTarget.copyFrom(framing.look);
    dialogCameraPos.copyFrom(framing.cam);

    const blendSeconds = Math.max(activeConfig.cameraBlendSeconds, 0.05);
    cameraBlend = Math.min(1, cameraBlend + dt / blendSeconds);
    const t = cameraBlend * cameraBlend * (3 - 2 * cameraBlend);

    camera.position = BABYLON.Vector3.Lerp(savedCamera.position, dialogCameraPos, t);

    if (savedCamera.target && camera.setTarget) {
      const target = BABYLON.Vector3.Lerp(savedCamera.target, dialogLookTarget, t);
      camera.setTarget(target);
    }

    if (typeof activeConfig.cameraFov === "number") {
      camera.fov = savedCamera.fov + (activeConfig.cameraFov - savedCamera.fov) * t;
    }

    if (cameraBlend >= 0.999) {
      camera.position.copyFrom(dialogCameraPos);
      camera.setTarget?.(dialogLookTarget);
      showLine(activeConfig.dialogLines[lineIndex]);
      setState(NPC_INTERACTION_STATE.DIALOG_PLAYING);
    }
  }

  function updateDialogPlaying(dt) {
    const guest = getActiveGuest();
    const line = activeConfig?.dialogLines?.[lineIndex];

    if (!guest || !line) {
      endedNormally = true;
      cameraBlend = 0;
      setState(NPC_INTERACTION_STATE.DIALOG_END);
      return;
    }

    updateBubblePosition(guest);

    const camera = getActiveCamera();
    const playerPos = getPlayerEyePosition();

    if (camera && playerPos) {
      const framing = resolveDialogCamera(guest, playerPos);
      camera.position = BABYLON.Vector3.Lerp(camera.position, framing.cam, 1 - Math.exp(-6 * dt));
      camera.setTarget?.(framing.look);
    }

    const fullText = line.koreanText || "";
    const speed = line.textSpeed ?? activeConfig.textSpeed ?? 0.0583;

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
      const hasVoice = Boolean(line.voiceEnabled && line.audioFile);
      const audioDone = !hasVoice || audioEnded;

      if (audioDone) {
        holdAccum += dt;

        if (holdAccum >= getLineHoldSeconds(line, activeConfig)) {
          lineIndex += 1;

          if (lineIndex >= (activeConfig.dialogLines?.length || 0)) {
            endedNormally = true;
            cameraBlend = 0;
            setState(NPC_INTERACTION_STATE.DIALOG_END);
          } else {
            showLine(activeConfig.dialogLines[lineIndex]);
          }
        }
      }
    }
  }

  function updateDialogEnd(dt) {
    void dt;
    hideDialogUi();
    stopAudio();

    if (endedNormally && activeGuestId && activeConfig && !activeConfig.repeatable) {
      markConversationCompleted(activeGuestId);
      const config = configByGuestId.get(activeGuestId);

      if (config) {
        config.conversationCompleted = true;
        config.canInteract = false;
      }
    }

    // Keep dialogDistance spacing; restore only TPS camera controls around that pose.
    if (!gameplayEyePosition) {
      captureGameplayEyeFromBody();
    }

    restoreGameplayPose();
    setState(NPC_INTERACTION_STATE.RESET);
    finishReset();
  }

  function updateProximity(dt) {
    if (!getWalkMode() || isDialogBusy()) {
      if (!isDialogBusy()) {
        hoverGuestId = null;
        hoverTargetScale = 1;
      }

      refreshHoverScales(dt);
      return;
    }

    const playerPos = getPlayerEyePosition();

    if (!playerPos) {
      hoverGuestId = null;
      hoverTargetScale = 1;
      refreshHoverScales(dt);
      return;
    }

    const nearest = findNearestInRange(playerPos);

    if (nearest) {
      hoverGuestId = nearest.guestId;
      hoverTargetScale = nearest.config.hoverEffect === false
        ? 1
        : nearest.config.interactionScale;
      setState(
        state === NPC_INTERACTION_STATE.IDLE || state === NPC_INTERACTION_STATE.IN_RANGE
          ? NPC_INTERACTION_STATE.INTERACTION_READY
          : state
      );

      if (state === NPC_INTERACTION_STATE.IDLE) {
        setState(NPC_INTERACTION_STATE.IN_RANGE);
      }
    } else {
      hoverGuestId = null;
      hoverTargetScale = 1;

      if (
        state === NPC_INTERACTION_STATE.IN_RANGE
        || state === NPC_INTERACTION_STATE.INTERACTION_READY
      ) {
        setState(NPC_INTERACTION_STATE.IDLE);
      }
    }

    refreshHoverScales(dt);
  }

  function update(dt) {
    if (cancelRequested) {
      cancelDialog();
      return;
    }

    if (!isDialogBusy()) {
      updateProximity(dt);
      return;
    }

    if (activeGuestId) {
      hoverGuestId = activeGuestId;
      hoverTargetScale = activeConfig?.interactionScale || 1.5;
    }

    refreshHoverScales(dt);

    switch (state) {
      case NPC_INTERACTION_STATE.MOVING_TO_POSITION:
        updateMovingToPosition(dt);
        break;
      case NPC_INTERACTION_STATE.ALIGNING:
        updateAligning(dt);
        break;
      case NPC_INTERACTION_STATE.DIALOG_CAMERA_START:
        updateDialogCamera(dt);
        break;
      case NPC_INTERACTION_STATE.DIALOG_PLAYING:
        updateDialogPlaying(dt);
        break;
      case NPC_INTERACTION_STATE.DIALOG_END:
        updateDialogEnd(dt);
        break;
      default:
        break;
    }
  }

  function dispose() {
    cancelDialog();
    hideDialogUi();
    stopAudio();
  }

  return {
    update,
    isActive,
    getState: () => state,
    handleSpacePress,
    handleSpaceRelease,
    handleEscape,
    startDialog,
    setConfigs,
    getConfigs,
    dispose,
    blocksPlayerControl: () => isDialogBusy()
  };
}
