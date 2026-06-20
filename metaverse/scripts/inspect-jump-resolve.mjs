import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeClipName(name) {
  return String(name || "").toLowerCase().replace(/[\s_-]+/g, "");
}

function findAnimationGroup(groups, clipName) {
  const normalizedTarget = normalizeClipName(clipName);

  return groups.find((group) => {
    const groupName = normalizeClipName(group.name);
    if (groupName === normalizedTarget) {
      return true;
    }

    return group.targetedAnimations.some((targeted) => (
      normalizeClipName(targeted.animation?.name) === normalizedTarget
    ));
  }) || null;
}

// Simulate Babylon groups: one group per glTF animation, group.name = anim.name
const buf = fs.readFileSync(path.join(__dirname, "../assets/character/rabbit01.glb"));
const jsonStart = buf.indexOf("{");
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(jsonStart, jsonStart + jsonLen).toString("utf8"));

const groups = (json.animations || []).map((anim) => ({
  name: anim.name,
  targetedAnimations: [{ animation: { name: anim.name } }]
}));

["Jump_Stand", "Jump_Down", "Jump_Running", "Jump_Over"].forEach((clip) => {
  const match = findAnimationGroup(groups, clip);
  console.log(`findAnimationGroup("${clip}") -> ${match?.name || "NULL"}`);
});

console.log("\nAll groups order:");
groups.forEach((g) => console.log(`  ${g.name}`));
