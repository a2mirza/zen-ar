// Bakes the zen welcome into one continuous animation and returns it as JSON (run inside index.html, see bake.js).
// Timeline: a ripple spreads across the table, the zen card rises upright out of it under a "welcome to zen" sign, then the
// card sinks back in and the perk scenes open out of the ripple one after another, each with its title above, each one
// folding away as the next grows. At the end the card and welcome return, then everything sinks back into the table,
// which matches the first frame, so the loop is seamless.
window.__bake = async (FPS=15) => {
  window.__texScale=2;   // draw every canvas texture at twice the size, for crisp text
  const Z=window.__zz, T=THREE; let VT=0; const realNow=performance.now.bind(performance);
  performance.now=()=>VT*1000;                       // virtual clock: marquees and anything else timed read this
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2, eout=k=>1-Math.pow(1-k,3), back=k=>{ const c=1.5; return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2); };
  const seg=(t,a,b)=>Math.min(1,Math.max(0,(t-a)/(b-a)));
  const lerp=(a,b,k)=>a+(b-a)*k, lv=(a,b,k)=>V(lerp(a.x,b.x,k),lerp(a.y,b.y,k),lerp(a.z,b.z,k));
  while(!Z.PLANE) await new Promise(r=>setTimeout(r,100));
  { const probe=Z.zenCard(new T.Group(),0,0,0,.1); const mp=probe.children[1].material.map; for(let k=0;k<100&&!(mp.image&&mp.image.complete&&mp.image.naturalWidth);k++) await new Promise(r=>setTimeout(r,100)); }

  const root=new T.Group(); root.name='zen_welcome';
  const TS=.62, P=Z.P, N=Z.INFO.length;
  const disc=(r0,r1,map,col,y)=>{ const m=new T.Mesh(new T.RingGeometry(r0,r1,128,1),new T.MeshBasicMaterial(map?{map,transparent:true}:{color:col})); m.rotation.x=-Math.PI/2; m.position.y=y; return m; };
  // the pond: a calm mint disc with soft concentric ripples, the same motif as the card's face
  const pondTex=Z.tex(1024,1024,(c,w,h)=>{ const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2); g.addColorStop(0,'#F2FBF6'); g.addColorStop(.55,'#D6EEE0'); g.addColorStop(.92,'#B9DDC8'); g.addColorStop(1,'rgba(185,221,200,0)');
    c.fillStyle=g; c.beginPath(); c.arc(w/2,h/2,w/2,0,7); c.fill();
    for(let k=0;k<14;k++){ const r=w*(.08+k*.03); c.strokeStyle='rgba(255,255,255,'+(.55-k*.03)+')'; c.lineWidth=5; c.beginPath(); c.arc(w/2,h/2,r,0,7); c.stroke();
      c.strokeStyle='rgba(60,120,95,'+(.12-k*.006)+')'; c.lineWidth=3; c.beginPath(); c.arc(w/2,h/2+3,r+4,0,7); c.stroke(); } });
  const pondG=new T.Group(); pondG.name='pond'; root.add(pondG);
  const pond=new T.Mesh(new T.CircleGeometry(.38,128),new T.MeshBasicMaterial({map:pondTex,transparent:true})); pond.rotation.x=-Math.PI/2; pond.position.y=.002; pondG.add(pond);
  const rings=[.39,.43,.475,.52].map((r,k)=>{ const g=new T.Group(); g.name='ripple'+k; root.add(g); g.add(disc(r,r+.005,null,k%2?'#00BD5F':'#FFFFFF',.003)); return g; });
  // the zen card, upright, rising out of the pond, and the welcome sign above it
  const card=new T.Group(); card.name='zen_card'; root.add(card); const zc=Z.zenCard(card,0,0,0,.11); zc.position.y=.11*1.585/2;
  const sign=new T.Group(); sign.name='welcome'; root.add(sign);
  const signTex=Z.tex(1200,520,(c,w,h)=>{ c.fillStyle='#FFFFFF'; c.beginPath(); c.roundRect(6,6,w-12,h-12,48); c.fill();
    c.fillStyle='#00BD5F'; c.fillRect(80,96,34,34); c.fillStyle='#006D5A'; c.font='600 44px '+Z.FONT; c.fillText('access granted',134,128);
    c.fillStyle='#322D3C'; c.font='700 128px '+Z.FONT; c.fillText('welcome to zen',74,290);
    c.fillStyle='#006D5A'; c.font='500 56px '+Z.FONT; c.fillText('the inner circle. here\'s what you get',78,400); });
  const sp=new T.Mesh(new T.PlaneGeometry(.36,.156),new T.MeshBasicMaterial({map:signTex,transparent:true,side:T.DoubleSide})); sign.add(sp);
  // the opening sign that invites the tap, and a pulse that rolls out from the centre of the pond
  const tap=new T.Group(); tap.name='tap_sign'; root.add(tap);
  const tapTex=Z.tex(1200,470,(c,w,h)=>{ c.fillStyle='#FFFFFF'; c.beginPath(); c.roundRect(6,6,w-12,h-12,48); c.fill();
    c.fillStyle='#00BD5F'; c.fillRect(80,92,34,34); c.fillStyle='#006D5A'; c.font='600 50px '+Z.FONT; c.fillText('welcome to zen',134,126);
    c.fillStyle='#322D3C'; c.font='700 104px '+Z.FONT; c.fillText('tap to see what',74,262); c.fillText('you get',74,372);
    c.strokeStyle='#00BD5F'; c.lineWidth=10; c.beginPath(); c.arc(w-170,330,62,0,7); c.stroke(); c.fillStyle='#00BD5F'; c.beginPath(); c.arc(w-170,330,26,0,7); c.fill(); });
  const tapM=new T.Mesh(new T.PlaneGeometry(.36,.141),new T.MeshBasicMaterial({map:tapTex,transparent:true,side:T.DoubleSide})); tapM.name='tap_plate'; tap.add(tapM);
  const pulse=new T.Group(); pulse.name='tap_pulse'; root.add(pulse); pulse.add(disc(.3,.306,null,'#00BD5F',0));
  // each perk: its scene grows out of the pond with a title above it
  const scenes=Z.INFO.map((d,i)=>{ const h=new T.Group(); h.name='scene_'+d.icon; h.position.y=.004; root.add(h); const b=d.build(false); b.g.scale.setScalar(TS); h.add(b.g); h.userData.L=b.L;
    const tt=Z.tex(1100,300,(c,w,hh)=>{ c.fillStyle='#FFFFFF'; c.beginPath(); c.roundRect(6,6,w-12,hh-12,40); c.fill(); c.fillStyle='#00BD5F'; c.fillRect(64,70,26,26);
      c.fillStyle='#006D5A'; c.font='600 36px '+Z.FONT; c.fillText('perk 0'+(i+1)+' of 0'+N,104,96); c.fillStyle='#322D3C'; c.font='700 96px '+Z.FONT; c.fillText(d.title,60,212); });
    const lab=new T.Group(); lab.name='title_'+d.icon; root.add(lab); lab.add(new T.Mesh(new T.PlaneGeometry(.33,.09),new T.MeshBasicMaterial({map:tt,transparent:true,side:T.DoubleSide}))); h.userData.lab=lab; return h; });
  // marquee bands and every texture with its own alpha are drawn solid, so text never looks washed out
  root.traverse(o=>{ if(o.material&&o.material.map&&o.material.transparent) o.material.userData.solid=true; });

  // timeline (seconds). three clips that the tap behaviours in build_usdz.py play:
  //   intro [0,INTRO]: the ripple spreads, the "tap to see what you get" sign rises
  //   idle  [INTRO,W0]: calm loop that waits for a tap
  //   welcome [W0,END]: card, welcome sign, the seven perks, then back to the idle pose (so idle can loop on after it)
  // everything that moves on its own has a 3 s period and every clip boundary is a multiple of 3, so the joins are seamless.
  const INTRO=3, W0=9, PULSE=3, wP=2*Math.PI/PULSE;
  const RIP=[0,1.6], CARD=[W0+.5,W0+2], SIGN=[W0+1.1,W0+2.1], OUT=[W0+5.6,W0+6.6], S0=W0+6.2, PER=7.4, GROW=1.9, FOLD=1.3;
  const sStart=i=>S0+i*PER, LASTEND=sStart(N-1)+PER;
  const BACK=[LASTEND-.6,LASTEND+.9], END=Math.ceil((LASTEND+4.6)/PULSE)*PULSE, GONE=[END-2.4,END-.9];
  const TAPOUT=[W0,W0+.7], TAPIN=[END-1.4,END-.05];
  const frames=Math.round(END*FPS);
  const cam=V(0,.45,.8);           // roughly where a viewer stands; signs turn to face it
  function sceneK(i,t){ const s=sStart(i); return eout(seg(t,s,s+GROW))*(1-ease(seg(t,s+PER-FOLD+.5,s+PER+.5))); }
  // collect nodes
  const nodes=[], idx=new Map();
  const skip=o=>o.isSprite||o.isPoints||o.isLine||(o.material&&(o.material.isShaderMaterial||o.material.colorWrite===false));
  (function walk(o,parent){ if(skip(o)) return; const id=nodes.length; idx.set(o,id); nodes.push({o,parent,last:null,lastF:-1,seen:null,samples:[]}); o.children.forEach(c=>walk(c,id)); })(root,-1);
  const key=o=>{ const v=o.visible; const p=o.position,q=o.quaternion,s=o.scale; const k=v?1:0;
    return [p.x,p.y,p.z,q.x,q.y,q.z,q.w,s.x*k||1e-4,s.y*k||1e-4,s.z*k||1e-4].map(x=>+x.toFixed(5)); };
  const same=(a,b)=>a&&b&&a.every((x,j)=>Math.abs(x-b[j])<1e-5);
  const matMax=new Map();
  for(let f=0;f<=frames;f++){ VT=f/FPS; const t=VT;
    const rip=eout(seg(t,RIP[0],RIP[1]));
    pondG.scale.setScalar(Math.max(1e-4,rip)); rings.forEach((g,k)=>{ const e=eout(seg(t,RIP[0]+k*.18,RIP[1]+k*.18)); g.scale.setScalar(Math.max(1e-4,e*(1+.025*Math.sin(t*wP-k*.9)))); });
    const tk=t<W0?eout(seg(t,1.2,2.4)):Math.max(1-ease(seg(t,TAPOUT[0],TAPOUT[1])),eout(seg(t,TAPIN[0],TAPIN[1])));
    tap.scale.setScalar(Math.max(1e-4,tk)); tap.position.set(0,.16+.02*(1-tk)+Math.sin(t*wP)*.005,0); tap.lookAt(cam.x,tap.position.y,cam.z);
    { const ph=((t%PULSE)+PULSE)%PULSE/PULSE, on=t>=INTRO&&(t<W0||t>=END-.001)?1:0; const r=.12+.88*eout(seg(ph,0,.85));
      pulse.scale.set(Math.max(1e-4,r*on),1,Math.max(1e-4,r*on)); pulse.position.y=on?(ph<.06?-.004+.0074*seg(ph,0,.06):ph>.85?.0034-.0074*seg(ph,.85,.93):.0034):-.004; }
    // the card: rises at the start, sinks as the first scene opens, returns at the end and sinks again before the loop
    const cin=Math.max(eout(seg(t,CARD[0],CARD[1]))*(1-ease(seg(t,OUT[0],OUT[1]))), eout(seg(t,BACK[0],BACK[1]))*(1-ease(seg(t,GONE[0],GONE[1]-.3))));
    card.scale.setScalar(Math.max(1e-4,cin)); card.position.set(0,.004+Math.sin(t*1.2)*.004*cin,0); card.rotation.y=Math.sin(t*.55)*.45;
    const sin=Math.max(eout(seg(t,SIGN[0],SIGN[1]))*(1-ease(seg(t,OUT[0]-.3,OUT[1]-.3))), eout(seg(t,BACK[0]+.4,BACK[1]+.4))*(1-ease(seg(t,GONE[0]-.4,GONE[1]-.6))));
    sign.scale.setScalar(Math.max(1e-4,sin)); sign.position.set(0,.27+.03*(1-sin)+Math.sin(t*1.4)*.003,0); sign.lookAt(cam.x,sign.position.y,cam.z);
    scenes.forEach((h,i)=>{ const k=sceneK(i,t); h.scale.setScalar(Math.max(1e-4,k)); h.rotation.y=(1-k)*-.7; if(k>.0002) h.userData.L.forEach(fn=>fn(t));
      const lab=h.userData.lab, lk=eout(seg(t,sStart(i)+.5,sStart(i)+1.5))*(1-ease(seg(t,sStart(i)+PER-FOLD,sStart(i)+PER-FOLD+.6)));
      lab.scale.setScalar(Math.max(1e-4,lk)); lab.position.set(0,.36+.02*(1-lk),-.06); lab.lookAt(cam.x,lab.position.y,cam.z); });
    nodes.forEach((n,j)=>{ const k=key(n.o);
      if(f===0){ n.samples.push([0,...k]); n.last=k; n.lastF=0; }
      else if(!same(k,n.last)){ if(n.lastF<f-1) n.samples.push([f-1,...n.last]); n.samples.push([f,...k]); n.last=k; n.lastF=f; }
      if(n.o.material){ const m=n.o.material; matMax.set(m,Math.max(matMax.get(m)||0,m.opacity)); } });
  }
  performance.now=realNow;
  const tapIds=[pond,tapM,...rings.map(g=>g.children[0])].map(o=>idx.get(o));

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
    const basic=m.isMeshBasicMaterial; const op=m.userData.solid?1:m.transparent?Math.max(.02,matMax.get(m)??m.opacity):1;
    M.push({basic,color:hex(m.color),map:texId(m.map),rough:m.roughness??1,metal:m.metalness??0,clear:m.clearcoat??0,clearR:m.clearcoatRoughness??0,
      emis:m.emissive?hex(m.emissive.clone().multiplyScalar(m.emissiveIntensity??1)):null,opacity:+op.toFixed(3),alphaTest:m.alphaTest||0,
      vcol:!!m.vertexColors,double:m.side===T.DoubleSide,additive:m.blending===T.AdditiveBlending}); return id; };
  const out=nodes.map((n,j)=>{ const o=n.o; const r={name:(o.name||o.type).replace(/[^A-Za-z0-9_]/g,'_').slice(0,40),parent:n.parent,s:n.samples};
    if(o.isMesh){ r.g=geoId(o.geometry); r.m=matId(o.material,o.geometry); if(o.material.vertexColors) r.vc=G[r.g].avg; } return r; });
  return JSON.stringify({fps:FPS,frames,clips:{intro:[0,INTRO],idle:[INTRO,W0],welcome:[W0,END]},tap:tapIds,nodes:out,geos:G,mats:M,texs:X});
};
