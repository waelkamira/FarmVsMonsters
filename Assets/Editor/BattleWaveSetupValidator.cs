using System.Collections.Generic;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using UnityEditor;
using UnityEngine;

namespace FarmVsMonsters.Editor
{
    /// <summary>Checks the scene's 2D wave setup before entering Play Mode.</summary>
    public static class BattleWaveSetupValidator
    {
        [MenuItem("Tools/Farm Vs Monsters/Validate Selected Battle Wave Manager")]
        private static void ValidateSelected()
        {
            GameObject selected = Selection.activeGameObject;
            if (selected == null)
            {
                Debug.LogError("Select the GameObject that contains WaveManager.", selected);
                return;
            }

            WaveManager manager = selected.GetComponent<WaveManager>();
            if (manager == null)
            {
                Debug.LogError("Selected object does not contain WaveManager.", selected);
                return;
            }

            var serialized = new SerializedObject(manager);
            int errors = 0;
            int warnings = 0;

            SerializedProperty spawnPoints = serialized.FindProperty("spawnPoints");
            var laneYs = new HashSet<int>();
            if (spawnPoints == null || spawnPoints.arraySize == 0)
            {
                Error("Assign at least one monster spawn point.", selected, ref errors);
            }
            else
            {
                if (spawnPoints.arraySize != 5)
                    Warning("The current battle design uses five lanes; configure five spawn points unless this scene intentionally uses a different lane count.", selected, ref warnings);

                for (int i = 0; i < spawnPoints.arraySize; i++)
                {
                    Transform point = spawnPoints.GetArrayElementAtIndex(i).objectReferenceValue as Transform;
                    if (point == null)
                    {
                        Error("Spawn point slot " + i + " is empty.", selected, ref errors);
                        continue;
                    }

                    int laneKey = Mathf.RoundToInt(point.position.y * 100f);
                    if (!laneYs.Add(laneKey))
                        Warning("Spawn points " + i + " share a lane height. Give each lane a distinct world Y coordinate.", point.gameObject, ref warnings);
                }
            }

            SerializedProperty target = serialized.FindProperty("enemyTarget");
            SerializedProperty targetHealth = serialized.FindProperty("enemyTargetHealth");
            if (target == null || target.objectReferenceValue == null)
                Error("Assign the farmhouse as the fallback enemy target.", selected, ref errors);
            if (targetHealth == null || targetHealth.objectReferenceValue == null)
                Error("Assign the fallback farmhouse Health component.", selected, ref errors);
            else if (target != null && target.objectReferenceValue != null)
            {
                Transform targetTransform = target.objectReferenceValue as Transform;
                Health health = targetHealth.objectReferenceValue as Health;
                if (targetTransform != null && health != null && health.transform != targetTransform)
                    Error("Fallback target Transform and Health must belong to the same GameObject hierarchy root.", selected, ref errors);
            }

            SerializedProperty waves = serialized.FindProperty("waves");
            if (waves == null || waves.arraySize == 0)
            {
                Error("Configure at least one wave.", selected, ref errors);
            }
            else
            {
                for (int w = 0; w < waves.arraySize; w++)
                {
                    SerializedProperty wave = waves.GetArrayElementAtIndex(w);
                    ValidatePrefabArray(wave.FindPropertyRelative("enemyPrefabs"), "Wave " + (w + 1), selected, ref errors);
                    SerializedProperty groups = wave.FindPropertyRelative("enemyGroups");
                    if (groups != null)
                    {
                        for (int g = 0; g < groups.arraySize; g++)
                        {
                            SerializedProperty group = groups.GetArrayElementAtIndex(g);
                            GameObject prefab = group.FindPropertyRelative("enemyPrefab").objectReferenceValue as GameObject;
                            int count = group.FindPropertyRelative("count").intValue;
                            if (prefab == null && count > 0)
                                Error("Wave " + (w + 1) + " group " + (g + 1) + " has a count but no enemy prefab.", selected, ref errors);
                            else if (prefab != null)
                                ValidateEnemyPrefab(prefab, "Wave " + (w + 1) + " group " + (g + 1), selected, ref errors);
                        }
                    }
                }
            }

            Debug.Log("Battle wave validation finished: " + errors + " error(s), " + warnings + " warning(s).", selected);
        }

        private static void ValidatePrefabArray(SerializedProperty array, string label, GameObject context, ref int errors)
        {
            if (array == null) return;
            for (int i = 0; i < array.arraySize; i++)
            {
                GameObject prefab = array.GetArrayElementAtIndex(i).objectReferenceValue as GameObject;
                if (prefab != null)
                    ValidateEnemyPrefab(prefab, label + " prefab " + (i + 1), context, ref errors);
            }
        }

        private static void ValidateEnemyPrefab(GameObject prefab, string label, GameObject context, ref int errors)
        {
            if (prefab.GetComponent<Health>() == null)
                Error(label + " (" + prefab.name + ") is missing Health.", context, ref errors);
            if (prefab.GetComponent<EnemyMovement2D>() == null)
                Error(label + " (" + prefab.name + ") is missing EnemyMovement2D.", context, ref errors);
            if (prefab.GetComponent<Collider2D>() == null)
                Error(label + " (" + prefab.name + ") is missing Collider2D for combat and farm-target detection.", context, ref errors);
            if (prefab.GetComponent<EnemyMarker>() == null)
                Error(label + " (" + prefab.name + ") is missing EnemyMarker.", context, ref errors);
        }

        private static void Error(string message, Object context, ref int count)
        {
            count++;
            Debug.LogError("[Battle Setup] " + message, context);
        }

        private static void Warning(string message, Object context, ref int count)
        {
            count++;
            Debug.LogWarning("[Battle Setup] " + message, context);
        }
    }
}
