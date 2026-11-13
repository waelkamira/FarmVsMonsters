using System;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Purchases and restores permanent buildings at configured farm slots.</summary>
    public sealed class FarmBuildingService : MonoBehaviour
    {
        [SerializeField] private FarmBuildingSlot[] slots;
        [SerializeField] private FarmBuildingDefinition[] availableBuildings;
        [SerializeField] private Transform buildingRoot;

        private readonly Dictionary<string, GameObject> spawnedBuildings =
            new Dictionary<string, GameObject>(StringComparer.Ordinal);

        public event Action<FarmBuildingDefinition> BuildingPurchased;
        public event Action<FarmBuildingDefinition> PurchaseRejected;

        private void Start()
        {
            RestoreOwnedBuildings();
        }

        public bool CanPurchase(FarmBuildingDefinition definition)
        {
            if (definition == null || definition.Prefab == null ||
                string.IsNullOrWhiteSpace(definition.BuildingId) ||
                ProgressSaveService.OwnsBuilding(definition.BuildingId) ||
                !ProgressSaveService.IsStageUnlocked(definition.RequiredStage))
                return false;

            return FindSlot(definition.BuildingId) != null &&
                   ProgressSaveService.Load().farmCoins >= definition.CoinCost;
        }

        public bool TryPurchase(FarmBuildingDefinition definition)
        {
            if (!CanPurchase(definition))
            {
                PurchaseRejected?.Invoke(definition);
                return false;
            }

            FarmBuildingSlot slot = FindSlot(definition.BuildingId);
            if (slot == null || !ProgressSaveService.TryPurchaseBuilding(definition.BuildingId, definition.CoinCost))
            {
                PurchaseRejected?.Invoke(definition);
                return false;
            }

            SpawnBuilding(definition, slot);
            BuildingPurchased?.Invoke(definition);
            return true;
        }

        public void RestoreOwnedBuildings()
        {
            if (availableBuildings == null)
                return;

            foreach (FarmBuildingDefinition definition in availableBuildings)
            {
                if (definition == null || !ProgressSaveService.OwnsBuilding(definition.BuildingId))
                    continue;

                FarmBuildingSlot slot = FindSlot(definition.BuildingId);
                if (slot != null)
                    SpawnBuilding(definition, slot);
            }
        }

        private FarmBuildingSlot FindSlot(string buildingId)
        {
            if (slots == null)
                return null;

            foreach (FarmBuildingSlot slot in slots)
            {
                if (slot != null && string.Equals(slot.SlotId, buildingId, StringComparison.Ordinal))
                    return slot;
            }

            return null;
        }

        private void SpawnBuilding(FarmBuildingDefinition definition, FarmBuildingSlot slot)
        {
            if (definition == null || definition.Prefab == null || slot == null ||
                spawnedBuildings.ContainsKey(definition.BuildingId))
                return;

            GameObject instance = Instantiate(
                definition.Prefab,
                slot.transform.position,
                slot.transform.rotation,
                buildingRoot);
            spawnedBuildings.Add(definition.BuildingId, instance);
        }
    }
}