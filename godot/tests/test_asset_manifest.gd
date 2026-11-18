extends SceneTree

const REQUIRED_TEXTURES := [
	"res://assets/characters/farmer/farmer-idle.png",
	"res://assets/monsters/hyena/hyena-idle.png",
	"res://assets/plants/radish-level-1.png",
	"res://assets/plants/mushroom.png",
	"res://assets/plants/pumpkin.png",
	"res://assets/plants/pineapple-level-1.png",
	"res://assets/plants/hazelnut-level-1.png",
	"res://assets/plants/mango-level-1.png",
	"res://assets/projectiles/radish-bomb.png",
	"res://assets/projectiles/pineapple-bomb.png",
	"res://assets/projectiles/hazelnut-bomb.png",
	"res://assets/projectiles/mango-bomb.png"
]

func _initialize() -> void:
	var failures := 0
	for path in REQUIRED_TEXTURES:
		if not ResourceLoader.exists(path):
			push_error("Missing Godot art resource: %s" % path)
			failures += 1
			continue
		var texture := load(path) as Texture2D
		if texture == null:
			push_error("Could not load Godot texture: %s" % path)
			failures += 1
	if failures == 0:
		print("ASSET_MANIFEST_OK: %d textures found and loadable." % REQUIRED_TEXTURES.size())
	else:
		push_error("ASSET_MANIFEST_FAILED: %d resource errors." % failures)
	quit(1 if failures > 0 else 0)
