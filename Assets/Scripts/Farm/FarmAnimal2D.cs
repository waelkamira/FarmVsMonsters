using FarmVsMonsters.Combat;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Stationary farm animal: feed it, wait for production, collect its yield, protect it from monsters.</summary>
    [RequireComponent(typeof(Health))]
    public sealed class FarmAnimal2D : MonoBehaviour
    {
        public enum AnimalState { Hungry, Producing, Ready }

        [SerializeField] private FarmAnimalDefinition2D definition;
        [SerializeField] private FarmResourceWallet2D wallet;
        [SerializeField] private SpriteRenderer animalRenderer;
        [SerializeField] private FarmDefenseTarget2D monsterTarget;

        private Health health;
        private float productionRemaining;
        private FarmAnimalDefinition2D configuredDefinition;

        public AnimalState State { get; private set; } = AnimalState.Hungry;
        public string AnimalName => definition != null ? definition.DisplayName : string.Empty;
        public float ProductionProgress => State == AnimalState.Ready ? 1f :
            definition == null || State != AnimalState.Producing ? 0f :
            Mathf.Clamp01(1f - productionRemaining / definition.ProductionSeconds);

        private void Awake()
        {
            health = GetComponent<Health>();
            if (animalRenderer == null) animalRenderer = GetComponentInChildren<SpriteRenderer>();
            if (monsterTarget == null) monsterTarget = GetComponent<FarmDefenseTarget2D>();
            if (definition != null && health != null)
                health.SetMaxHealth(definition.AnimalHealth, true);
            RefreshVisual();
        }

        private void Start()
        {
            if (definition != null && health != null)
                health.SetMaxHealth(definition.AnimalHealth, true);
            configuredDefinition = definition;
        }

        private void Update()
        {
            if (health == null || health.IsDead || State != AnimalState.Producing) return;
            productionRemaining -= Time.deltaTime;
            if (productionRemaining <= 0f)
            {
                productionRemaining = 0f;
                State = AnimalState.Ready;
                RefreshVisual();
            }
        }

        public void Configure(FarmResourceWallet2D resourceWallet, FarmAnimalDefinition2D animalDefinition)
        {
            wallet = resourceWallet;
            definition = animalDefinition;
            if (health != null && definition != null && configuredDefinition != definition)
            {
                health.SetMaxHealth(definition.AnimalHealth, true);
                configuredDefinition = definition;
            }
            RefreshVisual();
        }

        public bool TryFeed()
        {
            if (health == null || health.IsDead || State != AnimalState.Hungry ||
                definition == null || wallet == null ||
                !wallet.TrySpendFeed(definition.FeedCost))
                return false;

            productionRemaining = definition.ProductionSeconds;
            State = AnimalState.Producing;
            RefreshVisual();
            return true;
        }

        public bool TryCollect()
        {
            if (health == null || health.IsDead || State != AnimalState.Ready ||
                definition == null || wallet == null ||
                !wallet.TryAddProduce(definition.ProduceYield))
                return false;

            State = AnimalState.Hungry;
            RefreshVisual();
            return true;
        }

        private void RefreshVisual()
        {
            if (animalRenderer == null || definition == null) return;
            animalRenderer.sprite = State == AnimalState.Ready && definition.ReadySprite != null
                ? definition.ReadySprite : definition.IdleSprite;
        }
    }
}