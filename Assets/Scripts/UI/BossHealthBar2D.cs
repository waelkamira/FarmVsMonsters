using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using UnityEngine;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Optional UI binding for a boss health bar and current phase label.</summary>
    public sealed class BossHealthBar2D : MonoBehaviour
    {
        [SerializeField] private Health bossHealth;
        [SerializeField] private BossPhaseController2D bossPhases;
        [SerializeField] private Image healthFill;
        [SerializeField] private Text healthText;
        [SerializeField] private Text phaseText;
        [SerializeField] private GameObject visibleRoot;
        [SerializeField] private string bossName = "Boss";

        private void OnEnable()
        {
            Subscribe();
            Refresh();
        }

        public void Configure(Health health, BossPhaseController2D phases)
        {
            Unsubscribe();
            bossHealth = health;
            bossPhases = phases;
            Subscribe();
            Refresh();
        }

        private void Subscribe()
        {
            if (bossHealth != null)
                bossHealth.HealthChanged += HandleHealthChanged;
            if (bossPhases != null)
                bossPhases.PhaseChanged += HandlePhaseChanged;
        }

        private void Unsubscribe()
        {
            if (bossHealth != null)
                bossHealth.HealthChanged -= HandleHealthChanged;
            if (bossPhases != null)
                bossPhases.PhaseChanged -= HandlePhaseChanged;
        }

        private void HandleHealthChanged(float current, float maximum)
        {
            Refresh();
        }

        private void HandlePhaseChanged(int phase)
        {
            Refresh();
        }

        private void Refresh()
        {
            bool hasBoss = bossHealth != null;
            if (visibleRoot != null)
                visibleRoot.SetActive(hasBoss && !bossHealth.IsDead);

            if (!hasBoss)
                return;

            float normalized = bossHealth.MaxHealth > 0f
                ? Mathf.Clamp01(bossHealth.CurrentHealth / bossHealth.MaxHealth) : 0f;
            if (healthFill != null)
                healthFill.fillAmount = normalized;
            if (healthText != null)
                healthText.text = Mathf.CeilToInt(bossHealth.CurrentHealth) + " / " +
                    Mathf.CeilToInt(bossHealth.MaxHealth);
            if (phaseText != null)
                phaseText.text = bossPhases != null
                    ? bossName + " — Phase " + bossPhases.CurrentPhase
                    : bossName;
        }

        private void OnDisable()
        {
            Unsubscribe();
        }

        private void OnDestroy()
        {
            Unsubscribe();
        }
    }
}
