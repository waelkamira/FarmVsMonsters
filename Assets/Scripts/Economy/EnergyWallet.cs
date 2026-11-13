using System;
using UnityEngine;

namespace FarmVsMonsters.Economy
{
    /// <summary>Runtime energy resource used to pay for plant placement and abilities.</summary>
    public sealed class EnergyWallet : MonoBehaviour
    {
        [SerializeField, Min(0)] private int startingEnergy = 100;
        [SerializeField, Min(0)] private int capacity = 999;

        public int Balance { get; private set; }
        public int Capacity => capacity;

        public event Action<int, int> BalanceChanged;

        private void Awake()
        {
            capacity = Mathf.Max(0, capacity);
            Balance = Mathf.Clamp(startingEnergy, 0, capacity);
        }

        public bool TrySpend(int amount)
        {
            if (amount < 0)
                return false;
            if (amount == 0)
                return true;
            if (Balance < amount)
                return false;

            SetBalance(Balance - amount);
            return true;
        }

        public int Add(int amount)
        {
            if (amount <= 0)
                return 0;

            int previous = Balance;
            SetBalance(Mathf.Min(capacity, Balance + amount));
            return Balance - previous;
        }

        public void SetCapacity(int newCapacity)
        {
            capacity = Mathf.Max(0, newCapacity);
            SetBalance(Mathf.Min(Balance, capacity));
        }

        public void ResetToStartingBalance()
        {
            SetBalance(Mathf.Clamp(startingEnergy, 0, capacity));
        }

        private void SetBalance(int value)
        {
            int clamped = Mathf.Clamp(value, 0, capacity);
            if (Balance == clamped)
                return;

            Balance = clamped;
            BalanceChanged?.Invoke(Balance, capacity);
        }
    }
}
