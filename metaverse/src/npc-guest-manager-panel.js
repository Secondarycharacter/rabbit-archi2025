/**
 * Local-dev guest / dialog manager panel for Angji NPC interactions.
 */

import {
  cloneGuestBundle,
  createEmptyDialogLine,
  clearStoredGuestBundle,
  exportGuestBundleJson,
  getDisplayNameMap,
  getGuestSummaryRows,
  loadBaseGuestBundle,
  loadEffectiveGuestBundle,
  mergeModelGuestsIntoBundle,
  normalizeGuestBundle,
  resolveInteractionConfigs,
  saveGuestBundle,
  loadConversationProgress,
  clearConversationCompleted
} from "./npc-guest-data.js?v=angji-npc-manager-20260820";

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

export function createNpcGuestManagerPanel(options = {}) {
  const {
    getInteractionSystem = () => null,
    onApplyConfigs = null,
    onStatus = null,
    canTestDialog = () => false,
    onOpenChange = null,
    getModelGuestEntries = () => [],
    onDisplayNamesChanged = null
  } = options;

  let bundle = normalizeGuestBundle({ guests: [] });
  let selectedGuestId = null;
  let selectedDialogId = null;
  let dirty = false;

  const root = el("aside", "npc-manager-panel");
  root.id = "npcGuestManagerPanel";
  root.hidden = true;
  root.innerHTML = `
    <header class="npc-manager-panel__header">
      <h2>게스트 관리</h2>
      <button type="button" class="npc-manager-panel__close" aria-label="Close">×</button>
    </header>
    <div class="npc-manager-panel__body">
      <div class="npc-manager-panel__list">
        <div class="npc-manager-panel__list-toolbar">
          <button type="button" data-action="reload-base">기본값</button>
        </div>
        <div class="npc-manager-summary" data-role="summary"></div>
        <ul class="npc-manager-guest-list" data-role="guest-list"></ul>
      </div>
      <div class="npc-manager-panel__editor" data-role="editor">
        <p class="npc-manager-empty">왼쪽에서 게스트를 선택하세요.</p>
      </div>
    </div>
    <footer class="npc-manager-panel__footer">
      <button type="button" data-action="save">저장</button>
      <button type="button" data-action="export">JSON 내보내기</button>
      <button type="button" data-action="test" class="npc-manager-primary">대화 테스트</button>
    </footer>
  `;

  document.body.appendChild(root);

  const summaryEl = root.querySelector('[data-role="summary"]');
  const listEl = root.querySelector('[data-role="guest-list"]');
  const editorEl = root.querySelector('[data-role="editor"]');
  const closeBtn = root.querySelector(".npc-manager-panel__close");

  function setStatus(message) {
    onStatus?.(message);
  }

  function applyToRuntime() {
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
  }

  function getSelectedGuest() {
    return bundle.guests.find((guest) => guest.guestId === selectedGuestId) || null;
  }

  function renderSummary() {
    const rows = getGuestSummaryRows(bundle, loadConversationProgress());
    summaryEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>이름</th><th>ON</th><th>대사</th><th>음성</th><th>반복</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-guest-id="${row.guestId}" class="${row.guestId === selectedGuestId ? "is-selected" : ""}">
              <td>${row.displayName || row.guestId}</td>
              <td>${row.name}</td>
              <td>${row.interactionEnabled ? "ON" : "OFF"}</td>
              <td>${row.dialogCount}</td>
              <td>${row.voiceCount}</td>
              <td>${row.repeatable ? "O" : "X"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    summaryEl.querySelectorAll("tr[data-guest-id]").forEach((row) => {
      row.addEventListener("click", () => {
        selectedGuestId = row.getAttribute("data-guest-id");
        selectedDialogId = null;
        render();
      });
    });
  }

  function renderGuestList() {
    listEl.innerHTML = "";

    bundle.guests.forEach((guest) => {
      const item = el("li", `npc-manager-guest-list__item${guest.guestId === selectedGuestId ? " is-selected" : ""}`);
      item.textContent = `${guest.displayName || "??"} · ${guest.name}`;
      item.addEventListener("click", () => {
        selectedGuestId = guest.guestId;
        selectedDialogId = null;
        render();
      });
      listEl.appendChild(item);
    });
  }

  function readGuestForm(form) {
    const guest = getSelectedGuest();

    if (!guest || !form) {
      return;
    }

    guest.name = form.querySelector('[name="name"]').value.trim() || guest.name;
    guest.displayName = form.querySelector('[name="displayName"]').value.trim();
    guest.guestKey = form.querySelector('[name="guestKey"]').value.trim() || guest.guestKey;
    guest.enabled = form.querySelector('[name="enabled"]').checked;
    guest.interactionEnabled = form.querySelector('[name="interactionEnabled"]').checked;
    guest.repeatable = form.querySelector('[name="repeatable"]').checked;
    guest.hoverEffect = form.querySelector('[name="hoverEffect"]').checked;
    guest.voiceEnabled = form.querySelector('[name="voiceEnabled"]').checked;
    guest.interactionDistance = Number(form.querySelector('[name="interactionDistance"]').value);
    guest.dialogDistance = Number(form.querySelector('[name="dialogDistance"]').value);
    guest.interactionScale = Number(form.querySelector('[name="interactionScale"]').value);
    guest.textSpeed = Number(form.querySelector('[name="textSpeed"]').value);
    guest.dialogDuration = Number(form.querySelector('[name="dialogDuration"]').value);
    guest.voiceVolume = Number(form.querySelector('[name="voiceVolume"]').value);
    guest.voicePlaybackSpeed = Number(form.querySelector('[name="voicePlaybackSpeed"]').value);
    guest.cameraMinDistance = Number(form.querySelector('[name="cameraMinDistance"]').value);
    guest.cameraMaxDistance = Number(form.querySelector('[name="cameraMaxDistance"]').value);
    guest.cameraHeight = Number(form.querySelector('[name="cameraHeight"]').value);
    guest.cameraLookLift = Number(form.querySelector('[name="cameraLookLift"]').value);
    const fovRaw = form.querySelector('[name="cameraFov"]').value;
    guest.cameraFov = fovRaw === "" ? null : Number(fovRaw);
    guest.idleAnimation = form.querySelector('[name="idleAnimation"]').value.trim();
    guest.walkingAnimation = form.querySelector('[name="walkingAnimation"]').value.trim();
    guest.talkAnimation = form.querySelector('[name="talkAnimation"]').value.trim();
    guest.greetingAnimation = form.querySelector('[name="greetingAnimation"]').value.trim();
    markDirty();
    notifyDisplayNames();
  }

  function readDialogForm(form) {
    const guest = getSelectedGuest();
    const line = guest?.dialogLines?.find((item) => item.id === selectedDialogId);

    if (!guest || !line || !form) {
      return;
    }

    line.koreanText = form.querySelector('[name="koreanText"]').value;
    line.englishSubtitle = form.querySelector('[name="englishSubtitle"]').value;
    line.audioFile = form.querySelector('[name="audioFile"]').value.trim();
    line.enabled = form.querySelector('[name="enabled"]').checked;
    const speedRaw = form.querySelector('[name="textSpeed"]').value;
    line.textSpeed = speedRaw === "" ? null : Number(speedRaw);
    const durationRaw = form.querySelector('[name="dialogDuration"]').value;
    line.dialogDuration = durationRaw === "" ? null : Number(durationRaw);
    markDirty();
  }

  function moveDialog(lineId, direction) {
    const guest = getSelectedGuest();

    if (!guest) {
      return;
    }

    const lines = [...guest.dialogLines].sort((a, b) => a.order - b.order);
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
    guest.dialogLines = lines.sort((a, b) => a.order - b.order);
    markDirty();
    render();
  }

  function renderEditor() {
    const guest = getSelectedGuest();
    editorEl.innerHTML = "";

    if (!guest) {
      editorEl.append(el("p", "npc-manager-empty", { text: "왼쪽에서 게스트를 선택하세요." }));
      return;
    }

    const form = el("div", "npc-manager-form");
    form.dataset.role = "guest-form";

    form.append(
      el("h3", null, { text: `${guest.displayName || guest.guestId} 설정` }),
      field("Guest ID", el("input", null, { type: "text", value: guest.guestId, disabled: "true" })),
      field("Guest Key", Object.assign(textInput(guest.guestKey), { name: "guestKey" })),
      field("이름", Object.assign(textInput(guest.name), { name: "name" })),
      field("Display Name", Object.assign(textInput(guest.displayName), { name: "displayName" })),
      field("Enabled", Object.assign(checkbox(guest.enabled), { name: "enabled" })),
      field("Interaction Enabled", Object.assign(checkbox(guest.interactionEnabled), { name: "interactionEnabled" })),
      field("Repeatable", Object.assign(checkbox(guest.repeatable), { name: "repeatable" })),
      field("Hover Effect", Object.assign(checkbox(guest.hoverEffect), { name: "hoverEffect" })),
      field("Interaction Distance", Object.assign(numInput(guest.interactionDistance, "0.1"), { name: "interactionDistance" })),
      field("Dialog Distance", Object.assign(numInput(guest.dialogDistance, "0.1"), { name: "dialogDistance" })),
      field("Name Scale", Object.assign(numInput(guest.interactionScale, "0.1"), { name: "interactionScale" })),
      field("Text Speed", Object.assign(numInput(guest.textSpeed, "0.01"), { name: "textSpeed" })),
      field("Dialog Duration", Object.assign(numInput(guest.dialogDuration, "0.1"), { name: "dialogDuration" })),
      field("Voice Enabled", Object.assign(checkbox(guest.voiceEnabled), { name: "voiceEnabled" })),
      field("Voice Volume", Object.assign(numInput(guest.voiceVolume, "0.05"), { name: "voiceVolume" })),
      field("Playback Speed", Object.assign(numInput(guest.voicePlaybackSpeed, "0.05"), { name: "voicePlaybackSpeed" })),
      field("Camera Min", Object.assign(numInput(guest.cameraMinDistance, "0.1"), { name: "cameraMinDistance" })),
      field("Camera Max", Object.assign(numInput(guest.cameraMaxDistance, "0.1"), { name: "cameraMaxDistance" })),
      field("Camera Height", Object.assign(numInput(guest.cameraHeight, "0.05"), { name: "cameraHeight" })),
      field("Look Lift", Object.assign(numInput(guest.cameraLookLift, "0.05"), { name: "cameraLookLift" })),
      field("Camera FOV", Object.assign(numInput(guest.cameraFov ?? "", "0.01"), { name: "cameraFov" })),
      field("Idle Anim", Object.assign(textInput(guest.idleAnimation), { name: "idleAnimation" })),
      field("Walk Anim", Object.assign(textInput(guest.walkingAnimation), { name: "walkingAnimation" })),
      field("Talk Anim", Object.assign(textInput(guest.talkAnimation), { name: "talkAnimation" })),
      field("Greeting Anim", Object.assign(textInput(guest.greetingAnimation), { name: "greetingAnimation" }))
    );

    form.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener("change", () => readGuestForm(form));
      input.addEventListener("input", () => readGuestForm(form));
    });

    const dialogSection = el("div", "npc-manager-dialogs");
    dialogSection.append(
      el("h3", null, { text: "대본 관리" }),
      (() => {
        const toolbar = el("div", "npc-manager-dialog-toolbar");
        const addBtn = el("button", null, { type: "button", text: "+ 대사" });
        addBtn.addEventListener("click", () => {
          readGuestForm(form);
          const nextOrder = (guest.dialogLines?.length || 0) + 1;
          const line = createEmptyDialogLine(nextOrder);
          guest.dialogLines.push(line);
          selectedDialogId = line.id;
          markDirty();
          render();
        });
        const clearProgressBtn = el("button", null, { type: "button", text: "완료 기록 초기화" });
        clearProgressBtn.addEventListener("click", () => {
          clearConversationCompleted(guest.guestId);
          applyToRuntime();
          setStatus(`${guest.displayName} 대화 완료 기록을 초기화했습니다.`);
          render();
        });
        toolbar.append(addBtn, clearProgressBtn);
        return toolbar;
      })()
    );

    const dialogList = el("ul", "npc-manager-dialog-list");
    [...guest.dialogLines].sort((a, b) => a.order - b.order).forEach((line) => {
      const item = el("li", line.id === selectedDialogId ? "is-selected" : "");
      const label = el("button", "npc-manager-dialog-list__select", {
        type: "button",
        text: `${String(line.order).padStart(2, "0")}. ${(line.koreanText || "(빈 대사)").slice(0, 24)}`
      });
      label.addEventListener("click", () => {
        readGuestForm(form);
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

    const selectedLine = guest.dialogLines.find((line) => line.id === selectedDialogId);

    if (selectedLine) {
      const dialogForm = el("div", "npc-manager-dialog-editor");
      dialogForm.dataset.role = "dialog-form";
      dialogForm.append(
        el("h4", null, { text: `Dialog ${selectedLine.order}` }),
        field("사용", Object.assign(checkbox(selectedLine.enabled), { name: "enabled" })),
        field("한국어 대사", Object.assign(textarea(selectedLine.koreanText, 3), { name: "koreanText" })),
        field("영어 자막", Object.assign(textarea(selectedLine.englishSubtitle, 2), { name: "englishSubtitle" })),
        field("텍스트 속도 (비우면 게스트 기본)", Object.assign(numInput(selectedLine.textSpeed ?? "", "0.01"), { name: "textSpeed" })),
        field("대화 유지시간 (비우면 게스트 기본)", Object.assign(numInput(selectedLine.dialogDuration ?? "", "0.1"), { name: "dialogDuration" })),
        field("음성 파일", Object.assign(textInput(selectedLine.audioFile, "./assets/audio/dialog/..."), { name: "audioFile" }))
      );

      const actions = el("div", "npc-manager-dialog-actions");
      const previewAudio = el("button", null, { type: "button", text: "미리듣기" });
      previewAudio.addEventListener("click", () => {
        readDialogForm(dialogForm);
        if (!selectedLine.audioFile) {
          setStatus("음성 파일이 없습니다.");
          return;
        }

        const audio = new Audio(selectedLine.audioFile);
        audio.volume = clamp01(guest.voiceVolume);
        audio.playbackRate = Math.max(0.5, guest.voicePlaybackSpeed || 1);
        audio.play().catch(() => setStatus("음성 재생 실패"));
      });

      const removeBtn = el("button", null, { type: "button", text: "삭제" });
      removeBtn.addEventListener("click", () => {
        guest.dialogLines = guest.dialogLines.filter((line) => line.id !== selectedLine.id);
        guest.dialogLines.forEach((line, index) => {
          line.order = index + 1;
        });
        selectedDialogId = guest.dialogLines[0]?.id || null;
        markDirty();
        render();
      });

      actions.append(previewAudio, removeBtn);
      dialogForm.append(actions);

      dialogForm.querySelectorAll("input, textarea").forEach((input) => {
        input.addEventListener("change", () => readDialogForm(dialogForm));
        input.addEventListener("input", () => readDialogForm(dialogForm));
      });

      dialogSection.append(dialogForm);
    }

    const deleteGuestBtn = el("button", "npc-manager-danger", {
      type: "button",
      text: "상호작용 설정 초기화"
    });
    deleteGuestBtn.addEventListener("click", () => {
      if (!window.confirm(`${guest.name} 대본/상호작용 설정을 초기화할까요?`)) {
        return;
      }

      guest.interactionEnabled = false;
      guest.dialogLines = [];
      guest.displayName = getModelGuestEntries()
        .find((entry) => entry.guestId === guest.guestId)?.displayName || guest.displayName;
      selectedDialogId = null;
      markDirty();
      notifyDisplayNames();
      render();
    });

    editorEl.append(form, dialogSection, deleteGuestBtn);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function render() {
    bundle = normalizeGuestBundle(bundle);
    renderSummary();
    renderGuestList();
    renderEditor();
  }

  function syncEditorBeforeAction() {
    const guestForm = editorEl.querySelector('[data-role="guest-form"]');
    const dialogForm = editorEl.querySelector('[data-role="dialog-form"]');
    readGuestForm(guestForm);
    readDialogForm(dialogForm);
  }

  async function load() {
    const modelEntries = getModelGuestEntries() || [];
    bundle = await loadEffectiveGuestBundle(undefined, modelEntries);
    selectedGuestId = bundle.guests.find((guest) => guest.guestId === "Mark-2")?.guestId
      || bundle.guests[0]?.guestId
      || null;
    selectedDialogId = null;
    dirty = false;
    render();
    applyToRuntime();
  }

  function setOpen(open) {
    const nextOpen = Boolean(open);
    const wasOpen = !root.hidden;
    root.hidden = !nextOpen;

    if (wasOpen !== nextOpen) {
      onOpenChange?.(nextOpen);
    }
  }

  function toggle() {
    setOpen(root.hidden);
  }

  closeBtn.addEventListener("click", () => setOpen(false));

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const action = button.getAttribute("data-action");

    if (action === "reload-base") {
      if (dirty && !window.confirm("저장하지 않은 변경이 있습니다. 기본 JSON으로 되돌릴까요?")) {
        return;
      }

      clearStoredGuestBundle();
      const modelEntries = getModelGuestEntries() || [];
      bundle = mergeModelGuestsIntoBundle(await loadBaseGuestBundle(), modelEntries);
      dirty = false;
      selectedGuestId = bundle.guests.find((guest) => guest.guestId === "Mark-2")?.guestId
        || bundle.guests[0]?.guestId
        || null;
      render();
      applyToRuntime();
      setStatus("기본 guests.json + 모델 게스트 목록을 불러왔습니다.");
      return;
    }

    if (action === "save") {
      syncEditorBeforeAction();
      bundle = saveGuestBundle(bundle);
      dirty = false;
      applyToRuntime();
      setStatus("게스트/대본 설정을 저장했습니다. (localStorage)");
      render();
      return;
    }

    if (action === "export") {
      syncEditorBeforeAction();
      const blob = new Blob([exportGuestBundleJson(bundle)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = el("a", null, { href: url, download: "guests.json" });
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("guests.json을 내보냈습니다.");
      return;
    }

    if (action === "test") {
      syncEditorBeforeAction();
      const guest = getSelectedGuest();

      if (!guest) {
        setStatus("테스트할 게스트를 선택하세요.");
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
        setStatus("대화 테스트를 시작할 수 없습니다. 게스트가 스폰됐는지 확인하세요.");
        return;
      }

      setOpen(false);
      setStatus(`${guest.displayName} 대화 테스트 시작`);
    }
  });

  return {
    root,
    load,
    toggle,
    setOpen,
    isOpen: () => !root.hidden,
    getBundle: () => cloneGuestBundle(bundle),
    applyToRuntime
  };
}
