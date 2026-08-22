/**
 * World-space billboard names for RLB fixtures while the tuning panel is open.
 */

import { formatRlbLightLabel } from "./rlb-shader-tuning.js?v=rlb-shader-proximity-20260818-group-v29";

const LABEL_WIDTH = 256;
const LABEL_HEIGHT = 64;
const BASE_PLANE_SIZE = 0.72;
const TEXTURE_CACHE = new Map();

function truncateLabel(text, max = 22) {
  const value = String(text || "").trim();

  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

function getLabelWorldPosition(BABYLON, entry) {
  const pos = entry?.position;
  const x = Number.isFinite(pos?.x) ? pos.x : 0;
  const y = Number.isFinite(pos?.y) ? pos.y : 0;
  const z = Number.isFinite(pos?.z) ? pos.z : 0;
  let lift = 0.32;
  const mesh = entry?.mesh;

  if (mesh?.getBoundingInfo) {
    const extendY = mesh.getBoundingInfo()?.boundingBox?.extendSizeWorld?.y;
    if (Number.isFinite(extendY)) {
      lift = Math.max(0.22, extendY + 0.14);
    }
  }

  return new BABYLON.Vector3(x, y + lift, z);
}

function drawLabelTexture(texture, text, mode) {
  const ctx = texture.getContext();
  const { width, height } = texture.getSize();
  ctx.clearRect(0, 0, width, height);

  const focused = mode === "focused";
  const hovered = mode === "hovered";
  const radius = focused ? 22 : 18;
  const padX = 16;
  const padY = focused ? 8 : 12;
  ctx.beginPath();
  ctx.moveTo(padX + radius, padY);
  ctx.arcTo(width - padX, padY, width - padX, height - padY, radius);
  ctx.arcTo(width - padX, height - padY, padX, height - padY, radius);
  ctx.arcTo(padX, height - padY, padX, padY, radius);
  ctx.arcTo(padX, padY, width - padX, padY, radius);
  ctx.closePath();
  ctx.fillStyle = focused
    ? "rgba(255, 214, 110, 0.96)"
    : hovered
      ? "rgba(255, 232, 176, 0.9)"
      : "rgba(8, 16, 32, 0.82)";
  ctx.fill();

  if (focused || hovered) {
    ctx.strokeStyle = focused ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 210, 120, 0.85)";
    ctx.lineWidth = focused ? 4 : 2;
    ctx.stroke();
  }

  ctx.fillStyle = focused || hovered ? "#1a1408" : "#ffe8b0";
  ctx.font = focused ? "bold 30px sans-serif" : "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(truncateLabel(text, focused ? 18 : 22), width / 2, height / 2 + 1);
  texture.update();
}

function getSharedTexture(BABYLON, scene, text, mode) {
  const key = `${mode}:${text}`;
  const cached = TEXTURE_CACHE.get(key);

  if (cached && !cached.isDisposed) {
    return cached;
  }

  const texture = new BABYLON.DynamicTexture(
    `rlb-light-name-tex-${TEXTURE_CACHE.size}`,
    { width: LABEL_WIDTH, height: LABEL_HEIGHT },
    scene,
    false
  );
  texture.hasAlpha = true;
  drawLabelTexture(texture, text, mode);
  TEXTURE_CACHE.set(key, texture);
  return texture;
}

function disposeSharedTextures() {
  TEXTURE_CACHE.forEach((texture) => {
    texture.dispose?.();
  });
  TEXTURE_CACHE.clear();
}

export function createRlbLightNameLabelLayer(BABYLON, scene, lightEntries, getLabelText) {
  const labels = [];
  let visible = false;
  let focusedId = null;
  let hoveredId = null;
  let pulse = 0;
  let observer = null;

  (lightEntries || []).forEach((entry, index) => {
    if (!entry?.lightId) {
      return;
    }

    const text = truncateLabel(
      (typeof getLabelText === "function" ? getLabelText(entry, index) : null)
        || formatRlbLightLabel(entry, index + 1),
      22
    );
    const material = new BABYLON.StandardMaterial(`rlb-light-name-mat-${entry.lightId}`, scene);
    material.diffuseTexture = getSharedTexture(BABYLON, scene, text, "idle");
    material.emissiveColor = new BABYLON.Color3(1, 0.94, 0.72);
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    material.needDepthPrePass = false;

    const plane = BABYLON.MeshBuilder.CreatePlane(
      `rlb-light-name-${entry.lightId}`,
      { width: BASE_PLANE_SIZE * (LABEL_WIDTH / LABEL_HEIGHT) * 0.42, height: BASE_PLANE_SIZE * 0.42 },
      scene
    );
    plane.material = material;
    plane.isPickable = false;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane.renderingGroupId = 1;
    plane.setEnabled(false);
    plane.position.copyFrom(getLabelWorldPosition(BABYLON, entry));

    labels.push({
      id: entry.lightId,
      entry,
      text,
      plane,
      material,
      mode: "idle"
    });
  });

  const applyMode = (label, mode) => {
    if (label.mode === mode) {
      return;
    }

    label.mode = mode;
    label.material.diffuseTexture = getSharedTexture(BABYLON, scene, label.text, mode);
    const focused = mode === "focused";
    label.plane.renderingGroupId = focused ? 3 : 1;
    label.material.disableDepthWrite = focused;
    if (typeof BABYLON.Constants?.ALWAYS === "number") {
      label.material.depthFunction = focused
        ? BABYLON.Constants.ALWAYS
        : BABYLON.Constants.LEQUAL;
    }
  };

  const updateLabel = (label, dt) => {
    const plane = label.plane;

    if (!visible) {
      if (plane.isEnabled()) {
        plane.setEnabled(false);
      }
      return;
    }

    if (!plane.isEnabled()) {
      plane.setEnabled(true);
    }

    plane.position.copyFrom(getLabelWorldPosition(BABYLON, label.entry));

    const isFocused = label.id === focusedId;
    const isHovered = !isFocused && label.id === hoveredId;
    applyMode(label, isFocused ? "focused" : (isHovered ? "hovered" : "idle"));

    const hoverPulse = 1 + Math.sin(pulse * 7) * 0.08;
    const focusPulse = 1 + Math.sin(pulse * 5.5) * 0.05;
    const scale = isFocused
      ? 2 * focusPulse
      : isHovered
        ? 1.28 * hoverPulse
        : 1;

    plane.scaling.set(scale, scale, 1);
    void dt;
  };

  const ensureObserver = () => {
    if (observer || !labels.length) {
      return;
    }

    observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      pulse += dt;
      labels.forEach((label) => updateLabel(label, dt));
    });
  };

  const stopObserver = () => {
    if (!observer) {
      return;
    }

    scene.onBeforeRenderObservable.remove(observer);
    observer = null;
  };

  return {
    setVisible(nextVisible) {
      visible = Boolean(nextVisible);

      if (visible) {
        ensureObserver();
        return;
      }

      focusedId = null;
      hoveredId = null;
      labels.forEach((label) => {
        applyMode(label, "idle");
        label.plane.scaling.set(1, 1, 1);
        label.plane.setEnabled(false);
      });
      stopObserver();
    },
    setFocused(lightId) {
      focusedId = lightId || null;
      if (visible) {
        ensureObserver();
      }
    },
    setHovered(lightId) {
      hoveredId = lightId || null;
      if (visible) {
        ensureObserver();
      }
    },
    dispose() {
      stopObserver();
      labels.forEach((label) => {
        label.plane.dispose();
        label.material.dispose();
      });
      labels.length = 0;
      disposeSharedTextures();
    }
  };
}
