"""Geliştirme aracı: slides/*.html parçalarını, js/circuits ve js/demos betiklerini ve
css/demos-*.css stillerini index.html'deki işaretlerin arasına sırayla yerleştirir.
Kullanım: python3 tools/assemble.py"""
import glob, os, re
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
os.chdir(root)
s = open("index.html", encoding="utf-8").read()
v = re.search(r'\?v=(\d+)"', s).group(1)

def put(name, body):
    global s
    a, b = f"<!--{name}:BAŞ-->", f"<!--{name}:SON-->"
    i, j = s.index(a) + len(a), s.index(b)
    s = s[:i] + "\n" + body + ("\n" if body else "") + s[j:]

slides = "\n".join(open(f, encoding="utf-8").read().strip() + "\n" for f in sorted(glob.glob("slides/*.html")))
put("SLAYTLAR", slides)
js = [f for f in sorted(glob.glob("js/circuits/*.js"))] + [f for f in sorted(glob.glob("js/demos/*.js"))]
put("BETİKLER", "\n".join(f'<script src="{f}?v={v}"></script>' for f in js))
css = sorted(glob.glob("css/demos-*.css"))
put("STİLLER", "\n".join(f'<link rel="stylesheet" href="{f}?v={v}">' for f in css))
open("index.html", "w", encoding="utf-8").write(s)

# sözlük: tools/terms-*.json → js/glossary.js (aynı başlıklı terimler birleştirilir)
import json
terms, byt = [], {}
for f in sorted(glob.glob("tools/terms-*.json")):
    try:
        arr = json.load(open(f, encoding="utf-8"))
    except Exception as e:
        print("Sözlük okunamadı:", f, e); continue
    for t in arr:
        key = t["t"].lower()
        if key in byt:
            old = byt[key]
            old["k"] += [k for k in t["k"] if k not in old["k"]]
            if "only" in old and "only" in t: old["only"] += [x for x in t["only"] if x not in old["only"]]
            elif "only" in old: del old["only"]
            continue
        byt[key] = dict(t); terms.append(byt[key])
g = open("js/glossary.js", encoding="utf-8").read()
a, b = "/*TERİMLER:BAŞ*/", "/*TERİMLER:SON*/"
body = "\n".join("    " + json.dumps(t, ensure_ascii=False) + "," for t in terms)
g = g[: g.index(a) + len(a)] + "\n" + body + "\n    " + g[g.index(b):]
open("js/glossary.js", "w", encoding="utf-8").write(g)
print(f"{len(terms)} sözlük terimi")
print(f"{slides.count('<section')} slayt, {len(js)} betik, {len(css)} stil")
