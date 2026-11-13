#if UNITY_EDITOR
using System.Collections.Generic;
using FarmVsMonsters.UI;
using FarmVsMonsters.Player;
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

            for (int x = -1; x <= 1; x++)
            {
                for (int z = -1; z <= 1; z++)
                {
                    GameObject plot = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    plot.name = "FarmPlot_" + (x + 1) + "_" + (z + 1);
                    plot.transform.position = new Vector3(x * 2.2f, 0.08f, z * 2.2f);
                    plot.transform.localScale = new Vector3(1.8f, 0.16f, 1.8f);
                    plot.GetComponent<Renderer>().sharedMaterial = soil;
                    GameObject crop = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    crop.name = "CropPlaceholder";
                    crop.transform.position = plot.transform.position + Vector3.up * 0.72f;
                    crop.transform.localScale = new Vector3(0.55f, 1.1f, 0.55f);
                    crop.GetComponent<Renderer>().sharedMaterial = leaf;
                    Object.DestroyImmediate(crop.GetComponent<Collider>());
                }
            }

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
            Button battleButton = CreateButton(canvas.transform, "EnterBattleButton",
                "ENTER BATTLE", new Vector2(0f, 42f), new Vector2(300f, 76f));
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