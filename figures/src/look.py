"""look.py <name> <ax,ay> <ex,ey>  — assemble, shoot a sheet, and run the text checks headless Chrome can do."""
import sys, re, subprocess, pathlib, html
name, at, edge = sys.argv[1], sys.argv[2], sys.argv[3]
here = pathlib.Path(__file__).parent.resolve()
page = here / f"hairline-{name}.html"
subprocess.run([sys.executable, str(here / "asm.py"), str(here / f"{name}.js"), str(page)], check=True, capture_output=True)
C = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
base = page.as_uri()
shots = [("rest", ""), ("answer", f"?at={at}"), ("small", "?w=240"), ("small-answer", f"?w=240&at={at}"),
         ("low", f"?intensity=0&at={edge}"), ("high", f"?intensity=1&at={edge}"), ("dark", f"?theme=dark&at={at}"), ("light", f"?theme=light&at={at}")]
fail = False
for label, q in shots:
    r = subprocess.run([C, "--headless=new", "--disable-gpu", "--enable-logging=stderr", "--v=0", "--window-size=800,900",
                        "--virtual-time-budget=4000", "--dump-dom", base + q], capture_output=True, text=True)
    dom = r.stdout
    cons = [l for l in r.stderr.splitlines() if "CONSOLE" in l]
    readv = re.search(r'id="read">([^<]*)<', dom)
    err = re.search(r'<p id="error" role="alert"( hidden="")?>([^<]*)<', dom)
    svg = re.search(r"<svg viewBox=\"0 0 400 320\".*?</svg>", dom, re.S)
    nums = []
    if svg:
        for d in re.findall(r' d="([^"]*)"', svg.group(0)):
            v = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?(?:e-?\d+)?", d)]
            nums += list(zip(v[0::2], v[1::2]))
        for cx, cy in re.findall(r'cx="([-\d.]+)" cy="([-\d.]+)"', svg.group(0)):
            nums.append((float(cx), float(cy)))
    box = (min(p[0] for p in nums), min(p[1] for p in nums), max(p[0] for p in nums), max(p[1] for p in nums)) if nums else None
    out = box and (box[0] < 1 or box[1] < 1 or box[2] > 399 or box[3] > 319)
    bad = (err and not err.group(1) and err.group(2)) or cons or out or (label == "rest" and (readv and readv.group(1)) != "rest")
    fail |= bool(bad)
    cover = box and (box[2]-box[0])*(box[3]-box[1])/(400*320)
    print(f"{'FAIL' if bad else 'ok  '} {label:13} read={readv and readv.group(1)!r} box={tuple(round(b) for b in box) if box else None} cover={cover and round(cover*100)}% {'ERR '+err.group(2) if err and not err.group(1) else ''} {' | '.join(cons)[:300]}")
cells = "".join(f'<div class="c {"s" if l.startswith("small") or l in ("dark","light") else "b"}"><b>{l} {html.escape(q)}</b><iframe src="{base+q}" scrolling="no"></iframe></div>' for l, q in shots)
sheet = here / "look" / f"{name}-sheet.html"
sheet.write_text(f"""<style>body{{margin:0;font:12px monospace;display:flex;flex-wrap:wrap;gap:6px;width:1500px;background:#ccc}}
.c{{background:#fff}}.c iframe{{border:0;display:block}}.b iframe{{width:690px;height:560px}}.s iframe{{width:340px;height:330px}}</style>{cells}""")
png = here / "look" / f"{name}.png"
subprocess.run([C, "--headless=new", "--disable-gpu", "--window-size=1500,1900", "--virtual-time-budget=6000", f"--screenshot={png}", sheet.as_uri()], capture_output=True)
print(png)
sys.exit(1 if fail else 0)
