# Local browser testing (Windows / Google Chrome)

## Development rule

Develop the game in this Godot project. Test every gameplay change in Google Chrome on the Windows computer using a Web export from this same project. Do not publish the game online. Do not create an APK until the game is complete and browser-tested.

## One-time setup

1. Install the Godot version used by this project and its matching Web export templates. In Godot, use **Editor > Manage Export Templates** and install the templates matching the editor version.
2. Open this project by selecting the `godot` folder (the folder containing `project.godot`).
3. Open **Project > Export**. Select the existing **Web** preset. If the preset is missing, add a Web preset.
4. Export the project to `godot/build/index.html`. Keep the default preset options, including single-threaded Web export.

## Each time you want to test an updated game

1. Pull the latest changes from the repository's `main` branch.
2. Open the `godot` project in Godot and allow the editor to finish importing resources.
3. Choose **Project > Export**, select **Web**, and export to `build/index.html`, replacing the previous export.
4. Double-click `OPEN_IN_CHROME.bat` in the `godot` folder.
5. Chrome opens `http://127.0.0.1:8000`. The game is served only from your own computer. Keep the command window open while testing; close it to stop the local server.

The batch file expects Python's Windows launcher (`py`) to be installed. It checks that the Web export exists before starting the server. Do not open `index.html` directly from File Explorer; Web exports must be served over HTTP.

## Automated browser artifact (optional)

The private GitHub Actions workflow can also create a downloadable artifact named `farm-vs-monsters-web-local`. Use it only when a successful run has actually produced an artifact. A failed or blocked run does not provide a build.

## Android release

Do not create an APK during normal development. After gameplay and browser testing are complete, validate Android controls, landscape layout, offline behavior and performance, then export and sign the APK from this same Godot project.
