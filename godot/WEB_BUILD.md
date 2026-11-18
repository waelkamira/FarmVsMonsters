# Browser build (Windows / Chrome / Edge)

## Project delivery direction

The browser is the primary development/review target. The final Android APK will be exported from this same Godot project after gameplay, touch controls, landscape layout, offline behavior and device performance have been validated. No separate browser-only game implementation is planned.

Because the source repository is private and the current GitHub plan blocks Pages for private repositories, use a free host that supports private-repository integration (Cloudflare Pages is the planned option). Do not make the source repository public merely to enable Pages.


The Godot prototype is exported as a single-threaded Web build and published with GitHub Pages. The existing `web/` application is not replaced.

## Automatic deployment

A push to `main` that changes `godot/**` or `.github/workflows/godot-web.yml` runs the **Godot Web build and deploy** workflow. The published entry point is:

`https://waelkamira.github.io/FarmVsMonsters/`

The first deployment requires GitHub Pages to be enabled with **Settings → Pages → Build and deployment → Source: GitHub Actions**. After that, each successful workflow run updates the browser build.

## Local browser test on Windows

1. Install Godot 4.4.1 Standard and its matching export templates.
2. Open `godot/project.godot`.
3. Open **Project → Export**, select the **Web** preset, and export to `build/index.html`.
4. Serve the `build` folder over HTTP (do not open `index.html` directly from File Explorer). For example, from PowerShell in the repository root:

   ```powershell
   py -m http.server 8000 --directory build
   ```

5. Open `http://localhost:8000` in Chrome or Edge.

The browser export uses Godot's Compatibility renderer and single-threaded WebAssembly mode. Browser support requires WebAssembly and WebGL 2.0.
