using UnityEngine;

namespace FarmVsMonsters.Economy
{
    /// <summary>
    /// One-shot energy collectible. Put a trigger collider on the pickup and assign a wallet,
    /// or allow it to find the wallet on the collecting actor.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class EnergyPickup : MonoBehaviour
    {
        [SerializeField, Min(1)] private int energyAmount = 25;
        [SerializeField] private EnergyWallet targetWallet;
        [SerializeField] private bool destroyWhenCollected = true;
        [SerializeField] private AudioClip collectSound;

        private bool collected;
        private Collider pickupCollider;
        private AudioSource audioSource;

        public void SetTargetWallet(EnergyWallet wallet)
        {
            targetWallet = wallet;
        }

        public void SetEnergyAmount(int amount)
        {
            energyAmount = Mathf.Max(1, amount);
        }

        private void Awake()
        {
            pickupCollider = GetComponent<Collider>();
            pickupCollider.isTrigger = true;
            audioSource = GetComponent<AudioSource>();
        }

        private void OnTriggerEnter(Collider other)
        {
            if (collected)
                return;

            EnergyWallet wallet = targetWallet != null
                ? targetWallet
                : other.GetComponentInParent<EnergyWallet>();

            if (wallet == null)
                return;

            int accepted = wallet.Add(Mathf.Max(1, energyAmount));
            if (accepted <= 0)
                return;

            collected = true;
            pickupCollider.enabled = false;

            if (collectSound != null)
            {
                if (audioSource != null)
                    audioSource.PlayOneShot(collectSound);
                else
                    AudioSource.PlayClipAtPoint(collectSound, transform.position);
            }

            if (destroyWhenCollected)
                Destroy(gameObject);
            else
                gameObject.SetActive(false);
        }
    }
}