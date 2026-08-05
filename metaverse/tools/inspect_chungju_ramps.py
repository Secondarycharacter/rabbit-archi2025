#!/usr/bin/env python3
"""Inspect Chungju.glb ramp COL meshes: bounds, normals, slope."""
import json
import struct
import math
from pathlib import Path

GLB = Path(__file__).resolve().parents[1] / "assets" / "models" / "Chungju.glb"


def read_glb(path):
    with open(path, "rb") as f:
        assert struct.unpack("<I", f.read(4))[0] == 0x46546C67
        f.read(8)
        json_len, _ = struct.unpack("<I4s", f.read(8))
        gltf = json.loads(f.read(json_len))
        bin_len, _ = struct.unpack("<I4s", f.read(8))
        bin_data = f.read(bin_len)
    return gltf, bin_data


def accessor_data(gltf, bin_data, acc_idx):
    acc = gltf["accessors"][acc_idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    start = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    atype = acc["type"]
    ctype = acc["componentType"]
    comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[atype]
    fmt = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}[ctype]
    stride = bv.get("byteStride") or (comps * struct.calcsize(fmt))
    out = []
    for i in range(count):
        off = start + i * stride
        vals = struct.unpack_from("<" + fmt * comps, bin_data, off)
        out.append(vals if comps > 1 else (vals[0],))
    return out


def mat4_mul(a, b):
    r = [0.0] * 16
    for i in range(4):
        for j in range(4):
            r[i * 4 + j] = sum(a[i * 4 + k] * b[k * 4 + j] for k in range(4))
    return r


def transform_point(m, p):
    x, y, z = p
    w = m[3] * x + m[7] * y + m[11] * z + m[15]
    return (
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
    )


def node_world_matrix(node_idx, nodes, cache):
    if node_idx in cache:
        return cache[node_idx]
    n = nodes[node_idx]
    if "matrix" in n:
        T = list(n["matrix"])
    else:
        tx, ty, tz = n.get("translation", [0, 0, 0])
        sx, sy, sz = n.get("scale", [1, 1, 1])
        x, y, z, w = n.get("rotation", [0, 0, 0, 1])
        xx, yy, zz = x * x, y * y, z * z
        xy, xz, yz = x * y, x * z, y * z
        wx, wy, wz = w * x, w * y, w * z
        R = [
            1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
            2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
            2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
            0, 0, 0, 1,
        ]
        S = [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]
        T = mat4_mul(R, S)
        T[12], T[13], T[14] = tx, ty, tz
    if n.get("parent") is not None:
        T = mat4_mul(node_world_matrix(n["parent"], nodes, cache), T)
    cache[node_idx] = T
    return T


def slope_deg_from_normal(ny):
    if abs(ny) >= 1:
        return 0.0
    return math.degrees(math.acos(abs(ny)))


def main():
    gltf, bin_data = read_glb(GLB)
    mat_names = [m.get("name", "") for m in gltf.get("materials", [])]
    nodes = gltf["nodes"]
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            nodes[c]["parent"] = i

    cache = {}
    ramp_entries = []
    all_col = []

    for ni, n in enumerate(nodes):
        if n.get("mesh") is None:
            continue
        mesh = gltf["meshes"][n["mesh"]]
        mname = mesh.get("name", "")
        for pi, p in enumerate(mesh.get("primitives", [])):
            mi = p.get("material")
            if mi is None:
                continue
            mn = mat_names[mi]
            if not mn.startswith("0_COL"):
                continue
            pos = accessor_data(gltf, bin_data, p["attributes"]["POSITION"])
            wm = node_world_matrix(ni, nodes, cache)
            world_pts = [transform_point(wm, pt) for pt in pos]
            xs = [p[0] for p in world_pts]
            ys = [p[1] for p in world_pts]
            zs = [p[2] for p in world_pts]
            ny_vals = []
            if "NORMAL" in p["attributes"]:
                nrms = accessor_data(gltf, bin_data, p["attributes"]["NORMAL"])
                for nr in nrms:
                    wnr = transform_point(wm, nr)  # wrong for normals but direction-ish
                    ny_vals.append(abs(wnr[1]))
            # better: use local normals max y component
            if ny_local:
                # bucket normals
                buckets = {"flat>=0.9":0, "walkable 0.18-0.9":0, "vertical<0.18":0}
                for ny in ny_local:
                    if ny >= 0.9: buckets["flat>=0.9"] += 1
                    elif ny >= 0.18: buckets["walkable 0.18-0.9"] += 1
                    else: buckets["vertical<0.18"] += 1
                entry["normal_buckets"] = buckets

            entry = {
                "node": n.get("name", f"node-{ni}"),
                "mesh": mname or f"mesh-{n['mesh']}",
                "mat": mn,
                "prim": pi,
                "verts": len(pos),
                "bbox": (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)),
                "ny_min": min(ny_local) if ny_local else None,
                "ny_max": max(ny_local) if ny_local else None,
                "ny_avg": sum(ny_local) / len(ny_local) if ny_local else None,
            }
            all_col.append(entry)
            if "ramp" in mn.lower():
                ramp_entries.append(entry)

    print(f"=== Chungju COL ramp meshes: {len(ramp_entries)} ===")
    for r in ramp_entries:
        b = r["bbox"]
        slope_min = slope_deg_from_normal(r["ny_max"]) if r["ny_max"] else None
        slope_max = slope_deg_from_normal(r["ny_min"]) if r["ny_min"] else None
        print(f"\n{r['mat']} | node={r['node']!r} mesh={r['mesh']!r} prim={r['prim']} verts={r['verts']}")
        print(f"  world bbox: x[{b[0]:.2f},{b[1]:.2f}] y[{b[2]:.2f},{b[3]:.2f}] z[{b[4]:.2f},{b[5]:.2f}]")
        print(f"  size: dx={b[1]-b[0]:.2f} dy={b[3]-b[2]:.2f} dz={b[5]-b[4]:.2f}")
        if r["ny_min"] is not None:
            smin = slope_deg_from_normal(r["ny_max"]) if r["ny_max"] is not None else None
            smax = slope_deg_from_normal(r["ny_min"]) if r["ny_min"] is not None else None
            print(f"  normal.y range: {r['ny_min']:.3f} .. {r['ny_max']:.3f}")
            print(f"  slope from horizontal: {smin:.1f} deg .. {smax:.1f} deg")
            print(f"  walkable ground (ny>=0.18): {r['ny_max'] >= 0.18}")
            print(f"  body pass threshold ny>=0.9 for flat tread faces")

    print(f"\n=== All 0_COL materials ({len(all_col)} primitives) ===")
    from collections import Counter
    c = Counter(e["mat"] for e in all_col)
    for k, v in sorted(c.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
