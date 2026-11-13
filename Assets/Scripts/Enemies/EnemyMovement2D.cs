using FarmVsMonsters.Combat;
using FarmVsMonsters.Farm;
using FarmVsMonsters.Visuals;
using UnityEngine;

namespace FarmVsMonsters.Enemies
{
    /// <summary>Side-view lane movement and attacks for advancing farm monsters.</summary>
    [RequireComponent(typeof(Health))]
    public sealed class EnemyMovement2D : MonoBehaviour
    {
        public enum Archetype { Normal = 0, Armored = 1, Ranged = 2, Brute = 3, Jumper = 4 }

        [Header("Fallback destination")]
        [SerializeField] private Transform target;
        [SerializeField] private Health targetHealth;

        [Header("Archetype")]
        [SerializeField] private Archetype archetype = Archetype.Normal;
        [SerializeField, Range(0.1f, 1f)] private float armoredDamageTakenMultiplier = 0.45f;
        [SerializeField, Min(0.1f)] private float rangedAttackRange = 3.5f;
        [SerializeField] private EnemyProjectile2D rangedProjectilePrefab;
        [SerializeField, Min(0.1f)] private float rangedProjectileSpeed = 5f;
        [SerializeField, Min(0f)] private float bruteDamageMultiplier = 2f;
        [SerializeField, Range(0.1f, 1f)] private float bruteSpeedMultiplier = 0.65f;
        [SerializeField] private bool jumperCanSkipPlants = true;
        [SerializeField, Min(0.1f)] private float jumpTriggerDistance = 1.5f;
        [SerializeField, Min(0.2f)] private float jumpDistance = 2.2f;
        [SerializeField, Min(0f)] private float jumpHeight = 1.1f;
        [SerializeField, Min(0.1f)] private float jumpDuration = 0.65f;

        [Header("Movement and attack")]
        [SerializeField, Min(0f)] private float moveSpeed = 0.8f;
        [SerializeField, Min(0.05f)] private float attackRange = 0.65f;
        [SerializeField, Min(0f)] private float attackDamage = 8f;
        [SerializeField, Min(0.1f)] private float attackInterval = 1.2f;

        [Header("Farm target detection")]
        [SerializeField, Min(0.1f)] private float targetScanRadius = 1.8f;
        [SerializeField, Min(1)] private int maxFarmTargetsPerScan = 24;
        [SerializeField] private LayerMask farmTargetLayers = ~0;

        [Header("Environment (optional)")]
        [SerializeField] private FarmEnvironmentCycle2D environmentCycle;

        [Header("Lane and visuals")]
        [SerializeField] private SpriteRenderer spriteRenderer;
        [SerializeField] private bool constrainToSpawnLane = true;
        [SerializeField, Min(0f)] private float laneVerticalCorrectionSpeed = 20f;

        private Health ownHealth;
        private CharacterAnimationDriver2D animationDriver;
        private Collider2D[] farmTargetResults;
        private float attackTimer;
        private float slowMultiplier = 1f;
        private float slowRemaining;
        private float baseMoveSpeed;
        private float baseAttackDamage;
        private float laneY;
        private bool laneConfigured;
        private FarmDefenseTarget2D ignoredJumpTarget;
        private float jumpElapsed;
        private float jumpStartX;
        private float jumpEndX;
        private bool isJumping;
        private float difficultySpeedMultiplier = 1f;
        private float difficultyDamageMultiplier = 1f;
        private float bossSpeedMultiplier = 1f;
        private float bossDamageMultiplier = 1f;

        public float LaneWorldY => laneY;

        private void Awake()
        {
            ownHealth = GetComponent<Health>();
            baseMoveSpeed = moveSpeed;
            baseAttackDamage = attackDamage;
            if (archetype == Archetype.Armored && ownHealth != null)
                ownHealth.SetDamageTakenMultiplier(armoredDamageTakenMultiplier);
            if (archetype == Archetype.Brute)
            {
                moveSpeed *= bruteSpeedMultiplier;
                attackDamage *= bruteDamageMultiplier;
                baseMoveSpeed = moveSpeed;
                baseAttackDamage = attackDamage;
            }
            laneY = transform.position.y;
            laneConfigured = true;
            animationDriver = GetComponent<CharacterAnimationDriver2D>();
            if (spriteRenderer == null)
                spriteRenderer = GetComponentInChildren<SpriteRenderer>();
            farmTargetResults = new Collider2D[Mathf.Max(1, maxFarmTargetsPerScan)];
        }

        public void ApplyDifficulty(float speedMultiplier, float damageMultiplier)
        {
            difficultySpeedMultiplier = Mathf.Clamp(speedMultiplier, 0.1f, 5f);
            difficultyDamageMultiplier = Mathf.Clamp(damageMultiplier, 0.1f, 10f);
            RecalculateCombatStats();
        }

        public void SetBossPhaseMultipliers(float speedMultiplier, float damageMultiplier)
        {
            bossSpeedMultiplier = Mathf.Clamp(speedMultiplier, 0.1f, 5f);
            bossDamageMultiplier = Mathf.Clamp(damageMultiplier, 0.1f, 10f);
            RecalculateCombatStats();
        }

        private void RecalculateCombatStats()
        {
            moveSpeed = baseMoveSpeed * difficultySpeedMultiplier * bossSpeedMultiplier;
            attackDamage = baseAttackDamage * difficultyDamageMultiplier * bossDamageMultiplier;
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
            if (duration <= 0f || multiplier >= 1f)
                return;

            slowMultiplier = Mathf.Min(slowMultiplier, Mathf.Clamp(multiplier, 0.1f, 1f));
            slowRemaining = Mathf.Max(slowRemaining, duration);
        }

        private void Update()
        {
            if (isJumping)
            {
                UpdateJump();
                return;
            }

            if (constrainToSpawnLane && laneConfigured)
            {
                Vector3 position = transform.position;
                position.y = Mathf.MoveTowards(
                    position.y, laneY, laneVerticalCorrectionSpeed * Time.deltaTime);
                transform.position = position;
            }

            if (slowRemaining > 0f)
            {
                slowRemaining -= Time.deltaTime;
                if (slowRemaining <= 0f)
                    slowMultiplier = 1f;
            }

            if (ownHealth == null || ownHealth.IsDead || target == null ||
                targetHealth == null || targetHealth.IsDead)
            {
                if (animationDriver != null)
                    animationDriver.SetMoving(false);
                return;
            }

            FarmDefenseTarget2D farmTarget = FindFarmTargetInReach();
            if (archetype == Archetype.Jumper && jumperCanSkipPlants && farmTarget != null &&
                farmTarget.Kind == FarmDefenseTarget2D.TargetKind.Plant &&
                Mathf.Abs(farmTarget.transform.position.x - transform.position.x) <= jumpTriggerDistance)
            {
                BeginJump(farmTarget);
                return;
            }

            Transform destination = farmTarget != null ? farmTarget.transform : target;
            Health destinationHealth = farmTarget != null ? farmTarget.Health : targetHealth;

            float deltaX = destination.position.x - transform.position.x;
            float effectiveAttackRange = archetype == Archetype.Ranged
                ? Mathf.Max(attackRange, rangedAttackRange) : attackRange;
            if (spriteRenderer != null && Mathf.Abs(deltaX) > 0.02f)
                spriteRenderer.flipX = deltaX < 0f;

            if (Mathf.Abs(deltaX) > effectiveAttackRange)
            {
                if (animationDriver != null)
                    animationDriver.SetMoving(true);

                transform.position += Vector3.right *
                    (Mathf.Sign(deltaX) * moveSpeed * slowMultiplier *
                     (environmentCycle != null ? environmentCycle.MonsterSpeedMultiplier : 1f) * Time.deltaTime);
                return;
            }

            if (animationDriver != null)
                animationDriver.SetMoving(false);

            attackTimer -= Time.deltaTime;
            if (attackTimer <= 0f)
            {
                if (destinationHealth != null && !destinationHealth.IsDead)
                {
                    if (archetype == Archetype.Ranged && rangedProjectilePrefab != null)
                    {
                        EnemyProjectile2D shot = Instantiate(
                            rangedProjectilePrefab, transform.position, Quaternion.identity);
                        shot.Initialize(destinationHealth, attackDamage, rangedProjectileSpeed);
                    }
                    else
                        destinationHealth.ApplyDamage(attackDamage);
                }

                if (animationDriver != null)
                {
                    if (farmTarget != null &&
                        (farmTarget.Kind == FarmDefenseTarget2D.TargetKind.Crop ||
                         farmTarget.Kind == FarmDefenseTarget2D.TargetKind.Plant ||
                         farmTarget.Kind == FarmDefenseTarget2D.TargetKind.Animal))
                        animationDriver.PlayEat();
                    else
                        animationDriver.PlayAttack();
                }

                attackTimer = attackInterval;
            }
        }

        private void BeginJump(FarmDefenseTarget2D plant)
        {
            ignoredJumpTarget = plant;
            jumpElapsed = 0f;
            jumpStartX = transform.position.x;
            float direction = target != null
                ? Mathf.Sign(target.position.x - transform.position.x) : -1f;
            if (Mathf.Approximately(direction, 0f)) direction = -1f;
            jumpEndX = jumpStartX + direction * jumpDistance;
            isJumping = true;
            if (spriteRenderer != null) spriteRenderer.flipX = direction < 0f;
            if (animationDriver != null) animationDriver.PlayAttack();
        }

        private void UpdateJump()
        {
            jumpElapsed += Time.deltaTime;
            float progress = Mathf.Clamp01(jumpElapsed / jumpDuration);
            Vector3 position = transform.position;
            position.x = Mathf.Lerp(jumpStartX, jumpEndX, progress);
            position.y = laneY + Mathf.Sin(progress * Mathf.PI) * jumpHeight;
            transform.position = position;

            if (progress >= 1f)
            {
                isJumping = false;
                position.y = laneY;
                transform.position = position;
            }
        }

        private void OnValidate()
        {
            armoredDamageTakenMultiplier = Mathf.Clamp(armoredDamageTakenMultiplier, 0.1f, 1f);
            rangedAttackRange = Mathf.Max(attackRange, rangedAttackRange);
            rangedProjectileSpeed = Mathf.Max(0.1f, rangedProjectileSpeed);
            bruteDamageMultiplier = Mathf.Max(0f, bruteDamageMultiplier);
            bruteSpeedMultiplier = Mathf.Clamp(bruteSpeedMultiplier, 0.1f, 1f);
            jumpTriggerDistance = Mathf.Max(0.1f, jumpTriggerDistance);
            jumpDistance = Mathf.Max(0.2f, jumpDistance);
            jumpHeight = Mathf.Max(0f, jumpHeight);
            jumpDuration = Mathf.Max(0.1f, jumpDuration);
        }

        private FarmDefenseTarget2D FindFarmTargetInReach()
        {
            Vector2 center = transform.position;
            int count = Physics2D.OverlapCircleNonAlloc(
                center, targetScanRadius, farmTargetResults, farmTargetLayers);

            float travelDirection = target != null
                ? Mathf.Sign(target.position.x - transform.position.x)
                : -1f;

            FarmDefenseTarget2D best = null;
            int bestPriority = int.MinValue;
            float bestDistance = float.MaxValue;

            for (int i = 0; i < count; i++)
            {
                Collider2D candidate = farmTargetResults[i];
                if (candidate == null)
                    continue;

                FarmDefenseTarget2D farmTarget =
                    candidate.GetComponentInParent<FarmDefenseTarget2D>();

                if (farmTarget == ignoredJumpTarget || farmTarget == null || !farmTarget.isActiveAndEnabled ||
                    farmTarget.Health == null || farmTarget.Health.IsDead ||
                    !farmTarget.BlocksMonsterMovement ||
                    !farmTarget.CanBeTargetedFromLane(laneY))
                    continue;

                Vector2 offset = (Vector2)farmTarget.transform.position - center;
                if (Mathf.Abs(offset.x) > 0.05f &&
                    Mathf.Sign(offset.x) != travelDirection)
                    continue;

                float distance = offset.sqrMagnitude;
                if (farmTarget.MonsterPriority > bestPriority ||
                    (farmTarget.MonsterPriority == bestPriority && distance < bestDistance))
                {
                    best = farmTarget;
                    bestPriority = farmTarget.MonsterPriority;
                    bestDistance = distance;
                }
            }

            return best;
        }
    }
}