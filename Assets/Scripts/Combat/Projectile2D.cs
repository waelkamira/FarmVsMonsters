using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using UnityEngine;

namespace FarmVsMonsters.Combat
{
    /// <summary>
    /// Configurable 2D plant projectile. Different plant prefabs can use direct
    /// hits or a small area burst while retaining their own sprite and tuning.
    /// </summary>
    public sealed class Projectile2D : MonoBehaviour
    {
        public enum ImpactMode
        {
            Direct = 0,
            Splash = 1
        }

        [SerializeField, Min(0.1f)] private float speed = 7f;
        [SerializeField, Min(0.1f)] private float lifetime = 4f;
        [SerializeField] private ImpactMode impactMode = ImpactMode.Direct;
        [SerializeField, Min(0f)] private float splashRadius = 1.25f;
        [SerializeField] private LayerMask splashLayers = ~0;
        [SerializeField, Min(1)] private int maxSplashTargets = 24;

        private Health target;
        private float damage;
        private float slowMultiplier = 1f;
        private float slowDuration;
        private float age;
        private Collider2D[] splashResults;

        private void Awake()
        {
            splashResults = new Collider2D[Mathf.Max(1, maxSplashTargets)];
        }

        public void Initialize(Health targetHealth, float hitDamage,
            float hitSlowMultiplier = 1f, float hitSlowDuration = 0f)
        {
            target = targetHealth;
            damage = Mathf.Max(0f, hitDamage);
            slowMultiplier = Mathf.Clamp(hitSlowMultiplier, 0.1f, 1f);
            slowDuration = Mathf.Max(0f, hitSlowDuration);
        }

        private void Update()
        {
            age += Time.deltaTime;
            if (age >= lifetime || target == null || target.IsDead)
            {
                Destroy(gameObject);
                return;
            }

            Vector2 destination = target.transform.position;
            Vector2 offset = destination - (Vector2)transform.position;
            float step = speed * Time.deltaTime;
            if (offset.sqrMagnitude <= step * step || offset.sqrMagnitude <= 0.01f)
            {
                ApplyImpact();
                Destroy(gameObject);
                return;
            }

            Vector2 direction = offset.normalized;
            transform.position += (Vector3)(direction * step);
            if (direction.sqrMagnitude > 0.001f)
                transform.right = direction;
        }

        private void ApplyImpact()
        {
            if (impactMode == ImpactMode.Direct)
            {
                ApplyToMonster(target);
                return;
            }

            int count = Physics2D.OverlapCircleNonAlloc(
                transform.position, splashRadius, splashResults, splashLayers);
            bool primaryHitApplied = false;

            for (int i = 0; i < count; i++)
            {
                Collider2D candidate = splashResults[i];
                if (candidate == null) continue;
                Health health = candidate.GetComponentInParent<Health>();
                if (health == null || health.IsDead ||
                    candidate.GetComponentInParent<EnemyMarker>() == null) continue;

                bool alreadyProcessed = false;
                for (int previous = 0; previous < i; previous++)
                {
                    Collider2D previousCollider = splashResults[previous];
                    if (previousCollider == null) continue;
                    if (previousCollider.GetComponentInParent<Health>() == health)
                    {
                        alreadyProcessed = true;
                        break;
                    }
                }
                if (alreadyProcessed) continue;

                if (health == target) primaryHitApplied = true;
                ApplyToMonster(health);
            }

            // Physics layers can be misconfigured; never silently lose the intended hit.
            if (!primaryHitApplied && target != null && !target.IsDead)
                ApplyToMonster(target);
        }

        private void ApplyToMonster(Health health)
        {
            if (health == null || health.IsDead) return;
            bool applied = health.ApplyDamage(damage);
            if (applied && !health.IsDead && slowDuration > 0f && slowMultiplier < 1f)
            {
                EnemyMovement2D movement = health.GetComponent<EnemyMovement2D>();
                if (movement != null) movement.ApplySlow(slowMultiplier, slowDuration);
            }
        }

        private void OnDrawGizmosSelected()
        {
            if (impactMode == ImpactMode.Splash && splashRadius > 0f)
                Gizmos.DrawWireSphere(transform.position, splashRadius);
        }
    }
}