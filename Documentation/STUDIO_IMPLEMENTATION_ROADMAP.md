# خارطة التنفيذ المرحلية — FarmVsMonsters وStudio

**الحالة:** المرحلة 1 — Studio Foundation & Game Architecture نشطة، وغير مغلقة.  
**آخر مطابقة موثقة:** 2026-11-22  
**مرجع الحالة:** `STUDIO_SYSTEM_INVENTORY.md` و`STUDIO_PHASE1_ACCEPTANCE_MATRIX.md`.

## قواعد التنفيذ الحاكمة

- الميثاق في `ARCHITECTURE_CHARTER.md` ملزم.
- ترتيب المستخدم التنفيذي: إصلاح الوثائق وتعارضاتها → جرد الأنظمة والصفحات → تحديد الموجود/الناقص/غير المختبر → خريطة الاعتماديات وتدفق البيانات → معايير قبول المرحلة الأولى → إكمال المرحلة الأولى → المراحل التالية بالتتابع.
- مرحلة واحدة نشطة في كل وقت.
- لا دمج إلى `main` دون موافقة صريحة.
- لا خدمات مدفوعة دون موافقة.
- لا Terminal للعمليات اليومية التي يجب أن يوفرها Studio.
- لا ادعاء نجاح اختبار لم يُنفذ.
- المسار النشط Next.js/React/Phaser داخل `web/`; Godot متوقف حالياً، ولا Rewrite شامل.
- Auto-Rig وHybrid Rig جزءان من Asset & Animation Studio ويخضعان لدورة الأصول الموحدة؛ لا يُداران كمنتجين أو مساري نشر مستقلين.

## ترتيب العمل التأسيسي المعتمد

1. مراجعة وإصلاح الوثائق والتعارضات.
2. إنشاء جرد شامل لكل الأنظمة والصفحات وواجهات API والخدمات والعقود والاختبارات.
3. تصنيف الحالة بالأدلة: موجود في المصدر، متكامل مصدرياً، ناقص، غير مختبر، متحقق.
4. رسم خريطة الاعتماديات وتدفق البيانات من Studio إلى Runtime.
5. تثبيت معايير قبول المرحلة الأولى.
6. تنفيذ النواقص الحرجة في المرحلة الأولى وإغلاق بوابتها قبل الانتقال.

## المرحلة 0 — Audit & Baseline

**الحالة:** مغلقة للانتقال فقط؛ لا تعني اجتياز جميع اختبارات التشغيل.

- جرد المستودع والفروع والصفحات وواجهات API.
- تحديد المسار النشط ومصادر البيانات والأصول.
- تسجيل قيود Runner وغياب Windows/Chrome execution عند عدم توفرهما.
- إبقاء عناصر التحقق غير المنفذة مفتوحة حتى تتوفر بيئة تنفيذ.

## المرحلة 1 — Studio Foundation & Game Architecture (النشطة)

### A. Studio Core
- Shell/navigation extensible؛ تفكيك الصفحة الكبيرة تدريجياً إلى وحدات.
- جلسات آمنة وصلاحيات واضحة؛ توسيع النموذج إلى صلاحيات العمليات.
- عقود schemas/IDs/relations/versioning/capabilities موحدة.
- Registry/storage abstraction دون ربط الواجهة بمزود التخزين.
- حفظ المسودات وحماية التعديلات والتعامل مع التعارض.
- سجل تغييرات/تدقيق قابل للمراجعة.
- دعم عربي وRTL أساسي من البداية.

### B. Asset & Animation Foundation (جزء من المرحلة الأولى)
- Asset identity, upload validation, immutable paths and safe replacement.
- Sprite Sheet dimensions/grid/frame metadata and preview.
- Animation profile and shared runtime contracts.
- Hybrid/Skeletal Rig as an optional mode on the same asset record.
- Auto-Rig as a proposal tool inside the rig workflow; human review is mandatory.
- Attachments, hitboxes, rig-part dependencies, revisions and restore.
- Readiness checks and actual browser/runtime evidence.

### C. Safe content lifecycle and release
- Draft/Testing/Approved/Published/Disabled/Archived.
- Dependency-aware archive/replace/restore.
- Optimistic concurrency on every mutation path.
- Complete release package and dependency closure.
- Replace the current direct-to-target-branch publish implementation with a staged release branch and PR review/approval workflow; immutable published revisions.
- Atomic activation or equivalent single-pointer release; failed release must not change active content.
- Rollback and reconciliation of PR state.
- **Current blocker:** the inspected mainline PATCH publish route writes assets and catalog directly to the configured target branch (default `main`) and only then syncs registry state. It does not create a PR and can leave catalog/registry inconsistent. Phase 1 cannot close until this is replaced and verified.

### D. Quality foundation
- Unit, API, integration, browser and live gameplay tests separated.
- Testing Lab reports its exact scope; readiness audit is not represented as battle simulation.
- Test, lint and production build must run in an actual runner.
- No production release without required evidence.

### Phase 1 exit gate

Use `STUDIO_PHASE1_ACCEPTANCE_MATRIX.md`. Phase 1 is not complete until all mandatory gates and end-to-end scenarios pass with recorded evidence, including a rigged asset and Auto-Rig workflow through the shared asset lifecycle.

## المرحلة 2 — Content Creation Core

- Plant Studio, Monster Studio, Projectile & Weapon Studio.
- Ability/Effect/Interaction contracts and supported Gameplay AI profiles.
- Each field must map to a persisted schema and runtime behavior.
- Creation, clone, edit, test, release and restore.
- **Gate:** new plant, monster and projectile complete the end-to-end lifecycle and work in a real Phaser stage.

## المرحلة 3 — World Construction

- World/Map Editor, grid, terrain, paths, entry/exit, obstacles, environment.
- Map schema and runtime adapter before visual editor expansion.
- **Gate:** a newly authored map runs from Studio data and passes collision/path checks.

## المرحلة 4 — Game Construction

- Level/Wave Builder, objectives, win/loss, events, difficulty and supported game modes.
- **Gate:** create and run a complete stage with configured waves and reproducible simulation.

## المرحلة 5 — Player & Progression

- Player save schema, inventory, resources, unlocks, upgrades, tasks, achievements, rewards and migrations.
- **Gate:** persistent player progress with integrity and recovery tests.

## المرحلة 6 — Economy & Monetization

- Costs, currencies, rewards, store, offers and purchase validation.
- No paid provider/service without prior approval.
- **Gate:** safe simulation, audit and idempotency for sensitive operations.

## المرحلة 7 — Simulation, Testing & Balance

- Sandbox, scenario simulation, level tests, performance, compatibility, balance reports and regression.
- This expands the basic test foundation established in Phase 1.
- **Gate:** reproducible results and release blocks on mandatory failures.

## المرحلة 8 — Player Experience & Expansion

- Tutorial, core loops, challenges, replayability, collections and prioritized modes.
- Social/multiplayer readiness only; no premature implementation.
- **Gate:** tested player journeys and measurable acceptance criteria.

## المرحلة 9 — Localization, Accessibility & Platform Readiness

- Expand localization/RTL foundations, missing-string detection, accessibility and responsive/touch behavior.
- Arabic/RTL basics are already mandatory in Phase 1; this phase completes broad coverage.
- **Gate:** language/device matrix verified in browser/device environments.

## المرحلة 10 — Release & Operations

- Release environments, staged rollout, monitoring, incidents, analytics, scheduling and rollback.
- Phase 1 provides safe content release foundations; this phase expands game-wide operations.
- **Gate:** observable, reversible production release workflow.

## المرحلة 11 — AI-Assisted Studio & Continuous Expansion

- General conversational change workflow, impact analysis, proposals, test generation and diagnostics.
- Auto-Rig remains in Asset & Animation Studio; it is not the general AI assistant.
- No automatic production publish; every change remains reviewable.
- **Gate:** safe, auditable and evidence-backed assistant workflow.

## Dependency rules

- schemas/IDs/storage/concurrency before editor proliferation.
- assets/animation/rig contracts before dependent character editors.
- engine capability before exposing new behavior fields.
- map before level builder; monster/wave contracts before encounter simulation.
- save integrity before progression/economy.
- test evidence and atomic release before broad live operations.
- AI workflows build on version control, review and test infrastructure.

## Priority rules

P0: security, data loss, runtime breakage, release corruption, phase gate blockers.  
P1: mandatory current-phase requirements.  
P2: usability and maintainability improvements.  
P3: future expansion. P2/P3 must not distract from a blocked P0/P1 gate.
