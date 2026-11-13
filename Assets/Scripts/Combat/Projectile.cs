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

        private Health target;
        private TeamId targetTeam;
        private float age;
        private bool initialized;

        public void Initialize(Health newTarget, TeamId newTargetTeam, TeamId ownerTeam, float hitDamage)
        {
            target = newTarget;
            targetTeam = newTargetTeam;
            team = ownerTeam;
            damage = Mathf.Max(0f, hitDamage);
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
                    target.ApplyDamage(damage);
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
