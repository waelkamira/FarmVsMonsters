using UnityEngine;

namespace FarmVsMonsters.Farm
{
    public sealed class FarmAnimalPenSlot : MonoBehaviour
    {
        [SerializeField] private string slotId = "pen.slot.01";
        public string SlotId => slotId;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(slotId))
                slotId = gameObject.name.ToLowerInvariant().Replace(" ", ".");
        }
    }
}