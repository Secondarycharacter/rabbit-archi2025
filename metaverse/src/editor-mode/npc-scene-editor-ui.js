/**
 * Rabbit Metaverse Editor — HTML UI (NPC + Event/Teleport/Tour). PHASE 3.
 */

import {
  isSpeechTtsAvailable,
  isTtsControlElement,
  loadTtsPrefs,
  populateTtsVoiceSelect,
  readTtsPrefsFromRoot,
  saveTtsPrefs,
  speakTextWithPrefs,
  speakTextsWithPrefs,
  stopSpeechTts,
  ttsPrefsControlsHtml
} from "./speech-tts.js?v=editor-tts-preview-all-20260903";
import { normalizeNpcDialogCameraSettings } from "../npc-dialog-camera.js?v=npc-dialog-cam-lateral-20260905";

/**
 * Native <select> + overflow:auto:
 * Do NOT toggle overflow:visible on the inspector — that reflow jumps scroll
 * ("moves elsewhere") and the click falls through to the 3D canvas (NPC teleport).
 * Mid-open dropdown close is prevented via isEditingForm instead.
 */
function restoreInspectorScrollport(scrollHost) {
  if (!scrollHost) {
    return;
  }

  delete scrollHost.dataset.selectOpen;
  scrollHost.style.removeProperty("overflow");
  scrollHost.style.overflowX = "hidden";
  scrollHost.style.overflowY = "auto";
}

function captureInspectorScroll(inspectorEl) {
  const waypointList = inspectorEl?.querySelector?.(".npc-scene-editor-waypoint-list");
  return {
    inspector: Number(inspectorEl?.scrollTop) || 0,
    waypoint: waypointList ? Number(waypointList.scrollTop) || 0 : null
  };
}

function applyInspectorScroll(inspectorEl, saved) {
  if (!inspectorEl || !saved) {
    return;
  }

  inspectorEl.scrollTop = saved.inspector;
  const waypointList = inspectorEl.querySelector(".npc-scene-editor-waypoint-list");

  if (waypointList && Number.isFinite(saved.waypoint)) {
    waypointList.scrollTop = saved.waypoint;
  }

  const selected = waypointList?.querySelector("li.is-selected");
  selected?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function bindInspectorSelectGuards(root, { onIdle = null } = {}) {
  if (!root) {
    return;
  }

  root.querySelectorAll("select").forEach((select) => {
    if (select.dataset.selectOverflowFix === "1") {
      return;
    }

    select.dataset.selectOverflowFix = "1";
    const scrollHost = select.closest(
      ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-list__create"
    );

    const markOpen = () => {
      if (scrollHost) {
        scrollHost.dataset.selectOpen = "1";
      }

      document.body.dataset.npcEditorSelectOpen = "1";
      document.body.dataset.npcEditorUiGuardUntil = String(performance.now() + 800);
    };

    const markClosed = ({ notifyIdle = false } = {}) => {
      if (scrollHost) {
        delete scrollHost.dataset.selectOpen;
        restoreInspectorScrollport(scrollHost);
      }

      const focusedSelect = document.activeElement
        && String(document.activeElement.tagName || "").toLowerCase() === "select"
        && document.activeElement.closest?.(
          ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-top"
        );

      if (!focusedSelect) {
        delete document.body.dataset.npcEditorSelectOpen;
      }

      if (notifyIdle) {
        onIdle?.();
      }
    };

    const stopSceneLeak = (event) => {
      event.stopPropagation();
      markOpen();
    };

    select.addEventListener("pointerdown", stopSceneLeak, true);
    select.addEventListener("mousedown", stopSceneLeak, true);
    select.addEventListener("click", (event) => {
      event.stopPropagation();
    }, true);
    select.addEventListener("focus", markOpen);
    select.addEventListener("change", () => {
      window.setTimeout(() => {
        try {
          select.blur();
        } catch {
          // ignore
        }

        markClosed({ notifyIdle: true });
      }, 0);
    });
    select.addEventListener("blur", () => {
      window.setTimeout(() => markClosed({ notifyIdle: true }), 120);
    });
  });

  const chromeNodes = [];

  if (root.matches?.(
    ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-top, .npc-scene-editor-status"
  )) {
    chromeNodes.push(root);
  }

  root.querySelectorAll?.(
    ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-top, .npc-scene-editor-status"
  )?.forEach((node) => chromeNodes.push(node));

  chromeNodes.forEach((chrome) => {
    if (!chrome || chrome.dataset.uiPointerGuardBound === "1") {
      return;
    }

    chrome.dataset.uiPointerGuardBound = "1";
    chrome.addEventListener("pointerdown", () => {
      document.body.dataset.npcEditorUiGuardUntil = String(performance.now() + 600);
    }, true);
  });
}

/** Used by the scene editor to ignore canvas picks while UI/select is active. */
export function isNpcEditorScenePointerBlocked(event = null) {
  const guardUntil = Number(document.body.dataset.npcEditorUiGuardUntil || 0);

  if (Number.isFinite(guardUntil) && performance.now() < guardUntil) {
    return true;
  }

  if (document.body.dataset.npcEditorSelectOpen === "1") {
    return true;
  }

  const active = document.activeElement;

  if (
    active
    && ["select", "input", "textarea"].includes(String(active.tagName || "").toLowerCase())
    && active.closest?.(
      ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-top, .npc-scene-editor-status"
    )
  ) {
    return true;
  }

  if (event?.target?.closest?.(
    ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-top, .npc-scene-editor-status"
  )) {
    return true;
  }

  return false;
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "text") {
      node.textContent = value;
    } else if (value != null) {
      node.setAttribute(key, value);
    }
  });

  return node;
}

function collisionLabel(level) {
  if (level === "error") {
    return "충돌";
  }

  if (level === "warn") {
    return "주의";
  }

  return "정상";
}

function targetOptionsHtml(targets = [], selectedId = "") {
  const items = Array.isArray(targets) ? targets : [];

  if (!items.length) {
    return '<option value="">(대상 없음)</option>';
  }

  return [
    '<option value="">(선택)</option>',
    ...items.map((item) => {
      const id = String(item.id || "");
      const label = String(item.name || id);
      return `<option value="${id}"${id === selectedId ? " selected" : ""}>${label}</option>`;
    })
  ].join("");
}

function voicePreviewRowHtml(textInputNames = [], options = {}) {
  const names = (Array.isArray(textInputNames) ? textInputNames : [textInputNames])
    .map((name) => String(name || "").trim())
    .filter(Boolean);
  const label = options.label || "TTS 미리듣기";

  return `
    <div class="npc-scene-editor-voice-row">
      <button type="button" data-action="preview-tts" data-text-inputs="${names.join(",")}"${options.disabled ? " disabled" : ""}>${label}</button>
      <button type="button" data-action="stop-tts">■</button>
    </div>`;
}

function bindTtsControls(root) {
  if (!root) {
    return;
  }

  const persistPrefs = () => {
    const prefs = readTtsPrefsFromRoot(root, loadTtsPrefs());
    saveTtsPrefs(prefs);
    return prefs;
  };

  // Prevent TTS prefs from bubbling into marker/NPC field change → refreshUi.
  root.querySelectorAll("[data-tts-control], [data-tts-prefs]").forEach((node) => {
    ["change", "input", "mousedown", "pointerdown", "click"].forEach((type) => {
      node.addEventListener(type, (event) => {
        event.stopPropagation();
      });
    });
  });

  root.querySelectorAll("[data-tts-control]").forEach((node) => {
    node.addEventListener("change", async () => {
      const prefs = persistPrefs();
      // Rebuild voice list only — do not re-render the whole inspector.
      if (node.getAttribute("name") !== "ttsVoiceURI") {
        await populateTtsVoiceSelect(root, prefs);
        persistPrefs();
      }
    });
  });

  void populateTtsVoiceSelect(root, loadTtsPrefs());

  root.querySelectorAll('[data-action="stop-tts"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopSpeechTts();
    });
  });

  root.querySelectorAll('[data-action="preview-tts-all"]').forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!isSpeechTtsAvailable()) {
        window.alert("이 브라우저는 무료 TTS(Web Speech)를 지원하지 않습니다. Chrome/Edge를 사용해 주세요.");
        return;
      }

      const prefs = persistPrefs();
      const lines = [];

      // Event dialogue: prefer KO, fallback EN
      let index = 0;
      while (root.querySelector(`[name="dlgKo${index}"]`) || root.querySelector(`[name="dlgEn${index}"]`)) {
        const ko = String(root.querySelector(`[name="dlgKo${index}"]`)?.value || "").trim();
        const en = String(root.querySelector(`[name="dlgEn${index}"]`)?.value || "").trim();
        if (ko || en) {
          lines.push(ko || en);
        }
        index += 1;
      }

      // NPC dialogue
      index = 0;
      while (root.querySelector(`[name="npcDlgKo${index}"]`) || root.querySelector(`[name="npcDlgSub${index}"]`)) {
        const ko = String(root.querySelector(`[name="npcDlgKo${index}"]`)?.value || "").trim();
        const en = String(root.querySelector(`[name="npcDlgSub${index}"]`)?.value || "").trim();
        if (ko || en) {
          lines.push(ko || en);
        }
        index += 1;
      }

      // Tour script
      const scriptKo = String(root.querySelector('[name="scriptKo"]')?.value || "").trim();
      const scriptEn = String(root.querySelector('[name="scriptEn"]')?.value || "").trim();
      if (scriptKo || scriptEn) {
        lines.push(scriptKo || scriptEn);
      }

      if (!lines.length) {
        window.alert("미리들을 대본이 없습니다. KO/EN 대사를 먼저 입력해 주세요.");
        return;
      }

      const ok = await speakTextsWithPrefs(lines, prefs);
      if (!ok) {
        window.alert("TTS 미리듣기에 실패했습니다.");
      }
    });
  });

  root.querySelectorAll('[data-action="preview-tts"]').forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!isSpeechTtsAvailable()) {
        window.alert("이 브라우저는 무료 TTS(Web Speech)를 지원하지 않습니다. Chrome/Edge를 사용해 주세요.");
        return;
      }

      const prefs = persistPrefs();
      const inputNames = String(button.getAttribute("data-text-inputs") || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      let text = "";

      for (const name of inputNames) {
        const value = String(root.querySelector(`[name="${name}"]`)?.value || "").trim();

        if (value) {
          text = value;
          break;
        }
      }

      if (!text) {
        window.alert("읽을 대본(한글 또는 영어)을 먼저 입력해 주세요.");
        return;
      }

      const ok = await speakTextWithPrefs(text, prefs);

      if (!ok) {
        window.alert("TTS 재생에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  });
}

const LAYER_TITLES = {
  npc: "NPC LIST",
  event: "EVENT LIST",
  teleport: "TELEPORT LIST",
  tour: "TOUR LIST"
};

const ADD_LABELS = {
  npc: "+ ADD NPC",
  event: "+ ADD EVENT",
  teleport: "+ ADD TELEPORT",
  tour: "+ ADD TOUR"
};

export function createNpcSceneEditorUi(options = {}) {
  const {
    onSelectNpc = null,
    onFocusNpc = null,
    onTransformChange = null,
    onRotateSnap = null,
    onSave = null,
    onApplyProject = null,
    onPlayTest = null,
    onExport = null,
    onImport = null,
    onClose = null,
    onAddNpc = null,
    onDuplicateNpc = null,
    onDeleteNpc = null,
    onUndo = null,
    onRedo = null,
    onLayerChange = null,
    onMarkerFieldsChange = null,
    onNpcFieldsChange = null,
    onNpcModelChange = null,
    onNpcRandomModelChange = null,
    onNpcDialogueChange = null,
    onDialogCameraPreview = null,
    onOffsetEditModeChange = null,
    onSaveOffsetEdits = null,
    onResetOffsetEdits = null,
    onClipFineTuneChange = null,
    onClipFineTuneClipChange = null,
    onPoseFreezeChange = null,
    onSelectPatrolWaypoint = null,
    onAddPatrolWaypoint = null,
    onRemovePatrolWaypoint = null,
    onInspectorInteractionIdle = null
  } = options;

  let shell = document.getElementById("npcSceneEditorShell");
  let listEl = null;
  let inspectorEl = null;
  let statusEl = null;
  let modelSelectEl = null;
  let addBtn = null;
  let listTitleEl = null;
  let modeEl = null;
  let undoBtn = null;
  let redoBtn = null;
  let searchQuery = "";
  let lastListItems = [];
  let lastSelectedId = null;
  let lastModels = [];
  let lastHistory = { canUndo: false, canRedo: false };
  let lastCollisionById = {};
  let lastLayer = "npc";
  let lastAddOptions = [];
  let lastNeedsExport = false;
  let dirtyBadgeEl = null;

  function cacheEls() {
    listEl = shell.querySelector('[data-role="npc-list"]');
    inspectorEl = shell.querySelector('[data-role="inspector"]');
    statusEl = shell.querySelector('[data-role="status"]');
    modelSelectEl = shell.querySelector('[data-role="model-select"]');
    addBtn = shell.querySelector('[data-action="add"]');
    listTitleEl = shell.querySelector('[data-role="list-title"]');
    modeEl = shell.querySelector(".npc-scene-editor-top__mode");
    undoBtn = shell.querySelector('[data-action="undo"]');
    redoBtn = shell.querySelector('[data-action="redo"]');
    dirtyBadgeEl = shell.querySelector('[data-role="dirty-badge"]');
  }

  function ensureDom() {
    // Rebuild when PHASE 5 controls are missing (Play Test / dirty badge).
    if (
      shell
      && (
        !shell.querySelector('[data-role="layer-tabs"]')
        || !shell.querySelector('[data-action="play-test"]')
        || !shell.querySelector('[data-role="dirty-badge"]')
      )
    ) {
      shell.remove();
      shell = null;
      listEl = null;
    }

    if (shell?.querySelector('[data-action="play-test"]')) {
      cacheEls();
      return;
    }

    shell = el("div", "npc-scene-editor-shell", { id: "npcSceneEditorShell", hidden: "true" });
    shell.innerHTML = `
      <header class="npc-scene-editor-top">
        <div class="npc-scene-editor-top__brand">
          <strong>Rabbit Metaverse Editor</strong>
          <span class="npc-scene-editor-top__mode">3D 배치</span>
          <span class="npc-scene-editor-dirty" data-role="dirty-badge" hidden>미 Export</span>
        </div>
        <div class="npc-scene-editor-top__actions">
          <button type="button" data-action="undo" disabled>Undo</button>
          <button type="button" data-action="redo" disabled>Redo</button>
          <button type="button" data-action="save">임시 저장</button>
          <button type="button" data-action="play-test" class="npc-scene-editor-play-test">▶ Play Test</button>
          <button type="button" data-action="apply-project">프로젝트에 적용</button>
          <button type="button" data-action="export">프로젝트 JSON</button>
          <button type="button" data-action="import">JSON 가져오기</button>
          <button type="button" data-action="close">닫기</button>
        </div>
        <input type="file" accept="application/json,.json" data-role="import-input" hidden>
      </header>
      <aside class="npc-scene-editor-list">
        <div class="npc-scene-editor-list__head">
          <nav class="npc-scene-editor-layers" data-role="layer-tabs" aria-label="Editor layers">
            <button type="button" data-layer="npc">NPC</button>
            <button type="button" data-layer="event">Event</button>
            <button type="button" data-layer="teleport">Teleport</button>
            <button type="button" data-layer="tour">Tour</button>
          </nav>
          <h2 data-role="list-title">NPC LIST</h2>
          <input type="search" placeholder="Search" data-role="search" aria-label="Search">
          <div class="npc-scene-editor-list__create">
            <select data-role="model-select" aria-label="Create option"></select>
            <button type="button" data-action="add">+ ADD NPC</button>
          </div>
        </div>
        <ul class="npc-scene-editor-list__items" data-role="npc-list"></ul>
      </aside>
      <aside class="npc-scene-editor-inspector" data-role="inspector">
        <p class="npc-scene-editor-empty">오브젝트를 선택하세요.</p>
      </aside>
      <footer class="npc-scene-editor-status" data-role="status"></footer>
    `;

    document.body.appendChild(shell);
    cacheEls();

    shell.querySelector('[data-action="save"]')?.addEventListener("click", () => onSave?.());
    shell.querySelector('[data-action="play-test"]')?.addEventListener("click", () => onPlayTest?.());
    shell.querySelector('[data-action="apply-project"]')?.addEventListener("click", () => onApplyProject?.());
    shell.querySelector('[data-action="export"]')?.addEventListener("click", () => onExport?.());
    shell.querySelector('[data-action="import"]')?.addEventListener("click", () => {
      shell.querySelector('[data-role="import-input"]')?.click();
    });
    shell.querySelector('[data-action="close"]')?.addEventListener("click", () => onClose?.());
    undoBtn?.addEventListener("click", () => onUndo?.());
    redoBtn?.addEventListener("click", () => onRedo?.());
    addBtn?.addEventListener("click", () => {
      onAddNpc?.(modelSelectEl?.value || "");
    });

    shell.querySelector('[data-role="layer-tabs"]')?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-layer]");

      if (button) {
        onLayerChange?.(button.getAttribute("data-layer"));
      }
    });

    const importInput = shell.querySelector('[data-role="import-input"]');
    importInput?.addEventListener("change", async () => {
      const file = importInput.files?.[0];

      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        onImport?.(JSON.parse(text));
      } catch (error) {
        setStatus("JSON 가져오기 실패");
        console.error("[npc-scene-editor-ui] import failed", error);
      } finally {
        importInput.value = "";
      }
    });

    shell.querySelector('[data-role="search"]')?.addEventListener("input", (event) => {
      searchQuery = String(event.target.value || "").trim().toLowerCase();
      renderList(lastListItems, lastSelectedId, {
        models: lastModels,
        history: lastHistory,
        collisionById: lastCollisionById,
        layer: lastLayer,
        addOptions: lastAddOptions
      });
    });
  }

  function setStatus(message) {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message || "";
  }

  function setDirty(isDirty) {
    ensureDom();
    lastNeedsExport = Boolean(isDirty);

    if (dirtyBadgeEl) {
      dirtyBadgeEl.hidden = !lastNeedsExport;
    }

    if (modeEl) {
      modeEl.textContent = lastNeedsExport ? "3D 배치 · 미 Export" : "3D 배치";
    }
  }

  function renderCreateOptions(optionsList = [], layer = "npc") {
    if (!modelSelectEl) {
      return;
    }

    const previous = modelSelectEl.value;
    const items = optionsList.length ? optionsList : lastModels;
    lastAddOptions = items;
    modelSelectEl.innerHTML = items.length
      ? items.map((item) => (
        `<option value="${item.file || item.id}">${item.name || item.label || item.id}</option>`
      )).join("")
      : '<option value="">항목 없음</option>';

    if (previous && items.some((item) => (item.file || item.id) === previous)) {
      modelSelectEl.value = previous;
    }

    if (addBtn) {
      addBtn.textContent = ADD_LABELS[layer] || "+ ADD";
    }

    if (listTitleEl) {
      listTitleEl.textContent = LAYER_TITLES[layer] || "LIST";
    }

    if (modeEl) {
      modeEl.textContent = layer === "npc" ? "3D NPC 배치" : `3D ${layer} 배치`;
    }

    shell?.querySelectorAll("[data-layer]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-layer") === layer);
    });
  }

  function renderHistoryButtons(history = {}) {
    if (undoBtn) {
      undoBtn.disabled = !history.canUndo;
    }

    if (redoBtn) {
      redoBtn.disabled = !history.canRedo;
    }
  }

  function renderList(items = [], selectedId = null, meta = {}) {
    ensureDom();
    lastListItems = items;
    lastSelectedId = selectedId;
    lastModels = meta.models || lastModels;
    lastHistory = meta.history || lastHistory;
    lastCollisionById = meta.collisionById || lastCollisionById;
    lastLayer = meta.layer || lastLayer;

    renderCreateOptions(meta.addOptions || lastModels, lastLayer);
    renderHistoryButtons(lastHistory);

    if (!listEl) {
      return;
    }

    const filtered = items.filter((item) => {
      if (!searchQuery) {
        return true;
      }

      const hay = `${item.id} ${item.name} ${item.type} ${item.eventType || ""}`.toLowerCase();
      return hay.includes(searchQuery);
    });

    listEl.innerHTML = filtered.length
      ? filtered.map((item) => {
        const collision = lastCollisionById[item.id];
        const level = collision?.level || "ok";
        const metaLabel = item.eventType || item.type;
        const collisionHtml = lastLayer === "npc"
          ? `<span class="npc-scene-editor-collision-dot is-${level}" title="${collisionLabel(level)}">${collisionLabel(level)}</span>`
          : "";
        return `
        <li class="npc-scene-editor-list__item${item.id === selectedId ? " is-selected" : ""}" data-npc-id="${item.id}">
          <button type="button" class="npc-scene-editor-list__btn">${item.name || item.id}</button>
          <span class="npc-scene-editor-list__meta">${metaLabel}</span>
          ${collisionHtml}
        </li>
      `;
      }).join("")
      : `<li class="npc-scene-editor-empty">표시할 ${lastLayer}가 없습니다.</li>`;

    listEl.querySelectorAll("[data-npc-id]").forEach((row) => {
      const id = row.getAttribute("data-npc-id");
      const btn = row.querySelector("button");

      btn?.addEventListener("click", () => onSelectNpc?.(id));
      btn?.addEventListener("dblclick", () => onFocusNpc?.(id));
    });
    bindInspectorSelectGuards(shell, { onIdle: onInspectorInteractionIdle });
  }

  function transformSectionHtml(pos, rotY) {
    return `
      <section class="npc-scene-editor-section npc-scene-editor-section--compact npc-scene-editor-section--tone-transform">
        <h3>Transform</h3>
        <p class="guide-manager-hint">3D 기즈모로 이동·회전</p>
        <dl class="npc-scene-editor-fields">
          <dt>Position</dt>
          <dd>X ${Number(pos.x || 0).toFixed(2)} / Y ${Number(pos.y || 0).toFixed(2)} / Z ${Number(pos.z || 0).toFixed(2)}</dd>
          <dt>Rotation Y</dt>
          <dd>${Number(rotY || 0).toFixed(1)}°</dd>
        </dl>
      </section>
    `;
  }

  function actionButtonsHtml() {
    return `
      <div class="npc-scene-editor-actions">
        <button type="button" data-action="duplicate">Duplicate</button>
        <button type="button" data-action="delete" class="npc-scene-editor-danger">Delete</button>
      </div>
    `;
  }

  function bindActionButtons(record) {
    inspectorEl.querySelector('[data-action="duplicate"]')?.addEventListener("click", () => {
      onDuplicateNpc?.(record.id);
    });
    inspectorEl.querySelector('[data-action="delete"]')?.addEventListener("click", () => {
      onDeleteNpc?.(record.id);
    });
  }

  function renderInspector(record, collision = null, options = {}) {
    ensureDom();

    if (!inspectorEl) {
      return;
    }

    const savedScroll = captureInspectorScroll(inspectorEl);

    // Select-open unlock must not survive a re-render (that stuck overflow:visible).
    restoreInspectorScrollport(inspectorEl);

    if (!record) {
      inspectorEl.innerHTML = '<p class="npc-scene-editor-empty">오브젝트를 선택하세요.</p>';
      return;
    }

    const pos = record.transform?.position || { x: 0, y: 0, z: 0 };
    const rotY = record.transform?.rotationY ?? 0;
    const kind = record.type === "guide" ? "npc" : (record.type || "npc");
    const models = options.models || lastModels || [];
    const animationClips = options.animationClips || [];
    const displayName = options.displayName || record.name || record.id;

    if (kind === "event" || kind === "teleport" || kind === "tour") {
      const arrival = record.arrival?.position || pos;
      const connectionType = record.connection?.type || "none";
      const connectionTargets = options.connectionTargets || [];
      const teleportDestTargets = options.teleportTargets || [];
      inspectorEl.innerHTML = `
        <h2>SELECTED OBJECT</h2>
        <dl class="npc-scene-editor-fields">
          <dt>Type</dt><dd>${kind}</dd>
          <dt>ID</dt><dd>${record.id}</dd>
        </dl>
        <section class="npc-scene-editor-section">
          <label>Name <input type="text" name="markerName" value="${record.name || record.id}"></label>
          ${kind === "event" ? `
            <label>Event Type
              <select name="eventType">
                <option value="dialogue"${record.eventType === "dialogue" ? " selected" : ""}>Dialogue Trigger</option>
                <option value="game"${record.eventType === "game" ? " selected" : ""}>Game Trigger</option>
                <option value="minigame"${record.eventType === "minigame" ? " selected" : ""}>Mini Game Trigger</option>
                <option value="information"${record.eventType === "information" ? " selected" : ""}>Information Point</option>
                <option value="interaction"${record.eventType === "interaction" ? " selected" : ""}>Interaction Point</option>
              </select>
            </label>
            <label>Trigger Distance (m) <input type="number" step="0.1" name="triggerDistance" value="${Number(record.triggerDistance ?? 1.8).toFixed(1)}"></label>
            <h3>Event Connection</h3>
            <label>Connection
              <select name="connType">
                <option value="none"${connectionType === "none" ? " selected" : ""}>없음</option>
                <option value="teleport"${connectionType === "teleport" ? " selected" : ""}>Teleport</option>
                <option value="tour"${connectionType === "tour" ? " selected" : ""}>Tour Point</option>
                <option value="event"${connectionType === "event" ? " selected" : ""}>Event</option>
                <option value="npc"${connectionType === "npc" ? " selected" : ""}>NPC</option>
              </select>
            </label>
            ${connectionType !== "none" ? `
              <label>Connection Target
                <select name="connTarget">
                  ${targetOptionsHtml(connectionTargets, record.connection?.targetId || "")}
                </select>
              </label>
            ` : ""}
            <h3>Dialogue / Subtitle / Voice</h3>
            <p class="guide-manager-hint">대본을 입력한 뒤 <strong>▶ 전체 대본 미리듣기</strong> 또는 줄별 ▶ 버튼으로 확인할 수 있습니다. (무료 TTS · 파일 불필요)</p>
            ${ttsPrefsControlsHtml(loadTtsPrefs())}
            ${(record.dialogue || []).map((line, index) => `
              <div class="npc-scene-editor-dialogue-line">
                <label>KO ${index + 1} <textarea name="dlgKo${index}" rows="2">${line.ko || ""}</textarea></label>
                <label>EN ${index + 1} <input type="text" name="dlgEn${index}" value="${line.en || ""}"></label>
                <label>Subtitle ${index + 1} <input type="text" name="dlgSub${index}" value="${line.subtitle || line.en || ""}"></label>
                ${voicePreviewRowHtml([`dlgKo${index}`, `dlgEn${index}`], { label: `▶ ${index + 1}번 대본 읽기` })}
                <label class="npc-scene-editor-optional-file">Voice 파일(선택) <input type="text" name="dlgVoice${index}" value="${line.voice || ""}" placeholder="비워 두면 TTS만 사용"></label>
              </div>
            `).join("")}
            <div class="npc-scene-editor-rotate-row">
              <button type="button" data-action="add-line">+ 대사 줄</button>
              <button type="button" data-action="remove-line">줄 삭제</button>
            </div>
            ${record.eventType === "information" ? `
              <label>Info KO <textarea name="infoKo" rows="2">${record.info?.ko || ""}</textarea></label>
              <label>Info EN <input type="text" name="infoEn" value="${record.info?.en || ""}"></label>
            ` : ""}
          ` : ""}
          ${kind === "tour" ? `
            <dl class="npc-scene-editor-fields">
              <dt>Linked GUIDE</dt>
              <dd>이벤트 ${record.sourceEventId || "—"}</dd>
            </dl>
            <h3>대본 (첫 대사 동기화)</h3>
            <p class="guide-manager-hint">여기 수정하면 GUIDE 이벤트 첫 대사에 반영됩니다. 전체 대본은 좌측 Guide 에디터의 <strong>이벤트(대본관리)</strong>에서 편집하세요.</p>
            <label>한글대사 <textarea name="scriptKo" rows="3">${record.script?.ko || ""}</textarea></label>
            <label>영문대사 <textarea name="scriptEn" rows="2">${record.script?.en || ""}</textarea></label>
            ${voicePreviewRowHtml(["scriptKo", "scriptEn"], { label: "▶ 대본 미리듣기" })}
          ` : ""}
          ${kind === "teleport" ? `
            <label>Trigger Distance (m) <input type="number" step="0.1" name="triggerDistance" value="${Number(record.triggerDistance ?? 1.5).toFixed(1)}"></label>
            <h3>Arrival</h3>
            <label>Arrival X <input type="number" step="0.01" name="arrX" value="${Number(arrival.x || 0).toFixed(2)}"></label>
            <label>Arrival Y <input type="number" step="0.01" name="arrY" value="${Number(arrival.y || 0).toFixed(2)}"></label>
            <label>Arrival Z <input type="number" step="0.01" name="arrZ" value="${Number(arrival.z || 0).toFixed(2)}"></label>
            <label>Arrival Y° <input type="number" step="1" name="arrRotY" value="${Number(record.arrival?.rotationY ?? rotY).toFixed(1)}"></label>
            <label>Destination Project <input type="text" name="destProject" value="${record.destination?.projectId || ""}"></label>
            <label>Destination Point
              <select name="destPoint">
                ${targetOptionsHtml(teleportDestTargets, record.destination?.pointId || "")}
              </select>
            </label>
          ` : ""}
        </section>
        ${transformSectionHtml(pos, rotY)}
        ${actionButtonsHtml()}
      `;

      bindActionButtons(record);
      if (kind === "event" || kind === "tour") {
        bindTtsControls(inspectorEl);
      }

      const emitMarkerFields = () => {
        const patch = {
          name: inspectorEl.querySelector('[name="markerName"]')?.value
        };

        if (kind === "event") {
          patch.eventType = inspectorEl.querySelector('[name="eventType"]')?.value;
          patch.triggerDistance = Number(inspectorEl.querySelector('[name="triggerDistance"]')?.value);
          patch.connection = {
            type: inspectorEl.querySelector('[name="connType"]')?.value || "none",
            targetId: inspectorEl.querySelector('[name="connTarget"]')?.value || ""
          };
          patch.info = {
            ko: inspectorEl.querySelector('[name="infoKo"]')?.value || "",
            en: inspectorEl.querySelector('[name="infoEn"]')?.value || ""
          };
          const dialogue = [];
          let index = 0;

          while (inspectorEl.querySelector(`[name="dlgKo${index}"]`) || inspectorEl.querySelector(`[name="dlgEn${index}"]`)) {
            const en = inspectorEl.querySelector(`[name="dlgEn${index}"]`)?.value || "";
            const subtitle = inspectorEl.querySelector(`[name="dlgSub${index}"]`)?.value || "";
            dialogue.push({
              id: record.dialogue?.[index]?.id || `line_${index + 1}`,
              ko: inspectorEl.querySelector(`[name="dlgKo${index}"]`)?.value || "",
              en,
              subtitle: subtitle || en,
              voice: inspectorEl.querySelector(`[name="dlgVoice${index}"]`)?.value || ""
            });
            index += 1;
          }

          patch.dialogue = dialogue;
        }

        if (kind === "teleport") {
          patch.triggerDistance = Number(inspectorEl.querySelector('[name="triggerDistance"]')?.value);
          patch.arrival = {
            position: {
              x: Number(inspectorEl.querySelector('[name="arrX"]')?.value),
              y: Number(inspectorEl.querySelector('[name="arrY"]')?.value),
              z: Number(inspectorEl.querySelector('[name="arrZ"]')?.value)
            },
            rotationY: Number(inspectorEl.querySelector('[name="arrRotY"]')?.value)
          };
          patch.destination = {
            projectId: inspectorEl.querySelector('[name="destProject"]')?.value || "",
            pointId: inspectorEl.querySelector('[name="destPoint"]')?.value || ""
          };
        }

        if (kind === "tour") {
          patch.script = {
            ko: inspectorEl.querySelector('[name="scriptKo"]')?.value || "",
            en: inspectorEl.querySelector('[name="scriptEn"]')?.value || "",
            voice: record.script?.voice || ""
          };
        }

        onMarkerFieldsChange?.(record.id, patch);
      };

      inspectorEl.querySelectorAll("input, select, textarea").forEach((input) => {
        if (isTtsControlElement(input)) {
          return;
        }

        input.addEventListener("change", emitMarkerFields);
        input.addEventListener("input", emitMarkerFields);
      });
      inspectorEl.querySelector('[data-action="add-line"]')?.addEventListener("click", () => {
        const dialogue = [...(record.dialogue || []), {
          id: `line_${(record.dialogue || []).length + 1}`,
          ko: "",
          en: "",
          voice: "",
          subtitle: ""
        }];
        onMarkerFieldsChange?.(record.id, { dialogue });
      });
      inspectorEl.querySelector('[data-action="remove-line"]')?.addEventListener("click", () => {
        const dialogue = [...(record.dialogue || [])];
        dialogue.pop();
        onMarkerFieldsChange?.(record.id, { dialogue });
      });
      bindInspectorSelectGuards(inspectorEl, { onIdle: onInspectorInteractionIdle });
      bindFormIdleFlush(inspectorEl);
      applyInspectorScroll(inspectorEl, savedScroll);
      return;
    }

    const level = collision?.level || "ok";
    const currentModel = options.currentModelFile || record.model?.path || "";
    const animMode = String(record.animation?.mode || record.animation?.type || "loop").toLowerCase();
    const sequenceClips = Array.isArray(record.animation?.clips)
      ? record.animation.clips.map((clip) => String(clip || "").trim()).filter(Boolean)
      : [];
    const currentAnim = record.animation?.default
      || sequenceClips[0]
      || "Idle";
    const meshClips = [...animationClips];
    const clipOptions = [...meshClips];
    const footOffset = record.footOffset && typeof record.footOffset === "object"
      ? record.footOffset
      : { x: 0, y: Number(record.footOffset || 0), z: 0 };
    const clipFineTuneActive = options.clipFineTuneActive === true;
    const clipFineTuneClip = options.clipFineTuneClip || currentAnim;
    const pivot = record.animation?.pivots?.[clipFineTuneActive ? clipFineTuneClip : currentAnim]
      || { useCustom: false, x: 0, y: 0, z: 0 };
    const useCustomPivot = pivot.useCustom === true;
    const activeOffset = useCustomPivot
      ? { x: Number(pivot.x || 0), y: Number(pivot.y || 0), z: Number(pivot.z || 0) }
      : { x: Number(footOffset.x || 0), y: Number(footOffset.y || 0), z: Number(footOffset.z || 0) };
    const offsetEditMode = options.offsetEditMode || null;
    const offsetDefaultDirty = options.offsetDefaultDirty === true;
    const offsetClipDirty = options.offsetClipDirty === true;
    const selectedWaypointIndex = options.selectedWaypointIndex;
    const movement = record.movement?.type === "patrol" ? record.movement : null;
    const patrolTargets = movement?.patrolTargets || [];

    if (currentAnim && !clipOptions.includes(currentAnim)) {
      clipOptions.unshift(currentAnim);
    }

    sequenceClips.forEach((clip) => {
      if (clip && !clipOptions.includes(clip)) {
        clipOptions.push(clip);
      }
    });

    const patrolClipOptions = [...new Set([
      ...clipOptions,
      movement?.clip,
      movement?.cycleRestClip,
      "Walking",
      "Idle"
    ].filter(Boolean))];
    const addClipDefault = clipOptions.find((clip) => !sequenceClips.includes(clip)) || clipOptions[0] || "Idle";
    const fineTuneClips = meshClips.length ? meshClips : clipOptions;
    const fineTuneSelected = fineTuneClips.includes(clipFineTuneClip)
      ? clipFineTuneClip
      : (fineTuneClips[0] || clipFineTuneClip);
    const fineTuneClipOptionsHtml = fineTuneClips.map((clip) => `
      <option value="${clip}"${clip === fineTuneSelected ? " selected" : ""}>${clip}</option>
    `).join("");
    const clipOptionsHtml = clipOptions.map((clip) => `
      <option value="${clip}"${clip === currentAnim ? " selected" : ""}>${clip}</option>
    `).join("");

    inspectorEl.innerHTML = `
      <h2>SELECTED OBJECT</h2>
      <div class="npc-scene-editor-collision is-${level}">
        <strong>${collisionLabel(level)}</strong>
        <span>${collision?.message || "배치 가능"}</span>
      </div>
      <dl class="npc-scene-editor-fields">
        <dt>Type</dt><dd>${record.type || "npc"}</dd>
        <dt>ID</dt><dd>${record.id}</dd>
        <dt>Name</dt><dd>${displayName}</dd>
      </dl>
      <section class="npc-scene-editor-section npc-scene-editor-section--compact npc-scene-editor-section--tone-model">
        <h3>Model</h3>
        <div class="npc-scene-editor-model-row">
          <label class="npc-scene-editor-model-row__select">NPC 종류
            <select name="npcModel"${options.randomModel === true ? " disabled" : ""}>
              ${models.map((model) => `
                <option value="${model.file}"${model.file === currentModel ? " selected" : ""}>${model.name || model.file}</option>
              `).join("")}
            </select>
          </label>
          ${options.canToggleRandom === false ? "" : `
            <label class="npc-scene-editor-model-row__random">
              <input type="checkbox" name="npcRandomModel"${options.randomModel === true ? " checked" : ""}>
              <span>랜덤</span>
            </label>
          `}
        </div>
      </section>
      ${transformSectionHtml(pos, rotY)}

      <section class="npc-scene-editor-section npc-scene-editor-section--focus npc-scene-editor-section--tone-camera">
        <h3>대화 카메라</h3>
        ${(() => {
          const cam = normalizeNpcDialogCameraSettings(options.npcDialogue || {});
          return `
        <div class="npc-scene-editor-dialog-camera" data-role="dialog-camera-controls">
          <label class="npc-manager-field--check">
            <span>대화 중 플레이어 숨김</span>
            <input type="checkbox" name="npcHidePlayer" data-dialog-cam="true"${cam.hidePlayerDuringDialog ? " checked" : ""}>
          </label>
          <label class="npc-scene-editor-slider-row">
            <span class="npc-scene-editor-slider-row__label">카메라 높이</span>
            <input type="range" min="0" max="2.8" step="0.05" name="npcCamHeight" data-dialog-cam="true" value="${cam.cameraHeight}">
            <span class="npc-scene-editor-slider-row__value" data-role="npcCamHeightVal">${cam.cameraHeight.toFixed(2)}</span>
          </label>
          <label class="npc-scene-editor-slider-row">
            <span class="npc-scene-editor-slider-row__label">시선 높이</span>
            <input type="range" min="0" max="1.2" step="0.05" name="npcCamLookLift" data-dialog-cam="true" value="${cam.cameraLookLift}">
            <span class="npc-scene-editor-slider-row__value" data-role="npcCamLookLiftVal">${cam.cameraLookLift.toFixed(2)}</span>
          </label>
          <label class="npc-scene-editor-slider-row">
            <span class="npc-scene-editor-slider-row__label">좌우 이동</span>
            <input type="range" min="-2" max="2" step="0.05" name="npcCamLateral" data-dialog-cam="true" value="${cam.cameraLateralOffset}">
            <span class="npc-scene-editor-slider-row__value" data-role="npcCamLateralVal">${Number(cam.cameraLateralOffset).toFixed(2)}</span>
          </label>
          <label class="npc-scene-editor-slider-row">
            <span class="npc-scene-editor-slider-row__label">좌우 각도</span>
            <input type="range" min="-180" max="180" step="1" name="npcCamYaw" data-dialog-cam="true" value="${cam.cameraYawOffset}">
            <span class="npc-scene-editor-slider-row__value" data-role="npcCamYawVal">${Math.round(cam.cameraYawOffset)}°</span>
          </label>
          <label class="npc-scene-editor-slider-row">
            <span class="npc-scene-editor-slider-row__label">상하 각도</span>
            <input type="range" min="-90" max="90" step="1" name="npcCamPitch" data-dialog-cam="true" value="${cam.cameraPitchOffset}">
            <span class="npc-scene-editor-slider-row__value" data-role="npcCamPitchVal">${Math.round(cam.cameraPitchOffset)}°</span>
          </label>
          <label class="npc-scene-editor-slider-row npc-scene-editor-slider-row--distance">
            <span class="npc-scene-editor-slider-row__label">카메라 거리</span>
            <input type="number" step="0.05" min="0.8" max="6" name="npcCamDistance" data-dialog-cam="true" value="${cam.cameraDistance == null ? "" : Number(cam.cameraDistance).toFixed(2)}" placeholder="자동">
            <span class="npc-scene-editor-slider-row__value npc-scene-editor-slider-row__value--muted">m</span>
          </label>
          <div class="npc-scene-editor-dialog-preview">
            <p class="guide-manager-hint" data-role="dialog-cam-preview-hint">모니터 화면 비율 축소 미리보기</p>
            <div class="npc-scene-editor-dialog-preview__screen" data-role="dialog-cam-preview-screen">
              <canvas data-role="dialog-cam-preview-canvas" aria-label="대화 카메라 미리보기"></canvas>
            </div>
          </div>
        </div>
          `;
        })()}
      </section>

      <section class="npc-scene-editor-section npc-scene-editor-section--focus npc-scene-editor-section--tone-anim">
        <div class="npc-scene-editor-section-title">
          <h3>애니메이션 · 위치 미세조정</h3>
          <label class="npc-scene-editor-section-title__check">
            <input type="checkbox" name="poseFreeze"${options.poseFreezeActive === true ? " checked" : ""}>
            <span>포즈 고정</span>
          </label>
        </div>
        <fieldset class="npc-scene-editor-subsection" ${options.poseFreezeActive === true && !clipFineTuneActive ? "" : "disabled"}>
          <h4>기본 보정 편집</h4>
          <p class="guide-manager-hint">포즈 고정 후 기즈모로 편집하면 T포즈에서 위치와 높이를 맞춥니다. 저장해야 유지됩니다.</p>
          ${offsetEditMode === "default" ? '<p class="guide-manager-hint">T포즈로 위치·높이 편집 중 · 위치 미세조정은 종료 후 사용</p>' : ""}
          <dl class="npc-scene-editor-fields">
            <dt>기본 보정</dt>
            <dd>X ${Number(footOffset.x || 0).toFixed(2)} / Y ${Number(footOffset.y || 0).toFixed(2)} / Z ${Number(footOffset.z || 0).toFixed(2)}</dd>
          </dl>
          <div class="npc-scene-editor-offset-actions">
            <button type="button" data-action="offset-edit-default"${offsetEditMode === "default" ? " class=\"is-active\"" : ""}>
              ${offsetEditMode === "default" ? "기본 보정 중 · 종료" : "기즈모로 편집"}
            </button>
            <button type="button" data-action="offset-save-default"${offsetDefaultDirty ? "" : " disabled"}>저장</button>
            <button type="button" data-action="offset-reset-default">초기화</button>
          </div>
        </fieldset>
        <fieldset class="npc-scene-editor-subsection" ${options.poseFreezeActive === true ? "disabled" : ""}>
          <h4>재생</h4>
          <label>모드
            <select name="animMode">
              <option value="loop"${animMode === "loop" ? " selected" : ""}>Loop</option>
              <option value="once"${animMode === "once" ? " selected" : ""}>Once</option>
              <option value="sequence"${animMode === "sequence" ? " selected" : ""}>Sequence</option>
            </select>
          </label>
          ${animMode === "sequence" ? `
            <ul class="npc-scene-editor-sequence-list">
              ${sequenceClips.map((clip, index) => `
                <li>
                  <span class="npc-scene-editor-sequence-list__index">#${index + 1}</span>
                  <select data-role="seq-clip" data-index="${index}">
                    ${clipOptions.map((option) => `
                      <option value="${option}"${option === clip ? " selected" : ""}>${option}</option>
                    `).join("")}
                  </select>
                  <div class="npc-scene-editor-rotate-row">
                    <button type="button" data-action="seq-up" data-index="${index}"${index === 0 ? " disabled" : ""}>▲</button>
                    <button type="button" data-action="seq-down" data-index="${index}"${index >= sequenceClips.length - 1 ? " disabled" : ""}>▼</button>
                    <button type="button" data-action="seq-remove" data-index="${index}"${sequenceClips.length <= 1 ? " disabled" : ""}>삭제</button>
                  </div>
                </li>
              `).join("") || "<li class=\"guide-manager-hint\">클립 없음</li>"}
            </ul>
            <div class="npc-scene-editor-rotate-row">
              <select name="seqAddClip">
                ${clipOptions.map((clip) => `
                  <option value="${clip}"${clip === addClipDefault ? " selected" : ""}>${clip}</option>
                `).join("")}
              </select>
              <button type="button" data-action="seq-add">클립 추가</button>
            </div>
            <label>보정 대상 클립
              <select name="animDefault">
                ${sequenceClips.map((clip) => `
                  <option value="${clip}"${clip === currentAnim ? " selected" : ""}>${clip}</option>
                `).join("") || `<option value="${currentAnim}">${currentAnim}</option>`}
              </select>
            </label>
          ` : `
            <label>기본 클립
              <select name="animDefault">
                ${clipOptionsHtml}
              </select>
            </label>
          `}
        </fieldset>
        <fieldset class="npc-scene-editor-subsection" ${options.poseFreezeActive === true && offsetEditMode !== "default" ? "" : "disabled"}>
          <h4>위치 미세조정</h4>
          <p class="guide-manager-hint">클립별 보정입니다. Sit 높이처럼 클립마다 다를 때 씁니다. 클립을 고르면 그 클립의 첫 포즈에서 멈춥니다.</p>
          <label class="npc-manager-field--check">
            <span>클립별 보정</span>
            <input type="checkbox" name="clipFineTune"${clipFineTuneActive ? " checked" : ""}>
          </label>
          ${clipFineTuneActive ? `
            <label>애니메이션
              <select name="offsetClipSelect">
                ${fineTuneClipOptionsHtml}
              </select>
            </label>
            <dl class="npc-scene-editor-fields">
              <dt>클립 보정</dt>
              <dd>X ${Number(pivot.x || 0).toFixed(2)} / Y ${Number(pivot.y || 0).toFixed(2)} / Z ${Number(pivot.z || 0).toFixed(2)}</dd>
              <dt>현재 적용</dt>
              <dd>X ${Number(activeOffset.x).toFixed(2)} / Y ${Number(activeOffset.y).toFixed(2)} / Z ${Number(activeOffset.z).toFixed(2)}</dd>
            </dl>
            <p class="guide-manager-hint">선택한 클립의 시작 포즈에서 높이·위치를 맞춥니다.</p>
            <div class="npc-scene-editor-offset-actions">
              <button type="button" data-action="offset-edit-clip"${offsetEditMode === "clip" ? " class=\"is-active\"" : ""}>
                ${offsetEditMode === "clip" ? "클립 보정 중 · 종료" : "기즈모로 편집"}
              </button>
              <button type="button" data-action="offset-save-clip"${offsetClipDirty ? "" : " disabled"}>저장</button>
              <button type="button" data-action="offset-reset-clip">초기화</button>
            </div>
          ` : ""}
        </fieldset>
      </section>

      <section class="npc-scene-editor-section npc-scene-editor-section--focus npc-scene-editor-section--tone-patrol">
        <h3>패트롤</h3>
        <label class="npc-manager-field--check">
          <span>패트롤 사용</span>
          <input type="checkbox" name="patrolEnabled"${movement ? " checked" : ""}>
        </label>
        ${movement ? `
          <div class="npc-scene-editor-subsection">
            <h4>이동</h4>
            <label>이동 애니
              <select name="patrolClip">
                ${patrolClipOptions.map((clip) => `
                  <option value="${clip}"${clip === (movement.clip || "") ? " selected" : ""}>${clip}</option>
                `).join("")}
              </select>
            </label>
            <label>속도
              <input type="number" step="0.01" name="patrolSpeed" value="${Number(movement.speed ?? 0.12).toFixed(3)}">
            </label>
            <label class="npc-manager-field--check">
              <span>근접 감속</span>
              <input type="checkbox" name="patrolEaseSpeed"${movement.easeSpeed !== false ? " checked" : ""}>
            </label>
            <label class="npc-manager-field--check">
              <span>이동 애니 랜덤</span>
              <input type="checkbox" name="patrolRandomClip"${movement.randomClip === true ? " checked" : ""}>
            </label>
            <label class="npc-manager-field--check">
              <span>바닥 스냅</span>
              <input type="checkbox" name="patrolSnap"${movement.snapToFloor !== false ? " checked" : ""}>
            </label>
          </div>
          <div class="npc-scene-editor-subsection">
            <h4>웨이포인트 도착</h4>
            <label>도착 애니
              <select name="patrolArrivalClip">
                <option value="">(없음)</option>
                ${patrolClipOptions.map((clip) => `
                  <option value="${clip}"${clip === (movement.arrivalClip || "") ? " selected" : ""}>${clip}</option>
                `).join("")}
              </select>
            </label>
            <label>도착 애니 시간(ms)
              <input type="number" min="0" step="100" name="patrolArrivalHoldMs" value="${
                Number.isFinite(Number(movement.arrivalHoldMs)) && Number(movement.arrivalHoldMs) > 0
                  ? Math.round(Number(movement.arrivalHoldMs))
                  : ""
              }" placeholder="비우면 클립 전체 길이">
            </label>
            <p class="guide-manager-hint">모델마다 Idle 길이가 다르면 여기에 같은 ms를 넣으면 전환 템포가 맞춰집니다.</p>
          </div>
          <div class="npc-scene-editor-subsection">
            <h4>휴식</h4>
            <label>한 바퀴 후 휴식 애니
              <select name="patrolRestClip">
                <option value="">(없음)</option>
                ${patrolClipOptions.map((clip) => `
                  <option value="${clip}"${clip === (movement.cycleRestClip || "") ? " selected" : ""}>${clip}</option>
                `).join("")}
              </select>
            </label>
            <label>휴식 횟수
              <input type="number" min="1" step="1" name="patrolRestCount" value="${Number(movement.cycleRestCount || 1)}">
            </label>
          </div>
          <div class="npc-scene-editor-subsection">
            <h4>웨이포인트</h4>
            <div class="npc-scene-editor-rotate-row">
              <button type="button" data-action="patrol-add-wp">포인트 추가</button>
            </div>
            <ul class="npc-scene-editor-waypoint-list">
              ${patrolTargets.map((target, index) => `
                <li class="${selectedWaypointIndex === index ? "is-selected" : ""}">
                  <div class="npc-scene-editor-waypoint-list__row">
                    <button type="button" data-action="patrol-select-wp" data-index="${index}">#${index + 1}</button>
                    <label>이동
                      <select data-role="wp-move-clip" data-index="${index}">
                        <option value="">(기본)</option>
                        ${patrolClipOptions.map((clip) => `
                          <option value="${clip}"${clip === (target.moveClip || "") ? " selected" : ""}>${clip}</option>
                        `).join("")}
                      </select>
                    </label>
                    <label>도착
                      <select data-role="wp-arrival-clip" data-index="${index}">
                        <option value="">(없음)</option>
                        ${patrolClipOptions.map((clip) => `
                          <option value="${clip}"${clip === (target.arrivalClip || "") ? " selected" : ""}>${clip}</option>
                        `).join("")}
                      </select>
                    </label>
                    <button type="button" data-action="patrol-remove-wp" data-index="${index}">삭제</button>
                  </div>
                </li>
              `).join("") || "<li class=\"guide-manager-hint\">포인트 추가 후 기즈모로 배치</li>"}
            </ul>
          </div>
        ` : `<p class="guide-manager-hint">켜면 웨이포인트 순찰을 설정합니다.</p>`}
      </section>
      ${actionButtonsHtml()}
    `;

    bindActionButtons(record);
    inspectorEl.querySelector('[name="npcModel"]')?.addEventListener("change", (event) => {
      onNpcModelChange?.(record.id, event.target.value);
    });
    inspectorEl.querySelector('[name="npcRandomModel"]')?.addEventListener("change", (event) => {
      onNpcRandomModelChange?.(record.id, event.target.checked);
    });
    inspectorEl.querySelector('[name="poseFreeze"]')?.addEventListener("change", (event) => {
      onPoseFreezeChange?.(event.target.checked);
    });
    inspectorEl.querySelector('[data-action="offset-edit-default"]')?.addEventListener("click", () => {
      onOffsetEditModeChange?.(offsetEditMode === "default" ? null : "default");
    });
    inspectorEl.querySelector('[data-action="offset-edit-clip"]')?.addEventListener("click", () => {
      onOffsetEditModeChange?.(offsetEditMode === "clip" ? null : "clip");
    });
    inspectorEl.querySelector('[data-action="offset-save-default"]')?.addEventListener("click", () => {
      onSaveOffsetEdits?.("default");
    });
    inspectorEl.querySelector('[data-action="offset-save-clip"]')?.addEventListener("click", () => {
      onSaveOffsetEdits?.("clip");
    });
    inspectorEl.querySelector('[data-action="offset-reset-default"]')?.addEventListener("click", () => {
      onResetOffsetEdits?.("default");
    });
    inspectorEl.querySelector('[data-action="offset-reset-clip"]')?.addEventListener("click", () => {
      onResetOffsetEdits?.("clip");
    });
    inspectorEl.querySelector('[name="clipFineTune"]')?.addEventListener("change", (event) => {
      onClipFineTuneChange?.(Boolean(event.target.checked));
    });
    inspectorEl.querySelector('[name="offsetClipSelect"]')?.addEventListener("change", (event) => {
      onClipFineTuneClipChange?.(event.target.value);
    });
    inspectorEl.querySelector('[name="animMode"]')?.addEventListener("change", (event) => {
      const mode = String(event.target.value || "loop");
      if (mode === "sequence") {
        const clips = sequenceClips.length ? [...sequenceClips] : [currentAnim || "Idle"];
        onNpcFieldsChange?.(record.id, {
          animation: {
            mode: "sequence",
            clips,
            default: clips[0]
          }
        });
        return;
      }

      onNpcFieldsChange?.(record.id, {
        animation: {
          mode,
          default: currentAnim || sequenceClips[0] || "Idle",
          clips: [currentAnim || sequenceClips[0] || "Idle"]
        }
      });
    });
    inspectorEl.querySelector('[name="animDefault"]')?.addEventListener("change", (event) => {
      onNpcFieldsChange?.(record.id, { animation: { default: event.target.value } });
    });

    const emitSequenceClips = (clips) => {
      const nextClips = (clips || []).map((clip) => String(clip || "").trim()).filter(Boolean);
      onNpcFieldsChange?.(record.id, {
        animation: {
          mode: "sequence",
          clips: nextClips.length ? nextClips : [currentAnim || "Idle"],
          default: nextClips.includes(currentAnim) ? currentAnim : (nextClips[0] || "Idle")
        }
      });
    };

    inspectorEl.querySelectorAll('[data-role="seq-clip"]').forEach((select) => {
      select.addEventListener("change", (event) => {
        const index = Number(event.target.getAttribute("data-index"));
        const next = [...sequenceClips];
        next[index] = event.target.value;
        emitSequenceClips(next);
      });
    });
    inspectorEl.querySelector('[data-action="seq-add"]')?.addEventListener("click", () => {
      const clip = inspectorEl.querySelector('[name="seqAddClip"]')?.value || "Idle";
      emitSequenceClips([...sequenceClips, clip]);
    });
    inspectorEl.querySelectorAll('[data-action="seq-remove"]').forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-index"));
        emitSequenceClips(sequenceClips.filter((_, i) => i !== index));
      });
    });
    inspectorEl.querySelectorAll('[data-action="seq-up"]').forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-index"));
        if (index <= 0) {
          return;
        }
        const next = [...sequenceClips];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        emitSequenceClips(next);
      });
    });
    inspectorEl.querySelectorAll('[data-action="seq-down"]').forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-index"));
        if (index < 0 || index >= sequenceClips.length - 1) {
          return;
        }
        const next = [...sequenceClips];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        emitSequenceClips(next);
      });
    });

    const emitNpcDialogue = () => {
      const previous = options.npcDialogue || {};
      onNpcDialogueChange?.(record.id, {
        interactionEnabled: previous.interactionEnabled === true,
        hidePlayerDuringDialog: Boolean(inspectorEl.querySelector('[name="npcHidePlayer"]')?.checked),
        dialogDistance: previous.dialogDistance,
        cameraHeight: Number(inspectorEl.querySelector('[name="npcCamHeight"]')?.value),
        cameraLookLift: Number(inspectorEl.querySelector('[name="npcCamLookLift"]')?.value),
        cameraLateralOffset: Number(inspectorEl.querySelector('[name="npcCamLateral"]')?.value),
        cameraYawOffset: Number(inspectorEl.querySelector('[name="npcCamYaw"]')?.value),
        cameraPitchOffset: Number(inspectorEl.querySelector('[name="npcCamPitch"]')?.value),
        cameraDistance: (() => {
          const raw = inspectorEl.querySelector('[name="npcCamDistance"]')?.value;
          return raw === "" || raw == null ? null : Number(raw);
        })(),
        dialogLines: previous.dialogLines || []
      }, { refreshUi: false });
    };

    const syncCamValueLabels = () => {
      const map = [
        ["npcCamHeight", "npcCamHeightVal", (v) => Number(v).toFixed(2)],
        ["npcCamLookLift", "npcCamLookLiftVal", (v) => Number(v).toFixed(2)],
        ["npcCamLateral", "npcCamLateralVal", (v) => Number(v).toFixed(2)],
        ["npcCamYaw", "npcCamYawVal", (v) => `${Math.round(Number(v))}°`],
        ["npcCamPitch", "npcCamPitchVal", (v) => `${Math.round(Number(v))}°`]
      ];

      map.forEach(([inputName, role, format]) => {
        const input = inspectorEl.querySelector(`[name="${inputName}"]`);
        const label = inspectorEl.querySelector(`[data-role="${role}"]`);

        if (input && label) {
          label.textContent = format(input.value);
        }
      });
    };

    inspectorEl.querySelectorAll("[data-dialog-cam]").forEach((node) => {
      const handler = () => {
        syncCamValueLabels();
        onDialogCameraPreview?.(inspectorEl);
        emitNpcDialogue();
      };

      node.addEventListener("input", () => {
        syncCamValueLabels();
        onDialogCameraPreview?.(inspectorEl);
      });
      node.addEventListener("change", handler);
    });
    syncCamValueLabels();
    onDialogCameraPreview?.(inspectorEl, record.id, options.npcDialogue || {});

    inspectorEl.querySelector('[name="patrolEnabled"]')?.addEventListener("change", (event) => {
      if (event.target.checked) {
        const patchMovement = {
          type: "patrol",
          clip: movement?.clip || "Walking",
          cycleRestClip: movement?.cycleRestClip || "",
          cycleRestCount: movement?.cycleRestCount || 1,
          speed: movement?.speed || 0.12,
          easeSpeed: movement?.easeSpeed !== false,
          snapToFloor: movement?.snapToFloor !== false
        };

        if (movement?.patrolTargets?.length) {
          patchMovement.patrolTargets = movement.patrolTargets;
        }

        onNpcFieldsChange?.(record.id, { movement: patchMovement });
      } else {
        onNpcFieldsChange?.(record.id, { movement: null });
      }
    });
    const emitPatrolPatch = (extra = {}) => {
      if (!movement) {
        return;
      }

      const arrivalClip = inspectorEl.querySelector('[name="patrolArrivalClip"]')?.value || "";
      const arrivalHoldRaw = inspectorEl.querySelector('[name="patrolArrivalHoldMs"]')?.value;
      const arrivalHoldMs = Number(arrivalHoldRaw);
      const randomClip = Boolean(inspectorEl.querySelector('[name="patrolRandomClip"]')?.checked);
      const selectedClip = inspectorEl.querySelector('[name="patrolClip"]')?.value || movement.clip || "Walking";
      const nextMovement = {
        ...movement,
        clip: selectedClip,
        cycleRestClip: inspectorEl.querySelector('[name="patrolRestClip"]')?.value || "",
        cycleRestCount: Number(inspectorEl.querySelector('[name="patrolRestCount"]')?.value) || 1,
        speed: Number(inspectorEl.querySelector('[name="patrolSpeed"]')?.value) || movement.speed,
        easeSpeed: Boolean(inspectorEl.querySelector('[name="patrolEaseSpeed"]')?.checked),
        snapToFloor: Boolean(inspectorEl.querySelector('[name="patrolSnap"]')?.checked),
        ...extra
      };

      if (arrivalClip) {
        nextMovement.arrivalClip = arrivalClip;
      } else {
        delete nextMovement.arrivalClip;
      }

      if (Number.isFinite(arrivalHoldMs) && arrivalHoldMs > 0) {
        nextMovement.arrivalHoldMs = Math.round(arrivalHoldMs);
      } else {
        delete nextMovement.arrivalHoldMs;
      }

      if (randomClip) {
        nextMovement.randomClip = true;
        const existingClips = Array.isArray(movement.clips)
          ? movement.clips.map((clip) => String(clip || "").trim()).filter(Boolean)
          : [];
        const pool = existingClips.length >= 2
          ? existingClips
          : Array.from(new Set([
            selectedClip,
            ...existingClips,
            selectedClip === "Run_Fast" ? "Walking" : "Run_Fast"
          ].filter(Boolean)));
        nextMovement.clips = pool;
      } else {
        delete nextMovement.randomClip;
      }

      if (!nextMovement.cycleRestClip) {
        delete nextMovement.cycleRestClip;
        delete nextMovement.cycleRestCount;
      }

      onNpcFieldsChange?.(record.id, { movement: nextMovement });
    };
    inspectorEl.querySelector('[name="patrolClip"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolRestClip"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolRestCount"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolSpeed"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolEaseSpeed"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolSnap"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolRandomClip"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolArrivalClip"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[name="patrolArrivalHoldMs"]')?.addEventListener("change", () => emitPatrolPatch());
    inspectorEl.querySelector('[data-action="patrol-add-wp"]')?.addEventListener("click", () => {
      onAddPatrolWaypoint?.(record.id);
    });
    inspectorEl.querySelectorAll('[data-action="patrol-select-wp"]').forEach((button) => {
      button.addEventListener("click", () => {
        onSelectPatrolWaypoint?.(Number(button.getAttribute("data-index")));
      });
    });
    inspectorEl.querySelectorAll('[data-action="patrol-remove-wp"]').forEach((button) => {
      button.addEventListener("click", () => {
        onRemovePatrolWaypoint?.(record.id, Number(button.getAttribute("data-index")));
      });
    });
    const patchWaypointAnim = (index, field, value) => {
      const targets = (movement.patrolTargets || []).map((target, targetIndex) => {
        if (targetIndex !== index) {
          return { ...target };
        }

        const next = { ...target };

        if (!value) {
          delete next[field];
          if (field === "arrivalClip") {
            delete next.arrivalCount;
          }
        } else {
          next[field] = value;
          if (field === "arrivalClip") {
            next.arrivalCount = next.arrivalCount || 1;
          }
        }

        return next;
      });
      emitPatrolPatch({ patrolTargets: targets });
    };
    inspectorEl.querySelectorAll('[data-role="wp-move-clip"]').forEach((select) => {
      select.addEventListener("change", () => {
        patchWaypointAnim(Number(select.getAttribute("data-index")), "moveClip", select.value);
      });
    });
    inspectorEl.querySelectorAll('[data-role="wp-arrival-clip"]').forEach((select) => {
      select.addEventListener("change", () => {
        patchWaypointAnim(Number(select.getAttribute("data-index")), "arrivalClip", select.value);
      });
    });
    bindInspectorSelectGuards(inspectorEl, { onIdle: onInspectorInteractionIdle });
    bindFormIdleFlush(inspectorEl);
    applyInspectorScroll(inspectorEl, savedScroll);
  }

  function isEditingForm() {
    const activeEl = document.activeElement;
    if (!activeEl) {
      return false;
    }

    const inChrome = Boolean(
      activeEl.closest?.(
        ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-top"
      )
    );

    if (!inChrome) {
      return false;
    }

    const tag = String(activeEl.tagName || "").toLowerCase();

    // While a select is focused, keep the native menu alive (refresh would destroy it).
    // change handlers blur() then flush deferred refresh.
    if (tag === "select") {
      return true;
    }

    // Text editing mid-keystroke should not rebuild the panel.
    if (tag === "textarea") {
      return true;
    }

    if (tag === "input") {
      const type = String(activeEl.type || "text").toLowerCase();
      // Checkboxes/radios/range must allow refresh (patrol submenu, fine-tune, cam).
      if (
        type === "checkbox"
        || type === "radio"
        || type === "range"
        || type === "button"
        || type === "submit"
        || type === "reset"
      ) {
        return false;
      }

      return true;
    }

    return Boolean(activeEl.isContentEditable);
  }

  function bindFormIdleFlush(root) {
    if (!root || !onInspectorInteractionIdle) {
      return;
    }

    root.querySelectorAll("input, textarea").forEach((node) => {
      if (node.dataset.formIdleFlush === "1") {
        return;
      }

      node.dataset.formIdleFlush = "1";
      const type = String(node.type || "").toLowerCase();

      if (type === "checkbox" || type === "radio" || type === "range") {
        return;
      }

      node.addEventListener("blur", () => {
        onInspectorInteractionIdle();
      });
    });
  }

  function show() {
    ensureDom();
    shell.hidden = false;
    document.body.classList.add("npc-scene-editor-active");
  }

  function hide() {
    if (!shell) {
      return;
    }

    shell.hidden = true;
    document.body.classList.remove("npc-scene-editor-active");
  }

  function isVisible() {
    return Boolean(shell && !shell.hidden);
  }

  return {
    show,
    hide,
    isVisible,
    isEditingForm,
    renderList,
    renderInspector,
    setStatus,
    setDirty
  };
}
