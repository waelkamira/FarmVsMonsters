extends SceneTree

const Rules = preload("res://scripts/phase_one_rules.gd")

func _initialize() -> void:
	_test_contract_and_plant_costs()
	_test_monster_stats_and_wave_pacing()
	_test_plant_transactions()
	_test_lane_and_target_selection()
	_test_cooldowns_and_dust_skitter()
	print("Godot Stage 1 combat-core smoke tests passed.")
	quit(0)

func _test_contract_and_plant_costs() -> void:
	assert(Rules.CONTRACT_VERSION == 1)
	assert(Rules.BOARD_COLUMNS == 8 and Rules.BOARD_ROWS == 5)
	assert(Rules.WAVE_SIZES == [3, 5, 6, 7, 9])
	assert(Rules.total_stage_one_monsters() == 30)
	assert(Rules.INITIAL_ENERGY == 150 and Rules.MAX_ENERGY == 300)
	assert(Rules.plant_cost("radish") == 35)
	assert(Rules.plant_cost("mushroom") == 50)
	assert(Rules.plant_cost("pumpkin") == 75)
	assert(Rules.plant_cost("pineapple") == 70)
	assert(Rules.plant_cost("hazelnut") == 65)
	assert(Rules.plant_cost("mango") == 70)
	assert(Rules.plant_cost("unknown") == -1)
	assert(Rules.is_valid_cell(0, 0) and Rules.is_valid_cell(7, 4))
	assert(not Rules.is_valid_cell(8, 4) and not Rules.is_valid_cell(0, 5))
	assert(is_equal_approx(Rules.plant_lane_local_x(0), -184.1100625))
	assert(is_equal_approx(Rules.monster_spawn_interval_ms(1), 5080.0))
	assert(is_equal_approx(Rules.monster_spawn_interval_ms(5), 4600.0))

func _test_monster_stats_and_wave_pacing() -> void:
	var brute: Dictionary = Rules.monster_combat_stats("cave-brute", 1)
	assert(brute.hp == 175 and is_equal_approx(brute.speed, 8.0))
	assert(brute.plant_damage == 16 and brute.attack_interval_ms == 1150.0)
	var skitter: Dictionary = Rules.monster_combat_stats("dust-skitter", 1)
	assert(skitter.hp == 36 and is_equal_approx(skitter.speed, 13.6))
	assert(skitter.burst_duration_ms == 420.0 and skitter.jump_speed_multiplier == 1.12)
	var stonehide: Dictionary = Rules.monster_combat_stats("stonehide", 1)
	assert(stonehide.hp == 152 and is_equal_approx(stonehide.speed, 4.96))
	assert(is_equal_approx(Rules.stonehide_incoming_damage_multiplier(false), 0.7))
	assert(is_equal_approx(Rules.stonehide_incoming_damage_multiplier(true), 0.385))
	var alpha: Dictionary = Rules.monster_combat_stats("alpha-brute", 1)
	assert(alpha.hp == 350 and is_equal_approx(alpha.speed, 3.84))
	assert(Rules.monster_archetype(1, 1) == "cave-brute")
	assert(Rules.monster_archetype(3, 1) == "dust-skitter")
	assert(Rules.monster_archetype(5, 4) == "stonehide")
	assert(Rules.monster_archetype(5, 9) == "alpha-brute")
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
	var mushroom: Dictionary = Rules.resolve_plant_placement(50.0, [], "mushroom", 7, 4)
	assert(mushroom.ok and mushroom.energy == 0.0 and mushroom.plant.hp == 85)
	assert(Rules.resolve_plant_placement(34.0, [], "radish", 0, 0).reason == "INSUFFICIENT_ENERGY")
	assert(Rules.resolve_plant_placement(100.0, [], "unknown", 0, 0).reason == "UNKNOWN_PLANT_TYPE")
	var occupied: Array = [{"alive": true, "col": 1, "row": 1}]
	assert(Rules.resolve_plant_placement(100.0, occupied, "radish", 1, 1).reason == "CELL_OCCUPIED")
	var refund: Dictionary = Rules.resolve_plant_uproot(290.0, {"type": "radish", "alive": true, "energy_cost": 35})
	assert(refund.ok and refund.energy == 325.0 and refund.refund == 35)
	assert(Rules.resolve_plant_uproot(100.0, {"type": "radish", "alive": true, "energy_cost": 999}).reason == "PLANT_COST_MISMATCH")
	var pickup: Dictionary = Rules.resolve_energy_pickup(290.0, 15.0)
	assert(pickup.energy == 300.0 and pickup.collected == 10.0)
	var damage: Dictionary = Rules.apply_hit_points_damage(10.0, 25.0)
	assert(damage.hp == 0.0 and damage.damage_applied == 10.0 and damage.defeated)

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
