/**
 * Live mini preview of NPC dialog camera for the scene editor inspector.
 * Renders a scaled-down view matching the main game canvas aspect ratio
 * (monitor/window) and dialog FOV — without touching the orbit camera.
 */

import { getGuestHeadLocalY } from "../guest-dev-label.js?v=angji-guest-labels-20260823";
import {
  normalizeNpcDialogCameraSettings,
  resolveNpcDialogCameraFraming,
  resolvePreviewPlayerEye
} from "../npc-dialog-camera.js?v=npc-dialog-cam-lateral-20260905";

const DEFAULT_DIALOG_FOV = (72 * Math.PI) / 180;
const PREVIEW_MAX_HEIGHT_PX = 320;

export function createNpcDialogCameraPreview(BABYLON, scene, options = {}) {
  const {
    eyeHeight = 1.7,
    getGuestById = () => null,
    getPreviewFov = null
  } = options;

  const engine = scene.getEngine?.();
  let previewCamera = null;
  let renderTarget = null;
  let previewCanvas = null;
  let previewScreen = null;
  let guestId = null;
  let latestSettings = normalizeNpcDialogCameraSettings();
  let observer = null;
  let disposed = false;
  let blitPending = false;
  let lastBlitAt = 0;
  const BLIT_INTERVAL_MS = 100;

  function resolvePreviewFov() {
    if (typeof getPreviewFov === "function") {
      const value = Number(getPreviewFov());
      if (Number.isFinite(value) && value > 0.05) {
        return value;
      }
    }

    return DEFAULT_DIALOG_FOV;
  }

  function ensureCamera() {
    if (previewCamera) {
      return previewCamera;
    }

    previewCamera = new BABYLON.FreeCamera(
      "npcDialogPreviewCam",
      new BABYLON.Vector3(0, 2, -4),
      scene,
      false
    );
    previewCamera.minZ = 0.05;
    previewCamera.maxZ = 5000;
    previewCamera.fov = resolvePreviewFov();
    previewCamera.fovMode = BABYLON.Camera.FOVMODE_VERTICAL_FIXED;
    previewCamera.inputs?.clear?.();
    previewCamera.layerMask = 0x0fffffff;
    return previewCamera;
  }

  function resolveMainAspect() {
    const main = engine?.getRenderingCanvas?.();
    const mainW = Math.max(1, main?.clientWidth || main?.width || 1920);
    const mainH = Math.max(1, main?.clientHeight || main?.height || 1080);
    return {
      mainW,
      mainH,
      aspect: mainW / mainH
    };
  }

  /**
   * Fill the dialog-camera column width, keep live monitor aspect.
   * Height is derived from width; capped only for extreme ultrawide hosts.
   */
  function resolvePixelSize() {
    const { mainW, mainH, aspect } = resolveMainAspect();
    const host = previewScreen || previewCanvas?.parentElement;
    const hostW = Math.max(140, Math.floor(host?.clientWidth || 260));
    const maxH = PREVIEW_MAX_HEIGHT_PX;

    let cssWidth = hostW;
    let cssHeight = Math.max(72, Math.round(cssWidth / aspect));

    if (cssHeight > maxH) {
      cssHeight = maxH;
      cssWidth = Math.max(120, Math.round(cssHeight * aspect));
      if (cssWidth > hostW) {
        cssWidth = hostW;
        cssHeight = Math.max(72, Math.round(cssWidth / aspect));
      }
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    return {
      aspect,
      cssWidth,
      cssHeight,
      pixelW: Math.max(160, Math.round(cssWidth * dpr)),
      pixelH: Math.max(90, Math.round(cssHeight * dpr)),
      mainW,
      mainH
    };
  }

  function syncCanvasCss(size) {
    if (!previewCanvas) {
      return;
    }

    if (previewScreen) {
      previewScreen.style.width = "100%";
      previewScreen.style.height = `${size.cssHeight}px`;
      previewScreen.style.maxWidth = "100%";
      previewScreen.style.aspectRatio = `${size.mainW} / ${size.mainH}`;
    }

    previewCanvas.style.width = "100%";
    previewCanvas.style.height = "100%";
    previewCanvas.style.display = "block";
    previewCanvas.style.objectFit = "contain";
    previewCanvas.removeAttribute("width");
    previewCanvas.removeAttribute("height");

    if (previewCanvas.width !== size.pixelW || previewCanvas.height !== size.pixelH) {
      previewCanvas.width = size.pixelW;
      previewCanvas.height = size.pixelH;
    }
  }

  function ensureRenderTarget(size) {
    const camera = ensureCamera();

    if (
      renderTarget
      && renderTarget.getSize().width === size.pixelW
      && renderTarget.getSize().height === size.pixelH
    ) {
      renderTarget.activeCamera = camera;
      return renderTarget;
    }

    if (renderTarget) {
      renderTarget.dispose();
      renderTarget = null;
    }

    renderTarget = new BABYLON.RenderTargetTexture(
      "npcDialogPreviewRtt",
      { width: size.pixelW, height: size.pixelH },
      scene,
      false,
      true
    );
    renderTarget.activeCamera = camera;
    renderTarget.ignoreCameraViewport = true;
    return renderTarget;
  }

  function readSettingsFromRoot(root) {
    if (!root) {
      return latestSettings;
    }

    return normalizeNpcDialogCameraSettings({
      ...latestSettings,
      hidePlayerDuringDialog: root.querySelector('[name="npcHidePlayer"]')?.checked,
      dialogDistance: root.querySelector('[name="npcDialogDistance"]')?.value ?? latestSettings.dialogDistance,
      cameraHeight: root.querySelector('[name="npcCamHeight"]')?.value,
      cameraLookLift: root.querySelector('[name="npcCamLookLift"]')?.value,
      cameraLateralOffset: root.querySelector('[name="npcCamLateral"]')?.value,
      cameraYawOffset: root.querySelector('[name="npcCamYaw"]')?.value,
      cameraPitchOffset: root.querySelector('[name="npcCamPitch"]')?.value,
      cameraDistance: root.querySelector('[name="npcCamDistance"]')?.value
    });
  }

  function applyFraming(settings) {
    const guest = getGuestById(guestId);
    const camera = ensureCamera();

    if (!guest?.root) {
      return false;
    }

    guest.root.computeWorldMatrix(true);
    const guestPos = guest.root.getAbsolutePosition();
    const playerEye = resolvePreviewPlayerEye(
      BABYLON,
      guestPos,
      guest.root.rotation?.y ?? guest.spawn?.rotationY ?? 0,
      settings.dialogDistance,
      eyeHeight
    );
    const framing = resolveNpcDialogCameraFraming(BABYLON, {
      guestPosition: guestPos,
      guestHeadLocalY: getGuestHeadLocalY(guest),
      fitScale: guest.fitScale || 1,
      playerEyePosition: playerEye,
      eyeHeight,
      settings
    });

    camera.fov = resolvePreviewFov();
    camera.position.copyFrom(framing.cam);
    camera.setTarget(framing.look);
    return true;
  }

  function flipYImageData(source, width, height) {
    const out = new Uint8ClampedArray(source.length);
    const row = width * 4;

    for (let y = 0; y < height; y += 1) {
      const src = y * row;
      const dst = (height - 1 - y) * row;
      out.set(source.subarray(src, src + row), dst);
    }

    return out;
  }

  function blitToCanvas(size) {
    if (!renderTarget || !previewCanvas || blitPending) {
      return;
    }

    blitPending = true;
    const width = size.pixelW;
    const height = size.pixelH;

    Promise.resolve(renderTarget.readPixels())
      .then((buffer) => {
        blitPending = false;

        if (disposed || !previewCanvas || !buffer) {
          return;
        }

        const raw = buffer instanceof Uint8Array
          ? buffer
          : new Uint8Array(buffer.buffer || buffer);
        const pixels = flipYImageData(raw, width, height);
        const ctx = previewCanvas.getContext("2d");

        if (!ctx) {
          return;
        }

        // Clear then draw so letterboxing never leaves stale pixels.
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        const imageData = new ImageData(pixels, width, height);
        ctx.putImageData(imageData, 0, 0);
      })
      .catch(() => {
        blitPending = false;
      });
  }

  function formatAspectLabel(size) {
    const ratio = size.aspect;
    const known = [
      [16 / 9, "16:9"],
      [16 / 10, "16:10"],
      [21 / 9, "21:9"],
      [4 / 3, "4:3"],
      [3 / 2, "3:2"]
    ];
    const match = known.find(([value]) => Math.abs(value - ratio) < 0.03);
    return match ? match[1] : `${size.mainW}×${size.mainH}`;
  }

  function updateHint(root, settings, size = null) {
    const hint = root?.querySelector?.('[data-role="dialog-cam-preview-hint"]');

    if (!hint) {
      return;
    }

    const aspectText = size ? formatAspectLabel(size) : "화면 비율";
    const hideText = settings.hidePlayerDuringDialog ? "플레이어 숨김" : "플레이어 표시";
    hint.textContent = `모니터 ${aspectText} 축소 미리보기 · ${hideText}`;
  }

  function onAfterRender() {
    if (disposed || !previewCanvas || !guestId || !engine) {
      return;
    }

    const now = performance.now();

    if (now - lastBlitAt < BLIT_INTERVAL_MS) {
      return;
    }

    lastBlitAt = now;

    const root = previewCanvas.closest?.("[data-role='inspector']");
    latestSettings = readSettingsFromRoot(root);

    if (!applyFraming(latestSettings)) {
      return;
    }

    const size = resolvePixelSize();
    syncCanvasCss(size);
    updateHint(root, latestSettings, size);
    const rtt = ensureRenderTarget(size);
    rtt.renderList = scene.meshes;
    rtt.render(false, false);
    blitToCanvas(size);
  }

  function bindObserver() {
    if (observer || !scene?.onAfterRenderObservable) {
      return;
    }

    observer = scene.onAfterRenderObservable.add(onAfterRender);
  }

  function unbindObserver() {
    if (!observer || !scene?.onAfterRenderObservable) {
      observer = null;
      return;
    }

    scene.onAfterRenderObservable.remove(observer);
    observer = null;
  }

  function attach(root, nextGuestId, settings = {}) {
    stop();
    disposed = false;
    guestId = nextGuestId;
    previewCanvas = root?.querySelector?.('[data-role="dialog-cam-preview-canvas"]') || null;
    previewScreen = root?.querySelector?.('[data-role="dialog-cam-preview-screen"]')
      || previewCanvas?.parentElement
      || null;
    latestSettings = normalizeNpcDialogCameraSettings(settings);

    if (!previewCanvas || !guestId || !engine) {
      return;
    }

    const size = resolvePixelSize();
    syncCanvasCss(size);
    updateHint(root, latestSettings, size);
    bindObserver();
  }

  function updateFromRoot(root) {
    if (!root) {
      return;
    }

    latestSettings = readSettingsFromRoot(root);
    updateHint(root, latestSettings, resolvePixelSize());
    applyFraming(latestSettings);
  }

  function stop() {
    unbindObserver();
    blitPending = false;
    previewCanvas = null;
    previewScreen = null;
    guestId = null;

    if (renderTarget) {
      renderTarget.dispose();
      renderTarget = null;
    }
  }

  function dispose() {
    disposed = true;
    stop();

    if (previewCamera) {
      previewCamera.dispose();
      previewCamera = null;
    }
  }

  return {
    attach,
    updateFromRoot,
    stop,
    dispose
  };
}
