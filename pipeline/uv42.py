# v42: UV-unwrap the runtime CT liver with xatlas. Output keeps the original 39,997 vertices at their original
# indices (so cirrhosis/pathology code that indexes vertices is unchanged) and appends seam duplicates, each with
# origIndex = its source vertex. Faces keep their order (Couinaud picking and per-face data unaffected).
import numpy as np, xatlas, json
P=np.load('P.npy').astype(np.float32); idx=np.load('idx.npy').astype(np.uint32)
atlas=xatlas.Atlas(); atlas.add_mesh(P,idx)
co=xatlas.ChartOptions(); co.max_iterations=4; co.normal_deviation_weight=2.0; co.max_boundary_length=0
po=xatlas.PackOptions(); po.resolution=4096; po.padding=8; po.bilinear=True; po.bruteForce=False; po.blockAlign=True
atlas.generate(co,po)
vmap,ind,uv=atlas[0]
n=len(P); m=len(vmap)
print('verts',n,'->',m,'charts',atlas.chart_count,'util',atlas.utilization if hasattr(atlas,'utilization') else '')
# first xatlas vertex per original becomes the primary at the original index; the rest are appended
newidx=np.full(m,-1,np.int64); prim=np.full(n,-1,np.int64); dup=[]
for k in range(m):
    o=vmap[k]
    if prim[o]<0: prim[o]=k; newidx[k]=o
    else: newidx[k]=n+len(dup); dup.append(o)
assert (prim>=0).all()
dup=np.array(dup,np.int64); M=n+len(dup)
UV=np.zeros((M,2),np.float32); UV[newidx]=uv
F=newidx[ind].astype(np.int64)
# face order check: xatlas keeps input face order
orig=np.concatenate([np.arange(n),dup])
assert (orig[F]==idx).all(), 'face order changed'
assert M<65536
np.save('UV.npy',UV); np.save('F.npy',F); np.save('dup.npy',dup)
print('M',M,'dups',len(dup))
