using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Visuals;
using UnityEngine;

namespace FarmVsMonsters.Plants
{
    /// <summary>Finds the nearest monster on a 2D lane and fires a sprite projectile.</summary>
    public sealed class PlantCombatController2D : MonoBehaviour
    {
        [SerializeField] private Transform muzzle;
        [SerializeField] private Projectile2D projectilePrefab;
        [SerializeField, Min(0.1f)] private float attackRange = 9f;
        [SerializeField, Min(0f)] private float laneTolerance = 0.45f;
        [SerializeField, Min(0.05f)] private float attackInterval = 1.15f;
        [SerializeField, Min(0f)] private float damage = 12f;
        [SerializeField, Range(0.1f, 1f)] private float slowMultiplier = 1f;
        [SerializeField, Min(0f)] private float slowDuration;
        [SerializeField] private LayerMask targetLayers = ~0;
        [SerializeField, Min(1)] private int maxTargetsPerScan = 32;

        private Collider2D[] results;
        private CharacterAnimationDriver2D animationDriver;
        private float attackTimer;
        private float assignedLaneWorldY;
        private bool hasAssignedLane;

        public int LaneRow { get; private set; } = -1;

        /// <summary>Locks this planted defender's target scan to the row where it was placed.</summary>
        public void AssignLane(int row, float laneWorldY)
        {
            LaneRow = Mathf.Max(0, row);
            assignedLaneWorldY = laneWorldY;
            hasAssignedLane = true;
        }

        private void Awake()
        {
            results = new Collider2D[Mathf.Max(1, maxTargetsPerScan)];
            animationDriver = GetComponent<CharacterAnimationDriver2D>();
            if (muzzle == null) muzzle = transform;
            assignedLaneWorldY = transform.position.y;
        }

        private void Update()
        {
            if (projectilePrefab == null) return;
            attackTimer -= Time.deltaTime;
            if (attackTimer > 0f) return;

            Health target = FindNearestMonster();
            if (target == null) return;

            Projectile2D projectile = Instantiate(projectilePrefab, muzzle.position, Quaternion.identity);
            projectile.Initialize(target, damage, slowMultiplier, slowDuration);
            if (animationDriver != null) animationDriver.PlayAttack();
            attackTimer = attackInterval;
        }

        public void ApplyPermanentBonuses(float bonusDamage, float bonusAttackSpeed)
        {
            damage = Mathf.Max(0f, damage + bonusDamage);
            if (bonusAttackSpeed > 0f)
                attackInterval = Mathf.Max(0.05f, attackInterval / (1f + bonusAttackSpeed));
        }

        private Health FindNearestMonster()
        {
            int count = Physics2D.OverlapCircleNonAlloc(
                transform.position, attackRange, results, targetLayers);
            Health nearest = null;
            float nearestDistance = attackRange * attackRange;

            for (int i = 0; i < count; i++)
            {
                Collider2D candidate = results[i];
                if (candidate == null) continue;
                Health health = candidate.GetComponentInParent<Health>();
                if (health == null || health.IsDead ||
                    candidate.GetComponentInParent<EnemyMarker>() == null) continue;

                float distance = ((Vector2)health.transform.position -
                    (Vector2)transform.position).sqrMagnitude;
                EnemyMovement2D enemyMovement = candidate.GetComponentInParent<EnemyMovement2D>();
                float monsterLaneY = enemyMovement != null
                    ? enemyMovement.LaneWorldY
                    : health.transform.position.y;
                float targetLaneY = hasAssignedLane ? assignedLaneWorldY : transform.position.y;
                if (Mathf.Abs(monsterLaneY - targetLaneY) > laneTolerance)
                    continue;

                if (distance < nearestDistance)
                {
                    nearestDistance = distance;
                    nearest = health;
                }
            }
            return nearest;
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.DrawWireSphere(transform.position, attackRange);
        }
    }
}
