using System;
using System.Collections.Generic;
using FarmVsMonsters.Progression;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Runs one persistent, offline-progressing production job per configured station.</summary>
    public sealed class FarmProductionService : MonoBehaviour
    {
        private const string SaveKey = "farm_vs_monsters.production_jobs.v1";

        [Serializable]
        private sealed class JobSave
        {
            public string stationId;
            public string recipeId;
            public long startedAtUtcTicks;
        }

        [Serializable]
        private sealed class SaveData
        {
            public int version = 1;
            public JobSave[] jobs = Array.Empty<JobSave>();
        }

        [SerializeField] private FarmProductionStation[] stations;
        [SerializeField] private FarmProductionRecipe[] recipes;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private readonly Dictionary<string, JobSave> activeJobs =
            new Dictionary<string, JobSave>(StringComparer.Ordinal);

        public event Action<FarmProductionStation, FarmProductionRecipe> JobStarted;
        public event Action<FarmProductionStation, FarmProductionRecipe> JobClaimed;
        public event Action<FarmProductionStation, FarmProductionRecipe> JobRejected;

        private void Awake() { Load(); }

        public FarmProductionRecipe[] GetAvailableRecipes(FarmProductionStation station)
        {
            if (station == null || recipes == null) return Array.Empty<FarmProductionRecipe>();
            var result = new List<FarmProductionRecipe>();
            foreach (FarmProductionRecipe recipe in recipes)
                if (recipe != null && recipe.HasValidConfiguration() &&
                    ProgressSaveService.IsStageUnlocked(recipe.RequiredStage))
                    result.Add(recipe);
            return result.ToArray();
        }

        public bool HasActiveJob(FarmProductionStation station)
        {
            return station != null && !string.IsNullOrWhiteSpace(station.StationId) &&
                   activeJobs.ContainsKey(station.StationId);
        }

        public float GetJobProgress(FarmProductionStation station)
        {
            if (!TryGetJob(station, out JobSave job, out FarmProductionRecipe recipe)) return 0f;
            double elapsed = Math.Max(0d,
                (DateTime.UtcNow.Ticks - job.startedAtUtcTicks) / (double)TimeSpan.TicksPerSecond);
            return Mathf.Clamp01((float)(elapsed / recipe.DurationSeconds));
        }

        public bool CanStart(FarmProductionStation station, FarmProductionRecipe recipe)
        {
            if (station == null || string.IsNullOrWhiteSpace(station.StationId) ||
                recipe == null || !recipe.HasValidConfiguration() || resourceWallet == null ||
                HasActiveJob(station) || !ProgressSaveService.IsStageUnlocked(recipe.RequiredStage) ||
                !ContainsRecipe(recipe.RecipeId))
                return false;

            for (int i = 0; i < recipe.InputResources.Length; i++)
            {
                FarmResourceType resource = recipe.InputResources[i];
                bool alreadyChecked = false;
                for (int previous = 0; previous < i; previous++)
                    if (recipe.InputResources[previous] == resource)
                    {
                        alreadyChecked = true;
                        break;
                    }
                if (alreadyChecked) continue;

                long required = 0;
                for (int j = i; j < recipe.InputResources.Length; j++)
                    if (recipe.InputResources[j] == resource)
                        required += recipe.InputAmounts[j];

                if (required > int.MaxValue || resourceWallet.GetAmount(resource) < required)
                    return false;
            }

            return true;
        }

        public bool TryStart(FarmProductionStation station, FarmProductionRecipe recipe)
        {
            if (!CanStart(station, recipe))
            {
                JobRejected?.Invoke(station, recipe);
                return false;
            }

            // Aggregate repeated resource entries so a recipe cannot partially consume duplicate inputs.
            for (int i = 0; i < recipe.InputResources.Length; i++)
            {
                FarmResourceType resource = recipe.InputResources[i];
                bool alreadySpent = false;
                for (int previous = 0; previous < i; previous++)
                    if (recipe.InputResources[previous] == resource)
                    {
                        alreadySpent = true;
                        break;
                    }
                if (alreadySpent) continue;

                int total = 0;
                for (int j = i; j < recipe.InputResources.Length; j++)
                    if (recipe.InputResources[j] == resource)
                        total = checked(total + recipe.InputAmounts[j]);

                if (!resourceWallet.TrySpend(resource, total))
                {
                    Debug.LogError("Production input validation changed before consumption; no job was started.");
                    JobRejected?.Invoke(station, recipe);
                    return false;
                }
            }

            activeJobs.Add(station.StationId, new JobSave
            {
                stationId = station.StationId,
                recipeId = recipe.RecipeId,
                startedAtUtcTicks = DateTime.UtcNow.Ticks
            });
            Save();
            JobStarted?.Invoke(station, recipe);
            return true;
        }

        public bool CanClaim(FarmProductionStation station)
        {
            if (!TryGetJob(station, out _, out FarmProductionRecipe recipe) ||
                GetJobProgress(station) < 1f || resourceWallet == null)
                return false;

            return resourceWallet.CanAdd(recipe.OutputResource, recipe.OutputAmount);
        }

        public bool TryClaim(FarmProductionStation station)
        {
            if (!CanClaim(station) ||
                !TryGetJob(station, out JobSave job, out FarmProductionRecipe recipe))
                return false;

            int accepted = resourceWallet.Add(recipe.OutputResource, recipe.OutputAmount);
            if (accepted != recipe.OutputAmount)
            {
                if (accepted > 0)
                    resourceWallet.TrySpend(recipe.OutputResource, accepted);
                return false;
            }

            activeJobs.Remove(job.stationId);
            Save();
            JobClaimed?.Invoke(station, recipe);
            return true;
        }

        private bool TryGetJob(FarmProductionStation station, out JobSave job,
            out FarmProductionRecipe recipe)
        {
            job = null;
            recipe = null;
            if (station == null || string.IsNullOrWhiteSpace(station.StationId) ||
                !activeJobs.TryGetValue(station.StationId, out job))
                return false;

            recipe = FindRecipe(job.recipeId);
            return recipe != null && recipe.HasValidConfiguration();
        }

        private bool ContainsRecipe(string id) => FindRecipe(id) != null;

        private FarmProductionRecipe FindRecipe(string id)
        {
            if (recipes == null) return null;
            foreach (FarmProductionRecipe recipe in recipes)
                if (recipe != null && string.Equals(recipe.RecipeId, id, StringComparison.Ordinal))
                    return recipe;
            return null;
        }

        private void Load()
        {
            activeJobs.Clear();
            if (!PlayerPrefs.HasKey(SaveKey)) return;
            try
            {
                SaveData data = JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(SaveKey, string.Empty));
                if (data == null || data.version != 1 || data.jobs == null) return;
                foreach (JobSave job in data.jobs)
                {
                    if (job == null || string.IsNullOrWhiteSpace(job.stationId) ||
                        string.IsNullOrWhiteSpace(job.recipeId) || job.startedAtUtcTicks <= 0 ||
                        FindRecipe(job.recipeId) == null)
                        continue;
                    activeJobs[job.stationId] = job;
                }
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not load farm production jobs: " + exception.Message);
            }
        }

        private void Save()
        {
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(new SaveData
            {
                jobs = new List<JobSave>(activeJobs.Values).ToArray()
            }));
            PlayerPrefs.Save();
        }
    }
}