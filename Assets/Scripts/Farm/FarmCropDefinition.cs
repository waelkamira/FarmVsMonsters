using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(menuName = "Farm Vs Monsters/Farm Crop", fileName = "FarmCrop")]
    public sealed class FarmCropDefinition : ScriptableObject
    {
        [SerializeField] private string cropId = "crop.wheat";
        [SerializeField] private string displayName = "Wheat";
        [TextArea, SerializeField] private string description;
        [SerializeField] private GameObject[] growthStagePrefabs;
        [SerializeField] private FarmResourceType harvestResource = FarmResourceType.Wheat;
        [SerializeField, Min(1)] private int seedCost = 1;
        [SerializeField, Min(1)] private int harvestAmount = 3;
        [SerializeField, Min(10f)] private float growthDurationSeconds = 180f;
        [SerializeField, Min(1)] private int requiredStage = 1;
        [SerializeField, Min(1f)] private float wateringGrowthBoostSeconds = 30f;
        [SerializeField, Min(1f)] private float wateringCooldownSeconds = 60f;

        public string CropId => cropId;
        public string DisplayName => displayName;
        public string Description => description;
        public GameObject[] GrowthStagePrefabs => growthStagePrefabs;
        public FarmResourceType HarvestResource => harvestResource;
        public int SeedCost => seedCost;
        public int HarvestAmount => harvestAmount;
        public float GrowthDurationSeconds => growthDurationSeconds;
        public int RequiredStage => requiredStage;
        public float WateringGrowthBoostSeconds => wateringGrowthBoostSeconds;
        public float WateringCooldownSeconds => wateringCooldownSeconds;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(cropId))
                cropId = name.ToLowerInvariant().Replace(" ", ".");
            seedCost = Mathf.Max(1, seedCost);
            harvestAmount = Mathf.Max(1, harvestAmount);
            growthDurationSeconds = Mathf.Max(10f, growthDurationSeconds);
            requiredStage = Mathf.Max(1, requiredStage);
            wateringGrowthBoostSeconds = Mathf.Max(1f, wateringGrowthBoostSeconds);
            wateringCooldownSeconds = Mathf.Max(1f, wateringCooldownSeconds);
        }
    }
}