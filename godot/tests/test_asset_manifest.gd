extends SceneTree

const REQUIRED_TEXTURES := [
	"res://assets/characters/farmer/farmer-idle.png",
	"res://assets/characters/farmer/farmer-walk.png",
	"res://assets/characters/farmer/farmer-run.png",
	"res://assets/characters/farmer/farmer-attack.png",
	"res://assets/characters/farmer/farmer-jump.png",
	"res://assets/characters/farmer/farmer-plant.png",
	"res://assets/characters/farmer/farmer-uproot.png",
	"res://assets/characters/farmer/farmer-collect.png",
	"res://assets/characters/farmer/farmer-hit.png",
	"res://assets/characters/farmer/farmer-death.png",
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


const FARMER_SHEET_CONTRACTS := [
	{"path": "res://assets/characters/farmer/farmer-jump.png", "size": Vector2i(1080, 720), "frame_size": Vector2i(216, 720), "frames": 5},
	{"path": "res://assets/characters/farmer/farmer-plant.png", "size": Vector2i(2160, 430), "frame_size": Vector2i(360, 430), "frames": 6},
	{"path": "res://assets/characters/farmer/farmer-uproot.png", "size": Vector2i(2160, 430), "frame_size": Vector2i(360, 430), "frames": 6},
	{"path": "res://assets/characters/farmer/farmer-collect.png", "size": Vector2i(1080, 360), "frame_size": Vector2i(180, 360), "frames": 6},
	{"path": "res://assets/characters/farmer/farmer-hit.png", "size": Vector2i(914, 430), "frame_size": Vector2i(152, 430), "frames": 6},
	{"path": "res://assets/characters/farmer/farmer-death.png", "size": Vector2i(914, 430), "frame_size": Vector2i(152, 430), "frames": 6}
]

const REQUIRED_AUDIO := [
	"res://assets/audio/sfx/coin-collect.ogg",
	"res://assets/audio/sfx/defeat.ogg",
	"res://assets/audio/sfx/grass-step-01.ogg",
	"res://assets/audio/sfx/grass-step-02.ogg",
	"res://assets/audio/sfx/monster-bite.ogg",
	"res://assets/audio/sfx/monster-defeat.ogg",
	"res://assets/audio/sfx/monster-hit.ogg",
	"res://assets/audio/sfx/monster-jump.ogg",
	"res://assets/audio/sfx/monster-land.ogg",
	"res://assets/audio/sfx/plant-dig.ogg",
	"res://assets/audio/sfx/plant-rustle.ogg",
	"res://assets/audio/sfx/thorn-impact.ogg",
	"res://assets/audio/sfx/thorn-launch.ogg",
	"res://assets/audio/sfx/victory.ogg"
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
	for contract in FARMER_SHEET_CONTRACTS:
		var sheet := load(str(contract.path)) as Texture2D
		var expected_size := Vector2(float(contract.size.x), float(contract.size.y))
		if sheet == null or sheet.get_size() != expected_size:
			push_error("Farmer sheet dimensions changed: %s" % str(contract.path))
			failures += 1
		elif int(contract.frame_size.x) * int(contract.frames) > int(sheet.get_width()) or int(contract.frame_size.y) > int(sheet.get_height()):
			push_error("Farmer frame contract exceeds sheet width: %s" % str(contract.path))
			failures += 1
	for path in REQUIRED_AUDIO:
		if not ResourceLoader.exists(path):
			push_error("Missing Godot audio resource: %s" % path)
			failures += 1
			continue
		var stream := load(path) as AudioStream
		if stream == null:
			push_error("Could not load Godot audio resource: %s" % path)
			failures += 1
	if not FileAccess.file_exists("res://data/farm_grid_calibration.json"):
		push_error("Missing approved 8x5 perspective calibration JSON.")
		failures += 1
	else:
		var calibration := JSON.parse_string(FileAccess.get_file_as_string("res://data/farm_grid_calibration.json"))
		if calibration == null or int(calibration.grid.columns) != 8 or int(calibration.grid.rows) != 5 or calibration.grid.controlPoints.size() != 6:
			push_error("Perspective calibration dimensions are invalid.")
			failures += 1
		else:
			var rows_valid := true
			for control_row in calibration.grid.controlPoints:
				if control_row.size() != 9:
					push_error("Perspective calibration must contain nine control points per row.")
					failures += 1
					rows_valid = false
					break
			if rows_valid:
				for row in range(5):
					for column in range(8):
						var polygon: Array = [
							calibration.grid.controlPoints[row][column],
							calibration.grid.controlPoints[row][column + 1],
							calibration.grid.controlPoints[row + 1][column + 1],
							calibration.grid.controlPoints[row + 1][column]
						]
						var twice_area := 0.0
						for index in range(4):
							var current: Dictionary = polygon[index]
							var next: Dictionary = polygon[(index + 1) % 4]
							twice_area += float(current.x) * float(next.y) - float(next.x) * float(current.y)
						if twice_area <= 1.0:
							push_error("Perspective cell polygon has invalid area at row %d, column %d." % [row, column])
							failures += 1
	if failures == 0:
		print("ASSET_MANIFEST_OK: %d textures, %d audio streams and the 8x5 calibration are loadable." % [REQUIRED_TEXTURES.size(), REQUIRED_AUDIO.size()])
	else:
		push_error("ASSET_MANIFEST_FAILED: %d resource errors." % failures)
	quit(1 if failures > 0 else 0)
