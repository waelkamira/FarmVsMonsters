# FARM VS MONSTERS

لعبة دفاع ومزرعة ثنائية الأبعاد بأسلوب كرتوني وشخصيات أصلية.

## القرار التقني الحالي — 2026-11-19

- **محرك التطوير واللعب الأساسي: Phaser 3** داخل تطبيق Next.js الموجود في مجلد `web/`.
- **طريقة التطوير والاختبار:** تشغيل اللعبة محلياً في Google Chrome على Windows. يجب أن تكون تجربة المتصفح ممكنة خلال التطوير، لا بعد اكتمال اللعبة فقط.
- **Godot:** مشروع تجريبي محفوظ في `godot/` كمرجع فقط. تم إيقاف الترحيل إليه مؤقتاً؛ لا تضف ميزات جديدة إليه ولا تجعل بناءه شرطاً لمواصلة اللعبة.
- **Android APK:** ليس ضمن العمل الحالي. عند اكتمال اللعبة نختار طريقة تغليف نسخة Phaser/الويب لإنتاج APK، بعد اختبارها، من دون إعادة كتابة اللعبة في محرك آخر.

هذا القرار يحل محل خطة ترحيل Godot السابقة. لا نحذف ملفات Godot أو أصوله أو الاختبارات السابقة؛ نحتفظ بها بأمان ولا نخلطها مع مسار التطوير النشط.

## تشغيل اللعبة في Chrome

1. افتح مجلد `web/` وثبّت Node.js LTS مرة واحدة إذا لم يكن مثبتاً.
2. انقر نقراً مزدوجاً على `web/OPEN_IN_CHROME.bat`.
3. في أول تشغيل يقوم الملف بتثبيت اعتماديات المشروع تلقائياً، ثم يبدأ خادم التطوير ويفتح `http://localhost:3000` في Chrome.
4. اترك نافذة التشغيل مفتوحة أثناء اللعب. أوقف الخادم بإغلاقها أو الضغط على Ctrl+C.

التشغيل محلي على جهازك ولا ينشر اللعبة على الإنترنت. التفاصيل في [web/README.md](web/README.md).

## قواعد اللعب المعتمدة

- النباتات ثابتة في خلاياها وتهاجم من موضعها.
- الوحوش تتقدم عبر المسارات نحو المزرعة.
- رجل الكهف يزرع النباتات؛ ويستخدم العصا في وضع الطوارئ عندما تفقد المزرعة دفاعاتها.
- المراحل والموجات والاقتصاد والقتال تطوّر داخل Phaser وتختبر في Chrome.

## بنية المستودع

- `web/`: المشروع النشط (Next.js + React + Phaser 3)، الأصول، قواعد اللعب، الاختبارات.
- `godot/`: تجربة Godot مؤرشفة مؤقتاً؛ لا تعتمد عليها نسخة التطوير الحالية.
- `Documentation/`: مواصفات اللعبة وسجلات القرارات والتصميم.

لا تحذف أو تستبدل الأصول الأصلية أثناء التطوير. اختبر التغييرات الفعلية في Chrome قبل اعتبار أي ميزة مكتملة.


## Current product strategy

The active strategy is a connected farm-and-battle world, with polished core gameplay and organic player discovery as the first growth priority. The current execution plan is documented here:

- [Game vision](Documentation/GAME_VISION.md)
- [Master roadmap](Documentation/MASTER_ROADMAP.md)
- [Game systems architecture](Documentation/GAME_SYSTEMS_ARCHITECTURE.md)
- [Phase 0 source audit](Documentation/PHASE_ZERO_AUDIT.md)
- [Game design document](Documentation/GAME_DESIGN_DOCUMENT.md)
