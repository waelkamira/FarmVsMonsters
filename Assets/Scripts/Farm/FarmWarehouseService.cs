using System;
using UnityEngine;
using FarmVsMonsters.Progression;

namespace FarmVsMonsters.Farm
{
    /// <summary>Persistent warehouse expansion purchased with farm coins.</summary>
    public sealed class FarmWarehouseService : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.warehouse.v1";

        [Serializable]
        private sealed class WarehouseSave
        {
            public int version = 1;
            public int level;
        }

        [SerializeField] private FarmResourceWallet resourceWallet;
        [SerializeField, Min(1)] private int baseCapacity = 9999;
        [SerializeField, Min(1)] private int capacityPerLevel = 2500;
        [SerializeField, Min(0)] private int baseUpgradeCost = 500;
        [SerializeField, Min(1f)] private float costMultiplier = 1.75f;
        [SerializeField, Min(0)] private int maximumLevel = 10;

        private int level;
        public event Action<int, int> WarehouseUpgraded;
        public event Action UpgradeRejected;

        public int Level => level;
        public int MaximumLevel => Mathf.Max(0, maximumLevel);
        public int CapacityPerResource => CalculateCapacity(level);
        public int NextUpgradeCost => CalculateCost(level);

        private void Awake()
        {
            Load();
            ApplyCapacity();
        }

        public bool CanUpgrade()
        {
            return resourceWallet != null && level < Mathf.Max(0, maximumLevel) &&
                   ProgressSaveService.Load().farmCoins >= NextUpgradeCost;
        }

        public bool TryUpgrade()
        {
            if (!CanUpgrade())
            {
                UpgradeRejected?.Invoke();
                return false;
            }

            int cost = NextUpgradeCost;
            if (!ProgressSaveService.TrySpendFarmCoins(cost))
            {
                UpgradeRejected?.Invoke();
                return false;
            }

            level++;
            Save();
            ApplyCapacity();
            WarehouseUpgraded?.Invoke(level, CapacityPerResource);
            return true;
        }

        public int GetStoredAmount(FarmResourceType resource)
        {
            return resourceWallet != null ? resourceWallet.GetAmount(resource) : 0;
        }

        private int CalculateCapacity(int targetLevel)
        {
            long value = (long)Mathf.Max(1, baseCapacity) +
                         (long)Mathf.Max(0, targetLevel) * Mathf.Max(1, capacityPerLevel);
            return value >= int.MaxValue ? int.MaxValue : (int)value;
        }

        private int CalculateCost(int currentLevel)
        {
            double value = Mathf.Max(0, baseUpgradeCost) *
                           Math.Pow(Mathf.Max(1f, costMultiplier), Mathf.Max(0, currentLevel));
            return value >= int.MaxValue ? int.MaxValue : Mathf.Max(0, (int)Math.Ceiling(value));
        }

        private void ApplyCapacity()
        {
            if (resourceWallet != null)
                resourceWallet.SetCapacityPerResource(CapacityPerResource);
        }

        private void Load()
        {
            level = 0;
            if (!PlayerPrefs.HasKey(SaveKey)) return;
            try
            {
                WarehouseSave data = JsonUtility.FromJson<WarehouseSave>(PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data != null && data.version == 1)
                    level = Mathf.Clamp(data.level, 0, Mathf.Max(0, maximumLevel));
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load warehouse upgrade: " + exception.Message);
            }
        }

        private void Save()
        {
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(new WarehouseSave { level = level }));
            PlayerPrefs.Save();
        }
    }
}