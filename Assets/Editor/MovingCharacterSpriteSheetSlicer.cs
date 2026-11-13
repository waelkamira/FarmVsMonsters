using System.Collections.Generic;
using UnityEditor;
using UnityEditor.U2D.Sprites;
using UnityEngine;

namespace FarmVsMonsters.EditorTools
{
    /// <summary>
    /// Slices a 6x6 locomotion/combat atlas for moving characters such as monsters
    /// and the caveman. This layout is intentionally separate from the plant atlas.
    /// </summary>
    public static class MovingCharacterSpriteSheetSlicer
    {
        private const int Columns = 6;
        private const int Rows = 6;
        private static readonly string[] RowNames =
        {
            "Idle", "Walk", "Attack", "Eat", "Hurt", "Death"
        };

        [MenuItem("Tools/Farm Vs Monsters/Slice Moving Character Sheet (6x6)", true)]
        private static bool ValidateSliceSelected()
        {
            return Selection.activeObject is Texture2D;
        }

        [MenuItem("Tools/Farm Vs Monsters/Slice Moving Character Sheet (6x6)")]
        private static void SliceSelected()
        {
            Texture2D texture = Selection.activeObject as Texture2D;
            if (texture == null)
            {
                EditorUtility.DisplayDialog("Moving Character Sheet",
                    "Select a character sheet texture in the Project window first.", "OK");
                return;
            }

            string path = AssetDatabase.GetAssetPath(texture);
            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null)
            {
                EditorUtility.DisplayDialog("Moving Character Sheet",
                    "The selected asset is not a texture importer asset.", "OK");
                return;
            }

            int width = texture.width;
            int height = texture.height;
            if (width < Columns || height < Rows ||
                width % Columns != 0 || height % Rows != 0)
            {
                EditorUtility.DisplayDialog("Moving Character Sheet",
                    "The image dimensions must divide evenly into 6 columns and 6 rows.\n\n" +
                    "Current size: " + width + " x " + height, "OK");
                return;
            }

            float cellWidth = width / (float)Columns;
            float cellHeight = height / (float)Rows;
            var rects = new List<SpriteRect>(Columns * Rows);

            for (int row = 0; row < Rows; row++)
            {
                for (int column = 0; column < Columns; column++)
                {
                    rects.Add(new SpriteRect
                    {
                        name = RowNames[row] + "_" + (column + 1).ToString("00"),
                        rect = new Rect(column * cellWidth,
                            (Rows - 1 - row) * cellHeight, cellWidth, cellHeight),
                        alignment = SpriteRectAlignment.Custom,
                        pivot = new Vector2(0.5f, 0f),
                        spriteID = GUID.Generate()
                    });
                }
            }

            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Multiple;
            importer.alphaIsTransparency = true;
            importer.mipmapEnabled = false;
            importer.filterMode = FilterMode.Bilinear;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.maxTextureSize = 8192;
            importer.spritePixelsPerUnit = 100f;

            var factories = new SpriteDataProviderFactories();
            factories.Init();
            ISpriteEditorDataProvider provider =
                factories.GetSpriteEditorDataProviderFromObject(importer);
            provider.InitSpriteEditorDataProvider();
            provider.SetSpriteRects(rects.ToArray());
            provider.Apply();
            importer.SaveAndReimport();

            EditorUtility.DisplayDialog("Moving Character Sheet",
                "Created 36 sprites: Idle, Walk, Attack, Eat, Hurt, and Death.\n" +
                "Each row contains six frames ordered left-to-right.", "OK");
        }
    }
}