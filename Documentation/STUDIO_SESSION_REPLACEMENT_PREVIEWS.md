# FarmVsMonsters Studio — session, replacement and previews

## Admin session

- Admin login uses `POST /api/studio/session` and stores a signed `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/studio`; production cookies also use `Secure`.
- The session payload includes a signed expiration timestamp. The server verifies the 12-hour expiry on every session and asset API request; browser cookie `maxAge` is not the only expiry control.
- Refreshes restore a valid session automatically. `DELETE /api/studio/session` clears the cookie.
- Asset API endpoints accept the signed session cookie, not a browser-persisted admin token. Changing the admin secret invalidates all outstanding sessions. Deploying the new signed-expiry format also invalidates older-format cookies, so the administrator must log in again.

## Asset editing and immutable revisions

- Existing IDs remain unique. Select an asset in the library and use `تعديل`; category and ID stay fixed, metadata is updated, and the existing registry entry is retained.
- A replacement file is optional. Leaving the file input empty preserves the current file while saving metadata or combat-profile changes.
- Plant and projectile file paths are content-addressed using SHA-256. Replacing a file creates a new immutable path instead of overwriting an image that may be used by an already-published catalog or rollback.
- The human-readable `filename` remains based on the asset ID; the storage `path` carries the content hash.
- Old unreferenced versions are retained. Do not delete them until a garbage-collection process accounts for every published catalog and rollback reference.

## Previews

- Studio previews are served through the authenticated `/api/studio/assets?preview=...` proxy from the configured storage branch. The browser does not receive a public raw GitHub asset URL.
- Preview requests validate the asset path and extension, return the supported media type, and set `X-Content-Type-Options: nosniff`.
- The testing catalog and its image previews require the same valid Studio session.

## Safety boundary

- Registry and published-catalog updates use optimistic GitHub blob-SHA checks and return HTTP 409 on a stale snapshot.
- Individual image revisions are immutable, but GitHub Contents API operations across image, catalog, and registry files are still separate commits, not one atomic transaction.
- A failed multi-file operation may leave an unreferenced immutable file. Keep the registry/catalog as the source of truth and retain orphaned versions until safe cleanup is implemented.
- This remains an admin-only Studio pipeline. Uploading creates a draft; testing and publishing are separate explicit actions.
