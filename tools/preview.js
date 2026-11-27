// Headless walkthrough of the table (look) mode: places the platform, opens each scene, saves screenshots to tools/shots/.
// usage:  npx http-server . -p 8771   (or: python3 -m http.server 8771)   then   node tools/preview.js
// needs:  npm i puppeteer   (or set CHROME_PATH and use puppeteer-core)
const path=require('path'), fs=require('fs'); let p; try{ p=require('puppeteer'); }catch(e){ p=require('puppeteer-core'); }
const OUT=path.join(__dirname,'shots'); fs.mkdirSync(OUT,{recursive:true}); const sl=ms=>new Promise(r=>setTimeout(r,ms)); const shot=(pg,n)=>pg.screenshot({path:path.join(OUT,n+'.png')});
(async()=>{ const b=await p.launch({executablePath:process.env.CHROME_PATH||undefined,headless:'new',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const pg=await b.newPage(); await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
pg.on('pageerror',e=>console.log('PAGE ERROR',e.message)); pg.on('console',m=>{ if(m.type()==='error') console.log('console',m.text().slice(0,200)); });
await pg.goto('http://localhost:'+(process.env.PORT||8771)+'/',{waitUntil:'load'}); await sl(900); await shot(pg,'0_intro');
const tilt=(a,bt)=>pg.evaluate((a,bt)=>{ window.__o={a,bt}; if(!window.__oi) window.__oi=setInterval(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:window.__o.a,beta:window.__o.bt,gamma:0})),30); },a,bt);
await pg.tap('#go'); await sl(1500); await tilt(0,40); await sl(800); await shot(pg,'1_find');
await pg.mouse.click(195,300); await sl(900); await shot(pg,'2_outline');
await pg.click('#xplace'); await sl(1600); await shot(pg,'3_trace');
await pg.waitForFunction(()=>__xr2.state()==='cards',{timeout:15000}); await sl(400); await shot(pg,'4_cards');
for(const i of [0,1,2]){ await pg.evaluate(i=>__xr2.open(i),i); await pg.waitForFunction(()=>__xr2.state()==='scene',{timeout:20000}); await sl(7000); await shot(pg,'5_scene'+i);
  await pg.evaluate(()=>__xr2.back()); await pg.waitForFunction(()=>__xr2.state()==='cards',{timeout:15000}); }
await pg.click('#xexit'); await sl(600); console.log('done, screenshots in tools/shots'); await b.close(); })();
