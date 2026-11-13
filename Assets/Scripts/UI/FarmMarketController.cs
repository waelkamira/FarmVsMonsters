using System.Collections.Generic;
using FarmVsMonsters.Farm;
using UnityEngine;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Small uGUI adapter for configured market listings and fixed-quantity sale buttons.</summary>
    public sealed class FarmMarketController : MonoBehaviour
    {
        [System.Serializable]
        private sealed class SaleButton
        {
            public FarmMarketListing listing;
            [Min(1)] public int quantity = 1;
            public Button button;
        }

        [SerializeField] private FarmMarketService market;
        [SerializeField] private Text balanceText;
        [SerializeField] private Text inventoryText;
        [SerializeField] private Text statusText;
        [SerializeField] private SaleButton[] saleButtons;

        private readonly List<(Button button, UnityEngine.Events.UnityAction action)> listeners =
            new List<(Button, UnityEngine.Events.UnityAction)>();

        private void OnEnable()
        {
            if (market != null)
                market.SaleCompleted += HandleSaleCompleted;
            BindButtons();
            Refresh();
        }

        private void OnDisable()
        {
            if (market != null)
                market.SaleCompleted -= HandleSaleCompleted;

            foreach (var listener in listeners)
                if (listener.button != null)
                    listener.button.onClick.RemoveListener(listener.action);
            listeners.Clear();
        }

        public void Refresh()
        {
            if (market == null) return;

            if (balanceText != null)
                balanceText.text = "Farm coins: " + market.FarmCoinBalance;

            if (inventoryText != null)
            {
                var lines = new List<string>();
                foreach (FarmMarketListing listing in market.GetAvailableListings())
                    lines.Add(listing.DisplayName + ": " +
                              market.GetAvailableQuantity(listing) + " available · " +
                              listing.CoinsPerUnit + " coins each");
                inventoryText.text = string.Join("\n", lines);
            }

            if (saleButtons == null) return;
            foreach (SaleButton entry in saleButtons)
            {
                if (entry == null || entry.button == null) continue;
                entry.button.interactable = market.CanSell(entry.listing, entry.quantity);
            }
        }

        private void BindButtons()
        {
            if (saleButtons == null || market == null) return;

            foreach (SaleButton entry in saleButtons)
            {
                if (entry == null || entry.button == null || entry.listing == null) continue;
                SaleButton captured = entry;
                UnityEngine.Events.UnityAction action = () =>
                {
                    bool sold = market.TrySell(captured.listing, captured.quantity);
                    if (statusText != null)
                        statusText.text = sold
                            ? "Sold " + captured.quantity + " " + captured.listing.DisplayName
                            : "Sale unavailable. Check stock, quantity, and market unlock.";
                    Refresh();
                };
                entry.button.onClick.AddListener(action);
                listeners.Add((entry.button, action));
            }
        }

        private void HandleSaleCompleted(FarmMarketListing listing, int quantity, int payout)
        {
            if (statusText != null)
                statusText.text = "Sale complete: +" + payout + " farm coins";
            Refresh();
        }
    }
}