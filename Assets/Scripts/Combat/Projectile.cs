using FarmVsMonsters.Core;
using UnityEngine;

namespace FarmVsMonsters.Combat
{
    /// <summary>Homing projectile that damages only opposing teams.</summary>
    public sealed class Projectile : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] private float speed = 8f;
        [SerializeField, Min(0.1f)] private float lifetime = 5f;
        [SerializeField, Min(0f)] private float damage = 10f;
        [SerializeField] private TeamId team = TeamId.Player;
        [SerializeField] private bool destroyOnInvalidTarget = true;
        [SerializeField, Range(0.1f, 1f)] private float slowMultiplier = 1f;
        [SerializeField, Min(0f)] private float slowDuration = 0f;

        private Health target;
        private TeamId targetTeam;
        private float age;
        private bool initialized;

        public void Initialize(Health newTarget, TeamId newTargetTeam, TeamId ownerTeam,
            float hitDamage, float hitSlowMultiplier = 1f, float hitSlowDuration = 0f)
        {
            target = newTarget;
            targetTeam = newTargetTeam;
            team = ownerTeam;
            damage = Mathf.Max(0f, hitDamage);
            slowMultiplier = Mathf.Clamp(hitSlowMultiplier, 0.1f, 1f);
            slowDuration = Mathf.Max(0f, hitSlowDuration);
            initialized = true;
        }

        private void Update()
        {
            age += Time.deltaTime;
            if (age >= lifetime)
            {
                Destroy(gameObject);
                return;
            }

            if (!initialized || target == null || target.IsDead)
            {
                if (destroyOnInvalidTarget)
                    Destroy(gameObject);
                return;
            }

            Vector3 destination = target.transform.position;
            Vector3 offset = destination - transform.position;
            float step = speed * Time.deltaTime;

            if (offset.sqrMagnitude <= step * step || offset.sqrMagnitude <= 0.01f)
            {
                if (team != TeamId.Neutral && team != targetTeam)
                {
                    bool applied = target.ApplyDamage(damage);
                    if (applied && !target.IsDead && slowDuration > 0f && slowMultiplier < 1f)
                    {
                        Enemies.EnemyMovement movement = target.GetComponent<Enemies.EnemyMovement>();
                        if (movement != null)
                            movement.ApplySlow(slowMultiplier, slowDuration);
                    }
                }
                Destroy(gameObject);
                return;
            }

            Vector3 direction = offset.normalized;
            transform.position += direction * step;
            if (direction.sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.LookRotation(direction, Vector3.up);
        }
    }
}
