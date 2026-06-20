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

function readTimes(accIndex) {
  const acc = accessors[accIndex];
  const bv = bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const times = [];
  for (let i = 0; i < acc.count; i += 1) {
    times.push(bin.readFloatLE(offset + i * 4));
  }
  return times;
}

const anim = json.animations.find((a) => a.name === "Jump_Over");
const spineChannel = anim.channels.find((ch) => {
  const node = nodes[ch.target?.node];
  return node?.name === "spine" && ch.target?.path === "rotation";
});
const times = readTimes(anim.samplers[spineChannel.sampler].input);

console.log(`Jump_Over keys: ${times.length}, duration: ${times.at(-1).toFixed(3)}s`);
console.log(`First keys: ${times.slice(0, 5).map((t) => t.toFixed(3)).join(", ")}`);

function motionRateWindow(from, to) {
  const mid = (from + to) / 2;
  const dt = 0.05;
  const t0 = Math.max(from, mid - dt);
  const t1 = Math.min(to, mid + dt);
  const i0 = times.findIndex((t) => t >= t0);
  const i1 = times.findIndex((t) => t >= t1);
  return i1 > i0 ? (i1 - i0) / (times[i1] - times[i0] || 1) : 0;
}

console.log("\nIf start(0.601, 1.6) uses FRAMES at 30fps, play window =", ((1.6 - 0.601) / 30).toFixed(4), "s");
console.log("If start uses SECONDS (fps=1), play window =", (1.6 - 0.601).toFixed(3), "s");

[0.601, 1.6].forEach((t) => {
  const idx = times.findIndex((time) => time >= t);
  console.log(`  t=${t}s -> key index ${idx}, actual key time ${times[idx]?.toFixed(3)}`);
});
