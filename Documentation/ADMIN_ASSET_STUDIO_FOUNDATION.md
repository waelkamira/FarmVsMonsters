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
Set a long random STUDIO_ADMIN_TOKEN on the server and enter it in the studio. Never expose it through a NEXT_PUBLIC variable or commit a real token.

## Local mode
Set STUDIO_STORAGE_DRIVER=local and run Next.js in development. Files are written to web/public/assets/ and metadata to the registry. Local-disk uploads are intentionally disabled in production.

## Online mode
Set STUDIO_STORAGE_DRIVER=github, STUDIO_GITHUB_TOKEN, STUDIO_GITHUB_REPOSITORY, and STUDIO_GITHUB_BRANCH. A dedicated studio/assets branch is created from main. The fine-grained token needs repository Contents read/write and Pull requests read/write permissions. Uploads become versioned commits on the Studio branch. Plant publishing creates a dedicated release branch and a pull request to the configured target branch; Studio never writes published assets or catalogs directly to main. Merge the release PR only after review.

The remote adapter has an 8 MB per-file limit and is suitable for small assets. A CDN/object-store adapter should replace it as the library grows.

## Current scope and limitations
This foundation implements private upload, typed folders, duplicate-ID protection, MIME allow-lists, a JSON registry, and local/GitHub storage. New assets remain drafts. It does not yet inspect actual image dimensions, crop/slice sheets, generate Phaser animation registrations, apply combat behavior templates, link projectiles, update the live battle roster, preview assets in a battle sandbox, replace existing assets, or publish/rollback releases. These are next pipeline stages. Grid dimensions are recorded as metadata only in this milestone.

## Verification
From web/: npm test, npm run lint, npm run build. Then open /studio with a valid admin token, upload a test image, verify its saved path and registry entry, and confirm unauthorized requests fail.
