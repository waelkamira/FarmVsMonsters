using System;
using UnityEngine;

namespace FarmVsMonsters.Combat
{
    /// <summary>
    /// Reusable health component. Damage is clamped and death is raised once.
    /// Attach to a combatant root and configure maxHealth in the Inspector.
    /// </summary>
    public sealed class Health : MonoBehaviour
    {
        [SerializeField, Min(1f)] private float maxHealth = 100f;

        public float MaxHealth => maxHealth;
        public float CurrentHealth { get; private set; }
        public bool IsDead { get; private set; }

        public event Action<float, float> HealthChanged;
        public event Action Died;

        private void Awake()
        {
            maxHealth = Mathf.Max(1f, maxHealth);
            CurrentHealth = maxHealth;
        }

public void IncreaseMaxHealth(float amount, bool healBySameAmount = true)
        {
            if (amount <= 0f)
                return;

            maxHealth += amount;
            if (healBySameAmount && !IsDead)
                CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + amount);
            HealthChanged?.Invoke(CurrentHealth, maxHealth);
        }

        /// <summary>Scales maximum and current health together while preserving the current health ratio.</summary>
        public void ApplyMaxHealthMultiplier(float multiplier)
        {
            if (multiplier <= 0f || Mathf.Approximately(multiplier, 1f))
                return;

            float healthRatio = maxHealth > 0f ? CurrentHealth / maxHealth : 1f;
            maxHealth = Mathf.Max(1f, maxHealth * multiplier);
            CurrentHealth = IsDead ? 0f : Mathf.Clamp(maxHealth * healthRatio, 0f, maxHealth);
            HealthChanged?.Invoke(CurrentHealth, maxHealth);
        }

        public bool ApplyDamage(float amount)
        {
            if (IsDead || amount <= 0f)
                return false;

            CurrentHealth = Mathf.Max(0f, CurrentHealth - amount);
            HealthChanged?.Invoke(CurrentHealth, maxHealth);

            if (CurrentHealth <= 0f)
            {
                IsDead = true;
                Died?.Invoke();
            }

            return true;
        }

        public bool Restore(float amount)
        {
            if (IsDead || amount <= 0f)
                return false;

            float previous = CurrentHealth;
            CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + amount);
            if (!Mathf.Approximately(previous, CurrentHealth))
                HealthChanged?.Invoke(CurrentHealth, maxHealth);

            return !Mathf.Approximately(previous, CurrentHealth);
        }

        public void ResetHealth()
        {
            IsDead = false;
            CurrentHealth = maxHealth;
            HealthChanged?.Invoke(CurrentHealth, maxHealth);
        }
    }
}
