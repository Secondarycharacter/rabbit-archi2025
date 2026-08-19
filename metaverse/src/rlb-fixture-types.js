/** RabbitLightBaker / Angji.glb RLB fixture type detection (shared). */

export const RLB_FIXTURE_TYPE_MAP = {
  downlight: "DownLight",
  spotlight: "SpotLight",
  linelight: "LineLight",
  panellight: "PanelLight",
  outdoorlight: "OutdoorLight",
  walllight: "WallLight",
  covelight: "CoveLight",
  windowlight: "WindowLight",
  emergencylight: "EmergencyLight",
  glassglow: "GlassGlow",
  signlight: "SignLight",
  stairlight: "StairLight",
  groundlight: "GroundLight"
};

export const RLB_TUNING_TYPE_ORDER = [
  "Global",
  "DownLight",
  "Down02",
  "SpotLight",
  "LineLight",
  "PanelLight",
  "WallLight",
  "CoveLight",
  "OutdoorLight",
  "WindowLight",
  "GroundLight",
  "StairLight",
  "SignLight",
  "EmergencyLight",
  "GlassGlow",
  "Default"
];

export const RLB_SHAPE = {
  AUTO: "auto",
  CIRCLE: "circle",
  RECT: "rect",
  LINE: "line",
  CONE: "cone"
};

export const RLB_SHAPE_CODE = {
  circle: 0,
  rect: 1,
  line: 2,
  cone: 3
};

const AUTO_SHAPE_BY_TYPE = {
  DownLight: RLB_SHAPE.CIRCLE,
  Down02: RLB_SHAPE.CIRCLE,
  SpotLight: RLB_SHAPE.CONE,
  OutdoorLight: RLB_SHAPE.CIRCLE,
  GroundLight: RLB_SHAPE.CIRCLE,
  EmergencyLight: RLB_SHAPE.CIRCLE,
  PanelLight: RLB_SHAPE.RECT,
  WallLight: RLB_SHAPE.CONE,
  WindowLight: RLB_SHAPE.RECT,
  SignLight: RLB_SHAPE.RECT,
  GlassGlow: RLB_SHAPE.RECT,
  LineLight: RLB_SHAPE.LINE,
  CoveLight: RLB_SHAPE.LINE,
  StairLight: RLB_SHAPE.LINE,
  Default: RLB_SHAPE.CIRCLE
};

function normalizeMaterialName(name) {
  return String(name || "").trim();
}

function normalizeRlbMaterialKey(name) {
  return normalizeMaterialName(name).replace(/[\s_-]+/g, "").toLowerCase();
}

/** RLB_SpotLight_D1 / D2 are aim guides, not extra fixtures. */
export function resolveRlbSpotlightAimKind(name) {
  const normalized = normalizeRlbMaterialKey(name);

  if (normalized.includes("spotlightd1")) {
    return "d1";
  }

  if (normalized.includes("spotlightd2")) {
    return "d2";
  }

  return null;
}

export function isRlbSpotlightAimMaterialName(name) {
  return Boolean(resolveRlbSpotlightAimKind(name));
}

export function resolveRlbFixtureTypeFromMaterialName(name) {
  const normalized = normalizeRlbMaterialKey(name);

  if (!normalized || normalized.includes("lightcover") || isRlbSpotlightAimMaterialName(name)) {
    return null;
  }

  if (/^lightdown0*2(?:\.\d+)?$/.test(normalized) || normalized.includes("lightdown02")) {
    return "Down02";
  }

  if (!normalized.startsWith("rlb")) {
    return null;
  }

  const rest = normalized.slice(3);
  return RLB_FIXTURE_TYPE_MAP[rest] || "Default";
}

export function resolveRlbFixtureTypeFromMesh(mesh) {
  if (!mesh?.material) {
    return null;
  }

  const names = Array.isArray(mesh.material.subMaterials)
    ? mesh.material.subMaterials.map((material) => material?.name || material?.id || "")
    : [mesh.material.name || mesh.material.id || ""];

  for (const name of names) {
    const type = resolveRlbFixtureTypeFromMaterialName(name);

    if (type) {
      return type;
    }
  }

  return null;
}

export function resolveRlbSpillShapeCode(type, shapeSetting = RLB_SHAPE.AUTO) {
  let shape = shapeSetting === RLB_SHAPE.AUTO
    ? (AUTO_SHAPE_BY_TYPE[type] || AUTO_SHAPE_BY_TYPE.Default)
    : shapeSetting;

  if (type === "WallLight" && shape === RLB_SHAPE.RECT) {
    shape = RLB_SHAPE.CONE;
  }

  return RLB_SHAPE_CODE[shape] ?? RLB_SHAPE_CODE.circle;
}

export function formatRlbTuningTabLabel(typeName, count = 0) {
  if (typeName === "Global") {
    return "Global";
  }

  const label = typeName === "Default" ? "RLB 기타" : `RLB ${typeName}`;
  return count > 0 ? `${label} (${count})` : label;
}

/** Global + RLB fixture types that exist in the model (count > 0), in stable order. */
export function listPresentRlbTuningTypes(counts = {}) {
  const present = RLB_TUNING_TYPE_ORDER.filter(
    (typeName) => typeName !== "Global" && (counts[typeName] || 0) > 0
  );

  return ["Global", ...present];
}
