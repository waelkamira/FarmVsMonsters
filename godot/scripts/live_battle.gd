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
const PLANT_OPTIONS := ["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango"]

var energy: int = Rules.INITIAL_ENERGY
var selected_plant := "radish"
var plants: Array[Dictionary] = []
var monsters: Array[Dictionary] = []
var projectiles: Array[Dictionary] = []
var wave := 1
var spawned_this_wave := 0
var defeated_total := 0
var spawn_timer_ms := float(Rules.FIRST_MONSTER_SPAWN_DELAY_MS)
var intermission_ms := 0.0
var game_state := "running"
var status_label: Label
var energy_label: Label
var wave_label: Label
var rng := RandomNumberGenerator.new()

func _ready() -> void:
	rng.randomize()
	_build_ui()
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
	_update_wave_progress()
	_refresh_hud()
	queue_redraw()

func _build_ui() -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	add_child(margin)
	var layout := VBoxContainer.new()
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
	status_label.text = "Choose a defender, then tap a field cell. Survive all five waves."

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
	plants.append(plant)
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
	monsters.append({
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
			projectiles.append({
				"x": float(plant.x) + 24.0, "y": float(plant.y) - 12.0,
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
		if not blocker.is_empty() and float(monster.x) >= float(blocker.x) - 38.0:
			monster.x = maxf(float(monster.x), float(blocker.x) - 38.0)
			monster.attack_cooldown_ms = float(monster.attack_cooldown_ms) - delta_ms
			if monster.attack_cooldown_ms <= 0.0:
				blocker.hp = Rules.apply_hit_points_damage(float(blocker.hp), float(monster.plant_damage)).hp
				monster.attack_cooldown_ms = float(monster.attack_interval_ms)
				if blocker.hp <= 0.0:
					blocker.alive = false
					status_label.text = "%s was destroyed!" % str(blocker.type).capitalize()
			continue
		monster.x = float(monster.x) - float(monster.speed) * delta
		if float(monster.x) <= HOUSE_X:
			game_state = "defeat"
			status_label.text = "The farmhouse has been overrun. Restart the battle to try again."
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
		for monster in monsters:
			if not monster.alive or int(monster.row) != int(projectile.row):
				continue
			var hit_radius := float(projectile.radius) * float(monster.width_scale)
			if absf(float(monster.x) - float(projectile.x)) <= hit_radius:
				var damage := float(projectile.damage) * float(monster.incoming_damage_multiplier)
				monster.hp = Rules.apply_hit_points_damage(float(monster.hp), damage).hp
				projectile.alive = false
				if monster.hp <= 0.0:
					monster.alive = false
					defeated_total += 1
					energy = int(Rules.resolve_energy_pickup(float(energy), 8.0).energy)
					status_label.text = "%s defeated! +8 battle reward." % str(monster.kind).replace("-", " ").capitalize()
				break
			if float(monster.x) > float(projectile.x) + hit_radius:
				continue
		if float(projectile.x) > 1160.0:
			projectile.alive = false
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
		energy_label.text = "Energy: %d / %d" % [energy, Rules.MAX_ENERGY]
	if is_instance_valid(wave_label):
		wave_label.text = "Wave: %d / %d   Defeated: %d / 30" % [wave, Rules.WAVE_SIZES.size(), defeated_total]

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
		var tint := Color("#e6b94f")
		match str(plant.type):
			"radish": tint = Color("#e97872")
			"mushroom": tint = Color("#b58bd6")
			"pumpkin": tint = Color("#df8c35")
			"pineapple": tint = Color("#e6c34b")
			"hazelnut": tint = Color("#9c744c")
			"mango": tint = Color("#ed9b45")
		draw_circle(Vector2(plant.x, plant.y), 25.0, tint)
		draw_circle(Vector2(plant.x - 7.0, plant.y - 5.0), 4.0, Color("#263b2e"))
		draw_circle(Vector2(plant.x + 7.0, plant.y - 5.0), 4.0, Color("#263b2e"))
		draw_rect(Rect2(plant.x - 23.0, plant.y + 31.0, 46.0 * float(plant.hp) / float(Rules.PLANTS[plant.type].hp), 5.0), Color("#77d477"), true)
	for monster in monsters:
		var tint := Color("#9a8a70")
		match str(monster.kind):
			"dust-skitter": tint = Color("#91b77b")
			"stonehide": tint = Color("#77838a")
			"alpha-brute": tint = Color("#a95d4f")
		var radius := 21.0 * float(monster.width_scale)
		draw_circle(Vector2(monster.x, monster.y), radius, tint)
		draw_circle(Vector2(monster.x - 7.0, monster.y - 5.0), 4.0, Color("#241e1b"))
		draw_circle(Vector2(monster.x + 7.0, monster.y - 5.0), 4.0, Color("#241e1b"))
		draw_rect(Rect2(monster.x - radius, monster.y - radius - 10.0, 2.0 * radius * float(monster.hp) / float(monster.max_hp), 5.0), Color("#e66b61"), true)
	for projectile in projectiles:
		draw_circle(Vector2(projectile.x, projectile.y), 8.0, Color("#f6e7a0"))
	if game_state != "running":
		draw_rect(Rect2(360.0, 300.0, 560.0, 100.0), Color("#17241d"))
		draw_string(get_theme_default_font(), Vector2(505.0, 360.0), "BATTLE " + game_state.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color.WHITE)

func _return_to_menu() -> void:
	var error := get_tree().change_scene_to_file(MENU_SCENE)
	if error != OK:
		push_error("Could not return to main menu: %s" % error)
