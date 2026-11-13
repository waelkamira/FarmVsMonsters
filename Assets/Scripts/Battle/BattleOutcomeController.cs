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

    /// <summary>Coordinates victory/defeat, battle rewards, and campaign progression.</summary>
    public sealed class BattleOutcomeController : MonoBehaviour
    {
        [SerializeField] private WaveManager waveManager;
        [SerializeField] private Health protectedTargetHealth;
        [SerializeField] private EnergyWallet rewardWallet;
        [SerializeField, Min(0)] private int victoryEnergyReward = 100;
        [SerializeField, Min(0)] private int victoryFarmCoinReward = 50;
        [SerializeField, Min(1)] private int nextStageToUnlock = 2;
        [SerializeField] private bool beginWavesOnStart = true;

        public BattleOutcome Outcome { get; private set; }
        public bool IsFinished => Outcome != BattleOutcome.None;
        public event Action<BattleOutcome> BattleFinished;

        private void OnEnable()
        {
            if (waveManager != null)
                waveManager.AllWavesCleared += HandleAllWavesCleared;
            BattleFinished += HandleBattleFinished;
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
            BattleFinished -= HandleBattleFinished;
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

        private void HandleBattleFinished(BattleOutcome outcome)
        {
            if (outcome == BattleOutcome.Defeat && waveManager != null)
                waveManager.StopWaves(true);
        }

        private void Finish(BattleOutcome outcome)
        {
            if (IsFinished || outcome == BattleOutcome.None)
                return;

            Outcome = outcome;
            if (outcome == BattleOutcome.Victory)
            {
                if (rewardWallet != null && victoryEnergyReward > 0)
                    rewardWallet.Add(victoryEnergyReward);
                if (victoryFarmCoinReward > 0)
                    ProgressSaveService.AddFarmCoins(victoryFarmCoinReward);
            }

            ProgressSaveService.RecordBattle(outcome == BattleOutcome.Victory, nextStageToUnlock);
            BattleFinished?.Invoke(Outcome);
        }

        /// <summary>Allows the farmhouse/princess protection relay to end the battle.</summary>
        public void ReportDefeat()
        {
            Finish(BattleOutcome.Defeat);
        }

        public void ResetOutcome()
        {
            Outcome = BattleOutcome.None;
        }
    }
}