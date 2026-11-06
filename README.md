# J SPEED SERVICE website

Static website for J SPEED SERVICE (MINI / BMW repair). Every page keeps the old site's
address so existing links and search rankings keep working.

## Build

```sh
npm run build
```

The finished site is written to `dist/` (upload or publish that folder).

- `content.mjs` – text, services, repair stories and page addresses
- `build.mjs` – page templates; fails if any old address is missing
- `public/` – styles, script, logo and icons
- `static/` – photos at their old `/wp-content/uploads/...` addresses: the full-size originals plus 640 px copies, made by `node scripts/import-originals.mjs <backup/public_html>` from a backup of the old site
- `photos.json` – where each photo appears
