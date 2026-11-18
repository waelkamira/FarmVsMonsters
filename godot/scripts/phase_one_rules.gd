class_name PhaseOneRules
extends RefCounted
## Initial typed mirror of stable Stage 1 contract values.
## Temporary balance values remain subject to parity review against Phaser tests.

const CONTRACT_VERSION: int = 1
const BOARD_COLUMNS: int = 8
const BOARD_ROWS: int = 5
const WAVE_SIZES: Array[int] = [3, 5, 6, 7, 9]
const INITIAL_ENERGY: int = 150
const MAX_ENERGY: int = 300

const PLANT_COSTS: Dictionary = {
	"radish": 25,
	"energy_mushroom": 50,
	"pumpkin": 75,
	"pineapple": 70,
	"hazelnut": 65,
	"mango": 70,
}

static func is_valid_cell(column: int, row: int) -> bool:
	return column >= 0 and column < BOARD_COLUMNS and row >= 0 and row < BOARD_ROWS

static func plant_cost(plant_id: String) -> int:
	return int(PLANT_COSTS.get(plant_id, -1))

static func apply_energy_delta(current: int, delta: int) -> int:
	return clampi(current + delta, 0, MAX_ENERGY)

static func total_stage_one_monsters() -> int:
	var total: int = 0
	for wave_size: int in WAVE_SIZES:
		total += wave_size
	return total
