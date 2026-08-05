#!/usr/bin/env python3
import json, struct, math
from pathlib import Path

GLB = Path(__file__).resolve().parents[1] / "assets" / "models" / "Chungju.glb"

def read_glb(path):
    with open(path,'rb') as f:
        f.read(12); jl,_=struct.unpack('<I4s',f.read(8)); gltf=json.loads(f.read(jl)); bl,_=struct.unpack('<I4s',f.read(8)); return gltf,f.read(bl)

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

def prim_bbox(gltf,bin_data,ni,n,mat_names,cache):
    mesh=gltf['meshes'][n['mesh']]; wm=node_world_matrix(ni,nodes,cache)
    out=[]
    for pi,p in enumerate(mesh.get('primitives',[])):
        mi=p.get('material'); mn=mat_names[mi] if mi is not None else ''
        pos=accessor_data(gltf,bin_data,p['attributes']['POSITION'])
        pts=[transform_point(wm,pt) for pt in pos]
        xs,ys,zs=zip(*pts)
        out.append((mn,n.get('name'),(min(xs),max(xs),min(ys),max(ys),min(zs),max(zs)),len(pos)))
    return out

gltf,bin_data=read_glb(GLB)
mat_names=[m.get('name','') for m in gltf.get('materials',[])]
nodes=gltf['nodes']
for i,n in enumerate(nodes):
    for c in n.get('children',[]): nodes[c]['parent']=i
cache={}

# All COL entries summary table
print('ID | Material | Node | Verts | World BBox (X,Y,Z) | ny range | walk%')
idx=1
for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    for mn,node,bb,verts in prim_bbox(gltf,bin_data,ni,n,mat_names,cache):
        if 'ramp' not in mn.lower() and 'floor' not in mn.lower(): continue
        if not mn.startswith('0_COL_B'): continue
        mesh=gltf['meshes'][n['mesh']]; wm=node_world_matrix(ni,nodes,cache)
        ny=[]
        for pi,p in enumerate(mesh['primitives']):
            if p.get('material') is None or mat_names[p['material']]!=mn: continue
            if 'NORMAL' in p['attributes']:
                for nr in accessor_data(gltf,bin_data,p['attributes']['NORMAL']):
                    wny=transform_point(wm,nr)[1]  # approx
                    ny.append(abs(wny))
        ny_str=f'{min(ny):.3f}-{max(ny):.3f}' if ny else 'n/a'
        wp=100*sum(1 for y in ny if y>=0.08)/max(len(ny),1) if ny else 0
        print(f'R{idx:02d}|{mn}|{node}|{verts}|X[{bb[0]:.1f},{bb[1]:.1f}] Y[{bb[2]:.1f},{bb[3]:.1f}] Z[{bb[4]:.1f},{bb[5]:.1f}]|{ny_str}|{wp:.0f}%')
        idx+=1

# XZ distance matrix ramps vs floors
ramps=[]; floors=[]
for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    for mn,node,bb,verts in prim_bbox(gltf,bin_data,ni,n,mat_names,cache):
        if mn=='0_COL_B_Ramp_2F': ramps.append((node,bb))
        if mn.startswith('0_COL_B_Floor'): floors.append((node,mn,bb))

print('\nXZ distance ramp centroid to floor centroids (m):')
for rn,rb in ramps:
    rcx,rcy,rcz=(rb[0]+rb[1])/2,(rb[2]+rb[3])/2,(rb[4]+rb[5])/2
    print(f'  {rn} at ({rcx:.1f},{rcy:.1f},{rcz:.1f})')
    for fn,fm,fb in sorted(floors, key=lambda f: math.hypot((f[2][0]+f[2][1])/2-rcx,(f[2][4]+f[2][5])/2-rcz)):
        fcx,fcy,fcz=(fb[0]+fb[1])/2,(fb[2]+fb[3])/2,(fb[4]+fb[5])/2
        d=math.hypot(fcx-rcx,fcz-rcz); dy=rcy-fcy
        print(f'    -> {fn} {fm}: xz={d:.1f} dy={dy:.1f}')

# Visual non-COL near any floor2 slab
print('\nVisual (non-COL) within 20m XZ of any 0_COL_B_Floor2:')
seen=set()
for ni,n in enumerate(nodes):
    if n.get('mesh') is None: continue
    for mn,node,bb,verts in prim_bbox(gltf,bin_data,ni,n,mat_names,cache):
        if mn.startswith('0_COL'): continue
        cx,cz=(bb[0]+bb[1])/2,(bb[4]+bb[5])/2
        for fn,fm,fb in floors:
            if 'Floor2' not in fm: continue
            fcx,fcz=(fb[0]+fb[1])/2,(fb[4]+fb[5])/2
            if math.hypot(cx-fcx,cz-fcz)>20: continue
            key=(mn,node)
            if key in seen: break
            seen.add(key)
            pt=' [PASS-THROUGH in tour]' if any(k in mn.lower() for k in ['people','defaultmaterial8']) else ''
            print(f'  {mn:30} {node:16} Y={bb[2]:.1f}-{bb[3]:.1f} near {fn}{pt}')
            break
