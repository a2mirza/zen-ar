// Bakes the zen welcome into one continuous animation and returns it as JSON (run inside index.html, see bake.js).
// Timeline: platform glows, seven cards rise, they gather into a shelf at the back, then each perk card in turn glides
// to the centre, drops into the platform, the doors open and its scene grows out; as the scene folds away the next card
// is already gliding in, so every scene flows into the next. At the end the cards return to the opening layout and sink,
// which matches the first frame, so the loop is seamless.
window.__bake = async (FPS=15) => {
  const Z=window.__zz, T=THREE; let VT=0; const realNow=performance.now.bind(performance);
  performance.now=()=>VT*1000;                       // virtual clock: marquees and anything else timed read this
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2, eout=k=>1-Math.pow(1-k,3), back=k=>{ const c=1.5; return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2); };
  const seg=(t,a,b)=>Math.min(1,Math.max(0,(t-a)/(b-a)));
  const lerp=(a,b,k)=>a+(b-a)*k, lv=(a,b,k)=>V(lerp(a.x,b.x,k),lerp(a.y,b.y,k),lerp(a.z,b.z,k));
  while(!Z.PLANE) await new Promise(r=>setTimeout(r,100));

  const root=new T.Group(); root.name='zen_welcome';
  const TS=.62, AR=.63, P=Z.P;
  // platform: lacquered slab, a still pond face, a soft glowing rim, two doors that retract to their outer edges
  const plat=new T.Group(); plat.name='platform'; root.add(plat);
  Z.box(plat,TS+.02,.02,TS*AR+.02,P.teal,0,.01,0);
  const flatM=(w,h,map,y,o={})=>{ const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial(Object.assign({map,transparent:true},o))); m.rotation.x=-Math.PI/2; m.position.y=y; return m; };
  plat.add(flatM(TS*.98,TS*AR*.98,Z.holeTex(AR),.0262));
  const rim=flatM(TS*1.08,TS*AR*1.1,Z.frameTex(AR),.0266); plat.add(rim);
  const doors=[-1,1].map(s=>{ const piv=new T.Group(); piv.name='door'+(s<0?'L':'R'); piv.position.set(s*TS*.49,.0272,0); plat.add(piv);
    const m=flatM(TS*.49,TS*AR*.98,Z.baseTex(AR),0); m.position.x=-s*TS*.245; piv.add(m); return piv; });
  // the scenes, each in a holder that grows out of the platform centre
  const scenes=Z.INFO.map((d,i)=>{ const h=new T.Group(); h.name='scene_'+d.icon; h.position.y=.027; root.add(h); const b=d.build(false); b.g.scale.setScalar(TS); h.add(b.g); h.userData.L=b.L; return h; });
  // the cards
  const CSX=.32;
  const cards=Z.INFO.map((d,i)=>{ const h=new T.Group(); h.name='card_'+d.icon; root.add(h); h.add(Z.acrylic(d)); return h; });
  const N=cards.length, PC=0;
  const big=i=>{ const back=i<4, k=back?i-1.5:i-5; return {p:V(k*.15,back?.215:.095,PC+(back?-.07:.05)),s:CSX,rx:-.12}; };
  const shelf=i=>({p:V((i-(N-1)/2)*.086,.27,-.26),s:.18,rx:-.1});
  const hero={p:V(0,.24,.03),s:.46,rx:-.1}, sunk={p:V(0,.03,0),s:.03,rx:-Math.PI/2};
  const lerpPose=(a,b,k)=>({p:lv(a.p,b.p,k),s:lerp(a.s,b.s,k),rx:lerp(a.rx,b.rx,k)});

  // timeline (seconds)
  const INTRO=2.6, GATHER=[INTRO+2.2,INTRO+3.6], S0=GATHER[1]+.6, PER=8.6;
  const sStart=i=>S0+i*PER;
  const LAST=sStart(N-1)+PER, RET=[LAST,LAST+2.2], END=LAST+4.6;
  const frames=Math.round(END*FPS);

  function pose(i,t){
    if(t<INTRO+1.2){ const k=back(seg(t,.5+i*.16,1.4+i*.16)); const b=big(i); return {p:lv(V(b.p.x,.03,b.p.z),b.p,k),s:Math.max(.0001,b.s*k),rx:b.rx}; }
    if(t<GATHER[1]) return lerpPose(big(i),shelf(i),ease(seg(t,GATHER[0]+i*.06,GATHER[1]-.36+i*.06)));
    if(t>=RET[0]){ const b=big(i); const r=lerpPose(shelf(i),b,ease(seg(t,RET[0]+i*.07,RET[1]+i*.07)));
      const k=ease(seg(t,END-1.3,END-.2)); return {p:lv(r.p,V(b.p.x,.03,b.p.z),k),s:Math.max(.0001,r.s*(1-k)),rx:r.rx}; }
    const s=sStart(i);
    if(t<s-1.3) return shelf(i);                                                     // waiting on the shelf
    if(t<s) return lerpPose(shelf(i),hero,ease(seg(t,s-1.3,s)));                     // glides to the centre
    if(t<s+.9) return lerpPose(hero,sunk,ease(seg(t,s,s+.9)));                       // lays down and drops into the platform
    if(t<s+PER-2.2) return {p:sunk.p,s:.0001,rx:0};                                  // its scene is playing
    const k=eout(seg(t,s+PER-2.2,s+PER-1)); const sh=shelf(i); return {p:sh.p,s:Math.max(.0001,sh.s*k),rx:sh.rx};   // reappears on the shelf
  }
  function sceneScale(i,t){ const s=sStart(i);
    const up=eout(seg(t,s+.6,s+2.6)), down=ease(seg(t,s+PER-1.1,s+PER-.1)); return Math.max(.0001,up*(1-down)); }
  function doorOpen(t){ let o=0; for(let i=0;i<N;i++){ const s=sStart(i); o=Math.max(o,ease(seg(t,s+.45,s+1.3))*(1-ease(seg(t,s+PER-.6,s+PER+.15)))); } return o; }

  // collect nodes
  const nodes=[], idx=new Map();
  const skip=o=>o.isSprite||o.isPoints||o.isLine||(o.material&&(o.material.isShaderMaterial||o.material.colorWrite===false));
  (function walk(o,parent){ if(skip(o)) return; const id=nodes.length; idx.set(o,id); nodes.push({o,parent,last:null,lastF:-1,seen:null,samples:[]}); o.children.forEach(c=>walk(c,id)); })(root,-1);
  const key=o=>{ const v=o.visible; const p=o.position,q=o.quaternion,s=o.scale; const k=v?1:0;
    return [p.x,p.y,p.z,q.x,q.y,q.z,q.w,s.x*k||1e-4,s.y*k||1e-4,s.z*k||1e-4].map(x=>+x.toFixed(5)); };
  const same=(a,b)=>a&&b&&a.every((x,j)=>Math.abs(x-b[j])<1e-5);
  const matMax=new Map();
  for(let f=0;f<=frames;f++){ VT=f/FPS; const t=VT;
    cards.forEach((c,i)=>{ const q=pose(i,t); const bob=Math.sin(t*1.3+i*1.2)*.005; c.position.copy(q.p); c.position.y+=q.s>.05?bob:0; c.scale.setScalar(q.s); c.rotation.set(q.rx,0,0); });
    scenes.forEach((h,i)=>{ const k=sceneScale(i,t); h.scale.setScalar(k); h.rotation.y=(1-k)*-.6; if(k>.0002) h.userData.L.forEach(fn=>fn(t)); });
    const o=doorOpen(t); doors.forEach(d=>d.scale.x=Math.max(.0001,1-o));
    rim.material.opacity=.55+.45*Math.sin(t*2)**2;
    nodes.forEach((n,j)=>{ const k=key(n.o);
      if(f===0){ n.samples.push([0,...k]); n.last=k; n.lastF=0; }
      else if(!same(k,n.last)){ if(n.lastF<f-1) n.samples.push([f-1,...n.last]); n.samples.push([f,...k]); n.last=k; n.lastF=f; }
      if(n.o.material){ const m=n.o.material; matMax.set(m,Math.max(matMax.get(m)||0,m.opacity)); } });
  }
  performance.now=realNow;

  // geometry, materials, textures
  const geos=new Map(), mats=new Map(), texs=new Map(); const G=[], M=[], X={};
  const r5=a=>Array.from(a,x=>Math.round(x*1e5)/1e5);
  const texId=t=>{ if(!t||!t.image) return null; if(texs.has(t)) return texs.get(t); const id='t'+texs.size; texs.set(t,id);
    const img=t.image; let url=null; try{ if(img.toDataURL) url=img.toDataURL('image/png'); else { const c=document.createElement('canvas'); c.width=img.naturalWidth||img.width; c.height=img.naturalHeight||img.height; c.getContext('2d').drawImage(img,0,0); url=c.toDataURL('image/png'); } }catch(e){}
    X[id]={url,repeat:[t.repeat.x,t.repeat.y],offset:[t.offset.x,t.offset.y],wrap:t.wrapS===T.RepeatWrapping}; return id; };
  const hex=c=>c?[c.r,c.g,c.b].map(x=>+x.toFixed(4)):null;
  const geoId=g=>{ if(geos.has(g)) return geos.get(g); const id=G.length; geos.set(g,id);
    const pa=g.attributes.position, na=g.attributes.normal, ua=g.attributes.uv, ca=g.attributes.color;
    let avg=null; if(ca){ let r=0,gg=0,b=0; for(let i=0;i<ca.count;i++){ r+=ca.getX(i); gg+=ca.getY(i); b+=ca.getZ(i); } avg=[r/ca.count,gg/ca.count,b/ca.count]; }
    G.push({p:r5(pa.array),n:na?r5(na.array):null,uv:ua?r5(ua.array):null,i:g.index?Array.from(g.index.array):null,avg}); return id; };
  const matId=(m,g)=>{ if(mats.has(m)) return mats.get(m); const id=M.length; mats.set(m,id);
    const basic=m.isMeshBasicMaterial; const op=m.transparent?Math.max(.02,matMax.get(m)??m.opacity):1;
    M.push({basic,color:hex(m.color),map:texId(m.map),rough:m.roughness??1,metal:m.metalness??0,clear:m.clearcoat??0,clearR:m.clearcoatRoughness??0,
      emis:m.emissive?hex(m.emissive.clone().multiplyScalar(m.emissiveIntensity??1)):null,opacity:+op.toFixed(3),alphaTest:m.alphaTest||0,
      vcol:!!m.vertexColors,double:m.side===T.DoubleSide,additive:m.blending===T.AdditiveBlending}); return id; };
  const out=nodes.map((n,j)=>{ const o=n.o; const r={name:(o.name||o.type).replace(/[^A-Za-z0-9_]/g,'_').slice(0,40),parent:n.parent,s:n.samples};
    if(o.isMesh){ r.g=geoId(o.geometry); r.m=matId(o.material,o.geometry); if(o.material.vertexColors) r.vc=G[r.g].avg; } return r; });
  return JSON.stringify({fps:FPS,frames,nodes:out,geos:G,mats:M,texs:X});
};
