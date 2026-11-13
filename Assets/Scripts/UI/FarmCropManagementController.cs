using FarmVsMonsters.Farm;\nusing FarmVsMonsters.Progression;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>uGUI bridge for selecting crops, planting into plots, and harvesting ready crops.</summary>
    public sealed class FarmCropManagementController : MonoBehaviour
    {
        [SerializeField] private FarmCropService cropService;
        [SerializeField] private FarmCropDefinition[] crops;
        [SerializeField] private FarmCropPlot[] plots;
        [SerializeField] private Button[] cropButtons;
        [SerializeField] private Text[] cropLabels;
        [SerializeField] private Button[] harvestButtons;\n        [SerializeField] private Button[] waterButtons;
        [SerializeField] private Text[] plotLabels;
        [SerializeField] private Text seedCountText;\n        [SerializeField] private Text waterCountText;\n        [SerializeField] private Button seedPackPurchaseButton;\n        [SerializeField, Min(1)] private int seedPackAmount = 10;\n        [SerializeField, Min(0)] private int seedPackCoinCost = 25;\n        private UnityAction seedPackAction;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private UnityAction[] cropActions;
        private UnityAction[] harvestActions;\n        private UnityAction[] waterActions;

        private void OnEnable()
        {
            if (cropService != null)
            {
                cropService.CropPlanted += HandleCropChanged;
                cropService.CropHarvested += HandleCropHarvested;
                cropService.CropChanged += HandleCropChanged;
            }
            if (resourceWallet != null)
                resourceWallet.ResourceChanged += HandleResourceChanged;

            BindCropButtons();
            BindHarvestButtons();
            Refresh();
        }

        private void OnDisable()
        {
            if (cropService != null)
            {
                cropService.CropPlanted -= HandleCropChanged;
                cropService.CropHarvested -= HandleCropHarvested;
                cropService.CropChanged -= HandleCropChanged;
            }
            if (resourceWallet != null)
                resourceWallet.ResourceChanged -= HandleResourceChanged;

            RemoveListeners(cropButtons, cropActions);
            RemoveListeners(harvestButtons, harvestActions);
            cropActions = null;
            harvestActions = null;
        }

        public bool PurchaseSeedPack()\n        {\n            if (resourceWallet == null || seedPackAmount < 1 || seedPackCoinCost < 0 ||\n                !resourceWallet.CanAdd(FarmResourceType.Seeds, seedPackAmount))\n                return false;\n\n            if (!ProgressSaveService.TrySpendFarmCoins(seedPackCoinCost))\n                return false;\n\n            resourceWallet.Add(FarmResourceType.Seeds, seedPackAmount);\n            Refresh();\n            return true;\n        }\n\n        public void PlantCrop(int cropIndex, int plotIndex)
        {
            if (cropService == null || crops == null || plots == null ||
                cropIndex < 0 || cropIndex >= crops.Length || plotIndex < 0 || plotIndex >= plots.Length)
                return;

            cropService.TryPlant(plots[plotIndex], crops[cropIndex]);
            Refresh();
        }

        public void WaterCrop(int plotIndex)\n        {\n            if (cropService == null || plots == null || plotIndex < 0 || plotIndex >= plots.Length)\n                return;\n\n            cropService.TryWater(plots[plotIndex]);\n            Refresh();\n        }\n\n        public void HarvestCrop(int plotIndex)
        {
            if (cropService == null || plots == null || plotIndex < 0 || plotIndex >= plots.Length)
                return;

            cropService.TryHarvest(plots[plotIndex]);
            Refresh();
        }

        public void Refresh()
        {
            if (seedCountText != null)
                seedCountText.text = "Seeds: " + (resourceWallet != null ? resourceWallet.GetAmount(FarmResourceType.Seeds) : 0);

            if (cropButtons != null)
            {
                for (int i = 0; i < cropButtons.Length; i++)
                {
                    if (cropButtons[i] == null)
                        continue;

                    FarmCropDefinition crop = crops != null && i < crops.Length ? crops[i] : null;
                    cropButtons[i].interactable = crop != null && resourceWallet != null &&
                        resourceWallet.GetAmount(FarmResourceType.Seeds) >= crop.SeedCost;

                    if (cropLabels != null && i < cropLabels.Length && cropLabels[i] != null)
                        cropLabels[i].text = crop == null ? "Unavailable" :
                            crop.DisplayName + "\n" + crop.SeedCost + " seeds";
                }
            }

            if (plots != null)
            {
                for (int i = 0; i < plots.Length; i++)
                {
                    FarmCropPlot plot = plots[i];
                    FarmCropDefinition crop = cropService != null ? cropService.GetCrop(plot) : null;
                    float progress = cropService != null ? cropService.GetGrowthProgress(plot) : 0f;
                    bool ready = cropService != null && cropService.IsReadyToHarvest(plot);

                    if (plotLabels != null && i < plotLabels.Length && plotLabels[i] != null)
                    {
                        plotLabels[i].text = crop == null ? "Empty plot" :
                            crop.DisplayName + " • " + Mathf.RoundToInt(progress * 100f) + "%";
                    }
                    if (harvestButtons != null && i < harvestButtons.Length && harvestButtons[i] != null)
                        harvestButtons[i].interactable = ready;
                }
            }
        }

        private void BindCropButtons()
        {
            if (cropButtons == null)
                return;

            cropActions = new UnityAction[cropButtons.Length];
            for (int i = 0; i < cropButtons.Length; i++)
            {
                if (cropButtons[i] == null)
                    continue;

                int cropIndex = i;
                cropActions[i] = () => PlantFirstAvailablePlot(cropIndex);
                cropButtons[i].onClick.AddListener(cropActions[i]);
            }
        }

        private void BindHarvestButtons()
        {
            if (harvestButtons == null)
                return;

            harvestActions = new UnityAction[harvestButtons.Length];
            for (int i = 0; i < harvestButtons.Length; i++)
            {
                if (harvestButtons[i] == null)
                    continue;

                int plotIndex = i;
                harvestActions[i] = () => HarvestCrop(plotIndex);
                harvestButtons[i].onClick.AddListener(harvestActions[i]);
            }
        }

        private void BindSeedPackButton()\n        {\n            if (seedPackPurchaseButton == null)\n                return;\n\n            seedPackAction = () => { PurchaseSeedPack(); };\n            seedPackPurchaseButton.onClick.AddListener(seedPackAction);\n        }\n\n        private void BindWaterButtons()\n        {\n            if (waterButtons == null)\n                return;\n\n            waterActions = new UnityAction[waterButtons.Length];\n            for (int i = 0; i < waterButtons.Length; i++)\n            {\n                if (waterButtons[i] == null)\n                    continue;\n\n                int plotIndex = i;\n                waterActions[i] = () => WaterCrop(plotIndex);\n                waterButtons[i].onClick.AddListener(waterActions[i]);\n            }\n        }\n\n        private void PlantFirstAvailablePlot(int cropIndex)
        {
            if (plots == null || cropService == null || crops == null ||
                cropIndex < 0 || cropIndex >= crops.Length)
                return;

            foreach (FarmCropPlot plot in plots)
            {
                if (plot != null && !cropService.IsPlanted(plot) && cropService.TryPlant(plot, crops[cropIndex]))
                {
                    Refresh();
                    return;
                }
            }
            Refresh();
        }

        private void HandleCropChanged(FarmCropPlot plot, FarmCropDefinition definition)
        {
            Refresh();
        }

        private void HandleCropHarvested(FarmCropPlot plot, FarmCropDefinition definition, int amount)
        {
            Refresh();
        }

        private void HandleResourceChanged(FarmResourceType type, int amount)
        {
            Refresh();
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