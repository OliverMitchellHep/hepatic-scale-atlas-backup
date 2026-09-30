# Engraving-style rendering of the atlas liver (tests/baseline/liver_ant.png): curved line-screen hatching modulated by tone.
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
src=Image.open('/home/user/hepatic-scale-atlas/tests/baseline/liver_ant.png').convert('RGB')
a0=np.asarray(src).astype(float)
m=a0.max(axis=2)>26
m=ndi.binary_fill_holes(ndi.binary_closing(m,iterations=3))
lab,n=ndi.label(m); m=lab==(1+int(np.argmax(ndi.sum(m,lab,range(1,n+1)))))
m=ndi.binary_erosion(ndi.binary_opening(m,iterations=2),iterations=2)
ys,xs=np.where(m); bb=(xs.min()-4,ys.min()-4,xs.max()+5,ys.max()+5)
src=src.crop(bb); mk=Image.fromarray((m*255).astype('uint8')).crop(bb)
gb=(a0[...,1]-a0[...,2]); lg=(gb>=17)&(a0[...,1]>112)&m
lg=ndi.binary_opening(ndi.binary_closing(lg,iterations=2),iterations=1)
lb,nn=ndi.label(lg); lg=lb==(1+int(np.argmax(ndi.sum(lg,lb,range(1,nn+1)))))
lgi=Image.fromarray((lg*255).astype('uint8')).crop(bb)
K=2.2
W,H=int(src.width*K),int(src.height*K)
src=src.resize((W,H),Image.BICUBIC); mk=mk.resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.0))
lig0=np.asarray(lgi.resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.5))).astype(float)/255
a=np.asarray(src).astype(float)/255; mask=np.asarray(mk).astype(float)/255
L=(0.3*a[...,0]+0.55*a[...,1]+0.15*a[...,2])
L=ndi.gaussian_filter(L,2.2)
# normalise tone inside mask to 0..1 (0 dark)
v=L[mask>.5]; lo,hi=np.percentile(v,2),np.percentile(v,99)
t=np.clip((L-lo)/(hi-lo),0,1)**0.42
yy,xx=np.mgrid[0:H,0:W].astype(float)
def screen(theta,pitch,warp):
    th=np.deg2rad(theta)
    u=(xx*np.cos(th)+yy*np.sin(th))+warp*ndi.gaussian_filter(t,6)*pitch*6
    return (np.cos(2*np.pi*u/pitch))            # -1..1
# line width from tone: darker tone -> thicker line -> threshold on cosine
def layer(theta,pitch,warp,dark_at,full_at):
    s=screen(theta,pitch,warp)
    need=0.7*np.clip((dark_at-t)/(dark_at-full_at),0,1)   # 0 none .. 1 solid
    thr=1-2*need*0.9                                    # cos>thr inks
    return np.clip((s-thr)*6,0,1)*(need>0.02)
ink=np.zeros_like(t)
ink=np.maximum(ink,layer(28,8.0,1.0,0.95,0.38))
ink=np.maximum(ink,layer(-32,8.0,-1.0,0.62,0.22))
ink=np.maximum(ink,layer(90,6.4,0.6,0.30,0.08))
# contour: dark line along the silhouette
edge=ndi.gaussian_filter(mask,1.2)
er=ndi.grey_erosion(mask,size=(5,5)); contour=np.clip((mask-er)*3,0,1)
ink=np.clip(np.maximum(ink*(mask>.5),contour),0,1)
# specular highlights stay paper: knock out ink where very bright
ink*=np.clip(1-(t>0.93)*1.0,0,1)
paper=np.array([238,228,207.])/255
inkc=np.array([38,30,28.])/255
# flat wash (Gray's-style tint): warm rose-grey under the hatching
wash=np.array([214,186,176.])/255
base=np.ones((H,W,3))*paper
tint=(0.55+0.25*(1-t))[...,None]
base=base*(1-mask[...,None]*tint*0.85)+wash*(mask[...,None]*tint*0.85)
out=base*(1-ink[...,None])+inkc*ink[...,None]
lig=lig0
sel=np.array([178,58,40.])/255
out=out*(1-0.55*lig[...,None])+ (sel*(out.mean(2,keepdims=True)*0+1))*0.55*lig[...,None]*np.clip(out.mean(2,keepdims=True)*1.15,0,1)
rgba=np.dstack([np.clip(out,0,1),ndi.gaussian_filter(mask,0.6)])
Image.fromarray((rgba*255).astype('uint8'),'RGBA').save('liver-engraved.png')
print(W,H)
