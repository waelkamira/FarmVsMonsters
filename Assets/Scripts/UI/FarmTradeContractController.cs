using FarmVsMonsters.Farm;
using UnityEngine;
using UnityEngine.UI;

namespace FarmVsMonsters.UI
{
    /// <summary>Simple uGUI adapter for accepting and delivering configured farm trade contracts.</summary>
    public sealed class FarmTradeContractController : MonoBehaviour
    {
        [SerializeField] private FarmTradeContractService contractService;
        [SerializeField] private FarmTradeContractDefinition[] displayedContracts;
        [SerializeField] private Button[] acceptButtons;
        [SerializeField] private Button deliverButton;
        [SerializeField] private Button cancelButton;
        [SerializeField] private Text activeContractText;
        [SerializeField] private Text progressText;
        [SerializeField] private Text balanceText;
        [SerializeField] private Text statusText;

        private UnityEngine.Events.UnityAction[] acceptActions;

        private void OnEnable()
        {
            if (contractService != null)
            {
                contractService.ContractAccepted += HandleAccepted;
                contractService.ContractDelivered += HandleDelivered;
                contractService.ContractExpired += HandleExpired;
            }
            BindAcceptButtons();
            if (deliverButton != null) deliverButton.onClick.AddListener(Deliver);
            if (cancelButton != null) cancelButton.onClick.AddListener(Cancel);
            Refresh();
        }

        private void OnDisable()
        {
            if (contractService != null)
            {
                contractService.ContractAccepted -= HandleAccepted;
                contractService.ContractDelivered -= HandleDelivered;
                contractService.ContractExpired -= HandleExpired;
            }
            UnbindAcceptButtons();
            if (deliverButton != null) deliverButton.onClick.RemoveListener(Deliver);
            if (cancelButton != null) cancelButton.onClick.RemoveListener(Cancel);
        }

        public void Refresh()
        {
            if (contractService == null) return;
            FarmTradeContractDefinition active = contractService.ActiveContract;
            if (activeContractText != null)
                activeContractText.text = active == null
                    ? "No active delivery contract"
                    : active.Title + "\n" + active.Description;
            if (progressText != null)
                progressText.text = active == null ? string.Empty :
                    contractService.GetDeliveredAmount() + " / " + active.RequestedAmount +
                    " " + active.RequestedResource + " (" +
                    Mathf.RoundToInt(contractService.GetProgress() * 100f) + "%)";
            if (balanceText != null)
                balanceText.text = "Farm coins: " + contractService.FarmCoins;
            if (deliverButton != null)
                deliverButton.interactable = contractService.CanDeliver();
            if (cancelButton != null)
                cancelButton.interactable = active != null;
            if (acceptButtons != null)
            {
                for (int i = 0; i < acceptButtons.Length; i++)
                    if (acceptButtons[i] != null)
                        acceptButtons[i].interactable = active == null &&
                            displayedContracts != null && i < displayedContracts.Length &&
                            contractService.CanAccept(displayedContracts[i]);
            }
        }

        private void BindAcceptButtons()
        {
            if (acceptButtons == null) return;
            acceptActions = new UnityEngine.Events.UnityAction[acceptButtons.Length];
            for (int i = 0; i < acceptButtons.Length; i++)
            {
                int index = i;
                acceptActions[i] = () => Accept(index);
                if (acceptButtons[i] != null)
                    acceptButtons[i].onClick.AddListener(acceptActions[i]);
            }
        }

        private void UnbindAcceptButtons()
        {
            if (acceptButtons == null || acceptActions == null) return;
            for (int i = 0; i < acceptButtons.Length && i < acceptActions.Length; i++)
                if (acceptButtons[i] != null && acceptActions[i] != null)
                    acceptButtons[i].onClick.RemoveListener(acceptActions[i]);
            acceptActions = null;
        }

        private void Accept(int index)
        {
            if (contractService == null || displayedContracts == null ||
                index < 0 || index >= displayedContracts.Length) return;
            bool success = contractService.TryAccept(displayedContracts[index]);
            SetStatus(success ? "Delivery contract accepted." : "Could not accept this contract.");
            Refresh();
        }

        private void Deliver()
        {
            if (contractService == null) return;
            bool success = contractService.TryDeliver();
            SetStatus(success ? "Delivery completed and reward received." :
                "Not enough goods or reward balance is full.");
            Refresh();
        }

        private void Cancel()
        {
            if (contractService == null) return;
            bool success = contractService.CancelActive();
            SetStatus(success ? "Active contract cancelled." : "No active contract.");
            Refresh();
        }

        private void HandleAccepted(FarmTradeContractDefinition contract)
        {
            SetStatus("Accepted: " + contract.Title);
            Refresh();
        }

        private void HandleDelivered(FarmTradeContractDefinition contract, int reward)
        {
            SetStatus("Completed: " + contract.Title + " (+" + reward + " coins)");
            Refresh();
        }

        private void HandleExpired()
        {
            SetStatus("The active delivery contract expired.");
            Refresh();
        }

        private void SetStatus(string value)
        {
            if (statusText != null) statusText.text = value;
        }
    }
}