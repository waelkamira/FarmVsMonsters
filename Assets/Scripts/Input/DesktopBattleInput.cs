using FarmVsMonsters.Plants;
using FarmVsMonsters.Player;
using UnityEngine;

namespace FarmVsMonsters.Input
{
    /// <summary>
    /// Desktop input adapter for the prototype. Uses Unity's built-in Input Manager axes
    /// (Horizontal/Vertical), WASD/arrow keys, and left mouse click.
    /// Set Active Input Handling to Input Manager or Both in Player Settings.
    /// </summary>
    public sealed class DesktopBattleInput : MonoBehaviour
    {
        [SerializeField] private FarmerController farmer;
        [SerializeField] private PlantPlacementService placementService;
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private LayerMask placementMask = ~0;
        [SerializeField] private PlantDefinition[] quickSelectPlants;
        [SerializeField, Min(1f)] private float rayDistance = 500f;

        private int selectedPlantIndex;

        public PlantDefinition SelectedPlant =>
            quickSelectPlants != null &&
            selectedPlantIndex >= 0 &&
            selectedPlantIndex < quickSelectPlants.Length
                ? quickSelectPlants[selectedPlantIndex]
                : null;

        public void SelectPlant(int index)
        {
            if (quickSelectPlants == null || index < 0 || index >= quickSelectPlants.Length)
                return;

            selectedPlantIndex = index;
        }

        private void Update()
        {
            if (farmer != null)
            {
                Vector2 movement = new Vector2(
                    UnityEngine.Input.GetAxisRaw("Horizontal"),
                    UnityEngine.Input.GetAxisRaw("Vertical"));
                farmer.SetMoveInput(Vector2.ClampMagnitude(movement, 1f));
            }

            HandleQuickSelection();

            if (UnityEngine.Input.GetMouseButtonDown(0))
                TryPlaceAtPointer();
        }

        private void HandleQuickSelection()
        {
            if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha1)) SelectPlant(0);
            if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha2)) SelectPlant(1);
            if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha3)) SelectPlant(2);
            if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha4)) SelectPlant(3);
            if (UnityEngine.Input.GetKeyDown(KeyCode.Alpha5)) SelectPlant(4);
        }

        private void TryPlaceAtPointer()
        {
            if (placementService == null || SelectedPlant == null)
                return;

            Camera activeCamera = gameplayCamera != null ? gameplayCamera : Camera.main;
            if (activeCamera == null)
                return;

            Ray ray = activeCamera.ScreenPointToRay(UnityEngine.Input.mousePosition);
            if (!Physics.Raycast(ray, out RaycastHit hit, rayDistance, placementMask, QueryTriggerInteraction.Ignore))
                return;

            placementService.TryPlace(SelectedPlant, hit.point, out _);
        }
    }
}