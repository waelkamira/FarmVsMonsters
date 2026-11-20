# خارطة التنفيذ المرحلية — FarmVsMonsters وStudio

**الحالة:** خارطة مقترحة للتطوير والمراجعة؛ المرحلة 0 ما تزال الحالية وغير مكتملة. لا بدء للمرحلة 1 دون إغلاق بوابة المرحلة 0 واعتمادها.

## قواعد التنفيذ
- مرحلة واحدة قيد التنفيذ في كل وقت، مع استثناء الأعمال التوثيقية/التحضيرية التي لا تتجاوز بوابة المرحلة.
- كل ميزة: تصميم → تنفيذ → API/Validation/Storage → Runtime → اختبار → تحقق متصفح → توثيق.
- لا دمج إلى main دون موافقة صريحة.
- لا خدمات مدفوعة دون موافقة.
- لا Terminal للعمليات اليومية.
- لا ادعاء نتائج غير متحققة.
- المسار النشط Next.js/React/Phaser داخل web/؛ لا Rewrite شامل ولا نقل إلى المشاريع التاريخية.

## المرحلة 0 — Audit & Baseline (الحالية)
- تدقيق المستودع والفروع وPRs، الصفحات وAPI.
- جرد مصادر بيانات المحتوى والأصول والأنيميشن والاختبارات.
- مصفوفة Studio→API→Service→Storage→Runtime→Engine.
- اختبار Browser/Chrome ومسارات اللعب وأصول Bamboo Throwing.
- تحقق Node tests، ESLint، Production Build في Runner أو Windows.
- تحديد الفجوات والخطوات القابلة لإعادة الإنتاج.
**بوابة الخروج:** خريطة موثوقة، نتائج تحقق فعلية أو قيود موثقة، مراجعة PRs المتراكبة ومسار آمن، عيوب أولويات وخطوات reproduction، ونقطة أساس. لا تزال هذه البوابة مفتوحة.

## المرحلة 1 — Studio Foundation & Game Architecture
- Content Registry، contracts، IDs، relations، versioning.
- API/services/validation/auth/permissions/audit.
- Draft/Testing/Approved/Published/Disabled/Archived lifecycle.
- dependency & compatibility analysis، safe deletion، recovery.
- storage abstraction، runtime adapters، publication bundles/atomic activation.
- Capability Extension architecture، event/interaction contracts.
- UI foundation، search/library، drafts، preview، save/recovery.
**بوابة:** دورة محتوى نموذجية End-to-End، اختبار، سجل، صلاحيات وتبعيات وإصدار واسترجاع، وصول فعلي للمحرك.

## المرحلة 2 — Content Creation Core
- Plant Studio.
- Monster Studio.
- Projectile & Weapon Studio.
- Ability/Effect/Interaction framework.
- Gameplay AI profiles supported by engine.
**بوابة:** إنشاء/نسخ/تعديل محتوى جديد، اختبار منفرد وتفاعلي، نشر واسترجاع مع runtime proof.

## المرحلة 3 — Assets & Presentation
- Asset library، Sprite Sheet editor، animation/audio/VFX.
- فحص النوع والأبعاد، preview، استبدال آمن، dependencies.
**بوابة:** رفع ومعاينة وربط وتشغيل واسترجاع أصل من Studio.

## المرحلة 4 — World Construction
- World/Map Editor، grid، terrain، paths، entry/exit، obstacles، environment.
**بوابة:** خريطة جديدة تعمل من بيانات Studio.

## المرحلة 5 — Game Construction
- Level/Wave builder، objective/victory/defeat/event/difficulty.
- Game Mode framework وفق الأولوية.
**بوابة:** مرحلة وموجات قابلة للإنشاء والاختبار والمحاكاة والنشر.

## المرحلة 6 — Player & Progression
- player data، save، inventory، resources، unlocks، upgrades، tasks، achievements، rewards، migrations.
**بوابة:** تقدم محفوظ وموثوق، اختبار سلامة، تحكم Studio.

## المرحلة 7 — Economy & Monetization
- اقتصاد، متجر، أسعار، عملات، عروض، عناصر تجميلية، purchase validation، simulation.
**بوابة:** تغييرات اقتصادية آمنة قابلة للمحاكاة والتدقيق؛ لا خدمات دفع دون موافقة.

## المرحلة 8 — Simulation, Testing & Balance
- sandbox، unit/content/interaction/level tests، performance، compatibility، balance reports، regression.
**بوابة:** نتائج موثوقة، reproducible، لا نشر عند فشل شروط إلزامية.

## المرحلة 9 — Player Experience & Expansion
- tutorial، loops، challenges، replayability، collection، social/viral readiness، additional modes.
**بوابة:** تجربة لاعب واضحة واختبارات/تحليلات وفق نطاق كل ميزة.

## المرحلة 10 — Localization, Accessibility & Platform Readiness
- localization، RTL، Arabic، missing strings، accessibility options، responsive/mobile/touch، device compatibility.
**بوابة:** تحقق تجربة لكل نطاق لغة/جهاز ضمن المعلن، لا ادعاء دعم غير مختبر.

## المرحلة 11 — Release & Operations
- environments، release bundles، staging، production، monitoring، incident handling، rollback، live operations، analytics، scheduling.
**بوابة:** نشر متماسك، مراقبة واسترجاع وإجراءات incident موثقة.

## المرحلة 12 — AI-Assisted Studio & Continuous Expansion
- conversational change workflow، impact analysis، proposals، code/content assistance، test generation، diagnostics.
- يبدأ تصميم التكامل الآمن من مراحل الأساس، ويكتمل تدريجيًا؛ لا يفترض API مدفوع أو نشر تلقائي.
**بوابة:** سير عمل آمن، قابل للمراجعة، موثق، ويعرض نتائج الاختبارات الفعلية.

## التبعيات الحاكمة
- Dependency/versioning قبل نشر المحتوى المركب.
- Map data قبل Level Builder.
- Engine capabilities قبل سلوك غير موجود.
- Save/data integrity قبل progression/economy.
- test/simulation قبل releases.
- releases/monitoring قبل Live Ops واسعة.
- AI workflow يبنى فوق مراجعة آمنة وversion control وtests.

## الأولويات
P0: blockers، أمان، فقد بيانات، أخطاء تشغيل أو نشر، بوابة المرحلة. P1: متطلبات المرحلة. P2: تحسينات. P3: توسعات مستقبلية (Multiplayer، منصات إضافية، اجتماعي واسع). لا يشتت P2/P3 المرحلة الحالية دون مبرر.
