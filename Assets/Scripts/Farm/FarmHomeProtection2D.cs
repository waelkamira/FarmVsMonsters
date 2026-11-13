using FarmVsMonsters.Battle;
using FarmVsMonsters.Combat;
using UnityEngine;

namespace FarmVsMonsters.Farm
{
    /// <summary>
    /// Reports defeat only when the farmhouse or protected princess is destroyed.
    /// Side crops, plants, and animals never end the battle by themselves.
    /// </summary>
    public sealed class FarmHomeProtection2D : MonoBehaviour
    {
        [SerializeField] private FarmDefenseTarget2D farmhouse;
        [SerializeField] private FarmDefenseTarget2D princess;
        [SerializeField] private BattleOutcomeController outcomeController;

        private Health farmhouseHealth;
        private Health princessHealth;

        private void OnEnable()
        {
            BindTargets();
        }

        private void OnDisable()
        {
            if (farmhouseHealth != null) farmhouseHealth.Died -= HandleProtectedTargetDied;
            if (princessHealth != null) princessHealth.Died -= HandleProtectedTargetDied;
            farmhouseHealth = null;
            princessHealth = null;
        }

        private void BindTargets()
        {
            if (farmhouse != null && farmhouse.Kind == FarmDefenseTarget2D.TargetKind.Farmhouse)
            {
                farmhouseHealth = farmhouse.Health != null ? farmhouse.Health : farmhouse.GetComponent<Health>();
                if (farmhouseHealth != null) farmhouseHealth.Died += HandleProtectedTargetDied;
            }
            else if (farmhouse != null)
                Debug.LogError("Farmhouse reference must use Target Kind = Farmhouse.", farmhouse);

            if (princess != null && princess.Kind == FarmDefenseTarget2D.TargetKind.Princess)
            {
                princessHealth = princess.Health != null ? princess.Health : princess.GetComponent<Health>();
                if (princessHealth != null) princessHealth.Died += HandleProtectedTargetDied;
            }
            else if (princess != null)
                Debug.LogError("Princess reference must use Target Kind = Princess.", princess);

            if (outcomeController == null)
                Debug.LogError("FarmHomeProtection2D requires a BattleOutcomeController reference.", this);
        }

        private void HandleProtectedTargetDied()
        {
            if (outcomeController != null)
                outcomeController.ReportDefeat();
        }
    }
}