using FarmVsMonsters.Battle;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Input;
using FarmVsMonsters.Plants;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.Events;

namespace FarmVsMonsters.UI
{
    /// <summary>
    /// Lightweight uGUI presenter for the battle prototype. Assign Text/Slider/Button
    /// references in the Inspector; this component owns presentation, not game rules.
    /// </summary>
    public sealed class BattleHudController : MonoBehaviour
    {
        [Header("Gameplay sources")]
        [SerializeField] private EnergyWallet energyWallet;
        [SerializeField] private Health protectedTargetHealth;
        [SerializeField] private WaveManager waveManager;
        [SerializeField] private BattleOutcomeController outcomeController;
        [SerializeField] private DesktopBattleInput desktopInput;
        [SerializeField] private TouchBattleInput touchInput;

        [Header("Status display")]
        [SerializeField] private Text energyText;
        [SerializeField] private Text healthText;
        [SerializeField] private Slider healthSlider;
        [SerializeField] private Text waveText;
        [SerializeField] private Text enemiesText;

        [Header("Plant selection")]
        [SerializeField] private PlantDefinition[] plants;
        [SerializeField] private Button[] plantButtons;
        [SerializeField] private Text[] plantButtonLabels;
        [SerializeField] private Text selectedPlantText;

        [Header("Battle result")]
        [SerializeField] private GameObject resultPanel;
        [SerializeField] private Text resultTitle;
        [SerializeField] private Text resultDescription;

        private int selectedPlantIndex = -1;
        private UnityAction[] plantButtonActions;

        private void OnEnable()
        {
            if (energyWallet != null)
                energyWallet.BalanceChanged += HandleEnergyChanged;
            if (protectedTargetHealth != null)
                protectedTargetHealth.HealthChanged += HandleHealthChanged;
            if (waveManager != null)
            {
                waveManager.WaveStarted += HandleWaveStarted;
                waveManager.WaveCleared += HandleWaveCleared;
            }
            if (outcomeController != null)
                outcomeController.BattleFinished += HandleBattleFinished;

            ConfigurePlantButtons();
            if (selectedPlantIndex < 0 && plants != null && plants.Length > 0)
                SelectPlant(0);
            RefreshAll();
            if (resultPanel != null)
                resultPanel.SetActive(outcomeController != null && outcomeController.IsFinished);
        }

        private void OnDisable()
        {
            if (energyWallet != null)
                energyWallet.BalanceChanged -= HandleEnergyChanged;
            if (protectedTargetHealth != null)
                protectedTargetHealth.HealthChanged -= HandleHealthChanged;
            if (waveManager != null)
            {
                waveManager.WaveStarted -= HandleWaveStarted;
                waveManager.WaveCleared -= HandleWaveCleared;
            }
            if (outcomeController != null)
                outcomeController.BattleFinished -= HandleBattleFinished;

            RemovePlantButtonListeners();
        }

        private void Update()
        {
            if (waveManager != null && enemiesText != null)
                enemiesText.text = "Enemies: " + waveManager.LivingEnemyCount;
        }

        public void SelectPlant(int index)
        {
            if (plants == null || index < 0 || index >= plants.Length || plants[index] == null)
                return;

            selectedPlantIndex = index;
            PlantDefinition definition = plants[index];

            if (desktopInput != null)
                desktopInput.SelectPlant(index);
            if (touchInput != null)
                touchInput.SelectPlant(definition);

            if (selectedPlantText != null)
                selectedPlantText.text = definition.DisplayName + "  •  " + definition.EnergyCost + " energy";

            RefreshPlantButtonStates();
        }

        public void RetryBattle()
        {
            Scene activeScene = SceneManager.GetActiveScene();
            if (activeScene.IsValid() && !string.IsNullOrEmpty(activeScene.path))
                SceneManager.LoadScene(activeScene.path);
        }

        public void LoadMainMenu(string sceneName)
        {
            if (!string.IsNullOrWhiteSpace(sceneName))
                SceneManager.LoadScene(sceneName);
        }

        private void ConfigurePlantButtons()
        {
            if (plantButtons == null)
                return;

            plantButtonActions = new UnityAction[plantButtons.Length];
            for (int i = 0; i < plantButtons.Length; i++)
            {
                int index = i;
                Button button = plantButtons[i];
                if (button == null)
                    continue;

                plantButtonActions[i] = () => SelectPlant(index);
                button.onClick.AddListener(plantButtonActions[i]);

                if (plantButtonLabels != null && i < plantButtonLabels.Length &&
                    plantButtonLabels[i] != null && plants != null && i < plants.Length &&
                    plants[i] != null)
                {
                    PlantDefinition plant = plants[i];
                    plantButtonLabels[i].text = plant.DisplayName + "\n" + plant.EnergyCost;
                }
            }
        }

        private void RemovePlantButtonListeners()
        {
            if (plantButtons == null)
                return;

            for (int i = 0; i < plantButtons.Length; i++)
            {
                if (plantButtons[i] != null && plantButtonActions != null &&
                    i < plantButtonActions.Length && plantButtonActions[i] != null)
                    plantButtons[i].onClick.RemoveListener(plantButtonActions[i]);
            }
            plantButtonActions = null;
        }

        private void RefreshAll()
        {
            if (energyWallet != null)
                HandleEnergyChanged(energyWallet.Balance, energyWallet.Capacity);
            if (protectedTargetHealth != null)
                HandleHealthChanged(protectedTargetHealth.CurrentHealth, protectedTargetHealth.MaxHealth);
            if (waveManager != null)
                HandleWaveStarted(waveManager.CurrentWave);
            RefreshPlantButtonStates();
        }

        private void HandleEnergyChanged(int balance, int capacity)
        {
            if (energyText != null)
                energyText.text = "Energy: " + balance + " / " + capacity;
            RefreshPlantButtonStates();
        }

        private void HandleHealthChanged(float current, float maximum)
        {
            if (healthText != null)
                healthText.text = "Farm: " + Mathf.CeilToInt(current) + " / " + Mathf.CeilToInt(maximum);
            if (healthSlider != null)
            {
                healthSlider.maxValue = Mathf.Max(1f, maximum);
                healthSlider.value = Mathf.Clamp(current, 0f, healthSlider.maxValue);
            }
        }

        private void HandleWaveStarted(int waveNumber)
        {
            if (waveText == null || waveManager == null)
                return;

            waveText.text = "Wave: " + waveNumber + " / " + waveManager.TotalWaves;
        }

        private void HandleWaveCleared(int waveNumber)
        {
            if (waveText != null)
                waveText.text = "Wave " + waveNumber + " cleared";
        }

        private void HandleBattleFinished(BattleOutcome outcome)
        {
            if (resultPanel != null)
                resultPanel.SetActive(true);

            if (resultTitle != null)
                resultTitle.text = outcome == BattleOutcome.Victory ? "VICTORY!" : "DEFEAT";

            if (resultDescription != null)
                resultDescription.text = outcome == BattleOutcome.Victory
                    ? "The farm is safe. Your reward has been added."
                    : "The farm was overrun. Upgrade your defenses and try again.";
        }

        private void RefreshPlantButtonStates()
        {
            if (plantButtons == null)
                return;

            int energy = energyWallet != null ? energyWallet.Balance : 0;
            for (int i = 0; i < plantButtons.Length; i++)
            {
                if (plantButtons[i] == null)
                    continue;

                bool validPlant = plants != null && i < plants.Length && plants[i] != null;
                plantButtons[i].interactable = validPlant && energy >= plants[i].EnergyCost;
            }
        }
    }
}