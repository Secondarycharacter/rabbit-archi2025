/**
 * Editor-only Event / Teleport / Tour markers. Hidden in NORMAL MODE.
 */

const COLORS = {
  dialogue: "#4aa3ff",
  game: "#ff8a3d",
  minigame: "#c084fc",
  information: "#5eead4",
  interaction: "#86efac",
  teleport: "#fbbf24",
  tour: "#f4f1e8",
  facing: "#ff6b35"
};

function markerColor(record) {
  if (record?.type === "teleport") {
    return COLORS.teleport;
  }

  if (record?.type === "tour") {
    return COLORS.tour;
  }

  return COLORS[record?.eventType] || COLORS.interaction;
}

function markerTag(record) {
  if (record?.type === "teleport") {
    return "TP";
  }

  if (record?.type === "tour") {
    return "TOUR";
  }

  const tags = {
    dialogue: "DLG",
    game: "GAME",
    minigame: "MINI",
    information: "INFO",
    interaction: "TRIG"
  };

  return tags[record?.eventType] || "EVT";
}

function wantsFacingArrow(record) {
  return record?.type === "tour";
}

export function createSceneMarkerRuntime(BABYLON, scene) {
  const markers = new Map();
  let visible = false;

  function disposeMarker(entry) {
    entry?.labelTexture?.dispose?.();
    entry?.facingRoot?.dispose?.(false, true);
    entry?.root?.dispose?.(false, true);
  }

  function applyMetadata(mesh, record) {
    mesh.metadata = {
      ...(mesh.metadata || {}),
      editorMarker: true,
      markerId: record.id,
      markerKind: record.type
    };
  }

  function buildLabelTexture(record) {
    const texture = new BABYLON.DynamicTexture(`editor-marker-label-${record.id}`, {
      width: 256,
      height: 64
    }, scene, false);
    const ctx = texture.getContext();
    ctx.fillStyle = "rgba(8, 14, 26, 0.88)";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const title = `${markerTag(record)} ${record.name || record.id}`.slice(0, 22);
    ctx.fillText(title, 128, 32);
    texture.update();
    return texture;
  }

  function createFacingArrow(recordId, parent) {
    const root = new BABYLON.TransformNode(`editor-marker-facing-${recordId}`, scene);
    root.parent = parent;

    const mat = new BABYLON.StandardMaterial(`editor-marker-facing-mat-${recordId}`, scene);
    mat.emissiveColor = BABYLON.Color3.FromHexString(COLORS.facing);
    mat.diffuseColor = BABYLON.Color3.FromHexString(COLORS.facing);
    mat.specularColor = BABYLON.Color3.Black();
    mat.disableLighting = true;
    mat.backFaceCulling = false;

    const shaft = BABYLON.MeshBuilder.CreateBox(`editor-marker-facing-shaft-${recordId}`, {
      width: 0.1,
      height: 0.04,
      depth: 0.7
    }, scene);
    shaft.parent = root;
    shaft.position.y = 0.08;
    shaft.position.z = 0.35;
    shaft.material = mat;
    shaft.isPickable = false;

    const head = BABYLON.MeshBuilder.CreateCylinder(`editor-marker-facing-head-${recordId}`, {
      diameterTop: 0,
      diameterBottom: 0.32,
      height: 0.34,
      tessellation: 3
    }, scene);
    head.parent = root;
    head.rotation.x = Math.PI / 2;
    head.position.y = 0.08;
    head.position.z = 0.88;
    head.material = mat;
    head.isPickable = false;

    // Ground tip so facing stays readable from orbit.
    const tip = BABYLON.MeshBuilder.CreateDisc(`editor-marker-facing-tip-${recordId}`, {
      radius: 0.16,
      tessellation: 3
    }, scene);
    tip.parent = root;
    tip.rotation.x = Math.PI / 2;
    tip.position.y = 0.05;
    tip.position.z = 0.95;
    tip.material = mat;
    tip.isPickable = false;

    return root;
  }

  function ensureFacingArrow(entry, record) {
    if (wantsFacingArrow(record)) {
      if (!entry.facingRoot) {
        entry.facingRoot = createFacingArrow(record.id, entry.root);
      }

      entry.facingRoot.setEnabled(true);
      return;
    }

    if (entry.facingRoot) {
      entry.facingRoot.setEnabled(false);
    }
  }

  function createMarker(record) {
    const root = BABYLON.MeshBuilder.CreateBox(`editor-marker-${record.id}`, {
      size: 0.2
    }, scene);
    root.isVisible = false;
    root.isPickable = false;
    const color = BABYLON.Color3.FromHexString(markerColor(record));
    const material = new BABYLON.StandardMaterial(`editor-marker-mat-${record.id}`, scene);
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.55);
    material.specularColor = BABYLON.Color3.Black();
    material.disableLighting = true;

    const pole = BABYLON.MeshBuilder.CreateCylinder(`editor-marker-pole-${record.id}`, {
      height: 1.5,
      diameter: 0.08
    }, scene);
    pole.parent = root;
    pole.position.y = 0.75;
    pole.material = material;
    pole.isPickable = true;

    const head = BABYLON.MeshBuilder.CreateSphere(`editor-marker-head-${record.id}`, {
      diameter: 0.42
    }, scene);
    head.parent = root;
    head.position.y = 1.55;
    head.material = material;
    head.isPickable = true;

    const base = BABYLON.MeshBuilder.CreateCylinder(`editor-marker-base-${record.id}`, {
      height: 0.06,
      diameter: 0.7
    }, scene);
    base.parent = root;
    base.position.y = 0.03;
    base.material = material;
    base.isPickable = true;

    const label = BABYLON.MeshBuilder.CreatePlane(`editor-marker-label-${record.id}`, {
      width: 1.8,
      height: 0.45
    }, scene);
    label.parent = root;
    label.position.y = 2.05;
    label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    label.isPickable = false;
    const labelTexture = buildLabelTexture(record);
    const labelMat = new BABYLON.StandardMaterial(`editor-marker-label-mat-${record.id}`, scene);
    labelMat.diffuseTexture = labelTexture;
    labelMat.emissiveTexture = labelTexture;
    labelMat.opacityTexture = labelTexture;
    labelMat.backFaceCulling = false;
    labelMat.disableLighting = true;
    label.material = labelMat;

    [root, pole, head, base, label].forEach((mesh) => applyMetadata(mesh, record));

    root.setEnabled(visible);

    const entry = {
      id: record.id,
      kind: record.type,
      root,
      head,
      label,
      labelTexture,
      material,
      facingRoot: null
    };

    ensureFacingArrow(entry, record);
    markers.set(record.id, entry);
    applyRecord(entry, record);
    return entry;
  }

  function applyRecord(entry, record) {
    const pos = record.transform?.position || { x: 0, y: 0, z: 0 };
    entry.root.position.set(pos.x, pos.y, pos.z);
    entry.root.rotation.y = (Number(record.transform?.rotationY || 0) * Math.PI) / 180;
    const color = BABYLON.Color3.FromHexString(markerColor(record));
    entry.material.diffuseColor = color;
    entry.material.emissiveColor = color.scale(0.55);
    entry.kind = record.type;
    ensureFacingArrow(entry, record);
    entry.labelTexture.dispose();
    entry.labelTexture = buildLabelTexture(record);
    if (entry.label.material) {
      entry.label.material.diffuseTexture = entry.labelTexture;
      entry.label.material.emissiveTexture = entry.labelTexture;
      entry.label.material.opacityTexture = entry.labelTexture;
    }
  }

  function sync(records = []) {
    const wanted = new Set(records.map((record) => record.id));

    [...markers.keys()].forEach((id) => {
      if (!wanted.has(id)) {
        disposeMarker(markers.get(id));
        markers.delete(id);
      }
    });

    records.forEach((record) => {
      const existing = markers.get(record.id);

      if (existing) {
        applyRecord(existing, record);
        applyMetadata(existing.root, record);
        applyMetadata(existing.head, record);
      } else {
        createMarker(record);
      }
    });
  }

  function recordFromRoot(entry) {
    return {
      position: {
        x: entry.root.position.x,
        y: entry.root.position.y,
        z: entry.root.position.z
      },
      rotationY: (entry.root.rotation.y * 180) / Math.PI
    };
  }

  function findFromMesh(mesh) {
    let current = mesh;

    while (current) {
      const id = current.metadata?.markerId;

      if (id && markers.has(id)) {
        return markers.get(id);
      }

      current = current.parent;
    }

    return null;
  }

  function setVisible(nextVisible) {
    visible = Boolean(nextVisible);
    markers.forEach((entry) => {
      entry.root.setEnabled(visible);
    });
  }

  function getEntry(id) {
    return markers.get(id) || null;
  }

  function dispose() {
    markers.forEach((entry) => disposeMarker(entry));
    markers.clear();
  }

  return {
    sync,
    setVisible,
    getEntry,
    findFromMesh,
    recordFromRoot,
    dispose,
    getIds: () => [...markers.keys()]
  };
}
