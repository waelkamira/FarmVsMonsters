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
        [SerializeField] private Projectile2D specialProjectilePrefab;
        [SerializeField, Min(0.1f)] private float attackRange = 9f;
        [SerializeField, Min(0f)] private float laneTolerance = 0.45f;
        [SerializeField, Min(0.05f)] private float attackInterval = 1.15f;
        [SerializeField, Min(1)] private int shotsPerBurst = 1;
        [SerializeField, Min(0.02f)] private float burstShotInterval = 0.12f;
        [SerializeField, Min(0f)] private float specialCooldown = 12f;
        [SerializeField, Min(0f)] private float specialDamageMultiplier = 2f;
        [SerializeField, Min(0f)] private float damage = 12f;
        [SerializeField, Range(0.1f, 1f)] private float slowMultiplier = 1f;
        [SerializeField, Min(0f)] private float slowDuration;
        [SerializeField] private LayerMask targetLayers = ~0;
        [SerializeField, Min(1)] private int maxTargetsPerScan = 32;

        private Collider2D[] results;
        private CharacterAnimationDriver2D animationDriver;
        private float attackTimer;
        private float burstShotTimer;
        private float specialCooldownTimer;
        private int burstShotsRemaining;
        private float assignedLaneWorldY;
        private bool hasAssignedLane;
        private bool specialAttackUnlocked = true;

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
            if (specialCooldownTimer > 0f)
                specialCooldownTimer -= Time.deltaTime;

            if (burstShotsRemaining > 0)
            {
                burstShotTimer -= Time.deltaTime;
                if (burstShotTimer > 0f) return;

                Health burstTarget = FindNearestMonster();
                if (burstTarget == null)
                {
                    burstShotsRemaining = 0;
                    return;
                }

                FireProjectile(projectilePrefab, burstTarget, damage);
                burstShotsRemaining--;
                if (burstShotsRemaining > 0)
                    burstShotTimer = Mathf.Max(0.02f, burstShotInterval);
                else
                    attackTimer = attackInterval;
                return;
            }

            if (attackTimer > 0f)
                attackTimer -= Time.deltaTime;
            if (attackTimer > 0f) return;

            Health target = FindNearestMonster();
            if (target == null) return;

            // A configured special shot has its own cooldown and does not consume the normal burst.
            if (specialAttackUnlocked && specialProjectilePrefab != null && specialCooldownTimer <= 0f)
            {
                FireProjectile(specialProjectilePrefab, target,
                    damage * Mathf.Max(0f, specialDamageMultiplier));
                specialCooldownTimer = Mathf.Max(0f, specialCooldown);
                attackTimer = attackInterval;
                return;
            }

            if (projectilePrefab == null) return;
            FireProjectile(projectilePrefab, target, damage);
            burstShotsRemaining = Mathf.Max(1, shotsPerBurst) - 1;
            if (burstShotsRemaining > 0)
                burstShotTimer = Mathf.Max(0.02f, burstShotInterval);
            else
                attackTimer = attackInterval;
        }

        private void FireProjectile(Projectile2D prefab, Health target, float hitDamage)
        {
            if (prefab == null || target == null || target.IsDead) return;
            Projectile2D projectile = Instantiate(prefab, muzzle.position, Quaternion.identity);
            projectile.Initialize(target, hitDamage, slowMultiplier, slowDuration);
            if (animationDriver != null) animationDriver.PlayAttack();
        }

        public void SetSpecialAttackUnlocked(bool unlocked)
        {
            specialAttackUnlocked = unlocked;
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
