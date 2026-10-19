# LOKI Infra website: developer handover

Website for **Loki Infrastructure & Developers (LOKI Infra)**, a construction project management consultancy in Surat, Gujarat.
Owner contact: Lokesh Shinkar, +91 73593 59310.

## What this is

A hand-built static site: plain HTML, CSS and JavaScript, with **no framework, no CMS and no npm dependencies**.
A small Python 3 script (`build.py`, standard library only) assembles the pages.

- `dist/` is the finished website, ready to upload as it is.
- Everything else is the source used to rebuild it.

## Folder structure

| Path | What it is |
|---|---|
| `site.json` | Company details: name, phone, email, address, domain. **Change contact details here only.** They flow into every page and the structured data. |
| `src/partials/layout.html` | Shared header, footer, SEO meta tags and the organisation schema (JSON-LD) |
| `src/partials/project.html` | Template for each project detail page |
| `src/pages/*.html` | Page content. Front matter at the top sets the title, description, active nav item, `updated` date and `layout: none` for standalone pages |
| `src/data/projects.json` | All 13 projects. **Add or edit projects here**: the build creates the card on `/projects`, the detail page `project-<slug>.html`, the sitemap entry and the schema |
| `static/` | Copied into `dist/` as is: CSS, JS, images, logo, `robots.txt`, `llms.txt`, `vercel.json` |
| `static/assets/hairline/` | Interactive hero drawing on `/industrial-pmc` (`kernel.js` is a third-party engine, do not edit; `sawtooth.js` is the figure) |
| `figures/` | Optional SVG/HTML drop-in art that replaces placeholder illustrations at build time (see `figures/BRIEF.md`) |
| `dist/` | **Build output. Do not edit by hand**: it is deleted and regenerated on every build |

## Build and preview

Requires Python 3.8+ only.

```
python3 build.py
python3 -m http.server 4321 --directory dist
```

Then open http://localhost:4321.

## Deploy

Upload the contents of `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, or plain hosting).
`dist/vercel.json` enables clean URLs on Vercel (`/services` as well as `/services.html`). On other hosts, set up the same clean-URL rewrites so the canonical URLs and the sitemap resolve.

Domain planned: **lokiinfra.com** (not purchased yet). If a different domain is used, change `DOMAIN` in `site.json` and the hard-coded URLs in `static/robots.txt` and `static/llms.txt`, then rebuild.

## Pages (22)

Home, About, Services, Sectors, Projects (+ 13 project detail pages), Careers, Contact,
`/pmc-guide` (SEO guide article) and `/industrial-pmc` (standalone ad landing page, dark theme, own inline CSS and JS).

## SEO / AI-search work already in place

- JSON-LD on every page: Organization (ProfessionalService) with founders and parent company, FAQPage (Services, Industrial PMC), Article (guide and each project), ItemList of services
- `sitemap.xml` generated on each build, `robots.txt` allowing search and AI crawlers, `llms.txt` summary for AI engines
- Canonical URLs and Open Graph tags on every page

## To do before launch

1. **Contact form backend.** The forms on `/contact` and `/industrial-pmc` currently open the visitor's email app (`mailto:`). Connect a real backend (Formspree, Web3Forms, a Vercel function or similar) so enquiries arrive reliably.
2. **Domain and email.** Buy the domain, then set up the `info@` and `careers@` mailboxes (used across the site).
3. **Fonts.** Archivo and IBM Plex Mono load from Google Fonts. Self-hosting them is recommended for speed and privacy.
4. **Real photos.** Leadership portraits (the "SS" and "LS" placeholders), plus project photos for the group projects, which currently use line illustrations. The `/industrial-pmc` page has an empty photo slot.
5. **Accessibility polish** (from our review): two-tone focus ring on light sections, a darker amber (`#8A5F00`) for small text on light backgrounds, a 3:1 border on form inputs, and closing the mobile menu with the Escape key.
6. **Off-site:** Google Business Profile, LinkedIn page, Justdial and IndiaMART listings. Add their URLs to `sameAs` in `src/partials/layout.html`.

## Content still to confirm with the owner

- Office address: the site shows Homeland City, Piplod; the company profile shows The Citadel, 11th Floor, Adajan, Surat 395009
- Whether to add the second number, +91 90544 14909
- Founder wording (Sanjay Shinkar or Lokesh Shinkar)
- Permission to name Zota Healthcare and Inorbit Mall publicly
- Naming: always "LOKI Infra" or "LOKI" on the site, never "LKD"
