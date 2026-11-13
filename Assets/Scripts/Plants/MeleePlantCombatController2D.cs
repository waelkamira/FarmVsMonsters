using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Visuals;
using UnityEngine;

namespace FarmVsMonsters.Plants
{
    /// <summary>
    /// Short-range spear/melee attack for stationary defensive plants.
    /// Finds only marked monsters and applies damage directly without a projectile prefab.
    /// </summary>
    public sealed class MeleePlantCombatController2D : MonoBehaviour
    {
        [SerializeField] private Transform attackOrigin;
        [SerializeField, Min(0.1f)] private float attackRange = 1.35f;
        [SerializeField, Min(0.05f)] private float attackInterval = 1.1f;
        [SerializeField, Min(0f)] private float damage = 18f;
        [SerializeField] private LayerMask targetLayers = ~0;
        [SerializeField, Min(1)] private int maxTargetsPerScan = 24;

        private Collider2D[] results;
        private CharacterAnimationDriver2D animationDriver;
        private float attackTimer;

        private void Awake()
        {
            results = new Collider2D[Mathf.Max(1, maxTargetsPerScan)];
            animationDriver = GetComponent<CharacterAnimationDriver2D>();
            if (attackOrigin == null)
                attackOrigin = transform;
        }

        private void Update()
        {
            if (attackTimer > 0f)
            {
                attackTimer -= Time.deltaTime;
                return;
            }

            Health target = FindNearestMonster();
            if (target == null)
                return;

            target.ApplyDamage(damage);
            if (animationDriver != null)
                animationDriver.PlayAttack();

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
            Vector2 origin = attackOrigin != null ? (Vector2)attackOrigin.position : (Vector2)transform.position;
            int count = Physics2D.OverlapCircleNonAlloc(origin, attackRange, results, targetLayers);
            Health nearest = null;
            float nearestDistance = attackRange * attackRange;

            for (int i = 0; i < count; i++)
            {
                Collider2D candidate = results[i];
                if (candidate == null)
                    continue;

                Health health = candidate.GetComponentInParent<Health>();
                if (health == null || health.IsDead ||
                    candidate.GetComponentInParent<EnemyMarker>() == null)
                    continue;

                float distance = ((Vector2)health.transform.position - origin).sqrMagnitude;
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
            Vector3 origin = attackOrigin != null ? attackOrigin.position : transform.position;
            Gizmos.DrawWireSphere(origin, attackRange);
        }
    }
}