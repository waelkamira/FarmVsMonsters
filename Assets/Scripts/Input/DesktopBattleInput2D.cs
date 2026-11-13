using FarmVsMonsters.Plants;
using UnityEngine;

namespace FarmVsMonsters.Input
{
    /// <summary>Keyboard plant selection, snapped mouse placement, and optional validity preview.</summary>
    public sealed class DesktopBattleInput2D : MonoBehaviour
    {
        [SerializeField] private PlantPlacementService2D placementService;
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private PlantDefinition[] quickSelectPlants = new PlantDefinition[5];
        [SerializeField] private SpriteRenderer placementPreview;
        [SerializeField] private Color validPreviewColor = new Color(0.25f, 1f, 0.35f, 0.5f);
        [SerializeField] private Color invalidPreviewColor = new Color(1f, 0.2f, 0.2f, 0.5f);

        public PlantDefinition SelectedPlant { get; private set; }

        private void Start()
        {
            if (SelectedPlant == null && quickSelectPlants != null && quickSelectPlants.Length > 0)
                SelectedPlant = quickSelectPlants[0];
            UpdatePlacementPreview();
        }

        private void Update()
        {
            HandlePlantSelection();
            UpdatePlacementPreview();
            if (UnityEngine.Input.GetMouseButtonDown(0))
                TryPlaceAtPointer();
        }

        private void HandlePlantSelection()
        {
            if (quickSelectPlants == null) return;
            for (int i = 0; i < Mathf.Min(9, quickSelectPlants.Length); i++)
            {
                if (UnityEngine.Input.GetKeyDown((KeyCode)((int)KeyCode.Alpha1 + i)) &&
                    quickSelectPlants[i] != null)
                {
                    SelectedPlant = quickSelectPlants[i];
                    return;
                }
            }
        }

        private bool TryGetPointerWorld(out Vector2 world)
        {
            world = default;
            if (gameplayCamera == null) return false;

            Vector3 screen = UnityEngine.Input.mousePosition;
            screen.z = Mathf.Abs(gameplayCamera.transform.position.z);
            world = gameplayCamera.ScreenToWorldPoint(screen);
            return true;
        }

        private void TryPlaceAtPointer()
        {
            if (placementService == null || SelectedPlant == null ||
                !TryGetPointerWorld(out Vector2 world))
                return;

            placementService.TryPlace(SelectedPlant, world, out _);
        }

        private void UpdatePlacementPreview()
        {
            if (placementPreview == null) return;
            if (placementService == null || SelectedPlant == null ||
                SelectedPlant.Prefab == null || !TryGetPointerWorld(out Vector2 world))
            {
                placementPreview.enabled = false;
                return;
            }

            SpriteRenderer source = SelectedPlant.Prefab.GetComponentInChildren<SpriteRenderer>();
            if (source == null || source.sprite == null)
            {
                placementPreview.enabled = false;
                return;
            }

            bool canPlace = placementService.CanPlace(SelectedPlant, world,
                out _, out Vector2 snappedPosition, out _);
            placementPreview.sprite = source.sprite;
            placementPreview.transform.position = canPlace || snappedPosition != world
                ? snappedPosition
                : world;
            placementPreview.color = canPlace ? validPreviewColor : invalidPreviewColor;
            placementPreview.enabled = true;
        }

        public void SelectPlant(PlantDefinition definition)
        {
            if (definition != null) SelectedPlant = definition;
            UpdatePlacementPreview();
        }

        private void OnDisable()
        {
            if (placementPreview != null) placementPreview.enabled = false;
        }
    }
}