using FarmVsMonsters.Farm;
using FarmVsMonsters.Progression;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Presenter for the persistent farm workshop and building shop.</summary>
    public sealed class FarmManagementController : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private FarmUpgradeService upgradeService;
        [SerializeField] private FarmBuildingService buildingService;

        [Header("Upgrade shop")]
        [SerializeField] private FarmUpgradeDefinition[] upgrades;
        [SerializeField] private Button[] upgradeButtons;
        [SerializeField] private Text[] upgradeLabels;

        [Header("Building shop")]
        [SerializeField] private FarmBuildingDefinition[] buildings;
        [SerializeField] private Button[] buildingButtons;
        [SerializeField] private Text[] buildingLabels;

        [Header("Wallet")]
        [SerializeField] private Text farmCoinsText;

        private UnityAction[] upgradeActions;
        private UnityAction[] buildingActions;

        private void OnEnable()
        {
            if (upgradeService != null)
                upgradeService.UpgradePurchased += HandleUpgradeChanged;
            if (buildingService != null)
                buildingService.BuildingPurchased += HandleBuildingPurchased;

            BindUpgradeButtons();
            BindBuildingButtons();
            RefreshAll();
        }

        private void OnDisable()
        {
            if (upgradeService != null)
                upgradeService.UpgradePurchased -= HandleUpgradeChanged;
            if (buildingService != null)
                buildingService.BuildingPurchased -= HandleBuildingPurchased;

            RemoveListeners(upgradeButtons, upgradeActions);
            RemoveListeners(buildingButtons, buildingActions);
            upgradeActions = null;
            buildingActions = null;
        }

        public void PurchaseUpgrade(int index)
        {
            if (upgradeService == null || upgrades == null ||
                index < 0 || index >= upgrades.Length || upgrades[index] == null)
                return;

            upgradeService.TryPurchase(upgrades[index]);
            RefreshAll();
        }

        public void PurchaseBuilding(int index)
        {
            if (buildingService == null || buildings == null ||
                index < 0 || index >= buildings.Length || buildings[index] == null)
                return;

            buildingService.TryPurchase(buildings[index]);
            RefreshAll();
        }

        public void RefreshAll()
        {
            PlayerProgressData progress = ProgressSaveService.Load();
            if (farmCoinsText != null)
                farmCoinsText.text = "Farm Coins: " + progress.farmCoins;

            RefreshUpgradeRows(progress.farmCoins);
            RefreshBuildingRows(progress.farmCoins);
        }

        private void BindUpgradeButtons()
        {
            if (upgradeButtons == null)
                return;

            upgradeActions = new UnityAction[upgradeButtons.Length];
            for (int i = 0; i < upgradeButtons.Length; i++)
            {
                if (upgradeButtons[i] == null)
                    continue;

                int index = i;
                upgradeActions[i] = () => PurchaseUpgrade(index);
                upgradeButtons[i].onClick.AddListener(upgradeActions[i]);
            }
        }

        private void BindBuildingButtons()
        {
            if (buildingButtons == null)
                return;

            buildingActions = new UnityAction[buildingButtons.Length];
            for (int i = 0; i < buildingButtons.Length; i++)
            {
                if (buildingButtons[i] == null)
                    continue;

                int index = i;
                buildingActions[i] = () => PurchaseBuilding(index);
                buildingButtons[i].onClick.AddListener(buildingActions[i]);
            }
        }

        private void RefreshUpgradeRows(int coins)
        {
            if (upgradeButtons == null)
                return;

            for (int i = 0; i < upgradeButtons.Length; i++)
            {
                FarmUpgradeDefinition definition = upgrades != null && i < upgrades.Length ? upgrades[i] : null;
                if (definition == null)
                {
                    upgradeButtons[i].interactable = false;
                    continue;
                }

                int level = upgradeService != null ? upgradeService.GetLevel(definition) : 0;
                int cost = definition.GetCostForNextLevel(level);
                bool canBuy = upgradeService != null && upgradeService.CanPurchase(definition);
                upgradeButtons[i].interactable = canBuy;

                if (upgradeLabels != null && i < upgradeLabels.Length && upgradeLabels[i] != null)
                {
                    upgradeLabels[i].text = level >= definition.MaxLevel
                        ? definition.DisplayName + "\nMAX LEVEL"
                        : definition.DisplayName + "\nLv. " + level + "/" + definition.MaxLevel + " • " + cost + " coins";
                }
            }
        }

        private void RefreshBuildingRows(int coins)
        {
            if (buildingButtons == null)
                return;

            for (int i = 0; i < buildingButtons.Length; i++)
            {
                FarmBuildingDefinition definition = buildings != null && i < buildings.Length ? buildings[i] : null;
                if (definition == null)
                {
                    buildingButtons[i].interactable = false;
                    continue;
                }

                bool owned = ProgressSaveService.OwnsBuilding(definition.BuildingId);
                bool canBuy = buildingService != null && buildingService.CanPurchase(definition);
                buildingButtons[i].interactable = canBuy;

                if (buildingLabels != null && i < buildingLabels.Length && buildingLabels[i] != null)
                {
                    buildingLabels[i].text = owned
                        ? definition.DisplayName + "\nOWNED"
                        : definition.DisplayName + "\n" + definition.CoinCost + " coins";
                }
            }
        }

        private void HandleUpgradeChanged(FarmUpgradeDefinition definition, int level)
        {
            RefreshAll();
        }

        private void HandleBuildingPurchased(FarmBuildingDefinition definition)
        {
            RefreshAll();
        }

        private static void RemoveListeners(Button[] buttons, UnityAction[] actions)
        {
            if (buttons == null || actions == null)
                return;

            for (int i = 0; i < buttons.Length && i < actions.Length; i++)
            {
                if (buttons[i] != null && actions[i] != null)
                    buttons[i].onClick.RemoveListener(actions[i]);
            }
        }
    }
}