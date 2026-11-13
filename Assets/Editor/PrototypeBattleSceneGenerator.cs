#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using FarmVsMonsters.Battle;
using FarmVsMonsters.CameraSystem;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Farm;
using FarmVsMonsters.Input;
using FarmVsMonsters.Plants;
using FarmVsMonsters.Player;
using FarmVsMonsters.UI;

namespace FarmVsMonsters.EditorTools
{
    /// <summary>
    /// Generates a source-controlled, playable greybox battle scene and primitive 3D test prefabs.
    /// Replace the generated art with final stylized models before production release.
    /// </summary>
    public static class PrototypeBattleSceneGenerator
    {
        private const string ScenePath = "Assets/Scenes/PrototypeBattle.unity";
        private const string PrefabFolder = "Assets/Prefabs/Generated";
        private const string PlantFolder = "Assets/ScriptableObjects/Plants";
        private const string MaterialFolder = "Assets/Materials/Generated";

        [MenuItem("Farm Vs Monsters/Generate Prototype Battle Scene")]
        public static void Generate()
        {
            EnsureFolder("Assets", "Scenes");
            EnsureFolder("Assets", "Prefabs");
            EnsureFolder("Assets/Prefabs", "Generated");
            EnsureFolder("Assets", "ScriptableObjects");
            EnsureFolder("Assets/ScriptableObjects", "Plants");
            EnsureFolder("Assets", "Materials");
            EnsureFolder("Assets/Materials", "Generated");

            Material grass = CreateMaterial("BattleGrass", new Color(0.25f, 0.48f, 0.22f));
            Material soil = CreateMaterial("Soil", new Color(0.34f, 0.20f, 0.12f));
            Material farmerMaterial = CreateMaterial("Farmer", new Color(0.25f, 0.48f, 0.88f));
            Material monsterMaterial = CreateMaterial("Monster", new Color(0.35f, 0.62f, 0.25f));
            Material bossMaterial = CreateMaterial("BossMonster", new Color(0.42f, 0.12f, 0.18f));
            Material gold = CreateMaterial("EnergyGold", new Color(1f, 0.72f, 0.12f));
            Material projectileMaterial = CreateMaterial("PeaProjectile", new Color(0.45f, 0.95f, 0.25f));
            Material[] plantMaterials =
            {
                CreateMaterial("Sunflower", new Color(1f, 0.76f, 0.12f)),
                CreateMaterial("PeaShooter", new Color(0.18f, 0.72f, 0.25f)),
                CreateMaterial("IceBloom", new Color(0.35f, 0.85f, 1f)),
                CreateMaterial("PumpkinGuard", new Color(1f, 0.43f, 0.08f)),
                CreateMaterial("FirePepper", new Color(0.88f, 0.12f, 0.08f))
            };

            GameObject projectilePrefab = CreateProjectilePrefab(projectileMaterial);
            GameObject energyPickupPrefab = CreateEnergyPickupPrefab(gold);
            GameObject enemyPrefab = CreateEnemyPrefab("Monster_Grunt", monsterMaterial, 75f, 1.45f, 9f, energyPickupPrefab);
            GameObject bossPrefab = CreateEnemyPrefab("Monster_Brute", bossMaterial, 230f, 0.85f, 22f, energyPickupPrefab);

            string[] plantIds = { "sunflower", "pea_shooter", "ice_bloom", "pumpkin_guard", "fire_pepper" };
            string[] plantNames = { "Sunflower", "Pea Shooter", "Ice Bloom", "Pumpkin Guard", "Fire Pepper" };
            int[] costs = { 50, 25, 40, 30, 75 };
            float[] damages = { 0f, 13f, 7f, 5f, 34f };
            float[] intervals = { 1f, 1.05f, 1.55f, 1.8f, 2.4f };
            PlantDefinition[] definitions = new PlantDefinition[5];

            for (int i = 0; i < definitions.Length; i++)
            {
                GameObject prefab = CreatePlantPrefab(plantIds[i], plantMaterials[i],
                    projectilePrefab, damages[i], intervals[i], i == 0, i);
                definitions[i] = CreatePlantDefinition(plantIds[i], plantNames[i], costs[i], prefab);
            }

            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.name = "BattleBoard";
            floor.transform.position = Vector3.zero;
            floor.transform.localScale = new Vector3(1.35f, 1f, 0.75f);
            floor.GetComponent<Renderer>().sharedMaterial = grass;
            CreateBattleBoardDetails(soil, grass);

            GameObject gridObject = new GameObject("BattleGrid");
            gridObject.transform.position = new Vector3(0f, 0.05f, 0f);
            BattleGrid grid = gridObject.AddComponent<BattleGrid>();
            SetInt(grid, "columns", 9);
            SetInt(grid, "rows", 5);
            SetFloat(grid, "cellSize", 1.5f);
            SetVector3(grid, "origin", new Vector3(-6.75f, 0f, -3.75f));

            GameObject walletObject = new GameObject("BattleEnergyWallet");
            EnergyWallet wallet = walletObject.AddComponent<EnergyWallet>();
            SetInt(wallet, "startingEnergy", 150);
            SetInt(wallet, "capacity", 500);

            GameObject plantRootObject = new GameObject("PlacedPlants");
            GameObject placementObject = new GameObject("PlantPlacementService");
            PlantPlacementService placement = placementObject.AddComponent<PlantPlacementService>();
            SetObject(placement, "battleGrid", grid);
            SetObject(placement, "energyWallet", wallet);
            SetObject(placement, "plantRoot", plantRootObject.transform);
            SetObjectArray(placement, "permanentUpgrades", Array.Empty<UnityEngine.Object>());

            GameObject farmer = new GameObject("Farmer");
            farmer.transform.position = new Vector3(0f, 0f, -8f);
            CharacterController character = farmer.AddComponent<CharacterController>();
            character.height = 2f;
            character.radius = 0.38f;
            character.center = new Vector3(0f, 1f, 0f);
            FarmerController farmerController = farmer.AddComponent<FarmerController>();
            GameObject farmerVisual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            farmerVisual.name = "FarmerVisual";
            farmerVisual.transform.SetParent(farmer.transform, false);
            farmerVisual.transform.localPosition = Vector3.up;
            farmerVisual.GetComponent<Renderer>().sharedMaterial = farmerMaterial;
            UnityEngine.Object.DestroyImmediate(farmerVisual.GetComponent<Collider>());

            GameObject farmCore = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            farmCore.name = "ProtectedFarmCore";
            farmCore.transform.position = new Vector3(0f, 0.85f, -5.4f);
            farmCore.transform.localScale = new Vector3(1.3f, 0.85f, 1.3f);
            farmCore.GetComponent<Renderer>().sharedMaterial = soil;
            Health farmHealth = farmCore.AddComponent<Health>();
            SetFloat(farmHealth, "maxHealth", 500f);

            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            Camera camera = cameraObject.AddComponent<Camera>();
            cameraObject.AddComponent<AudioListener>();
            cameraObject.transform.position = new Vector3(0f, 13f, -19f);
            IsometricCameraFollow cameraFollow = cameraObject.AddComponent<IsometricCameraFollow>();
            SetObject(cameraFollow, "target", farmer.transform);
            SetVector3(cameraFollow, "offset", new Vector3(0f, 13f, -11f));
            cameraObject.transform.rotation = Quaternion.Euler(45f, 0f, 0f);

            Transform[] spawnPoints = new Transform[3];
            float[] spawnX = { -5f, 0f, 5f };
            for (int i = 0; i < spawnPoints.Length; i++)
            {
                GameObject spawn = new GameObject("MonsterSpawn_" + (i + 1));
                spawn.transform.position = new Vector3(spawnX[i], 1f, 8f);
                spawnPoints[i] = spawn.transform;
            }

            GameObject waveObject = new GameObject("WaveManager");
            WaveManager waveManager = waveObject.AddComponent<WaveManager>();
            SetObjectArray(waveManager, "spawnPoints", spawnPoints);
            SetObject(waveManager, "enemyTarget", farmCore.transform);
            SetObject(waveManager, "enemyTargetHealth", farmHealth);
            SetObject(waveManager, "energyWallet", wallet);
            ConfigureWaves(waveManager, enemyPrefab, bossPrefab);

            GameObject outcomeObject = new GameObject("BattleOutcomeController");
            BattleOutcomeController outcome = outcomeObject.AddComponent<BattleOutcomeController>();
            SetObject(outcome, "waveManager", waveManager);
            SetObject(outcome, "protectedTargetHealth", farmHealth);
            SetObject(outcome, "rewardWallet", wallet);
            SetInt(outcome, "victoryEnergyReward", 100);
            SetInt(outcome, "victoryFarmCoinReward", 50);
            SetInt(outcome, "nextStageToUnlock", 2);
            SetBool(outcome, "beginWavesOnStart", true);

            GameObject inputObject = new GameObject("BattleInput");
            DesktopBattleInput desktopInput = inputObject.AddComponent<DesktopBattleInput>();
            SetObject(desktopInput, "farmer", farmerController);
            SetObject(desktopInput, "placementService", placement);
            SetObject(desktopInput, "gameplayCamera", camera);
            SetObjectArray(desktopInput, "quickSelectPlants", definitions);

            TouchBattleInput touchInput = inputObject.AddComponent<TouchBattleInput>();
            SetObject(touchInput, "farmer", farmerController);
            SetObject(touchInput, "placementService", placement);
            SetObject(touchInput, "gameplayCamera", camera);

            CreateEnergyPickup(new Vector3(-4.5f, 0.45f, -1.5f), gold, wallet, 25);
            CreateEnergyPickup(new Vector3(0f, 0.45f, 1.5f), gold, wallet, 25);
            CreateEnergyPickup(new Vector3(4.5f, 0.45f, -1.5f), gold, wallet, 25);

            GameObject canvasObject = new GameObject("BattleHUD",
                typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;

            Text energyText = CreateText(canvas.transform, "EnergyText", "Energy: 150 / 500",
                new Vector2(28f, -22f), new Vector2(300f, 44f), new Vector2(0f, 1f), 26);
            Text healthText = CreateText(canvas.transform, "FarmHealthText", "Farm: 500 / 500",
                new Vector2(28f, -72f), new Vector2(300f, 38f), new Vector2(0f, 1f), 22);
            Slider healthSlider = CreateHealthSlider(canvas.transform);
            Text waveText = CreateText(canvas.transform, "WaveText", "Wave: 0 / 3",
                new Vector2(-28f, -22f), new Vector2(250f, 40f), new Vector2(1f, 1f), 24,
                TextAnchor.MiddleRight);
            Text enemiesText = CreateText(canvas.transform, "EnemiesText", "Enemies: 0",
                new Vector2(-28f, -66f), new Vector2(250f, 36f), new Vector2(1f, 1f), 20,
                TextAnchor.MiddleRight);
            Text selectedText = CreateText(canvas.transform, "SelectedPlantText", "Select a plant (1-5)",
                new Vector2(0f, 20f), new Vector2(500f, 38f), new Vector2(0.5f, 0f), 20,
                TextAnchor.MiddleCenter);

            Button[] plantButtons = new Button[5];
            Text[] plantLabels = new Text[5];
            for (int i = 0; i < 5; i++)
            {
                float x = (i - 2) * 170f;
                plantButtons[i] = CreateButton(canvas.transform, "PlantButton_" + plantIds[i],
                    plantNames[i] + "\n" + costs[i] + " energy",
                    new Vector2(x, 68f), new Vector2(150f, 64f), new Vector2(0.5f, 0f));
                plantLabels[i] = plantButtons[i].GetComponentInChildren<Text>();
            }

            GameObject resultPanel = CreatePanel(canvas.transform, "BattleResultPanel",
                new Vector2(620f, 340f));
            Text resultTitle = CreateText(resultPanel.transform, "ResultTitle", "VICTORY!",
                new Vector2(0f, -34f), new Vector2(560f, 72f), new Vector2(0.5f, 1f), 42,
                TextAnchor.MiddleCenter);
            Text resultDescription = CreateText(resultPanel.transform, "ResultDescription",
                "The farm is safe.", new Vector2(0f, -118f), new Vector2(540f, 70f),
                new Vector2(0.5f, 1f), 22, TextAnchor.MiddleCenter);
            Button retryButton = CreateButton(resultPanel.transform, "RetryButton", "PLAY AGAIN",
                new Vector2(0f, 34f), new Vector2(220f, 60f), new Vector2(0.5f, 0f));
            BattleRetryButton retryBinding = retryButton.gameObject.AddComponent<BattleRetryButton>();

            BattleHudController hud = canvasObject.AddComponent<BattleHudController>();
            SetObject(hud, "energyWallet", wallet);
            SetObject(hud, "protectedTargetHealth", farmHealth);
            SetObject(hud, "waveManager", waveManager);
            SetObject(hud, "outcomeController", outcome);
            SetObject(hud, "desktopInput", desktopInput);
            SetObject(hud, "touchInput", touchInput);
            SetObject(hud, "energyText", energyText);
            SetObject(hud, "healthText", healthText);
            SetObject(hud, "healthSlider", healthSlider);
            SetObject(hud, "waveText", waveText);
            SetObject(hud, "enemiesText", enemiesText);
            SetObjectArray(hud, "plants", definitions);
            SetObjectArray(hud, "plantButtons", plantButtons);
            SetObjectArray(hud, "plantButtonLabels", plantLabels);
            SetObject(hud, "selectedPlantText", selectedText);
            SetObject(hud, "resultPanel", resultPanel);
            SetObject(hud, "resultTitle", resultTitle);
            SetObject(hud, "resultDescription", resultDescription);
            SetObject(retryBinding, "button", retryButton);
            SetObject(retryBinding, "hud", hud);
            resultPanel.SetActive(false);

            CreateEventSystem();
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            EditorUtility.DisplayDialog("Farm Vs Monsters",
                "Generated the PrototypeBattle greybox scene, 3D test prefabs, and plant definitions. " +
                "Open the scene and press Play. Replace primitive visuals with final art later.",
                "OK");
        }

        private static void CreateBattleBoardDetails(Material soil, Material grass)
        {
            // Individual collider-free soil beds make the 9 x 5 placement grid readable.
            for (int x = 0; x < 9; x++)
            {
                for (int z = 0; z < 5; z++)
                {
                    GameObject bed = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    bed.name = "SoilBed_" + x + "_" + z;
                    bed.transform.position = new Vector3(
                        -6.75f + (x + 0.5f) * 1.5f, 0.025f,
                        -3.75f + (z + 0.5f) * 1.5f);
                    bed.transform.localScale = new Vector3(1.42f, 0.05f, 1.42f);
                    bed.GetComponent<Renderer>().sharedMaterial = soil;
                    UnityEngine.Object.DestroyImmediate(bed.GetComponent<Collider>());
                }
            }

            Material fence = CreateMaterial("FenceWood", new Color(0.32f, 0.18f, 0.08f));
            for (int side = -1; side <= 1; side += 2)
            {
                float x = side * 6.95f;
                CreateVisualPrimitive(PrimitiveType.Cube, null, "FenceSideLower",
                    new Vector3(x, 0.42f, 0f), new Vector3(0.16f, 0.16f, 8.1f), fence);
                CreateVisualPrimitive(PrimitiveType.Cube, null, "FenceSideUpper",
                    new Vector3(x, 0.92f, 0f), new Vector3(0.16f, 0.16f, 8.1f), fence);
                for (int z = -4; z <= 4; z += 2)
                    CreateVisualPrimitive(PrimitiveType.Cube, null, "FencePost",
                        new Vector3(x, 0.65f, z), new Vector3(0.22f, 1.3f, 0.22f), fence);
            }

            // A split front fence leaves a visible entrance in front of the farm core.
            foreach (float x in new[] { -4.25f, 4.25f })
            {
                CreateVisualPrimitive(PrimitiveType.Cube, null, "FrontFence",
                    new Vector3(x, 0.42f, -4.05f), new Vector3(5.3f, 0.16f, 0.16f), fence);
                CreateVisualPrimitive(PrimitiveType.Cube, null, "FrontFenceTop",
                    new Vector3(x, 0.92f, -4.05f), new Vector3(5.3f, 0.16f, 0.16f), fence);
            }

            GameObject lightObject = new GameObject("SunLight");
            lightObject.transform.rotation = Quaternion.Euler(52f, -32f, 0f);
            Light sun = lightObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.25f;
            sun.color = new Color(1f, 0.92f, 0.78f);
            RenderSettings.ambientLight = new Color(0.58f, 0.62f, 0.55f);

            GameObject grassBackdrop = GameObject.CreatePrimitive(PrimitiveType.Plane);
            grassBackdrop.name = "FarmBackdrop";
            grassBackdrop.transform.position = new Vector3(0f, -0.22f, 0f);
            grassBackdrop.transform.localScale = new Vector3(5f, 1f, 5f);
            grassBackdrop.GetComponent<Renderer>().sharedMaterial = grass;
        }

        private static GameObject CreateProjectilePrefab(Material material)
        {
            GameObject root = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            root.name = "Projectile_Pea";
            root.transform.localScale = Vector3.one * 0.28f;
            root.GetComponent<Renderer>().sharedMaterial = material;
            UnityEngine.Object.DestroyImmediate(root.GetComponent<Collider>());
            Projectile projectile = root.AddComponent<Projectile>();
            SetFloat(projectile, "speed", 11f);
            SetFloat(projectile, "lifetime", 4f);
            string path = PrefabFolder + "/Projectile_Pea.prefab";
            PrefabUtility.SaveAsPrefabAsset(root, path);
            UnityEngine.Object.DestroyImmediate(root);
            return AssetDatabase.LoadAssetAtPath<GameObject>(path);
        }

        private static GameObject CreateEnergyPickupPrefab(Material material)
        {
            GameObject pickup = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            pickup.name = "EnergyPickup_Prefab";
            pickup.transform.localScale = Vector3.one * 0.42f;
            pickup.GetComponent<Renderer>().sharedMaterial = material;
            SphereCollider collider = pickup.GetComponent<SphereCollider>();
            collider.isTrigger = true;
            Rigidbody body = pickup.AddComponent<Rigidbody>();
            body.isKinematic = true;
            body.useGravity = false;
            pickup.AddComponent<EnergyPickup>();
            string path = PrefabFolder + "/EnergyPickup.prefab";
            PrefabUtility.SaveAsPrefabAsset(pickup, path);
            UnityEngine.Object.DestroyImmediate(pickup);
            return AssetDatabase.LoadAssetAtPath<GameObject>(path);
        }

        private static GameObject CreateEnemyPrefab(string name, Material material,
            float healthValue, float speed, float damage, GameObject energyPickupPrefab)
        {
            GameObject root = new GameObject(name);
            CapsuleCollider bodyCollider = root.AddComponent<CapsuleCollider>();
            bodyCollider.height = 2f;
            bodyCollider.radius = 0.48f;
            bodyCollider.center = Vector3.zero;

            Health health = root.AddComponent<Health>();
            SetFloat(health, "maxHealth", healthValue);
            EnemyMovement movement = root.AddComponent<EnemyMovement>();
            SetFloat(movement, "moveSpeed", speed);
            SetFloat(movement, "attackRange", 1.25f);
            SetFloat(movement, "attackDamage", damage);
            SetFloat(movement, "attackInterval", 1.2f);
            root.AddComponent<EnemyMarker>();
            root.AddComponent<DestroyOnDeath>();
            EnergyDropOnDeath energyDrop = root.AddComponent<EnergyDropOnDeath>();
            SetObject(energyDrop, "pickupPrefab", energyPickupPrefab);
            SetInt(energyDrop, "energyAmount", name.Contains("Brute") ? 30 : 12);

            GameObject visuals = new GameObject("Visuals");
            visuals.transform.SetParent(root.transform, false);
            CreateVisualPrimitive(PrimitiveType.Capsule, visuals.transform, "MonsterBody",
                Vector3.zero, Vector3.one, material);
            GameObject eyeLeft = CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform,
                "Eye_Left", new Vector3(-0.18f, 0.35f, 0.36f), Vector3.one * 0.13f,
                CreateMaterial("MonsterEye", Color.white));
            GameObject eyeRight = CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform,
                "Eye_Right", new Vector3(0.18f, 0.35f, 0.36f), Vector3.one * 0.13f,
                CreateMaterial("MonsterEye", Color.white));
            CreateVisualPrimitive(PrimitiveType.Sphere, eyeLeft.transform, "Pupil",
                new Vector3(0f, 0f, 0.08f), Vector3.one * 0.06f,
                CreateMaterial("MonsterPupil", Color.black));
            CreateVisualPrimitive(PrimitiveType.Sphere, eyeRight.transform, "Pupil",
                new Vector3(0f, 0f, 0.08f), Vector3.one * 0.06f,
                CreateMaterial("MonsterPupil", Color.black));
            ProceduralIdleMotion idle = visuals.AddComponent<ProceduralIdleMotion>();
            SetFloat(idle, "bobAmplitude", 0.045f);
            SetFloat(idle, "bobFrequency", 3.2f);
            SetFloat(idle, "swayAngle", 5f);

            string path = PrefabFolder + "/" + name + ".prefab";
            PrefabUtility.SaveAsPrefabAsset(root, path);
            UnityEngine.Object.DestroyImmediate(root);
            return AssetDatabase.LoadAssetAtPath<GameObject>(path);
        }

        private static GameObject CreatePlantPrefab(string id, Material material,
            GameObject projectilePrefab, float damage, float interval, bool energyPlant, int style)
        {
            GameObject root = new GameObject("Plant_" + id);
            GameObject visuals = new GameObject("Visuals");
            visuals.transform.SetParent(root.transform, false);
            CreateVisualPrimitive(PrimitiveType.Cylinder, visuals.transform, "Stem",
                new Vector3(0f, 0.48f, 0f), new Vector3(0.25f, 0.5f, 0.25f),
                CreateMaterial(id + "_Stem", new Color(0.18f, 0.48f, 0.16f)));

            if (style == 3)
            {
                CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform, "GuardBody",
                    new Vector3(0f, 0.72f, 0f), new Vector3(1.05f, 1.0f, 0.85f), material);
            }
            else
            {
                CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform, "PlantHead",
                    new Vector3(0f, 1.25f, 0f), new Vector3(0.78f, 0.78f, 0.78f), material);
            }

            CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform, "Leaf_Left",
                new Vector3(-0.38f, 0.65f, 0.05f), new Vector3(0.5f, 0.18f, 0.28f),
                CreateMaterial(id + "_Leaf", new Color(0.2f, 0.62f, 0.18f)));
            CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform, "Leaf_Right",
                new Vector3(0.38f, 0.65f, 0.05f), new Vector3(0.5f, 0.18f, 0.28f),
                CreateMaterial(id + "_Leaf", new Color(0.2f, 0.62f, 0.18f)));

            if (style == 0)
            {
                for (int i = 0; i < 8; i++)
                {
                    float angle = i * Mathf.PI * 2f / 8f;
                    CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform, "Petal_" + i,
                        new Vector3(Mathf.Cos(angle) * 0.48f, 1.28f + Mathf.Sin(angle) * 0.48f, 0f),
                        new Vector3(0.34f, 0.34f, 0.22f), material);
                }
                CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform, "FlowerCenter",
                    new Vector3(0f, 1.28f, 0.2f), Vector3.one * 0.36f,
                    CreateMaterial("SunflowerCenter", new Color(0.48f, 0.22f, 0.05f)));
            }

            Transform muzzle = null;
            if (!energyPlant)
            {
                GameObject barrel = CreateVisualPrimitive(PrimitiveType.Sphere, visuals.transform,
                    "Muzzle", new Vector3(0f, 1.28f, 0.48f),
                    new Vector3(0.42f, 0.32f, 0.48f), material);
                muzzle = barrel.transform;
                PlantCombatController combat = root.AddComponent<PlantCombatController>();
                SetObject(combat, "muzzle", muzzle);
                SetObject(combat, "projectilePrefab", projectilePrefab.GetComponent<Projectile>());
                SetFloat(combat, "attackRange", style == 3 ? 4.5f : 8f);
                SetFloat(combat, "attackInterval", interval);
                SetFloat(combat, "damage", damage);
            }
            else
            {
                TimedEnergyGenerator generator = root.AddComponent<TimedEnergyGenerator>();
                SetInt(generator, "energyPerTick", 20);
                SetFloat(generator, "intervalSeconds", 7f);
                SetBool(generator, "generateImmediately", false);
            }

            ProceduralIdleMotion idle = visuals.AddComponent<ProceduralIdleMotion>();
            SetFloat(idle, "bobAmplitude", 0.025f);
            SetFloat(idle, "bobFrequency", 2.1f);
            SetFloat(idle, "swayAngle", 4f);
            SetFloat(idle, "phaseOffset", style * 0.55f);

            string path = PrefabFolder + "/Plant_" + id + ".prefab";
            PrefabUtility.SaveAsPrefabAsset(root, path);
            UnityEngine.Object.DestroyImmediate(root);
            return AssetDatabase.LoadAssetAtPath<GameObject>(path);
        }

        private static PlantDefinition CreatePlantDefinition(string id, string displayName,
            int cost, GameObject prefab)
        {
            string path = PlantFolder + "/Plant_" + id + ".asset";
            AssetDatabase.DeleteAsset(path);
            PlantDefinition definition = ScriptableObject.CreateInstance<PlantDefinition>();
            SerializedObject so = new SerializedObject(definition);
            so.FindProperty("plantId").stringValue = "plant." + id;
            so.FindProperty("displayName").stringValue = displayName;
            so.FindProperty("energyCost").intValue = cost;
            so.FindProperty("placementCooldown").floatValue = 0.35f;
            so.FindProperty("prefab").objectReferenceValue = prefab;
            so.ApplyModifiedPropertiesWithoutUndo();
            AssetDatabase.CreateAsset(definition, path);
            return definition;
        }

        private static void ConfigureWaves(WaveManager manager, GameObject grunt, GameObject boss)
        {
            SerializedObject so = new SerializedObject(manager);
            SerializedProperty waves = so.FindProperty("waves");
            waves.arraySize = 3;
            GameObject[][] compositions =
            {
                new[] { grunt, grunt, grunt, grunt },
                new[] { grunt, grunt, grunt, grunt, grunt, grunt },
                new[] { grunt, grunt, grunt, grunt, grunt, boss, boss }
            };
            string[] names = { "Garden Scouts", "Growing Threat", "Brute Assault" };
            float[] intervals = { 1.1f, 0.8f, 0.65f };

            for (int i = 0; i < waves.arraySize; i++)
            {
                SerializedProperty wave = waves.GetArrayElementAtIndex(i);
                wave.FindPropertyRelative("displayName").stringValue = names[i];
                wave.FindPropertyRelative("spawnInterval").floatValue = intervals[i];
                SerializedProperty enemies = wave.FindPropertyRelative("enemyPrefabs");
                enemies.arraySize = compositions[i].Length;
                for (int j = 0; j < enemies.arraySize; j++)
                    enemies.GetArrayElementAtIndex(j).objectReferenceValue = compositions[i][j];
            }
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void CreateEnergyPickup(Vector3 position, Material material,
            EnergyWallet wallet, int amount)
        {
            GameObject pickup = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            pickup.name = "EnergyPickup";
            pickup.transform.position = position;
            pickup.transform.localScale = Vector3.one * 0.45f;
            pickup.GetComponent<Renderer>().sharedMaterial = material;
            SphereCollider collider = pickup.GetComponent<SphereCollider>();
            collider.isTrigger = true;
            Rigidbody body = pickup.AddComponent<Rigidbody>();
            body.isKinematic = true;
            body.useGravity = false;
            EnergyPickup component = pickup.AddComponent<EnergyPickup>();
            SetInt(component, "energyAmount", amount);
            SetObject(component, "targetWallet", wallet);
        }

        private static Text CreateText(Transform parent, string name, string value,
            Vector2 position, Vector2 size, Vector2 anchor, int fontSize,
            TextAnchor alignment = TextAnchor.MiddleLeft)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            Text text = go.GetComponent<Text>();
            text.text = value;
            text.font = GetBuiltinFont();
            text.fontSize = fontSize;
            text.color = Color.white;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            return text;
        }

        private static Slider CreateHealthSlider(Transform parent)
        {
            GameObject go = new GameObject("FarmHealthSlider", typeof(RectTransform), typeof(Slider));
            go.transform.SetParent(parent, false);
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = new Vector2(30f, -116f);
            rect.sizeDelta = new Vector2(260f, 18f);

            Image background = CreateImage(go.transform, "Background", new Color(0.08f, 0.08f, 0.08f, 0.85f));
            Stretch(background.rectTransform);
            Image fill = CreateImage(go.transform, "Fill", new Color(0.25f, 0.82f, 0.3f, 1f));
            Stretch(fill.rectTransform);

            Slider slider = go.GetComponent<Slider>();
            slider.fillRect = fill.rectTransform;
            slider.targetGraphic = background;
            slider.minValue = 0f;
            slider.maxValue = 500f;
            slider.value = 500f;
            slider.direction = Slider.Direction.LeftToRight;
            return slider;
        }

        private static GameObject CreatePanel(Transform parent, string name, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = size;
            go.GetComponent<Image>().color = new Color(0.04f, 0.06f, 0.08f, 0.94f);
            return go;
        }

        private static Button CreateButton(Transform parent, string name, string label,
            Vector2 position, Vector2 size, Vector2 anchor)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            Image image = go.GetComponent<Image>();
            image.color = new Color(0.16f, 0.32f, 0.23f, 0.96f);
            Button button = go.GetComponent<Button>();
            button.targetGraphic = image;

            Text text = CreateText(go.transform, "Label", label, Vector2.zero, size,
                new Vector2(0.5f, 0.5f), 18, TextAnchor.MiddleCenter);
            Stretch(text.rectTransform);
            text.fontSize = 17;
            return button;
        }

        private static Image CreateImage(Transform parent, string name, Color color)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            Image image = go.GetComponent<Image>();
            image.color = color;
            return image;
        }

        private static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        private static void CreateEventSystem()
        {
            if (EventSystem.current != null) return;
            GameObject eventSystem = new GameObject("EventSystem",
                typeof(EventSystem), typeof(StandaloneInputModule));
        }

        private static GameObject CreateVisualPrimitive(PrimitiveType type, Transform parent,
            string name, Vector3 localPosition, Vector3 localScale, Material material)
        {
            GameObject visual = GameObject.CreatePrimitive(type);
            visual.name = name;
            visual.transform.SetParent(parent, false);
            visual.transform.localPosition = localPosition;
            visual.transform.localScale = localScale;
            Renderer renderer = visual.GetComponent<Renderer>();
            if (renderer != null) renderer.sharedMaterial = material;
            Collider collider = visual.GetComponent<Collider>();
            if (collider != null) UnityEngine.Object.DestroyImmediate(collider);
            return visual;
        }

        private static Material CreateMaterial(string name, Color color)
        {
            string path = MaterialFolder + "/" + name + ".mat";
            Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                Shader shader = Shader.Find("Universal Render Pipeline/Lit");
                if (shader == null) shader = Shader.Find("Standard");
                if (shader == null) shader = Shader.Find("Unlit/Color");
                material = new Material(shader);
                AssetDatabase.CreateAsset(material, path);
            }
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            EditorUtility.SetDirty(material);
            return material;
        }

        private static Font GetBuiltinFont()
        {
            Font font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null) font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            return font;
        }

        private static void EnsureFolder(string parent, string name)
        {
            string path = parent + "/" + name;
            if (!AssetDatabase.IsValidFolder(path))
                AssetDatabase.CreateFolder(parent, name);
        }

        private static void SetObject(UnityEngine.Object target, string property, UnityEngine.Object value)
        {
            SerializedObject so = new SerializedObject(target);
            SerializedProperty p = so.FindProperty(property);
            if (p == null) return;
            p.objectReferenceValue = value;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetObjectArray(UnityEngine.Object target, string property, UnityEngine.Object[] values)
        {
            SerializedObject so = new SerializedObject(target);
            SerializedProperty p = so.FindProperty(property);
            if (p == null || !p.isArray) return;
            p.arraySize = values != null ? values.Length : 0;
            for (int i = 0; i < p.arraySize; i++)
                p.GetArrayElementAtIndex(i).objectReferenceValue = values[i];
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetInt(UnityEngine.Object target, string property, int value)
        {
            SerializedObject so = new SerializedObject(target);
            SerializedProperty p = so.FindProperty(property);
            if (p == null) return;
            p.intValue = value;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetFloat(UnityEngine.Object target, string property, float value)
        {
            SerializedObject so = new SerializedObject(target);
            SerializedProperty p = so.FindProperty(property);
            if (p == null) return;
            p.floatValue = value;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetBool(UnityEngine.Object target, string property, bool value)
        {
            SerializedObject so = new SerializedObject(target);
            SerializedProperty p = so.FindProperty(property);
            if (p == null) return;
            p.boolValue = value;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetVector3(UnityEngine.Object target, string property, Vector3 value)
        {
            SerializedObject so = new SerializedObject(target);
            SerializedProperty p = so.FindProperty(property);
            if (p == null) return;
            p.vector3Value = value;
            so.ApplyModifiedPropertiesWithoutUndo();
        }
    }
}
#endif
