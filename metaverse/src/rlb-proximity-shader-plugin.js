/**
 * PBR/Standard MaterialPlugin: cone + distance spill on interior receivers.
 * Spill must run at CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR — MAIN_END is after gl_FragColor = finalColor.
 */

import { kelvinToSpillRgb, RLB_DEFAULT_COLOR_TEMP_K, RLB_DEFAULT_SPILL_ACCUM_CAP, RLB_DEFAULT_SPILL_MAX_BLEND, RLB_DEFAULT_SPILL_OPACITY } from "./rlb-shader-tuning.js?v=rlb-shader-proximity-20260818-group-v35";
import { resolveRlbSpotlightAimKind } from "./rlb-fixture-types.js";

// Keep this small: std140 float arrays pad to vec4, so 248 lights blew past 16KB UBO limits.
export const RLB_SHADER_MAX_LIGHTS = 320;
export const RLB_SHADER_LIGHT_STRIDE = 16;
export const RLB_SHADER_MAX_OCCLUDERS = 48;
export const RLB_SHADER_MAX_PORTALS = 24;
export const RLB_SHADER_PLUGIN_BUILD = "20260819-v35";
export const RLB_SHADER_DEBUG_NORMAL = 0;
export const RLB_SHADER_DEBUG_FIXED_SPILL = 1;
export const RLB_SHADER_DEBUG_RED = 2;

let pluginRegistered = false;
let pluginRegisteredBuild = null;

function normalizeSpillMaterialName(name) {
  return String(name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/** Interior glass floors/partitions receive spill. Window glass does not. */
export function isRlbInteriorGlassReceiverMaterialName(name) {
  const normalized = normalizeSpillMaterialName(name);

  if (!normalized || normalized.includes("winglass")) {
    return false;
  }

  return (
    normalized.includes("floorglass")
    || (normalized.startsWith("0m1") && normalized.includes("glass"))
    || normalized.includes("translucentglass")
  );
}

/** Window glass / UI / people — do not receive proximity spill. */
export function isRlbSpillExcludedMaterialName(name) {
  const normalized = normalizeSpillMaterialName(name);

  if (!normalized) {
    return true;
  }

  if (isRlbInteriorGlassReceiverMaterialName(name)) {
    return false;
  }

  return (
    normalized.includes("winglass")
    || normalized.includes("glass")
    || normalized.startsWith("dtv")
    || normalized === "people"
    || normalized.includes("display")
    || normalized.includes("lightcover")
    || normalized.includes("spotlightd1")
    || normalized.includes("spotlightd2")
  );
}

const SPILL_GLSL_BODY = `
  vec3 rlbN = vec3(0.0, 1.0, 0.0);
  #ifdef NORMAL
    rlbN = normalize(RLB_NORMAL_EXPR);
  #endif
  vec3 rlbSpill = vec3(0.0);
  for (int i = 0; i < RLB_MAX_LIGHTS; i++) {
    if (float(i) >= rlbLightCount) {
      break;
    }
    vec4 rlbA = rlbFetchLight(i, 0);
    vec4 rlbB = rlbFetchLight(i, 1);
    vec4 rlbC = rlbFetchLight(i, 2);
    vec4 rlbD = rlbFetchLight(i, 3);
    vec3 lightPos = rlbA.xyz;
    float weight = rlbA.w;
    float innerR = max(rlbB.x, 0.001);
    float outerR = max(rlbB.y, innerR + 0.001);
    float lightMul = max(rlbB.z, 0.0);
    float shape = rlbB.w;
    vec3 toFrag = vPositionW - lightPos;
    float horiz = length(toFrag.xz);
    float vert = max(-toFrag.y, 0.0);
    float geomDist = max(length(toFrag), 0.0001);
    vec3 rayDir = toFrag / geomDist;
    vec3 occOrigin = lightPos;
    float dist = geomDist;
    vec3 emitAxis = vec3(0.0, -1.0, 0.0);
    float coneSoft = clamp(rlbC.w, 0.0, 1.0);
    float coneInner;
    float coneOuter;
    if (shape > 3.5) {
      // Volumetric wall spots (assemble-4620 01~03): omni distance wash so the
      // facade gets a full circle, not a downward semicircle.
      coneInner = -1.0;
      coneOuter = -0.9;
    } else if (shape > 2.5) {
      vec3 emitDir = rlbC.xyz;
      emitAxis = length(emitDir) > 0.001 ? normalize(emitDir) : vec3(0.0, -1.0, 0.0);
      coneInner = mix(0.82, 0.04, coneSoft);
      coneOuter = mix(0.90, 0.98, coneSoft);
    } else if (shape > 1.5) {
      // Linear fixture: capsule source along the mesh.
      vec3 lineAxis = length(rlbC.xyz) > 0.001 ? normalize(rlbC.xyz) : vec3(1.0, 0.0, 0.0);
      float halfLen = max(rlbD.w, 0.08);
      float along = clamp(dot(toFrag, lineAxis), -halfLen, halfLen);
      vec3 closest = lightPos + lineAxis * along;
      vec3 fromLine = vPositionW - closest;
      geomDist = max(length(fromLine), 0.0001);
      rayDir = fromLine / geomDist;
      occOrigin = closest;
      dist = geomDist;
      if (shape > 2.25) {
        // CoveLight: omnidirectional diffuse glow from the strip material.
        coneInner = -1.0;
        coneOuter = -0.9;
      } else {
        emitAxis = vec3(0.0, -1.0, 0.0) - lineAxis * dot(vec3(0.0, -1.0, 0.0), lineAxis);
        emitAxis = length(emitAxis) > 0.001 ? normalize(emitAxis) : vec3(0.0, -1.0, 0.0);
        coneInner = 0.0;
        coneOuter = 0.16;
      }
    } else {
      if (shape > 0.5) {
        dist = max(horiz * 0.78, vert * 1.05);
      }
      coneInner = 0.0;
      coneOuter = 0.12;
    }
    coneOuter = max(coneOuter, coneInner + 0.02);
    float cone = dot(rayDir, emitAxis);
    float coneMask = smoothstep(coneInner, coneOuter, cone);
    float rlbDotFacing = dot(rlbN, -rayDir);
    float facing = shape > 2.25
      ? smoothstep(-0.30, 0.05, rlbDotFacing)
      : smoothstep(-0.02, 0.20, rlbDotFacing);
    float relY = vPositionW.y - occOrigin.y;
    float downMask = shape > 2.25 ? 1.0 : smoothstep(shape < 0.5 ? 0.05 : 0.55, -0.10, relY);
    float u = clamp(dist / max(outerR, 0.001), 0.0, 1.0);
    float edgeCut = mix(0.96, 0.10, coneSoft);
    float edgeWidth = mix(0.03, 0.90, coneSoft);
    float distMask = 1.0 - smoothstep(edgeCut, min(1.0, edgeCut + edgeWidth), u);
    float falloff = distMask * coneMask * facing * downMask * weight * lightMul;
    if (falloff > 0.002) {
      float blocked = 0.0;
      if (rlbOccCount > 0.5 && geomDist > 0.35) {
        for (int o = 0; o < RLB_MAX_OCCLUDERS; o++) {
          if (float(o) >= rlbOccCount) {
            break;
          }
          vec2 occSpan = rlbRayAabbSpan(
            occOrigin,
            rayDir,
            geomDist,
            rlbOccMin[o].xyz,
            rlbOccMax[o].xyz
          );
          float minOccHit = shape > 2.5 ? 0.24 : 0.04;
          // Block only when the AABB sits fully in front of the shaded point.
          // If the fragment is on/inside this slab (wall or floor receiving
          // the wash), tExit >= geomDist — do not self-occlude that surface.
          if (occSpan.x > minOccHit && occSpan.y > occSpan.x && occSpan.y < geomDist - 0.12) {
            float hitT = max(occSpan.x, 0.0);
            float throughGlass = 0.0;
            if (rlbPortalCount > 0.5) {
              for (int p = 0; p < RLB_MAX_PORTALS; p++) {
                if (float(p) >= rlbPortalCount) {
                  break;
                }
                vec2 portalSpan = rlbRayAabbSpan(
                  occOrigin,
                  rayDir,
                  geomDist,
                  rlbPortalMin[p].xyz,
                  rlbPortalMax[p].xyz
                );
                if (portalSpan.y >= 0.0 && abs(max(portalSpan.x, 0.0) - hitT) < 0.7) {
                  throughGlass = 1.0;
                  break;
                }
              }
            }
            if (throughGlass < 0.5) {
              blocked = 1.0;
              break;
            }
          }
        }
      }
      vec3 lightColor = mix(rlbSpillColor, rlbD.rgb, step(0.001, length(rlbD.rgb)));
      rlbSpill += lightColor * falloff * (1.0 - blocked);
    }
  }
  float rlbSpillLen = length(rlbSpill);
  if (rlbSpillLen > ${RLB_DEFAULT_SPILL_ACCUM_CAP.toFixed(3)}) {
    rlbSpill *= ${RLB_DEFAULT_SPILL_ACCUM_CAP.toFixed(3)} / rlbSpillLen;
  }
`;

const SPILL_COMPOSITE_GLSL = `
  vec3 rlbBase = COLOR_TARGET.rgb;
  vec3 rlbSpillAdd = rlbSpill * max(rlbSpillMultiplier, 0.0);
  float rlbLuma = dot(rlbBase, vec3(0.2126, 0.7152, 0.0722));
  float rlbPreserve = clamp(rlbSpillLumaPreserve, 0.0, 1.0);
  // Night walls are dark — boost spill there so "lights on" is readable.
  float rlbShadowBoost = mix(1.55, 0.72, smoothstep(0.04, 0.58, rlbLuma));
  float rlbHighlightKeep = 1.0 - smoothstep(0.62, 0.96, rlbLuma) * rlbPreserve;
  rlbSpillAdd *= rlbShadowBoost * rlbHighlightKeep;
  vec3 rlbAdded = rlbSpillAdd * max(rlbSpillOpacity, 0.0);
  float rlbAddLen = length(rlbAdded);
  float rlbCap = max(rlbSpillMaxBlend, 0.0);
  if (rlbAddLen > rlbCap && rlbCap > 0.0001) {
    rlbAdded *= rlbCap / rlbAddLen;
  }
  COLOR_TARGET.rgb = rlbBase + rlbAdded;
`;

function getShaderLanguage(BABYLON) {
  return BABYLON.ShaderLanguage || { GLSL: "GLSL", WGSL: "WGSL" };
}

export function readRlbShaderDebugFromUrl() {
  if (typeof window === "undefined") {
    return { debugMode: RLB_SHADER_DEBUG_NORMAL, spillMultiplier: null };
  }

  const params = new URLSearchParams(window.location.search);
  const test = params.get("rlbShaderTest");
  let debugMode = RLB_SHADER_DEBUG_NORMAL;

  if (test === "fixed" || test === "fixedSpill") {
    debugMode = RLB_SHADER_DEBUG_FIXED_SPILL;
  } else if (test === "red") {
    debugMode = RLB_SHADER_DEBUG_RED;
  }

  const spillMulRaw = params.get("rlbSpillMul");
  const spillMultiplier = spillMulRaw != null && spillMulRaw !== ""
    ? Number.parseFloat(spillMulRaw)
    : null;

  return {
    debugMode,
    spillMultiplier: Number.isFinite(spillMultiplier) ? spillMultiplier : null
  };
}

export function registerRlbProximityShaderPlugin(BABYLON) {
  if (pluginRegistered && pluginRegisteredBuild === RLB_SHADER_PLUGIN_BUILD) {
    return true;
  }

  pluginRegistered = false;
  pluginRegisteredBuild = null;

  if (!BABYLON?.MaterialPluginBase) {
    console.warn("[rlb-glow] MaterialPluginBase unavailable — shader proximity disabled.");
    return false;
  }

  const PluginBase = BABYLON.MaterialPluginBase;
  const ShaderLanguage = getShaderLanguage(BABYLON);
  const urlDebug = readRlbShaderDebugFromUrl();
  const maxLights = RLB_SHADER_MAX_LIGHTS;
  const lightStride = RLB_SHADER_LIGHT_STRIDE;
  const maxOccluders = RLB_SHADER_MAX_OCCLUDERS;
  const maxPortals = RLB_SHADER_MAX_PORTALS;
  const spillBody = SPILL_GLSL_BODY
    .replace(/RLB_MAX_LIGHTS/g, String(maxLights))
    .replace(/RLB_LIGHT_STRIDE/g, String(lightStride))
    .replace(/RLB_MAX_OCCLUDERS/g, String(maxOccluders))
    .replace(/RLB_MAX_PORTALS/g, String(maxPortals));
  const spillRayHelper = `
    vec4 rlbFetchLight(int lightIndex, int channel) {
      return texture2D(
        rlbLightTex,
        vec2((float(channel) + 0.5) / 4.0, (float(lightIndex) + 0.5) / float(${maxLights}))
      );
    }
    vec2 rlbRayAabbSpan(vec3 orig, vec3 dir, float maxT, vec3 bmin, vec3 bmax) {
      vec3 invDir = vec3(
        abs(dir.x) > 1e-8 ? 1.0 / dir.x : 1e8,
        abs(dir.y) > 1e-8 ? 1.0 / dir.y : 1e8,
        abs(dir.z) > 1e-8 ? 1.0 / dir.z : 1e8
      );
      vec3 t0 = (bmin - orig) * invDir;
      vec3 t1 = (bmax - orig) * invDir;
      vec3 tMin = min(t0, t1);
      vec3 tMax = max(t0, t1);
      float tEnter = max(max(tMin.x, tMin.y), tMin.z);
      float tExit = min(min(tMax.x, tMax.y), tMax.z);
      if (tExit < tEnter || tExit < 0.0 || tEnter > maxT) {
        return vec2(-1.0, -1.0);
      }
      return vec2(tEnter, tExit);
    }
  `;

  class RlbProximityShaderPlugin extends PluginBase {
    static sharedState = {
      lightCount: 0,
      innerRadius: 12,
      outerRadius: 22,
      spillColor: (() => {
        const rgb = kelvinToSpillRgb(RLB_DEFAULT_COLOR_TEMP_K);
        return new BABYLON.Color3(rgb.r, rgb.g, rgb.b);
      })(),
      spillMultiplier: urlDebug.spillMultiplier ?? 1,
      spillOpacity: RLB_DEFAULT_SPILL_OPACITY,
      spillMaxBlend: RLB_DEFAULT_SPILL_MAX_BLEND,
      spillLumaPreserve: 0.32,
      debugMode: urlDebug.debugMode,
      lightTexData: new Float32Array(maxLights * 16),
      lightTexture: null,
      occCount: 0,
      occMin: new Float32Array(maxOccluders * 4),
      occMax: new Float32Array(maxOccluders * 4),
      portalCount: 0,
      portalMin: new Float32Array(maxPortals * 4),
      portalMax: new Float32Array(maxPortals * 4)
    };

    constructor(material) {
      super(material, "RlbProximity", 200, { RLBPROXIMITY: false });
      this._isEnabled = !isRlbSpillExcludedMaterialName(material?.name || material?.id);
      this._colorTarget = material instanceof BABYLON.PBRMaterial
        || material instanceof BABYLON.PBRBaseMaterial
        ? "finalColor"
        : "color";
      this._enable(this._isEnabled);

      const attached = Boolean(this._isEnabled && material.pluginManager?.getPlugin?.("RlbProximity"));
      material.metadata = {
        ...(material.metadata || {}),
        rlbProximityPluginAttached: attached,
        rlbProximityReceiverTracked: this._isEnabled
      };

      if (!attached) {
        return;
      }

      if (typeof material.onError === "function") {
        const previous = material.onError.bind(material);
        material.onError = (effect, errors) => {
          console.error("[rlb-glow] shader compile failed:", material.name || material.id, errors);
          previous(effect, errors);
        };
      }
    }

    get isEnabled() {
      return this._isEnabled;
    }

    set isEnabled(enabled) {
      if (this._isEnabled === enabled) {
        return;
      }

      this._isEnabled = enabled;
      this.markAllDefinesAsDirty();
      this._enable(enabled);
    }

    isCompatible(shaderLanguage) {
      return shaderLanguage !== ShaderLanguage.WGSL && shaderLanguage !== "WGSL";
    }

    prepareDefines(defines) {
      defines.RLBPROXIMITY = this._isEnabled;
    }

    getClassName() {
      return "RlbProximityShaderPlugin";
    }

    getSamplers(samplers) {
      samplers.push("rlbLightTex");
    }

    getUniforms(shaderLanguage) {
      const ubo = [
        { name: "rlbLightCount", size: 1, type: "float" },
        { name: "rlbInnerRadius", size: 1, type: "float" },
        { name: "rlbOuterRadius", size: 1, type: "float" },
        { name: "rlbSpillMultiplier", size: 1, type: "float" },
        { name: "rlbSpillOpacity", size: 1, type: "float" },
        { name: "rlbSpillMaxBlend", size: 1, type: "float" },
        { name: "rlbSpillLumaPreserve", size: 1, type: "float" },
        { name: "rlbDebugMode", size: 1, type: "float" },
        { name: "rlbOccCount", size: 1, type: "float" },
        { name: "rlbPortalCount", size: 1, type: "float" },
        { name: "rlbSpillColor", size: 3, type: "vec3" },
        { name: "rlbOccMin", size: 4, type: "vec4", arraySize: maxOccluders },
        { name: "rlbOccMax", size: 4, type: "vec4", arraySize: maxOccluders },
        { name: "rlbPortalMin", size: 4, type: "vec4", arraySize: maxPortals },
        { name: "rlbPortalMax", size: 4, type: "vec4", arraySize: maxPortals }
      ];

      if (shaderLanguage === ShaderLanguage.WGSL) {
        return { ubo };
      }

      return {
        ubo,
        fragment: `#ifdef RLBPROXIMITY
          uniform float rlbLightCount;
          uniform float rlbInnerRadius;
          uniform float rlbOuterRadius;
          uniform float rlbSpillMultiplier;
          uniform float rlbSpillOpacity;
          uniform float rlbSpillMaxBlend;
          uniform float rlbSpillLumaPreserve;
          uniform float rlbDebugMode;
          uniform float rlbOccCount;
          uniform float rlbPortalCount;
          uniform vec3 rlbSpillColor;
          uniform vec4 rlbOccMin[${maxOccluders}];
          uniform vec4 rlbOccMax[${maxOccluders}];
          uniform vec4 rlbPortalMin[${maxPortals}];
          uniform vec4 rlbPortalMax[${maxPortals}];
        #endif`
      };
    }

    getCustomCode(shaderType) {
      if (shaderType !== "fragment") {
        return null;
      }

      const colorTarget = this._colorTarget;
      const normalExpr = colorTarget === "finalColor" ? "normalW" : "vNormalW";
      const body = spillBody.replace(/RLB_NORMAL_EXPR/g, normalExpr);
      const spillOn = (target) => {
        const spillComposite = SPILL_COMPOSITE_GLSL.replace(/COLOR_TARGET/g, target);
        return `
            if (rlbDebugMode > 1.5) {
              ${target}.rgb = vec3(1.0, 0.0, 0.0);
            } else if (rlbDebugMode > 0.5) {
              ${target}.rgb += vec3(0.30);
            } else if (rlbLightCount > 0.5) {
              ${body}
              ${spillComposite}
            }
        `;
      };

      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
          #ifdef RLBPROXIMITY
            uniform sampler2D rlbLightTex;
            ${spillRayHelper}
          #endif
        `,
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
          #ifdef RLBPROXIMITY
            ${spillOn(colorTarget)}
          #endif
        `,
        CUSTOM_FRAGMENT_MAIN_END: `
          #ifdef RLBPROXIMITY
            gl_FragColor.rgb = ${colorTarget}.rgb;
          #endif
        `
      };
    }

    bindForSubMesh(uniformBuffer) {
      if (!this._isEnabled || !uniformBuffer) {
        return;
      }

      const state = RlbProximityShaderPlugin.sharedState;
      uniformBuffer.updateFloat("rlbLightCount", state.lightCount);
      uniformBuffer.updateFloat("rlbInnerRadius", state.innerRadius);
      uniformBuffer.updateFloat("rlbOuterRadius", state.outerRadius);
      uniformBuffer.updateFloat("rlbSpillMultiplier", state.spillMultiplier);
      uniformBuffer.updateFloat("rlbSpillOpacity", state.spillOpacity);
      uniformBuffer.updateFloat("rlbSpillMaxBlend", state.spillMaxBlend);
      uniformBuffer.updateFloat("rlbSpillLumaPreserve", state.spillLumaPreserve);
      uniformBuffer.updateFloat("rlbDebugMode", state.debugMode);
      uniformBuffer.updateFloat("rlbOccCount", state.occCount || 0);
      uniformBuffer.updateFloat("rlbPortalCount", state.portalCount || 0);
      uniformBuffer.updateColor3("rlbSpillColor", state.spillColor);
      if (state.lightTexture) {
        if (typeof uniformBuffer.setTexture === "function") {
          uniformBuffer.setTexture("rlbLightTex", state.lightTexture);
        } else {
          this._material?.getEffect?.()?.setTexture("rlbLightTex", state.lightTexture);
        }
      }
      if (state.occMin) {
        uniformBuffer.updateFloatArray("rlbOccMin", state.occMin);
      }
      if (state.occMax) {
        uniformBuffer.updateFloatArray("rlbOccMax", state.occMax);
      }
      if (state.portalMin) {
        uniformBuffer.updateFloatArray("rlbPortalMin", state.portalMin);
      }
      if (state.portalMax) {
        uniformBuffer.updateFloatArray("rlbPortalMax", state.portalMax);
      }
    }
  }

  BABYLON.RlbProximityShaderPlugin = RlbProximityShaderPlugin;
  pluginRegistered = true;
  pluginRegisteredBuild = RLB_SHADER_PLUGIN_BUILD;
  console.info(
    `[rlb-glow] shader plugin registered lights=${maxLights} occluders=${maxOccluders} portals=${maxPortals}`
  );
  return true;
}

export function syncRlbShaderDebugOptions(options = {}) {
  if (!pluginRegistered || !window.BABYLON?.RlbProximityShaderPlugin) {
    return;
  }

  const state = window.BABYLON.RlbProximityShaderPlugin.sharedState;
  const urlDebug = readRlbShaderDebugFromUrl();

  if (typeof options.spillMultiplier === "number") {
    state.spillMultiplier = options.spillMultiplier;
  } else if (urlDebug.spillMultiplier != null) {
    state.spillMultiplier = urlDebug.spillMultiplier;
  }

  if (typeof options.spillOpacity === "number") {
    state.spillOpacity = options.spillOpacity;
  }

  if (typeof options.spillMaxBlend === "number") {
    state.spillMaxBlend = options.spillMaxBlend;
  }

  if (typeof options.spillLumaPreserve === "number") {
    state.spillLumaPreserve = options.spillLumaPreserve;
  }

  if (typeof options.debugMode === "number") {
    state.debugMode = options.debugMode;
  } else {
    state.debugMode = urlDebug.debugMode;
  }
}

export function attachRlbProximityShaderPlugin(BABYLON, material) {
  if (!material || material.metadata?.rlbProximityPluginAttached) {
    return false;
  }

  if (isRlbSpillExcludedMaterialName(material.name || material.id)) {
    return false;
  }

  if (!registerRlbProximityShaderPlugin(BABYLON)) {
    return false;
  }

  try {
    material.unfreeze?.();
    // Babylon registers plugins via `new Plugin(material)` (MaterialPluginBase ctor),
    // not pluginManager.register — that method does not exist on MaterialPluginManager.
    new BABYLON.RlbProximityShaderPlugin(material);

    if (!material.metadata?.rlbProximityPluginAttached) {
      console.warn(
        "[rlb-glow] plugin ctor did not attach:",
        material.name || material.id,
        material.getClassName?.() || typeof material
      );
      return false;
    }
  } catch (error) {
    console.warn("[rlb-glow] plugin attach failed:", material.name || material.id, error);
    return false;
  }

  return true;
}

function resolveRlbOutwardHint(BABYLON, mesh, bounds) {
  const center = bounds?.centerWorld?.clone?.()
    || mesh?.getAbsolutePosition?.()?.clone?.()
    || null;
  const parent = mesh?.parent;

  if (!center || !parent) {
    return null;
  }

  parent.computeWorldMatrix?.(true);
  parent.refreshBoundingInfo?.(true, true);
  const parentCenter = parent.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.()
    || parent.getAbsolutePosition?.()?.clone?.()
    || null;

  if (!parentCenter) {
    return null;
  }

  const outward = center.subtract(parentCenter);
  return outward.lengthSquared() > 1e-6 ? outward.normalize() : null;
}

function scoreRlbSpotlightDirection(BABYLON, candidate, outwardHint) {
  const down = new BABYLON.Vector3(0, -1, 0);
  const horizontal = Math.hypot(candidate.x, candidate.z);
  const outwardScore = outwardHint ? BABYLON.Vector3.Dot(candidate, outwardHint) * 1.35 : 0;
  const downScore = BABYLON.Vector3.Dot(candidate, down) * 0.45;
  return horizontal * 0.85 + outwardScore + downScore;
}

const RLB_SPOTLIGHT_AIM_CACHE = new WeakMap();

function isRlbCheckpointCircleSpotlight(entry) {
  if (entry?.rlbType !== "SpotLight") {
    return false;
  }

  const extend = entry?.mesh?.getBoundingInfo?.()?.boundingBox?.extendSize;

  if (!extend) {
    return false;
  }

  // 01~03 family is volumetric; 04~06 family is planar on one local axis.
  return Math.min(extend.x, extend.y, extend.z) > 0.25;
}

function getRlbMeshWorldCenter(mesh) {
  if (!mesh || mesh.isDisposed?.()) {
    return null;
  }

  mesh.computeWorldMatrix?.(true);
  mesh.refreshBoundingInfo?.(true, true);
  return mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.()
    || mesh.getAbsolutePosition?.()?.clone?.()
    || null;
}

function getRlbMeshAimKind(mesh) {
  if (!mesh?.material) {
    return null;
  }

  const names = Array.isArray(mesh.material.subMaterials)
    ? mesh.material.subMaterials.map((material) => material?.name || material?.id || "")
    : [mesh.material.name || mesh.material.id || ""];

  for (const name of names) {
    const kind = resolveRlbSpotlightAimKind(name);

    if (kind) {
      return kind;
    }
  }

  return null;
}

function getRlbDirectChildren(node) {
  if (!node || typeof node.getChildren !== "function") {
    return [];
  }

  try {
    const direct = node.getChildren(null, true);

    if (Array.isArray(direct)) {
      return direct;
    }
  } catch {
    // Some node types only expose the single-arg form.
  }

  const all = node.getChildren() || [];
  return all.filter((child) => child?.parent === node);
}

function collectRlbAimMarkersInSubtree(node, d1Meshes, d2Meshes, depth = 0) {
  if (!node || depth > 8) {
    return;
  }

  const kind = getRlbMeshAimKind(node);

  if (kind === "d1") {
    d1Meshes.push(node);
  } else if (kind === "d2") {
    d2Meshes.push(node);
  }

  const children = getRlbDirectChildren(node);

  for (let index = 0; index < children.length; index += 1) {
    collectRlbAimMarkersInSubtree(children[index], d1Meshes, d2Meshes, depth + 1);
  }
}

function pickNearestRlbAimPair(BABYLON, fixtureMesh, d1Meshes, d2Meshes) {
  const fixtureCenter = getRlbMeshWorldCenter(fixtureMesh);

  if (!fixtureCenter) {
    return null;
  }

  const maxDistSq = 0.85 * 0.85;
  let bestD1 = null;
  let bestD1Dist = Number.POSITIVE_INFINITY;
  let bestD2 = null;
  let bestD2Dist = Number.POSITIVE_INFINITY;

  for (let index = 0; index < d1Meshes.length; index += 1) {
    const center = getRlbMeshWorldCenter(d1Meshes[index]);

    if (!center) {
      continue;
    }

    const distSq = BABYLON.Vector3.DistanceSquared(fixtureCenter, center);

    if (distSq <= maxDistSq && distSq < bestD1Dist) {
      bestD1Dist = distSq;
      bestD1 = d1Meshes[index];
    }
  }

  for (let index = 0; index < d2Meshes.length; index += 1) {
    const center = getRlbMeshWorldCenter(d2Meshes[index]);

    if (!center) {
      continue;
    }

    const distSq = BABYLON.Vector3.DistanceSquared(fixtureCenter, center);

    if (distSq <= maxDistSq && distSq < bestD2Dist) {
      bestD2Dist = distSq;
      bestD2 = d2Meshes[index];
    }
  }

  if (!bestD1 || !bestD2 || bestD1 === bestD2) {
    return null;
  }

  return { d1: bestD1, d2: bestD2 };
}

function buildRlbSpotlightAimFrame(BABYLON, entry, pair) {
  if (!pair?.d1 || !pair?.d2) {
    return null;
  }

  const origin = getRlbMeshWorldCenter(pair.d1);
  const target = getRlbMeshWorldCenter(pair.d2);

  if (!origin || !target) {
    return null;
  }

  const direction = target.subtract(origin);

  if (direction.lengthSquared() < 1e-10) {
    return null;
  }

  const normalized = direction.normalize();
  const frame = {
    origin: origin.add(normalized.scale(0.03)),
    direction: normalized
  };

  entry.position = frame.origin.clone();
  entry.direction = frame.direction.clone();
  return frame;
}

export function resolveRlbSpotlightAimFrame(BABYLON, entry) {
  if (entry?.rlbType && entry.rlbType !== "SpotLight") {
    return null;
  }

  const mesh = entry?.mesh;

  if (!BABYLON || !mesh || mesh.isDisposed?.()) {
    return null;
  }

  let pair = RLB_SPOTLIGHT_AIM_CACHE.has(mesh)
    ? RLB_SPOTLIGHT_AIM_CACHE.get(mesh)
    : undefined;

  if (pair === undefined) {
    pair = null;
    let cursor = mesh;

    for (let depth = 0; depth < 6 && cursor; depth += 1) {
      const d1Meshes = [];
      const d2Meshes = [];
      collectRlbAimMarkersInSubtree(cursor, d1Meshes, d2Meshes);

      if (d1Meshes.length === 1 && d2Meshes.length === 1) {
        pair = { d1: d1Meshes[0], d2: d2Meshes[0] };
        break;
      }

      if (d1Meshes.length > 0 && d2Meshes.length > 0) {
        pair = pickNearestRlbAimPair(BABYLON, mesh, d1Meshes, d2Meshes);

        if (pair) {
          break;
        }
      }

      cursor = cursor.parent;
    }

    RLB_SPOTLIGHT_AIM_CACHE.set(mesh, pair);
  }

  if (!pair?.d1 || !pair?.d2 || pair.d1.isDisposed?.() || pair.d2.isDisposed?.()) {
    return null;
  }

  return buildRlbSpotlightAimFrame(BABYLON, entry, pair);
}

export function resolveRlbLightWorldDirection(BABYLON, entry) {
  const mesh = entry?.mesh;
  const type = entry?.rlbType || "Default";

  if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.() === false) {
    return entry?.direction?.clone?.() || null;
  }

  if (type === "SpotLight") {
    const aim = resolveRlbSpotlightAimFrame(BABYLON, entry);

    if (aim?.direction) {
      return aim.direction.clone();
    }
  }

  mesh.computeWorldMatrix(true);
  mesh.refreshBoundingInfo?.(true, true);
  const bounds = mesh.getBoundingInfo?.()?.boundingBox;

  if (!bounds) {
    return new BABYLON.Vector3(0, -1, 0);
  }

  const extend = bounds.extendSize;
  const thinAxis = [
    { axis: BABYLON.Axis.X, size: extend.x },
    { axis: BABYLON.Axis.Y, size: extend.y },
    { axis: BABYLON.Axis.Z, size: extend.z }
  ].sort((left, right) => left.size - right.size)[0]?.axis ?? BABYLON.Axis.Z;

  const candidates = [
    mesh.getDirection(thinAxis),
    mesh.getDirection(thinAxis).scale(-1)
  ];

  if (type === "SpotLight") {
    const outwardHint = resolveRlbOutwardHint(BABYLON, mesh, bounds);

    let best = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    candidates.forEach((candidate) => {
      const score = scoreRlbSpotlightDirection(BABYLON, candidate, outwardHint);

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    });

    if (best.lengthSquared() < 1e-8) {
      const fallback = outwardHint || new BABYLON.Vector3(0, -1, 0);
      if (entry?.mesh) {
        entry.direction = fallback.clone();
      }
      return fallback;
    }

    const normalized = best.normalize();

    if (entry?.mesh) {
      entry.direction = normalized.clone();
    }

    return normalized;
  }

  if (type === "WallLight" || type === "SignLight" || type === "WindowLight") {
    let best = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    candidates.forEach((candidate) => {
      const horizontal = Math.hypot(candidate.x, candidate.z);
      const score = horizontal - Math.abs(candidate.y) * 0.35;

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    });

    if (best.lengthSquared() < 1e-8) {
      const fallback = new BABYLON.Vector3(0, 0, 1);
      if (entry?.mesh) {
        entry.direction = fallback.clone();
      }
      return fallback;
    }

    const normalized = best.normalize();

    if (entry?.mesh) {
      entry.direction = normalized.clone();
    }

    return normalized;
  }

  const down = new BABYLON.Vector3(0, -1, 0);
  let best = down.clone();
  let bestScore = Number.NEGATIVE_INFINITY;

  candidates.concat([down]).forEach((candidate) => {
    const score = BABYLON.Vector3.Dot(candidate, down);

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  if (best.lengthSquared() < 1e-8) {
    if (entry?.mesh) {
      entry.direction = down.clone();
    }
    return down;
  }

  const normalized = best.normalize();

  if (entry?.mesh) {
    entry.direction = normalized.clone();
  }

  return normalized;
}

const LINE_SHAPED_TYPES = new Set(["LineLight", "CoveLight", "StairLight"]);

/** Oriented line frame: origin on the emitting face, axis along fixture length. */
export function resolveRlbLightLineFrame(BABYLON, entry) {
  const mesh = entry?.mesh;
  const down = new BABYLON.Vector3(0, -1, 0);

  if (!mesh || mesh.isDisposed?.() || mesh.isEnabled?.() === false) {
    const axis = entry?.lineAxis?.clone?.() || new BABYLON.Vector3(1, 0, 0);
    const origin = entry?.position?.clone?.() || null;
    return {
      origin,
      axis,
      halfLength: Math.max(entry?.halfLength || 0.08, 0.08),
      emit: entry?.direction?.clone?.() || down.clone()
    };
  }

  mesh.computeWorldMatrix(true);
  mesh.refreshBoundingInfo?.(true, true);
  const bounds = mesh.getBoundingInfo?.()?.boundingBox;
  const matrix = mesh.getWorldMatrix?.();
  const extend = bounds?.extendSize;

  if (!bounds || !matrix || !extend) {
    return {
      origin: bounds?.centerWorld?.clone?.() || mesh.getAbsolutePosition?.()?.clone?.() || null,
      axis: new BABYLON.Vector3(1, 0, 0),
      halfLength: 0.08,
      emit: down.clone()
    };
  }

  const axes = [
    new BABYLON.Vector3(extend.x, 0, 0),
    new BABYLON.Vector3(0, extend.y, 0),
    new BABYLON.Vector3(0, 0, extend.z)
  ].map((localHalf) => {
    const world = BABYLON.Vector3.TransformNormal(localHalf, matrix);
    const half = world.length();
    let dir;

    if (half > 1e-5) {
      dir = world.scale(1 / half);
    } else if (localHalf.lengthSquared() < 1e-8) {
      const unit = localHalf.x ? BABYLON.Axis.X : (localHalf.y ? BABYLON.Axis.Y : BABYLON.Axis.Z);
      dir = mesh.getDirection(unit);
    } else {
      dir = world.lengthSquared() > 0 ? world.normalize() : new BABYLON.Vector3(1, 0, 0);
    }

    return { dir: dir.clone(), half };
  }).sort((left, right) => right.half - left.half);

  let line = axes[0];

  if (axes[1] && axes[0].half < axes[1].half * 1.2) {
    line = Math.abs(axes[0].dir.y) <= Math.abs(axes[1].dir.y) ? axes[0] : axes[1];
  } else if (Math.abs(line.dir.y) > 0.72 && axes[1] && axes[1].half > 0.05) {
    line = axes[1];
  }

  const thin = axes[axes.length - 1] || { dir: down.clone(), half: 0 };
  let emit = thin.dir.clone();

  if (BABYLON.Vector3.Dot(emit, down) < BABYLON.Vector3.Dot(emit.scale(-1), down)) {
    emit.scaleInPlace(-1);
  }

  if (BABYLON.Vector3.Dot(emit, down) < 0.2) {
    const projected = down.subtract(line.dir.scale(BABYLON.Vector3.Dot(down, line.dir)));

    if (projected.lengthSquared() > 1e-6) {
      emit = projected.normalize();
    } else {
      emit = down.clone();
    }
  }

  const center = bounds.centerWorld?.clone?.()
    || mesh.getAbsolutePosition?.()?.clone?.()
    || new BABYLON.Vector3(0, 0, 0);
  const origin = center.add(emit.scale(Math.max(thin.half, 0.02) + 0.04));
  const axis = line.dir.lengthSquared() > 1e-8 ? line.dir.normalize() : new BABYLON.Vector3(1, 0, 0);
  const halfLength = Math.max(line.half, 0.08);

  if (entry) {
    entry.position = origin.clone();
    entry.lineAxis = axis.clone();
    entry.halfLength = halfLength;
    entry.direction = emit.clone();
  }

  return { origin, axis, halfLength, emit };
}

export function isRlbLineShapedType(typeName) {
  return LINE_SHAPED_TYPES.has(typeName);
}

export function resolveRlbLightWorldPosition(BABYLON, entry) {
  if (!entry) {
    return null;
  }

  if (isRlbLineShapedType(entry.rlbType)) {
    return resolveRlbLightLineFrame(BABYLON, entry).origin;
  }

  if (entry.rlbType === "SpotLight") {
    const aim = resolveRlbSpotlightAimFrame(BABYLON, entry);

    if (aim?.origin) {
      return aim.origin.clone();
    }
  }

  const mesh = entry.mesh;

  if (mesh && !mesh.isDisposed?.() && mesh.isEnabled?.() !== false) {
    mesh.computeWorldMatrix(true);
    mesh.refreshBoundingInfo?.(true, true);
    const live = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld
      || mesh.getAbsolutePosition?.();

    if (live) {
      entry.position = live.clone?.() || live;
      return entry.position;
    }
  }

  return entry.position || null;
}

export function resolveRlbLightPickReference(BABYLON, camera, cameraPosition, options = {}) {
  if (options.pickReference) {
    return options.pickReference;
  }

  if (options.focusPosition) {
    return options.focusPosition;
  }

  if (camera?.getTarget && camera.getClassName?.() === "ArcRotateCamera") {
    const target = camera.getTarget();

    if (target) {
      return target;
    }
  }

  return cameraPosition;
}

function ensureRlbLightTexture(BABYLON, scene, state) {
  if (!scene || !BABYLON?.RawTexture) {
    return null;
  }

  const width = 4;
  const height = RLB_SHADER_MAX_LIGHTS;

  if (state.lightTexture && !state.lightTexture.isDisposed?.()) {
    return state.lightTexture;
  }

  if (!state.lightTexData || state.lightTexData.length !== width * height * 4) {
    state.lightTexData = new Float32Array(width * height * 4);
  }

  const textureType = BABYLON.Constants?.TEXTURETYPE_FLOAT
    ?? BABYLON.Engine?.TEXTURETYPE_FLOAT
    ?? 1;

  try {
    state.lightTexture = new BABYLON.RawTexture(
      state.lightTexData,
      width,
      height,
      BABYLON.Constants.TEXTUREFORMAT_RGBA,
      scene,
      false,
      false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
      textureType
    );
    state.lightTexture.name = "rlbLightTex";
    state.lightTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    state.lightTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  } catch (error) {
    console.warn("[rlb-glow] float light texture failed:", error);
    state.lightTexture = null;
  }

  return state.lightTexture;
}

export function updateRlbProximityShaderLights(BABYLON, lightEntries, options = {}) {
  if (!registerRlbProximityShaderPlugin(BABYLON)) {
    return 0;
  }

  syncRlbShaderDebugOptions(options);

  const Plugin = BABYLON.RlbProximityShaderPlugin;
  const state = Plugin.sharedState;
  const activeOnlyAtNight = options.activeOnlyAtNight !== false;
  const isNight = typeof options.isNight === "boolean"
    ? options.isNight
    : (typeof document !== "undefined" && document.body.classList.contains("is-night-mode"));

  state.innerRadius = typeof options.innerRadius === "number" ? options.innerRadius : 12;
  state.outerRadius = typeof options.outerRadius === "number" ? options.outerRadius : 22;

  if (options.spillColor?.set && state.spillColor?.copyFrom) {
    state.spillColor.copyFrom(options.spillColor);
  }

  if (typeof options.spillMultiplier === "number") {
    state.spillMultiplier = options.spillMultiplier;
  }

  if (typeof options.spillOpacity === "number") {
    state.spillOpacity = options.spillOpacity;
  }

  if (typeof options.spillMaxBlend === "number") {
    state.spillMaxBlend = options.spillMaxBlend;
  }

  if (typeof options.spillLumaPreserve === "number") {
    state.spillLumaPreserve = options.spillLumaPreserve;
  }

  state.lightTexData?.fill(0);
  state.lightCount = 0;
  state.lastSkipReason = null;
  state.lastEnabledCount = 0;
  state.occCount = 0;
  state.occMin?.fill(0);
  state.occMax?.fill(0);
  state.portalCount = 0;
  state.portalMin?.fill(0);
  state.portalMax?.fill(0);

  if (activeOnlyAtNight && !isNight && !options.previewActive && state.debugMode === RLB_SHADER_DEBUG_NORMAL) {
    state.lastSkipReason = "not-night";
    return 0;
  }

  if (!Array.isArray(lightEntries) || !lightEntries.length) {
    state.lastSkipReason = "no-lights";
    return 0;
  }

  const enabled = [];
  let resolvedCount = 0;

  for (let index = 0; index < lightEntries.length; index += 1) {
    const entry = lightEntries[index];
    const position = entry?.position;

    if (!position) {
      continue;
    }

    if (typeof options.isLightEntryEnabled === "function" && !options.isLightEntryEnabled(entry)) {
      continue;
    }

    resolvedCount += 1;
    enabled.push({ entry, position });
  }

  state.lastResolvedCount = resolvedCount;
  state.lastEnabledCount = enabled.length;
  state.lastPickReference = null;

  const pick = resolveRlbLightPickReference(BABYLON, options.camera, options.cameraPosition, options);
  state.lastPickReference = pick || null;
  state.nearestLightDistance = pick && enabled[0]
    ? BABYLON.Vector3.Distance(pick, enabled[0].position)
    : null;

  // Pack every shader-spill-enabled fixture. No nearest-N cull — only the GPU texture cap.
  const selected = enabled.slice(0, RLB_SHADER_MAX_LIGHTS);
  if (enabled.length > RLB_SHADER_MAX_LIGHTS) {
    console.warn(
      `[rlb-glow] shader-enabled lights=${enabled.length} exceed cap=${RLB_SHADER_MAX_LIGHTS}; extra skipped`
    );
  }
  state.lightCount = selected.length;

  const aabbs = Array.isArray(options.occluderAabbs) ? options.occluderAabbs : [];
  const inflate = 0.04;
  const occCap = Math.min(aabbs.length, RLB_SHADER_MAX_OCCLUDERS);
  for (let occIndex = 0; occIndex < occCap; occIndex += 1) {
    const aabb = aabbs[occIndex];
    const min = aabb?.min;
    const max = aabb?.max;

    if (!min || !max) {
      continue;
    }

    const packed = state.occCount * 4;
    state.occMin[packed] = min[0] - inflate;
    state.occMin[packed + 1] = min[1] - inflate;
    state.occMin[packed + 2] = min[2] - inflate;
    state.occMax[packed] = max[0] + inflate;
    state.occMax[packed + 1] = max[1] + inflate;
    state.occMax[packed + 2] = max[2] + inflate;
    state.occCount += 1;
  }

  const portals = Array.isArray(options.portalAabbs) ? options.portalAabbs : [];
  const portalInflate = 0.1;
  const portalCap = Math.min(portals.length, RLB_SHADER_MAX_PORTALS);
  for (let portalIndex = 0; portalIndex < portalCap; portalIndex += 1) {
    const aabb = portals[portalIndex];
    const min = aabb?.min;
    const max = aabb?.max;

    if (!min || !max) {
      continue;
    }

    const packed = state.portalCount * 4;
    state.portalMin[packed] = min[0] - portalInflate;
    state.portalMin[packed + 1] = min[1] - portalInflate;
    state.portalMin[packed + 2] = min[2] - portalInflate;
    state.portalMax[packed] = max[0] + portalInflate;
    state.portalMax[packed + 1] = max[1] + portalInflate;
    state.portalMax[packed + 2] = max[2] + portalInflate;
    state.portalCount += 1;
  }

  const tex = ensureRlbLightTexture(BABYLON, options.scene, state);
  const texData = state.lightTexData;
  let packedLineLights = 0;
  let packedLineHalf = 0;
  let packedCoveLights = 0;
  let packedSpotAims = 0;
  let packedSpots = 0;

  selected.forEach(({ entry, position }, index) => {
    const base = index * 16;
    const profile = typeof options.getLightProfile === "function"
      ? options.getLightProfile(entry)
      : null;
    const innerR = profile?.innerRadius ?? state.innerRadius;
    const outerR = profile?.outerRadius ?? state.outerRadius;
    const lightMul = profile?.spillMultiplier ?? 1;
    const aim = entry?.rlbType === "SpotLight"
      ? resolveRlbSpotlightAimFrame(BABYLON, entry)
      : null;
    if (entry?.rlbType === "SpotLight") {
      packedSpots += 1;
      if (aim) {
        packedSpotAims += 1;
      }
    }
    const useCheckpointCircle = !aim && isRlbCheckpointCircleSpotlight(entry);
    let shapeCode = aim ? 3 : (useCheckpointCircle ? 4 : (profile?.shapeCode ?? 0));
    // CoveLight: keep the line capsule, but pack as diffuse omni (2.35) so
    // the strip material is the source instead of a downward beam.
    if (entry?.rlbType === "CoveLight" && shapeCode >= 1.5 && shapeCode < 2.5) {
      shapeCode = 2.35;
      packedCoveLights += 1;
    }
    const coneSoftness = profile?.coneSoftness ?? 0.65;
    let posX = Number.isFinite(position?.x) ? position.x : 0;
    let posY = Number.isFinite(position?.y) ? position.y : 0;
    let posZ = Number.isFinite(position?.z) ? position.z : 0;
    let dirX = 0;
    let dirY = -1;
    let dirZ = 0;
    let halfLength = 0;

    if (aim?.origin && aim?.direction) {
      posX = aim.origin.x;
      posY = aim.origin.y;
      posZ = aim.origin.z;
      dirX = aim.direction.x;
      dirY = aim.direction.y;
      dirZ = aim.direction.z;
    } else if (shapeCode >= 1.5 && shapeCode < 2.5) {
      const frame = resolveRlbLightLineFrame(BABYLON, entry);

      if (frame?.origin) {
        posX = frame.origin.x;
        posY = frame.origin.y;
        posZ = frame.origin.z;
      }

      if (frame?.axis) {
        dirX = frame.axis.x;
        dirY = frame.axis.y;
        dirZ = frame.axis.z;
      }

      halfLength = frame?.halfLength ?? 0.08;
      packedLineLights += 1;
      packedLineHalf += halfLength;
    } else if (shapeCode >= 3 && shapeCode < 4) {
      const direction = resolveRlbLightWorldDirection(BABYLON, entry);

      if (direction) {
        dirX = direction.x;
        dirY = direction.y;
        dirZ = direction.z;
      }
    }

    const spillColor = profile?.spillColor || {
      r: state.spillColor.r,
      g: state.spillColor.g,
      b: state.spillColor.b
    };

    if (!texData) {
      return;
    }

    texData[base] = posX;
    texData[base + 1] = posY;
    texData[base + 2] = posZ;
    texData[base + 3] = 1;
    texData[base + 4] = innerR;
    texData[base + 5] = outerR;
    texData[base + 6] = lightMul;
    texData[base + 7] = shapeCode;
    texData[base + 8] = dirX;
    texData[base + 9] = dirY;
    texData[base + 10] = dirZ;
    texData[base + 11] = coneSoftness;
    texData[base + 12] = spillColor.r;
    texData[base + 13] = spillColor.g;
    texData[base + 14] = spillColor.b;
    texData[base + 15] = halfLength;
  });

  if (tex && texData && typeof tex.update === "function") {
    tex.update(texData);
  }

  if (packedLineLights > 0 && !state.loggedLineLights) {
    state.loggedLineLights = true;
    console.info(
      `[rlb-glow] LineLight packed=${packedLineLights}`
      + ` avgHalfLen=${(packedLineHalf / packedLineLights).toFixed(2)}`
      + ` (capsule source, beam spreads from the strip)`
    );
  }

  if (packedCoveLights > 0 && !state.loggedCoveLights) {
    state.loggedCoveLights = true;
    console.info(`[rlb-glow] CoveLight packed=${packedCoveLights} (capsule source, omni diffuse from strip)`);
  }

  if (packedSpots > 0 && !state.loggedSpotAims) {
    state.loggedSpotAims = true;
    console.info(`[rlb-glow] SpotLight packed=${packedSpots} d1d2Aim=${packedSpotAims}`);
  }

  return state.lightCount;
}

export function attachRlbProximityShaderPluginsSync(BABYLON, materials, options = {}) {
  const list = [...materials];
  const attachedNames = options.logMaterialNames ? [] : null;
  let attached = 0;

  list.forEach((material) => {
    try {
      if (attachRlbProximityShaderPlugin(BABYLON, material)) {
        attached += 1;
        material.markAsDirty?.(BABYLON.Material.AllDirtyFlag);

        if (attachedNames) {
          attachedNames.push(material.name || material.id || `#${attached}`);
        }
      }
    } catch (error) {
      console.warn("[rlb-glow] sync plugin attach failed:", error);
    }
  });

  if (attachedNames?.length) {
    console.log(`[rlb-glow] priority plugin materials (${attachedNames.length}):`, attachedNames.join(", "));
  }

  return attached;
}

export async function attachRlbProximityShaderPluginsChunked(BABYLON, materials, options = {}) {
  const list = [...materials];
  const chunkSize = typeof options.chunkSize === "number" ? options.chunkSize : 8;
  const skipNames = options.skipNames || null;
  const logMaterialNames = options.logMaterialNames === true;
  const attachedNames = [];
  let attached = 0;

  for (let index = 0; index < list.length; index += chunkSize) {
    const chunk = list.slice(index, index + chunkSize);

    chunk.forEach((material) => {
      const name = material.name || material.id || "";

      if (skipNames?.has(name)) {
        return;
      }

      try {
        if (attachRlbProximityShaderPlugin(BABYLON, material)) {
          attached += 1;
          material.markAsDirty?.(BABYLON.Material.AllDirtyFlag);

          if (logMaterialNames) {
            attachedNames.push(name || `#${attached}`);
          }
        }
      } catch (error) {
        console.warn("[rlb-glow] plugin chunk attach failed:", error);
      }
    });

    await new Promise((resolve) => {
      window.requestAnimationFrame(resolve);
    });
  }

  if (logMaterialNames && attachedNames.length) {
    console.log(`[rlb-glow] deferred plugin materials (${attachedNames.length}):`, attachedNames.join(", "));
  }

  return attached;
}
