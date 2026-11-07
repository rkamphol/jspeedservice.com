# J SPEED SERVICE website

J SPEED SERVICE repairs European cars (MINI Cooper, BMW, Mercedes-Benz, all models).
Static site (Node ESM, no dependencies). `npm run build` writes `dist/`; every push to `main`
deploys it with GitHub Pages (`.github/workflows/pages.yml`). See README.md for the files.

## Rules
- Every old WordPress address must keep working: the build fails if a legacy page is missing,
  and `old-addresses.txt` addresses without a page get forwarding pages. Don't rename `paths`.
- Photos: after adding or changing a photo in `static/` / `photos.json`, run
  `node scripts/make-webp.mjs` (needs `cwebp`, `brew install webp`) and commit the `.webp`
  files. The build fails if a photo has no WebP copies.
- Alt text: a photo's `desc` in `photos.json` overrides the label the template passes.
- Shop details (address, phone, hours) live once in `site` in `content.mjs`; the address must
  match the Google Business Profile word for word.
- Page titles: give `add()` a `seoTitle`; the layout appends `site.titleTail`. Keep titles
  and descriptions unique per page.
- Google tags load only on `www.jspeedservice.com` (not locally or on github.io).
- Check changes with `npm run build`, then the local preview (`.claude/launch.json`, "site").
- The repo is public: no secrets. Commit and push only when the user asks.
