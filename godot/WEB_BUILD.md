# Local browser testing (Windows / Chrome / Edge)

## Current testing policy

The game is **not to be published or deployed online during development**. Keep the GitHub repository private. Do not use GitHub Pages, Cloudflare Pages, or another public hosting service.

The browser build is exported from this same Godot project. The final Android APK will also be exported from this project after gameplay, touch controls, landscape layout, offline behavior and device performance have been validated. Do not create a separate browser-only game implementation.

## Download the prebuilt browser package

The GitHub Actions workflow `.github/workflows/godot-web.yml` builds the Web export and stores it as a private workflow artifact named `farm-vs-monsters-web-local`.

1. Sign in to GitHub and open the private repository's **Actions** tab.
2. Open the latest successful **Godot Web local test build** run for the current `main` branch.
3. In the run's **Artifacts** section, download `farm-vs-monsters-web-local`.
4. Extract `farm-vs-monsters-web-local.zip` into a folder on the Windows computer. The extracted folder should contain `index.html` and the Godot Web export files.

If the run is queued or failed, or the Artifacts section is empty, no browser package is available yet. Do not try to open a missing or incomplete export.

## Run locally

1. Install Python 3 if it is not already available. Godot is **not** required on the Windows computer when using the prebuilt artifact.
2. Open PowerShell in the extracted folder (the folder containing `index.html`).
3. Run:

   ```powershell
   py -m http.server 8000
   ```

4. Open `http://localhost:8000` in Chrome or Edge.
5. Keep the PowerShell window open while testing. Stop the server with Ctrl+C.

Do not open `index.html` directly from File Explorer; Godot Web exports must be served over HTTP. This is a local-only test and does not publish the game to the internet.

## Build and release path

The automated workflow uses Godot 4.4.1 and the Web export preset. If a build fails before producing an artifact, inspect the GitHub Actions run and resolve the runner/build problem before claiming the package is ready.

When the game is complete, validate Android touch input, landscape orientation, performance, offline operation and device compatibility, then export and sign the complete APK from this same Godot project. No online browser deployment is part of the current development plan.
