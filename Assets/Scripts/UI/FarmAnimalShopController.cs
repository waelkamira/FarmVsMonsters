using FarmVsMonsters.Farm;
using FarmVsMonsters.Progression;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Simple uGUI presenter for purchasing animals and viewing farm materials.</summary>
    public sealed class FarmAnimalShopController : MonoBehaviour
    {
        [SerializeField] private FarmAnimalService animalService;
        [SerializeField] private FarmAnimalDefinition[] animals;
        [SerializeField] private Button[] animalButtons;
        [SerializeField] private Text[] animalLabels;
        [SerializeField] private Text farmCoinsText;
        [SerializeField] private Text[] resourceLabels;
        [SerializeField] private FarmResourceWallet resourceWallet;

        private UnityAction[] purchaseActions;

        private void OnEnable()
        {
            if (animalService != null)
                animalService.AnimalPurchased += HandleAnimalPurchased;
            if (resourceWallet != null)
                resourceWallet.ResourceChanged += HandleResourceChanged;

            BindButtons();
            Refresh();
        }

        private void OnDisable()
        {
            if (animalService != null)
                animalService.AnimalPurchased -= HandleAnimalPurchased;
            if (resourceWallet != null)
                resourceWallet.ResourceChanged -= HandleResourceChanged;

            if (animalButtons != null && purchaseActions != null)
            {
                for (int i = 0; i < animalButtons.Length && i < purchaseActions.Length; i++)
                {
                    if (animalButtons[i] != null && purchaseActions[i] != null)
                        animalButtons[i].onClick.RemoveListener(purchaseActions[i]);
                }
            }
            purchaseActions = null;
        }

        public void PurchaseAnimal(int index)
        {
            if (animalService == null || animals == null || index < 0 || index >= animals.Length)
                return;

            animalService.TryPurchase(animals[index]);
            Refresh();
        }

        public void Refresh()
        {
            PlayerProgressData progress = ProgressSaveService.Load();
            if (farmCoinsText != null)
                farmCoinsText.text = "Farm Coins: " + progress.farmCoins;

            if (animalButtons != null)
            {
                for (int i = 0; i < animalButtons.Length; i++)
                {
                    if (animalButtons[i] == null)
                        continue;

                    FarmAnimalDefinition definition = animals != null && i < animals.Length ? animals[i] : null;
                    if (definition == null)
                    {
                        animalButtons[i].interactable = false;
                        continue;
                    }

                    bool owned = animalService != null && animalService.Owns(definition);
                    animalButtons[i].interactable = !owned && animalService != null && animalService.CanPurchase(definition);

                    if (animalLabels != null && i < animalLabels.Length && animalLabels[i] != null)
                    {
                        animalLabels[i].text = owned
                            ? definition.DisplayName + "\nOWNED"
                            : definition.DisplayName + "\n" + definition.CoinCost + " coins";
                    }
                }
            }

            RefreshResources();
        }

        private void RefreshResources()
        {
            if (resourceLabels == null)
                return;

            for (int i = 0; i < resourceLabels.Length; i++)
            {
                if (resourceLabels[i] == null || i >= System.Enum.GetValues(typeof(FarmResourceType)).Length)
                    continue;

                FarmResourceType type = (FarmResourceType)i;
                int amount = resourceWallet != null ? resourceWallet.GetAmount(type) : 0;
                resourceLabels[i].text = type + ": " + amount;
            }
        }

        private void BindButtons()
        {
            if (animalButtons == null)
                return;

            purchaseActions = new UnityAction[animalButtons.Length];
            for (int i = 0; i < animalButtons.Length; i++)
            {
                if (animalButtons[i] == null)
                    continue;

                int index = i;
                purchaseActions[i] = () => PurchaseAnimal(index);
                animalButtons[i].onClick.AddListener(purchaseActions[i]);
            }
        }

        private void HandleAnimalPurchased(FarmAnimalDefinition definition)
        {
            Refresh();
        }

        private void HandleResourceChanged(FarmResourceType type, int amount)
        {
            RefreshResources();
        }
    }
}