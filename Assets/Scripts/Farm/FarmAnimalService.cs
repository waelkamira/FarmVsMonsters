using System;
using System.Collections;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Purchases animals, restores pen occupancy, and persists production across sessions.</summary>
    public sealed class FarmAnimalService : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.owned_animals.v1";

        [Serializable]
        private sealed class AnimalProductionSave
        {
            public string animalId;
            public long nextProductionUtcTicks;
        }

        [Serializable]
        private sealed class AnimalSave
        {
            public int version = 2;
            public string[] ownedAnimalIds = Array.Empty<string>();
            public AnimalProductionSave[] productionStates = Array.Empty<AnimalProductionSave>();
        }

        [SerializeField] private FarmAnimalPenSlot[] penSlots;
        [SerializeField] private FarmAnimalDefinition[] availableAnimals;
        [SerializeField] private Transform animalRoot;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private readonly HashSet<string> ownedAnimalIds = new HashSet<string>(StringComparer.Ordinal);
        private readonly Dictionary<string, GameObject> spawnedAnimals = new Dictionary<string, GameObject>(StringComparer.Ordinal);
        private readonly Dictionary<string, Coroutine> productionRoutines = new Dictionary<string, Coroutine>();
        private readonly Dictionary<string, long> nextProductionTicks = new Dictionary<string, long>(StringComparer.Ordinal);

        public event Action<FarmAnimalDefinition> AnimalPurchased;
        public event Action<FarmAnimalDefinition> PurchaseRejected;
        public event Action<FarmAnimalDefinition, int> ResourceProduced;

        private void Awake()
        {
            LoadOwnership();
        }

        private void Start()
        {
            RestoreOwnedAnimals();
        }

        private void OnDestroy()
        {
            foreach (Coroutine routine in productionRoutines.Values)
                if (routine != null) StopCoroutine(routine);
            productionRoutines.Clear();
        }

        public bool Owns(FarmAnimalDefinition definition)
        {
            return definition != null && ownedAnimalIds.Contains(definition.AnimalId);
        }

        public bool CanPurchase(FarmAnimalDefinition definition)
        {
            if (definition == null || definition.Prefab == null ||
                string.IsNullOrWhiteSpace(definition.AnimalId) || Owns(definition) ||
                !ProgressSaveService.IsStageUnlocked(definition.RequiredStage) ||
                FindAvailableSlot() == null || HasDuplicateAnimalId(definition))
                return false;

            return ProgressSaveService.Load().farmCoins >= definition.CoinCost;
        }

        public bool TryPurchase(FarmAnimalDefinition definition)
        {
            if (!CanPurchase(definition))
            {
                PurchaseRejected?.Invoke(definition);
                return false;
            }

            if (!ProgressSaveService.TrySpendFarmCoins(definition.CoinCost))
            {
                PurchaseRejected?.Invoke(definition);
                return false;
            }

            ownedAnimalIds.Add(definition.AnimalId);
            EnsureProductionState(definition);
            SaveOwnership();
            SpawnAnimal(definition);
            AnimalPurchased?.Invoke(definition);
            return true;
        }

        public void RestoreOwnedAnimals()
        {
            if (availableAnimals == null) return;
            foreach (FarmAnimalDefinition definition in availableAnimals)
                if (Owns(definition))
                    SpawnAnimal(definition);
        }

        private void SpawnAnimal(FarmAnimalDefinition definition)
        {
            if (definition == null || definition.Prefab == null ||
                spawnedAnimals.ContainsKey(definition.AnimalId))
                return;

            FarmAnimalPenSlot slot = FindAvailableSlot();
            if (slot == null)
            {
                Debug.LogWarning("No free pen slot for owned animal: " + definition.AnimalId);
                return;
            }

            GameObject instance = Instantiate(definition.Prefab, slot.transform.position,
                slot.transform.rotation, animalRoot != null ? animalRoot : slot.transform);
            spawnedAnimals.Add(definition.AnimalId, instance);

            if (resourceWallet != null)
            {
                EnsureProductionState(definition);
                ProcessProduction(definition, DateTime.UtcNow.Ticks);
                productionRoutines[definition.AnimalId] = StartCoroutine(ProductionLoop(definition));
            }
        }

        private IEnumerator ProductionLoop(FarmAnimalDefinition definition)
        {
            while (definition != null && resourceWallet != null)
            {
                yield return new WaitForSecondsRealtime(Mathf.Max(1f, definition.ProductionIntervalSeconds));
                ProcessProduction(definition, DateTime.UtcNow.Ticks);
            }
        }

        private void ProcessProduction(FarmAnimalDefinition definition, long nowTicks)
        {
            if (definition == null || resourceWallet == null) return;
            EnsureProductionState(definition);
            long nextTicks = nextProductionTicks[definition.AnimalId];
            if (nowTicks < nextTicks) return;

            long intervalTicks = Math.Max(1L,
                (long)(definition.ProductionIntervalSeconds * TimeSpan.TicksPerSecond));
            long dueCycles = ((nowTicks - nextTicks) / intervalTicks) + 1L;
            int freeCapacity = Mathf.Max(0,
                resourceWallet.GetCapacity(definition.ProducedResource) -
                resourceWallet.GetAmount(definition.ProducedResource));
            long availableCycles = freeCapacity / (long)definition.ProductionAmount;
            long cyclesToProduce = Math.Min(dueCycles, availableCycles);
            if (cyclesToProduce <= 0) return;

            long totalLong = cyclesToProduce * definition.ProductionAmount;
            if (totalLong > int.MaxValue) return;
            int total = (int)totalLong;
            int accepted = resourceWallet.Add(definition.ProducedResource, total);
            if (accepted != total) return;

            long advance = cyclesToProduce > long.MaxValue / intervalTicks
                ? long.MaxValue
                : cyclesToProduce * intervalTicks;
            nextProductionTicks[definition.AnimalId] =
                advance > long.MaxValue - nextTicks ? long.MaxValue : nextTicks + advance;
            SaveOwnership();
            ResourceProduced?.Invoke(definition, accepted);
        }

        private void EnsureProductionState(FarmAnimalDefinition definition)
        {
            if (definition == null || nextProductionTicks.ContainsKey(definition.AnimalId)) return;
            long intervalTicks = Math.Max(1L,
                (long)(definition.ProductionIntervalSeconds * TimeSpan.TicksPerSecond));
            long now = DateTime.UtcNow.Ticks;
            nextProductionTicks[definition.AnimalId] =
                intervalTicks > long.MaxValue - now ? long.MaxValue : now + intervalTicks;
        }

        private FarmAnimalPenSlot FindAvailableSlot()
        {
            if (penSlots == null) return null;
            foreach (FarmAnimalPenSlot slot in penSlots)
            {
                if (slot == null) continue;
                bool occupied = false;
                foreach (GameObject animal in spawnedAnimals.Values)
                {
                    if (animal != null &&
                        Vector3.SqrMagnitude(animal.transform.position - slot.transform.position) < 0.01f)
                    {
                        occupied = true;
                        break;
                    }
                }
                if (!occupied) return slot;
            }
            return null;
        }

        private bool HasDuplicateAnimalId(FarmAnimalDefinition target)
        {
            if (availableAnimals == null) return false;
            foreach (FarmAnimalDefinition item in availableAnimals)
                if (item != null && item != target &&
                    string.Equals(item.AnimalId, target.AnimalId, StringComparison.Ordinal))
                    return true;
            return false;
        }

        private FarmAnimalDefinition FindAnimal(string id)
        {
            if (availableAnimals == null) return null;
            foreach (FarmAnimalDefinition definition in availableAnimals)
                if (definition != null &&
                    string.Equals(definition.AnimalId, id, StringComparison.Ordinal))
                    return definition;
            return null;
        }

        private void LoadOwnership()
        {
            ownedAnimalIds.Clear();
            nextProductionTicks.Clear();
            if (!PlayerPrefs.HasKey(SaveKey)) return;

            try
            {
                AnimalSave data = JsonUtility.FromJson<AnimalSave>(
                    PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data == null || (data.version != 1 && data.version != 2) ||
                    data.ownedAnimalIds == null)
                    return;

                foreach (string id in data.ownedAnimalIds)
                    if (!string.IsNullOrWhiteSpace(id))
                        ownedAnimalIds.Add(id);

                if (data.version >= 2 && data.productionStates != null)
                    foreach (AnimalProductionSave state in data.productionStates)
                        if (state != null && !string.IsNullOrWhiteSpace(state.animalId) &&
                            state.nextProductionUtcTicks > 0 && ownedAnimalIds.Contains(state.animalId))
                            nextProductionTicks[state.animalId] = state.nextProductionUtcTicks;

                // Version-1 saves receive a fresh first production interval rather than retroactive stock.
                foreach (string id in ownedAnimalIds)
                {
                    if (nextProductionTicks.ContainsKey(id)) continue;
                    FarmAnimalDefinition definition = FindAnimal(id);
                    if (definition != null) EnsureProductionState(definition);
                }
                SaveOwnership();
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load owned farm animals: " + exception.Message);
            }
        }

        private void SaveOwnership()
        {
            var states = new List<AnimalProductionSave>();
            foreach (KeyValuePair<string, long> item in nextProductionTicks)
                if (ownedAnimalIds.Contains(item.Key))
                    states.Add(new AnimalProductionSave
                    {
                        animalId = item.Key,
                        nextProductionUtcTicks = item.Value
                    });

            var data = new AnimalSave
            {
                version = 2,
                ownedAnimalIds = new List<string>(ownedAnimalIds).ToArray(),
                productionStates = states.ToArray()
            };
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(data));
            PlayerPrefs.Save();
        }
    }
}