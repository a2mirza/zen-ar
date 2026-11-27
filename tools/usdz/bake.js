// Bake the iPhone AR Quick Look animation.
// usage: python3 -m http.server 8771 (in the repo root), then:  node tools/usdz/bake.js  &&  python3 tools/usdz/build_usdz.py
// writes tools/usdz/out/bake.json, which build_usdz.py turns into zen-welcome.usdz
const path=require('path'), fs=require('fs'); const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage(); p.on('pageerror',e=>console.log('PAGE ERROR',e.message));
  await p.goto('http://localhost:'+(process.env.PORT||8771)+'/index.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>document.fonts.ready);
  await p.addScriptTag({path:path.join(__dirname,'record.js')});
  const t0=Date.now(); const json=await p.evaluate(fps=>window.__bake(fps), +(process.env.FPS||15));
  const out=path.join(__dirname,'out'); fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(path.join(out,'bake.json'),json);
  console.log('baked in',((Date.now()-t0)/1000).toFixed(1),'s,',(json.length/1e6).toFixed(1),'MB'); await b.close(); })();
