using System;
using FarmVsMonsters.Combat;
using FarmVsMonsters.Plants;
using UnityEngine;

namespace FarmVsMonsters.Input
{
    /// <summary>Lets the caveman upgrade the nearest planted defender by pressing U nearby.</summary>
    public sealed class PlantUpgradeInteractor2D : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] private float interactionRange = 1.6f;
        [SerializeField] private LayerMask plantLayers = ~0;
        [SerializeField] private KeyCode upgradeKey = KeyCode.U;

        public event Action<PlantUpgradeController2D, bool> UpgradeAttempted;

        private Health playerHealth;

        private void Awake()
        {
            playerHealth = GetComponent<Health>();
        }

        private void Update()
        {
            if ((playerHealth != null && playerHealth.IsDead) ||
                !UnityEngine.Input.GetKeyDown(upgradeKey))
                return;

            PlantUpgradeController2D target = FindNearestUpgradeablePlant();
            if (target == null)
                return;

            bool upgraded = target.TryUpgrade();
            UpgradeAttempted?.Invoke(target, upgraded);
        }

        private PlantUpgradeController2D FindNearestUpgradeablePlant()
        {
            Collider2D[] hits = Physics2D.OverlapCircleAll(
                transform.position, interactionRange, plantLayers);
            PlantUpgradeController2D nearest = null;
            float nearestDistance = interactionRange * interactionRange;

            for (int i = 0; i < hits.Length; i++)
            {
                if (hits[i] == null) continue;
                PlantUpgradeController2D candidate =
                    hits[i].GetComponentInParent<PlantUpgradeController2D>();
                if (candidate == null || candidate.CurrentLevel >= candidate.MaximumLevel)
                    continue;

                float distance = ((Vector2)candidate.transform.position -
                    (Vector2)transform.position).sqrMagnitude;
                if (distance >= nearestDistance) continue;

                nearestDistance = distance;
                nearest = candidate;
            }

            return nearest;
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.DrawWireSphere(transform.position, interactionRange);
        }
    }
}
