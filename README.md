# LOKI Infra — Loki Infrastructure & Developers website

Custom static website: hand-written HTML/CSS/JS, no framework or CMS, and no runtime dependencies.

## Structure
- `site.json` holds company details (phone, email, address, domain). Edit these here and they update everywhere.
- `src/partials/layout.html` is the shared header, footer and SEO meta.
- `src/pages/*.html` contains the page content.
- `static/assets/` has styles, scripts, the logo and line-art.
- `dist/` is the built site (deploy this folder).

## Figures
Drop SVG or HTML figures (e.g. from `/hairline-create`) into `figures/` and they replace the placeholder art on build. See `figures/BRIEF.md` for file names and prompts.

## Build & preview
    python3 build.py
    python3 -m http.server 4321 --directory dist

## Deploy
Upload `dist/` to Vercel, Netlify or Cloudflare Pages (all free at this scale), then point the domain at it.

## Before launch
- [ ] Real phone / WhatsApp number in `site.json`
- [ ] Buy domain + set up info@ / careers@ mailboxes
- [ ] Connect the RFP form to a backend (it currently opens the visitor's email app)
- [ ] Leadership photos, project case studies, client logos

## GitHub and Vercel deployment

Vercel serves the committed `dist/` directory. No install or build step runs on Vercel. After source edits, run `python3 build.py` locally and commit the regenerated `dist/` with the source changes. Production branch: `main`.
