using System;
using System.Collections;
using System.Collections.Generic;
using FarmVsMonsters.Combat;
using UnityEngine;

namespace FarmVsMonsters.Enemies
{
    /// <summary>Spawns configured waves and completes only after every spawned enemy dies.</summary>
    public sealed class WaveManager : MonoBehaviour
    {
        [Serializable]
        public sealed class Wave
        {
            public string displayName = "Wave";
            public GameObject[] enemyPrefabs;
            [Min(0f)] public float spawnInterval = 1f;
        }

        [SerializeField] private Wave[] waves;
        [SerializeField] private Transform[] spawnPoints;
        [SerializeField] private Transform enemyTarget;
        [SerializeField] private Health enemyTargetHealth;

        private readonly HashSet<Health> livingEnemies = new HashSet<Health>();
        private readonly Dictionary<Health, Action> deathHandlers = new Dictionary<Health, Action>();
        private Coroutine routine;
        private int nextSpawnPoint;

        public int CurrentWave { get; private set; }
        public int LivingEnemyCount => livingEnemies.Count;
        public bool IsRunning { get; private set; }

        public event Action<int> WaveStarted;
        public event Action<int> WaveCleared;
        public event Action AllWavesCleared;

        public void ConfigureTarget(Transform target, Health health)
        {
            enemyTarget = target;
            enemyTargetHealth = health;
        }

        public void Begin()
        {
            if (IsRunning || waves == null || waves.Length == 0 || spawnPoints == null || spawnPoints.Length == 0)
                return;

            routine = StartCoroutine(RunWaves());
        }

        private IEnumerator RunWaves()
        {
            IsRunning = true;

            for (int waveIndex = 0; waveIndex < waves.Length; waveIndex++)
            {
                CurrentWave = waveIndex + 1;
                Wave wave = waves[waveIndex];
                WaveStarted?.Invoke(CurrentWave);

                if (wave != null && wave.enemyPrefabs != null)
                {
                    foreach (GameObject prefab in wave.enemyPrefabs)
                    {
                        if (prefab == null)
                            continue;

                        Transform spawn = spawnPoints[nextSpawnPoint % spawnPoints.Length];
                        nextSpawnPoint++;
                        GameObject instance = Instantiate(prefab, spawn.position, spawn.rotation);

                        EnemyMovement movement = instance.GetComponent<EnemyMovement>();
                        if (movement != null && enemyTarget != null && enemyTargetHealth != null)
                            movement.SetTarget(enemyTarget, enemyTargetHealth);

                        Health health = instance.GetComponent<Health>();
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
                }

                while (livingEnemies.Count > 0)
                {
                    RemoveDestroyedEnemies();
                    if (livingEnemies.Count > 0)
                        yield return null;
                }

                WaveCleared?.Invoke(CurrentWave);
            }

            IsRunning = false;
            routine = null;
            AllWavesCleared?.Invoke();
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
