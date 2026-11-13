using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(fileName = "AnimalDefinition2D", menuName = "Farm Vs Monsters/2D/Animal Definition")]
    public sealed class FarmAnimalDefinition2D : ScriptableObject
    {
        [SerializeField] private string animalId = "hen";
        [SerializeField] private string displayName = "Hen";
        [SerializeField, Min(0)] private int feedCost = 1;
        [SerializeField, Min(1f)] private float productionSeconds = 25f;
        [SerializeField, Min(1)] private int produceYield = 2;
        [SerializeField, Min(1f)] private float animalHealth = 45f;
        [SerializeField] private Sprite idleSprite;
        [SerializeField] private Sprite readySprite;

        public string AnimalId => animalId;
        public string DisplayName => displayName;
        public int FeedCost => feedCost;
        public float ProductionSeconds => productionSeconds;
        public int ProduceYield => produceYield;
        public float AnimalHealth => animalHealth;
        public Sprite IdleSprite => idleSprite;
        public Sprite ReadySprite => readySprite;

        private void OnValidate()
        {
            animalId = string.IsNullOrWhiteSpace(animalId) ? name.ToLowerInvariant() : animalId.Trim();
            productionSeconds = Mathf.Max(1f, productionSeconds);
            produceYield = Mathf.Max(1, produceYield);
            animalHealth = Mathf.Max(1f, animalHealth);
        }
    }
}