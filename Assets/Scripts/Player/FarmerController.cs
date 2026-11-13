using UnityEngine;

namespace FarmVsMonsters.Player
{
    /// <summary>
    /// Physics-based farmer movement. Input is supplied by an input adapter through SetMoveInput,
    /// keeping gameplay movement independent from keyboard, gamepad, and touch input packages.
    /// Requires a CharacterController on the same GameObject.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class FarmerController : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float moveSpeed = 5f;
        [SerializeField, Min(0f)] private float rotationSpeed = 720f;
        [SerializeField, Min(0f)] private float gravity = 22f;
        [SerializeField] private Transform visualRoot;

        private CharacterController characterController;
        private Vector2 moveInput;
        private float verticalVelocity;

        public Vector2 MoveInput => moveInput;
        public bool IsMoving => moveInput.sqrMagnitude > 0.001f;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
        }

        public void SetMoveInput(Vector2 input)
        {
            moveInput = Vector2.ClampMagnitude(input, 1f);
        }

        public void AddMoveSpeed(float bonus)
        {
            moveSpeed = Mathf.Max(0f, moveSpeed + bonus);
        }

        public void SetMoveSpeed(float newSpeed)
        {
            moveSpeed = Mathf.Max(0f, newSpeed);
        }

        public void StopMoving()
        {
            moveInput = Vector2.zero;
        }

        private void Update()
        {
            Vector3 planarDirection = new Vector3(moveInput.x, 0f, moveInput.y);
            if (planarDirection.sqrMagnitude > 1f)
                planarDirection.Normalize();

            if (characterController.isGrounded && verticalVelocity < 0f)
                verticalVelocity = -2f;

            verticalVelocity -= gravity * Time.deltaTime;
            Vector3 velocity = planarDirection * moveSpeed;
            velocity.y = verticalVelocity;
            characterController.Move(velocity * Time.deltaTime);

            if (planarDirection.sqrMagnitude > 0.001f)
            {
                Transform rotationTarget = visualRoot != null ? visualRoot : transform;
                Quaternion targetRotation = Quaternion.LookRotation(planarDirection, Vector3.up);
                rotationTarget.rotation = Quaternion.RotateTowards(
                    rotationTarget.rotation, targetRotation, rotationSpeed * Time.deltaTime);
            }
        }
    }
}