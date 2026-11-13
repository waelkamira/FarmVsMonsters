using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(fileName = "FarmMarketListing", menuName = "Farm Vs Monsters/Farm/Market Listing")]
    public sealed class FarmMarketListing : ScriptableObject
    {
        [SerializeField] private string listingId;
        [SerializeField] private string displayName;
        [SerializeField] private FarmResourceType resource;
        [SerializeField, Min(1)] private int coinsPerUnit = 1;
        [SerializeField, Min(1)] private int minimumSellQuantity = 1;
        [SerializeField] private int requiredStage = 1;

        public string ListingId => listingId;
        public string DisplayName => displayName;
        public FarmResourceType Resource => resource;
        public int CoinsPerUnit => Mathf.Max(1, coinsPerUnit);
        public int MinimumSellQuantity => Mathf.Max(1, minimumSellQuantity);
        public int RequiredStage => requiredStage;

        public bool IsValid => !string.IsNullOrWhiteSpace(listingId) &&
                               !string.IsNullOrWhiteSpace(displayName) &&
                               coinsPerUnit > 0 && minimumSellQuantity > 0;
    }
}