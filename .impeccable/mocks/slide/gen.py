# Synthetic H&E-style liver field (schematic, not a real section): hex lobules, radial hepatocyte cords, nuclei.
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy.spatial import cKDTree
rng=np.random.default_rng(7)
S=900; L=330.0                      # canvas px, lobule centre spacing
# lobule centres on hex lattice, one at canvas centre
cs=[]
for i in range(-3,4):
    for j in range(-3,4):
        cs.append((S/2+L*(i+0.5*j), S/2+L*0.866*j))
cs=np.array(cs)
# portal tracts: hex vertices = points equidistant from 3 centres
from scipy.spatial import Delaunay
tri=Delaunay(cs)
def circ(a,b,c):
    ax,ay=a;bx,by=b;cx,cy=c
    d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by))
    ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d
    uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d
    return ux,uy
portals=np.array([circ(*cs[s]) for s in tri.simplices])
# hepatocytes: jittered points
N=2700
pts=rng.uniform(-40,S+40,(N,2))
tc=cKDTree(cs); tp=cKDTree(portals)
dc,_=tc.query(pts); dp,_=tp.query(pts)
keep=dc<L*0.62
pts=pts[keep];dc=dc[keep];dp=dp[keep]
# relax a little for even spacing
for _ in range(3):
    t=cKDTree(pts); d,i=t.query(pts,k=2); v=pts-pts[i[:,1]]; pts=pts+0.12*v/(np.linalg.norm(v,axis=1,keepdims=True)+1e-6)*np.clip(24-d[:,1],0,None)[:,None]
t=cKDTree(pts)
yy,xx=np.mgrid[0:S,0:S]; grid=np.c_[xx.ravel(),yy.ravel()]
dist,lab=t.query(grid)
lab=lab.reshape(S,S)
zone=np.clip(dc/(dc+dp+1e-6),0,1)[lab] if False else None
dcg,_=tc.query(grid); dpg,_=tp.query(grid)
z=(dcg/(dcg+dpg+1e-6)).reshape(S,S)            # 0 pericentral .. 1 periportal
base=np.zeros((S,S,3))
ep=np.array([232,150,170.]); ec=np.array([196,108,140.])   # eosin, deeper pericentral
cellvar=rng.normal(0,9,(len(pts),1))
col=(ec[None,None,:]*(1-z[...,None])+ep[None,None,:]*z[...,None])
col=col+cellvar[lab]
edge=(lab!=np.roll(lab,1,0))|(lab!=np.roll(lab,1,1))
col[edge]=col[edge]*0.80+np.array([130,60,100.])*0.20+np.array([20,10,15.])
# sinusoid gaps: pale slits between cells
gap=(dist.reshape(S,S)>6.2)
col[gap]=col[gap]*0.35+np.array([250,238,240.])*0.65
# central veins and portal lumens
img=Image.fromarray(np.clip(col,0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
# haematoxylin nuclei
dr=ImageDraw.Draw(img)
for (x,y),d in zip(pts,dc):
    if rng.random()<0.92:
        r=rng.uniform(3.0,3.9); 
        dr.ellipse([x-r,y-r*0.9,x+r,y+r*0.9],fill=(int(60+rng.normal(0,8)),int(50+rng.normal(0,8)),int(120+rng.normal(0,12))))
# portal-tract nuclei (small dark lymphocytes / bile duct ring)
for p in portals:
    for k in range(14):
        a=rng.uniform(0,6.28); r=rng.uniform(26,46)
        x=p[0]+r*np.cos(a); y=p[1]+r*np.sin(a); rr=2.8
        dr.ellipse([x-rr,y-rr,x+rr,y+rr],fill=(52,44,112))
lum=Image.new('RGBA',img.size,(0,0,0,0)); dl=ImageDraw.Draw(lum)
for c in cs:
    dl.ellipse([c[0]-31,c[1]-31,c[0]+31,c[1]+31],fill=(190,105,160,255)); dl.ellipse([c[0]-26,c[1]-26,c[0]+26,c[1]+26],fill=(249,241,246,255))
for p in portals:
    dl.ellipse([p[0]-34,p[1]-34,p[0]+34,p[1]+34],fill=(236,215,230,255))
    for off,r,fc in [((0,0),19,(250,243,247)),((36,-10),11,(248,238,244)),((-30,20),12,(240,228,240))]:
        dl.ellipse([p[0]+off[0]-r,p[1]+off[1]-r,p[0]+off[0]+r,p[1]+off[1]+r],fill=fc+(255,),outline=(190,120,170,255))
    dl.ellipse([p[0]-4-9,p[1]-30-9,p[0]-4+9,p[1]-30+9],fill=(232,214,236,255),outline=(90,70,150,255),width=3)
img=Image.alpha_composite(img.convert('RGBA'),lum).convert('RGB').filter(ImageFilter.GaussianBlur(0.6))
# crop centre disc square, upscale
c=int(S/2); w=420
img.crop((c-w,c-w,c+w,c+w)).resize((1400,1400),Image.LANCZOS).save('field.png')
print(img.size)
# also locations for annotation (in 1400 px field coords), centre vein at (700,700)
tp2=[(float((p[0]-(c-w))*1400/(2*w)),float((p[1]-(c-w))*1400/(2*w))) for p in portals]
near=sorted(tp2,key=lambda q:(q[0]-700)**2+(q[1]-700)**2)[:6]
print([ (round(a),round(b)) for a,b in near])
