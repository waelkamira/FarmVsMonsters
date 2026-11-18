# Local browser testing (Windows / Chrome / Edge)

## Current testing policy

The game is **not to be published or deployed online during development**. Do not configure Cloudflare Pages, GitHub Pages, or any other hosting service now. Keep the GitHub repository private.

The user tests the game on their own computer using a locally exported Godot Web build served through localhost. The final Android APK will be exported from this same Godot project after gameplay, touch controls, landscape layout, offline behavior and device performance have been validated. No separate browser-only game implementation is planned.

## Local browser test on Windows

1. Install Godot 4.4.1 Standard and its matching export templates.
2. Clone or download the private repository on the user's Windows computer.
3. Open `godot/project.godot` in Godot.
4. Open **Project → Export**, select the **Web** preset, and export to `build/index.html` in the repository root.
5. Open PowerShell in the repository root and run:

   ```powershell
   py -m http.server 8000 --directory build
   ```

6. Open `http://localhost:8000` in Chrome or Edge. Keep the PowerShell server window open while testing.

Do not open `index.html` directly from File Explorer; the Web export must be served over HTTP. Stop the local server with Ctrl+C when finished.

The browser export uses Godot's Compatibility renderer and single-threaded WebAssembly mode. Browser support requires WebAssembly and WebGL 2.0.

## Release path

When the game is complete, validate Android touch input, landscape orientation, performance, offline operation and device compatibility, then export and sign the complete APK from this same Godot project. No online browser deployment is part of the current development plan.
