using System;
using System.Collections;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Purchases animals, restores them into pen slots, and runs their production cycles.</summary>
    public sealed class FarmAnimalService : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.owned_animals.v1";

        [Serializable]
        private sealed class AnimalSave
        {
            public int version = 1;
            public string[] ownedAnimalIds = Array.Empty<string>();
        }

        [SerializeField] private FarmAnimalPenSlot[] penSlots;
        [SerializeField] private FarmAnimalDefinition[] availableAnimals;
        [SerializeField] private Transform animalRoot;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private readonly HashSet<string> ownedAnimalIds = new HashSet<string>(StringComparer.Ordinal);
        private readonly Dictionary<string, GameObject> spawnedAnimals = new Dictionary<string, GameObject>(StringComparer.Ordinal);
        private readonly Dictionary<string, Coroutine> productionRoutines = new Dictionary<string, Coroutine>();

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
            {
                if (routine != null)
                    StopCoroutine(routine);
            }
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
                FindAvailableSlot() == null)
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
            SaveOwnership();
            SpawnAnimal(definition);
            AnimalPurchased?.Invoke(definition);
            return true;
        }

        public void RestoreOwnedAnimals()
        {
            if (availableAnimals == null)
                return;

            foreach (FarmAnimalDefinition definition in availableAnimals)
            {
                if (Owns(definition))
                    SpawnAnimal(definition);
            }
        }

        private void SpawnAnimal(FarmAnimalDefinition definition)
        {
            if (definition == null || definition.Prefab == null || spawnedAnimals.ContainsKey(definition.AnimalId))
                return;

            FarmAnimalPenSlot slot = FindAvailableSlot();
            if (slot == null)
            {
                Debug.LogWarning("No free pen slot for owned animal: " + definition.AnimalId);
                return;
            }

            GameObject instance = Instantiate(definition.Prefab, slot.transform.position,
                slot.transform.rotation, animalRoot);
            spawnedAnimals.Add(definition.AnimalId, instance);

            if (resourceWallet != null)
                productionRoutines[definition.AnimalId] = StartCoroutine(ProductionLoop(definition));
        }

        private IEnumerator ProductionLoop(FarmAnimalDefinition definition)
        {
            while (definition != null && resourceWallet != null)
            {
                yield return new WaitForSeconds(definition.ProductionIntervalSeconds);
                int accepted = resourceWallet.Add(definition.ProducedResource, definition.ProductionAmount);
                if (accepted > 0)
                    ResourceProduced?.Invoke(definition, accepted);
            }
        }

        private FarmAnimalPenSlot FindAvailableSlot()
        {
            if (penSlots == null)
                return null;

            foreach (FarmAnimalPenSlot slot in penSlots)
            {
                if (slot == null)
                    continue;

                bool occupied = false;
                foreach (FarmAnimalDefinition definition in availableAnimals)
                {
                    if (definition != null && spawnedAnimals.ContainsKey(definition.AnimalId))
                    {
                        GameObject animal = spawnedAnimals[definition.AnimalId];
                        if (animal != null && Vector3.SqrMagnitude(animal.transform.position - slot.transform.position) < 0.01f)
                        {
                            occupied = true;
                            break;
                        }
                    }
                }

                if (!occupied)
                    return slot;
            }

            return null;
        }

        private void LoadOwnership()
        {
            ownedAnimalIds.Clear();
            if (!PlayerPrefs.HasKey(SaveKey))
                return;

            try
            {
                AnimalSave data = JsonUtility.FromJson<AnimalSave>(PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data == null || data.version != 1 || data.ownedAnimalIds == null)
                    return;

                foreach (string id in data.ownedAnimalIds)
                {
                    if (!string.IsNullOrWhiteSpace(id))
                        ownedAnimalIds.Add(id);
                }
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load owned farm animals: " + exception.Message);
            }
        }

        private void SaveOwnership()
        {
            var data = new AnimalSave
            {
                ownedAnimalIds = new List<string>(ownedAnimalIds).ToArray()
            };
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(data));
            PlayerPrefs.Save();
        }
    }
}