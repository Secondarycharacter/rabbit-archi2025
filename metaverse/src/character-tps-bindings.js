/**
 * Shared TPS keyboard bindings — used by character-test arena and tour walk mode.
 */

export const CHARACTER_MOVEMENT_KEYS = [
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "shift",
  " "
];

export function getCharacterInputKey(event) {
  const codeMap = {
    KeyW: "w",
    KeyA: "a",
    KeyS: "s",
    KeyD: "d",
    KeyE: "e",
    KeyJ: "j",
    KeyP: "p",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    ShiftLeft: "shift",
    ShiftRight: "shift",
    Space: " "
  };

  return codeMap[event.code] || String(event.key || "").toLowerCase();
}

/**
 * Apply character TPS key handling (throw / dance / jump / movement).
 * Returns true when the event was consumed.
 */
export function applyCharacterTpsKeyDown(event, {
  walkMode = false,
  keys,
  tpsSystem = null,
  inputBlocked = false,
  onThrowExtra = null
} = {}) {
  const key = getCharacterInputKey(event);

  if (key === "e" && !event.repeat && walkMode && !inputBlocked) {
    event.preventDefault();
    tpsSystem?.getInputController?.()?.queueThrow();
    onThrowExtra?.();
    return true;
  }

  if (key === "p" && !event.repeat && walkMode && !inputBlocked) {
    event.preventDefault();
    tpsSystem?.getInputController?.()?.queueDance();
    return true;
  }

  if (key === " " && !event.repeat && walkMode && !inputBlocked) {
    tpsSystem?.getInputController?.()?.queueJump();
    return true;
  }

  if (key === "j" && !event.repeat && walkMode) {
    event.preventDefault();
    tpsSystem?.getInputController?.()?.queueJumpOver();
    return true;
  }

  if (CHARACTER_MOVEMENT_KEYS.includes(key)) {
    event.preventDefault();

    if (walkMode) {
      keys.add(key);
    }

    return true;
  }

  return false;
}

export function bindCharacterTpsKeyboard(targetWindow, {
  canvas,
  keys,
  getWalkMode,
  getTpsSystem,
  onClearKeys,
  onThrowExtra = null
}) {
  targetWindow.addEventListener("keydown", (event) => {
    const walkMode = Boolean(getWalkMode?.());
    const tpsSystem = getTpsSystem?.();
    const inputBlocked = walkMode && tpsSystem?.isPlayerInputBlocked?.();

    applyCharacterTpsKeyDown(event, {
      walkMode,
      keys,
      tpsSystem,
      inputBlocked,
      onThrowExtra
    });
  });

  targetWindow.addEventListener("keyup", (event) => {
    keys.delete(getCharacterInputKey(event));
  });

  targetWindow.addEventListener("blur", () => onClearKeys?.());

  targetWindow.document?.addEventListener("visibilitychange", () => {
    if (targetWindow.document.hidden) {
      onClearKeys?.();
    }
  });
}
