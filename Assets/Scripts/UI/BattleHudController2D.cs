using FarmVsMonsters.Battle;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Input;
using FarmVsMonsters.Plants;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>uGUI HUD wired specifically to the 2D desktop battle input adapter.</summary>
    public sealed class BattleHudController2D : MonoBehaviour
    {
        [Header("Battle sources")]
        [SerializeField] private EnergyWallet energyWallet;
        [SerializeField] private Health protectedTargetHealth;
        [SerializeField] private WaveManager waveManager;
        [SerializeField] private BattleOutcomeController outcomeController;
        [SerializeField] private DesktopBattleInput2D desktopInput;

        [Header("Status UI")]
        [SerializeField] private Text energyText;
        [SerializeField] private Text farmHealthText;
        [SerializeField] private Slider farmHealthSlider;
        [SerializeField] private Text waveText;
        [SerializeField] private Text enemiesText;

        [Header("Plant selection UI")]
        [SerializeField] private PlantDefinition[] plants;
        [SerializeField] private Button[] plantButtons;
        [SerializeField] private Text[] plantButtonLabels;
        [SerializeField] private Text selectedPlantText;

        [Header("Result UI")]
        [SerializeField] private GameObject resultPanel;
        [SerializeField] private Text resultTitle;
        [SerializeField] private Text resultDescription;

        private UnityAction[] buttonActions;
        private int selectedIndex = -1;

        private void OnEnable()
        {
            if (energyWallet != null) energyWallet.BalanceChanged += HandleEnergyChanged;
            if (protectedTargetHealth != null) protectedTargetHealth.HealthChanged += HandleHealthChanged;
            if (waveManager != null)
            {
                waveManager.WaveStarted += HandleWaveStarted;
                waveManager.WaveCleared += HandleWaveCleared;
            }
            if (outcomeController != null) outcomeController.BattleFinished += HandleBattleFinished;
            ConfigureButtons();
            if (selectedIndex < 0 && plants != null && plants.Length > 0) SelectPlant(0);
            RefreshAll();
            if (resultPanel != null) resultPanel.SetActive(outcomeController != null && outcomeController.IsFinished);
        }

        private void OnDisable()
        {
            if (energyWallet != null) energyWallet.BalanceChanged -= HandleEnergyChanged;
            if (protectedTargetHealth != null) protectedTargetHealth.HealthChanged -= HandleHealthChanged;
            if (waveManager != null)
            {
                waveManager.WaveStarted -= HandleWaveStarted;
                waveManager.WaveCleared -= HandleWaveCleared;
            }
            if (outcomeController != null) outcomeController.BattleFinished -= HandleBattleFinished;
            RemoveButtonListeners();
        }

        private void Update()
        {
            if (waveManager != null && enemiesText != null)
                enemiesText.text = "Monsters: " + waveManager.LivingEnemyCount;
        }

        public void SelectPlant(int index)
        {
            if (plants == null || index < 0 || index >= plants.Length || plants[index] == null) return;
            selectedIndex = index;
            PlantDefinition definition = plants[index];
            if (desktopInput != null) desktopInput.SelectPlant(definition);
            if (selectedPlantText != null)
                selectedPlantText.text = definition.DisplayName + "  •  " + definition.EnergyCost + " energy";
            RefreshPlantButtons();
        }

        public void RetryBattle()
        {
            var scene = SceneManager.GetActiveScene();
            if (scene.IsValid() && !string.IsNullOrEmpty(scene.path)) SceneManager.LoadScene(scene.path);
        }

        public void LoadScene(string sceneName)
        {
            if (!string.IsNullOrWhiteSpace(sceneName)) SceneManager.LoadScene(sceneName);
        }

        private void ConfigureButtons()
        {
            if (plantButtons == null) return;
            buttonActions = new UnityAction[plantButtons.Length];
            for (int i = 0; i < plantButtons.Length; i++)
            {
                int index = i;
                if (plantButtons[i] == null) continue;
                buttonActions[i] = () => SelectPlant(index);
                plantButtons[i].onClick.AddListener(buttonActions[i]);
                if (plantButtonLabels != null && i < plantButtonLabels.Length && plantButtonLabels[i] != null &&
                    plants != null && i < plants.Length && plants[i] != null)
                    plantButtonLabels[i].text = plants[i].DisplayName + "\n" + plants[i].EnergyCost;
            }
        }

        private void RemoveButtonListeners()
        {
            if (plantButtons != null && buttonActions != null)
                for (int i = 0; i < plantButtons.Length && i < buttonActions.Length; i++)
                    if (plantButtons[i] != null && buttonActions[i] != null)
                        plantButtons[i].onClick.RemoveListener(buttonActions[i]);
            buttonActions = null;
        }

        private void RefreshAll()
        {
            if (energyWallet != null) HandleEnergyChanged(energyWallet.Balance, energyWallet.Capacity);
            if (protectedTargetHealth != null)
                HandleHealthChanged(protectedTargetHealth.CurrentHealth, protectedTargetHealth.MaxHealth);
            if (waveManager != null) HandleWaveStarted(waveManager.CurrentWave);
            RefreshPlantButtons();
        }

        private void HandleEnergyChanged(int current, int capacity)
        {
            if (energyText != null) energyText.text = "Energy: " + current + " / " + capacity;
            RefreshPlantButtons();
        }

        private void HandleHealthChanged(float current, float maximum)
        {
            if (farmHealthText != null)
                farmHealthText.text = "Farm: " + Mathf.CeilToInt(current) + " / " + Mathf.CeilToInt(maximum);
            if (farmHealthSlider != null)
            {
                farmHealthSlider.maxValue = Mathf.Max(1f, maximum);
                farmHealthSlider.value = Mathf.Clamp(current, 0f, farmHealthSlider.maxValue);
            }
        }

        private void HandleWaveStarted(int number)
        {
            if (waveText != null && waveManager != null)
                waveText.text = number <= 0 ? "Get Ready!" : "Wave: " + number + " / " + waveManager.TotalWaves;
        }

        private void HandleWaveCleared(int number)
        {
            if (waveText != null) waveText.text = "Wave " + number + " cleared";
        }

        private void HandleBattleFinished(BattleOutcome outcome)
        {
            if (resultPanel != null) resultPanel.SetActive(true);
            if (resultTitle != null) resultTitle.text = outcome == BattleOutcome.Victory ? "VICTORY!" : "DEFEAT";
            if (resultDescription != null)
                resultDescription.text = outcome == BattleOutcome.Victory
                    ? "The farm is safe. Your reward has been added."
                    : "The monsters reached the farm. Strengthen your defenses and try again.";
        }

        private void RefreshPlantButtons()
        {
            if (plantButtons == null) return;
            int balance = energyWallet != null ? energyWallet.Balance : 0;
            for (int i = 0; i < plantButtons.Length; i++)
            {
                if (plantButtons[i] == null) continue;
                bool valid = plants != null && i < plants.Length && plants[i] != null && plants[i].Prefab != null;
                plantButtons[i].interactable = valid && balance >= plants[i].EnergyCost;
            }
        }
    }
}