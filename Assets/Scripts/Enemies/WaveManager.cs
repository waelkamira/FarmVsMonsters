using System;
using System.Collections;
using System.Collections.Generic;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Economy;
using UnityEngine;

namespace FarmVsMonsters.Enemies
{
    /// <summary>Spawns configured waves and completes only after every spawned enemy dies.</summary>
    public sealed class WaveManager : MonoBehaviour
    {
        public enum SpawnSelectionMode
        {
            RoundRobin = 0,
            Random = 1
        }

        [Serializable]
        public sealed class EnemyGroup
        {
            public GameObject enemyPrefab;
            [Min(1)] public int count = 1;
        }

        [Serializable]
        public sealed class Wave
        {
            public string displayName = "Wave";
            [Tooltip("Legacy list: each non-null prefab is spawned once. Enemy Groups can be used for larger compositions.")]
            public GameObject[] enemyPrefabs;
            public EnemyGroup[] enemyGroups;
            [Min(0f)] public float spawnInterval = 1f;
            [Min(0f)] public float interWaveDelay = 2f;
            [Min(0)] public int energyRewardOnClear = 0;
            [Min(0.1f)] public float enemyHealthMultiplier = 1f;
            [Min(0.1f)] public float enemySpeedMultiplier = 1f;
            [Min(0.1f)] public float enemyDamageMultiplier = 1f;
        }

        [SerializeField] private Wave[] waves;
        [SerializeField] private Transform[] spawnPoints;
        [SerializeField] private SpawnSelectionMode spawnSelectionMode = SpawnSelectionMode.RoundRobin;
        [SerializeField] private Transform enemyTarget;
        [SerializeField] private Health enemyTargetHealth;
        [SerializeField] private EnergyWallet energyWallet;
        [SerializeField, Min(0f)] private float initialStartDelay = 4f;

        private readonly HashSet<Health> livingEnemies = new HashSet<Health>();
        private readonly Dictionary<Health, Action> deathHandlers = new Dictionary<Health, Action>();
        private Coroutine routine;
        private int nextSpawnPoint;
        private int previousRandomSpawnPoint = -1;
        private bool startRequested;
        private float startDelayRemaining;

        public int CurrentWave { get; private set; }
        public int TotalWaves => waves != null ? waves.Length : 0;
        public string CurrentWaveName { get; private set; } = string.Empty;
        public int LivingEnemyCount => livingEnemies.Count;
        public bool IsRunning { get; private set; }
        public float StartDelayRemaining => startDelayRemaining;

        public event Action<int> WaveStarted;
        public event Action<int> WaveCleared;
        public event Action AllWavesCleared;

        public void ConfigureTarget(Transform target, Health health)
        {
            enemyTarget = target;
            enemyTargetHealth = health;
        }

        public void ConfigureEnergyWallet(EnergyWallet wallet)
        {
            energyWallet = wallet;
        }

        public void Begin()
        {
            if (IsRunning || startRequested)
                return;
            if (waves == null || waves.Length == 0 || spawnPoints == null || spawnPoints.Length == 0)
            {
                Debug.LogWarning("WaveManager cannot begin: configure at least one wave and one spawn point.", this);
                return;
            }

            startRequested = true;
            routine = StartCoroutine(RunWaves());
        }

        private IEnumerator RunWaves()
        {
            IsRunning = true;
            startDelayRemaining = Mathf.Max(0f, initialStartDelay);
            while (startDelayRemaining > 0f)
            {
                startDelayRemaining = Mathf.Max(0f, startDelayRemaining - Time.deltaTime);
                yield return null;
            }

            for (int waveIndex = 0; waveIndex < waves.Length; waveIndex++)
            {
                CurrentWave = waveIndex + 1;
                Wave wave = waves[waveIndex];
                CurrentWaveName = wave != null && !string.IsNullOrWhiteSpace(wave.displayName)
                    ? wave.displayName
                    : "Wave " + CurrentWave;
                WaveStarted?.Invoke(CurrentWave);

                List<GameObject> composition = BuildComposition(wave);
                foreach (GameObject prefab in composition)
                {
                    if (prefab == null)
                        continue;

                    Transform spawn = GetNextSpawnPoint();
                    if (spawn == null)
                        continue;
                        GameObject instance = Instantiate(prefab, spawn.position, spawn.rotation);

                        Health health = instance.GetComponent<Health>();
                        if (health != null && wave != null)
                            health.ApplyMaxHealthMultiplier(wave.enemyHealthMultiplier);

                        EnergyDropOnDeath energyDrop = instance.GetComponent<EnergyDropOnDeath>();
                        if (energyDrop != null)
                            energyDrop.SetWallet(energyWallet);

                        EnemyMovement movement = instance.GetComponent<EnemyMovement>();
                        if (movement != null && enemyTarget != null && enemyTargetHealth != null)
                            movement.SetTarget(enemyTarget, enemyTargetHealth);

                        // The same wave scheduler supports the approved 2D side-view combat.
                        EnemyMovement2D movement2D = instance.GetComponent<EnemyMovement2D>();
                        if (movement2D != null)
                        {
                            movement2D.SetLane(spawn.position.y);
                            if (wave != null)
                                movement2D.ApplyDifficulty(wave.enemySpeedMultiplier, wave.enemyDamageMultiplier);
                            if (enemyTarget != null && enemyTargetHealth != null)
                                movement2D.SetTarget(enemyTarget, enemyTargetHealth);
                        }

                        if (health != null && !health.IsDead)
                        {
                            livingEnemies.Add(health);
                            Action handler = () => HandleEnemyDied(health);
                            deathHandlers[health] = handler;
                            health.Died += handler;
                        }

                    if (wave.spawnInterval > 0f)
                        yield return new WaitForSeconds(wave.spawnInterval);
                }

                while (livingEnemies.Count > 0)
                {
                    RemoveDestroyedEnemies();
                    if (livingEnemies.Count > 0)
                        yield return null;
                }

                if (wave != null && energyWallet != null && wave.energyRewardOnClear > 0)
                    energyWallet.Add(wave.energyRewardOnClear);

                WaveCleared?.Invoke(CurrentWave);
                if (wave != null && wave.interWaveDelay > 0f && waveIndex < waves.Length - 1)
                    yield return new WaitForSeconds(wave.interWaveDelay);
            }

            IsRunning = false;
            startRequested = false;
            startDelayRemaining = 0f;
            routine = null;
            AllWavesCleared?.Invoke();
        }

        private List<GameObject> BuildComposition(Wave wave)
        {
            var result = new List<GameObject>();
            if (wave == null)
                return result;

            if (wave.enemyPrefabs != null)
            {
                foreach (GameObject prefab in wave.enemyPrefabs)
                    if (prefab != null) result.Add(prefab);
            }

            if (wave.enemyGroups != null)
            {
                foreach (EnemyGroup group in wave.enemyGroups)
                {
                    if (group == null || group.enemyPrefab == null)
                        continue;

                    int count = Mathf.Clamp(group.count, 1, 500);
                    for (int i = 0; i < count; i++)
                        result.Add(group.enemyPrefab);
                }
            }

            return result;
        }

        private Transform GetNextSpawnPoint()
        {
            if (spawnPoints == null || spawnPoints.Length == 0)
                return null;

            if (spawnSelectionMode == SpawnSelectionMode.RoundRobin || spawnPoints.Length == 1)
            {
                Transform selected = spawnPoints[nextSpawnPoint % spawnPoints.Length];
                nextSpawnPoint++;
                return selected;
            }

            int index = UnityEngine.Random.Range(0, spawnPoints.Length);
            if (spawnPoints.Length > 1 && index == previousRandomSpawnPoint)
                index = (index + UnityEngine.Random.Range(1, spawnPoints.Length)) % spawnPoints.Length;
            previousRandomSpawnPoint = index;
            return spawnPoints[index];
        }

        private void RemoveDestroyedEnemies()
        {
            List<Health> missing = null;
            foreach (Health enemy in livingEnemies)
            {
                if (enemy != null)
                    continue;

                if (missing == null)
                    missing = new List<Health>();
                missing.Add(enemy);
            }

            if (missing == null)
                return;

            foreach (Health enemy in missing)
            {
                livingEnemies.Remove(enemy);
                deathHandlers.Remove(enemy);
            }
        }

        private void HandleEnemyDied(Health enemy)
        {
            if (enemy == null)
                return;

            if (deathHandlers.TryGetValue(enemy, out Action handler))
            {
                enemy.Died -= handler;
                deathHandlers.Remove(enemy);
            }

            livingEnemies.Remove(enemy);
        }

        private void OnDisable()
        {
            if (routine != null)
            {
                StopCoroutine(routine);
                routine = null;
            }
            IsRunning = false;
            startRequested = false;
            startDelayRemaining = 0f;
            foreach (KeyValuePair<Health, Action> pair in deathHandlers)
                if (pair.Key != null) pair.Key.Died -= pair.Value;
            deathHandlers.Clear();
            livingEnemies.Clear();
        }

        private void OnDestroy()
        {
            foreach (KeyValuePair<Health, Action> pair in deathHandlers)
            {
                if (pair.Key != null)
                    pair.Key.Died -= pair.Value;
            }

            deathHandlers.Clear();
            livingEnemies.Clear();
        }
    }
}
