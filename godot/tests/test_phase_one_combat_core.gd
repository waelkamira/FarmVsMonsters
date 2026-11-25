extends SceneTree

const Rules = preload("res://scripts/phase_one_rules.gd")
const LiveBattle = preload("res://scripts/live_battle.gd")

func _initialize() -> void:
	_test_contract_and_plant_costs()
	_test_monster_stats_and_wave_pacing()
	_test_plant_transactions()
	_test_lane_and_target_selection()
	_test_cooldowns_and_movement_effects()
	_test_monster_freeze_contract()
	_test_farmer_planting_route_geometry()
	print("Godot Stage 1 combat-core smoke tests passed.")
	quit(0)

func _test_contract_and_plant_costs() -> void:
	assert(Rules.CONTRACT_VERSION == 1)
	assert(Rules.BOARD_COLUMNS == 8 and Rules.BOARD_ROWS == 5)
	assert(Rules.WAVE_SIZES == [3, 5, 6, 7, 9])
	assert(Rules.total_stage_one_monsters() == 30)
	assert(Rules.INITIAL_ENERGY == 150 and Rules.MAX_ENERGY == 300)
	assert(Rules.FARMER_MAX_HP == 180)
	assert(Rules.FARMER_DAMAGE_INVULNERABILITY_MS == 700.0)
	assert(Rules.plant_cost("radish") == 35)
	assert(Rules.plant_cost("mushroom") == 50)
	assert(Rules.plant_cost("pumpkin") == 75)
	assert(Rules.plant_cost("pineapple") == 70)
	assert(Rules.plant_cost("hazelnut") == 65)
	assert(Rules.plant_cost("mango") == 70)
	assert(Rules.plant_cost("snow-thrower") == 90)
	assert(Rules.PLANTS["snow-thrower"].freeze_projectile)
	assert(Rules.PLANTS["snow-thrower"].freeze_duration_ms == Rules.MONSTER_FREEZE_DURATION_MS)
	assert(Rules.plant_cost("unknown") == -1)
	assert(Rules.is_valid_cell(0, 0) and Rules.is_valid_cell(7, 4))
	assert(not Rules.is_valid_cell(8, 4) and not Rules.is_valid_cell(0, 5))
	assert(is_equal_approx(Rules.plant_lane_local_x(0), -184.1100625))
	assert(is_equal_approx(Rules.monster_spawn_interval_ms(1), 5080.0))
	assert(is_equal_approx(Rules.monster_spawn_interval_ms(5), 4600.0))

func _test_monster_stats_and_wave_pacing() -> void:
	var monster: Dictionary = Rules.monster_combat_stats("monster-01", 1)
	assert(monster.hp == 175 and is_equal_approx(monster.speed, 8.0))
	assert(monster.plant_damage == 16 and monster.attack_interval_ms == 1150.0)
	assert(is_equal_approx(Rules.monster_incoming_damage_multiplier(), 1.0))
	assert(Rules.monster_archetype(1, 1) == "monster-01")
	assert(Rules.monster_archetype(3, 1) == "monster-01")
	assert(Rules.monster_archetype(5, 4) == "monster-01")
	assert(Rules.monster_archetype(5, 9) == "monster-01")
	var spawn: Dictionary = Rules.resolve_wave_spawn_step({
		"wave": 2, "wave_size": 5, "spawned_this_wave": 0,
		"intermission_ms": 0.0, "spawn_timer_ms": 100.0, "delta_ms": 120.0
	})
	assert(spawn.should_spawn and spawn.spawned_this_wave == 1)
	assert(is_equal_approx(spawn.spawn_timer_ms, 4960.0))

func _test_plant_transactions() -> void:
	var placed: Dictionary = Rules.resolve_plant_placement(150.0, [], "radish", 2, 3)
	assert(placed.ok and is_equal_approx(placed.energy, 115.0))
	assert(placed.plant.hp == 160 and placed.plant.energy_cost == 35)
	var snow_thrower: Dictionary = Rules.resolve_plant_placement(100.0, [], "snow-thrower", 7, 4)
	assert(snow_thrower.ok and snow_thrower.energy == 10.0 and snow_thrower.plant.hp == 150)
	var mushroom: Dictionary = Rules.resolve_plant_placement(50.0, [], "mushroom", 7, 4)
	assert(mushroom.ok and mushroom.energy == 0.0 and mushroom.plant.hp == 85)
	assert(Rules.resolve_plant_placement(34.0, [], "radish", 0, 0).reason == "INSUFFICIENT_ENERGY")
	assert(Rules.resolve_plant_placement(100.0, [], "unknown", 0, 0).reason == "UNKNOWN_PLANT_TYPE")
	var occupied: Array = [{"alive": true, "col": 1, "row": 1}]
	assert(Rules.resolve_plant_placement(100.0, occupied, "radish", 1, 1).reason == "CELL_OCCUPIED")
	var refund: Dictionary = Rules.resolve_plant_uproot(290.0, {"type": "radish", "alive": true, "energy_cost": 35})
	assert(refund.ok and refund.energy == 325.0 and refund.refund == 35)
	assert(Rules.resolve_plant_uproot(100.0, {"type": "radish", "alive": true, "energy_cost": 999}).reason == "PLANT_COST_MISMATCH")
	assert(Rules.resolve_plant_uproot(100.0, {"type": "radish", "alive": false, "energy_cost": 35}).reason == "INVALID_UPROOT_STATE")
	assert(Rules.resolve_plant_uproot(100.0, {}).reason == "INVALID_UPROOT_STATE")
	var pickup: Dictionary = Rules.resolve_energy_pickup(290.0, 15.0)
	assert(pickup.energy == 300.0 and pickup.collected == 10.0)
	var no_capacity: Dictionary = Rules.resolve_energy_pickup(300.0, 15.0)
	assert(no_capacity.energy == 300.0 and no_capacity.collected == 0.0)
	var partial: Dictionary = Rules.resolve_energy_pickup(295.0, 15.0)
	assert(partial.energy == 300.0 and partial.collected == 5.0)
	var damage: Dictionary = Rules.apply_hit_points_damage(10.0, 25.0)
	assert(damage.hp == 0.0 and damage.damage_applied == 10.0 and damage.defeated)
	var farmer_hit: Dictionary = Rules.apply_hit_points_damage(float(Rules.FARMER_MAX_HP), 23.0)
	assert(farmer_hit.hp == 157.0 and farmer_hit.damage_applied == 23.0 and not farmer_hit.defeated)
	var farmer_fallen: Dictionary = Rules.apply_hit_points_damage(23.0, 32.0)
	assert(farmer_fallen.hp == 0.0 and farmer_fallen.defeated)

func _test_lane_and_target_selection() -> void:
	var step: Dictionary = Rules.resolve_monster_lane_step(120.0, 80.0, 0.5, 100.0, 12.0)
	assert(step.stopped_by_plant and is_equal_approx(step.local_x, 112.0))
	assert(is_equal_approx(Rules.resolve_projectile_lane_step(10.0, 320.0, 0.25), 90.0))
	var near_plant: Dictionary = {"type": "radish", "row": 2, "alive": true}
	var blocker: Variant = Rules.select_lane_blocker([
		{"plant": {"type": "radish", "row": 2, "alive": true}, "local_x": -2.0},
		{"plant": near_plant, "local_x": -0.25}
	], 2, 0.0)
	assert(blocker == near_plant)
	var first: Dictionary = {"row": 1, "local_x": 1.1, "alive": true, "width_scale": 2.0}
	var target: Variant = Rules.select_projectile_target([
		{"row": 1, "local_x": 1.3, "alive": true}, first
	], 1, 1.0, 0.1)
	assert(target == first)
	var melee: Dictionary = {"row": 2, "x": 105.0, "alive": true}
	assert(Rules.select_farmer_melee_target([melee], 2, 100.0, 10.0) == melee)
	var weak: Dictionary = {"hp": 12.0, "alive": true}
	assert(Rules.select_dragon_fireball_target([{"hp": 30.0, "alive": true}, weak]) == weak)

func _test_monster_freeze_contract() -> void:
	assert(Rules.MONSTER_FREEZE_DURATION_MS == 2600.0)
	var active: Dictionary = Rules.resolve_monster_freeze_step(2600.0, 400.0)
	assert(active.is_frozen and active.remaining_ms == 2200.0)
	var expired: Dictionary = Rules.resolve_monster_freeze_step(200.0, 250.0)
	assert(not expired.is_frozen and expired.remaining_ms == 0.0)
	assert(Rules.resolve_monster_freeze_step(-1.0, 10.0).is_empty())
	var small_target: Dictionary = {"alive": true, "row": 1, "local_x": 12.0, "width_scale": 0.62}
	var large_target: Dictionary = {"alive": true, "row": 1, "local_x": 18.0, "width_scale": 2.0}
	assert(Rules.select_freeze_target([small_target, large_target], 1, 11.5, 1.5) == small_target)
	assert(Rules.select_freeze_target([small_target, large_target], 1, 16.0, 1.5) == large_target)
	assert(Rules.select_freeze_target([small_target, large_target], 2, 10.0, 20.0) == null)
	var battle = LiveBattle.new()
	var frozen_sprite := battle._make_monster_sprite("monster-01", 0.22)
	assert(frozen_sprite != null and frozen_sprite.sprite_frames.has_animation("frozen"))
	var frozen_monster := {"alive": true, "freeze_remaining_ms": 0.0, "braced": true, "sprite": frozen_sprite, "base_tint": Color.WHITE}
	assert(battle._apply_monster_freeze(frozen_monster))
	assert(frozen_sprite.animation == "frozen")
	battle._set_monster_freeze_visual(frozen_sprite, "monster-01", false)
	assert(frozen_sprite.animation == "walk")
	battle._set_monster_freeze_visual(frozen_sprite, "monster-01", true)
	assert(frozen_sprite.animation == "frozen")
	battle._set_monster_freeze_visual(frozen_sprite, "monster-01", false)
	assert(frozen_sprite.animation == "run")
	frozen_sprite.free()
	assert(is_equal_approx(battle._plant_frame_width("snow-thrower"), 360.0))
	for visual_scale in [Vector2(0.14, 0.14), Vector2(0.44, 0.44)]:
		var sprite := Sprite2D.new()
		sprite.scale = visual_scale
		var monster := {"alive": true, "freeze_remaining_ms": 0.0, "braced": true, "sprite": sprite, "base_tint": Color.WHITE}
		assert(battle._apply_monster_freeze(monster))
		assert(monster.freeze_remaining_ms == Rules.MONSTER_FREEZE_DURATION_MS)
		assert(not monster.braced)
		assert(sprite.modulate == Rules.MONSTER_FREEZE_TINT)
		assert(sprite.scale == visual_scale)
		assert(battle._apply_monster_freeze(monster, 900.0))
		assert(monster.freeze_remaining_ms == Rules.MONSTER_FREEZE_DURATION_MS)
		sprite.free()
	assert(not battle._apply_monster_freeze({"alive": false}))
	battle.free()

func _test_farmer_planting_route_geometry() -> void:
	var battle = LiveBattle.new()
	battle._load_grid_calibration()
	assert(battle.grid_nodes.size() == Rules.BOARD_ROWS + 1)
	battle._create_farmer_sprite()
	assert(battle.farmer_sprite.sprite_frames.has_animation("jump"))
	assert(battle.farmer_sprite.sprite_frames.has_animation("hit"))
	assert(battle.farmer_sprite.sprite_frames.has_animation("death"))
	var samples := [
		Vector2(0.08, 0.12), Vector2(0.5, 0.5), Vector2(0.92, 0.88),
		Vector2(-0.32, 0.5), Vector2(1.18, 0.72)
	]
	for coordinate in samples:
		var source_point: Vector2 = battle._board_point(coordinate.x, coordinate.y)
		var recovered: Vector2 = battle._board_coordinates(source_point)
		assert(absf(recovered.x - coordinate.x) < 0.002)
		assert(absf(recovered.y - coordinate.y) < 0.002)
	battle.free()

func _test_cooldowns_and_dust_skitter() -> void:
	var bite: Dictionary = Rules.resolve_bite_attack(40.0, 50.0, 900.0)
	assert(bite.should_attack and bite.cooldown_ms == 900.0)
	var jump: Dictionary = Rules.resolve_dust_skitter_motion_step({
		"is_jumping": false, "jump_cooldown_ms": 20.0, "jump_elapsed_ms": 0.0,
		"jump_duration_ms": 500.0, "delta_ms": 40.0, "jump_speed_multiplier": 1.12,
		"jump_visual_height": 34.0, "visual_scale": 0.68,
		"next_jump_duration_ms": 500.0, "next_jump_reset_cooldown_ms": null,
		"burst_cooldown_ms": 1000.0, "burst_remaining_ms": 0.0,
		"burst_duration_ms": 420.0, "burst_speed_multiplier": 1.65,
		"next_burst_cooldown_ms": null
	})
	assert(jump.is_jumping and jump.jump_started)
	assert(jump.jump_elapsed_ms == 40.0 and jump.jump_offset < 0.0)
	assert(is_equal_approx(jump.movement_multiplier, 1.12))
	var burst: Dictionary = Rules.resolve_dust_skitter_motion_step({
		"is_jumping": false, "jump_cooldown_ms": 1000.0, "jump_elapsed_ms": 0.0,
		"jump_duration_ms": 500.0, "delta_ms": 20.0, "jump_speed_multiplier": 1.12,
		"jump_visual_height": 34.0, "visual_scale": 0.68,
		"next_jump_duration_ms": null, "next_jump_reset_cooldown_ms": null,
		"burst_cooldown_ms": 10.0, "burst_remaining_ms": 0.0,
		"burst_duration_ms": 420.0, "burst_speed_multiplier": 1.65,
		"next_burst_cooldown_ms": 3300.0
	})
	assert(burst.burst_started and burst.burst_remaining_ms == 400.0)
	assert(burst.burst_cooldown_ms == 3300.0)
	var burst_only: Dictionary = Rules.resolve_dust_skitter_motion_step({
		"is_jumping": false, "enable_jump": false, "delta_ms": 50.0,
		"burst_cooldown_ms": 10.0, "burst_remaining_ms": 0.0,
		"burst_duration_ms": 420.0, "burst_speed_multiplier": 1.65,
		"next_burst_cooldown_ms": 3300.0
	})
	assert(not burst_only.is_jumping and burst_only.jump_offset == 0.0)
	assert(burst_only.burst_started and burst_only.burst_remaining_ms == 370.0)
	assert(burst_only.burst_cooldown_ms == 3300.0)
	assert(is_equal_approx(burst_only.movement_multiplier, 1.65))
