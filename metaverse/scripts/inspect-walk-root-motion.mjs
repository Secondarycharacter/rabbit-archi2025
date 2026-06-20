import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const glbPath = path.join(__dirname, "../assets/character/rabbit01.glb");
const buf = fs.readFileSync(glbPath);
const jsonStart = buf.indexOf("{");
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(jsonStart, jsonStart + jsonLen).toString("utf8"));

const nodes = json.nodes || [];
const nodeName = (i) => nodes[i]?.name || `node_${i}`;
const anims = json.animations || [];
const accessors = json.accessors || [];
const bufferViews = json.bufferViews || [];
const bin = buf.slice(jsonStart + jsonLen);

function readAccessor(accIndex) {
  const acc = accessors[accIndex];
  const bv = bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const arr = [];
  for (let i = 0; i < acc.count; i++) {
    const base = offset + i * 12;
    arr.push([
      bin.readFloatLE(base),
      bin.readFloatLE(base + 4),
      bin.readFloatLE(base + 8)
    ]);
  }
  return arr;
}

console.log("=== Walking animation channels ===\n");

anims.forEach((anim) => {
  if (!anim.name?.includes("Walking") && anim.name !== "Walking") {
    return;
  }

  console.log(`Animation: ${anim.name}`);
  (anim.channels || []).forEach((ch) => {
    const target = ch.target || {};
    const path = target.path;
    const node = nodeName(target.node);
    const sampler = anim.samplers?.[ch.sampler];
    let delta = "";

    if (path === "translation" && sampler?.output !== undefined) {
      const vals = readAccessor(sampler.output);
      const xs = vals.map((v) => v[0]);
      const ys = vals.map((v) => v[1]);
      const zs = vals.map((v) => v[2]);
      const range = (arr) => Math.max(...arr) - Math.min(...arr);
      delta = `  range X=${range(xs).toFixed(4)} Y=${range(ys).toFixed(4)} Z=${range(zs).toFixed(4)}`;
      delta += `  first=[${vals[0].map((v) => v.toFixed(4)).join(",")}] last=[${vals.at(-1).map((v) => v.toFixed(4)).join(",")}]`;
    }

    console.log(`  ${node} . ${path}${delta}`);
  });
  console.log();
});
