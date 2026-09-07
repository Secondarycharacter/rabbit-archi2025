/**
 * Standalone editor popup — Guide, NPC, RLB shader (second monitor).
 */

import { createAngjiGuideManagerPanel } from "../angji-guide-manager-panel.js?v=restore-common-dialogues-20260907";
import { createNpcGuestManagerPanel } from "../npc-guest-manager-panel.js?v=guide-event-list-scroll-20260906";
import { createRlbShaderTuningPanel } from "../rlb-shader-tuning-panel.js?v=rlb-range-restore-20260907j";
import { createOpenerRpc, listenPopupUiCommands } from "./editor-popup-bridge.js?v=editor-popup-rlb-body-20260903";
import { createRlbGlowRemote } from "./editor-popup-rlb-glow.js?v=rlb-range-restore-20260907j";

const TAB = {
  GUIDE: "guide",
  GUEST: "guest",
  RLB: "rlb"
};

function getInitialTab() {
  const tab = new URLSearchParams(window.location.search).get("tab");

  if (tab === TAB.GUEST) {
    return TAB.GUEST;
  }

  if (tab === TAB.RLB) {
    return TAB.RLB;
  }

  return TAB.GUIDE;
}

function setStatus(message) {
  const statusEl = document.getElementById("editorPopupStatus");

  if (!statusEl) {
    return;
  }

  if (!message) {
    statusEl.hidden = true;
    statusEl.textContent = "";
    return;
  }

  statusEl.hidden = false;
  statusEl.textContent = message;
}

function createGuideTourSystemProxy(rpc) {
  return {
    captureGuideTransform: () => rpc.call("captureGuideTransform"),
    captureOrbitSpinCamera: () => rpc.call("captureOrbitSpinCamera"),
    captureOrbitCenterFromGizmo: () => rpc.call("captureOrbitCenterFromGizmo"),
    showOrbitCenterGizmo: (target, options) => rpc.call("showOrbitCenterGizmo", target, options),
    hideOrbitCenterGizmo: () => rpc.call("hideOrbitCenterGizmo"),
    previewEventTransform: (index) => rpc.call("previewEventTransform", index),
    previewOrbitSpin: (spin, options) => rpc.call("previewOrbitSpin", spin, options),
    stopOrbitPreview: () => rpc.call("stopOrbitPreview"),
    reloadTourData: (data) => rpc.call("reloadTourData", data)
  };
}

async function prepareRlbTab(rlbGlowRemote, rlbPanel, available, setAvailable) {
  setAvailable(available);

  const rlbRoot = document.getElementById("rlbTuningPanel");

  if (rlbRoot) {
    rlbRoot.hidden = false;
  }

  await rlbGlowRemote.refresh();
  rlbPanel.syncVisibility?.();
  rlbPanel.openPanel?.();
}

function wireCloseButtons(...roots) {
  roots.forEach((root) => {
    root?.querySelector(".npc-manager-panel__close")?.addEventListener("click", () => {
      window.close();
    });
  });
}

function syncTabs(activeTab) {
  document.querySelectorAll("#editorPopupTabs [data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-tab") === activeTab);
  });
}

function getDocumentTitle(activeTab) {
  if (activeTab === TAB.GUEST) {
    return "Metaverse Editor — NPC";
  }

  if (activeTab === TAB.RLB) {
    return "Metaverse Editor — RLB";
  }

  return "Metaverse Editor — Guide";
}

async function bootstrap() {
  if (!window.opener || window.opener.closed) {
    document.body.innerHTML = `
      <main class="editor-popup-window__fallback">
        <h1>Metaverse Editor</h1>
        <p>메타버스 창에서 <strong>Editor Mode</strong> 버튼으로 열어주세요.</p>
      </main>
    `;
    return;
  }

  const rpc = createOpenerRpc();
  const rlbGlowRemote = createRlbGlowRemote(rpc);
  let activeTab = getInitialTab();
  let guidePanel = null;
  let guestPanel = null;
  let rlbPanel = null;

  guidePanel = createAngjiGuideManagerPanel({
    getGuideTourSystem: () => createGuideTourSystemProxy(rpc),
    canPreview: () => rpc.call("canPreview"),
    enableLiveApply: true,
    onStatus: setStatus,
    onOpenChange: () => {}
  });

  guestPanel = createNpcGuestManagerPanel({
    getInteractionSystem: () => ({
      startDialog: (guestId, options) => rpc.call("startGuestDialog", guestId, options)
    }),
    getModelGuestEntries: () => rpc.call("getModelGuestEntries"),
    canTestDialog: () => rpc.call("canTestDialog"),
    enableLiveApply: true,
    onStatus: setStatus,
    onOpenChange: () => {}
  });

  let rlbAvailable = false;

  rlbPanel = createRlbShaderTuningPanel({
    getGlowController: () => rlbGlowRemote,
    isAvailable: () => rlbAvailable,
    requestRender: () => {
      void rpc.call("requestRender");
    },
    embeddedMode: true
  });

  wireCloseButtons(guidePanel.root, guestPanel.root);

  async function showTab(tabId) {
    activeTab = tabId === TAB.GUEST
      ? TAB.GUEST
      : (tabId === TAB.RLB ? TAB.RLB : TAB.GUIDE);

    try {
      await rpc.call("editorTabChanged", activeTab);
    } catch (error) {
      console.warn("[editor-popup] parent tab sync failed", error);
    }

    guidePanel.root.hidden = activeTab !== TAB.GUIDE;
    guestPanel.root.hidden = activeTab !== TAB.GUEST;

    const rlbRoot = document.getElementById("rlbTuningPanel");

    if (rlbRoot) {
      rlbRoot.hidden = activeTab !== TAB.RLB;
    }

    if (activeTab === TAB.RLB) {
      try {
        const available = await rpc.call("isRlbTuningAvailable");

        if (!available) {
          rlbAvailable = false;
          setStatus("RLB 쉐이더는 Angji 프로젝트 + Orbit View에서 사용할 수 있습니다.");
          rlbPanel.closePanel?.();
        } else {
          setStatus("");
          await prepareRlbTab(rlbGlowRemote, rlbPanel, true, (value) => {
            rlbAvailable = value;
          });
        }
      } catch (error) {
        console.error("[editor-popup] RLB tab failed", error);
        setStatus("RLB 쉐이더 데이터를 불러오지 못했습니다.");
      }
    } else {
      rlbPanel.closePanel?.();
      setStatus("");
    }

    syncTabs(activeTab);
    document.title = getDocumentTitle(activeTab);
  }

  document.getElementById("editorPopupTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");

    if (!button) {
      return;
    }

    void showTab(button.getAttribute("data-tab"));
  });

  listenPopupUiCommands((command) => {
    if (command.action === "switchTab" && command.tab) {
      void showTab(command.tab);
    }
  });

  await Promise.all([
    guidePanel.load(),
    guestPanel.load()
  ]);

  await showTab(activeTab);

  window.addEventListener("beforeunload", () => {
    rlbPanel.closePanel?.();
    window.opener?.focus?.();
  });
}

void bootstrap().catch((error) => {
  console.error("[editor-popup] bootstrap failed", error);
  setStatus("에디터 팝업 초기화 실패");
});
