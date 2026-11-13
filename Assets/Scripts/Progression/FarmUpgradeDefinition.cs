using UnityEngine;

namespace FarmVsMonsters.Progression
{
    public enum FarmUpgradeType
    {
        EnergyCapacity = 0,
        StartingBattleEnergy = 1,
        FarmerMoveSpeed = 2,
        PlantDamage = 3,
        PlantAttackSpeed = 4,
        FarmHealth = 5
    }

    [CreateAssetMenu(menuName = "Farm Vs Monsters/Farm Upgrade", fileName = "FarmUpgrade")]
    public sealed class FarmUpgradeDefinition : ScriptableObject
    {
        [SerializeField] private string upgradeId = "farm.energy_capacity";
        [SerializeField] private string displayName = "Energy Storage";
        [TextArea, SerializeField] private string description = "Increase your energy storage.";
        [SerializeField] private FarmUpgradeType upgradeType;
        [SerializeField, Min(0)] private int baseCost = 100;
        [SerializeField, Min(0f)] private float costMultiplier = 1.5f;
        [SerializeField, Min(1)] private int maxLevel = 5;
        [SerializeField, Min(0f)] private float valuePerLevel = 25f;

        public string UpgradeId => upgradeId;
        public string DisplayName => displayName;
        public string Description => description;
        public FarmUpgradeType UpgradeType => upgradeType;
        public int MaxLevel => maxLevel;
        public float ValuePerLevel => valuePerLevel;

        public int GetCostForNextLevel(int currentLevel)
        {
            int level = Mathf.Max(0, currentLevel);
            double cost = baseCost * System.Math.Pow(Mathf.Max(1f, costMultiplier), level);
            return cost >= int.MaxValue ? int.MaxValue : Mathf.Max(0, (int)System.Math.Ceiling(cost));
        }

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(upgradeId))
                upgradeId = name.ToLowerInvariant().Replace(" ", ".");
            baseCost = Mathf.Max(0, baseCost);
            costMultiplier = Mathf.Max(1f, costMultiplier);
            maxLevel = Mathf.Max(1, maxLevel);
            valuePerLevel = Mathf.Max(0f, valuePerLevel);
        }
    }
}