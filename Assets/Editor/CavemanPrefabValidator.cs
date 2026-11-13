using System.Collections.Generic;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Farm;
using FarmVsMonsters.Player;
using FarmVsMonsters.Visuals;
using UnityEditor;
using UnityEngine;

namespace FarmVsMonsters.EditorTools
{
    /// <summary>Reports missing or misconfigured components on a selected caveman prefab.</summary>
    public static class CavemanPrefabValidator
    {
        [MenuItem("Tools/Farm Vs Monsters/Validate Selected Caveman Prefab", true)]
        private static bool ValidateSelection()
        {
            return Selection.activeGameObject != null;
        }

        [MenuItem("Tools/Farm Vs Monsters/Validate Selected Caveman Prefab")]
        private static void ValidateSelected()
        {
            GameObject root = Selection.activeGameObject;
            var issues = new List<string>();

            Require<Rigidbody2D>(root, issues);
            Require<Health>(root, issues);
            Require<SpriteAnimation2D>(root, issues);
            Require<CharacterAnimationDriver2D>(root, issues);
            Require<CavemanFarmerController2D>(root, issues);
            Require<FarmPlotInteractor2D>(root, issues);
            Require<FarmAnimalCareController2D>(root, issues);

            Rigidbody2D body = root.GetComponent<Rigidbody2D>();
            if (body != null)
            {
                if (body.gravityScale != 0f)
                    issues.Add("Rigidbody2D Gravity Scale should be 0 for top-down farm movement.");
                if (!body.freezeRotation)
                    issues.Add("Rigidbody2D Freeze Rotation should be enabled.");
                if (body.bodyType == RigidbodyType2D.Static)
                    issues.Add("Rigidbody2D must not be Static; use Dynamic or Kinematic.");
            }

            if (root.GetComponent<Collider2D>() == null &&
                root.GetComponentsInChildren<Collider2D>(true).Length == 0)
                issues.Add("Add a Collider2D to the caveman root or a child.");

            if (root.GetComponentInChildren<SpriteRenderer>(true) == null)
                issues.Add("Add a SpriteRenderer to the caveman root or a child.");

            if (issues.Count == 0)
            {
                Debug.Log("Caveman prefab validation passed. Verify Inspector references and layer masks manually.", root);
                EditorUtility.DisplayDialog("Caveman Validation",
                    "Required components and basic physics settings are present.\n\n" +
                    "Still verify assigned sprites, wallet references, attack origin, movement bounds, and layer masks.", "OK");
                return;
            }

            string report = "Caveman prefab validation found " + issues.Count + " issue(s):\n\n";
            foreach (string issue in issues)
                report += "• " + issue + "\n";

            Debug.LogError(report, root);
            EditorUtility.DisplayDialog("Caveman Validation", report, "OK");
        }

        private static void Require<T>(GameObject root, List<string> issues)
            where T : Component
        {
            if (root.GetComponent<T>() == null)
                issues.Add("Missing " + typeof(T).Name + " on the selected root.");
        }
    }
}