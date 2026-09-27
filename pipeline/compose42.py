# v42 compose: colour, roughness/wetness/AO and normal maps from the Blender bakes (all 3D noise evaluated at each
# texel's baked object-space position, so patterns run continuously across UV seams).
# Outputs: liver42_albedo.webp 4K sRGB, liver42_normal.webp 4K tangent-space, liver42_orm.webp 2K (R AO, G roughness,
# B wetness), liver42_detail.png 512 tiling (R fine relief, G grain, B micro mottle, A unused). Copy them to assets/.
import numpy as np, os
from PIL import Image
from scipy.ndimage import zoom, distance_transform_edt
from noise3 import fbm, worley_f2f1
R=4096
pos=np.load('bake_pos.npy').astype(np.float32)          # (R,R,3) object space, rows bottom-up (Blender)
nrm=np.load('bake_normal.npy').astype(np.float32)
ao=zoom(np.load('bake_ao.npy').astype(np.float32)[...,0],2,order=1); cav=zoom(np.load('bake_cav.npy').astype(np.float32)[...,0],2,order=1)
cov=np.abs(pos).sum(-1)>1e-6
# repair: texels whose baked normal is implausible (missed cage rays on tiny charts) -> flat
n=nrm*2-1; bad=cov&((n[...,2]<0.35)|(np.linalg.norm(n,axis=-1)<0.6))
print('bad normal texels %.3f%%'%(100*bad.sum()/cov.sum()))
n[bad]=[0,0,1]
n[...,:2]*=0.9; n/=np.linalg.norm(n,axis=-1,keepdims=True)
X=pos[cov].astype(np.float64); N=len(X); print('texels',N)
def ev(fn,key=None):
    if key and os.path.exists(f'cache_{key}.npy'): return np.load(f'cache_{key}.npy')
    out=np.empty(N,np.float32)
    for s in range(0,N,1_000_000): out[s:s+1_000_000]=fn(X[s:s+1_000_000])
    if key: np.save(f'cache_{key}.npy',out)
    return out
lin=lambda h: (np.array([int(h[i:i+2],16) for i in (1,3,5)])/255.0)**2.2
base =lin('#4C2024')       # healthy tissue: deep red-brown, slight purple
purp =lin('#44202E'); brown=lin('#582A20'); dark=lin('#301218')
m1=ev(key='m1',fn=lambda x: fbm(x*1.6,3,seed=21))            # broad (~4 cm) purple/brown drift
m2=ev(key='m2',fn=lambda x: fbm(x*6.0,4,seed=33))            # patchy mottling (~1 cm)
m3=ev(key='m3',fn=lambda x: fbm(x*30.0,2,seed=45))           # very fine mottle (~2 mm)
lob=ev(key='lob',fn=lambda x: worley_f2f1(x*42.0,seed=57))    # lobules ~1.7 mm
def veins(x):
    w=x+0.08*np.stack([fbm(x*2.5,2,seed=61),fbm(x*2.5+3.1,2,seed=62),fbm(x*2.5+7.7,2,seed=63)],-1)
    r=1-np.abs(fbm(w*2.2,3,seed=67))*3.0; r2=1-np.abs(fbm(w*5.0,2,seed=71))*3.2
    return np.maximum(np.clip((r-0.80)/0.2,0,1)**2, 0.5*np.clip((r2-0.82)/0.18,0,1)**2)
vn=ev(veins,'vn')
wet=ev(key='wet',fn=lambda x: fbm(x*2.2,3,seed=81))           # patchy wet/satin areas (~3 cm)
a=ao[cov]; c=cav[cov]
col=np.tile(base,(N,1))
t=np.clip(m1*1.6,-1,1)[:,None]; col=np.where(t>0, col*(1-t*0.55)+purp*t*0.55, col*(1+t*0.5)-brown*t*0.5)
col*=(1+0.10*m2)[:,None]; col*=(1+0.05*m3)[:,None]
col*=(1-0.035*np.exp(-(lob/0.08)**2))[:,None]
col=col*(1-0.22*vn[:,None])+dark*0.22*vn[:,None]
col*=(0.55+0.45*a**0.8)[:,None]; col*=(0.80+0.20*c)[:,None]
col=np.clip(col,0,1)
rough=0.40-0.14*np.clip(wet*1.8+0.1,-1,1)*0.9-0.10*(1-c)+0.05*m3
wetn=np.clip(0.55+0.9*wet+0.4*(1-a),0,1)
rough=np.clip(rough,0.16,0.62)
def img(ch,fill):
    o=np.empty((R,R,ch),np.float32); o[...]=fill; return o
A=img(3,base); A[cov]=col
ORM=img(3,[1,0.4,0.5]); ORM[cov]=np.stack([a,rough,wetn],1)
_,ind=distance_transform_edt(~cov,return_indices=True)       # bleed charts into the gutter
A=A[ind[0],ind[1]]; ORM=ORM[ind[0],ind[1]]
n[~cov]=n[ind[0],ind[1]][~cov]
Image.fromarray((np.clip(A,0,1)**(1/2.2)*255+0.5).astype(np.uint8)[::-1]).save('liver42_albedo.webp',quality=90,method=6)
Image.fromarray(((n*0.5+0.5)*255+0.5).clip(0,255).astype(np.uint8)[::-1]).save('liver42_normal.webp',quality=94,method=6)
orm2=ORM.reshape(R//2,2,R//2,2,3).mean((1,3))
Image.fromarray((orm2*255+0.5).clip(0,255).astype(np.uint8)[::-1]).save('liver42_orm.webp',quality=92,method=6)
D=512
def per_noise(beta,seed):
    w=np.random.default_rng(seed).standard_normal((D,D)); f=np.fft.fftfreq(D); k=np.hypot(*np.meshgrid(f,f)); k[0,0]=1
    s=np.real(np.fft.ifft2(np.fft.fft2(w)/k**beta)); return (s-s.mean())/s.std()
def per_worley(cells,seed):
    r=np.random.default_rng(seed); pts=r.random((cells*cells,2))+np.stack(np.meshgrid(np.arange(cells),np.arange(cells)),-1).reshape(-1,2)
    pts=pts/cells; yy,xx=np.mgrid[0:D,0:D]/D; f1=np.full((D,D),9.0); f2=f1.copy()
    for ox in (-1,0,1):
        for oy in (-1,0,1):
            for p in pts:
                d=np.hypot(xx-(p[0]+ox),yy-(p[1]+oy)); m=d<f1; f2=np.where(m,f1,np.minimum(f2,d)); f1=np.where(m,d,f1)
    return (f2-f1)*cells
wl=per_worley(12,9)
Rr=np.clip(0.25+0.75*(1-np.exp(-(wl/0.10)**2))+0.08*per_noise(1.2,11),0,1)
Gg=np.clip(0.5+0.18*per_noise(0.8,12),0,1)
Bb=np.clip(0.5+0.16*per_noise(0.9,21)-0.06*np.exp(-(wl/0.10)**2),0,1)
det=np.stack([Rr,Gg,Bb,np.zeros_like(Rr)],-1)
Image.fromarray((det*255+0.5).astype(np.uint8),'RGBA').save('liver42_detail.png')
for f in ['liver42_albedo.webp','liver42_normal.webp','liver42_orm.webp','liver42_detail.png']: print(f,os.path.getsize(f)//1024,'KB')
