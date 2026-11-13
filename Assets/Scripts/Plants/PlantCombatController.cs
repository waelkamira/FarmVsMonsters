using FarmVsMonsters.Combat;
using FarmVsMonsters.Core;
using FarmVsMonsters.Enemies;
using UnityEngine;

namespace FarmVsMonsters.Plants
{
    /// <summary>Finds the nearest living monster and fires a homing projectile.</summary>
    public sealed class PlantCombatController : MonoBehaviour
    {
        [SerializeField] private Transform muzzle;
        [SerializeField] private Projectile projectilePrefab;
        [SerializeField, Min(0.1f)] private float attackRange = 7f;
        [SerializeField, Min(0.05f)] private float attackInterval = 1f;
        [SerializeField, Min(0f)] private float damage = 12f;
        [SerializeField, Range(0.1f, 1f)] private float slowMultiplier = 1f;
        [SerializeField, Min(0f)] private float slowDuration = 0f;
        [SerializeField] private LayerMask targetLayers = ~0;
        [SerializeField, Min(1)] private int maxTargetsPerScan = 32;

        private Collider[] results;
        private float attackTimer;

        private void Awake()
        {
            results = new Collider[Mathf.Max(1, maxTargetsPerScan)];
            if (muzzle == null)
                muzzle = transform;
        }

        private void Update()
        {
            if (projectilePrefab == null)
                return;

            attackTimer -= Time.deltaTime;
            if (attackTimer > 0f)
                return;

            Health target = FindNearestMonster();
            if (target == null)
                return;

            Projectile projectile = Instantiate(projectilePrefab, muzzle.position, muzzle.rotation);
            projectile.Initialize(target, TeamId.Monsters, TeamId.Player,
                damage, slowMultiplier, slowDuration);
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
            int count = Physics.OverlapSphereNonAlloc(
                transform.position, attackRange, results, targetLayers, QueryTriggerInteraction.Collide);

            Health nearest = null;
            float nearestDistance = attackRange * attackRange;

            for (int i = 0; i < count; i++)
            {
                Collider candidate = results[i];
                if (candidate == null)
                    continue;

                Health health = candidate.GetComponentInParent<Health>();
                if (health == null || health.IsDead)
                    continue;

                EnemyMarker marker = candidate.GetComponentInParent<EnemyMarker>();
                if (marker == null)
                    continue;

                float distance = (health.transform.position - transform.position).sqrMagnitude;
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
