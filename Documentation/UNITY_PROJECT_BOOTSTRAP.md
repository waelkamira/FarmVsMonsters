# Unity Project Bootstrap

## Pinned Editor

This repository is pinned to **Unity 6.3 LTS — 6000.3.27f2**.

The version is pinned intentionally so the team does not open the project with different editor/package combinations. Use Unity Hub to install this exact Editor version. The project uses URP for a shared PC/mobile rendering path.

## Unity Hub modules

For the first Windows playable build, install:
- Windows Build Support (IL2CPP)
- Microsoft Visual Studio integration (or use an installed supported IDE)

For Android testing later, add:
- Android Build Support
- Android SDK & NDK Tools
- OpenJDK

iOS player builds require a macOS/Xcode build environment; keep iOS as a later platform target.

## First open

1. Clone `https://github.com/waelkamira/FarmVsMonsters`.
2. In Unity Hub choose **Add > Add project from disk** and select the repository folder.
3. Confirm Unity Hub selects Editor version `6000.3.27f2`.
4. Allow Package Manager to resolve `Packages/manifest.json`.
5. Open the project and wait for the first script compilation/import to finish.
6. In **Edit > Project Settings > Player > Other Settings**, set **Active Input Handling** to **Both**. The current desktop adapter uses Unity's classic Input Manager, while the Input System package is installed for the upcoming unified desktop/mobile input implementation.
7. Confirm the project uses the Universal Render Pipeline. If the Graphics/Quality pipeline fields are empty on first open, create a URP Pipeline Asset via **Assets > Create > Rendering > URP Pipeline Asset** and assign it in **Project Settings > Graphics** and **Quality**.

## Generate the first battle scene

After the project finishes importing, use **Farm Vs Monsters > Generate Prototype Battle Scene**. The Editor tool creates a playable greybox battle scene, five plant definition assets, primitive 3D test prefabs, enemy waves, energy pickups, and a basic HUD. It also adds the scene to Build Settings. Then run **Farm Vs Monsters > Validate Prototype Battle Scene** to check the scene's structural references. Open `Assets/Scenes/PrototypeBattle.unity` and press Play.

The generated primitives are temporary test art, not the final stylized character models. The editor generator itself has not been executed in this environment; inspect the Unity Console after running it and report any compile/import errors before treating the scene as verified.

## Current repository state

The repository now contains the Unity version/package baseline, gameplay source, farm economy, storage, production, contracts, and an Editor scene generator. The generator is intended to create the first test scene and placeholder 3D prefabs locally. No successful Unity compilation or in-engine playtest has yet been recorded.

## Why this Editor version

Unity 6.3 is the current LTS line for this project, and `6000.3.27f2` is the security-patched release selected for the pinned version. Keep Editor and package versions aligned; do not upgrade the project mid-prototype without first making a separate branch and validating the full project.
