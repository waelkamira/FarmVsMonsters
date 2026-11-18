extends Control
## First playable Stage 1 combat loop using the approved perspective board,
## original character sheets and temporary archetype-specific monster tints.

const Rules = preload("res://scripts/phase_one_rules.gd")
const MENU_SCENE := "res://scenes/main.tscn"
const SCREEN_SCALE := 720.0 / 680.0
const SCREEN_OFFSET_X := (1280.0 - 1120.0 * SCREEN_SCALE) * 0.5
const BACKGROUND_TOP := 41.333
const BACKGROUND_HEIGHT := 597.333
const FARMER_MOVE_SPEED := 115.0
const FARMER_CLUB_DAMAGE := 42.0
const FARMER_CLUB_REACH := 112.0
const PLANT_OPTIONS := ["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango"]
const PLANT_TEXTURES := {
	"radish": "res://assets/plants/radish-level-1.png",
	"mushroom": "res://assets/plants/mushroom.png",
	"pumpkin": "res://assets/plants/pumpkin.png",
	"pineapple": "res://assets/plants/pineapple-level-1.png",
	"hazelnut": "res://assets/plants/hazelnut-level-1.png",
	"mango": "res://assets/plants/mango-level-1.png"
}
const PLANT_PROJECTILES := {
	"radish": "res://assets/projectiles/radish-bomb.png",
	"pineapple": "res://assets/projectiles/pineapple-bomb.png",
	"hazelnut": "res://assets/projectiles/hazelnut-bomb.png",
	"mango": "res://assets/projectiles/mango-bomb.png"
}
const ANIMATED_PLANT_GRIDS := {
	"radish": Vector2i(3, 3), "pineapple": Vector2i(3, 3),
	"hazelnut": Vector2i(3, 3), "mango": Vector2i(3, 3)
}

var energy: int = Rules.INITIAL_ENERGY
var selected_plant := "radish"
var plants: Array[Dictionary] = []
var monsters: Array[Dictionary] = []
var projectiles: Array[Dictionary] = []
var wave := 1
var spawned_this_wave := 0
var defeated_total := 0
var coins := 0
var spawn_timer_ms := float(Rules.FIRST_MONSTER_SPAWN_DELAY_MS)
var intermission_ms := 0.0
var game_state := "running"
var status_label: Label
var energy_label: Label
var wave_label: Label
var rng := RandomNumberGenerator.new()
var grid_nodes: Array = []
var background_view: TextureRect
var farmer_sprite: AnimatedSprite2D
var attack_button: Button
var has_planted_defender := false
var farmer_is_moving := false
var farmer_locomotion_animation := "idle"
var farmer_action_animation := ""
var farmer_touch_directions := {"left": false, "right": false, "up": false, "down": false}
var sprite_frames_cache: Dictionary = {}
var monster_sprite_frames: SpriteFrames
var audio_players: Array[AudioStreamPlayer] = []
var audio_stream_cache: Dictionary = {}
var audio_player_cursor := 0
var footstep_timer := 0.0

func _ready() -> void:
	rng.randomize()
	_load_grid_calibration()
	if grid_nodes.size() != Rules.BOARD_ROWS + 1:
		push_error("Live battle cannot start without the approved perspective grid.")
		return
	_build_background()
	_build_audio()
	_build_ui()
	_create_farmer_sprite()
	_position_farmer_at_start()
	queue_redraw()

func _process(delta: float) -> void:
	if game_state != "running":
		return
	var delta_ms := delta * 1000.0
	_update_spawning(delta_ms)
	_update_plants(delta_ms)
	_update_monsters(delta, delta_ms)
	if game_state != "running":
		_refresh_hud()
		queue_redraw()
		return
	_update_projectiles(delta)
	_update_farmer(delta)
	_update_wave_progress()
	_refresh_hud()
	queue_redraw()

func _build_audio() -> void:
	for index in range(8):
		var player := AudioStreamPlayer.new()
		player.name = "SfxVoice%d" % index
		player.volume_db = -5.0
		add_child(player)
		audio_players.append(player)

func _play_sfx(sound_id: String, pitch_variation: float = 0.0) -> void:
	if audio_players.is_empty():
		return
	var stream: AudioStream = audio_stream_cache.get(sound_id)
	if stream == null:
		stream = load("res://assets/audio/sfx/%s.ogg" % sound_id) as AudioStream
		if stream == null:
			push_warning("Missing sound effect: %s" % sound_id)
			return
		audio_stream_cache[sound_id] = stream
	var player: AudioStreamPlayer = audio_players[audio_player_cursor]
	audio_player_cursor = (audio_player_cursor + 1) % audio_players.size()
	player.stop()
	player.stream = stream
	player.pitch_scale = 1.0 + rng.randf_range(-pitch_variation, pitch_variation)
	player.play()

func _load_grid_calibration() -> void:
	var file := FileAccess.open("res://data/farm_grid_calibration.json", FileAccess.READ)
	if file == null:
		push_error("Missing approved farm grid calibration JSON.")
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Invalid farm grid calibration JSON.")
		return
	var grid_data: Dictionary = parsed.get("grid", {})
	if grid_data.is_empty():
		push_error("Farm grid calibration is missing its grid section.")
		return
	if int(grid_data.get("columns", 0)) != Rules.BOARD_COLUMNS or int(grid_data.get("rows", 0)) != Rules.BOARD_ROWS:
		push_error("Farm grid calibration dimensions do not match the combat board.")
		return
	grid_nodes.clear()
	for source_row in grid_data.get("controlPoints", []):
		if source_row.size() != Rules.BOARD_COLUMNS + 1:
			push_error("Each farm grid calibration row must have nine control points.")
			grid_nodes.clear()
			return
		var row: Array = []
		for point in source_row:
			row.append(Vector2(float(point.x), float(point.y)))
		grid_nodes.append(row)
	if grid_nodes.size() != Rules.BOARD_ROWS + 1:
		push_error("Farm grid calibration must have six control-point rows.")
		grid_nodes.clear()

func _build_background() -> void:
	background_view = TextureRect.new()
	background_view.texture = load("res://assets/backgrounds/farm-battlefield.jpeg") as Texture2D
	if background_view.texture == null:
		push_warning("Battlefield background texture could not be loaded; using the fallback canvas.")
	background_view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background_view.stretch_mode = TextureRect.STRETCH_SCALE
	background_view.position = Vector2(SCREEN_OFFSET_X, BACKGROUND_TOP * SCREEN_SCALE)
	background_view.size = Vector2(1120.0 * SCREEN_SCALE, BACKGROUND_HEIGHT * SCREEN_SCALE)
	background_view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	background_view.show_behind_parent = true
	background_view.z_index = -100
	add_child(background_view)

func _to_screen(source_point: Vector2) -> Vector2:
	return Vector2(SCREEN_OFFSET_X + source_point.x * SCREEN_SCALE,
		source_point.y * SCREEN_SCALE)

func _to_source(screen_point: Vector2) -> Vector2:
	return Vector2((screen_point.x - SCREEN_OFFSET_X) / SCREEN_SCALE,
		screen_point.y / SCREEN_SCALE)

func _cell_polygon(column: int, row: int) -> Array:
	return [
		grid_nodes[row][column],
		grid_nodes[row][column + 1],
		grid_nodes[row + 1][column + 1],
		grid_nodes[row + 1][column]
	]

func _point_in_polygon(point: Vector2, polygon: Array) -> bool:
	var inside := false
	var previous := polygon.size() - 1
	for current in range(polygon.size()):
		var a: Vector2 = polygon[current]
		var b: Vector2 = polygon[previous]
		var denominator := b.y - a.y
		if absf(denominator) < 0.000001:
			denominator = 0.000001
		var intersection_x := ((b.x - a.x) * (point.y - a.y)) / denominator + a.x
		var crosses := ((a.y > point.y) != (b.y > point.y)) and point.x < intersection_x
		if crosses:
			inside = not inside
		previous = current
	return inside

func _grid_cell_center(column: int, row: int) -> Vector2:
	var polygon := _cell_polygon(column, row)
	var twice_area := 0.0
	var center_x := 0.0
	var center_y := 0.0
	for index in range(polygon.size()):
		var current: Vector2 = polygon[index]
		var next: Vector2 = polygon[(index + 1) % polygon.size()]
		var cross := current.x * next.y - next.x * current.y
		twice_area += cross
		center_x += (current.x + next.x) * cross
		center_y += (current.y + next.y) * cross
	if absf(twice_area) < 0.0001:
		return _interpolate_cell(column, row, 0.5, 0.5)
	return Vector2(center_x, center_y) / (3.0 * twice_area)

func _interpolate_cell(column: int, row: int, u: float, v: float) -> Vector2:
	var polygon := _cell_polygon(column, row)
	return polygon[0] * (1.0 - u) * (1.0 - v) + polygon[1] * u * (1.0 - v) + polygon[2] * u * v + polygon[3] * (1.0 - u) * v

func _lane_point(local_x: float, row: int) -> Vector2:
	var width := Rules.BOARD_LANE_WIDTH
	var center_index := ((local_x + width * 0.5) / width) * float(Rules.BOARD_COLUMNS) - 0.5
	var left_column := floori(center_index)
	var first_column := clampi(left_column, 0, Rules.BOARD_COLUMNS - 2)
	var blend := center_index - float(first_column)
	var first := _grid_cell_center(first_column, row)
	var second := _grid_cell_center(first_column + 1, row)
	return first.lerp(second, blend)

func _cell_at_screen_position(screen_point: Vector2) -> Vector2i:
	var source_point := _to_source(screen_point)
	for row in range(Rules.BOARD_ROWS):
		for column in range(Rules.BOARD_COLUMNS):
			if _point_in_polygon(source_point, _cell_polygon(column, row)):
				return Vector2i(column, row)
	return Vector2i(-1, -1)

func _depth_scale(column: int, row: int) -> float:
	var polygon := _cell_polygon(column, row)
	var top_y := (polygon[0].y + polygon[1].y) * 0.5
	var bottom_y := (polygon[2].y + polygon[3].y) * 0.5
	var average_cell_height := (grid_nodes[Rules.BOARD_ROWS][0].y - grid_nodes[0][0].y) / float(Rules.BOARD_ROWS)
	return clampf((bottom_y - top_y) / average_cell_height, 0.62, 1.42)

func _nearest_row_at_screen_position(screen_point: Vector2) -> int:
	var source_y := _to_source(screen_point).y
	var nearest_row := 0
	var nearest_distance := INF
	for row in range(Rules.BOARD_ROWS):
		var lane_y := _grid_cell_center(0, row).y
		var distance := absf(lane_y - source_y)
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_row = row
	return nearest_row

func _plant_frame_width(plant_type: String) -> float:
	match plant_type:
		"radish": return 908.0 / 3.0
		"mushroom": return 353.0
		"pumpkin": return 500.0
		"pineapple": return 418.0
		"hazelnut": return 341.0
		"mango": return 360.0
	return 300.0

func _plant_half_width(plant: Dictionary) -> float:
	var base_scale := 0.15 if ANIMATED_PLANT_GRIDS.has(str(plant.type)) else 0.14
	return _plant_frame_width(str(plant.type)) * base_scale * float(plant.get("depth_scale", 1.0)) * 0.5

func _build_ui() -> void:
	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	add_child(margin)
	var layout := VBoxContainer.new()
	layout.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layout.add_theme_constant_override("separation", 8)
	margin.add_child(layout)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	layout.add_child(top)
	var title := Label.new()
	title.text = "FARM VS MONSTERS"
	title.add_theme_font_size_override("font_size", 22)
	top.add_child(title)
	energy_label = Label.new()
	energy_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(energy_label)
	wave_label = Label.new()
	top.add_child(wave_label)
	var choices := HBoxContainer.new()
	choices.add_theme_constant_override("separation", 7)
	layout.add_child(choices)
	for plant_id in PLANT_OPTIONS:
		var button := Button.new()
		button.text = "%s  %d" % [plant_id.capitalize(), Rules.plant_cost(plant_id)]
		button.custom_minimum_size = Vector2(132, 42)
		button.pressed.connect(_select_plant.bind(plant_id))
		choices.add_child(button)
	var menu := Button.new()
	menu.text = "Main Menu"
	menu.pressed.connect(_return_to_menu)
	choices.add_child(menu)
	status_label = Label.new()
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	layout.add_child(status_label)
	_refresh_hud()
	status_label.text = "Choose a defender and tap a field cell. Move the Farmer with WASD, arrows or the D-pad; the club unlocks when all Radishes are lost."
	_build_farmer_controls()

func _make_sheet_sprite(texture_path: String, columns: int, rows: int, fps: float,
		sprite_scale: float, animate_all_frames: bool = false) -> AnimatedSprite2D:
	var cache_key := "%s|%d|%d|%s|%s" % [texture_path, columns, rows, str(fps), str(animate_all_frames)]
	var frames: SpriteFrames = sprite_frames_cache.get(cache_key)
	if frames == null:
		var texture := load(texture_path) as Texture2D
		if texture == null:
			push_warning("Missing sprite texture: %s" % texture_path)
			return null
		frames = SpriteFrames.new()
		frames.add_animation("idle")
		frames.set_animation_speed("idle", fps)
		frames.set_animation_loop("idle", true)
		frames.add_animation("attack")
		frames.set_animation_speed("attack", fps)
		frames.set_animation_loop("attack", false)
		var cell_size := texture.get_size() / Vector2(float(columns), float(rows))
		if texture_path.ends_with("pineapple-level-1.png"):
			cell_size = Vector2(418.0, 418.0)
		elif texture_path.ends_with("hazelnut-level-1.png"):
			cell_size = Vector2(341.0, 341.0)
		for index in range(columns * rows):
			var atlas := AtlasTexture.new()
			atlas.atlas = texture
			atlas.region = Rect2(Vector2(float(index % columns) * cell_size.x,
				float(index / columns) * cell_size.y), cell_size)
			if animate_all_frames:
				frames.add_frame("idle", atlas)
			elif index == 0:
				frames.add_frame("idle", atlas)
			else:
				frames.add_frame("attack", atlas)
		sprite_frames_cache[cache_key] = frames
	var sprite := AnimatedSprite2D.new()
	sprite.sprite_frames = frames
	sprite.animation = "idle"
	sprite.scale = Vector2.ONE * sprite_scale
	sprite.play("idle")
	return sprite

func _append_sheet_animation(frames: SpriteFrames, animation_name: String,
		texture_path: String, columns: int, rows: int, fps: float, loop_animation: bool,
		explicit_frame_size: Vector2 = Vector2.ZERO) -> bool:
	var texture := load(texture_path) as Texture2D
	if texture == null:
		push_warning("Missing animation texture: %s" % texture_path)
		return false
	frames.add_animation(animation_name)
	frames.set_animation_speed(animation_name, fps)
	frames.set_animation_loop(animation_name, loop_animation)
	var cell_size: Vector2 = explicit_frame_size if explicit_frame_size.x > 0.0 and explicit_frame_size.y > 0.0 else texture.get_size() / Vector2(float(columns), float(rows))
	for index in range(columns * rows):
		var atlas := AtlasTexture.new()
		atlas.atlas = texture
		atlas.region = Rect2(Vector2(float(index % columns) * cell_size.x,
			float(index / columns) * cell_size.y), cell_size)
		frames.add_frame(animation_name, atlas)
	return true

func _make_monster_sprite(archetype: String, sprite_scale: float) -> AnimatedSprite2D:
	if monster_sprite_frames == null:
		monster_sprite_frames = SpriteFrames.new()
		_append_sheet_animation(monster_sprite_frames, "idle", "res://assets/characters/monsters/hyena/hyena-idle.png", 3, 1, 4.0, true)
		_append_sheet_animation(monster_sprite_frames, "walk", "res://assets/monsters/hyena/hyena-walk.png", 3, 3, 8.0, true)
		_append_sheet_animation(monster_sprite_frames, "run", "res://assets/monsters/hyena/hyena-run.png", 3, 3, 12.0, true)
		_append_sheet_animation(monster_sprite_frames, "bite", "res://assets/monsters/hyena/hyena-bite.png", 3, 2, 8.0, true)
		_append_sheet_animation(monster_sprite_frames, "hit", "res://assets/monsters/hyena/hyena-hit.png", 3, 1, 12.0, false)
		_append_sheet_animation(monster_sprite_frames, "death", "res://assets/monsters/hyena/hyena-death.png", 3, 2, 8.0, false)
	var sprite := AnimatedSprite2D.new()
	sprite.sprite_frames = monster_sprite_frames
	sprite.animation = "run" if archetype == "dust-skitter" else "walk"
	sprite.set_meta("archetype", archetype)
	sprite.scale = Vector2.ONE * sprite_scale
	sprite.play()
	sprite.animation_finished.connect(_on_monster_animation_finished.bind(sprite))
	return sprite

func _on_monster_animation_finished(sprite: AnimatedSprite2D) -> void:
	if not is_instance_valid(sprite):
		return
	if sprite.animation == "hit":
		var archetype := str(sprite.get_meta("archetype", "cave-brute"))
		sprite.play("run" if archetype == "dust-skitter" else "walk")
	elif sprite.animation == "death":
		sprite.queue_free()

func _create_farmer_sprite() -> void:
	var frames := SpriteFrames.new()
	_append_sheet_animation(frames, "idle", "res://assets/characters/farmer/farmer-idle.png", 2, 2, 1.5, true)
	_append_sheet_animation(frames, "walk", "res://assets/characters/farmer/farmer-walk.png", 8, 1, 6.0, true)
	_append_sheet_animation(frames, "run", "res://assets/characters/farmer/farmer-run.png", 6, 1, 8.0, true)
	_append_sheet_animation(frames, "attack", "res://assets/characters/farmer/farmer-attack.png", 6, 1, 8.0, false)
	_append_sheet_animation(frames, "plant", "res://assets/characters/farmer/farmer-plant.png", 6, 1, 8.0, false, Vector2(360.0, 430.0))
	_append_sheet_animation(frames, "uproot", "res://assets/characters/farmer/farmer-uproot.png", 6, 1, 8.0, false, Vector2(360.0, 430.0))
	_append_sheet_animation(frames, "collect", "res://assets/characters/farmer/farmer-collect.png", 6, 1, 8.0, false, Vector2(180.0, 360.0))
	_append_sheet_animation(frames, "jump", "res://assets/characters/farmer/farmer-jump.png", 5, 1, 6.0, false, Vector2(216.0, 720.0))
	_append_sheet_animation(frames, "hit", "res://assets/characters/farmer/farmer-hit.png", 6, 1, 8.0, false, Vector2(152.0, 430.0))
	_append_sheet_animation(frames, "death", "res://assets/characters/farmer/farmer-death.png", 6, 1, 6.0, false, Vector2(152.0, 430.0))
	farmer_sprite = AnimatedSprite2D.new()
	farmer_sprite.sprite_frames = frames
	farmer_sprite.animation = "idle"
	farmer_sprite.scale = Vector2.ONE * 0.25
	farmer_sprite.position = Vector2.ZERO
	farmer_sprite.z_index = 12
	farmer_sprite.animation_finished.connect(_on_farmer_animation_finished)
	add_child(farmer_sprite)
	farmer_sprite.play("idle")

func _position_farmer_at_start() -> void:
	if farmer_sprite == null:
		return
	var source_position := Vector2(220.0, _grid_cell_center(0, 2).y)
	farmer_sprite.position = _to_screen(source_position)
	var scale_factor := 0.25 * _depth_scale(4, 2)
	farmer_sprite.scale = Vector2.ONE * scale_factor
	farmer_sprite.z_index = int(farmer_sprite.position.y)

func _build_farmer_controls() -> void:
	var control_row := HBoxContainer.new()
	control_row.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	control_row.offset_left = 18.0
	control_row.offset_right = -18.0
	control_row.offset_top = -62.0
	control_row.offset_bottom = -8.0
	control_row.add_theme_constant_override("separation", 8)
	control_row.z_index = 1000
	add_child(control_row)
	var directions := HBoxContainer.new()
	directions.add_theme_constant_override("separation", 6)
	control_row.add_child(directions)
	var direction_buttons := [
		["left", "◀"], ["up", "▲"], ["down", "▼"], ["right", "▶"]
	]
	for item in direction_buttons:
		var direction: String = item[0]
		var button := Button.new()
		button.text = item[1]
		button.custom_minimum_size = Vector2(54.0, 48.0)
		button.button_down.connect(_set_farmer_touch_direction.bind(direction, true))
		button.button_up.connect(_set_farmer_touch_direction.bind(direction, false))
		directions.add_child(button)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control_row.add_child(spacer)
	attack_button = Button.new()
	attack_button.text = "CLUB"
	attack_button.custom_minimum_size = Vector2(112.0, 48.0)
	attack_button.visible = false
	attack_button.pressed.connect(_farmer_attack)
	control_row.add_child(attack_button)

func _set_farmer_touch_direction(direction: String, pressed: bool) -> void:
	farmer_touch_directions[direction] = pressed

func _on_farmer_animation_finished() -> void:
	if farmer_sprite == null or not is_instance_valid(farmer_sprite):
		return
	if not farmer_action_animation.is_empty() and farmer_sprite.animation == farmer_action_animation:
		farmer_action_animation = ""
		farmer_sprite.play(farmer_locomotion_animation)

func _play_farmer_action(animation_name: String) -> void:
	if farmer_sprite == null or not is_instance_valid(farmer_sprite):
		return
	if not farmer_sprite.sprite_frames.has_animation(animation_name):
		push_warning("Missing Farmer action animation: %s" % animation_name)
		return
	farmer_action_animation = animation_name
	farmer_sprite.play(animation_name)

func _update_farmer(delta: float) -> void:
	if farmer_sprite == null or not is_instance_valid(farmer_sprite):
		return
	var horizontal := 0.0
	var vertical := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		horizontal -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		horizontal += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		vertical -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		vertical += 1.0
	var touch_moving := false
	if farmer_touch_directions.left:
		horizontal -= 1.0
		touch_moving = true
	if farmer_touch_directions.right:
		horizontal += 1.0
		touch_moving = true
	if farmer_touch_directions.up:
		vertical -= 1.0
		touch_moving = true
	if farmer_touch_directions.down:
		vertical += 1.0
		touch_moving = true
	var movement := Vector2(horizontal, vertical)
	if movement.length_squared() > 1.0:
		movement = movement.normalized()
	farmer_is_moving = movement.length_squared() > 0.001
	if farmer_is_moving:
		var move_speed := FARMER_MOVE_SPEED * SCREEN_SCALE * (0.78 if touch_moving else 1.0)
		farmer_sprite.position += movement * move_speed * delta
		var min_x := _to_screen(Vector2(105.0, 0.0)).x
		var max_x := _to_screen(Vector2(1010.0, 0.0)).x
		var min_y := _to_screen(Vector2(0.0, _grid_cell_center(0, 0).y - 22.0)).y
		var max_y := _to_screen(Vector2(0.0, _grid_cell_center(0, 4).y + 22.0)).y
		farmer_sprite.position.x = clampf(farmer_sprite.position.x, min_x, max_x)
		farmer_sprite.position.y = clampf(farmer_sprite.position.y, min_y, max_y)
		if absf(movement.x) > 0.01:
			farmer_sprite.scale.x = absf(farmer_sprite.scale.x) * signf(movement.x)
		farmer_locomotion_animation = "walk" if touch_moving else "run"
		footstep_timer -= delta
		if footstep_timer <= 0.0:
			_play_sfx("grass-step-01" if rng.randi_range(0, 1) == 0 else "grass-step-02", 0.06)
			footstep_timer = 0.36 if touch_moving else 0.28
	else:
		farmer_locomotion_animation = "idle"
		footstep_timer = 0.0
	var farmer_row := _nearest_row_at_screen_position(farmer_sprite.position)
	var facing := signf(farmer_sprite.scale.x)
	var visual_scale := 0.25 * _depth_scale(4, farmer_row)
	farmer_sprite.scale = Vector2(absf(visual_scale) * facing, visual_scale)
	farmer_sprite.z_index = int(farmer_sprite.position.y)
	if farmer_action_animation.is_empty() and farmer_sprite.animation != farmer_locomotion_animation:
		farmer_sprite.play(farmer_locomotion_animation)

func _farmer_can_attack() -> bool:
	if not has_planted_defender:
		return false
	for plant in plants:
		if plant.alive and plant.type == "radish":
			return false
	return true

func _farmer_attack() -> void:
	if game_state != "running":
		return
	if farmer_sprite == null or not is_instance_valid(farmer_sprite):
		return
	if not _farmer_can_attack():
		status_label.text = "The club is an emergency defense. It unlocks after all planted Radishes are lost."
		return
	_play_farmer_action("attack")
	var nearest_row := _nearest_row_at_screen_position(farmer_sprite.position)
	var target: Variant = Rules.select_farmer_melee_target(
		monsters, nearest_row, farmer_sprite.position.x, FARMER_CLUB_REACH * SCREEN_SCALE)
	if target == null:
		status_label.text = "No monster is close enough for the club."
		return
	var club_multiplier := float(target.incoming_damage_multiplier)
	if str(target.kind) == "stonehide" and bool(target.braced):
		club_multiplier = Rules.stonehide_incoming_damage_multiplier(true)
	_play_sfx("monster-hit", 0.08)
	target.hp = Rules.apply_hit_points_damage(
		float(target.hp), FARMER_CLUB_DAMAGE * club_multiplier).hp
	var target_sprite: Variant = target.get("sprite", null)
	if target.hp <= 0.0:
		target.alive = false
		if target_sprite != null and is_instance_valid(target_sprite):
			target_sprite.play("death")
		defeated_total += 1
		coins += Rules.ORDINARY_MONSTER_DEFEAT_COINS
		_play_sfx("monster-defeat")
		_play_sfx("coin-collect", 0.04)
		status_label.text = "Club strike defeated a monster! +%d coins." % Rules.ORDINARY_MONSTER_DEFEAT_COINS
	elif target_sprite != null and is_instance_valid(target_sprite):
		target_sprite.play("hit")
		status_label.text = "Club hit!"

func _create_plant_sprite(plant_id: String) -> Node2D:
	var texture_path: String = PLANT_TEXTURES.get(plant_id, "")
	if texture_path.is_empty():
		return null
	if ANIMATED_PLANT_GRIDS.has(plant_id):
		var grid: Vector2i = ANIMATED_PLANT_GRIDS[plant_id]
		var animated := _make_sheet_sprite(texture_path, grid.x, grid.y, 9.0, 0.15)
		if animated != null:
			animated.animation_finished.connect(_on_plant_animation_finished.bind(animated))
			animated.z_index = 10
		return animated
	var sprite := Sprite2D.new()
	sprite.texture = load(texture_path) as Texture2D
	sprite.scale = Vector2(0.14, 0.14)
	sprite.z_index = 10
	return sprite

func _on_plant_animation_finished(sprite: AnimatedSprite2D) -> void:
	if is_instance_valid(sprite):
		sprite.play("idle")

func _create_projectile_sprite(plant_id: String) -> Sprite2D:
	var texture_path: String = PLANT_PROJECTILES.get(plant_id, "")
	if texture_path.is_empty():
		return null
	var sprite := Sprite2D.new()
	sprite.texture = load(texture_path) as Texture2D
	sprite.scale = Vector2(0.32, 0.32)
	sprite.z_index = 14
	return sprite

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_SPACE:
		_farmer_attack()

func _select_plant(plant_id: String) -> void:
	if game_state != "running":
		return
	selected_plant = plant_id
	status_label.text = "Selected: %s — tap an empty cell." % plant_id.capitalize()

func _gui_input(event: InputEvent) -> void:
	if game_state != "running":
		return
	var tap_position := Vector2.ZERO
	if event is InputEventMouseButton:
		var mouse := event as InputEventMouseButton
		if mouse.button_index != MOUSE_BUTTON_LEFT or not mouse.pressed:
			return
		tap_position = mouse.position
	elif event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if not touch.pressed:
			return
		tap_position = touch.position
	else:
		return
	var cell := _cell_at_screen_position(tap_position)
	if cell.x < 0 or cell.y < 0:
		return
	_place_plant(cell.x, cell.y)
	accept_event()

func _place_plant(column: int, row: int) -> void:
	var placement := Rules.resolve_plant_placement(float(energy), plants, selected_plant, column, row)
	if not placement.get("ok", false):
		status_label.text = "Cannot plant: %s" % str(placement.get("reason", "unknown")).replace("_", " ").to_lower()
		return
	var plant: Dictionary = placement.plant.duplicate(true)
	var source_position := _grid_cell_center(column, row)
	if row < 3:
		source_position.y -= 5.0
	var screen_position := _to_screen(source_position)
	var depth_scale := _depth_scale(column, row)
	plant["x"] = screen_position.x
	plant["y"] = screen_position.y
	plant["local_x"] = Rules.plant_lane_local_x(column)
	plant["depth_scale"] = depth_scale
	plant["cooldown_ms"] = 450.0
	plant["production_ms"] = float(Rules.PLANTS[selected_plant].get("production_interval_ms", 0.0))
	var plant_sprite := _create_plant_sprite(selected_plant)
	if plant_sprite != null:
		plant_sprite.position = screen_position
		plant_sprite.scale *= depth_scale
		plant_sprite.z_index = int(screen_position.y)
		add_child(plant_sprite)
	plant["sprite"] = plant_sprite
	plants.append(plant)
	_play_farmer_action("plant")
	has_planted_defender = true
	energy = int(placement.energy)
	_play_sfx("plant-dig")
	status_label.text = "%s planted in lane %d." % [selected_plant.capitalize(), row + 1]
	_refresh_hud()

func _update_spawning(delta_ms: float) -> void:
	if spawned_this_wave >= Rules.WAVE_SIZES[wave - 1]:
		return
	if intermission_ms > 0.0:
		intermission_ms = maxf(0.0, intermission_ms - delta_ms)
		if intermission_ms > 0.0:
			return
	spawn_timer_ms -= delta_ms
	if spawn_timer_ms <= 0.0:
		_spawn_monster()
		spawned_this_wave += 1
		spawn_timer_ms = Rules.monster_spawn_interval_ms(wave)

func _spawn_monster() -> void:
	var archetype := Rules.monster_archetype(wave, _global_spawn_index())
	var profile := Rules.monster_combat_stats(archetype, wave)
	var row := rng.randi_range(0, Rules.BOARD_ROWS - 1)
	var local_x := Rules.BOARD_SPAWN_LOCAL_X
	var depth_scale := _depth_scale(4, row)
	var screen_position := _to_screen(_lane_point(local_x, row))
	var monster_sprite := _make_monster_sprite(archetype,
		0.22 * float(profile.width_scale) * depth_scale)
	if monster_sprite != null:
		monster_sprite.position = screen_position
		monster_sprite.z_index = int(screen_position.y)
		match archetype:
			"dust-skitter": monster_sprite.modulate = Color("#b4d39c")
			"stonehide": monster_sprite.modulate = Color("#a4b0b7")
			"alpha-brute": monster_sprite.modulate = Color("#c47b69")
		add_child(monster_sprite)
	monsters.append({
		"sprite": monster_sprite,
		"kind": archetype, "row": row, "local_x": local_x,
		"x": screen_position.x, "y": screen_position.y, "depth_scale": depth_scale,
		"hp": float(profile.hp), "max_hp": float(profile.max_hp),
		"speed": float(profile.speed), "width_scale": float(profile.width_scale),
		"plant_damage": float(profile.plant_damage), "attack_interval_ms": float(profile.attack_interval_ms),
		"attack_cooldown_ms": 0.0, "incoming_damage_multiplier": float(profile.incoming_damage_multiplier),
		"burst_cooldown_ms": rng.randf_range(float(profile.get("initial_burst_cooldown_min_ms", 0.0)), float(profile.get("initial_burst_cooldown_max_ms", 0.0))) if archetype == "dust-skitter" else 0.0,
		"burst_remaining_ms": 0.0, "burst_duration_ms": float(profile.get("burst_duration_ms", 0.0)),
		"burst_speed_multiplier": float(profile.get("burst_speed_multiplier", 1.0)),
		"burst_cooldown_min_ms": float(profile.get("burst_cooldown_min_ms", 0.0)),
		"burst_cooldown_max_ms": float(profile.get("burst_cooldown_max_ms", 0.0)), "burst_fx_ms": 0.0,
		"braced": false, "alive": true
	})
	status_label.text = "%s incoming — wave %d." % [archetype.replace("-", " ").capitalize(), wave]

func _global_spawn_index() -> int:
	var index := spawned_this_wave
	for prior_wave in range(wave - 1):
		index += Rules.WAVE_SIZES[prior_wave]
	return index

func _update_plants(delta_ms: float) -> void:
	for plant in plants:
		if not plant.alive:
			continue
		if plant.type == "mushroom":
			plant.production_ms = float(plant.get("production_ms", 12000.0)) - delta_ms
			if plant.production_ms <= 0.0:
				var previous_energy := energy
				energy = int(Rules.resolve_energy_pickup(float(energy), float(Rules.PLANTS.mushroom.energy_per_pickup)).energy)
				if energy > previous_energy:
					_play_sfx("coin-collect", 0.04)
				plant.production_ms = float(Rules.PLANTS.mushroom.production_interval_ms)
			continue
		if not Rules.PLANTS[plant.type].has("projectile_damage"):
			continue
		plant.cooldown_ms = float(plant.cooldown_ms) - delta_ms
		var target_found := false
		for monster in monsters:
			if monster.alive and int(monster.row) == int(plant.row) and float(monster.local_x) > float(plant.local_x) and float(monster.local_x) - float(plant.local_x) <= float(Rules.PLANTS[plant.type].range):
				target_found = true
				break
		if target_found and plant.cooldown_ms <= 0.0:
			var config: Dictionary = Rules.PLANTS[plant.type]
			var projectile_local_x := float(plant.local_x) + 8.0
			var projectile_position := _to_screen(_lane_point(projectile_local_x, int(plant.row)))
			var projectile_sprite := _create_projectile_sprite(str(plant.type))
			if projectile_sprite != null:
				projectile_sprite.position = projectile_position
				projectile_sprite.scale *= float(plant.depth_scale)
				projectile_sprite.z_index = int(projectile_position.y) + 2
				add_child(projectile_sprite)
			var plant_sprite: Variant = plant.get("sprite", null)
			if plant_sprite is AnimatedSprite2D:
				plant_sprite.play("attack")
			_play_sfx("thorn-launch", 0.06)
			projectiles.append({
				"sprite": projectile_sprite, "plant_type": str(plant.type), "local_x": projectile_local_x,
				"x": projectile_position.x, "y": projectile_position.y,
				"row": int(plant.row), "speed": float(config.projectile_speed),
				"radius": float(config.projectile_collision_radius),
				"depth_scale": float(plant.depth_scale),
				"damage": float(config.projectile_damage), "alive": true
			})
			plant.cooldown_ms = float(config.cooldown_ms)

func _update_monsters(delta: float, delta_ms: float) -> void:
	for monster in monsters:
		if not monster.alive:
			continue
		monster.burst_fx_ms = maxf(0.0, float(monster.get("burst_fx_ms", 0.0)) - delta_ms)
		var row := int(monster.row)
		var lane_step := absf(_to_screen(_lane_point(float(monster.local_x) + 1.0, row)).x - _to_screen(_lane_point(float(monster.local_x), row)).x)
		var monster_half_width := 360.0 * 0.22 * float(monster.depth_scale) * float(monster.width_scale) * 0.5
		var widest_plant_half_width := 0.0
		for plant in plants:
			if plant.alive and int(plant.row) == row:
				widest_plant_half_width = maxf(widest_plant_half_width, _plant_half_width(plant))
		var max_overshoot := (monster_half_width + widest_plant_half_width + 10.0 * SCREEN_SCALE) / maxf(0.01, lane_step)
		var blocker: Dictionary = _find_blocker(monster, max_overshoot)
		var within_bite_range := false
		if not blocker.is_empty():
			var blocker_lane_step := absf(_to_screen(_lane_point(float(blocker.local_x) + 1.0, row)).x - _to_screen(_lane_point(float(blocker.local_x), row)).x)
			var bite_reach := (monster_half_width + _plant_half_width(blocker) + 10.0 * SCREEN_SCALE) / maxf(0.01, blocker_lane_step)
			within_bite_range = float(monster.local_x) - float(blocker.local_x) <= bite_reach
		var movement_multiplier := _update_dust_skitter_burst(monster, delta_ms)
		if within_bite_range:
			monster.local_x = float(blocker.local_x)
			monster.braced = str(monster.kind) == "stonehide"
			var bite_position := _to_screen(_lane_point(float(monster.local_x), row))
			monster.x = bite_position.x
			monster.y = bite_position.y
			var blocked_sprite: Variant = monster.get("sprite", null)
			if blocked_sprite != null and is_instance_valid(blocked_sprite):
				blocked_sprite.position = bite_position
				blocked_sprite.z_index = int(bite_position.y)
				if blocked_sprite.animation != "bite" and blocked_sprite.animation != "hit" and blocked_sprite.animation != "death":
					blocked_sprite.play("bite")
			monster.attack_cooldown_ms = float(monster.attack_cooldown_ms) - delta_ms
			if monster.attack_cooldown_ms <= 0.0:
				_play_sfx("monster-bite", 0.05)
				blocker.hp = Rules.apply_hit_points_damage(float(blocker.hp), float(monster.plant_damage)).hp
				monster.attack_cooldown_ms = float(monster.attack_interval_ms)
				if blocker.hp <= 0.0:
					blocker.alive = false
					var destroyed_sprite: Variant = blocker.get("sprite", null)
					if destroyed_sprite != null and is_instance_valid(destroyed_sprite):
						destroyed_sprite.queue_free()
					status_label.text = "%s was destroyed!" % str(blocker.type).capitalize()
			continue
		monster.braced = false
		monster.local_x = float(monster.local_x) - float(monster.speed) * movement_multiplier * delta
		var monster_position := _to_screen(_lane_point(float(monster.local_x), row))
		monster.x = monster_position.x
		monster.y = monster_position.y
		var monster_sprite: Variant = monster.get("sprite", null)
		if monster_sprite != null and is_instance_valid(monster_sprite):
			monster_sprite.position = monster_position
			monster_sprite.z_index = int(monster_position.y)
			var moving_animation := "run" if str(monster.kind) == "dust-skitter" else "walk"
			if monster_sprite.animation != moving_animation and monster_sprite.animation != "hit" and monster_sprite.animation != "death":
				monster_sprite.play(moving_animation)
		if float(monster.local_x) <= Rules.BOARD_HOME_LOCAL_X:
			game_state = "defeat"
			_play_sfx("defeat")
			status_label.text = "The farmhouse has been overrun. Return to the main menu to start a new battle."
			return

func _update_dust_skitter_burst(monster: Dictionary, delta_ms: float) -> float:
	if str(monster.kind) != "dust-skitter":
		return 1.0
	var burst_will_start := float(monster.burst_cooldown_ms) - delta_ms <= 0.0 and float(monster.burst_remaining_ms) <= 0.0
	var next_burst_cooldown: Variant = null
	if burst_will_start:
		next_burst_cooldown = rng.randf_range(float(monster.burst_cooldown_min_ms), float(monster.burst_cooldown_max_ms))
	var motion := Rules.resolve_dust_skitter_motion_step({
		"is_jumping": false,
		"enable_jump": false,
		"delta_ms": delta_ms,
		"burst_cooldown_ms": float(monster.burst_cooldown_ms),
		"burst_remaining_ms": float(monster.burst_remaining_ms),
		"burst_duration_ms": float(monster.burst_duration_ms),
		"burst_speed_multiplier": float(monster.burst_speed_multiplier),
		"next_burst_cooldown_ms": next_burst_cooldown
	})
	if motion.is_empty():
		return 1.0
	monster.burst_cooldown_ms = float(motion.burst_cooldown_ms)
	monster.burst_remaining_ms = float(motion.burst_remaining_ms)
	if bool(motion.burst_started):
		monster.burst_fx_ms = 300.0
	return float(motion.movement_multiplier)

func _find_blocker(monster: Dictionary, max_overshoot: float) -> Dictionary:
	var nearest: Dictionary = {}
	var nearest_local_x := -INF
	for plant in plants:
		if not plant.alive or int(plant.row) != int(monster.row):
			continue
		var candidate_local_x := float(plant.local_x)
		if candidate_local_x - float(monster.local_x) > max_overshoot:
			continue
		if candidate_local_x > nearest_local_x:
			nearest = plant
			nearest_local_x = candidate_local_x
	return nearest

func _update_projectiles(delta: float) -> void:
	for projectile in projectiles:
		if not projectile.alive:
			continue
		projectile.local_x = float(projectile.local_x) + float(projectile.speed) * delta
		var projectile_position := _to_screen(_lane_point(float(projectile.local_x), int(projectile.row)))
		projectile.x = projectile_position.x
		projectile.y = projectile_position.y
		var projectile_sprite: Variant = projectile.get("sprite", null)
		if projectile_sprite != null and is_instance_valid(projectile_sprite):
			projectile_sprite.position = projectile_position
			projectile_sprite.z_index = int(projectile_position.y) + 2
		for monster in monsters:
			if not monster.alive or int(monster.row) != int(projectile.row):
				continue
			var hit_radius := float(projectile.radius) * float(monster.width_scale)
			if absf(float(monster.local_x) - float(projectile.local_x)) <= hit_radius:
				var damage_multiplier := float(monster.incoming_damage_multiplier)
				if str(monster.kind) == "stonehide" and bool(monster.braced):
					damage_multiplier = Rules.stonehide_incoming_damage_multiplier(true)
				monster.hp = Rules.apply_hit_points_damage(float(monster.hp), float(projectile.damage) * damage_multiplier).hp
				projectile.alive = false
				_play_sfx("thorn-impact" if str(projectile.plant_type) == "radish" else "monster-hit", 0.08)
				if projectile_sprite != null and is_instance_valid(projectile_sprite):
					projectile_sprite.queue_free()
				var hit_sprite: Variant = monster.get("sprite", null)
				if monster.hp <= 0.0:
					monster.alive = false
					if hit_sprite != null and is_instance_valid(hit_sprite):
						hit_sprite.play("death")
					defeated_total += 1
					coins += Rules.ORDINARY_MONSTER_DEFEAT_COINS
					_play_sfx("monster-defeat")
					_play_sfx("coin-collect", 0.04)
					status_label.text = "%s defeated! +%d coins." % [str(monster.kind).replace("-", " ").capitalize(), Rules.ORDINARY_MONSTER_DEFEAT_COINS]
				elif hit_sprite != null and is_instance_valid(hit_sprite):
					hit_sprite.play("hit")
				break
			if float(monster.local_x) > float(projectile.local_x) + hit_radius:
				continue
		if float(projectile.local_x) > Rules.BOARD_SPAWN_LOCAL_X + 50.0:
			projectile.alive = false
			if projectile_sprite != null and is_instance_valid(projectile_sprite):
				projectile_sprite.queue_free()
	monsters = monsters.filter(func(item: Dictionary) -> bool: return item.alive)
	projectiles = projectiles.filter(func(item: Dictionary) -> bool: return item.alive)
	plants = plants.filter(func(item: Dictionary) -> bool: return item.alive)

func _update_wave_progress() -> void:
	if spawned_this_wave < Rules.WAVE_SIZES[wave - 1] or not monsters.is_empty():
		return
	if wave >= Rules.WAVE_SIZES.size():
		game_state = "victory"
		_play_sfx("victory")
		status_label.text = "VICTORY! All 30 Stage 1 monsters have been defeated."
		return
	wave += 1
	spawned_this_wave = 0
	intermission_ms = float(Rules.WAVE_INTERMISSION_MS)
	spawn_timer_ms = float(Rules.NEXT_WAVE_SPAWN_DELAY_MS)
	status_label.text = "Wave cleared. Wave %d begins after a short break." % wave

func _refresh_hud() -> void:
	if is_instance_valid(energy_label):
		energy_label.text = "Energy: %d / %d   Coins: %d" % [energy, Rules.MAX_ENERGY, coins]
	if is_instance_valid(wave_label):
		wave_label.text = "Wave: %d / %d   Defeated: %d / 30" % [wave, Rules.WAVE_SIZES.size(), defeated_total]
	if is_instance_valid(attack_button):
		attack_button.visible = game_state == "running" and _farmer_can_attack()

func _draw() -> void:
	if background_view == null or background_view.texture == null:
		draw_rect(Rect2(Vector2.ZERO, get_viewport_rect().size), Color("#263b2e"), true)
	for plant in plants:
		var depth_scale := float(plant.get("depth_scale", 1.0))
		var bar_width := 48.0 * depth_scale
		var bar_y := float(plant.y) + 31.0 * depth_scale
		var plant_hp_max := float(Rules.PLANTS[plant.type].hp)
		draw_rect(Rect2(plant.x - bar_width * 0.5, bar_y, bar_width, 5.0 * depth_scale), Color("#263b2e"), true)
		draw_rect(Rect2(plant.x - bar_width * 0.5, bar_y, bar_width * float(plant.hp) / plant_hp_max, 5.0 * depth_scale), Color("#77d477"), true)
	for monster in monsters:
		var depth_scale := float(monster.depth_scale)
		if str(monster.kind) == "dust-skitter" and float(monster.get("burst_fx_ms", 0.0)) > 0.0:
			var dust_alpha := clampf(float(monster.burst_fx_ms) / 300.0, 0.0, 1.0) * 0.55
			draw_circle(Vector2(monster.x - 18.0 * depth_scale, monster.y + 12.0 * depth_scale), 10.0 * depth_scale, Color(0.82, 0.78, 0.66, dust_alpha))
			draw_circle(Vector2(monster.x - 32.0 * depth_scale, monster.y + 15.0 * depth_scale), 6.0 * depth_scale, Color(0.82, 0.78, 0.66, dust_alpha * 0.8))
		if str(monster.kind) == "stonehide" and bool(monster.braced):
			var brace_radius := 44.0 * depth_scale * float(monster.width_scale)
			draw_arc(Vector2(monster.x, monster.y + 6.0 * depth_scale), brace_radius, deg_to_rad(198.0), deg_to_rad(342.0), 28, Color("#d8d0b5"), 3.0 * depth_scale, true)
			draw_arc(Vector2(monster.x, monster.y + 6.0 * depth_scale), brace_radius + 5.0 * depth_scale, deg_to_rad(205.0), deg_to_rad(335.0), 24, Color("#a9a18b"), 2.0 * depth_scale, true)
		var radius := 34.0 * float(monster.width_scale) * depth_scale
		draw_rect(Rect2(monster.x - radius, monster.y - radius - 12.0 * float(monster.depth_scale), 2.0 * radius, 5.0 * float(monster.depth_scale)), Color("#263b2e"), true)
		draw_rect(Rect2(monster.x - radius, monster.y - radius - 12.0 * float(monster.depth_scale), 2.0 * radius * float(monster.hp) / float(monster.max_hp), 5.0 * float(monster.depth_scale)), Color("#e66b61"), true)
	if game_state != "running":
		draw_rect(Rect2(360.0, 300.0, 560.0, 100.0), Color("#17241d"))
		draw_string(get_theme_default_font(), Vector2(505.0, 360.0), "BATTLE " + game_state.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color.WHITE)

func _return_to_menu() -> void:
	var error := get_tree().change_scene_to_file(MENU_SCENE)
	if error != OK:
		push_error("Could not return to main menu: %s" % error)
