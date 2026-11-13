using UnityEditor;
using UnityEngine;

namespace FarmVsMonsters.EditorTools
{
    /// <summary>
    /// Applies predictable import defaults to generated 2D character artwork.
    /// Individual images and animation sheets use separate folders so slicing metadata remains controlled.
    /// </summary>
    public sealed class CharacterSpriteImportSettings : AssetPostprocessor
    {
        private const string IndividualPath = "/Art/Characters/Individual/";
        private const string SpriteSheetPath = "/Art/Characters/SpriteSheets/";

        private void OnPreprocessTexture()
        {
            if (!(assetPath.StartsWith("Assets" + IndividualPath) ||
                  assetPath.StartsWith("Assets" + SpriteSheetPath)))
                return;

            var importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Sprite;
            importer.alphaIsTransparency = true;
            importer.mipmapEnabled = false;
            importer.filterMode = FilterMode.Bilinear;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.maxTextureSize = 4096;
            importer.spritePixelsPerUnit = 100f;

            if (assetPath.StartsWith("Assets" + IndividualPath))
            {
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.spriteAlignment = (int)SpriteAlignment.BottomCenter;
                importer.spritePivot = new Vector2(0.5f, 0f);
            }
            else
            {
                // Keep sheet slicing metadata under the artist's control.
                importer.spriteImportMode = SpriteImportMode.Multiple;
            }
        }
    }
}