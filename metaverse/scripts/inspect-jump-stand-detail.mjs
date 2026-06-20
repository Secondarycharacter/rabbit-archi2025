import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buf = fs.readFileSync(path.join(__dirname, "../assets/character/rabbit01.glb"));
const jsonStart = buf.indexOf("{");
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(jsonStart, jsonStart + jsonLen).toString("utf8"));
const bin = buf.slice(jsonStart + jsonLen);
const accessors = json.accessors;
const bufferViews = json.bufferViews;
const nodes = json.nodes;

function readAccessor(accIndex) {
  const acc = accessors[accIndex];
  const bv = bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const elemSize = acc.type === "VEC3" ? 12 : 4;
  const arr = [];
  for (let i = 0; i < acc.count; i++) {
    const base = offset + i * elemSize;
    if (acc.type === "VEC3") {
      arr.push([bin.readFloatLE(base), bin.readFloatLE(base + 4), bin.readFloatLE(base + 8)]);
    } else {
      arr.push(bin.readFloatLE(base));
    }
  }
  return arr;
}

const anim = json.animations.find((a) => a.name === "Jump_Stand");
console.log(`Jump_Stand channels: ${anim.channels.length}, samplers: ${anim.samplers.length}`);

const byPath = {};
anim.channels.forEach((ch) => {
  const node = nodes[ch.target?.node];
  const key = `${node?.name || "?"}:${ch.target?.path}`;
  byPath[key] = (byPath[key] || 0) + 1;
});

console.log("\nChannel types:");
Object.entries(byPath).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Sample rotation on spine at t=0 vs t=0.5
const rotCh = anim.channels.find((ch) => {
  const node = nodes[ch.target?.node];
  return node?.name === "spine" && ch.target?.path === "rotation";
});

if (rotCh) {
  const sampler = anim.samplers[rotCh.sampler];
  const times = readAccessor(sampler.input);
  const values = readAccessor(sampler.output);
  console.log(`\nSpine rotation keys: ${times.length}`);
  [0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((t) => {
    let idx = times.findIndex((time) => time >= t);
    if (idx < 0) idx = times.length - 1;
    const q = values[idx];
    console.log(`  t=${t.toFixed(1)}s rot=[${q.map((v) => v.toFixed(3)).join(", ")}]`);
  });
}

// Check overall animation duration from max time
let maxT = 0;
anim.samplers.forEach((s) => {
  const times = readAccessor(s.input);
  maxT = Math.max(maxT, times.at(-1) || 0);
});
console.log(`\nMax keyframe time: ${maxT.toFixed(3)}s`);

// List bones with significant translation range in Jump_Stand
console.log("\nBones with translation range > 0.5:");
anim.channels.filter((ch) => ch.target?.path === "translation").forEach((ch) => {
  const node = nodes[ch.target?.node];
  const sampler = anim.samplers[ch.sampler];
  const values = readAccessor(sampler.output);
  let minY = Infinity, maxY = -Infinity;
  values.forEach((v) => {
    minY = Math.min(minY, v[1]);
    maxY = Math.max(maxY, v[1]);
  });
  const range = maxY - minY;
  if (range > 0.5) {
    const times = readAccessor(sampler.input);
    console.log(`  ${node?.name}: Y range ${range.toFixed(2)} (${times.length} keys, t0=${times[0]?.toFixed(2)} t1=${times.at(-1)?.toFixed(2)})`);
  }
});
