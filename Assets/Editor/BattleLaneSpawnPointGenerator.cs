using System.Collections.Generic;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Farm;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace FarmVsMonsters.Editor
{
    /// <summary>Creates one monster spawn transform per battle-grid row.</summary>
    public static class BattleLaneSpawnPointGenerator
    {
        private const string GeneratedPrefix = "__GeneratedMonsterSpawn_Lane_";
        private const float DefaultOutsideDistance = 1.5f;

        [MenuItem("Tools/Farm Vs Monsters/Generate Monster Spawn Points/Right Edge")]
        private static void GenerateRight() => Generate(true);

        [MenuItem("Tools/Farm Vs Monsters/Generate Monster Spawn Points/Left Edge")]
        private static void GenerateLeft() => Generate(false);

        private static void Generate(bool rightEdge)
        {
            GameObject selected = Selection.activeGameObject;
            BattleGrid2D grid = selected != null ? selected.GetComponent<BattleGrid2D>() : null;
            if (grid == null)
            {
                Debug.LogError("Select the GameObject containing BattleGrid2D before generating spawn points.", selected);
                return;
            }

            if (!EditorUtility.DisplayDialog(
                "Generate monster spawn points",
                "This replaces only previously generated spawn-point children under the selected grid and assigns the new points when exactly one WaveManager exists in the active scene. Continue?",
                "Generate", "Cancel"))
                return;

            var oldGenerated = new List<GameObject>();
            for (int i = grid.transform.childCount - 1; i >= 0; i--)
            {
                Transform child = grid.transform.GetChild(i);
                if (child.name.StartsWith(GeneratedPrefix))
                    oldGenerated.Add(child.gameObject);
            }

            foreach (GameObject old in oldGenerated)
                Undo.DestroyObjectImmediate(old);

            var points = new Transform[grid.Rows];
            for (int row = 0; row < grid.Rows; row++)
            {
                var pointObject = new GameObject(GeneratedPrefix + (row + 1));
                Undo.RegisterCreatedObjectUndo(pointObject, "Generate monster spawn point");
                pointObject.transform.SetParent(grid.transform, true);
                pointObject.transform.position = grid.GetLaneSpawnWorld(row, rightEdge, DefaultOutsideDistance);
                pointObject.transform.rotation = grid.transform.rotation;
                points[row] = pointObject.transform;
            }

            WaveManager[] managers = FindSceneWaveManagers();
            if (managers.Length == 1)
            {
                var serialized = new SerializedObject(managers[0]);
                serialized.Update();
                SerializedProperty spawnPoints = serialized.FindProperty("spawnPoints");
                spawnPoints.arraySize = points.Length;
                for (int i = 0; i < points.Length; i++)
                    spawnPoints.GetArrayElementAtIndex(i).objectReferenceValue = points[i];
                serialized.ApplyModifiedProperties();
                EditorUtility.SetDirty(managers[0]);
                EditorSceneManager.MarkSceneDirty(managers[0].gameObject.scene);
                Debug.Log("Generated and assigned " + points.Length + " monster spawn points in bottom-to-top lane order.", managers[0]);
            }
            else
            {
                Debug.LogWarning("Generated " + points.Length + " spawn points, but found " + managers.Length +
                    " WaveManager components in the active scene. Assign the generated transforms to the intended manager manually.", grid);
            }

            EditorUtility.SetDirty(grid);
            EditorSceneManager.MarkSceneDirty(grid.gameObject.scene);
            Selection.objects = points;
        }

        private static WaveManager[] FindSceneWaveManagers()
        {
            WaveManager[] all = Resources.FindObjectsOfTypeAll<WaveManager>();
            var result = new List<WaveManager>();
            foreach (WaveManager manager in all)
            {
                if (manager != null && manager.gameObject.scene.IsValid() &&
                    manager.gameObject.scene == SceneManager.GetActiveScene())
                    result.Add(manager);
            }
            return result.ToArray();
        }
    }
}
