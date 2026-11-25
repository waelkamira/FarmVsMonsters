# FarmVsMonsters Admin Asset Studio — Foundation

## Entry points
- Private admin page: /studio
- Authenticated API: /api/studio/assets
- Registry: web/game/data/studioAssetRegistry.json
- Shared category rules: web/game/studio/assetTypes.mjs

## Categories and destinations
- Plant sheets: public/assets/plants/
- Monster sheets: public/assets/monsters/
- Plant projectiles: public/assets/projectiles/plants/
- Monster projectiles: public/assets/projectiles/monsters/
- Effects, items, audio: public/assets/effects/, public/assets/items/, public/assets/audio/

## Authentication
Set two independent random server-only secrets, each at least 32 characters:
- `STUDIO_ADMIN_TOKEN`: the administrator login password.
- `STUDIO_SESSION_SECRET`: the HMAC key used only to sign and verify Studio session cookies.

Never reuse the same value for both, expose either through a `NEXT_PUBLIC` variable, or commit real secrets. Existing Studio cookies signed with the old shared key are intentionally invalidated when the new signing key is enabled; sign in again after deployment.

Login attempts are limited to five per client IP in a 15-minute window. Development may use an in-memory limiter. Production requires the shared Redis REST settings `STUDIO_RATE_LIMIT_REDIS_REST_URL` and `STUDIO_RATE_LIMIT_REDIS_REST_TOKEN`; if the shared store is missing or unavailable, login fails closed with HTTP 503 rather than silently bypassing the limit.

The Studio API remains session-protected. For production, additionally place `/studio` and `/api/studio` behind a private access layer such as Cloudflare Access, VPN, or deployment protection where available; do not rely on the login page being obscure.

## Local mode
Set STUDIO_STORAGE_DRIVER=local and run Next.js in development. Files are written to web/public/assets/ and metadata to the registry. Local-disk uploads are intentionally disabled in production.

## Online mode
Set STUDIO_STORAGE_DRIVER=github, STUDIO_GITHUB_TOKEN, STUDIO_GITHUB_REPOSITORY, and STUDIO_GITHUB_BRANCH. A dedicated studio/assets branch is created from main. Use a fine-grained token restricted to this repository with only the required Contents read/write and Pull requests read/write permissions. Keep `STUDIO_GITHUB_BRANCH=studio/assets`; protect `main` with branch protection/rulesets so the Studio token cannot push directly to production. Restrict who can push to the Studio branch as well. Uploads become versioned commits on the Studio branch. Plant publishing creates a dedicated release branch and a pull request to the configured target branch; Studio never writes published assets or catalogs directly to main. Merge the release PR only after review.

The remote adapter has an 8 MB per-file limit and is suitable for small assets. A CDN/object-store adapter should replace it as the library grows.

## Current scope and limitations
This foundation implements private upload, typed folders, duplicate-ID protection, MIME allow-lists, a JSON registry, and local/GitHub storage. New assets remain drafts. It does not yet inspect actual image dimensions, crop/slice sheets, generate Phaser animation registrations, apply combat behavior templates, link projectiles, update the live battle roster, preview assets in a battle sandbox, replace existing assets, or publish/rollback releases. These are next pipeline stages. Grid dimensions are recorded as metadata only in this milestone.

## Verification
From web/: npm test, npm run lint, npm run build. Then open /studio with a valid admin token, upload a test image, verify its saved path and registry entry, and confirm unauthorized requests fail.
