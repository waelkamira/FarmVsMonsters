using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Stable scene anchor for one specialized farm storage building.</summary>
    public sealed class FarmStorageSlot : MonoBehaviour
    {
        [SerializeField] private string slotId = "storage.grain";
        public string SlotId => slotId;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(slotId))
                slotId = name.ToLowerInvariant().Replace(" ", ".");
        }
    }
}