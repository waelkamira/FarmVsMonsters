using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Press F near an animal to feed it or collect its completed production.</summary>
    public sealed class FarmAnimalCareController2D : MonoBehaviour
    {
        [SerializeField] private FarmResourceWallet2D wallet;
        [SerializeField] private FarmAnimalDefinition2D selectedAnimal;
        [SerializeField, Min(0.1f)] private float interactionRadius = 1.4f;
        [SerializeField, Min(1)] private int maxAnimalsPerScan = 12;
        [SerializeField] private LayerMask animalLayers = ~0;

        private Collider2D[] results;

        private void Awake()
        {
            results = new Collider2D[Mathf.Max(1, maxAnimalsPerScan)];
        }

        private void Update()
        {
            if (!Input.GetKeyDown(KeyCode.F)) return;
            FarmAnimal2D animal = FindNearestAnimal();
            if (animal == null) return;
            animal.Configure(wallet, selectedAnimal);
            if (animal.State == FarmAnimal2D.AnimalState.Hungry)
                animal.TryFeed();
            else if (animal.State == FarmAnimal2D.AnimalState.Ready)
                animal.TryCollect();
        }

        public void SetSelectedAnimal(FarmAnimalDefinition2D definition)
        {
            selectedAnimal = definition;
        }

        private FarmAnimal2D FindNearestAnimal()
        {
            int count = Physics2D.OverlapCircleNonAlloc(
                transform.position, interactionRadius, results, animalLayers);
            FarmAnimal2D nearest = null;
            float bestDistance = interactionRadius * interactionRadius;
            for (int i = 0; i < count; i++)
            {
                if (results[i] == null) continue;
                FarmAnimal2D animal = results[i].GetComponentInParent<FarmAnimal2D>();
                if (animal == null) continue;
                float distance = ((Vector2)animal.transform.position -
                    (Vector2)transform.position).sqrMagnitude;
                if (distance < bestDistance)
                {
                    nearest = animal;
                    bestDistance = distance;
                }
            }
            return nearest;
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.DrawWireSphere(transform.position, interactionRadius);
        }
    }
}