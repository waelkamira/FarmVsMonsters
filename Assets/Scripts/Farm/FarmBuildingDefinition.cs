using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(menuName = "Farm Vs Monsters/Farm Building", fileName = "FarmBuilding")]
    public sealed class FarmBuildingDefinition : ScriptableObject
    {
        [SerializeField] private string buildingId = "farm.house";
        [SerializeField] private string displayName = "Farm House";
        [TextArea, SerializeField] private string description;
        [SerializeField] private GameObject prefab;
        [SerializeField] private string slotId = "farm.slot.01";
        [SerializeField, Min(0)] private int coinCost = 150;
        [SerializeField, Min(1)] private int requiredStage = 1;

        public string BuildingId => buildingId;
        public string DisplayName => displayName;
        public string Description => description;
        public GameObject Prefab => prefab;
        public string SlotId => slotId;
        public int CoinCost => coinCost;
        public int RequiredStage => requiredStage;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(buildingId))
                buildingId = name.ToLowerInvariant().Replace(" ", ".");
            if (string.IsNullOrWhiteSpace(slotId))
                slotId = buildingId;
            coinCost = Mathf.Max(0, coinCost);
            requiredStage = Mathf.Max(1, requiredStage);
        }
    }
}