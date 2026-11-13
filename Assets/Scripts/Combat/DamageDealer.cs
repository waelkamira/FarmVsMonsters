using FarmVsMonsters.Core;
using UnityEngine;

namespace FarmVsMonsters.Combat
{
    /// <summary>Small shared damage API that prevents accidental friendly fire.</summary>
    public sealed class DamageDealer : MonoBehaviour
    {
        [SerializeField] private TeamId team = TeamId.Player;
        [SerializeField, Min(0f)] private float damage = 10f;

        public TeamId Team => team;
        public float Damage => damage;

public void SetDamage(float newDamage)
        {
            damage = Mathf.Max(0f, newDamage);
        }

        public bool TryDamage(Health target, TeamId targetTeam)
        {
            if (target == null || target.IsDead || damage <= 0f)
                return false;
            if (team == TeamId.Neutral || team == targetTeam)
                return false;

            return target.ApplyDamage(damage);
        }
    }
}
