using System;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>Optional day/night and weather cycle shared by farm crops and lane monsters.</summary>
    public sealed class FarmEnvironmentCycle2D : MonoBehaviour
    {
        public enum TimeOfDay { Dawn, Day, Dusk, Night }
        public enum Weather { Clear, Rain, Fog, Storm }

        [Header("Cycle")]
        [SerializeField, Min(60f)] private float fullDayDurationSeconds = 900f;
        [SerializeField, Range(0f, 1f)] private float startingTimeOfDay = 0.25f;
        [SerializeField] private bool runAutomatically = true;

        [Header("Weather")]
        [SerializeField, Min(15f)] private float weatherChangeInterval = 180f;
        [SerializeField] private bool allowStorm = true;
        [SerializeField] private Weather startingWeather = Weather.Clear;

        [Header("Gameplay effects")]
        [SerializeField, Min(1f)] private float rainCropGrowthMultiplier = 1.5f;
        [SerializeField, Min(1f)] private float nightMonsterSpeedMultiplier = 1.2f;
        [SerializeField, Min(1f)] private float stormMonsterSpeedMultiplier = 1.15f;

        [Header("Optional visual overlays")]
        [SerializeField] private SpriteRenderer nightOverlay;
        [SerializeField] private SpriteRenderer weatherOverlay;
        [SerializeField, Range(0f, 1f)] private float nightOverlayAlpha = 0.38f;
        [SerializeField, Range(0f, 1f)] private float fogOverlayAlpha = 0.3f;
        [SerializeField, Range(0f, 1f)] private float rainOverlayAlpha = 0.12f;
        [SerializeField, Range(0f, 1f)] private float stormOverlayAlpha = 0.24f;

        private float dayTimer;
        private float weatherTimer;

        public float NormalizedTime => Mathf.Repeat(dayTimer / Mathf.Max(1f, fullDayDurationSeconds), 1f);
        public TimeOfDay CurrentTimeOfDay { get; private set; }
        public Weather CurrentWeather { get; private set; }
        public float CropGrowthMultiplier => CurrentWeather == Weather.Rain
            ? rainCropGrowthMultiplier : 1f;
        public float MonsterSpeedMultiplier =>
            (CurrentTimeOfDay == TimeOfDay.Night ? nightMonsterSpeedMultiplier : 1f) *
            (CurrentWeather == Weather.Storm ? stormMonsterSpeedMultiplier : 1f);

        public event Action<TimeOfDay> TimeOfDayChanged;
        public event Action<Weather> WeatherChanged;

        private void Awake()
        {
            dayTimer = startingTimeOfDay * fullDayDurationSeconds;
            CurrentWeather = startingWeather;
            weatherTimer = weatherChangeInterval;
            RefreshState(true);
            RefreshOverlays();
        }

        private void Update()
        {
            if (!runAutomatically)
                return;

            dayTimer += Time.deltaTime;
            weatherTimer -= Time.deltaTime;

            if (weatherTimer <= 0f)
            {
                weatherTimer = weatherChangeInterval;
                ChangeWeather();
            }

            RefreshState(false);
            RefreshOverlays();
        }

        public void SetTimeNormalized(float value)
        {
            dayTimer = Mathf.Repeat(value, 1f) * fullDayDurationSeconds;
            RefreshState(false);
            RefreshOverlays();
        }

        public void SetWeather(Weather weather)
        {
            if (CurrentWeather == weather)
                return;
            CurrentWeather = weather;
            WeatherChanged?.Invoke(CurrentWeather);
            RefreshOverlays();
        }

        private void ChangeWeather()
        {
            int max = allowStorm ? 4 : 3;
            SetWeather((Weather)UnityEngine.Random.Range(0, max));
        }

        private void RefreshState(bool forceEvent)
        {
            float t = NormalizedTime;
            TimeOfDay next = t < 0.22f ? TimeOfDay.Dawn :
                t < 0.5f ? TimeOfDay.Day :
                t < 0.72f ? TimeOfDay.Dusk : TimeOfDay.Night;

            if (forceEvent || next != CurrentTimeOfDay)
            {
                CurrentTimeOfDay = next;
                TimeOfDayChanged?.Invoke(CurrentTimeOfDay);
            }
        }

        private void RefreshOverlays()
        {
            float night = CurrentTimeOfDay == TimeOfDay.Night ? nightOverlayAlpha :
                CurrentTimeOfDay == TimeOfDay.Dusk ? nightOverlayAlpha * 0.45f : 0f;
            SetOverlayAlpha(nightOverlay, night);

            float weatherAlpha = CurrentWeather == Weather.Fog ? fogOverlayAlpha :
                CurrentWeather == Weather.Rain ? rainOverlayAlpha :
                CurrentWeather == Weather.Storm ? stormOverlayAlpha : 0f;
            SetOverlayAlpha(weatherOverlay, weatherAlpha);
        }

        private static void SetOverlayAlpha(SpriteRenderer renderer, float alpha)
        {
            if (renderer == null)
                return;
            Color color = renderer.color;
            color.a = Mathf.Clamp01(alpha);
            renderer.color = color;
            renderer.enabled = alpha > 0.001f;
        }

        private void OnValidate()
        {
            fullDayDurationSeconds = Mathf.Max(60f, fullDayDurationSeconds);
            weatherChangeInterval = Mathf.Max(15f, weatherChangeInterval);
            rainCropGrowthMultiplier = Mathf.Max(1f, rainCropGrowthMultiplier);
            nightMonsterSpeedMultiplier = Mathf.Max(1f, nightMonsterSpeedMultiplier);
            stormMonsterSpeedMultiplier = Mathf.Max(1f, stormMonsterSpeedMultiplier);
        }
    }
}
