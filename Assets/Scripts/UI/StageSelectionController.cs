using System;
using FarmVsMonsters.Progression;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Builds a stage list from Inspector entries and enforces saved unlock progress.</summary>
    public sealed class StageSelectionController : MonoBehaviour
    {
        [Serializable]
        private sealed class StageEntry
        {
            [Min(1)] public int stageNumber = 1;
            public string displayName = "Stage";
            public string sceneName;
            public Button button;
            public Text statusLabel;
        }

        [SerializeField] private StageEntry[] stages;
        private UnityAction[] buttonActions;

        private void OnEnable()
        {
            RefreshStages();
        }

        private void OnDisable()
        {
            RemoveListeners();
        }

        public void RefreshStages()
        {
            RemoveListeners();
            if (stages == null)
                return;

            buttonActions = new UnityAction[stages.Length];
            for (int i = 0; i < stages.Length; i++)
            {
                StageEntry stage = stages[i];
                if (stage == null || stage.button == null)
                    continue;

                bool unlocked = ProgressSaveService.IsStageUnlocked(stage.stageNumber);
                bool hasScene = !string.IsNullOrWhiteSpace(stage.sceneName);
                stage.button.interactable = unlocked && hasScene;

                if (stage.statusLabel != null)
                {
                    stage.statusLabel.text = unlocked
                        ? stage.displayName
                        : stage.displayName + "  •  LOCKED";
                }

                int index = i;
                buttonActions[i] = () => LoadStage(index);
                stage.button.onClick.AddListener(buttonActions[i]);
            }
        }

        private void LoadStage(int index)
        {
            if (stages == null || index < 0 || index >= stages.Length)
                return;

            StageEntry stage = stages[index];
            if (stage == null || !ProgressSaveService.IsStageUnlocked(stage.stageNumber) ||
                string.IsNullOrWhiteSpace(stage.sceneName))
                return;

            SceneManager.LoadScene(stage.sceneName);
        }

        private void RemoveListeners()
        {
            if (stages == null || buttonActions == null)
                return;

            for (int i = 0; i < stages.Length && i < buttonActions.Length; i++)
            {
                if (stages[i] != null && stages[i].button != null && buttonActions[i] != null)
                    stages[i].button.onClick.RemoveListener(buttonActions[i]);
            }

            buttonActions = null;
        }
    }
}