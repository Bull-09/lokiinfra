#!/usr/bin/env python3
"""Tiny static-site builder for the LKD website.

Each file in src/pages/ starts with a front-matter block:
    ---
    title: About
    description: ...
    nav: about
    ---
The body is wrapped in src/partials/layout.html, and every {{KEY}} is
replaced with values from site.json. Output goes to dist/.

Figures: drop an SVG (or an HTML file containing one, e.g. from
/hairline-create) into figures/ to replace placeholder art:
  - figures/hero.svg replaces the homepage hero drawing
    (the block between <!-- figure:hero --> and <!-- /figure -->).
  - figures/<id>.svg replaces every <svg><use href="assets/art.svg#<id>"/></svg>,
    where <id> is factory, warehouse, office, retail, hospital,
    residential, infra or solar.

Usage:  python3 build.py
"""
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
FIGURES = ROOT / "figures"
NAV_KEYS = ["home", "about", "services", "sectors", "projects", "careers", "contact"]


def parse_page(text):
    match = re.match(r"---\n(.*?)\n---\n", text, re.S)
    meta = {}
    if match:
        for line in match.group(1).splitlines():
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
        text = text[match.end():]
    return meta, text


def fill(template, values):
    return re.sub(r"\{\{(\w+)\}\}", lambda m: str(values.get(m.group(1), m.group(0))), template)


def load_figures():
    figures = {}
    if not FIGURES.exists():
        return figures
    for f in sorted(FIGURES.iterdir()):
        if f.suffix not in (".svg", ".html"):
            continue
        svg = re.search(r"<svg\b.*?</svg>", f.read_text(), re.S)
        if svg:
            figures[f.stem] = svg.group(0)
        else:
            print(f"warning: no <svg> found in {f.name}, skipped")
    return figures


def apply_figures(html, figures):
    def block(m):
        return figures.get(m.group(1), m.group(0))

    def sprite(m):
        fig = figures.get(m.group(2))
        if not fig:
            return m.group(0)
        attrs = m.group(1)  # keep the slot's class so layout CSS still applies
        return re.sub(r"<svg\b", f"<svg{attrs}", fig, count=1)

    html = re.sub(r"<!-- figure:(\w[\w-]*) -->.*?<!-- /figure -->", block, html, flags=re.S)
    return re.sub(r'<svg([^>]*)><use href="assets/art\.svg#([\w-]+)"/></svg>', sprite, html)


CATEGORIES = {
    "industrial": "Industrial", "commercial": "Commercial", "residential": "Residential",
    "infrastructure": "Infrastructure", "public": "Public & Education",
}


def esc(text):
    """HTML-escape data text and use typographic apostrophes."""
    return html.escape(text, quote=True).replace("&#x27;", "’")


def project_pages(config):
    """Build the Projects grid cards and one detail page per entry in src/data/projects.json."""
    data_file = SRC / "data" / "projects.json"
    if not data_file.exists():
        config["PROJECT_CARDS"], config["PROJECT_COUNT"] = "", "0"
        return []
    projects = json.loads(data_file.read_text())
    cards, pages = [], []
    for i, p in enumerate(projects):
        cat = CATEGORIES[p["category"]]
        by_loki = dict(p["facts"]).get("Delivered by") == "LOKI Infra"
        url = f"project-{p['slug']}.html"
        cards.append(
            f'<a class="project reveal" data-cat="{p["category"]}" href="{url}">'
            f'<div class="thumb blueprint-bg"><svg aria-hidden="true"><use href="assets/art.svg#{p["art"]}"/></svg></div>'
            f'<div class="info"><span class="cat mono">{esc(cat)}</span><h3>{esc(p["title"])}</h3><p>{esc(p["card"])}</p>'
            f'<div class="specs"><span>{esc(p["location"].split(",")[0])}</span><span>{"LOKI INFRA" if by_loki else "GROUP PROJECT"}</span></div></div></a>'
        )
        gallery = p.get("gallery", [])
        def fig(g, lazy=True, cls="cs-hero"):
            load = 'loading="lazy"' if lazy else 'fetchpriority="high"'
            return (f'<figure class="{cls} reveal"><img src="assets/projects/{g["src"]}" width="{g["w"]}" height="{g["h"]}" {load} decoding="async" alt="{esc(g["alt"])}">'
                    f'<figcaption>{esc(g["caption"])}</figcaption></figure>')
        visual = fig(gallery[0], lazy=False) if gallery else (
            f'<div class="art-panel blueprint-bg reveal" aria-hidden="true"><svg><use href="assets/art.svg#{p["art"]}"/></svg></div>')
        rest = gallery[1:]
        gallery_html = ("" if not rest else
            '<h2 class="cs-sub reveal">From the site</h2><div class="site-gallery">' + "".join(fig(g, cls="") for g in rest) + "</div>")
        prev, nxt = projects[i - 1], projects[(i + 1) % len(projects)]
        schema = {
            "@context": "https://schema.org", "@type": "Article",
            "headline": f"Project: {p['title']}", "description": p["lead"],
            "url": f"https://{config['DOMAIN']}/project-{p['slug']}",
            "inLanguage": "en-IN", "dateModified": date.today().isoformat(),
            "author": {"@id": f"https://{config['DOMAIN']}/#org"},
            "publisher": {"@id": f"https://{config['DOMAIN']}/#org"},
            "contentLocation": {"@type": "Place", "name": p["location"]},
            "about": [cat, *[s[0] for s in p["scope"]]],
        }
        if gallery:
            schema["image"] = [f"https://{config['DOMAIN']}/assets/projects/{g['src']}" for g in gallery]
        pages.append((url, {
            "TITLE": f"{p['title']} | {cat} Project | LOKI Infra",
            "DESCRIPTION": p["card"],
            "P_TITLE": esc(p["title"]), "P_CATEGORY": esc(cat), "P_CATEGORY_UPPER": esc(cat.upper()),
            "P_LOCATION": esc(p["location"]), "P_LEAD": esc(p["lead"]), "P_VISUAL": visual,
            "P_FACTS": "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in p["facts"]),
            "P_SCOPE": "".join(f'<div class="scope-cell reveal"><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for t, d in p["scope"]),
            "P_HIGHLIGHTS": "".join(f"<li><strong>{esc(t)}.</strong> {esc(d)}</li>" for t, d in p["highlights"]),
            "P_GALLERY": gallery_html,
            "P_PREV_URL": f"project-{prev['slug']}.html", "P_PREV_TITLE": esc(prev["title"]),
            "P_NEXT_URL": f"project-{nxt['slug']}.html", "P_NEXT_TITLE": esc(nxt["title"]),
            "P_SCHEMA": json.dumps(schema, ensure_ascii=False),
        }))
    config["PROJECT_CARDS"] = "\n".join(cards)
    config["PROJECT_COUNT"] = str(len(projects))
    return pages


def build():
    config = json.loads((ROOT / "site.json").read_text())
    config["YEAR"] = date.today().year
    layout = (SRC / "partials" / "layout.html").read_text()
    figures = load_figures()
    if figures:
        print("figures: " + ", ".join(figures))

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(ROOT / "static", DIST)

    # Leave the phone out of structured data until a real number is set (a placeholder would mislead search engines).
    config["TELEPHONE_JSON"] = "" if "X" in config["PHONE"] else f'"telephone": "{config["PHONE"]}",'
    sitemap = []
    project_list = project_pages(config)

    for page in sorted((SRC / "pages").glob("*.html")):
        meta, body = parse_page(page.read_text())
        values = dict(config)
        values["UPDATED"] = meta.get("updated", date.today().isoformat())
        values["TITLE"] = meta.get("title", config["SITE_NAME"])
        values["DESCRIPTION"] = meta.get("description", "")
        values["SLUG"] = "" if page.stem == "index" else page.stem
        values["BODY_CLASS"] = meta.get("body_class", "")
        for key in NAV_KEYS:
            values[f"ACTIVE_{key.upper()}"] = 'aria-current="page"' if meta.get("nav") == key else ""
        values["CONTENT"] = apply_figures(fill(body, values), figures)
        # layout: none is for standalone pages (e.g. ad landing pages) that bring their own <html>.
        out = values["CONTENT"] if meta.get("layout") == "none" else fill(layout, values)
        (DIST / page.name).write_text(out)
        sitemap.append((values["SLUG"], values["UPDATED"]))
        print(f"built {page.name}")

    project_tpl = (SRC / "partials" / "project.html").read_text()
    for url, extra in project_list:
        values = dict(config)
        values.update(extra)
        values["SLUG"] = url[:-5]
        values["UPDATED"] = date.today().isoformat()
        values["BODY_CLASS"] = ""
        for key in NAV_KEYS:
            values[f"ACTIVE_{key.upper()}"] = 'aria-current="page"' if key == "projects" else ""
        values["CONTENT"] = fill(project_tpl, values)
        (DIST / url).write_text(fill(layout, values))
        sitemap.append((values["SLUG"], values["UPDATED"]))
    print(f"built {len(project_list)} project pages")

    urls = "".join(
        f"  <url><loc>https://{config['DOMAIN']}/{slug}</loc><lastmod>{updated}</lastmod></url>\n"
        for slug, updated in sitemap
    )
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n"
    )
    print(f"built sitemap.xml ({len(sitemap)} urls)")


if __name__ == "__main__":
    build()
