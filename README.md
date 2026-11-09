# Brick

**3D brick building instructions you can follow by voice.** Spin the model, see every new piece, and move on by saying “next”. Free and open source.

Live: **https://brick.studio104.fr** · Try a guide: [/build/7140](https://brick.studio104.fr/build/7140)

Inspired by [Bygga](https://github.com/Nutlope/bygga), which does the same for flat-pack furniture.

## Features

- **3D, step by step** from LDraw models: original `0 STEP` data, or steps generated layer by layer when a file has none.
- **Sub-assemblies** are built on their own in a framed view, then attached to the model with an animation.
- **Hands-free voice control** (French today; English and Spanish next): “suivant”, “précédent”, “répète”, “pièces”, “étape 12”, “zoom”, “tourne à gauche”, “stop”. The mic pauses while the app speaks, so it never hears itself.
- **Narration** of every step, parts list with rendered thumbnails, full inventory.
- **Resume** where you stopped, deep links (`/build/7140?step=42`), screen kept awake while building, **offline** once opened.
- **Landing page** in English, French and Spanish with **search by set number**: opens the 3D guide, or links to the official instructions and records a “I want this set in 3D” request.
- **Privacy first**: no account; Google Analytics loads only after consent; what you say is never recorded or sent.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173  (landing) and /build/4915 (builder)
npm test         # voice command parser, step sequencing, narration, LDraw metadata
npm run build    # production build in dist/
```

Voice recognition needs Chrome, Edge or Safari, on `localhost` or HTTPS. In dev, `__brick.hear('étape 12')` in the console simulates what the mic heard.

## How it works

| Path | Role |
|---|---|
| `index.html`, `src/site/` | Landing page, search by set number, translations |
| `build/index.html`, `src/app/` | The builder (UI and wiring) |
| `src/ldraw/model.ts` | Loads a packed LDraw file with three.js, finds parts and sub-assemblies |
| `src/ldraw/sequence.ts` | Turns STEP data and submodels into the steps shown (pure, tested) |
| `src/ldraw/meta.ts` | Part descriptions, colours, French labels, model author (pure, tested) |
| `src/viewer.ts` | 3D scene: fading, drop-in animations, framing, part thumbnails |
| `src/voice/` | Speech recognition, command parser (tested), speech synthesis |
| `src/shared/` | Language detection, consent-gated analytics |
| `public/models/` | LDraw models (see their [attribution](public/models/README.md)) |

## Adding a set

Drop a **packed** `.mpd` (a single file that embeds every part, e.g. produced with three.js's `utils/packLDrawModel.mjs` from the [LDraw parts library](https://library.ldraw.org/)) into `public/models/`, then add a line to `src/catalog.ts`. The app also opens any packed file from the “Ouvrir…” button.

Roadmap: a scheduled job that packs and validates the whole [LDraw Official Model Repository](https://library.ldraw.org/omr) (about 1,500 official sets), app translations, and sub-assembly detection for files without submodels.

## Deploy

Hosted on Firebase Hosting (site `brick-studio104`):

```bash
npm run build && firebase deploy --only hosting:brick
```

## Licence

Code: [MIT](LICENSE). 3D models: LDraw Official Model Repository, [CC BY 2.0](public/models/README.md).

Brick is an independent project, not affiliated with, sponsored or endorsed by the LEGO Group. LEGO® is a trademark of the LEGO Group. Official building instructions are on [lego.com](https://www.lego.com/service/building-instructions).
