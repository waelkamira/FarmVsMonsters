# Farm Economy and Storage Setup

This document describes the Unity Inspector work required to connect the farm economy systems. The scripts are committed, but the scene objects, prefabs, ScriptableObject assets, and UI references still need to be created in Unity.

## Required scene objects

Create these objects in the Farm scene:

- `FarmResourceWallet`: add the component to one persistent farm economy object.
- `FarmWarehouseService`: reference the same resource wallet. Configure base capacity, capacity added per level, upgrade price, multiplier, and maximum level.
- `FarmStorageFacilityService`: reference the same resource wallet, all storage facility definitions, and one named slot per facility.
- `FarmTradeContractService`: reference the same resource wallet and the contract definition catalogue.
- `FarmAnimalService`: reference the same resource wallet, animal definitions, pen slots, and optional animal root.
- Existing crop, production, and market services must reference that same wallet. Do not create separate wallets for each feature.

## Specialized storage definitions

Create ScriptableObject assets using **Farm Vs Monsters → Storage Facility**:

| Facility | Resources | Suggested capacity bonus / level |
|---|---|---:|
| Grain Store | Wheat, Seeds | 3,000 |
| Animal Products Store | Milk, Wool, Eggs, Meat | 2,000 |
| Processed Goods Store | Flour, Bread | 2,000 |
| Water Tank | Water | 2,500 |

For every facility:
1. Give it a unique Storage ID.
2. Give it a unique Slot ID and create a matching `FarmStorageSlot` scene object.
3. Assign its 3D building prefab.
4. Configure price, multiplier, level limit, and stage gate.
5. Add the definition to both the storage service catalogue and the UI controller list.

The general warehouse changes the base capacity for every resource. Specialized facilities add capacity only to their selected resources. Existing inventory is not truncated when capacities are changed.

## Trade contracts

Create ScriptableObject assets using **Farm Vs Monsters → Trade Contract**. Configure a unique ID, requested resource and quantity, coin reward, stage requirement, and optional time limit in hours (zero means no deadline).

Assign the same contract assets to:
- `FarmTradeContractService.contracts`
- `FarmTradeContractController.displayedContracts`

Connect the controller's accept buttons to the displayed offers, plus the delivery and cancel buttons. Assign the shared wallet so progress refreshes when resources change.

Only one delivery contract can be active at a time. Goods are consumed on successful delivery, and the configured farm coins are awarded. Expired contracts clear when the service is queried.

## Animal offline production

Animal definitions need a prefab, unique animal ID, output resource, quantity, interval, price, and stage requirement. Add enough unique pen slots for the animals the player can own.

Production uses UTC timestamps and is processed when the Farm scene loads and while it is running. If storage is full, the next due production cycle remains pending until capacity becomes available.

## UI wiring checklist

- Warehouse controller: assign level, capacity, stock, cost, status Text fields and upgrade Button.
- Storage facility controller: assign one facility Text and upgrade Button per displayed definition; connect capacity summary and status Text.
- Trade contract controller: assign one accept Button per displayed offer, active contract/progress/balance/status Text fields, delivery and cancel Buttons, and the shared resource wallet.
- Existing animal, crop, market, and production controllers: confirm they all point to the same wallet.

## Save data and limitations

- Farm coins/upgrades/buildings use the existing local progression save.
- Inventory, animal ownership/production clocks, warehouse level, specialized storage levels, production jobs, and active contracts use separate versioned PlayerPrefs records.
- These saves are local to the device and are not cloud-synchronized or server-authoritative.
- Device clock changes can affect offline timers.
- No Unity compilation or runtime test has been performed in this repository-only implementation pass. Prefab assignments, UI references, and scene wiring must be validated in the Unity Editor.
