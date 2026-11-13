using FarmVsMonsters.Economy;
using UnityEngine;

namespace FarmVsMonsters.Combat
{
    /// <summary>Drops a collectible energy orb when a monster is defeated.</summary>
    [RequireComponent(typeof(Health))]
    public sealed class EnergyDropOnDeath : MonoBehaviour
    {
        [SerializeField] private GameObject pickupPrefab;
        [SerializeField, Min(1)] private int energyAmount = 10;
        [SerializeField] private Vector3 dropOffset = new Vector3(0f, 0.35f, 0f);

        private Health health;
        private EnergyWallet wallet;
        private bool dropped;

        private void Awake() { health = GetComponent<Health>(); }

        private void OnEnable()
        {
            if (health != null) health.Died += HandleDied;
        }

        private void OnDisable()
        {
            if (health != null) health.Died -= HandleDied;
        }

        public void SetWallet(EnergyWallet targetWallet)
        {
            wallet = targetWallet;
        }

        private void HandleDied()
        {
            if (dropped || pickupPrefab == null) return;
            dropped = true;
            GameObject pickup = Instantiate(pickupPrefab, transform.position + dropOffset,
                Quaternion.identity);
            EnergyPickup energyPickup = pickup.GetComponent<EnergyPickup>();
            if (energyPickup == null)
            {
                Debug.LogWarning("Energy drop prefab is missing EnergyPickup.");
                Destroy(pickup);
                return;
            }

            energyPickup.SetTargetWallet(wallet);
            energyPickup.SetEnergyAmount(Mathf.Max(1, energyAmount));
        }
    }
}