import sys, json, base64, colorsys
import numpy as np
from PIL import Image
import fast_simplification as fs

obj, texp, out, target = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
tex = Image.open(texp).convert('RGB'); TW, TH = tex.size
V, VT = [], []; faces = []; cur = None
for line in open(obj, encoding='utf-8', errors='ignore'):
    if line.startswith('o '): cur = line[2:].strip()
    elif line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('vt '): VT.append([float(x) for x in line.split()[1:3]])
    elif line.startswith('f ') and cur and 'Collider' not in cur:
        idx = [p.split('/') for p in line.split()[1:]]
        vs = [int(a[0]) - 1 for a in idx]; ts = [int(a[1]) - 1 if len(a) > 1 and a[1] else None for a in idx]
        for k in range(1, len(vs) - 1): faces.append(((vs[0], vs[k], vs[k+1]), (ts[0], ts[k], ts[k+1])))
V = np.array(V); print('tris in', len(faces))

# zen palette mapping from the texture's colour
ZEN = {'white':'#F4FBF7','lush':'#CEE9D8','teal':'#006D5A','green':'#00BD5F','glass':'#1d4a40','grey':'#4A4456'}
def zen(rgb):
    r, g, b = [c/255 for c in rgb]; h, l, s_ = colorsys.rgb_to_hls(r, g, b)
    if l > .78: return 'white'
    if l < .15: return 'glass'
    return 'teal'
groups = {}
for (vs, ts) in faces:
    if ts[0] is not None:
        u = np.mean([VT[t][0] for t in ts]); v = np.mean([VT[t][1] for t in ts])
        px = tex.getpixel((min(TW-1, int(u % 1 * TW)), min(TH-1, int((1 - v % 1) * TH))))
    else: px = (240, 240, 240)
    groups.setdefault(zen(px), []).append(vs)

mn, mx = V.min(0), V.max(0); print('bbox', mn.round(2), mx.round(2))
total = len(faces); res = {'bbox':[mn.tolist(), mx.tolist()], 'groups':[]}; tout = 0
for name, fl in groups.items():
    F = np.array(fl); used = np.unique(F); remap = -np.ones(len(V), int); remap[used] = np.arange(len(used))
    pts = V[used].astype(np.float32); tri = remap[F].astype(np.int32)
    keep = max(40, int(target * len(fl) / total))
    if len(fl) > keep:
        try: pts, tri = fs.simplify(pts, tri, target_reduction=1 - keep/len(fl))
        except Exception as e: print('simplify failed', name, e)
    tout += len(tri)
    res['groups'].append({'name':name, 'color':ZEN[name],
        'pos':base64.b64encode(np.asarray(pts, np.float32).tobytes()).decode(),
        'idx':base64.b64encode(np.asarray(tri, np.uint16 if len(pts) < 65535 else np.uint32).tobytes()).decode(),
        'idx32': len(pts) >= 65535})
    print(f'{name:6s} {len(fl):6d} -> {len(tri):5d} tris')
print('tris out', tout)
json.dump(res, open(out, 'w'))
