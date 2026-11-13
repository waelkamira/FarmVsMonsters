using System;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using UnityEngine;

namespace FarmVsMonsters.Plants
{
    /// <summary>Handles paid, per-instance plant upgrades during a battle.</summary>
    [DisallowMultipleComponent]
    public sealed class PlantUpgradeController2D : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private EnergyWallet wallet;
        [SerializeField] private PlantCombatController2D combat;
        [SerializeField] private Health health;
        [SerializeField] private SpriteRenderer levelRenderer;

        [Header("Progression")]
        [SerializeField, Min(1)] private int maximumLevel = 5;
        [SerializeField, Min(1)] private int specialAttackUnlockLevel = 3;
        [SerializeField] private int[] energyCosts = { 50, 85, 125, 175 };
        [SerializeField] private float[] damageBonuses = { 3f, 4f, 5f, 7f };
        [SerializeField] private float[] attackSpeedBonuses = { 0.05f, 0.07f, 0.08f, 0.1f };
        [SerializeField] private float[] maxHealthMultipliers = { 1.1f, 1.1f, 1.15f, 1.2f };
        [SerializeField] private Sprite[] levelSprites = new Sprite[5];

        public int CurrentLevel { get; private set; } = 1;
        public int MaximumLevel => Mathf.Max(1, maximumLevel);
        public int NextUpgradeCost => CurrentLevel >= MaximumLevel
            ? -1 : GetValue(energyCosts, CurrentLevel - 1, -1);

        public event Action<int, int> LevelChanged;

        private void Awake()
        {
            if (combat == null) combat = GetComponent<PlantCombatController2D>();
            if (health == null) health = GetComponent<Health>();
            if (levelRenderer == null) levelRenderer = GetComponentInChildren<SpriteRenderer>();
            maximumLevel = Mathf.Max(1, maximumLevel);
            CurrentLevel = 1;
            RefreshLevelPresentation();
        }

        /// <summary>Spends energy only after all upgrade prerequisites have been validated.</summary>
        public bool TryUpgrade()
        {
            if (CurrentLevel >= MaximumLevel || wallet == null || combat == null)
                return false;

            int cost = NextUpgradeCost;
            if (cost < 0 || !wallet.TrySpend(cost))
                return false;

            int upgradeIndex = CurrentLevel - 1;
            combat.ApplyPermanentBonuses(
                GetValue(damageBonuses, upgradeIndex, 0f),
                GetValue(attackSpeedBonuses, upgradeIndex, 0f));

            float healthMultiplier = GetValue(maxHealthMultipliers, upgradeIndex, 1f);
            if (health != null && healthMultiplier > 1f)
                health.ApplyMaxHealthMultiplier(healthMultiplier);

            CurrentLevel++;
            combat.SetSpecialAttackUnlocked(CurrentLevel >= specialAttackUnlockLevel);
            RefreshLevelPresentation();
            LevelChanged?.Invoke(CurrentLevel, MaximumLevel);
            return true;
        }

        public void SetWallet(EnergyWallet sharedWallet)
        {
            wallet = sharedWallet;
        }

        private void RefreshLevelPresentation()
        {
            if (levelRenderer != null && levelSprites != null &&
                CurrentLevel - 1 < levelSprites.Length &&
                levelSprites[CurrentLevel - 1] != null)
                levelRenderer.sprite = levelSprites[CurrentLevel - 1];

            if (combat != null)
                combat.SetSpecialAttackUnlocked(CurrentLevel >= specialAttackUnlockLevel);
        }

        private static T GetValue<T>(T[] values, int index, T fallback)
        {
            return values != null && index >= 0 && index < values.Length
                ? values[index] : fallback;
        }

        private void OnValidate()
        {
            maximumLevel = Mathf.Max(1, maximumLevel);
            specialAttackUnlockLevel = Mathf.Clamp(specialAttackUnlockLevel, 1, maximumLevel);
        }
    }
}
