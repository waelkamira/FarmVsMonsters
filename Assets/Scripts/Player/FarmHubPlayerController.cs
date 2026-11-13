using UnityEngine;

namespace FarmVsMonsters.Player
{
    /// <summary>Simple keyboard-controlled movement for the farm hub prototype.</summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class FarmHubPlayerController : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float moveSpeed = 5f;
        [SerializeField, Min(0f)] private float turnSpeed = 720f;
        [SerializeField] private Transform followCamera;
        [SerializeField] private Vector3 cameraOffset = new Vector3(0f, 18f, -20f);
        [SerializeField, Min(0.1f)] private float cameraSmooth = 8f;

        private CharacterController characterController;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
        }

        private void Update()
        {
            float horizontal = Input.GetAxisRaw("Horizontal");
            float vertical = Input.GetAxisRaw("Vertical");
            Vector3 direction = new Vector3(horizontal, 0f, vertical);
            direction = Vector3.ClampMagnitude(direction, 1f);
            characterController.SimpleMove(direction * moveSpeed);

            if (direction.sqrMagnitude > 0.001f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(direction, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(
                    transform.rotation, targetRotation, turnSpeed * Time.deltaTime);
            }
        }

        private void LateUpdate()
        {
            if (followCamera == null) return;
            Vector3 targetPosition = transform.position + cameraOffset;
            followCamera.position = Vector3.Lerp(
                followCamera.position, targetPosition, cameraSmooth * Time.deltaTime);
            Vector3 lookTarget = transform.position + Vector3.up * 0.8f;
            followCamera.rotation = Quaternion.Slerp(
                followCamera.rotation,
                Quaternion.LookRotation(lookTarget - followCamera.position, Vector3.up),
                cameraSmooth * Time.deltaTime);
        }
    }
}