using System;
using System.Collections.Generic;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Farm;
using UnityEngine;

namespace FarmVsMonsters.Enemies
{
    /// <summary>
    /// Optional boss brain: changes combat stats at health thresholds, performs lane-aware
    /// ground pulses, and summons minions that remain part of the active wave.
    /// </summary>
    [RequireComponent(typeof(Health))]
    [RequireComponent(typeof(EnemyMovement2D))]
    public sealed class BossPhaseController2D : MonoBehaviour
    {
        [Header("Phase thresholds (health fraction)")]
        [SerializeField, Range(0.1f, 0.9f)] private float phaseTwoAt = 0.66f;
        [SerializeField, Range(0.05f, 0.8f)] private float phaseThreeAt = 0.33f;
        [SerializeField, Min(0.1f)] private float phaseTwoSpeedMultiplier = 1.15f;
        [SerializeField, Min(0.1f)] private float phaseTwoDamageMultiplier = 1.25f;
        [SerializeField, Min(0.1f)] private float phaseThreeSpeedMultiplier = 1.35f;
        [SerializeField, Min(0.1f)] private float phaseThreeDamageMultiplier = 1.6f;

        [Header("Ground pulse special attack")]
        [SerializeField] private bool enableGroundPulse = true;
        [SerializeField, Min(0.1f)] private float pulseRadius = 2.2f;
        [SerializeField, Min(0f)] private float pulseBaseDamage = 12f;
        [SerializeField, Min(0.1f)] private float phaseOnePulseInterval = 7f;
        [SerializeField, Min(0.1f)] private float phaseTwoPulseInterval = 5f;
        [SerializeField, Min(0.1f)] private float phaseThreePulseInterval = 3.5f;
        [SerializeField] private LayerMask farmTargetLayers = ~0;

        [Header("Minion summoning")]
        [SerializeField] private bool enableSummoning = true;
        [SerializeField] private GameObject[] minionPrefabs;
        [SerializeField, Min(0.1f)] private float phaseOneSummonInterval = 14f;
        [SerializeField, Min(0.1f)] private float phaseTwoSummonInterval = 10f;
        [SerializeField, Min(0.1f)] private float phaseThreeSummonInterval = 7f;
        [SerializeField, Min(1)] private int minionsPerSummon = 1;
        [SerializeField, Min(0f)] private float summonHorizontalSpacing = 0.45f;
        [SerializeField] private WaveManager waveManager;
        [SerializeField] private Transform protectedTarget;
        [SerializeField] private Health protectedTargetHealth;

        private Health bossHealth;
        private EnemyMovement2D movement;
        private Collider2D[] targetBuffer = new Collider2D[32];
        private readonly HashSet<FarmDefenseTarget2D> damagedTargets = new HashSet<FarmDefenseTarget2D>();
        private float pulseTimer;
        private float summonTimer;
        private int currentPhase;

        public int CurrentPhase => currentPhase;
        public event Action<int> PhaseChanged;
        public event Action GroundPulseTriggered;
        public event Action<int> MinionsSummoned;

        private void Awake()
        {
            bossHealth = GetComponent<Health>();
            movement = GetComponent<EnemyMovement2D>();
        }

        private void Start()
        {
            if (bossHealth == null || movement == null)
                return;

            bossHealth.HealthChanged += HandleHealthChanged;
            UpdatePhase(true);
            pulseTimer = GetPulseInterval();
            summonTimer = GetSummonInterval();
        }

        private void Update()
        {
            if (bossHealth == null || bossHealth.IsDead)
                return;

            if (enableGroundPulse)
            {
                pulseTimer -= Time.deltaTime;
                if (pulseTimer <= 0f)
                {
                    TriggerGroundPulse();
                    pulseTimer = GetPulseInterval();
                }
            }

            if (enableSummoning && minionPrefabs != null && minionPrefabs.Length > 0)
            {
                summonTimer -= Time.deltaTime;
                if (summonTimer <= 0f)
                {
                    SummonMinions();
                    summonTimer = GetSummonInterval();
                }
            }
        }

        private void HandleHealthChanged(float current, float maximum)
        {
            UpdatePhase(false);
        }

        private void UpdatePhase(bool force)
        {
            if (bossHealth == null || bossHealth.MaxHealth <= 0f)
                return;

            float healthFraction = bossHealth.CurrentHealth / bossHealth.MaxHealth;
            int nextPhase = healthFraction <= phaseThreeAt ? 3 :
                healthFraction <= phaseTwoAt ? 2 : 1;

            if (!force && nextPhase <= currentPhase)
                return;

            currentPhase = nextPhase;
            if (currentPhase == 1)
                movement.SetBossPhaseMultipliers(1f, 1f);
            else if (currentPhase == 2)
                movement.SetBossPhaseMultipliers(phaseTwoSpeedMultiplier, phaseTwoDamageMultiplier);
            else
                movement.SetBossPhaseMultipliers(phaseThreeSpeedMultiplier, phaseThreeDamageMultiplier);

            pulseTimer = Mathf.Min(pulseTimer, GetPulseInterval());
            summonTimer = Mathf.Min(summonTimer, GetSummonInterval());
            PhaseChanged?.Invoke(currentPhase);
        }

        private void TriggerGroundPulse()
        {
            int count = Physics2D.OverlapCircleNonAlloc(
                transform.position, pulseRadius, targetBuffer, farmTargetLayers);
            damagedTargets.Clear();

            for (int i = 0; i < count; i++)
            {
                Collider2D hit = targetBuffer[i];
                if (hit == null)
                    continue;

                FarmDefenseTarget2D farmTarget = hit.GetComponentInParent<FarmDefenseTarget2D>();
                if (farmTarget == null || !farmTarget.isActiveAndEnabled ||
                    farmTarget.Health == null || farmTarget.Health.IsDead ||
                    !farmTarget.CanBeTargetedFromLane(movement.LaneWorldY) ||
                    !damagedTargets.Add(farmTarget))
                    continue;

                float phaseDamage = currentPhase == 3 ? 1.75f :
                    currentPhase == 2 ? 1.35f : 1f;
                farmTarget.Health.ApplyDamage(pulseBaseDamage * phaseDamage);
            }

            GroundPulseTriggered?.Invoke();
        }

        private void SummonMinions()
        {
            int spawned = 0;
            for (int i = 0; i < Mathf.Max(1, minionsPerSummon); i++)
            {
                GameObject prefab = minionPrefabs[UnityEngine.Random.Range(0, minionPrefabs.Length)];
                if (prefab == null)
                    continue;

                float side = i % 2 == 0 ? -1f : 1f;
                Vector3 spawnPosition = transform.position +
                    new Vector3(side * summonHorizontalSpacing * (1 + i / 2), 0f, 0f);
                GameObject minion = Instantiate(prefab, spawnPosition, transform.rotation);
                Health minionHealth = minion.GetComponent<Health>();
                if (minionHealth == null)
                {
                    Debug.LogError("Boss minion prefab is missing Health: " + prefab.name, prefab);
                    Destroy(minion);
                    continue;
                }

                EnemyMovement2D minionMovement = minion.GetComponent<EnemyMovement2D>();
                if (minionMovement != null)
                {
                    minionMovement.SetLane(movement.LaneWorldY);
                    if (protectedTarget != null && protectedTargetHealth != null)
                        minionMovement.SetTarget(protectedTarget, protectedTargetHealth);
                }

                if (waveManager != null)
                    waveManager.RegisterSpawnedEnemy(minionHealth);
                spawned++;
            }

            if (spawned > 0)
                MinionsSummoned?.Invoke(spawned);
        }

        private float GetPulseInterval()
        {
            if (currentPhase >= 3) return phaseThreePulseInterval;
            if (currentPhase == 2) return phaseTwoPulseInterval;
            return phaseOnePulseInterval;
        }

        private float GetSummonInterval()
        {
            if (currentPhase >= 3) return phaseThreeSummonInterval;
            if (currentPhase == 2) return phaseTwoSummonInterval;
            return phaseOneSummonInterval;
        }

        private void OnValidate()
        {
            phaseThreeAt = Mathf.Min(phaseThreeAt, phaseTwoAt - 0.01f);
            phaseThreeAt = Mathf.Clamp(phaseThreeAt, 0.05f, 0.8f);
            phaseTwoAt = Mathf.Clamp(phaseTwoAt, phaseThreeAt + 0.01f, 0.9f);
            pulseRadius = Mathf.Max(0.1f, pulseRadius);
            pulseBaseDamage = Mathf.Max(0f, pulseBaseDamage);
            phaseOnePulseInterval = Mathf.Max(0.1f, phaseOnePulseInterval);
            phaseTwoPulseInterval = Mathf.Max(0.1f, phaseTwoPulseInterval);
            phaseThreePulseInterval = Mathf.Max(0.1f, phaseThreePulseInterval);
            phaseOneSummonInterval = Mathf.Max(0.1f, phaseOneSummonInterval);
            phaseTwoSummonInterval = Mathf.Max(0.1f, phaseTwoSummonInterval);
            phaseThreeSummonInterval = Mathf.Max(0.1f, phaseThreeSummonInterval);
            minionsPerSummon = Mathf.Max(1, minionsPerSummon);
        }

        private void OnDestroy()
        {
            if (bossHealth != null)
                bossHealth.HealthChanged -= HandleHealthChanged;
        }
    }
}
