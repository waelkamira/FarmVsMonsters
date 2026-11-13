using FarmVsMonsters.Farm;
using FarmVsMonsters.Progression;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>uGUI bridge for crop planting, watering, harvesting, and seed purchases.</summary>
    public sealed class FarmCropManagementController : MonoBehaviour
    {
        [SerializeField] private FarmCropService cropService;
        [SerializeField] private FarmCropDefinition[] crops;
        [SerializeField] private FarmCropPlot[] plots;
        [SerializeField] private Button[] cropButtons;
        [SerializeField] private Text[] cropLabels;
        [SerializeField] private Button[] harvestButtons;
        [SerializeField] private Button[] waterButtons;
        [SerializeField] private Text[] plotLabels;
        [SerializeField] private Text seedCountText;
        [SerializeField] private Text waterCountText;
        [SerializeField] private Button seedPackPurchaseButton;
        [SerializeField, Min(1)] private int seedPackAmount = 10;
        [SerializeField, Min(0)] private int seedPackCoinCost = 25;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private UnityAction[] cropActions;
        private UnityAction[] harvestActions;
        private UnityAction[] waterActions;
        private UnityAction seedPackAction;

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
            BindWaterButtons();
            BindSeedPackButton();
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
            RemoveListeners(waterButtons, waterActions);
            if (seedPackPurchaseButton != null && seedPackAction != null)
                seedPackPurchaseButton.onClick.RemoveListener(seedPackAction);

            cropActions = null;
            harvestActions = null;
            waterActions = null;
            seedPackAction = null;
        }

        public bool PurchaseSeedPack()
        {
            if (resourceWallet == null || seedPackAmount < 1 || seedPackCoinCost < 0 ||
                !resourceWallet.CanAdd(FarmResourceType.Seeds, seedPackAmount))
                return false;

            if (!ProgressSaveService.TrySpendFarmCoins(seedPackCoinCost))
                return false;

            resourceWallet.Add(FarmResourceType.Seeds, seedPackAmount);
            Refresh();
            return true;
        }

        public void PlantCrop(int cropIndex, int plotIndex)
        {
            if (cropService == null || crops == null || plots == null ||
                cropIndex < 0 || cropIndex >= crops.Length ||
                plotIndex < 0 || plotIndex >= plots.Length)
                return;

            cropService.TryPlant(plots[plotIndex], crops[cropIndex]);
            Refresh();
        }

        public void WaterCrop(int plotIndex)
        {
            if (cropService == null || plots == null || plotIndex < 0 || plotIndex >= plots.Length)
                return;

            cropService.TryWater(plots[plotIndex]);
            Refresh();
        }

        public void HarvestCrop(int plotIndex)
        {
            if (cropService == null || plots == null || plotIndex < 0 || plotIndex >= plots.Length)
                return;

            cropService.TryHarvest(plots[plotIndex]);
            Refresh();
        }

        public void Refresh()
        {
            int seeds = resourceWallet != null ? resourceWallet.GetAmount(FarmResourceType.Seeds) : 0;
            int water = resourceWallet != null ? resourceWallet.GetAmount(FarmResourceType.Water) : 0;

            if (seedCountText != null)
                seedCountText.text = "Seeds: " + seeds;
            if (waterCountText != null)
                waterCountText.text = "Water: " + water;

            if (seedPackPurchaseButton != null)
                seedPackPurchaseButton.interactable = resourceWallet != null &&
                    resourceWallet.CanAdd(FarmResourceType.Seeds, seedPackAmount) &&
                    ProgressSaveService.Load().farmCoins >= seedPackCoinCost;

            if (cropButtons != null)
            {
                for (int i = 0; i < cropButtons.Length; i++)
                {
                    if (cropButtons[i] == null)
                        continue;

                    FarmCropDefinition crop = crops != null && i < crops.Length ? crops[i] : null;
                    cropButtons[i].interactable = crop != null && resourceWallet != null &&
                        seeds >= crop.SeedCost && ProgressSaveService.IsStageUnlocked(crop.RequiredStage) &&
                        HasEmptyPlot();

                    if (cropLabels != null && i < cropLabels.Length && cropLabels[i] != null)
                        cropLabels[i].text = crop == null ? "Unavailable" :
                            crop.DisplayName + "\n" + crop.SeedCost + " seeds";
                }
            }

            if (plots == null)
                return;

            for (int i = 0; i < plots.Length; i++)
            {
                FarmCropPlot plot = plots[i];
                FarmCropDefinition crop = cropService != null ? cropService.GetCrop(plot) : null;
                float progress = cropService != null ? cropService.GetGrowthProgress(plot) : 0f;
                bool ready = cropService != null && cropService.IsReadyToHarvest(plot);
                bool canWater = cropService != null && cropService.CanWater(plot);

                if (plotLabels != null && i < plotLabels.Length && plotLabels[i] != null)
                {
                    plotLabels[i].text = crop == null ? "Empty plot" :
                        crop.DisplayName + " • " + Mathf.RoundToInt(progress * 100f) + "%";
                }
                if (harvestButtons != null && i < harvestButtons.Length && harvestButtons[i] != null)
                    harvestButtons[i].interactable = ready;
                if (waterButtons != null && i < waterButtons.Length && waterButtons[i] != null)
                    waterButtons[i].interactable = canWater;
            }
        }

        private bool HasEmptyPlot()
        {
            if (plots == null || cropService == null)
                return false;

            foreach (FarmCropPlot plot in plots)
            {
                if (plot != null && !cropService.IsPlanted(plot))
                    return true;
            }
            return false;
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

        private void BindWaterButtons()
        {
            if (waterButtons == null)
                return;

            waterActions = new UnityAction[waterButtons.Length];
            for (int i = 0; i < waterButtons.Length; i++)
            {
                if (waterButtons[i] == null)
                    continue;

                int plotIndex = i;
                waterActions[i] = () => WaterCrop(plotIndex);
                waterButtons[i].onClick.AddListener(waterActions[i]);
            }
        }

        private void BindSeedPackButton()
        {
            if (seedPackPurchaseButton == null)
                return;

            seedPackAction = () => { PurchaseSeedPack(); };
            seedPackPurchaseButton.onClick.AddListener(seedPackAction);
        }

        private void PlantFirstAvailablePlot(int cropIndex)
        {
            if (plots == null || cropService == null || crops == null ||
                cropIndex < 0 || cropIndex >= crops.Length)
                return;

            foreach (FarmCropPlot plot in plots)
            {
                if (plot != null && !cropService.IsPlanted(plot) &&
                    cropService.TryPlant(plot, crops[cropIndex]))
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