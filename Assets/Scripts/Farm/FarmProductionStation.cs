using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Stable scene anchor identifying one production station.</summary>
    public sealed class FarmProductionStation : MonoBehaviour
    {
        [SerializeField] private string stationId;
        public string StationId => stationId;
    }
}