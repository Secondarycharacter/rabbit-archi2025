function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatMarker(marker) {
  return {
    label: marker.label,
    file: marker.file || "",
    position: {
      x: round(marker.position.x),
      y: round(marker.position.y),
      z: round(marker.position.z)
    },
    rotationY: round(marker.rotationY, 4),
    rotationYDeg: round((marker.rotationY * 180) / Math.PI, 1),
    lookTarget: {
      x: round(marker.lookTarget.x),
      y: round(marker.lookTarget.y),
      z: round(marker.lookTarget.z)
    },
    source: marker.source
  };
}

export function createGuestPlacementTool(BABYLON, scene, options = {}) {
  const {
    eyeHeight = 1.7,
    resolveGroundPoint,
    onChange = null
  } = options;

  const markers = [];
  const visuals = [];
  const root = new BABYLON.TransformNode("guest-placement-root", scene);

  function createVisual(marker) {
    const base = BABYLON.MeshBuilder.CreateCylinder(
      `guest-placement-${marker.id}`,
      { height: 0.08, diameter: 0.35, tessellation: 12 },
      scene
    );
    base.parent = root;
    base.position.set(marker.position.x, marker.position.y + 0.04, marker.position.z);

    const arrow = BABYLON.MeshBuilder.CreateCylinder(
      `guest-placement-arrow-${marker.id}`,
      { height: 0.9, diameterTop: 0, diameterBottom: 0.18, tessellation: 8 },
      scene
    );
    arrow.parent = base;
    arrow.position.y = 0.55;
    arrow.rotation.x = Math.PI / 2;
    base.rotation.y = marker.rotationY;

    const material = new BABYLON.StandardMaterial(`guest-placement-mat-${marker.id}`, scene);
    material.emissiveColor = new BABYLON.Color3(0.95, 0.45, 0.2);
    material.alpha = 0.88;
    material.disableLighting = true;
    base.material = material;
    arrow.material = material;

    const labelPlane = BABYLON.MeshBuilder.CreatePlane(
      `guest-placement-label-${marker.id}`,
      { size: 0.9 },
      scene
    );
    labelPlane.parent = base;
    labelPlane.position.y = 1.35;
    labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const texture = new BABYLON.DynamicTexture(
      `guest-placement-label-tex-${marker.id}`,
      { width: 256, height: 96 },
      scene,
      false
    );
    texture.hasAlpha = true;
    texture.drawText(marker.label, null, 56, "bold 28px sans-serif", "#fff", "transparent", true);

    const labelMaterial = new BABYLON.StandardMaterial(`guest-placement-label-mat-${marker.id}`, scene);
    labelMaterial.diffuseTexture = texture;
    labelMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    labelMaterial.backFaceCulling = false;
    labelMaterial.disableLighting = true;
    labelPlane.material = labelMaterial;

    visuals.push({ markerId: marker.id, meshes: [base, arrow, labelPlane], texture });
  }

  function destroyVisual(visual) {
    visual.texture?.dispose?.();
    visual.meshes.forEach((mesh) => mesh.dispose());
  }

  function rebuildVisuals() {
    visuals.splice(0, visuals.length).forEach(destroyVisual);
    markers.forEach(createVisual);
  }

  function buildMarker({
    label,
    file = "",
    x,
    z,
    groundY = null,
    referenceY,
    rotationY,
    source
  }) {
    let resolvedGroundY = groundY;

    if (resolvedGroundY === null) {
      const groundPoint = resolveGroundPoint?.(x, z, referenceY);
      resolvedGroundY = groundPoint?.y ?? (referenceY - eyeHeight);
    }

    const position = new BABYLON.Vector3(x, resolvedGroundY, z);
    const lookTarget = position.add(new BABYLON.Vector3(
      Math.sin(rotationY) * 2,
      0,
      Math.cos(rotationY) * 2
    ));

    const marker = {
      id: markers.length + 1,
      label: label || `Mark-${markers.length + 1}`,
      file,
      position,
      rotationY,
      lookTarget,
      source
    };

    markers.push(marker);
    createVisual(marker);
    onChange?.(getMarkers());
    return marker;
  }

  function captureFromWalk({ eyePosition, rotationY, label = "", file = "" }) {
    return buildMarker({
      label,
      file,
      x: eyePosition.x,
      z: eyePosition.z,
      groundY: eyePosition.y - eyeHeight,
      rotationY,
      source: "walk"
    });
  }

  function captureFromOrbit({ cameraPosition, target, label = "", file = "" }) {
    const dx = target.x - cameraPosition.x;
    const dz = target.z - cameraPosition.z;
    const rotationY = Math.abs(dx) + Math.abs(dz) > 0.0001
      ? Math.atan2(dx, dz)
      : 0;

    return buildMarker({
      label,
      file,
      x: target.x,
      z: target.z,
      referenceY: cameraPosition.y,
      rotationY,
      source: "orbit"
    });
  }

  function undoLast() {
    if (markers.length === 0) {
      return null;
    }

    const removed = markers.pop();
    const visualIndex = visuals.findIndex((visual) => visual.markerId === removed.id);

    if (visualIndex >= 0) {
      destroyVisual(visuals.splice(visualIndex, 1)[0]);
    }

    onChange?.(getMarkers());
    return removed;
  }

  function clear() {
    markers.splice(0, markers.length);
    rebuildVisuals();
    onChange?.(getMarkers());
  }

  function getMarkers() {
    return markers.map(formatMarker);
  }

  function formatJson() {
    return JSON.stringify(getMarkers(), null, 2);
  }

  async function copyToClipboard() {
    const text = formatJson();
    await navigator.clipboard.writeText(text);
    return text;
  }

  function destroy() {
    clear();
    root.dispose();
  }

  return {
    captureFromWalk,
    captureFromOrbit,
    undoLast,
    clear,
    getMarkers,
    formatJson,
    copyToClipboard,
    destroy
  };
}
