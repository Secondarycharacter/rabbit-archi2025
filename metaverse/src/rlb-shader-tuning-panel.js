/**
 * Bottom tuning panel — per RLB fixture type shader sliders (Rabbit Light Baker style).
 */

import {
  RLB_SHAPE,
  formatRlbTuningTabLabel,
  listPresentRlbTuningTypes
} from "./rlb-fixture-types.js";
import {
  createDefaultRlbTuningState,
  createRlbLightGroup,
  ensureRlbGroupState,
  getDefaultTypeProfile,
  getRlbGroupsForType,
  isRlbTypeShaderEnabled,
  kelvinToSpillRgb,
  loadRlbTuningState,
  rebuildRlbLightGroups,
  remapRlbGroupMemberIds,
  resetRlbTuningState,
  resolveRlbTypeColorTemperatureK,
  resolveRlbTypeSpillColor,
  saveRlbTuningState,
  syncSpillColorFromTemperature
} from "./rlb-shader-tuning.js?v=rlb-shader-proximity-20260819-group-v47";

const COLOR_TEMP_FIELD = {
  key: "colorTemperatureK",
  label: "색온도 (K)",
  min: 1800,
  max: 12000,
  step: 50
};

const SHAPE_OPTIONS = [
  { value: RLB_SHAPE.AUTO, label: "자동" },
  { value: RLB_SHAPE.CIRCLE, label: "원형" },
  { value: RLB_SHAPE.RECT, label: "사각" },
  { value: RLB_SHAPE.LINE, label: "라인" },
  { value: RLB_SHAPE.CONE, label: "콘 (방향)" }
];

const GLOBAL_FIELDS = [
  { key: "spillOpacity", label: "Spill 투명도 (전체)", min: 0, max: 1, step: 0.01 },
  { key: "spillMaxBlend", label: "최대 혼합 (재질 보존)", min: 0.05, max: 2.5, step: 0.01 },
  { key: "spillLumaPreserve", label: "밝은면 보존", min: 0, max: 1, step: 0.01 },
  { key: "innerRadius", label: "기본 내부 반경 (m)", min: 1, max: 80, step: 0.5 },
  { key: "outerRadius", label: "기본 외부 반경 (m)", min: 2, max: 120, step: 0.5 },
  { key: "colorTemperatureK", label: "색온도 (K)", min: 1800, max: 12000, step: 50 }
];

const TYPE_FIELDS = [
  { key: "innerRadius", label: "내부 반경 (m)", min: 1, max: 80, step: 0.5 },
  { key: "outerRadius", label: "외부 반경 (m)", min: 2, max: 120, step: 0.5 },
  { key: "spillMultiplier", label: "Spill 배율 (이 종류)", min: 0, max: 40, step: 0.05 },
  { key: "intensity", label: "강도 배율", min: 0, max: 3, step: 0.05 },
  { key: "coneSoftness", label: "외곽 또렷 ↔ 흐림", min: 0, max: 1, step: 0.01 }
];

function cloneTuningState(state) {
  return JSON.parse(JSON.stringify(state));
}

function readNestedValue(object, key) {
  if (key.includes(".")) {
    const [head, tail] = key.split(".");
    return object?.[head]?.[tail];
  }

  return object?.[key];
}

function writeNestedValue(object, key, value) {
  if (key.includes(".")) {
    const [head, tail] = key.split(".");
    object[head] = { ...(object[head] || {}), [tail]: value };
    return;
  }

  object[key] = value;
}

function formatValue(value, field) {
  if (field?.step >= 1 || Number.isInteger(value)) {
    return String(Math.round(Number(value)));
  }

  const stepText = String(field?.step ?? "0.01");
  const decimals = stepText.includes(".") ? stepText.split(".")[1].length : 2;
  return Number(value).toFixed(decimals);
}

function parseFieldValue(field, raw) {
  const parsed = Number.parseFloat(raw);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const clamped = Math.min(field.max, Math.max(field.min, parsed));

  if (field.step >= 1) {
    return Math.round(clamped);
  }

  const stepText = String(field.step);
  const decimals = stepText.includes(".") ? stepText.split(".")[1].length : 2;
  return Number(clamped.toFixed(decimals));
}

function ensureTypeProfile(tuningState, typeName) {
  if (!tuningState.types[typeName]) {
    tuningState.types[typeName] = getDefaultTypeProfile(typeName);
  }

  if (typeof tuningState.types[typeName].shaderEnabled !== "boolean") {
    tuningState.types[typeName].shaderEnabled = true;
  }

  return tuningState.types[typeName];
}

export function createRlbShaderTuningPanel(options = {}) {
  const panel = document.getElementById("rlbTuningPanel");
  const toggleButton = document.getElementById("rlbTuningToggleButton");
  const tabsRoot = document.getElementById("rlbTuningTabs");
  const lightsRoot = document.getElementById("rlbTuningLights");
  const bodyRoot = document.getElementById("rlbTuningBody");
  const statusEl = document.getElementById("rlbTuningStatus");
  const saveButton = document.getElementById("rlbTuningSaveButton");
  const resetButton = document.getElementById("rlbTuningResetButton");
  const closeButton = document.getElementById("rlbTuningCloseButton");

  if (!panel || !toggleButton || !tabsRoot || !bodyRoot) {
    console.warn("[rlb-tune] panel DOM missing — tuning UI disabled");
    return { syncVisibility() {}, dispose() {} };
  }

  let tuningState = ensureRlbGroupState(loadRlbTuningState());
  let activeTab = "Global";
  let activeGroupId = null;
  let selectedLightIds = new Set();
  let focusedLightId = null;
  let lightQuery = "";
  const collapsedSectionIds = new Set();
  let dirty = false;
  let panelOpen = false;

  const getGlow = () => options.getGlowController?.() || null;

  const readModelTypeInfo = () => {
    const glow = getGlow();
    const info = glow?.getLightTypeInfo?.() || { counts: {}, materialNames: {} };
    const tabs = glow?.getPresentLightTypes?.()
      || listPresentRlbTuningTypes(info.counts);

    return { ...info, tabs };
  };

  const ensureActiveTabVisible = (tabs) => {
    if (tabs.includes(activeTab)) {
      return;
    }

    activeTab = tabs[0] || "Global";
  };

  const setStatus = (message, isError = false) => {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message || "";
    statusEl.classList.toggle("is-error", Boolean(isError));
  };

  const applyLive = () => {
    const glow = getGlow();

    if (!glow) {
      setStatus("Angji RLB glow가 아직 준비되지 않았습니다.", true);
      return;
    }

    glowOptionsSync();
    syncSpillColorFromTemperature(tuningState.global);
    const activeLights = glow.applyTuning?.(tuningState) ?? 0;
    options.requestRender?.();
    dirty = true;

    const tabLabel = activeTab === "Global"
      ? "Global"
      : (activeGroupId && tuningState.groups?.[activeGroupId]
        ? `그룹 ${tuningState.groups[activeGroupId].name}`
        : formatRlbTuningTabLabel(activeTab, readModelTypeInfo().counts[activeTab] || 0));
    const spill = glow.getSpillCounts?.();
    let spillText = `활성 spill=${activeLights}`;

    if (spill) {
      spillText = `활성 spill=${spill.packed}/${spill.enabled}`;
      if (activeTab !== "Global") {
        const typeSpill = spill.byType?.[activeTab];
        if (typeSpill) {
          spillText += ` · ${activeTab} ${typeSpill.enabled}/${typeSpill.total}`;
        }
      }
      if (spill.enabled > spill.cap) {
        spillText += ` · GPU한도 ${spill.cap}로 잘림`;
      }
    }

    setStatus(`실시간 반영 · ${tabLabel} · ${spillText}`);
  };

  const glowOptionsSync = () => {
    const glow = getGlow();
    const live = glow?.getTuningState?.();

    if (live && live !== tuningState) {
      Object.assign(live.global, tuningState.global);
      Object.keys(tuningState.types).forEach((typeName) => {
        live.types[typeName] = {
          ...live.types[typeName],
          ...tuningState.types[typeName]
        };
      });
      ensureRlbGroupState(live);
      live.groups = tuningState.groups;
      live.lightGroups = tuningState.lightGroups;
      tuningState = live;
    }
    ensureRlbGroupState(tuningState);
  };

  const refreshUi = ({ restoreScroll = true } = {}) => {
    const list = lightsRoot?.querySelector(".rlb-tuning-lights__list");
    const scrollTop = restoreScroll ? (list?.scrollTop || 0) : 0;
    renderTabs();
    renderLights();
    renderBody();
    const nextList = lightsRoot?.querySelector(".rlb-tuning-lights__list");

    if (nextList) {
      nextList.scrollTop = scrollTop;
    }
  };

  const focusLightInScene = (lightId) => {
    focusedLightId = lightId || null;
    const glow = getGlow();
    glow?.setNameLabelsVisible?.(true);
    glow?.setFocusedLight?.(focusedLightId);
    lightsRoot?.querySelectorAll(".rlb-tuning-lights__item").forEach((row) => {
      row.classList.toggle("is-focused", row.dataset.lightId === focusedLightId);
    });
  };

  const hoverLightInScene = (lightId) => {
    getGlow()?.setHoveredLight?.(lightId || null);
  };

  const updateToolbarState = () => {
    if (!lightsRoot || activeTab === "Global") {
      return;
    }

    const selectedCount = selectedIdsOfType().length;
    const visibleItems = lightsRoot.querySelectorAll(".rlb-tuning-lights__item");
    const allVisibleSelected = visibleItems.length > 0
      && [...visibleItems].every((row) => selectedLightIds.has(row.dataset.lightId));
    const createButton = lightsRoot.querySelector('[data-rlb-action="create-group"]');
    const ungroupButton = lightsRoot.querySelector('[data-rlb-action="ungroup"]');
    const selectAllButton = lightsRoot.querySelector('[data-rlb-action="select-all"]');
    const groupSelect = lightsRoot.querySelector('[data-rlb-action="add-to-group"]');

    if (createButton) {
      createButton.disabled = selectedCount < 1;
    }

    if (ungroupButton) {
      ungroupButton.disabled = selectedCount < 1;
    }

    if (selectAllButton) {
      selectAllButton.disabled = visibleItems.length < 1;
      selectAllButton.textContent = allVisibleSelected ? "선택 해제" : "전체 선택";
    }

    if (groupSelect) {
      groupSelect.disabled = selectedCount < 1 || groupSelect.options.length < 2;
    }
  };

  const syncSelectionClasses = () => {
    lightsRoot?.querySelectorAll(".rlb-tuning-lights__item").forEach((row) => {
      const selected = selectedLightIds.has(row.dataset.lightId);
      row.classList.toggle("is-active", selected);
      const check = row.querySelector("input[type=checkbox]");

      if (check) {
        check.checked = selected;
      }
    });
    updateToolbarState();
  };

  const allCatalog = () => getGlow()?.getLightCatalog?.() || [];

  const catalogForActiveType = () => {
    const catalog = allCatalog();
    return activeTab === "Global"
      ? catalog
      : catalog.filter((item) => item.type === activeTab);
  };

  const selectedIdsOfType = () => catalogForActiveType()
    .map((item) => item.id)
    .filter((id) => selectedLightIds.has(id));

  const groupIdForLight = (lightId) => tuningState.lightGroups?.[lightId] || null;

  const isSectionCollapsed = (sectionId) => (
    !lightQuery.trim() && collapsedSectionIds.has(sectionId)
  );

  const deselectGroupMembers = (group) => {
    (group?.memberIds || []).forEach((id) => selectedLightIds.delete(id));

    if (group?.id && activeGroupId === group.id) {
      activeGroupId = null;
    }
  };

  const areGroupMembersSelected = (group) => {
    const memberIds = group?.memberIds || [];
    return memberIds.length > 0 && memberIds.every((id) => selectedLightIds.has(id));
  };

  const toggleSectionCollapsed = (sectionId, options = {}) => {
    if (collapsedSectionIds.has(sectionId)) {
      collapsedSectionIds.delete(sectionId);
    } else {
      collapsedSectionIds.add(sectionId);
      options.onCollapse?.();
    }

    const list = lightsRoot?.querySelector(".rlb-tuning-lights__list");
    const scrollTop = list?.scrollTop || 0;
    renderLights();
    const nextList = lightsRoot?.querySelector(".rlb-tuning-lights__list");

    if (nextList) {
      nextList.scrollTop = scrollTop;
    }
  };

  const collectVisibleSectionIds = () => {
    const ids = [];
    const { tabs } = readModelTypeInfo();
    const types = activeTab === "Global"
      ? tabs.filter((typeName) => typeName !== "Global")
      : [activeTab];

    types.forEach((typeName) => {
      if (activeTab === "Global") {
        ids.push(`t:${typeName}`);
      }

      getRlbGroupsForType(tuningState, typeName).forEach((group) => {
        ids.push(`g:${group.id}`);
      });
      ids.push(`u:${typeName}`);
    });

    return ids;
  };

  const ungroupLightIds = (lightIds) => {
    ensureRlbGroupState(tuningState);
    const ids = new Set(lightIds);
    Object.values(tuningState.groups).forEach((group) => {
      group.memberIds = (group.memberIds || []).filter((id) => !ids.has(id));
    });
    Object.keys(tuningState.groups).forEach((groupId) => {
      if (!tuningState.groups[groupId].memberIds.length) {
        delete tuningState.groups[groupId];
      }
    });
    rebuildRlbLightGroups(tuningState);

    if (activeGroupId && !tuningState.groups[activeGroupId]) {
      activeGroupId = null;
    }
  };

  const createGroupFromSelection = () => {
    if (activeTab === "Global") {
      setStatus("종류 탭에서 같은 조명끼리 그룹을 만드세요.", true);
      return;
    }

    const selectedIds = selectedIdsOfType();
    const memberIds = selectedIds.filter((id) => !groupIdForLight(id));
    const keptInExisting = selectedIds.length - memberIds.length;

    if (memberIds.length < 1) {
      setStatus(
        selectedIds.length
          ? "선택한 조명이 이미 다른 그룹에 있습니다. 미분류 조명만 골라 새 그룹을 만드세요."
          : "그룹으로 묶을 조명을 먼저 선택하세요.",
        true
      );
      return;
    }

    const count = getRlbGroupsForType(tuningState, activeTab).length + 1;
    const name = window.prompt("그룹 이름", `${activeTab} 그룹 ${count}`);

    if (name == null) {
      return;
    }

    const group = createRlbLightGroup(tuningState, activeTab, name, memberIds);
    activeGroupId = group.id;
    selectedLightIds = new Set(group.memberIds);
    collapsedSectionIds.delete(`g:${group.id}`);
    refreshUi();
    applyLive();
    setStatus(
      keptInExisting > 0
        ? `그룹 '${group.name}' ${group.memberIds.length}개를 새로 만들었습니다. 기존 그룹 ${keptInExisting}개는 그대로 두었습니다.`
        : `그룹 '${group.name}' ${group.memberIds.length}개를 새로 만들었습니다.`
    );
  };

  const addSelectionToGroup = (groupId) => {
    const group = tuningState.groups?.[groupId];
    const memberIds = selectedIdsOfType();

    if (!group || group.typeName !== activeTab || !memberIds.length) {
      return;
    }

    ungroupLightIds(memberIds);
    group.memberIds = [...new Set([...(group.memberIds || []), ...memberIds])];
    rebuildRlbLightGroups(tuningState);
    activeGroupId = group.id;
    refreshUi();
    applyLive();
    setStatus(`선택한 ${memberIds.length}개를 '${group.name}' 그룹 설정으로 맞췄습니다.`);
  };

  const matchesLightQuery = (item, query) => {
    if (!query) {
      return true;
    }

    return item.name.toLowerCase().includes(query)
      || (item.sourceName || "").toLowerCase().includes(query)
      || item.meshName.toLowerCase().includes(query)
      || item.materialName.toLowerCase().includes(query)
      || item.type.toLowerCase().includes(query);
  };

  const renderLights = () => {
    if (!lightsRoot) {
      return;
    }

    lightsRoot.hidden = false;
    lightsRoot.innerHTML = "";
    const isGlobal = activeTab === "Global";
    const lights = catalogForActiveType();
    const query = lightQuery.trim().toLowerCase();
    const visible = lights.filter((item) => matchesLightQuery(item, query));
    const { tabs } = readModelTypeInfo();
    const typesToShow = isGlobal
      ? tabs.filter((typeName) => typeName !== "Global")
      : [activeTab];

    const search = document.createElement("input");
    search.type = "search";
    search.className = "rlb-tuning-lights__search";
    search.placeholder = isGlobal
      ? `모델 조명 검색 (${lights.length})`
      : `${activeTab} 조명 검색 (${lights.length})`;
    search.value = lightQuery;
    search.addEventListener("input", () => {
      lightQuery = search.value;
      renderLights();
      const nextSearch = lightsRoot.querySelector(".rlb-tuning-lights__search");

      if (nextSearch) {
        nextSearch.focus();
        const cursor = nextSearch.value.length;
        nextSearch.setSelectionRange(cursor, cursor);
      }
    });
    lightsRoot.appendChild(search);

    if (isGlobal) {
      const hint = document.createElement("p");
      hint.className = "rlb-tuning-lights__empty";
      hint.textContent = "조명 이름을 클릭하면 모델에서 2배로 강조됩니다. 종류 탭에서 그룹을 만듭니다.";
      lightsRoot.appendChild(hint);
    } else {
      const toolbar = document.createElement("div");
      toolbar.className = "rlb-tuning-lights__toolbar";
      const selectedCount = selectedIdsOfType().length;
      const createButton = document.createElement("button");
      createButton.type = "button";
      createButton.dataset.rlbAction = "create-group";
      createButton.textContent = "그룹 만들기";
      createButton.disabled = selectedCount < 1;
      createButton.addEventListener("click", createGroupFromSelection);
      const ungroupButton = document.createElement("button");
      ungroupButton.type = "button";
      ungroupButton.dataset.rlbAction = "ungroup";
      ungroupButton.textContent = "그룹 해제";
      ungroupButton.disabled = selectedCount < 1;
      ungroupButton.addEventListener("click", () => {
        ungroupLightIds(selectedIdsOfType());
        refreshUi();
        applyLive();
        setStatus("선택한 조명을 종류 기본 설정으로 되돌렸습니다.");
      });
      const selectAllButton = document.createElement("button");
      selectAllButton.type = "button";
      selectAllButton.dataset.rlbAction = "select-all";
      const allVisibleSelected = visible.length > 0
        && visible.every((item) => selectedLightIds.has(item.id));
      selectAllButton.textContent = allVisibleSelected ? "선택 해제" : "전체 선택";
      selectAllButton.disabled = visible.length < 1;
      selectAllButton.addEventListener("click", () => {
        if (allVisibleSelected) {
          visible.forEach((item) => selectedLightIds.delete(item.id));
        } else {
          visible.forEach((item) => selectedLightIds.add(item.id));
        }
        syncSelectionClasses();
      });
      const groupSelect = document.createElement("select");
      groupSelect.dataset.rlbAction = "add-to-group";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "그룹에 넣기";
      groupSelect.appendChild(placeholder);
      getRlbGroupsForType(tuningState, activeTab).forEach((group) => {
        const option = document.createElement("option");
        option.value = group.id;
        option.textContent = group.name;
        groupSelect.appendChild(option);
      });
      groupSelect.disabled = selectedCount < 1 || groupSelect.options.length < 2;
      groupSelect.addEventListener("change", () => {
        if (groupSelect.value) {
          addSelectionToGroup(groupSelect.value);
        }
      });
      const collapseAllButton = document.createElement("button");
      collapseAllButton.type = "button";
      collapseAllButton.textContent = "모두 접기";
      collapseAllButton.addEventListener("click", () => {
        collectVisibleSectionIds().forEach((id) => collapsedSectionIds.add(id));
        const types = activeTab === "Global"
          ? readModelTypeInfo().tabs.filter((typeName) => typeName !== "Global")
          : [activeTab];
        types.forEach((typeName) => {
          getRlbGroupsForType(tuningState, typeName).forEach((group) => {
            deselectGroupMembers(group);
          });
        });
        renderLights();
      });
      const expandAllButton = document.createElement("button");
      expandAllButton.type = "button";
      expandAllButton.textContent = "모두 펼치기";
      expandAllButton.addEventListener("click", () => {
        collectVisibleSectionIds().forEach((id) => collapsedSectionIds.delete(id));
        renderLights();
      });
      toolbar.append(selectAllButton, createButton, groupSelect, ungroupButton, collapseAllButton, expandAllButton);
      lightsRoot.appendChild(toolbar);
    }

    const list = document.createElement("div");
    list.className = "rlb-tuning-lights__list";

    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "rlb-tuning-lights__empty";
      empty.textContent = lights.length ? "검색 결과가 없습니다." : "모델에서 RLB 조명을 아직 찾지 못했습니다.";
      list.appendChild(empty);
      lightsRoot.appendChild(list);
      return;
    }

    const appendLightRow = (item, indent = false, parent = list) => {
      const row = document.createElement("label");
      row.className = "rlb-tuning-lights__item";
      row.dataset.lightId = item.id;
      row.classList.toggle("is-active", selectedLightIds.has(item.id));
      row.classList.toggle("is-focused", focusedLightId === item.id);
      if (indent) {
        row.style.paddingLeft = "18px";
      }

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = selectedLightIds.has(item.id);
      check.addEventListener("click", (event) => event.stopPropagation());
      check.addEventListener("change", () => {
        if (check.checked) {
          selectedLightIds.add(item.id);
        } else {
          selectedLightIds.delete(item.id);
        }
        syncSelectionClasses();
        focusLightInScene(item.id);
      });

      const text = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = item.name;
      const meta = document.createElement("small");
      const group = tuningState.groups?.[groupIdForLight(item.id)];
      const pos = [item.x, item.y, item.z].every((value) => Number.isFinite(value))
        ? `${item.x.toFixed(1)}, ${item.y.toFixed(1)}, ${item.z.toFixed(1)}`
        : "";
      const meshMeta = item.meshName && item.meshName !== item.name ? item.meshName : "";
      meta.textContent = [
        isGlobal ? item.type : "",
        item.indexLabel ? `#${item.indexLabel}` : "",
        group ? group.name : "미분류",
        meshMeta,
        pos
      ].filter(Boolean).join(" · ");
      text.append(title, meta);
      row.append(check, text);
      row.addEventListener("click", () => {
        selectedLightIds.add(item.id);
        syncSelectionClasses();
        focusLightInScene(item.id);
        setStatus(`모델에서 '${item.name}' 이름을 강조했습니다.`);
      });
      row.addEventListener("pointerenter", () => hoverLightInScene(item.id));
      row.addEventListener("pointerleave", () => hoverLightInScene(null));
      parent.appendChild(row);
    };

    const appendSectionHeader = ({ className, sectionId, label, isActive, onSelect, onCollapse }) => {
      const collapsed = isSectionCollapsed(sectionId);
      const header = document.createElement("div");
      header.className = `${className} rlb-tuning-lights__section-head`;
      header.classList.toggle("is-active", Boolean(isActive));
      header.classList.toggle("is-collapsed", collapsed);

      const foldButton = document.createElement("button");
      foldButton.type = "button";
      foldButton.className = "rlb-tuning-lights__fold";
      foldButton.setAttribute("aria-expanded", collapsed ? "false" : "true");
      foldButton.setAttribute("aria-label", collapsed ? "목록 펼치기" : "목록 접기");
      foldButton.textContent = collapsed ? "▸" : "▾";
      foldButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSectionCollapsed(sectionId, { onCollapse });
      });

      const titleButton = document.createElement("button");
      titleButton.type = "button";
      titleButton.className = "rlb-tuning-lights__section-title";
      titleButton.textContent = label;
      titleButton.addEventListener("click", onSelect);

      header.append(foldButton, titleButton);
      list.appendChild(header);
      return collapsed;
    };

    const appendTypeSection = (typeName) => {
      const typeLights = visible.filter((item) => item.type === typeName);

      if (!typeLights.length) {
        return;
      }

      if (isGlobal) {
        const typeCollapsed = appendSectionHeader({
          className: "rlb-tuning-lights__type",
          sectionId: `t:${typeName}`,
          label: formatRlbTuningTabLabel(typeName, typeLights.length),
          isActive: false,
          onSelect: () => {
            activeTab = typeName;
            activeGroupId = null;
            selectedLightIds = new Set();
            lightQuery = "";
            collapsedSectionIds.delete(`t:${typeName}`);
            refreshUi();
          }
        });

        if (typeCollapsed) {
          return;
        }
      }

      const groups = getRlbGroupsForType(tuningState, typeName);
      const groupedIds = new Set(groups.flatMap((group) => group.memberIds || []));
      const byId = new Map(typeLights.map((item) => [item.id, item]));

      groups.forEach((group) => {
        const members = (group.memberIds || []).map((id) => byId.get(id)).filter(Boolean);

        if (query && !members.length && !group.name.toLowerCase().includes(query)) {
          return;
        }

        const groupCollapsed = appendSectionHeader({
          className: "rlb-tuning-lights__group",
          sectionId: `g:${group.id}`,
          label: `${group.name} (${group.memberIds.length})`,
          isActive: !isGlobal && activeGroupId === group.id,
          onCollapse: () => deselectGroupMembers(group),
          onSelect: () => {
            activeTab = typeName;

            if (!isGlobal && areGroupMembersSelected(group)) {
              deselectGroupMembers(group);
              refreshUi();
              setStatus(`그룹 '${group.name}' 선택을 해제했습니다.`);
              return;
            }

            activeGroupId = group.id;
            selectedLightIds = new Set(group.memberIds);
            collapsedSectionIds.delete(`g:${group.id}`);
            if (isGlobal) {
              lightQuery = "";
            }
            refreshUi();
            setStatus(`그룹 '${group.name}' 설정을 편집합니다. 구성원 ${group.memberIds.length}개에 동일 적용.`);
          }
        });

        if (!groupCollapsed) {
          members.forEach((item) => appendLightRow(item, true));
        }
      });

      const ungrouped = typeLights.filter((item) => !groupedIds.has(item.id));

      if (ungrouped.length) {
        const ungroupedCollapsed = appendSectionHeader({
          className: "rlb-tuning-lights__group",
          sectionId: `u:${typeName}`,
          label: `미분류 (${ungrouped.length})`,
          isActive: !isGlobal && !activeGroupId,
          onSelect: () => {
            activeTab = typeName;
            activeGroupId = null;
            collapsedSectionIds.delete(`u:${typeName}`);
            if (isGlobal) {
              selectedLightIds = new Set();
              lightQuery = "";
            }
            refreshUi();
            setStatus(`${typeName} 종류 기본 설정. 미분류 조명에 적용됩니다.`);
          }
        });

        if (!ungroupedCollapsed) {
          ungrouped.forEach((item) => appendLightRow(item));
        }
      }
    };

    typesToShow.forEach(appendTypeSection);
    lightsRoot.appendChild(list);
  };

  const renderTabs = () => {
    const { counts, tabs } = readModelTypeInfo();
    ensureActiveTabVisible(tabs);

    tabsRoot.innerHTML = "";

    tabs.forEach((typeName) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rlb-tuning-tabs__tab";
      button.dataset.type = typeName;
      button.classList.toggle("is-active", typeName === activeTab);

      const enabled = typeName === "Global" || isRlbTypeShaderEnabled(typeName, tuningState);
      button.classList.toggle("is-disabled", typeName !== "Global" && !enabled);

      let label = formatRlbTuningTabLabel(typeName, counts[typeName] || 0);

      if (typeName !== "Global" && !enabled) {
        label += " · OFF";
      }

      button.textContent = label;
      button.addEventListener("click", () => {
        activeTab = typeName;
        activeGroupId = null;
        selectedLightIds = new Set();
        lightQuery = "";
        refreshUi();
        setStatus("");
      });

      tabsRoot.appendChild(button);
    });

    if (tabs.length <= 1) {
      const empty = document.createElement("p");
      empty.className = "rlb-tuning-hint rlb-tuning-hint--tabs";
      empty.textContent = "모델에서 RLB 조명 재질을 찾지 못했습니다.";
      tabsRoot.appendChild(empty);
    }
  };

  const createRangeField = (labelText, field, scopeObject, onChange) => {
    const label = document.createElement("label");
    label.className = "rlb-tuning-field";

    const header = document.createElement("span");
    const title = document.createElement("span");
    title.textContent = labelText;
    const valueEl = document.createElement("strong");
    valueEl.className = "rlb-tuning-value";
    valueEl.title = "클릭하여 숫자 입력";
    valueEl.textContent = formatValue(readNestedValue(scopeObject, field.key), field);
    header.append(title, valueEl);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(readNestedValue(scopeObject, field.key));

    const commitValue = (nextValue) => {
      writeNestedValue(scopeObject, field.key, nextValue);
      valueEl.textContent = formatValue(nextValue, field);
      input.value = String(nextValue);
      onChange();
    };

    input.addEventListener("input", () => {
      const parsed = parseFieldValue(field, input.value);

      if (parsed == null) {
        return;
      }

      commitValue(parsed);
    });

    valueEl.addEventListener("click", () => {
      const numInput = document.createElement("input");
      numInput.type = "number";
      numInput.className = "rlb-tuning-value-input";
      numInput.min = String(field.min);
      numInput.max = String(field.max);
      numInput.step = String(field.step);
      numInput.value = String(readNestedValue(scopeObject, field.key));
      valueEl.replaceWith(numInput);
      numInput.focus();
      numInput.select();

      const finish = (restoreOnly = false) => {
        if (!restoreOnly) {
          const parsed = parseFieldValue(field, numInput.value);

          if (parsed != null) {
            commitValue(parsed);
          }
        }

        if (numInput.isConnected) {
          numInput.replaceWith(valueEl);
        }
      };

      numInput.addEventListener("blur", () => finish(false));
      numInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          numInput.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          finish(true);
        }
      });
    });

    label.append(header, input);
    return label;
  };

  const renderBody = () => {
    bodyRoot.innerHTML = "";
    const { counts, materialNames, tabs } = readModelTypeInfo();
    ensureActiveTabVisible(tabs);

    if (activeTab === "Global") {
      syncSpillColorFromTemperature(tuningState.global);

      GLOBAL_FIELDS.forEach((field) => {
        bodyRoot.appendChild(createRangeField(field.label, field, tuningState.global, applyLive));
      });

      const color = tuningState.global.spillColor || kelvinToSpillRgb(tuningState.global.colorTemperatureK);
      const preview = document.createElement("p");
      preview.className = "rlb-tuning-color-preview";
      const swatch = document.createElement("span");
      swatch.className = "rlb-tuning-color-preview__swatch";
      swatch.style.background = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
      const previewText = document.createElement("span");
      previewText.innerHTML = `색온도 <strong>${Math.round(tuningState.global.colorTemperatureK)}K</strong>`
        + ` · RGB ${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;
      preview.append(swatch, previewText);
      bodyRoot.appendChild(preview);

      const totalFixtures = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const hint = document.createElement("p");
      hint.className = "rlb-tuning-hint";
      hint.textContent = totalFixtures > 0
        ? "Global: spill 혼합·기본 색온도. 왼쪽 목록을 스크롤해 조명 이름을 확인하고, 클릭하면 모델에서 해당 이름이 커집니다."
        : "모델에 RLB 조명 재질이 없습니다.";
      bodyRoot.appendChild(hint);
      return;
    }

    if (!(counts[activeTab] > 0)) {
      const missing = document.createElement("p");
      missing.className = "rlb-tuning-hint";
      missing.textContent = "현재 모델에 이 RLB 조명 종류가 없습니다.";
      bodyRoot.appendChild(missing);
      return;
    }

    const editingGroup = activeGroupId
      && tuningState.groups?.[activeGroupId]?.typeName === activeTab
      ? tuningState.groups[activeGroupId]
      : null;
    let profile;

    if (editingGroup) {
      editingGroup.profile = ensureTypeProfile(
        { types: { [activeTab]: editingGroup.profile || getDefaultTypeProfile(activeTab) } },
        activeTab
      );
      profile = editingGroup.profile;
    } else {
      profile = ensureTypeProfile(tuningState, activeTab);
    }
    const sampleMaterial = materialNames[activeTab];
    const header = document.createElement("p");
    header.className = "rlb-tuning-type-header";
    header.textContent = editingGroup
      ? `그룹 '${editingGroup.name}' · ${editingGroup.memberIds.length}개 동일 적용`
      : (sampleMaterial
        ? `${formatRlbTuningTabLabel(activeTab, counts[activeTab])} · 재질 예: ${sampleMaterial}`
        : formatRlbTuningTabLabel(activeTab, counts[activeTab]));
    bodyRoot.appendChild(header);

    if (editingGroup) {
      const groupBar = document.createElement("div");
      groupBar.className = "rlb-tuning-lights__toolbar";
      groupBar.style.gridColumn = "1 / -1";
      const renameButton = document.createElement("button");
      renameButton.type = "button";
      renameButton.textContent = "이름 변경";
      renameButton.addEventListener("click", () => {
        const nextName = window.prompt("그룹 이름", editingGroup.name);

        if (nextName == null || !String(nextName).trim()) {
          return;
        }

        editingGroup.name = String(nextName).trim();
        refreshUi();
        applyLive();
      });
      const copyTypeButton = document.createElement("button");
      copyTypeButton.type = "button";
      copyTypeButton.textContent = "종류 기본값 복사";
      copyTypeButton.addEventListener("click", () => {
        editingGroup.profile = {
          ...getDefaultTypeProfile(activeTab),
          ...ensureTypeProfile(tuningState, activeTab)
        };
        refreshUi();
        applyLive();
        setStatus(`'${editingGroup.name}'에 ${activeTab} 기본 설정을 복사했습니다.`);
      });
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "그룹 삭제";
      deleteButton.addEventListener("click", () => {
        ungroupLightIds(editingGroup.memberIds || []);
        refreshUi();
        applyLive();
        setStatus("그룹을 삭제하고 종류 기본 설정으로 되돌렸습니다.");
      });
      groupBar.append(renameButton, copyTypeButton, deleteButton);
      bodyRoot.appendChild(groupBar);
    }

    const toggleRow = document.createElement("label");
    toggleRow.className = "rlb-tuning-toggle";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = profile.shaderEnabled !== false;
    const toggleText = document.createElement("span");
    toggleText.textContent = "쉐이더 spill 사용";
    toggleRow.append(toggleInput, toggleText);
    toggleInput.addEventListener("change", () => {
      profile.shaderEnabled = toggleInput.checked;
      refreshUi();
      applyLive();
    });
    bodyRoot.appendChild(toggleRow);

    const controlsDisabled = profile.shaderEnabled === false;

    TYPE_FIELDS.forEach((field) => {
      const control = createRangeField(field.label, field, profile, applyLive);
      control.querySelector("input")?.toggleAttribute("disabled", controlsDisabled);
      control.classList.toggle("is-disabled", controlsDisabled);
      bodyRoot.appendChild(control);
    });

    const usesGlobalColor = profile.colorTemperatureK == null;
    const effectiveKelvin = resolveRlbTypeColorTemperatureK(profile, tuningState.global);
    const typeColor = resolveRlbTypeSpillColor(profile, tuningState.global);

    const colorTempLabel = document.createElement("label");
    colorTempLabel.className = "rlb-tuning-field";
    if (controlsDisabled) {
      colorTempLabel.classList.add("is-disabled");
    }

    const colorTempHeader = document.createElement("span");
    const colorTempTitle = document.createElement("span");
    colorTempTitle.textContent = usesGlobalColor
      ? `${COLOR_TEMP_FIELD.label} (Global ${Math.round(tuningState.global.colorTemperatureK)}K)`
      : COLOR_TEMP_FIELD.label;
    const colorTempValue = document.createElement("strong");
    colorTempValue.className = "rlb-tuning-value";
    colorTempValue.title = "클릭하여 숫자 입력";
    colorTempValue.textContent = formatValue(effectiveKelvin, COLOR_TEMP_FIELD);
    colorTempHeader.append(colorTempTitle, colorTempValue);

    const colorTempInput = document.createElement("input");
    colorTempInput.type = "range";
    colorTempInput.min = String(COLOR_TEMP_FIELD.min);
    colorTempInput.max = String(COLOR_TEMP_FIELD.max);
    colorTempInput.step = String(COLOR_TEMP_FIELD.step);
    colorTempInput.value = String(effectiveKelvin);
    colorTempInput.disabled = controlsDisabled;

    const commitColorTemp = (nextValue) => {
      profile.colorTemperatureK = nextValue;
      colorTempValue.textContent = formatValue(nextValue, COLOR_TEMP_FIELD);
      colorTempInput.value = String(nextValue);
      applyLive();
    };

    colorTempInput.addEventListener("input", () => {
      const parsed = parseFieldValue(COLOR_TEMP_FIELD, colorTempInput.value);

      if (parsed == null) {
        return;
      }

      commitColorTemp(parsed);
    });

    colorTempValue.addEventListener("click", () => {
      if (controlsDisabled) {
        return;
      }

      const numInput = document.createElement("input");
      numInput.type = "number";
      numInput.className = "rlb-tuning-value-input";
      numInput.min = String(COLOR_TEMP_FIELD.min);
      numInput.max = String(COLOR_TEMP_FIELD.max);
      numInput.step = String(COLOR_TEMP_FIELD.step);
      numInput.value = String(effectiveKelvin);
      colorTempValue.replaceWith(numInput);
      numInput.focus();
      numInput.select();

      const finish = (restoreOnly = false) => {
        if (!restoreOnly) {
          const parsed = parseFieldValue(COLOR_TEMP_FIELD, numInput.value);

          if (parsed != null) {
            commitColorTemp(parsed);
          }
        }

        if (numInput.isConnected) {
          numInput.replaceWith(colorTempValue);
        }
      };

      numInput.addEventListener("blur", () => finish(false));
      numInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          numInput.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          finish(true);
        }
      });
    });

    colorTempLabel.append(colorTempHeader, colorTempInput);
    bodyRoot.appendChild(colorTempLabel);

    const followGlobalButton = document.createElement("button");
    followGlobalButton.type = "button";
    followGlobalButton.className = "rlb-tuning-inline-button";
    followGlobalButton.textContent = usesGlobalColor
      ? "Global 색온도 사용 중"
      : "Global 색온도 따르기";
    followGlobalButton.disabled = controlsDisabled || usesGlobalColor;
    followGlobalButton.addEventListener("click", () => {
      profile.colorTemperatureK = null;
      refreshUi();
      applyLive();
    });
    bodyRoot.appendChild(followGlobalButton);

    const colorPreview = document.createElement("p");
    colorPreview.className = "rlb-tuning-color-preview";
    const typeSwatch = document.createElement("span");
    typeSwatch.className = "rlb-tuning-color-preview__swatch";
    typeSwatch.style.background = `rgb(${Math.round(typeColor.r * 255)}, ${Math.round(typeColor.g * 255)}, ${Math.round(typeColor.b * 255)})`;
    const typePreviewText = document.createElement("span");
    typePreviewText.innerHTML = `적용 색온도 <strong>${Math.round(effectiveKelvin)}K</strong>`
      + `${usesGlobalColor ? " · Global" : " · 이 조명 전용"}`
      + ` · RGB ${Math.round(typeColor.r * 255)}, ${Math.round(typeColor.g * 255)}, ${Math.round(typeColor.b * 255)}`;
    colorPreview.append(typeSwatch, typePreviewText);
    bodyRoot.appendChild(colorPreview);

    const shapeLabel = document.createElement("label");
    shapeLabel.className = "rlb-tuning-field rlb-tuning-field--shape";
    if (controlsDisabled) {
      shapeLabel.classList.add("is-disabled");
    }

    const shapeHeader = document.createElement("span");
    shapeHeader.textContent = "Spill 형태";
    shapeLabel.appendChild(shapeHeader);

    const shapeSelect = document.createElement("select");
    SHAPE_OPTIONS.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = profile.shape === value;
      shapeSelect.appendChild(option);
    });

    shapeSelect.addEventListener("change", () => {
      profile.shape = shapeSelect.value;
      applyLive();
    });
    shapeSelect.disabled = controlsDisabled;

    shapeLabel.appendChild(shapeSelect);
    bodyRoot.appendChild(shapeLabel);

    const hint = document.createElement("p");
    hint.className = "rlb-tuning-hint";
    hint.textContent = controlsDisabled
      ? (editingGroup
        ? "이 그룹 spill이 꺼져 있습니다. fixture emissive만 유지됩니다."
        : "이 조명 종류의 spill 쉐이더가 꺼져 있습니다. fixture emissive만 유지됩니다.")
      : (editingGroup
        ? "이 그룹에 속한 조명은 모두 같은 반경·배율·색온도·외곽 설정을 씁니다."
        : "미분류 조명: 종류 기본값. 왼쪽에서 선택 후 그룹 만들기로 같은 종류도 따로 맞출 수 있습니다.");
    bodyRoot.appendChild(hint);
  };

  const openPanel = () => {
    const glow = getGlow();

    if (glow?.getTuningState?.()) {
      tuningState = ensureRlbGroupState(glow.getTuningState());
    } else {
      tuningState = ensureRlbGroupState(loadRlbTuningState());
      glow?.applyTuning?.(tuningState);
    }

    const remapped = remapRlbGroupMemberIds(tuningState, allCatalog());

    if (remapped > 0) {
      saveRlbTuningState(tuningState);
      glow?.applyTuning?.(tuningState);
      setStatus(`저장된 그룹 구성원 ${remapped}개를 현재 조명에 다시 연결했습니다.`);
    }

    panelOpen = true;
    refreshUi({ restoreScroll: false });
    panel.hidden = false;
    getGlow()?.setPreviewActive?.(true);
    getGlow()?.setNameLabelsVisible?.(true);
    applyLive();
  };

  const closePanel = () => {
    panelOpen = false;
    panel.hidden = true;
    focusedLightId = null;
    getGlow()?.setHoveredLight?.(null);
    getGlow()?.setFocusedLight?.(null);
    getGlow()?.setNameLabelsVisible?.(false);
    getGlow()?.setPreviewActive?.(false);
  };

  const syncVisibility = () => {
    const available = options.isAvailable?.() !== false;

    toggleButton.hidden = !available;

    if (!available) {
      closePanel();
      return;
    }

    if (panelOpen) {
      refreshUi();
    }
  };

  toggleButton.addEventListener("click", () => {
    if (panel.hidden) {
      openPanel();
      return;
    }

    closePanel();
  });

  closeButton?.addEventListener("click", closePanel);

  saveButton?.addEventListener("click", () => {
    const saved = saveRlbTuningState(tuningState);

    if (saved) {
      dirty = false;
      setStatus("저장되었습니다. (브라우저 localStorage)");
      getGlow()?.applyTuning?.(tuningState);
      return;
    }

    setStatus("저장에 실패했습니다.", true);
  });

  resetButton?.addEventListener("click", () => {
    tuningState = resetRlbTuningState();
    activeGroupId = null;
    selectedLightIds = new Set();
    focusedLightId = null;
    dirty = false;
    getGlow()?.applyTuning?.(tuningState);
    options.requestRender?.();
    refreshUi();
    setStatus("기본값으로 초기화했습니다.");
  });

  syncVisibility();

  return {
    syncVisibility,
    openPanel,
    closePanel,
    isDirty: () => dirty,
    getState: () => cloneTuningState(tuningState),
    applyDefaults: () => {
      tuningState = ensureRlbGroupState(createDefaultRlbTuningState());
      refreshUi();
      applyLive();
    },
    dispose() {
      closePanel();
    }
  };
}
