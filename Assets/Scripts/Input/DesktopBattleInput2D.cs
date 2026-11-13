using FarmVsMonsters.Plants;
using UnityEngine;

namespace FarmVsMonsters.Input
{
    /// <summary>Keyboard plant selection and mouse placement for the 2D lane battle.</summary>
    public sealed class DesktopBattleInput2D : MonoBehaviour
    {
        [SerializeField] private PlantPlacementService2D placementService;
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private PlantDefinition[] quickSelectPlants = new PlantDefinition[5];

        public PlantDefinition SelectedPlant { get; private set; }

        private void Start()
        {
            if (SelectedPlant == null && quickSelectPlants != null && quickSelectPlants.Length > 0)
                SelectedPlant = quickSelectPlants[0];
        }

        private void Update()
        {
            HandlePlantSelection();
            if (UnityEngine.Input.GetMouseButtonDown(0))
                TryPlaceAtPointer();
        }

        private void HandlePlantSelection()
        {
            if (quickSelectPlants == null) return;
            for (int i = 0; i < Mathf.Min(9, quickSelectPlants.Length); i++)
            {
                if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha1 + i) &&
                    quickSelectPlants[i] != null)
                {
                    SelectedPlant = quickSelectPlants[i];
                    return;
                }
            }
        }

        private void TryPlaceAtPointer()
        {
            if (placementService == null || gameplayCamera == null || SelectedPlant == null)
                return;

            Vector3 screen = UnityEngine.Input.mousePosition;
            screen.z = Mathf.Abs(gameplayCamera.transform.position.z);
            Vector3 world = gameplayCamera.ScreenToWorldPoint(screen);
            placementService.TryPlace(SelectedPlant, world, out _);
        }

        public void SelectPlant(PlantDefinition definition)
        {
            if (definition != null) SelectedPlant = definition;
        }
    }
}
