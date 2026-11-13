using FarmVsMonsters.Combat;
using FarmVsMonsters.Enemies;
using FarmVsMonsters.Visuals;
using UnityEngine;

namespace FarmVsMonsters.Player
{
    /// <summary>
    /// Player-controlled caveman farmer. Plants stay rooted; this is the mobile
    /// defender who moves through the farm and attacks monsters with his club.
    /// Uses the legacy Input Manager, which is already used by the desktop prototype.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(Health))]
    [RequireComponent(typeof(SpriteAnimation2D))]
    public sealed class CavemanFarmerController2D : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField, Min(0.1f)] private float moveSpeed = 4f;
        [SerializeField] private Vector2 movementMin = new Vector2(-5.5f, -2.8f);
        [SerializeField] private Vector2 movementMax = new Vector2(5.5f, 2.8f);

        [Header("Club attack")]
        [SerializeField] private Transform clubAttackOrigin;
        [SerializeField, Min(0.1f)] private float clubRange = 1.25f;
        [SerializeField, Min(0.05f)] private float clubCooldown = 0.55f;
        [SerializeField, Min(0f)] private float clubDamage = 24f;
        [SerializeField] private LayerMask monsterLayers = ~0;
        [SerializeField, Min(1)] private int maxTargetsPerSwing = 24;

        [Header("Visuals")]
        [SerializeField] private SpriteRenderer spriteRenderer;

        private Rigidbody2D body;
        private Health health;
        private CharacterAnimationDriver2D animationDriver;
        private Collider2D[] hitResults;
        private Vector2 moveInput;
        private Vector2 facing = Vector2.right;
        private float attackCooldownRemaining;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            health = GetComponent<Health>();
            animationDriver = GetComponent<CharacterAnimationDriver2D>();
            if (spriteRenderer == null)
                spriteRenderer = GetComponentInChildren<SpriteRenderer>();
            hitResults = new Collider2D[Mathf.Max(1, maxTargetsPerSwing)];
            body.gravityScale = 0f;
            body.freezeRotation = true;
        }

        private void Update()
        {
            if (health == null || health.IsDead)
            {
                moveInput = Vector2.zero;
                if (animationDriver != null) animationDriver.SetMoving(false);
                return;
            }

            moveInput = new Vector2(
                UnityEngine.Input.GetAxisRaw("Horizontal"),
                UnityEngine.Input.GetAxisRaw("Vertical")).normalized;

            if (moveInput.sqrMagnitude > 0.01f)
            {
                facing = moveInput;
                if (spriteRenderer != null && Mathf.Abs(facing.x) > 0.05f)
                    spriteRenderer.flipX = facing.x < 0f;
                if (animationDriver != null) animationDriver.SetMoving(true);
            }
            else if (animationDriver != null)
            {
                animationDriver.SetMoving(false);
            }

            if (attackCooldownRemaining > 0f)
                attackCooldownRemaining -= Time.deltaTime;

            if (UnityEngine.Input.GetKeyDown(KeyCode.Space) && attackCooldownRemaining <= 0f)
                SwingClub();
        }

        private void FixedUpdate()
        {
            if (health == null || health.IsDead || moveInput.sqrMagnitude <= 0.001f)
                return;

            Vector2 next = body.position + moveInput * (moveSpeed * Time.fixedDeltaTime);
            next.x = Mathf.Clamp(next.x, movementMin.x, movementMax.x);
            next.y = Mathf.Clamp(next.y, movementMin.y, movementMax.y);
            body.MovePosition(next);
        }

        public void SetMovementBounds(Vector2 minimum, Vector2 maximum)
        {
            movementMin = Vector2.Min(minimum, maximum);
            movementMax = Vector2.Max(minimum, maximum);
        }

        public void ApplyPermanentBonuses(float bonusDamage, float bonusAttackSpeed)
        {
            clubDamage = Mathf.Max(0f, clubDamage + bonusDamage);
            if (bonusAttackSpeed > 0f)
                clubCooldown = Mathf.Max(0.05f, clubCooldown / (1f + bonusAttackSpeed));
        }

        private void SwingClub()
        {
            attackCooldownRemaining = clubCooldown;
            if (animationDriver != null)
                animationDriver.PlayAttack();

            Vector2 origin = clubAttackOrigin != null
                ? (Vector2)clubAttackOrigin.position
                : body.position + facing * 0.45f;

            int count = Physics2D.OverlapCircleNonAlloc(
                origin, clubRange, hitResults, monsterLayers);

            Health nearest = null;
            float nearestDistance = float.MaxValue;
            for (int i = 0; i < count; i++)
            {
                Collider2D candidate = hitResults[i];
                if (candidate == null) continue;

                EnemyMarker marker = candidate.GetComponentInParent<EnemyMarker>();
                Health targetHealth = candidate.GetComponentInParent<Health>();
                if (marker == null || targetHealth == null || targetHealth.IsDead)
                    continue;

                Vector2 offset = (Vector2)targetHealth.transform.position - body.position;
                if (Vector2.Dot(offset.normalized, facing) < -0.15f)
                    continue;

                float distance = offset.sqrMagnitude;
                if (distance < nearestDistance)
                {
                    nearestDistance = distance;
                    nearest = targetHealth;
                }
            }

            if (nearest != null)
                nearest.ApplyDamage(clubDamage);
        }

        private void OnDrawGizmosSelected()
        {
            Vector3 origin = clubAttackOrigin != null
                ? clubAttackOrigin.position
                : transform.position + (Vector3)(facing * 0.45f);
            Gizmos.DrawWireSphere(origin, clubRange);
        }
    }
}