using FarmVsMonsters.Combat;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>A single fixed 2D plot: plant, grow, water, harvest, or lose its crop to monsters.</summary>
    [RequireComponent(typeof(Health))]
    public sealed class FarmCropPlot2D : MonoBehaviour
    {
        public enum PlotState { Empty, Growing, Ready }

        [SerializeField] private FarmCropDefinition2D crop;
        [SerializeField] private FarmResourceWallet2D wallet;
        [SerializeField] private SpriteRenderer cropRenderer;
        [SerializeField] private FarmDefenseTarget2D monsterTarget;
        [SerializeField, Min(0.1f)] private float waterGrowthMultiplier = 2f;

        private Health cropHealth;
        private float growthRemaining;
        private bool watered;

        public PlotState State { get; private set; } = PlotState.Empty;
        public float GrowthProgress => State == PlotState.Ready ? 1f :
            crop == null || crop.GrowthSeconds <= 0f ? 0f :
            Mathf.Clamp01(1f - growthRemaining / crop.GrowthSeconds);
        public string CropName => crop != null ? crop.DisplayName : string.Empty;

        private void Awake()
        {
            cropHealth = GetComponent<Health>();
            if (cropRenderer == null) cropRenderer = GetComponentInChildren<SpriteRenderer>();
            if (monsterTarget == null) monsterTarget = GetComponent<FarmDefenseTarget2D>();
            if (monsterTarget != null) monsterTarget.enabled = false;
            if (cropHealth != null) cropHealth.Died += HandleCropDestroyed;
            RefreshVisual();
        }

        private void OnDestroy()
        {
            if (cropHealth != null) cropHealth.Died -= HandleCropDestroyed;
        }

        private void HandleCropDestroyed()
        {
            ClearCrop();
        }

        private void Update()
        {
            if (State != PlotState.Growing) return;
            growthRemaining -= Time.deltaTime * (watered ? waterGrowthMultiplier : 1f);
            if (growthRemaining <= 0f)
            {
                growthRemaining = 0f;
                State = PlotState.Ready;
                RefreshVisual();
            }
        }

        public void Configure(FarmResourceWallet2D resourceWallet, FarmCropDefinition2D definition)
        {
            wallet = resourceWallet;
            crop = definition;
        }

        public bool TryPlant()
        {
            if (State != PlotState.Empty || crop == null || wallet == null ||
                !wallet.TrySpendSeeds(crop.SeedCost))
                return false;

            growthRemaining = crop.GrowthSeconds;
            watered = false;
            State = PlotState.Growing;
            if (cropHealth != null) cropHealth.SetMaxHealth(crop.CropHealth, true);
            if (monsterTarget != null) monsterTarget.enabled = true;
            RefreshVisual();
            return true;
        }

        public bool TryWater(float growthSecondsReduction)
        {
            if (State != PlotState.Growing || watered) return false;
            watered = true;
            growthRemaining = Mathf.Max(0f, growthRemaining - Mathf.Max(0f, growthSecondsReduction));
            if (growthRemaining <= 0f)
            {
                State = PlotState.Ready;
                RefreshVisual();
            }
            return true;
        }

        public bool TryHarvest()
        {
            if (State != PlotState.Ready || crop == null || wallet == null) return false;
            if (!wallet.TryAddProduce(crop.HarvestYield)) return false;
            ClearCrop();
            return true;
        }

        public void ClearCrop()
        {
            State = PlotState.Empty;
            growthRemaining = 0f;
            watered = false;
            if (monsterTarget != null) monsterTarget.enabled = false;
            RefreshVisual();
        }

        private void RefreshVisual()
        {
            if (cropRenderer == null) return;
            if (State == PlotState.Empty || crop == null)
                cropRenderer.enabled = false;
            else
            {
                cropRenderer.enabled = true;
                cropRenderer.sprite = State == PlotState.Ready
                    ? crop.ReadySprite : crop.GrowingSprite;
            }
        }

        private void OnValidate()
        {
            waterGrowthMultiplier = Mathf.Max(0.1f, waterGrowthMultiplier);
        }
    }
}