/**
 * Rabbit Metaverse Editor — in-scene placement (PHASE 3–5).
 * PHASE 5: save pipeline polish + Play Test.
 */

import {
  applyNpcRecordToGuest,
  applyNpcSceneToGuests,
  buildEditorSpawnFromTemplate,
  cloneJson,
  collectNpcModelCatalog,
  degreesToRadians,
  radiansToDegrees,
  editorAnimationToSpawn,
  getActiveNpcRecords,
  guestToNpcRecord,
  isEditorCreatedNpcId,
  loadEffectiveNpcScene,
  nextEditorNpcId,
  normalizeOffset3,
  normalizeNpcAnimation,
  normalizeNpcMovement,
  normalizeNpcSceneDocument,
  resolveNpcOffset,
  resolveNpcYOffset,
  resolveRecordAnimation,
  resolveRecordMovement,
  spawnAnimationToEditor,
  writeNpcSceneStorage,
  clearNpcSceneStorage
} from "./npc-scene-editor-data.js?v=preserve-active-patrol-20260907";
import { createEditorHistory } from "./npc-scene-editor-history.js?v=tour-undo-focus-20260905";
import { createNpcDialogCameraPreview } from "./npc-dialog-camera-preview.js?v=select-dropdown-fix-20260906";
import {
  createNpcSceneEditorUi,
  isNpcEditorScenePointerBlocked
} from "./npc-scene-editor-ui.js?v=patrol-random-clip-fix-20260907";
import {
  EDITOR_LAYERS,
  EVENT_TYPES,
  loadEffectiveEventDocument,
  loadEffectiveTeleportDocument,
  loadEffectiveTourDocument,
  nextPrefixedId,
  normalizeEventDocument,
  normalizeEventRecord,
  normalizeTeleportDocument,
  normalizeTeleportRecord,
  normalizeTourDocument,
  normalizeTourRecord,
  offsetTransform,
  applyGuideDataToEditorTours,
  tourPointsFromGuideEvents,
  writeEventStorage,
  writeTeleportStorage,
  writeTourStorage
} from "./scene-marker-data.js?v=tour-undo-focus-20260905";
import { createSceneMarkerRuntime } from "./scene-marker-runtime.js?v=tour-facing-arrow-20260903";
import {
  buildEditorProjectBundle,
  downloadJsonFile,
  exportEditorProjectBundleJson,
  isEditorProjectBundle,
  summarizeProjectBundle,
  validateEditorProjectBundle,
  writeProjectImportBackup
} from "./editor-project-bundle.js?v=editor-phase5-20260903";
import {
  applyEditorBundleToProject,
  isEditorWriteServerAvailable
} from "./editor-project-apply.js?v=editor-project-apply-20260903";

const AUTO_SAVE_MS = 1200;
const NPC_OVERLAP_PADDING = 0.12;
const NPC_WARN_DISTANCE = 1.1;

function findGuestRootFromNode(guests, node) {
  if (!node) {
    return null;
  }

  let current = node;

  while (current) {
    const match = guests.find((guest) => guest.root === current);

    if (match) {
      return match;
    }

    const metaId = current.metadata?.guestId;

    if (metaId) {
      const byMeta = guests.find((guest) => guest.spawn?.id === metaId);

      if (byMeta) {
        return byMeta;
      }
    }

    current = current.parent;
  }

  return null;
}

function aabbOverlap(aMin, aMax, bMin, bMax, padding = 0) {
  return aMin.x <= bMax.x + padding
    && aMax.x >= bMin.x - padding
    && aMin.y <= bMax.y + padding
    && aMax.y >= bMin.y - padding
    && aMin.z <= bMax.z + padding
    && aMax.z >= bMin.z - padding;
}

function planarDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function isTypingTarget(target) {
  const tag = String(target?.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
}

export function createNpcSceneEditor(BABYLON, scene, options = {}) {
  const {
    getGuestCharacterSystem = () => null,
    getOrbitCamera = () => null,
    getDialogPreviewFov = null,
    enterOrbitMode = null,
    enterWalkMode = null,
    ensureGuestsReady = null,
    snapPositionToGround = null,
    isGroundMesh = () => false,
    getBuiltinSpawnById = () => null,
    getBuiltinSpawns = () => [],
    getNpcDisplayName = () => null,
    getNpcDialogue = () => null,
    onNpcDialogueChange = null,
    getGuideTourEvents = () => [],
    getGuideTourData = () => null,
    publishGuideTourData = null,
    applyTourOverlay = null,
    onPlacementChanged = null,
    onStatus = null,
    onActiveChange = null,
    onRequestClose = null,
    getIsNightMode = () => false
  } = options;

  let active = false;
  let restoring = false;
  let gizmoManager = null;
  let highlightLayer = null;
  let selectedGuestId = null;
  let selectedKind = EDITOR_LAYERS.NPC;
  let editorLayer = EDITOR_LAYERS.NPC;
  let sceneDocument = normalizeNpcSceneDocument({ npcs: [] });
  let eventDocument = normalizeEventDocument({ events: [] });
  let teleportDocument = normalizeTeleportDocument({ teleports: [] });
  let tourDocument = normalizeTourDocument({ tours: [] });
  let pointerObserver = null;
  let autoSaveTimer = null;
  const extraSpawnTemplates = new Map();
  const history = createEditorHistory();
  const markerRuntime = createSceneMarkerRuntime(BABYLON, scene);
  const dialogCameraPreview = createNpcDialogCameraPreview(BABYLON, scene, {
    eyeHeight: 1.7,
    getGuestById: (id) => getGuestById(id),
    getPreviewFov: () => {
      if (typeof getDialogPreviewFov === "function") {
        return getDialogPreviewFov();
      }
      return null;
    }
  });
  let tourDirty = false;
  let needsJsonExport = false;
  let beforeUnloadBound = false;

  const ui = createNpcSceneEditorUi({
    onSelectNpc: (id) => focusInCurrentLayer(id),
    onFocusNpc: (id) => focusInCurrentLayer(id),
    onTransformChange: (payload) => applyInspectorTransform(payload),
    onRotateSnap: (id, delta, absolute = false) => rotateSelectedById(id, delta, absolute),
    onSave: () => saveToStorage(),
    onApplyProject: () => void applyToProject(),
    onPlayTest: () => void playTest(),
    onExport: () => exportJson(),
    onImport: (raw) => importJson(raw),
    onClose: () => {
      if (typeof onRequestClose === "function") {
        onRequestClose();
        return;
      }

      deactivate();
    },
    onAddNpc: (value) => void addCurrentLayerObject(value),
    onDuplicateNpc: (id) => void duplicateCurrent(id),
    onDeleteNpc: (id) => void deleteCurrent(id),
    onUndo: () => void undo(),
    onRedo: () => void redo(),
    onLayerChange: (layer) => setEditorLayer(layer),
    onMarkerFieldsChange: (id, patch) => updateMarkerFields(id, patch),
    onNpcFieldsChange: (id, patch) => updateNpcFields(id, patch),
    onNpcModelChange: (id, file) => void changeNpcModel(id, file),
    onNpcDialogueChange: (id, patch, meta = {}) => {
      onNpcDialogueChange?.(id, patch);

      if (meta.refreshUi !== false) {
        refreshUi();
      }

      setStatus(`${id} 대화 설정 업데이트`);
    },
    onDialogCameraPreview: (root, guestId, settings) => {
      if (guestId) {
        dialogCameraPreview.attach(root, guestId, settings || {});
        return;
      }

      dialogCameraPreview.updateFromRoot(root);
    },
    onOffsetEditModeChange: (mode) => setOffsetEditMode(mode),
    onSaveOffsetEdits: (scope) => saveOffsetEdits(scope),
    onResetOffsetEdits: (scope) => resetOffsetEdits(scope),
    onClipFineTuneChange: (active) => setClipFineTuneActive(active),
    onClipFineTuneClipChange: (clip) => previewClipFineTuneAnimation(clip),
    onSelectPatrolWaypoint: (index) => selectPatrolWaypoint(index),
    onAddPatrolWaypoint: (id) => addPatrolWaypoint(id),
    onRemovePatrolWaypoint: (id, index) => removePatrolWaypoint(id, index),
    onInspectorInteractionIdle: () => flushDeferredRefreshUi()
  });

  let offsetEditMode = null;
  let offsetDirty = false;
  let offsetCommitSnapshot = null;
  let clipFineTuneActive = false;
  let clipFineTuneClip = null;
  let clipFineTuneBase = null;
  let clipFineTuneSnapshot = null;
  let selectedWaypointIndex = null;
  let refreshUiDeferred = false;
  let patrolWaypointRoots = [];
  let offsetDragBase = null;
  let xzDragBehavior = null;
  let xzDragLockedY = null;
  let xzDragProxy = null;
  let xzDragRing = null;
  let xzFacingRoot = null;
  let xzDragTarget = null;
  let xzFollowObserver = null;
  let skipWaypointVisualRebuild = false;
  let skipMarkerPositionSync = false;

  function setStatus(message) {
    ui.setStatus(message || "");
    onStatus?.(message || null);
  }

  function markNeedsJsonExport() {
    needsJsonExport = true;
    ui.setDirty?.(true);
  }

  function clearNeedsJsonExport() {
    needsJsonExport = false;
    ui.setDirty?.(false);
  }

  function handleBeforeUnload(event) {
    if (!active || !needsJsonExport) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  }

  function bindBeforeUnload() {
    if (beforeUnloadBound) {
      return;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    beforeUnloadBound = true;
  }

  function unbindBeforeUnload() {
    if (!beforeUnloadBound) {
      return;
    }

    window.removeEventListener("beforeunload", handleBeforeUnload);
    beforeUnloadBound = false;
  }

  function getGuests() {
    return getGuestCharacterSystem()?.getGuests?.() || [];
  }

  function getBuiltinSpawn(id) {
    return getBuiltinSpawnById?.(id) || null;
  }

  function applySceneToGuests(options = {}) {
    const nightMode = getIsNightMode?.() === true;
    applyNpcSceneToGuests(getGuests(), sceneDocument, {
      getBuiltinSpawnById: getBuiltinSpawn,
      allowClearMovement: true,
      // Night Devis must keep Idle + chase; only snap to editor/day pose.
      transformOnly: nightMode
    });
    // Re-pin every guest at the snapped 등장위치 after cast/anim may have moved them.
    getGuests().forEach((guest) => relockGuestHomeFromRoot(guest));

    if (options.refresh === false || nightMode) {
      return;
    }

    const gcs = getGuestCharacterSystem();
    gcs?.refreshPatrolGuests?.({ force: false });
    gcs?.refreshGuestAnimations?.({ force: false });
  }

  function getGuestById(guestId) {
    return getGuests().find((guest) => guest.spawn?.id === guestId) || null;
  }

  function getRecordById(guestId) {
    return sceneDocument.npcs.find((npc) => npc.id === guestId) || null;
  }

  function getMarkerCollection(kind) {
    if (kind === EDITOR_LAYERS.EVENT) {
      return eventDocument.events;
    }

    if (kind === EDITOR_LAYERS.TELEPORT) {
      return teleportDocument.teleports;
    }

    if (kind === EDITOR_LAYERS.TOUR) {
      return tourDocument.tours;
    }

    return [];
  }

  function getMarkerRecord(id, kind = editorLayer) {
    return getMarkerCollection(kind).find((item) => item.id === id) || null;
  }

  function getSelectedRoot() {
    if (selectedKind !== EDITOR_LAYERS.NPC) {
      return markerRuntime.getEntry(selectedGuestId)?.root || null;
    }

    return getGuestById(selectedGuestId)?.root || null;
  }

  function allMarkerRecords() {
    return [
      ...eventDocument.events,
      ...teleportDocument.teleports,
      ...tourDocument.tours
    ];
  }

  function syncMarkers() {
    if (skipMarkerPositionSync) {
      markerRuntime.setVisible(active);
      return;
    }

    markerRuntime.sync(allMarkerRecords());
    markerRuntime.setVisible(active);
  }

  function persistAll() {
    writeNpcSceneStorage(sceneDocument);
    writeEventStorage(eventDocument);
    writeTeleportStorage(teleportDocument);

    if (tourDirty) {
      writeTourStorage(tourDocument);
    }

    onPlacementChanged?.();
    markNeedsJsonExport();
  }

  function persistToursToRuntime() {
    tourDirty = true;
    const synced = applyTourOverlay?.(tourDocument);

    if (synced?.tours) {
      tourDocument = normalizeTourDocument(synced);
    }

    writeTourStorage(tourDocument);
    markNeedsJsonExport();
  }

  function syncToursFromGuideData(guideTourData) {
    if (!guideTourData) {
      return false;
    }

    const applied = applyGuideDataToEditorTours(guideTourData, tourDocument);
    tourDocument = normalizeTourDocument(applied.toursDoc);
    tourDirty = true;
    writeTourStorage(tourDocument);
    syncMarkers();
    markNeedsJsonExport();

    if (
      selectedKind === EDITOR_LAYERS.TOUR
      && selectedGuestId
      && !getMarkerRecord(selectedGuestId, EDITOR_LAYERS.TOUR)
    ) {
      selectedGuestId = null;
      gizmoManager?.attachToMesh(null);
      highlightLayer?.removeAllMeshes?.();
    }

    refreshUi();
    return true;
  }

  function captureState() {
    getGuests().forEach((guest) => {
      if (isEditorCreatedNpcId(guest.spawn?.id) && guest.spawn) {
        extraSpawnTemplates.set(guest.spawn.id, cloneJson({
          ...guest.spawn,
          position: {
            x: guest.root?.position?.x ?? guest.spawn.position?.x,
            y: guest.root?.position?.y ?? guest.spawn.position?.y,
            z: guest.root?.position?.z ?? guest.spawn.position?.z
          },
          rotationY: guest.root?.rotation?.y ?? guest.spawn.rotationY
        }));
      }
    });

    return {
      selectedGuestId,
      selectedKind,
      editorLayer,
      document: cloneJson(sceneDocument),
      eventDocument: cloneJson(eventDocument),
      teleportDocument: cloneJson(teleportDocument),
      tourDocument: cloneJson(tourDocument),
      guideTourData: cloneJson(getGuideTourData?.() || null),
      extraSpawns: [...extraSpawnTemplates.values()]
    };
  }

  function pushHistory() {
    if (restoring) {
      return;
    }

    history.push(captureState());
    refreshUi();
  }

  function scheduleAutoSave() {
    if (restoring) {
      return;
    }

    window.clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(() => {
      persistAll();
      setStatus("자동 저장됨 (localStorage)");
    }, AUTO_SAVE_MS);
  }

  function getModelCatalog() {
    return collectNpcModelCatalog(
      getGuests(),
      [...extraSpawnTemplates.values(), ...(getBuiltinSpawns() || [])]
    );
  }

  function getAnimationClipsForNpc(id) {
    const guest = getGuestById(id);
    const names = (guest?.animationGroups || [])
      .map((group) => String(group.name || "").trim())
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  function findTemplateByFile(file) {
    return getModelCatalog().find((model) => model.file === file)?.spawn || null;
  }

  function getGuestBounds(guest) {
    if (typeof guest?.root?.getHierarchyBoundingVectors === "function") {
      return guest.root.getHierarchyBoundingVectors(true);
    }

    const meshes = (guest?.meshes || []).filter((mesh) => mesh?.getBoundingInfo);
    const first = meshes[0]?.getBoundingInfo?.()?.boundingBox;

    if (!first) {
      return null;
    }

    let min = first.minimumWorld.clone();
    let max = first.maximumWorld.clone();

    meshes.forEach((mesh) => {
      const box = mesh.getBoundingInfo().boundingBox;
      min = BABYLON.Vector3.Minimize(min, box.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, box.maximumWorld);
    });

    return { min, max };
  }

  function evaluateGuestCollision(guest) {
    if (!guest?.root) {
      return { level: "ok", message: "배치 가능" };
    }

    const probe = guest.root.position.clone();
    const grounded = typeof snapPositionToGround === "function"
      ? Boolean(snapPositionToGround(probe, probe.y))
      : true;

    if (!grounded) {
      return { level: "error", message: "바닥 없음" };
    }

    let overlapId = null;
    let nearbyId = null;
    const bounds = getGuestBounds(guest);

    getGuests().forEach((other) => {
      if (!other?.root || other.spawn?.id === guest.spawn?.id) {
        return;
      }

      const distance = planarDistance(guest.root.position, other.root.position);

      if (distance < NPC_WARN_DISTANCE && !nearbyId) {
        nearbyId = other.spawn.id;
      }

      const otherBounds = getGuestBounds(other);

      if (!bounds || !otherBounds) {
        if (distance < 0.55) {
          overlapId = other.spawn.id;
        }

        return;
      }

      if (aabbOverlap(bounds.min, bounds.max, otherBounds.min, otherBounds.max, NPC_OVERLAP_PADDING)) {
        overlapId = other.spawn.id;
      }
    });

    if (overlapId) {
      return { level: "error", message: `${overlapId}와 겹침` };
    }

    if (nearbyId) {
      return { level: "warn", message: `${nearbyId}와 가까움` };
    }

    return { level: "ok", message: "Walkable / 정상" };
  }

  function getCollisionById() {
    const map = {};

    getActiveNpcRecords(sceneDocument).forEach((npc) => {
      const guest = getGuestById(npc.id);
      map[npc.id] = guest
        ? evaluateGuestCollision(guest)
        : { level: "warn", message: "씬에 없음" };
    });

    return map;
  }

  function resolveNpcListName(npc) {
    const fromManager = getNpcDisplayName?.(npc?.id);
    if (fromManager) {
      return String(fromManager);
    }

    return npc?.name || npc?.id || "";
  }

  function getConnectionTargets(connectionType) {
    if (connectionType === "teleport") {
      return (teleportDocument.teleports || []).map((item) => ({
        id: item.id,
        name: item.name || item.id
      }));
    }

    if (connectionType === "tour") {
      return (tourDocument.tours || []).map((item) => ({
        id: item.id,
        name: item.name || item.id
      }));
    }

    if (connectionType === "event") {
      return (eventDocument.events || [])
        .filter((item) => item.id !== selectedGuestId)
        .map((item) => ({
          id: item.id,
          name: item.name || item.id
        }));
    }

    if (connectionType === "npc") {
      return getActiveNpcRecords(sceneDocument).map((item) => ({
        id: item.id,
        name: resolveNpcListName(item)
      }));
    }

    return [];
  }

  function flushDeferredRefreshUi() {
    if (!refreshUiDeferred) {
      return;
    }

    refreshUiDeferred = false;
    refreshUi({ force: true });
  }

  function refreshUi(options = {}) {
    // Avoid rebuilding SELECTED OBJECT while a native <select> menu is open or
    // while typing in a text/number field — that destroys the control mid-edit.
    if (!options.force && ui.isEditingForm?.()) {
      refreshUiDeferred = true;
      syncMarkers();
      return;
    }

    refreshUiDeferred = false;

    syncMarkers();
    const collisionById = editorLayer === EDITOR_LAYERS.NPC ? getCollisionById() : {};
    let items = [];
    let selectedRecord = null;

    if (editorLayer === EDITOR_LAYERS.NPC) {
      items = getActiveNpcRecords(sceneDocument).map((npc) => ({
        id: npc.id,
        name: resolveNpcListName(npc),
        type: npc.type
      }));
      selectedRecord = selectedKind === EDITOR_LAYERS.NPC ? getRecordById(selectedGuestId) : null;
    } else {
      items = getMarkerCollection(editorLayer).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        eventType: item.eventType
      }));
      selectedRecord = selectedKind === editorLayer ? getMarkerRecord(selectedGuestId, editorLayer) : null;
    }

    ui.renderList(items, selectedKind === editorLayer ? selectedGuestId : null, {
      models: getModelCatalog(),
      addOptions: editorLayer === EDITOR_LAYERS.NPC
        ? getModelCatalog()
        : editorLayer === EDITOR_LAYERS.EVENT
          ? EVENT_TYPES.map((type) => ({ id: type.id, name: type.label }))
          : [{ id: editorLayer, name: editorLayer }],
      history: {
        canUndo: history.canUndo(),
        canRedo: history.canRedo()
      },
      collisionById,
      layer: editorLayer,
      needsExport: needsJsonExport
    });
    ui.setDirty?.(needsJsonExport);
    if (selectedRecord && selectedKind === EDITOR_LAYERS.NPC
      && selectedRecord.type !== "event"
      && selectedRecord.type !== "teleport"
      && selectedRecord.type !== "tour") {
      syncOffsetCommitSnapshot(selectedRecord);
    }
    ui.renderInspector(selectedRecord, selectedRecord ? collisionById[selectedRecord.id] : null, {
      models: getModelCatalog(),
      animationClips: selectedRecord?.id ? getAnimationClipsForNpc(selectedRecord.id) : [],
      displayName: selectedRecord?.id ? resolveNpcListName(selectedRecord) : "",
      offsetEditMode,
      offsetDirty,
      offsetDefaultDirty: selectedRecord ? isOffsetScopeDirty(selectedRecord, "default") : false,
      offsetClipDirty: selectedRecord ? isOffsetScopeDirty(selectedRecord, "clip") : false,
      clipFineTuneActive,
      clipFineTuneClip,
      selectedWaypointIndex,
      connectionTargets: selectedRecord?.type === "event"
        ? getConnectionTargets(selectedRecord.connection?.type || "none")
        : [],
      teleportTargets: (teleportDocument.teleports || [])
        .filter((item) => item.id !== selectedRecord?.id)
        .map((item) => ({ id: item.id, name: item.name || item.id })),
      npcDialogue: selectedRecord?.id && selectedRecord?.type !== "event"
        && selectedRecord?.type !== "teleport"
        && selectedRecord?.type !== "tour"
        ? (getNpcDialogue?.(selectedRecord.id) || {
          interactionEnabled: false,
          dialogLines: []
        })
        : null
    });
    if (editorLayer === EDITOR_LAYERS.NPC) {
      if (!skipWaypointVisualRebuild) {
        syncPatrolWaypointVisuals();
      }
    } else {
      clearPatrolWaypointVisuals();
    }
  }

  function detachXzPlaneDrag() {
    if (xzFollowObserver) {
      scene.onBeforeRenderObservable.remove(xzFollowObserver);
      xzFollowObserver = null;
    }

    if (xzDragBehavior) {
      try {
        xzDragBehavior.attachedNode?.removeBehavior?.(xzDragBehavior);
        xzDragBehavior.releaseDrag?.();
        xzDragBehavior.detach?.();
      } catch {
        // ignore
      }
      xzDragBehavior = null;
    }

    if (xzDragProxy) {
      try {
        xzDragProxy.dispose?.();
      } catch {
        // ignore
      }
      xzDragProxy = null;
    }

    if (xzDragRing) {
      try {
        xzDragRing.dispose?.();
      } catch {
        // ignore
      }
      xzDragRing = null;
    }

    if (xzFacingRoot) {
      try {
        xzFacingRoot.dispose?.(false, true);
      } catch {
        // ignore
      }
      xzFacingRoot = null;
    }

    xzDragTarget = null;
    xzDragLockedY = null;
  }

  function getTargetYawRadians(mesh) {
    if (!mesh) {
      return 0;
    }

    if (mesh.rotationQuaternion) {
      return mesh.rotationQuaternion.toEulerAngles().y;
    }

    return Number(mesh.rotation?.y) || 0;
  }

  function syncXzIndicatorToTarget() {
    if (!xzDragTarget || (!xzDragProxy && !xzDragRing && !xzFacingRoot)) {
      return;
    }

    const pos = xzDragTarget.getAbsolutePosition?.() || xzDragTarget.position;
    const y = pos.y + 0.06;
    const yaw = getTargetYawRadians(xzDragTarget);

    if (xzDragProxy) {
      xzDragProxy.position.set(pos.x, y, pos.z);
    }

    if (xzDragRing) {
      xzDragRing.position.set(pos.x, y + 0.01, pos.z);
    }

    if (xzFacingRoot) {
      xzFacingRoot.position.set(pos.x, y + 0.025, pos.z);
      xzFacingRoot.rotation.y = yaw;
    }
  }

  function createFacingArrow(utilScene, discRadius) {
    const root = new BABYLON.TransformNode("npc-editor-facing-root", utilScene);
    const shaftLength = discRadius * 0.55;
    const headLength = discRadius * 0.28;

    const shaft = BABYLON.MeshBuilder.CreateBox(
      "npc-editor-facing-shaft",
      {
        width: discRadius * 0.1,
        height: 0.03,
        depth: shaftLength
      },
      utilScene
    );
    shaft.position.z = shaftLength * 0.35;
    shaft.isPickable = false;
    shaft.parent = root;

    const head = BABYLON.MeshBuilder.CreateCylinder(
      "npc-editor-facing-head",
      {
        diameterTop: 0,
        diameterBottom: discRadius * 0.34,
        height: headLength,
        tessellation: 3
      },
      utilScene
    );
    // Point cone along +Z (Babylon character forward).
    head.rotation.x = Math.PI / 2;
    head.position.z = shaftLength * 0.35 + shaftLength * 0.55;
    head.isPickable = false;
    head.parent = root;

    const mat = new BABYLON.StandardMaterial("npc-editor-facing-mat", utilScene);
    mat.emissiveColor = BABYLON.Color3.FromHexString("#ff6b35");
    mat.diffuseColor = BABYLON.Color3.FromHexString("#ff6b35");
    mat.alpha = 0.95;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    shaft.material = mat;
    head.material = mat;

    return root;
  }

  function attachXzPlaneDrag(mesh) {
    detachXzPlaneDrag();

    if (!mesh || !BABYLON.PointerDragBehavior) {
      return;
    }

    ensureEditorRuntime();
    xzDragTarget = mesh;

    // Utility layer: picks stay above character meshes (same layer as gizmos).
    const utilLayer = gizmoManager?.utilityLayer
      || new BABYLON.UtilityLayerRenderer(scene);
    const utilScene = utilLayer.utilityLayerScene;
    const discRadius = offsetEditMode ? 1.05 : 0.9;
    const ringRadius = discRadius + 0.18;

    xzDragProxy = BABYLON.MeshBuilder.CreateDisc(
      "npc-editor-xz-drag-proxy",
      { radius: discRadius, tessellation: 48 },
      utilScene
    );
    xzDragProxy.rotation.x = Math.PI / 2;
    xzDragProxy.isPickable = true;
    xzDragProxy.metadata = { npcEditorXzDrag: true };

    const proxyMat = new BABYLON.StandardMaterial("npc-editor-xz-drag-proxy-mat", utilScene);
    proxyMat.emissiveColor = BABYLON.Color3.FromHexString(offsetEditMode ? "#3d9eed" : "#2e86ab");
    proxyMat.alpha = offsetEditMode ? 0.45 : 0.32;
    proxyMat.disableLighting = true;
    proxyMat.backFaceCulling = false;
    xzDragProxy.material = proxyMat;

    // Visual guide ring: rotate with the Y rotation gizmo circle.
    xzDragRing = BABYLON.MeshBuilder.CreateTorus(
      "npc-editor-xz-drag-ring",
      {
        diameter: ringRadius * 2,
        thickness: 0.045,
        tessellation: 64
      },
      utilScene
    );
    xzDragRing.rotation.x = Math.PI / 2;
    xzDragRing.isPickable = false;
    const ringMat = new BABYLON.StandardMaterial("npc-editor-xz-drag-ring-mat", utilScene);
    ringMat.emissiveColor = BABYLON.Color3.FromHexString("#f4d35e");
    ringMat.alpha = 0.9;
    ringMat.disableLighting = true;
    xzDragRing.material = ringMat;

    xzFacingRoot = createFacingArrow(utilScene, discRadius);

    syncXzIndicatorToTarget();
    xzFollowObserver = scene.onBeforeRenderObservable.add(() => {
      syncXzIndicatorToTarget();
    });

    xzDragBehavior = new BABYLON.PointerDragBehavior({
      dragPlaneNormal: new BABYLON.Vector3(0, 1, 0)
    });
    xzDragBehavior.useObjectOrientationForDragging = false;
    xzDragBehavior.updateDragPlane = true;
    xzDragBehavior.moveAttached = false;

    const targetMesh = mesh;

    xzDragBehavior.onDragStartObservable.add(() => {
      pushHistory();
      xzDragLockedY = targetMesh.position.y;
      skipWaypointVisualRebuild = true;
      skipMarkerPositionSync = selectedKind !== EDITOR_LAYERS.NPC;

      if (offsetEditMode) {
        const guest = getGuestById(selectedGuestId);
        if (guest) {
          beginOffsetEditDrag(guest);
        }
      }
    });

    xzDragBehavior.onDragObservable.add((event) => {
      if (!event?.dragPlanePoint) {
        return;
      }

      targetMesh.position.x = event.dragPlanePoint.x;
      targetMesh.position.z = event.dragPlanePoint.z;

      if (Number.isFinite(xzDragLockedY)) {
        targetMesh.position.y = xzDragLockedY;
      }

      syncXzIndicatorToTarget();
    });

    xzDragBehavior.onDragEndObservable.add(() => {
      skipWaypointVisualRebuild = false;
      skipMarkerPositionSync = false;
      // Waypoints always floor-snap after XZ move; guest roots snap unless offset-editing.
      onTransformFinished(selectedWaypointIndex != null || !offsetEditMode);
    });

    xzDragProxy.addBehavior(xzDragBehavior);
  }

  function configurePlanarPositionGizmo() {
    const positionGizmo = gizmoManager?.gizmos?.positionGizmo;
    const rotationGizmo = gizmoManager?.gizmos?.rotationGizmo;

    if (positionGizmo) {
      // Free XZ via disc; keep Y axis gizmo only.
      if (positionGizmo.xGizmo) {
        positionGizmo.xGizmo.isEnabled = false;
      }

      if (positionGizmo.zGizmo) {
        positionGizmo.zGizmo.isEnabled = false;
      }

      if (positionGizmo.yGizmo) {
        positionGizmo.yGizmo.isEnabled = true;
      }

      if ("planarGizmoEnabled" in positionGizmo) {
        positionGizmo.planarGizmoEnabled = false;
      }
    }

    if (rotationGizmo) {
      // Circular ring = yaw only.
      if (rotationGizmo.xGizmo) {
        rotationGizmo.xGizmo.isEnabled = false;
      }

      if (rotationGizmo.zGizmo) {
        rotationGizmo.zGizmo.isEnabled = false;
      }

      if (rotationGizmo.yGizmo) {
        rotationGizmo.yGizmo.isEnabled = true;
      }
    }
  }

  function attachEditorTransformTarget(mesh) {
    ensureEditorRuntime();

    if (!mesh) {
      gizmoManager?.attachToMesh(null);
      detachXzPlaneDrag();
      return;
    }

    configurePlanarPositionGizmo();
    gizmoManager.attachToMesh(mesh);
    attachXzPlaneDrag(mesh);
  }

  function ensureEditorRuntime() {
    if (!gizmoManager) {
      gizmoManager = new BABYLON.GizmoManager(scene);
      gizmoManager.usePointerToAttachGizmos = false;
      gizmoManager.positionGizmoEnabled = true;
      gizmoManager.rotationGizmoEnabled = true;
      gizmoManager.scaleGizmoEnabled = false;

      const rotationGizmo = gizmoManager.gizmos?.rotationGizmo;

      if (rotationGizmo?.xGizmo) {
        rotationGizmo.xGizmo.isEnabled = false;
      }

      if (rotationGizmo?.zGizmo) {
        rotationGizmo.zGizmo.isEnabled = false;
      }

      configurePlanarPositionGizmo();

      gizmoManager.onAttachedToMeshObservable.add(() => {
        bindGizmoDragHandlers();
      });
    }

    if (!highlightLayer) {
      highlightLayer = new BABYLON.HighlightLayer("npc-scene-editor-highlight", scene, {
        mainTextureRatio: 0.5
      });
    }
  }

  function bindGizmoDragHandlers() {
    const positionGizmo = gizmoManager?.gizmos?.positionGizmo;
    const rotationGizmo = gizmoManager?.gizmos?.rotationGizmo;

    positionGizmo?.onDragStartObservable?.clear?.();
    positionGizmo?.onDragEndObservable?.clear?.();
    rotationGizmo?.onDragStartObservable?.clear?.();
    rotationGizmo?.onDragEndObservable?.clear?.();

    positionGizmo?.onDragStartObservable?.add?.(() => {
      pushHistory();
      skipWaypointVisualRebuild = true;
      skipMarkerPositionSync = selectedKind !== EDITOR_LAYERS.NPC;
      const guest = getGuestById(selectedGuestId);
      if (offsetEditMode && guest) {
        beginOffsetEditDrag(guest);
      }
    });
    rotationGizmo?.onDragStartObservable?.add?.(() => {
      pushHistory();
      skipMarkerPositionSync = selectedKind !== EDITOR_LAYERS.NPC;
    });

    positionGizmo?.onDragEndObservable?.add?.(() => {
      skipWaypointVisualRebuild = false;
      skipMarkerPositionSync = false;
      onTransformFinished(true);
    });

    rotationGizmo?.onDragEndObservable?.add?.(() => {
      skipMarkerPositionSync = false;
      onTransformFinished(false, { rotationOnly: true });
    });
  }

  function onTransformFinished(shouldSnap, options = {}) {
    if (selectedKind !== EDITOR_LAYERS.NPC) {
      const entry = markerRuntime.getEntry(selectedGuestId);

      if (!entry) {
        return;
      }

      if (shouldSnap) {
        snapMarkerRoot(entry.root);
      }

      updateMarkerFromRoot(selectedGuestId, selectedKind);
      if (selectedKind === EDITOR_LAYERS.TOUR) {
        persistToursToRuntime();
      }
      refreshUi();
      attachEditorTransformTarget(entry.root);
      scheduleAutoSave();
      setStatus(`${selectedGuestId} 위치/회전 업데이트`);
      return;
    }

    if (selectedWaypointIndex != null) {
      const root = patrolWaypointRoots[selectedWaypointIndex];
      const record = getRecordById(selectedGuestId);

      if (root && record?.movement?.type === "patrol") {
        if (shouldSnap) {
          snapPatrolWaypointRoot(root);
        }

        const targets = [...(record.movement.patrolTargets || [])];
        targets[selectedWaypointIndex] = {
          x: root.position.x,
          y: root.position.y - 0.15,
          z: root.position.z
        };
        record.movement = normalizeNpcMovement({
          ...record.movement,
          patrolTargets: targets
        });
        const guest = getGuestById(selectedGuestId);
        if (guest) {
          applyNpcRecordToGuest(guest, record);
        }
        syncPatrolWaypointVisuals();
        const wpRoot = patrolWaypointRoots[selectedWaypointIndex];
        if (wpRoot) {
          attachEditorTransformTarget(wpRoot);
        }
        refreshUi();
        scheduleAutoSave();
        setStatus(`${selectedGuestId} 웨이포인트 ${selectedWaypointIndex + 1} 이동`);
      }
      return;
    }

    const guest = getGuestById(selectedGuestId);

    if (!guest) {
      return;
    }

    if (offsetEditMode && options.rotationOnly) {
      const record = getRecordById(selectedGuestId);
      if (record) {
        record.transform.rotationY = radiansToDegrees(guest.root.rotation?.y ?? 0);
      }
      updateRecordFromGuest(guest);
      refreshUi();
      scheduleAutoSave();
      setStatus(`${guest.spawn.id} 회전 업데이트`);
      return;
    }

    if (offsetEditMode) {
      finishOffsetEditDrag(guest);
      return;
    }

    if (shouldSnap) {
      snapGuestRoot(guest);
    }

    updateRecordFromGuest(guest);
    refreshUi();
    scheduleAutoSave();

    const collision = evaluateGuestCollision(guest);
    const suffix = collision.level === "ok" ? "" : ` · ${collision.message}`;
    setStatus(`${guest.spawn.id} 위치/회전 업데이트${suffix}`);
  }

  function beginOffsetEditDrag(guest) {
    const record = getRecordById(guest?.spawn?.id);

    if (!guest?.root || !record || !offsetEditMode) {
      offsetDragBase = null;
      return;
    }

    const offset = resolveNpcOffset(record, getActiveOffsetClip(record));
    offsetDragBase = {
      x: guest.root.position.x - offset.x,
      y: guest.root.position.y - offset.y,
      z: guest.root.position.z - offset.z
    };
  }

  function finishOffsetEditDrag(guest) {
    const record = getRecordById(guest?.spawn?.id);

    if (!guest?.root || !record || !offsetEditMode || !offsetDragBase) {
      offsetDragBase = null;
      return;
    }

    const nextOffset = normalizeOffset3({
      x: guest.root.position.x - offsetDragBase.x,
      y: guest.root.position.y - offsetDragBase.y,
      z: guest.root.position.z - offsetDragBase.z
    });

    if (offsetEditMode === "clip") {
      const clip = getActiveOffsetClip(record);
      record.animation = {
        ...(record.animation || { pivots: {} }),
        pivots: {
          ...(record.animation?.pivots || {}),
          [clip]: {
            useCustom: true,
            ...nextOffset
          }
        }
      };
    } else {
      record.footOffset = nextOffset;
    }

    record.transform.position = {
      x: guest.root.position.x,
      y: guest.root.position.y,
      z: guest.root.position.z
    };
    applyNpcRecordToGuest(guest, record, {
      clipName: offsetEditMode === "clip" ? getActiveOffsetClip(record) : null
    });
    offsetDragBase = null;
    if (clipFineTuneActive && clipFineTuneClip) {
      // Keep fine-tune preview clip looping after gizmo commits.
      playEditorPreviewClip(guest, clipFineTuneClip);
      relockGuestHomeFromRoot(guest);
    }
    offsetDirty = !offsetsMatchSnapshot(record);
    refreshUi();
    // Offset edits wait for explicit「보정 저장」— do not auto-persist yet.
    setStatus(
      offsetEditMode === "clip"
        ? `${record.id} 클립 보정 변경됨 · 저장을 눌러 확정`
        : `${record.id} 기본 보정 변경됨 · 저장을 눌러 확정`
    );
  }

  function getActiveOffsetClip(record) {
    if (clipFineTuneActive && clipFineTuneClip) {
      return String(clipFineTuneClip);
    }

    return String(record?.animation?.default || "Idle");
  }

  function pauseGuestLocomotionForFineTune(guest) {
    if (!guest?.spawn) {
      return;
    }

    if (guest.spawn.movement) {
      delete guest.spawn.movement;
    }

    guest.patrolPhase = null;
    guest.patrolArrivalPending = false;
    guest.patrolSpeedFactor = 0;
    guest.danceSequencePhase = null;
    guest.syncSequencePeers = null;
  }

  function playEditorPreviewClip(guest, clipName) {
    if (!guest?.spawn) {
      return;
    }

    pauseGuestLocomotionForFineTune(guest);
    guest.spawn.animation = {
      type: "loop",
      clips: [String(clipName || "Idle")]
    };
    guest._editorNeedsAnimRestart = true;
    getGuestCharacterSystem()?.refreshGuestAnimations?.({
      onlyIds: [guest.spawn.id],
      force: true
    });
  }

  function applyFineTuneWorldPose(guest, record, clipName) {
    if (!guest?.root || !record || !clipFineTuneBase) {
      return;
    }

    const offset = resolveNpcOffset(record, clipName);
    const nextPos = {
      x: clipFineTuneBase.x + offset.x,
      y: clipFineTuneBase.y + offset.y,
      z: clipFineTuneBase.z + offset.z
    };

    record.transform = {
      ...(record.transform || {}),
      position: nextPos,
      rotationY: clipFineTuneBase.rotationY
    };

    applyNpcRecordToGuest(guest, record, {
      builtinSpawn: getBuiltinSpawn(record.id),
      allowClearMovement: true,
      clipName
    });
    pauseGuestLocomotionForFineTune(guest);
  }

  function clearClipFineTuneState() {
    clipFineTuneActive = false;
    clipFineTuneClip = null;
    clipFineTuneBase = null;
    clipFineTuneSnapshot = null;
  }

  function relockGuestHomeFromRoot(guest) {
    if (!guest?.root) {
      return;
    }

    const pose = {
      x: guest.root.position.x,
      y: guest.root.position.y,
      z: guest.root.position.z,
      rotationY: guest.root.rotation?.y ?? guest.spawn?.rotationY ?? 0
    };
    guest.initialSpawnPose = { ...pose };
    guest.danceSequenceHome = { ...pose };
    if (guest.spawn) {
      guest.spawn.position = { x: pose.x, y: pose.y, z: pose.z };
      guest.spawn.rotationY = pose.rotationY;
    }
    guest._appliedClipOffset = null;
  }

  function setClipFineTuneActive(active) {
    const record = getRecordById(selectedGuestId);
    const guest = getGuestById(selectedGuestId);

    if (!record || !guest?.root || record.type === "event"
      || record.type === "teleport" || record.type === "tour") {
      return;
    }

    if (active) {
      if (!clipFineTuneActive) {
        // Use live spawn footing (includes sitYOffsetOverride), not only record.footOffset.
        const currentOffset = normalizeOffset3(
          guest.spawn?.positionOffset
          ?? guest.spawn?.footOffset
          ?? resolveNpcOffset(record, record.animation?.default || "Idle")
        );
        const authoredPos = {
          x: guest.root.position.x,
          y: guest.root.position.y,
          z: guest.root.position.z
        };
        clipFineTuneSnapshot = {
          animation: cloneJson(record.animation || {}),
          movement: Object.prototype.hasOwnProperty.call(record, "movement")
            ? cloneJson(record.movement)
            : undefined
        };
        clipFineTuneBase = {
          x: Number(authoredPos.x || 0) - currentOffset.x,
          y: Number(authoredPos.y || 0) - currentOffset.y,
          z: Number(authoredPos.z || 0) - currentOffset.z,
          rotationY: Number(record.transform?.rotationY || 0)
        };
      }

      clipFineTuneActive = true;
      // Start on the NPC's real playback clip (Mark-7 → Sit_Clap), not Idle,
      // so toggling the checkbox alone does not drop sit height.
      const startClip = record.animation?.mode === "sequence" || record.animation?.type === "sequence"
        || (Array.isArray(record.animation?.clips) && record.animation.clips.length > 1)
        ? (record.animation.clips?.[0] || record.animation?.default || "Idle")
        : (record.animation?.default || record.animation?.clips?.[0] || "Idle");
      clipFineTuneClip = startClip;
      syncOffsetCommitSnapshot(record);
      applyFineTuneWorldPose(guest, record, startClip);
      playEditorPreviewClip(guest, startClip);
      offsetEditMode = "clip";
      selectedWaypointIndex = null;

      if (gizmoManager) {
        gizmoManager.rotationGizmoEnabled = true;
        gizmoManager.positionGizmoEnabled = true;
      }
      attachEditorTransformTarget(guest.root);
      refreshUi();
      setStatus(`${record.id} 위치 미세조정 · ${startClip} 기준 위치에서 시작`);
      return;
    }

    // Exit: keep current pivots (auto-persist if dirty), restore playback animation.
    const editClip = clipFineTuneClip || "Idle";
    const editedOffset = resolveNpcOffset(record, editClip);
    const hadOffsetEdits = offsetDirty || !offsetsMatchSnapshot(record);

    if (hadOffsetEdits) {
      persistAll();
      syncOffsetCommitSnapshot(record, { force: true });
    }

    const keptPivots = {
      ...(cloneJson(record.animation?.pivots || {})),
      [editClip]: { useCustom: true, ...editedOffset }
    };

    // Only rewrite baseline footing when the user actually changed an offset.
    if (hadOffsetEdits) {
      record.footOffset = cloneJson(editedOffset);
    }

    if (clipFineTuneSnapshot?.animation) {
      record.animation = {
        ...cloneJson(clipFineTuneSnapshot.animation),
        pivots: keptPivots
      };
    } else {
      record.animation = {
        ...(record.animation || {}),
        pivots: keptPivots
      };
    }

    const restoreClip = record.animation?.default
      || record.animation?.clips?.[0]
      || editClip
      || "Idle";

    // Stamp the playback start clip so the first frame matches the edited height.
    if (hadOffsetEdits && !keptPivots[restoreClip]?.useCustom) {
      keptPivots[restoreClip] = { useCustom: true, ...editedOffset };
      record.animation.pivots = keptPivots;
    }

    applyFineTuneWorldPose(guest, record, restoreClip);
    applyNpcRecordToGuest(guest, record, {
      builtinSpawn: getBuiltinSpawn(record.id),
      allowClearMovement: true,
      clipName: restoreClip
    });
    relockGuestHomeFromRoot(guest);

    if (record.movement?.type === "patrol") {
      getGuestCharacterSystem()?.refreshPatrolGuests?.({
        onlyIds: [record.id],
        force: true
      });
    } else {
      guest._editorNeedsAnimRestart = true;
      getGuestCharacterSystem()?.refreshGuestAnimations?.({
        onlyIds: [record.id],
        force: true
      });
    }

    clearClipFineTuneState();
    offsetEditMode = null;
    if (gizmoManager) {
      gizmoManager.rotationGizmoEnabled = true;
      gizmoManager.positionGizmoEnabled = true;
    }
    attachEditorTransformTarget(guest.root);
    persistAll();
    refreshUi();
    setStatus(`${record.id} 위치 미세조정 종료 · 보정 높이 유지, 초기 애니 재시작`);
  }

  function previewClipFineTuneAnimation(clipName) {
    const record = getRecordById(selectedGuestId);
    const guest = getGuestById(selectedGuestId);
    const clip = String(clipName || "Idle").trim() || "Idle";

    if (!clipFineTuneActive || !record || !guest?.root) {
      return;
    }

    clipFineTuneClip = clip;
    applyFineTuneWorldPose(guest, record, clip);
    playEditorPreviewClip(guest, clip);
    offsetEditMode = "clip";
    refreshUi();
    setStatus(`${record.id} 클립 미리보기: ${clip}`);
  }

  function captureOffsetSnapshot(record) {
    return {
      footOffset: cloneJson(normalizeOffset3(record?.footOffset)),
      pivots: cloneJson(record?.animation?.pivots || {})
    };
  }

  function syncOffsetCommitSnapshot(record, { force = false } = {}) {
    if (!record) {
      offsetCommitSnapshot = null;
      offsetDirty = false;
      return;
    }

    if (force || !offsetCommitSnapshot) {
      offsetCommitSnapshot = captureOffsetSnapshot(record);
      offsetDirty = false;
      return;
    }

    offsetDirty = !offsetsMatchSnapshot(record);
  }

  function offsetsMatchSnapshot(record) {
    if (!offsetCommitSnapshot) {
      return true;
    }
    return JSON.stringify(captureOffsetSnapshot(record)) === JSON.stringify(offsetCommitSnapshot);
  }

  function isOffsetScopeDirty(record, scope = "default") {
    if (!record || !offsetCommitSnapshot) {
      return false;
    }

    const current = captureOffsetSnapshot(record);
    if (scope === "clip") {
      const clip = getActiveOffsetClip(record);
      return JSON.stringify(current.pivots?.[clip] || null)
        !== JSON.stringify(offsetCommitSnapshot.pivots?.[clip] || null);
    }

    return JSON.stringify(current.footOffset) !== JSON.stringify(offsetCommitSnapshot.footOffset);
  }

  function saveOffsetEdits(scope = "default") {
    const record = getRecordById(selectedGuestId);
    const guest = getGuestById(selectedGuestId);

    if (!record || record.type === "event" || record.type === "teleport" || record.type === "tour") {
      return;
    }

    if (!isOffsetScopeDirty(record, scope) && !offsetDirty) {
      return;
    }

    pushHistory();
    if (guest) {
      applyNpcRecordToGuest(guest, record, {
        builtinSpawn: getBuiltinSpawn(record.id),
        clipName: scope === "clip" ? getActiveOffsetClip(record) : null
      });
      if (clipFineTuneActive && clipFineTuneClip) {
        playEditorPreviewClip(guest, clipFineTuneClip);
      }
    }
    persistAll();
    syncOffsetCommitSnapshot(record, { force: true });
    refreshUi();
    setStatus(
      scope === "clip"
        ? `${record.id} 클립 보정 저장`
        : `${record.id} 기본 보정 저장`
    );
  }

  function resetOffsetEdits(scope = "default") {
    const record = getRecordById(selectedGuestId);
    const guest = getGuestById(selectedGuestId);

    if (!record || !guest) {
      return;
    }

    pushHistory();

    if (scope === "clip") {
      const clip = getActiveOffsetClip(record);
      const baseline = normalizeOffset3(record.footOffset);
      const nextPivots = { ...(record.animation?.pivots || {}) };
      // Clip reset returns to NPC 기본 보정 (saved footOffset baseline).
      nextPivots[clip] = { useCustom: true, ...baseline };
      record.animation = {
        ...(record.animation || {}),
        pivots: nextPivots
      };
      if (clipFineTuneActive) {
        applyFineTuneWorldPose(guest, record, clip);
        playEditorPreviewClip(guest, clip);
        offsetDirty = !offsetsMatchSnapshot(record);
        refreshUi();
        setStatus(`${record.id} 클립 보정 → 기본 보정값으로 초기화`);
        return;
      }
    } else if (isOffsetScopeDirty(record, "default") && offsetCommitSnapshot?.footOffset) {
      // Discard unsaved 기본 보정 edits back to last saved baseline.
      record.footOffset = cloneJson(normalizeOffset3(offsetCommitSnapshot.footOffset));
    } else {
      const builtin = getBuiltinSpawn(record.id);
      record.footOffset = builtin
        ? normalizeOffset3(builtin.footOffset ?? builtin.sitYOffsetOverride ?? 0)
        : { x: 0, y: 0, z: 0 };
    }

    applyNpcRecordToGuest(guest, record);
    getGuestCharacterSystem()?.refreshGuestAnimations?.({ onlyIds: [record.id], force: true });
    offsetDirty = !offsetsMatchSnapshot(record);
    refreshUi();
    setStatus(
      scope === "clip"
        ? `${record.id} 클립 보정 → 기본 보정값으로 초기화`
        : `${record.id} 기본 보정 초기화`
    );
  }

  function snapGuestRoot(guest) {
    if (!guest?.root || typeof snapPositionToGround !== "function") {
      return false;
    }

    const pos = guest.root.position;
    const record = getRecordById(guest.spawn?.id);
    const offset = resolveNpcOffset(record);
    const base = {
      x: pos.x - offset.x,
      y: pos.y - offset.y,
      z: pos.z - offset.z
    };
    pos.x = base.x;
    pos.y = base.y;
    pos.z = base.z;
    const ok = snapPositionToGround(pos, base.y);

    if (!ok) {
      return false;
    }

    pos.x += offset.x;
    pos.y += offset.y;
    pos.z += offset.z;

    if (guest.spawn) {
      guest.spawn.position = { x: pos.x, y: pos.y, z: pos.z };
      guest.spawn.positionOffset = offset;
      guest.spawn.sitYOffsetOverride = offset.y;
    }

    if (record?.transform?.position) {
      record.transform.position = { x: pos.x, y: pos.y, z: pos.z };
    }

    return true;
  }

  function reapplyNpcGroundOffset(guest, record, previousOffset = null) {
    if (!guest?.root || !record) {
      return false;
    }

    const nextOffset = resolveNpcOffset(record, record.animation?.default);
    const priorOffset = previousOffset && typeof previousOffset === "object"
      ? normalizeOffset3(previousOffset)
      : (Number.isFinite(Number(previousOffset))
        ? normalizeOffset3(Number(previousOffset))
        : nextOffset);
    const base = {
      x: guest.root.position.x - priorOffset.x,
      y: guest.root.position.y - priorOffset.y,
      z: guest.root.position.z - priorOffset.z
    };
    guest.root.position.x = base.x;
    guest.root.position.y = base.y;
    guest.root.position.z = base.z;

    const ok = typeof snapPositionToGround === "function"
      ? snapPositionToGround(guest.root.position, base.y)
      : false;

    if (!ok) {
      guest.root.position.x = base.x + nextOffset.x;
      guest.root.position.y = base.y + nextOffset.y;
      guest.root.position.z = base.z + nextOffset.z;
    } else {
      guest.root.position.x += nextOffset.x;
      guest.root.position.y += nextOffset.y;
      guest.root.position.z += nextOffset.z;
    }

    if (guest.spawn) {
      guest.spawn.position = {
        x: guest.root.position.x,
        y: guest.root.position.y,
        z: guest.root.position.z
      };
      guest.spawn.positionOffset = nextOffset;
      guest.spawn.sitYOffsetOverride = nextOffset.y;
      guest.spawn.footOffset = normalizeOffset3(record.footOffset);
      guest.spawn.animationPivots = record.animation?.pivots || {};
    }

    if (record.transform?.position) {
      record.transform.position = {
        x: guest.root.position.x,
        y: guest.root.position.y,
        z: guest.root.position.z
      };
    }

    guest.root.computeWorldMatrix?.(true);
    return true;
  }

  function snapMarkerRoot(root) {
    if (!root || typeof snapPositionToGround !== "function") {
      return false;
    }

    return Boolean(snapPositionToGround(root.position, root.position.y));
  }

  /** Patrol sphere sits 0.15 above authored Y — snap the authored foot point to nearest floor. */
  function snapPatrolWaypointRoot(root) {
    if (!root || typeof snapPositionToGround !== "function") {
      return false;
    }

    const authored = {
      x: root.position.x,
      y: root.position.y - 0.15,
      z: root.position.z
    };
    const ok = snapPositionToGround(authored, authored.y);

    if (!ok) {
      return false;
    }

    root.position.set(authored.x, authored.y + 0.15, authored.z);
    return true;
  }

  function updateMarkerFromRoot(id, kind) {
    const entry = markerRuntime.getEntry(id);
    const record = getMarkerRecord(id, kind);

    if (!entry || !record) {
      return;
    }

    record.transform = markerRuntime.recordFromRoot(entry);
  }

  function setEditorLayer(layer) {
    if (!Object.values(EDITOR_LAYERS).includes(layer)) {
      return;
    }

    editorLayer = layer;
    refreshUi();
  }

  function selectMarkerById(id, kind = editorLayer) {
    selectedGuestId = id;
    selectedKind = kind;
    editorLayer = kind;
    selectedWaypointIndex = null;
    offsetEditMode = null;
    offsetCommitSnapshot = null;
    offsetDirty = false;
    clearClipFineTuneState();
    ensureEditorRuntime();

    if (gizmoManager) {
      gizmoManager.rotationGizmoEnabled = true;
      gizmoManager.positionGizmoEnabled = true;
    }

    highlightLayer?.removeAllMeshes?.();
    // Sync markers first so the root we attach to is the live mesh.
    refreshUi();

    const entry = markerRuntime.getEntry(id);

    if (!entry?.root) {
      attachEditorTransformTarget(null);
      return false;
    }

    try {
      highlightLayer?.addMesh(entry.head, BABYLON.Color3.FromHexString("#f4d35e"));
    } catch {
      // ignore
    }

    attachEditorTransformTarget(entry.root);
    setStatus(`${id} 선택 — 원 안쪽 드래그=XZ, 원형 링=회전, Y축=높이`);
    return true;
  }

  function selectInCurrentLayer(id) {
    if (editorLayer === EDITOR_LAYERS.NPC) {
      return selectGuestById(id);
    }

    return selectMarkerById(id, editorLayer);
  }

  function focusInCurrentLayer(id) {
    if (editorLayer === EDITOR_LAYERS.NPC) {
      return focusGuestById(id);
    }

    const entry = markerRuntime.getEntry(id);
    const camera = getOrbitCamera();

    if (!entry?.root || !camera) {
      return false;
    }

    enterOrbitMode?.();
    selectMarkerById(id, editorLayer);
    const pos = entry.root.getAbsolutePosition();
    const target = new BABYLON.Vector3(pos.x, pos.y + 0.85, pos.z);
    camera.setTarget(target);

    // Move the orbit view near the selected tour/event/teleport marker.
    const desiredRadius = editorLayer === EDITOR_LAYERS.TOUR ? 16 : 14;
    camera.radius = desiredRadius;

    if (Number.isFinite(camera.beta)) {
      camera.beta = Math.min(Math.max(camera.beta, 0.55), 1.25);
    }

    setStatus(`${id} 선택 · 시점 이동`);
    return true;
  }

  function updateRecordFromGuest(guest) {
    const snapshot = guestToNpcRecord(guest, {
      preferBuiltinModelPath: getIsNightMode?.() === true,
      getBuiltinSpawnById: getBuiltinSpawn
    });

    if (!snapshot) {
      return;
    }

    // Night-only Marie must never overwrite a shipped Mark record.
    if (snapshot.id === "Mark-Night-Marie") {
      return;
    }

    const index = sceneDocument.npcs.findIndex((npc) => npc.id === snapshot.id);

    if (index < 0) {
      sceneDocument.npcs.push(snapshot);
      return;
    }

    const prev = sceneDocument.npcs[index];
    const builtin = getBuiltinSpawn(snapshot.id);
    const nightBuiltin = getIsNightMode?.() === true && builtin;
    const resolvedAnimation = nightBuiltin
      ? spawnAnimationToEditor(builtin.animation)
      : resolveRecordAnimation(prev, builtin);
    const safeModelPath = (
      getIsNightMode?.() === true && builtin?.file
    )
      ? builtin.file
      : (snapshot.model?.path || prev.model?.path || builtin?.file || "");

    sceneDocument.npcs[index] = normalizeNpcSceneDocument({
      npcs: [{
        ...prev,
        ...snapshot,
        name: prev.name || snapshot.name,
        model: { path: safeModelPath },
        footOffset: prev.footOffset ?? snapshot.footOffset,
        animation: {
          ...resolvedAnimation,
          pivots: prev.animation?.pivots || resolvedAnimation.pivots || {}
        },
        movement: nightBuiltin
          ? (normalizeNpcMovement(builtin.movement) || null)
          : (
            Object.prototype.hasOwnProperty.call(prev, "movement")
              ? prev.movement
              : (snapshot.movement ?? null)
          ),
        interaction: prev.interaction || snapshot.interaction,
        deleted: false
      }]
    }).npcs[0];
  }

  function applyInspectorTransform(payload) {
    if (selectedKind !== EDITOR_LAYERS.NPC || editorLayer !== EDITOR_LAYERS.NPC) {
      const record = getMarkerRecord(payload.id, editorLayer);

      if (!record) {
        return;
      }

      pushHistory();
      record.transform.position = { ...payload.position };
      record.transform.rotationY = payload.rotationY;
      markerRuntime.sync(allMarkerRecords());
      const entry = markerRuntime.getEntry(payload.id);

      if (payload.autoSnap && entry) {
        snapMarkerRoot(entry.root);
        updateMarkerFromRoot(payload.id, editorLayer);
      }

      if (entry) {
        attachEditorTransformTarget(entry.root);
      }

      refreshUi();
      scheduleAutoSave();
      if (editorLayer === EDITOR_LAYERS.TOUR) {
        persistToursToRuntime();
      }
      return;
    }

    const guest = getGuestById(payload.id);
    const record = getRecordById(payload.id);

    if (!guest || !record) {
      return;
    }

    pushHistory();
    record.transform.position = { ...payload.position };
    record.transform.rotationY = payload.rotationY;
    applyNpcRecordToGuest(guest, record);

    if (payload.autoSnap) {
      snapGuestRoot(guest);
      updateRecordFromGuest(guest);
    }

    highlightGuest(guest);
    attachEditorTransformTarget(guest.root);
    refreshUi();
    scheduleAutoSave();
  }

  function rotateSelectedById(objectId, delta, absolute = false) {
    if (editorLayer !== EDITOR_LAYERS.NPC) {
      const record = getMarkerRecord(objectId, editorLayer);

      if (!record) {
        return;
      }

      pushHistory();
      let next = absolute ? delta : record.transform.rotationY + delta;

      while (next > 180) next -= 360;
      while (next < -180) next += 360;

      record.transform.rotationY = next;
      markerRuntime.sync(allMarkerRecords());
      const entry = markerRuntime.getEntry(objectId);
      attachEditorTransformTarget(entry?.root || null);
      refreshUi();
      scheduleAutoSave();
      if (editorLayer === EDITOR_LAYERS.TOUR) {
        persistToursToRuntime();
      }
      setStatus(`${objectId} rotationY ${next.toFixed(1)}°`);
      return;
    }

    rotateGuestById(objectId, delta, absolute);
  }

  function rotateGuestById(guestId, delta, absolute = false) {
    const guest = getGuestById(guestId);
    const record = getRecordById(guestId);

    if (!guest || !record) {
      return;
    }

    pushHistory();
    let next = absolute ? delta : record.transform.rotationY + delta;

    while (next > 180) next -= 360;
    while (next < -180) next += 360;

    record.transform.rotationY = next;
    applyNpcRecordToGuest(guest, record);
    attachEditorTransformTarget(guest.root);
    highlightGuest(guest);
    refreshUi();
    scheduleAutoSave();
    setStatus(`${guestId} rotationY ${next.toFixed(1)}°`);
  }

  function highlightGuest(_guest) {
    // No mesh outline/tint on NPC selection — gizmo attachment is enough.
    highlightLayer?.removeAllMeshes?.();
  }

  function selectGuestById(guestId) {
    const guest = getGuestById(guestId);

    if (!guest?.root) {
      return false;
    }

    selectedGuestId = guestId;
    selectedKind = EDITOR_LAYERS.NPC;
    editorLayer = EDITOR_LAYERS.NPC;
    offsetEditMode = null;
    selectedWaypointIndex = null;
    offsetCommitSnapshot = null;
    offsetDirty = false;
    clearClipFineTuneState();
    ensureEditorRuntime();
    if (gizmoManager) {
      gizmoManager.rotationGizmoEnabled = true;
      gizmoManager.positionGizmoEnabled = true;
    }
    highlightGuest(guest);
    const record = getRecordById(guestId);
    syncOffsetCommitSnapshot(record, { force: true });
    refreshUi();
    attachEditorTransformTarget(guest.root);
    return true;
  }

  function focusGuestById(guestId) {
    const guest = getGuestById(guestId);
    const camera = getOrbitCamera();

    if (!guest?.root || !camera) {
      return false;
    }

    selectGuestById(guestId);

    const pos = guest.root.getAbsolutePosition();
    camera.setTarget(new BABYLON.Vector3(pos.x, pos.y + 0.85, pos.z));
    camera.radius = Math.max(camera.radius, 12);
    setStatus(`${guestId} 포커스`);
    return true;
  }

  function getPlacementOrigin() {
    const camera = getOrbitCamera();
    const target = camera?.getTarget?.() || camera?.target;

    if (target) {
      return { x: target.x, y: target.y, z: target.z };
    }

    const selected = getGuestById(selectedGuestId);

    if (selected?.root) {
      return {
        x: selected.root.position.x,
        y: selected.root.position.y,
        z: selected.root.position.z
      };
    }

    return { x: 0, y: 20, z: 0 };
  }

  function createMarkerAtOrigin(kind, extra = {}) {
    const position = getPlacementOrigin();
    const ids = getMarkerCollection(kind).map((item) => item.id);
    const prefix = kind === EDITOR_LAYERS.EVENT
      ? "event_"
      : kind === EDITOR_LAYERS.TELEPORT
        ? "teleport_"
        : "tour_";
    const id = extra.id || nextPrefixedId(prefix, ids);
    const transform = extra.transform || { position, rotationY: 0 };

    if (kind === EDITOR_LAYERS.EVENT) {
      return normalizeEventRecord({
        id,
        name: extra.name || id,
        eventType: extra.eventType || extra.value || "interaction",
        transform
      });
    }

    if (kind === EDITOR_LAYERS.TELEPORT) {
      return normalizeTeleportRecord({
        id,
        name: extra.name || id,
        transform,
        arrival: extra.arrival || { position, rotationY: 0 }
      });
    }

    return normalizeTourRecord({
      id,
      name: extra.name || id,
      sourceEventId: extra.sourceEventId || "",
      duration: extra.duration ?? 10,
      transform
    });
  }

  function addMarker(kind, extra = {}) {
    pushHistory();
    const record = createMarkerAtOrigin(kind, extra);

    if (!record) {
      setStatus("마커를 만들 수 없습니다.");
      return false;
    }

    getMarkerCollection(kind).push(record);
    syncMarkers();
    const entry = markerRuntime.getEntry(record.id);

    if (entry) {
      snapMarkerRoot(entry.root);
      updateMarkerFromRoot(record.id, kind);
    }

    persistAll();
    if (kind === EDITOR_LAYERS.TOUR) {
      persistToursToRuntime();
    }
    selectMarkerById(record.id, kind);
    scheduleAutoSave();
    setStatus(`${record.id} 생성`);
    return true;
  }

  function duplicateMarker(id, kind) {
    const source = getMarkerRecord(id, kind);

    if (!source) {
      setStatus("복제할 마커를 선택하세요.");
      return false;
    }

    return addMarker(kind, {
      name: `${source.name} 복사`,
      eventType: source.eventType,
      sourceEventId: source.sourceEventId,
      duration: source.duration,
      arrival: source.arrival,
      transform: offsetTransform(source.transform)
    });
  }

  function deleteMarker(id, kind) {
    const record = getMarkerRecord(id, kind);

    if (!record) {
      return false;
    }

    if (!window.confirm(`선택한 ${kind}를 삭제하시겠습니까?\n${record.name || id}`)) {
      return false;
    }

    pushHistory();

    if (kind === EDITOR_LAYERS.EVENT) {
      eventDocument.events = eventDocument.events.filter((item) => item.id !== id);
    } else if (kind === EDITOR_LAYERS.TELEPORT) {
      teleportDocument.teleports = teleportDocument.teleports.filter((item) => item.id !== id);
    } else {
      tourDocument.tours = tourDocument.tours.filter((item) => item.id !== id);
    }

    if (selectedGuestId === id) {
      selectedGuestId = null;
      attachEditorTransformTarget(null);
      highlightLayer?.removeAllMeshes?.();
    }

    syncMarkers();
    persistAll();
    if (kind === EDITOR_LAYERS.TOUR) {
      persistToursToRuntime();
    }
    refreshUi();
    scheduleAutoSave();
    setStatus(`${id} 삭제`);
    return true;
  }

  function updateMarkerFields(id, patch) {
    const record = getMarkerRecord(id, editorLayer);

    if (!record) {
      return;
    }

    pushHistory();

    if (patch.name != null) {
      record.name = String(patch.name);
    }

    if (record.type === "event" && patch.eventType) {
      record.eventType = patch.eventType;
    }

    if (record.type === "event") {
      if (Number.isFinite(Number(patch.triggerDistance))) {
        record.triggerDistance = Number(patch.triggerDistance);
      }

      if (patch.connection) {
        record.connection = {
          type: patch.connection.type || "none",
          targetId: String(patch.connection.targetId || "")
        };
      }

      if (Array.isArray(patch.dialogue)) {
        record.dialogue = patch.dialogue;
      }

      if (patch.info) {
        record.info = {
          ko: String(patch.info.ko || ""),
          en: String(patch.info.en || "")
        };
      }
    }

    if (record.type === "tour") {
      if (patch.sourceEventId != null) {
        record.sourceEventId = String(patch.sourceEventId);
      }

      if (Number.isFinite(Number(patch.duration))) {
        record.duration = Number(patch.duration);
      }

      if (patch.script) {
        record.script = {
          ko: String(patch.script.ko || ""),
          en: String(patch.script.en || ""),
          voice: String(patch.script.voice || "")
        };
      }
    }

    if (record.type === "teleport") {
      if (Number.isFinite(Number(patch.triggerDistance))) {
        record.triggerDistance = Number(patch.triggerDistance);
      }
      if (patch.arrival) {
        record.arrival = {
          position: {
            x: Number(patch.arrival.position?.x) || 0,
            y: Number(patch.arrival.position?.y) || 0,
            z: Number(patch.arrival.position?.z) || 0
          },
          rotationY: Number(patch.arrival.rotationY) || 0
        };
      }

      if (patch.destination) {
        record.destination = {
          projectId: String(patch.destination.projectId || ""),
          pointId: String(patch.destination.pointId || "")
        };
      }
    }

    syncMarkers();
    persistAll();
    if (record.type === "tour") {
      persistToursToRuntime();
    }
    refreshUi();
    scheduleAutoSave();
  }

  function updateNpcFields(id, patch) {
    const record = getRecordById(id);
    const guest = getGuestById(id);

    if (!record) {
      return;
    }

    pushHistory();

    const previousOffset = resolveNpcOffset(record);

    if (patch.animation) {
      const nextAnimation = {
        ...(record.animation || {}),
        pivots: { ...(record.animation?.pivots || {}) }
      };

      if (patch.animation.mode != null || patch.animation.type != null) {
        nextAnimation.mode = String(patch.animation.mode || patch.animation.type);
      }

      if (Array.isArray(patch.animation.clips)) {
        nextAnimation.clips = patch.animation.clips
          .map((clip) => String(clip || "").trim())
          .filter(Boolean);
      }

      if (patch.animation.default != null) {
        nextAnimation.default = String(patch.animation.default);
      }

      if (patch.animation.loop != null) {
        nextAnimation.loop = patch.animation.loop !== false;
        if (patch.animation.mode == null && patch.animation.type == null) {
          nextAnimation.mode = nextAnimation.loop ? "loop" : "once";
        }
      }

      if (patch.animation.pivot) {
        const clip = String(
          patch.animation.pivot.clip
          || nextAnimation.default
          || "Idle"
        );
        const prevPivot = nextAnimation.pivots[clip] || { useCustom: false, x: 0, y: 0, z: 0 };
        const nextOffset = normalizeOffset3({
          x: patch.animation.pivot.x ?? prevPivot.x,
          y: patch.animation.pivot.y ?? prevPivot.y,
          z: patch.animation.pivot.z ?? prevPivot.z
        });
        nextAnimation.pivots[clip] = {
          useCustom: patch.animation.pivot.useCustom === true,
          ...nextOffset
        };
        nextAnimation.default = clip;
      }

      record.animation = normalizeNpcAnimation(nextAnimation, getBuiltinSpawn(id)?.animation);
    }

    if (patch.footOffset != null) {
      record.footOffset = normalizeOffset3(patch.footOffset);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "movement")) {
      if (patch.movement == null) {
        record.movement = null;
      } else {
        const builtinMovement = getBuiltinSpawn(id)?.movement;
        const hasPatchTargets = Array.isArray(patch.movement.patrolTargets)
          && patch.movement.patrolTargets.length > 0;
        const fallbackTargets = builtinMovement?.patrolTargets?.length
          ? builtinMovement.patrolTargets
          : [{
            x: guest?.root?.position?.x ?? record.transform?.position?.x ?? 0,
            y: guest?.root?.position?.y ?? record.transform?.position?.y ?? 0,
            z: guest?.root?.position?.z ?? record.transform?.position?.z ?? 0
          }];
        const seeded = {
          ...(builtinMovement || {}),
          ...patch.movement,
          type: "patrol",
          patrolTargets: hasPatchTargets ? patch.movement.patrolTargets : fallbackTargets
        };
        record.movement = normalizeNpcMovement(seeded) || normalizeNpcMovement({
          type: "patrol",
          clip: "Walking",
          speed: 0.12,
          patrolTargets: fallbackTargets
        });
      }
      selectedWaypointIndex = null;
    }

    if (Number.isFinite(Number(patch.triggerDistance))) {
      record.interaction = {
        ...(record.interaction || {}),
        enabled: record.interaction?.enabled !== false,
        triggerDistance: Number(patch.triggerDistance)
      };
    }

    if (guest) {
      applyNpcRecordToGuest(guest, record, {
        builtinSpawn: getBuiltinSpawn(id),
        allowClearMovement: Object.prototype.hasOwnProperty.call(patch, "movement")
          && patch.movement == null
      });

      if (
        patch.animation
        || patch.footOffset != null
      ) {
        reapplyNpcGroundOffset(guest, record, previousOffset);
      }

      if (record.movement?.type === "patrol") {
        getGuestCharacterSystem()?.refreshPatrolGuests?.({
          onlyIds: [id],
          force: true
        });
      } else if (patch.animation) {
        getGuestCharacterSystem()?.refreshGuestAnimations?.({
          onlyIds: [id],
          force: false
        });
      }
    }

    syncPatrolWaypointVisuals();
    persistAll();
    refreshUi();
    scheduleAutoSave();
    setStatus(`${id} 속성 업데이트`);
  }

  function setOffsetEditMode(mode) {
    offsetEditMode = mode === "default" || mode === "clip" ? mode : null;
    selectedWaypointIndex = null;

    const record = getRecordById(selectedGuestId);
    syncOffsetCommitSnapshot(record);

    if (offsetEditMode && selectedGuestId) {
      const guest = getGuestById(selectedGuestId);
      if (guest?.root) {
        if (gizmoManager) {
          gizmoManager.rotationGizmoEnabled = true;
          gizmoManager.positionGizmoEnabled = true;
        }
        attachEditorTransformTarget(guest.root);
      }
      setStatus(
        offsetEditMode === "clip"
          ? "애니 보정: 원 안쪽 드래그=XZ, 원형 링=회전, Y축=높이"
          : "기본 보정: 원 안쪽 드래그=XZ, 원형 링=회전, Y축=높이"
      );
    } else if (gizmoManager) {
      gizmoManager.rotationGizmoEnabled = true;
      gizmoManager.positionGizmoEnabled = true;
      const guest = getGuestById(selectedGuestId);
      attachEditorTransformTarget(guest?.root || null);
      setStatus("위치 이동: 원 안쪽 드래그=XZ, 원형 링=회전, Y축=높이");
    }

    refreshUi();
  }

  function clearPatrolWaypointVisuals() {
    patrolWaypointRoots.forEach((root) => {
      try {
        root.dispose?.();
      } catch {
        // ignore
      }
    });
    patrolWaypointRoots = [];
  }

  function syncPatrolWaypointVisuals() {
    if (!active || editorLayer !== EDITOR_LAYERS.NPC || !selectedGuestId) {
      clearPatrolWaypointVisuals();
      return;
    }

    const record = getRecordById(selectedGuestId);

    if (record?.movement?.type !== "patrol") {
      clearPatrolWaypointVisuals();
      return;
    }

    const targets = record.movement.patrolTargets || [];

    while (patrolWaypointRoots.length > targets.length) {
      const root = patrolWaypointRoots.pop();
      try {
        root.dispose?.();
      } catch {
        // ignore
      }
    }

    targets.forEach((target, index) => {
      let root = patrolWaypointRoots[index];

      if (!root) {
        root = BABYLON.MeshBuilder.CreateSphere(
          `npc-patrol-wp-${selectedGuestId}-${index}`,
          { diameter: 0.45 },
          scene
        );
        root.isPickable = true;
        const mat = new BABYLON.StandardMaterial(`npc-patrol-wp-mat-${selectedGuestId}-${index}`, scene);
        mat.disableLighting = true;
        root.material = mat;
        patrolWaypointRoots[index] = root;
      }

      root.metadata = { patrolWaypointIndex: index, npcId: selectedGuestId };
      root.position.set(target.x, target.y + 0.15, target.z);

      if (root.material) {
        root.material.emissiveColor = index === selectedWaypointIndex
          ? BABYLON.Color3.FromHexString("#f4d35e")
          : BABYLON.Color3.FromHexString("#5dade2");
      }
    });
  }

  function selectPatrolWaypoint(index) {
    if (clipFineTuneActive) {
      setClipFineTuneActive(false);
    }
    offsetEditMode = null;
    selectedWaypointIndex = Number.isFinite(Number(index)) ? Number(index) : null;

    if (gizmoManager) {
      gizmoManager.rotationGizmoEnabled = selectedWaypointIndex == null;
      gizmoManager.positionGizmoEnabled = true;
    }

    refreshUi();

    if (selectedWaypointIndex == null) {
      const guest = getGuestById(selectedGuestId);
      attachEditorTransformTarget(guest?.root || null);
      return;
    }

    const root = patrolWaypointRoots[selectedWaypointIndex];
    if (root) {
      attachEditorTransformTarget(root);
      setStatus(`웨이포인트 ${selectedWaypointIndex + 1} 선택 — 원 안쪽 드래그=XZ, Y축=높이`);
    }
  }

  function findPatrolWaypointMetaFromMesh(mesh) {
    let current = mesh;

    while (current) {
      const index = current.metadata?.patrolWaypointIndex;
      const npcId = current.metadata?.npcId;

      if (Number.isFinite(index) && npcId) {
        return { index: Number(index), npcId: String(npcId) };
      }

      current = current.parent;
    }

    return null;
  }

  function isPickInsideXzDragDisc(pick) {
    if (!xzDragTarget || !pick?.pickedPoint) {
      return false;
    }

    const pos = xzDragTarget.getAbsolutePosition?.() || xzDragTarget.position;
    const dx = pick.pickedPoint.x - pos.x;
    const dz = pick.pickedPoint.z - pos.z;
    const radius = offsetEditMode ? 1.2 : 1.05;
    return (dx * dx) + (dz * dz) <= radius * radius;
  }

  function addPatrolWaypoint(id) {
    const record = getRecordById(id);
    const guest = getGuestById(id);

    if (!record) {
      return;
    }

    pushHistory();
    const movement = normalizeNpcMovement(record.movement || {
      type: "patrol",
      clip: "Walking",
      cycleRestClip: "",
      cycleRestCount: 1,
      speed: 0.12,
      patrolTargets: []
    }) || {
      type: "patrol",
      clip: "Walking",
      cycleRestClip: "",
      cycleRestCount: 1,
      speed: 0.12,
      snapToFloor: true,
      patrolTargets: []
    };

    const pos = {
      x: guest?.root?.position?.x ?? record.transform?.position?.x ?? 0,
      y: guest?.root?.position?.y ?? record.transform?.position?.y ?? 0,
      z: guest?.root?.position?.z ?? record.transform?.position?.z ?? 0
    };

    if (typeof snapPositionToGround === "function") {
      snapPositionToGround(pos, pos.y);
    }

    movement.patrolTargets = [
      ...(movement.patrolTargets || []),
      { x: pos.x, y: pos.y, z: pos.z }
    ];
    record.movement = normalizeNpcMovement(movement);
    if (guest) {
      applyNpcRecordToGuest(guest, record);
    }
    selectedWaypointIndex = (record.movement.patrolTargets.length || 1) - 1;
    syncPatrolWaypointVisuals();
    selectPatrolWaypoint(selectedWaypointIndex);
    persistAll();
    scheduleAutoSave();
    setStatus(`${id} 웨이포인트 추가`);
  }

  function removePatrolWaypoint(id, index) {
    const record = getRecordById(id);

    if (record?.movement?.type !== "patrol") {
      return;
    }

    pushHistory();
    const targets = [...(record.movement.patrolTargets || [])];
    if (index < 0 || index >= targets.length) {
      return;
    }

    targets.splice(index, 1);
    record.movement = normalizeNpcMovement({
      ...record.movement,
      patrolTargets: targets
    });
    selectedWaypointIndex = null;
    const guest = getGuestById(id);
    if (guest) {
      applyNpcRecordToGuest(guest, record);
    }
    syncPatrolWaypointVisuals();
    persistAll();
    refreshUi();
    scheduleAutoSave();
    setStatus(`${id} 웨이포인트 삭제`);
  }

  async function changeNpcModel(id, file) {
    const record = getRecordById(id);
    const guest = getGuestById(id);
    const template = findTemplateByFile(file);

    if (!record || !guest?.root || !template) {
      setStatus("변경할 NPC 모델을 선택하세요.");
      return false;
    }

    if (String(record.model?.path || "") === String(file)) {
      return false;
    }

    pushHistory();
    const position = {
      x: guest.root.position.x,
      y: guest.root.position.y,
      z: guest.root.position.z
    };
    const rotationY = guest.root.rotation?.y ?? 0;
    const wasSelected = selectedGuestId === id;

    try {
      disposeNpcs([id]);
      const spawn = buildEditorSpawnFromTemplate(template, {
        id,
        name: record.name || id,
        file,
        position,
        rotationY
      });

      if (record.animation) {
        spawn.animation = editorAnimationToSpawn(record.animation);
      }

      const nextGuest = await spawnNpc(spawn);

      if (!nextGuest) {
        throw new Error("respawn failed");
      }

      snapGuestRoot(nextGuest);
      record.model = { path: file };
      record.name = record.name || id;
      applyNpcRecordToGuest(nextGuest, record);
      persistAll();

      if (wasSelected) {
        selectGuestById(id);
      } else {
        refreshUi();
      }

      scheduleAutoSave();
      setStatus(`${id} 모델 변경: ${file.split("/").pop()}`);
      return true;
    } catch (error) {
      console.error("[npc-scene-editor] change model failed", error);
      setStatus("NPC 모델 변경에 실패했습니다.");
      return false;
    }
  }

  async function addCurrentLayerObject(value) {
    if (editorLayer === EDITOR_LAYERS.NPC) {
      return addNpcFromModel(value);
    }

    return addMarker(editorLayer, { value, eventType: value });
  }

  async function duplicateCurrent(id) {
    if (editorLayer === EDITOR_LAYERS.NPC) {
      return duplicateGuestById(id);
    }

    return duplicateMarker(id, editorLayer);
  }

  async function deleteCurrent(id) {
    if (editorLayer === EDITOR_LAYERS.NPC) {
      return deleteGuestById(id);
    }

    return deleteMarker(id, editorLayer);
  }

  async function spawnNpc(spawn) {
    const gcs = getGuestCharacterSystem();

    if (!gcs?.ensureSpawned) {
      throw new Error("guest character system unavailable");
    }

    extraSpawnTemplates.set(spawn.id, cloneJson(spawn));
    const guests = await gcs.ensureSpawned([spawn], { showOnLoad: true });
    gcs.revealGuest?.(spawn.id);
    return guests?.[0] || getGuestById(spawn.id);
  }

  function disposeNpcs(ids) {
    const gcs = getGuestCharacterSystem();
    gcs?.disposeGuests?.({ onlyIds: ids });
  }

  async function addNpcFromModel(file) {
    const template = findTemplateByFile(file);

    if (!template) {
      setStatus("추가할 NPC 모델을 선택하세요.");
      return false;
    }

    pushHistory();
    const id = nextEditorNpcId(sceneDocument.npcs.map((npc) => npc.id));
    const position = getPlacementOrigin();
    const spawn = buildEditorSpawnFromTemplate(template, {
      id,
      name: id,
      position,
      rotationY: 0
    });

    try {
      const guest = await spawnNpc(spawn);

      if (!guest) {
        throw new Error("spawn failed");
      }

      snapGuestRoot(guest);
      updateRecordFromGuest(guest);
      writeNpcSceneStorage(sceneDocument);
      selectGuestById(id);
      scheduleAutoSave();
      setStatus(`${id} 생성`);
      return true;
    } catch (error) {
      console.error("[npc-scene-editor] add NPC failed", error);
      setStatus("NPC 생성에 실패했습니다.");
      return false;
    }
  }

  async function duplicateGuestById(guestId) {
    const source = getGuestById(guestId);

    if (!source?.spawn) {
      setStatus("복제할 NPC를 선택하세요.");
      return false;
    }

    pushHistory();
    const id = nextEditorNpcId(sceneDocument.npcs.map((npc) => npc.id));
    const position = {
      x: source.root.position.x + 1,
      y: source.root.position.y,
      z: source.root.position.z + 1
    };
    const spawn = buildEditorSpawnFromTemplate(source.spawn, {
      id,
      name: `${source.spawn.devLabel || guestId} 복사`,
      position,
      rotationY: source.root.rotation?.y ?? source.spawn.rotationY
    });

    try {
      const guest = await spawnNpc(spawn);

      if (!guest) {
        throw new Error("spawn failed");
      }

      snapGuestRoot(guest);
      updateRecordFromGuest(guest);
      writeNpcSceneStorage(sceneDocument);
      selectGuestById(id);
      scheduleAutoSave();
      setStatus(`${id} 복제 (${guestId})`);
      return true;
    } catch (error) {
      console.error("[npc-scene-editor] duplicate failed", error);
      setStatus("NPC 복제에 실패했습니다.");
      return false;
    }
  }

  async function deleteGuestById(guestId) {
    const record = getRecordById(guestId) || guestToNpcRecord(getGuestById(guestId));

    if (!record) {
      return false;
    }

    if (!window.confirm(`선택한 NPC를 삭제하시겠습니까?\n${record.name || guestId}`)) {
      return false;
    }

    pushHistory();
    disposeNpcs([guestId]);
    extraSpawnTemplates.delete(guestId);

    if (isEditorCreatedNpcId(guestId)) {
      sceneDocument.npcs = sceneDocument.npcs.filter((npc) => npc.id !== guestId);
    } else {
      const index = sceneDocument.npcs.findIndex((npc) => npc.id === guestId);

      if (index >= 0) {
        sceneDocument.npcs[index] = { ...sceneDocument.npcs[index], deleted: true };
      } else {
        sceneDocument.npcs.push({ ...record, deleted: true });
      }
    }

    if (selectedGuestId === guestId) {
      selectedGuestId = null;
      gizmoManager?.attachToMesh(null);
      highlightLayer?.removeAllMeshes?.();
    }

    refreshUi();
    writeNpcSceneStorage(sceneDocument);
    scheduleAutoSave();
    setStatus(`${guestId} 삭제`);
    return true;
  }

  async function restoreState(state) {
    restoring = true;

    try {
      sceneDocument = normalizeNpcSceneDocument(state.document);
      eventDocument = normalizeEventDocument(state.eventDocument);
      teleportDocument = normalizeTeleportDocument(state.teleportDocument);
      tourDocument = normalizeTourDocument(state.tourDocument);
      editorLayer = state.editorLayer || EDITOR_LAYERS.NPC;
      selectedKind = state.selectedKind || EDITOR_LAYERS.NPC;
      const wantedIds = new Set(getActiveNpcRecords(sceneDocument).map((npc) => npc.id));
      const extraById = new Map((state.extraSpawns || []).map((spawn) => [spawn.id, spawn]));

      extraSpawnTemplates.clear();
      extraById.forEach((spawn, id) => extraSpawnTemplates.set(id, spawn));

      const extrasToRemove = getGuests()
        .filter((guest) => isEditorCreatedNpcId(guest.spawn?.id) && !wantedIds.has(guest.spawn.id))
        .map((guest) => guest.spawn.id);

      if (extrasToRemove.length) {
        disposeNpcs(extrasToRemove);
      }

      const deletedIds = sceneDocument.npcs.filter((npc) => npc.deleted).map((npc) => npc.id);

      if (deletedIds.length) {
        disposeNpcs(deletedIds);
      }

      for (const npc of getActiveNpcRecords(sceneDocument)) {
        if (getGuestById(npc.id)) {
          continue;
        }

        const extra = extraById.get(npc.id);
        const builtin = getBuiltinSpawnById?.(npc.id);
        const template = extra || builtin || findTemplateByFile(npc.model?.path);

        if (!template) {
          continue;
        }

        const spawn = extra || buildEditorSpawnFromTemplate(template, {
          id: npc.id,
          name: npc.name,
          file: npc.model?.path,
          position: npc.transform.position,
          rotationY: degreesToRadians(npc.transform.rotationY)
        });

        await spawnNpc(spawn);
      }

      applySceneToGuests();
      syncMarkers();
      selectedGuestId = state.selectedGuestId || null;

      if (state.guideTourData && typeof publishGuideTourData === "function") {
        publishGuideTourData(state.guideTourData);
      }

      tourDirty = true;
      writeTourStorage(tourDocument);

      if (selectedKind === EDITOR_LAYERS.NPC && wantedIds.has(selectedGuestId)) {
        selectGuestById(selectedGuestId);
      } else if (selectedKind !== EDITOR_LAYERS.NPC && selectedGuestId) {
        selectMarkerById(selectedGuestId, selectedKind);
      } else {
        selectedGuestId = null;
        gizmoManager?.attachToMesh(null);
        highlightLayer?.removeAllMeshes?.();
        refreshUi();
      }
    } finally {
      restoring = false;
    }
  }

  async function undo() {
    const current = captureState();
    const previous = history.undo(current);

    if (!previous) {
      setStatus("되돌릴 작업이 없습니다.");
      return;
    }

    await restoreState(previous);
    scheduleAutoSave();
    setStatus("Undo");
  }

  async function redo() {
    const current = captureState();
    const next = history.redo(current);

    if (!next) {
      setStatus("다시 실행할 작업이 없습니다.");
      return;
    }

    await restoreState(next);
    scheduleAutoSave();
    setStatus("Redo");
  }

  function resolveEditorPick(pointerInfo) {
    const fallback = pointerInfo?.pickInfo || null;

    if (typeof scene.multiPick !== "function") {
      return fallback;
    }

    const x = Number.isFinite(scene.pointerX) ? scene.pointerX : null;
    const y = Number.isFinite(scene.pointerY) ? scene.pointerY : null;

    if (x == null || y == null) {
      return fallback;
    }

    let hits = [];

    try {
      hits = scene.multiPick(x, y) || [];
    } catch {
      return fallback;
    }

    const preferred = hits.find((hit) => {
      if (!hit?.hit || !hit.pickedMesh) {
        return false;
      }

      if (findPatrolWaypointMetaFromMesh(hit.pickedMesh)) {
        return true;
      }

      if (markerRuntime.findFromMesh(hit.pickedMesh)) {
        return true;
      }

      return Boolean(findGuestRootFromNode(getGuests(), hit.pickedMesh));
    });

    return preferred || fallback;
  }

  function handlePointerPick(pointerInfo) {
    if (!active || pointerInfo.type !== BABYLON.PointerEventTypes.POINTERDOWN) {
      return;
    }

    const evt = pointerInfo.event;
    // Ignore picks while interacting with editor chrome / open form controls.
    // Native <select> option clicks often target the canvas underneath — never
    // treat those as ground teleports or NPC reselection.
    if (
      isNpcEditorScenePointerBlocked(evt)
      || isTypingTarget(evt?.target)
      || isTypingTarget(document.activeElement)
      || evt?.target?.closest?.(
        ".npc-scene-editor-inspector, .npc-scene-editor-list, .npc-scene-editor-top, .npc-scene-editor-status"
      )
    ) {
      return;
    }

    const pick = resolveEditorPick(pointerInfo);

    if (!pick?.hit) {
      return;
    }

    // Prefer patrol waypoint picks while editing an NPC.
    const waypointMeta = findPatrolWaypointMetaFromMesh(pick.pickedMesh);

    if (
      waypointMeta
      && editorLayer === EDITOR_LAYERS.NPC
      && selectedGuestId
      && waypointMeta.npcId === selectedGuestId
    ) {
      selectPatrolWaypoint(waypointMeta.index);
      return;
    }

    const marker = markerRuntime.findFromMesh(pick.pickedMesh);

    if (marker) {
      selectMarkerById(marker.id, marker.kind);
      return;
    }

    const guest = findGuestRootFromNode(getGuests(), pick.pickedMesh);

    if (guest) {
      selectGuestById(guest.spawn.id);
      return;
    }

    if (!selectedGuestId || !isGroundMesh(pick.pickedMesh) || !pick.pickedPoint) {
      return;
    }

    // Don't fight the XZ drag disc — clicks inside the disc start a drag, not a teleport.
    if (isPickInsideXzDragDisc(pick)) {
      return;
    }

    if (selectedKind !== EDITOR_LAYERS.NPC) {
      const entry = markerRuntime.getEntry(selectedGuestId);

      if (!entry?.root) {
        return;
      }

      pushHistory();
      entry.root.position.x = pick.pickedPoint.x;
      entry.root.position.z = pick.pickedPoint.z;
      snapMarkerRoot(entry.root);
      updateMarkerFromRoot(selectedGuestId, selectedKind);
      if (selectedKind === EDITOR_LAYERS.TOUR) {
        persistToursToRuntime();
      }
      attachEditorTransformTarget(entry.root);
      refreshUi();
      scheduleAutoSave();
      setStatus(`${selectedGuestId} → Ground 클릭 이동`);
      return;
    }

    if (selectedWaypointIndex != null) {
      const root = patrolWaypointRoots[selectedWaypointIndex];

      if (!root) {
        return;
      }

      pushHistory();
      root.position.x = pick.pickedPoint.x;
      root.position.z = pick.pickedPoint.z;
      onTransformFinished(true);
      return;
    }

    const selected = getGuestById(selectedGuestId);

    if (!selected?.root) {
      return;
    }

    pushHistory();
    selected.root.position.x = pick.pickedPoint.x;
    selected.root.position.z = pick.pickedPoint.z;
    snapGuestRoot(selected);
    selected.spawn.position.x = selected.root.position.x;
    selected.spawn.position.z = selected.root.position.z;
    selected.spawn.position.y = selected.root.position.y;
    updateRecordFromGuest(selected);
    attachEditorTransformTarget(selected.root);
    highlightGuest(selected);
    refreshUi();
    scheduleAutoSave();
    setStatus(`${selectedGuestId} → Ground 클릭 이동`);
  }

  function bindPointerObserver() {
    if (pointerObserver) {
      return;
    }

    pointerObserver = scene.onPointerObservable.add(handlePointerPick);
  }

  function unbindPointerObserver() {
    if (!pointerObserver) {
      return;
    }

    scene.onPointerObservable.remove(pointerObserver);
    pointerObserver = null;
  }

  async function spawnMissingFromDocument() {
    for (const npc of getActiveNpcRecords(sceneDocument)) {
      if (getGuestById(npc.id)) {
        continue;
      }

      const builtin = getBuiltinSpawnById?.(npc.id);

      // Shipped Guide/Mark presence and model identity belong exclusively to the
      // runtime cast owner. The editor may transform them, but must never refill
      // a failed day/night cast with a path from localStorage.
      if (builtin) {
        continue;
      }

      const template = extraSpawnTemplates.get(npc.id)
        || findTemplateByFile(npc.model?.path);

      if (!template) {
        continue;
      }

      const spawn = buildEditorSpawnFromTemplate(template, {
        id: npc.id,
        name: npc.name,
        file: npc.model?.path || template.file,
        position: npc.transform.position,
        rotationY: degreesToRadians(npc.transform.rotationY)
      });

      await spawnNpc(spawn);
    }

    const deletedIds = sceneDocument.npcs.filter((npc) => npc.deleted).map((npc) => npc.id);

    if (deletedIds.length) {
      disposeNpcs(deletedIds);
    }
  }

  async function prepareGuestsForEditor() {
    if (typeof ensureGuestsReady === "function") {
      await ensureGuestsReady();
    } else {
      const gcs = getGuestCharacterSystem();
      gcs?.show?.();
    }
  }

  async function loadDocument() {
    await prepareGuestsForEditor();
    sceneDocument = await loadEffectiveNpcScene(
      getGuests(),
      undefined,
      {
        getBuiltinSpawnById: getBuiltinSpawn,
        preferBuiltinModelPath: getIsNightMode?.() === true
      }
    );
    sceneDocument = normalizeNpcSceneDocument({
      ...sceneDocument,
      npcs: sceneDocument.npcs.map((npc) => {
        const builtin = getBuiltinSpawn(npc.id);
        const storedPath = String(npc.model?.path || "");
        const hasPoisonedNightModel = Boolean(builtin) && (
          /Devi\.glb/i.test(storedPath)
          || /01 Devi\//i.test(storedPath)
          || npc.id === "Mark-Night-Marie"
        );
        const movement = hasPoisonedNightModel
          ? normalizeNpcMovement(builtin.movement)
          : resolveRecordMovement(npc, builtin);
        const animation = hasPoisonedNightModel
          ? spawnAnimationToEditor(builtin.animation)
          : resolveRecordAnimation(npc, builtin);
        return {
          ...npc,
          // Repair old night sessions that persisted Devi/Marie paths over a
          // shipped Mark. Types always follow the GitHub/builtin config.
          ...(builtin?.file ? { model: { path: builtin.file } } : {}),
          ...(movement ? { movement } : {}),
          animation: {
            ...animation,
            pivots: npc.animation?.pivots || animation.pivots || {}
          }
        };
      })
    });
    eventDocument = await loadEffectiveEventDocument();
    teleportDocument = await loadEffectiveTeleportDocument();
    tourDocument = await loadEffectiveTourDocument(getGuideTourEvents() || []);
    await healPrunedGuideTourData();
    await spawnMissingFromDocument();
    applySceneToGuests({ refresh: false });
    // Restart clips for editor preview, then snap again so dance root travel
    // from the first frames cannot leave 등장위치 before pause takes hold.
    getGuestCharacterSystem()?.refreshPatrolGuests?.({ force: true });
    getGuestCharacterSystem()?.refreshGuestAnimations?.({ force: true });
    applySceneToGuests({ refresh: false });
    syncMarkers();
    refreshUi();
  }

  async function healPrunedGuideTourData() {
    if (typeof getGuideTourData !== "function" || typeof publishGuideTourData !== "function") {
      return false;
    }

    const guide = getGuideTourData();
    if (!guide || typeof guide !== "object") return false;

    let base = null;
    try {
      const res = await fetch("./data/guide/angji-guide-tour.json", { cache: "no-store" });
      if (res.ok) base = await res.json();
    } catch {
      base = null;
    }

    const baseEvents = Array.isArray(base?.events) ? base.events : [];
    if (!baseEvents.length) return false;

    const currentIds = new Set((guide.events || []).map((event) => String(event?.id ?? "")));
    const missing = baseEvents.filter((event) => {
      const id = String(event?.id ?? "");
      return id && !currentIds.has(id);
    });
    if (!missing.length) return false;

    const healedEvents = [...(guide.events || []), ...missing].sort((a, b) => {
      const na = Number(a?.id);
      const nb = Number(b?.id);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a?.id ?? "").localeCompare(String(b?.id ?? ""), undefined, { numeric: true });
    });

    const healedGuide = {
      ...guide,
      events: healedEvents,
      updatedAt: new Date().toISOString()
    };
    publishGuideTourData(healedGuide);

    const tourEventIds = new Set(
      (tourDocument.tours || []).map((tour) => String(tour?.sourceEventId || ""))
    );
    const missingTourEvents = missing.filter(
      (event) => !tourEventIds.has(String(event?.id ?? ""))
    );

    if (!(tourDocument.tours || []).length) {
      tourDocument = normalizeTourDocument({
        ...tourDocument,
        tours: tourPointsFromGuideEvents(healedEvents),
        updatedAt: new Date().toISOString()
      });
      writeTourStorage(tourDocument);
      tourDirty = true;
    } else if (missingTourEvents.length) {
      const appended = tourPointsFromGuideEvents(missingTourEvents);
      const existingIds = new Set((tourDocument.tours || []).map((tour) => String(tour?.id || "")));
      const mergedTours = [...(tourDocument.tours || [])];

      appended.forEach((tour) => {
        let id = tour.id;
        if (existingIds.has(id)) {
          id = nextPrefixedId("tour_", [...existingIds]);
        }
        existingIds.add(id);
        mergedTours.push({ ...tour, id });
      });

      tourDocument = normalizeTourDocument({
        ...tourDocument,
        tours: mergedTours,
        updatedAt: new Date().toISOString()
      });
      writeTourStorage(tourDocument);
      tourDirty = true;
    }

    return true;
  }

  function saveToStorage() {
    getGuests().forEach(updateRecordFromGuest);
    persistAll();
    if (tourDirty) {
      persistToursToRuntime();
    }

    const collisions = Object.entries(getCollisionById())
      .filter(([, info]) => info.level === "error")
      .map(([id, info]) => `${id} (${info.message})`);

    if (collisions.length) {
      setStatus(`저장됨 — 충돌 경고: ${collisions.join(", ")}`);
      return;
    }

    setStatus("임시 저장 완료 (이 브라우저만). 프로젝트 파일 반영은「프로젝트에 적용」을 누르세요.");
  }

  function buildCurrentProjectBundle() {
    getGuests().forEach(updateRecordFromGuest);
    return buildEditorProjectBundle({
      projectId: sceneDocument.projectId || "angji",
      npcs: sceneDocument,
      events: eventDocument,
      teleports: teleportDocument,
      tours: tourDocument
    });
  }

  async function applyToProject() {
    const bundle = buildCurrentProjectBundle();
    persistAll();
    if (tourDirty) {
      persistToursToRuntime();
    }

    setStatus("프로젝트 파일에 쓰는 중…");

    const available = await isEditorWriteServerAvailable();

    if (!available) {
      setStatus(
        "쓰기 서버가 없습니다. 터미널에서 npm run editor:write-server 실행 후 다시「프로젝트에 적용」하세요."
      );
      return false;
    }

    try {
      const result = await applyEditorBundleToProject(bundle);
      clearNeedsJsonExport();
      const files = (result.written || []).join(", ");
      setStatus(
        `프로젝트에 적용 완료 → ${files}. GitHub 반영은 커밋/푸시가 필요합니다.`
      );
      return true;
    } catch (error) {
      setStatus(`프로젝트 적용 실패: ${error?.message || error}`);
      return false;
    }
  }

  async function exportJson() {
    const bundle = buildCurrentProjectBundle();
    const summary = summarizeProjectBundle(bundle);
    const text = exportEditorProjectBundleJson(bundle);
    const filename = `rabbit-metaverse-${summary.projectId}.json`;

    downloadJsonFile(filename, text);
    clearNeedsJsonExport();
    setStatus(
      `프로젝트 JSON 다운로드 (${summary.npcCount} NPC / ${summary.eventCount} Event / ${summary.teleportCount} Teleport / ${summary.tourCount} Tour)`
    );

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // download already succeeded
    }
  }

  function importJson(raw) {
    pushHistory();

    if (isEditorProjectBundle(raw)) {
      const validated = validateEditorProjectBundle(raw);

      if (!validated.ok) {
        setStatus(`Import 거부: ${validated.error}`);
        return false;
      }

      writeProjectImportBackup(buildCurrentProjectBundle());
      const bundle = validated.bundle;

      sceneDocument = bundle.npcs;
      eventDocument = bundle.events;
      teleportDocument = bundle.teleports;
      tourDocument = bundle.tours;
      tourDirty = true;
      editorLayer = EDITOR_LAYERS.NPC;

      void spawnMissingFromDocument()
        .then(() => {
          applySceneToGuests();
          syncMarkers();
          persistAll();
          persistToursToRuntime();
          refreshUi();
          scheduleAutoSave();
          const summary = validated.summary;
          setStatus(
            `프로젝트 Import 완료 (${summary.npcCount} NPC / ${summary.eventCount} Event / ${summary.teleportCount} Teleport / ${summary.tourCount} Tour) · 이전 데이터 백업됨`
          );
        })
        .catch((error) => {
          console.error("[npc-scene-editor] project import failed", error);
          setStatus("프로젝트 JSON Import 실패");
        });

      return true;
    }

    if (Array.isArray(raw?.events) || raw?.type === "event") {
      eventDocument = normalizeEventDocument(raw);
      editorLayer = EDITOR_LAYERS.EVENT;
      persistAll();
      refreshUi();
      setStatus(`JSON Import 완료 (${eventDocument.events.length} Event)`);
      return true;
    }

    if (Array.isArray(raw?.teleports) || raw?.type === "teleport") {
      teleportDocument = normalizeTeleportDocument(raw);
      editorLayer = EDITOR_LAYERS.TELEPORT;
      persistAll();
      refreshUi();
      setStatus(`JSON Import 완료 (${teleportDocument.teleports.length} Teleport)`);
      return true;
    }

    if (Array.isArray(raw?.tours) || raw?.type === "tour") {
      tourDocument = normalizeTourDocument(raw);
      editorLayer = EDITOR_LAYERS.TOUR;
      persistAll();
      persistToursToRuntime();
      refreshUi();
      setStatus(`JSON Import 완료 (${tourDocument.tours.length} Tour)`);
      return true;
    }

    const next = normalizeNpcSceneDocument(raw);

    if (!next.npcs.length) {
      setStatus("유효한 데이터가 없습니다.");
      return false;
    }

    sceneDocument = next;
    editorLayer = EDITOR_LAYERS.NPC;
    void spawnMissingFromDocument()
      .then(() => {
        applySceneToGuests();
        persistAll();
        refreshUi();
        scheduleAutoSave();
        setStatus(`JSON Import 완료 (${getActiveNpcRecords(sceneDocument).length} NPC)`);
      })
      .catch((error) => {
        console.error("[npc-scene-editor] import failed", error);
        setStatus("JSON Import 실패");
      });

    return true;
  }

  async function playTest() {
    getGuests().forEach(updateRecordFromGuest);
    persistAll();

    if (tourDirty) {
      persistToursToRuntime();
    }

    const collisions = Object.entries(getCollisionById())
      .filter(([, info]) => info.level === "error")
      .map(([id, info]) => `${id} (${info.message})`);

    if (collisions.length) {
      const proceed = window.confirm(
        `충돌 경고가 있습니다:\n${collisions.join("\n")}\n\n그래도 Play Test를 진행할까요?`
      );

      if (!proceed) {
        setStatus(`Play Test 취소 — 충돌: ${collisions.join(", ")}`);
        return false;
      }
    }

    if (!deactivate({ force: true, keepEditorDraft: true })) {
      return false;
    }

    try {
      await enterWalkMode?.(false);
    } catch (error) {
      console.error("[npc-scene-editor] play test walk failed", error);
      onStatus?.("Play Test 진입 실패");
      return false;
    }

    onStatus?.(
      "Play Test — Event/Teleport는 E. ESC로 대화 닫기. Editor Mode로 편집 복귀."
    );
    return true;
  }

  function syncGuestPickableForEditor() {
    getGuestCharacterSystem()?.setEditorMeshPickable?.(active);
  }

  async function activate() {
    if (active) {
      return true;
    }

    enterOrbitMode?.();
    // Mark active before prepareGuests so cast owner uses editor-day/night (indoor included).
    active = true;
    // Allow scene.pick to hit guest meshes (gameplay keeps them non-pickable).
    syncGuestPickableForEditor();
    try {
      await loadDocument();
      syncGuestPickableForEditor();
      ensureEditorRuntime();
      bindPointerObserver();
      bindBeforeUnload();
      // Keep needsJsonExport across sessions — only Export/Apply clears it.
      markerRuntime.setVisible(true);
      refreshUi();
      ui.show();
      setStatus(
        needsJsonExport
          ? "Editor Mode — 미 Export 변경 있음 · 임시 저장 / Play Test / 프로젝트에 적용"
          : "Editor Mode — 임시 저장 / ▶ Play Test / 프로젝트에 적용 / JSON Export"
      );
      onActiveChange?.(true);
      // Cast may spawn additional guests after activate — re-enable pick on them.
      window.setTimeout(() => {
        if (active) {
          syncGuestPickableForEditor();
        }
      }, 0);
      window.addEventListener("keydown", handleKeyDown);
      return true;
    } catch (error) {
      active = false;
      syncGuestPickableForEditor();
      onActiveChange?.(false);
      throw error;
    }
  }

  async function restoreNpcsToProjectBaseline() {
    clearNpcSceneStorage();

    // Snap live guests back to builtin spawn poses before rebuilding the document.
    (getBuiltinSpawns() || []).forEach((spawn) => {
      const guest = getGuestById(spawn.id);

      if (!guest?.root || !spawn?.position) {
        return;
      }

      guest.root.position.set(spawn.position.x, spawn.position.y, spawn.position.z);
      guest.root.rotation.y = Number.isFinite(spawn.rotationY) ? spawn.rotationY : 0;

      if (guest.spawn) {
        guest.spawn.position = {
          x: spawn.position.x,
          y: spawn.position.y,
          z: spawn.position.z
        };
        guest.spawn.rotationY = guest.root.rotation.y;
      }
    });

    sceneDocument = await loadEffectiveNpcScene(
      getGuests(),
      undefined,
      {
        getBuiltinSpawnById: getBuiltinSpawn,
        preferBuiltinModelPath: getIsNightMode?.() === true
      }
    );

    const baselineIds = new Set(getActiveNpcRecords(sceneDocument).map((npc) => npc.id));
    const disposable = getGuests()
      .map((guest) => guest.spawn?.id)
      .filter((id) => id && isEditorCreatedNpcId(id) && !baselineIds.has(id));

    if (disposable.length) {
      disposeNpcs(disposable);
      sceneDocument = normalizeNpcSceneDocument({
        ...sceneDocument,
        npcs: sceneDocument.npcs.filter((npc) => !disposable.includes(npc.id))
      });
    }

    applySceneToGuests();
    const gcs = getGuestCharacterSystem();
    if (getIsNightMode?.() !== true) {
      gcs?.refreshPatrolGuests?.({ force: true });
      gcs?.refreshGuestAnimations?.({ force: true });
    }
    syncMarkers();
    clearNeedsJsonExport();
    onPlacementChanged?.();
  }

  function deactivate(options = {}) {
    if (!active) {
      return true;
    }

    if (!options.force && needsJsonExport) {
      const proceed = window.confirm(
        "JSON Export / 프로젝트 적용을 하지 않은 변경사항이 있습니다.\n그래도 Editor를 닫을까요?\n(임시 저장은 삭제되고 NPC는 프로젝트 초기 위치로 돌아갑니다)"
      );

      if (!proceed) {
        return false;
      }
    }

    active = false;
    selectedGuestId = null;
    offsetEditMode = null;
    selectedWaypointIndex = null;
    clearClipFineTuneState();
    skipWaypointVisualRebuild = false;
    skipMarkerPositionSync = false;
    detachXzPlaneDrag();
    clearPatrolWaypointVisuals();
    window.clearTimeout(autoSaveTimer);
    unbindPointerObserver();
    unbindBeforeUnload();
    gizmoManager?.attachToMesh(null);
    highlightLayer?.removeAllMeshes?.();
    markerRuntime.setVisible(false);
    ui.hide();
    dialogCameraPreview.stop();
    setStatus("");
    syncGuestPickableForEditor();
    window.removeEventListener("keydown", handleKeyDown);

    // Play Test keeps draft placements; any other close restores project baseline.
    if (options.keepEditorDraft !== true) {
      void restoreNpcsToProjectBaseline()
        .catch((error) => {
          console.error("[npc-scene-editor] baseline restore failed", error);
        })
        .finally(() => {
          // Reconcile only after baseline restoration has stopped mutating guests.
          onActiveChange?.(false);
        });
    } else {
      onActiveChange?.(false);
    }

    return true;
  }

  function handleKeyDown(event) {
    if (!active || isTypingTarget(event.target)) {
      return;
    }

    const key = String(event.key || "").toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && key === "z" && event.shiftKey) {
      event.preventDefault();
      void redo();
      return;
    }

    if (ctrl && key === "z") {
      event.preventDefault();
      void undo();
      return;
    }

    if (ctrl && key === "y") {
      event.preventDefault();
      void redo();
      return;
    }

    if (ctrl && key === "d" && selectedGuestId) {
      event.preventDefault();
      void duplicateCurrent(selectedGuestId);
      return;
    }

    if ((key === "delete") && selectedGuestId) {
      event.preventDefault();
      void deleteCurrent(selectedGuestId);
      return;
    }

    if (key === "f" && selectedGuestId) {
      focusInCurrentLayer(selectedGuestId);
      event.preventDefault();
    }

    if (event.key === "Escape") {
      event.preventDefault();

      if (typeof onRequestClose === "function") {
        onRequestClose();
      } else {
        deactivate();
      }
    }
  }

  function dispose() {
    deactivate({ force: true, keepEditorDraft: true });
    dialogCameraPreview.dispose();
    unbindBeforeUnload();
    history.clear();
    extraSpawnTemplates.clear();
    markerRuntime.dispose();

    if (gizmoManager) {
      gizmoManager.dispose();
      gizmoManager = null;
    }

    if (highlightLayer) {
      highlightLayer.dispose();
      highlightLayer = null;
    }
  }

  return {
    activate,
    deactivate,
    dispose,
    isActive: () => active,
    selectGuestById,
    focusGuestById,
    saveToStorage,
    exportJson,
    importJson,
    syncToursFromGuideData,
    refreshUi,
    getDocument: () => sceneDocument,
    /** Drop beforeunload so mode/night swaps and hard refresh are not trapped. */
    releaseUnloadGuard: () => {
      unbindBeforeUnload();
    }
  };
}
