using System;
using UnityEngine;

namespace FarmVsMonsters.Progression
{
    /// <summary>Purchases persistent farm upgrades using saved farm coins.</summary>
    public sealed class FarmUpgradeService : MonoBehaviour
    {
        public event Action<FarmUpgradeDefinition, int> UpgradePurchased;
        public event Action PurchaseRejected;

        public int FarmCoins => ProgressSaveService.Load().farmCoins;

        public int GetLevel(FarmUpgradeDefinition definition)
        {
            return definition == null ? 0 : ProgressSaveService.GetUpgradeLevel(definition.UpgradeId);
        }

        public int GetNextCost(FarmUpgradeDefinition definition)
        {
            if (definition == null)
                return 0;

            return definition.GetCostForNextLevel(GetLevel(definition));
        }

        public bool CanPurchase(FarmUpgradeDefinition definition)
        {
            if (definition == null || string.IsNullOrWhiteSpace(definition.UpgradeId))
                return false;

            int level = GetLevel(definition);
            return level < definition.MaxLevel && FarmCoins >= definition.GetCostForNextLevel(level);
        }

        public bool TryPurchase(FarmUpgradeDefinition definition)
        {
            if (!CanPurchase(definition))
            {
                PurchaseRejected?.Invoke();
                return false;
            }

            int currentLevel = GetLevel(definition);
            int cost = definition.GetCostForNextLevel(currentLevel);
            if (!ProgressSaveService.TryPurchaseUpgrade(
                    definition.UpgradeId, cost, definition.MaxLevel, out int newLevel))
            {
                PurchaseRejected?.Invoke();
                return false;
            }

            UpgradePurchased?.Invoke(definition, newLevel);
            return true;
        }

        public float GetUpgradeBonus(FarmUpgradeType type, FarmUpgradeDefinition[] definitions)
        {
            if (definitions == null)
                return 0f;

            float total = 0f;
            foreach (FarmUpgradeDefinition definition in definitions)
            {
                if (definition == null || definition.UpgradeType != type)
                    continue;

                total += GetLevel(definition) * definition.ValuePerLevel;
            }

            return total;
        }
    }
}