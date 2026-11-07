# J SPEED SERVICE website

Static website for J SPEED SERVICE (European car repair: MINI Cooper, BMW, Mercedes-Benz). Every page keeps the old site's
address so existing links and search rankings keep working.

## Build

```sh
npm run build
```

The finished site is written to `dist/` (upload or publish that folder).

## Publishing

Every push to `main` builds the site and publishes it with GitHub Pages
(`.github/workflows/pages.yml`). Until the custom domain is connected, the site is at
https://rkamphol.github.io/jspeedservice.com/ and the build puts `/jspeedservice.com` in
front of its links (`BASE_PATH`); with the domain set in the repository's Pages settings
the links stay at the site root.

- `content.mjs` – text, services and page addresses
- `posts.json` – the repair stories (text and photos), imported from the old site with `node scripts/import-posts.mjs <backup/public_html>`; run `scripts/import-originals.mjs` after it for the photos' web copies
- `build.mjs` – page templates; fails if any old address is missing
- `public/` – styles, script, logo and icons
- `static/` – photos at their old `/wp-content/uploads/...` addresses: the full-size originals plus 640 px copies, made by `node scripts/import-originals.mjs <backup/public_html>` from a backup of the old site
- `photos.json` – where each photo appears; `desc` is its alt text where the post title doesn't describe it, and `webp` lists the WebP sizes made by `node scripts/make-webp.mjs` (needs `cwebp`; run it after adding photos)
- `old-addresses.txt` – every page address the old WordPress site had (made by `node scripts/collect-old-addresses.mjs <backup/public_html>`); each one without a new page gets a small forwarding page to the closest new page (rules in `forwardTarget` in `build.mjs`)
