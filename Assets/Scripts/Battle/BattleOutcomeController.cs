using System;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Battle
{
    public enum BattleOutcome
    {
        None = 0,
        Victory = 1,
        Defeat = 2
    }

    /// <summary>
    /// Coordinates the end of a battle. Victory is raised after the final wave is cleared;
    /// defeat is raised when the protected farm target reaches zero health.
    /// </summary>
    public sealed class BattleOutcomeController : MonoBehaviour
    {
        [SerializeField] private WaveManager waveManager;
        [SerializeField] private Health protectedTargetHealth;
        [SerializeField] private EnergyWallet rewardWallet;
        [SerializeField, Min(0)] private int victoryEnergyReward = 100;\n        [SerializeField, Min(0)] private int victoryFarmCoinReward = 50;
        [SerializeField, Min(1)] private int nextStageToUnlock = 2;
        [SerializeField] private bool beginWavesOnStart = true;

        public BattleOutcome Outcome { get; private set; }
        public bool IsFinished => Outcome != BattleOutcome.None;

        public event Action<BattleOutcome> BattleFinished;

        private void OnEnable()
        {
            if (waveManager != null)
                waveManager.AllWavesCleared += HandleAllWavesCleared;

            if (protectedTargetHealth != null)
                protectedTargetHealth.Died += HandleProtectedTargetDied;
        }

        private void Start()
        {
            if (beginWavesOnStart && waveManager != null)
                waveManager.Begin();
        }

        private void OnDisable()
        {
            if (waveManager != null)
                waveManager.AllWavesCleared -= HandleAllWavesCleared;

            if (protectedTargetHealth != null)
                protectedTargetHealth.Died -= HandleProtectedTargetDied;
        }

        private void HandleAllWavesCleared()
        {
            Finish(BattleOutcome.Victory);
        }

        private void HandleProtectedTargetDied()
        {
            Finish(BattleOutcome.Defeat);
        }

        private void Finish(BattleOutcome outcome)
        {
            if (IsFinished || outcome == BattleOutcome.None)
                return;

            Outcome = outcome;

            if (outcome == BattleOutcome.Victory && rewardWallet != null && victoryEnergyReward > 0)
                rewardWallet.Add(victoryEnergyReward);

            ProgressSaveService.RecordBattle(outcome == BattleOutcome.Victory, nextStageToUnlock);
            BattleFinished?.Invoke(Outcome);
        }

        /// <summary>Allows a UI retry button or test harness to reset this controller.</summary>
        public void ResetOutcome()
        {
            Outcome = BattleOutcome.None;
        }
    }
}