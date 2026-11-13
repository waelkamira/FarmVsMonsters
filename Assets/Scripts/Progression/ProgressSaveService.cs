using System;
using UnityEngine;

namespace FarmVsMonsters.Progression
{
    [Serializable]
    public sealed class UpgradeLevelRecord
    {
        public string upgradeId;
        public int level;
    }

    [Serializable]
    public sealed class PlayerProgressData
    {
        public int schemaVersion = 2;
        public int highestUnlockedStage = 1;
        public int completedBattles;
        public int totalVictories;
        public int totalDefeats;
        public int farmCoins = 250;
        public UpgradeLevelRecord[] upgrades = Array.Empty<UpgradeLevelRecord>();
        public string[] ownedBuildingIds = Array.Empty<string>();
    }

    /// <summary>Versioned device-local JSON persistence for campaign and farm progression.</summary>
    public static class ProgressSaveService
    {
        private const string SaveKey = "farm_vs_monsters.player_progress.v1";
        private const int CurrentSchemaVersion = 2;
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
                PlayerProgressData loaded = string.IsNullOrEmpty(json)
                    ? CreateNewProgress()
                    : JsonUtility.FromJson<PlayerProgressData>(json);

                if (loaded == null || loaded.schemaVersion < 1 || loaded.schemaVersion > CurrentSchemaVersion)
                    loaded = CreateNewProgress();

                // Version 1 had battle stats and stage unlocks only. Keep those values
                // and initialize the new farm economy/upgrade fields with safe defaults.
                if (loaded.schemaVersion == 1)
                {
                    loaded.farmCoins = 250;
                    loaded.upgrades = Array.Empty<UpgradeLevelRecord>();
                    loaded.ownedBuildingIds = Array.Empty<string>();
                    loaded.schemaVersion = CurrentSchemaVersion;
                }

                Normalize(loaded);
                cachedProgress = loaded;
                PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(cachedProgress));
                PlayerPrefs.Save();
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

        public static int GetUpgradeLevel(string upgradeId)
        {
            if (string.IsNullOrWhiteSpace(upgradeId))
                return 0;

            PlayerProgressData progress = Load();
            UpgradeLevelRecord record = FindUpgrade(progress, upgradeId);
            return record != null ? Mathf.Max(0, record.level) : 0;
        }

        public static bool TryPurchaseUpgrade(string upgradeId, int cost, int maxLevel, out int newLevel)
        {
            newLevel = GetUpgradeLevel(upgradeId);
            if (string.IsNullOrWhiteSpace(upgradeId) || cost < 0 || maxLevel < 1 || newLevel >= maxLevel)
                return false;

            PlayerProgressData progress = Load();
            if (progress.farmCoins < cost)
                return false;

            UpgradeLevelRecord record = FindUpgrade(progress, upgradeId);
            if (record == null)
            {
                record = new UpgradeLevelRecord { upgradeId = upgradeId, level = 0 };
                var records = new System.Collections.Generic.List<UpgradeLevelRecord>(progress.upgrades ?? Array.Empty<UpgradeLevelRecord>());
                records.Add(record);
                progress.upgrades = records.ToArray();
            }

            progress.farmCoins -= cost;
            record.level = Mathf.Min(maxLevel, record.level + 1);
            newLevel = record.level;
            Save(progress);
            return true;
        }

        public static bool OwnsBuilding(string buildingId)
        {
            if (string.IsNullOrWhiteSpace(buildingId))
                return false;

            PlayerProgressData progress = Load();
            if (progress.ownedBuildingIds == null)
                return false;

            foreach (string ownedId in progress.ownedBuildingIds)
            {
                if (string.Equals(ownedId, buildingId, StringComparison.Ordinal))
                    return true;
            }

            return false;
        }

        public static bool TryPurchaseBuilding(string buildingId, int cost)
        {
            if (string.IsNullOrWhiteSpace(buildingId) || cost < 0 || OwnsBuilding(buildingId))
                return false;

            PlayerProgressData progress = Load();
            if (progress.farmCoins < cost)
                return false;

            var owned = new System.Collections.Generic.List<string>(progress.ownedBuildingIds ?? Array.Empty<string>());
            owned.Add(buildingId);
            progress.ownedBuildingIds = owned.ToArray();
            progress.farmCoins -= cost;
            Save(progress);
            return true;
        }

        public static int AddFarmCoins(int amount)
        {
            if (amount <= 0)
                return 0;

            PlayerProgressData progress = Load();
            int accepted = Mathf.Min(amount, int.MaxValue - progress.farmCoins);
            progress.farmCoins += accepted;
            Save(progress);
            return accepted;
        }

        public static bool TrySpendFarmCoins(int amount)
        {
            if (amount < 0)
                return false;

            PlayerProgressData progress = Load();
            if (progress.farmCoins < amount)
                return false;

            progress.farmCoins -= amount;
            Save(progress);
            return true;
        }

        public static void ResetProgress()
        {
            cachedProgress = CreateNewProgress();
            PlayerPrefs.DeleteKey(SaveKey);
            PlayerPrefs.Save();
        }

        private static UpgradeLevelRecord FindUpgrade(PlayerProgressData progress, string upgradeId)
        {
            if (progress.upgrades == null)
                return null;

            foreach (UpgradeLevelRecord record in progress.upgrades)
            {
                if (record != null && string.Equals(record.upgradeId, upgradeId, StringComparison.Ordinal))
                    return record;
            }

            return null;
        }

        private static PlayerProgressData CreateNewProgress()
        {
            return new PlayerProgressData();
        }

        private static PlayerProgressData Clone(PlayerProgressData source)
        {
            if (source == null)
                return CreateNewProgress();

            UpgradeLevelRecord[] upgrades = source.upgrades ?? Array.Empty<UpgradeLevelRecord>();
            var copiedUpgrades = new UpgradeLevelRecord[upgrades.Length];
            for (int i = 0; i < upgrades.Length; i++)
            {
                UpgradeLevelRecord record = upgrades[i];
                copiedUpgrades[i] = record == null ? null : new UpgradeLevelRecord
                {
                    upgradeId = record.upgradeId,
                    level = record.level
                };
            }

            return new PlayerProgressData
            {
                schemaVersion = source.schemaVersion,
                highestUnlockedStage = source.highestUnlockedStage,
                completedBattles = source.completedBattles,
                totalVictories = source.totalVictories,
                totalDefeats = source.totalDefeats,
                farmCoins = source.farmCoins,
                upgrades = copiedUpgrades
            };
        }

        private static void Normalize(PlayerProgressData progress)
        {
            progress.schemaVersion = CurrentSchemaVersion;
            progress.highestUnlockedStage = Mathf.Max(1, progress.highestUnlockedStage);
            progress.completedBattles = Mathf.Max(0, progress.completedBattles);
            progress.totalVictories = Mathf.Max(0, progress.totalVictories);
            progress.totalDefeats = Mathf.Max(0, progress.totalDefeats);
            progress.farmCoins = Mathf.Max(0, progress.farmCoins);
            progress.upgrades ??= Array.Empty<UpgradeLevelRecord>();\n            progress.ownedBuildingIds ??= Array.Empty<string>();

            foreach (UpgradeLevelRecord record in progress.upgrades)
            {
                if (record == null)
                    continue;
                record.level = Mathf.Max(0, record.level);
                record.upgradeId ??= string.Empty;
            }
        }
    }
}