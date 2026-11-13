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

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(0.25f, 0.85f, 0.55f, 0.8f);
            Vector3 bottomLeft = transform.TransformPoint(origin);
            for (int x = 0; x <= columns; x++)
            {
                Vector3 a = bottomLeft + transform.right * (x * cellWidth);
                Gizmos.DrawLine(a, a + transform.up * (rows * cellHeight));
            }
            for (int y = 0; y <= rows; y++)
            {
                Vector3 a = bottomLeft + transform.up * (y * cellHeight);
                Gizmos.DrawLine(a, a + transform.right * (columns * cellWidth));
            }
        }
    }
}
