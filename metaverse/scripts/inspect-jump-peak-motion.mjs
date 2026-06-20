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
  const stride = bv.byteStride || (acc.type === "VEC4" ? 16 : 12);
  const arr = [];
  for (let i = 0; i < acc.count; i++) {
    const base = offset + i * stride;
    if (acc.type === "VEC4") {
      arr.push([bin.readFloatLE(base), bin.readFloatLE(base + 4), bin.readFloatLE(base + 8), bin.readFloatLE(base + 12)]);
    }
  }
  return arr;
}

function quatAngle(q) {
  const [x, y, z, w] = q;
  const dot = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
  return 2 * Math.acos(Math.min(1, Math.abs(w / dot))) * (180 / Math.PI);
}

const anim = json.animations.find((a) => a.name === "Jump_Stand");
const ch = anim.channels.find((c) => nodes[c.target?.node]?.name === "upper_arm.L" && c.target?.path === "rotation");
const times = readAccessor(anim.samplers[ch.sampler].input);
const values = readAccessor(anim.samplers[ch.sampler].output);

let maxDelta = 0;
let maxAt = 0;
for (let i = 1; i < times.length; i++) {
  const dt = times[i] - times[i - 1];
  if (dt <= 0) continue;
  const delta = Math.abs(quatAngle(values[i]) - quatAngle(values[i - 1])) / dt;
  if (delta > maxDelta) {
    maxDelta = delta;
    maxAt = times[i];
  }
}

console.log(`upper_arm.L peak motion rate: ${maxDelta.toFixed(1)} deg/s near t=${maxAt.toFixed(2)}s`);
console.log(`Angle at t=0.41s (landing): ${quatAngle(values[Math.min(14, values.length - 1)]).toFixed(1)}deg`);

// spine translation range
const spineT = anim.channels.find((c) => nodes[c.target?.node]?.name === "spine" && c.target?.path === "translation");
const st = readAccessor(anim.samplers[spineT.sampler].input);
const sv = readAccessor(anim.samplers[spineT.sampler].output);
console.log(`\nspine translation: ${st.length} keys, Y ${sv[0][1].toFixed(2)} -> ${sv.at(-1)[1].toFixed(2)} (neutralizer strips this every frame)`);
