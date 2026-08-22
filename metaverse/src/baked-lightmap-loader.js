/**
 * Rabbit Light Baker — baked Night GLB loader.
 * final = albedo * (ambient + lm * light_gain)  (ShaderMaterial; match Preview)
 */

const VIEW_BAKED_DEFAULTS = {
  ambient: 0.02,
  ambient_rgb: [0.03, 0.028, 0.024],
  light_gain: 2.2,
  albedo_tint: 1.0,
};

function meshHasUv2(BABYLON, mesh) {
  try {
    return Boolean(mesh?.isVerticesDataPresent?.(BABYLON.VertexBuffer.UV2Kind));
  } catch (_) {
    return false;
  }
}

function isBakedReceiverMaterial(mat) {
  if (!mat) return false;
  const name = String(mat.name || "");
  if (/RLB_Recv|_LM_/i.test(name)) return true;
  return Boolean(mat.metadata?.rlbLightmapMultiply || mat.metadata?.rlbLightmap);
}

export function detectBakedLightingGlb(meshes) {
  if (!Array.isArray(meshes) || !meshes.length) return false;
  let hits = 0;
  meshes.forEach((mesh) => {
    const mat = mesh?.material;
    if (!mat) return;
    if (mat.subMaterials?.length) {
      mat.subMaterials.forEach((sub) => {
        if (isBakedReceiverMaterial(sub) || sub?.emissiveTexture) hits += 1;
      });
      return;
    }
    if (isBakedReceiverMaterial(mat) || mat.emissiveTexture) hits += 1;
  });
  return hits > 0;
}

function ensureShaders(BABYLON) {
  if (BABYLON.Effect.ShadersStore.rlbBakedVertexShader) return;
  BABYLON.Effect.ShadersStore.rlbBakedVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec2 uv2;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec2 vUV;
varying vec2 vUV2;
void main(void) {
  vUV = uv;
  vUV2 = uv2;
  gl_Position = viewProjection * world * vec4(position, 1.0);
}`;
  BABYLON.Effect.ShadersStore.rlbBakedFragmentShader = `
precision highp float;
varying vec2 vUV;
varying vec2 vUV2;
uniform sampler2D albedoSampler;
uniform sampler2D lmSampler;
uniform vec3 vbAmbient;
uniform float vbLight;
uniform vec3 albedoTint;
uniform float useAlbedoTex;
void main(void) {
  vec3 albedo = albedoTint;
  if (useAlbedoTex > 0.5) {
    albedo *= texture2D(albedoSampler, vUV).rgb;
  }
  vec3 lm = texture2D(lmSampler, vUV2).rgb;
  vec3 lit = vbAmbient + lm * vbLight;
  gl_FragColor = vec4(clamp(albedo * lit, 0.0, 1.0), 1.0);
}`;
}

function whiteTex(BABYLON, scene) {
  if (scene._rlbWhiteTex) return scene._rlbWhiteTex;
  scene._rlbWhiteTex = BABYLON.RawTexture.CreateRGBTexture(
    new Uint8Array([255, 255, 255]),
    1,
    1,
    scene,
    false,
    false,
    BABYLON.Texture.NEAREST_SAMPLINGMODE
  );
  return scene._rlbWhiteTex;
}

export function applyBakedLightmapMaterial(BABYLON, scene, mat, mesh, hasUv2, options = {}) {
  if (!mat) return mat;
  const lmTex = mat.emissiveTexture || mat._rlbBakedLightmap;
  if (!lmTex && !isBakedReceiverMaterial(mat)) return mat;
  if (!lmTex) return mat;

  ensureShaders(BABYLON);
  const vb = { ...VIEW_BAKED_DEFAULTS, ...(options.viewBaked || {}) };
  const ambient = Number(vb.ambient) || 0.06;
  const ambRgb =
    Array.isArray(vb.ambient_rgb) && vb.ambient_rgb.length >= 3
      ? vb.ambient_rgb.map(Number)
      : [ambient, ambient, ambient + 0.01];
  const lightGain = Number(vb.light_gain) || 0.85;
  const tint = Number(vb.albedo_tint) || 1.0;
  const albedoTex = mat.albedoTexture || mat.diffuseTexture || mat.baseColorTexture || null;

  let wash = lmTex._rlbIsGpuWash ? lmTex : lmTex._rlbGpuWash || lmTex;
  const srcBuf = lmTex._rlbSrcBuffer || lmTex._buffer;
  try {
    wash.coordinatesIndex = hasUv2 ? 1 : 0;
    wash.gammaSpace = false;
    wash.hasAlpha = false;
  } catch (_) { /* ignore */ }

  const sm = new BABYLON.ShaderMaterial(`${mat.name || "mat"}_baked`, scene, {
    vertex: "rlbBaked",
    fragment: "rlbBaked",
  }, {
    attributes: ["position", "normal", "uv", "uv2"],
    uniforms: ["world", "viewProjection", "vbAmbient", "vbLight", "albedoTint", "useAlbedoTex"],
    samplers: ["albedoSampler", "lmSampler"],
  });
  sm.backFaceCulling = false;
  sm.setVector3("vbAmbient", new BABYLON.Vector3(ambRgb[0], ambRgb[1], ambRgb[2]));
  sm.setFloat("vbLight", lightGain);
  sm.setVector3("albedoTint", new BABYLON.Vector3(tint, tint, tint));
  sm.setFloat("useAlbedoTex", albedoTex ? 1.0 : 0.0);
  sm.setTexture("albedoSampler", albedoTex || whiteTex(BABYLON, scene));
  sm.setTexture("lmSampler", wash);

  if (srcBuf && !lmTex._rlbGpuWash && !lmTex._rlbIsGpuWash) {
    createImageBitmap(new Blob([srcBuf], { type: lmTex.mimeType || "image/png" }))
      .then((bmp) => {
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(bmp, 0, 0);
        const img = ctx.getImageData(0, 0, c.width, c.height);
        const raw = new BABYLON.RawTexture(
          img.data,
          c.width,
          c.height,
          BABYLON.Constants.TEXTUREFORMAT_RGBA,
          scene,
          false,
          false,
          BABYLON.Texture.BILINEAR_SAMPLINGMODE,
          BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE
        );
        raw.coordinatesIndex = hasUv2 ? 1 : 0;
        raw.gammaSpace = false;
        raw._rlbIsGpuWash = true;
        raw._rlbSrcBuffer = srcBuf;
        lmTex._rlbGpuWash = raw;
        sm.setTexture("lmSampler", raw);
      })
      .catch(() => { /* ignore */ });
  }

  sm._rlbBakedView = true;
  sm._rlbBakedReceiver = true;
  sm._rlbBakedLightmap = lmTex;
  sm.metadata = { rlbLightmap: true, rlbLightmapMultiply: true };
  return sm;
}

export function applyBakedLightmapMaterials(BABYLON, scene, meshes, options = {}) {
  const list = Array.isArray(meshes) ? meshes : [];
  let converted = 0;
  list.forEach((mesh) => {
    if (!mesh?.material) return;
    const hasUv2 = meshHasUv2(BABYLON, mesh);
    if (mesh.material.subMaterials?.length) {
      mesh.material.subMaterials = mesh.material.subMaterials.map((sub) => {
        const baked = applyBakedLightmapMaterial(BABYLON, scene, sub, mesh, hasUv2, options);
        if (baked !== sub) converted += 1;
        return baked;
      });
      return;
    }
    const baked = applyBakedLightmapMaterial(BABYLON, scene, mesh.material, mesh, hasUv2, options);
    if (baked && baked !== mesh.material) {
      mesh.material = baked;
      converted += 1;
    }
  });
  return { converted, useBakedLighting: options.useBakedLighting !== false };
}
