using System.Collections.Generic;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Farm;
using UnityEngine;

namespace FarmVsMonsters.Plants
{
    /// <summary>Validates energy, board bounds, occupancy, and cooldowns before placing 2D plants.</summary>
    public sealed class PlantPlacementService2D : MonoBehaviour
    {
        [SerializeField] private BattleGrid2D battleGrid;
        [SerializeField] private EnergyWallet energyWallet;
        [SerializeField] private Transform plantRoot;
        [SerializeField] private LayerMask blockingLayers = ~0;

        private readonly Dictionary<Vector2Int, GameObject> placedPlants =
            new Dictionary<Vector2Int, GameObject>();
        private readonly Dictionary<string, float> nextPlacementTimeByPlant =
            new Dictionary<string, float>();
        private readonly Collider2D[] blockerResults = new Collider2D[24];

        public bool CanPlace(
            PlantDefinition definition,
            Vector2 worldPosition,
            out Vector2Int cell,
            out Vector2 snappedPosition,
            out string reason)
        {
            cell = default;
            snappedPosition = worldPosition;
            reason = string.Empty;
            ClearDestroyedEntries();

            if (definition == null || definition.Prefab == null)
            {
                reason = "Plant definition or 2D prefab is missing.";
                return false;
            }
            if (battleGrid == null || energyWallet == null)
            {
                reason = "The 2D grid or energy wallet is not configured.";
                return false;
            }
            if (!battleGrid.TryWorldToCell(worldPosition, out cell))
            {
                reason = "Choose a cell inside the battle board.";
                return false;
            }

            snappedPosition = battleGrid.CellToWorld(cell);
            if (placedPlants.TryGetValue(cell, out GameObject existing) && existing != null)
            {
                reason = "This cell is already occupied.";
                return false;
            }

            string plantId = GetPlantId(definition);
            if (nextPlacementTimeByPlant.TryGetValue(plantId, out float nextTime) &&
                Time.time < nextTime)
            {
                reason = "This plant is recharging.";
                return false;
            }

            int blockerCount = Physics2D.OverlapBoxNonAlloc(
                snappedPosition,
                new Vector2(battleGrid.CellWidth * 0.72f, battleGrid.CellHeight * 0.72f),
                blockerResults,
                0f,
                blockingLayers);
            for (int i = 0; i < blockerCount; i++)
            {
                Collider2D blocker = blockerResults[i];
                if (blocker == null) continue;
                if (blocker.GetComponentInParent<PlantCombatController2D>() != null ||
                    blocker.GetComponentInParent<FarmDefenseTarget2D>() != null)
                {
                    reason = "This cell is already occupied.";
                    return false;
                }
            }

            if (energyWallet.Balance < definition.EnergyCost)
            {
                reason = "Not enough energy.";
                return false;
            }
            return true;
        }

        public bool TryPlace(PlantDefinition definition, Vector2 worldPosition, out string reason)
        {
            if (!CanPlace(definition, worldPosition, out Vector2Int cell,
                    out Vector2 snappedPosition, out reason))
                return false;

            if (!energyWallet.TrySpend(definition.EnergyCost))
            {
                reason = "Not enough energy.";
                return false;
            }

            GameObject instance = Instantiate(definition.Prefab, snappedPosition,
                Quaternion.identity, plantRoot != null ? plantRoot : transform);
            if (instance == null)
            {
                energyWallet.Add(definition.EnergyCost);
                reason = "The plant prefab could not be created.";
                return false;
            }

            placedPlants[cell] = instance;
            nextPlacementTimeByPlant[GetPlantId(definition)] =
                Time.time + definition.PlacementCooldown;
            reason = string.Empty;
            return true;
        }

        private static string GetPlantId(PlantDefinition definition)
        {
            return string.IsNullOrWhiteSpace(definition.PlantId)
                ? definition.name
                : definition.PlantId;
        }

        public void ClearDestroyedEntries()
        {
            List<Vector2Int> missing = null;
            foreach (KeyValuePair<Vector2Int, GameObject> pair in placedPlants)
            {
                if (pair.Value != null) continue;
                if (missing == null) missing = new List<Vector2Int>();
                missing.Add(pair.Key);
            }
            if (missing == null) return;
            foreach (Vector2Int cell in missing) placedPlants.Remove(cell);
        }
    }
}