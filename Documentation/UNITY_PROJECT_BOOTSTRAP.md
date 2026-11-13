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

## Current repository state

The C# gameplay, battle, farm economy, storage, production, and contract systems are source foundations. This repository does not yet contain authored Unity scenes, configured prefabs, final 3D character art, or a successful Unity build. Opening the project is the first step toward generating and wiring those assets; do not treat a successful import as proof that the game is playable.

## Why this Editor version

Unity 6.3 is the current LTS line for this project, and `6000.3.27f2` is the security-patched release selected for the pinned version. Keep Editor and package versions aligned; do not upgrade the project mid-prototype without first making a separate branch and validating the full project.
