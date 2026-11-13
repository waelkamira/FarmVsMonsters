using System;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Converts farm inventory into permanent farm coins using configured market listings.</summary>
    public sealed class FarmMarketService : MonoBehaviour
    {
        [SerializeField] private FarmMarketListing[] listings;
        [SerializeField] private FarmResourceWallet resourceWallet;

        public event Action<FarmMarketListing, int, int> SaleCompleted;
        public event Action<FarmMarketListing> SaleRejected;

        public int FarmCoinBalance => ProgressSaveService.Load().farmCoins;

        public FarmMarketListing[] GetAvailableListings()
        {
            if (listings == null) return Array.Empty<FarmMarketListing>();
            var available = new List<FarmMarketListing>();
            foreach (FarmMarketListing listing in listings)
                if (listing != null && listing.IsValid &&
                    ProgressSaveService.IsStageUnlocked(listing.RequiredStage))
                    available.Add(listing);
            return available.ToArray();
        }

        public int GetAvailableQuantity(FarmMarketListing listing)
        {
            if (listing == null || resourceWallet == null || !listing.IsValid ||
                !ProgressSaveService.IsStageUnlocked(listing.RequiredStage))
                return 0;

            int inventory = resourceWallet.GetAmount(listing.Resource);
            int walletRoom = int.MaxValue - FarmCoinBalance;
            int affordableQuantity = walletRoom / listing.CoinsPerUnit;
            return Mathf.Max(0, Mathf.Min(inventory, affordableQuantity));
        }

        public bool CanSell(FarmMarketListing listing, int quantity)
        {
            return listing != null && listing.IsValid &&
                   quantity >= listing.MinimumSellQuantity &&
                   quantity <= GetAvailableQuantity(listing);
        }

        public bool TrySell(FarmMarketListing listing, int quantity)
        {
            if (!CanSell(listing, quantity) || resourceWallet == null)
            {
                SaleRejected?.Invoke(listing);
                return false;
            }

            int payout;
            try
            {
                payout = checked(quantity * listing.CoinsPerUnit);
            }
            catch (OverflowException)
            {
                SaleRejected?.Invoke(listing);
                return false;
            }

            // Validate both sides before committing either change.
            if (resourceWallet.GetAmount(listing.Resource) < quantity ||
                (long)FarmCoinBalance + payout > int.MaxValue)
            {
                SaleRejected?.Invoke(listing);
                return false;
            }

            if (!resourceWallet.TrySpend(listing.Resource, quantity))
            {
                SaleRejected?.Invoke(listing);
                return false;
            }

            int credited = ProgressSaveService.AddFarmCoins(payout);
            if (credited != payout)
            {
                // Defensive compensation: never silently destroy inventory on an unexpected credit mismatch.
                resourceWallet.Add(listing.Resource, quantity);
                SaleRejected?.Invoke(listing);
                return false;
            }

            SaleCompleted?.Invoke(listing, quantity, payout);
            return true;
        }
    }
}