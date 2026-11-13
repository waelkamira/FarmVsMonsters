using UnityEngine;

namespace FarmVsMonsters.Visuals
{
    /// <summary>Lightweight procedural idle motion for generated greybox 3D visuals.</summary>
    [DisallowMultipleComponent]
    public sealed class ProceduralIdleMotion : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float bobAmplitude = 0.035f;
        [SerializeField, Min(0f)] private float bobFrequency = 2f;
        [SerializeField, Min(0f)] private float swayAngle = 3f;
        [SerializeField] private float phaseOffset;

        private Vector3 initialPosition;
        private Quaternion initialRotation;

        private void Awake()
        {
            initialPosition = transform.localPosition;
            initialRotation = transform.localRotation;
        }

        private void Update()
        {
            float phase = Time.time * bobFrequency + phaseOffset;
            transform.localPosition = initialPosition +
                Vector3.up * (Mathf.Sin(phase) * bobAmplitude);
            transform.localRotation = initialRotation *
                Quaternion.Euler(0f, Mathf.Sin(phase * 0.5f) * swayAngle, 0f);
        }
    }
}