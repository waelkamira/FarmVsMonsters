using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using UnityEngine;

namespace FarmVsMonsters.Combat
{
    /// <summary>Horizontal homing projectile for 2D plant combat.</summary>
    public sealed class Projectile2D : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] private float speed = 7f;
        [SerializeField, Min(0.1f)] private float lifetime = 4f;

        private Health target;
        private float damage;
        private float slowMultiplier = 1f;
        private float slowDuration;
        private float age;

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
                bool applied = target.ApplyDamage(damage);
                if (applied && !target.IsDead && slowDuration > 0f && slowMultiplier < 1f)
                {
                    EnemyMovement2D movement = target.GetComponent<EnemyMovement2D>();
                    if (movement != null) movement.ApplySlow(slowMultiplier, slowDuration);
                }
                Destroy(gameObject);
                return;
            }

            transform.position += (Vector3)(offset.normalized * step);
        }
    }
}
