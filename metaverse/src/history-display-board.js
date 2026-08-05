/**
 * History display boards.
 *
 * Modes (per board config.interactionMode):
 * - "modal" (default, Geochang): WebGL plane locked to Display + click opens modal.
 * - "embed" (Angji): HtmlMesh iframe on the board — click/drag interacts in place
 *   (pre-Geochang-modal behavior).
 */

const DEFAULT_HISTORY_URL = "https://rabbit-archi2025.com/history/history.html";

function normalizeMaterialName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getMeshMaterialNames(mesh) {
  const material = mesh?.material;

  if (!material) {
    return [];
  }

  if (Array.isArray(material.subMaterials)) {
    return material.subMaterials.filter(Boolean).map((entry) => entry.name || entry.id || "");
  }

  return [material.name || material.id || ""];
}

/**
 * Resolve the history page URL.
 * Always prefer the configured absolute URL (production). Do not rewrite to a local
 * sibling — that often 404s when only /metaverse is served and shows a white iframe.
 * `embed=1` is only for HtmlMesh boards (small CSS viewport); modal uses the plain URL.
 */
function resolveHistoryDisplayUrl(configuredUrl, options = {}) {
  const configured = typeof configuredUrl === "string" && configuredUrl.trim()
    ? configuredUrl.trim()
    : "";
  const wantEmbed = options.embed === true;
  const base = configured || DEFAULT_HISTORY_URL;

  if (!wantEmbed) {
    return base;
  }

  try {
    const url = new URL(base, window.location.href);
    url.searchParams.set("embed", "1");
    return url.href;
  } catch {
    return base.includes("?") ? `${base}&embed=1` : `${base}?embed=1`;
  }
}

function getAddonsApi() {
  return window.ADDONS || null;
}

function ensureHtmlMeshRenderer(scene) {
  const ADDONS = getAddonsApi();

  if (!ADDONS?.HtmlMeshRenderer) {
    return null;
  }

  if (!scene.metadata) {
    scene.metadata = {};
  }

  if (!scene.metadata.historyHtmlMeshRenderer) {
    scene.metadata.historyHtmlMeshRenderer = new ADDONS.HtmlMeshRenderer(scene, {
      enableOverlayRender: true
    });

    // HtmlMeshRenderer computes CSS transforms in onBeforeRender, but tour-mode
    // (TPS/FPS) camera pose is finalized during scene.render — so the CSS layer
    // lagged one frame behind WebGL and the panel appeared to slide off the
    // Display material while moving. Re-render the CSS layer after scene.render
    // with the final camera pose so both layers always match.
    scene.metadata.historyHtmlMeshRendererSyncObserver = scene.onAfterRenderObservable.add(() => {
      const renderer = scene.metadata.historyHtmlMeshRenderer;
      const camera = scene.activeCamera;

      if (renderer && camera && typeof renderer._render === "function") {
        try {
          renderer._render(scene, camera);
        } catch {
          // ignore — next frame's normal render pass still updates the layer
        }
      }
    });
  }

  return scene.metadata.historyHtmlMeshRenderer;
}

function getLocalVertexBounds(BABYLON, mesh) {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

  if (!positions || positions.length < 3) {
    return null;
  }

  const min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (let index = 0; index < positions.length; index += 3) {
    min.x = Math.min(min.x, positions[index]);
    min.y = Math.min(min.y, positions[index + 1]);
    min.z = Math.min(min.z, positions[index + 2]);
    max.x = Math.max(max.x, positions[index]);
    max.y = Math.max(max.y, positions[index + 1]);
    max.z = Math.max(max.z, positions[index + 2]);
  }

  return { min, max };
}

function axisVector(BABYLON, axisName) {
  if (axisName === "x") {
    return BABYLON.Axis.X.clone();
  }

  if (axisName === "y") {
    return BABYLON.Axis.Y.clone();
  }

  return BABYLON.Axis.Z.clone();
}

function fitLocalFace(bounds, aspectWidth, aspectHeight) {
  const sizes = [
    { axis: "x", size: Math.abs(bounds.max.x - bounds.min.x) },
    { axis: "y", size: Math.abs(bounds.max.y - bounds.min.y) },
    { axis: "z", size: Math.abs(bounds.max.z - bounds.min.z) }
  ].sort((left, right) => left.size - right.size);

  const thin = sizes[0];
  const face = sizes.slice(1).sort((left, right) => right.size - left.size);
  const aspect = aspectWidth / Math.max(aspectHeight, 1e-6);
  let panelWidth;
  let panelHeight;

  if (face[0].size / Math.max(face[1].size, 1e-6) > aspect) {
    panelHeight = face[1].size * 0.96;
    panelWidth = panelHeight * aspect;
  } else {
    panelWidth = face[0].size * 0.96;
    panelHeight = panelWidth / aspect;
  }

  return {
    thinAxis: thin.axis,
    faceWidthAxis: face[0].axis,
    faceHeightAxis: face[1].axis,
    panelWidth: Math.max(panelWidth, 0.05),
    panelHeight: Math.max(panelHeight, 0.05),
    inset: Math.max(thin.size * 0.55, 0.02)
  };
}

/**
 * Prefer a landscape panel in world space: width along the more-horizontal face axis,
 * height along the more-vertical one.
 * When fillFace is true, the panel uses the full Display mesh face (no letterbox).
 */
function fitLocalFaceWorldLandscape(BABYLON, sourceMesh, bounds, aspectWidth, aspectHeight, options = {}) {
  const base = fitLocalFace(bounds, aspectWidth, aspectHeight);
  const fillFace = options.fillFace === true;
  sourceMesh.computeWorldMatrix(true);
  const worldMatrix = sourceMesh.getWorldMatrix();
  const faceAxes = ["x", "y", "z"].filter((axis) => axis !== base.thinAxis);

  const scored = faceAxes.map((axis) => {
    const worldDir = BABYLON.Vector3.TransformNormal(axisVector(BABYLON, axis), worldMatrix).normalize();
    return {
      axis,
      size: Math.abs(bounds.max[axis] - bounds.min[axis]),
      horizontal: 1 - Math.abs(worldDir.y)
    };
  }).sort((left, right) => right.horizontal - left.horizontal);

  const widthAxis = scored[0];
  const heightAxis = scored[1];
  let panelWidth;
  let panelHeight;

  if (fillFace) {
    // Stretch to the Display material face exactly.
    panelWidth = widthAxis.size * 0.998;
    panelHeight = heightAxis.size * 0.998;
  } else {
    const aspect = aspectWidth / Math.max(aspectHeight, 1e-6);

    if (widthAxis.size / Math.max(heightAxis.size, 1e-6) > aspect) {
      panelHeight = heightAxis.size * 0.96;
      panelWidth = panelHeight * aspect;
    } else {
      panelWidth = widthAxis.size * 0.96;
      panelHeight = panelWidth / aspect;
    }
  }

  return {
    ...base,
    faceWidthAxis: widthAxis.axis,
    faceHeightAxis: heightAxis.axis,
    panelWidth: Math.max(panelWidth, 0.05),
    panelHeight: Math.max(panelHeight, 0.05)
  };
}

function findDisplayBoardMeshes(meshes, materialName, board = {}) {
  const target = normalizeMaterialName(materialName);
  const meshName = board?.meshName ? normalizeMaterialName(board.meshName) : null;

  return (meshes || []).filter((mesh) => {
    if (!mesh || mesh.isEnabled?.() === false) {
      return false;
    }

    if (meshName && normalizeMaterialName(mesh.name || "") !== meshName) {
      return false;
    }

    return getMeshMaterialNames(mesh).some((name) => normalizeMaterialName(name) === target);
  });
}

function makeDisplaySourceTransparent(BABYLON, sourceMesh) {
  if (!sourceMesh) {
    return;
  }

  if (typeof sourceMesh.material?.unfreeze === "function") {
    sourceMesh.material.unfreeze();
  }

  const scene = sourceMesh.getScene?.() || sourceMesh._scene;
  const clear = new BABYLON.StandardMaterial(`display-clear-${sourceMesh.uniqueId}`, scene);
  clear.diffuseColor = BABYLON.Color3.Black();
  clear.emissiveColor = BABYLON.Color3.Black();
  clear.specularColor = BABYLON.Color3.Black();
  clear.alpha = 0;
  clear.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  clear.disableDepthWrite = true;
  clear.backFaceCulling = false;
  clear.disableLighting = true;

  if ("disableColorWrite" in clear) {
    clear.disableColorWrite = true;
  }

  sourceMesh.material = clear;
  sourceMesh.visibility = 1;
  sourceMesh.isVisible = true;
  sourceMesh.isPickable = false;
}

function getColOccluderMeshes(modelState) {
  // Only structural COL (walls / floors / stairs / ramps). Skip furniture and fat
  // building volumes — those false-hide exterior boards from orbit cameras.
  const allowed = new Set(["wall", "floor", "stair", "ramp"]);

  return (modelState?.collisionMeshes || []).filter((mesh) => {
    if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.() === false) {
      return false;
    }

    const names = getMeshMaterialNames(mesh).map((name) => normalizeMaterialName(name));

    // 0_COL_C_Bldg* is tagged as wall but is a solid mass that hides outdoor boards.
    if (names.some((name) => name.includes("0_col_c_bldg"))) {
      return false;
    }

    const role = mesh.metadata?.angjiCollisionRole;

    if (role && allowed.has(role)) {
      return true;
    }

    return Boolean(
      mesh.metadata?.angjiWallSurface
      || mesh.metadata?.angjiFloorSurface
      || mesh.metadata?.angjiStairSurface
      || mesh.metadata?.angjiRampSurface
    );
  });
}

function isOccludedByCol(BABYLON, scene, boardPosition, occluders, options = {}) {
  const camera = scene.activeCamera;

  if (!camera || !occluders.length) {
    return false;
  }

  const origin = camera.globalPosition
    ? camera.globalPosition.clone()
    : camera.position.clone();
  const toBoard = boardPosition.subtract(origin);
  const distance = toBoard.length();

  if (distance < 0.08) {
    return false;
  }

  const boardNormal = options.boardNormal?.lengthSquared?.() > 1e-8
    ? options.boardNormal.clone().normalize()
    : null;
  const towardCamera = origin.subtract(boardPosition);

  if (towardCamera.lengthSquared() > 1e-8) {
    towardCamera.normalize();
  }

  const direction = toBoard.scale(1 / distance);
  const ray = new BABYLON.Ray(origin, direction, Math.max(0.05, distance - 0.05));

  function hitBlocks(hit) {
    if (!hit?.hit || typeof hit.distance !== "number") {
      return false;
    }

    if (hit.distance >= distance - 0.12) {
      return false;
    }

    // Ignore the exterior wall COL slab that shares the Display face.
    if (boardNormal && hit.pickedPoint && towardCamera.lengthSquared() > 1e-8) {
      const fromBoard = hit.pickedPoint.subtract(boardPosition);
      const planarSep = Math.abs(BABYLON.Vector3.Dot(fromBoard, boardNormal));
      const towardCamSep = BABYLON.Vector3.Dot(fromBoard, towardCamera);

      if (planarSep < 0.16 && towardCamSep < 0.22) {
        return false;
      }
    }

    return true;
  }

  // Invisible COL often misses scene.pickWithRay — use intersectsMesh, but only on
  // AABB-overlapping candidates. Full COL sweeps freeze Angji night orbit zoom.
  const maxTests = typeof options.maxOccluderTests === "number"
    ? Math.max(4, options.maxOccluderTests)
    : 28;
  const candidates = [];

  for (let index = 0; index < occluders.length; index += 1) {
    const mesh = occluders[index];

    if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.() === false) {
      continue;
    }

    const boundingInfo = mesh.getBoundingInfo?.();

    if (!boundingInfo) {
      continue;
    }

    const { minimumWorld, maximumWorld } = boundingInfo.boundingBox;

    if (
      typeof ray.intersectsBoxMinMax === "function"
      && !ray.intersectsBoxMinMax(minimumWorld, maximumWorld)
    ) {
      continue;
    }

    candidates.push(mesh);

    if (candidates.length >= maxTests * 2) {
      break;
    }
  }

  const testCount = Math.min(candidates.length, maxTests);

  for (let index = 0; index < testCount; index += 1) {
    if (hitBlocks(ray.intersectsMesh(candidates[index], true))) {
      return true;
    }
  }

  return false;
}

/**
 * True when the TPS player character stands between the camera and the board.
 * Cheap segment-vs-sphere test against the character root (no raycast needed).
 */
function isPlayerBlockingBoard(BABYLON, scene, boardPosition) {
  const camera = scene.activeCamera;

  if (!camera) {
    return false;
  }

  let root = scene.metadata?.historyPlayerRoot;

  if (!root || root.isDisposed?.()) {
    root = scene.getTransformNodeByName?.("tps-character-root") || null;

    if (scene.metadata) {
      scene.metadata.historyPlayerRoot = root;
    }
  }

  if (!root || root.isEnabled?.() === false) {
    return false;
  }

  const origin = camera.globalPosition
    ? camera.globalPosition.clone()
    : camera.position.clone();
  const toBoard = boardPosition.subtract(origin);
  const segmentLength = toBoard.length();

  if (segmentLength < 1e-4) {
    return false;
  }

  // Character pivot sits at the feet — test against the torso center.
  const center = root.getAbsolutePosition().clone();
  center.y += 0.9;

  const direction = toBoard.scale(1 / segmentLength);
  const along = BABYLON.Vector3.Dot(center.subtract(origin), direction);

  if (along <= 0 || along >= segmentLength) {
    return false;
  }

  const closest = origin.add(direction.scale(along));
  const blockRadius = 0.9;

  return BABYLON.Vector3.Distance(closest, center) < blockRadius;
}

function ensureHistoryModal() {
  let modal = document.getElementById("history-display-modal");

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");
  modal.id = "history-display-modal";
  modal.className = "history-display-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="history-display-modal__backdrop" data-history-close="1"></div>
    <div class="history-display-modal__panel" role="dialog" aria-modal="true" aria-label="History">
      <button type="button" class="history-display-modal__close" data-history-close="1" aria-label="Close">×</button>
      <iframe class="history-display-modal__frame" title="History" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target?.dataset?.historyClose === "1") {
      closeHistoryModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeHistoryModal();
    }
  });

  return modal;
}

function openHistoryModal(url) {
  const modal = ensureHistoryModal();
  const frame = modal.querySelector(".history-display-modal__frame");
  const target = url || DEFAULT_HISTORY_URL;

  if (frame) {
    // Always assign — browsers normalize src; !== checks against about:blank were flaky.
    frame.src = target;
    console.info(`[display-board] history modal → ${target}`);
  }

  modal.hidden = false;
  document.body.classList.add("history-display-modal-open");
}

function closeHistoryModal() {
  const modal = document.getElementById("history-display-modal");

  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.classList.remove("history-display-modal-open");
}

function paintHistoryPreviewTexture(texture, orientation = {}) {
  const ctx = texture.getContext();
  const width = texture.getSize().width;
  const height = texture.getSize().height;
  const rotateDegrees = orientation.rotateDegrees || 0;
  const flipHorizontal = orientation.flipHorizontal === true;
  const swapAxes = Math.abs(rotateDegrees) % 180 === 90;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f7f3ef";
  ctx.fillRect(0, 0, width, height);

  ctx.translate(width * 0.5, height * 0.5);

  // User order: rotate, then flip horizontally.
  if (rotateDegrees) {
    ctx.rotate((rotateDegrees * Math.PI) / 180);
  }

  if (flipHorizontal) {
    ctx.scale(-1, 1);
  }

  const drawWidth = swapAxes ? height : width;
  const drawHeight = swapAxes ? width : height;

  ctx.fillStyle = "#665647";
  ctx.font = "bold 96px NanumBarunGothic, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HISTORY", 0, -drawHeight * 0.12);
  ctx.font = "36px NanumBarunGothic, sans-serif";
  ctx.fillStyle = "#8a7360";
  ctx.fillText("클릭하여 조작", 0, drawHeight * 0.05);
  ctx.strokeStyle = "#c4b5a5";
  ctx.lineWidth = 8;
  ctx.strokeRect(-drawWidth * 0.5 + 24, -drawHeight * 0.5 + 24, drawWidth - 48, drawHeight - 48);
  ctx.restore();
  texture.update();
}

function resolveBoardLocalPose(BABYLON, sourceMesh, modelState, aspectWidth, aspectHeight, options = {}) {
  const bounds = getLocalVertexBounds(BABYLON, sourceMesh);

  if (!bounds) {
    return null;
  }

  const preferWorldLandscape = options.preferWorldLandscape === true;
  const fillFace = options.fillFace === true;
  const faceOutward = options.faceOutward === true;
  const surfaceOffset = typeof options.surfaceOffset === "number" ? options.surfaceOffset : null;
  const fit = preferWorldLandscape
    ? fitLocalFaceWorldLandscape(BABYLON, sourceMesh, bounds, aspectWidth, aspectHeight, { fillFace })
    : fitLocalFace(bounds, aspectWidth, aspectHeight);
  const centerLocal = new BABYLON.Vector3(
    (bounds.min.x + bounds.max.x) * 0.5,
    (bounds.min.y + bounds.max.y) * 0.5,
    (bounds.min.z + bounds.max.z) * 0.5
  );
  let thinLocal = axisVector(BABYLON, fit.thinAxis);

  sourceMesh.computeWorldMatrix(true);
  const worldMatrix = sourceMesh.getWorldMatrix();
  const centerWorld = BABYLON.Vector3.TransformCoordinates(centerLocal, worldMatrix);
  let normalWorld = BABYLON.Vector3.TransformNormal(thinLocal, worldMatrix).normalize();
  const focus = modelState.model?.focusBounds?.center || modelState.model?.bounds?.center;

  if (focus) {
    const towardFocus = new BABYLON.Vector3(focus.x, focus.y, focus.z).subtract(centerWorld);
    if (towardFocus.lengthSquared() > 1e-6) {
      const facesInward = BABYLON.Vector3.Dot(normalWorld, towardFocus) > 0;

      // Exterior wall boards must face away from the building; interior boards face inward.
      if (faceOutward ? facesInward : !facesInward) {
        thinLocal.scaleInPlace(-1);
        normalWorld.scaleInPlace(-1);
      }
    }
  }

  const forward = thinLocal.clone().normalize();
  let right;
  let up;

  if (preferWorldLandscape) {
    // Align plane X/Y with the chosen world-horizontal / world-vertical face axes.
    right = axisVector(BABYLON, fit.faceWidthAxis).normalize();
    up = axisVector(BABYLON, fit.faceHeightAxis).normalize();

    if (BABYLON.Vector3.Dot(BABYLON.Vector3.Cross(right, up), forward) < 0) {
      right.scaleInPlace(-1);
    }

    // Keep "up" pointing toward world +Y when possible so content isn't inverted.
    const upWorld = BABYLON.Vector3.TransformNormal(up, worldMatrix);
    if (upWorld.y < 0) {
      up.scaleInPlace(-1);
      right.scaleInPlace(-1);
    }
  } else {
    const upHint = Math.abs(forward.y) > 0.85 ? BABYLON.Axis.Z : BABYLON.Axis.Y;
    right = BABYLON.Vector3.Cross(upHint, forward);

    if (right.lengthSquared() < 1e-8) {
      right = BABYLON.Vector3.Cross(BABYLON.Axis.X, forward);
    }

    right.normalize();
    up = BABYLON.Vector3.Cross(forward, right).normalize();
    right = BABYLON.Vector3.Cross(up, forward).normalize();
  }

  const rotationQuaternion = BABYLON.Quaternion.RotationQuaternionFromAxis(right, up, forward);

  // Sit slightly in front of the Display face (along the facing normal).
  // Exterior boards use a clearer offset so they don't sink into the wall COL.
  let localInset = Math.max(fit.inset, 0.02);

  if (surfaceOffset !== null) {
    const thinWorld = BABYLON.Vector3.TransformNormal(forward, worldMatrix);
    const thinWorldLen = Math.max(thinWorld.length(), 1e-6);
    localInset = Math.max(localInset, surfaceOffset / thinWorldLen);
  } else if (faceOutward) {
    localInset = Math.max(localInset, 0.08);
  }

  const positionLocal = centerLocal.add(forward.scale(localInset));

  const widthPoint = BABYLON.Vector3.TransformCoordinates(
    centerLocal.add(axisVector(BABYLON, fit.faceWidthAxis).scale(fit.panelWidth * 0.5)),
    worldMatrix
  );
  const heightPoint = BABYLON.Vector3.TransformCoordinates(
    centerLocal.add(axisVector(BABYLON, fit.faceHeightAxis).scale(fit.panelHeight * 0.5)),
    worldMatrix
  );

  return {
    fit,
    positionLocal,
    rotationQuaternion,
    faceOutward,
    worldWidth: Math.max(BABYLON.Vector3.Distance(centerWorld, widthPoint) * 2, 0.05),
    worldHeight: Math.max(BABYLON.Vector3.Distance(centerWorld, heightPoint) * 2, 0.05)
  };
}

// history.html design canvas — keep iframe layout at this size so phone-mode
// (short side ≤500) never hides the timeline inside HtmlMesh.
const HISTORY_DESIGN_WIDTH = 1800;
const HISTORY_DESIGN_HEIGHT = 1160;

function createIframeElement(url, aspectWidth, aspectHeight, orientation = {}) {
  const iframe = document.createElement("iframe");
  const swapAxes = Math.abs(orientation.rotateDegrees || 0) % 180 === 90;
  const frameWidth = swapAxes ? HISTORY_DESIGN_HEIGHT : HISTORY_DESIGN_WIDTH;
  const frameHeight = swapAxes ? HISTORY_DESIGN_WIDTH : HISTORY_DESIGN_HEIGHT;

  iframe.src = url;
  iframe.title = "History display";
  iframe.width = String(frameWidth);
  iframe.height = String(frameHeight);
  iframe.loading = "eager";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.allow = "fullscreen";
  iframe.setAttribute("allowfullscreen", "true");
  // Keep scripts (history.js / Firebase) enabled — do not sandbox.
  // Fixed px size (not 100%) so iframe window.inner* stays above phone threshold.
  iframe.style.cssText = [
    "border:0",
    "display:block",
    "background:#f7f3ef",
    `width:${frameWidth}px`,
    `height:${frameHeight}px`,
    "max-width:none",
    "max-height:none",
    "pointer-events:auto",
    "flex:none"
  ].join(";");

  return iframe;
}

function buildOrientedContentWrapper(iframe, orientation) {
  const wrap = document.createElement("div");
  const stage = document.createElement("div");
  const transforms = [];
  const frameWidth = Number.parseInt(iframe.width, 10) || HISTORY_DESIGN_WIDTH;
  const frameHeight = Number.parseInt(iframe.height, 10) || HISTORY_DESIGN_HEIGHT;

  // CSS applies right-to-left → flip after rotate when both are set.
  if (orientation?.flipHorizontal) {
    transforms.push("scaleX(-1)");
  }

  if (orientation?.rotateDegrees) {
    transforms.push(`rotate(${orientation.rotateDegrees}deg)`);
  }

  wrap.className = "history-display-embed-root";
  wrap.style.cssText = [
    "width:100%",
    "height:100%",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "overflow:hidden",
    "background:#f7f3ef",
    "pointer-events:auto"
  ].join(";");

  stage.className = "history-display-embed-stage";
  stage.style.cssText = [
    `width:${frameWidth}px`,
    `height:${frameHeight}px`,
    "position:relative",
    "flex:none",
    "transform-origin:center center",
    "pointer-events:auto",
    transforms.length ? `transform:${transforms.join(" ")}` : ""
  ].filter(Boolean).join(";");

  stage.appendChild(iframe);
  wrap.appendChild(stage);

  // Scale the design-size stage down to the HtmlMesh host after layout.
  const syncScale = () => {
    const hostWidth = wrap.clientWidth || 1;
    const hostHeight = wrap.clientHeight || 1;
    const scale = Math.min(hostWidth / frameWidth, hostHeight / frameHeight);
    const orientationTransform = transforms.length ? `${transforms.join(" ")} ` : "";
    stage.style.transform = `${orientationTransform}scale(${scale})`;
  };

  wrap._syncHistoryEmbedScale = syncScale;

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => syncScale());
    observer.observe(wrap);
    wrap._historyEmbedResizeObserver = observer;
  }

  requestAnimationFrame(syncScale);
  return wrap;
}

function attachModalBoard(BABYLON, scene, modelState, sourceMesh, board, url, occluders) {
  const aspectWidth = typeof board.aspectWidth === "number" ? board.aspectWidth : 9;
  const aspectHeight = typeof board.aspectHeight === "number" ? board.aspectHeight : 6;
  const pose = resolveBoardLocalPose(BABYLON, sourceMesh, modelState, aspectWidth, aspectHeight, {
    preferWorldLandscape: board.preferWorldLandscape === true,
    fillFace: board.fillDisplayFace === true,
    faceOutward: board.faceOutward === true,
    surfaceOffset: typeof board.surfaceOffset === "number" ? board.surfaceOffset : null
  });

  if (!pose) {
    return null;
  }

  const plane = BABYLON.MeshBuilder.CreatePlane(
    `history-board-${sourceMesh.uniqueId}`,
    {
      width: pose.fit.panelWidth,
      height: pose.fit.panelHeight,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    },
    scene
  );

  plane.parent = sourceMesh;
  plane.position.copyFrom(pose.positionLocal);
  plane.rotationQuaternion = pose.rotationQuaternion.clone();
  plane.rotation.set(0, 0, 0);
  plane.scaling.set(-1, 1, 1);
  plane.billboardMode = 0;
  plane.isPickable = true;
  plane.checkCollisions = false;

  const pixelWidth = 1024;
  const pixelHeight = Math.round(pixelWidth * (aspectHeight / aspectWidth));
  const dynamicTexture = new BABYLON.DynamicTexture(
    `history-board-tex-${sourceMesh.uniqueId}`,
    { width: pixelWidth, height: pixelHeight },
    scene,
    false
  );
  const orientation = getBoardContentOrientation(board);
  paintHistoryPreviewTexture(dynamicTexture, orientation);

  const material = new BABYLON.StandardMaterial(`history-board-mat-${sourceMesh.uniqueId}`, scene);
  material.diffuseTexture = dynamicTexture;
  material.emissiveTexture = dynamicTexture;
  material.emissiveColor = new BABYLON.Color3(1, 1, 1);
  material.specularColor = BABYLON.Color3.Black();
  material.disableLighting = true;
  material.backFaceCulling = false;
  plane.material = material;

  makeDisplaySourceTransparent(BABYLON, sourceMesh);

  const action = plane.actionManager || new BABYLON.ActionManager(scene);
  plane.actionManager = action;
  action.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
      openHistoryModal(url);
    })
  );

  const pickObserver = scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERPICK) {
      return;
    }

    if (pointerInfo.pickInfo?.pickedMesh === plane) {
      openHistoryModal(url);
    }
  });

  let modalOcclusionFrame = 0;
  let cachedModalOccluded = false;

  const observer = scene.onBeforeRenderObservable.add(() => {
    if (plane.isDisposed?.() || sourceMesh.isDisposed?.()) {
      return;
    }

    if (sourceMesh.isEnabled?.() === false) {
      plane.isVisible = false;
      return;
    }

    plane.computeWorldMatrix(true);

    modalOcclusionFrame += 1;
    const orbiting = !document.body.classList.contains("walk-mode-active");
    const nightOrbit = orbiting && document.body.classList.contains("is-night-mode");
    const occlusionInterval = nightOrbit ? 5 : (orbiting ? 4 : 1);

    if (modalOcclusionFrame === 1 || modalOcclusionFrame % occlusionInterval === 0) {
      cachedModalOccluded = isOccludedByCol(
        BABYLON,
        scene,
        plane.getAbsolutePosition(),
        occluders,
        { maxOccluderTests: nightOrbit ? 22 : 28 }
      );
    }

    plane.isVisible = !cachedModalOccluded;
  });

  return {
    mode: "modal",
    plane,
    dynamicTexture,
    material,
    sourceMesh,
    materialName: board.materialName,
    url,
    observer,
    pickObserver
  };
}

function getBoardContentOrientation(board) {
  return {
    rotateDegrees: typeof board?.contentRotateDegrees === "number" ? board.contentRotateDegrees : 0,
    flipHorizontal: board?.contentFlipHorizontal === true
  };
}

function createHistoryBackingPlane(BABYLON, scene, sourceMesh, pose, aspectWidth, aspectHeight, orientation) {
  const plane = BABYLON.MeshBuilder.CreatePlane(
    `history-embed-back-${sourceMesh.uniqueId}`,
    {
      width: pose.fit.panelWidth,
      height: pose.fit.panelHeight,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    },
    scene
  );

  plane.parent = sourceMesh;
  plane.position.copyFrom(pose.positionLocal);
  plane.rotationQuaternion = pose.rotationQuaternion.clone();
  plane.rotation.set(0, 0, 0);
  // Keep the plane aligned to the display face; orientation is painted into the texture.
  plane.scaling.set(-1, 1, 1);
  plane.billboardMode = 0;
  plane.isPickable = false;
  plane.checkCollisions = false;

  const pixelWidth = 1024;
  const pixelHeight = Math.round(pixelWidth * (aspectHeight / aspectWidth));
  const dynamicTexture = new BABYLON.DynamicTexture(
    `history-embed-back-tex-${sourceMesh.uniqueId}`,
    { width: pixelWidth, height: pixelHeight },
    scene,
    false
  );
  paintHistoryPreviewTexture(dynamicTexture, orientation);

  const material = new BABYLON.StandardMaterial(`history-embed-back-mat-${sourceMesh.uniqueId}`, scene);
  material.diffuseTexture = dynamicTexture;
  material.emissiveTexture = dynamicTexture;
  material.emissiveColor = new BABYLON.Color3(1, 1, 1);
  material.specularColor = BABYLON.Color3.Black();
  material.disableLighting = true;
  material.backFaceCulling = false;
  plane.material = material;

  return { plane, dynamicTexture, material };
}

function hardenHtmlMeshMask(BABYLON, htmlMesh) {
  // Overlay HtmlMesh: invisible WebGL mask, CSS3D content is what you see.
  htmlMesh.visibility = 0;
  htmlMesh.isVisible = true;
  htmlMesh.billboardMode = 0;

  const material = htmlMesh.material;

  if (!material) {
    return;
  }

  if (typeof material.unfreeze === "function") {
    material.unfreeze();
  }

  material.alpha = 0;
  material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  material.disableLighting = true;

  if ("disableColorWrite" in material) {
    material.disableColorWrite = true;
  }

  if ("diffuseColor" in material) {
    material.diffuseColor = BABYLON.Color3.Black();
  }

  if ("emissiveColor" in material) {
    material.emissiveColor = BABYLON.Color3.Black();
  }
}

function attachEmbedBoard(BABYLON, scene, modelState, sourceMesh, board, url, occluders) {
  const ADDONS = getAddonsApi();

  if (!ADDONS?.HtmlMesh || !ensureHtmlMeshRenderer(scene)) {
    console.warn("[display-board] HtmlMesh unavailable — falling back to modal board.");
    return attachModalBoard(BABYLON, scene, modelState, sourceMesh, board, url, occluders);
  }

  const aspectWidth = typeof board.aspectWidth === "number" ? board.aspectWidth : 9;
  const aspectHeight = typeof board.aspectHeight === "number" ? board.aspectHeight : 6;
  const pose = resolveBoardLocalPose(BABYLON, sourceMesh, modelState, aspectWidth, aspectHeight, {
    preferWorldLandscape: board.preferWorldLandscape === true,
    fillFace: board.fillDisplayFace === true,
    faceOutward: board.faceOutward === true,
    surfaceOffset: typeof board.surfaceOffset === "number" ? board.surfaceOffset : null
  });
  const orientation = getBoardContentOrientation(board);
  const maxEmbedWorld = typeof board.embedMaxWorldSize === "number" ? board.embedMaxWorldSize : 400;

  if (!pose || pose.worldWidth > maxEmbedWorld || pose.worldHeight > maxEmbedWorld) {
    console.warn(
      `[display-board] embed skipped ${sourceMesh.name}: `
      + `${pose?.worldWidth?.toFixed(1) ?? "?"}x${pose?.worldHeight?.toFixed(1) ?? "?"} `
      + `(limit ${maxEmbedWorld})`
    );
    return null;
  }

  makeDisplaySourceTransparent(BABYLON, sourceMesh);

  // Depth-correct WebGL plate (always available). Overlay HTML sits on top when clear.
  const backing = createHistoryBackingPlane(
    BABYLON,
    scene,
    sourceMesh,
    pose,
    aspectWidth,
    aspectHeight,
    orientation
  );

  // Local anchor glued to Display material — source of truth for world pose.
  const proxy = BABYLON.MeshBuilder.CreatePlane(
    `display-proxy-${sourceMesh.uniqueId}`,
    { width: 1, height: 1, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
    scene
  );
  proxy.parent = sourceMesh;
  proxy.position.copyFrom(pose.positionLocal);
  const poseMatrix = new BABYLON.Matrix();
  BABYLON.Matrix.FromQuaternionToRef(pose.rotationQuaternion, poseMatrix);
  proxy.position.addInPlace(
    BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, 0.003), poseMatrix)
  );
  proxy.rotationQuaternion = pose.rotationQuaternion.clone();
  proxy.rotation.set(0, 0, 0);
  proxy.scaling.set(1, 1, 1);
  proxy.isPickable = false;
  proxy.isVisible = false;
  proxy.visibility = 0;
  proxy.billboardMode = 0;

  const iframe = createIframeElement(url, aspectWidth, aspectHeight, orientation);
  // In-scene mode: the addon renders the mesh as a depth-only mask (hole punch) and
  // the iframe sits behind the transparent canvas — players/NPCs occlude per-pixel.
  // Its mask material is created & frozen by the addon; never override it.
  const useInScene = board.inScene === true;
  const fitStrategy = ADDONS.FitStrategy?.STRETCH || ADDONS.FitStrategy?.NONE;
  const htmlMeshOptions = {
    captureOnPointerEnter: true,
    isCanvasOverlay: !useInScene
  };

  if (fitStrategy) {
    htmlMeshOptions.fitStrategy = fitStrategy;
  }

  const htmlMesh = new ADDONS.HtmlMesh(
    scene,
    `history-embed-${sourceMesh.uniqueId}`,
    htmlMeshOptions
  );

  const contentRoot = buildOrientedContentWrapper(iframe, orientation);
  let iframeReady = false;

  function syncFromProxy() {
    proxy.computeWorldMatrix(true);
    const world = proxy.getWorldMatrix();
    const position = new BABYLON.Vector3();
    const rotation = new BABYLON.Quaternion();
    const scale = new BABYLON.Vector3();
    world.decompose(scale, rotation, position);

    // World-space pose sized by setContent — keep unit scale.
    htmlMesh.parent = null;
    htmlMesh.billboardMode = 0;
    htmlMesh.scaling.set(1, 1, 1);
    htmlMesh.position.copyFrom(position);
    htmlMesh.rotationQuaternion = rotation;
    htmlMesh.rotation.set(0, 0, 0);
    htmlMesh.isPickable = true;

    if (!useInScene) {
      hardenHtmlMeshMask(BABYLON, htmlMesh);
    }

    htmlMesh.computeWorldMatrix?.(true);
  }

  function getBoardWorldNormal() {
    proxy.computeWorldMatrix(true);
    return BABYLON.Vector3.TransformNormal(BABYLON.Axis.Z, proxy.getWorldMatrix()).normalize();
  }

  syncFromProxy();
  htmlMesh.setContent(contentRoot, pose.worldWidth, pose.worldHeight);

  if (!useInScene) {
    hardenHtmlMeshMask(BABYLON, htmlMesh);
  }

  htmlMesh.setEnabled(true);
  htmlMesh.isPickable = true;

  if (htmlMesh.element) {
    htmlMesh.element.classList.add("history-display-embed-host");
    htmlMesh.element.style.background = "transparent";
    htmlMesh.element.style.pointerEvents = "auto";
    htmlMesh.element.style.visibility = "visible";
    htmlMesh.element.style.opacity = "1";
  }

  iframe.addEventListener("load", () => {
    iframeReady = true;
    backing.plane.isVisible = false;
    contentRoot._syncHistoryEmbedScale?.();
    console.info(`[display-board] history iframe ready → ${url}`);
  });

  iframe.addEventListener("error", () => {
    console.warn(`[display-board] history iframe failed → ${url}`);
  });

  let occlusionFrame = 0;
  let cachedOccluded = false;

  const observer = scene.onBeforeRenderObservable.add(() => {
    if (htmlMesh.isDisposed?.() || proxy.isDisposed?.()) {
      return;
    }

    if (sourceMesh.isDisposed?.() || sourceMesh.isEnabled?.() === false) {
      backing.plane.isVisible = false;
      htmlMesh.setEnabled(false);

      if (htmlMesh.element) {
        htmlMesh.element.style.visibility = "hidden";
      }

      return;
    }

    // Re-anchor to the Display material mesh every frame so the panel never drifts
    // with camera motion (tour or orbit).
    syncFromProxy();
    contentRoot._syncHistoryEmbedScale?.();
    htmlMesh.setEnabled(true);

    if (useInScene) {
      // Depth buffer handles occlusion (COL walls are invisible, but visible
      // geometry + characters draw over the hole naturally). No ray checks.
      backing.plane.isVisible = false;

      if (htmlMesh.element) {
        htmlMesh.element.style.visibility = "visible";
        htmlMesh.element.style.opacity = "1";
        htmlMesh.element.style.pointerEvents = "auto";
      }

      if (iframe) {
        iframe.style.visibility = "visible";
        iframe.style.pointerEvents = "auto";
      }

      if (contentRoot) {
        contentRoot.style.pointerEvents = "auto";
      }

      return;
    }

    const boardPosition = proxy.getAbsolutePosition();
    // Throttle COL occlusion — full sweeps hitch on night zoom, but never skip
    // entirely (that made Angji boards draw through walls again).
    occlusionFrame += 1;
    const orbiting = !document.body.classList.contains("walk-mode-active");
    const nightOrbit = orbiting && document.body.classList.contains("is-night-mode");
    const occlusionInterval = nightOrbit ? 5 : (orbiting ? 6 : 2);

    if (occlusionFrame === 1 || occlusionFrame % occlusionInterval === 0) {
      cachedOccluded = isOccludedByCol(BABYLON, scene, boardPosition, occluders, {
        boardNormal: getBoardWorldNormal(),
        maxOccluderTests: nightOrbit ? 22 : (orbiting ? 20 : 32)
      });
    }

    const occluded = cachedOccluded;

    // CSS overlay always draws above WebGL, so the player character can never cover
    // the iframe. When the character stands between camera and board, swap to the
    // depth-tested WebGL plate so the character correctly appears in front.
    const playerBlocked = !occluded && isPlayerBlockingBoard(BABYLON, scene, boardPosition);
    const showHtml = !occluded && !playerBlocked;

    backing.plane.isVisible = !occluded && (!iframeReady || playerBlocked);

    if (htmlMesh.element) {
      htmlMesh.element.style.visibility = showHtml ? "visible" : "hidden";
      htmlMesh.element.style.opacity = showHtml ? "1" : "0";
      htmlMesh.element.style.pointerEvents = showHtml ? "auto" : "none";
    }

    if (iframe) {
      iframe.style.visibility = showHtml ? "visible" : "hidden";
      iframe.style.pointerEvents = showHtml ? "auto" : "none";
    }

    if (contentRoot) {
      contentRoot.style.pointerEvents = showHtml ? "auto" : "none";
    }
  });

  return {
    mode: "embed",
    htmlMesh,
    iframe,
    proxy,
    plane: backing.plane,
    dynamicTexture: backing.dynamicTexture,
    material: backing.material,
    sourceMesh,
    materialName: board.materialName,
    url,
    observer
  };
}

/**
 * @returns {Array<object>}
 */
export function attachHistoryDisplayBoards(BABYLON, scene, modelState) {
  const boards = modelState?.config?.displayBoards;

  if (!Array.isArray(boards) || boards.length === 0) {
    return [];
  }

  const occluders = getColOccluderMeshes(modelState);
  const attached = [];

  boards.forEach((board) => {
    const materialName = board?.materialName;

    if (!materialName) {
      return;
    }

    const interactionMode = board.interactionMode === "embed" ? "embed" : "modal";
    const url = resolveHistoryDisplayUrl(board.url, {
      embed: interactionMode === "embed"
    });
    const sourceMeshes = findDisplayBoardMeshes(modelState.meshes, materialName, board);

    if (!sourceMeshes.length) {
      console.warn(`[display-board] No meshes found for material ${materialName}`);
      return;
    }

    sourceMeshes.forEach((sourceMesh) => {
      const entry = interactionMode === "embed"
        ? attachEmbedBoard(BABYLON, scene, modelState, sourceMesh, board, url, occluders)
        : attachModalBoard(BABYLON, scene, modelState, sourceMesh, board, url, occluders);

      if (!entry) {
        return;
      }

      console.info(`[display-board] ${entry.mode} ${materialName} → ${url}`);
      attached.push(entry);
    });
  });

  if (attached.length) {
    console.info(`[display-board] Attached ${attached.length} history panel(s)`);
  }

  return attached;
}

export function setHistoryDisplayBoardsEnabled(entries, enabled) {
  (entries || []).forEach((entry) => {
    try {
      entry.plane?.setEnabled?.(enabled);
      entry.proxy?.setEnabled?.(enabled);
      entry.htmlMesh?.setEnabled?.(enabled);

      if (entry.plane) {
        entry.plane.isVisible = enabled;
      }

      if (entry.iframe) {
        entry.iframe.style.visibility = enabled ? "visible" : "hidden";
        entry.iframe.style.pointerEvents = enabled ? "auto" : "none";
      }

      if (entry.htmlMesh?.element) {
        entry.htmlMesh.element.style.visibility = enabled ? "visible" : "hidden";
      }
    } catch {
      // ignore
    }
  });

  if (!enabled) {
    closeHistoryModal();
  }
}

export function disposeHistoryDisplayBoards(entries) {
  closeHistoryModal();

  (entries || []).forEach((entry) => {
    try {
      const scene = entry.plane?.getScene?.() || entry.htmlMesh?.getScene?.();

      if (entry.observer && scene) {
        scene.onBeforeRenderObservable.remove(entry.observer);
        scene.onAfterRenderObservable.remove(entry.observer);
      }

      if (entry.pickObserver && scene) {
        scene.onPointerObservable.remove(entry.pickObserver);
      }
    } catch {
      // ignore
    }

    try {
      entry.iframe?.remove?.();
    } catch {
      // ignore
    }

    try {
      entry.dynamicTexture?.dispose?.();
    } catch {
      // ignore
    }

    try {
      entry.material?.dispose?.();
    } catch {
      // ignore
    }

    try {
      entry.proxy?.dispose?.();
    } catch {
      // ignore
    }

    try {
      entry.plane?.dispose?.();
    } catch {
      // ignore
    }

    try {
      entry.htmlMesh?.dispose?.();
    } catch {
      // ignore
    }
  });
}
