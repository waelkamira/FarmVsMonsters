using FarmVsMonsters.Combat;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>
    /// Marks a farm object that monsters can stop to eat or destroy.
    /// Attach beside Health and a Collider2D on the target root.
    /// </summary>
    [RequireComponent(typeof(Health))]
    public sealed class FarmDefenseTarget2D : MonoBehaviour
    {
        public enum TargetKind
        {
            Crop = 0,
            Plant = 1,
            Animal = 2,
            Farmhouse = 3,
            Princess = 4,
            Obstacle = 5
        }

        [SerializeField] private TargetKind targetKind = TargetKind.Plant;
        [SerializeField, Min(0)] private int monsterPriority = 10;
        [SerializeField] private bool laneBound = true;
        [SerializeField, Min(0f)] private float laneTolerance = 0.5f;
        [SerializeField] private bool blocksMonsterMovement = true;

        public Health Health { get; private set; }
        public TargetKind Kind => targetKind;
        public int MonsterPriority => monsterPriority;
        public bool LaneBound => laneBound;
        public float LaneTolerance => laneTolerance;
        public bool BlocksMonsterMovement => blocksMonsterMovement;
        public int LaneRow { get; private set; } = -1;
        private float assignedLaneWorldY;
        private bool hasAssignedLane;

        /// <summary>Forces this planted target to belong to its actual board row.</summary>
        public void AssignLane(int row, float laneWorldY)
        {
            LaneRow = Mathf.Max(0, row);
            assignedLaneWorldY = laneWorldY;
            hasAssignedLane = true;
            laneBound = true;
        }

        private void Awake()
        {
            Health = GetComponent<Health>();
        }

        public bool CanBeTargetedFromLane(float laneY)
        {
            if (!laneBound) return true;
            float targetLaneY = hasAssignedLane ? assignedLaneWorldY : transform.position.y;
            return Mathf.Abs(targetLaneY - laneY) <= laneTolerance;
        }
    }
}