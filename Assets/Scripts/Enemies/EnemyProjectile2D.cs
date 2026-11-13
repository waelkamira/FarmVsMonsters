using FarmVsMonsters.Combat;
using UnityEngine;

namespace FarmVsMonsters.Enemies
{
    /// <summary>Simple homing projectile used by ranged farm monsters.</summary>
    public sealed class EnemyProjectile2D : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] private float defaultSpeed = 5f;
        [SerializeField, Min(0.1f)] private float lifetime = 5f;
        [SerializeField, Min(0.01f)] private float hitDistance = 0.16f;
        [SerializeField] private bool rotateAlongTravel = true;

        private Health target;
        private float damage;
        private float speed;
        private float remainingLifetime;

        public void Initialize(Health newTarget, float hitDamage, float projectileSpeed)
        {
            target = newTarget;
            damage = Mathf.Max(0f, hitDamage);
            speed = Mathf.Max(0.1f, projectileSpeed > 0f ? projectileSpeed : defaultSpeed);
            remainingLifetime = lifetime;
        }

        private void OnEnable()
        {
            remainingLifetime = lifetime;
        }

        private void Update()
        {
            if (target == null || target.IsDead)
            {
                Destroy(gameObject);
                return;
            }

            remainingLifetime -= Time.deltaTime;
            if (remainingLifetime <= 0f)
            {
                Destroy(gameObject);
                return;
            }

            Vector2 toTarget = (Vector2)target.transform.position - (Vector2)transform.position;
            if (toTarget.sqrMagnitude <= hitDistance * hitDistance)
            {
                target.ApplyDamage(damage);
                Destroy(gameObject);
                return;
            }

            Vector2 direction = toTarget.normalized;
            Vector2 nextPosition = Vector2.MoveTowards(
                transform.position, target.transform.position, speed * Time.deltaTime);
            transform.position = nextPosition;
            if (rotateAlongTravel && direction.sqrMagnitude > 0.001f)
                transform.right = direction;

            if (((Vector2)target.transform.position - nextPosition).sqrMagnitude <=
                hitDistance * hitDistance)
            {
                target.ApplyDamage(damage);
                Destroy(gameObject);
            }
        }

        private void OnValidate()
        {
            defaultSpeed = Mathf.Max(0.1f, defaultSpeed);
            lifetime = Mathf.Max(0.1f, lifetime);
            hitDistance = Mathf.Max(0.01f, hitDistance);
        }
    }
}
