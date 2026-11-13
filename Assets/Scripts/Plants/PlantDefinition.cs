using UnityEngine;

namespace FarmVsMonsters.Plants
{
    [CreateAssetMenu(menuName = "Farm Vs Monsters/Plants/Plant Definition", fileName = "PlantDefinition")]
    public sealed class PlantDefinition : ScriptableObject
    {
        [SerializeField] private string plantId = "plant.basic";
        [SerializeField] private string displayName = "New Plant";
        [TextArea(2, 4)] [SerializeField] private string description;
        [SerializeField] private Sprite icon;
        [SerializeField, Min(0)] private int energyCost = 25;
        [SerializeField, Min(0f)] private float placementCooldown = 0.5f;
        [SerializeField] private GameObject prefab;

        public string PlantId => plantId;
        public string DisplayName => displayName;
        public string Description => description;
        public Sprite Icon => icon;
        public int EnergyCost => energyCost;
        public float PlacementCooldown => placementCooldown;
        public GameObject Prefab => prefab;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(plantId))
                plantId = name.ToLowerInvariant().Replace(" ", ".");
            energyCost = Mathf.Max(0, energyCost);
            placementCooldown = Mathf.Max(0f, placementCooldown);
        }
    }
}
