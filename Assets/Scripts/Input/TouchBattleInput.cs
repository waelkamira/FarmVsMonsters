using FarmVsMonsters.Plants;
using FarmVsMonsters.Player;
using UnityEngine;

namespace FarmVsMonsters.Input
{
    /// <summary>
    /// Minimal single-touch adapter for mobile prototypes. A UI joystick can call SetMoveInput
    /// directly; a tap on the board places the currently selected plant.
    /// </summary>
    public sealed class TouchBattleInput : MonoBehaviour
    {
        [SerializeField] private FarmerController farmer;
        [SerializeField] private PlantPlacementService placementService;
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private LayerMask placementMask = ~0;
        [SerializeField] private PlantDefinition selectedPlant;
        [SerializeField, Min(1f)] private float rayDistance = 500f;

        public void SetMoveInput(Vector2 input)
        {
            if (farmer != null)
                farmer.SetMoveInput(input);
        }

        public void SelectPlant(PlantDefinition definition)
        {
            selectedPlant = definition;
        }

        private void Update()
        {
            if (UnityEngine.Input.touchCount == 0)
                return;

            Touch touch = UnityEngine.Input.GetTouch(0);
            if (touch.phase == TouchPhase.Began)
                TryPlaceAtScreenPosition(touch.position);
        }

        private void TryPlaceAtScreenPosition(Vector2 screenPosition)
        {
            if (placementService == null || selectedPlant == null)
                return;

            Camera activeCamera = gameplayCamera != null ? gameplayCamera : Camera.main;
            if (activeCamera == null)
                return;

            Ray ray = activeCamera.ScreenPointToRay(screenPosition);
            if (Physics.Raycast(ray, out RaycastHit hit, rayDistance, placementMask, QueryTriggerInteraction.Ignore))
                placementService.TryPlace(selectedPlant, hit.point, out _);
        }

        private void OnDisable()
        {
            if (farmer != null)
                farmer.StopMoving();
        }
    }
}