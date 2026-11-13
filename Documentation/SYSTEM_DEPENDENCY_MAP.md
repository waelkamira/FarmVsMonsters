# System Dependency Map

Input → Farmer/Camera/UI. ScriptableObject content → Unit/Stage/Wave runtime instances. Placement → Grid/Occupancy + Economy. Combat → Health/Targeting/Projectiles/Status Effects. Wave Director → Enemy Spawner + Enemy AI → Battle State. Battle Results → Progression/Rewards → Farm/Inventory → Save System.

Keep Core independent of feature modules. UI calls application-facing gameplay services rather than directly mutating unrelated systems.