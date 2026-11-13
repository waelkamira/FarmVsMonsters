using System.Collections.Generic;
using FarmVsMonsters.Farm;
using UnityEngine;

namespace FarmVsMonsters.Visuals
{
    /// <summary>Builds lightweight runtime cell guide lines for the 2D battle board.</summary>
    [RequireComponent(typeof(BattleGrid2D))]
    public sealed class BattleGridVisual2D : MonoBehaviour
    {
        [SerializeField] private Color lineColor = new Color(0.22f, 0.31f, 0.20f, 0.5f);
        [SerializeField, Min(0.005f)] private float lineWidth = 0.025f;
        [SerializeField] private string sortingLayerName = "Default";
        [SerializeField] private int sortingOrder = -10;

        private readonly List<LineRenderer> lines = new List<LineRenderer>();
        private Material runtimeMaterial;

        private void Awake()
        {
            BuildLines();
        }

        private void BuildLines()
        {
            BattleGrid2D grid = GetComponent<BattleGrid2D>();
            if (grid == null || grid.Columns < 1 || grid.Rows < 1) return;

            Shader shader = Shader.Find("Sprites/Default");
            if (shader == null)
            {
                Debug.LogWarning("BattleGridVisual2D could not find Sprites/Default shader.", this);
                return;
            }
            runtimeMaterial = new Material(shader) { color = lineColor };

            for (int x = 0; x <= grid.Columns; x++)
            {
                Vector3 start = grid.GridPointToWorld(x, 0);
                Vector3 end = grid.GridPointToWorld(x, grid.Rows);
                CreateLine(start, end, "Grid Vertical " + x);
            }
            for (int y = 0; y <= grid.Rows; y++)
            {
                Vector3 start = grid.GridPointToWorld(0, y);
                Vector3 end = grid.GridPointToWorld(grid.Columns, y);
                CreateLine(start, end, "Grid Horizontal " + y);
            }
        }

        private void CreateLine(Vector3 start, Vector3 end, string lineName)
        {
            GameObject lineObject = new GameObject(lineName);
            lineObject.transform.SetParent(transform, true);
            LineRenderer line = lineObject.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.positionCount = 2;
            line.SetPosition(0, start);
            line.SetPosition(1, end);
            line.startWidth = lineWidth;
            line.endWidth = lineWidth;
            line.startColor = lineColor;
            line.endColor = lineColor;
            line.material = runtimeMaterial;
            line.sortingLayerName = sortingLayerName;
            line.sortingOrder = sortingOrder;
            line.numCapVertices = 2;
            lines.Add(line);
        }

        private void OnDestroy()
        {
            if (runtimeMaterial == null) return;
            if (Application.isPlaying) Destroy(runtimeMaterial);
            else DestroyImmediate(runtimeMaterial);
        }
    }
}
