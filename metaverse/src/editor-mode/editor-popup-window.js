/**
 * Open editor UI in a separate browser window (can move to another monitor).
 */

export function computeEditorPopupFeatures(width = 1040, height = 880) {
  const gap = 16;
  let left = window.screenX + window.outerWidth + gap;
  let top = window.screenY;
  const availLeft = window.screen.availLeft || 0;
  const availWidth = window.screen.availWidth || window.innerWidth;
  const availRight = availLeft + availWidth;

  if (left + width > availRight - 8) {
    const leftOfWindow = window.screenX - width - gap;

    if (leftOfWindow >= availLeft - 8) {
      left = leftOfWindow;
    } else {
      left = availRight + gap;
    }
  }

  top = Math.max(0, top);

  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "resizable=yes",
    "scrollbars=yes"
  ].join(",");
}

export function buildEditorPopupUrl(tab = "guide") {
  const params = new URLSearchParams(window.location.search);
  const project = params.get("project") || "angji";
  const editor = params.get("editor") || "1";
  const next = new URLSearchParams();

  next.set("project", project);
  next.set("editor", editor);
  next.set("tab", tab === "guest" ? "guest" : (tab === "rlb" ? "rlb" : "guide"));
  next.set("v", "guide-orbit-github-20260903");

  return `./editor-popup.html?${next.toString()}`;
}

export function openEditorPopupWindow(tab = "guide") {
  const project = new URLSearchParams(window.location.search).get("project") || "angji";
  const popupName = `metaverse-editor-${project}`;
  const popup = window.open(
    buildEditorPopupUrl(tab),
    popupName,
    computeEditorPopupFeatures()
  );

  popup?.focus?.();
  return popup;
}
