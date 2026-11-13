using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>World/grid coordinate conversion for the tactical battle board.</summary>
    public sealed class BattleGrid : MonoBehaviour
    {
        [SerializeField, Min(1)] private int columns = 9;
        [SerializeField, Min(1)] private int rows = 5;
        [SerializeField, Min(0.1f)] private float cellSize = 1.5f;
        [SerializeField] private Vector3 origin;

        public int Columns => columns;
        public int Rows => rows;
        public float CellSize => cellSize;

        public bool Contains(Vector2Int cell) =>
            cell.x >= 0 && cell.x < columns && cell.y >= 0 && cell.y < rows;

        public bool TryWorldToCell(Vector3 worldPosition, out Vector2Int cell)
        {
            Vector3 local = transform.InverseTransformPoint(worldPosition) - origin;
            cell = new Vector2Int(
                Mathf.FloorToInt(local.x / cellSize),
                Mathf.FloorToInt(local.z / cellSize));
            return Contains(cell);
        }

        public Vector3 CellToWorld(Vector2Int cell)
        {
            Vector3 localCenter = origin + new Vector3(
                (cell.x + 0.5f) * cellSize,
                0f,
                (cell.y + 0.5f) * cellSize);
            return transform.TransformPoint(localCenter);
        }

#if UNITY_EDITOR
        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(0.25f, 0.85f, 0.55f, 0.8f);
            Vector3 basePoint = transform.TransformPoint(origin);
            for (int x = 0; x <= columns; x++)
            {
                Vector3 a = basePoint + transform.right * (x * cellSize);
                Vector3 b = a + transform.forward * (rows * cellSize);
                Gizmos.DrawLine(a, b);
            }
            for (int z = 0; z <= rows; z++)
            {
                Vector3 a = basePoint + transform.forward * (z * cellSize);
                Vector3 b = a + transform.right * (columns * cellSize);
                Gizmos.DrawLine(a, b);
            }
        }
#endif
    }
}
