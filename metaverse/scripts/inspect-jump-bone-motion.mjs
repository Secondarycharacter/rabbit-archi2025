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
  const elemSize = acc.componentType === 5126
    ? (acc.type === "VEC3" ? 12 : acc.type === "VEC4" ? 16 : 4)
    : 4;
  const stride = bv.byteStride || elemSize;
  const arr = [];
  for (let i = 0; i < acc.count; i++) {
    const base = offset + i * stride;
    if (acc.type === "VEC3") {
      arr.push([bin.readFloatLE(base), bin.readFloatLE(base + 4), bin.readFloatLE(base + 8)]);
    } else if (acc.type === "VEC4") {
      arr.push([bin.readFloatLE(base), bin.readFloatLE(base + 4), bin.readFloatLE(base + 8), bin.readFloatLE(base + 12)]);
    } else {
      arr.push(bin.readFloatLE(base));
    }
  }
  return arr;
}

function sampleAt(times, values, t) {
  if (times.length === 1) return values[0];
  let idx = times.findIndex((time) => time >= t);
  if (idx <= 0) return values[0];
  if (idx < 0) return values.at(-1);
  const t0 = times[idx - 1];
  const t1 = times[idx];
  const a = (t - t0) / (t1 - t0);
  const v0 = values[idx - 1];
  const v1 = values[idx];
  if (typeof v0 === "number") return v0 + (v1 - v0) * a;
  return v0.map((n, i) => n + (v1[i] - n) * a);
}

function quatAngle(q) {
  const [x, y, z, w] = q;
  const dot = Math.sqrt(x * x + y * y + z * z + w * w);
  return 2 * Math.acos(Math.min(1, Math.abs(w / dot))) * (180 / Math.PI);
}

const anim = json.animations.find((a) => a.name === "Jump_Stand");
let maxT = 0;
anim.samplers.forEach((s) => {
  maxT = Math.max(maxT, readAccessor(s.input).at(-1) || 0);
});
console.log(`Jump_Stand max key time: ${maxT.toFixed(3)}s`);
console.log(`Physics air time ~0.41s => ${((0.41 / maxT) * 100).toFixed(1)}% into clip at landing\n`);

const bones = ["thigh.L", "thigh.R", "spine", "foot.L", "upper_arm.L"];
bones.forEach((boneName) => {
  const ch = anim.channels.find((c) => nodes[c.target?.node]?.name === boneName && c.target?.path === "rotation");
  if (!ch) {
    console.log(`${boneName}: no rotation channel`);
    return;
  }
  const sampler = anim.samplers[ch.sampler];
  const times = readAccessor(sampler.input);
  const values = readAccessor(sampler.output);
  console.log(`${boneName}: ${times.length} rot keys, t=[${times.map((t) => t.toFixed(2)).join(", ")}]`);
  [0, 0.2, 0.41, 0.6, 1.0, maxT].forEach((t) => {
    const q = sampleAt(times, values, t);
    console.log(`  t=${t.toFixed(2)}s angle=${quatAngle(q).toFixed(1)}deg q=[${q.map((v) => v.toFixed(2)).join(",")}]`);
  });
  console.log("");
});
