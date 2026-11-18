class_name PhaseOneRules
extends RefCounted
## Godot mirror of web/game/rules/phaseOneCombatContract.mjs and
## web/game/rules/combatSimulation.mjs. Keep these values in parity with Phaser.

const CONTRACT_VERSION: int = 1
const BOARD_COLUMNS: int = 8
const BOARD_ROWS: int = 5
const BOARD_LANE_WIDTH: float = 420.823
const BOARD_SPAWN_LOCAL_X: float = 238.4115
const BOARD_HOME_LOCAL_X: float = -300.0
const WAVE_SIZES: Array[int] = [3, 5, 6, 7, 9]
const INITIAL_ENERGY: int = 150
const MAX_ENERGY: int = 300
const FIRST_MONSTER_SPAWN_DELAY_MS: int = 1800
const NEXT_WAVE_SPAWN_DELAY_MS: int = 1600
const WAVE_INTERMISSION_MS: int = 5000
const MIN_MONSTER_SPAWN_INTERVAL_MS: int = 2300
const MONSTER_SPAWN_INTERVAL_BASE_MS: int = 5200
const MONSTER_SPAWN_INTERVAL_WAVE_REDUCTION_MS: int = 120
const ORDINARY_MONSTER_DEFEAT_COINS: int = 8
const FARMER_MAX_HP: int = 180
const FARMER_DAMAGE_INVULNERABILITY_MS: float = 700.0
const MONSTER_FREEZE_DURATION_MS: float = 2600.0
const MONSTER_FREEZE_TINT := Color(0.58, 0.84, 1.0, 1.0)

const PLANTS: Dictionary = {
	"radish": {
		"projectile_damage": 25, "projectile_speed": 320.0, "projectile_collision_radius": 24.0,
		"planting_energy_cost": 35, "hp": 160, "cooldown_ms": 1450.0, "range": 360.0
	},
	"mushroom": {
		"planting_energy_cost": 50, "hp": 85, "energy_per_pickup": 15,
		"production_interval_ms": 12000.0, "pickup_ttl_ms": 12000.0
	},
	"pumpkin": {"planting_energy_cost": 75, "hp": 520},
	"pineapple": {
		"projectile_damage": 42, "projectile_speed": 270.0, "projectile_collision_radius": 24.0,
		"planting_energy_cost": 70, "hp": 140, "cooldown_ms": 2100.0, "range": 360.0
	},
	"hazelnut": {
		"projectile_damage": 38, "projectile_speed": 285.0, "projectile_collision_radius": 24.0,
		"planting_energy_cost": 65, "hp": 130, "cooldown_ms": 1950.0, "range": 360.0
	},
	"mango": {
		"projectile_damage": 40, "projectile_speed": 275.0, "projectile_collision_radius": 24.0,
		"planting_energy_cost": 70, "hp": 130, "cooldown_ms": 2100.0, "range": 360.0
	}
}

const MONSTER_SCALING: Dictionary = {
	"base_hp": 65, "hp_per_wave": 4, "base_speed": 8.0,
	"speed_per_wave": 1.35, "max_base_speed": 30.0
}

const MONSTERS: Dictionary = {
	"cave-brute": {
		"hits_to_defeat": 7, "speed_multiplier": 1.0, "max_speed": 30.0,
		"plant_damage": 16, "attack_interval_ms": 1150.0,
		"incoming_damage_multiplier": 1.0, "width_scale": 1.0, "height_scale": 1.0,
		"wobble_duration_ms": 520.0
	},
	"dust-skitter": {
		"hp_multiplier": 0.52, "speed_multiplier": 1.7, "max_speed": 36.0,
		"plant_damage": 8, "attack_interval_ms": 850.0,
		"incoming_damage_multiplier": 1.0, "width_scale": 0.62, "height_scale": 0.68,
		"wobble_duration_ms": 350.0, "burst_duration_ms": 420.0,
		"initial_burst_cooldown_min_ms": 1500.0, "initial_burst_cooldown_max_ms": 2300.0,
		"burst_speed_multiplier": 1.65, "jump_speed_multiplier": 1.12,
		"burst_cooldown_min_ms": 3000.0, "burst_cooldown_max_ms": 3900.0,
		"jump_duration_min_ms": 480.0, "jump_duration_max_ms": 620.0,
		"jump_cooldown_min_ms": 1100.0, "jump_cooldown_max_ms": 2600.0,
		"jump_reset_cooldown_min_ms": 2100.0, "jump_reset_cooldown_max_ms": 3400.0
	},
	"stonehide": {
		"hp_multiplier": 2.2, "speed_multiplier": 0.62, "max_speed": 19.0,
		"plant_damage": 23, "attack_interval_ms": 1450.0,
		"incoming_damage_multiplier": 0.7, "braced_incoming_damage_multiplier": 0.55,
		"width_scale": 1.35, "height_scale": 1.3, "wobble_duration_ms": 760.0
	},
	"alpha-brute": {
		"hits_to_defeat": 14, "speed_multiplier": 0.48, "max_speed": 15.0,
		"plant_damage": 32, "attack_interval_ms": 1350.0,
		"incoming_damage_multiplier": 0.85, "width_scale": 2.0, "height_scale": 2.0,
		"wobble_duration_ms": 900.0
	}
}

static func is_valid_cell(column: int, row: int) -> bool:
	return column >= 0 and column < BOARD_COLUMNS and row >= 0 and row < BOARD_ROWS

static func plant_cost(plant_id: String) -> int:
	var normalized_id: String = "mushroom" if plant_id == "energy_mushroom" else plant_id
	return int(PLANTS.get(normalized_id, {}).get("planting_energy_cost", -1))

static func apply_energy_delta(current: int, delta: int) -> int:
	return clampi(current + delta, 0, MAX_ENERGY)

static func total_stage_one_monsters() -> int:
	var total := 0
	for wave_size in WAVE_SIZES:
		total += wave_size
	return total

static func plant_lane_local_x(column: int) -> float:
	if column < 0 or column >= BOARD_COLUMNS:
		push_error("INVALID_PLANT_COLUMN")
		return 0.0
	return ((float(column) + 0.5) / float(BOARD_COLUMNS)) * BOARD_LANE_WIDTH - BOARD_LANE_WIDTH / 2.0

static func monster_spawn_interval_ms(wave: int) -> float:
	if wave < 1 or wave > WAVE_SIZES.size():
		push_error("INVALID_WAVE_NUMBER")
		return -1.0
	return maxf(float(MIN_MONSTER_SPAWN_INTERVAL_MS),
		float(MONSTER_SPAWN_INTERVAL_BASE_MS - wave * MONSTER_SPAWN_INTERVAL_WAVE_REDUCTION_MS))

static func monster_combat_stats(archetype: String, wave: int) -> Dictionary:
	if not MONSTERS.has(archetype) or wave < 1 or wave > 10:
		return {}
	var profile: Dictionary = MONSTERS[archetype].duplicate(true)
	var hp: int
	if profile.has("hits_to_defeat"):
		hp = int(PLANTS.radish.projectile_damage * profile.hits_to_defeat)
	else:
		hp = roundi((float(MONSTER_SCALING.base_hp) + floori(wave * float(MONSTER_SCALING.hp_per_wave))) * float(profile.hp_multiplier))
	var base_speed: float = minf(float(MONSTER_SCALING.max_base_speed),
		float(MONSTER_SCALING.base_speed) + (wave - 1) * float(MONSTER_SCALING.speed_per_wave))
	profile["hp"] = hp
	profile["max_hp"] = hp
	profile["speed"] = minf(float(profile.max_speed), base_speed * float(profile.speed_multiplier))
	return profile

static func stonehide_incoming_damage_multiplier(is_braced: bool) -> float:
	var profile: Dictionary = MONSTERS["stonehide"]
	var multiplier: float = float(profile.incoming_damage_multiplier)
	return multiplier * float(profile.braced_incoming_damage_multiplier) if is_braced else multiplier

static func resolve_plant_placement(energy: float, plants: Array, plant_type: String,
		column: int, row: int, columns: int = BOARD_COLUMNS, rows: int = BOARD_ROWS) -> Dictionary:
	if not is_finite(energy) or energy < 0.0:
		return {"ok": false, "reason": "INVALID_PLACEMENT_STATE"}
	if not PLANTS.has(plant_type):
		return {"ok": false, "reason": "UNKNOWN_PLANT_TYPE"}
	if columns < 1 or rows < 1 or column < 0 or column >= columns or row < 0 or row >= rows:
		return {"ok": false, "reason": "CELL_OUT_OF_BOUNDS"}
	for plant in plants:
		if plant is Dictionary and plant.get("alive", false) and int(plant.get("col", -1)) == column and int(plant.get("row", -1)) == row:
			return {"ok": false, "reason": "CELL_OCCUPIED"}
	var config: Dictionary = PLANTS[plant_type]
	var cost := int(config.planting_energy_cost)
	if energy < cost:
		return {"ok": false, "reason": "INSUFFICIENT_ENERGY"}
	return {
		"ok": true, "reason": "PLANT_PLACED", "energy": energy - cost,
		"plant": {"type": plant_type, "col": column, "row": row, "hp": int(config.hp), "alive": true, "energy_cost": cost}
	}

static func resolve_plant_uproot(energy: float, plant: Dictionary) -> Dictionary:
	if not is_finite(energy) or energy < 0.0 or plant.is_empty() or not plant.get("alive", false):
		return {"ok": false, "reason": "INVALID_UPROOT_STATE"}
	var plant_type: String = str(plant.get("type", ""))
	if not PLANTS.has(plant_type):
		return {"ok": false, "reason": "UNKNOWN_PLANT_TYPE"}
	var cost := plant_cost(plant_type)
	if plant.has("energy_cost") and int(plant.energy_cost) != cost:
		return {"ok": false, "reason": "PLANT_COST_MISMATCH"}
	return {"ok": true, "reason": "PLANT_UPROOTED", "energy": energy + cost, "refund": cost}

static func resolve_energy_pickup(energy: float, requested_amount: float) -> Dictionary:
	var current: float = minf(MAX_ENERGY, energy) if is_finite(energy) and energy >= 0.0 else 0.0
	var amount: float = maxf(0.0, requested_amount) if is_finite(requested_amount) else 0.0
	var collected: float = minf(amount, MAX_ENERGY - current)
	return {"energy": current + collected, "collected": collected}

static func resolve_monster_freeze_step(remaining_ms: float, delta_ms: float) -> Dictionary:
	if not is_finite(remaining_ms) or remaining_ms < 0.0 or not is_finite(delta_ms) or delta_ms < 0.0:
		return {}
	var next_remaining := maxf(0.0, remaining_ms - delta_ms)
	return {"remaining_ms": next_remaining, "is_frozen": next_remaining > 0.0}

static func apply_hit_points_damage(current_hp: float, damage: float) -> Dictionary:
	if not is_finite(current_hp) or current_hp < 0.0 or not is_finite(damage) or damage < 0.0:
		push_error("INVALID_HIT_POINTS_DAMAGE")
		return {}
	var applied: float = minf(current_hp, damage)
	var hp: float = maxf(0.0, current_hp - applied)
	return {"hp": hp, "damage_applied": applied, "defeated": hp == 0.0}

static func resolve_monster_lane_step(local_x: float, speed: float, delta_seconds: float,
		blocker_local_x: Variant = null, bite_reach: float = 0.0) -> Dictionary:
	if not is_finite(local_x) or not is_finite(speed) or speed < 0.0 or not is_finite(delta_seconds) or delta_seconds < 0.0 or not is_finite(bite_reach) or bite_reach < 0.0:
		return {}
	if blocker_local_x != null and not is_finite(float(blocker_local_x)):
		return {}
	var proposed: float = local_x - speed * delta_seconds
	if blocker_local_x == null:
		return {"local_x": proposed, "stopped_by_plant": false}
	var stop_x: float = float(blocker_local_x) + bite_reach
	var next_x: float = maxf(proposed, stop_x)
	return {"local_x": next_x, "stopped_by_plant": next_x == stop_x}

static func resolve_projectile_lane_step(local_x: float, speed: float, delta_seconds: float) -> float:
	if not is_finite(local_x) or not is_finite(speed) or speed < 0.0 or not is_finite(delta_seconds) or delta_seconds < 0.0:
		return NAN
	return local_x + speed * delta_seconds

static func select_lane_blocker(plants: Array, row: int, monster_local_x: float, max_overshoot: float = 0.0) -> Variant:
	if not is_finite(monster_local_x) or not is_finite(max_overshoot) or max_overshoot < 0.0:
		return null
	var nearest: Variant = null
	var nearest_x: float = -INF
	for candidate in plants:
		if not (candidate is Dictionary):
			continue
		var plant: Dictionary = candidate.get("plant", {})
		var x: float = float(candidate.get("local_x", NAN))
		if not plant.get("alive", false) or int(plant.get("row", -1)) != row or not is_finite(x) or x - monster_local_x > max_overshoot:
			continue
		if nearest == null or x > nearest_x:
			nearest = plant
			nearest_x = x
	return nearest

static func select_projectile_target(monsters: Array, row: int, local_x: float, collision_radius: float) -> Variant:
	if not is_finite(local_x) or not is_finite(collision_radius) or collision_radius < 0.0:
		return null
	for monster in monsters:
		if not (monster is Dictionary) or not monster.get("alive", false) or int(monster.get("row", -1)) != row:
			continue
		var x: float = float(monster.get("local_x", NAN))
		if is_finite(x) and absf(x - local_x) <= collision_radius * float(monster.get("width_scale", 1.0)):
			return monster
	return null

static func select_freeze_target(monsters: Array, row: int, projectile_local_x: float, collision_radius: float) -> Variant:
	if not is_finite(projectile_local_x) or not is_finite(collision_radius) or collision_radius < 0.0:
		return null
	var target: Variant = null
	var nearest_distance: float = INF
	for monster in monsters:
		if not (monster is Dictionary) or not monster.get("alive", false) or int(monster.get("row", -1)) != row:
			continue
		var x: float = float(monster.get("local_x", NAN))
		var width_scale: float = float(monster.get("width_scale", 1.0))
		if not is_finite(x) or not is_finite(width_scale) or width_scale <= 0.0:
			continue
		var distance: float = absf(x - projectile_local_x)
		if distance <= collision_radius * width_scale and distance < nearest_distance:
			target = monster
			nearest_distance = distance
	return target

static func select_farmer_melee_target(monsters: Array, row: int, farmer_x: float, reach: float) -> Variant:
	if not is_finite(farmer_x) or not is_finite(reach) or reach < 0.0:
		return null
	var target: Variant = null
	var nearest_distance: float = INF
	for monster in monsters:
		if not (monster is Dictionary) or not monster.get("alive", false) or int(monster.get("row", -1)) != row:
			continue
		var x: float = float(monster.get("x", NAN))
		if not is_finite(x):
			continue
		var distance: float = absf(x - farmer_x)
		if distance <= reach and distance < nearest_distance:
			target = monster
			nearest_distance = distance
	return target

static func select_dragon_fireball_target(plants: Array) -> Variant:
	var weakest: Variant = null
	var lowest_hp: float = INF
	for plant in plants:
		if not (plant is Dictionary) or not plant.get("alive", false):
			continue
		var hp: float = float(plant.get("hp", NAN))
		if is_finite(hp) and hp < lowest_hp:
			weakest = plant
			lowest_hp = hp
	return weakest

static func advance_cooldown(remaining_ms: float, delta_ms: float) -> float:
	if not is_finite(remaining_ms) or not is_finite(delta_ms) or delta_ms < 0.0:
		return NAN
	return remaining_ms - delta_ms

static func resolve_bite_attack(cooldown_ms: float, delta_ms: float, interval_ms: float) -> Dictionary:
	if not is_finite(cooldown_ms) or not is_finite(delta_ms) or delta_ms < 0.0 or not is_finite(interval_ms) or interval_ms <= 0.0:
		return {}
	var remaining: float = advance_cooldown(cooldown_ms, delta_ms)
	var should_attack: bool = remaining <= 0.0
	return {"should_attack": should_attack, "cooldown_ms": interval_ms if should_attack else remaining}

static func resolve_dust_skitter_motion_step(state: Dictionary) -> Dictionary:
	var jumping: bool = bool(state.get("is_jumping", false))
	var enable_jump: bool = bool(state.get("enable_jump", true))
	var delta_ms: float = float(state.get("delta_ms", NAN))
	var burst_cooldown: float = float(state.get("burst_cooldown_ms", NAN))
	var burst_remaining: float = float(state.get("burst_remaining_ms", NAN))
	var burst_duration: float = float(state.get("burst_duration_ms", NAN))
	var burst_multiplier: float = float(state.get("burst_speed_multiplier", NAN))
	if not is_finite(delta_ms) or delta_ms < 0.0 or not is_finite(burst_cooldown) or not is_finite(burst_remaining) or not is_finite(burst_duration) or burst_duration < 0.0 or not is_finite(burst_multiplier) or burst_multiplier <= 0.0:
		return {}
	var jump_cooldown: float = float(state.get("jump_cooldown_ms", NAN))
	var jump_elapsed: float = float(state.get("jump_elapsed_ms", NAN))
	var jump_duration: float = float(state.get("jump_duration_ms", NAN))
	var jump_speed: float = float(state.get("jump_speed_multiplier", NAN))
	var jump_height: float = float(state.get("jump_visual_height", NAN))
	var visual_scale: float = float(state.get("visual_scale", NAN))
	if enable_jump and (not is_finite(jump_cooldown) or not is_finite(jump_elapsed) or not is_finite(jump_speed) or jump_speed <= 0.0 or not is_finite(jump_height) or not is_finite(visual_scale) or visual_scale < 0.0):
		return {}
	var jump_started := false
	var jump_landed := false
	var jump_offset := 0.0
	var movement_multiplier := 1.0
	if not enable_jump:
		jumping = false
		jump_elapsed = 0.0
	if enable_jump:
		jump_cooldown = advance_cooldown(jump_cooldown, delta_ms)
		if not jumping and jump_cooldown <= 0.0:
			var next_duration: Variant = state.get("next_jump_duration_ms", null)
			if next_duration == null or not is_finite(float(next_duration)) or float(next_duration) <= 0.0:
				return {}
			jumping = true
			jump_elapsed = 0.0
			jump_duration = float(next_duration)
			jump_started = true
		if jumping:
			if not is_finite(jump_duration) or jump_duration <= 0.0:
				return {}
			jump_elapsed += delta_ms
			var progress: float = clampf(jump_elapsed / jump_duration, 0.0, 1.0)
			jump_offset = -sin(progress * PI) * jump_height * visual_scale
			movement_multiplier *= jump_speed
			if progress >= 1.0:
				jumping = false
				jump_elapsed = 0.0
				var reset: Variant = state.get("next_jump_reset_cooldown_ms", null)
				if reset == null or not is_finite(float(reset)) or float(reset) < 0.0:
					return {}
				jump_cooldown = float(reset)
				jump_landed = true
				jump_offset = 0.0
	var burst_started := false
	burst_cooldown = advance_cooldown(burst_cooldown, delta_ms)
	if burst_cooldown <= 0.0 and burst_remaining <= 0.0:
		var next_burst: Variant = state.get("next_burst_cooldown_ms", null)
		if next_burst == null or not is_finite(float(next_burst)) or float(next_burst) < 0.0:
			return {}
		burst_remaining = burst_duration
		burst_cooldown = float(next_burst)
		burst_started = true
	if burst_remaining > 0.0:
		burst_remaining = maxf(0.0, burst_remaining - delta_ms)
		movement_multiplier *= burst_multiplier
	return {
		"is_jumping": jumping, "jump_cooldown_ms": jump_cooldown,
		"jump_elapsed_ms": jump_elapsed, "jump_duration_ms": jump_duration,
		"jump_offset": jump_offset, "jump_started": jump_started, "jump_landed": jump_landed,
		"burst_cooldown_ms": burst_cooldown, "burst_remaining_ms": burst_remaining,
		"burst_started": burst_started, "movement_multiplier": movement_multiplier
	}

static func monster_archetype(wave: int, spawn_index: int) -> String:
	if wave < 1 or wave > WAVE_SIZES.size() or spawn_index < 0 or spawn_index >= total_stage_one_monsters():
		return ""
	if wave >= 4 and (spawn_index + 1) % 10 == 0:
		return "alpha-brute"
	if wave >= 5 and (spawn_index + 1) % 5 == 0:
		return "stonehide"
	if wave >= 3 and spawn_index % 3 == 1:
		return "dust-skitter"
	return "cave-brute"

static func resolve_wave_spawn_step(state: Dictionary) -> Dictionary:
	var wave: int = int(state.get("wave", 0))
	var total_waves: int = int(state.get("total_waves", WAVE_SIZES.size()))
	var wave_size: int = int(state.get("wave_size", -1))
	var spawned: int = int(state.get("spawned_this_wave", -1))
	var intermission: float = float(state.get("intermission_ms", NAN))
	var timer: float = float(state.get("spawn_timer_ms", NAN))
	var delta: float = float(state.get("delta_ms", NAN))
	if total_waves != WAVE_SIZES.size() or wave < 1 or wave > total_waves or wave_size != WAVE_SIZES[wave - 1] or spawned < 0 or spawned > wave_size or not is_finite(intermission) or intermission < 0.0 or not is_finite(timer) or not is_finite(delta) or delta < 0.0:
		return {}
	var next_intermission: float = maxf(0.0, intermission - delta) if intermission > 0.0 else 0.0
	var next_timer: float = timer
	var next_spawned: int = spawned
	var should_spawn := false
	if next_intermission <= 0.0 and spawned < wave_size:
		next_timer -= delta
		if next_timer <= 0.0:
			should_spawn = true
			next_spawned += 1
			next_timer = monster_spawn_interval_ms(wave)
	return {
		"should_spawn": should_spawn, "spawned_this_wave": next_spawned,
		"intermission_ms": next_intermission, "spawn_timer_ms": next_timer,
		"remaining_intermission_second": ceili(next_intermission / 1000.0)
	}
