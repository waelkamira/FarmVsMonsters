using System.Collections.Generic;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>
    /// Periodically damages monsters standing inside a world-space hazard area.
    /// Put this on a trigger-free scene object; the overlap query does not require trigger callbacks.
    /// </summary>
    public sealed class EnvironmentalHazard2D : MonoBehaviour
    {
        [Header("Area")]
        [SerializeField, Min(0.1f)] private float radius = 1.25f;
        [SerializeField] private LayerMask monsterLayers = ~0;
        [SerializeField, Min(1)] private int maxCollidersPerTick = 32;

        [Header("Damage")]
        [SerializeField, Min(0f)] private float damagePerTick = 6f;
        [SerializeField, Min(0.05f)] private float tickInterval = 0.75f;
        [SerializeField, Range(0.1f, 1f)] private float slowMultiplier = 1f;
        [SerializeField, Min(0f)] private float slowDuration = 0.8f;

        private Collider2D[] results;
        private readonly HashSet<Health> damagedThisTick = new HashSet<Health>();
        private float tickTimer;

        private void Awake()
        {
            results = new Collider2D[Mathf.Max(1, maxCollidersPerTick)];
            tickTimer = tickInterval;
        }

        private void Update()
        {
            tickTimer -= Time.deltaTime;
            if (tickTimer > 0f)
                return;

            tickTimer = tickInterval;
            ApplyHazardTick();
        }

        private void ApplyHazardTick()
        {
            if (damagePerTick <= 0f)
                return;

            int count = Physics2D.OverlapCircleNonAlloc(
                transform.position, radius, results, monsterLayers);
            damagedThisTick.Clear();

            for (int i = 0; i < count; i++)
            {
                Collider2D hit = results[i];
                if (hit == null)
                    continue;

                EnemyMarker marker = hit.GetComponentInParent<EnemyMarker>();
                Health health = marker != null ? marker.GetComponentInParent<Health>() : null;
                if (health == null || health.IsDead || !damagedThisTick.Add(health))
                    continue;

                health.ApplyDamage(damagePerTick);

                if (slowMultiplier < 1f && slowDuration > 0f)
                {
                    EnemyMovement2D movement = marker.GetComponentInParent<EnemyMovement2D>();
                    if (movement != null)
                        movement.ApplySlow(slowMultiplier, slowDuration);
                }
            }
        }

        private void OnValidate()
        {
            radius = Mathf.Max(0.1f, radius);
            maxCollidersPerTick = Mathf.Max(1, maxCollidersPerTick);
            damagePerTick = Mathf.Max(0f, damagePerTick);
            tickInterval = Mathf.Max(0.05f, tickInterval);
            slowMultiplier = Mathf.Clamp(slowMultiplier, 0.1f, 1f);
            slowDuration = Mathf.Max(0f, slowDuration);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.DrawWireSphere(transform.position, radius);
        }
    }
}
