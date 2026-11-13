using System;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Small runtime seed/harvest wallet for the 2D battle-farm loop.</summary>
    public sealed class FarmResourceWallet2D : MonoBehaviour
    {
        [SerializeField, Min(0)] private int startingSeeds = 8;
        [SerializeField, Min(0)] private int startingProduce;
        [SerializeField, Min(0)] private int startingFeed = 8;
        [SerializeField, Min(0)] private int maxSeeds = 99;
        [SerializeField, Min(0)] private int maxProduce = 999;
        [SerializeField, Min(0)] private int maxFeed = 99;

        public int Seeds { get; private set; }
        public int Produce { get; private set; }
        public int Feed { get; private set; }
        public event Action<int, int> ResourcesChanged;
        public event Action<int, int, int> FullResourcesChanged;

        private void Awake()
        {
            Seeds = Mathf.Clamp(startingSeeds, 0, maxSeeds);
            Produce = Mathf.Clamp(startingProduce, 0, maxProduce);
            Feed = Mathf.Clamp(startingFeed, 0, maxFeed);
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

        public bool TrySpendFeed(int amount)
        {
            if (amount < 0 || Feed < amount) return false;
            Feed -= amount;
            Notify();
            return true;
        }

        public int AddFeed(int amount)
        {
            if (amount <= 0) return 0;
            int accepted = Mathf.Min(amount, maxFeed - Feed);
            Feed += accepted;
            Notify();
            return accepted;
        }

        public bool TryAddProduce(int amount)
        {
            if (amount <= 0 || amount > maxProduce - Produce) return false;
            Produce += amount;
            Notify();
            return true;
        }

        private void Notify()
        {
            ResourcesChanged?.Invoke(Seeds, Produce);
            FullResourcesChanged?.Invoke(Seeds, Feed, Produce);
        }
    }
}