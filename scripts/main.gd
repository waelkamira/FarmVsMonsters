extends Control

const BATTLE_SCENE: String = "res://scenes/live_battle.tscn"

func _ready() -> void:
	_build_menu()

func _build_menu() -> void:
	var background := ColorRect.new()
	background.color = Color("#243b2b")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var content := VBoxContainer.new()
	content.custom_minimum_size = Vector2(520, 0)
	content.add_theme_constant_override("separation", 22)
	center.add_child(content)

	var title := Label.new()
	title.text = "FARM VS MONSTERS"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 42)
	content.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "Offline • Single Player • Godot 4"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 20)
	content.add_child(subtitle)

	var start_button := Button.new()
	start_button.text = "Start Stage 1 — Live Combat"
	start_button.custom_minimum_size = Vector2(0, 64)
	start_button.pressed.connect(_open_battle)
	content.add_child(start_button)

	var note := Label.new()
	note.text = "Playable combat prototype • Five waves • 30 enemies"
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content.add_child(note)

func _open_battle() -> void:
	var error: Error = get_tree().change_scene_to_file(BATTLE_SCENE)
	if error != OK:
		push_error("Could not open live battle. Error: %s" % error)
