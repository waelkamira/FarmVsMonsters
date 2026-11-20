# FarmVsMonsters Studio — session, replacement and previews

- Admin login uses POST /api/studio/session and a 12-hour HttpOnly, SameSite=Strict cookie scoped to /api/studio. Refreshes restore the session automatically; DELETE logs out.
- Asset API endpoints accept the session cookie, not a browser-persisted admin token.
- Existing IDs remain unique. To replace an asset, select it in the library and use Replace; category and ID stay fixed, metadata is updated, and the existing registry entry is retained.
- GitHub previews point to raw.githubusercontent.com using the configured storage branch. Verify branch/path availability in the browser after deployment.
- Replacing a file with a different extension may leave the previous file orphaned on the storage branch; cleanup/rollback is a later maintenance task.
- This remains an admin-only draft pipeline; it does not auto-register assets into combat gameplay.
