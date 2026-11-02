"""Turn the two-page Vite build into an Artifact: one car is the primary page, the other car ships
as a second HTML page beside it, and each links to the other.

    cd apps/hyperion && VITE_MODEL_WRAP=1 npx vite build --outDir <dist>
    python3 qa/artifact_html.py <dist> hyperion   -> <dist>/artifact.html (Hyperion) + f1.html
    python3 qa/artifact_html.py <dist> f1         -> <dist>/artifact.html (F1) + hyperion.html
    and <dist>/files.json, the supporting-file list for the publish.

The publisher wraps the primary page in its own doctype/head/body, so that page loses <html data-*>;
an inline script restores data-car / data-other before the app boots. The secondary page keeps its
full document (it is served as-is) with data-other pointing back at the primary ("./").
"""
import base64, glob, json, os, re, sys

dist = sys.argv[1]
primary = sys.argv[2] if len(sys.argv) > 2 else "hyperion"
PAGES = {"hyperion": "index.html", "f1": "f1.html"}
other = "f1" if primary == "hyperion" else "hyperion"
other_file = "f1.html" if other == "f1" else "hyperion.html"

src = {k: open(os.path.join(dist, v)).read() for k, v in PAGES.items()}

# --- primary page: head tags + body, data attributes restored by an inline script
html = src[primary]
head = re.search(r"<head>(.*)</head>", html, re.S).group(1)
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
keep = []
for tag in re.findall(r"<(?:title|meta|link|script)[^>]*>(?:[^<]*</(?:title|script)>)?", head, re.S):
    if 'charset' in tag or 'name="viewport"' in tag:
        continue  # the publisher's skeleton supplies these
    keep.append(tag.replace('src="./', 'src="').replace('href="./', 'href="').replace(' crossorigin src', ' src').replace(' crossorigin href', ' href'))
title = [t for t in keep if t.startswith("<title")]
rest = [t for t in keep if not t.startswith("<title")]
boot = f'<script>document.documentElement.dataset.car="{primary}";document.documentElement.dataset.other="{other_file}";</script>'
open(os.path.join(dist, "artifact.html"), "w").write("\n".join(title + [boot] + rest) + "\n" + body.strip() + "\n")

# --- secondary page: full document, links back to the primary
sec = re.sub(r'data-other="[^"]*"', 'data-other="./"', src[other])
for k, v in PAGES.items():
    os.remove(os.path.join(dist, v))
open(os.path.join(dist, other_file), "w").write(sec)

# --- artifact hosts do not serve .glb: wrap each model as base64 JSON
for p in glob.glob(os.path.join(dist, "models", "*.glb")):
    with open(p[:-4] + ".glb.b64.json", "w") as f:
        json.dump({"glb": base64.b64encode(open(p, "rb").read()).decode()}, f)
    os.remove(p)

files = []
for root, _, fs in os.walk(dist):
    for f in fs:
        rel = os.path.relpath(os.path.join(root, f), dist)
        if rel not in ("artifact.html", "files.json"):
            files.append({"path": rel})
json.dump(files, open(os.path.join(dist, "files.json"), "w"))
size = sum(os.path.getsize(os.path.join(dist, f["path"])) for f in files)
big = max(os.path.getsize(os.path.join(dist, f["path"])) for f in files)
print(f"{len(files)} files, {size / 1e6:.1f} MB, largest {big / 1e6:.1f} MB; primary {primary}, second page {other_file}")
