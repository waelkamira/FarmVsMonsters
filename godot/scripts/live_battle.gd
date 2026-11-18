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
const FARMER_PLANT_SPEED := 320.0
const FARMER_RETURN_SPEED := 420.0
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
var planting_target: Dictionary = {}
var return_target: Dictionary = {}
var pending_farmer_return: Dictionary = {}
var farmer_planting := false
var farmer_touch_directions := {"left": false, "right": false, "up": false, "down": false}
var sprite_frames_cache: Dictionary = {}
var monster_sprite_frames: SpriteFrames

func _ready() -> void:
	rng.randomize()
	_load_grid_calibration()
	if grid_nodes.size() != Rules.BOARD_ROWS + 1:
		push_error("Live battle cannot start without the approved perspective grid.")
		return
	_build_background()
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
		texture_path: String, columns: int, rows: int, fps: float, loop_animation: bool) -> bool:
	var texture := load(texture_path) as Texture2D
	if texture == null:
		push_warning("Missing animation texture: %s" % texture_path)
		return false
	frames.add_animation(animation_name)
	frames.set_animation_speed(animation_name, fps)
	frames.set_animation_loop(animation_name, loop_animation)
	var cell_size := texture.get_size() / Vector2(float(columns), float(rows))
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
	_append_sheet_animation(frames, "plant", "res://assets/characters/farmer/farmer-plant.png", 6, 1, 8.0, false)
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
	if farmer_sprite.animation == "plant":
		_begin_farmer_return()
	elif farmer_sprite.animation == "attack":
		farmer_sprite.play(farmer_locomotion_animation)

func _begin_farmer_return() -> void:
	farmer_planting = false
	if not pending_farmer_return.is_empty():
		return_target = pending_farmer_return.duplicate(true)
		pending_farmer_return.clear()
		farmer_locomotion_animation = "run"
		farmer_sprite.play("run")
	else:
		farmer_locomotion_animation = "idle"
		farmer_sprite.play("idle")

func _planting_cell_center(column: int, row: int) -> Vector2:
	var center := _grid_cell_center(column, row)
	if row < 3:
		center.y -= 5.0
	return center

func _board_point(u: float, v: float) -> Vector2:
	var scaled_u := u * float(Rules.BOARD_COLUMNS)
	var scaled_v := v * float(Rules.BOARD_ROWS)
	var column := floori(scaled_u)
	var row := floori(scaled_v)
	var local_u := scaled_u - float(column)
	var local_v := scaled_v - float(row)
	if column < 0:
		column = 0
		local_u = scaled_u
	elif column >= Rules.BOARD_COLUMNS:
		column = Rules.BOARD_COLUMNS - 1
		local_u = scaled_u - float(column)
	if row < 0:
		row = 0
		local_v = scaled_v
	elif row >= Rules.BOARD_ROWS:
		row = Rules.BOARD_ROWS - 1
		local_v = scaled_v - float(row)
	return _interpolate_cell(column, row, local_u, local_v)

func _board_coordinates(source_point: Vector2) -> Vector2:
	var row := 0
	while row < Rules.BOARD_ROWS - 1 and source_point.y > float(grid_nodes[row + 1][0].y):
		row += 1
	var top_y := float(grid_nodes[row][0].y)
	var bottom_y := float(grid_nodes[row + 1][0].y)
	var local_v := (source_point.y - top_y) / maxf(0.001, bottom_y - top_y)
	var boundary_xs: Array[float] = []
	for column in range(Rules.BOARD_COLUMNS + 1):
		boundary_xs.append(lerpf(float(grid_nodes[row][column].x),
			float(grid_nodes[row + 1][column].x), local_v))
	var cell_column := 0
	while cell_column < Rules.BOARD_COLUMNS - 1 and source_point.x > boundary_xs[cell_column + 1]:
		cell_column += 1
	var local_u := (source_point.x - boundary_xs[cell_column]) / maxf(
		0.001, boundary_xs[cell_column + 1] - boundary_xs[cell_column])
	var polygon := _cell_polygon(cell_column, row)
	for iteration in range(8):
		var projected := _interpolate_cell(cell_column, row, local_u, local_v)
		var du := (polygon[1] - polygon[0]) * (1.0 - local_v) + (polygon[2] - polygon[3]) * local_v
		var dv := (polygon[3] - polygon[0]) * (1.0 - local_u) + (polygon[2] - polygon[1]) * local_u
		var error := source_point - projected
		var determinant := du.x * dv.y - dv.x * du.y
		if absf(determinant) < 0.000001:
			break
		var delta_u := (error.x * dv.y - error.y * dv.x) / determinant
		var delta_v := (du.x * error.y - du.y * error.x) / determinant
		local_u += delta_u
		local_v += delta_v
		if absf(delta_u) + absf(delta_v) < 0.0001:
			break
	return Vector2((float(cell_column) + local_u) / float(Rules.BOARD_COLUMNS),
		(float(row) + local_v) / float(Rules.BOARD_ROWS))


func _update_farmer(delta: float) -> void:
	if farmer_sprite == null or not is_instance_valid(farmer_sprite):
		return
	if not planting_target.is_empty():
		_update_planting_movement(delta)
		farmer_locomotion_animation = "walk" if not planting_target.is_empty() else ("plant" if farmer_planting else "idle")
	elif not return_target.is_empty():
		_update_return_movement(delta)
		farmer_locomotion_animation = "run" if not return_target.is_empty() else "idle"
	elif farmer_planting:
		farmer_locomotion_animation = "plant"
	else:
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
		else:
			farmer_locomotion_animation = "idle"
	var farmer_row := _nearest_row_at_screen_position(farmer_sprite.position)
	var facing := signf(farmer_sprite.scale.x)
	var visual_scale := 0.25 * _depth_scale(4, farmer_row)
	farmer_sprite.scale = Vector2(absf(visual_scale) * facing, visual_scale)
	farmer_sprite.z_index = int(farmer_sprite.position.y)
	if farmer_sprite.animation != "attack" and farmer_sprite.animation != "plant" and farmer_sprite.animation != farmer_locomotion_animation:
		farmer_sprite.play(farmer_locomotion_animation)

func _update_planting_movement(delta: float) -> void:
	if planting_target.is_empty():
		return
	planting_target.progress = minf(1.0,
		float(planting_target.progress) + (FARMER_PLANT_SPEED * delta) / float(planting_target.route_length))
	var u := lerpf(float(planting_target.start_u), float(planting_target.target_u), float(planting_target.progress))
	var v := lerpf(float(planting_target.start_v), float(planting_target.target_v), float(planting_target.progress))
	farmer_sprite.position = _to_screen(_board_point(u, v))
	farmer_sprite.z_index = int(farmer_sprite.position.y)
	var horizontal_direction := float(planting_target.target_screen.x) - farmer_sprite.position.x
	if absf(horizontal_direction) > 0.5:
		farmer_sprite.scale.x = absf(farmer_sprite.scale.x) * signf(horizontal_direction)
	if float(planting_target.progress) < 1.0:
		return
	var completed: Dictionary = planting_target.duplicate(true)
	planting_target.clear()
	farmer_sprite.position = completed.target_screen
	pending_farmer_return = {"position": completed.start_position, "facing": completed.start_facing}
	_complete_plant_placement(int(completed.column), int(completed.row), str(completed.plant_type))

func _update_return_movement(delta: float) -> void:
	if return_target.is_empty():
		return
	var target_position: Vector2 = return_target.position
	var offset := target_position - farmer_sprite.position
	var distance := offset.length()
	if distance <= 5.0 * SCREEN_SCALE:
		farmer_sprite.position = target_position
		var target_facing := float(return_target.facing)
		return_target.clear()
		farmer_sprite.scale.x = absf(farmer_sprite.scale.x) * target_facing
		farmer_locomotion_animation = "idle"
		farmer_sprite.play("idle")
		status_label.text = "The Farmer returned to his starting position."
		return
	var step := minf(distance, FARMER_RETURN_SPEED * SCREEN_SCALE * delta)
	farmer_sprite.position += offset / distance * step
	if absf(offset.x) > 0.01:
		farmer_sprite.scale.x = absf(farmer_sprite.scale.x) * signf(offset.x)
	farmer_sprite.z_index = int(farmer_sprite.position.y)


func _farmer_can_attack() -> bool:
	if not planting_target.is_empty() or not return_target.is_empty() or farmer_planting:
		return false
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
	if not planting_target.is_empty() or not return_target.is_empty() or farmer_planting:
		status_label.text = "The Farmer must finish planting and returning before attacking."
		return
	if not _farmer_can_attack():
		status_label.text = "The club is an emergency defense. It unlocks after all planted Radishes are lost."
		return
	if farmer_sprite != null and is_instance_valid(farmer_sprite):
		farmer_sprite.play("attack")
	var nearest_row := _nearest_row_at_screen_position(farmer_sprite.position)
	var target: Variant = Rules.select_farmer_melee_target(
		monsters, nearest_row, farmer_sprite.position.x, FARMER_CLUB_REACH * SCREEN_SCALE)
	if target == null:
		status_label.text = "No monster is close enough for the club."
		return
	var club_multiplier := float(target.incoming_damage_multiplier)
	if str(target.kind) == "stonehide" and bool(target.braced):
		club_multiplier = Rules.stonehide_incoming_damage_multiplier(true)
	target.hp = Rules.apply_hit_points_damage(
		float(target.hp), FARMER_CLUB_DAMAGE * club_multiplier).hp
	var target_sprite: Variant = target.get("sprite", null)
	if target.hp <= 0.0:
		target.alive = false
		if target_sprite != null and is_instance_valid(target_sprite):
			target_sprite.play("death")
		defeated_total += 1
		coins += Rules.ORDINARY_MONSTER_DEFEAT_COINS
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
	_request_plant(cell.x, cell.y)
	accept_event()

func _request_plant(column: int, row: int) -> void:
	for plant in plants:
		if plant.alive and int(plant.col) == column and int(plant.row) == row:
			_uproot_plant(plant)
			return
	if not planting_target.is_empty() or not return_target.is_empty() or farmer_planting:
		status_label.text = "The Farmer must finish his current planting trip before moving again."
		return
	var placement := Rules.resolve_plant_placement(float(energy), plants, selected_plant, column, row)
	if not placement.get("ok", false):
		status_label.text = "Cannot plant: %s" % str(placement.get("reason", "unknown")).replace("_", " ").to_lower()
		return
	var target_source := _planting_cell_center(column, row)
	var target_screen := _to_screen(target_source)
	var start_screen := farmer_sprite.position
	var start_board := _board_coordinates(_to_source(start_screen))
	var target_board := _board_coordinates(target_source)
	var grid_height := float(grid_nodes[Rules.BOARD_ROWS][0].y) - float(grid_nodes[0][0].y)
	var route_length := sqrt(
		pow((target_board.x - start_board.x) * Rules.BOARD_LANE_WIDTH, 2.0) +
		pow((target_board.y - start_board.y) * grid_height, 2.0))
	planting_target = {
		"column": column, "row": row, "plant_type": selected_plant,
		"target_source": target_source, "target_screen": target_screen,
		"start_position": start_screen, "start_facing": signf(farmer_sprite.scale.x),
		"start_u": start_board.x, "start_v": start_board.y,
		"target_u": target_board.x, "target_v": target_board.y,
		"route_length": maxf(route_length, 1.0), "progress": 0.0
	}
	farmer_locomotion_animation = "walk"
	farmer_sprite.scale.x = absf(farmer_sprite.scale.x) * (1.0 if target_screen.x >= start_screen.x else -1.0)
	farmer_sprite.play("walk")
	status_label.text = "The Farmer is walking to the selected soil cell."

func _complete_plant_placement(column: int, row: int, plant_type: String) -> void:
	var placement := Rules.resolve_plant_placement(float(energy), plants, plant_type, column, row)
	if not placement.get("ok", false):
		status_label.text = "Planting cancelled: this cell is no longer available."
		_begin_farmer_return()
		return
	var plant: Dictionary = placement.plant.duplicate(true)
	var cell_center := _grid_cell_center(column, row)
	var source_position := _planting_cell_center(column, row)
	var local_x := Rules.plant_lane_local_x(column)
	if plant_type == "pineapple":
		var polygon := _cell_polygon(column, row)
		var cell_width := ((polygon[1].x - polygon[0].x) + (polygon[2].x - polygon[3].x)) * 0.5
		var cell_height := (absf(polygon[3].y - polygon[0].y) + absf(polygon[2].y - polygon[1].y)) * 0.5
		source_position = cell_center + Vector2(cell_width * 0.2, cell_height * 0.1)
		local_x += Rules.BOARD_LANE_WIDTH / float(Rules.BOARD_COLUMNS) * 0.2
	var screen_position := _to_screen(source_position)
	var depth_scale := _depth_scale(column, row)
	plant["x"] = screen_position.x
	plant["y"] = screen_position.y
	plant["local_x"] = local_x
	plant["depth_scale"] = depth_scale
	plant["cooldown_ms"] = 450.0
	plant["production_ms"] = float(Rules.PLANTS[plant_type].get("production_interval_ms", 0.0))
	var plant_sprite := _create_plant_sprite(plant_type)
	if plant_sprite != null:
		plant_sprite.position = screen_position
		plant_sprite.scale *= depth_scale
		plant_sprite.z_index = int(screen_position.y)
		add_child(plant_sprite)
	plant["sprite"] = plant_sprite
	plants.append(plant)
	energy = int(placement.energy)
	if plant_type == "radish":
		has_planted_defender = true
	farmer_planting = true
	farmer_locomotion_animation = "plant"
	farmer_sprite.play("plant")
	status_label.text = "%s planted in lane %d." % [plant_type.capitalize(), row + 1]
	_refresh_hud()

func _uproot_plant(plant: Dictionary) -> void:
	var uproot := Rules.resolve_plant_uproot(float(energy), plant)
	if not uproot.get("ok", false):
		return
	plant.alive = false
	var plant_sprite: Variant = plant.get("sprite", null)
	if plant_sprite != null and is_instance_valid(plant_sprite):
		plant_sprite.queue_free()
	energy = int(uproot.energy)
	status_label.text = "Plant uprooted. Full energy cost refunded."
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
				energy = int(Rules.resolve_energy_pickup(float(energy), float(Rules.PLANTS.mushroom.energy_per_pickup)).energy)
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
			projectiles.append({
				"sprite": projectile_sprite, "local_x": projectile_local_x,
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
		monster.local_x = float(monster.local_x) - float(monster.speed) * delta
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
			status_label.text = "The farmhouse has been overrun. Return to the main menu to start a new battle."
			return

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
				if projectile_sprite != null and is_instance_valid(projectile_sprite):
					projectile_sprite.queue_free()
				var hit_sprite: Variant = monster.get("sprite", null)
				if monster.hp <= 0.0:
					monster.alive = false
					if hit_sprite != null and is_instance_valid(hit_sprite):
						hit_sprite.play("death")
					defeated_total += 1
					coins += Rules.ORDINARY_MONSTER_DEFEAT_COINS
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
		var radius := 34.0 * float(monster.width_scale) * float(monster.depth_scale)
		draw_rect(Rect2(monster.x - radius, monster.y - radius - 12.0 * float(monster.depth_scale), 2.0 * radius, 5.0 * float(monster.depth_scale)), Color("#263b2e"), true)
		draw_rect(Rect2(monster.x - radius, monster.y - radius - 12.0 * float(monster.depth_scale), 2.0 * radius * float(monster.hp) / float(monster.max_hp), 5.0 * float(monster.depth_scale)), Color("#e66b61"), true)
	if game_state != "running":
		draw_rect(Rect2(360.0, 300.0, 560.0, 100.0), Color("#17241d"))
		draw_string(get_theme_default_font(), Vector2(505.0, 360.0), "BATTLE " + game_state.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color.WHITE)

func _return_to_menu() -> void:
	var error := get_tree().change_scene_to_file(MENU_SCENE)
	if error != OK:
		push_error("Could not return to main menu: %s" % error)
