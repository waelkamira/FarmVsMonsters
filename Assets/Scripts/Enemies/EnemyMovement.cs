using FarmVsMonsters.Combat;
using FarmVsMonsters.Core;
using UnityEngine;

namespace FarmVsMonsters.Enemies
{
    /// <summary>Moves an enemy toward a target and attacks when within range.</summary>
    [RequireComponent(typeof(Health))]
    public sealed class EnemyMovement : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Health targetHealth;
        [SerializeField, Min(0f)] private float moveSpeed = 2f;
        [SerializeField, Min(0.1f)] private float attackRange = 1.2f;
        [SerializeField, Min(0f)] private float attackDamage = 8f;
        [SerializeField, Min(0.1f)] private float attackInterval = 1.2f;
        [SerializeField] private TeamId targetTeam = TeamId.Player;

        private Health ownHealth;
        private float attackTimer;
        private float activeSlowMultiplier = 1f;
        private float slowRemaining;

        private void Awake()
        {
            ownHealth = GetComponent<Health>();
        }

        public void SetTarget(Transform newTarget, Health newTargetHealth, TeamId newTargetTeam = TeamId.Player)
        {
            target = newTarget;
            targetHealth = newTargetHealth;
            targetTeam = newTargetTeam;
        }

        public void ApplySlow(float multiplier, float duration)
        {
            if (duration <= 0f || multiplier >= 1f) return;
            activeSlowMultiplier = Mathf.Min(activeSlowMultiplier, Mathf.Clamp(multiplier, 0.1f, 1f));
            slowRemaining = Mathf.Max(slowRemaining, duration);
        }

        private void Update()
        {
            if (slowRemaining > 0f)
            {
                slowRemaining -= Time.deltaTime;
                if (slowRemaining <= 0f)
                    activeSlowMultiplier = 1f;
            }

            if (ownHealth == null || ownHealth.IsDead || target == null || targetHealth == null || targetHealth.IsDead)
                return;

            Vector3 offset = target.position - transform.position;
            offset.y = 0f;
            float distance = offset.magnitude;

            if (distance > attackRange)
            {
                Vector3 direction = offset / Mathf.Max(distance, 0.001f);
                transform.position += direction * (moveSpeed * activeSlowMultiplier * Time.deltaTime);
                if (direction.sqrMagnitude > 0.001f)
                    transform.rotation = Quaternion.LookRotation(direction, Vector3.up);
                return;
            }

            attackTimer -= Time.deltaTime;
            if (attackTimer <= 0f)
            {
                if (targetTeam != TeamId.Neutral)
                    targetHealth.ApplyDamage(attackDamage);
                attackTimer = attackInterval;
            }
        }
    }
}
