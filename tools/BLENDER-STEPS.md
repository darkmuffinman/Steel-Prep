# Exporting the Z-Anatomy muscles for Steel Prep (slice 7)

Nothing to install: Blender is already on your PC. The script does not change your Z-Anatomy file; it only writes four new files next to it.

## 1. Get the script onto your PC
1. On github.com open this repo, then the `tools` folder, then `blender-export.py`.
2. Click the **Download raw file** button (top right of the file view, the arrow-into-tray icon). Save it in the same folder as your Z-Anatomy file.

## 2. Run it in Blender
1. Open Blender. **File → Open** → your Z-Anatomy `.blend` file.
   If what you downloaded is a `.glb`, `.gltf`, `.fbx` or `.obj` instead: **File → New → General**, then **File → Import** → pick that file.
2. Click the **Scripting** tab (the row of workspace tabs along the top, far right).
3. In the big text editor in the middle: **Text → Open** → pick `blender-export.py`.
4. Press the **▶ Run Script** button at the top of that editor (or Alt+P).
5. Wait. Blender may say "Not Responding"; leave it alone. Ten minutes to an hour is normal for the full Z-Anatomy file. To watch the log: **Window → Toggle System Console**.
6. When it finishes, close Blender and choose **Don't Save**.

### If Blender 5.2 crashes while opening the Z-Anatomy file
Z-Anatomy's insertion patches carry Subdivision Surface modifiers that crash Blender 5.2. The script sidesteps this when it opens the file itself: either put the path of `Startup.blend` in `BLEND_FILE` near the top of the script and run it from an empty Blender, or run it from a terminal with no window at all (note the `--`):

```
blender.exe -b -P blender-export.py -- "C:\path\to\Startup.blend"
```

A separate Blender 5.2 bug still ends about one run in three within seconds; just run it again. A good run ends with `DONE.` in `report.txt`.

## 3. What it writes
Next to the `.blend` file (or on your Desktop if the file was never saved):
- `body.glb` — the muscles, trimmed to about 150,000 triangles, a few MB
- `body-manifest.json` — what each exported mesh is and where it sits
- `names.txt` — every object in the file, so Claude can fix the muscle mapping without another run
- `report.txt` — the log; if anything went wrong, the error is at the bottom

If `body.glb` is over 15 MB, open `blender-export.py`, lower `TARGET_TRIANGLES` at the top, and run again.

## 4. Upload the four files to the repo
1. On github.com open the repo. In the branch dropdown (top left, says `main`), pick the branch Claude is working on, or `main` if you have merged it.
2. Open the `assets` folder.
3. **Add file → Upload files**, drag the four files in, then press the green **Commit changes** button at the bottom.
4. Tell Claude the files are up. The website accepts files up to 25 MB each.
