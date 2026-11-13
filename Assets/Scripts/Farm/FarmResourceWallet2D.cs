using System;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Small runtime seed/harvest wallet for the 2D battle-farm loop.</summary>
    public sealed class FarmResourceWallet2D : MonoBehaviour
    {
        [SerializeField, Min(0)] private int startingSeeds = 8;
        [SerializeField, Min(0)] private int startingProduce;
        [SerializeField, Min(0)] private int maxSeeds = 99;
        [SerializeField, Min(0)] private int maxProduce = 999;

        public int Seeds { get; private set; }
        public int Produce { get; private set; }
        public event Action<int, int> ResourcesChanged;

        private void Awake()
        {
            Seeds = Mathf.Clamp(startingSeeds, 0, maxSeeds);
            Produce = Mathf.Clamp(startingProduce, 0, maxProduce);
            Notify();
        }

        public bool TrySpendSeeds(int amount)
        {
            if (amount < 0 || Seeds < amount) return false;
            Seeds -= amount;
            Notify();
            return true;
        }

        public int AddSeeds(int amount)
        {
            if (amount <= 0) return 0;
            int accepted = Mathf.Min(amount, maxSeeds - Seeds);
            Seeds += accepted;
            Notify();
            return accepted;
        }

        public int AddProduce(int amount)
        {
            if (amount <= 0) return 0;
            int accepted = Mathf.Min(amount, maxProduce - Produce);
            Produce += accepted;
            Notify();
            return accepted;
        }

        private void Notify()
        {
            ResourcesChanged?.Invoke(Seeds, Produce);
        }
    }
}