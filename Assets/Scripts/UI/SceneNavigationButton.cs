using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Loads a configured scene from a uGUI Button.</summary>
    [DisallowMultipleComponent]
    public sealed class SceneNavigationButton : MonoBehaviour
    {
        [SerializeField] private Button button;
        [SerializeField] private string targetScene;

        private void Awake()
        {
            if (button == null)
                button = GetComponent<Button>();
        }

        private void OnEnable()
        {
            if (button != null)
                button.onClick.AddListener(Navigate);
        }

        private void OnDisable()
        {
            if (button != null)
                button.onClick.RemoveListener(Navigate);
        }

        public void Configure(Button sourceButton, string sceneName)
        {
            if (button != null)
                button.onClick.RemoveListener(Navigate);
            button = sourceButton;
            targetScene = sceneName;
            if (isActiveAndEnabled && button != null)
                button.onClick.AddListener(Navigate);
        }

        public void Navigate()
        {
            if (string.IsNullOrWhiteSpace(targetScene))
            {
                Debug.LogWarning("SceneNavigationButton has no target scene configured.", this);
                return;
            }

            if (!Application.CanStreamedLevelBeLoaded(targetScene))
            {
                Debug.LogError("Scene is not in Build Settings: " + targetScene, this);
                return;
            }

            SceneManager.LoadScene(targetScene);
        }
    }
}