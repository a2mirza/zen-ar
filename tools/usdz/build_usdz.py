"""Turn tools/usdz/out/bake.json (from bake.js) into zen-welcome.usdz for AR Quick Look on iPhone.
needs:  pip install usd-core
usage:  python3 tools/usdz/build_usdz.py [out.usdz]
Every animated node gets translate / orient / scale time samples; Quick Look auto-plays and loops them.
Materials are UsdPreviewSurface (PBR): base colour or texture, roughness, metallic, clearcoat, emissive, opacity."""
import base64, io, json, os, shutil, sys
from PIL import Image
from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdUtils, Vt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'zen-welcome.usdz')
d = json.load(open(os.path.join(OUT, 'bake.json')))
work = os.path.join(OUT, 'stage'); shutil.rmtree(work, ignore_errors=True); os.makedirs(os.path.join(work, 'tex'))
usdc = os.path.join(work, 'zen_welcome.usdc')

stage = Usd.Stage.CreateNew(usdc)
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y); UsdGeom.SetStageMetersPerUnit(stage, 1.0)
stage.SetStartTimeCode(0); stage.SetEndTimeCode(d['frames']); stage.SetTimeCodesPerSecond(d['fps']); stage.SetFramesPerSecond(d['fps'])

# textures -> png files
texfile = {}
for tid, t in d['texs'].items():
    if not t['url']: continue
    raw = base64.b64decode(t['url'].split(',', 1)[1]); im = Image.open(io.BytesIO(raw)); im.load()
    if max(im.size) > 2048: im.thumbnail((2048, 2048), Image.LANCZOS)
    if im.mode == 'RGBA' and im.getextrema()[3][0] == 255: im = im.convert('RGB')     # fully opaque: jpeg is far smaller
    if im.mode == 'RGB':
        fn = tid + '.jpg'; im.save(os.path.join(work, 'tex', fn), quality=90)
    else:
        fn = tid + '.png'
        if t.get('quant', True): im = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')   # 256-colour palette: text and flat art stay sharp at a fraction of the size
        im.convert('RGBA').quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(work, 'tex', fn), optimize=True)
    texfile[tid] = 'tex/' + fn

# materials
looks = stage.DefinePrim('/zen/Looks', 'Scope')
def mk_mat(i, m, tint=None):
    name = 'm%d' % i + ('_vc' if tint else '')
    mat = UsdShade.Material.Define(stage, '/zen/Looks/' + name)
    sh = UsdShade.Shader.Define(stage, mat.GetPath().AppendChild('pbr')); sh.CreateIdAttr('UsdPreviewSurface')
    col = Gf.Vec3f(*(tint or m['color'] or [1, 1, 1]))
    tex = None
    if m['map'] and m['map'] in texfile:
        st = UsdShade.Shader.Define(stage, mat.GetPath().AppendChild('st')); st.CreateIdAttr('UsdPrimvarReader_float2')
        st.CreateInput('varname', Sdf.ValueTypeNames.Token).Set('st')
        stv = st.CreateOutput('result', Sdf.ValueTypeNames.Float2)
        t = d['texs'][m['map']]
        if t['repeat'] != [1, 1] or t['offset'] != [0, 0]:
            x2 = UsdShade.Shader.Define(stage, mat.GetPath().AppendChild('xf')); x2.CreateIdAttr('UsdTransform2d')
            x2.CreateInput('in', Sdf.ValueTypeNames.Float2).ConnectToSource(stv)
            x2.CreateInput('scale', Sdf.ValueTypeNames.Float2).Set(Gf.Vec2f(*t['repeat']))
            x2.CreateInput('translation', Sdf.ValueTypeNames.Float2).Set(Gf.Vec2f(*t['offset']))
            stv = x2.CreateOutput('result', Sdf.ValueTypeNames.Float2)
        tex = UsdShade.Shader.Define(stage, mat.GetPath().AppendChild('tex')); tex.CreateIdAttr('UsdUVTexture')
        tex.CreateInput('file', Sdf.ValueTypeNames.Asset).Set(texfile[m['map']])
        tex.CreateInput('st', Sdf.ValueTypeNames.Float2).ConnectToSource(stv)
        wrap = 'repeat' if t['wrap'] else 'clamp'
        tex.CreateInput('wrapS', Sdf.ValueTypeNames.Token).Set(wrap); tex.CreateInput('wrapT', Sdf.ValueTypeNames.Token).Set(wrap)
        tex.CreateInput('sourceColorSpace', Sdf.ValueTypeNames.Token).Set('sRGB')
        tex.CreateInput('scale', Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(col[0], col[1], col[2], 1))
        rgb = tex.CreateOutput('rgb', Sdf.ValueTypeNames.Float3); a = tex.CreateOutput('a', Sdf.ValueTypeNames.Float)
    if m.get('basic'):   # unlit in the app (signs, text, glow): lit colour plus a little self-light, matte, so text stays crisp and solid
        dc = sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f); dc.ConnectToSource(rgb) if tex else dc.Set(col)
        e = sh.CreateInput('emissiveColor', Sdf.ValueTypeNames.Color3f)
        if tex:
            t2 = UsdShade.Shader.Define(stage, mat.GetPath().AppendChild('glow')); t2.CreateIdAttr('UsdUVTexture')
            for k in ('file', 'st', 'wrapS', 'wrapT', 'sourceColorSpace'):
                src = tex.GetInput(k); v = src.Get(); dst_in = t2.CreateInput(k, src.GetTypeName())
                if src.HasConnectedSource(): dst_in.ConnectToSource(src.GetConnectedSource()[0].GetOutput(src.GetConnectedSource()[1]))
                elif v is not None: dst_in.Set(v)
            t2.CreateInput('scale', Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(.4, .4, .4, 1))
            e.ConnectToSource(t2.CreateOutput('rgb', Sdf.ValueTypeNames.Float3))
        else: e.Set(Gf.Vec3f(col[0] * .4, col[1] * .4, col[2] * .4))
        sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(0.85)
    else:
        dc = sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f)
        dc.ConnectToSource(rgb) if tex else dc.Set(col)
        sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(float(m['rough']))
        sh.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(float(m['metal']))
        if m['clear']:
            sh.CreateInput('clearcoat', Sdf.ValueTypeNames.Float).Set(float(m['clear']))
            sh.CreateInput('clearcoatRoughness', Sdf.ValueTypeNames.Float).Set(float(m['clearR']))
        if m['emis'] and max(m['emis']) > .01:
            sh.CreateInput('emissiveColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*m['emis']))
    op = sh.CreateInput('opacity', Sdf.ValueTypeNames.Float)
    if tex and m['opacity'] >= .99: op.ConnectToSource(a)
    else: op.Set(float(m['opacity']))
    if tex and m['alphaTest'] > 0: sh.CreateInput('opacityThreshold', Sdf.ValueTypeNames.Float).Set(float(max(.05, m['alphaTest'])))
    mat.CreateSurfaceOutput().ConnectToSource(sh.CreateOutput('surface', Sdf.ValueTypeNames.Token))
    return mat
matcache = {}
def material(i, tint=None):
    k = (i, tuple(round(x, 2) for x in tint) if tint else None)
    if k not in matcache: matcache[k] = mk_mat(i, d['mats'][i], list(k[1]) if k[1] else None)
    return matcache[k]

# geometry is stored once per unique geometry and referenced by every mesh that uses it
protos = {}
def geom(gid, path):
    g = d['geos'][gid]; mesh = UsdGeom.Mesh.Define(stage, path)
    pts = g['p']; n = len(pts) // 3
    mesh.CreatePointsAttr(Vt.Vec3fArray([Gf.Vec3f(pts[3*i], pts[3*i+1], pts[3*i+2]) for i in range(n)]))
    idx = g['i'] if g['i'] is not None else list(range(n))
    # three.js winds counter-clockwise like usd's default rightHanded orientation
    mesh.CreateFaceVertexCountsAttr(Vt.IntArray([3] * (len(idx) // 3))); mesh.CreateFaceVertexIndicesAttr(Vt.IntArray(idx))
    if g['n']:
        nn = g['n']; mesh.CreateNormalsAttr(Vt.Vec3fArray([Gf.Vec3f(nn[3*i], nn[3*i+1], nn[3*i+2]) for i in range(n)])); mesh.SetNormalsInterpolation('vertex')
    if g['uv']:
        uv = g['uv']; pv = UsdGeom.PrimvarsAPI(mesh).CreatePrimvar('st', Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex)
        pv.Set(Vt.Vec2fArray([Gf.Vec2f(uv[2*i], uv[2*i+1]) for i in range(n)]))
    mesh.CreateSubdivisionSchemeAttr('none')
    e = [min(pts[0::3]), min(pts[1::3]), min(pts[2::3])], [max(pts[0::3]), max(pts[1::3]), max(pts[2::3])]
    mesh.CreateExtentAttr(Vt.Vec3fArray([Gf.Vec3f(*e[0]), Gf.Vec3f(*e[1])]))
    return mesh

paths = []
def xform_ops(prim, samples):
    x = UsdGeom.Xformable(prim); x.ClearXformOpOrder()
    tr = x.AddTranslateOp(); ro = x.AddOrientOp(); sc = x.AddScaleOp()
    def put(op, val, t=None):
        op.Set(val) if t is None else op.Set(val, Usd.TimeCode(t))
    if len(samples) == 1:
        s = samples[0]; put(tr, Gf.Vec3d(*s[1:4])); put(ro, Gf.Quatf(s[7], s[4], s[5], s[6])); put(sc, Gf.Vec3f(*s[8:11]))
    else:
        for s in samples:
            f = s[0]; put(tr, Gf.Vec3d(*s[1:4]), f); put(ro, Gf.Quatf(s[7], s[4], s[5], s[6]), f); put(sc, Gf.Vec3f(*s[8:11]), f)

root = UsdGeom.Xform.Define(stage, '/zen'); stage.SetDefaultPrim(root.GetPrim())
used = {}
for j, n in enumerate(d['nodes']):
    parent = '/zen' if n['parent'] < 0 else paths[n['parent']]
    base = n['name'] or 'n'; nm = '%s_%d' % (base, j) if not base[0].isdigit() else 'n_%s_%d' % (base, j)
    path = parent + '/' + nm; paths.append(path)
    if 'g' in n:
        mesh = geom(n['g'], path); prim = mesh.GetPrim()
        m = d['mats'][n['m']]
        if m['double']: mesh.CreateDoubleSidedAttr(True)
        UsdShade.MaterialBindingAPI.Apply(prim).Bind(material(n['m'], n.get('vc')))
    else:
        prim = UsdGeom.Xform.Define(stage, path).GetPrim()
    xform_ops(prim, n['s'])

stage.GetRootLayer().Save()
if os.path.exists(dst): os.remove(dst)
ok = UsdUtils.CreateNewARKitUsdzPackage(Sdf.AssetPath(usdc), dst)
print('usdz', 'ok' if ok else 'FAILED', os.path.abspath(dst), '%.1f MB' % (os.path.getsize(dst) / 1e6))
