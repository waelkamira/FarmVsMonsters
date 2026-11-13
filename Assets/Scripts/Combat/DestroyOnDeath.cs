using UnityEngine;

namespace FarmVsMonsters.Combat
{
    /// <summary>Removes a defeated combatant after a short configurable delay.</summary>
    [RequireComponent(typeof(Health))]
    public sealed class DestroyOnDeath : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float destroyDelay = 0.35f;
        private Health health;

        private void Awake() { health = GetComponent<Health>(); }

        private void OnEnable()
        {
            if (health != null) health.Died += HandleDied;
        }

        private void OnDisable()
        {
            if (health != null) health.Died -= HandleDied;
        }

        private void HandleDied()
        {
            Destroy(gameObject, Mathf.Max(0f, destroyDelay));
        }
    }
}