/**
 * Local-dev Angji GUIDE tour manager panel.
 */

import {
  clearStoredTourData,
  createEmptyDialogueLine,
  createEmptyTourEvent,
  degreesToRadians,
  exportTourDataJson,
  getEventSummaryRows,
  GUIDE_POST_EVENT_TYPES,
  loadBaseTourData,
  loadEffectiveTourData,
  normalizeTourData,
  radiansToDegrees,
  saveTourData
} from "./angji-guide-tour-data.js?v=angji-guide-manager-20260822";

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

function numInput(value, step = "0.1", name = "") {
  const input = el("input", null, { type: "number", step });
  if (name) {
    input.name = name;
  }
  input.value = value == null ? "" : String(value);
  return input;
}

function textInput(value, placeholder = "", name = "") {
  const input = el("input", null, { type: "text", placeholder });
  if (name) {
    input.name = name;
  }
  input.value = value == null ? "" : String(value);
  return input;
}

function textarea(value, rows = 3, name = "") {
  const input = el("textarea", null, { rows: String(rows) });
  if (name) {
    input.name = name;
  }
  input.value = value == null ? "" : String(value);
  return input;
}

function selectInput(options, value, name = "") {
  const input = el("select");
  if (name) {
    input.name = name;
  }
  options.forEach((opt) => {
    const option = el("option", null, { value: opt.value, text: opt.label });
    option.selected = opt.value === value;
    input.appendChild(option);
  });
  return input;
}

function codedBadges(line) {
  const badges = [];

  if (line.startTourChoice) {
    badges.push("startTourChoice");
  }

  if (line.orbitAfter) {
    badges.push("orbitAfter");
  }

  if (!badges.length) {
    return "";
  }

  return `<div class="guide-manager-badges">${badges.map((name) => `<span class="guide-manager-badge">${name}</span>`).join("")}</div>`;
}

export function createAngjiGuideManagerPanel(options = {}) {
  const {
    getGuideTourSystem = () => null,
    onApplyTourData = null,
    onStatus = null,
    onOpenChange = null,
    canPreview = () => false
  } = options;

  let tourData = normalizeTourData({ events: [] });
  let selectedEventId = null;
  let dirty = false;

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
        <div class="npc-manager-panel__list-toolbar">
          <button type="button" data-action="reload-base">기본값</button>
          <button type="button" data-action="clear-storage">저장 삭제</button>
        </div>
        <div class="guide-manager-global" data-role="global"></div>
        <div class="npc-manager-summary" data-role="summary"></div>
        <ul class="npc-manager-guest-list" data-role="event-list"></ul>
      </div>
      <div class="npc-manager-panel__editor" data-role="editor">
        <p class="npc-manager-empty">왼쪽에서 이벤트를 선택하세요.</p>
      </div>
    </div>
    <footer class="npc-manager-panel__footer">
      <button type="button" data-action="apply">적용</button>
      <button type="button" data-action="save">저장</button>
      <button type="button" data-action="export">JSON 내보내기</button>
      <button type="button" data-action="preview-pos" class="npc-manager-primary">위치 미리보기</button>
    </footer>
  `;

  document.body.appendChild(root);

  const globalEl = root.querySelector('[data-role="global"]');
  const summaryEl = root.querySelector('[data-role="summary"]');
  const listEl = root.querySelector('[data-role="event-list"]');
  const editorEl = root.querySelector('[data-role="editor"]');
  const closeBtn = root.querySelector(".npc-manager-panel__close");

  function setStatus(message) {
    onStatus?.(message);
  }

  function markDirty() {
    dirty = true;
  }

  function getSelectedEvent() {
    return tourData.events.find((event) => event.id === selectedEventId) || null;
  }

  function readGlobalForm() {
    const form = globalEl.querySelector("form");

    if (!form) {
      return;
    }

    tourData.textSpeed = Number(form.querySelector('[name="textSpeed"]')?.value);
    tourData.lineHoldSeconds = Number(form.querySelector('[name="lineHoldSeconds"]')?.value);
    tourData.lineHoldPerChar = Number(form.querySelector('[name="lineHoldPerChar"]')?.value);
    tourData.lineHoldMaxExtra = Number(form.querySelector('[name="lineHoldMaxExtra"]')?.value);
    tourData.dialogDistance = Number(form.querySelector('[name="dialogDistance"]')?.value);
    markDirty();
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
      const speedRaw = card.querySelector('[name="lineTextSpeed"]')?.value ?? "";
      line.textSpeed = speedRaw === "" ? null : Number(speedRaw);
      line.postEvent.type = card.querySelector('[name="postEventType"]')?.value ?? "none";
      line.postEvent.comment = card.querySelector('[name="postEventComment"]')?.value ?? "";
      line.postEvent.checkpointId = card.querySelector('[name="postEventCheckpoint"]')?.value?.trim?.() ?? "";
    });

    markDirty();
  }

  function readEditorForms() {
    readGlobalForm();
    const eventForm = editorEl.querySelector('[data-role="event-form"]');
    const dialogueRoot = editorEl.querySelector('[data-role="dialogue-list"]');

    if (eventForm) {
      readEventForm(eventForm);
    }

    if (dialogueRoot) {
      readEventDialogues(dialogueRoot);
    }
  }

  function renderGlobalForm() {
    globalEl.innerHTML = `
      <form class="guide-manager-global-form">
        <h3>전역 속도</h3>
        <div class="guide-manager-grid">
          ${field("타이핑 속도 (textSpeed)", numInput(tourData.textSpeed, "0.001", "textSpeed")).outerHTML}
          ${field("대기(초)", numInput(tourData.lineHoldSeconds, "0.05", "lineHoldSeconds")).outerHTML}
          ${field("글자당 대기", numInput(tourData.lineHoldPerChar, "0.001", "lineHoldPerChar")).outerHTML}
          ${field("최대 추가 대기", numInput(tourData.lineHoldMaxExtra, "0.05", "lineHoldMaxExtra")).outerHTML}
          ${field("대화 거리(m)", numInput(tourData.dialogDistance, "0.05", "dialogDistance")).outerHTML}
        </div>
      </form>
    `;

    const form = globalEl.querySelector("form");
    form?.addEventListener("input", () => readGlobalForm());
    form?.addEventListener("change", () => readGlobalForm());
  }

  function renderSummary() {
    const rows = getEventSummaryRows(tourData);
    summaryEl.innerHTML = `
      <table>
        <thead>
          <tr><th>ID</th><th>제목</th><th>대사</th><th>위치</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-event-id="${row.id}" class="${row.id === selectedEventId ? "is-selected" : ""}">
              <td>${row.id}</td>
              <td>${row.title}</td>
              <td>${row.lineCount}</td>
              <td>${row.position.x.toFixed(1)}, ${row.position.y.toFixed(1)}, ${row.position.z.toFixed(1)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    summaryEl.querySelectorAll("tr[data-event-id]").forEach((row) => {
      row.addEventListener("click", () => {
        selectedEventId = row.getAttribute("data-event-id");
        render();
      });
    });
  }

  function renderEventList() {
    listEl.innerHTML = "";

    tourData.events.forEach((event) => {
      const item = el(
        "li",
        `npc-manager-guest-list__item${event.id === selectedEventId ? " is-selected" : ""}`
      );
      item.textContent = `${event.id} · ${event.title}`;
      item.addEventListener("click", () => {
        selectedEventId = event.id;
        render();
      });
      listEl.appendChild(item);
    });
  }

  function readEventForm(form) {
    const event = getSelectedEvent();

    if (!event || !form) {
      return;
    }

    event.title = form.querySelector('[name="title"]')?.value.trim() || event.title;
    event.guidePosition.x = Number(form.querySelector('[name="posX"]')?.value);
    event.guidePosition.y = Number(form.querySelector('[name="posY"]')?.value);
    event.guidePosition.z = Number(form.querySelector('[name="posZ"]')?.value);
    event.guideRotationY = degreesToRadians(Number(form.querySelector('[name="rotDeg"]')?.value));
    event.cameraEffect = form.querySelector('[name="cameraEffect"]')?.value.trim() || "default";
    event.keepConfiguredY = form.querySelector('[name="keepConfiguredY"]')?.checked ?? false;
    markDirty();
  }

  function renderDialogueSets(event) {
    return event.dialogues.map((line, index) => {
      const postType = line.postEvent?.type || "none";

      return `
        <article class="guide-manager-dialog-set" data-line-id="${line.id}">
          <header class="guide-manager-dialog-set__head">
            <strong>#${index + 1} · ${line.id}</strong>
            ${codedBadges(line)}
            <button type="button" data-action="delete-line" data-line-id="${line.id}">삭제</button>
          </header>
          <div class="guide-manager-dialog-set__pair">
            <label class="guide-manager-dialog-set__field">
              <span>한국어</span>
              <textarea name="ko" rows="3">${escapeHtml(line.ko)}</textarea>
            </label>
            <label class="guide-manager-dialog-set__field guide-manager-dialog-set__field--en">
              <span>English</span>
              <textarea name="en" rows="2">${escapeHtml(line.en)}</textarea>
            </label>
          </div>
          <div class="guide-manager-dialog-set__meta">
            ${field("개별 textSpeed", numInput(line.textSpeed ?? "", "0.001", "lineTextSpeed")).outerHTML}
            ${field("다음 이벤트", selectInput([
              { value: "none", label: "없음" },
              { value: "yes_no", label: "YES / NO" },
              { value: "other", label: "기타 (체크포인트)" }
            ], postType, "postEventType")).outerHTML}
            ${field("코멘트", textarea(line.postEvent?.comment || "", 2, "postEventComment")).outerHTML}
            ${field("체크포인트 ID", textInput(line.postEvent?.checkpointId || "", "orbit_spin", "postEventCheckpoint")).outerHTML}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderEventEditor() {
    const event = getSelectedEvent();

    if (!event) {
      editorEl.innerHTML = '<p class="npc-manager-empty">왼쪽에서 이벤트를 선택하세요.</p>';
      return;
    }

    editorEl.innerHTML = `
      <section class="guide-manager-section">
        <h3>이벤트 ${event.id}</h3>
        <form data-role="event-form">
          ${field("제목", textInput(event.title, "", "title")).outerHTML}
          <h4>가이드 위치</h4>
          <div class="guide-manager-grid">
            ${field("X", numInput(event.guidePosition.x, "0.01", "posX")).outerHTML}
            ${field("Y", numInput(event.guidePosition.y, "0.01", "posY")).outerHTML}
            ${field("Z", numInput(event.guidePosition.z, "0.01", "posZ")).outerHTML}
            ${field("방향 (°)", numInput(radiansToDegrees(event.guideRotationY).toFixed(2), "0.1", "rotDeg")).outerHTML}
          </div>
          ${field("cameraEffect", textInput(event.cameraEffect, "default", "cameraEffect")).outerHTML}
          <label class="npc-manager-field">
            <span>keepConfiguredY</span>
            <input type="checkbox" name="keepConfiguredY"${event.keepConfiguredY ? " checked" : ""}>
          </label>
          <div class="guide-manager-inline-actions">
            <button type="button" data-action="capture-pos">씬에서 가져오기</button>
            <button type="button" data-action="apply-pos">씬에 적용</button>
          </div>
        </form>
      </section>
      <section class="guide-manager-section">
        <div class="guide-manager-lines__toolbar">
          <h3>대본 (${event.dialogues.length})</h3>
          <button type="button" data-action="add-line">+ 대사 세트</button>
        </div>
        <div class="guide-manager-dialog-list" data-role="dialogue-list">
          ${renderDialogueSets(event)}
        </div>
        <p class="guide-manager-hint">한국어·English는 한 세트입니다. YES/NO·기타 메타는 코드 플래그(startTourChoice, orbitAfter) 또는 checkpointId와 함께 사용합니다.</p>
      </section>
    `;

    const eventForm = editorEl.querySelector('[data-role="event-form"]');
    const dialogueRoot = editorEl.querySelector('[data-role="dialogue-list"]');

    const bindFormInput = (form, reader) => {
      form?.addEventListener("input", () => reader());
      form?.addEventListener("change", () => reader());
    };

    bindFormInput(eventForm, () => readEventForm(eventForm));
    bindFormInput(dialogueRoot, () => readEventDialogues(dialogueRoot));

    eventForm?.querySelector('[data-action="capture-pos"]')?.addEventListener("click", () => {
      readEditorForms();
      const captured = getGuideTourSystem()?.captureGuideTransform?.();

      if (!captured) {
        setStatus("가이드 NPC를 찾을 수 없습니다. 워크 모드에서 확인하세요.");
        return;
      }

      event.guidePosition.x = captured.x;
      event.guidePosition.y = captured.y;
      event.guidePosition.z = captured.z;
      event.guideRotationY = captured.rotationY;
      markDirty();
      renderEventEditor();
      setStatus("현재 씬의 가이드 위치를 불러왔습니다.");
    });

    eventForm?.querySelector('[data-action="apply-pos"]')?.addEventListener("click", () => {
      readEditorForms();
      applyRuntime(false);
      const index = tourData.events.findIndex((item) => item.id === event.id);
      getGuideTourSystem()?.previewEventTransform?.(index);
      setStatus(`이벤트 ${event.id} 위치를 씬에 적용했습니다.`);
    });

    editorEl.querySelector('[data-action="add-line"]')?.addEventListener("click", () => {
      readEditorForms();
      event.dialogues.push(createEmptyDialogueLine(event.id, event.dialogues.length));
      markDirty();
      renderEventEditor();
    });

    dialogueRoot?.querySelectorAll('[data-action="delete-line"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        if (event.dialogues.length <= 1) {
          setStatus("이벤트에는 최소 1개의 대사가 필요합니다.");
          return;
        }

        readEditorForms();
        const lineId = btn.getAttribute("data-line-id");
        event.dialogues = event.dialogues.filter((item) => item.id !== lineId);
        markDirty();
        renderEventEditor();
      });
    });
  }

  function render() {
    renderGlobalForm();
    renderSummary();
    renderEventList();
    renderEventEditor();
  }

  function applyRuntime(persist = true) {
    tourData = normalizeTourData(tourData);

    if (persist && dirty) {
      saveTourData(tourData);
      dirty = false;
    }

    getGuideTourSystem()?.reloadTourData?.(tourData);
    onApplyTourData?.(tourData);
  }

  async function load() {
    tourData = await loadEffectiveTourData();
    selectedEventId = tourData.events[0]?.id || null;
    dirty = false;
    render();
    applyRuntime(false);
    setStatus("가이드 투어 데이터를 불러왔습니다.");
  }

  function open() {
    root.hidden = false;
    onOpenChange?.(true);
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

  root.addEventListener("click", (event) => {
    const action = event.target?.getAttribute?.("data-action");

    if (!action) {
      return;
    }

    if (action === "reload-base") {
      void loadBaseTourData().then((base) => {
        tourData = base;
        selectedEventId = tourData.events[0]?.id || null;
        dirty = true;
        render();
        setStatus("기본 JSON을 불러왔습니다. 저장 또는 적용을 눌러 반영하세요.");
      }).catch((error) => {
        console.error("[guide-manager] reload base failed", error);
        setStatus("기본값 불러오기 실패");
      });
      return;
    }

    if (action === "clear-storage") {
      clearStoredTourData();
      void load();
      setStatus("localStorage 저장본을 삭제하고 다시 불러왔습니다.");
      return;
    }

    if (action === "apply") {
      readEditorForms();
      applyRuntime(true);
      setStatus("가이드 설정을 적용·저장했습니다.");
      return;
    }

    if (action === "save") {
      readEditorForms();
      saveTourData(tourData);
      dirty = false;
      setStatus("localStorage에 저장했습니다.");
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

    if (action === "preview-pos") {
      if (!canPreview()) {
        setStatus("워크 모드(앵지·주간)에서만 미리보기할 수 있습니다.");
        return;
      }

      readEditorForms();
      applyRuntime(false);
      const event = getSelectedEvent();
      const index = tourData.events.findIndex((item) => item.id === event?.id);
      getGuideTourSystem()?.previewEventTransform?.(index);
      setStatus(`이벤트 ${event?.id || "-"} 위치 미리보기`);
    }
  });

  return {
    load,
    open,
    close: closePanel,
    toggle,
    isOpen,
    getTourData: () => normalizeTourData(tourData),
    applyRuntime
  };
}
