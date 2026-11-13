using UnityEngine;

namespace FarmVsMonsters.Visuals
{
    /// <summary>Small frame-based sprite animator for hand-drawn 2D characters and plants.</summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class SpriteAnimation2D : MonoBehaviour
    {
        public enum AnimationState { Idle, Walk, Attack, Block, Hurt, Death, Victory, Special }

        [System.Serializable]
        public sealed class AnimationClip
        {
            public AnimationState state;
            public Sprite[] frames;
            [Min(1f)] public float framesPerSecond = 8f;
            public bool loop = true;
        }

        [SerializeField] private AnimationClip[] clips;
        [SerializeField] private AnimationState startingState = AnimationState.Idle;

        private SpriteRenderer spriteRenderer;
        private AnimationClip activeClip;
        private int frameIndex;
        private float frameTimer;
        private bool finished;

        public AnimationState CurrentState { get; private set; }

        private void Awake()
        {
            spriteRenderer = GetComponent<SpriteRenderer>();
            Play(startingState, true);
        }

        private void Update()
        {
            if (activeClip == null || activeClip.frames == null ||
                activeClip.frames.Length == 0 || finished) return;

            frameTimer += Time.deltaTime;
            float frameDuration = 1f / Mathf.Max(1f, activeClip.framesPerSecond);
            while (frameTimer >= frameDuration)
            {
                frameTimer -= frameDuration;
                frameIndex++;
                if (frameIndex >= activeClip.frames.Length)
                {
                    if (activeClip.loop) frameIndex = 0;
                    else
                    {
                        frameIndex = activeClip.frames.Length - 1;
                        finished = true;
                    }
                }
                spriteRenderer.sprite = activeClip.frames[frameIndex];
            }
        }

        public void Play(AnimationState state, bool restartIfSame = false)
        {
            if (!restartIfSame && CurrentState == state && activeClip != null) return;
            CurrentState = state;
            activeClip = null;
            if (clips != null)
            {
                for (int i = 0; i < clips.Length; i++)
                {
                    if (clips[i] != null && clips[i].state == state)
                    {
                        activeClip = clips[i];
                        break;
                    }
                }
            }

            frameIndex = 0;
            frameTimer = 0f;
            finished = false;
            if (activeClip != null && activeClip.frames != null &&
                activeClip.frames.Length > 0)
                spriteRenderer.sprite = activeClip.frames[0];
        }

        public bool IsCurrentAnimationFinished => finished;

        public bool HasClip(AnimationState state)
        {
            if (clips == null) return false;
            for (int i = 0; i < clips.Length; i++)
                if (clips[i] != null && clips[i].state == state &&
                    clips[i].frames != null && clips[i].frames.Length > 0)
                    return true;
            return false;
        }
    }
}
