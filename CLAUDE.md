# zen AR welcome — v5 (table diorama)

WebAR prototype for **zen by easypaisa digital bank** (premium banking). A customer unboxes their zen card, scans a QR
in the box, and gets a fun welcome: "access granted · welcome to zen, the inner circle", then sees the 7 perks as
miniature 3D dioramas on their table. It is a standalone welcome moment, not connected to any account, and must never
read like card verification or registration.

The on-card build (v2) is abandoned; only this repo is maintained. State as of 2026-11-27 (handoff written that day).

## Picking this up (new machine / new Claude account)
1. `git clone https://github.com/a2mirza/zen-ar && cd zen-ar` (public repo, owner a2mirza). Run `claude` in it.
2. Local: `python3 -m http.server 8771`, open http://localhost:8771 (desktop sim: http://localhost:8771/sim.html).
3. **Phone link = GitHub Pages** from `main`, root folder (`.nojekyll` present):
   https://a2mirza.github.io/zen-ar/ (sim at /sim.html). Every push to `main` redeploys in about 1 minute
   (check with `gh api repos/a2mirza/zen-ar/actions/runs`). Camera AR needs https, so always test phones on this link.
4. Working loop the user likes: they text a change, Claude edits, syntax-checks, checks in the sim/preview, pushes to
   main, and tells them to reload the link on their phone.
5. Tooling: Node + `playwright` (or puppeteer) for previews/bake; Python 3 with `pip install usd-core pillow` for the
   USDZ build.

## The 7 perks (`INFO` in index.html, order = belt order)
cashback & rewards · higher transfer limits · international payments · priority helpline · exclusive events ·
airport lounges · coffee & discounts (up to 50% off). The user listed 5 new ones (cashback, limits, international,
coffee/discounts, helpline); events and lounges were kept as extras. That reading was never confirmed, so ask if
the count matters.

## Platforms and flows
- **Android (ARCore, Chrome):** WebXR `immersive-ar` + hit-test + dom-overlay, real table tracking
  (`startTable(aScene,false)`). Find table → outline → trace → perk belt → tap → scene rises from a trap door over a
  rippling pond. Framebuffer at native scale. Chrome's AR camera seems fixed-focus, so copy asks for arm's length.
  - **Perk belt:** the 7 acrylic cards ride a swipeable conveyor belt across the platform (`beltPose`, `CSX`, `SP`,
    `bo`/`bt` with snapping, flick in `endDrag`). Cards feather/shrink toward the edges; the centre card is larger and
    forward. Tap the centre card to open; tap a side card to centre it. Android swipe is read from the XR input source
    (`selectstart/selectend` + per-frame `targetRaySpace` pose); screen swipe via window pointer events.
  - **Swipe cues** (user said people didn't realise there were more): until the first swipe the belt teases toward the
    next cards every 4.5 s; the sheet shows 7 dots + "n of 7" (`#xbelt`, `#xdots`, `#xcount`) and an animated
    "swipe for more ››" (`#xswipe`) that fades after the first swipe. A perk chip row (`#xchips`) also opens any perk.
- **iPhone, default: AR Quick Look** (Apple's own AR viewer; true table anchoring, very high render quality).
  The intro page reads "welcome to zen. see what you get."; the button "tap to enter zen" opens `zen-welcome.usdz`
  via a hidden `<a rel="ar">` (`#qlA`). Inside AR: a ripple spreads on the table with a sign "welcome to zen · tap to see
  what you get" and a pulsing ring; **tapping** the ripple/sign plays the welcome (the real zen card rises upright with
  "access granted · welcome to zen", then all 7 perk scenes grow one by one out of the ripple with crisp title plates),
  then it returns to the waiting ripple and can be tapped again. Perk tiles are not used on iPhone.
- **iPhone, "or try the interactive version"** (`#goLive` → `liveGo()`): card tracking (`startTable(aScene,'card')`).
  User photographs their card, MindAR compiles it in-browser and tracks it; the station is anchored beside the card
  (target matrix * Rx(90) * scale SCL/CW, SCL=.45). If the card leaves view the gyro holds the pose (3DoF). Taps use
  window pointer events with a forgiving radius + chips, since Safari dropped canvas clicks. (Gyro-only "look" mode
  floated on a real iPhone and is no longer reached.)
- Legacy card-image mode (MindAR, `build()`) still exists but is not used.

## Code map (index.html is everything, ~1600 lines; main script is wrapped in a block `{ ... }`, so top-level
## functions are NOT global — debug hooks are `window.__xr2` (state etc.) and `window.__zz` (builders, textures))
- `ZA` — WebAudio: slow ambient pad music, soft UI sounds, per-scene ambience. Sound toggle `#snd`.
- `INFO` — the 7 perks (title, sub, icon, build fn). `infoTex` / `acrylic` — card face + thick acrylic slab.
- `tex(w,h,draw)` — canvas texture helper; `window.__texScale` draws at higher resolution (bake uses 2).
- `zenCard(parent,x,y,z,w)` — the user's real card (`zen-card.png`), upright portrait, mint edge. Use it for EVERY
  card shown anywhere, always standing vertically (user rule).
- `gradify(m)` height gradient on scene materials (user dislikes flat colour). `gloss`/`satin`/`P.*` premium
  materials; `studioEnv()` PMREM reflections; `roundedBox()`.
- `stripGeo` mitered glow strips. `person(...)` faceted aluminium-sculpture people; `walker()`/`hover()` make them
  GLIDE (user asked for no stepping).
- Scenes: `buildEvents`, `buildLounge` (plane from `plane.json` looping outside), `buildMall` (café + boutique),
  `buildCashback` (coins into a jar, big upright zen card), `buildLimits` (gauge + towers), `buildIntl` (globe,
  currencies, upright pay cards), `buildHelp` (concierge desk + priority lane).
- `MARQ` / `addMarquee` ticker bands; `makeSky` night dome + motes; `rippleMat` pond shader; `makeTrap` trap door.
- `startTable` — placement flow and the belt; `liveGo()` — the camera/AR start; iOS Quick Look switch is the
  `IOS && QL` block (sets `window.IOS_QL` so the async WebXR check doesn't overwrite the iPhone copy).

## iPhone USDZ: how it is built (rebuild after ANY scene, card or text change)
```
python3 -m http.server 8771 &            # bake.js loads the app from here
node tools/usdz/bake.js                  # runs tools/usdz/record.js inside index.html -> tools/usdz/out/bake.json
python3 tools/usdz/build_usdz.py         # -> zen-welcome.usdz (≈5 MB) in repo root
node tools/usdz/preview.js 1.5 5 11.5 30 # renders frames from the bake into tools/usdz/out/ to eyeball it
```
- `record.js` builds the timeline from the live three.js scenes and samples every node's TRS at 15 fps with a virtual
  clock. Three clips: **intro [0,3]** ripple spreads + tap sign rises; **idle [3,9]** calm loop with pulse ring;
  **welcome [9,end≈72]** card + welcome sign, 7 scenes in turn (7.4 s each), then back to the idle pose. Everything
  that moves by itself has a 3 s period and clip edges are multiples of 3, so the joins are seamless. Text plates are
  solid and drawn at 2x so they're crisp.
- `build_usdz.py` writes UsdPreviewSurface materials (JPEG for opaque, 256-colour PNG for alpha), meshes and xformOp
  time samples (60 time codes/s), wraps content in `/zen/Scenes/Scene` (sceneLibrary, plane anchoring) and adds Apple
  **preliminary behaviours** (the Reality Composer schema; layout copied from Needle Engine's proven Quick Look
  exporter): scene start → intro then looping idle; TapGesture on pond/rings/tap sign → welcome then looping idle (both
  exclusive). `sceneName` metadata is injected through the text layer because pxr has no key for it.
- Quick Look cannot render ShaderMaterial, sprites, points or depth masks, so the recorder skips them (pond is a
  textured disc instead of the shader; marquee scroll is lost but bands still turn).
- **Untested on a real iPhone so far:** the tap-to-start behaviour was built from the spec/Needle source, not seen on a
  device. If Quick Look ignores the tap or freezes, the fallback is to drop the Behaviors scope (Quick Look then
  auto-plays the whole timeline on a loop; that version was the previous commit 28fcad5).

## Assets
- `zen-card.png` — the card texture (640×1014, rounded corners). Source art: `assets/source/zen-card-platinum.png`
  (user's "Debit Card platnum high res"); rebuild with `python3 tools/make_card.py`.
- `zen-logo.svg` real logo; `fonts/` Archia; `plane.json` airliner (~19k tris, don't decimate; rebuild with
  `python3 tools/plane_convert.py in.obj texture.png out.json 999999`, source OBJ not in repo).
- `aframe.min.js`, `mindar.js` vendored (no CDN at runtime).

## Simulator (`sim.html`)
Desktop preview of the phone flow: phone frame around an iframe of index.html, fake camera (a three.js room with a 4×
zen card on a wooden table via `captureStream`, fresh stream per call), synthetic deviceorientation from drag/arrows,
jump buttons for the 7 perks, belt swipe passthrough while cards are up. It is also published as a private claude.ai
artifact for the old account (index.html copied to `app.html`, iframe src rewritten). In a new account, republish it or
just use https://a2mirza.github.io/zen-ar/sim.html.

## Brand / design rules and user preferences
- Archia font, real zen logo. Colours: digiteal #006D5A, green #00BD5F, emerald #055D37, lush/mint #CEE9D8,
  dark #322D3C. Lowercase copy. Modern, clean, premium, not "typical AI design"; subtle gradients, no noise, no ripple
  overlays on UI.
- Sound: premium, ambient, long and elongated, never bouncy. People glide, never step.
- Animations should flow into each other; text must be crisp, never faded.
- Load fast without losing quality. Push to main (the phone link) after every change.

## Testing
`node tools/preview.js` (puppeteer) walks look mode → `tools/shots/`. Headless SwiftShader renders reflections flatter
than a phone. Always syntax-check the main script after edits and check in the sim. WebXR (Android) and Quick Look
(iPhone) can only truly be tested on devices; the cloud box's proxy can't reach github.io, so check deploys via `gh api`.

## Known limits / open items
- Quick Look tap-to-start not yet confirmed on device (see above).
- Belt swipe speed/feel on Android not yet confirmed by the user.
- 7 vs 5 perks never explicitly confirmed.
- True 6DoF web AR on iPhone beyond Quick Look would need an App Clip or a paid web SLAM SDK.
