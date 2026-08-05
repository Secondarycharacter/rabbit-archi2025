#!/usr/bin/env python3
"""Bounds analysis: full vs COL-only vs building assembly."""
import json, struct, math
from pathlib import Path

GLB = Path(__file__).resolve().parents[1] / "assets" / "models" / "Chungju.glb"

def read_glb(path):
    with open(path,'rb') as f:
        f.read(12)
        json_len,_=struct.unpack('<I4s',f.read(8))
        gltf=json.loads(f.read(json_len))
        bin_len,_=struct.unpack('<I4s',f.read(8))
        return gltf, f.read(bin_len)

def accessor_data(gltf,bin_data,acc_idx):
    acc=gltf['accessors'][acc_idx]; bv=gltf['bufferViews'][acc['bufferView']]
    start=bv.get('byteOffset',0)+acc.get('byteOffset',0); count=acc['count']
    comps={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[acc['type']]
    fmt={5126:'f'}[acc['componentType']]; stride=bv.get('byteStride') or comps*4
    return [struct.unpack_from('<'+fmt*comps,bin_data,start+i*stride) for i in range(count)]

def mat4_mul(a,b):
    r=[0.0]*16
    for i in range(4):
        for j in range(4):
            r[i*4+j]=sum(a[i*4+k]*b[k*4+j] for k in range(4))
    return r

def transform_point(m,p):
    x,y,z=p; w=m[3]*x+m[7]*y+m[11]*z+m[15] or 1
    return ((m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w)

def node_world_matrix(node_idx,nodes,cache):
    if node_idx in cache: return cache[node_idx]
    n=nodes[node_idx]
    if 'matrix' in n: T=list(n['matrix'])
    else:
        tx,ty,tz=n.get('translation',[0,0,0]); sx,sy,sz=n.get('scale',[1,1,1])
        x,y,z,w=n.get('rotation',[0,0,0,1]); xx,yy,zz=x*x,y*y,z*z; xy,xz,yz=x*y,x*z,y*z; wx,wy,wz=w*x,w*y,w*z
        R=[1-2*(yy+zz),2*(xy+wz),2*(xz-wy),0,2*(xy-wz),1-2*(xx+zz),2*(yz+wx),0,2*(xz+wy),2*(yz-wx),1-2*(xx+yy),0,0,0,0,1]
        S=[sx,0,0,0,0,sy,0,0,0,0,sz,0,0,0,0,1]; T=mat4_mul(R,S); T[12],T[13],T[14]=tx,ty,tz
    if n.get('parent') is not None: T=mat4_mul(node_world_matrix(n['parent'],nodes,cache),T)
    cache[node_idx]=T; return T

def is_under_assembly(node_idx, nodes, target='Assembly-7428'):
    cur=node_idx
    while cur is not None:
        if nodes[cur].get('name')==target: return True
        cur=nodes[cur].get('parent')
    return False

def bounds_of(pts):
    xs,ys,zs=zip(*pts)
    return min(xs),max(xs),min(ys),max(ys),min(zs),max(zs)

def norm_report(label, pts):
    if not pts: return
    b=bounds_of(pts)
    cx,cz=(b[0]+b[1])/2,(b[4]+b[5])/2
    off=(-cx,-b[2],-cz)
    nb=bounds_of([(p[0]+off[0],p[1]+off[1],p[2]+off[2]) for p in pts])
    print(f"\n{label}:")
    print(f"  raw Y: [{b[2]:.2f}, {b[3]:.2f}]  size Y={b[3]-b[2]:.2f}")
    print(f"  normalized (game-like) Y: [{nb[2]:.2f}, {nb[3]:.2f}]  X: [{nb[0]:.0f},{nb[1]:.0f}] Z: [{nb[4]:.0f},{nb[5]:.0f}]")

gltf,bin_data=read_glb(GLB)
mat_names=[m.get('name','') for m in gltf.get('materials',[])]
nodes=gltf['nodes']
for i,n in enumerate(nodes):
    for c in n.get('children',[]): nodes[c]['parent']=i
cache={}

all_pts=[]; col_pts=[]; col_b_pts=[]; asm_pts=[]
ramp_entries=[]; floor_entries=[]

for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    mesh=gltf['meshes'][n['mesh']]; wm=node_world_matrix(ni,nodes,cache)
    under_asm=is_under_assembly(ni,nodes)
    for pi,p in enumerate(mesh.get('primitives',[])):
        mi=p.get('material'); mn=mat_names[mi] if mi is not None else ''
        pos=accessor_data(gltf,bin_data,p['attributes']['POSITION'])
        pts=[transform_point(wm,pt) for pt in pos]
        all_pts.extend(pts)
        if under_asm: asm_pts.extend(pts)
        if mn.startswith('0_COL'):
            col_pts.extend(pts)
        if mn.startswith('0_COL_B'):
            col_b_pts.extend(pts)
        xs,ys,zs=[q[0] for q in pts],[q[1] for q in pts],[q[2] for q in pts]
        bb=(min(xs),max(xs),min(ys),max(ys),min(zs),max(zs))
        if 'ramp' in mn.lower() and mn.startswith('0_COL'):
            ramp_entries.append((n.get('name'),mn,bb,pi,ni))
        if 'floor' in mn.lower() and mn.startswith('0_COL_B'):
            floor_entries.append((n.get('name'),mn,bb))

norm_report('ALL geometry (matches normalizeModel getFullBounds)', all_pts)
norm_report('Assembly-7428 subtree only', asm_pts)
norm_report('0_COL_* only', col_pts)
norm_report('0_COL_B_* building COL only', col_b_pts)

# Relative positions WITHIN building COL (local to col_b minY)
if col_b_pts:
    b=bounds_of(col_b_pts)
    cx,cz=(b[0]+b[1])/2,(b[4]+b[5])/2
    off=(-cx,-b[2],-cz)
    print('\n=== BUILDING COL RELATIVE (Y min = 0) ===')
    for kind, entries in [('RAMP', ramp_entries), ('FLOOR', [(a,b,c) for a,b,c in floor_entries])]:
        for item in entries:
            if kind=='RAMP':
                node,mn,bb,pi,ni=item
            else:
                node,mn,bb=item
            ny0,ny1=bb[2]+off[1], bb[3]+off[1]
            nx0,nx1=bb[0]+off[0], bb[1]+off[0]
            nz0,nz1=bb[4]+off[2], bb[5]+off[2]
            print(f"  {mn:22} {node:16} relY={ny0:.2f}-{ny1:.2f} relX={nx0:.0f}-{nx1:.0f} relZ={nz0:.0f}-{nz1:.0f}")

# Gap in building-relative space
print('\n=== RAMP-FLOOR GAPS (building-relative coords) ===')
ramps_rel=[]
for node,mn,bb,pi,ni in ramp_entries:
    ramps_rel.append((node,mn,bb[2]+off[1],bb[3]+off[1],bb[0]+off[0],bb[1]+off[0],bb[4]+off[2],bb[5]+off[2]))
floors_rel=[(node,mn,bb[2]+off[1],bb[3]+off[1],bb[0]+off[0],bb[1]+off[1],bb[4]+off[2],bb[5]+off[2]) for node,mn,bb in floor_entries]

for rn,rm,ry0,ry1,rx0,rx1,rz0,rz1 in ramps_rel:
    print(f"\n{rn} ({rm}) relY={ry0:.2f}-{ry1:.2f}")
    for fn,fm,fy0,fy1,fx0,fx1,fz0,fz1 in sorted(floors_rel, key=lambda f: abs((f[2]+f[3])/2-(ry0+ry1)/2)):
        xz_ov = rx0<=fx1 and fx0<=rx1 and rz0<=fz1 and fz0<=rz1
        if xz_ov:
            y_gap = max(ry0-fy1, fy0-ry1, 0)
            print(f"  xz_overlap {fn} ({fm}) floor relY={fy0:.2f}-{fy1:.2f} Y_GAP={y_gap:.2f}m")

# Visual stair01 in assembly
print('\n=== VISUAL stair meshes in Assembly-7428 (no COL) ===')
count=0
for ni,n in enumerate(nodes):
    if n.get('mesh') is None or not is_under_assembly(ni,nodes): continue
    mesh=gltf['meshes'][n['mesh']]; wm=node_world_matrix(ni,nodes,cache)
    for pi,p in enumerate(mesh.get('primitives',[])):
        mi=p.get('material'); mn=mat_names[mi] if mi is not None else ''
        if mn.startswith('0_COL'): continue
        if 'stair' not in mn.lower(): continue
        pos=accessor_data(gltf,bin_data,p['attributes']['POSITION'])
        pts=[transform_point(wm,pt) for pt in pos]
        xs,ys,zs=[q[0] for q in pts],[q[1] for q in pts],[q[2] for q in pts]
        if max(xs)-min(xs)>200: continue
        ny0,ny1=min(ys)+off[1],max(ys)+off[1]
        print(f"  {mn:20} {n.get('name'):16} relY={ny0:.2f}-{ny1:.2f}")
        count+=1
print(f"  (shown {count} assembly visual stairs)")

# Tour camera check against building-relative
print('\n=== TOUR CAMERA vs BUILDING COL ===')
print('  tourCamera position y=6.51 — building COL relY range after col_b normalize:')
b=bounds_of(col_b_pts)
cx,cz=(b[0]+b[1])/2,(b[4]+b[5])/2
off=(-cx,-b[2],-cz)
nb=bounds_of([(p[0]+off[0],p[1]+off[1],p[2]+off[2]) for p in col_b_pts])
inside = "INSIDE" if nb[2] <= 6.51 <= nb[3] else "OUTSIDE"
print(f"  building COL relY: [{nb[2]:.2f}, {nb[3]:.2f}] — tour spawn y=6.51 is {inside}")
