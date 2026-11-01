"""Turn a Vite dist/index.html into an Artifact page (the publisher adds doctype/head/body itself).
    python3 qa/artifact_html.py apps/hyperion/dist [car]  ->  dist/artifact.html + prints the files map
Build first with VITE_MODEL_WRAP=1 (and VITE_CAR=<car>). Only that car's models and renders are kept.
"""
import base64, glob, json, os, re, shutil, sys

dist = sys.argv[1]
car = sys.argv[2] if len(sys.argv) > 2 else "f1"
html = open(os.path.join(dist, "index.html")).read()
head = re.search(r"<head>(.*)</head>", html, re.S).group(1)
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
keep = []
for tag in re.findall(r"<(?:title|meta|link|script)[^>]*>(?:[^<]*</(?:title|script)>)?", head, re.S):
    if 'charset' in tag or 'name="viewport"' in tag:
        continue  # the publisher's skeleton supplies these
    keep.append(tag.replace('src="./', 'src="').replace('href="./', 'href="').replace(' crossorigin src', ' src').replace(' crossorigin href', ' href'))
title = [t for t in keep if t.startswith("<title")]
rest = [t for t in keep if not t.startswith("<title")]
open(os.path.join(dist, "artifact.html"), "w").write("\n".join(title + rest) + "\n" + body.strip() + "\n")

# the other car's assets never load in this build
for src in glob.glob(os.path.join(dist, "models", "*.glb")):
    if not os.path.basename(src).startswith(car):
        os.remove(src)
for d in glob.glob(os.path.join(dist, "renders", "*")):
    if os.path.isdir(d) and os.path.basename(d) != car:
        shutil.rmtree(d)

# Artifact hosts do not serve .glb: wrap each model as base64 JSON
for src in glob.glob(os.path.join(dist, "models", "*.glb")):
    with open(src[:-4] + ".glb.b64.json", "w") as f:
        json.dump({"glb": base64.b64encode(open(src, "rb").read()).decode()}, f)
    os.remove(src)

files = {}
for root, _, fs in os.walk(dist):
    for f in fs:
        rel = os.path.relpath(os.path.join(root, f), dist)
        if rel not in ("index.html", "artifact.html"):
            files[rel] = os.path.join(dist, rel)
json.dump(files, open(os.path.join(dist, "files.json"), "w"), indent=0)
print(len(files), "files; map in", os.path.join(dist, "files.json"))
