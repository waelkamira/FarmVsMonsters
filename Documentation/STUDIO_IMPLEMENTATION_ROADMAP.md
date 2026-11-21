# خارطة التنفيذ المرحلية — FarmVsMonsters وStudio

**الحالة:** خارطة التنفيذ المعتمدة حاليًا؛ المرحلة 1 نشطة بعد قرار المستخدم بإغلاق المرحلة 0 لأغراض الانتقال بتاريخ 2026-11-21. مهام الاختبار والبناء غير المنفذة تُتابع بالتوازي ولا تُعد ناجحة قبل تشغيلها.

## قواعد التنفيذ
- مرحلة واحدة قيد التنفيذ في كل وقت، مع استثناء الأعمال التوثيقية/التحضيرية التي لا تتجاوز بوابة المرحلة.
- كل ميزة: تصميم → تنفيذ → API/Validation/Storage → Runtime → اختبار → تحقق متصفح → توثيق.
- لا دمج إلى main دون موافقة صريحة.
- لا خدمات مدفوعة دون موافقة.
- لا Terminal للعمليات اليومية.
- لا ادعاء نتائج غير متحققة.
- المسار النشط Next.js/React/Phaser داخل web/؛ لا Rewrite شامل ولا نقل إلى المشاريع التاريخية.

## المرحلة 0 — Audit & Baseline (مغلقة للانتقال)
- تدقيق المستودع والفروع وPRs، الصفحات وAPI.
- جرد مصادر بيانات المحتوى والأصول والأنيميشن والاختبارات.
- مصفوفة Studio→API→Service→Storage→Runtime→Engine.
- اختبار Browser/Chrome ومسارات اللعب وأصول Bamboo Throwing.
- تحقق Node tests، ESLint، Production Build في Runner أو Windows.
- تحديد الفجوات والخطوات القابلة لإعادة الإنتاج.
**نتيجة الانتقال:** حُفظت خريطة أساسية، ورُوجعت الفروع المتراكبة ودُمجت العناصر الأساسية. أكد المستخدم نجاح Bamboo Throwing. اختبارات CI الشاملة وESLint وBuild ما زالت غير متاحة بسبب Runner لم يبدأ أي خطوة؛ تُتابع هذه العناصر كمهام متوازية، ولا تمنع بدء التطوير.

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


## حالة خارطة التنفيذ الحالية — 2026-11-21

**المرحلة النشطة: المرحلة 1 — Studio Foundation & Game Architecture.**

تم دمج أساس Studio وإدارة الأصول ودورة النبات والاختبار والنشر، مع دمج أعمال Fire Pepper/Electric Mushroom. تبدأ المرحلة 1 من هذا الأساس بدل إعادة تدقيق المستودع بالكامل.



### تحديث تنفيذ 2026-11-21
- أُصلحت حقول إعدادات القذيفة الأربع لتظهر في الإضافة والتعديل مع إبقاء اختيار سلوك النبتة يدويًا؛ دُمج PR #54.
- أُصلح إغلاق دالة `createProjectileImpact` التي كانت تمنع تحليل `BattleScene.js`؛ دُمج PR #55.
- دُمج PR #56 لمسار النشر عبر فرع إصدار وPull Request؛ أصبح `main` لا يتلقى ملفات النبتة أو الكتالوج مباشرة من زر Studio.
- دُمج PR #57 للأرشفة والاستعادة القابلتين للعكس للمسودات والنباتات قيد الاختبار، مع الاحتفاظ بالأصول ومنع أرشفة المحتوى المنشور أو طلبات المراجعة المفتوحة.
- يجري تنفيذ سجل إصدارات لكل أصل واستعادة إصدار سابق كمسودة جديدة دون المساس بالإصدار المنشور؛ قيد المراجعة في PR جديد.
- يجري تنفيذ مسار طلب النشر عبر فرع إصدار وPull Request بدل الكتابة المباشرة إلى `main`؛ لا تُعتبر هذه المهمة مكتملة قبل اجتياز CI والتحقق من إنشاء PR وحالاته.
- ما زال GitHub Actions لا يخصص Runner للوظيفة (`runner_id=0` وبدون خطوات)، لذلك لم يبدأ Node tests أو ESLint أو Production Build.
### أولويات المرحلة 1 الحالية
1. تثبيت العقود الموحدة للمحتوى والسلوك والأصول والإصدارات.
2. جعل كل عناصر Studio قابلة للفتح والتعديل دائمًا للمسؤول، بما فيها العناصر المنشورة؛ أي تعديل على منشور ينشئ مسودة إصدار جديدة.
3. إكمال حقول سلوك النبات مع وصف موجز لكل حقل، وإعدادات المقذوفات المدعومة من المحرك.
4. إكمال ربط كتالوج النباتات المنشور والاختبار مع قائمة اختيار البذور وPhaser؛ حد السبعة للتشكيلة فقط وليس لعدد محتوى المرحلة.
5. جعل طلب النشر يمر عبر فرع إصدار وPull Request للمراجعة، مع منع الكتابة المباشرة إلى main، والتحقق من حالة الطلب بعد الدمج أو الإغلاق. متابعة حماية التزامن والتراجع والتعامل مع فشل تجهيز الإصدار.
6. استكمال الاختبارات وCI بالتوازي مع التطوير، وعدم إصدار Production قبل تحقق فعلي.
