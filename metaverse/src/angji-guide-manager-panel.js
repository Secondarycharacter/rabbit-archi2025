/**
 * Local-dev Angji GUIDE tour manager panel.
 */

import {
  clearStoredTourData,
  createEmptyDialogueLine,
  createEmptyOrbitSequence,
  createEmptyTourEvent,
  exportTourDataJson,
  getEventSummaryRows,
  buildPostEventSelectOptions,
  decodePostEventSelectValue,
  encodePostEventSelectValue,
  importTourDataFromFile,
  loadBaseTourData,
  loadEffectiveTourData,
  normalizeTourData,
  publishTourData,
  radiansToDegrees,
  saveTourData,
  subscribeTourDataUpdates,
  syncDialogueLinePostEvent,
  GUIDE_TOUR_GLOBAL_DEFAULTS,
  IDLE_DANCE_RANDOM_VALUE
} from "./angji-guide-tour-data.js?v=editor-guide-pose-20260908";
import {
  isGuideTourFirestoreConfigured,
  loadGuideTourFromFirestore,
  saveGuideTourToFirestore
} from "./editor-mode/guide-tour-firestore.js?v=editor-guide-pose-20260908";
import { subscribeTourDataRemote } from "./editor-mode/editor-broadcast-sync.js?v=project-scope-20260908";
import {
  isGuideBaseStoreAvailable,
  listGuideBaseVersions,
  loadGuideBaseVersion,
  saveGuideBaseVersion
} from "./editor-mode/guide-base-file.js?v=project-scope-20260908";
import {
  isSpeechTtsAvailable,
  loadTtsPrefs,
  speakTextWithPrefs,
  speakTextsWithPrefs,
  stopSpeechTts
} from "./editor-mode/speech-tts.js?v=editor-tts-preview-all-20260903";

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "text") {
      node.textContent = value;
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (value != null) {
      node.setAttribute(key, value);
    }
  });

  return node;
}

function field(labelText, input) {
  const wrap = el("label", "npc-manager-field");
  wrap.append(el("span", null, { text: labelText }), input);
  return wrap;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function numInput(value, step = "0.1", name = "", placeholder = "") {
  const input = el("input", null, { type: "number", step });
  if (name) {
    input.name = name;
  }
  const text = value == null || value === "" || Number.isNaN(Number(value))
    ? ""
    : String(value);
  input.value = text;
  // outerHTML round-trips need the attribute, not only the live .value property.
  if (text !== "") {
    input.setAttribute("value", text);
  }
  if (placeholder) {
    input.placeholder = String(placeholder);
    input.setAttribute("placeholder", String(placeholder));
  }
  return input;
}

function textInput(value, placeholder = "", name = "") {
  const input = el("input", null, { type: "text", placeholder });
  if (name) {
    input.name = name;
  }
  const text = value == null ? "" : String(value);
  input.value = text;
  if (text !== "") {
    input.setAttribute("value", text);
  }
  return input;
}

function textarea(value, rows = 3, name = "") {
  const input = el("textarea", null, { rows: String(rows) });
  if (name) {
    input.name = name;
  }
  const text = value == null ? "" : String(value);
  input.value = text;
  // outerHTML must include body text; .value alone is dropped on serialization.
  input.textContent = text;
  return input;
}

function selectInput(options, value, name = "") {
  const input = el("select");
  if (name) {
    input.name = name;
  }
  options.forEach((opt) => {
    const option = el("option", null, { value: opt.value, text: opt.label });
    if (opt.value === value) {
      option.selected = true;
      option.setAttribute("selected", "");
    }
    input.appendChild(option);
  });
  // Keep .value in sync for outerHTML round-trips into innerHTML.
  input.value = value;
  return input;
}

function renderLineTextSpeedField(line, globalTextSpeed) {
  const isCustom = line.textSpeed != null && line.textSpeed !== "" && Number.isFinite(Number(line.textSpeed));
  const mode = isCustom ? "custom" : "default";
  const globalValue = String(globalTextSpeed);
  const customValue = isCustom ? String(line.textSpeed) : globalValue;
  const modeSelect = selectInput(
    [
      { value: "default", label: "기본값" },
      { value: "custom", label: "직접입력" }
    ],
    mode,
    "lineTextSpeedMode"
  );
  const speedInput = numInput(customValue, "0.001", "lineTextSpeed", globalValue);
  if (mode === "default") {
    speedInput.disabled = true;
    speedInput.setAttribute("disabled", "");
    speedInput.classList.add("is-using-default");
    speedInput.value = globalValue;
    speedInput.setAttribute("value", globalValue);
  }
  const wrap = el("label", "npc-manager-field guide-manager-line-speed");
  const controls = el("div", "guide-manager-line-speed__controls");
  controls.append(modeSelect, speedInput);
  wrap.append(el("span", null, { text: "개별 타이핑 속도" }), controls);
  return wrap.outerHTML;
}

const GUIDE_CLOSING_CLIP_OPTIONS = [
  "Greeting_bow",
  "Greeting_Hand",
  "Idle",
  "Talking01",
  "Talking02"
];

const GUIDE_TALKING_CLIP_OPTIONS = [
  "Talking01",
  "Talking02",
  "Talking03",
  "Idle"
];

const GUIDE_IDLE_DANCE_CLIP_OPTIONS = [
  ...GUIDE_TOUR_GLOBAL_DEFAULTS.idleDanceClips
];

function clipSelectOptions(catalog, selectedValue) {
  const values = [...catalog];
  if (selectedValue && !values.includes(selectedValue)) {
    values.unshift(selectedValue);
  }
  return values.map((name) => ({ value: name, label: name }));
}

function renderOrderedClipSequence(clips, catalog, roleName, emptyLabel) {
  const list = Array.isArray(clips) && clips.length ? clips : [];

  return `
    <div class="guide-manager-clip-sequence" data-role="${escapeHtml(roleName)}">
      <div class="guide-manager-clip-sequence__rows" data-role="clip-rows">
        ${list.length ? list.map((clip, index) => `
          <div class="guide-manager-clip-row" data-clip-index="${index}">
            <span class="guide-manager-clip-row__index">${index + 1}</span>
            ${selectInput(clipSelectOptions(catalog, clip), clip, "clipName").outerHTML}
            <button type="button" data-action="clip-up" aria-label="위로"${index === 0 ? " disabled" : ""}>↑</button>
            <button type="button" data-action="clip-down" aria-label="아래로"${index === list.length - 1 ? " disabled" : ""}>↓</button>
            <button type="button" data-action="clip-remove" aria-label="삭제">×</button>
          </div>
        `).join("") : `<p class="guide-manager-hint">${escapeHtml(emptyLabel)}</p>`}
      </div>
      <div class="guide-manager-clip-sequence__add">
        ${selectInput(clipSelectOptions(catalog, catalog[0]), catalog[0], "clipAddPick").outerHTML}
        <button type="button" data-action="clip-add">+ 추가</button>
      </div>
    </div>
  `;
}

function readOrderedClipSequence(root) {
  if (!root) {
    return [];
  }

  return [...root.querySelectorAll('.guide-manager-clip-row select[name="clipName"]')]
    .map((select) => String(select.value || "").trim())
    .filter(Boolean);
}

function bindOrderedClipSequence(root, onMutate) {
  if (!root || typeof onMutate !== "function") {
    return;
  }

  root.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");

    if (!btn || !root.contains(btn)) {
      return;
    }

    const action = btn.getAttribute("data-action");

    if (!action?.startsWith("clip-")) {
      return;
    }

    event.preventDefault();
    let clips = readOrderedClipSequence(root);

    if (action === "clip-add") {
      const pick = root.querySelector('[name="clipAddPick"]')?.value;
      if (pick) {
        clips.push(pick);
      }
      onMutate(clips);
      return;
    }

    const row = btn.closest(".guide-manager-clip-row");
    const index = Number(row?.getAttribute("data-clip-index"));

    if (!Number.isFinite(index)) {
      return;
    }

    if (action === "clip-remove") {
      clips.splice(index, 1);
      onMutate(clips);
      return;
    }

    if (action === "clip-up" && index > 0) {
      const swap = clips[index - 1];
      clips[index - 1] = clips[index];
      clips[index] = swap;
      onMutate(clips);
      return;
    }

    if (action === "clip-down" && index < clips.length - 1) {
      const swap = clips[index + 1];
      clips[index + 1] = clips[index];
      clips[index] = swap;
      onMutate(clips);
    }
  });

  root.addEventListener("change", (event) => {
    if (event.target?.matches?.('select[name="clipName"]')) {
      onMutate(readOrderedClipSequence(root));
    }
  });
}

function detailsSummary(title) {
  return `<summary><span class="guide-manager-details__title">${escapeHtml(title)}</span><span class="guide-manager-details__check" aria-hidden="true"></span></summary>`;
}

function formatPostEventBadgeLabels(line, orbitSequences = []) {
  const labels = [];

  if (line?.startTourChoice || line?.postEvent?.type === "yes_no") {
    labels.push("YES / NO");
  }

  if (line?.orbitAfter || (line?.postEvent?.type === "other" && line.postEvent.checkpointId)) {
    const id = line.postEvent?.checkpointId || "orbit_spin";
    const seq = (orbitSequences || []).find((item) => item.id === id);
    labels.push(seq ? `오르빗 · ${seq.name || seq.id}` : `오르빗 · ${id}`);
  }

  return labels;
}

function codedBadges(line, orbitSequences = []) {
  const labels = formatPostEventBadgeLabels(line, orbitSequences);

  return `<div class="guide-manager-badges" data-role="line-post-badges"${labels.length ? "" : " hidden"}>
    ${labels.map((name) => `<span class="guide-manager-badge">${escapeHtml(name)}</span>`).join("")}
  </div>`;
}

export function createAngjiGuideManagerPanel(options = {}) {
  const {
    getGuideTourSystem = () => null,
    onApplyTourData = null,
    onStatus = null,
    onOpenChange = null,
    canPreview = () => false,
    enableLiveApply = false
  } = options;

  let tourData = normalizeTourData({ events: [] });
  let selectedEventId = null;
  let selectedOrbitId = null;
  let baseVersions = [{ id: "current", label: "현재값 (Firestore)" }];
  let selectedBaseVersionId = "current";
  let dirty = false;
  let liveApplyTimer = null;
  let suppressLiveApply = false;
  /** Persist <details open> across global form re-renders (event list clicks, etc.). */
  const globalDetailsOpen = {
    speed: true,
    orbit: true,
    talkingIdle: false
  };

  function applyExternalTourData(data, meta = {}) {
    const source = String(meta?.source || "");

    if (source.startsWith("guide-manager")) {
      return;
    }

    suppressLiveApply = true;
    tourData = normalizeTourData(data);

    if (!tourData.events.some((event) => event.id === selectedEventId)) {
      selectedEventId = tourData.events[0]?.id || null;
    }

    if (!tourData.orbitSequences?.some((seq) => seq.id === selectedOrbitId)) {
      selectedOrbitId = tourData.orbitSequences?.[0]?.id || null;
    }

    dirty = false;
    render();
    suppressLiveApply = false;

    if (source === "editor-tour-markers") {
      setStatus("씬 Tour 마커 변경이 가이드 이벤트에 반영되었습니다.");
    }
  }

  const unsubscribeTourLocal = subscribeTourDataUpdates(applyExternalTourData);
  const unsubscribeTourRemote = subscribeTourDataRemote(applyExternalTourData);

  const root = el("aside", "npc-manager-panel guide-manager-panel");
  root.id = "guideManagerPanel";
  root.hidden = true;
  root.innerHTML = `
    <header class="npc-manager-panel__header">
      <h2>가이드 관리</h2>
      <button type="button" class="npc-manager-panel__close" aria-label="Close">×</button>
    </header>
    <div class="npc-manager-panel__body">
      <div class="npc-manager-panel__list">
        <div class="npc-manager-panel__list-toolbar guide-manager-base-toolbar">
          <label class="guide-manager-base-select">
            <span>현재값</span>
            <select data-role="base-version-select">
              <option value="current">현재값 (Firestore)</option>
            </select>
          </label>
          <button type="button" data-action="load-base">현재값 불러오기</button>
          <button type="button" data-action="save-base">현재값 쓰기</button>
        </div>
        <div class="guide-manager-global" data-role="global"></div>
        <div class="npc-manager-summary" data-role="summary"></div>
      </div>
      <div class="npc-manager-panel__editor" data-role="editor">
        <p class="npc-manager-empty">왼쪽에서 이벤트를 선택하세요.</p>
      </div>
    </div>
    <footer class="npc-manager-panel__footer">
      <button type="button" data-action="apply">적용</button>
      <button type="button" data-action="save">저장</button>
      <button type="button" data-action="import">JSON 가져오기</button>
      <button type="button" data-action="export">JSON 내보내기</button>
      <button type="button" data-action="load-firestore">Firestore 불러오기</button>
      <button type="button" data-action="deploy-firestore">Firestore 배포</button>
      <button type="button" data-action="preview-pos" class="npc-manager-primary">위치 미리보기</button>
      <input type="file" accept="application/json,.json" data-role="import-input" hidden>
    </footer>
  `;

  document.body.appendChild(root);

  const globalEl = root.querySelector('[data-role="global"]');
  const summaryEl = root.querySelector('[data-role="summary"]');
  const editorEl = root.querySelector('[data-role="editor"]');
  const closeBtn = root.querySelector(".npc-manager-panel__close");
  const importInput = root.querySelector('[data-role="import-input"]');
  const baseVersionSelect = root.querySelector('[data-role="base-version-select"]');

  function setStatus(message) {
    onStatus?.(message);
  }

  function refreshBaseVersionSelect() {
    if (!baseVersionSelect) {
      return;
    }

    const previous = selectedBaseVersionId || baseVersionSelect.value || "current";
    baseVersionSelect.innerHTML = baseVersions.map((version) => {
      const selected = version.id === previous ? " selected" : "";
      return `<option value="${escapeHtml(version.id)}"${selected}>${escapeHtml(version.label)}</option>`;
    }).join("");

    if (![...baseVersionSelect.options].some((opt) => opt.value === previous)) {
      baseVersionSelect.value = "current";
      selectedBaseVersionId = "current";
    } else {
      baseVersionSelect.value = previous;
      selectedBaseVersionId = previous;
    }
  }

  async function refreshBaseVersionsFromServer() {
    if (!isGuideBaseStoreAvailable()) {
      baseVersions = [{ id: "current", label: "현재값 (Firebase 설정 필요)" }];
      refreshBaseVersionSelect();
      return false;
    }

    try {
      const result = await listGuideBaseVersions();
      baseVersions = Array.isArray(result.versions) && result.versions.length
        ? result.versions
        : [{ id: "current", label: "현재값 (Firestore)" }];
      refreshBaseVersionSelect();
      return true;
    } catch (error) {
      console.warn("[guide-manager] list Firestore base versions failed", error);
      baseVersions = [{ id: "current", label: "현재값 (Firestore)" }];
      refreshBaseVersionSelect();
      return false;
    }
  }

  function markDirty() {
    dirty = true;
    scheduleLiveApply();
  }

  function scheduleLiveApply() {
    if (!enableLiveApply || suppressLiveApply) {
      return;
    }

    clearTimeout(liveApplyTimer);
    liveApplyTimer = window.setTimeout(() => {
      applyRuntime(false);
      setStatus("메타버스 창에 실시간 적용됨 (영구 저장은 「저장」)");
    }, 350);
  }

  function moveEvent(eventId, direction) {
    readEditorForms();
    const index = tourData.events.findIndex((item) => item.id === eventId);

    if (index < 0) {
      return;
    }

    const target = index + direction;

    if (target < 0 || target >= tourData.events.length) {
      return;
    }

    const [event] = tourData.events.splice(index, 1);
    tourData.events.splice(target, 0, event);
    selectedEventId = event.id;
    dirty = true;

    if (enableLiveApply) {
      applyRuntime(false);
    }

    render();
    setStatus(`이벤트 ${event.id} 순서를 ${direction < 0 ? "위로" : "아래로"} 옮겼습니다.`);
  }

  function getSelectedEvent() {
    return tourData.events.find((event) => event.id === selectedEventId) || null;
  }

  function nextDialogueLineIndex(event) {
    const used = new Set((event?.dialogues || []).map((line) => String(line.id || "")));
    let index = event?.dialogues?.length || 0;

    while (used.has(`${event.id}_${String(index + 1).padStart(2, "0")}`)) {
      index += 1;
    }

    return index;
  }

  function addDialogueSetToSelectedEvent() {
    readEditorForms();
    const selected = getSelectedEvent();

    if (!selected) {
      setStatus("왼쪽에서 이벤트를 선택하세요.");
      return false;
    }

    if (!Array.isArray(selected.dialogues)) {
      selected.dialogues = [];
    }

    selected.dialogues.push(createEmptyDialogueLine(selected.id, nextDialogueLineIndex(selected)));
    markDirty();
    renderEventEditor();
    setStatus(`대사 세트를 추가했습니다. (총 ${selected.dialogues.length}개)`);
    return true;
  }

  function readOptionalNumber(raw, fallback) {
    if (raw === "" || raw == null) {
      return fallback;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function getNextEventIndex() {
    const numericIds = tourData.events
      .map((event) => Number.parseInt(event.id, 10))
      .filter((value) => Number.isFinite(value));

    return numericIds.length ? Math.max(...numericIds) + 1 : 0;
  }

  function moveDialogueLine(lineId, direction) {
    readEditorForms();
    const event = getSelectedEvent();

    if (!event) {
      return;
    }

    const index = event.dialogues.findIndex((line) => line.id === lineId);

    if (index < 0) {
      return;
    }

    const target = index + direction;

    if (target < 0 || target >= event.dialogues.length) {
      return;
    }

    const [line] = event.dialogues.splice(index, 1);
    event.dialogues.splice(target, 0, line);
    markDirty();
    renderEventEditor();
  }

  function selectEvent(eventId) {
    readEditorForms();
    selectedEventId = eventId;
    // Do not re-render the global/orbit block — that + scrollIntoView jumped the
    // left list away from the event row the user just clicked.
    withPreservedListScroll(() => {
      renderSummary();
      renderEventEditor();
    });
  }

  function getLocalizedBlock(key) {
    const defaults = {
      transitionPrompt: {
        ko: "다음 설명으로 넘어갈까요?",
        en: "Shall we move on to the next explanation?"
      },
      declineMessage: {
        ko: "설명이 필요하시면 저를 다시 찾아주세요.",
        en: "Please find me again if you would like a guided explanation."
      },
      escPrompt: {
        ko: "투어에서 빠져나가시겠습니까?",
        en: "Would you like to leave the tour?"
      },
      restartTourPrompt: {
        ko: "GUIDE 투어를 다시 시작하시겠습니까?",
        en: "Would you like to start the GUIDE tour again?"
      }
    };
    const current = tourData[key];
    const fallback = defaults[key] || { ko: "", en: "" };
    const ko = String(current?.ko ?? "").trim();
    const en = String(current?.en ?? "").trim();

    return {
      ko: ko || fallback.ko || "",
      en: en || fallback.en || ""
    };
  }

  function ensureOrbitSequences() {
    if (!Array.isArray(tourData.orbitSequences) || tourData.orbitSequences.length === 0) {
      tourData.orbitSequences = [createEmptyOrbitSequence(0)];
    }

    tourData.orbitSpin = tourData.orbitSequences[0];

    if (!selectedOrbitId || !tourData.orbitSequences.some((seq) => seq.id === selectedOrbitId)) {
      selectedOrbitId = tourData.orbitSequences[0].id;
    }
  }

  function getSelectedOrbitSequence() {
    ensureOrbitSequences();
    return tourData.orbitSequences.find((seq) => seq.id === selectedOrbitId) || tourData.orbitSequences[0];
  }

  function getOrbitSpin() {
    return getSelectedOrbitSequence();
  }

  function readOrbitSequenceForm(form) {
    const orbit = getSelectedOrbitSequence();

    if (!form || !orbit) {
      return;
    }

    const nextName = form.querySelector('[name="orbitName"]')?.value?.trim?.();
    let orbitMetaChanged = false;

    if (nextName && nextName !== orbit.name) {
      orbit.name = nextName;
      orbitMetaChanged = true;
    }

    const nextIdRaw = form.querySelector('[name="orbitId"]')?.value?.trim?.();
    if (nextIdRaw && nextIdRaw !== orbit.id) {
      const taken = tourData.orbitSequences.some((seq) => seq.id === nextIdRaw && seq !== orbit);

      if (!taken) {
        const previousId = orbit.id;
        orbit.id = nextIdRaw;
        selectedOrbitId = nextIdRaw;
        orbitMetaChanged = true;
        // Keep dialogue bindings in sync when renaming sequence id.
        tourData.events.forEach((event) => {
          event.dialogues.forEach((line) => {
            if (line.postEvent?.type === "other" && line.postEvent.checkpointId === previousId) {
              line.postEvent.checkpointId = nextIdRaw;
            }
          });
        });
      }
    }

    if (!orbit.position) {
      orbit.position = {};
    }

    if (!orbit.target) {
      orbit.target = {};
    }

    orbit.position.x = readOptionalNumber(form.querySelector('[name="orbitPosX"]')?.value, orbit.position.x);
    orbit.position.y = readOptionalNumber(
      form.querySelector('[name="orbitPosY"]')?.value,
      orbit.position.y ?? orbit.cameraHeight
    );
    orbit.position.z = readOptionalNumber(form.querySelector('[name="orbitPosZ"]')?.value, orbit.position.z);
    // cameraHeight stays as a data alias of camera world-Y.
    orbit.cameraHeight = orbit.position.y;
    orbit.target.x = readOptionalNumber(form.querySelector('[name="orbitTargetX"]')?.value, orbit.target.x);
    orbit.target.y = readOptionalNumber(form.querySelector('[name="orbitTargetY"]')?.value, orbit.target.y);
    orbit.target.z = readOptionalNumber(form.querySelector('[name="orbitTargetZ"]')?.value, orbit.target.z);
    orbit.rotationY = readOptionalNumber(form.querySelector('[name="orbitRotationY"]')?.value, orbit.rotationY);
    orbit.durationSeconds = readOptionalNumber(form.querySelector('[name="orbitDurationSeconds"]')?.value, orbit.durationSeconds);
    orbit.rotationTurns = readOptionalNumber(form.querySelector('[name="orbitRotationTurns"]')?.value, orbit.rotationTurns);
    orbit.pitchOffsetDegrees = readOptionalNumber(
      form.querySelector('[name="orbitPitchOffsetDegrees"]')?.value,
      orbit.pitchOffsetDegrees
    );

    tourData.orbitSpin = tourData.orbitSequences[0];
  }

  function readLocalizedBlock(key, koName, enName, form) {
    if (!tourData[key]) {
      tourData[key] = { ko: "", en: "" };
    }

    tourData[key].ko = form.querySelector(`[name="${koName}"]`)?.value ?? tourData[key].ko;
    tourData[key].en = form.querySelector(`[name="${enName}"]`)?.value ?? tourData[key].en;
  }

  function readGlobalForm() {
    const form = globalEl.querySelector("form");

    if (!form) {
      return;
    }

    tourData.textSpeed = readOptionalNumber(
      form.querySelector('[name="textSpeed"]')?.value,
      tourData.textSpeed
    );
    tourData.lineHoldSeconds = readOptionalNumber(
      form.querySelector('[name="lineHoldSeconds"]')?.value,
      tourData.lineHoldSeconds
    );
    tourData.lineHoldPerChar = readOptionalNumber(
      form.querySelector('[name="lineHoldPerChar"]')?.value,
      tourData.lineHoldPerChar
    );
    tourData.lineHoldMaxExtra = readOptionalNumber(
      form.querySelector('[name="lineHoldMaxExtra"]')?.value,
      tourData.lineHoldMaxExtra
    );
    tourData.dialogDistance = readOptionalNumber(
      form.querySelector('[name="dialogDistance"]')?.value,
      tourData.dialogDistance
    );
    tourData.interactionDistance = readOptionalNumber(
      form.querySelector('[name="interactionDistance"]')?.value,
      tourData.interactionDistance
    );
    tourData.cameraBlendSeconds = readOptionalNumber(
      form.querySelector('[name="cameraBlendSeconds"]')?.value,
      tourData.cameraBlendSeconds
    );
    tourData.idleDanceDelaySeconds = readOptionalNumber(
      form.querySelector('[name="idleDanceDelaySeconds"]')?.value,
      tourData.idleDanceDelaySeconds
    );

    if (!tourData.orbitSequences) {
      ensureOrbitSequences();
    }

    readOrbitSequenceForm(form);

    const talkingRoot = form.querySelector('[data-role="talking-clips"]');
    if (talkingRoot) {
      const talkingClips = readOrderedClipSequence(talkingRoot);
      tourData.talkingClips = talkingClips.length ? talkingClips : ["Talking01", "Talking02"];
    }

    const idleDancePick = String(form.querySelector('[name="idleDanceClip"]')?.value || "").trim();
    tourData.idleDanceClip = idleDancePick || IDLE_DANCE_RANDOM_VALUE;

    if (tourData.idleDanceClip === IDLE_DANCE_RANDOM_VALUE) {
      // Keep authored pool as Dance* fallback when the guest asset has no Dance clips yet.
      tourData.idleDanceClips = tourData.idleDanceClips?.length
        ? tourData.idleDanceClips
        : [...GUIDE_TOUR_GLOBAL_DEFAULTS.idleDanceClips];
    } else {
      tourData.idleDanceClips = [tourData.idleDanceClip];
    }

    if (!tourData.talkingSwitchSeconds) {
      tourData.talkingSwitchSeconds = { min: 3, max: 6 };
    }

    tourData.talkingSwitchSeconds.min = readOptionalNumber(
      form.querySelector('[name="talkingSwitchMin"]')?.value,
      tourData.talkingSwitchSeconds.min
    );
    tourData.talkingSwitchSeconds.max = readOptionalNumber(
      form.querySelector('[name="talkingSwitchMax"]')?.value,
      tourData.talkingSwitchSeconds.max
    );
    tourData.talkingBlendSpeed = readOptionalNumber(
      form.querySelector('[name="talkingBlendSpeed"]')?.value,
      tourData.talkingBlendSpeed ?? 0.045
    );
    tourData.talkingCrossfadeSeconds = readOptionalNumber(
      form.querySelector('[name="talkingCrossfadeSeconds"]')?.value,
      tourData.talkingCrossfadeSeconds ?? 0.45
    );
    markDirty();
    syncDefaultLineTextSpeedDisplays();
  }

  function getGlobalTextSpeedValue() {
    return String(tourData.textSpeed ?? GUIDE_TOUR_GLOBAL_DEFAULTS.textSpeed);
  }

  function syncLineTextSpeedControls(card) {
    const modeSelect = card?.querySelector('[name="lineTextSpeedMode"]');
    const speedInput = card?.querySelector('[name="lineTextSpeed"]');

    if (!modeSelect || !speedInput) {
      return;
    }

    const isDefault = (modeSelect.value || "default") === "default";
    const globalValue = getGlobalTextSpeedValue();

    speedInput.disabled = isDefault;
    speedInput.classList.toggle("is-using-default", isDefault);

    if (isDefault) {
      speedInput.value = globalValue;
      speedInput.setAttribute("value", globalValue);
      return;
    }

    if (speedInput.value === "" || !Number.isFinite(Number(speedInput.value))) {
      speedInput.value = globalValue;
      speedInput.setAttribute("value", globalValue);
    }
  }

  function syncDefaultLineTextSpeedDisplays() {
    const dialogueRoot = editorEl.querySelector('[data-role="dialogue-list"]');
    dialogueRoot?.querySelectorAll("[data-line-id]").forEach((card) => {
      const mode = card.querySelector('[name="lineTextSpeedMode"]')?.value || "default";
      if (mode === "default") {
        syncLineTextSpeedControls(card);
      }
    });
  }

  function readEventDialogues(container) {
    const event = getSelectedEvent();

    if (!event || !container) {
      return;
    }

    container.querySelectorAll("[data-line-id]").forEach((card) => {
      const lineId = card.getAttribute("data-line-id");
      const line = event.dialogues.find((item) => item.id === lineId);

      if (!line) {
        return;
      }

      line.ko = card.querySelector('[name="ko"]')?.value ?? line.ko;
      line.en = card.querySelector('[name="en"]')?.value ?? line.en;
      const speedMode = card.querySelector('[name="lineTextSpeedMode"]')?.value || "default";
      if (speedMode === "default") {
        line.textSpeed = null;
      } else {
        const speedRaw = card.querySelector('[name="lineTextSpeed"]')?.value ?? "";
        const speedNum = Number(speedRaw);
        line.textSpeed = speedRaw === "" || !Number.isFinite(speedNum) ? null : speedNum;
      }

      if (!line.postEvent) {
        line.postEvent = { type: "none", comment: "", checkpointId: "" };
      }

      const postSelect = card.querySelector('[name="postEventType"]');
      const postSelectValue = postSelect?.value;

      // Only overwrite postEvent when the select has a real choice.
      // Empty/missing values would wipe startTourChoice / orbitAfter.
      if (postSelectValue) {
        const decoded = decodePostEventSelectValue(postSelectValue);
        line.postEvent.type = decoded.type;
        line.postEvent.checkpointId = decoded.checkpointId;
      }

      // postEvent.comment is editor-unused; do not collect it.
      syncDialogueLinePostEvent(line);
    });

    refreshDialoguePostBadges(container);
    markDirty();
  }

  function refreshDialoguePostBadges(container = editorEl.querySelector('[data-role="dialogue-list"]')) {
    const event = getSelectedEvent();

    if (!event || !container) {
      return;
    }

    const sequences = tourData.orbitSequences || [];

    container.querySelectorAll("[data-line-id]").forEach((card) => {
      const lineId = card.getAttribute("data-line-id");
      const line = event.dialogues.find((item) => item.id === lineId);
      const host = card.querySelector('[data-role="line-post-badges"]');

      if (!line || !host) {
        return;
      }

      const labels = formatPostEventBadgeLabels(line, sequences);
      host.innerHTML = labels
        .map((name) => `<span class="guide-manager-badge">${escapeHtml(name)}</span>`)
        .join("");
      host.hidden = labels.length === 0;
    });
  }

  function readEditorForms() {
    readGlobalForm();
    const commonForm = editorEl.querySelector('[data-role="common-form"]');
    const eventForm = editorEl.querySelector('[data-role="event-form"]');
    const dialogueRoot = editorEl.querySelector('[data-role="dialogue-list"]');

    if (commonForm) {
      readCommonForm(commonForm);
    }

    if (eventForm) {
      readEventForm(eventForm);
    }

    if (dialogueRoot) {
      readEventDialogues(dialogueRoot);
    }
  }

  function getListScrollHost() {
    return root.querySelector(".npc-manager-panel__list");
  }

  function withPreservedListScroll(fn) {
    const host = getListScrollHost();
    const top = host?.scrollTop ?? 0;
    const left = host?.scrollLeft ?? 0;
    fn();

    if (host) {
      host.scrollTop = top;
      host.scrollLeft = left;
    }
  }

  function captureGlobalDetailsOpen() {
    globalEl.querySelectorAll("details[data-gm-section]").forEach((node) => {
      const key = node.getAttribute("data-gm-section");

      if (key) {
        globalDetailsOpen[key] = Boolean(node.open);
      }
    });
  }

  function detailsOpenAttr(sectionKey) {
    return globalDetailsOpen[sectionKey] ? " open" : "";
  }

  function renderGlobalForm(options = {}) {
    captureGlobalDetailsOpen();
    ensureOrbitSequences();
    const globals = {
      textSpeed: Number.isFinite(Number(tourData.textSpeed))
        ? Number(tourData.textSpeed)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.textSpeed,
      lineHoldSeconds: Number.isFinite(Number(tourData.lineHoldSeconds))
        ? Number(tourData.lineHoldSeconds)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.lineHoldSeconds,
      lineHoldPerChar: Number.isFinite(Number(tourData.lineHoldPerChar))
        ? Number(tourData.lineHoldPerChar)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.lineHoldPerChar,
      lineHoldMaxExtra: Number.isFinite(Number(tourData.lineHoldMaxExtra))
        ? Number(tourData.lineHoldMaxExtra)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.lineHoldMaxExtra,
      dialogDistance: Number.isFinite(Number(tourData.dialogDistance))
        ? Number(tourData.dialogDistance)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.dialogDistance,
      interactionDistance: Number.isFinite(Number(tourData.interactionDistance))
        ? Number(tourData.interactionDistance)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.interactionDistance,
      cameraBlendSeconds: Number.isFinite(Number(tourData.cameraBlendSeconds))
        ? Number(tourData.cameraBlendSeconds)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.cameraBlendSeconds,
      idleDanceDelaySeconds: Number.isFinite(Number(tourData.idleDanceDelaySeconds))
        ? Number(tourData.idleDanceDelaySeconds)
        : GUIDE_TOUR_GLOBAL_DEFAULTS.idleDanceDelaySeconds
    };
    // Keep tourData in sync so empty overlays still show/save real values.
    Object.assign(tourData, globals);

    const orbit = getOrbitSpin();
    const talkingSwitch = tourData.talkingSwitchSeconds || { min: 3, max: 6 };
    const talkingClips = tourData.talkingClips?.length
      ? tourData.talkingClips
      : ["Talking01", "Talking02"];
    const idleDanceClipValue = String(tourData.idleDanceClip || IDLE_DANCE_RANDOM_VALUE).trim()
      || IDLE_DANCE_RANDOM_VALUE;
    const idleDanceSelectOptions = [
      { value: IDLE_DANCE_RANDOM_VALUE, label: "랜덤 (Dance* 클립)" },
      ...clipSelectOptions(GUIDE_IDLE_DANCE_CLIP_OPTIONS, idleDanceClipValue === IDLE_DANCE_RANDOM_VALUE ? "" : idleDanceClipValue)
        .filter((opt) => opt.value !== IDLE_DANCE_RANDOM_VALUE)
    ];

    globalEl.innerHTML = `
      <form class="guide-manager-global-form">
        <details class="guide-manager-details guide-manager-details--tone-speed" data-gm-section="speed"${detailsOpenAttr("speed")}>
          ${detailsSummary("전역 속도·거리")}
          <div class="guide-manager-grid">
            ${field("대본 기준 타이핑 속도", numInput(globals.textSpeed, "0.001", "textSpeed")).outerHTML}
            ${field("대사 대기(초)", numInput(globals.lineHoldSeconds, "0.05", "lineHoldSeconds")).outerHTML}
            ${field("글자당 추가 대기", numInput(globals.lineHoldPerChar, "0.001", "lineHoldPerChar")).outerHTML}
            ${field("추가 대기 상한", numInput(globals.lineHoldMaxExtra, "0.05", "lineHoldMaxExtra")).outerHTML}
            ${field("대화 거리(m)", numInput(globals.dialogDistance, "0.05", "dialogDistance")).outerHTML}
            ${field("상호작용 거리(m)", numInput(globals.interactionDistance, "0.05", "interactionDistance")).outerHTML}
            ${field("카메라 블렌드(초)", numInput(globals.cameraBlendSeconds, "0.05", "cameraBlendSeconds")).outerHTML}
          </div>
          <p class="guide-manager-hint">개별 타이핑 속도가 <strong>기본값</strong>이면 위 대본 기준 타이핑 속도를 사용합니다.</p>
        </details>

        <details class="guide-manager-details guide-manager-details--tone-orbit" data-gm-section="orbit"${detailsOpenAttr("orbit")}>
          ${detailsSummary("오르빗 시퀀스 (360° 궤도)")}
          <div class="guide-manager-orbit-list" data-role="orbit-sequence-list">
            ${(tourData.orbitSequences || []).map((seq) => `
              <button type="button" class="guide-manager-orbit-item${seq.id === orbit.id ? " is-selected" : ""}" data-action="select-orbit" data-orbit-id="${escapeHtml(seq.id)}">
                <strong>${escapeHtml(seq.name || seq.id)}</strong>
                <span>${Number(seq.durationSeconds).toFixed(0)}s · ${Number(seq.rotationTurns).toFixed(1)}회전</span>
              </button>
            `).join("")}
          </div>
          <div class="guide-manager-inline-actions">
            <button type="button" data-action="add-orbit">+ 시퀀스 추가</button>
            <button type="button" data-action="duplicate-orbit">복제</button>
            <button type="button" data-action="delete-orbit"${(tourData.orbitSequences || []).length <= 1 ? " disabled" : ""}>삭제</button>
          </div>
          <div class="guide-manager-grid">
            ${field("이름", textInput(orbit.name, "사이트 전경", "orbitName")).outerHTML}
            ${field("ID", textInput(orbit.id, "orbit_spin", "orbitId")).outerHTML}
          </div>
          <div class="guide-manager-orbit-pose-split">
            <div class="guide-manager-orbit-pose-col guide-manager-orbit-pose-col--camera">
              <h5 class="guide-manager-orbit-pose-col__title">카메라</h5>
              <div class="guide-manager-orbit-pose-col__fields">
                ${field("카메라 X", numInput(orbit.position.x, "0.01", "orbitPosX")).outerHTML}
                ${field("카메라 Y", numInput(orbit.position.y ?? orbit.cameraHeight, "0.01", "orbitPosY")).outerHTML}
                ${field("카메라 Z", numInput(orbit.position.z, "0.01", "orbitPosZ")).outerHTML}
              </div>
            </div>
            <div class="guide-manager-orbit-pose-col guide-manager-orbit-pose-col--target">
              <h5 class="guide-manager-orbit-pose-col__title">중심점</h5>
              <div class="guide-manager-orbit-pose-col__fields">
                ${field("중심점 X", numInput(orbit.target.x, "0.01", "orbitTargetX")).outerHTML}
                ${field("중심점 Y", numInput(orbit.target.y, "0.01", "orbitTargetY")).outerHTML}
                ${field("중심점 Z", numInput(orbit.target.z, "0.01", "orbitTargetZ")).outerHTML}
              </div>
            </div>
          </div>
          <div class="guide-manager-grid">
            ${field("시작 각도 (rad)", numInput(orbit.rotationY, "0.0001", "orbitRotationY")).outerHTML}
            ${field("회전 시간 (초)", numInput(orbit.durationSeconds, "0.1", "orbitDurationSeconds")).outerHTML}
            ${field("회전 수 (1=360°)", numInput(orbit.rotationTurns, "0.1", "orbitRotationTurns")).outerHTML}
            ${field("피치 보정 (°)", numInput(orbit.pitchOffsetDegrees, "0.1", "orbitPitchOffsetDegrees")).outerHTML}
          </div>
          <p class="guide-manager-hint">「오르빗뷰 가져오기」는 지금 메타버스 창 Orbit View 카메라/중심점을 그대로 넣습니다. 회전 속도 ≈ ${((Number(orbit.rotationTurns) * 360) / Math.max(Number(orbit.durationSeconds) || 1, 0.1)).toFixed(1)}°/s</p>
          <div class="guide-manager-orbit-action-grid">
            <button type="button" data-action="show-orbit-center-gizmo">중심점 기즈모 표시</button>
            <button type="button" data-action="capture-orbit-center">기즈모 → 중심점</button>
            <button type="button" data-action="hide-orbit-center-gizmo">기즈모 숨김</button>
            <button type="button" data-action="capture-orbit-cam">오르빗뷰 가져오기</button>
            <button type="button" data-action="preview-orbit-cam">시퀀스 미리보기</button>
            <button type="button" data-action="stop-orbit-preview">미리보기 중지</button>
          </div>
        </details>

        <details class="guide-manager-details guide-manager-details--tone-talking" data-gm-section="talkingIdle"${detailsOpenAttr("talkingIdle")}>
          ${detailsSummary("대화행동 / Idle 설정")}
          <div class="guide-manager-field-block">
            <span class="guide-manager-field-block__label">Talking 클립 (순서대로, 중복 가능)</span>
            ${renderOrderedClipSequence(
              talkingClips,
              GUIDE_TALKING_CLIP_OPTIONS,
              "talking-clips",
              "Talking 클립을 추가하세요."
            )}
          </div>
          <div class="guide-manager-grid">
            ${field("전환 최소(초)", numInput(talkingSwitch.min, "0.1", "talkingSwitchMin")).outerHTML}
            ${field("전환 최대(초)", numInput(talkingSwitch.max, "0.1", "talkingSwitchMax")).outerHTML}
            ${field("talkingBlendSpeed", numInput(tourData.talkingBlendSpeed ?? 0.045, "0.001", "talkingBlendSpeed")).outerHTML}
            ${field("talkingCrossfade(초)", numInput(tourData.talkingCrossfadeSeconds ?? 0.45, "0.01", "talkingCrossfadeSeconds")).outerHTML}
            ${field("Idle 댄스 지연(초)", numInput(globals.idleDanceDelaySeconds, "1", "idleDanceDelaySeconds")).outerHTML}
            ${field("Idle 댄스 클립", selectInput(idleDanceSelectOptions, idleDanceClipValue, "idleDanceClip")).outerHTML}
          </div>
          <p class="guide-manager-hint">Talking 클립은 위에서 아래 순서대로 반복 재생됩니다. Idle 댄스는 고정 클립 또는 <strong>Dance</strong>로 시작하는 클립 중 랜덤입니다.</p>
        </details>

        <p class="guide-manager-hint guide-manager-hint--global">
          localStorage <strong>저장</strong>은 이 브라우저용,
          Firestore <strong>현재값 쓰기 / 배포</strong>는 공용 런타임용입니다.
          ${enableLiveApply ? "편집 내용은 메타버스 창에 <strong>실시간 적용</strong>됩니다." : "변경 후 <strong>적용</strong> 또는 <strong>저장</strong>을 눌러 반영하세요."}
        </p>
      </form>
    `;

    const form = globalEl.querySelector("form");
    form?.addEventListener("input", () => {
      readGlobalForm();
      markDirty();
    });
    form?.addEventListener("change", () => {
      readGlobalForm();
      markDirty();
    });

    // Refresh dialogue dropdown labels when sequence name/id is committed.
    form?.querySelector('[name="orbitName"]')?.addEventListener("change", () => {
      readEditorForms();
      renderEventEditor();
    });
    form?.querySelector('[name="orbitId"]')?.addEventListener("change", () => {
      readEditorForms();
      renderEventEditor();
    });

    bindOrderedClipSequence(
      form?.querySelector('[data-role="talking-clips"]'),
      () => {
        readGlobalForm();
        markDirty();
        renderGlobalForm();
      }
    );

    form?.querySelectorAll("details[data-gm-section]").forEach((node) => {
      node.addEventListener("toggle", () => {
        const key = node.getAttribute("data-gm-section");

        if (key) {
          globalDetailsOpen[key] = Boolean(node.open);
        }
      });
    });

    form?.querySelector('[data-action="capture-orbit-cam"]')?.addEventListener("click", () => {
      void captureOrbitCameraIntoForm();
    });
    form?.querySelector('[data-action="preview-orbit-cam"]')?.addEventListener("click", () => {
      void previewOrbitCameraFromForm();
    });
    form?.querySelector('[data-action="stop-orbit-preview"]')?.addEventListener("click", () => {
      void Promise.resolve(getGuideTourSystem()?.stopOrbitPreview?.({ restore: true })).then((stopped) => {
        setStatus(stopped ? "오르빗 미리보기를 취소했습니다." : "진행 중인 오르빗 미리보기가 없습니다.");
      });
    });
    form?.querySelector('[data-action="show-orbit-center-gizmo"]')?.addEventListener("click", () => {
      void showOrbitCenterGizmoInScene();
    });
    form?.querySelector('[data-action="capture-orbit-center"]')?.addEventListener("click", () => {
      void captureOrbitCenterIntoForm();
    });
    form?.querySelector('[data-action="hide-orbit-center-gizmo"]')?.addEventListener("click", () => {
      void Promise.resolve(getGuideTourSystem()?.hideOrbitCenterGizmo?.());
      setStatus("중심점 기즈모를 숨겼습니다.");
    });
    form?.querySelectorAll('[data-action="select-orbit"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        readEditorForms();
        selectedOrbitId = btn.getAttribute("data-orbit-id");
        renderGlobalForm({ scrollOrbitIntoView: true });
      });
    });
    form?.querySelector('[data-action="add-orbit"]')?.addEventListener("click", () => {
      readEditorForms();
      ensureOrbitSequences();
      const seq = createEmptyOrbitSequence(tourData.orbitSequences.length);
      tourData.orbitSequences.push(seq);
      selectedOrbitId = seq.id;
      tourData.orbitSpin = tourData.orbitSequences[0];
      markDirty();
      render();
      setStatus(`오르빗 시퀀스「${seq.name}」를 추가했습니다. 대본「다음 이벤트」에 바로 선택할 수 있습니다.`);
    });
    form?.querySelector('[data-action="duplicate-orbit"]')?.addEventListener("click", () => {
      readEditorForms();
      const source = getSelectedOrbitSequence();
      const copy = createEmptyOrbitSequence(tourData.orbitSequences.length);
      Object.assign(copy, JSON.parse(JSON.stringify(source)), {
        id: `orbit_${Date.now().toString(36)}`,
        name: `${source.name || source.id} 복사`
      });
      tourData.orbitSequences.push(copy);
      selectedOrbitId = copy.id;
      tourData.orbitSpin = tourData.orbitSequences[0];
      markDirty();
      render();
      setStatus(`「${copy.name}」로 복제했습니다. 대본「다음 이벤트」목록에 반영되었습니다.`);
    });
    form?.querySelector('[data-action="delete-orbit"]')?.addEventListener("click", () => {
      readEditorForms();
      ensureOrbitSequences();

      if (tourData.orbitSequences.length <= 1) {
        setStatus("최소 1개의 오르빗 시퀀스가 필요합니다.");
        return;
      }

      const removing = getSelectedOrbitSequence();
      tourData.orbitSequences = tourData.orbitSequences.filter((seq) => seq.id !== removing.id);
      // Remap dialogue bindings that pointed at the deleted sequence.
      tourData.events.forEach((event) => {
        event.dialogues.forEach((line) => {
          if (line.postEvent?.type === "other" && line.postEvent.checkpointId === removing.id) {
            line.postEvent.checkpointId = tourData.orbitSequences[0].id;
            line.orbitAfter = true;
            syncDialogueLinePostEvent(line);
          }
        });
      });
      selectedOrbitId = tourData.orbitSequences[0].id;
      tourData.orbitSpin = tourData.orbitSequences[0];
      markDirty();
      render();
      setStatus(`「${removing.name}」시퀀스를 삭제했습니다.`);
    });

    if (options.scrollOrbitIntoView === true) {
      requestAnimationFrame(() => {
        form?.querySelector(".guide-manager-orbit-item.is-selected")?.scrollIntoView({
          block: "nearest",
          inline: "nearest"
        });
      });
    }
  }

  async function isPreviewAllowed() {
    try {
      return Boolean(await Promise.resolve(canPreview()));
    } catch {
      return false;
    }
  }

  async function captureOrbitCameraIntoForm() {
    readEditorForms();
    const captured = await Promise.resolve(getGuideTourSystem()?.captureOrbitSpinCamera?.());

    if (!captured?.position || !captured?.target) {
      setStatus("오르빗 카메라를 읽을 수 없습니다. Orbit View에서 시도하세요.");
      return;
    }

    const orbit = getSelectedOrbitSequence();
    orbit.position = {
      x: captured.position.x,
      y: captured.position.y,
      z: captured.position.z
    };
    orbit.target = {
      x: captured.target.x,
      y: captured.target.y,
      z: captured.target.z
    };
    orbit.cameraHeight = captured.position.y;
    orbit.rotationY = captured.rotationY;
    // Captured world pose already includes the current tilt. Extra pitch
    // offset would replay the view at a different beta.
    orbit.pitchOffsetDegrees = 0;
    tourData.orbitSpin = tourData.orbitSequences[0];
    markDirty();
    renderGlobalForm();
    setStatus(`현재 Orbit View 카메라(실시간)를「${orbit.name}」에 넣었습니다.`);
  }

  async function previewOrbitCameraFromForm() {
    if (!await isPreviewAllowed()) {
      setStatus("앵지 주간 모드에서만 미리보기할 수 있습니다.");
      return;
    }

    readEditorForms();
    applyRuntime(false);
    const orbit = getSelectedOrbitSequence();

    if (!orbit?.position || !orbit?.target) {
      setStatus("시퀀스 카메라/중심점 값이 없습니다.");
      return;
    }

    // Plain clone so popup RPC / postMessage always carries the form values.
    const payload = {
      id: orbit.id,
      name: orbit.name,
      position: {
        x: Number(orbit.position.x) || 0,
        y: Number(orbit.position.y ?? orbit.cameraHeight) || 0,
        z: Number(orbit.position.z) || 0
      },
      target: {
        x: Number(orbit.target.x) || 0,
        y: Number(orbit.target.y) || 0,
        z: Number(orbit.target.z) || 0
      },
      cameraHeight: Number(orbit.position.y ?? orbit.cameraHeight) || 0,
      rotationY: Number.isFinite(Number(orbit.rotationY)) ? Number(orbit.rotationY) : orbit.rotationY,
      durationSeconds: Math.max(0.1, Number(orbit.durationSeconds) || 10),
      rotationTurns: Number(orbit.rotationTurns) || 1,
      pitchOffsetDegrees: Number.isFinite(Number(orbit.pitchOffsetDegrees))
        ? Number(orbit.pitchOffsetDegrees)
        : -12
    };

    const ok = await Promise.resolve(
      getGuideTourSystem()?.previewOrbitSpin?.(payload, { animated: true })
    );
    setStatus(
      ok
        ? `「${orbit.name}」오르빗 미리보기 재생 중… (메타버스 창에서 ESC로 취소)`
        : "오르빗 미리보기에 실패했습니다. 앵지 주간 Orbit View에서 시도하세요."
    );
  }

  async function showOrbitCenterGizmoInScene() {
    readEditorForms();
    const orbit = getSelectedOrbitSequence();
    const shown = await Promise.resolve(getGuideTourSystem()?.showOrbitCenterGizmo?.(orbit.target));

    if (!shown) {
      setStatus("중심점 기즈모를 표시하지 못했습니다.");
      return;
    }

    setStatus("메타버스 화면에서 중심점 기즈모를 이동한 뒤「기즈모 → 중심점」을 누르세요.");
  }

  async function captureOrbitCenterIntoForm() {
    readEditorForms();
    const captured = await Promise.resolve(getGuideTourSystem()?.captureOrbitCenterFromGizmo?.());

    if (!captured) {
      setStatus("중심점 기즈모가 없습니다. 먼저「중심점 기즈모 표시」를 누르세요.");
      return;
    }

    const orbit = getSelectedOrbitSequence();
    orbit.target = { ...captured };
    tourData.orbitSpin = tourData.orbitSequences[0];
    markDirty();
    renderGlobalForm();
    setStatus(`「${orbit.name}」중심점을 기즈모 위치로 반영했습니다.`);
  }

  function renderSummary() {
    const rows = getEventSummaryRows(tourData);
    const selectedIndex = tourData.events.findIndex((item) => item.id === selectedEventId);
    const canMoveUp = selectedIndex > 0;
    const canMoveDown = selectedIndex >= 0 && selectedIndex < tourData.events.length - 1;

    summaryEl.innerHTML = `
      <div class="guide-manager-event-toolbar">
        <h3 class="guide-manager-event-list__title">이벤트 (${rows.length})</h3>
        <div class="guide-manager-event-toolbar__actions">
          <button type="button" data-action="move-event-up"${canMoveUp ? "" : " disabled"} aria-label="이벤트 위로">↑</button>
          <button type="button" data-action="move-event-down"${canMoveDown ? "" : " disabled"} aria-label="이벤트 아래로">↓</button>
          <button type="button" data-action="add-event">+ 이벤트</button>
          <button type="button" data-action="delete-event">삭제</button>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>ID</th><th>제목</th><th>대사</th><th>위치</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-event-id="${row.id}" class="${row.id === selectedEventId ? "is-selected" : ""}">
              <td>${row.id}</td>
              <td>${escapeHtml(row.title)}</td>
              <td>${row.lineCount}</td>
              <td>${row.position.x.toFixed(1)}, ${row.position.y.toFixed(1)}, ${row.position.z.toFixed(1)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    summaryEl.querySelectorAll("tr[data-event-id]").forEach((row) => {
      row.addEventListener("click", () => {
        selectEvent(row.getAttribute("data-event-id"));
      });
    });
  }

  function readEventForm(form) {
    const event = getSelectedEvent();

    if (!event || !form) {
      return;
    }

    event.title = form.querySelector('[name="title"]')?.value.trim() || event.title;
    markDirty();

    const titleMirror = editorEl.querySelector("[data-role='event-title-mirror']");
    if (titleMirror) {
      const titleText = event.title || "";
      titleMirror.textContent = titleText
        ? `이벤트 ${event.id} (${titleText})`
        : `이벤트 ${event.id}`;
    }

    // Keep left event list title in sync while typing.
    const listRow = summaryEl.querySelector(`tr[data-event-id="${event.id}"] td:nth-child(2)`);
    if (listRow) {
      listRow.textContent = event.title || "";
    }
  }

  function readCommonForm(form) {
    if (!form) {
      return;
    }

    readLocalizedBlock("transitionPrompt", "transitionPromptKo", "transitionPromptEn", form);
    readLocalizedBlock("declineMessage", "declineMessageKo", "declineMessageEn", form);
    readLocalizedBlock("escPrompt", "escPromptKo", "escPromptEn", form);
    readLocalizedBlock("restartTourPrompt", "restartTourPromptKo", "restartTourPromptEn", form);

    const closingRoot = form.querySelector('[data-role="closing-clips"]');
    if (closingRoot) {
      const closing = readOrderedClipSequence(closingRoot);
      tourData.closingAnimations = closing.length
        ? closing
        : ["Greeting_bow", "Greeting_Hand", "Idle"];
    }

    markDirty();
  }

  function renderDialogueSets(event) {
    ensureOrbitSequences();
    const sequences = tourData.orbitSequences || [];
    const postEventOptions = buildPostEventSelectOptions(sequences);
    const knownOrbitIds = new Set(sequences.map((seq) => seq.id));

    return event.dialogues.map((line, index) => {
      syncDialogueLinePostEvent(line);

      // If a line still points at a removed orbit id, fall back to the first sequence.
      if (
        line.postEvent?.type === "other"
        && line.postEvent.checkpointId
        && !knownOrbitIds.has(line.postEvent.checkpointId)
        && sequences[0]
      ) {
        line.postEvent.checkpointId = sequences[0].id;
        line.orbitAfter = true;
      }

      const postSelectValue = encodePostEventSelectValue(line.postEvent || {}, line);
      const isFirst = index === 0;
      const isLast = index === event.dialogues.length - 1;

      return `
        <article class="guide-manager-dialog-set guide-manager-dialog-set--tone-line" data-line-id="${line.id}">
          <header class="guide-manager-dialog-set__head">
            <strong>#${index + 1} · ${line.id}</strong>
            ${codedBadges(line, sequences)}
            <div class="guide-manager-dialog-set__actions">
              <button type="button" data-action="preview-line-tts" data-line-id="${line.id}">▶ 미리듣기</button>
              <button type="button" data-action="move-line-up" data-line-id="${line.id}"${isFirst ? " disabled" : ""} aria-label="위로">↑</button>
              <button type="button" data-action="move-line-down" data-line-id="${line.id}"${isLast ? " disabled" : ""} aria-label="아래로">↓</button>
              <button type="button" data-action="delete-line" data-line-id="${line.id}">삭제</button>
            </div>
          </header>
          <div class="guide-manager-dialog-set__pair">
            <label class="guide-manager-dialog-set__field">
              <span>한글대사</span>
              <textarea name="ko" rows="2">${escapeHtml(line.ko)}</textarea>
            </label>
            <label class="guide-manager-dialog-set__field guide-manager-dialog-set__field--en">
              <span>영문대사</span>
              <textarea name="en" rows="2">${escapeHtml(line.en)}</textarea>
            </label>
          </div>
          <div class="guide-manager-dialog-set__meta">
            ${renderLineTextSpeedField(
              line,
              tourData.textSpeed ?? GUIDE_TOUR_GLOBAL_DEFAULTS.textSpeed
            )}
            ${field("다음 이벤트", selectInput(postEventOptions, postSelectValue, "postEventType")).outerHTML}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderEventEditor() {
    const event = getSelectedEvent();
    const transitionPrompt = getLocalizedBlock("transitionPrompt");
    const declineMessage = getLocalizedBlock("declineMessage");
    const escPrompt = getLocalizedBlock("escPrompt");
    const restartTourPrompt = getLocalizedBlock("restartTourPrompt");
    const closingClips = tourData.closingAnimations?.length
      ? tourData.closingAnimations
      : ["Greeting_bow", "Greeting_Hand", "Idle"];

    const commonSection = `
      <section class="guide-manager-section guide-manager-section--common guide-manager-section--tone-common">
        <h3>이벤트(공통)</h3>
        <form data-role="common-form" class="guide-manager-common-form">
          <details class="guide-manager-details guide-manager-details--tone-prompts" open>
            ${detailsSummary("시스템 문구")}
            <div class="guide-manager-common-prompts">
              <div class="guide-manager-common-prompt">
                <h4>다음 설명</h4>
                <div class="guide-manager-common-prompt__stack">
                  ${field("한글대사", textarea(transitionPrompt.ko, 2, "transitionPromptKo")).outerHTML}
                  ${field("영문대사", textarea(transitionPrompt.en, 2, "transitionPromptEn")).outerHTML}
                </div>
              </div>
              <div class="guide-manager-common-prompt">
                <h4>투어 거절</h4>
                <div class="guide-manager-common-prompt__stack">
                  ${field("한글대사", textarea(declineMessage.ko, 2, "declineMessageKo")).outerHTML}
                  ${field("영문대사", textarea(declineMessage.en, 2, "declineMessageEn")).outerHTML}
                </div>
              </div>
              <div class="guide-manager-common-prompt">
                <h4>ESC 종료 확인</h4>
                <div class="guide-manager-common-prompt__stack">
                  ${field("한글대사", textarea(escPrompt.ko, 2, "escPromptKo")).outerHTML}
                  ${field("영문대사", textarea(escPrompt.en, 2, "escPromptEn")).outerHTML}
                </div>
              </div>
              <div class="guide-manager-common-prompt">
                <h4>투어 재시작</h4>
                <div class="guide-manager-common-prompt__stack">
                  ${field("한글대사", textarea(restartTourPrompt.ko, 2, "restartTourPromptKo")).outerHTML}
                  ${field("영문대사", textarea(restartTourPrompt.en, 2, "restartTourPromptEn")).outerHTML}
                </div>
              </div>
            </div>
          </details>
          <div class="guide-manager-field-block guide-manager-field-block--tone-closing">
            <span class="guide-manager-field-block__label">종료 애니 (순서대로, 중복 가능)</span>
            ${renderOrderedClipSequence(
              closingClips,
              GUIDE_CLOSING_CLIP_OPTIONS,
              "closing-clips",
              "종료 애니 클립을 추가하세요."
            )}
            <p class="guide-manager-hint">투어 마지막 이벤트 종료 후 위 순서대로 모두 재생되고, 마지막 클립이 끝나면 투어가 완료됩니다.</p>
          </div>
        </form>
      </section>
    `;

    if (!event) {
      editorEl.innerHTML = `
        <div class="guide-manager-editor-layout">
          ${commonSection}
          <section class="guide-manager-section guide-manager-section--script guide-manager-section--tone-script">
            <h3 class="guide-manager-section__fixed-title">이벤트(대본관리)</h3>
            <p class="npc-manager-empty">왼쪽에서 이벤트를 선택하세요.</p>
          </section>
        </div>
      `;
      wireCommonForm();
      return;
    }

    const eventHeading = event.title
      ? `이벤트 ${event.id} (${event.title})`
      : `이벤트 ${event.id}`;
    const poseText = `위치 ${Number(event.guidePosition.x).toFixed(2)}, ${Number(event.guidePosition.y).toFixed(2)}, ${Number(event.guidePosition.z).toFixed(2)} · ${radiansToDegrees(event.guideRotationY).toFixed(1)}° · Tour 마커/기즈모`;

    editorEl.innerHTML = `
      <div class="guide-manager-editor-layout">
        ${commonSection}
        <section class="guide-manager-section guide-manager-section--script guide-manager-section--tone-script">
          <h3 class="guide-manager-section__fixed-title">이벤트(대본관리)</h3>
          <div class="guide-manager-script-body">
            <div class="guide-manager-event-meta guide-manager-event-meta--tone-event">
              <div class="guide-manager-event-head">
                <h4 class="guide-manager-event-head__heading" data-role="event-title-mirror">${escapeHtml(eventHeading)}</h4>
              </div>
              <form data-role="event-form" class="guide-manager-event-form">
                ${field("제목", textInput(event.title, "", "title")).outerHTML}
                <p class="guide-manager-readonly-pose" data-role="guide-pose-readonly">${escapeHtml(poseText)}</p>
              </form>
            </div>
            <div class="guide-manager-lines__toolbar">
              <h4>대본 (${event.dialogues.length})</h4>
              <div class="guide-manager-dialog-toolbar">
                <button type="button" data-action="add-line">+ 대사 세트</button>
                <button type="button" data-action="preview-all-tts" class="npc-manager-primary">▶ 전체 대본 미리듣기</button>
                <button type="button" data-action="stop-tts">■ 중지</button>
              </div>
            </div>
            <div class="guide-manager-dialog-list" data-role="dialogue-list">
              ${renderDialogueSets(event)}
            </div>
            <p class="guide-manager-hint">${enableLiveApply
              ? "다음 이벤트 YES/NO·궤도는 자동 연동됩니다. 수정 내용은 메타버스 창에 실시간 반영됩니다."
              : "다음 이벤트에서 YES/NO 또는 오르빗 시퀀스를 고르면 해당 대사 직후 실행됩니다. 전역·대본 수정 후 <strong>적용</strong> 또는 <strong>저장</strong>을 눌러 NORMAL MODE에 반영하세요."}</p>
          </div>
        </section>
      </div>
    `;

    wireCommonForm();

    const eventForm = editorEl.querySelector('[data-role="event-form"]');
    const dialogueRoot = editorEl.querySelector('[data-role="dialogue-list"]');

    const bindFormInput = (form, reader) => {
      form?.addEventListener("input", () => reader());
      form?.addEventListener("change", () => reader());
    };

    bindFormInput(eventForm, () => readEventForm(eventForm));
    bindFormInput(dialogueRoot, () => readEventDialogues(dialogueRoot));

    dialogueRoot?.querySelectorAll(".guide-manager-line-speed").forEach((wrap) => {
      const card = wrap.closest("[data-line-id]");
      const modeSelect = wrap.querySelector('[name="lineTextSpeedMode"]');
      modeSelect?.addEventListener("change", () => {
        syncLineTextSpeedControls(card);
        readEventDialogues(dialogueRoot);
      });
      syncLineTextSpeedControls(card);
    });

    editorEl.querySelector('[data-action="add-line"]')?.addEventListener("click", (clickEvent) => {
      clickEvent.stopPropagation();
      addDialogueSetToSelectedEvent();
    });

    dialogueRoot?.querySelectorAll('[data-action="move-line-up"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        moveDialogueLine(btn.getAttribute("data-line-id"), -1);
      });
    });

    dialogueRoot?.querySelectorAll('[data-action="move-line-down"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        moveDialogueLine(btn.getAttribute("data-line-id"), 1);
      });
    });

    dialogueRoot?.querySelectorAll('[data-action="delete-line"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        readEditorForms();
        const selected = getSelectedEvent();

        if (!selected) {
          return;
        }

        if (selected.dialogues.length <= 1) {
          setStatus("이벤트에는 최소 1개의 대사가 필요합니다.");
          return;
        }

        const lineId = btn.getAttribute("data-line-id");
        selected.dialogues = selected.dialogues.filter((item) => item.id !== lineId);
        markDirty();
        renderEventEditor();
      });
    });

    editorEl.querySelector('[data-action="stop-tts"]')?.addEventListener("click", () => {
      stopSpeechTts();
      setStatus("TTS 중지");
    });

    editorEl.querySelector('[data-action="preview-all-tts"]')?.addEventListener("click", () => {
      void (async () => {
        readEditorForms();

        if (!isSpeechTtsAvailable()) {
          setStatus("이 브라우저는 TTS를 지원하지 않습니다. Chrome/Edge를 사용해 주세요.");
          return;
        }

        const lines = getSelectedEvent()?.dialogues
          ?.map((line) => String(line.ko || line.en || "").trim())
          .filter(Boolean);

        if (!lines.length) {
          setStatus("미리들을 대본이 없습니다.");
          return;
        }

        setStatus(`전체 대본 미리듣기 (${lines.length}줄)…`);
        const ok = await speakTextsWithPrefs(lines, loadTtsPrefs());
        setStatus(ok ? "전체 대본 TTS 미리듣기 완료" : "TTS 미리듣기 중단/실패");
      })();
    });

    dialogueRoot?.querySelectorAll('[data-action="preview-line-tts"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        void (async () => {
          readEditorForms();
          const lineId = btn.getAttribute("data-line-id");
          const line = getSelectedEvent()?.dialogues.find((item) => item.id === lineId);
          const text = String(line?.ko || line?.en || "").trim();

          if (!text) {
            setStatus("미리들을 대본이 없습니다.");
            return;
          }

          if (!isSpeechTtsAvailable()) {
            setStatus("이 브라우저는 TTS를 지원하지 않습니다. Chrome/Edge를 사용해 주세요.");
            return;
          }

          setStatus(`미리듣기: ${lineId}`);
          const ok = await speakTextWithPrefs(text, loadTtsPrefs());
          setStatus(ok ? "TTS 미리듣기 완료" : "TTS 미리듣기 실패");
        })();
      });
    });
  }

  function wireCommonForm() {
    const commonForm = editorEl.querySelector('[data-role="common-form"]');

    if (!commonForm) {
      return;
    }

    commonForm.addEventListener("input", () => readCommonForm(commonForm));
    commonForm.addEventListener("change", () => readCommonForm(commonForm));

    bindOrderedClipSequence(
      commonForm.querySelector('[data-role="closing-clips"]'),
      (clips) => {
        tourData.closingAnimations = clips.length
          ? clips
          : ["Greeting_bow", "Greeting_Hand", "Idle"];
        markDirty();
        renderEventEditor();
      }
    );
  }

  function render() {
    withPreservedListScroll(() => {
      renderGlobalForm();
      renderSummary();
      renderEventEditor();
    });
  }

  function applyRuntime(persist = true) {
    readEditorForms();
    tourData = normalizeTourData(tourData);
    publishTourData(tourData, {
      persist,
      source: persist ? "guide-manager-save" : "guide-manager-apply"
    });

    if (persist) {
      dirty = false;
    }
  }

  async function load() {
    suppressLiveApply = true;
    tourData = await loadEffectiveTourData();
    selectedEventId = tourData.events[0]?.id || null;
    selectedOrbitId = tourData.orbitSequences?.[0]?.id || null;
    dirty = false;
    render();
    suppressLiveApply = false;
    void refreshBaseVersionsFromServer();
    setStatus("가이드 투어 데이터를 불러왔습니다.");
  }

  function open() {
    root.hidden = false;
    onOpenChange?.(true);
    void refreshBaseVersionsFromServer();
  }

  function closePanel() {
    root.hidden = true;
    onOpenChange?.(false);
  }

  function toggle() {
    if (root.hidden) {
      open();
    } else {
      closePanel();
    }
  }

  function isOpen() {
    return !root.hidden;
  }

  closeBtn.addEventListener("click", closePanel);

  baseVersionSelect?.addEventListener("change", () => {
    selectedBaseVersionId = baseVersionSelect.value || "current";
  });

  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];

    if (!file) {
      return;
    }

    void importTourDataFromFile(file).then((imported) => {
      tourData = imported;
      selectedEventId = tourData.events[0]?.id || null;
      dirty = true;
      render();
      setStatus("JSON을 불러왔습니다. 적용 또는 저장을 눌러 반영하세요.");
    }).catch((error) => {
      console.error("[guide-manager] import failed", error);
      setStatus("JSON 가져오기 실패");
    }).finally(() => {
      importInput.value = "";
    });
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const action = button.getAttribute("data-action");

    if (action === "add-event") {
      readEditorForms();
      const newEvent = createEmptyTourEvent(getNextEventIndex());
      tourData.events.push(newEvent);
      selectedEventId = newEvent.id;
      markDirty();
      render();
      setStatus(`이벤트 ${newEvent.id}를 추가했습니다.`);
      return;
    }

    if (action === "add-line") {
      addDialogueSetToSelectedEvent();
      return;
    }

    if (action === "move-event-up") {
      if (!selectedEventId) {
        setStatus("순서를 바꿀 이벤트를 선택하세요.");
        return;
      }

      moveEvent(selectedEventId, -1);
      return;
    }

    if (action === "move-event-down") {
      if (!selectedEventId) {
        setStatus("순서를 바꿀 이벤트를 선택하세요.");
        return;
      }

      moveEvent(selectedEventId, 1);
      return;
    }

    if (action === "delete-event") {
      if (tourData.events.length <= 1) {
        setStatus("투어에는 최소 1개의 이벤트가 필요합니다.");
        return;
      }

      readEditorForms();
      const event = getSelectedEvent();

      if (!event) {
        setStatus("삭제할 이벤트를 선택하세요.");
        return;
      }

      if (!window.confirm(`이벤트 ${event.id} (${event.title})를 삭제할까요?`)) {
        return;
      }

      const index = tourData.events.findIndex((item) => item.id === event.id);
      tourData.events = tourData.events.filter((item) => item.id !== event.id);
      selectedEventId = tourData.events[Math.min(index, tourData.events.length - 1)]?.id || null;
      markDirty();
      render();
      setStatus(`이벤트 ${event.id}를 삭제했습니다.`);
      return;
    }

    if (action === "load-base") {
      void (async () => {
        const versionId = baseVersionSelect?.value || selectedBaseVersionId || "current";
        selectedBaseVersionId = versionId;

        if (!isGuideBaseStoreAvailable()) {
          // Fallback: shipped JSON when Firebase is not configured (current only).
          if (versionId !== "current") {
            setStatus("백업 불러오기는 Firebase 설정 후 가능합니다.");
            return;
          }

          try {
            const base = await loadBaseTourData();
            tourData = base;
            selectedEventId = tourData.events[0]?.id || null;
            selectedOrbitId = tourData.orbitSequences?.[0]?.id || null;
            dirty = true;
            render();
            setStatus("로컬 기본 JSON을 불러왔습니다. 적용 또는 저장을 눌러 반영하세요.");
          } catch (error) {
            console.error("[guide-manager] load base failed", error);
            setStatus("현재값 불러오기 실패");
          }
          return;
        }

        try {
          const result = await loadGuideBaseVersion(versionId);
          tourData = normalizeTourData(result.data);
          selectedEventId = tourData.events[0]?.id || null;
          selectedOrbitId = tourData.orbitSequences?.[0]?.id || null;
          dirty = true;
          render();
          const label = baseVersions.find((item) => item.id === versionId)?.label || versionId;
          setStatus(`「${label}」을 불러왔습니다. 적용 또는 저장을 눌러 반영하세요.`);
        } catch (error) {
          console.error("[guide-manager] load Firestore base version failed", error);

          if (versionId === "current") {
            try {
              const base = await loadBaseTourData();
              tourData = base;
              selectedEventId = tourData.events[0]?.id || null;
              selectedOrbitId = tourData.orbitSequences?.[0]?.id || null;
              dirty = true;
              render();
              setStatus("Firestore 현재값이 없어 로컬 기본 JSON을 불러왔습니다.");
              return;
            } catch (fallbackError) {
              console.error("[guide-manager] local base fallback failed", fallbackError);
            }
          }

          setStatus(error?.message || "현재값 불러오기 실패");
        }
      })();
      return;
    }

    if (action === "save-base") {
      void (async () => {
        readEditorForms();

        if (!isGuideBaseStoreAvailable()) {
          setStatus("현재값 쓰기는 Firebase 설정이 필요합니다.");
          return;
        }

        if (!window.confirm("현재 편집 내용을 Firestore 현재값으로 저장할까요?\n이전 현재값은 최대 3개까지 백업됩니다.")) {
          return;
        }

        try {
          const normalized = normalizeTourData(tourData);
          const result = await saveGuideBaseVersion(normalized);
          tourData = normalized;
          clearStoredTourData();
          publishTourData(tourData, { persist: true, source: "guide-manager-save-base" });
          dirty = false;

          if (Array.isArray(result.manifest?.versions)) {
            baseVersions = result.manifest.versions;
            selectedBaseVersionId = "current";
            refreshBaseVersionSelect();
          } else {
            await refreshBaseVersionsFromServer();
          }

          setStatus(result.message || "Firestore 현재값으로 저장했습니다.");
        } catch (error) {
          console.error("[guide-manager] save Firestore base failed", error);
          setStatus(error?.message || "현재값 쓰기 실패");
        }
      })();
      return;
    }

    if (action === "apply") {
      applyRuntime(false);
      setStatus("가이드 설정을 적용했습니다.");
      return;
    }

    if (action === "save") {
      applyRuntime(true);
      setStatus("저장했습니다. NORMAL MODE에서도 동일한 JSON이 적용됩니다.");
      return;
    }

    if (action === "import") {
      importInput?.click();
      return;
    }

    if (action === "export") {
      readEditorForms();
      const blob = new Blob([exportTourDataJson(tourData)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "angji-guide-tour.json";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("JSON 파일을 내보냈습니다.");
      return;
    }

    if (action === "load-firestore") {
      if (!isGuideTourFirestoreConfigured()) {
        setStatus("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
        return;
      }

      void loadGuideTourFromFirestore().then((remote) => {
        if (!remote) {
          setStatus("Firestore에 저장된 가이드 데이터가 없습니다.");
          return;
        }

        tourData = remote;
        selectedEventId = tourData.events[0]?.id || null;
        dirty = true;
        render();
        setStatus("Firestore에서 불러왔습니다. 적용 또는 저장을 눌러 반영하세요.");
      }).catch((error) => {
        console.error("[guide-manager] firestore load failed", error);
        setStatus("Firestore 불러오기 실패");
      });
      return;
    }

    if (action === "deploy-firestore") {
      if (!isGuideTourFirestoreConfigured()) {
        setStatus("Firebase 설정이 없어 Firestore에 배포할 수 없습니다.");
        return;
      }

      readEditorForms();
      tourData = normalizeTourData(tourData);

      void saveGuideTourToFirestore(tourData).then(() => {
        publishTourData(tourData, { persist: false, source: "guide-manager-firestore-deploy" });
        setStatus("Firestore에 배포했습니다. localStorage 없는 NORMAL MODE에서 이 JSON이 사용됩니다.");
      }).catch((error) => {
        console.error("[guide-manager] firestore deploy failed", error);
        setStatus("Firestore 배포 실패");
      });
      return;
    }

    if (action === "preview-pos") {
      void previewSelectedEvent();
      return;
    }
  });

  async function previewSelectedEvent(successMessage) {
    if (!await isPreviewAllowed()) {
      setStatus("앵지 주간 Orbit View 또는 Tour Mode에서 미리보기할 수 있습니다.");
      return;
    }

    readEditorForms();
    applyRuntime(false);
    const event = getSelectedEvent();
    const index = tourData.events.findIndex((item) => item.id === event?.id);
    const ok = await Promise.resolve(getGuideTourSystem()?.previewEventTransform?.(index));
    setStatus(ok
      ? (successMessage || `이벤트 ${event?.id || "-"} 위치 미리보기`)
      : "가이드 위치 미리보기에 실패했습니다.");
  }

  return {
    root,
    load,
    open,
    close: closePanel,
    toggle,
    isOpen,
    getTourData: () => normalizeTourData(tourData),
    applyRuntime
  };
}
