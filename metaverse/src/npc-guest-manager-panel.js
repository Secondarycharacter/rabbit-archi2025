/**
 * Local-dev guest / dialog manager panel for Angji NPC interactions.
 */

import {
  cloneGuestBundle,
  createEmptyConversationEvent,
  createEmptyDialogLine,
  clearStoredGuestBundle,
  exportGuestBundleJson,
  getDisplayNameMap,
  getGuestSummaryRows,
  importGuestBundleFromFile,
  loadBaseGuestBundle,
  loadEffectiveGuestBundle,
  mergeModelGuestsIntoBundle,
  normalizeGuestBundle,
  publishGuestBundle,
  resolveInteractionConfigs,
  subscribeGuestBundleUpdates,
  loadConversationProgress,
  clearConversationCompleted
} from "./npc-guest-data.js?v=npc-list-sync-20260908";
import {
  isGuestBundleFirestoreConfigured,
  loadGuestBundleFromFirestore,
  saveGuestBundleToFirestore
} from "./editor-mode/guest-bundle-firestore.js?v=project-scope-20260908";
import {
  isGuestBaseStoreAvailable,
  listGuestBaseVersions,
  loadGuestBaseVersion,
  saveGuestBaseVersion
} from "./editor-mode/guest-base-file.js?v=project-scope-20260908";
import { subscribeGuestBundleRemote } from "./editor-mode/editor-broadcast-sync.js?v=npc-list-sync-20260908";
import {
  isSpeechTtsAvailable,
  loadTtsPrefs,
  speakTextWithPrefs,
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

function section(title, className = "") {
  const wrap = el("section", `npc-manager-section${className ? ` ${className}` : ""}`);
  wrap.append(el("h3", "npc-manager-section__title", { text: title }));
  return wrap;
}

function numInput(value, step = "0.1") {
  const input = el("input", null, { type: "number", step });
  input.value = value == null ? "" : String(value);
  return input;
}

function textInput(value, placeholder = "") {
  const input = el("input", null, { type: "text", placeholder });
  input.value = value == null ? "" : String(value);
  return input;
}

function textarea(value, rows = 3) {
  const input = el("textarea", null, { rows: String(rows) });
  input.value = value == null ? "" : String(value);
  return input;
}

function checkbox(checked) {
  const input = el("input", null, { type: "checkbox" });
  input.checked = Boolean(checked);
  return input;
}

function selectInput(options, value, name) {
  const select = el("select", null, { name });
  options.forEach((option) => {
    const opt = el("option", null, {
      value: option.value,
      text: option.label
    });
    if (String(option.value) === String(value ?? "")) {
      opt.selected = true;
    }
    select.append(opt);
  });
  return select;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function syncDialogLinesMirror(guest) {
  guest.dialogLines = guest.conversationEvents?.[0]?.dialogLines || [];
}

export function createNpcGuestManagerPanel(options = {}) {
  const {
    getInteractionSystem = () => null,
    onApplyConfigs = null,
    onStatus = null,
    canTestDialog = () => false,
    onOpenChange = null,
    getModelGuestEntries = () => [],
    onDisplayNamesChanged = null,
    enableLiveApply = false
  } = options;

  let bundle = normalizeGuestBundle({ guests: [] });
  let selectedGuestId = null;
  let selectedEventId = null;
  let selectedDialogId = null;
  let dirty = false;
  let liveApplyTimer = null;
  let baseVersions = [{ id: "current", label: "현재값 (Firestore)" }];
  let selectedBaseVersionId = "current";
  let lastModelEntries = [];

  async function resolveModelGuestEntries() {
    const raw = getModelGuestEntries();
    const entries = typeof raw?.then === "function" ? await raw : raw;
    lastModelEntries = Array.isArray(entries) ? entries : [];
    return lastModelEntries;
  }

  function pickDefaultGuestId(guests = bundle.guests) {
    return guests.find((guest) => guest.guestId === "Mark-2")?.guestId
      || guests[0]?.guestId
      || null;
  }

  function applyCatalogToBundle(source = bundle, modelEntries = lastModelEntries) {
    bundle = mergeModelGuestsIntoBundle(source, modelEntries);

    if (!bundle.guests.some((guest) => guest.guestId === selectedGuestId)) {
      selectedGuestId = pickDefaultGuestId();
      selectedEventId = null;
      selectedDialogId = null;
    }

    ensureSelectedEvent(getSelectedGuest());
    return bundle;
  }

  async function syncCatalog(incomingBundle = null) {
    const modelEntries = await resolveModelGuestEntries();
    applyCatalogToBundle(incomingBundle || bundle, modelEntries);
    render();
    return bundle;
  }

  const root = el("aside", "npc-manager-panel");
  root.id = "npcGuestManagerPanel";
  root.hidden = true;
  root.innerHTML = `
    <header class="npc-manager-panel__header">
      <h2>NPC 관리</h2>
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
        <div class="npc-manager-summary" data-role="summary"></div>
      </div>
      <div class="npc-manager-panel__editor" data-role="editor">
        <p class="npc-manager-empty">왼쪽에서 NPC를 선택하세요.</p>
      </div>
    </div>
    <footer class="npc-manager-panel__footer">
      <button type="button" data-action="save">저장</button>
      <button type="button" data-action="import">JSON 가져오기</button>
      <button type="button" data-action="export">JSON 내보내기</button>
      <button type="button" data-action="load-firestore">Firestore 불러오기</button>
      <button type="button" data-action="deploy-firestore">Firestore 배포</button>
      <button type="button" data-action="test" class="npc-manager-primary">대화 테스트</button>
      <input type="file" accept="application/json,.json" data-role="import-input" hidden>
    </footer>
  `;

  document.body.appendChild(root);

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
    if (!isGuestBaseStoreAvailable()) {
      baseVersions = [{ id: "current", label: "현재값 (Firebase 설정 필요)" }];
      refreshBaseVersionSelect();
      return false;
    }

    try {
      const result = await listGuestBaseVersions();
      baseVersions = Array.isArray(result.versions) && result.versions.length
        ? result.versions
        : [{ id: "current", label: "현재값 (Firestore)" }];
      refreshBaseVersionSelect();
      return true;
    } catch (error) {
      console.warn("[npc-manager] list Firestore base versions failed", error);
      baseVersions = [{ id: "current", label: "현재값 (Firestore)" }];
      refreshBaseVersionSelect();
      return false;
    }
  }

  function applyToRuntime({ persist = false } = {}) {
    bundle = publishGuestBundle(bundle, {
      persist,
      source: persist ? "guest-manager-save" : "guest-manager-apply"
    });
    const configs = resolveInteractionConfigs(bundle, loadConversationProgress());
    getInteractionSystem()?.setConfigs?.(configs);
    onApplyConfigs?.(configs);
    onDisplayNamesChanged?.(getDisplayNameMap(bundle));
  }

  function notifyDisplayNames() {
    onDisplayNamesChanged?.(getDisplayNameMap(bundle));
  }

  function markDirty() {
    dirty = true;
    scheduleLiveApply();
  }

  function scheduleLiveApply() {
    if (!enableLiveApply) {
      return;
    }

    clearTimeout(liveApplyTimer);
    liveApplyTimer = window.setTimeout(() => {
      applyToRuntime({ persist: false });
      setStatus("메타버스 창에 실시간 적용됨 (영구 저장은 「저장」)");
    }, 350);
  }

  function getSelectedGuest() {
    return bundle.guests.find((guest) => guest.guestId === selectedGuestId) || null;
  }

  function getSelectedEvent(guest = getSelectedGuest()) {
    return guest?.conversationEvents?.find((event) => event.id === selectedEventId) || null;
  }

  function ensureSelectedEvent(guest) {
    if (!guest?.conversationEvents?.length) {
      selectedEventId = null;
      return;
    }

    if (!guest.conversationEvents.some((event) => event.id === selectedEventId)) {
      selectedEventId = guest.conversationEvents[0].id;
    }
  }

  function selectGuest(guestId) {
    syncEditorBeforeAction();
    selectedGuestId = guestId;
    selectedEventId = null;
    selectedDialogId = null;
    const guest = getSelectedGuest();
    ensureSelectedEvent(guest);
    const list = root.querySelector(".npc-manager-panel__list");
    const scrollTop = list?.scrollTop ?? 0;
    render();

    if (list) {
      list.scrollTop = scrollTop;
    }
  }

  function renderSummary() {
    const rows = getGuestSummaryRows(bundle, loadConversationProgress());
    summaryEl.innerHTML = `
      <h3 class="npc-manager-guest-list__title">NPC (${rows.length})</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th><th>표시 이름</th><th>ON</th><th>이벤트</th><th>대사</th><th>반복</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-guest-id="${row.guestId}" class="${row.guestId === selectedGuestId ? "is-selected" : ""}">
              <td>${escapeHtml(row.guestId)}</td>
              <td>${escapeHtml(row.displayName || row.name)}</td>
              <td>${row.interactionEnabled ? "ON" : "OFF"}</td>
              <td>${row.eventCount || 1}</td>
              <td>${row.dialogCount}</td>
              <td>${row.repeatable ? "O" : "X"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    summaryEl.querySelectorAll("tr[data-guest-id]").forEach((row) => {
      row.addEventListener("click", () => {
        selectGuest(row.getAttribute("data-guest-id"));
      });
    });
  }

  function readGuestForm(form) {
    const guest = getSelectedGuest();

    if (!guest || !form) {
      return;
    }

    guest.displayName = form.querySelector('[name="displayName"]')?.value.trim() || guest.displayName;
    guest.enabled = Boolean(form.querySelector('[name="enabled"]')?.checked);
    guest.interactionEnabled = Boolean(form.querySelector('[name="interactionEnabled"]')?.checked);
    guest.repeatable = Boolean(form.querySelector('[name="repeatable"]')?.checked);
    guest.hoverEffect = Boolean(form.querySelector('[name="hoverEffect"]')?.checked);
    guest.voiceEnabled = Boolean(form.querySelector('[name="voiceEnabled"]')?.checked);
    guest.interactionDistance = Number(form.querySelector('[name="interactionDistance"]')?.value);
    guest.dialogDistance = Number(form.querySelector('[name="dialogDistance"]')?.value);
    guest.interactionScale = Number(form.querySelector('[name="interactionScale"]')?.value);
    guest.textSpeed = Number(form.querySelector('[name="textSpeed"]')?.value);
    guest.dialogDuration = Number(form.querySelector('[name="dialogDuration"]')?.value);
    guest.voiceVolume = Number(form.querySelector('[name="voiceVolume"]')?.value);
    guest.voicePlaybackSpeed = Number(form.querySelector('[name="voicePlaybackSpeed"]')?.value);
    markDirty();
    notifyDisplayNames();
  }

  function readEventForm(form) {
    const guest = getSelectedGuest();
    const event = getSelectedEvent(guest);

    if (!guest || !event || !form) {
      return;
    }

    event.name = form.querySelector('[name="eventName"]')?.value.trim() || event.name;
    event.unlockedByDefault = Boolean(form.querySelector('[name="unlockedByDefault"]')?.checked);

    const completeType = form.querySelector('[name="onCompleteType"]')?.value || "none";
    event.onComplete = {
      type: completeType === "unlock_event" ? "unlock_event" : "none",
      targetEventId: form.querySelector('[name="onCompleteTarget"]')?.value || ""
    };

    syncDialogLinesMirror(guest);
    markDirty();
  }

  function readDialogForm(form) {
    const guest = getSelectedGuest();
    const event = getSelectedEvent(guest);
    const line = event?.dialogLines?.find((item) => item.id === selectedDialogId);

    if (!guest || !event || !line || !form) {
      return;
    }

    line.koreanText = form.querySelector('[name="koreanText"]')?.value || "";
    line.englishSubtitle = form.querySelector('[name="englishSubtitle"]')?.value || "";
    line.audioFile = form.querySelector('[name="audioFile"]')?.value.trim() || "";
    line.enabled = Boolean(form.querySelector('[name="enabled"]')?.checked);
    const speedRaw = form.querySelector('[name="textSpeed"]')?.value;
    line.textSpeed = speedRaw === "" ? null : Number(speedRaw);
    const durationRaw = form.querySelector('[name="dialogDuration"]')?.value;
    line.dialogDuration = durationRaw === "" ? null : Number(durationRaw);
    syncDialogLinesMirror(guest);
    markDirty();
  }

  function moveDialog(lineId, direction) {
    const guest = getSelectedGuest();
    const event = getSelectedEvent(guest);

    if (!guest || !event) {
      return;
    }

    const lines = [...event.dialogLines].sort((a, b) => a.order - b.order);
    const index = lines.findIndex((line) => line.id === lineId);

    if (index < 0) {
      return;
    }

    const swapIndex = index + direction;

    if (swapIndex < 0 || swapIndex >= lines.length) {
      return;
    }

    const tempOrder = lines[index].order;
    lines[index].order = lines[swapIndex].order;
    lines[swapIndex].order = tempOrder;
    event.dialogLines = lines.sort((a, b) => a.order - b.order);
    syncDialogLinesMirror(guest);
    markDirty();
    render();
  }

  function renderEditor() {
    const guest = getSelectedGuest();
    editorEl.innerHTML = "";

    if (!guest) {
      editorEl.append(el("p", "npc-manager-empty", { text: "왼쪽에서 NPC를 선택하세요." }));
      return;
    }

    ensureSelectedEvent(guest);
    const event = getSelectedEvent(guest);
    const form = el("div", "npc-manager-form");
    form.dataset.role = "guest-form";

    form.append(el("h3", "npc-manager-form__heading", {
      text: `${guest.displayName || guest.guestId} 설정`
    }));

    const identity = section("식별");
    identity.append(
      field("NPC ID", el("input", null, { type: "text", value: guest.guestId, disabled: "true" })),
      field("표시 이름", Object.assign(textInput(guest.displayName), { name: "displayName" }))
    );

    const interaction = section("상호작용");
    interaction.append(
      field("사용", Object.assign(checkbox(guest.enabled), { name: "enabled" })),
      field("대화 상호작용", Object.assign(checkbox(guest.interactionEnabled), { name: "interactionEnabled" })),
      field("반복 가능", Object.assign(checkbox(guest.repeatable), { name: "repeatable" })),
      field("호버 확대", Object.assign(checkbox(guest.hoverEffect), { name: "hoverEffect" })),
      field("상호작용 거리 (m)", Object.assign(numInput(guest.interactionDistance, "0.1"), { name: "interactionDistance" })),
      field("대화 이격 (m)", Object.assign(numInput(guest.dialogDistance, "0.1"), { name: "dialogDistance" })),
      field("이름 스케일", Object.assign(numInput(guest.interactionScale, "0.1"), { name: "interactionScale" }))
    );

    if (!guest.repeatable) {
      interaction.append(el("p", "guide-manager-hint", {
        html: "반복이 꺼져 있으면 각 <strong>대화 이벤트</strong>는 한 번만 진행됩니다. 완료 후 다음 이벤트를 잠금 해제하도록 설정할 수 있습니다."
      }));
    }

    const timing = section("타이밍");
    timing.append(
      field("텍스트 속도", Object.assign(numInput(guest.textSpeed, "0.01"), { name: "textSpeed" })),
      field("대사 유지시간", Object.assign(numInput(guest.dialogDuration, "0.1"), { name: "dialogDuration" }))
    );

    const voice = section("음성");
    voice.append(
      field("음성 사용", Object.assign(checkbox(guest.voiceEnabled), { name: "voiceEnabled" })),
      field("볼륨", Object.assign(numInput(guest.voiceVolume, "0.05"), { name: "voiceVolume" })),
      field("재생 속도", Object.assign(numInput(guest.voicePlaybackSpeed, "0.05"), { name: "voicePlaybackSpeed" }))
    );

    form.append(identity, interaction, timing, voice);

    form.querySelectorAll("input, textarea, select").forEach((input) => {
      input.addEventListener("change", () => {
        readGuestForm(form);
        if (input.name === "repeatable") {
          render();
        }
      });
      input.addEventListener("input", () => readGuestForm(form));
    });

    const flow = section("대화 이벤트", "npc-manager-section--flow");
    const eventToolbar = el("div", "npc-manager-dialog-toolbar");
    const addEventBtn = el("button", null, { type: "button", text: "+ 이벤트" });
    addEventBtn.addEventListener("click", () => {
      readGuestForm(form);
      const nextOrder = (guest.conversationEvents?.length || 0) + 1;
      const next = createEmptyConversationEvent(nextOrder, {
        unlockedByDefault: nextOrder === 1
      });
      guest.conversationEvents.push(next);
      selectedEventId = next.id;
      selectedDialogId = null;
      syncDialogLinesMirror(guest);
      markDirty();
      render();
    });
    const clearProgressBtn = el("button", null, { type: "button", text: "진행 기록 초기화" });
    clearProgressBtn.addEventListener("click", () => {
      clearConversationCompleted(guest.guestId);
      applyToRuntime();
      setStatus(`${guest.displayName || guest.guestId} 대화 진행 기록을 초기화했습니다.`);
      render();
    });
    eventToolbar.append(addEventBtn, clearProgressBtn);
    flow.append(eventToolbar);

    const eventList = el("ul", "npc-manager-dialog-list");
    (guest.conversationEvents || []).forEach((item, index) => {
      const row = el("li", item.id === selectedEventId ? "is-selected" : "");
      const label = el("button", "npc-manager-dialog-list__select", {
        type: "button",
        text: `${String(index + 1).padStart(2, "0")}. ${item.name || item.id}`
      });
      label.addEventListener("click", () => {
        readGuestForm(form);
        selectedEventId = item.id;
        selectedDialogId = null;
        render();
      });
      row.append(label);
      eventList.append(row);
    });
    flow.append(eventList);

    if (event) {
      const eventForm = el("div", "npc-manager-dialog-editor");
      eventForm.dataset.role = "event-form";

      const otherEvents = (guest.conversationEvents || [])
        .filter((item) => item.id !== event.id)
        .map((item) => ({ value: item.id, label: item.name || item.id }));

      eventForm.append(
        el("h4", null, { text: `이벤트 · ${event.name || event.id}` }),
        field("이벤트 이름", Object.assign(textInput(event.name), { name: "eventName" })),
        field("기본 잠금 해제", Object.assign(checkbox(event.unlockedByDefault), { name: "unlockedByDefault" }))
      );

      if (!guest.repeatable) {
        eventForm.append(
          field("완료 후 다음 동작", selectInput([
            { value: "none", label: "없음 (이 이벤트 종료)" },
            { value: "unlock_event", label: "다른 대화 이벤트 잠금 해제" }
          ], event.onComplete?.type || "none", "onCompleteType"))
        );

        if ((event.onComplete?.type || "none") === "unlock_event") {
          eventForm.append(
            field(
              "잠금 해제할 이벤트",
              selectInput(
                [{ value: "", label: "(선택)" }, ...otherEvents],
                event.onComplete?.targetEventId || "",
                "onCompleteTarget"
              )
            )
          );
        }
      } else {
        eventForm.append(el("p", "guide-manager-hint", {
          text: "반복 가능이 켜져 있으면 같은 이벤트를 다시 대화할 수 있습니다. 다음 이벤트 조건은 반복을 끈 뒤 설정하세요."
        }));
      }

      const removeEventBtn = el("button", "npc-manager-danger", {
        type: "button",
        text: "이 이벤트 삭제"
      });
      removeEventBtn.disabled = (guest.conversationEvents || []).length <= 1;
      removeEventBtn.addEventListener("click", () => {
        if ((guest.conversationEvents || []).length <= 1) {
          return;
        }
        guest.conversationEvents = guest.conversationEvents.filter((item) => item.id !== event.id);
        selectedEventId = guest.conversationEvents[0]?.id || null;
        selectedDialogId = null;
        syncDialogLinesMirror(guest);
        markDirty();
        render();
      });
      eventForm.append(removeEventBtn);

      eventForm.querySelectorAll("input, select").forEach((input) => {
        input.addEventListener("change", () => {
          readEventForm(eventForm);
          if (input.name === "onCompleteType") {
            render();
          }
        });
        input.addEventListener("input", () => readEventForm(eventForm));
      });

      flow.append(eventForm);

      const dialogSection = el("div", "npc-manager-dialogs");
      dialogSection.append(el("h4", null, { text: "대본" }));

      const dialogToolbar = el("div", "npc-manager-dialog-toolbar");
      const addBtn = el("button", null, { type: "button", text: "+ 대사" });
      addBtn.addEventListener("click", () => {
        readGuestForm(form);
        readEventForm(eventForm);
        const nextOrder = (event.dialogLines?.length || 0) + 1;
        const line = createEmptyDialogLine(nextOrder);
        event.dialogLines.push(line);
        selectedDialogId = line.id;
        syncDialogLinesMirror(guest);
        markDirty();
        render();
      });
      dialogToolbar.append(addBtn);
      dialogSection.append(dialogToolbar);

      const dialogList = el("ul", "npc-manager-dialog-list");
      [...(event.dialogLines || [])].sort((a, b) => a.order - b.order).forEach((line) => {
        const item = el("li", line.id === selectedDialogId ? "is-selected" : "");
        const label = el("button", "npc-manager-dialog-list__select", {
          type: "button",
          text: `${String(line.order).padStart(2, "0")}. ${(line.koreanText || "(빈 대사)").slice(0, 24)}`
        });
        label.addEventListener("click", () => {
          readGuestForm(form);
          readEventForm(eventForm);
          selectedDialogId = line.id;
          render();
        });

        const up = el("button", null, { type: "button", text: "↑" });
        up.addEventListener("click", () => {
          readGuestForm(form);
          moveDialog(line.id, -1);
        });
        const down = el("button", null, { type: "button", text: "↓" });
        down.addEventListener("click", () => {
          readGuestForm(form);
          moveDialog(line.id, 1);
        });

        item.append(label, up, down);
        dialogList.appendChild(item);
      });
      dialogSection.append(dialogList);

      const selectedLine = event.dialogLines.find((line) => line.id === selectedDialogId);

      if (selectedLine) {
        const dialogForm = el("div", "npc-manager-dialog-editor");
        dialogForm.dataset.role = "dialog-form";
        dialogForm.append(
          el("h4", null, { text: `대사 ${selectedLine.order}` }),
          field("사용", Object.assign(checkbox(selectedLine.enabled), { name: "enabled" })),
          field("한국어 대사", Object.assign(textarea(selectedLine.koreanText, 3), { name: "koreanText" })),
          field("영어 자막", Object.assign(textarea(selectedLine.englishSubtitle, 2), { name: "englishSubtitle" })),
          field("텍스트 속도 (비우면 NPC 기본)", Object.assign(numInput(selectedLine.textSpeed ?? "", "0.01"), { name: "textSpeed" })),
          field("대화 유지시간 (비우면 NPC 기본)", Object.assign(numInput(selectedLine.dialogDuration ?? "", "0.1"), { name: "dialogDuration" })),
          field("음성 파일", Object.assign(textInput(selectedLine.audioFile, "./assets/audio/dialog/..."), { name: "audioFile" }))
        );

        const actions = el("div", "npc-manager-dialog-actions");
        const previewTts = el("button", "npc-manager-primary", { type: "button", text: "▶ TTS 미리듣기" });
        previewTts.addEventListener("click", async () => {
          readDialogForm(dialogForm);
          const text = String(selectedLine.koreanText || selectedLine.englishSubtitle || "").trim();

          if (!text) {
            setStatus("미리들을 대본이 없습니다.");
            return;
          }

          if (!isSpeechTtsAvailable()) {
            setStatus("이 브라우저는 TTS를 지원하지 않습니다. Chrome/Edge를 사용해 주세요.");
            return;
          }

          setStatus("TTS 미리듣기 중…");
          const ok = await speakTextWithPrefs(text, loadTtsPrefs());
          setStatus(ok ? "TTS 미리듣기 완료" : "TTS 미리듣기 실패");
        });

        const stopTts = el("button", null, { type: "button", text: "■ 중지" });
        stopTts.addEventListener("click", () => {
          stopSpeechTts();
          setStatus("TTS 중지");
        });

        const previewAudio = el("button", null, { type: "button", text: "파일 미리듣기" });
        previewAudio.addEventListener("click", () => {
          readDialogForm(dialogForm);
          if (!selectedLine.audioFile) {
            setStatus("음성 파일이 없습니다. TTS 미리듣기를 사용하세요.");
            return;
          }

          const audio = new Audio(selectedLine.audioFile);
          audio.volume = clamp01(guest.voiceVolume);
          audio.playbackRate = Math.max(0.5, guest.voicePlaybackSpeed || 1);
          audio.play().catch(() => setStatus("음성 재생 실패"));
        });

        const removeBtn = el("button", null, { type: "button", text: "삭제" });
        removeBtn.addEventListener("click", () => {
          event.dialogLines = event.dialogLines.filter((line) => line.id !== selectedLine.id);
          event.dialogLines.forEach((line, index) => {
            line.order = index + 1;
          });
          selectedDialogId = event.dialogLines[0]?.id || null;
          syncDialogLinesMirror(guest);
          markDirty();
          render();
        });

        actions.append(previewTts, stopTts, previewAudio, removeBtn);
        dialogForm.append(actions);

        dialogForm.querySelectorAll("input, textarea").forEach((input) => {
          input.addEventListener("change", () => readDialogForm(dialogForm));
          input.addEventListener("input", () => readDialogForm(dialogForm));
        });

        dialogSection.append(dialogForm);
      }

      flow.append(dialogSection);
    }

    const deleteGuestBtn = el("button", "npc-manager-danger", {
      type: "button",
      text: "상호작용 설정 초기화"
    });
    deleteGuestBtn.addEventListener("click", () => {
      if (!window.confirm(`${guest.displayName || guest.guestId} 대본/상호작용 설정을 초기화할까요?`)) {
        return;
      }

      guest.interactionEnabled = false;
      guest.conversationEvents = [createEmptyConversationEvent(1, {
        name: "기본 대화",
        unlockedByDefault: true
      })];
      guest.displayName = lastModelEntries
        .find((entry) => entry.guestId === guest.guestId)?.displayName || guest.displayName;
      selectedEventId = guest.conversationEvents[0].id;
      selectedDialogId = null;
      syncDialogLinesMirror(guest);
      markDirty();
      notifyDisplayNames();
      render();
    });

    editorEl.append(form, flow, deleteGuestBtn);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function render() {
    bundle = normalizeGuestBundle(bundle);
    renderSummary();
    renderEditor();
  }

  function syncEditorBeforeAction() {
    const guestForm = editorEl.querySelector('[data-role="guest-form"]');
    const eventForm = editorEl.querySelector('[data-role="event-form"]');
    const dialogForm = editorEl.querySelector('[data-role="dialog-form"]');
    readGuestForm(guestForm);
    readEventForm(eventForm);
    readDialogForm(dialogForm);
  }

  async function load() {
    const modelEntries = await resolveModelGuestEntries();
    bundle = await loadEffectiveGuestBundle(undefined, modelEntries);
    selectedGuestId = pickDefaultGuestId();
    selectedEventId = null;
    selectedDialogId = null;
    ensureSelectedEvent(getSelectedGuest());
    dirty = false;
    render();
    applyToRuntime();
    void refreshBaseVersionsFromServer();
  }

  function setOpen(open) {
    const nextOpen = Boolean(open);
    const wasOpen = !root.hidden;
    root.hidden = !nextOpen;

    if (wasOpen !== nextOpen) {
      onOpenChange?.(nextOpen);
    }

    if (nextOpen) {
      void refreshBaseVersionsFromServer();
    }
  }

  function open() {
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
  }

  function toggle() {
    setOpen(root.hidden);
  }

  function isPanelOpen() {
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

    void importGuestBundleFromFile(file).then(async (imported) => {
      const modelEntries = await resolveModelGuestEntries();
      bundle = mergeModelGuestsIntoBundle(imported, modelEntries);
      selectedGuestId = pickDefaultGuestId();
      selectedEventId = null;
      selectedDialogId = null;
      ensureSelectedEvent(getSelectedGuest());
      dirty = true;
      render();
      setStatus("JSON을 불러왔습니다. 저장을 눌러 반영하세요.");
    }).catch((error) => {
      console.error("[npc-manager] import failed", error);
      setStatus("JSON 가져오기 실패");
    }).finally(() => {
      importInput.value = "";
    });
  });

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const action = button.getAttribute("data-action");

    if (action === "load-base") {
      if (dirty && !window.confirm("저장하지 않은 변경이 있습니다. 현재값을 불러올까요?")) {
        return;
      }

      const versionId = baseVersionSelect?.value || selectedBaseVersionId || "current";

      if (!isGuestBaseStoreAvailable()) {
        setStatus("현재값 불러오기는 Firebase 설정 후 가능합니다.");
        return;
      }

      try {
        const result = await loadGuestBaseVersion(versionId);
        const modelEntries = await resolveModelGuestEntries();
        bundle = mergeModelGuestsIntoBundle(result.data, modelEntries);
        selectedGuestId = pickDefaultGuestId();
        selectedEventId = null;
        selectedDialogId = null;
        ensureSelectedEvent(getSelectedGuest());
        dirty = true;
        render();
        const label = baseVersions.find((item) => item.id === versionId)?.label || versionId;
        setStatus(`「${label}」을 불러왔습니다. 적용 또는 저장을 눌러 반영하세요.`);
      } catch (error) {
        if (versionId === "current") {
          try {
            clearStoredGuestBundle();
            const modelEntries = await resolveModelGuestEntries();
            bundle = mergeModelGuestsIntoBundle(await loadBaseGuestBundle(), modelEntries);
            dirty = false;
            selectedGuestId = pickDefaultGuestId();
            selectedEventId = null;
            selectedDialogId = null;
            ensureSelectedEvent(getSelectedGuest());
            render();
            applyToRuntime();
            setStatus("Firestore 현재값이 없어 로컬 기본 JSON을 불러왔습니다.");
            return;
          } catch (fallbackError) {
            console.error("[npc-manager] load base fallback failed", fallbackError);
          }
        }

        console.error("[npc-manager] load Firestore base version failed", error);
        setStatus(error?.message || "현재값 불러오기 실패");
      }
      return;
    }

    if (action === "save-base") {
      if (!isGuestBaseStoreAvailable()) {
        setStatus("현재값 쓰기는 Firebase 설정이 필요합니다.");
        return;
      }

      if (!window.confirm("현재 편집 내용을 Firestore 현재값으로 저장할까요?\n이전 현재값은 최대 3개까지 백업됩니다.")) {
        return;
      }

      syncEditorBeforeAction();
      bundle = normalizeGuestBundle(bundle);

      try {
        const result = await saveGuestBaseVersion(bundle);
        publishGuestBundle(bundle, { persist: true, source: "guest-manager-save-base" });
        dirty = false;
        await refreshBaseVersionsFromServer();
        setStatus(result.message || "Firestore 현재값으로 저장했습니다.");
      } catch (error) {
        console.error("[npc-manager] save Firestore base failed", error);
        setStatus(error?.message || "현재값 쓰기 실패");
      }
      return;
    }

    if (action === "save") {
      syncEditorBeforeAction();
      applyToRuntime({ persist: true });
      dirty = false;
      setStatus("저장했습니다. NORMAL MODE에서도 동일한 JSON이 적용됩니다.");
      render();
      return;
    }

    if (action === "export") {
      syncEditorBeforeAction();
      publishGuestBundle(bundle, { persist: true, source: "guest-manager-export" });
      const modelEntries = await resolveModelGuestEntries();

      void loadEffectiveGuestBundle(undefined, modelEntries).then((effective) => {
        const blob = new Blob([exportGuestBundleJson(effective)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = el("a", null, { href: url, download: "guests.json" });
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus("배포용 guests.json을 내보냈습니다. metaverse/data/npc/guests.json에 덮어쓴 뒤 커밋하세요.");
      }).catch((error) => {
        console.error("[npc-manager] export failed", error);
        setStatus("guests.json 내보내기에 실패했습니다.");
      });

      return;
    }

    if (action === "import") {
      importInput?.click();
      return;
    }

    if (action === "load-firestore") {
      if (!isGuestBundleFirestoreConfigured()) {
        setStatus("Firebase 설정이 없어 Firestore를 사용할 수 없습니다.");
        return;
      }

      void loadGuestBundleFromFirestore().then(async (remote) => {
        if (!remote) {
          setStatus("Firestore에 저장된 NPC 데이터가 없습니다.");
          return;
        }

        const modelEntries = await resolveModelGuestEntries();
        bundle = mergeModelGuestsIntoBundle(remote, modelEntries);
        selectedGuestId = pickDefaultGuestId();
        selectedEventId = null;
        selectedDialogId = null;
        ensureSelectedEvent(getSelectedGuest());
        dirty = true;
        render();
        setStatus("Firestore에서 불러왔습니다. 저장을 눌러 반영하세요.");
      }).catch((error) => {
        console.error("[npc-manager] firestore load failed", error);
        setStatus("Firestore 불러오기 실패");
      });
      return;
    }

    if (action === "deploy-firestore") {
      if (!isGuestBundleFirestoreConfigured()) {
        setStatus("Firebase 설정이 없어 Firestore에 배포할 수 없습니다.");
        return;
      }

      syncEditorBeforeAction();
      bundle = normalizeGuestBundle(bundle);

      void saveGuestBundleToFirestore(bundle).then(() => {
        publishGuestBundle(bundle, { persist: false, source: "guest-manager-firestore-deploy" });
        setStatus("Firestore에 배포했습니다. localStorage 없는 NORMAL MODE에서 이 JSON이 사용됩니다.");
      }).catch((error) => {
        console.error("[npc-manager] firestore deploy failed", error);
        setStatus("Firestore 배포 실패");
      });
      return;
    }

    if (action === "test") {
      syncEditorBeforeAction();
      const guest = getSelectedGuest();

      if (!guest) {
        setStatus("테스트할 NPC를 선택하세요.");
        return;
      }

      if (!canTestDialog()) {
        setStatus("Tour Mode(낮)에서만 대화 테스트가 가능합니다.");
        return;
      }

      applyToRuntime();
      const started = getInteractionSystem()?.startDialog?.(guest.guestId, {
        force: true,
        preview: true
      });

      if (!started) {
        setStatus("대화 테스트를 시작할 수 없습니다. NPC가 스폰됐는지 확인하세요.");
        return;
      }

      setOpen(false);
      setStatus(`${guest.displayName} 대화 테스트 시작`);
    }
  });

  function handleExternalGuestBundle(next, meta = {}) {
    const source = String(meta?.source || "");

    if (source.startsWith("guest-manager")) {
      return;
    }

    void resolveModelGuestEntries().then((modelEntries) => {
      if (dirty) {
        applyCatalogToBundle(bundle, modelEntries);
      } else {
        applyCatalogToBundle(next, modelEntries);
      }

      render();
    });
  }

  subscribeGuestBundleUpdates(handleExternalGuestBundle);
  subscribeGuestBundleRemote(handleExternalGuestBundle);

  return {
    root,
    load,
    syncCatalog,
    open,
    close: closePanel,
    toggle,
    setOpen,
    isOpen: isPanelOpen,
    getBundle: () => cloneGuestBundle(bundle),
    applyToRuntime
  };
}
