using FarmVsMonsters.UI;
using UnityEngine;
using UnityEngine.UI;

namespace FarmVsMonsters.Battle
{
    /// <summary>Connects a result-panel retry button to the battle HUD.</summary>
    public sealed class BattleRetryButton : MonoBehaviour
    {
        [SerializeField] private Button button;
        [SerializeField] private BattleHudController hud;

        private void OnEnable()
        {
            if (button != null && hud != null)
                button.onClick.AddListener(hud.RetryBattle);
        }

        private void OnDisable()
        {
            if (button != null && hud != null)
                button.onClick.RemoveListener(hud.RetryBattle);
        }
    }
}