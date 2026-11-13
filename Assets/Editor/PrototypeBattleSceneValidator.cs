#if UNITY_EDITOR
using System.Collections.Generic;
using FarmVsMonsters.Battle;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Farm;
using FarmVsMonsters.Input;
using FarmVsMonsters.Plants;
using FarmVsMonsters.Player;
using FarmVsMonsters.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;

namespace FarmVsMonsters.EditorTools
{
    /// <summary>Checks generated prototype scene wiring without starting Play Mode.</summary>
    public static class PrototypeBattleSceneValidator
    {
        private const string ScenePath = "Assets/Scenes/PrototypeBattle.unity";

        [MenuItem("Farm Vs Monsters/Validate Prototype Battle Scene")]
        public static void Validate()
        {
            if (!AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath))
            {
                EditorUtility.DisplayDialog("Prototype validation",
                    "PrototypeBattle.unity was not found. Run Generate Prototype Battle Scene first.", "OK");
                return;
            }

            Scene scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Additive);
            var errors = new List<string>();
            var warnings = new List<string>();

            BattleGrid grid = FindComponent<BattleGrid>(scene);
            EnergyWallet wallet = FindComponent<EnergyWallet>(scene);
            PlantPlacementService placement = FindComponent<PlantPlacementService>(scene);
            WaveManager waves = FindComponent<WaveManager>(scene);
            BattleOutcomeController outcome = FindComponent<BattleOutcomeController>(scene);
            DesktopBattleInput desktop = FindComponent<DesktopBattleInput>(scene);
            BattleHudController hud = FindComponent<BattleHudController>(scene);
            EventSystem eventSystem = FindComponent<EventSystem>(scene);
            SceneNavigationButton returnToFarm = FindComponent<SceneNavigationButton>(scene);

            Require(grid != null, "BattleGrid component is missing.", errors);
            Require(wallet != null, "EnergyWallet component is missing.", errors);
            Require(placement != null, "PlantPlacementService component is missing.", errors);
            Require(waves != null, "WaveManager component is missing.", errors);
            Require(outcome != null, "BattleOutcomeController component is missing.", errors);
            Require(desktop != null, "DesktopBattleInput component is missing.", errors);
            Require(hud != null, "BattleHudController component is missing.", errors);
            Require(eventSystem != null, "EventSystem is missing; HUD buttons will not receive input.", errors);
            Require(returnToFarm != null, "Battle result panel has no return-to-farm navigation button.", errors);
            if (returnToFarm != null)
            {
                SerializedObject navigationSo = new SerializedObject(returnToFarm);
                Require(navigationSo.FindProperty("button").objectReferenceValue != null,
                    "Return-to-farm navigation has no Button reference.", errors);
                Require(navigationSo.FindProperty("targetScene").stringValue == "FarmHub",
                    "Return-to-farm button must target the FarmHub scene.", errors);
            }

            if (placement != null)
            {
                SerializedObject so = new SerializedObject(placement);
                Require(so.FindProperty("battleGrid").objectReferenceValue != null,
                    "PlantPlacementService has no BattleGrid reference.", errors);
                Require(so.FindProperty("energyWallet").objectReferenceValue != null,
                    "PlantPlacementService has no EnergyWallet reference.", errors);
                Require(so.FindProperty("plantRoot").objectReferenceValue != null,
                    "PlantPlacementService has no plant root.", errors);
            }

            if (waves != null)
            {
                SerializedObject so = new SerializedObject(waves);
                SerializedProperty waveArray = so.FindProperty("waves");
                SerializedProperty spawnArray = so.FindProperty("spawnPoints");
                Require(waveArray != null && waveArray.arraySize >= 3,
                    "WaveManager must contain at least three configured waves.", errors);
                Require(spawnArray != null && spawnArray.arraySize >= 1,
                    "WaveManager has no enemy spawn points.", errors);
                Require(so.FindProperty("energyWallet").objectReferenceValue != null,
                    "WaveManager has no EnergyWallet for enemy energy drops.", errors);
                Require(so.FindProperty("enemyTarget").objectReferenceValue != null,
                    "WaveManager has no protected target transform.", errors);
                Require(so.FindProperty("enemyTargetHealth").objectReferenceValue != null,
                    "WaveManager has no protected target Health.", errors);
            }

            if (outcome != null)
            {
                SerializedObject so = new SerializedObject(outcome);
                Require(so.FindProperty("waveManager").objectReferenceValue != null,
                    "BattleOutcomeController has no WaveManager reference.", errors);
                Require(so.FindProperty("protectedTargetHealth").objectReferenceValue != null,
                    "BattleOutcomeController has no protected target Health.", errors);
                Require(so.FindProperty("rewardWallet").objectReferenceValue != null,
                    "BattleOutcomeController has no EnergyWallet reward reference.", errors);
            }

            ValidateGeneratedPrefabs(errors);

            if (hud != null)
            {
                SerializedObject so = new SerializedObject(hud);
                SerializedProperty plants = so.FindProperty("plants");
                SerializedProperty buttons = so.FindProperty("plantButtons");
                Require(plants != null && plants.arraySize == 5,
                    "Battle HUD must reference all five plant definitions.", errors);
                Require(buttons != null && buttons.arraySize == 5,
                    "Battle HUD must reference five plant selection buttons.", errors);
            }

            foreach (GameObject root in scene.GetRootGameObjects())
            {
                MonoBehaviour[] behaviours = root.GetComponentsInChildren<MonoBehaviour>(true);
                foreach (MonoBehaviour behaviour in behaviours)
                    if (behaviour == null)
                        errors.Add("A missing MonoBehaviour script exists under " + root.name + ".");
            }

            bool inBuildSettings = false;
            foreach (EditorBuildSettingsScene buildScene in EditorBuildSettings.scenes)
                if (buildScene.enabled && buildScene.path == ScenePath)
                    inBuildSettings = true;
            Require(inBuildSettings, "PrototypeBattle is not enabled in Build Settings.", errors);
            const string farmHubPath = "Assets/Scenes/FarmHub.unity";
            bool farmHubExists = AssetDatabase.LoadAssetAtPath<SceneAsset>(farmHubPath) != null;
            if (!farmHubExists)
            {
                warnings.Add("FarmHub.unity has not been generated yet. Run Generate Farm Hub Scene to enable the return flow.");
            }
            else
            {
                Scene farmScene = EditorSceneManager.OpenScene(farmHubPath, OpenSceneMode.Additive);
                Camera farmCamera = FindComponent<Camera>(farmScene);
                Canvas farmCanvas = FindComponent<Canvas>(farmScene);
                EventSystem farmEventSystem = FindComponent<EventSystem>(farmScene);
                SceneNavigationButton enterBattle = FindComponent<SceneNavigationButton>(farmScene);
                FarmHubPlayerController farmPlayer = FindComponent<FarmHubPlayerController>(farmScene);
                Require(farmCamera != null, "FarmHub has no camera.", errors);
                Require(farmCanvas != null, "FarmHub has no UI Canvas.", errors);
                Require(farmEventSystem != null, "FarmHub has no EventSystem.", errors);
                Require(enterBattle != null, "FarmHub has no Enter Battle navigation.", errors);
                Require(farmPlayer != null, "FarmHub has no controllable player.", errors);
                if (farmPlayer != null)
                    Require(farmPlayer.GetComponent<CharacterController>() != null,
                        "FarmHub player requires a CharacterController.", errors);
                if (enterBattle != null)
                {
                    SerializedObject enterSo = new SerializedObject(enterBattle);
                    Require(enterSo.FindProperty("button").objectReferenceValue != null,
                        "FarmHub Enter Battle navigation has no Button reference.", errors);
                    Require(enterSo.FindProperty("targetScene").stringValue == "PrototypeBattle",
                        "FarmHub Enter Battle button must target PrototypeBattle.", errors);
                }
                bool farmInBuildSettings = false;
                foreach (EditorBuildSettingsScene buildScene in EditorBuildSettings.scenes)
                    if (buildScene.enabled && buildScene.path == farmHubPath)
                        farmInBuildSettings = true;
                Require(farmInBuildSettings, "FarmHub is not enabled in Build Settings.", errors);
                EditorSceneManager.CloseScene(farmScene, true);
            }

            if (grid != null && wallet != null && placement != null && waves != null &&
                outcome != null && desktop != null && hud != null && eventSystem != null &&
                returnToFarm != null)
                warnings.Add("Scene references passed structural checks. This does not replace a Unity compile or Play Mode test.");

            EditorSceneManager.CloseScene(scene, true);
            string report = errors.Count == 0
                ? "No structural wiring errors were found.\n\n" + string.Join("\n", warnings)
                : "Found " + errors.Count + " issue(s):\n\n- " + string.Join("\n- ", errors);
            Debug.Log("[Farm Vs Monsters] Prototype validation\n" + report);
            EditorUtility.DisplayDialog("Prototype validation", report, "OK");
        }

        private static void ValidateGeneratedPrefabs(List<string> errors)
        {
            GameObject grunt = AssetDatabase.LoadAssetAtPath<GameObject>(
                "Assets/Prefabs/Generated/Monster_Grunt.prefab");
            GameObject brute = AssetDatabase.LoadAssetAtPath<GameObject>(
                "Assets/Prefabs/Generated/Monster_Brute.prefab");
            GameObject energyPickup = AssetDatabase.LoadAssetAtPath<GameObject>(
                "Assets/Prefabs/Generated/EnergyPickup.prefab");
            GameObject projectile = AssetDatabase.LoadAssetAtPath<GameObject>(
                "Assets/Prefabs/Generated/Projectile_Pea.prefab");

            ValidateMonsterPrefab(grunt, "Monster_Grunt", errors);
            ValidateMonsterPrefab(brute, "Monster_Brute", errors);
            Require(energyPickup != null && energyPickup.GetComponent<EnergyPickup>() != null,
                "EnergyPickup prefab is missing.", errors);
            if (energyPickup != null)
            {
                Collider pickupCollider = energyPickup.GetComponent<Collider>();
                Require(pickupCollider != null && pickupCollider.isTrigger,
                    "EnergyPickup prefab needs a trigger collider.", errors);
                Require(energyPickup.GetComponent<Rigidbody>() != null,
                    "EnergyPickup prefab needs a Rigidbody for trigger callbacks.", errors);
            }
            Require(projectile != null && projectile.GetComponent<Projectile>() != null,
                "Projectile prefab is missing or has no Projectile component.", errors);

            string[] ids = { "sunflower", "pea_shooter", "ice_bloom", "pumpkin_guard", "fire_pepper" };
            foreach (string id in ids)
            {
                PlantDefinition definition = AssetDatabase.LoadAssetAtPath<PlantDefinition>(
                    "Assets/ScriptableObjects/Plants/Plant_" + id + ".asset");
                Require(definition != null && definition.Prefab != null,
                    "Plant definition/prefab is missing: " + id, errors);
                if (definition == null || definition.Prefab == null) continue;

                if (id == "sunflower")
                    Require(definition.Prefab.GetComponent<TimedEnergyGenerator>() != null,
                        "Sunflower prefab is missing TimedEnergyGenerator.", errors);
                else
                {
                    PlantCombatController combat =
                        definition.Prefab.GetComponent<PlantCombatController>();
                    Require(combat != null, "Plant combat component is missing: " + id, errors);
                    if (combat != null)
                    {
                        SerializedObject combatSo = new SerializedObject(combat);
                        Require(combatSo.FindProperty("projectilePrefab").objectReferenceValue != null,
                            "Plant projectile reference is missing: " + id, errors);
                    }
                }
            }
        }

        private static void ValidateMonsterPrefab(GameObject prefab, string label, List<string> errors)
        {
            Require(prefab != null, label + " prefab is missing.", errors);
            if (prefab == null) return;
            Require(prefab.GetComponent<Health>() != null, label + " has no Health.", errors);
            Require(prefab.GetComponent<EnemyMovement>() != null, label + " has no EnemyMovement.", errors);
            Require(prefab.GetComponent<EnemyMarker>() != null, label + " has no EnemyMarker.", errors);
            Require(prefab.GetComponent<DestroyOnDeath>() != null, label + " has no DestroyOnDeath.", errors);
            Require(prefab.GetComponent<EnergyDropOnDeath>() != null, label + " has no EnergyDropOnDeath.", errors);
        }

        private static T FindComponent<T>(Scene scene) where T : Component
        {
            foreach (GameObject root in scene.GetRootGameObjects())
            {
                T component = root.GetComponentInChildren<T>(true);
                if (component != null) return component;
            }
            return null;
        }

        private static void Require(bool condition, string message, List<string> errors)
        {
            if (!condition) errors.Add(message);
        }
    }
}
#endif
