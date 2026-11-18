extends SceneTree

const Rules = preload("res://scripts/phase_one_rules.gd")

func _initialize() -> void:
	assert(Rules.CONTRACT_VERSION == 1)
	assert(Rules.BOARD_COLUMNS == 8)
	assert(Rules.BOARD_ROWS == 5)
	assert(Rules.WAVE_SIZES == [3, 5, 6, 7, 9])
	assert(Rules.total_stage_one_monsters() == 30)
	assert(Rules.is_valid_cell(0, 0))
	assert(Rules.is_valid_cell(7, 4))
	assert(not Rules.is_valid_cell(8, 4))
	assert(not Rules.is_valid_cell(0, 5))
	assert(Rules.plant_cost("radish") == 35)
	assert(Rules.plant_cost("energy_mushroom") == 50)
	assert(Rules.plant_cost("unknown") == -1)
	var placement := Rules.resolve_plant_placement(150.0, [], "radish", 0, 0)
	assert(placement.ok and placement.energy == 115.0)
	var planted: Dictionary = placement.plant.duplicate(true)
	var uproot := Rules.resolve_plant_uproot(100.0, planted)
	assert(uproot.ok and uproot.energy == 135.0 and uproot.refund == 35)
	planted.alive = false
	assert(not Rules.resolve_plant_uproot(100.0, planted).ok)
	assert(Rules.apply_energy_delta(150, -25) == 125)
	assert(Rules.apply_energy_delta(290, 50) == 300)
	assert(Rules.apply_energy_delta(10, -50) == 0)
	print("Phase One rule smoke tests passed.")
	quit(0)
