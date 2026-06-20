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
const spineChannel = anim.channels.find((ch) => {
  const node = nodes[ch.target?.node];
  return node?.name === "spine" && ch.target?.path === "translation";
});

const sampler = anim.samplers[spineChannel.sampler];
const times = readAccessor(sampler.input);
const values = readAccessor(sampler.output);

const duration = times.at(-1);
console.log(`Jump_Stand duration: ${duration.toFixed(3)}s\n`);
console.log("Spine Y over time (landing/jump motion indicator):");

[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.8, 1.0, 1.5, 2.0, duration].forEach((t) => {
  let idx = times.findIndex((time) => time >= t);
  if (idx < 0) idx = times.length - 1;
  const y = values[idx][1];
  console.log(`  t=${t.toFixed(2)}s -> spine Y=${y.toFixed(2)}`);
});

console.log("\nFirst 5 keys spine Y:", values.slice(0, 5).map((v) => v[1].toFixed(2)));
console.log("Last 5 keys spine Y:", values.slice(-5).map((v) => v[1].toFixed(2)));
