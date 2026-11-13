using System;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Persistent, capped inventory for materials produced on the farm.</summary>
    public sealed class FarmResourceWallet : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.resources.v1";
        private const int ResourceCount = 5;
        [SerializeField, Min(1)] private int capacityPerResource = 9999;

        [Serializable]
        private sealed class InventorySave
        {
            public int version = 1;
            public int[] amounts = new int[ResourceCount];
        }

        private int[] amounts = new int[ResourceCount];
        public event Action<FarmResourceType, int> ResourceChanged;

        private void Awake()
        {
            Load();
        }

        public int GetAmount(FarmResourceType type)
        {
            int index = (int)type;
            return IsValidIndex(index) ? amounts[index] : 0;
        }

        public int Add(FarmResourceType type, int amount)
        {
            int index = (int)type;
            if (!IsValidIndex(index) || amount <= 0)
                return 0;

            int accepted = Mathf.Min(amount, Mathf.Max(0, capacityPerResource - amounts[index]));
            if (accepted <= 0)
                return 0;

            amounts[index] += accepted;
            Save();
            ResourceChanged?.Invoke(type, amounts[index]);
            return accepted;
        }

        public bool TrySpend(FarmResourceType type, int amount)
        {
            int index = (int)type;
            if (!IsValidIndex(index) || amount < 0 || amounts[index] < amount)
                return false;
            if (amount == 0)
                return true;

            amounts[index] -= amount;
            Save();
            ResourceChanged?.Invoke(type, amounts[index]);
            return true;
        }

        public void Save()
        {
            var data = new InventorySave { amounts = (int[])amounts.Clone() };
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(data));
            PlayerPrefs.Save();
        }

        private void Load()
        {
            if (!PlayerPrefs.HasKey(SaveKey))
                return;

            try
            {
                InventorySave data = JsonUtility.FromJson<InventorySave>(
                    PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data == null || data.version != 1 || data.amounts == null)
                    return;

                for (int i = 0; i < amounts.Length && i < data.amounts.Length; i++)
                    amounts[i] = Mathf.Clamp(data.amounts[i], 0, Mathf.Max(1, capacityPerResource));
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load farm resource inventory: " + exception.Message);
            }
        }

        private static bool IsValidIndex(int index)
        {
            return index >= 0 && index < ResourceCount;
        }
    }
}