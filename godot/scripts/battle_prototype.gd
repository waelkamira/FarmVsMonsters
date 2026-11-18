extends Control

const Rules = preload("res://scripts/phase_one_rules.gd")
const MENU_SCENE: String = "res://scenes/main.tscn"

var energy: int = Rules.INITIAL_ENERGY
var selected_plant: String = "radish"
var occupied_cells: Dictionary = {}

var energy_label: Label
var selection_label: Label
var feedback_label: Label
var board: GridContainer

func _ready() -> void:
	_build_screen()

func _build_screen() -> void:
	var background := ColorRect.new()
	background.color = Color("#263b2e")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_bottom", 22)
	add_child(margin)

	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 14)
	margin.add_child(layout)

	var heading := Label.new()
	heading.text = "STAGE 1 — BATTLE BOARD FOUNDATION"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.add_theme_font_size_override("font_size", 26)
	layout.add_child(heading)

	var toolbar := HBoxContainer.new()
	toolbar.add_theme_constant_override("separation", 12)
	layout.add_child(toolbar)

	energy_label = Label.new()
	energy_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	toolbar.add_child(energy_label)

	var plant_options: Array[Dictionary] = [
		{"id": "radish", "label": "Radish"},
		{"id": "mushroom", "label": "Mushroom"},
		{"id": "pumpkin", "label": "Pumpkin"},
		{"id": "pineapple", "label": "Pineapple"},
		{"id": "hazelnut", "label": "Hazelnut"},
		{"id": "mango", "label": "Mango"}
	]
	for option: Dictionary in plant_options:
		var plant_button := Button.new()
		plant_button.text = "%s (%d)" % [option.label, Rules.plant_cost(option.id)]
		plant_button.custom_minimum_size = Vector2(108, 48)
		plant_button.pressed.connect(_select_plant.bind(option.id))
		toolbar.add_child(plant_button)

	var menu_button := Button.new()
	menu_button.text = "Main Menu"
	menu_button.pressed.connect(_return_to_menu)
	toolbar.add_child(menu_button)

	selection_label = Label.new()
	selection_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	layout.add_child(selection_label)

	board = GridContainer.new()
	board.columns = Rules.BOARD_COLUMNS
	board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	board.add_theme_constant_override("h_separation", 8)
	board.add_theme_constant_override("v_separation", 8)
	layout.add_child(board)

	for row: int in range(Rules.BOARD_ROWS):
		for column: int in range(Rules.BOARD_COLUMNS):
			var cell_index: int = row * Rules.BOARD_COLUMNS + column
			var cell := Button.new()
			cell.text = "Empty"
			cell.custom_minimum_size = Vector2(80, 66)
			cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			cell.size_flags_vertical = Control.SIZE_EXPAND_FILL
			cell.pressed.connect(_place_selected_plant.bind(cell_index))
			board.add_child(cell)

	feedback_label = Label.new()
	feedback_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	layout.add_child(feedback_label)

	_update_hud()
	feedback_label.text = "Prototype only: select a defender, then tap an empty cell."

func _select_plant(plant_id: String) -> void:
	selected_plant = plant_id
	_update_hud()
	feedback_label.text = "Selected: %s" % plant_id.replace("_", " ").capitalize()

func _place_selected_plant(cell_index: int) -> void:
	var column: int = cell_index % Rules.BOARD_COLUMNS
	var row: int = floori(float(cell_index) / float(Rules.BOARD_COLUMNS))
	var current_plants: Array = []
	for key in occupied_cells.keys():
		var occupied_index: int = int(key)
		current_plants.append({
			"col": occupied_index % Rules.BOARD_COLUMNS,
			"row": floori(float(occupied_index) / float(Rules.BOARD_COLUMNS)),
			"alive": true
		})

	var placement: Dictionary = Rules.resolve_plant_placement(
		float(energy), current_plants, selected_plant, column, row
	)
	if not placement.get("ok", false):
		feedback_label.text = "Cannot plant: %s" % str(placement.get("reason", "unknown")).replace("_", " ").to_lower()
		return

	energy = int(placement.energy)
	occupied_cells[cell_index] = selected_plant
	var cell: Button = board.get_child(cell_index) as Button
	cell.text = selected_plant.replace("_", " ").capitalize()
	cell.disabled = true
	_update_hud()
	feedback_label.text = "Placed %s in row %d, column %d." % [selected_plant, row + 1, column + 1]

func _update_hud() -> void:
	if is_instance_valid(energy_label):
		energy_label.text = "Energy: %d / %d" % [energy, Rules.MAX_ENERGY]
	if is_instance_valid(selection_label):
		selection_label.text = "Selected defender: %s" % selected_plant.replace("_", " ").capitalize()

func _return_to_menu() -> void:
	var error: Error = get_tree().change_scene_to_file(MENU_SCENE)
	if error != OK:
		push_error("Could not return to main menu. Error: %s" % error)
