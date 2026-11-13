using FarmVsMonsters.Farm;
using UnityEngine;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Displays the live seed, feed, and harvested-produce balances.</summary>
    public sealed class FarmResourceHud2D : MonoBehaviour
    {
        [Header("Source")]
        [SerializeField] private FarmResourceWallet2D wallet;

        [Header("Optional uGUI labels")]
        [SerializeField] private Text seedsText;
        [SerializeField] private Text feedText;
        [SerializeField] private Text produceText;

        private void OnEnable()
        {
            if (wallet != null)
                wallet.FullResourcesChanged += HandleResourcesChanged;
            Refresh();
        }

        private void OnDisable()
        {
            if (wallet != null)
                wallet.FullResourcesChanged -= HandleResourcesChanged;
        }

        public void SetWallet(FarmResourceWallet2D value)
        {
            if (wallet == value) return;
            if (isActiveAndEnabled && wallet != null)
                wallet.FullResourcesChanged -= HandleResourcesChanged;
            wallet = value;
            if (isActiveAndEnabled && wallet != null)
                wallet.FullResourcesChanged += HandleResourcesChanged;
            Refresh();
        }

        private void HandleResourcesChanged(int seeds, int feed, int produce)
        {
            SetLabels(seeds, feed, produce);
        }

        private void Refresh()
        {
            if (wallet == null)
            {
                SetLabels(0, 0, 0);
                return;
            }
            SetLabels(wallet.Seeds, wallet.Feed, wallet.Produce);
        }

        private void SetLabels(int seeds, int feed, int produce)
        {
            if (seedsText != null) seedsText.text = "Seeds: " + seeds;
            if (feedText != null) feedText.text = "Feed: " + feed;
            if (produceText != null) produceText.text = "Produce: " + produce;
        }
    }
}