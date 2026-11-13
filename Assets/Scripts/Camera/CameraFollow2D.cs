using UnityEngine;

namespace FarmVsMonsters.CameraSystem
{
    /// <summary>Orthographic 2D follow camera with optional world-space movement bounds.</summary>
    [RequireComponent(typeof(Camera))]
    public sealed class CameraFollow2D : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0f, 0f, -10f);
        [SerializeField, Min(0f)] private float smoothTime = 0.18f;
        [SerializeField] private bool clampToBounds;
        [SerializeField] private Vector2 boundsMin = new Vector2(-8f, -5f);
        [SerializeField] private Vector2 boundsMax = new Vector2(8f, 5f);

        private Camera attachedCamera;
        private Vector3 velocity;

        private void Awake()
        {
            attachedCamera = GetComponent<Camera>();
            if (attachedCamera != null && !attachedCamera.orthographic)
                Debug.LogWarning("CameraFollow2D expects an Orthographic Camera.", this);
        }

        public void SetTarget(Transform newTarget)
        {
            target = newTarget;
        }

        private void LateUpdate()
        {
            if (target == null) return;

            Vector3 desired = target.position + offset;
            if (clampToBounds && attachedCamera != null && attachedCamera.orthographic)
            {
                float halfHeight = attachedCamera.orthographicSize;
                float halfWidth = halfHeight * attachedCamera.aspect;
                float minX = boundsMin.x + halfWidth;
                float maxX = boundsMax.x - halfWidth;
                float minY = boundsMin.y + halfHeight;
                float maxY = boundsMax.y - halfHeight;

                desired.x = minX > maxX ? (boundsMin.x + boundsMax.x) * 0.5f :
                    Mathf.Clamp(desired.x, minX, maxX);
                desired.y = minY > maxY ? (boundsMin.y + boundsMax.y) * 0.5f :
                    Mathf.Clamp(desired.y, minY, maxY);
            }

            desired.z = offset.z;
            transform.position = smoothTime <= 0f
                ? desired
                : Vector3.SmoothDamp(transform.position, desired, ref velocity, smoothTime);
        }

        private void OnDrawGizmosSelected()
        {
            if (!clampToBounds) return;
            Vector3 center = new Vector3((boundsMin.x + boundsMax.x) * 0.5f,
                (boundsMin.y + boundsMax.y) * 0.5f, 0f);
            Vector3 size = new Vector3(Mathf.Abs(boundsMax.x - boundsMin.x),
                Mathf.Abs(boundsMax.y - boundsMin.y), 0f);
            Gizmos.DrawWireCube(center, size);
        }
    }
}