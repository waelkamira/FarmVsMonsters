using UnityEngine;

namespace FarmVsMonsters.Economy
{
    /// <summary>Generates a fixed amount of energy at a configurable interval while active.</summary>
    public sealed class TimedEnergyGenerator : MonoBehaviour
    {
        [SerializeField] private EnergyWallet wallet;
        [SerializeField, Min(1)] private int energyPerTick = 25;
        [SerializeField, Min(0.1f)] private float intervalSeconds = 8f;
        [SerializeField] private bool generateImmediately;

        private float elapsed;

        private void OnEnable()
        {
            elapsed = generateImmediately ? intervalSeconds : 0f;
        }

        private void Update()
        {
            if (wallet == null)
                return;

            elapsed += Time.deltaTime;
            if (elapsed < intervalSeconds)
                return;

            // Preserve the remainder to avoid drift after a long frame.
            elapsed %= intervalSeconds;
            wallet.Add(Mathf.Max(1, energyPerTick));
        }

        public void SetWallet(EnergyWallet newWallet)
        {
            wallet = newWallet;
        }
    }
}