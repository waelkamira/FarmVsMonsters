using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(menuName = "Farm Vs Monsters/Trade Contract", fileName = "TradeContract")]
    public sealed class FarmTradeContractDefinition : ScriptableObject
    {
        [SerializeField] private string contractId = "contract.wheat.delivery";
        [SerializeField] private string title = "Wheat delivery";
        [TextArea, SerializeField] private string description = "Deliver the requested farm goods.";
        [SerializeField] private FarmResourceType requestedResource = FarmResourceType.Wheat;
        [SerializeField, Min(1)] private int requestedAmount = 20;
        [SerializeField, Min(0)] private int rewardCoins = 150;
        [SerializeField, Min(0)] private int requiredStage = 1;
        [SerializeField, Min(0f)] private float timeLimitHours;

        public string ContractId => contractId;
        public string Title => title;
        public string Description => description;
        public FarmResourceType RequestedResource => requestedResource;
        public int RequestedAmount => requestedAmount;
        public int RewardCoins => rewardCoins;
        public int RequiredStage => requiredStage;
        public float TimeLimitHours => timeLimitHours;

        public bool IsValid =>
            !string.IsNullOrWhiteSpace(contractId) &&
            !string.IsNullOrWhiteSpace(title) &&
            requestedAmount > 0 && rewardCoins >= 0 && requiredStage >= 1 &&
            System.Enum.IsDefined(typeof(FarmResourceType), requestedResource);

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(contractId))
                contractId = name.ToLowerInvariant().Replace(" ", ".");
            requestedAmount = Mathf.Max(1, requestedAmount);
            rewardCoins = Mathf.Max(0, rewardCoins);
            requiredStage = Mathf.Max(1, requiredStage);
            timeLimitHours = Mathf.Max(0f, timeLimitHours);
        }
    }
}