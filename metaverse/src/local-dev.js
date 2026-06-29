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

    if (debugPanel) {
      debugPanel.hidden = true;
    }
  }

  return enabled;
}
