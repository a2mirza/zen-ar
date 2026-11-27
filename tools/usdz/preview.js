// Rebuilds the baked animation from out/bake.json (exactly what goes into the usdz) and renders frames to out/frame_*.png
// usage: node tools/usdz/preview.js 3 8 14 20   (seconds)
const path=require('path'), fs=require('fs'); const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:600,height:600}}); p.on('pageerror',e=>console.log('PAGE ERROR',e.message));
  await p.goto('http://localhost:'+(process.env.PORT||8771)+'/index.html',{waitUntil:'load'});
  const data=fs.readFileSync(path.join(__dirname,'out','bake.json'),'utf8');
  await p.evaluate(h=>{ window.__hide=h; },(process.env.HIDE||'').split(',').filter(Boolean).map(Number));
  await p.evaluate(async data=>{ const d=JSON.parse(data), T=THREE; document.body.innerHTML=''; 
    const r=new T.WebGLRenderer({antialias:true}); r.setSize(600,600); document.body.appendChild(r.domElement); r.setClearColor('#a8774e');
    const sc=new T.Scene(); sc.add(new T.HemisphereLight(0xffffff,0x887766,1.6)); const dl=new T.DirectionalLight(0xffffff,2); dl.position.set(1,3,2); sc.add(dl);
    const tl=new T.TextureLoader(), tx={}; for(const [k,t] of Object.entries(d.texs)){ if(!t.url) continue; const m=await tl.loadAsync(t.url); m.colorSpace=T.SRGBColorSpace; if(t.wrap){ m.wrapS=m.wrapT=T.RepeatWrapping; } m.repeat.set(...t.repeat); m.offset.set(...t.offset); tx[k]=m; }
    const mats=d.mats.map(m=>{ const o={transparent:m.opacity<.99||!!m.map,opacity:m.opacity,side:m.double?T.DoubleSide:T.FrontSide,alphaTest:m.alphaTest||0};
      if(m.basic) return new T.MeshBasicMaterial({...o,color:new T.Color(...m.color),map:tx[m.map]||null});
      return new T.MeshPhysicalMaterial({...o,color:new T.Color(...m.color),map:tx[m.map]||null,roughness:m.rough,metalness:m.metal,clearcoat:m.clear,emissive:m.emis?new T.Color(...m.emis):undefined}); });
    const geos=d.geos.map(g=>{ const G=new T.BufferGeometry(); G.setAttribute('position',new T.Float32BufferAttribute(g.p,3)); if(g.n) G.setAttribute('normal',new T.Float32BufferAttribute(g.n,3)); if(g.uv) G.setAttribute('uv',new T.Float32BufferAttribute(g.uv,2)); if(g.i) G.setIndex(g.i); return G; });
    const objs=d.nodes.map(n=>{ const o=n.g!==undefined?new T.Mesh(geos[n.g],mats[n.m]):new T.Group(); return o; });
    d.nodes.forEach((n,j)=>{ (n.parent<0?sc:objs[n.parent]).add(objs[j]); });
    const cam=new T.PerspectiveCamera(45,1,.01,20); cam.position.set(0,.55,.75); cam.lookAt(0,.12,0);
    if(window.__hide) window.__hide.forEach(j=>objs[j].visible=false);
    if(window.__hide) window.__hide.forEach(j=>objs[j].visible=false);
    window.__at=t=>{ const f=t*d.fps; d.nodes.forEach((n,j)=>{ const s=n.s; let a=s[0],b2=s[0]; for(const q of s){ if(q[0]<=f) a=q; if(q[0]>=f){ b2=q; break; } b2=q; }
      const k=b2[0]===a[0]?0:(f-a[0])/(b2[0]-a[0]); const L=(i)=>a[i]+(b2[i]-a[i])*k; const o=objs[j];
      o.position.set(L(1),L(2),L(3)); o.quaternion.set(a[4],a[5],a[6],a[7]).slerp(new T.Quaternion(b2[4],b2[5],b2[6],b2[7]),k); o.scale.set(L(8),L(9),L(10)); });
      r.render(sc,cam); return r.domElement.toDataURL('image/png'); }; },data);
  for(const s of process.argv.slice(2)){ const url=await p.evaluate(t=>__at(t),+s); fs.writeFileSync(path.join(__dirname,'out','frame_'+s+'.png'),Buffer.from(url.split(',')[1],'base64')); }
  console.log('frames written'); await b.close(); })();
