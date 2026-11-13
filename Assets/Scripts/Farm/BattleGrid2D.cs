using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Rectangular 2D board coordinates for the classic side-view battle lane.</summary>
    public sealed class BattleGrid2D : MonoBehaviour
    {
        [SerializeField, Min(1)] private int columns = 9;
        [SerializeField, Min(1)] private int rows = 5;
        [SerializeField, Min(0.1f)] private float cellWidth = 1.25f;
        [SerializeField, Min(0.1f)] private float cellHeight = 1.25f;
        [SerializeField] private Vector2 origin = new Vector2(-5.625f, -3.125f);

        public int Columns => columns;
        public int Rows => rows;
        public float CellWidth => cellWidth;
        public float CellHeight => cellHeight;

        public bool Contains(Vector2Int cell) =>
            cell.x >= 0 && cell.x < columns && cell.y >= 0 && cell.y < rows;

        public bool TryWorldToCell(Vector2 worldPosition, out Vector2Int cell)
        {
            Vector2 local = transform.InverseTransformPoint(worldPosition);
            local -= origin;
            cell = new Vector2Int(
                Mathf.FloorToInt(local.x / cellWidth),
                Mathf.FloorToInt(local.y / cellHeight));
            return Contains(cell);
        }

        public Vector2 CellToWorld(Vector2Int cell)
        {
            Vector2 localCenter = origin + new Vector2(
                (cell.x + 0.5f) * cellWidth,
                (cell.y + 0.5f) * cellHeight);
            return transform.TransformPoint(localCenter);
        }

        /// <summary>Returns the world-space center of a lane row, respecting grid rotation and scale.</summary>
        public Vector3 GetLaneCenterWorld(int row)
        {
            row = Mathf.Clamp(row, 0, rows - 1);
            Vector2 localCenter = origin + new Vector2(
                columns * cellWidth * 0.5f,
                (row + 0.5f) * cellHeight);
            return transform.TransformPoint(localCenter);
        }

        /// <summary>Returns a point just outside the selected horizontal edge of a lane.</summary>
        public Vector3 GetLaneSpawnWorld(int row, bool rightEdge, float outsideDistance)
        {
            row = Mathf.Clamp(row, 0, rows - 1);
            float localX = rightEdge
                ? origin.x + columns * cellWidth + Mathf.Max(0f, outsideDistance)
                : origin.x - Mathf.Max(0f, outsideDistance);
            Vector2 local = new Vector2(localX,
                origin.y + (row + 0.5f) * cellHeight);
            return transform.TransformPoint(local);
        }

        private void OnValidate()
        {
            columns = Mathf.Max(1, columns);
            rows = Mathf.Max(1, rows);
            cellWidth = Mathf.Max(0.1f, cellWidth);
            cellHeight = Mathf.Max(0.1f, cellHeight);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(0.25f, 0.85f, 0.55f, 0.8f);
            for (int x = 0; x <= columns; x++)
            {
                Vector3 a = transform.TransformPoint(origin + new Vector2(x * cellWidth, 0f));
                Vector3 b = transform.TransformPoint(origin + new Vector2(x * cellWidth, rows * cellHeight));
                Gizmos.DrawLine(a, b);
            }
            for (int y = 0; y <= rows; y++)
            {
                Vector3 a = transform.TransformPoint(origin + new Vector2(0f, y * cellHeight));
                Vector3 b = transform.TransformPoint(origin + new Vector2(columns * cellWidth, y * cellHeight));
                Gizmos.DrawLine(a, b);
            }
        }
    }
}
