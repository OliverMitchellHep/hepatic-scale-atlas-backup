# 3D noise helpers (gradient fBm, Worley F2-F1) used by hi42.py and compose42.py
import numpy as np
def _hash(i,j,k,seed):
    h=(i*73856093)^(j*19349663)^(k*83492791)^(seed*2654435761)
    h=(h^(h>>13))*1274126177; h=h^(h>>16); return (h&0xffffffff)/4294967296.0
def _grad(i,j,k,seed):
    a=_hash(i,j,k,seed)*6.2831853; b=np.arccos(2*_hash(i,j,k,seed+101)-1)
    return np.stack([np.sin(b)*np.cos(a),np.sin(b)*np.sin(a),np.cos(b)],-1)
def gnoise(X,seed=0):
    X=np.asarray(X,np.float64); I=np.floor(X).astype(np.int64); f=X-I; u=f*f*f*(f*(f*6-15)+10); out=0
    for dx in (0,1):
        for dy in (0,1):
            for dz in (0,1):
                g=_grad(I[...,0]+dx,I[...,1]+dy,I[...,2]+dz,seed); d=f-np.array([dx,dy,dz])
                w=(u[...,0] if dx else 1-u[...,0])*(u[...,1] if dy else 1-u[...,1])*(u[...,2] if dz else 1-u[...,2])
                out=out+w*(g*d).sum(-1)
    return out*1.6
def fbm(X,oct=4,seed=0,lac=2.03,gain=0.5):
    a=0; amp=1; tot=0
    for o in range(oct): a=a+amp*gnoise(X*lac**o+o*17.3,seed+o); tot+=amp; amp*=gain
    return a/tot
def worley_f2f1(X,seed=0):
    X=np.asarray(X,np.float64); I=np.floor(X).astype(np.int64); f1=np.full(X.shape[:-1],9.0); f2=f1.copy()
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            for dz in (-1,0,1):
                c=I+np.array([dx,dy,dz]); fp=np.stack([_hash(c[...,0],c[...,1],c[...,2],seed+s) for s in (0,1,2)],-1)
                d=np.linalg.norm(c+fp-X,axis=-1); m1=d<f1; f2=np.where(m1,f1,np.minimum(f2,d)); f1=np.where(m1,d,f1)
    return f2-f1
