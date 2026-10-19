"""export.py: for each figure, copy its page to figures/<id>.html and write its rest pose as figures/<id>.svg in the site palette."""
import re, subprocess, pathlib, shutil
here = pathlib.Path(__file__).parent.resolve(); out = here.parent
C = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PLATE, MID, SIL, HI, LO = "#0F1720", "#5E7F99", "#8DB4D3", "#F2A900", "#3A5265"
def style(cls):
    c = set(cls.split())
    if "dot" in c:
        return {"fill": HI if not ({"m", "off"} & c) else (SIL if "m" in c else LO), "stroke": "none"}
    a = {"fill": "none" if "nf" in c else PLATE, "stroke": "none" if "fo" in c else (HI if "hi" in c else SIL if "sil" in c else LO if "lo" in c else MID)}
    if "dash" in c: a["stroke-dasharray"] = "1 3"
    a["vector-effect"] = "non-scaling-stroke"
    return a
for n in ["hero", "factory", "warehouse", "office", "retail", "hospital", "residential", "infra", "solar"]:
    page = here / f"hairline-{n}.html"
    subprocess.run(["python3", str(here / "asm.py"), str(here / f"{n}.js"), str(page)], check=True, capture_output=True)
    dom = subprocess.run([C, "--headless=new", "--disable-gpu", "--window-size=800,900", "--timeout=1500", "--dump-dom", page.as_uri()], capture_output=True, text=True).stdout
    svg = re.search(r'<svg viewBox="0 0 400 320"[^>]*>(.*?)</svg>', dom, re.S).group(1)
    def fix(m):
        tag, attrs = m.group(1), m.group(2)
        cls = re.search(r'class="([^"]*)"', attrs); cls = cls.group(1) if cls else ""
        attrs = re.sub(r'\s*class="[^"]*"', "", attrs)
        return f"<{tag}{attrs} " + " ".join(f'{k}="{v}"' for k, v in style(cls).items()) + ">"
    body = re.sub(r"<(path|ellipse|polygon|line|circle)\b([^>]*)>", fix, svg)
    body = re.sub(r"<g[^>]*>", "<g>", body)
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="100%" aria-hidden="true">'
            '<g stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">')
    (out / f"{n}.svg").write_text(head + body + "</g></svg>\n")
    shutil.copy(page, out / f"{n}.html")
    print(n, (out / f"{n}.svg").stat().st_size, "bytes")
