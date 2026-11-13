using UnityEngine;

namespace FarmVsMonsters.Farm
{
    public sealed class FarmCropPlot : MonoBehaviour
    {
        [SerializeField] private string plotId = "crop.plot.01";
        public string PlotId => plotId;

        private void OnValidate()
        {
            if (string.IsNullOrWhiteSpace(plotId))
                plotId = gameObject.name.ToLowerInvariant().Replace(" ", ".");
        }
    }
}