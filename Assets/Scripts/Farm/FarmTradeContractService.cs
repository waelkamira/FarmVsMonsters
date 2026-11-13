using System;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Single-active-contract board with local persistence and resource-backed delivery.</summary>
    public sealed class FarmTradeContractService : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.trade_contract.v1";

        [Serializable]
        private sealed class ActiveContractSave
        {
            public int version = 1;
            public string contractId;
            public long acceptedAtUtcTicks;
            public long expiresAtUtcTicks;
        }

        [SerializeField] private FarmTradeContractDefinition[] contracts;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private ActiveContractSave active;
        public event Action<FarmTradeContractDefinition> ContractAccepted;
        public event Action<FarmTradeContractDefinition, int> ContractDelivered;
        public event Action<FarmTradeContractDefinition> ContractRejected;
        public event Action ContractExpired;

        public FarmTradeContractDefinition ActiveContract => GetActiveContract();
        public int FarmCoins => ProgressSaveService.Load().farmCoins;

        private void Awake() { Load(); }

        public FarmTradeContractDefinition[] GetAvailableContracts()
        {
            if (contracts == null) return Array.Empty<FarmTradeContractDefinition>();
            var result = new List<FarmTradeContractDefinition>();
            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (FarmTradeContractDefinition contract in contracts)
            {
                if (contract == null || !contract.IsValid ||
                    !ProgressSaveService.IsStageUnlocked(contract.RequiredStage) ||
                    !ids.Add(contract.ContractId))
                    continue;
                result.Add(contract);
            }
            return result.ToArray();
        }

        public bool CanAccept(FarmTradeContractDefinition contract)
        {
            return contract != null && contract.IsValid && ContainsConfiguredContract(contract.ContractId) &&
                   ProgressSaveService.IsStageUnlocked(contract.RequiredStage) &&
                   GetActiveContract() == null;
        }

        public bool TryAccept(FarmTradeContractDefinition contract)
        {
            if (!CanAccept(contract))
            {
                ContractRejected?.Invoke(contract);
                return false;
            }

            DateTime now = DateTime.UtcNow;
            long expiry = 0;
            if (contract.TimeLimitHours > 0f)
            {
                double ticks = contract.TimeLimitHours * TimeSpan.TicksPerHour;
                expiry = ticks >= long.MaxValue - now.Ticks
                    ? long.MaxValue
                    : now.Ticks + (long)ticks;
            }

            active = new ActiveContractSave
            {
                contractId = contract.ContractId,
                acceptedAtUtcTicks = now.Ticks,
                expiresAtUtcTicks = expiry
            };
            Save();
            ContractAccepted?.Invoke(contract);
            return true;
        }

        public int GetDeliveredAmount()
        {
            FarmTradeContractDefinition contract = GetActiveContract();
            if (contract == null || resourceWallet == null) return 0;
            return Mathf.Min(contract.RequestedAmount,
                resourceWallet.GetAmount(contract.RequestedResource));
        }

        public float GetProgress()
        {
            FarmTradeContractDefinition contract = GetActiveContract();
            return contract == null ? 0f :
                Mathf.Clamp01((float)GetDeliveredAmount() / contract.RequestedAmount);
        }

        public bool CanDeliver()
        {
            FarmTradeContractDefinition contract = GetActiveContract();
            if (contract == null || resourceWallet == null) return false;
            if (resourceWallet.GetAmount(contract.RequestedResource) < contract.RequestedAmount)
                return false;
            return (long)FarmCoins + contract.RewardCoins <= int.MaxValue;
        }

        public bool TryDeliver()
        {
            FarmTradeContractDefinition contract = GetActiveContract();
            if (contract == null || !CanDeliver())
            {
                ContractRejected?.Invoke(contract);
                return false;
            }

            if (!resourceWallet.TrySpend(contract.RequestedResource, contract.RequestedAmount))
            {
                ContractRejected?.Invoke(contract);
                return false;
            }

            int credited = ProgressSaveService.AddFarmCoins(contract.RewardCoins);
            if (credited != contract.RewardCoins)
            {
                // A balance overflow is precluded by CanDeliver; restore the goods if state changed unexpectedly.
                resourceWallet.Add(contract.RequestedResource, contract.RequestedAmount);
                ContractRejected?.Invoke(contract);
                return false;
            }

            active = null;
            Save();
            ContractDelivered?.Invoke(contract, contract.RewardCoins);
            return true;
        }

        public bool CancelActive()
        {
            if (GetActiveContract() == null) return false;
            active = null;
            Save();
            return true;
        }

        private FarmTradeContractDefinition GetActiveContract()
        {
            if (active == null) return null;
            if (active.expiresAtUtcTicks > 0 && DateTime.UtcNow.Ticks >= active.expiresAtUtcTicks)
            {
                active = null;
                Save();
                ContractExpired?.Invoke();
                return null;
            }
            return FindContract(active.contractId);
        }

        private bool ContainsConfiguredContract(string id)
        {
            return FindContract(id) != null;
        }

        private FarmTradeContractDefinition FindContract(string id)
        {
            if (contracts == null || string.IsNullOrWhiteSpace(id)) return null;
            foreach (FarmTradeContractDefinition contract in contracts)
                if (contract != null && contract.IsValid &&
                    string.Equals(contract.ContractId, id, StringComparison.Ordinal))
                    return contract;
            return null;
        }

        private void Load()
        {
            active = null;
            if (!PlayerPrefs.HasKey(SaveKey)) return;
            try
            {
                ActiveContractSave data = JsonUtility.FromJson<ActiveContractSave>(
                    PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data != null && data.version == 1 &&
                    !string.IsNullOrWhiteSpace(data.contractId) &&
                    data.acceptedAtUtcTicks > 0)
                    active = data;
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load active trade contract: " + exception.Message);
            }
        }

        private void Save()
        {
            if (active == null)
                PlayerPrefs.DeleteKey(SaveKey);
            else
                PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(active));
            PlayerPrefs.Save();
        }
    }
}