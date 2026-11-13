using System;
using UnityEngine;

namespace FarmVsMonsters.Progression
{
    [Serializable]
    public sealed class PlayerProgressData
    {
        public int schemaVersion = 1;
        public int highestUnlockedStage = 1;
        public int completedBattles;
        public int totalVictories;
        public int totalDefeats;
    }

    /// <summary>
    /// Small local JSON save service for prototype progression.
    /// This is device-local convenience storage, not secure storage or cloud sync.
    /// </summary>
    public static class ProgressSaveService
    {
        private const string SaveKey = "farm_vs_monsters.player_progress.v1";
        private static PlayerProgressData cachedProgress;

        public static PlayerProgressData Load()
        {
            if (cachedProgress != null)
                return Clone(cachedProgress);

            if (!PlayerPrefs.HasKey(SaveKey))
            {
                cachedProgress = CreateNewProgress();
                return Clone(cachedProgress);
            }

            try
            {
                string json = PlayerPrefs.GetString(SaveKey, string.Empty);
                cachedProgress = string.IsNullOrEmpty(json)
                    ? CreateNewProgress()
                    : JsonUtility.FromJson<PlayerProgressData>(json);

                if (cachedProgress == null || cachedProgress.schemaVersion != 1)
                    cachedProgress = CreateNewProgress();

                Normalize(cachedProgress);
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not read local progress save. Starting a new profile. " + exception.Message);
                cachedProgress = CreateNewProgress();
            }

            return Clone(cachedProgress);
        }

        public static void Save(PlayerProgressData progress)
        {
            if (progress == null)
                return;

            cachedProgress = Clone(progress);
            Normalize(cachedProgress);
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(cachedProgress));
            PlayerPrefs.Save();
        }

        public static bool IsStageUnlocked(int stageNumber)
        {
            PlayerProgressData progress = Load();
            return stageNumber >= 1 && stageNumber <= progress.highestUnlockedStage;
        }

        public static void UnlockStage(int stageNumber)
        {
            if (stageNumber < 1)
                return;

            PlayerProgressData progress = Load();
            if (stageNumber <= progress.highestUnlockedStage)
                return;

            progress.highestUnlockedStage = stageNumber;
            Save(progress);
        }

        public static void RecordBattle(bool victory, int nextStageToUnlock)
        {
            PlayerProgressData progress = Load();
            progress.completedBattles++;

            if (victory)
            {
                progress.totalVictories++;
                if (nextStageToUnlock > progress.highestUnlockedStage)
                    progress.highestUnlockedStage = nextStageToUnlock;
            }
            else
            {
                progress.totalDefeats++;
            }

            Save(progress);
        }

        public static void ResetProgress()
        {
            cachedProgress = CreateNewProgress();
            PlayerPrefs.DeleteKey(SaveKey);
            PlayerPrefs.Save();
        }

        private static PlayerProgressData CreateNewProgress()
        {
            return new PlayerProgressData();
        }

        private static PlayerProgressData Clone(PlayerProgressData source)
        {
            if (source == null)
                return CreateNewProgress();

            return new PlayerProgressData
            {
                schemaVersion = source.schemaVersion,
                highestUnlockedStage = source.highestUnlockedStage,
                completedBattles = source.completedBattles,
                totalVictories = source.totalVictories,
                totalDefeats = source.totalDefeats
            };
        }

        private static void Normalize(PlayerProgressData progress)
        {
            progress.schemaVersion = 1;
            progress.highestUnlockedStage = Mathf.Max(1, progress.highestUnlockedStage);
            progress.completedBattles = Mathf.Max(0, progress.completedBattles);
            progress.totalVictories = Mathf.Max(0, progress.totalVictories);
            progress.totalDefeats = Mathf.Max(0, progress.totalDefeats);
        }
    }
}