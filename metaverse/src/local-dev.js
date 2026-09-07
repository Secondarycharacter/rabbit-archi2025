function isLoopbackHost() {
  const host = window.location.hostname;
  return !host || host === "localhost" || host === "127.0.0.1";
}

export function isLocalDevEnvironment() {
  if (isLoopbackHost()) {
    return true;
  }

  const devParam = new URLSearchParams(window.location.search).get("dev");
  return devParam === "1" || devParam === "true";
}

/** @deprecated Prefer isLoopbackHost — editor must not open via ?editor= / ?dev= on production. */
export function isEditorModeRequested() {
  return false;
}

/**
 * Editor Mode + local-only HUD tools (Debug, Character Test, Editor Mode).
 * Loopback hosts only — not unlocked by ?editor= or ?dev= on GitHub Pages.
 */
export function isEditorToolsVisible() {
  return isLoopbackHost();
}

export function applyLocalDevToolsVisibility() {
  const enabled = isEditorToolsVisible();

  document.body.classList.toggle("local-dev", enabled);
  document.body.classList.toggle("is-editor-mode", enabled);

  if (!enabled) {
    const debugPanel = document.getElementById("debugPanel");
    const editorModeButton = document.getElementById("editorModeButton");
    const guideManagerPanel = document.getElementById("guideManagerPanel");
    const npcGuestManagerPanel = document.getElementById("npcGuestManagerPanel");

    if (debugPanel) {
      debugPanel.hidden = true;
    }

    if (npcGuestManagerPanel) {
      npcGuestManagerPanel.hidden = true;
    }

    if (guideManagerPanel) {
      guideManagerPanel.hidden = true;
    }

    if (editorModeButton) {
      editorModeButton.hidden = true;
    }
  }

  return enabled;
}
