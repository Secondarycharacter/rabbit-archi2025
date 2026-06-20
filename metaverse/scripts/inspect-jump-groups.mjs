import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buf = fs.readFileSync(path.join(__dirname, "../assets/character/rabbit01.glb"));
const jsonStart = buf.indexOf("{");
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(jsonStart, jsonStart + jsonLen).toString("utf8"));

const nodes = json.nodes || [];

(json.animations || []).forEach((anim, i) => {
  if (!/jump/i.test(anim.name || "")) return;

  const channelSummary = (anim.channels || []).slice(0, 5).map((ch) => {
    const node = nodes[ch.target?.node];
    return `${node?.name || "?"}:${ch.target?.path}`;
  });

  const accessors = json.accessors || [];
  const bufferViews = json.bufferViews || [];
  const bin = buf.slice(jsonStart + jsonLen + 8);
  let maxT = 0;
  (anim.channels || []).forEach((ch) => {
    const sampler = anim.samplers[ch.sampler];
    const acc = accessors[sampler.input];
    const bv = bufferViews[acc.bufferView];
    const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    for (let k = 0; k < acc.count; k += 1) {
      maxT = Math.max(maxT, bin.readFloatLE(offset + k * 4));
    }
  });

  console.log(`[${i}] ${anim.name} — duration: ${maxT.toFixed(3)}s, channels: ${anim.channels?.length}, sample: ${channelSummary.join(", ")}`);
});

function normalize(name) {
  return String(name || "").toLowerCase().replace(/[\s_-]+/g, "");
}

console.log("\nNormalized jump names:");
["Jump_Stand", "Jump_Down", "Jump_Running", "Jump_Over"].forEach((n) => {
  console.log(`  ${n} -> ${normalize(n)}`);
});
