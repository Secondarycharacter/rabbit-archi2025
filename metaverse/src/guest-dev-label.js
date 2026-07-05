/** Minimum label height from feet in world space. */
export const GUEST_NUMBER_LABEL_HEIGHT = 1.26;

/** Extra clearance above the scaled mesh top. */
export const GUEST_NUMBER_LABEL_HEAD_CLEARANCE = 0.12;

/** Billboard size in world space (meters). */
export const GUEST_NUMBER_LABEL_WORLD_SIZE = 0.9;

const GUEST_NUMBER_LABEL_BASE_PLANE_SIZE = 0.9;

export function getGuestDevLabelFitScale(guest) {
  return guest?.fitScale ?? guest?.root?.scaling?.y ?? 1;
}

export function getGuestDevLabelMetrics(guest) {
  const fitScale = getGuestDevLabelFitScale(guest);
  const safeFitScale = Math.max(fitScale, 0.001);
  const rawHeight = guest?.rawHeight;
  const scaledHeight = typeof rawHeight === "number" && rawHeight > 0
    ? rawHeight * safeFitScale
    : GUEST_NUMBER_LABEL_HEIGHT;
  const worldY = Math.max(
    GUEST_NUMBER_LABEL_HEIGHT,
    scaledHeight + GUEST_NUMBER_LABEL_HEAD_CLEARANCE
  );

  return {
    fitScale: safeFitScale,
    worldY,
    localY: worldY / safeFitScale,
    planeScale: 1 / safeFitScale
  };
}

export function createGuestDevLabel(BABYLON, scene, guest, labelText) {
  if (!labelText) {
    return null;
  }

  const texture = new BABYLON.DynamicTexture(
    `guest-label-tex-${guest.spawn.id}`,
    { width: 256, height: 96 },
    scene,
    false
  );
  texture.hasAlpha = true;
  texture.drawText(labelText, null, 56, "bold 28px sans-serif", "#ffffff", "transparent", true);

  const material = new BABYLON.StandardMaterial(`guest-label-mat-${guest.spawn.id}`, scene);
  material.diffuseTexture = texture;
  material.emissiveColor = new BABYLON.Color3(1, 1, 1);
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.useAlphaFromDiffuseTexture = true;

  const plane = BABYLON.MeshBuilder.CreatePlane(
    `guest-label-${guest.spawn.id}`,
    { size: GUEST_NUMBER_LABEL_BASE_PLANE_SIZE },
    scene
  );
  plane.material = material;
  plane.parent = guest.root;
  plane.isPickable = false;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  updateGuestDevLabelHeight(guest, plane);

  plane.setEnabled(false);

  return { plane, texture, material };
}

export function updateGuestDevLabelHeight(guest, plane = guest.devLabel?.plane) {
  if (!plane || !guest) {
    return;
  }

  const { localY, planeScale } = getGuestDevLabelMetrics(guest);
  plane.position.set(0, localY, 0);
  plane.scaling.set(planeScale, planeScale, 1);
}

export function setGuestDevLabelVisible(guest, enabled) {
  guest.devLabel?.plane?.setEnabled(Boolean(enabled && guest.spawn?.devLabel));
}

export function disposeGuestDevLabel(guest) {
  guest.devLabel?.plane?.dispose();
  guest.devLabel?.material?.dispose();
  guest.devLabel?.texture?.dispose();
  guest.devLabel = null;
}
