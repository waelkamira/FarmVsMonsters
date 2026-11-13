using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(fileName = "CropDefinition2D", menuName = "Farm Vs Monsters/2D/Crop Definition")]
    public sealed class FarmCropDefinition2D : ScriptableObject
    {
        [SerializeField] private string cropId = "wheat";
        [SerializeField] private string displayName = "Wheat";
        [SerializeField, Min(0)] private int seedCost = 1;
        [SerializeField, Min(1f)] private float growthSeconds = 20f;
        [SerializeField, Min(1)] private int harvestYield = 3;
        [SerializeField, Min(1f)] private float cropHealth = 35f;
        [SerializeField] private Sprite growingSprite;
        [SerializeField] private Sprite readySprite;

        public string CropId => cropId;
        public string DisplayName => displayName;
        public int SeedCost => seedCost;
        public float GrowthSeconds => growthSeconds;
        public int HarvestYield => harvestYield;
        public float CropHealth => cropHealth;
        public Sprite GrowingSprite => growingSprite;
        public Sprite ReadySprite => readySprite;

        private void OnValidate()
        {
            cropId = string.IsNullOrWhiteSpace(cropId) ? name.ToLowerInvariant() : cropId.Trim();
            growthSeconds = Mathf.Max(1f, growthSeconds);
            harvestYield = Mathf.Max(1, harvestYield);
            cropHealth = Mathf.Max(1f, cropHealth);
        }
    }
}