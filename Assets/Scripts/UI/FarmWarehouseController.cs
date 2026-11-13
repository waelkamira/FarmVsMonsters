using FarmVsMonsters.Farm;
using UnityEngine;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>uGUI view for warehouse capacity, upgrade price, and resource stock.</summary>
    public sealed class FarmWarehouseController : MonoBehaviour
    {
        [SerializeField] private FarmWarehouseService warehouse;
        [SerializeField] private FarmResourceWallet resources;
        [SerializeField] private Text levelText;
        [SerializeField] private Text capacityText;
        [SerializeField] private Text stockText;
        [SerializeField] private Text costText;
        [SerializeField] private Text statusText;
        [SerializeField] private Button upgradeButton;

        private void OnEnable()
        {
            if (warehouse != null)
                warehouse.WarehouseUpgraded += HandleUpgrade;
            if (upgradeButton != null)
                upgradeButton.onClick.AddListener(Upgrade);
            Refresh();
        }

        private void OnDisable()
        {
            if (warehouse != null)
                warehouse.WarehouseUpgraded -= HandleUpgrade;
            if (upgradeButton != null)
                upgradeButton.onClick.RemoveListener(Upgrade);
        }

        public void Refresh()
        {
            if (warehouse == null) return;
            if (levelText != null)
                levelText.text = "Warehouse level " + warehouse.Level;
            if (capacityText != null)
                capacityText.text = "Capacity per resource: " + warehouse.CapacityPerResource;
            if (costText != null)
                costText.text = warehouse.Level >= warehouse.MaximumLevel
                    ? "Maximum level reached"
                    : "Next upgrade: " + warehouse.NextUpgradeCost + " farm coins";
            if (upgradeButton != null)
                upgradeButton.interactable = warehouse.CanUpgrade();

            if (stockText != null && resources != null)
            {
                stockText.text =
                    "Wheat: " + resources.GetAmount(FarmResourceType.Wheat) + "\n" +
                    "Milk: " + resources.GetAmount(FarmResourceType.Milk) + "\n" +
                    "Wool: " + resources.GetAmount(FarmResourceType.Wool) + "\n" +
                    "Eggs: " + resources.GetAmount(FarmResourceType.Eggs) + "\n" +
                    "Meat: " + resources.GetAmount(FarmResourceType.Meat) + "\n" +
                    "Seeds: " + resources.GetAmount(FarmResourceType.Seeds) + "\n" +
                    "Water: " + resources.GetAmount(FarmResourceType.Water) + "\n" +
                    "Flour: " + resources.GetAmount(FarmResourceType.Flour) + "\n" +
                    "Bread: " + resources.GetAmount(FarmResourceType.Bread);
            }
        }

        private void Upgrade()
        {
            if (warehouse == null) return;
            bool success = warehouse.TryUpgrade();
            if (statusText != null)
                statusText.text = success ? "Warehouse capacity upgraded." : "Upgrade unavailable.";
            Refresh();
        }

        private void HandleUpgrade(int level, int capacity)
        {
            if (statusText != null)
                statusText.text = "Warehouse upgraded to level " + level;
            Refresh();
        }
    }
}