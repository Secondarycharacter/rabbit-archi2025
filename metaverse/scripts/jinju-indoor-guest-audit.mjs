/**
 * Dump Jinju indoor guest spawn properties (marks 1-16).
 * Run: node metaverse/scripts/jinju-indoor-guest-audit.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUEST_ROOT = path.join(__dirname, "../assets/guest");

const configUrl = pathToFileURL(path.join(__dirname, "../src/jinju-indoor-guest-config.js")).href;
const {
  buildJinjuIndoorGuestSpawns,
  getJinjuIndoorGuestLoadYieldFrames,
  getJinjuIndoorGuestRevealDelayMs,
  getJinjuIndoorGuestPositionYOffset,
  JINJU_INDOOR_GUEST_CONFIG_VERSION
} = await import(configUrl);

function fileSizeMb(relativePath) {
  const fullPath = path.join(GUEST_ROOT, relativePath.replace(/\//g, path.sep));

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return Math.round((fs.statSync(fullPath).size / (1024 * 1024)) * 100) / 100;
}

function readGlbSummary(relativePath) {
  const fullPath = path.join(GUEST_ROOT, relativePath.replace(/\//g, path.sep));

  if (!fs.existsSync(fullPath)) {
    return { error: "missing file" };
  }

  try {
    const buffer = fs.readFileSync(fullPath);
    const jsonLen = buffer.readUInt32LE(12);
    const gltf = JSON.parse(buffer.slice(20, 20 + jsonLen).toString("utf8"));
    const meshCount = gltf.meshes?.length ?? 0;
    const nodeCount = gltf.nodes?.length ?? 0;
    const animationCount = gltf.animations?.length ?? 0;
    const materialCount = gltf.materials?.length ?? 0;
    const accessorCount = gltf.accessors?.length ?? 0;
    const animationNames = (gltf.animations || []).map((anim, index) => anim.name || `anim-${index}`);

    let totalVertices = 0;

    for (const mesh of gltf.meshes || []) {
      for (const primitive of mesh.primitives || []) {
        const accessor = gltf.accessors?.[primitive.attributes?.POSITION];

        if (accessor?.count) {
          totalVertices += accessor.count;
        }
      }
    }

    return {
      meshCount,
      nodeCount,
      animationCount,
      materialCount,
      accessorCount,
      totalVertices,
      animationNames
    };
  } catch (error) {
    return { error: String(error.message || error) };
  }
}

const spawns = buildJinjuIndoorGuestSpawns();
const fileUsage = new Map();

for (const spawn of spawns) {
  fileUsage.set(spawn.file, (fileUsage.get(spawn.file) || 0) + 1);
}

const rows = spawns.map((spawn) => {
  const mark = Number(spawn.id.replace("Jinju-Indoor-Mark-", ""));
  const glb = readGlbSummary(spawn.file);
  const sizeMb = fileSizeMb(spawn.file);
  const clips = spawn.animation?.clips || [];
  const sitClips = clips.filter((clip) => /^(sit|seat|sitting)/i.test(clip));

  return {
    mark,
    devLabel: spawn.devLabel,
    role: mark === 3 ? "fixed" : mark <= 2 || mark >= 12 ? "randomIdle" : "randomSitSeat",
    file: spawn.file,
    fileShort: spawn.file.split("/").pop(),
    sizeMb,
    fileReuseCount: fileUsage.get(spawn.file),
    animationType: spawn.animation?.type,
    clips,
    sitClipCount: sitClips.length,
    yOffset: getJinjuIndoorGuestPositionYOffset(spawn),
    loadYieldFrames: getJinjuIndoorGuestLoadYieldFrames(spawn.id),
    revealDelayMs: getJinjuIndoorGuestRevealDelayMs(spawn.id),
    glb
  };
});

const early = rows.filter((row) => row.mark <= 6);
const late = rows.filter((row) => row.mark > 6);

function summarizeGroup(label, group) {
  const totalSizeMb = group.reduce((sum, row) => sum + (row.sizeMb || 0), 0);
  const totalVertices = group.reduce((sum, row) => sum + (row.glb.totalVertices || 0), 0);
  const totalAnimations = group.reduce((sum, row) => sum + (row.glb.animationCount || 0), 0);
  const uniqueFiles = new Set(group.map((row) => row.file)).size;
  const heavyBoundsCandidates = group.filter((row) => (
    (row.glb.totalVertices || 0) > 50000
    || (row.sizeMb || 0) > 15
    || (row.glb.animationCount || 0) > 20
  ));

  return {
    label,
    count: group.length,
    uniqueFiles,
    totalSizeMb: Math.round(totalSizeMb * 100) / 100,
    totalVertices,
    totalAnimations,
    heavyBoundsCandidates: heavyBoundsCandidates.map((row) => ({
      mark: row.mark,
      devLabel: row.devLabel,
      file: row.fileShort,
      sizeMb: row.sizeMb,
      vertices: row.glb.totalVertices,
      animations: row.glb.animationCount
    }))
  };
}

console.log(`\n=== Jinju Indoor Guest Audit (${JINJU_INDOOR_GUEST_CONFIG_VERSION}) ===\n`);

console.log("--- Per guest (I01-I16) ---");
for (const row of rows) {
  const flags = [];

  if (row.mark > 6 && row.loadYieldFrames !== early.find((e) => e.mark === 1)?.loadYieldFrames && row.mark >= 10) {
    flags.push("yield↑");
  }

  if (row.mark > 6 && row.revealDelayMs > 250) {
    flags.push("delay↑");
  }

  if (row.mark >= 12 && row.role === "randomIdle") {
    flags.push("idle-switch");
  }

  if (row.fileReuseCount > 1) {
    flags.push(`reuse×${row.fileReuseCount}`);
  }

  if ((row.glb.totalVertices || 0) > 50000) {
    flags.push("heavy-mesh");
  }

  if ((row.sizeMb || 0) > 15) {
    flags.push("heavy-file");
  }

  console.log([
    `${row.devLabel} (mark ${row.mark})`,
    row.role,
    row.fileShort,
    `${row.sizeMb ?? "?"}MB`,
    `v=${row.glb.totalVertices ?? "?"}`,
    `anim=${row.glb.animationCount ?? "?"}`,
    `clips=[${row.clips.join(", ")}]`,
    `yield=${row.loadYieldFrames}`,
    `delay=${row.revealDelayMs}ms`,
    flags.length ? `FLAGS: ${flags.join(", ")}` : ""
  ].filter(Boolean).join(" | "));
}

console.log("\n--- Group comparison ---");
console.log(JSON.stringify(summarizeGroup("I01-I06 (early)", early), null, 2));
console.log(JSON.stringify(summarizeGroup("I07-I16 (after #6)", late), null, 2));

console.log("\n--- Structural differences after mark 6 ---");
console.log("- Mark 7-11: still randomSitSeat (same pool/rules as 4-6)");
console.log("- Mark 12-16: randomIdle (loop Idle) — animation type changes");
console.log("- Mark 10+: loadYieldFrames 4 (was 2), revealDelayMs 500ms (was 250ms)");
console.log("- Priority reveal: only I03 (Ninja), not related to mark 6 boundary");

console.log("\n--- Duplicate GLB usage (same file loaded for multiple marks) ---");
for (const [file, count] of [...fileUsage.entries()].sort((a, b) => b[1] - a[1])) {
  if (count > 1) {
    const marks = rows.filter((row) => row.file === file).map((row) => row.devLabel).join(", ");
    console.log(`  ${count}x ${file.split("/").pop()} → ${marks}`);
  }
}

console.log("\n--- Animation clip availability check (sit/seat marks 7-11) ---");
for (const row of rows.filter((r) => r.mark >= 7 && r.mark <= 11)) {
  const available = new Set(row.glb.animationNames || []);
  const missing = row.clips.filter((clip) => !available.has(clip));

  console.log(`  ${row.devLabel}: requested [${row.clips.join(", ")}] | missing: ${missing.length ? missing.join(", ") : "none"}`);
}

console.log("\n--- Animation clip availability check (idle marks 12-16) ---");
for (const row of rows.filter((r) => r.mark >= 12)) {
  const available = new Set(row.glb.animationNames || []);
  const hasIdle = available.has("Idle") || [...available].some((name) => /idle/i.test(name));

  console.log(`  ${row.devLabel}: Idle available=${hasIdle ? "yes" : "NO"} | glb anims=${(row.glb.animationNames || []).slice(0, 6).join(", ")}${(row.glb.animationNames || []).length > 6 ? "…" : ""}`);
}

console.log("");
