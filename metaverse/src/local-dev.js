export function isLocalDevEnvironment() {
  const host = window.location.hostname;

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return true;
  }

  const devParam = new URLSearchParams(window.location.search).get("dev");
  return devParam === "1" || devParam === "true";
}

export function applyLocalDevToolsVisibility() {
  const enabled = isLocalDevEnvironment();

  document.body.classList.toggle("local-dev", enabled);

  if (!enabled) {
    const debugPanel = document.getElementById("debugPanel");
    const rlbTuningPanel = document.getElementById("rlbTuningPanel");
    const rlbTuningToggle = document.getElementById("rlbTuningToggleButton");
    const npcGuestManagerPanel = document.getElementById("npcGuestManagerPanel");
    const npcGuestManagerButton = document.getElementById("npcGuestManagerButton");
    const guideManagerPanel = document.getElementById("guideManagerPanel");
    const guideManagerButton = document.getElementById("guideManagerButton");

    if (debugPanel) {
      debugPanel.hidden = true;
    }

    if (rlbTuningPanel) {
      rlbTuningPanel.hidden = true;
    }

    if (rlbTuningToggle) {
      rlbTuningToggle.hidden = true;
    }

    if (npcGuestManagerPanel) {
      npcGuestManagerPanel.hidden = true;
    }

    if (npcGuestManagerButton) {
      npcGuestManagerButton.hidden = true;
    }

    if (guideManagerPanel) {
      guideManagerPanel.hidden = true;
    }

    if (guideManagerButton) {
      guideManagerButton.hidden = true;
    }
  }

  return enabled;
}
