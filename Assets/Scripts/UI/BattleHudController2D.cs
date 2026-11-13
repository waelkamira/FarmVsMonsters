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
        [SerializeField] private PlantPlacementService2D placementService;

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
        [SerializeField] private Image[] plantButtonIcons;
        [SerializeField] private Image[] plantCooldownFills;
        [SerializeField] private Text[] plantCooldownLabels;
        [SerializeField] private GameObject[] plantSelectionFrames;
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
            if (desktopInput != null) desktopInput.SelectedPlantChanged += HandleInputPlantSelected;
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
            if (desktopInput != null) desktopInput.SelectedPlantChanged -= HandleInputPlantSelected;
            RemoveButtonListeners();
        }

        private void Update()
        {
            RefreshPlantButtons();
            if (waveManager != null)
            {
                if (enemiesText != null)
                    enemiesText.text = "Monsters: " + waveManager.LivingEnemyCount;
                if (waveText != null && waveManager.CurrentWave == 0 && waveManager.StartDelayRemaining > 0f)
                    waveText.text = "Incoming wave in " + Mathf.CeilToInt(waveManager.StartDelayRemaining);
                else if (waveText != null && waveManager.InterWaveDelayRemaining > 0f)
                    waveText.text = "Next wave in " + Mathf.CeilToInt(waveManager.InterWaveDelayRemaining);
            }
        }

        public void SelectPlant(int index)
        {
            if (plants == null || index < 0 || index >= plants.Length || plants[index] == null) return;
            selectedIndex = index;
            PlantDefinition definition = plants[index];
            if (desktopInput != null) desktopInput.SelectPlant(definition);
            if (selectedPlantText != null)
                selectedPlantText.text = definition.DisplayName + "  •  " + definition.EnergyCost + " energy\n" + definition.Description;
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
                if (plants != null && i < plants.Length && plants[i] != null)
                {
                    if (plantButtonLabels != null && i < plantButtonLabels.Length && plantButtonLabels[i] != null)
                        plantButtonLabels[i].text = plants[i].DisplayName + "\n" + plants[i].EnergyCost + " energy";
                    if (plantButtonIcons != null && i < plantButtonIcons.Length && plantButtonIcons[i] != null)
                    {
                        plantButtonIcons[i].sprite = plants[i].Icon;
                        plantButtonIcons[i].enabled = plants[i].Icon != null;
                        plantButtonIcons[i].preserveAspect = true;
                    }
                }
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
            if (waveManager != null)
            {
                HandleWaveStarted(waveManager.CurrentWave);
                if (waveText != null && waveManager.CurrentWave == 0 && waveManager.StartDelayRemaining > 0f)
                    waveText.text = "Incoming wave in " + Mathf.CeilToInt(waveManager.StartDelayRemaining);
            }
            RefreshPlantButtons();
        }

        private void HandleInputPlantSelected(PlantDefinition definition)
        {
            if (plants == null || definition == null) return;
            for (int i = 0; i < plants.Length; i++)
            {
                if (plants[i] != definition) continue;
                selectedIndex = i;
                if (selectedPlantText != null)
                    selectedPlantText.text = definition.DisplayName + "  •  " +
                        definition.EnergyCost + " energy\n" + definition.Description;
                RefreshPlantButtons();
                return;
            }
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
                waveText.text = number <= 0 ? "Get Ready!" :
                    "Wave: " + number + " / " + waveManager.TotalWaves + " — " + waveManager.CurrentWaveName;
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
            for (int i = 0; i < plantButtons.Length; i++)
            {
                if (plantButtons[i] == null) continue;
                bool valid = plants != null && i < plants.Length && plants[i] != null && plants[i].Prefab != null;
                float cooldown = valid && placementService != null
                    ? placementService.GetPlacementCooldownRemaining(plants[i]) : 0f;
                plantButtons[i].interactable = valid;

                if (plantCooldownFills != null && i < plantCooldownFills.Length && plantCooldownFills[i] != null)
                {
                    Image fill = plantCooldownFills[i];
                    fill.fillAmount = valid && plants[i].PlacementCooldown > 0f
                        ? Mathf.Clamp01(cooldown / plants[i].PlacementCooldown) : 0f;
                    fill.enabled = cooldown > 0f;
                }
                if (plantCooldownLabels != null && i < plantCooldownLabels.Length && plantCooldownLabels[i] != null)
                {
                    plantCooldownLabels[i].text = cooldown > 0f ? Mathf.CeilToInt(cooldown).ToString() : string.Empty;
                    plantCooldownLabels[i].enabled = cooldown > 0f;
                }
                if (plantSelectionFrames != null && i < plantSelectionFrames.Length && plantSelectionFrames[i] != null)
                    plantSelectionFrames[i].SetActive(i == selectedIndex);
            }
        }
    }
}