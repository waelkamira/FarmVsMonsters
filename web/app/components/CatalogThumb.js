import SpriteThumbnail from "./SpriteThumbnail.jsx";

const TWEMOJI = "https://cdn.jsdelivr.net/gh/twitter/twemoji@15.1.0/assets/72x72";
const LOCAL_PLANT_ICONS = {
  radish: "/assets/plants/radish-level-1.png",
  "energy-mushroom": "/assets/plants/mushroom.png",
  mango: "/assets/plants/mango-level-1.png",
  pineapple: "/assets/plants/pineapple-level-1.png",
  hazelnut: "/assets/plants/hazelnut-level-1.png",
  "snow-thrower": "/assets/plants/Snow-thrower-level-1.png",
  "electric-mushroom": "/assets/plants/Electric-mushroom-level-1.png",
  "pumpkin-guard": "/assets/plants/pumpkin.png",
  "pea-shooter": "/assets/plant-icons/pea-shooter.svg",
  "thorn-wall": "/assets/plant-icons/thorn-wall.svg",
  sunflower: "/assets/plant-icons/sunflower.svg",
  "ice-bloom": "/assets/plant-icons/ice-bloom.svg",
  "double-radish": "/assets/plant-icons/double-radish.svg",
  "explosive-berry": "/assets/plant-icons/explosive-berry.svg",
};

const SPRITE_SHEET_PLANTS = new Set(["radish", "mango", "pineapple", "hazelnut", "snow-thrower", "electric-mushroom"]);

const LOCAL_MONSTER_ICONS = {
  "monster-01": "/assets/monster-icons/monster-01.svg",
  "monster-01": "/assets/monster-icons/monster-01.svg",
  monster-01: "/assets/monster-icons/monster-01.svg",
  "monster-01": "/assets/monster-icons/monster-01.svg",
  dragon: "/assets/monster-icons/dragon.svg"
};

const ART = {
  radish: ["1f96c", "Radish greens"],
  pineapple: ["1f34d", "Pineapple"],
  hazelnut: ["1f330", "Chestnut"],
  "snow-thrower": ["2744", "Snowflake"],
  "electric-mushroom": ["26a1", "High voltage"],
  "energy-mushroom": ["1f344", "Mushroom"],
  mango: ["1f96d", "Mango"],
  "pumpkin-guard": ["1f383", "Pumpkin"],
  "pea-shooter": ["1fadb", "Pea pod"],
  "thorn-wall": ["1f335", "Cactus"],
  sunflower: ["1f33b", "Sunflower"],
  "ice-bloom": ["2744", "Snowflake"],
  "double-radish": ["1f331", "Seedling"],
  "explosive-berry": ["1fad0", "Blueberries"],
  "fire-pepper": ["1fad1", "Hot pepper"],
  "monster-01": ["1f43a", "Wolf-like hyena"],
  "monster-01": ["1f4a8", "Speed dust"],
  monster-01: ["1f6e1", "Armored shield"],
  "monster-01": ["1f451", "Alpha crown"],
  dragon: ["1f409", "Dragon"],
  princess: ["1f478", "Princess"],
  farmer: ["1f9d1-200d-1f33e", "Farmer"],
  stage: ["1f3f0", "Fantasy castle"]
};

export default function CatalogThumb({ id, label, className = "" }) {
  const [code, fallback] = ART[id] || ART.stage;
  const safeCode = code.replace(/[^a-f0-9-]/gi, "");
  const localIcon = LOCAL_PLANT_ICONS[id] || LOCAL_MONSTER_ICONS[id];
  return (
    <div className={`catalog-thumb ${className}`} role="img" aria-label={label || fallback}>
      <span className="catalog-thumb-glow" />
      {SPRITE_SHEET_PLANTS.has(id) && localIcon ? (
        <SpriteThumbnail src={localIcon} rows={3} columns={3} frameCount={9} alt="" className="catalog-thumb-art" decorative />
      ) : (
        <img
          src={localIcon || `${TWEMOJI}/${safeCode}.png`}
          alt=""
          className="catalog-thumb-art"
          loading="lazy"
          onError={(event) => {
            if (localIcon && !event.currentTarget.dataset.fallback) {
              event.currentTarget.dataset.fallback = "true";
              event.currentTarget.className = "catalog-thumb-art";
              event.currentTarget.src = `${TWEMOJI}/${safeCode}.png`;
              return;
            }
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}
