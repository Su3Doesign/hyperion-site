"""Turn a Vite dist/index.html into an Artifact page (the publisher adds doctype/head/body itself).
    python3 qa/artifact_html.py apps/hyperion/dist   ->  dist/artifact.html + prints the files map
"""
import json, os, re, sys

dist = sys.argv[1]
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
out = "\n".join(title + rest) + "\n" + body.strip() + "\n"
open(os.path.join(dist, "artifact.html"), "w").write(out)
files = {}
for root, _, fs in os.walk(dist):
    for f in fs:
        rel = os.path.relpath(os.path.join(root, f), dist)
        if rel in ("index.html", "artifact.html"):
            continue
        files[rel] = os.path.join(dist, rel)
print(json.dumps(files, indent=0))
print(len(files), "files")

# Artifact hosts do not serve .glb: wrap each model as base64 JSON (built with VITE_MODEL_WRAP=1)
import base64
for name in ("hyperion", "hyperion-mobile"):
    src = os.path.join(dist, "models", name + ".glb")
    if os.path.exists(src):
        with open(os.path.join(dist, "models", name + ".glb.b64.json"), "w") as f:
            json.dump({"glb": base64.b64encode(open(src, "rb").read()).decode()}, f)
        os.remove(src)
