#!/usr/bin/env python3
"""Supplement: spatial context for Chungju ramps."""
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

def prim_bbox(gltf,bin_data,ni,n,nodes,cache,mat_names):
    mesh=gltf['meshes'][n['mesh']]; wm=node_world_matrix(ni,nodes,cache)
    results=[]
    for pi,p in enumerate(mesh.get('primitives',[])):
        mi=p.get('material'); mn=mat_names[mi] if mi is not None else ''
        pos=accessor_data(gltf,bin_data,p['attributes']['POSITION'])
        pts=[transform_point(wm,pt) for pt in pos]
        xs,ys,zs=[q[0] for q in pts],[q[1] for q in pts],[q[2] for q in pts]
        results.append(dict(node=n.get('name'), mesh=mesh.get('name'), mat=mn, prim=pi,
            bbox=(min(xs),max(xs),min(ys),max(ys),min(zs),max(zs)), verts=len(pos)))
    return results

gltf,bin_data=read_glb(GLB)
mat_names=[m.get('name','') for m in gltf.get('materials',[])]
nodes=gltf['nodes']
for i,n in enumerate(nodes):
    for c in n.get('children',[]): nodes[c]['parent']=i
cache={}

keywords=['ramp','stair','tour_start','tour start','계단','경사']
print('=== ramp/stair/tour_start meshes ===')
rows=[]
for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    nm=(n.get('name') or '').lower()
    for entry in prim_bbox(gltf,bin_data,ni,n,nodes,cache,mat_names):
        ml=entry['mat'].lower(); mnm=(entry['mesh'] or '').lower()
        if any(k in nm or k in ml or k in mnm for k in keywords):
            rows.append(entry)
for r in sorted(rows, key=lambda x: x['bbox'][2]):
    b=r['bbox']
    print(f"{r['mat']:25} {r['node']:18} Y={b[2]:.2f}-{b[3]:.2f} X={b[0]:.0f}-{b[1]:.0f} Z={b[4]:.0f}-{b[5]:.0f} v={r['verts']}")

print('\n=== node hierarchy for ramp/floor nodes ===')
for target in ('3DGeom-7874','3DGeom-7877','3DGeom-7871','3DGeom-7890','Tour_Start'):
    for ni,n in enumerate(nodes):
        if n.get('name')==target:
            chain=[]; cur=ni
            while cur is not None:
                cn=nodes[cur]; t=cn.get('translation',[0,0,0]); s=cn.get('scale',[1,1,1])
                chain.append(f"{cn.get('name','node-'+str(cur))} tr={t} sc={s}"); cur=cn.get('parent')
            print(f"\n{target}:")
            for c in chain: print(' ',c)

# Distance from each ramp to nearest floor2 slab
floor2=[e for ni,n in enumerate(nodes) if n.get('mesh') is not None for e in prim_bbox(gltf,bin_data,ni,n,nodes,cache,mat_names) if 'floor2' in e['mat'].lower()]
ramps=[e for ni,n in enumerate(nodes) if n.get('mesh') is not None for e in prim_bbox(gltf,bin_data,ni,n,nodes,cache,mat_names) if 'ramp' in e['mat'].lower()]
print('\n=== nearest floor2 to each ramp (centroid distance) ===')
for ramp in ramps:
    rb=ramp['bbox']; rcx,rcy,rcz=(rb[0]+rb[1])/2,(rb[2]+rb[3])/2,(rb[4]+rb[5])/2
    best=None; best_d=1e9
    for fl in floor2:
        fb=fl['bbox']; fcx,fcy,fcz=(fb[0]+fb[1])/2,(fb[2]+fb[3])/2,(fb[4]+fb[5])/2
        d=math.sqrt((rcx-fcx)**2+(rcy-fcy)**2+(rcz-fcz)**2)
        if d<best_d: best_d=d; best=fl
    print(f"  {ramp['node']} center=({rcx:.1f},{rcy:.1f},{rcz:.1f}) -> nearest {best['node']} d={best_d:.1f}m floor Y={best['bbox'][2]:.2f}")

# Visual stair materials near floor2 Y band
print('\n=== visual meshes in floor2 Y band (6810-6920) with stair/ramp keywords ===')
for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    for e in prim_bbox(gltf,bin_data,ni,n,nodes,cache,mat_names):
        if e['mat'].startswith('0_COL'): continue
        b=e['bbox']
        if b[2]<6810 or b[3]>7400: continue
        nm=(e['node'] or '').lower(); ml=e['mat'].lower()
        if any(k in nm+ml for k in ['stair','ramp','step','계단','경사','slope']):
            print(f"  {e['mat']:30} {e['node']:18} Y={b[2]:.1f}-{b[3]:.1f}")

# Meshes in ramp Y band without COL
print('\n=== non-COL meshes in ramp Y band (7280-7370) ===')
count=0
for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    for e in prim_bbox(gltf,bin_data,ni,n,nodes,cache,mat_names):
        if e['mat'].startswith('0_COL'): continue
        b=e['bbox']
        if b[2]>7280 and b[3]<7370:
            count+=1
            if count<=20:
                print(f"  {e['mat']:30} {e['node']:18} Y={b[2]:.1f}-{b[3]:.1f}")
print(f"  ... total non-COL in band: {count}")
