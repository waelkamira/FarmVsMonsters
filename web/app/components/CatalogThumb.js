const TWEMOJI = "https://cdn.jsdelivr.net/gh/twitter/twemoji@15.1.0/assets/72x72";
const LOCAL_PLANT_ICONS = {
  radish: "/assets/plants/radish-level-1.png",
  "energy-mushroom": "/assets/plants/mushroom.png",
  mango: "/assets/plants/mango-level-1.png",
  "pumpkin-guard": "/assets/plants/pumpkin.png",
  "pea-shooter": "/assets/plant-icons/pea-shooter.svg",
  "thorn-wall": "/assets/plant-icons/thorn-wall.svg",
  sunflower: "/assets/plant-icons/sunflower.svg",
  "ice-bloom": "/assets/plant-icons/ice-bloom.svg",
  "double-radish": "/assets/plant-icons/double-radish.svg",
  "explosive-berry": "/assets/plant-icons/explosive-berry.svg",
  "fire-pepper": "/assets/plant-icons/fire-pepper.svg"
};

const LOCAL_MONSTER_ICONS = {
  "cave-brute": "/assets/monster-icons/cave-brute.svg",
  "dust-skitter": "/assets/monster-icons/dust-skitter.svg",
  stonehide: "/assets/monster-icons/stonehide.svg",
  "alpha-brute": "/assets/monster-icons/alpha-brute.svg",
  dragon: "/assets/monster-icons/dragon.svg"
};

const ART = {
  radish: ["1f96c", "Radish greens"],
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
  "cave-brute": ["1f43a", "Wolf-like hyena"],
  "dust-skitter": ["1f4a8", "Speed dust"],
  stonehide: ["1f6e1", "Armored shield"],
  "alpha-brute": ["1f451", "Alpha crown"],
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
      <img
        src={localIcon || `${TWEMOJI}/${safeCode}.png`}
        alt=""
        className={id === "radish" ? "catalog-thumb-radish-sheet" : undefined}
        loading="lazy"
        onError={(event) => {
          if (localIcon && !event.currentTarget.dataset.fallback) {
            event.currentTarget.dataset.fallback = "true";
            event.currentTarget.className = "";
            event.currentTarget.src = `${TWEMOJI}/${safeCode}.png`;
            return;
          }
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}
