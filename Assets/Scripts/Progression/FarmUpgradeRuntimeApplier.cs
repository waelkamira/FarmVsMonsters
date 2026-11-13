using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Plants;
using FarmVsMonsters.Player;
using UnityEngine;

namespace FarmVsMonsters.Progression
{
    /// <summary>Applies purchased permanent farm upgrades to the active battle scene.</summary>
    public sealed class FarmUpgradeRuntimeApplier : MonoBehaviour
    {
        [SerializeField] private FarmUpgradeDefinition[] upgradeDefinitions;
        [SerializeField] private EnergyWallet energyWallet;
        [SerializeField] private FarmerController farmer;
        [SerializeField] private Health protectedFarmHealth;
        [SerializeField] private PlantCombatController[] plantCombatants;

        private bool applied;

        private void Start()
        {
            ApplyUpgrades();
        }

        public void ApplyUpgrades()
        {
            if (applied)
                return;

            float capacityBonus = GetUpgradeBonus(FarmUpgradeType.EnergyCapacity);
            float startingEnergyBonus = GetUpgradeBonus(FarmUpgradeType.StartingBattleEnergy);
            float moveSpeedBonus = GetUpgradeBonus(FarmUpgradeType.FarmerMoveSpeed);
            float plantDamageBonus = GetUpgradeBonus(FarmUpgradeType.PlantDamage);
            float plantAttackSpeedBonus = GetUpgradeBonus(FarmUpgradeType.PlantAttackSpeed);
            float farmHealthBonus = GetUpgradeBonus(FarmUpgradeType.FarmHealth);

            if (energyWallet != null)
            {
                if (capacityBonus > 0f)
                    energyWallet.SetCapacity(SafeAdd(energyWallet.Capacity, capacityBonus));
                if (startingEnergyBonus > 0f)
                    energyWallet.Add(SafeToInt(startingEnergyBonus));
            }

            if (farmer != null && moveSpeedBonus > 0f)
                farmer.AddMoveSpeed(moveSpeedBonus);

            if (protectedFarmHealth != null && farmHealthBonus > 0f)
                protectedFarmHealth.IncreaseMaxHealth(farmHealthBonus);

            if (plantCombatants != null)
            {
                foreach (PlantCombatController plant in plantCombatants)
                {
                    if (plant != null)
                        plant.ApplyPermanentBonuses(plantDamageBonus, plantAttackSpeedBonus);
                }
            }

            applied = true;
        }

        private float GetUpgradeBonus(FarmUpgradeType type)
        {
            if (upgradeDefinitions == null)
                return 0f;

            float total = 0f;
            foreach (FarmUpgradeDefinition definition in upgradeDefinitions)
            {
                if (definition == null || definition.UpgradeType != type)
                    continue;

                total += ProgressSaveService.GetUpgradeLevel(definition.UpgradeId) * definition.ValuePerLevel;
            }

            return total;
        }

        private static int SafeAdd(int current, float bonus)
        {
            double value = current + bonus;
            return value >= int.MaxValue ? int.MaxValue : Mathf.Max(0, (int)value);
        }

        private static int SafeToInt(float value)
        {
            return value >= int.MaxValue ? int.MaxValue : Mathf.Max(0, (int)value);
        }
    }
}