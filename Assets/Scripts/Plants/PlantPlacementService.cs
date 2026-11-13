using System.Collections.Generic;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Farm;
using UnityEngine;

namespace FarmVsMonsters.Plants
{
    /// <summary>Places one plant per grid cell and charges energy only after validation.</summary>
    public sealed class PlantPlacementService : MonoBehaviour
    {
        [SerializeField] private BattleGrid battleGrid;
        [SerializeField] private EnergyWallet energyWallet;
        [SerializeField] private Transform plantRoot;

        private readonly HashSet<Vector2Int> occupiedCells = new HashSet<Vector2Int>();
        private float nextPlacementTime;

        public bool TryPlace(PlantDefinition definition, Vector3 worldPosition, out GameObject instance)
        {
            instance = null;

            if (definition == null || definition.Prefab == null ||
                battleGrid == null || energyWallet == null ||
                Time.time < nextPlacementTime)
                return false;

            if (!battleGrid.TryWorldToCell(worldPosition, out Vector2Int cell) ||
                occupiedCells.Contains(cell) ||
                energyWallet.Balance < definition.EnergyCost)
                return false;

            if (!energyWallet.TrySpend(definition.EnergyCost))
                return false;

            try
            {
                instance = Instantiate(
                    definition.Prefab,
                    battleGrid.CellToWorld(cell),
                    definition.Prefab.transform.rotation,
                    plantRoot);
            }
            catch
            {
                energyWallet.Add(definition.EnergyCost);
                instance = null;
                return false;
            }

            occupiedCells.Add(cell);
            nextPlacementTime = Time.time + definition.PlacementCooldown;
            return true;
        }

        public bool ReleaseCell(Vector3 worldPosition)
        {
            if (battleGrid == null ||
                !battleGrid.TryWorldToCell(worldPosition, out Vector2Int cell))
                return false;

            return occupiedCells.Remove(cell);
        }

        public void ClearBattleState()
        {
            occupiedCells.Clear();
            nextPlacementTime = 0f;
        }
    }
}
