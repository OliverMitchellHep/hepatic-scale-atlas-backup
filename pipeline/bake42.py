# v42 bake: headless Blender (bpy 5.0). Low = runtime liver with xatlas UVs. High = hi42.py output.
# Bakes (Cycles, CPU): normal (tangent, high->low, 4K), AO (2K, distance 0.25 = ~17 mm: creases, fossae, contact areas),
# cavity (2K, AO distance 0.035 = ~2.5 mm), object-space position (4K, for 3D-seamless colour noise in compose42.py).
# Run:  python3 -c "import sys; sys.argv=['x','4096','2048']; exec(open('bake42.py').read())"   (pip install bpy)
# Set BAKE_POS=1 in the environment to (re)bake the position map (slow; only needed once per mesh).
import bpy, numpy as np, sys, time, os
R4=int(sys.argv[-2]) if len(sys.argv)>2 else 4096; R2=int(sys.argv[-1]) if len(sys.argv)>2 else 2048
P=np.load('P.npy'); UV=np.load('UV.npy'); F=np.load('F.npy'); dup=np.load('dup.npy')
V=np.concatenate([P,P[dup]]).astype(np.float64)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=1
def mk(name,verts,faces,uv=None):
    me=bpy.data.meshes.new(name); me.from_pydata(verts.tolist(),[],faces.tolist()); me.validate(); me.update()
    if uv is not None:
        ul=me.uv_layers.new(name='UV'); li=np.array([l.vertex_index for l in me.loops]); ul.data.foreach_set('uv',uv[li].ravel())
    for p in me.polygons: p.use_smooth=True
    ob=bpy.data.objects.new(name,me); sc.collection.objects.link(ob); return ob
lo=mk('lo',V,F,UV)
hi=mk('hi',np.load('hiV.npy').astype(np.float64),np.load('hiF.npy'))
def img(name,res,float_=False):
    im=bpy.data.images.new(name,res,res,alpha=False,float_buffer=float_); im.colorspace_settings.name='Non-Color'; return im
matl=bpy.data.materials.new('lo'); matl.use_nodes=True; nt=matl.node_tree; lo.data.materials.append(matl)
tn=nt.nodes.new('ShaderNodeTexImage'); nt.nodes.active=tn
hi.data.materials.append(bpy.data.materials.new('hi'))
def bake(kind,res,float_=False,type_=None,sel=False,**kw):
    im=img(kind,res,float_); tn.image=im; nt.nodes.active=tn
    bpy.ops.object.select_all(action='DESELECT')
    lo.select_set(True); bpy.context.view_layer.objects.active=lo
    if sel: hi.select_set(True); kw.update(use_selected_to_active=True,cage_extrusion=0.10,max_ray_distance=0.22)
    t=time.time(); bpy.ops.object.bake(type=type_ or kind.upper(),margin=12,margin_type='EXTEND',target='IMAGE_TEXTURES',**kw)
    px=np.array(im.pixels[:],np.float32).reshape(res,res,4)
    np.save(f'bake_{kind}.npy',px[...,:3].astype(np.float32 if float_ else np.float16)); print(kind,res,'%.1fs'%(time.time()-t),flush=True)
bake('normal',R4,sel=True,normal_space='TANGENT')
sc.cycles.samples=64; sc.world=bpy.data.worlds.new('w'); sc.world.light_settings.distance=0.25
bake('ao',R2,type_='AO',sel=True)
sc.cycles.samples=32; sc.world.light_settings.distance=0.035; bake('cav',R2,type_='AO',sel=True)
if os.environ.get('BAKE_POS'):
    em=nt.nodes.new('ShaderNodeEmission'); tc=nt.nodes.new('ShaderNodeTexCoord'); out=nt.nodes.get('Material Output')
    nt.links.new(tc.outputs['Object'],em.inputs['Color']); nt.links.new(em.outputs['Emission'],out.inputs['Surface'])
    sc.cycles.samples=1
    bake('pos',R4,float_=True,type_='EMIT')
