# Steel Prep

A personal bodybuilding-prep tracker: nutrients, body measurements with a 3D model, progress photos. Built as a plain web page that installs to an Android phone's home screen and runs offline. Landscape only.

**Status:** slice 1 — menu shell + Body HUD with a placeholder 3D mannequin. Nutrients is next. See `CLAUDE.md` for the full spec and build order.

## Open it
- Hosted: the GitHub Pages link for this repo (Settings → Pages).
- Locally: open `index.html` in Chrome. Everything it needs is in this folder (`vendor/` for the 3D library, `fonts/` for the typefaces).

## Folder
```
index.html                  the whole app (slice 1)
vendor/three.module.min.js  three.js 0.160 — MIT
fonts/rajdhani-*.woff2      Rajdhani — SIL OFL 1.1
CLAUDE.md                   spec + working rules for Claude Code
```
DSEG7 / DSEG14 LCD fonts (Keshikan, SIL OFL 1.1) are embedded inside `index.html`.

## Working on it
Open the repo in Claude Code (claude.ai/code). It reads `CLAUDE.md` first and proposes each slice in plain English before building.
