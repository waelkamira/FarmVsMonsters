using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(menuName = "Farm Vs Monsters/Storage Facility", fileName = "StorageFacility")]
    public sealed class FarmStorageFacilityDefinition : ScriptableObject
    {
        [SerializeField] private string storageId = "storage.grain";
        [SerializeField] private string slotId = "storage.grain";
        [SerializeField] private string displayName = "Grain Warehouse";
        [TextArea, SerializeField] private string description = "Stores grain and seed resources.";
        [SerializeField] private GameObject buildingPrefab;
        [SerializeField] private FarmResourceType[] storedResources =
            { FarmResourceType.Wheat, FarmResourceType.Seeds };
        [SerializeField, Min(1)] private int capacityBonusPerLevel = 3000;
        [SerializeField, Min(0)] private int baseUpgradeCost = 350;
        [SerializeField, Min(1f)] private float costMultiplier = 1.6f;
        [SerializeField, Min(1)] private int maximumLevel = 5;
        [SerializeField, Min(1)] private int requiredStage = 1;

        public string StorageId => storageId;
        public string SlotId => slotId;
        public string DisplayName => displayName;
        public string Description => description;
        public GameObject BuildingPrefab => buildingPrefab;
        public FarmResourceType[] StoredResources => storedResources;
        public int CapacityBonusPerLevel => capacityBonusPerLevel;
        public int MaximumLevel => maximumLevel;
        public int RequiredStage => requiredStage;

        public bool IsValid
        {
            get
            {
                if (string.IsNullOrWhiteSpace(storageId) || string.IsNullOrWhiteSpace(slotId) ||
                    string.IsNullOrWhiteSpace(displayName) || storedResources == null ||
                    storedResources.Length == 0 || capacityBonusPerLevel <= 0 ||
                    maximumLevel <= 0 || requiredStage <= 0)
                    return false;
                for (int i = 0; i < storedResources.Length; i++)
                {
                    if (!System.Enum.IsDefined(typeof(FarmResourceType), storedResources[i]))
                        return false;
                    for (int j = 0; j < i; j++)
                        if (storedResources[j] == storedResources[i]) return false;
                }
                return true;
            }
        }

        public int GetUpgradeCost(int currentLevel)
        {
            double cost = Mathf.Max(0, baseUpgradeCost) *
                System.Math.Pow(Mathf.Max(1f, costMultiplier), Mathf.Max(0, currentLevel));
            return cost >= int.MaxValue ? int.MaxValue : Mathf.Max(0, (int)System.Math.Ceiling(cost));
        }

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(storageId))
                storageId = name.ToLowerInvariant().Replace(" ", ".");
            if (string.IsNullOrWhiteSpace(slotId)) slotId = storageId;
            capacityBonusPerLevel = Mathf.Max(1, capacityBonusPerLevel);
            baseUpgradeCost = Mathf.Max(0, baseUpgradeCost);
            costMultiplier = Mathf.Max(1f, costMultiplier);
            maximumLevel = Mathf.Max(1, maximumLevel);
            requiredStage = Mathf.Max(1, requiredStage);
        }
    }
}