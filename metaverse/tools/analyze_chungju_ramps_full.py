#!/usr/bin/env python3
"""Full Chungju.glb ramp collision audit."""
import json
import struct
import math
from pathlib import Path
from collections import Counter, defaultdict

GLB = Path(__file__).resolve().parents[1] / "assets" / "models" / "Chungju.glb"

RAMP_PREFIXES = [
    "0_col_b_ramp_1f", "0_col_b_ramp_2f", "0_col_b_ramp_3f", "0_col_b_ramp",
    "0_col_c_ramp_1f", "0_col_c_ramp_2f", "0_col_c_ramp_3f", "0_col_c_ramp",
]
FLOOR_PREFIXES = [
    "0_col_b_floor1", "0_col_b_floor2", "0_col_b_floor3",
    "0_col_c_floor", "00_col_c_floor",
]
PASS_THROUGH_KEYWORDS = ["defaultmaterial8", "people"]
RAMP_GROUND_NORMAL_MIN_Y = 0.08
CLASSIFIED_GROUND_NORMAL_MIN_Y = 0.18
WALL_NORMAL_MAX_Y = 0.9
GAP_THRESHOLD = 0.15  # meters


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
    if abs(w) < 1e-12:
        w = 1.0
    return (
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
    )


def transform_normal(m, n):
    x, y, z = n
    nx = m[0] * x + m[4] * y + m[8] * z
    ny = m[1] * x + m[5] * y + m[9] * z
    nz = m[2] * x + m[6] * y + m[10] * z
    ln = math.sqrt(nx * nx + ny * ny + nz * nz)
    if ln < 1e-12:
        return (0.0, 1.0, 0.0)
    return (nx / ln, ny / ln, nz / ln)


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


def matches_prefix(name, prefixes):
    n = name.strip().lower()
    return any(n == p or n.startswith(p) for p in prefixes)


def slope_deg(ny):
    return math.degrees(math.acos(min(1.0, abs(ny))))


def bbox_overlap(a, b, margin=0.0):
    return all(a[i] <= b[i + 1] + margin and b[i] <= a[i + 1] + margin for i in (0, 2, 4))


def bbox_gap_xz(a, b):
    """Min gap along X or Z between two bboxes (0 if overlapping)."""
    gaps = []
    for i in (0, 4):
        if a[i + 1] < b[i]:
            gaps.append(b[i] - a[i + 1])
        elif b[i + 1] < a[i]:
            gaps.append(a[i] - b[i + 1])
        else:
            gaps.append(0.0)
    return max(gaps)


def analyze_primitive(gltf, bin_data, node_idx, node, mesh, prim_idx, prim, mat_names, wm):
    mi = prim.get("material")
    if mi is None:
        return None
    mn = mat_names[mi]
    pos = accessor_data(gltf, bin_data, prim["attributes"]["POSITION"])
    world_pts = [transform_point(wm, pt) for pt in pos]
    xs = [p[0] for p in world_pts]
    ys = [p[1] for p in world_pts]
    zs = [p[2] for p in world_pts]
    bbox = (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))

    ny_world = []
    ny_local = []
    if "NORMAL" in prim["attributes"]:
        nrms = accessor_data(gltf, bin_data, prim["attributes"]["NORMAL"])
        for nr in nrms:
            wnr = transform_normal(wm, nr)
            ny_world.append(abs(wnr[1]))
            ny_local.append(abs(nr[1]))

    buckets = {"flat>=0.9": 0, "walkable 0.18-0.9": 0, "ramp_code>=0.08": 0, "vertical<0.18": 0, "blocked<0.08": 0}
    for ny in ny_world:
        if ny >= 0.9:
            buckets["flat>=0.9"] += 1
        elif ny >= CLASSIFIED_GROUND_NORMAL_MIN_Y:
            buckets["walkable 0.18-0.9"] += 1
        elif ny >= RAMP_GROUND_NORMAL_MIN_Y:
            buckets["ramp_code>=0.08"] += 1
        else:
            buckets["vertical<0.18"] += 1
        if ny < RAMP_GROUND_NORMAL_MIN_Y:
            buckets["blocked<0.08"] += 1

    total_n = len(ny_world) or 1
    pct_walkable_code = 100 * sum(1 for ny in ny_world if ny >= RAMP_GROUND_NORMAL_MIN_Y) / total_n
    pct_vertical = 100 * sum(1 for ny in ny_world if ny < CLASSIFIED_GROUND_NORMAL_MIN_Y) / total_n

    floor_level = None
    ml = mn.lower()
    if "_1f" in ml or "floor1" in ml:
        floor_level = 1
    elif "_2f" in ml or "floor2" in ml:
        floor_level = 2
    elif "_3f" in ml or "floor3" in ml:
        floor_level = 3

    return {
        "id": f"node-{node_idx}/mesh-{node['mesh']}/prim-{prim_idx}",
        "node_idx": node_idx,
        "node": node.get("name", f"node-{node_idx}"),
        "mesh_idx": node["mesh"],
        "mesh": mesh.get("name", f"mesh-{node['mesh']}"),
        "prim": prim_idx,
        "mat": mn,
        "mat_idx": mi,
        "verts": len(pos),
        "bbox": bbox,
        "ny_min": min(ny_world) if ny_world else None,
        "ny_max": max(ny_world) if ny_world else None,
        "ny_avg": sum(ny_world) / len(ny_world) if ny_world else None,
        "normal_buckets": buckets,
        "pct_walkable_code": pct_walkable_code,
        "pct_vertical": pct_vertical,
        "floor_level": floor_level,
        "is_ramp_mat": "ramp" in ml and mn.startswith("0_COL"),
        "is_ramp_code": matches_prefix(mn, RAMP_PREFIXES),
        "is_floor_mat": matches_prefix(mn, FLOOR_PREFIXES),
        "is_col": mn.startswith("0_COL"),
        "is_pass_through": any(k in ml for k in PASS_THROUGH_KEYWORDS),
    }


def main():
    gltf, bin_data = read_glb(GLB)
    mat_names = [m.get("name", f"mat-{i}") for i, m in enumerate(gltf.get("materials", []))]
    nodes = gltf["nodes"]
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            nodes[c]["parent"] = i

    cache = {}
    all_prims = []
    for ni, n in enumerate(nodes):
        if n.get("mesh") is None:
            continue
        mesh = gltf["meshes"][n["mesh"]]
        wm = node_world_matrix(ni, nodes, cache)
        for pi, prim in enumerate(mesh.get("primitives", [])):
            entry = analyze_primitive(gltf, bin_data, ni, n, mesh, pi, prim, mat_names, wm)
            if entry:
                all_prims.append(entry)

    ramp_prims = [p for p in all_prims if p["is_ramp_mat"] or "ramp" in p["mat"].lower()]
    ramp_code_prims = [p for p in all_prims if p["is_ramp_code"]]
    floor_prims = [p for p in all_prims if p["is_floor_mat"]]
    pass_prims = [p for p in all_prims if p["is_pass_through"]]
    col_prims = [p for p in all_prims if p["is_col"]]

    print("=" * 72)
    print("CHUNGJU.GLB RAMP COLLISION AUDIT")
    print(f"File: {GLB}")
    print(f"Total materials: {len(mat_names)}")
    print(f"Total mesh nodes: {sum(1 for n in nodes if n.get('mesh') is not None)}")
    print(f"Total COL primitives: {len(col_prims)}")
    print("=" * 72)

    # 1. All ramp meshes
    print(f"\n## 1. RAMP MESHES ({len(ramp_prims)} primitives matching 'ramp' in material)")
    print(f"   Code-recognized ramp prefixes: {len(ramp_code_prims)} primitives\n")

    for i, r in enumerate(sorted(ramp_prims, key=lambda x: x["mat"])):
        b = r["bbox"]
        print(f"--- [{i+1}] {r['id']} ---")
        print(f"  material: {r['mat']} (idx {r['mat_idx']})")
        print(f"  node: {r['node']!r}  mesh: {r['mesh']!r}  prim: {r['prim']}")
        print(f"  verts: {r['verts']}  floor_level: {r['floor_level']}")
        print(f"  world bbox: X[{b[0]:.3f},{b[1]:.3f}] Y[{b[2]:.3f},{b[3]:.3f}] Z[{b[4]:.3f},{b[5]:.3f}]")
        print(f"  size: dx={b[1]-b[0]:.3f} dy={b[3]-b[2]:.3f} dz={b[5]-b[4]:.3f}")
        if r["ny_min"] is not None:
            print(f"  normal.y (world): min={r['ny_min']:.4f} max={r['ny_max']:.4f} avg={r['ny_avg']:.4f}")
            print(f"  slope from horizontal: {slope_deg(r['ny_max']):.1f}° .. {slope_deg(r['ny_min']):.1f}°")
            print(f"  normal buckets: {r['normal_buckets']}")
            print(f"  walkable by code (ny>=0.08): {r['pct_walkable_code']:.1f}%")
            print(f"  vertical-only faces (ny<0.18): {r['pct_vertical']:.1f}%")
            if r["pct_walkable_code"] < 5:
                print("  ** PROBLEM: Almost no walkable faces — character cannot climb **")
            elif r["pct_vertical"] > 80:
                print("  ** WARNING: Mostly vertical faces — limited climb surface **")
        print(f"  code recognizes as ramp: {r['is_ramp_code']}")

    # Materials with ramp in name but not matching prefix
    odd_ramps = [p for p in ramp_prims if not p["is_ramp_code"]]
    if odd_ramps:
        print(f"\n  ** RAMP MATERIALS NOT MATCHING CODE PREFIXES ({len(odd_ramps)}): **")
        for p in odd_ramps:
            print(f"    - {p['mat']} on {p['node']}/{p['mesh']}")

    # 2. Vertical vs walkable summary
    print("\n## 2. VERTICAL vs WALKABLE CLASSIFICATION")
    vertical_only = [p for p in ramp_code_prims if p["pct_walkable_code"] < 5]
    mostly_vertical = [p for p in ramp_code_prims if 5 <= p["pct_walkable_code"] < 30]
    mixed = [p for p in ramp_code_prims if 30 <= p["pct_walkable_code"] < 70]
    walkable = [p for p in ramp_code_prims if p["pct_walkable_code"] >= 70]
    print(f"  Vertical-only (<5% walkable ny>=0.08): {len(vertical_only)}")
    for p in vertical_only:
        print(f"    - {p['mat']} | {p['node']} | ny_max={p['ny_max']:.3f}")
    print(f"  Mostly vertical (5-30%): {len(mostly_vertical)}")
    print(f"  Mixed (30-70%): {len(mixed)}")
    print(f"  Mostly walkable (>=70%): {len(walkable)}")
    for p in walkable:
        print(f"    + {p['mat']} | {p['node']} | {p['pct_walkable_code']:.0f}% walkable")

    # 3. Floor-ramp gaps
    print("\n## 3. RAMP ↔ FLOOR COL GAP ANALYSIS")
    print(f"  Floor COL primitives: {len(floor_prims)}")
    for fp in floor_prims:
        print(f"    {fp['mat']} | {fp['node']} | Y[{fp['bbox'][2]:.3f},{fp['bbox'][3]:.3f}]")

    gap_issues = []
    for ramp in ramp_code_prims:
        rb = ramp["bbox"]
        best_floor = None
        best_gap = 999
        for floor in floor_prims:
            fb = floor["bbox"]
            if not bbox_overlap(rb, fb, margin=2.0):
                continue
            xz_gap = bbox_gap_xz(rb, fb)
            y_gap_low = fb[2] - rb[3]  # floor below ramp top
            y_gap_high = rb[2] - fb[3]  # ramp below floor
            y_gap = max(y_gap_low, y_gap_high, 0)
            combined = max(xz_gap, y_gap)
            if combined < best_gap:
                best_gap = combined
                best_floor = floor
        if best_floor and best_gap > GAP_THRESHOLD:
            gap_issues.append((ramp, best_floor, best_gap))
        elif best_floor is None:
            gap_issues.append((ramp, None, None))

    print(f"\n  Potential gaps (>{GAP_THRESHOLD}m) or no nearby floor: {len(gap_issues)}")
    for ramp, floor, gap in gap_issues:
        if floor is None:
            print(f"  ** NO NEARBY FLOOR for {ramp['mat']} | {ramp['node']}")
            print(f"     ramp Y[{ramp['bbox'][2]:.3f},{ramp['bbox'][3]:.3f}] XZ center ({(ramp['bbox'][0]+ramp['bbox'][1])/2:.2f}, {(ramp['bbox'][4]+ramp['bbox'][5])/2:.2f})")
        else:
            print(f"  ** GAP {gap:.3f}m: {ramp['mat']} ({ramp['node']}) ↔ {floor['mat']} ({floor['node']})")
            print(f"     ramp Y[{ramp['bbox'][2]:.3f},{ramp['bbox'][3]:.3f}] floor Y[{floor['bbox'][2]:.3f},{floor['bbox'][3]:.3f}]")

    # Y-edge alignment per floor level
    print("\n  Y-edge alignment (ramp bottom/top vs floor slabs):")
    for level in [1, 2, 3]:
        ramps_l = [p for p in ramp_code_prims if p["floor_level"] == level]
        floors_l = [p for p in floor_prims if p["floor_level"] == level or (level == 1 and "floor1" in p["mat"].lower())]
        if not ramps_l:
            continue
        print(f"  Floor {level}F: {len(ramps_l)} ramps, {len(floors_l)} floor slabs")
        for ramp in ramps_l:
            rb = ramp["bbox"]
            for floor in floors_l:
                fb = floor["bbox"]
                if bbox_overlap(rb, fb, margin=3.0):
                    delta_bottom = rb[2] - fb[3]  # ramp bottom above floor top
                    delta_top = fb[2] - rb[3]     # floor bottom above ramp top
                    print(f"    {ramp['mat'][:30]:30} Y_bot={rb[2]:.3f} Y_top={rb[3]:.3f} | {floor['mat'][:20]:20} Y={fb[2]:.3f}-{fb[3]:.3f} | gap_bot={delta_bottom:.3f} gap_top={delta_top:.3f}")

    # 4. Pass-through overlap
    print("\n## 4. RAMP COL vs PASS-THROUGH VISUAL OVERLAP")
    print(f"  Pass-through visual primitives: {len(pass_prims)}")
    pt_mats = Counter(p["mat"] for p in pass_prims)
    for m, c in pt_mats.most_common(10):
        print(f"    {m}: {c}")

    overlaps = []
    for ramp in ramp_code_prims:
        rb = ramp["bbox"]
        for vis in pass_prims:
            vb = vis["bbox"]
            if bbox_overlap(rb, vb, margin=0.05):
                vol_r = (rb[1]-rb[0])*(rb[3]-rb[2])*(rb[5]-rb[4])
                ix0, ix1 = max(rb[0], vb[0]), min(rb[1], vb[1])
                iy0, iy1 = max(rb[2], vb[2]), min(rb[3], vb[3])
                iz0, iz1 = max(rb[4], vb[4]), min(rb[5], vb[5])
                if ix1 > ix0 and iy1 > iy0 and iz1 > iz0:
                    i_vol = (ix1-ix0)*(iy1-iy0)*(iz1-iz0)
                    overlaps.append((ramp, vis, i_vol / max(vol_r, 1e-9)))

    overlaps.sort(key=lambda x: -x[2])
    print(f"\n  Ramp COL overlapping pass-through visuals: {len(overlaps)}")
    for ramp, vis, ratio in overlaps[:20]:
        print(f"    {ramp['mat']} ({ramp['node']}) ∩ {vis['mat']} ({vis['node']}) overlap={ratio*100:.1f}% of ramp bbox")

    # Also check visual meshes at same location WITHOUT pass-through but non-COL
    visual_at_ramp = []
    for ramp in ramp_code_prims:
        rb = ramp["bbox"]
        for p in all_prims:
            if p["is_col"] or p["is_pass_through"]:
                continue
            if bbox_overlap(rb, p["bbox"], margin=0.1):
                visual_at_ramp.append((ramp, p))
    print(f"\n  Non-COL visual meshes overlapping ramp COL bboxes: {len(visual_at_ramp)}")
    seen = set()
    for ramp, vis in visual_at_ramp[:15]:
        key = (ramp["mat"], vis["mat"], vis["node"])
        if key in seen:
            continue
        seen.add(key)
        print(f"    ramp {ramp['mat']} + visual {vis['mat']} ({vis['node']})")

    # 5. Code expectations
    print("\n## 5. TOUR CODE EXPECTATIONS vs GLB")
    print("  Code ramp prefixes:", RAMP_PREFIXES[:4])
    print("  Code floor prefixes:", FLOOR_PREFIXES[:3])
    print(f"  Code RAMP_GROUND_NORMAL_MIN_Y = {RAMP_GROUND_NORMAL_MIN_Y}")
    print(f"  Chungju maxRampStepUp = 1.05")
    print(f"\n  GLB ramp primitives (code-recognized): {len(ramp_code_prims)}")
    print(f"  Unique ramp materials: {len(set(p['mat'] for p in ramp_code_prims))}")
    mat_counts = Counter(p["mat"] for p in ramp_code_prims)
    for m, c in sorted(mat_counts.items()):
        print(f"    {m}: {c} primitive(s)")

    # Check for missing floor levels
    levels_found = set(p["floor_level"] for p in ramp_code_prims if p["floor_level"])
    print(f"  Ramp floor levels in GLB: {sorted(levels_found)}")
    floor_levels = set()
    for p in floor_prims:
        ml = p["mat"].lower()
        if "floor1" in ml or "_1f" in ml:
            floor_levels.add(1)
        if "floor2" in ml or "_2f" in ml:
            floor_levels.add(2)
        if "floor3" in ml or "_3f" in ml:
            floor_levels.add(3)
    print(f"  Floor COL levels in GLB: {sorted(floor_levels)}")

    # All COL material inventory
    print("\n## APPENDIX: ALL 0_COL MATERIALS")
    col_counts = Counter(p["mat"] for p in col_prims)
    for m, c in sorted(col_counts.items()):
        flag = ""
        if "ramp" in m.lower():
            flag = " [RAMP]"
        elif "floor" in m.lower():
            flag = " [FLOOR]"
        print(f"  {m}: {c}{flag}")

    # Problem summary
    print("\n" + "=" * 72)
    print("## PROBLEM SUMMARY")
    problems = []
    if len(ramp_code_prims) == 0:
        problems.append("GLB: No ramp meshes match code prefixes — ramps won't be recognized")
    if odd_ramps:
        problems.append(f"GLB: {len(odd_ramps)} ramp-named materials don't match code prefixes")
    if vertical_only:
        problems.append(f"GLB: {len(vertical_only)} ramp meshes are vertical-only (cannot climb)")
    if gap_issues:
        problems.append(f"GLB/MODELING: {len(gap_issues)} ramp-floor gap or isolation issues")
    if overlaps:
        problems.append(f"MODELING: {len(overlaps)} ramp COL overlaps with pass-through visuals (visual pass, COL blocks?)")
    
    no_code = [p for p in ramp_prims if not p["is_ramp_code"]]
    if no_code:
        for p in no_code:
            problems.append(f"CODE/GLB MISMATCH: {p['mat']} has 'ramp' but won't get angjiRampSurface metadata")

    if not problems:
        print("  No major structural issues detected in GLB data.")
    else:
        for p in problems:
            print(f"  - {p}")

    # Verdict
    print("\n## VERDICT (GLB vs CODE)")
    glb_issues = len(vertical_only) + len(gap_issues) + len(odd_ramps)
    code_issues = 0
    if len(ramp_code_prims) == 0:
        code_issues += 1
    print(f"  GLB modeling issues: {glb_issues}")
    print(f"  Code configuration issues: {code_issues}")
    if glb_issues > code_issues:
        print("  Primary cause: GLB MODELING (geometry/materials/normals/gaps)")
    elif code_issues > 0:
        print("  Primary cause: CODE (prefix mismatch or missing recognition)")
    else:
        print("  Likely mixed: minor GLB issues may combine with code thresholds")


if __name__ == "__main__":
    main()
