# Steel Prep — CLAUDE.md

This file is read at the start of every Claude Code session. It is the single source of truth for the project: how GG works, what has been decided, what exists, and what to build next. Keep it current — when a decision changes, change it here.

---

## 0. How GG works — read before doing anything

GG (George) is building this app for himself. He manages a gym, is learning to build software with Claude ("vibe coding"), and is not software-literate. Treat every reply as teaching as well as building.

1. **Ask before building anything non-trivial.** Plan in plain English first, mark every guess in `[brackets]`, flag uncertainty, then wait for GG to say **go**. If the spec below is silent on something, ask — do not fill the gap with your own taste. Batch questions by number so GG can answer "1 yes, 2 b, 3 default".
2. **Small working slices.** Each slice ends with: what changed (which files), how GG tests it on his phone in landscape, and one next step. GG paces the work with **next**.
3. **Teach the why** in one or two lines while building. No lectures.
4. **Explain each technical term the first time it is used**, in one short clause. Never condescending.
5. **Push back** when a request is vague or aimed at the wrong problem.
6. **Flag in advance anything that requires GG to download or install something.** He does installs only on his personal PC, never on a work machine. This project is designed so nothing needs installing: plain files, GitHub website uploads, GitHub Pages.
7. **Be concrete about files.** When a step involves a file, say exactly where it is and what opens it.
8. **Permanent homes:** this repo is the code's home; Google Drive is where GG keeps exports, backups and copies; nothing lives on his work machine.
9. GG may plant a standing "canary" instruction to detect drift. Honor it in every reply.
10. Reply style: bottom line first, numbered lists, short. No "genuinely / honestly / straightforward".

---

## 1. What Steel Prep is

A personal bodybuilding-prep tracker for GG's contest-style cut, built to be shown to pro bodybuilders for review. Two tabs are specified (Nutrients, Body); the others are placeholders until GG plans them.

- **Platform:** an installable web app (a website that is added to the phone's home screen and then runs offline). Android phone first, PC browser second. **Landscape only.**
- **Hosting:** GitHub Pages from this repo. The repo is public; GG's data never leaves his device.
- **Offline:** after the install slice, everything runs with no internet. No accounts, no server, no sync.
- **Look:** Olympia backstage — black hex-cell panels, vibrant red, brushed steel rails. The Body tab is black / red / white only (no steel). LCD segment font for numbers.

---

## 2. Non-negotiables (architecture)

- **Plain static site.** HTML, CSS, vanilla JavaScript ES modules. No frameworks, no bundler, no build step, no npm at runtime. Must work when the files are served as-is by GitHub Pages and when GG uploads them through the GitHub website.
- **No runtime internet dependencies** once slice 5 lands: libraries in `/vendor`, fonts in `/fonts`, model in `/assets`. (three.js and Rajdhani already ship locally; the DSEG fonts are embedded as data URIs in `css/lcd-fonts.css`.)
- **Data stays on the device** in IndexedDB (the browser's built-in database). Backup/restore via files GG moves to Google Drive.
- **Barcodes give a number only.** No online food lookup — GG declined it. Nutrition is typed by hand once per food, and the barcode is remembered with the food.
- **Landscape only**, locked through the install manifest. A portrait fallback banner is fine; design for ~400 px tall (phone landscape) up to desktop.
- **Licenses to credit in-app (an About line):** DSEG fonts — Keshikan, SIL OFL 1.1; Rajdhani — Indian Type Foundry, SIL OFL 1.1; three.js — MIT; Z-Anatomy model (slice 7) — "Z-Anatomy, the libre 3D atlas of anatomy, CC BY-SA 4.0" and "BodyParts3D, Database Center for Life Science, CC BY-SA 2.1 Japan". A derived model shipped in this public repo must carry the same CC BY-SA license.
- **Privacy in this public repo.** OK to commit: GG's tape measurements, InBody numbers (weight, skeletal muscle mass, fat-free mass, body-fat %, BMR), nutrition targets, foods. NOT OK to commit: anything medical beyond that (blood work, medications, prescriptions). If GG pastes such data, use it in the session but keep it out of committed files.

---

## 3. Locked spec (decided 2026-10-30)

### 3.1 Theme
- Black background with a hex-cell pattern, vibrant red `#ff1f33` accents, brushed-steel rails on the menu and Nutrients. Body tab: black / red / white only.
- Fonts: **DSEG7** (digits) and **DSEG14** (letters) for LCD readouts — countdown, date, Body HUD numbers, measurement inputs. **Rajdhani** for everything else. LCD digits are red with the unlit "ghost" segments drawn faintly behind.
- HUD references were style direction (line-work, rings, red/white on black), not things to copy. No Olympia logo.

### 3.2 Main menu
- Top: **countdown** biggest — `12 WEEKS 3 DAYS OUT` (always weeks + days), tap it to set the show date; on the day `SHOW DAY`; after it `X DAYS SINCE`. Then the **date** `FRI 10.30.2026` smaller, and a **red analog clock**. No digital clock.
- Below: the **drum** — tab cards stand around a vertical axle like a slot drum on its side; only the center card faces you, neighbors curve away, it loops, swipe or arrows spin it, tap the center card to open, tap a side card to bring it round. Keyboard: ← → Enter.
- Cards, in order: NUTRIENTS, BODY, GOALS, WORKOUTS, PROGRESS, MISC., SETTINGS. Goals / Workouts / Progress / Misc. / Settings wear an **UNDER CONSTRUCTION** sign on the card and **do not open** (shake + toast). Add cards only when GG asks.
- Tab subtitles: Nutrients "Macros · Micros · Water · Caffeine"; Body "Proportion · Weight · Height"; Goals "Physique · Date"; Workouts "Splits · Notes · Tracking"; Progress "Photos · Chart"; Misc./Settings "To be planned".

### 3.3 Nutrients
- **Bars:** white glossy fill with a slight 3D effect on a dark steel track; red when out of range. Text inside each bar: `150 / 190 g · 79%`. Past 100% the bar stays full and the number keeps counting.
- **Order, all full-size (GG: "long scroll, detail is key"):** calories, protein, carbs, fat, fiber, water, caffeine, then the 27 micronutrients (13 minerals, 14 vitamins) from §4.3.
- **Targets** live behind a TARGETS button inside Nutrients (Goals tab is under construction). Defaults in §4.2.
- **Red rule — bands:** calories ±5%; protein 175–200 g; carbs 190 ± 15 g; fat min 40 / max 60 g; fiber min 30 g, no max; water min 128 oz, no max; caffeine max 200 mg; micros min = target, max = upper limit (none where no UL is set). "Too high" turns red the moment it happens; "too little" turns red only after the day ends. Day rolls over at **midnight**. Slice 2 defaults (GG's go, 2026-11-03): magnesium, niacin (B3) and folate upper limits count only foods typed SUPPLEMENT; sodium shows 1,500 mg as its target and turns red above 2,300; vitamin D is shown in µg (15 µg = 600 IU); max-only bars (caffeine) show the max as the target; a "too little" bar reads red by its border and numbers even when nothing was logged.
- **Food catalog:** preloaded foods (§4.4) plus GG's own. Each food: name, optional brand, type food / supplement, optional barcode number, nutrients per 100 g (macros + fiber + all 27 micros, blanks allowed), default serving in grams, liquid flag. Frequently eaten foods float to the top; search by name or brand. The food form takes the label's numbers per serving or per 100 g (a toggle); the app stores per 100 g. Deleting a food keeps its past log rows intact (each row carries a nutrient snapshot); editing a food changes future logs only.
- **Logging units:** g, oz, lb, servings; **fl oz only for foods marked liquid.** Entry = food + amount + unit, stamped with date/time. Flat daily list (no meal slots); water and caffeine rows sit in the same list, in time order; tap any row to change the amount or delete it. Past days viewable and editable via a date picker (◀ ▶ step a day, tap the date for the picker, TODAY jumps back); an entry added to a past day is stamped with that date and the current clock time. Conversions: 1 oz = 28.35 g, 1 lb = 453.6 g, 1 fl oz = 29.57 g.
- **Add a food:** scan the barcode (slice 3) or type the barcode number, then type name + nutrients by hand. If a scanned barcode is already in the catalog, log that food directly.
- **Caffeine:** tracked only through a quick-add list of named sources with mg (defaults: Pre-workout 200 mg, Bum Energy 125 mg; GG edits names/mg and adds more). Food and supplement items carry **no** caffeine field, so nothing double-counts. Flag any caffeine logged after **1:00 pm**: a red AFTER 1 PM tag on the row and a flag on the bar; the bar itself turns red only above 200 mg.
- **Water:** quick-add 8 / 16 / 32 oz plus a custom amount. Only water quick-adds count toward the water bar; liquid foods do not.
- Import of history from GG's old "Macros" app: later, only if that app exports.

### 3.4 Body (the main star)
- Landscape HUD: left column readouts **GENDER (fixed "M"), HEIGHT (ft/in), BODY FAT %, MUSCLE MASS (two lines: SMM lb and FFM lb, both labeled), WEIGHT (lb, with 7-day average)**. Top center **BMI** and **BMR (Katch-McArdle, from fat-free mass; matches GG's InBody within 1 kcal)**. Right panel **PROPORTION** editor in inches. Center: the 3D model. No "Build"/somatotype (removed).
- **Proportion editor, two layers:** (1) **TAPE** — the measurement sites below, in inches, ¼" steps, slider or typed value, L/R where measured; the tape numbers drive the model. (2) **MUSCLE** — 20 bodybuilding groups at 0–100 (50 = as measured) that fine-tune the look on top: Neck, Traps, Front delts, Side delts, Rear delts, Chest, Lats, Upper back, Lower back, Serratus, Abs, Obliques, Biceps, Triceps, Forearms, Glutes, Quads, Hamstrings, Adductors, Calves.
- **Sites (GG's handoff list, with his landmark notes):** Shoulders (widest, arms at sides) · Chest (6" above navel) · Waist (1" above navel) · Hips (4" below navel) · Neck (below Adam's apple) · Bicep L/R (3.5" from inner elbow) · Triceps L/R (6" from elbow) · Forearm L/R (2.5" from inner elbow) · Quad L/R (5" above knee) · Calf L/R (4" below knee) · Leg length L/R · Pec height L/R · Wingspan · optional Wrist / Ankle. A blank left side mirrors the right on the model and shows `=R`.
- **RELAXED and FLEXED** are two complete measurement sets; the toggle switches the **whole model**.
- **Versions:** every SAVE keeps a dated snapshot (date + time + which set), forever. Sliders move the model live; a version is created only on SAVE. HISTORY lists versions; tapping one shows it on the model.
- **Body fat and muscle mass** are typed in from InBody scans (dated). **BMI** from weight and height. **Weight:** daily morning entry with 7-day average.
- Units: imperial only in v1.

### 3.5 3D model
- Source: **Z-Anatomy** (Blender, CC BY-SA 4.0; male; anatomical position ≈ A-pose; every muscle a separate object; far too heavy for a phone). GG has Blender and Z-Anatomy on his personal PC. The Blender work (decimate, group, export `.glb`) happens there, via a script Claude writes or through GG's Blender connector in Claude Desktop.
- **Look:** a **HOLO / SOLID** toggle. Muscles only — **no skin, no skeleton** (GG, 2026-11-03).
- **Morphing approach (decided): runtime inflation** — each muscle object is pushed outward/inward along its surface normals by its driver. Honest limits: neighbors may poke through at extremes; it reads as a HUD model, not a photo. Hand-sculpted shape keys may follow later for the 6–8 muscles GG cares most about.
- **Mapping:** each tape site drives a set of muscles. **Site→muscle table approved by GG 2026-11-03:** Shoulders → the three deltoid heads (+ a touch of upper trapezius) · Chest → pectoralis major and minor, lats, teres major, serratus, mid trapezius, rhomboids, thoracic erectors · Waist → rectus abdominis, obliques, lumbar erectors, quadratus lumborum · Hips → gluteus maximus/medius/minimus, tensor fasciae latae · Neck → sternocleidomastoid, scalenes, splenius, upper trapezius, levator scapulae · Bicep L/R → biceps brachii, brachialis, coracobrachialis · Triceps L/R → the three triceps heads, anconeus · Forearm L/R → brachioradialis and every forearm flexor/extensor · Quad L/R → the four quads at full strength, hamstrings and adductors at half · Calf L/R → gastrocnemius and soleus, tibialis anterior and peroneals at half · Leg length L/R and wingspan → stretch the limb groups along their length · Pec height, wrist, ankle → wait for hand-sculpted shape keys. The 20 MUSCLE groups map to their obvious Z-Anatomy muscles (traps → trapezius, lats → latissimus + teres major, upper back → rhomboids, infraspinatus, teres minor, lower back → erectors + quadratus lumborum, serratus → serratus anterior, and so on). Calibration: at GG's Oct 26 baseline the model is as-modeled; each inch of girth moves the region outward/inward along its surface by the matching radius change (≈ 0.16 in per inch of girth), 1:1, **no cap** (GG, 2026-11-03); MUSCLE 0–100 adds ±12% at the ends.
- **Export pipeline (decided 2026-11-03, Route A):** GG runs `tools/blender-export.py` in Blender on his PC (steps in `tools/BLENDER-STEPS.md`). It picks every mesh under a muscle collection plus anything named like a muscle, smooth-shades them, decimates to ~150,000 triangles in total (floor 60 per muscle), and writes `body.glb` (separate meshes, original names kept, Y-up, no materials), `body-manifest.json` (per mesh: name, collection, triangles before/after, centroid, bounds; global bounds and height), `names.txt` (every object in the file) and `report.txt`. GG uploads the four files to `assets/` via the GitHub website. Muscle grouping lives in the app (a mapping file Claude maintains), so a mapping fix never needs another Blender run. The app will read the GLB with its own small parser (no vendored GLTFLoader), merge the muscles into one geometry with a per-vertex region id, and inflate along the stored normals; the app scales the model to GG's height.
- **Poses:** A-pose first; T-pose later (needs a rig or a second posed export). **Spin:** auto-rotate toggle + drag to rotate.
- Until the real model exists, the placeholder mannequin stays: every girth becomes a radius (circumference ÷ 2π), so it is measurement-true.

### 3.6 Photos
- Captured in Body (camera or gallery), tagged with pose FRONT / SIDE / BACK + date/time, stored on the device resized to ~1600 px long edge (~300 KB). Shown as a strip in Body for now; the full compare view belongs to the Progress tab later.

### 3.7 Report for Claude
- One download containing a **JSON** file (exact data) and a **Markdown summary** (targets, logs, averages, flags) for a chosen date range, defaulting to "since last report". Photos excluded. GG feeds it to Claude, then edits targets by hand; a later slice may import a plan file Claude writes.

### 3.8 Backup / restore
- BACKUP downloads one file (all data + photos) that GG moves to Google Drive; RESTORE picks that file. A reminder badge appears after 7 days without a backup.

### 3.9 Pro review
- Reviewers open the GitHub Pages link on their own phones. Their copy starts empty, so a **LOAD SAMPLE DATA** button fills it with clearly-marked sample data.

### 3.10 Under construction
- Goals, Progress, Misc., Settings, and the FORM TRACKING tab inside Workouts (GG calls it the other main star; not specced yet). Also deferred: daily check-ins (sleep, steps, 1–5 scales), labs, posing minutes, supplements-taken log. Do not design these until GG specs them.

### 3.11 Workouts (specced by GG 2026-11-05, built the same day)
- The WORKOUTS card opens. Two tabs along the top: **SPLIT** and **FORM TRACKING** (construction sign until specced).
- **Split picker = a flashcard deck** (Quizlet-style, not a drum): the front card is the active split, tap flips it to show the day pattern, swipe or the arrows cycle, each split keeps its own plan. Cards: UPPER / LOWER · PUSH / PULL / LEGS · BRO SPLIT · FULL BODY · UPPER / LOWER / PUSH / PULL / LEGS · CUSTOM. Presets label the days and set the rest days (UL: Upper, Lower, rest, Upper, Lower, rest, rest · PPL: Push, Pull, Legs, Push, Pull, Legs, rest · Bro: Chest, Back, Shoulders, Arms, Legs, rest, rest · Full body: Mon/Wed/Fri · ULPPL: Upper, Lower, rest, Push, Pull, Legs, rest); CUSTOM starts blank. No movements are preloaded.
- **Weekly planner** below the deck: MONDAY to SUNDAY columns in the theme (GG's reference was a plain weekly-planner grid); each column shows the day, its date (LCD), its label, its movements, and ADD + / SET REST DAY at the bottom; today is outlined; ◀ ▶ step a week, THIS WEEK jumps back. **The plan repeats every week**; what happened lives per real date.
- **Day sheet** (tap a column or ADD +): PLAN mode lists movements with editable name, sets and reps (weight is not shown yet) and an add row. START WORKOUT turns it into WORKOUT mode: every set is a row `SET n · weight LB × reps · tick`, sets and reps and weight editable, + SET / − SET, weight pre-filled from the most recent session that had the same movement name. MARK COMPLETED asks "ARE YOU FINISHED?" (YES / NO, an in-page panel); if sets are unticked it then asks "SOME ITEMS ARE NOT MARKED OFF, LEAVE IN NOTES AS UNCOMPLETED?": YES writes one note line per movement ("Incline press: 2 of 4 sets left (10/10 reps)") and completes, NO returns to the workout. A completed day is greyed with a COMPLETED tape; tapping it shows the sets read-only, notes editable, and UNMARK COMPLETED. Notes are rows of text with add / delete, allowed on any day.
- **Data** (IndexedDB v2): `workoutSplits` {id, name, days[7] {label, rest, movements[{id, name, sets, reps}]}} · `workoutSessions` keyed by date {splitId, dayIndex, label, started, completed, completedAt, movements[{name, sets[{weight, reps, done}]}], notes[{ts, text, auto}]} · `settings.activeSplit`.
- GG's direction: the app is to grow into a trainer / client / personal product ("rival RP Hypertrophy and MyFitnessPal"); keep data shapes clean and per-user-ready. He will spec the next step after this shell.

---

## 4. Data to build with

### 4.1 GG's baseline (sample data; relaxed, inches, Oct 26 2026)
Shoulders 43 · Chest 39.5 · Waist 29.5 · Hips 40 · Neck 12.5 · Bicep R 12.5 (L not measured) · Triceps R 12.4 (L not measured) · Forearm R 9.25 (L not measured) · Quad R 19.5 / L 19 · Calf R 13.25 / L 13.25 · Leg length 29.5 / 29.5 · Pec height 8.5 / 8.5 · Wingspan 72.
Height 5'11" (enter 5'11" always). Weight 187.0 lb (Oct 26). InBody Oct 9 2026: 192.6 lb, SMM 87.7 lb, FFM 155.2 lb, body fat 19.4% (37.4 lb), BMR 1,892 kcal.
The FLEXED set and the "7-day avg 188.2" in slice 1 are **placeholder sample values**, not measurements.

### 4.2 Default targets
2,000 kcal · protein 190 g (band 175–200) · carbs 190 g (±15) · fat 50 g (min 40, max 60) · fiber 30–38 g · water 128 oz · caffeine 200 mg max, none after 1 pm.

### 4.3 Micronutrient targets (US DRIs, men 19–30; "UL" = upper limit)
Minerals: Potassium 3,400 mg (no UL) · Sodium 1,500–2,300 mg (UL 2,300) · Magnesium 400 mg (UL applies to supplements only → no UL for food) · Calcium 1,000 mg (UL 2,500) · Zinc 11 mg (UL 40) · Iron 8 mg (UL 45) · Selenium 55 µg (UL 400) · Phosphorus 700 mg (UL 4,000) · Iodine 150 µg (UL 1,100) · Copper 900 µg (UL 10,000) · Manganese 2.3 mg (UL 11) · Chromium 35 µg (no UL) · Molybdenum 45 µg (UL 2,000).
Vitamins: A 900 µg (UL 3,000) · C 90 mg (UL 2,000) · D 15 µg / 600 IU (UL 100 µg / 4,000 IU) · E 15 mg (UL 1,000) · K 120 µg (no UL) · B1 1.2 mg · B2 1.3 mg · B3 16 mg (UL 35, supplements only) · B6 1.3 mg (UL 100) · Folate 400 µg (UL 1,000, supplements only) · B12 2.4 µg · B5 5 mg · B7 30 µg · Choline 550 mg (UL 3,500).

### 4.4 Preloaded foods (USDA FoodData Central values; GG weighs **cooked**)
1. Chicken breast, skinless, cooked (roasted)
2. Beef shoulder steak, boneless, cooked `[guess at the exact USDA cut — confirm]`
3. Egg, whole, large (per egg = 50 g)
4. Egg whites, liquid, from a carton
5. Salmon, Atlantic, farmed, cooked `[guess at type — confirm]`
6. Tuna, light, canned in water, drained
7. Jasmine rice, cooked
8. Sweet potato, baked
Brand staples GG will add with their labels (he supplies the numbers): Members Mark chicken breast, Happy Day unflavored whey, Quaker rice cakes, Quest bar, Barebells bar, Great Value eggs, Fage nonfat Greek yogurt, Elev8 cream of rice.
Note for GG: cooked chicken breast is ~165 kcal / 31 g protein per 100 g, so 300 g logs as ~495 kcal, not the 330 kcal of raw-weight math.
Slice 2 note: the USDA site was not reachable from the build session, so the preloaded values in `js/data/foods-preload.js` are SR Legacy numbers typed from Claude's memory, marked "approx — check" in each food's source line (USDA id included). GG can correct any number in the food's EDIT form. Jasmine rice uses the white long-grain cooked line (USDA has no jasmine line); shoulder steak uses the chuck shoulder clod top/center steak, lean only, grilled line. Iodine, chromium, molybdenum and biotin are blank (USDA lists none for these foods). No raw chicken entry.

### 4.5 Data model (IndexedDB stores) — confirmed by GG 2026-11-03, built in slice 2 (`js/db.js`, database `steelprep` v1)
`settings` — one record per key `{key, value}`: compDate, targets {nutrientKey: {target, min, max}}, caffeineCutoff "13:00", dayRollover "00:00", units "imperial", lastBackup, lastReport. Slice 1's tape / muscle / history also live here until slice 4 reshapes them.
`foods` {id, name, brand, type food|supplement, barcode, per100g {kcal, protein, carbs, fat, fiber, + the 27 micros by key}, servingG, isLiquid, useCount, lastUsed, source} — indexes on barcode and name
`foodLog` {id, ts, day "YYYY-MM-DD", foodId, foodName, foodType, servingG, amount, unit, grams, snapshot{nutrients for these grams}} — index on day
`waterLog` {id, ts, day, floz} · `caffeineSources` {id, name, mg} · `caffeineLog` {id, ts, day, sourceId, name, mg} — logs indexed on day
`measurements` {v, ts, set relaxed|flexed, values{site: n | {R, L}}} · `muscleTune` {group: 0–100} — created empty, filled in slice 4
`weights` {date, lb} · `scans` {date, weightLb, smmLb, ffmLb, bodyFatPct, bmrKcal} · `photos` {id, ts, pose, blob, w, h} — created empty, filled in slice 4
`meta` {key, value}: schemaVersion, migrated (slice-1 localStorage copied in), seeded (preloaded foods + caffeine sources written once)

---

## 5. Build order

Each slice is a branch (`slice-N-name`, or the `claude/…` name Claude Code assigns), merged only when the menu and Body still work. Slices 1 and 2 are done. Slice 7 was started 2026-11-03 at GG's request, ahead of 3–6, on the same branch as slice 2 (this session is pinned to one branch).

1. **Shell (done):** menu, countdown, date, analog clock, 7-card drum, under-construction cards, Body HUD with placeholder mannequin, HOLO/SOLID, RELAXED/FLEXED, SAVE → versions (browser storage for now), Nutrients frame.
2. **Nutrients (done 2026-11-03):** bars, targets, catalog with preloaded foods, add/edit food (barcode number typed), daily log with date picker, water and caffeine quick-adds, red rule, day rollover. IndexedDB layer built here; slice 1's browser-storage keys migrated into it. Files moved to the repo root and split into `css/` + `js/`.
3. **Barcode scanner:** camera via the browser's BarcodeDetector (Android Chrome) with a vendored fallback library; known barcode → log the food; unknown → new-food form with the number filled in. Needs the https GitHub Pages link to test.
4. **Body data:** measurements, weights (7-day average), scans, photos in IndexedDB; HISTORY shows a version on the model; BMI/BMR from stored data.
5. **Install:** `manifest.webmanifest` (standalone, landscape, icons), service worker caching every asset, in-app "Add to Home screen" hint, About line with licenses.
6. **Backup / restore + Claude report** (§3.7, §3.8).
7. **3D model (first version done 2026-11-03):** `tools/blender-export.py` run by a local Claude Code session on GG's Windows PC (Blender 5.2.1) → `assets/body.glb` (1,738 meshes, 261K triangles, 5.4 MB) → `js/glb.js` reads it, `js/data/muscle-map.js` picks the 468 muscle meshes and their drivers, `js/body.js` merges them into one mesh, inflates along normals from TAPE + MUSCLE, HOLO (hologram shader) / SOLID, credit line in the HUD. Still to come: T-pose (needs a rig), pec height / wrist / ankle (shape keys), per-muscle polish.
8. **Pro review:** LOAD SAMPLE DATA, empty states, polish, first-run hints.
9. **Workouts shell (done 2026-11-05, GG's pick after the model):** §3.11 — flashcard splits, weekly planner, day sheet with plan / workout / completed modes, prompts, notes. FORM TRACKING tab waits for GG's spec.
Later, when GG specs them: Goals, Progress, Misc., Settings, Form tracking.

---

## 6. Current state — what is in the repo

The app lives at the repo root (moved out of `steel-prep-starter-kit/` in slice 2), so the GitHub Pages link is the plain repo address. Plain files, no build step; the page is loaded over http (ES modules do not load from file://).

- `index.html` — markup only: the three `<section class="screen">` blocks (MENU, NUTRIENTS, BODY), the Body drawers, the Nutrients sheets (catalog, amount, food form, targets, water, caffeine), scrim and toast. Loads `css/lcd-fonts.css`, `css/app.css` and `js/app.js`.
- `css/app.css` — all styles. Sizes scale with screen height (`vh`-based `clamp()` variables) so a 400-px-tall phone and a desktop both fit. Brushed steel is `--steel-grad`; the nutrient bar track is `--steel-dark`; bar height `--nbar-h`. Portrait fallback rules at the end.
- `css/lcd-fonts.css` — DSEG7 / DSEG14 embedded as base64 (unchanged from slice 1).
- `js/app.js` — boot: opens the database, then starts menu, Body and Nutrients, each guarded so one failure cannot take the others down.
- `js/ui.js` — shared helpers (`$`, `lcd()`, `lcdw()`, `toast()`, `esc()`, day keys `dayKey/todayKey/shiftDay/fmtDay/fmtTime`), screen switching `go()` with per-screen `onOpen()` hooks, sheets (`openSheet`/`closeSheets`), `[data-go]`/`[data-close]` wiring, Escape (closes a sheet first, then goes to the menu).
- `js/db.js` — IndexedDB layer: database `steelprep` v2 (v2 added `workoutSplits` and `workoutSessions`; raising VERSION makes the browser call `onupgradeneeded`, which creates any missing store) with the §4.5 stores; promise API `get / all / byIndex / put / del` (`put` resolves to the record's key); settings cached in memory (`db.setting` / `db.setSetting`, plus the slice-1 `store.get/set` names); one-time migration of slice 1's `localStorage` keys (originals left in place as a safety copy); memory-only fallback with a toast when IndexedDB is unavailable.
- `js/menu.js` — slice-1 menu code (countdown, date, clock, drum math: N cards, `STEP = 360/N`, radius `R = (cardW/2 + gap) / tan(π/N)`, `backface-visibility` hides cards facing away) wrapped in `initMenu()`; keyboard ← → Enter.
- `js/body.js` — slice-1 Body code (readouts, SVG rings, proportion editor `SITES`/`LENGTHS`/`GROUPS`, drawers) wrapped in `initBody()`; still saves tape / muscle / history through the settings store (slice 4 moves them into `measurements` etc.). Slice 7 added the Z-Anatomy model: `loadModel()` fetches `assets/body.glb`, keeps the meshes listed in `muscle-map.js`, applies each node's world matrix, scales the figure to 5'11" with feet at y=0, detects inside-out meshes (normals mostly pointing at the centroid) and flips their normals and winding, merges everything into one `BufferGeometry` and remembers the resting positions/normals. `drivers()` turns the editor's values into amounts: tape = (girth − Oct 26 baseline) × 0.0254 / 2π metres along the normal, 1:1, no cap; MUSCLE = (v − 50)/50 × 12% of the muscle's thickness; leg length and wingspan = stretch factors from the hip / shoulder line. `applyShape()` rebuilds the live positions on every slider change (then `computeVertexNormals`). The mannequin (`rebuild()`) stays as the fallback when the file cannot load (e.g. opened from a folder). T-pose is declined with a toast until there is a rig. `window.steelprepModel()` is a debug hook for the headless checks.
- `js/glb.js` — a small GLB reader (header, JSON chunk, binary chunk, accessors → typed arrays, node world matrices from translation/rotation/scale or `matrix`). Enough for our own export; no GLTFLoader vendored.
- `js/data/muscle-map.js` — GENERATED by `tools/make-muscle-map.py` from `assets/body-manifest.json`: 468 entries `{n: node name, s: L/R/C, g: {driver: weight}}` covering the tape sites, `leglen`/`wingspan` stretch sets and the 20 MUSCLE groups. Only the "4: Muscular system" collection, minus `.j/.g/.ol/.or` objects, fascia, bursae, sheaths, retinacula, ligaments. Re-run the generator (python3, in the cloud) after any mapping change; GG never needs to.
- `js/workouts.js` — the Workouts screen (§3.11): `PRESETS` and `seed()` (six splits, once, `meta.workoutsSeeded`), the flashcard deck (`renderDeck()`, `setFront()`, swipe / tap-to-flip on `#deck`), the week (`loadWeek()` reads the seven sessions, `renderWeek()` draws the columns; `mondayOf()`), the day sheet (`openDay()`, `renderDay()` in plan / workout / done mode, `addMovement()`, `startWorkout()` with `lastWeight()` pre-fill, `markCompleted()` → `ask()` panels → `finish()`, `unmark()`), notes. Plan edits save to `workoutSplits`, everything else to `workoutSessions`.
- `js/nutrients.js` — the Nutrients screen: 34 bars (`buildBars()` once, `updateBars()` on every change), red rule in `updateBars()`, day navigation and midnight rollover (`checkMidnight()` every 15 s), catalog (most-used first, search, barcode lookup), amount sheet (also edits any entry; edits rescale the row's snapshot), food form (per 100 g or per serving, `switchBasis()`), targets editor (`linkTargets()` moves min/max along with a target while they still follow the rule), water and caffeine quick-adds, caffeine sources editor.
- `js/data/nutrient-defs.js` — the 34 bars with units, default targets, bands and ULs; `derive()` holds the band rule (calories ±5%, micros min = target).
- `js/data/foods-preload.js` — the 8 USDA foods (approx, see §4.4) and the two caffeine sources; seeded once (`meta.seeded`).
- `vendor/three.module.min.js` — three.js 0.160 (MIT).
- `fonts/` — Rajdhani 500/600/700 woff2 (OFL) + license texts (DSEG license text too).
- `tools/blender-export.py` — the slice-7 Blender script, run on GG's PC by a local Claude Code session (Blender 5.2.1): picks the muscles, switches Z-Anatomy's 1,249 Subdivision Surface modifiers off in memory (they crash Blender 5.2), can open the file itself (`blender.exe -b -P tools/blender-export.py -- "<Startup.blend>"` or `BLEND_FILE`), trims and exports. `tools/BLENDER-STEPS.md` — steps for GG. `tools/make-muscle-map.py` — generates `js/data/muscle-map.js` (see above).
- `assets/body.glb` (1,738 meshes, 261,092 triangles, 5.4 MB; the app uses 468 of the meshes, 122K triangles), `assets/body-manifest.json`, `assets/names.txt`, `assets/report.txt` — from the 2026-11-03 run on `Startup.blend` (Z-Anatomy 2023). `assets/LICENSE-Z-Anatomy.md` — CC BY-SA 4.0 notice.
- `README.md` — how to open and deploy.
- Reference docs (GG's, in Claude): "Tracker app handoff" and "Bodybuilding prep research". Ask GG to paste a section when needed; do not assume their contents beyond §4.

---

## 7. Working agreement for every session

1. Read this file. Restate the slice plan in plain English with `[guesses]` and wait for **go**.
2. Keep the site static and dependency-free. Splitting `index.html` into `css/`, `js/` files is fine when it helps; never add a build step.
3. Verify before handing over: if Playwright/Chromium is available in the environment, serve the folder over http, load the page headless in landscape (915×412 and 1280×720), click through the slice, and check the console for errors; otherwise explain what could not be verified. Always give GG a short manual test list for his phone.
4. Hand over: files changed, how to test, one next step. Update §6 (current state) and §8 (decisions log) in this file in the same branch.
5. Commit messages in plain English ("Nutrients: white 3D bars with red out-of-range state").

---

## 8. Decisions log

- 2026-10-30 — Spec locked as in §3 after a 37-question review with GG. Build moved from chat to Claude Code (cloud) with this repo; Blender work stays on GG's personal PC.
- 2026-10-30 — Somatotype/"Build" removed ("outdated"). Digital clock removed; analog red clock added. MISC. and SETTINGS cards added (under construction).
- 2026-11-03 — Slice 2 built on GG's "go" with the proposed defaults: app files moved from `steel-prep-starter-kit/` to the repo root; `index.html` split into `css/` + `js/` modules; Nutrients layout = bars left, day log right; food form takes label values per serving or per 100 g; magnesium / niacin / folate ULs count supplements only; vitamin D in µg; §4.5 data model confirmed with per-key settings records and a `day` field on log rows. The USDA site was unreachable from the build session, so preloaded values were typed from memory and marked "approx — check". Branch `claude/fervent-clarke-1kv553` is Claude Code's name for slice-2-nutrients.
- 2026-11-03 — GG asked for the Z-Anatomy model next (slice 7 ahead of 3–6) and chose Route A: he runs Claude's Blender script on his PC and uploads the result; the cloud session cannot see his computer. Approved: muscles only (no skeleton), ~150K triangles, the site→muscle table in §3.5, inflation 1:1 with **no cap**, A-pose first. The USDA-style "cloud does it all" route was dropped because other GitHub repos and the Z-Anatomy site are unreachable from the sandbox.
- 2026-11-03 — Model wired in. GG's PC is Windows with Blender 5.2.1; a local Claude Code session ran the export (and patched the script for two Blender 5.2 crashes) and pushed `assets/` plus PR #1. The export came out at 261K triangles rather than 150K (the per-muscle floor and base-mesh ratio); kept, since the app uses 122K of them and the file is 5.4 MB. Muscle grouping lives in `js/data/muscle-map.js`; the app reads the GLB with its own reader. Two fixes found by the headless checks: some Z-Anatomy meshes are inside out (10 flipped at load), and with fresh data the editor's values were the same object as the Oct 26 baseline, so sliders moved the baseline too (now a copy). The claude.ai preview loads three.js from a CDN stand-in because the vendored 670 KB file could not be read in full there; the repo and Pages use the vendored copy.
- 2026-11-05 — GG confirmed the model on his phone ("up and running, bug fixes later") and specced Workouts (§3.11); built as slice 9 on the same branch. Decisions: flashcard deck instead of a drum; presets label days only; weight appears only once a workout is started and is pre-filled from the last session with that movement name; notes are text rows; the second tab is FORM TRACKING (construction sign, his next "main star"). Database bumped to v2. Two things the headless run caught: a reused header class carried a Nutrients grid-area name (the header landed at the bottom), and the app had no `[hidden]{display:none!important}` rule, so a pane with a display rule ignored `hidden` (added globally).

## 9. Open questions to raise with GG when they become relevant
- Model polish after GG has seen it on his phone: camera framing, HOLO brightness, which deep muscles to hide, whether the hands/feet/face should stay, and the first hand-sculpted shape keys (pec height).
- Preloaded USDA numbers: GG to spot-check against fdc.nal.usda.gov (the id is in each food's source line) and fix in the EDIT form; confirm the shoulder steak and salmon cuts used (§4.4). Raw chicken entry: not added unless GG asks.
- GitHub Pages: confirm it serves `main` from the repo root, so the link is `https://darkmuffinman.github.io/Steel-Prep/`. A slice branch only reaches the phone once merged into main (or Pages is pointed at the branch).
- FORM TRACKING (inside Workouts): what GG means by it, and his "more context" on Workouts (he said there is more).
- Contents of Goals, Progress, Misc., Settings.
- Where the LOAD SAMPLE DATA button lives (Settings is under construction).
