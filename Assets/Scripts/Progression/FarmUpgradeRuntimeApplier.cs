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

            FarmUpgradeService service = GetComponent<FarmUpgradeService>();
            if (service == null)
                service = FindObjectOfType<FarmUpgradeService>();

            if (service == null)
                return;

            float capacityBonus = service.GetUpgradeBonus(FarmUpgradeType.EnergyCapacity, upgradeDefinitions);
            float startingEnergyBonus = service.GetUpgradeBonus(FarmUpgradeType.StartingBattleEnergy, upgradeDefinitions);
            float moveSpeedBonus = service.GetUpgradeBonus(FarmUpgradeType.FarmerMoveSpeed, upgradeDefinitions);
            float plantDamageBonus = service.GetUpgradeBonus(FarmUpgradeType.PlantDamage, upgradeDefinitions);
            float plantAttackSpeedBonus = service.GetUpgradeBonus(FarmUpgradeType.PlantAttackSpeed, upgradeDefinitions);
            float farmHealthBonus = service.GetUpgradeBonus(FarmUpgradeType.FarmHealth, upgradeDefinitions);

            if (energyWallet != null)
            {
                if (capacityBonus > 0f)
                    energyWallet.SetCapacity(SafeAdd(energyWallet.Capacity, capacityBonus));
                if (startingEnergyBonus > 0f)
                    energyWallet.Add(SafeToInt(startingEnergyBonus));
            }

            if (farmer != null && moveSpeedBonus > 0f)
                farmer.SetMoveSpeed(5f + moveSpeedBonus);

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