# Steel Prep

A personal bodybuilding-prep tracker: nutrients, body measurements with a 3D model, progress photos. Built as a plain web page that installs to an Android phone's home screen and runs offline. Landscape only.

**Status:** slice 2 — menu shell, Body HUD with a placeholder 3D mannequin, and the Nutrients tab (bars, targets, food catalog, daily log, water, caffeine) on an on-device database. The barcode scanner is next. See `CLAUDE.md` for the full spec and build order.

## Open it
- Hosted: the GitHub Pages link for this repo (Settings → Pages). The app lives at the repo root, so the link is the plain repo address.
- On a PC: the app uses JavaScript modules, which browsers only load over http, so use the Pages link (or any small local web server pointed at this folder).

## Folder
```
index.html                  markup for the three screens and the Nutrients sheets
css/app.css                 all styles
css/lcd-fonts.css           DSEG7 / DSEG14 LCD fonts (Keshikan, SIL OFL 1.1), embedded
js/app.js                   boot: opens the database, then starts each screen
js/ui.js                    shared helpers, screen switching, sheets
js/db.js                    IndexedDB data layer (the browser's on-device database)
js/menu.js                  countdown, date, clock, the drum of tabs
js/body.js                  Body HUD + placeholder mannequin
js/nutrients.js             Nutrients tab
js/data/nutrient-defs.js    the 34 nutrient bars: units, targets, limits
js/data/foods-preload.js    preloaded USDA foods + the caffeine sources
vendor/three.module.min.js  three.js 0.160 — MIT
fonts/rajdhani-*.woff2      Rajdhani — SIL OFL 1.1
CLAUDE.md                   spec + working rules for Claude Code
```

## Data
Everything you log stays in the browser's database on your own device. Nothing is sent anywhere. Backup and restore files arrive in slice 6.

## Working on it
Open the repo in Claude Code (claude.ai/code). It reads `CLAUDE.md` first and proposes each slice in plain English before building.
