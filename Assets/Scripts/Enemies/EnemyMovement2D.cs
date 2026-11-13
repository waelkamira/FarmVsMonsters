using FarmVsMonsters.Combat;
using FarmVsMonsters.Farm;
using FarmVsMonsters.Visuals;
using UnityEngine;

namespace FarmVsMonsters.Enemies
{
    /// <summary>Side-view lane movement and melee attacks for hand-drawn 2D monster sprites.</summary>
    [RequireComponent(typeof(Health))]
    public sealed class EnemyMovement2D : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Health targetHealth;
        [SerializeField, Min(0f)] private float moveSpeed = 0.8f;
        [SerializeField, Min(0.05f)] private float attackRange = 0.65f;
        [SerializeField, Min(0f)] private float attackDamage = 8f;
        [SerializeField, Min(0.1f)] private float targetScanRadius = 1.8f;
        [SerializeField, Min(1)] private int maxFarmTargetsPerScan = 24;
        [SerializeField] private LayerMask farmTargetLayers = ~0;
        [SerializeField, Min(0.1f)] private float attackInterval = 1.2f;
        [SerializeField] private SpriteRenderer spriteRenderer;
        [SerializeField] private bool constrainToSpawnLane = true;
        [SerializeField, Min(0f)] private float laneVerticalCorrectionSpeed = 20f;

        private Health ownHealth;
        private CharacterAnimationDriver2D animationDriver;
        private float attackTimer;
        private float slowMultiplier = 1f;
        private float slowRemaining;
        private float baseMoveSpeed;
        private float baseAttackDamage;
        private Collider2D[] farmTargetResults;\n        private FarmDefenseTarget2D currentFarmTarget;\n        private float laneY;
        private bool laneConfigured;

        private void Awake()
        {
            ownHealth = GetComponent<Health>();
            baseMoveSpeed = moveSpeed;
            baseAttackDamage = attackDamage;
            laneY = transform.position.y;
            laneConfigured = true;
            animationDriver = GetComponent<CharacterAnimationDriver2D>();
            if (spriteRenderer == null) spriteRenderer = GetComponentInChildren<SpriteRenderer>();\n            farmTargetResults = new Collider2D[Mathf.Max(1, maxFarmTargetsPerScan)];
        }

        public void ApplyDifficulty(float speedMultiplier, float damageMultiplier)
        {
            moveSpeed = baseMoveSpeed * Mathf.Clamp(speedMultiplier, 0.1f, 5f);
            attackDamage = baseAttackDamage * Mathf.Clamp(damageMultiplier, 0.1f, 10f);
        }

        public void SetLane(float worldY)
        {
            laneY = worldY;
            laneConfigured = true;
            Vector3 position = transform.position;
            position.y = laneY;
            transform.position = position;
        }

        public void SetTarget(Transform newTarget, Health newTargetHealth)
        {
            target = newTarget;
            targetHealth = newTargetHealth;
        }

        public void ApplySlow(float multiplier, float duration)
        {
            if (duration <= 0f || multiplier >= 1f) return;
            slowMultiplier = Mathf.Min(slowMultiplier, Mathf.Clamp(multiplier, 0.1f, 1f));
            slowRemaining = Mathf.Max(slowRemaining, duration);
        }

        private void Update()
        {
            if (constrainToSpawnLane && laneConfigured)
            {
                Vector3 position = transform.position;
                position.y = Mathf.MoveTowards(position.y, laneY, laneVerticalCorrectionSpeed * Time.deltaTime);
                transform.position = position;
            }

            if (slowRemaining > 0f)
            {
                slowRemaining -= Time.deltaTime;
                if (slowRemaining <= 0f) slowMultiplier = 1f;
            }

            if (ownHealth == null || ownHealth.IsDead || target == null ||
                targetHealth == null || targetHealth.IsDead)
            {
                if (animationDriver != null) animationDriver.SetMoving(false);
                return;
            }

            currentFarmTarget = FindFarmTargetInReach();
            Health attackHealth = currentFarmTarget != null
                ? currentFarmTarget.Health
                : targetHealth;
            Transform attackTransform = currentFarmTarget != null
                ? currentFarmTarget.transform
                : target;

            float deltaX = attackTransform.position.x - transform.position.x;
            if (spriteRenderer != null && Mathf.Abs(deltaX) > 0.02f)
                spriteRenderer.flipX = deltaX < 0f;

            bool targetBlocks = currentFarmTarget == null ||
                currentFarmTarget.BlocksMonsterMovement;
            if (!targetBlocks || Mathf.Abs(deltaX) > attackRange)
            {
                if (animationDriver != null) animationDriver.SetMoving(true);
                transform.position += Vector3.right *
                    (Mathf.Sign(deltaX) * moveSpeed * slowMultiplier * Time.deltaTime);
                return;
            }

            if (animationDriver != null) animationDriver.SetMoving(false);
            attackTimer -= Time.deltaTime;
            if (attackTimer <= 0f)
            {
                if (attackHealth != null && !attackHealth.IsDead)
                    attackHealth.ApplyDamage(attackDamage);
                if (animationDriver != null) animationDriver.PlayAttack();
                attackTimer = attackInterval;
            }
        }
    }
}
