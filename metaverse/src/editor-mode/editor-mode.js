/**
 * Editor Mode — popup-only shell (Guide + NPC + RLB shader).
 * PHASE 8: Orbit View guide preview + orbitSpin camera capture.
 */

import {
  loadRuntimeTourData,
  publishTourData,
  subscribeTourDataUpdates
} from "../angji-guide-tour-data.js?v=guide-orbit-github-20260903";
import {
  getDisplayNameMap,
  loadRuntimeGuestBundle,
  mergeModelGuestsIntoBundle,
  publishGuestBundle,
  resolveInteractionConfigs,
  loadConversationProgress,
  subscribeGuestBundleUpdates
} from "../npc-guest-data.js?v=npc-conversation-events-20260905";
import { isEditorToolsVisible } from "../local-dev.js?v=editor-local-only-20260907";
import {
  subscribeTourDataRemote,
  subscribeGuestBundleRemote
} from "./editor-broadcast-sync.js?v=editor-broadcast-sync-20260902";
import {
  installEditorPopupRpcBridge,
  postPopupUiCommand
} from "./editor-popup-bridge.js?v=editor-popup-20260902";
import { openEditorPopupWindow } from "./editor-popup-window.js?v=guide-orbit-github-20260903";

export const APP_MODE = {
  NORMAL: "normal",
  EDITOR: "editor"
};

export const EDITOR_TABS = {
  GUIDE: "guide",
  GUEST: "guest",
  RLB: "rlb"
};

export const EDITOR_QUERY_PARAM = "editor";

export function isEditorModeRequested() {
  // Production must not unlock Editor Mode via URL; loopback hosts only.
  return false;
}

export function isEditorModeAvailable() {
  return isEditorToolsVisible();
}

export function getAppMode(isEditorPanelOpen = false) {
  if (isEditorModeAvailable() && isEditorPanelOpen) {
    return APP_MODE.EDITOR;
  }

  return APP_MODE.NORMAL;
}

function ensureEditorModeBadge() {
  let badge = document.getElementById("editorModeBadge");

  if (badge) {
    return badge;
  }

  badge = document.createElement("div");
  badge.id = "editorModeBadge";
  badge.className = "editor-mode-badge";
  badge.hidden = true;
  badge.textContent = "EDITOR";
  document.body.appendChild(badge);
  return badge;
}

function syncEditorModeChrome(isOpen) {
  document.body.classList.toggle("is-editor-mode", isEditorModeAvailable());
  document.body.classList.toggle("is-editor-mode-active", Boolean(isOpen));

  const badge = ensureEditorModeBadge();
  badge.hidden = !isOpen;
}

export function createEditorMode(options = {}) {
  const {
    getGuideTourSystem = () => null,
    getInteractionSystem = () => null,
    getModelGuestEntries = () => [],
    getGlowController = () => null,
    getNpcSceneEditor = () => null,
    isRlbTuningAvailable = () => false,
    requestRender = () => {},
    onGuestDisplayNamesChanged = null,
    canPreview = () => false,
    canTestDialog = () => false,
    onStatus = null,
    onOpenChange = null
  } = options;

  let activeTab = EDITOR_TABS.GUIDE;
  let shellOpen = false;
  let popupWindow = null;
  let popupPollTimer = null;
  let unsubscribeTourData = null;
  let unsubscribeGuestBundle = null;
  let unsubscribeTourRemote = null;
  let unsubscribeGuestRemote = null;

  function isPopupOpen() {
    return Boolean(popupWindow && !popupWindow.closed);
  }

  function stopPopupPoll() {
    if (popupPollTimer) {
      window.clearInterval(popupPollTimer);
      popupPollTimer = null;
    }
  }

  function closeAll(options = {}) {
    shellOpen = false;
    getNpcSceneEditor()?.deactivate?.({
      force: true,
      keepEditorDraft: options.keepEditorDraft === true
    });
    syncEditorModeChrome(false);
    onOpenChange?.(false);
  }

  async function activateSceneEditor() {
    const editor = getNpcSceneEditor();

    if (!editor) {
      return false;
    }

    try {
      await editor.activate?.();
      syncEditorModeChrome(true);
      onOpenChange?.(true);
      return true;
    } catch (error) {
      console.error("[editor-mode] scene editor activate failed", error);
      onStatus?.("3D NPC 배치 에디터를 시작하지 못했습니다.");
      return false;
    }
  }

  async function syncSceneEditorForTab(tabId = activeTab) {
    activeTab = Object.values(EDITOR_TABS).includes(tabId) ? tabId : EDITOR_TABS.GUIDE;

    // Popup tabs only swap the popout panels. The in-metaverse 3D scene
    // editor (list / inspector / markers / gizmos) stays on for the session.
    return activateSceneEditor();
  }

  function startPopupPoll() {
    stopPopupPoll();
    popupPollTimer = window.setInterval(() => {
      if (!popupWindow || popupWindow.closed) {
        popupWindow = null;
        stopPopupPoll();
        closeAll();
      }
    }, 400);
  }

  function openPopoutWindow(tabId = activeTab) {
    if (!isEditorModeAvailable()) {
      return false;
    }

    activeTab = Object.values(EDITOR_TABS).includes(tabId) ? tabId : EDITOR_TABS.GUIDE;

    if (isPopupOpen()) {
      void syncSceneEditorForTab(activeTab);
      postPopupUiCommand(popupWindow, "switchTab", { tab: activeTab });
      popupWindow.focus();
      shellOpen = true;
      syncEditorModeChrome(true);
      onOpenChange?.(true);
      return true;
    }

    void syncSceneEditorForTab(activeTab);

    popupWindow = openEditorPopupWindow(activeTab);

    if (!popupWindow) {
      onStatus?.("팝업이 차단되었습니다. 3D 배치 에디터는 계속 사용할 수 있습니다.");
      shellOpen = getNpcSceneEditor()?.isActive?.() === true;
      return shellOpen;
    }

    shellOpen = true;
    syncEditorModeChrome(true);
    onOpenChange?.(true);
    startPopupPoll();
    return true;
  }

  function applyGuestRuntime(bundle) {
    const modelEntries = getModelGuestEntries() || [];
    const merged = mergeModelGuestsIntoBundle(bundle, modelEntries);
    const configs = resolveInteractionConfigs(merged, loadConversationProgress());
    getInteractionSystem()?.setConfigs?.(configs);
    onGuestDisplayNamesChanged?.(getDisplayNameMap(merged));
  }

  function bindRuntimeSync() {
    unsubscribeTourData?.();
    unsubscribeTourData = subscribeTourDataUpdates((data, meta) => {
      void getGuideTourSystem()?.reloadTourData?.(data);

      if (String(meta?.source || "").startsWith("guide-manager")) {
        getNpcSceneEditor()?.syncToursFromGuideData?.(data);
      }
    });

    unsubscribeGuestBundle?.();
    unsubscribeGuestBundle = subscribeGuestBundleUpdates((bundle) => {
      applyGuestRuntime(bundle);
    });

    unsubscribeTourRemote?.();
    unsubscribeTourRemote = subscribeTourDataRemote((data, meta) => {
      void getGuideTourSystem()?.reloadTourData?.(data);

      if (String(meta?.source || "").startsWith("guide-manager")) {
        getNpcSceneEditor()?.syncToursFromGuideData?.(data);
      }
    });

    unsubscribeGuestRemote?.();
    unsubscribeGuestRemote = subscribeGuestBundleRemote((bundle) => {
      applyGuestRuntime(bundle);
    });
  }

  function bindPopupRpcBridge() {
    installEditorPopupRpcBridge({
      captureGuideTransform: () => getGuideTourSystem()?.captureGuideTransform?.() ?? null,
      captureOrbitSpinCamera: () => getGuideTourSystem()?.captureOrbitSpinCamera?.() ?? null,
      captureOrbitCenterFromGizmo: () => getGuideTourSystem()?.captureOrbitCenterFromGizmo?.() ?? null,
      showOrbitCenterGizmo: (target, options) => getGuideTourSystem()?.showOrbitCenterGizmo?.(target, options),
      hideOrbitCenterGizmo: () => getGuideTourSystem()?.hideOrbitCenterGizmo?.(),
      previewEventTransform: (index) => getGuideTourSystem()?.previewEventTransform?.(index),
      previewOrbitSpin: (spin, options) => getGuideTourSystem()?.previewOrbitSpin?.(spin, options),
      stopOrbitPreview: () => getGuideTourSystem()?.stopOrbitPreview?.(),
      reloadTourData: (data) => getGuideTourSystem()?.reloadTourData?.(data),
      canPreview: () => canPreview(),
      canTestDialog: () => canTestDialog(),
      editorTabChanged: (tabId) => syncSceneEditorForTab(tabId),
      getModelGuestEntries: () => getModelGuestEntries() || [],
      startGuestDialog: (guestId, dialogOptions) => getInteractionSystem()?.startDialog?.(guestId, dialogOptions),
      isRlbTuningAvailable: () => isRlbTuningAvailable(),
      requestRender: () => requestRender(),
      rlbGetSnapshot: () => {
        const glow = getGlowController?.();

        if (!glow) {
          return {
            catalog: [],
            typeInfo: { counts: {}, materialNames: {} },
            tabs: ["Global"],
            tuningState: null,
            spillCounts: null
          };
        }

        const typeInfo = glow.getLightTypeInfo?.() || { counts: {}, materialNames: {} };

        try {
          return JSON.parse(JSON.stringify({
            catalog: glow.getLightCatalog?.() || [],
            typeInfo,
            tabs: glow.getPresentLightTypes?.() || ["Global"],
            tuningState: glow.getTuningState?.() || null,
            spillCounts: glow.getSpillCounts?.() || null
          }));
        } catch (error) {
          console.warn("[editor-mode] rlbGetSnapshot serialize failed", error);

          return {
            catalog: glow.getLightCatalog?.() || [],
            typeInfo,
            tabs: glow.getPresentLightTypes?.() || ["Global"],
            tuningState: null,
            spillCounts: null
          };
        }
      },
      rlbGlowInvoke: (method, args = []) => {
        const glow = getGlowController?.();

        if (!glow || typeof glow[method] !== "function") {
          return undefined;
        }

        return glow[method](...args);
      }
    });
  }

  async function init() {
    if (!isEditorModeAvailable()) {
      return null;
    }

    bindRuntimeSync();
    bindPopupRpcBridge();

    // Refresh / hard-refresh always starts in NORMAL MODE.
    // Enter Editor Mode only via the HUD button (or explicit open/toggle).
    getNpcSceneEditor()?.deactivate?.({ force: true });
    syncEditorModeChrome(false);
    onOpenChange?.(false);

    return null;
  }

  function open(tabId = activeTab) {
    if (!isEditorModeAvailable()) {
      return false;
    }

    return openPopoutWindow(tabId);
  }

  function closePopupWindow() {
    stopPopupPoll();

    if (popupWindow && !popupWindow.closed) {
      const win = popupWindow;
      popupWindow = null;

      try {
        win.close();
      } catch {
        // ignore
      }
    } else {
      popupWindow = null;
    }
  }

  function close() {
    closePopupWindow();
    closeAll();
  }

  function toggle(tabId = activeTab) {
    if (!isEditorModeAvailable()) {
      return false;
    }

    if (isPopupOpen() || getNpcSceneEditor()?.isActive?.()) {
      close();
      return true;
    }

    return openPopoutWindow(tabId);
  }

  function openTab(tabId = EDITOR_TABS.GUIDE) {
    activeTab = Object.values(EDITOR_TABS).includes(tabId) ? tabId : EDITOR_TABS.GUIDE;

    if (!isPopupOpen()) {
      return openPopoutWindow(activeTab);
    }

    void syncSceneEditorForTab(activeTab);
    postPopupUiCommand(popupWindow, "switchTab", { tab: activeTab });
    popupWindow.focus();
    shellOpen = true;
    syncEditorModeChrome(true);
    onOpenChange?.(true);
    return true;
  }

  function isOpen() {
    return shellOpen || getNpcSceneEditor()?.isActive?.() === true;
  }

  function dispose() {
    unsubscribeTourData?.();
    unsubscribeTourData = null;
    unsubscribeGuestBundle?.();
    unsubscribeGuestBundle = null;
    unsubscribeTourRemote?.();
    unsubscribeTourRemote = null;
    unsubscribeGuestRemote?.();
    unsubscribeGuestRemote = null;
    closePopupWindow();
    closeAll();
  }

  return {
    init,
    open,
    close,
    toggle,
    openTab,
    openPopoutWindow,
    isOpen,
    isPopupOpen,
    dispose,
    isAvailable: isEditorModeAvailable,
    getAppMode: () => getAppMode(isOpen()),
    loadRuntimeTourData,
    loadRuntimeGuestBundle,
    publishTourData,
    publishGuestBundle,
    getActiveTab: () => activeTab,
    EDITOR_TABS
  };
}
