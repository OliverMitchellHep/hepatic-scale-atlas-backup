# v42 high-detail liver for baking (numpy): 2x midpoint subdivision (80k -> 1.28M tris), Taubin smoothing to remove
# CT voxel stepping without shrinking, then gentle capsular relief along the normal from 3D gradient noise:
# broad undulation (~2-3 cm, 0.5 mm), soft shallow creases (Worley ridges, ~1 cm, 0.25 mm), fine grain (~3 mm, 0.08 mm).
# Model units: 1 unit ~ 7.0 cm (19.32 cm transverse over 2.76 units).
import numpy as np, scipy.sparse as sp
from noise3 import fbm, worley_f2f1
P=np.load('P.npy').astype(np.float64); idx=np.load('idx.npy').astype(np.int64)
def subdiv(V,F):
    E=np.sort(np.concatenate([F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]),1)
    u,inv=np.unique(E,axis=0,return_inverse=True); inv=inv.ravel()
    M=(V[u[:,0]]+V[u[:,1]])/2; n=len(V); V2=np.concatenate([V,M])
    a,b,c=(inv[:len(F)]+n,inv[len(F):2*len(F)]+n,inv[2*len(F):]+n)
    F2=np.concatenate([np.stack([F[:,0],a,c],1),np.stack([a,F[:,1],b],1),np.stack([c,b,F[:,2]],1),np.stack([a,b,c],1)])
    return V2,F2
def lap(V,F):
    n=len(V); r=np.concatenate([F[:,0],F[:,1],F[:,2],F[:,1],F[:,2],F[:,0]]); c=np.concatenate([F[:,1],F[:,2],F[:,0],F[:,0],F[:,1],F[:,2]])
    A=sp.csr_matrix((np.ones(len(r)),(r,c)),shape=(n,n)); A.data[:]=1; d=np.asarray(A.sum(1)).ravel()
    return sp.diags(1/d)@A
def taubin(V,F,it,lam=0.5,mu=-0.53):
    W=lap(V,F)
    for _ in range(it): V=V+lam*(W@V-V); V=V+mu*(W@V-V)
    return V
def normals(V,F):
    fn=np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]]); N=np.zeros_like(V)
    for k in range(3): np.add.at(N,F[:,k],fn)
    return N/np.linalg.norm(N,axis=1,keepdims=True)
V=taubin(P,idx,12)            # low-level smoothing of voxel steps before subdivision
V,F=subdiv(V,idx); V,F=subdiv(V,F); V=taubin(V,F,20)
N=normals(V,F)
h =0.0070*fbm(V*3.2,4,seed=3)                                     # broad undulation
cr=worley_f2f1(V*6.0,seed=7); h+=-0.0009*np.exp(-(cr/0.10)**2)   # very soft shallow creases (barely visible)
h+=0.0012*fbm(V*28.0,3,seed=11)                                   # fine grain
V=V+N*h[:,None]
np.save('hiV.npy',V.astype(np.float32)); np.save('hiF.npy',F.astype(np.int32)); print(len(V),len(F),h.std())
