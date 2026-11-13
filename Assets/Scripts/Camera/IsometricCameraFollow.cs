using UnityEngine;

namespace FarmVsMonsters.CameraSystem
{
    /// <summary>Soft-follow camera rig for the isometric farm and battle arenas.</summary>
    public sealed class IsometricCameraFollow : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0f, 12f, -9f);
        [SerializeField, Min(0f)] private float positionSmoothTime = 0.18f;
        [SerializeField, Min(0f)] private float lookHeight = 1f;
        [SerializeField] private bool followRotation;

        private Vector3 positionVelocity;

        public void SetTarget(Transform newTarget)
        {
            target = newTarget;
        }

        private void LateUpdate()
        {
            if (target == null)
                return;

            Vector3 desiredPosition = target.position + offset;
            transform.position = positionSmoothTime <= 0f
                ? desiredPosition
                : Vector3.SmoothDamp(transform.position, desiredPosition, ref positionVelocity, positionSmoothTime);

            Vector3 lookPoint = target.position + Vector3.up * lookHeight;
            Vector3 lookDirection = lookPoint - transform.position;
            if (lookDirection.sqrMagnitude > 0.001f)
            {
                Quaternion desiredRotation = Quaternion.LookRotation(lookDirection, Vector3.up);
                transform.rotation = followRotation || transform.rotation == Quaternion.identity
                    ? desiredRotation
                    : Quaternion.Slerp(transform.rotation, desiredRotation, Time.deltaTime * 8f);
            }
        }

#if UNITY_EDITOR
        private void OnDrawGizmosSelected()
        {
            if (target == null)
                return;

            Gizmos.color = Color.cyan;
            Gizmos.DrawLine(transform.position, target.position + Vector3.up * lookHeight);
            Gizmos.DrawWireSphere(target.position, 0.25f);
        }
#endif
    }
}