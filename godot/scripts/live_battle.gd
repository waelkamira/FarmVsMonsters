extends Control
## First playable Stage 1 combat loop. Temporary vector visuals are used until
## approved character and plant sprite sheets are integrated.

const Rules = preload("res://scripts/phase_one_rules.gd")
const MENU_SCENE := "res://scenes/main.tscn"
const LANE_CENTER_X := 640.0
const LANE_SCALE := 2.0
const GRID_LEFT := 220.0
const GRID_TOP := 140.0
const CELL_WIDTH := 105.0
const LANE_Y := [190.0, 290.0, 390.0, 490.0, 590.0]
const HOUSE_X := 76.0
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
var farmer_sprite: AnimatedSprite2D
var attack_button: Button
var has_planted_defender := false
var farmer_is_moving := false
var farmer_locomotion_animation := "idle"
var farmer_touch_directions := {"left": false, "right": false, "up": false, "down": false}
var sprite_frames_cache: Dictionary = {}
var monster_sprite_frames: SpriteFrames

func _ready() -> void:
	rng.randomize()
	_build_ui()
	_create_farmer_sprite()
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
	farmer_sprite = AnimatedSprite2D.new()
	farmer_sprite.sprite_frames = frames
	farmer_sprite.animation = "idle"
	farmer_sprite.scale = Vector2.ONE * 0.25
	farmer_sprite.position = Vector2(112.0, 565.0)
	farmer_sprite.z_index = 12
	farmer_sprite.animation_finished.connect(_on_farmer_animation_finished)
	add_child(farmer_sprite)
	farmer_sprite.play("idle")

func _build_farmer_controls() -> void:
	var control_row := HBoxContainer.new()
	control_row.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	control_row.offset_left = 18.0
	control_row.offset_right = -18.0
	control_row.offset_top = -62.0
	control_row.offset_bottom = -8.0
	control_row.add_theme_constant_override("separation", 8)
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
	if farmer_sprite.animation == "attack":
		farmer_sprite.play(farmer_locomotion_animation)

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
		var move_speed := FARMER_MOVE_SPEED * (0.78 if touch_moving else 1.0)
		farmer_sprite.position += movement * move_speed * delta
		farmer_sprite.position.x = clampf(farmer_sprite.position.x, 105.0, 1010.0)
		farmer_sprite.position.y = clampf(farmer_sprite.position.y, LANE_Y[0] - 22.0, LANE_Y[4] + 22.0)
		if absf(movement.x) > 0.01:
			farmer_sprite.scale.x = absf(farmer_sprite.scale.x) * signf(movement.x)
		farmer_locomotion_animation = "walk" if touch_moving else "run"
	else:
		farmer_locomotion_animation = "idle"
	if farmer_sprite.animation != "attack":
		if farmer_sprite.animation != farmer_locomotion_animation:
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
	if farmer_sprite != null and is_instance_valid(farmer_sprite):
		farmer_sprite.play("attack")
	var nearest_row := 0
	var nearest_lane_distance := INF
	for row in range(Rules.BOARD_ROWS):
		var lane_distance := absf(float(LANE_Y[row]) - farmer_sprite.position.y)
		if lane_distance < nearest_lane_distance:
			nearest_lane_distance = lane_distance
			nearest_row = row
	var target: Variant = Rules.select_farmer_melee_target(
		monsters, nearest_row, farmer_sprite.position.x, FARMER_CLUB_REACH)
	if target == null:
		status_label.text = "No monster is close enough for the club."
		return
	target.hp = Rules.apply_hit_points_damage(
		float(target.hp), FARMER_CLUB_DAMAGE * float(target.incoming_damage_multiplier)).hp
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
	if game_state != "running" or not (event is InputEventMouseButton):
		return
	var mouse := event as InputEventMouseButton
	if mouse.button_index != MOUSE_BUTTON_LEFT or not mouse.pressed:
		return
	var column := floori((mouse.position.x - GRID_LEFT) / CELL_WIDTH)
	var row := floori((mouse.position.y - GRID_TOP) / 100.0)
	if column < 0 or column >= Rules.BOARD_COLUMNS or row < 0 or row >= Rules.BOARD_ROWS:
		return
	_place_plant(column, row)
	accept_event()

func _place_plant(column: int, row: int) -> void:
	var placement := Rules.resolve_plant_placement(float(energy), plants, selected_plant, column, row)
	if not placement.get("ok", false):
		status_label.text = "Cannot plant: %s" % str(placement.get("reason", "unknown")).replace("_", " ").to_lower()
		return
	var plant: Dictionary = placement.plant.duplicate(true)
	plant["x"] = LANE_CENTER_X + Rules.plant_lane_local_x(column) * LANE_SCALE
	plant["y"] = LANE_Y[row]
	plant["cooldown_ms"] = 450.0
	plant["production_ms"] = float(Rules.PLANTS[selected_plant].get("production_interval_ms", 0.0))
	var plant_sprite := _create_plant_sprite(selected_plant)
	if plant_sprite != null:
		plant_sprite.position = Vector2(plant.x, plant.y)
		add_child(plant_sprite)
	plant["sprite"] = plant_sprite
	plants.append(plant)
	has_planted_defender = true
	energy = int(placement.energy)
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
	var monster_sprite := _make_monster_sprite(archetype, 0.22 * float(profile.width_scale))
	if monster_sprite != null:
		monster_sprite.position = Vector2(LANE_CENTER_X + Rules.BOARD_SPAWN_LOCAL_X * LANE_SCALE, LANE_Y[row])
		monster_sprite.z_index = 11
		match archetype:
			"dust-skitter": monster_sprite.modulate = Color("#b4d39c")
			"stonehide": monster_sprite.modulate = Color("#a4b0b7")
			"alpha-brute": monster_sprite.modulate = Color("#c47b69")
		add_child(monster_sprite)
	monsters.append({
		"sprite": monster_sprite,
		"kind": archetype, "row": row, "x": LANE_CENTER_X + Rules.BOARD_SPAWN_LOCAL_X * LANE_SCALE,
		"y": LANE_Y[row], "hp": float(profile.hp), "max_hp": float(profile.max_hp),
		"speed": float(profile.speed) * LANE_SCALE, "width_scale": float(profile.width_scale),
		"plant_damage": float(profile.plant_damage), "attack_interval_ms": float(profile.attack_interval_ms),
		"attack_cooldown_ms": 0.0, "incoming_damage_multiplier": float(profile.incoming_damage_multiplier),
		"alive": true
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
			if monster.alive and int(monster.row) == int(plant.row) and monster.x > plant.x and monster.x - plant.x <= float(Rules.PLANTS[plant.type].range) * LANE_SCALE:
				target_found = true
				break
		if target_found and plant.cooldown_ms <= 0.0:
			var config: Dictionary = Rules.PLANTS[plant.type]
			var projectile_sprite := _create_projectile_sprite(str(plant.type))
			if projectile_sprite != null:
				projectile_sprite.position = Vector2(float(plant.x) + 24.0, float(plant.y) - 12.0)
				add_child(projectile_sprite)
			var plant_sprite: Variant = plant.get("sprite", null)
			if plant_sprite is AnimatedSprite2D:
				plant_sprite.play("attack")
			projectiles.append({
				"sprite": projectile_sprite, "x": float(plant.x) + 24.0, "y": float(plant.y) - 12.0,
				"row": int(plant.row), "speed": float(config.projectile_speed) * LANE_SCALE,
				"damage": float(config.projectile_damage), "radius": float(config.projectile_collision_radius) * LANE_SCALE,
				"alive": true
			})
			plant.cooldown_ms = float(config.cooldown_ms)

func _update_monsters(delta: float, delta_ms: float) -> void:
	for monster in monsters:
		if not monster.alive:
			continue
		var blocker: Dictionary = _find_blocker(monster)
		if not blocker.is_empty() and float(monster.x) <= float(blocker.x) + 38.0:
			monster.x = minf(float(monster.x), float(blocker.x) + 38.0)
			var blocked_monster_sprite: Variant = monster.get("sprite", null)
			if blocked_monster_sprite != null and is_instance_valid(blocked_monster_sprite):
				blocked_monster_sprite.position.x = float(monster.x)
				if blocked_monster_sprite.animation != "bite" and blocked_monster_sprite.animation != "hit" and blocked_monster_sprite.animation != "death":
					blocked_monster_sprite.play("bite")
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
		monster.x = float(monster.x) - float(monster.speed) * delta
		var monster_sprite: Variant = monster.get("sprite", null)
		if monster_sprite != null and is_instance_valid(monster_sprite):
			monster_sprite.position.x = float(monster.x)
			var moving_animation := "run" if str(monster.kind) == "dust-skitter" else "walk"
			if monster_sprite.animation != moving_animation and monster_sprite.animation != "hit" and monster_sprite.animation != "death":
				monster_sprite.play(moving_animation)
		if float(monster.x) <= HOUSE_X:
			game_state = "defeat"
			status_label.text = "The farmhouse has been overrun. Return to the main menu to start a new battle."
			return

func _find_blocker(monster: Dictionary) -> Dictionary:
	var nearest: Dictionary = {}
	var nearest_x := -INF
	for plant in plants:
		if not plant.alive or int(plant.row) != int(monster.row):
			continue
		if float(plant.x) <= float(monster.x) and float(plant.x) > nearest_x:
			nearest = plant
			nearest_x = float(plant.x)
	return nearest

func _update_projectiles(delta: float) -> void:
	for projectile in projectiles:
		if not projectile.alive:
			continue
		projectile.x = float(projectile.x) + float(projectile.speed) * delta
		var projectile_sprite: Variant = projectile.get("sprite", null)
		if projectile_sprite != null and is_instance_valid(projectile_sprite):
			projectile_sprite.position.x = float(projectile.x)
		for monster in monsters:
			if not monster.alive or int(monster.row) != int(projectile.row):
				continue
			var hit_radius := float(projectile.radius) * float(monster.width_scale)
			if absf(float(monster.x) - float(projectile.x)) <= hit_radius:
				var damage := float(projectile.damage) * float(monster.incoming_damage_multiplier)
				monster.hp = Rules.apply_hit_points_damage(float(monster.hp), damage).hp
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
			if float(monster.x) > float(projectile.x) + hit_radius:
				continue
		if float(projectile.x) > 1160.0:
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
	draw_rect(Rect2(Vector2.ZERO, get_viewport_rect().size), Color("#263b2e"), true)
	draw_rect(Rect2(205.0, 128.0, 900.0, 510.0), Color("#38583d"), true)
	for row in range(Rules.BOARD_ROWS):
		for column in range(Rules.BOARD_COLUMNS):
			var cell := Rect2(GRID_LEFT + float(column) * CELL_WIDTH, GRID_TOP + float(row) * 100.0, CELL_WIDTH, 100.0)
			draw_rect(cell, Color("#a5bd83"), false, 2.0)
		draw_line(Vector2(90.0, LANE_Y[row] + 36.0), Vector2(1140.0, LANE_Y[row] + 36.0), Color("#263c2c"), 2.0)
	draw_rect(Rect2(42.0, 145.0, 42.0, 485.0), Color("#a56b3f"), true)
	draw_string(get_theme_default_font(), Vector2(35.0, 132.0), "FARM", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color.WHITE)
	for plant in plants:
		var plant_hp_max := float(Rules.PLANTS[plant.type].hp)
		draw_rect(Rect2(plant.x - 24.0, plant.y + 31.0, 48.0, 5.0), Color("#263b2e"), true)
		draw_rect(Rect2(plant.x - 24.0, plant.y + 31.0, 48.0 * float(plant.hp) / plant_hp_max, 5.0), Color("#77d477"), true)
	for monster in monsters:
		var radius := 34.0 * float(monster.width_scale)
		draw_rect(Rect2(monster.x - radius, monster.y - radius - 12.0, 2.0 * radius, 5.0), Color("#263b2e"), true)
		draw_rect(Rect2(monster.x - radius, monster.y - radius - 12.0, 2.0 * radius * float(monster.hp) / float(monster.max_hp), 5.0), Color("#e66b61"), true)
	if game_state != "running":
		draw_rect(Rect2(360.0, 300.0, 560.0, 100.0), Color("#17241d"))
		draw_string(get_theme_default_font(), Vector2(505.0, 360.0), "BATTLE " + game_state.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color.WHITE)

func _return_to_menu() -> void:
	var error := get_tree().change_scene_to_file(MENU_SCENE)
	if error != OK:
		push_error("Could not return to main menu: %s" % error)
