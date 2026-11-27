# zen AR welcome — v5 (table diorama)

WebAR prototype for **zen by easypaisa digital bank** (premium banking). A customer unboxes their zen card, scans a QR
in the box, and gets a fun welcome: "access granted · welcome to zen, the inner circle". A platform opens on the table
beside the card like a trap door over a rippling pond, seven acrylic info cards rise on a swipeable conveyor belt across the platform (cashback & rewards / higher transfer limits /
international payments / priority helpline in a back row; exclusive events / airport lounges / coffee & discounts up to 50% off in front), and tapping one raises a miniature diorama. It is a standalone welcome moment, not connected to any
account, and must never read like card verification or registration.

The on-card build (v2) is abandoned; only this folder is maintained.

## Running
Static site, no build step. Serve the folder over **https** for phones (camera needs a secure context), e.g. Netlify
Drop, Cloudflare Pages or GitHub Pages (Netlify adds a "powered by" badge bottom-right; UI already clears it).
Local: `python3 -m http.server 8771`, open http://localhost:8771.

## Platforms
- **Android (ARCore):** WebXR `immersive-ar` + hit-test + dom-overlay, real table tracking (`startTable(aScene,false)`).
  Framebuffer scale raised to native for sharpness. Chrome's AR camera appears to be fixed-focus, so close-up cards blur;
  the copy asks for arm's length.
- **iPhone / no WebXR:** card mode (`startTable(aScene,'card')`, chosen 2026-11-27 after gyro-only look mode floated
  and drifted on device): user photographs the card, MindAR compiles it in-browser and tracks it; the table station is
  anchored beside the card (station = target matrix * Rx(90) * scale SCL/CW, SCL=.45, platform beyond the card's top edge).
  When the card leaves view the motion sensor holds the pose (3DoF) until it is seen again. Taps use window pointer
  events with a forgiving hit radius plus a DOM perk-chip row (`#xchips`), since Safari dropped canvas clicks.
  Old gyro "look" mode (`startTable(null,true)`) still exists but is no longer reached. True 6DoF iOS AR would need an
  ARKit App Clip, AR Quick Look, or a paid web SLAM SDK.
- Legacy card-image mode (MindAR, `build()`) still exists but is not the main path.

## Code map (index.html is everything, ~1340 lines; main script is wrapped in a block `{ ... }`, so top-level
## functions are NOT global — debug hooks are `window.__xr2` and `window.__zz`)
- `ZA` — WebAudio: slow ambient pad music (long detuned saw pads, drone, sparse glass bells, 5.5 s reverb), soft UI
  sounds, per-scene ambience (airport chime + speechSynthesis announcement, café murmur/clinks, event crowd/applause).
  Sound toggle `#snd`. User wants it premium, ambient, long and elongated — never "friendly/bouncy".
- `infoTex` / `acrylic` — info card face (perk tag, logo, hero icon or "50%", title, subline, "tap to open" bar) on a
  thick (7 cm-scale) vertex-coloured acrylic slab, so colour runs through the body. No floating emblems (removed).
- `gradify(m)` — onBeforeCompile height gradient on all scene materials (uses `GRAIN.uDioInv`). User dislikes flat colour.
- `gloss` / `satin` / `P.*` / `P.acryl` — premium physical materials (clearcoat lacquer, porcelain, frosted acrylic);
  `studioEnv()` makes the PMREM reflections; `roundedBox()` bevels glossy boxes.
- `stripGeo` — mitered glow strips (outline/link/platform loop), soft core + additive halo; no gaps at corners.
- `person(p,x,z,ry,shirt,y0,pose)` — faceted low-poly "aluminium sculpture" figures; poses `stand|sit|cross|walk`.
  `walker()` + `hover()` move people along waypoint loops; they GLIDE/hover — user asked for no stepping animation.
- `buildEvents` (stage, 3 seated rows, 8 people drifting in/out to stand at the back), `buildLounge` (cozy lounge,
  window, plane (`plane.json`) looping outside, sofa guest cross-legged facing the room, 2 travellers strolling in),
  `buildMall` (café + boutique fronts with open doorways; a shopper goes boutique → café → back with a coffee).
- `MARQ` / `addMarquee` — two see-through ticker bands around the open scene; textures repeat whole phrase cycles only.
- `makeSky` — night-sky dome (stars, horizon glow, soft rim) + drifting motes; fades to 0 toward the table.
- `rippleMat` — animated pond shader on trap doors and slab (outward rings, sage gradient, rounded white rim).
- `makeTrap` — depth-masked trap door with pit, hinged doors, rising slab.
- `buildCashback`, `buildLimits`, `buildIntl`, `buildHelp` — the four newer perk scenes (coins into a jar, limit gauge + towers, globe + currencies, concierge desk + priority lane). `INFO` order sets card rows.
- `sim.html` — desktop simulator: phone frame, fake table camera, drag to look, jump buttons. Published as a claude.ai artifact (index.html copied to app.html there).
- `startTable` — placement flow (find table → outline → trace → cards → scene), bottom-right control row.

Any card shown in a scene uses `zenCard()` (the user's real card image), standing vertically.

## Brand / design rules
Archia font (fonts/), real zen logo (zen-logo.svg). Colours: digiteal #006D5A, green #00BD5F, emerald #055D37,
lush/mint #CEE9D8, dark #322D3C. Lowercase copy. Modern, clean, not "typical AI design"; subtle gradients, no noise,
no ripple overlays on UI. Everything should feel high-end (premium materials even where contrast is needed).

## iPhone AR Quick Look (default on iPhone since 2026-11-27)
iPhone's main button opens `zen-welcome.usdz` in AR Quick Look (Apple's viewer anchors it to the table and loops it);
"or try the interactive version" runs the card-tracking flow. The usdz is baked from the live scenes, not hand-made:
`python3 -m http.server 8771` then `node tools/usdz/bake.js` (records tools/usdz/record.js timeline at 15 fps into
out/bake.json) then `python3 tools/usdz/build_usdz.py` (needs `pip install usd-core pillow`; writes zen-welcome.usdz).
`node tools/usdz/preview.js 5 8 12` renders frames from the bake to check it. Timeline:
a ripple spreads on the table (pond + rings), the real zen card (`zen-card.png`, always upright) rises with an
"access granted / welcome to zen" sign, then each of the 7 scenes grows out of the ripple with a crisp title plate
("perk 0N of 07"), and finally the card and sign return before everything sinks (seamless ~63 s loop). Perk tiles are
not used on iOS. Text textures bake at 2x (`window.__texScale`). Quick Look can't take taps inside AR, so "tap to enter zen" is the page button. Shaders, sprites, points (ripple, sky, motes,
glow) are skipped; marquee texture scroll is lost but bands still turn. Rebake after any scene or card change.

## Phone testing
GitHub Pages from `a2mirza/zen-ar` main: https://a2mirza.github.io/zen-ar/ (sim at /sim.html). Push to main = redeploy in ~1 min.

## Testing
`node tools/preview.js` (needs puppeteer) walks look mode and saves screenshots to `tools/shots/`. Headless
SwiftShader renders reflections flatter than a phone. Always syntax-check the main script after edits and run the
preview; WebXR (Android) can only be truly tested on a device.

## Assets
`plane.json` — airliner, base64 position/index groups, full detail (~19k tris; decimating it caused holes).
`tools/plane_convert.py` rebuilds it from the source OBJ (`python3 tools/plane_convert.py in.obj texture.png out.json 999999`).
