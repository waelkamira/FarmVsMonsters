using System;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Owns specialized storage buildings and aggregates their per-resource capacity bonuses.</summary>
    public sealed class FarmStorageFacilityService : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.storage_facilities.v1";

        [Serializable]
        private sealed class FacilityLevel
        {
            public string storageId;
            public int level;
        }

        [Serializable]
        private sealed class SaveData
        {
            public int version = 1;
            public FacilityLevel[] facilities = Array.Empty<FacilityLevel>();
        }

        [SerializeField] private FarmStorageFacilityDefinition[] facilities;
        [SerializeField] private FarmStorageSlot[] slots;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private readonly Dictionary<string, int> levels = new Dictionary<string, int>(StringComparer.Ordinal);
        private readonly Dictionary<string, GameObject> spawned = new Dictionary<string, GameObject>(StringComparer.Ordinal);

        public event Action<FarmStorageFacilityDefinition, int> FacilityUpgraded;
        public event Action<FarmStorageFacilityDefinition> UpgradeRejected;

        private void Awake() { Load(); }

        private void Start()
        {
            ApplyCapacityBonuses();
            RestoreBuildings();
        }

        public int GetLevel(FarmStorageFacilityDefinition definition)
        {
            if (definition == null || string.IsNullOrWhiteSpace(definition.StorageId)) return 0;
            return levels.TryGetValue(definition.StorageId, out int value) ? value : 0;
        }

        public int GetCapacityBonus(FarmResourceType resource)
        {
            long bonus = 0;
            if (facilities != null)
                foreach (FarmStorageFacilityDefinition definition in facilities)
                    if (definition != null && definition.IsValid &&
                        ContainsResource(definition, resource))
                        bonus += (long)GetLevel(definition) * definition.CapacityBonusPerLevel;
            return bonus >= int.MaxValue ? int.MaxValue : (int)bonus;
        }

        public int GetEffectiveCapacity(FarmResourceType resource)
        {
            return resourceWallet != null ? resourceWallet.GetCapacity(resource) : 0;
        }

        public bool CanUpgrade(FarmStorageFacilityDefinition definition)
        {
            if (definition == null || !definition.IsValid || resourceWallet == null ||
                !ContainsConfigured(definition) || !HasUniqueIdentityAndSlot(definition) ||
                !ProgressSaveService.IsStageUnlocked(definition.RequiredStage) ||
                GetLevel(definition) >= definition.MaximumLevel ||
                FindSlot(definition.SlotId) == null)
                return false;

            return ProgressSaveService.Load().farmCoins >=
                   definition.GetUpgradeCost(GetLevel(definition));
        }

        public bool TryUpgrade(FarmStorageFacilityDefinition definition)
        {
            if (!CanUpgrade(definition))
            {
                UpgradeRejected?.Invoke(definition);
                return false;
            }

            int cost = definition.GetUpgradeCost(GetLevel(definition));
            if (!ProgressSaveService.TrySpendFarmCoins(cost))
            {
                UpgradeRejected?.Invoke(definition);
                return false;
            }

            int newLevel = GetLevel(definition) + 1;
            levels[definition.StorageId] = newLevel;
            Save();
            ApplyCapacityBonuses();
            RestoreBuilding(definition);
            FacilityUpgraded?.Invoke(definition, newLevel);
            return true;
        }

        public FarmStorageFacilityDefinition[] GetAvailableFacilities()
        {
            if (facilities == null) return Array.Empty<FarmStorageFacilityDefinition>();
            var result = new List<FarmStorageFacilityDefinition>();
            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (FarmStorageFacilityDefinition definition in facilities)
                if (definition != null && definition.IsValid &&
                    ProgressSaveService.IsStageUnlocked(definition.RequiredStage) &&
                    HasUniqueIdentityAndSlot(definition) && ids.Add(definition.StorageId))
                    result.Add(definition);
            return result.ToArray();
        }

        private void ApplyCapacityBonuses()
        {
            if (resourceWallet == null) return;
            for (int i = 0; i < 9; i++)
                resourceWallet.SetAdditionalCapacity((FarmResourceType)i,
                    GetCapacityBonus((FarmResourceType)i));
        }

        private void RestoreBuildings()
        {
            if (facilities == null) return;
            foreach (FarmStorageFacilityDefinition definition in facilities)
                if (definition != null && GetLevel(definition) > 0)
                    RestoreBuilding(definition);
        }

        private void RestoreBuilding(FarmStorageFacilityDefinition definition)
        {
            if (definition == null || definition.BuildingPrefab == null ||
                spawned.ContainsKey(definition.StorageId)) return;
            FarmStorageSlot slot = FindSlot(definition.SlotId);
            if (slot == null)
            {
                Debug.LogWarning("Missing storage slot: " + definition.SlotId);
                return;
            }

            GameObject instance = Instantiate(definition.BuildingPrefab,
                slot.transform.position, slot.transform.rotation, slot.transform);
            instance.name = definition.DisplayName;
            spawned.Add(definition.StorageId, instance);
        }

        private FarmStorageSlot FindSlot(string id)
        {
            if (slots == null) return null;
            FarmStorageSlot found = null;
            foreach (FarmStorageSlot slot in slots)
            {
                if (slot == null || !string.Equals(slot.SlotId, id, StringComparison.Ordinal))
                    continue;
                if (found != null)
                {
                    Debug.LogWarning("Duplicate FarmStorageSlot ID: " + id);
                    return null;
                }
                found = slot;
            }
            return found;
        }

        private bool HasUniqueIdentityAndSlot(FarmStorageFacilityDefinition target)
        {
            if (facilities == null || target == null) return false;
            int sameId = 0;
            int sameSlot = 0;
            foreach (FarmStorageFacilityDefinition item in facilities)
            {
                if (item == null || !item.IsValid) continue;
                if (string.Equals(item.StorageId, target.StorageId, StringComparison.Ordinal)) sameId++;
                if (string.Equals(item.SlotId, target.SlotId, StringComparison.Ordinal)) sameSlot++;
            }
            return sameId == 1 && sameSlot == 1;
        }

        private bool ContainsConfigured(FarmStorageFacilityDefinition target)
        {
            if (facilities == null) return false;
            foreach (FarmStorageFacilityDefinition item in facilities)
                if (item == target) return true;
            return false;
        }

        private static bool ContainsResource(FarmStorageFacilityDefinition definition, FarmResourceType resource)
        {
            foreach (FarmResourceType item in definition.StoredResources)
                if (item == resource) return true;
            return false;
        }

        private void Load()
        {
            levels.Clear();
            if (!PlayerPrefs.HasKey(SaveKey)) return;
            try
            {
                SaveData data = JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data == null || data.version != 1 || data.facilities == null) return;
                foreach (FacilityLevel item in data.facilities)
                {
                    if (item == null || string.IsNullOrWhiteSpace(item.storageId) || item.level <= 0)
                        continue;
                    FarmStorageFacilityDefinition definition = FindDefinition(item.storageId);
                    if (definition != null)
                        levels[item.storageId] = Mathf.Clamp(item.level, 0, definition.MaximumLevel);
                }
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load specialized storage facilities: " + exception.Message);
            }
        }

        private FarmStorageFacilityDefinition FindDefinition(string id)
        {
            if (facilities == null) return null;
            foreach (FarmStorageFacilityDefinition definition in facilities)
                if (definition != null && definition.IsValid &&
                    string.Equals(definition.StorageId, id, StringComparison.Ordinal))
                    return definition;
            return null;
        }

        private void Save()
        {
            var data = new SaveData { facilities = Array.Empty<FacilityLevel>() };
            foreach (KeyValuePair<string, int> item in levels)
                data.facilities = Append(data.facilities, new FacilityLevel
                {
                    storageId = item.Key,
                    level = item.Value
                });
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(data));
            PlayerPrefs.Save();
        }

        private static FacilityLevel[] Append(FacilityLevel[] source, FacilityLevel item)
        {
            var list = new List<FacilityLevel>(source) { item };
            return list.ToArray();
        }
    }
}