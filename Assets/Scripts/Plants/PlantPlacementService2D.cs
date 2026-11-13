using System.Collections.Generic;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Farm;
using UnityEngine;

namespace FarmVsMonsters.Plants
{
    /// <summary>Validates energy, board bounds, and occupied cells before placing 2D plant prefabs.</summary>
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

        public bool TryPlace(PlantDefinition definition, Vector2 worldPosition, out string reason)
        {
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
            if (!battleGrid.TryWorldToCell(worldPosition, out Vector2Int cell))
            {
                reason = "Choose a cell inside the battle board.";
                return false;
            }
            if (placedPlants.TryGetValue(cell, out GameObject existing) && existing != null)
            {
                reason = "This cell is already occupied.";
                return false;
            }

            string plantId = string.IsNullOrWhiteSpace(definition.PlantId) ? definition.name : definition.PlantId;
            if (nextPlacementTimeByPlant.TryGetValue(plantId, out float nextTime) && Time.time < nextTime)
            {
                reason = "This plant is recharging.";
                return false;
            }

            Vector2 center = battleGrid.CellToWorld(cell);
            Collider2D blocker = Physics2D.OverlapBox(
                center,
                new Vector2(battleGrid.CellWidth * 0.72f, battleGrid.CellHeight * 0.72f),
                0f,
                blockingLayers);
            if (blocker != null && blocker.GetComponentInParent<PlantCombatController2D>() != null)
            {
                reason = "This cell is already occupied.";
                return false;
            }
            if (!energyWallet.TrySpend(definition.EnergyCost))
            {
                reason = "Not enough energy.";
                return false;
            }

            GameObject instance = Instantiate(definition.Prefab, center, Quaternion.identity,
                plantRoot != null ? plantRoot : transform);
            placedPlants[cell] = instance;
            nextPlacementTimeByPlant[plantId] = Time.time + definition.PlacementCooldown;
            return true;
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
