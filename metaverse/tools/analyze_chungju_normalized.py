#!/usr/bin/env python3
"""Normalized-space analysis mirroring normalizeModel()."""
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

def transform_normal(m,n):
    x,y,z=n
    nx,ny,nz=m[0]*x+m[4]*y+m[8]*z,m[1]*x+m[5]*y+m[9]*z,m[2]*x+m[6]*y+m[10]*z
    ln=math.sqrt(nx*nx+ny*ny+nz*nz) or 1
    return (nx/ln,ny/ln,nz/ln)

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

def normalize_like_js(pts):
    xs,ys,zs=zip(*pts)
    mn=(min(xs),min(ys),min(zs)); mx=(max(xs),max(ys),max(zs))
    cx,cy,cz=(mn[0]+mx[0])/2,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2
    # normalizeModel: position = (-center.x, -min.y, -center.z)
    off=(-cx,-mn[1],-cz)
    return [(p[0]+off[0],p[1]+off[1],p[2]+off[2]) for p in pts], off, (mn,mx)

gltf,bin_data=read_glb(GLB)
mat_names=[m.get('name','') for m in gltf.get('materials',[])]
nodes=gltf['nodes']
for i,n in enumerate(nodes):
    for c in n.get('children',[]): nodes[c]['parent']=i
cache={}

entries=[]
all_pts=[]
col_pts=[]
assembly_pts=[]

for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    mesh=gltf['meshes'][n['mesh']]; wm=node_world_matrix(ni,nodes,cache)
    in_assembly = any((nodes[nodes[ni]['parent']].get('name') or '').startswith('Assembly') or 
                       (n.get('name') or '').startswith('3DGeom-78') for _ in [1])
    for pi,p in enumerate(mesh.get('primitives',[])):
        mi=p.get('material'); mn=mat_names[mi] if mi is not None else ''
        pos=accessor_data(gltf,bin_data,p['attributes']['POSITION'])
        pts=[transform_point(wm,pt) for pt in pos]
        all_pts.extend(pts)
        if mn.startswith('0_COL'):
            col_pts.extend(pts)
        # assembly-7428 subtree: node 15166+
        chain=[]; cur=ni
        while cur is not None:
            nm=nodes[cur].get('name','')
            if nm=='Assembly-7428': break
            cur=nodes[cur].get('parent')
        is_bldg_col = mn.startswith('0_COL_B')
        ny_vals=[]
        if 'NORMAL' in p['attributes']:
            for nr in accessor_data(gltf,bin_data,p['attributes']['NORMAL']):
                wn=transform_normal(wm,nr); ny_vals.append(abs(wn[1]))
        xs,ys,zs=[q[0] for q in pts],[q[1] for q in pts],[q[2] for q in pts]
        entries.append(dict(node=n.get('name'),mat=mn,is_col=mn.startswith('0_COL'),
            is_bldg_col=is_bldg_col,bbox=(min(xs),max(xs),min(ys),max(ys),min(zs),max(zs)),
            ny_min=min(ny_vals) if ny_vals else None, ny_max=max(ny_vals) if ny_vals else None,
            pct_walk=100*sum(1 for y in ny_vals if y>=0.08)/max(len(ny_vals),1)))

norm_all, off_all, bounds_all = normalize_like_js(all_pts)
norm_col, _, _ = normalize_like_js(col_pts)

print('=== NORMALIZATION (mirrors normalizeModel) ===')
print(f'Raw all bounds Y: [{bounds_all[0][1]:.1f}, {bounds_all[1][1]:.1f}]')
print(f'Offset applied: ({off_all[0]:.1f}, {off_all[1]:.1f}, {off_all[2]:.1f})')

# Map entries to normalized Y using same offset
print('\n=== COL meshes in NORMALIZED space ===')
for e in sorted([x for x in entries if x['is_col']], key=lambda x: x['bbox'][2]):
    b=e['bbox']
    ny0,ny1=b[2]+off_all[1], b[3]+off_all[1]
    nx0,nx1=b[0]+off_all[0], b[1]+off_all[0]
    nz0,nz1=b[4]+off_all[2], b[5]+off_all[2]
    tag=''
    if 'ramp' in e['mat'].lower(): tag=' [RAMP]'
    elif 'floor' in e['mat'].lower(): tag=' [FLOOR]'
    elif 'stair' in e['mat'].lower(): tag=' [STAIR]'
    print(f"{e['mat']:22} {e['node']:16} normY={ny0:.2f}-{ny1:.2f} normX={nx0:.0f}-{nx1:.0f} normZ={nz0:.0f}-{nz1:.0f}{tag}")
    if e['ny_min'] is not None and 'ramp' in e['mat'].lower():
        print(f"  ny: {e['ny_min']:.3f}-{e['ny_max']:.3f} walkable%={e['pct_walk']:.0f}%")

# Tour camera reference
print('\n=== Tour spawn reference ===')
print('Config tourCamera Y ~ 6.51 (game units after normalize)')

# Gap analysis in normalized space
ramps=[e for e in entries if 'ramp' in e['mat'].lower() and e['is_col']]
floors=[e for e in entries if 'floor' in e['mat'].lower() and e['is_bldg_col']]
print('\n=== Normalized ramp-floor gaps ===')
for ramp in ramps:
    rb=ramp['bbox']
    rny0,rny1=rb[2]+off_all[1], rb[3]+off_all[1]
    print(f"\n{ramp['node']} ({ramp['mat']}) normY={rny0:.2f}-{rny1:.2f}")
    for fl in sorted(floors, key=lambda x: abs((x['bbox'][2]+x['bbox'][3])/2 - (rb[2]+rb[3])/2)):
        fb=fl['bbox']
        fny0,fny1=fb[2]+off_all[1], fb[3]+off_all[1]
        fnx0,fnx1=fb[0]+off_all[0], fb[1]+off_all[0]
        fnz0,fnz1=fb[4]+off_all[2], fb[5]+off_all[2]
        rnx0,rnx1=rb[0]+off_all[0], rb[1]+off_all[0]
        rnz0,rnz1=rb[4]+off_all[2], rb[5]+off_all[2]
        xz_overlap = rnx0<=fnx1 and fnx0<=rnx1 and rnz0<=fnz1 and fnz0<=rnz1
        y_gap = min(abs(rny0-fny1), abs(fny0-rny1)) if not (rny0<=fny1 and fny0<=rny1) else 0
        if xz_overlap or y_gap < 20:
            print(f"  near {fl['node']} ({fl['mat']}) normY={fny0:.2f}-{fny1:.2f} xz_overlap={xz_overlap} y_gap={y_gap:.2f}")

# Visual stair01 near building COL
print('\n=== Visual stair01 near building (normY 0-30) ===')
for e in entries:
    if e['is_col']: continue
    if 'stair' not in e['mat'].lower(): continue
    b=e['bbox']
    ny0,ny1=b[2]+off_all[1], b[3]+off_all[1]
    if ny0 > 50 or ny1 < -5: continue
    nx0,nx1=b[0]+off_all[0], b[1]+off_all[0]
    if nx1-nx0 > 500: continue  # skip huge merged
    print(f"  {e['mat']:15} {e['node']:16} normY={ny0:.2f}-{ny1:.2f} normX={nx0:.0f}-{nx1:.0f}")

# Check 0_COL_B_Stair
stair=[e for e in entries if e['mat']=='0_COL_B_Stair']
if stair:
    s=stair[0]; b=s['bbox']
    print(f"\n0_COL_B_Stair {s['node']} normY={b[2]+off_all[1]:.2f}-{b[3]+off_all[1]:.2f}")

# Missing ramp inventory
print('\n=== MISSING RAMP COVERAGE ===')
print('Expected by code: 0_COL_B_Ramp_1F, 0_COL_B_Ramp_2F, 0_COL_B_Ramp_3F (any prefix match)')
mats=set(e['mat'] for e in entries if e['is_col'])
for expected in ['0_COL_B_Ramp_1F','0_COL_B_Ramp_2F','0_COL_B_Ramp_3F','0_COL_B_Ramp']:
    found=[e for e in entries if e['mat'].lower().startswith(expected.lower())]
    print(f"  {expected}: {'FOUND '+str(len(found)) if found else 'MISSING'}")
