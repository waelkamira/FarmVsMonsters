using FarmVsMonsters.Combat;\nusing UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Lets the caveman interact with the closest plot using E.</summary>
    public sealed class FarmPlotInteractor2D : MonoBehaviour
    {
        [SerializeField] private FarmResourceWallet2D wallet;
        [SerializeField] private FarmCropDefinition2D selectedCrop;
        [SerializeField, Min(0.1f)] private float interactionRadius = 1.25f;
        [SerializeField, Min(0f)] private float wateringGrowthReduction = 4f;
        [SerializeField, Min(1)] private int maxPlotsPerScan = 12;
        [SerializeField] private LayerMask plotLayers = ~0;

        private Collider2D[] results;\n        private Health playerHealth;

        private void Awake()
        {
            results = new Collider2D[Mathf.Max(1, maxPlotsPerScan)];\n            playerHealth = GetComponent<Health>();
        }

        private void Update()
        {
            if ((playerHealth != null && playerHealth.IsDead) || !Input.GetKeyDown(KeyCode.E)) return;
            FarmCropPlot2D plot = FindNearestPlot();
            if (plot == null) return;

            switch (plot.State)
            {
                case FarmCropPlot2D.PlotState.Empty:
                    plot.Configure(wallet, selectedCrop);
                    plot.TryPlant();
                    break;
                case FarmCropPlot2D.PlotState.Growing:
                    plot.TryWater(wateringGrowthReduction);
                    break;
                case FarmCropPlot2D.PlotState.Ready:
                    plot.TryHarvest();
                    break;
            }
        }

        public void SetSelectedCrop(FarmCropDefinition2D definition)
        {
            selectedCrop = definition;
        }

        private FarmCropPlot2D FindNearestPlot()
        {
            int count = Physics2D.OverlapCircleNonAlloc(
                transform.position, interactionRadius, results, plotLayers);
            FarmCropPlot2D nearest = null;
            float bestDistance = interactionRadius * interactionRadius;

            for (int i = 0; i < count; i++)
            {
                if (results[i] == null) continue;
                FarmCropPlot2D plot = results[i].GetComponentInParent<FarmCropPlot2D>();
                if (plot == null) continue;
                float distance = ((Vector2)plot.transform.position -
                    (Vector2)transform.position).sqrMagnitude;
                if (distance < bestDistance)
                {
                    nearest = plot;
                    bestDistance = distance;
                }
            }
            return nearest;
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.DrawWireSphere(transform.position, interactionRadius);
        }
    }
}