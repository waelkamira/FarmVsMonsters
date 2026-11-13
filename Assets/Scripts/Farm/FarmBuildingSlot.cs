using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Named placement anchor for a persistent farm building.</summary>
    public sealed class FarmBuildingSlot : MonoBehaviour
    {
        [SerializeField] private string slotId = "farm.slot.01";
        public string SlotId => slotId;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(slotId))
                slotId = gameObject.name.ToLowerInvariant().Replace(" ", ".");
        }
    }
}