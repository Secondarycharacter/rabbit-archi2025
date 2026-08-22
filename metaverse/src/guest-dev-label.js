/** Extra world-space gap above the live mesh top (head). */
export const GUEST_NUMBER_LABEL_HEAD_CLEARANCE = 0.25;

/** Billboard width/height in world meters. */
export const GUEST_NUMBER_LABEL_WORLD_SIZE = 0.55;

function getGuestFitScale(guest) {
  return Math.max(guest?.fitScale ?? guest?.root?.scaling?.y ?? 1, 0.001);
}

function isGuestLabelMesh(mesh) {
  const name = String(mesh?.name || "");
  return name.includes("guest-label") || name.includes("guest-energy");
}

/** Live head height in guest-root local units (feet at y=0). */
export function getGuestHeadLocalY(guest) {
  const root = guest?.root;
  const fitScale = getGuestFitScale(guest);

  if (!root) {
    return 1.75 / fitScale;
  }

  const rootY = root.getAbsolutePosition?.()?.y;
  const meshes = guest?.meshes || [];
  let maxWorldY = Number.isFinite(rootY) ? rootY : 0;
  let found = false;

  meshes.forEach((mesh) => {
    if (!mesh || mesh.isDisposed?.() || isGuestLabelMesh(mesh)) {
      return;
    }

    if (mesh.isEnabled?.() === false) {
      return;
    }

    const box = mesh.getBoundingInfo?.()?.boundingBox;

    if (!box || !Number.isFinite(box.maximumWorld?.y)) {
      return;
    }

    if (!found || box.maximumWorld.y > maxWorldY) {
      maxWorldY = box.maximumWorld.y;
      found = true;
    }
  });

  const worldHeight = found && Number.isFinite(rootY)
    ? maxWorldY - rootY
    : (typeof guest?.rawHeight === "number" && guest.rawHeight > 0
      ? guest.rawHeight * fitScale
      : 1.75);

  return Math.max(worldHeight, 0.4) / fitScale;
}

export function getGuestDevLabelFitScale(guest) {
  return getGuestFitScale(guest);
}

export function getGuestDevLabelMetrics(guest) {
  const fitScale = getGuestFitScale(guest);
  const headLocalY = getGuestHeadLocalY(guest);
  const localY = headLocalY + GUEST_NUMBER_LABEL_HEAD_CLEARANCE / fitScale;

  return {
    fitScale,
    localY,
    planeScale: 1 / fitScale,
    worldY: localY * fitScale
  };
}

export function getGuestLabelWorldPosition(guest) {
  if (!guest?.root) {
    return null;
  }

  guest.root.computeWorldMatrix(true);
  const guestPos = guest.root.getAbsolutePosition();
  const { worldY } = getGuestDevLabelMetrics(guest);

  return {
    x: guestPos.x,
    y: guestPos.y + worldY,
    z: guestPos.z
  };
}

/** Screen pixels for a fixed-position HTML overlay aligned to the WebGL canvas. */
export function projectWorldPointToScreen(BABYLON, scene, camera, worldPosition) {
  const engine = scene.getEngine?.();
  const canvas = engine?.getRenderingCanvas?.();

  if (!engine || !canvas || !camera || !worldPosition) {
    return null;
  }

  const world = worldPosition.clone?.()
    || new BABYLON.Vector3(worldPosition.x, worldPosition.y, worldPosition.z);

  const projected = BABYLON.Vector3.Project(
    world,
    BABYLON.Matrix.Identity(),
    scene.getTransformMatrix(),
    camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
  );

  const rect = canvas.getBoundingClientRect();
  const renderWidth = Math.max(engine.getRenderWidth(), 1);
  const renderHeight = Math.max(engine.getRenderHeight(), 1);
  const scaleX = rect.width / renderWidth;
  const scaleY = rect.height / renderHeight;

  return {
    x: rect.left + projected.x * scaleX,
    y: rect.top + projected.y * scaleY,
    depth: projected.z,
    visible: projected.z >= 0 && projected.z <= 1
  };
}

export function getGuestDialogAnchorWorldPosition(guest, clearance = 0.35) {
  if (!guest?.root) {
    return null;
  }

  guest.root.computeWorldMatrix(true);
  const guestPos = guest.root.getAbsolutePosition();
  const fitScale = Math.max(guest.fitScale || 1, 0.001);
  const headLocalY = getGuestHeadLocalY(guest);

  return {
    x: guestPos.x,
    y: guestPos.y + headLocalY * fitScale + clearance,
    z: guestPos.z
  };
}

function isGuestBodyMeshForOcclusion(mesh, guest) {
  if (!mesh || isGuestLabelMesh(mesh)) {
    return false;
  }

  if (guest?.meshes?.includes(mesh)) {
    return false;
  }

  if (mesh.metadata?.tourGuest) {
    return false;
  }

  return true;
}

/** Hide guest name labels when collision geometry (COL) blocks the camera view. */
export function isGuestDevLabelOccluded(BABYLON, scene, guest, camera, collisionMeshSet) {
  if (!collisionMeshSet?.size || !guest?.root || !camera?.position) {
    return false;
  }

  const labelWorld = getGuestLabelWorldPosition(guest);

  if (!labelWorld) {
    return false;
  }

  const origin = camera.position;
  const target = new BABYLON.Vector3(labelWorld.x, labelWorld.y, labelWorld.z);
  const delta = target.subtract(origin);
  const distance = delta.length();

  if (distance <= 0.05) {
    return false;
  }

  const direction = delta.normalize();
  const ray = new BABYLON.Ray(origin, direction, Math.max(0.05, distance - 0.2));
  const hit = scene.pickWithRay(ray, (mesh) => (
    collisionMeshSet.has(mesh)
    && mesh.isEnabled?.()
    && mesh.isPickable
    && !mesh.metadata?.passThrough
    && isGuestBodyMeshForOcclusion(mesh, guest)
  ));

  return Boolean(hit?.hit);
}

export function createGuestDevLabel(BABYLON, scene, guest, labelText) {
  if (!labelText || !guest?.root) {
    return null;
  }

  const texture = new BABYLON.DynamicTexture(
    `guest-label-tex-${guest.spawn.id}`,
    { width: 256, height: 96 },
    scene,
    false
  );
  texture.hasAlpha = true;
  texture.drawText(String(labelText), null, 64, "bold 48px sans-serif", "#ffffff", "transparent", true);

  const material = new BABYLON.StandardMaterial(`guest-label-mat-${guest.spawn.id}`, scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.emissiveColor = new BABYLON.Color3(1, 1, 1);
  material.specularColor = new BABYLON.Color3(0, 0, 0);
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  material.useAlphaFromDiffuseTexture = true;
  material.disableDepthWrite = true;

  const root = new BABYLON.TransformNode(`guest-label-root-${guest.spawn.id}`, scene);
  root.parent = guest.root;
  root.isPickable = false;

  const plane = BABYLON.MeshBuilder.CreatePlane(
    `guest-label-${guest.spawn.id}`,
    { size: GUEST_NUMBER_LABEL_WORLD_SIZE },
    scene
  );
  plane.material = material;
  plane.parent = root;
  plane.isPickable = false;
  plane.checkCollisions = false;
  plane.applyFog = false;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  plane.renderingGroupId = 1;
  plane.alwaysSelectAsActiveMesh = true;

  const label = { root, plane, texture, material };
  guest.devLabel = label;
  updateGuestDevLabelHeight(guest, label);
  root.setEnabled(false);
  plane.setEnabled(false);

  return label;
}

export function updateGuestDevLabelHeight(guest, label = guest.devLabel) {
  const root = label?.root || guest?.devLabel?.root;
  const plane = label?.plane || guest?.devLabel?.plane;

  if (!root || !guest) {
    return;
  }

  const { localY, planeScale } = getGuestDevLabelMetrics(guest);
  const hoverScale = Number.isFinite(label?.interactionHoverScale)
    ? label.interactionHoverScale
    : (Number.isFinite(guest?.devLabel?.interactionHoverScale)
      ? guest.devLabel.interactionHoverScale
      : 1);
  const scale = planeScale * Math.max(hoverScale, 0.01);

  root.position.set(0, localY, 0);
  root.scaling.set(planeScale, planeScale, planeScale);

  // Hover scale applies on the billboard plane so parent fitScale stays stable.
  if (plane) {
    plane.scaling.set(hoverScale, hoverScale, hoverScale);
  } else {
    root.scaling.set(scale, scale, scale);
  }
}

export function setGuestDevLabelText(guest, labelText) {
  const label = guest?.devLabel;
  const text = String(labelText || "").trim();

  if (!label?.texture || !text) {
    return false;
  }

  label.texture.clear();
  label.texture.drawText(text, null, 64, "bold 48px sans-serif", "#ffffff", "transparent", true);
  label.labelText = text;
  return true;
}

export function setGuestDevLabelVisible(guest, enabled) {
  const visible = Boolean(enabled && guest?.devLabel);
  guest?.devLabel?.root?.setEnabled(visible);
  guest?.devLabel?.plane?.setEnabled(visible);
}

export function disposeGuestDevLabel(guest) {
  if (!guest) {
    return;
  }

  guest.devLabel?.plane?.dispose();
  guest.devLabel?.material?.dispose();
  guest.devLabel?.texture?.dispose();
  guest.devLabel?.root?.dispose();
  guest.devLabel = null;
}
