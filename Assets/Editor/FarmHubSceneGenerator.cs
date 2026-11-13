#if UNITY_EDITOR
using System.Collections.Generic;
using FarmVsMonsters.UI;
using FarmVsMonsters.Player;
using FarmVsMonsters.Farm;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace FarmVsMonsters.EditorTools
{
    /// <summary>Creates the first farm hub scene and keeps existing Build Settings scenes.</summary>
    public static class FarmHubSceneGenerator
    {
        private const string ScenePath = "Assets/Scenes/FarmHub.unity";

        [MenuItem("Farm Vs Monsters/Generate Farm Hub Scene")]
        public static void Generate()
        {
            EnsureFolder("Assets", "Scenes");
            EnsureFolder("Assets", "Materials");
            EnsureFolder("Assets/Materials", "Generated");
            EnsureFolder("Assets", "Prefabs");
            EnsureFolder("Assets/Prefabs", "FarmCrops");
            EnsureFolder("Assets", "ScriptableObjects");
            EnsureFolder("Assets/ScriptableObjects", "FarmCrops");
            Material grass = MaterialFor("FarmHub_Grass", new Color(0.31f, 0.57f, 0.25f));
            Material wood = MaterialFor("FarmHub_Wood", new Color(0.43f, 0.25f, 0.13f));
            Material roof = MaterialFor("FarmHub_Roof", new Color(0.65f, 0.22f, 0.13f));
            Material soil = MaterialFor("FarmHub_Soil", new Color(0.30f, 0.18f, 0.11f));
            Material leaf = MaterialFor("FarmHub_Leaf", new Color(0.16f, 0.48f, 0.20f));

            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "FarmGround";
            ground.transform.localScale = new Vector3(3.2f, 1f, 3.2f);
            ground.GetComponent<Renderer>().sharedMaterial = grass;

            BuildBarn(new Vector3(-5f, 0f, 2f), wood, roof);
            BuildBarn(new Vector3(5f, 0f, 2f), wood, roof);
            BuildWindmill(new Vector3(7f, 0f, 7f), wood, roof);

            FarmCropPlot[] cropPlots = new FarmCropPlot[9];
            int plotIndex = 0;
            for (int x = -1; x <= 1; x++)
            {
                for (int z = -1; z <= 1; z++)
                {
                    GameObject plot = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    plot.name = "FarmPlot_" + (x + 1) + "_" + (z + 1);
                    plot.transform.position = new Vector3(x * 2.2f, 0.08f, z * 2.2f);
                    plot.transform.localScale = new Vector3(1.8f, 0.16f, 1.8f);
                    plot.GetComponent<Renderer>().sharedMaterial = soil;
                    cropPlots[plotIndex] = plot.AddComponent<FarmCropPlot>();
                    SerializedObject plotSo = new SerializedObject(cropPlots[plotIndex]);
                    plotSo.FindProperty("plotId").stringValue = "farmhub.plot." + (plotIndex + 1).ToString("00");
                    plotSo.ApplyModifiedPropertiesWithoutUndo();
                    plotIndex++;
                }
            }

            GameObject stageOne = CreateCropStagePrefab("Wheat_Stage_Seedling", leaf, 0.65f);
            GameObject stageTwo = CreateCropStagePrefab("Wheat_Stage_Mature", leaf, 1.15f);
            FarmCropDefinition wheat = CreateWheatDefinition(stageOne, stageTwo);

            GameObject cropVisualRoot = new GameObject("CropVisuals");
            GameObject farmEconomy = new GameObject("FarmEconomy");
            FarmResourceWallet resourceWallet = farmEconomy.AddComponent<FarmResourceWallet>();
            FarmCropService cropService = farmEconomy.AddComponent<FarmCropService>();
            SerializedObject cropServiceSo = new SerializedObject(cropService);
            SetObjectArray(cropServiceSo, "plots", cropPlots);
            SetObjectArray(cropServiceSo, "cropCatalogue", new UnityEngine.Object[] { wheat });
            cropServiceSo.FindProperty("cropVisualRoot").objectReferenceValue = cropVisualRoot.transform;
            cropServiceSo.FindProperty("resourceWallet").objectReferenceValue = resourceWallet;
            cropServiceSo.ApplyModifiedPropertiesWithoutUndo();

            GameObject farmer = new GameObject("FarmHubPlayer");
            farmer.transform.position = new Vector3(0f, 0f, -5f);
            CharacterController character = farmer.AddComponent<CharacterController>();
            character.height = 1.8f;
            character.radius = 0.38f;
            character.center = new Vector3(0f, 0.9f, 0f);
            GameObject farmerVisual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            farmerVisual.name = "FarmerVisual";
            farmerVisual.transform.SetParent(farmer.transform, false);
            farmerVisual.transform.localPosition = Vector3.up * 0.9f;
            farmerVisual.GetComponent<Renderer>().sharedMaterial =
                MaterialFor("FarmHub_Farmer", new Color(0.25f, 0.48f, 0.88f));
            Object.DestroyImmediate(farmerVisual.GetComponent<Collider>());
            FarmHubPlayerController playerController = farmer.AddComponent<FarmHubPlayerController>();

            GameObject lightObject = new GameObject("FarmSun");
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            Light light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            RenderSettings.ambientLight = new Color(0.62f, 0.66f, 0.58f);

            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 13f;
            cameraObject.AddComponent<AudioListener>();
            cameraObject.transform.position = new Vector3(0f, 18f, -20f);
            cameraObject.transform.rotation = Quaternion.Euler(48f, 0f, 0f);
            SerializedObject playerSo = new SerializedObject(playerController);
            playerSo.FindProperty("followCamera").objectReferenceValue = cameraObject.transform;
            playerSo.ApplyModifiedPropertiesWithoutUndo();

            GameObject canvasObject = new GameObject("FarmHubHUD",
                typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;

            Text title = CreateText(canvas.transform, "FarmTitle", "YOUR FARM",
                new Vector2(0f, -38f), new Vector2(700f, 90f), new Vector2(0.5f, 1f), 42);
            Text subtitle = CreateText(canvas.transform, "FarmSubtitle",
                "Grow crops • Raise animals • Prepare your defenses",
                new Vector2(0f, -112f), new Vector2(900f, 50f), new Vector2(0.5f, 1f), 22);
            Text seedText = CreateText(canvas.transform, "SeedCount", "Seeds: 12",
                new Vector2(24f, -170f), new Vector2(220f, 36f), new Vector2(0f, 1f), 20);
            Text waterText = CreateText(canvas.transform, "WaterCount", "Water: 20",
                new Vector2(24f, -210f), new Vector2(220f, 36f), new Vector2(0f, 1f), 20);
            Button seedPackButton = CreateButtonAt(canvas.transform, "BuySeedsButton",
                "BUY 10 SEEDS", new Vector2(180f, 122f), new Vector2(250f, 58f),
                new Vector2(0f, 0f));
            Button plantWheatButton = CreateButtonAt(canvas.transform, "PlantWheatButton",
                "PLANT WHEAT", new Vector2(180f, 48f), new Vector2(250f, 58f),
                new Vector2(0f, 0f));

            Button[] harvestButtons = new Button[9];
            Button[] waterButtons = new Button[9];
            Text[] plotLabels = new Text[9];
            for (int i = 0; i < 9; i++)
            {
                float y = -205f - i * 43f;
                plotLabels[i] = CreateText(canvas.transform, "PlotStatus_" + i,
                    "Empty plot", new Vector2(-330f, y), new Vector2(180f, 34f),
                    new Vector2(1f, 1f), 16);
                waterButtons[i] = CreateButtonAt(canvas.transform, "WaterPlot_" + i,
                    "WATER", new Vector2(-142f, y), new Vector2(68f, 32f),
                    new Vector2(1f, 1f));
                harvestButtons[i] = CreateButtonAt(canvas.transform, "HarvestPlot_" + i,
                    "HARVEST", new Vector2(-66f, y), new Vector2(76f, 32f),
                    new Vector2(1f, 1f));
            }

            Button[] cropButtons = { plantWheatButton };
            Text[] cropLabels = { CreateText(canvas.transform, "WheatSeedCost",
                "Wheat • 1 seed", new Vector2(180f, 18f), new Vector2(250f, 28f),
                new Vector2(0f, 0f), 15) };

            FarmCropManagementController cropController =
                canvasObject.AddComponent<FarmCropManagementController>();
            SerializedObject cropUiSo = new SerializedObject(cropController);
            cropUiSo.FindProperty("cropService").objectReferenceValue = cropService;
            SetObjectArray(cropUiSo, "crops", new UnityEngine.Object[] { wheat });
            SetObjectArray(cropUiSo, "plots", cropPlots);
            SetObjectArray(cropUiSo, "cropButtons", cropButtons);
            SetObjectArray(cropUiSo, "cropLabels", cropLabels);
            SetObjectArray(cropUiSo, "harvestButtons", harvestButtons);
            SetObjectArray(cropUiSo, "waterButtons", waterButtons);
            SetObjectArray(cropUiSo, "plotLabels", plotLabels);
            cropUiSo.FindProperty("seedCountText").objectReferenceValue = seedText;
            cropUiSo.FindProperty("waterCountText").objectReferenceValue = waterText;
            cropUiSo.FindProperty("seedPackPurchaseButton").objectReferenceValue = seedPackButton;
            cropUiSo.FindProperty("resourceWallet").objectReferenceValue = resourceWallet;
            cropUiSo.FindProperty("seedPackAmount").intValue = 10;
            cropUiSo.FindProperty("seedPackCoinCost").intValue = 25;
            cropUiSo.ApplyModifiedPropertiesWithoutUndo();

            Button battleButton = CreateButtonAt(canvas.transform, "EnterBattleButton",
                "ENTER BATTLE", new Vector2(350f, 48f), new Vector2(300f, 76f),
                new Vector2(0.5f, 0f));
            SceneNavigationButton navigation = battleButton.gameObject.AddComponent<SceneNavigationButton>();
            SerializedObject navigationSo = new SerializedObject(navigation);
            navigationSo.FindProperty("button").objectReferenceValue = battleButton;
            navigationSo.FindProperty("targetScene").stringValue = "PrototypeBattle";
            navigationSo.ApplyModifiedPropertiesWithoutUndo();

            CreateEventSystem();
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddBuildScene(ScenePath);
            AddBuildScene("Assets/Scenes/PrototypeBattle.unity");
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorUtility.DisplayDialog("Farm Vs Monsters",
                "Generated FarmHub.unity. Generate the PrototypeBattle scene too, then use the Enter Battle button to start a run.",
                "OK");
        }

        private static void BuildBarn(Vector3 position, Material wall, Material roof)
        {
            GameObject body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Barn";
            body.transform.position = position + new Vector3(0f, 1.2f, 0f);
            body.transform.localScale = new Vector3(4f, 2.4f, 3.2f);
            body.GetComponent<Renderer>().sharedMaterial = wall;
            GameObject roofPart = GameObject.CreatePrimitive(PrimitiveType.Cube);
            roofPart.name = "BarnRoof";
            roofPart.transform.position = position + new Vector3(0f, 2.65f, 0f);
            roofPart.transform.localScale = new Vector3(4.5f, 0.5f, 3.7f);
            roofPart.transform.rotation = Quaternion.Euler(0f, 0f, 0f);
            roofPart.GetComponent<Renderer>().sharedMaterial = roof;
        }

        private static void BuildWindmill(Vector3 position, Material body, Material blade)
        {
            GameObject tower = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            tower.name = "WindmillTower";
            tower.transform.position = position + Vector3.up * 2f;
            tower.transform.localScale = new Vector3(1.1f, 2f, 1.1f);
            tower.GetComponent<Renderer>().sharedMaterial = body;
            GameObject hub = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            hub.name = "WindmillHub";
            hub.transform.position = position + new Vector3(0f, 4f, -0.65f);
            hub.transform.localScale = Vector3.one * 0.55f;
            hub.GetComponent<Renderer>().sharedMaterial = blade;
            for (int i = 0; i < 4; i++)
            {
                GameObject sail = GameObject.CreatePrimitive(PrimitiveType.Cube);
                sail.name = "WindmillSail_" + i;
                sail.transform.position = hub.transform.position;
                sail.transform.rotation = Quaternion.Euler(0f, 0f, i * 90f);
                sail.transform.localScale = new Vector3(0.22f, 2.7f, 0.16f);
                sail.transform.SetParent(hub.transform, true);
                sail.GetComponent<Renderer>().sharedMaterial = blade;
                Object.DestroyImmediate(sail.GetComponent<Collider>());
            }
        }

        private static Text CreateText(Transform parent, string objectName, string value,
            Vector2 position, Vector2 size, Vector2 anchor, int fontSize)
        {
            GameObject go = new GameObject(objectName, typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            Text text = go.GetComponent<Text>();
            text.text = value;
            text.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            text.fontSize = fontSize;
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            return text;
        }

        private static Button CreateButton(Transform parent, string objectName, string value,
            Vector2 position, Vector2 size)
        {
            GameObject go = new GameObject(objectName, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0f);
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            Image image = go.GetComponent<Image>();
            image.color = new Color(0.20f, 0.43f, 0.25f, 0.96f);
            Button button = go.GetComponent<Button>();
            button.targetGraphic = image;
            Text label = CreateText(go.transform, "Label", value, Vector2.zero, size, new Vector2(0.5f, 0.5f), 26);
            label.raycastTarget = false;
            return button;
        }

        private static Button CreateButtonAt(Transform parent, string objectName, string value,
            Vector2 position, Vector2 size, Vector2 anchor)
        {
            GameObject go = new GameObject(objectName, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.anchorMin = rect.anchorMax = anchor;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            Image image = go.GetComponent<Image>();
            image.color = objectName.StartsWith("Water")
                ? new Color(0.15f, 0.42f, 0.68f, 0.96f)
                : objectName.StartsWith("Harvest")
                    ? new Color(0.68f, 0.43f, 0.12f, 0.96f)
                    : new Color(0.20f, 0.43f, 0.25f, 0.96f);
            Button button = go.GetComponent<Button>();
            button.targetGraphic = image;
            Text label = CreateText(go.transform, "Label", value, Vector2.zero,
                size, new Vector2(0.5f, 0.5f), size.y < 40f ? 13 : 20);
            label.raycastTarget = false;
            return button;
        }

        private static void SetObjectArray(SerializedObject serializedObject, string propertyName,
            UnityEngine.Object[] values)
        {
            SerializedProperty property = serializedObject.FindProperty(propertyName);
            property.arraySize = values != null ? values.Length : 0;
            for (int i = 0; i < property.arraySize; i++)
                property.GetArrayElementAtIndex(i).objectReferenceValue = values[i];
        }

        private static void SetObjectArray(SerializedObject serializedObject, string propertyName,
            FarmCropPlot[] values)
        {
            UnityEngine.Object[] objects = new UnityEngine.Object[values.Length];
            for (int i = 0; i < values.Length; i++) objects[i] = values[i];
            SetObjectArray(serializedObject, propertyName, objects);
        }

        private static GameObject CreateCropStagePrefab(string prefabName, Material leaf, float scale)
        {
            GameObject root = new GameObject(prefabName);
            GameObject stem = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            stem.name = "Stem";
            stem.transform.SetParent(root.transform, false);
            stem.transform.localPosition = Vector3.up * (0.35f * scale);
            stem.transform.localScale = new Vector3(0.16f, 0.35f, 0.16f) * scale;
            stem.GetComponent<Renderer>().sharedMaterial = leaf;
            Object.DestroyImmediate(stem.GetComponent<Collider>());

            for (int i = 0; i < 3; i++)
            {
                GameObject leafPart = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                leafPart.name = "Leaf_" + i;
                leafPart.transform.SetParent(root.transform, false);
                leafPart.transform.localPosition = new Vector3(
                    Mathf.Cos(i * Mathf.PI * 2f / 3f) * 0.28f * scale,
                    0.55f * scale,
                    Mathf.Sin(i * Mathf.PI * 2f / 3f) * 0.28f * scale);
                leafPart.transform.localScale = new Vector3(0.48f, 0.18f, 0.28f) * scale;
                leafPart.GetComponent<Renderer>().sharedMaterial = leaf;
                Object.DestroyImmediate(leafPart.GetComponent<Collider>());
            }

            string assetPath = "Assets/Prefabs/FarmCrops/" + prefabName + ".prefab";
            PrefabUtility.SaveAsPrefabAsset(root, assetPath);
            Object.DestroyImmediate(root);
            return AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
        }

        private static FarmCropDefinition CreateWheatDefinition(GameObject seedling, GameObject mature)
        {
            const string assetPath = "Assets/ScriptableObjects/FarmCrops/Crop_Wheat.asset";
            FarmCropDefinition definition = AssetDatabase.LoadAssetAtPath<FarmCropDefinition>(assetPath);
            bool isNew = definition == null;
            if (isNew) definition = ScriptableObject.CreateInstance<FarmCropDefinition>();
            SerializedObject so = new SerializedObject(definition);
            so.FindProperty("cropId").stringValue = "crop.wheat";
            so.FindProperty("displayName").stringValue = "Wheat";
            so.FindProperty("description").stringValue = "A reliable starter crop.";
            so.FindProperty("harvestResource").enumValueIndex = (int)FarmResourceType.Wheat;
            so.FindProperty("seedCost").intValue = 1;
            so.FindProperty("harvestAmount").intValue = 3;
            so.FindProperty("growthDurationSeconds").floatValue = 90f;
            so.FindProperty("requiredStage").intValue = 1;
            so.FindProperty("wateringGrowthBoostSeconds").floatValue = 20f;
            so.FindProperty("wateringCooldownSeconds").floatValue = 30f;
            SerializedProperty stages = so.FindProperty("growthStagePrefabs");
            stages.arraySize = 2;
            stages.GetArrayElementAtIndex(0).objectReferenceValue = seedling;
            stages.GetArrayElementAtIndex(1).objectReferenceValue = mature;
            so.ApplyModifiedPropertiesWithoutUndo();
            if (isNew) AssetDatabase.CreateAsset(definition, assetPath);
            EditorUtility.SetDirty(definition);
            return definition;
        }

        private static void CreateEventSystem()
        {
            GameObject eventObject = new GameObject("EventSystem",
                typeof(EventSystem), typeof(StandaloneInputModule));
        }

        private static Material MaterialFor(string name, Color color)
        {
            string path = "Assets/Materials/Generated/" + name + ".mat";
            Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material != null) return material;
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            material = new Material(shader) { color = color };
            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        private static void EnsureFolder(string parent, string child)
        {
            string path = parent + "/" + child;
            if (!AssetDatabase.IsValidFolder(path))
                AssetDatabase.CreateFolder(parent, child);
        }

        private static void AddBuildScene(string path)
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(path) == null)
                return;
            List<EditorBuildSettingsScene> scenes = new List<EditorBuildSettingsScene>(
                EditorBuildSettings.scenes ?? new EditorBuildSettingsScene[0]);
            for (int i = 0; i < scenes.Count; i++)
                if (scenes[i].path == path)
                    return;
            scenes.Add(new EditorBuildSettingsScene(path, true));
            EditorBuildSettings.scenes = scenes.ToArray();
        }
    }
}
#endif