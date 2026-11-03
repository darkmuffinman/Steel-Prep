# Steel Prep — builds js/data/muscle-map.js from assets/body-manifest.json (slice 7)
#
# The app never reads the manifest (it is 1 MB); it reads the small file this script writes:
# one line per muscle mesh in body.glb with its side and the drivers that move it
# (CLAUDE.md §3.5 site→muscle table, approved by GG 2026-11-03). Claude runs this in the
# cloud whenever the mapping changes; GG never needs to.
#
#   python3 tools/make-muscle-map.py
import json, re, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
manifest = json.load(open(os.path.join(ROOT, "assets", "body-manifest.json"), encoding="utf-8"))

# what is a muscle: only the "4: Muscular system" collection, minus joined/group/insertion objects
# and minus fascia, bursae, sheaths, retinacula, ligaments and the like
SKIP_SUFFIX = re.compile(r"\.(j|oj|ol|or|g)(\.\d+)?$")
NOT_MUSCLE = re.compile(r"ligament|tract\b|fascia\b|bursa|retinacul|sheath|aponeuro|septum|membrane|linea alba|"
                        r"raphe|canal\b|ring\b|tunnel|band\b|insertion|arch\b|hiatus|foramen|tarsus|trochlea", re.I)

def side_of(rec):
    n = rec["name"]
    if re.search(r"\.l(\.\d+)?$", n): return "L"
    if re.search(r"\.r(\.\d+)?$", n): return "R"
    x = rec["centroid"][0]
    return "L" if x > 0.01 else "R" if x < -0.01 else "C"

def base_name(n):
    n = re.sub(r"\.(l|r)(\.\d+)?$", "", n)
    n = re.sub(r"\.\d+$", "", n)
    return n.strip("() ").lower()

# ---------- the mapping: (pattern on the lowercase base name, driver key, weight) ----------
# tape sites: shoulders chest waist hips neck (whole body) · bicep triceps forearm quad calf (per side)
# lengths: leglen wingspan (per side: which parts stretch) · MUSCLE groups: the 20 names from the editor
DELT_FRONT, DELT_SIDE, DELT_REAR = r"clavicular part of deltoid", r"acromial part of deltoid", r"scapular spinal part of deltoid"
TRAP_UP, TRAP_MID, TRAP_LOW = r"descending part of trapezius", r"transverse part of trapezius", r"ascending part of trapezius"
PEC_MAJOR = r"pectoralis major"
BICEPS = r"head of biceps brachii"
TRICEPS = r"head of triceps brachii"
HAMS = r"head of biceps femoris|^semitendinosus|^semimembranosus"
ADDUCTORS = r"^adductor (magnus|longus|brevis|minimus)|^gracilis|^pectineus"
QUADS = r"^rectus femoris|^vastus (lateralis|medialis|intermedius)"
GASTROC = r"head of gastrocnemius"
FOREARM = (r"^brachioradialis|extensor carpi radialis|^extensor digitorum$|^extensor digiti minimi$|extensor carpi ulnaris|"
           r"^supinator|^abductor pollicis longus|^extensor pollicis (longus|brevis)|^extensor indicis|^flexor carpi radialis|"
           r"^palmaris longus|flexor carpi ulnaris|flexor digitorum superficialis|^flexor digitorum profundus|^flexor pollicis longus|"
           r"pronator teres|^pronator quadratus")
HAND = (r"of hand|^opponens pollicis|^abductor pollicis brevis|flexor pollicis brevis|adductor pollicis|^palmar interossei")
LOWER_LEG = (r"^tibialis anterior|^fibularis (longus|brevis|tertius)|^extensor digitorum longus|^extensor hallucis longus|"
             r"^flexor digitorum longus|^flexor hallucis longus|^tibialis posterior|^popliteus")
FOOT = (r"of foot|hallucis|^quadratus plantae|^plantar interossei|^extensor digitorum brevis|^flexor digitorum brevis|"
        r"^tendon of extensor digitorum longus|^calcaneal tendon")
NECK = r"^sternocleidomastoid|^scalenus|^splenius|^levator scapulae|^longus (colli|capitis)"
NECK_HALF = r"^platysma|^omohyoid|^sternohyoid|^sternothyroid|^thyrohyoid"
ERECTORS_T = r"^iliocostalis thoracis|^longissimus thoracis|^spinalis thoracis"
ERECTORS_L = r"^iliocostalis lumborum|^multifidus lumborum|^quadratus lumborum"

RULES = [
    # --- tape sites ---
    (DELT_FRONT, "shoulders", 1), (DELT_SIDE, "shoulders", 1), (DELT_REAR, "shoulders", 1), (TRAP_UP, "shoulders", .25),
    (PEC_MAJOR, "chest", 1), (r"^pectoralis minor", "chest", 1), (r"^latissimus dorsi", "chest", 1), (r"^teres major", "chest", 1),
    (r"^serratus anterior", "chest", 1), (TRAP_MID, "chest", 1), (r"^rhomboid", "chest", 1), (ERECTORS_T, "chest", 1),
    (r"^rectus abdominis|^pyramidalis", "waist", 1), (r"abdominal oblique", "waist", 1), (r"^transversus abdominis", "waist", .5),
    (ERECTORS_L, "waist", 1), (r"^longissimus thoracis", "waist", .5),
    (r"^gluteus (maximus|medius|minimus)", "hips", 1), (r"^tensor fasciae latae", "hips", 1),
    (NECK, "neck", 1), (TRAP_UP, "neck", 1), (NECK_HALF, "neck", .5),
    (BICEPS, "bicep", 1), (r"^brachialis", "bicep", 1), (r"^coracobrachialis", "bicep", 1),
    (TRICEPS, "triceps", 1), (r"^anconeus", "triceps", 1),
    (FOREARM, "forearm", 1),
    (QUADS, "quad", 1), (HAMS, "quad", .5), (ADDUCTORS, "quad", .5), (r"^sartorius", "quad", .5),
    (GASTROC, "calf", 1), (r"^soleus", "calf", 1), (r"^plantaris", "calf", 1), (r"^calcaneal tendon", "calf", 1), (LOWER_LEG, "calf", .5),
    # --- lengths: which parts stretch ---
    (QUADS + "|" + HAMS + "|" + ADDUCTORS + "|^sartorius|" + GASTROC + "|^soleus|^plantaris|" + LOWER_LEG + "|" + FOOT, "leglen", 1),
    (BICEPS + "|^brachialis|^coracobrachialis|" + TRICEPS + "|^anconeus|" + FOREARM + "|" + HAND, "wingspan", 1),
    # --- MUSCLE groups (the editor's 20 names) ---
    (NECK, "NECK", 1), (NECK_HALF, "NECK", .5),
    (TRAP_UP, "TRAPS", 1), (TRAP_MID, "TRAPS", 1), (TRAP_LOW, "TRAPS", 1),
    (DELT_FRONT, "FRONT DELTS", 1), (DELT_SIDE, "SIDE DELTS", 1), (DELT_REAR, "REAR DELTS", 1),
    (PEC_MAJOR, "CHEST", 1), (r"^pectoralis minor", "CHEST", 1), (r"^subclavius", "CHEST", .5),
    (r"^latissimus dorsi", "LATS", 1), (r"^teres major", "LATS", 1),
    (r"^rhomboid", "UPPER BACK", 1), (r"^infraspinatus", "UPPER BACK", 1), (r"^teres minor", "UPPER BACK", 1), (r"^supraspinatus", "UPPER BACK", .5),
    (ERECTORS_T, "LOWER BACK", 1), (ERECTORS_L, "LOWER BACK", 1), (r"^multifidus thoracis", "LOWER BACK", 1), (r"^serratus posterior inferior", "LOWER BACK", .5),
    (r"^serratus anterior", "SERRATUS", 1),
    (r"^rectus abdominis|^pyramidalis", "ABS", 1),
    (r"abdominal oblique", "OBLIQUES", 1),
    (BICEPS, "BICEPS", 1), (r"^brachialis", "BICEPS", .5),
    (TRICEPS, "TRICEPS", 1), (r"^anconeus", "TRICEPS", .5),
    (FOREARM, "FOREARMS", 1),
    (r"^gluteus (maximus|medius|minimus)", "GLUTES", 1), (r"^tensor fasciae latae", "GLUTES", .5),
    (QUADS, "QUADS", 1),
    (HAMS, "HAMSTRINGS", 1),
    (ADDUCTORS, "ADDUCTORS", 1),
    (GASTROC, "CALVES", 1), (r"^soleus", "CALVES", 1), (r"^plantaris", "CALVES", .5), (r"^calcaneal tendon", "CALVES", .5),
]
RULES = [(re.compile(p), key, w) for p, key, w in RULES]

out, stats, unmatched = [], collections.Counter(), []
for rec in manifest["meshes"]:
    name = rec["name"]
    if not rec["collection"].split(" | ")[0].startswith("Scene Collection/4:"): continue
    if SKIP_SUFFIX.search(name) or rec["trianglesAfter"] == 0: continue
    base = base_name(name)
    if NOT_MUSCLE.search(base) and "tensor fasciae latae" not in base: continue
    g = {}
    for pat, key, w in RULES:
        if pat.search(base): g[key] = max(g.get(key, 0), w)
    out.append({"n": name, "s": side_of(rec), "g": g})
    for key in g: stats[key] += 1
    if not g and rec["trianglesAfter"] >= 300: unmatched.append((rec["trianglesAfter"], name))

lines = ["/* GENERATED by tools/make-muscle-map.py from assets/body-manifest.json — do not edit by hand.",
         "   One entry per muscle mesh in assets/body.glb: n = node name, s = side (L/R/C),",
         "   g = drivers and weights: tape sites, leglen/wingspan sets, and the 20 MUSCLE groups. */",
         "export const MUSCLES=["]
for m in out:
    gs = ",".join(f"{json.dumps(k)}:{w:g}" for k, w in m["g"].items())
    lines.append(f'{{n:{json.dumps(m["n"])},s:"{m["s"]}",g:{{{gs}}}}},')
lines.append("];")
open(os.path.join(ROOT, "js", "data", "muscle-map.js"), "w", encoding="utf-8").write("\n".join(lines) + "\n")

print(f"{len(out)} muscle meshes written to js/data/muscle-map.js")
for key, n in sorted(stats.items(), key=lambda kv: kv[0]): print(f"  {n:4d}  {key}")
print("sizeable meshes with no driver (they render but never move):")
for t, n in sorted(unmatched, reverse=True)[:40]: print(f"  {t:5d}  {n}")
