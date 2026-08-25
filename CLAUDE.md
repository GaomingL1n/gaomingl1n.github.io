# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This is Gaoming Lin's personal academic website, built on the **Academic Pages** Jekyll template (a fork of the Minimal Mistakes theme). It is a static site deployed via GitHub Pages at `https://gaomingl1n.github.io` (URL configured in `_config.yml` under `url`, `baseurl` is empty).

All content is plain Markdown/HTML with YAML front matter — there is no application runtime. Most day-to-day work is editing content files and `_config.yml`, not code.

## Local development

Requirements: Ruby, bundler, and Node.js.

```bash
bundle install                 # install Ruby/Jekyll deps; if it errors, delete Gemfile.lock and retry
bundle exec jekyll serve -l -H localhost   # dev server at http://localhost:4000, auto-rebuilds on change
```

- **`_config.yml` is NOT hot-reloaded** — restart the server after editing it.
- `Gemfile.lock` is gitignored.
- JavaScript bundle: edit source JS under `assets/js/` (including `_main.js` and `plugins/`), then rebuild the minified file the site actually loads:
  ```bash
  npm install
  npm run build:js     # = uglify; concatenates + minifies into assets/js/main.min.js
  npm run watch:js     # rebuild on change
  ```
  `assets/js/main.min.js` is what `_includes/scripts.html` loads; it is the only JS artifact that ships.

## Content model

Content lives in Jekyll **collections** (declared in `_config.yml` `collections:`), each a directory of Markdown files whose front matter drives rendering:

- `_pages/` — standalone pages (home, CV, archive index pages). `_pages/about.md` is the homepage (`permalink: /`).
- `_publications/` — publications, filenames `YYYY-MM-DD-slug.md`, permalink `/publication/YYYY-MM-DD-slug`.
- `_talks/` — talks, filenames `YYYY-MM-DD-slug.md`, permalink `/talks/YYYY-MM-DD-slug`.
- `_teaching/`, `_portfolio/` — course and project entries.
- `_posts/` — blog posts (filesystem-pattern named `YYYY-MM-DD-title.md`).
- `_data/` — site-wide YAML data: `navigation.yml` (header menu), `authors.yml`, `ui-text.yml` (localized UI strings).
- `files/` — hosted PDFs, served at `/files/<name>.pdf`.

### Front matter conventions (from `_config.yml` `defaults:` and the archive includes)

- **Publications** require `title`, `collection: publications`, `permalink`, `date`, `venue`, `citation`; optional `paperurl`, `excerpt`. `_includes/archive-single.html` conditionally renders "Recommended citation" and "Download Paper/Slides" links from `citation`/`paperurl`/`slidesurl`.
- **Talks** require `title`, `collection: talks`, `type` (e.g. `"Talk"`), `permalink`, `date`; optional `venue`, `location`, `talk_url`.
- Defaults in `_config.yml` add `layout: single` + `author_profile: true` to pages and collection items, `layout: talk` to talks. Per-item front matter overrides.

### How listing pages work

Archive pages (`_pages/publications.html`, `_pages/talks.html`, etc.) use `layout: archive` and loop over the collection in reverse-chronological order, e.g.:

```liquid
{% for post in site.publications reversed %}
  {% include archive-single.html %}
{% endfor %}
```

`{% include base_path %}` assigns `base_path` (site.url + baseurl) and must be included in any template that builds absolute URLs.

## Key architecture

- **Layouts** (`_layouts/`): `default.html` wraps every page (head + masthead nav + content + scripts); `single.html` renders one article with the author sidebar; `archive.html` renders listings; `talk.html` for talks.
- **Author sidebar**: populated from the `author:` block in `_config.yml` (avatar, name, bio, email, social/affiliation URLs — blank fields are omitted), rendered by `_includes/author-profile.html`.
- **Navigation**: `_data/navigation.yml` (`main:` links), rendered by `_includes/masthead.html`.
- **Styles**: Sass partials in `_sass/`, entry point `assets/css/main.scss` (Jekyll compiles with `sass_dir: _sass`, compressed output).
- **Site options** relevant to content: `future: true` publishes future-dated posts; `talkmap_link: false` gates the talk-map link on the talks page.

## Content generators (optional)

- `markdown_generator/` contains Jupyter notebooks and plain-Python equivalents (`publications.py`, `talks.py`) that convert tab-separated metadata files (`publications.tsv`, `talks.tsv`) into the `_publications/*.md` and `_talks/*.md` collection files. Run from inside `markdown_generator/`; requires pandas. `pubsFromBib.py` converts BibTeX → the publications TSV.
- `talkmap.py` scrapes `location:` from `_talks/*.md`, geocodes them (getorg + geopy/Nominatim), and regenerates the Leaflet map under `talkmap/`. Run it from the `_talks/` directory.

## Deployment

This directory is not a git checkout (it was extracted from a GitHub download). Deployment is GitHub Pages on the `gaomingl1n.github.io` repo: commit changes there and push to the default branch, and GitHub's built-in `pages-build-deployment` action builds and publishes automatically. Note `repository` in `_config.yml` still points at the upstream template repo.
