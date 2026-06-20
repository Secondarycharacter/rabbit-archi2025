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

function readTimes(accessorIndex) {
  const acc = accessors[accessorIndex];
  const bv = bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const times = [];
  for (let i = 0; i < acc.count; i++) {
    times.push(bin.readFloatLE(offset + i * 4));
  }
  return times;
}

console.log("Jump clip durations:\n");
(json.animations || []).forEach((anim) => {
  if (!/jump/i.test(anim.name || "")) return;
  const maxT = anim.samplers?.reduce((max, s) => {
    const times = readTimes(s.input);
    return Math.max(max, times.at(-1) ?? 0);
  }, 0);
  console.log(`  ${anim.name}: ${maxT.toFixed(3)}s`);
});

// Estimate air time: v0=0.22, g=0.018 per frame at deltaScale~1, peak at v/g frames... simplified
const jumpForce = 0.22;
const gravity = 0.018;
const deltaScale = 1;
// simulate
let vy = jumpForce;
let t = 0;
let y = 0;
while (y >= 0 || t === 0) {
  t += deltaScale;
  vy -= gravity * deltaScale;
  y += vy * deltaScale;
  if (t > 500) break;
}
console.log(`\nEstimated air time (simple Euler): ${(t * 16.6667 / 1000).toFixed(3)}s at 60fps frames=${t}`);
// better: time to go up and down
// up until vy=0: frames = jumpForce/gravity = 12.22 frames = 0.204s up, same down = 0.408s total
const framesUp = jumpForce / gravity;
const airSeconds = (framesUp * 2 * 16.6667) / 1000;
console.log(`Estimated air time (symmetric): ${airSeconds.toFixed(3)}s`);
