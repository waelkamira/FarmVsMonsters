using System;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Persists planted crops by plot and advances growth using UTC wall-clock time.</summary>
    public sealed class FarmCropService : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.crop_plots.v1";

        [Serializable]
        private sealed class CropPlotSave
        {
            public string plotId;
            public string cropId;
            public long plantedAtUtcTicks;
        }

        [Serializable]
        private sealed class CropSave
        {
            public int version = 1;
            public CropPlotSave[] plots = Array.Empty<CropPlotSave>();
        }

        [SerializeField] private FarmCropPlot[] plots;
        [SerializeField] private FarmCropDefinition[] cropCatalogue;
        [SerializeField] private Transform cropVisualRoot;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private readonly Dictionary<string, CropPlotSave> planted = new Dictionary<string, CropPlotSave>(StringComparer.Ordinal);
        private readonly Dictionary<string, GameObject> visuals = new Dictionary<string, GameObject>(StringComparer.Ordinal);

        public event Action<FarmCropPlot, FarmCropDefinition> CropPlanted;
        public event Action<FarmCropPlot, FarmCropDefinition, int> CropHarvested;
        public event Action<FarmCropPlot, FarmCropDefinition> CropChanged;

        private void Awake()
        {
            Load();
        }

        private void Start()
        {
            RefreshAllVisuals();
        }

        public FarmCropDefinition GetCrop(FarmCropPlot plot)
        {
            if (plot == null || !planted.TryGetValue(plot.PlotId, out CropPlotSave data))
                return null;
            return FindDefinition(data.cropId);
        }

        public bool IsPlanted(FarmCropPlot plot)
        {
            return plot != null && planted.ContainsKey(plot.PlotId);
        }

        public float GetGrowthProgress(FarmCropPlot plot)
        {
            if (plot == null || !planted.TryGetValue(plot.PlotId, out CropPlotSave data))
                return 0f;

            FarmCropDefinition definition = FindDefinition(data.cropId);
            if (definition == null)
                return 0f;

            double elapsed = Math.Max(0d, (DateTime.UtcNow.Ticks - data.plantedAtUtcTicks) / (double)TimeSpan.TicksPerSecond);
            return Mathf.Clamp01((float)(elapsed / definition.GrowthDurationSeconds));
        }

        public bool IsReadyToHarvest(FarmCropPlot plot)
        {
            return GetCrop(plot) != null && GetGrowthProgress(plot) >= 1f;
        }

        public bool CanPlant(FarmCropPlot plot, FarmCropDefinition definition)
        {
            return plot != null && definition != null &&
                   !string.IsNullOrWhiteSpace(plot.PlotId) &&
                   !IsPlanted(plot) &&
                   definition.GrowthStagePrefabs != null && definition.GrowthStagePrefabs.Length > 0 &&
                   definition.GrowthStagePrefabs[0] != null &&
                   ProgressSaveService.IsStageUnlocked(definition.RequiredStage) &&
                   resourceWallet != null &&
                   resourceWallet.GetAmount(FarmResourceType.Seeds) >= definition.SeedCost;
        }

        public bool TryPlant(FarmCropPlot plot, FarmCropDefinition definition)
        {
            if (!CanPlant(plot, definition) ||
                !resourceWallet.TrySpend(FarmResourceType.Seeds, definition.SeedCost))
                return false;

            planted.Add(plot.PlotId, new CropPlotSave
            {
                plotId = plot.PlotId,
                cropId = definition.CropId,
                plantedAtUtcTicks = DateTime.UtcNow.Ticks
            });
            Save();
            RefreshVisual(plot, definition);
            CropPlanted?.Invoke(plot, definition);
            return true;
        }

        public bool TryHarvest(FarmCropPlot plot)
        {
            if (!IsReadyToHarvest(plot) ||
                !planted.TryGetValue(plot.PlotId, out CropPlotSave data))
                return false;

            FarmCropDefinition definition = FindDefinition(data.cropId);
            if (definition == null || resourceWallet == null)
                return false;

            int accepted = resourceWallet.Add(definition.HarvestResource, definition.HarvestAmount);
            if (accepted <= 0)
                return false;

            planted.Remove(plot.PlotId);
            Save();
            RemoveVisual(plot.PlotId);
            CropHarvested?.Invoke(plot, definition, accepted);
            return true;
        }

        public void RefreshAllVisuals()
        {
            if (plots == null)
                return;

            foreach (FarmCropPlot plot in plots)
            {
                if (plot == null)
                    continue;

                FarmCropDefinition definition = GetCrop(plot);
                if (definition != null)
                    RefreshVisual(plot, definition);
            }
        }

        private void RefreshVisual(FarmCropPlot plot, FarmCropDefinition definition)
        {
            if (plot == null || definition == null || definition.GrowthStagePrefabs == null ||
                definition.GrowthStagePrefabs.Length == 0)
                return;

            float progress = GetGrowthProgress(plot);
            int stageIndex = Mathf.Clamp(
                Mathf.FloorToInt(progress * definition.GrowthStagePrefabs.Length),
                0, definition.GrowthStagePrefabs.Length - 1);
            GameObject prefab = definition.GrowthStagePrefabs[stageIndex];
            if (prefab == null)
                return;

            RemoveVisual(plot.PlotId);
            GameObject instance = Instantiate(prefab, plot.transform.position, plot.transform.rotation, cropVisualRoot);
            visuals[plot.PlotId] = instance;
            CropChanged?.Invoke(plot, definition);
        }

        private void RemoveVisual(string plotId)
        {
            if (!visuals.TryGetValue(plotId, out GameObject instance))
                return;

            visuals.Remove(plotId);
            if (instance != null)
                Destroy(instance);
        }

        private FarmCropDefinition FindDefinition(string cropId)
        {
            if (cropCatalogue == null)
                return null;

            foreach (FarmCropDefinition definition in cropCatalogue)
            {
                if (definition != null && string.Equals(definition.CropId, cropId, StringComparison.Ordinal))
                    return definition;
            }
            return null;
        }

        private void Load()
        {
            planted.Clear();
            if (!PlayerPrefs.HasKey(SaveKey))
                return;

            try
            {
                CropSave data = JsonUtility.FromJson<CropSave>(PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data == null || data.version != 1 || data.plots == null)
                    return;

                foreach (CropPlotSave entry in data.plots)
                {
                    if (entry == null || string.IsNullOrWhiteSpace(entry.plotId) ||
                        string.IsNullOrWhiteSpace(entry.cropId) || entry.plantedAtUtcTicks <= 0)
                        continue;
                    planted[entry.plotId] = entry;
                }
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load farm crops: " + exception.Message);
            }
        }

        private void Save()
        {
            var data = new CropSave
            {
                plots = new List<CropPlotSave>(planted.Values).ToArray()
            };
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(data));
            PlayerPrefs.Save();
        }
    }
}