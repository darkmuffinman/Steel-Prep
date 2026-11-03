# Steel Prep — Z-Anatomy export for the Body tab (slice 7)
#
# WHAT THIS DOES
#   Finds every muscle in the open Z-Anatomy file, trims it down to a phone-friendly
#   size (about 150,000 triangles in total) and writes one model file plus three
#   small text files that tell Claude what came out. Nothing in your Blender file is
#   saved or changed; the trimming only exists in the exported copy.
#
# HOW TO RUN IT (Blender 3.x, 4.x or 5.x)
#   1. Open the Z-Anatomy file in Blender (File → Open). If what you downloaded is a
#      model file instead (.glb / .gltf / .fbx / .obj), start a new file and use
#      File → Import to bring it in.
#   2. Click the "Scripting" tab at the top of Blender.
#   3. In the text editor in the middle: Text → Open → pick this file → then press
#      the "Run Script" button (the ▶ at the top of that editor) or Alt+P.
#   4. Wait. Blender may say "Not Responding" for a while; that is normal. Ten
#      minutes to an hour is typical for the full Z-Anatomy file.
#   5. Find the four files next to your .blend file (or on your Desktop if the file
#      was never saved): body.glb, body-manifest.json, names.txt, report.txt.
#   6. Close Blender without saving (choose "Don't Save" if it asks): the script
#      only changes the copy it exports, and your original should stay untouched.
#
# Settings you may change are right below. Everything else is the machinery.

TARGET_TRIANGLES = 150_000     # total triangle budget for the exported muscles
MIN_TRIANGLES_PER_MUSCLE = 60  # never trim a small muscle below this
OUTPUT_NAME = "body"           # body.glb / body-manifest.json

import bpy, os, re, json, time, sys, traceback
from mathutils import Vector

# ---------- where the files go, and a report that is written as we go ----------
blend_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else ""
OUT_DIR = blend_dir or os.path.join(os.path.expanduser("~"), "Desktop")
os.makedirs(OUT_DIR, exist_ok=True)
_report = open(os.path.join(OUT_DIR, "report.txt"), "w", encoding="utf-8")
_t0 = time.time()

def log(msg):
    line = f"[{time.time() - _t0:7.1f}s] {msg}"
    print(line)
    _report.write(line + "\n")
    _report.flush()

# ---------- helpers ----------
def tri_count(mesh):
    """Triangles in a mesh, counted from its polygons (works in every Blender version)."""
    return sum(len(p.vertices) - 2 for p in mesh.polygons)

def collection_parents():
    """Map every collection to its parent, so we can print a path like Human/Muscular system/Arm."""
    parent = {}
    for col in bpy.data.collections:
        for child in col.children:
            parent[child.name] = col.name
    for scene in bpy.data.scenes:
        for child in scene.collection.children:
            parent[child.name] = scene.collection.name
    return parent

def collection_path(obj, parents):
    paths = []
    for col in obj.users_collection:
        chain, name, guard = [], col.name, 0
        while name and guard < 50:
            chain.append(name)
            name = parents.get(name)
            guard += 1
        paths.append("/".join(reversed(chain)))
    return " | ".join(paths) if paths else "(no collection)"

def unhide_everything():
    """Collections and objects can be switched off in the outliner; export needs them on."""
    def walk(layer_col):
        layer_col.exclude = False
        layer_col.hide_viewport = False
        for child in layer_col.children:
            walk(child)
    for scene in bpy.data.scenes:
        for vl in scene.view_layers:
            walk(vl.layer_collection)
    for col in bpy.data.collections:
        col.hide_viewport = False
        col.hide_render = False

MUSCLE_COLLECTION = re.compile(r"muscul|muscle", re.I)
MUSCLE_STEMS = re.compile(
    r"deltoid|pectoralis|trapezius|latissimus|rhomboid|teres|infraspinatus|supraspinatus|subscapularis|"
    r"serratus|rectus|obliqu|transvers|erector|iliocostalis|longissimus|spinalis|multifid|quadratus|psoas|"
    r"iliacus|gluteus|tensor fasci|sartorius|vastus|biceps|triceps|brachialis|brachioradialis|coracobrachialis|"
    r"anconeus|flexor|extensor|pronator|supinator|palmaris|adductor|gracilis|pectineus|semitendinosus|"
    r"semimembranosus|gastrocnemius|soleus|plantaris|tibialis|peroneus|fibularis|popliteus|sternocleidomastoid|"
    r"scalen|splenius|levator|platysma|masseter|temporalis|diaphragm|intercostal|obturator|piriformis|gemellus|"
    r"hyoid|longus|abductor|opponens|lumbrical|interosse|subclavius|semispinalis|rotatores|digastric|"
    r"mylohyoid|geniohyoid|buccinator|orbicularis|zygomatic|frontalis|occipitalis|risorius|mentalis|nasalis|"
    r"procerus|corrugator|depressor|pterygoid|stylo|thyro|crico|arytenoid|omohyoid|sternohyoid|sternothyroid|"
    r"iliopsoas|quadriceps|hamstring|muscle",
    re.I)

# ---------- 1. inventory of every mesh in the file ----------
try:
    log(f"Blender {bpy.app.version_string} · file: {bpy.data.filepath or '(unsaved)'} · output folder: {OUT_DIR}")
    parents = collection_parents()
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    log(f"{len(meshes)} mesh objects in the file, {len(bpy.data.collections)} collections")

    with open(os.path.join(OUT_DIR, "names.txt"), "w", encoding="utf-8") as f:
        f.write("# every mesh object in the file: triangles | collection path | name\n")
        for o in sorted(meshes, key=lambda o: o.name.lower()):
            f.write(f"{tri_count(o.data):8d} | {collection_path(o, parents)} | {o.name}\n")
    log("names.txt written")

    # top-level view of the collections, so Claude can see how the file is organised
    top = {}
    for o in meshes:
        root = collection_path(o, parents).split(" | ")[0].split("/")
        key = "/".join(root[:3])
        top[key] = top.get(key, 0) + 1
    for key, n in sorted(top.items(), key=lambda kv: -kv[1])[:40]:
        log(f"  {n:5d} meshes under {key}")

    # ---------- 2. pick the muscles: everything under a muscle collection, plus anything named like one ----------
    by_collection = [o for o in meshes if MUSCLE_COLLECTION.search(collection_path(o, parents))]
    by_name = [o for o in meshes if MUSCLE_STEMS.search(o.name)]
    seen, wanted = set(), []
    for o in by_collection + by_name:
        if o.name not in seen:
            seen.add(o.name)
            wanted.append(o)
    if not wanted:
        raise RuntimeError("No muscles found. Send names.txt and report.txt to Claude.")
    total_before = sum(tri_count(o.data) for o in wanted)
    log(f"{len(wanted)} muscle objects: {len(by_collection)} under a muscle collection, {len(by_name)} by name; "
        f"{total_before:,} triangles before trimming")

    # ---------- 3. make them exportable and add the trimming ----------
    unhide_everything()
    ratio = min(1.0, TARGET_TRIANGLES / max(1, total_before))
    log(f"trim ratio {ratio:.4f} (target {TARGET_TRIANGLES:,} triangles)")
    for o in wanted:
        o.hide_viewport = False
        o.hide_select = False
        try:
            o.hide_set(False)
        except RuntimeError:
            pass                        # not in the current view layer; the collection switch above covers it
        # smooth shading lets neighbouring triangles share corners: about a third of the file size of flat shading
        o.data.polygons.foreach_set("use_smooth", [True] * len(o.data.polygons))
        tris = tri_count(o.data)
        r = max(ratio, MIN_TRIANGLES_PER_MUSCLE / max(1, tris)) if tris > MIN_TRIANGLES_PER_MUSCLE else 1.0
        if r < 1.0:
            mod = o.modifiers.new(name="SteelPrepDecimate", type="DECIMATE")
            mod.decimate_type = "COLLAPSE"
            mod.ratio = r
            mod.use_collapse_triangulate = True
    log("decimate modifiers added (they are applied only in the exported copy)")

    # ---------- 4. manifest: what each exported mesh is, where it sits ----------
    bpy.context.view_layer.update()     # make sure the new modifiers are taken into account
    dg = bpy.context.evaluated_depsgraph_get()
    records, total_after = [], 0
    gmin = Vector((1e9, 1e9, 1e9)); gmax = Vector((-1e9, -1e9, -1e9))
    for o in wanted:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        n_after = tri_count(me)
        total_after += n_after
        mw = o.matrix_world
        if me.vertices:
            pts = [mw @ v.co for v in me.vertices]
            lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
            hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
            c = sum(pts, Vector()) / len(pts)
            gmin = Vector((min(gmin.x, lo.x), min(gmin.y, lo.y), min(gmin.z, lo.z)))
            gmax = Vector((max(gmax.x, hi.x), max(gmax.y, hi.y), max(gmax.z, hi.z)))
        else:
            lo = hi = c = Vector((0, 0, 0))
        ev.to_mesh_clear()
        records.append({
            "name": o.name, "mesh": o.data.name, "collection": collection_path(o, parents),
            "trianglesBefore": tri_count(o.data), "trianglesAfter": n_after,
            "centroid": [round(c.x, 4), round(c.y, 4), round(c.z, 4)],
            "min": [round(lo.x, 4), round(lo.y, 4), round(lo.z, 4)],
            "max": [round(hi.x, 4), round(hi.y, 4), round(hi.z, 4)],
        })
    manifest = {
        "source": os.path.basename(bpy.data.filepath) or "(unsaved scene)",
        "blender": bpy.app.version_string,
        "exported": time.strftime("%Y-%m-%d %H:%M"),
        "license": "Derived from Z-Anatomy (CC BY-SA 4.0), itself derived from BodyParts3D (CC BY-SA 2.1 Japan)",
        "targetTriangles": TARGET_TRIANGLES, "trianglesBefore": total_before, "trianglesAfter": total_after,
        "boundsMin": [round(gmin.x, 4), round(gmin.y, 4), round(gmin.z, 4)],
        "boundsMax": [round(gmax.x, 4), round(gmax.y, 4), round(gmax.z, 4)],
        "upAxisInBlender": "Z", "meshes": records,
    }
    with open(os.path.join(OUT_DIR, f"{OUTPUT_NAME}-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    log(f"manifest written: {len(records)} meshes, {total_after:,} triangles after trimming, "
        f"height in Blender units {gmax.z - gmin.z:.3f}")

    # ---------- 5. export the GLB (model + raw numbers in one file) ----------
    bpy.ops.object.select_all(action="DESELECT")
    for o in wanted:
        o.select_set(True)
    bpy.context.view_layer.objects.active = wanted[0]
    out_path = os.path.join(OUT_DIR, f"{OUTPUT_NAME}.glb")
    full = dict(filepath=out_path, export_format="GLB", use_selection=True, export_apply=True,
                export_normals=True, export_materials="NONE", export_texcoords=False, export_yup=True,
                export_animations=False, export_skins=False, export_morph=False, export_cameras=False,
                export_lights=False, export_extras=False)
    tried = []
    for attempt in (full, {k: full[k] for k in ("filepath", "export_format", "use_selection", "export_apply", "export_materials")},
                    {k: full[k] for k in ("filepath", "export_format", "use_selection", "export_apply")}):
        try:
            bpy.ops.export_scene.gltf(**attempt)
            tried.append("ok")
            break
        except TypeError as e:          # an option this Blender version does not know; try with fewer
            tried.append(str(e)[:120])
    if tried[-1] != "ok":
        raise RuntimeError("GLB export failed: " + " / ".join(tried))
    size_mb = os.path.getsize(out_path) / 1e6
    log(f"body.glb written: {size_mb:.1f} MB")
    if size_mb > 15:
        log("NOTE: over 15 MB. Lower TARGET_TRIANGLES at the top of this script and run again.")

    log("DONE. Upload body.glb, body-manifest.json, names.txt and report.txt to the repo's assets/ folder.")
except Exception:
    log("ERROR:\n" + traceback.format_exc())
    log("Send report.txt and names.txt to Claude.")
finally:
    _report.close()
