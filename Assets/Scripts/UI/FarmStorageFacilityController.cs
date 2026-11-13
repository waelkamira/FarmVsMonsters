using FarmVsMonsters.Farm;
using UnityEngine;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>uGUI controls for specialized storage facility upgrades.</summary>
    public sealed class FarmStorageFacilityController : MonoBehaviour
    {
        [SerializeField] private FarmStorageFacilityService storageService;
        [SerializeField] private FarmStorageFacilityDefinition[] displayedFacilities;
        [SerializeField] private Button[] upgradeButtons;
        [SerializeField] private Text[] facilityTexts;
        [SerializeField] private Text capacitySummaryText;
        [SerializeField] private Text statusText;

        private UnityEngine.Events.UnityAction[] upgradeActions;

        private void OnEnable()
        {
            if (storageService != null)
                storageService.FacilityUpgraded += HandleUpgraded;
            BindButtons();
            Refresh();
        }

        private void OnDisable()
        {
            if (storageService != null)
                storageService.FacilityUpgraded -= HandleUpgraded;
            UnbindButtons();
        }

        public void Refresh()
        {
            if (storageService == null) return;
            int count = displayedFacilities == null ? 0 : displayedFacilities.Length;
            for (int i = 0; i < count; i++)
            {
                FarmStorageFacilityDefinition definition = displayedFacilities[i];
                if (definition == null) continue;
                int level = storageService.GetLevel(definition);
                if (facilityTexts != null && i < facilityTexts.Length && facilityTexts[i] != null)
                {
                    string resourceNames = string.Join(", ", System.Array.ConvertAll(
                        definition.StoredResources, resource => resource.ToString()));
                    facilityTexts[i].text = definition.DisplayName + " — Level " + level +
                        "/" + definition.MaximumLevel + "\n" + resourceNames +
                        "\nCapacity bonus: +" +
                        (level * definition.CapacityBonusPerLevel) + " per listed resource";
                }
                if (upgradeButtons != null && i < upgradeButtons.Length && upgradeButtons[i] != null)
                    upgradeButtons[i].interactable = storageService.CanUpgrade(definition);
            }

            if (capacitySummaryText != null)
            {
                capacitySummaryText.text =
                    "Wheat: " + storageService.GetEffectiveCapacity(FarmResourceType.Wheat) + "\n" +
                    "Seeds: " + storageService.GetEffectiveCapacity(FarmResourceType.Seeds) + "\n" +
                    "Milk: " + storageService.GetEffectiveCapacity(FarmResourceType.Milk) + "\n" +
                    "Wool: " + storageService.GetEffectiveCapacity(FarmResourceType.Wool) + "\n" +
                    "Eggs: " + storageService.GetEffectiveCapacity(FarmResourceType.Eggs) + "\n" +
                    "Meat: " + storageService.GetEffectiveCapacity(FarmResourceType.Meat) + "\n" +
                    "Flour: " + storageService.GetEffectiveCapacity(FarmResourceType.Flour) + "\n" +
                    "Bread: " + storageService.GetEffectiveCapacity(FarmResourceType.Bread);
            }
        }

        private void BindButtons()
        {
            if (upgradeButtons == null) return;
            upgradeActions = new UnityEngine.Events.UnityAction[upgradeButtons.Length];
            for (int i = 0; i < upgradeButtons.Length; i++)
            {
                int index = i;
                upgradeActions[i] = () => Upgrade(index);
                if (upgradeButtons[i] != null)
                    upgradeButtons[i].onClick.AddListener(upgradeActions[i]);
            }
        }

        private void UnbindButtons()
        {
            if (upgradeButtons == null || upgradeActions == null) return;
            for (int i = 0; i < upgradeButtons.Length && i < upgradeActions.Length; i++)
                if (upgradeButtons[i] != null && upgradeActions[i] != null)
                    upgradeButtons[i].onClick.RemoveListener(upgradeActions[i]);
            upgradeActions = null;
        }

        private void Upgrade(int index)
        {
            if (storageService == null || displayedFacilities == null ||
                index < 0 || index >= displayedFacilities.Length) return;
            bool success = storageService.TryUpgrade(displayedFacilities[index]);
            if (statusText != null)
                statusText.text = success ? "Storage facility upgraded." : "Upgrade unavailable.";
            Refresh();
        }

        private void HandleUpgraded(FarmStorageFacilityDefinition definition, int level)
        {
            if (statusText != null)
                statusText.text = definition.DisplayName + " upgraded to level " + level;
            Refresh();
        }
    }
}