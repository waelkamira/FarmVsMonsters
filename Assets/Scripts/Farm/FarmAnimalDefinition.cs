using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(menuName = "Farm Vs Monsters/Farm Animal", fileName = "FarmAnimal")]
    public sealed class FarmAnimalDefinition : ScriptableObject
    {
        [SerializeField] private string animalId = "farm.sheep";
        [SerializeField] private string displayName = "Sheep";
        [TextArea, SerializeField] private string description;
        [SerializeField] private GameObject prefab;
        [SerializeField] private FarmResourceType producedResource = FarmResourceType.Wool;
        [SerializeField, Min(1)] private int productionAmount = 1;
        [SerializeField, Min(10f)] private float productionIntervalSeconds = 300f;
        [SerializeField, Min(0)] private int coinCost = 100;
        [SerializeField, Min(1)] private int requiredStage = 1;

        public string AnimalId => animalId;
        public string DisplayName => displayName;
        public string Description => description;
        public GameObject Prefab => prefab;
        public FarmResourceType ProducedResource => producedResource;
        public int ProductionAmount => productionAmount;
        public float ProductionIntervalSeconds => productionIntervalSeconds;
        public int CoinCost => coinCost;
        public int RequiredStage => requiredStage;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(animalId))
                animalId = name.ToLowerInvariant().Replace(" ", ".");
            productionAmount = Mathf.Max(1, productionAmount);
            productionIntervalSeconds = Mathf.Max(10f, productionIntervalSeconds);
            coinCost = Mathf.Max(0, coinCost);
            requiredStage = Mathf.Max(1, requiredStage);
        }
    }
}