extends SceneTree

var failures := 0

func _initialize() -> void:
	call_deferred("_run_geometry_checks")

func _run_geometry_checks() -> void:
	var battle := load("res://scenes/live_battle.tscn").instantiate()
	root.add_child(battle)
	await process_frame

	var nodes: Array = battle.get("grid_nodes")
	_expect(nodes.size() == 6, "Calibration must load six control-point rows.")
	if nodes.size() == 6:
		for row in range(6):
			_expect(nodes[row].size() == 9, "Calibration row %d must contain nine nodes." % row)

	for row in range(5):
		for column in range(8):
			var center: Vector2 = battle.call("_grid_cell_center", column, row)
			var local_x: float = Rules.plant_lane_local_x(column)
			var lane_center: Vector2 = battle.call("_lane_point", local_x, row)
			_expect(center.distance_to(lane_center) < 0.01,
				"Perspective lane point must match cell center at row %d, column %d." % [row, column])
			var screen_center: Vector2 = battle.call("_to_screen", center)
			var hit_cell: Vector2i = battle.call("_cell_at_screen_position", screen_center)
			_expect(hit_cell == Vector2i(column, row),
				"Screen tap must resolve to its calibrated soil cell at row %d, column %d." % [row, column])
			var planting_center: Vector2 = battle.call("_planting_cell_center", column, row)
			var uv: Vector2 = battle.call("_board_coordinates", planting_center)
			var reconstructed: Vector2 = battle.call("_board_point", uv.x, uv.y)
			_expect(reconstructed.distance_to(planting_center) < 0.1,
				"Planting route coordinates must round-trip at row %d, column %d." % [row, column])

	var farmer_start := Vector2(220.0, (battle.call("_grid_cell_center", 0, 2) as Vector2).y)
	var start_uv: Vector2 = battle.call("_board_coordinates", farmer_start)
	var reconstructed_start: Vector2 = battle.call("_board_point", start_uv.x, start_uv.y)
	_expect(reconstructed_start.distance_to(farmer_start) < 0.1,
		"Farmer start outside the grid must round-trip through the outer board quad.")

	battle.queue_free()
	await process_frame
	if failures == 0:
		print("LIVE_BATTLE_GEOMETRY_OK: 40 cells, lane centers, tap mapping and Farmer route.")
		quit(0)
	else:
		push_error("LIVE_BATTLE_GEOMETRY_FAILED: %d checks failed." % failures)
		quit(1)

func _expect(condition: bool, message: String) -> void:
	if not condition:
		failures += 1
		push_error(message)

const Rules = preload("res://scripts/phase_one_rules.gd")
