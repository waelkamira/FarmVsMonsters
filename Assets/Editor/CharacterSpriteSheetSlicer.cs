using System.Collections.Generic;
using UnityEditor;
using UnityEditor.U2D.Sprites;
using UnityEngine;

namespace FarmVsMonsters.EditorTools
{
    /// <summary>
    /// Slices the project's standard 6x6 character atlas into consistently named sprites.
    /// Select a PNG in the Project window, then use Tools/Farm Vs Monsters/Slice Plant Character Sheet (6x6).
    /// </summary>
    public static class CharacterSpriteSheetSlicer
    {
        private const int Columns = 6;
        private const int Rows = 6;

        // Stationary plant defenders do not need a Walk animation row.
        private static readonly string[] RowNames =
        {
            "Idle", "Attack", "Hurt", "Block", "Death", "Special"
        };

        [MenuItem("Tools/Farm Vs Monsters/Slice Plant Character Sheet (6x6)", true)]
        private static bool ValidateSliceSelected()
        {
            return Selection.activeObject is Texture2D;
        }

        [MenuItem("Tools/Farm Vs Monsters/Slice Plant Character Sheet (6x6)")]
        private static void SliceSelected()
        {
            Texture2D texture = Selection.activeObject as Texture2D;
            if (texture == null)
            {
                EditorUtility.DisplayDialog("Character Sheet Slicer",
                    "Select a character sheet texture in the Project window first.", "OK");
                return;
            }

            string path = AssetDatabase.GetAssetPath(texture);
            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null)
            {
                EditorUtility.DisplayDialog("Character Sheet Slicer",
                    "The selected asset is not a texture importer asset.", "OK");
                return;
            }

            int width = texture.width;
            int height = texture.height;
            if (width < Columns || height < Rows || width % Columns != 0 || height % Rows != 0)
            {
                EditorUtility.DisplayDialog("Character Sheet Slicer",
                    "The image dimensions must divide evenly into 6 columns and 6 rows.\n\n" +
                    "Current size: " + width + " x " + height, "OK");
                return;
            }

            float cellWidth = width / (float)Columns;
            float cellHeight = height / (float)Rows;
            var spriteRects = new List<SpriteRect>(Columns * Rows);

            // The artwork is authored top-to-bottom, while Unity texture rects start at bottom-left.
            for (int row = 0; row < Rows; row++)
            {
                for (int column = 0; column < Columns; column++)
                {
                    int frameNumber = column + 1;
                    string rowName = RowNames[row];
                    string spriteName = rowName + "_" + frameNumber.ToString("00");

                    var spriteRect = new SpriteRect
                    {
                        name = spriteName,
                        rect = new Rect(
                            column * cellWidth,
                            (Rows - 1 - row) * cellHeight,
                            cellWidth,
                            cellHeight),
                        alignment = SpriteRectAlignment.Custom,
                        pivot = new Vector2(0.5f, 0f),
                        spriteID = GUID.Generate()
                    };
                    spriteRects.Add(spriteRect);
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
            ISpriteEditorDataProvider dataProvider =
                factories.GetSpriteEditorDataProviderFromObject(importer);
            dataProvider.InitSpriteEditorDataProvider();
            dataProvider.SetSpriteRects(spriteRects.ToArray());
            dataProvider.Apply();

            importer.SaveAndReimport();
            EditorUtility.DisplayDialog("Character Sheet Slicer",
                "Sliced 36 sprites from the selected 6x6 character sheet.\n\n" +
                "Frames are named by animation row and ordered left-to-right.", "OK");
        }
    }
}