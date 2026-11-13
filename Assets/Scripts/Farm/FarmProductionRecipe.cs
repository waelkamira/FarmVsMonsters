using UnityEngine;

namespace FarmVsMonsters.Farm
{
    [CreateAssetMenu(fileName = "FarmProductionRecipe", menuName = "Farm Vs Monsters/Farm/Production Recipe")]
    public sealed class FarmProductionRecipe : ScriptableObject
    {
        [SerializeField] private string recipeId;
        [SerializeField] private string displayName;
        [SerializeField] private int requiredStage = 1;
        [SerializeField, Min(1)] private int durationSeconds = 30;
        [SerializeField] private FarmResourceType[] inputResources;
        [SerializeField] private int[] inputAmounts;
        [SerializeField] private FarmResourceType outputResource;
        [SerializeField, Min(1)] private int outputAmount = 1;

        public string RecipeId => recipeId;
        public string DisplayName => displayName;
        public int RequiredStage => requiredStage;
        public int DurationSeconds => Mathf.Max(1, durationSeconds);
        public FarmResourceType[] InputResources => inputResources;
        public int[] InputAmounts => inputAmounts;
        public FarmResourceType OutputResource => outputResource;
        public int OutputAmount => Mathf.Max(1, outputAmount);

        public bool HasValidConfiguration()
        {
            if (string.IsNullOrWhiteSpace(recipeId) || string.IsNullOrWhiteSpace(displayName) ||
                inputResources == null || inputAmounts == null || inputResources.Length == 0 ||
                inputResources.Length != inputAmounts.Length)
                return false;

            for (int i = 0; i < inputAmounts.Length; i++)
                if (inputAmounts[i] <= 0)
                    return false;

            return true;
        }
    }
}