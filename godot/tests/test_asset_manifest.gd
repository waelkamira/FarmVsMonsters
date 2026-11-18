extends SceneTree

const REQUIRED_TEXTURES := [
	"res://assets/characters/farmer/farmer-idle.png",
	"res://assets/characters/farmer/farmer-walk.png",
	"res://assets/characters/farmer/farmer-run.png",
	"res://assets/characters/farmer/farmer-attack.png",
	"res://assets/backgrounds/farm-battlefield.jpeg",
	"res://assets/characters/monsters/hyena/hyena-idle.png",
	"res://assets/monsters/hyena/hyena-walk.png",
	"res://assets/monsters/hyena/hyena-run.png",
	"res://assets/monsters/hyena/hyena-bite.png",
	"res://assets/monsters/hyena/hyena-hit.png",
	"res://assets/monsters/hyena/hyena-death.png",
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
	if not FileAccess.file_exists("res://data/farm_grid_calibration.json"):
		push_error("Missing approved 8x5 perspective calibration JSON.")
		failures += 1
	else:
		var calibration := JSON.parse_string(FileAccess.get_file_as_string("res://data/farm_grid_calibration.json"))
		if calibration == null or int(calibration.grid.columns) != 8 or int(calibration.grid.rows) != 5 or calibration.grid.controlPoints.size() != 6:
			push_error("Perspective calibration dimensions are invalid.")
			failures += 1
		elif calibration.grid.controlPoints[0].size() != 9:
			push_error("Perspective calibration must contain nine control points per row.")
			failures += 1
	if failures == 0:
		print("ASSET_MANIFEST_OK: %d textures and the 8x5 calibration are loadable." % REQUIRED_TEXTURES.size())
	else:
		push_error("ASSET_MANIFEST_FAILED: %d resource errors." % failures)
	quit(1 if failures > 0 else 0)
