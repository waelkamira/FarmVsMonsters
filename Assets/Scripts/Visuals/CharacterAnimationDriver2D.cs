using FarmVsMonsters.Combat;
using UnityEngine;

namespace FarmVsMonsters.Visuals
{
    /// <summary>Connects combat health events and locomotion intent to frame-based sprite states.</summary>
    [RequireComponent(typeof(SpriteAnimation2D))]
    [RequireComponent(typeof(Health))]
    public sealed class CharacterAnimationDriver2D : MonoBehaviour
    {
        [SerializeField] private SpriteAnimation2D animator;
        [SerializeField] private Health health;

        private bool wantsToMove;
        private float previousHealth;

        private void Awake()
        {
            if (animator == null) animator = GetComponent<SpriteAnimation2D>();
            if (health == null) health = GetComponent<Health>();
        }

        private void Start()
        {
            if (health != null) previousHealth = health.CurrentHealth;
        }

        private void OnEnable()
        {
            if (health == null) health = GetComponent<Health>();
            if (health != null)
            {
                health.HealthChanged += HandleHealthChanged;
                health.Died += HandleDied;
            }
        }

        private void OnDisable()
        {
            if (health != null)
            {
                health.HealthChanged -= HandleHealthChanged;
                health.Died -= HandleDied;
            }
        }

        private void Update()
        {
            if (animator == null || health == null || health.IsDead) return;
            if ((animator.CurrentState == SpriteAnimation2D.AnimationState.Attack ||
                 animator.CurrentState == SpriteAnimation2D.AnimationState.Hurt ||
                 animator.CurrentState == SpriteAnimation2D.AnimationState.Block) &&
                animator.IsCurrentAnimationFinished)
                ApplyLocomotionState();
        }

        public void SetMoving(bool moving)
        {
            wantsToMove = moving;
            if (animator == null || health == null || health.IsDead) return;
            if (animator.CurrentState == SpriteAnimation2D.AnimationState.Attack ||
                animator.CurrentState == SpriteAnimation2D.AnimationState.Hurt ||
                animator.CurrentState == SpriteAnimation2D.AnimationState.Block ||
                animator.CurrentState == SpriteAnimation2D.AnimationState.Victory)
                return;
            ApplyLocomotionState();
        }

        public void PlayAttack()
        {
            PlayTransient(SpriteAnimation2D.AnimationState.Attack);
        }

        public void PlayBlock()
        {
            PlayTransient(SpriteAnimation2D.AnimationState.Block);
        }

        public void PlayVictory()
        {
            if (animator != null && health != null && !health.IsDead &&
                animator.HasClip(SpriteAnimation2D.AnimationState.Victory))
                animator.Play(SpriteAnimation2D.AnimationState.Victory, true);
        }

        public void PlaySpecial()
        {
            PlayTransient(SpriteAnimation2D.AnimationState.Special);
        }

        private void HandleHealthChanged(float current, float maximum)
        {
            if (current < previousHealth && current > 0f)
                PlayTransient(SpriteAnimation2D.AnimationState.Hurt);
            previousHealth = current;
        }

        private void HandleDied()
        {
            if (animator != null)
                animator.Play(SpriteAnimation2D.AnimationState.Death, true);
        }

        private void PlayTransient(SpriteAnimation2D.AnimationState state)
        {
            if (animator == null || health == null || health.IsDead) return;
            if (animator.HasClip(state))
                animator.Play(state, true);
            else
                ApplyLocomotionState();
        }

        private void ApplyLocomotionState()
        {
            if (animator == null || health == null || health.IsDead) return;
            animator.Play(wantsToMove ? SpriteAnimation2D.AnimationState.Walk :
                SpriteAnimation2D.AnimationState.Idle);
        }
    }
}