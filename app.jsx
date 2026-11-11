import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { findPath } from "./pathfinding";
import "./App.css";

const PLAYER_SPEED = 7;

const ABILITIES = {
  Q: "Fireball",
  W: "Arcane Shield",
  E: "Shadow Step",
  R: "Sword Strike",
};

const EQUIPMENT_SLOTS = [
  { id: "helmet", name: "Helmet", icon: "🪖" },
  { id: "amulet", name: "Amulet", icon: "📿" },
  { id: "chest", name: "Chest Armor", icon: "🥋" },
  { id: "ring1", name: "Ring 1", icon: "💍" },
  { id: "legs", name: "Leg Armor", icon: "👖" },
  { id: "ring2", name: "Ring 2", icon: "💍" },
  { id: "gloves", name: "Gloves", icon: "🧤" },
  { id: "mainHand", name: "Main Hand", icon: "⚔️" },
  { id: "boots", name: "Boots", icon: "🥾" },
  { id: "offHand", name: "Off Hand", icon: "🛡️" },
];

const STARTER_ITEMS = [
  {
    id: "rusty-sword",
    name: "Rusty Sword",
    icon: "⚔️",
    type: "Weapon",
    equipSlot: "mainHand",
    description: "An old sword. It has seen better days.",
    stats: { attack: 4, strength: 2 },
    value: 8,
  },
  {
    id: "wooden-shield",
    name: "Wooden Shield",
    icon: "🛡️",
    type: "Shield",
    equipSlot: "offHand",
    description: "A simple shield made from sturdy wood.",
    stats: { defense: 4 },
    value: 6,
  },
  {
    id: "leather-cap",
    name: "Leather Cap",
    icon: "🪖",
    type: "Helmet",
    equipSlot: "helmet",
    description: "Basic head protection for new adventurers.",
    stats: { defense: 2 },
    value: 5,
  },
  {
    id: "traveler-tunic",
    name: "Traveler Tunic",
    icon: "🥋",
    type: "Chest Armor",
    equipSlot: "chest",
    description: "Comfortable clothing for long journeys.",
    stats: { defense: 3 },
    value: 10,
  },
  {
    id: "leather-leggings",
    name: "Leather Leggings",
    icon: "👖",
    type: "Leg Armor",
    equipSlot: "legs",
    description: "Light leather leggings.",
    stats: { defense: 2 },
    value: 7,
  },
  {
    id: "leather-boots",
    name: "Leather Boots",
    icon: "🥾",
    type: "Boots",
    equipSlot: "boots",
    description: "A reliable pair of traveling boots.",
    stats: { defense: 1 },
    value: 5,
  },
  {
    id: "health-potion",
    name: "Health Potion",
    icon: "🧪",
    type: "Consumable",
    description: "A red potion that restores health.",
    stats: {},
    value: 5,
    stackable: true,
    count: 5,
  },
  {
    id: "mana-potion",
    name: "Mana Potion",
    icon: "🧴",
    type: "Consumable",
    description: "A blue potion that restores mana.",
    stats: {},
    value: 5,
    stackable: true,
    count: 3,
  },
  {
    id: "iron-ore",
    name: "Iron Ore",
    icon: "🪨",
    type: "Material",
    description: "A chunk of iron ore. Useful for smithing.",
    stats: {},
    value: 3,
    stackable: true,
    count: 12,
  },
  {
    id: "wild-herbs",
    name: "Wild Herbs",
    icon: "🌿",
    type: "Material",
    description: "Wild herbs that may be useful in alchemy.",
    stats: {},
    value: 2,
    stackable: true,
    count: 8,
  },
];

const EMPTY_EQUIPMENT = {
  helmet: null,
  chest: null,
  legs: null,
  boots: null,
  gloves: null,
  mainHand: null,
  offHand: null,
  amulet: null,
  ring1: null,
  ring2: null,
};

// ========================================
// GROUND
// ========================================

function Ground({ onGroundClick }) {
  const handleClick = (event) => {
    event.stopPropagation();
    onGroundClick(event.point.x, event.point.z);
  };

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={handleClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#477d3b" />
      </mesh>

      <mesh
        position={[0, 0.02, -8]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handleClick}
      >
        <planeGeometry args={[5, 100]} />
        <meshStandardMaterial color="#9b9686" />
      </mesh>
    </>
  );
}

// ========================================
// TREES AND ROCKS
// ========================================

function Tree({ position, scale = 1 }) {
  return (
    <group
      position={position}
      scale={scale}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
        <meshStandardMaterial color="#654329" />
      </mesh>

      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[1.3, 2.5, 8]} />
        <meshStandardMaterial color="#245b32" />
      </mesh>

      <mesh position={[0, 3.5, 0]} castShadow>
        <coneGeometry args={[0.9, 2, 8]} />
        <meshStandardMaterial color="#347b40" />
      </mesh>
    </group>
  );
}

function Rock({ position, scale = 1 }) {
  return (
    <mesh
      position={position}
      scale={scale}
      castShadow
      receiveShadow
      onPointerDown={(event) => event.stopPropagation()}
    >
      <dodecahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial color="#777b80" roughness={1} />
    </mesh>
  );
}

// ========================================
// DESTINATION MARKER
// ========================================

function DestinationMarker({ destination }) {
  if (!destination) return null;

  return (
    <group position={[destination.x, 0.08, destination.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.6, 32]} />
        <meshBasicMaterial
          color="#ffe066"
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
        <meshBasicMaterial color="#ffe066" />
      </mesh>
    </group>
  );
}

// ========================================
// PLAYER
// ========================================

function Player({
  path,
  onPathComplete,
  onPositionChange,
}) {
  const player = useRef();
  const cameraTarget = useRef(new THREE.Vector3());
  const pathIndex = useRef(0);

  useEffect(() => {
    pathIndex.current = 0;
  }, [path]);

  useFrame((state, delta) => {
    if (!player.current) return;

    delta = Math.min(delta, 0.05);

    const pos = player.current.position;

    if (path && path.length > 0) {
      const target = path[pathIndex.current];

      if (target) {
        const dx = target.x - pos.x;
        const dz = target.z - pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < 0.16) {
          pathIndex.current++;

          if (pathIndex.current >= path.length) {
            onPathComplete();
          }
        } else {
          const directionX = dx / distance;
          const directionZ = dz / distance;

          const movement = Math.min(
            PLAYER_SPEED * delta,
            distance
          );

          pos.x += directionX * movement;
          pos.z += directionZ * movement;

          const targetRotation = Math.atan2(
            directionX,
            directionZ
          );

          player.current.rotation.y = THREE.MathUtils.damp(
            player.current.rotation.y,
            targetRotation,
            10,
            delta
          );
        }
      }
    }

    cameraTarget.current.set(
      pos.x,
      pos.y + 6,
      pos.z + 11
    );

    state.camera.position.lerp(
      cameraTarget.current,
      Math.min(delta * 5, 1)
    );

    state.camera.lookAt(
      pos.x,
      pos.y + 1,
      pos.z
    );

    onPositionChange(pos.x, pos.z);
  });

  return (
    <group ref={player} position={[0, 0, 0]}>
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.45, 1, 4, 8]} />
        <meshStandardMaterial color="#4169e1" />
      </mesh>

      <mesh position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#e4b58b" />
      </mesh>

      <mesh position={[0.65, 1.2, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.12, 1.1, 0.12]} />
        <meshStandardMaterial
          color="#d7dce5"
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

// ========================================
// WORLD
// ========================================

function World({
  path,
  onPathChange,
  playerPosition,
  onPositionChange,
}) {
  const treeData = useMemo(() => {
    const result = [];

    for (let i = 0; i < 45; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const scale = 0.7 + Math.random() * 0.7;

      if (Math.abs(x) < 5) continue;
      if (Math.sqrt(x * x + z * z) < 4) continue;

      result.push({
        id: i,
        x,
        z,
        scale,
        radius: 0.85 * scale,
      });
    }

    return result;
  }, []);

  const rockData = useMemo(() => {
    const result = [];

    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      const scale = 0.5 + Math.random();

      if (Math.sqrt(x * x + z * z) < 4) continue;

      result.push({
        id: i,
        x,
        z,
        scale,
        radius: 0.8 * scale,
      });
    }

    return result;
  }, []);

  const obstacles = useMemo(
    () => [
      ...treeData.map((tree) => ({
        x: tree.x,
        z: tree.z,
        radius: tree.radius,
      })),
      ...rockData.map((rock) => ({
        x: rock.x,
        z: rock.z,
        radius: rock.radius,
      })),
    ],
    [treeData, rockData]
  );

  const handleGroundClick = (x, z) => {
    const newPath = findPath(
      playerPosition,
      { x, z },
      obstacles
    );

    if (newPath.length > 0) {
      onPathChange(newPath);
    } else {
      console.log("No available path to destination.");
    }
  };

  const destination =
    path.length > 0 ? path[path.length - 1] : null;

  return (
    <>
      <color attach="background" args={["#9ac8e8"]} />
      <fog attach="fog" args={["#9ac8e8", 35, 110]} />

      <ambientLight intensity={0.7} />

      <directionalLight
        position={[20, 30, 10]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Ground onGroundClick={handleGroundClick} />

      {treeData.map((tree) => (
        <Tree
          key={tree.id}
          position={[tree.x, 0, tree.z]}
          scale={tree.scale}
        />
      ))}

      {rockData.map((rock) => (
        <Rock
          key={rock.id}
          position={[rock.x, 0.4, rock.z]}
          scale={rock.scale}
        />
      ))}

      <DestinationMarker destination={destination} />

      <Player
        path={path}
        onPathComplete={() => onPathChange([])}
        onPositionChange={onPositionChange}
      />
    </>
  );
}

// ========================================
// INVENTORY ITEM SLOT
// ========================================

function InventorySlot({ item, selected, onClick }) {
  return (
    <button
      className={`inventory-slot ${selected ? "selected" : ""} ${
        item ? "has-item" : ""
      }`}
      onClick={onClick}
      title={item ? item.name : "Empty slot"}
      type="button"
    >
      {item && (
        <>
          <span className="item-icon">{item.icon}</span>
          {item.count > 1 && (
            <span className="item-count">{item.count}</span>
          )}
        </>
      )}
    </button>
  );
}

// ========================================
// MAIN APPLICATION
// ========================================

export default function App() {
  const [position, setPosition] = useState({
    x: 0,
    z: 0,
  });

  const [path, setPath] = useState([]);

  const [lastAbility, setLastAbility] = useState(
    "Click the ground to move"
  );

  const [inventory, setInventory] = useState(STARTER_ITEMS);
  const [equipment, setEquipment] = useState(EMPTY_EQUIPMENT);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedEquipmentSlot, setSelectedEquipmentSlot] = useState(null);

  const selectedItem =
    inventory.find((item) => item.id === selectedItemId) || null;

  const selectedEquippedItem = selectedEquipmentSlot
    ? equipment[selectedEquipmentSlot]
    : null;

  const stats = useMemo(() => {
    const totals = {
      attack: 5,
      defense: 5,
      strength: 5,
    };

    Object.values(equipment).forEach((item) => {
      if (!item || !item.stats) return;

      totals.attack += item.stats.attack || 0;
      totals.defense += item.stats.defense || 0;
      totals.strength += item.stats.strength || 0;
    });

    return totals;
  }, [equipment]);

  const activateAbility = (key) => {
    setLastAbility(`${key} — ${ABILITIES[key]}`);
    console.log(`Ability activated: ${ABILITIES[key]}`);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName)
      ) {
        return;
      }

      const key = event.key.toUpperCase();

      if (key === "I" && !event.repeat) {
        event.preventDefault();
        setInventoryOpen((open) => !open);
        return;
      }

      if (ABILITIES[key] && !event.repeat) {
        event.preventDefault();
        activateAbility(key);
      }

      if (key === "ESCAPE") {
        setInventoryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handlePositionChange = (x, z) => {
    setPosition((previous) => {
      if (
        Math.abs(previous.x - x) < 0.05 &&
        Math.abs(previous.z - z) < 0.05
      ) {
        return previous;
      }

      return { x, z };
    });
  };

  const equipSelectedItem = () => {
    if (!selectedItem || !selectedItem.equipSlot) return;

    const slot = selectedItem.equipSlot;
    const currentlyEquipped = equipment[slot];

    const newInventory = inventory.filter(
      (item) => item.id !== selectedItem.id
    );

    if (currentlyEquipped) {
      newInventory.push(currentlyEquipped);
    }

    setInventory(newInventory);
    setEquipment((previous) => ({
      ...previous,
      [slot]: selectedItem,
    }));

    setSelectedItemId(null);
    setSelectedEquipmentSlot(null);
  };

  const unequipItem = (slot) => {
    const item = equipment[slot];

    if (!item) return;

    if (inventory.length >= 28) {
      window.alert("Your inventory is full. Make room before unequipping.");
      return;
    }

    setInventory((previous) => [...previous, item]);

    setEquipment((previous) => ({
      ...previous,
      [slot]: null,
    }));

    setSelectedEquipmentSlot(null);
    setSelectedItemId(null);
  };

  const selectInventoryItem = (item) => {
    setSelectedItemId(item ? item.id : null);
    setSelectedEquipmentSlot(null);
  };

  const selectEquipmentItem = (slot) => {
    if (!equipment[slot]) return;

    setSelectedEquipmentSlot(slot);
    setSelectedItemId(null);
  };

  const closeInventory = () => {
    setInventoryOpen(false);
    setSelectedItemId(null);
    setSelectedEquipmentSlot(null);
  };

  return (
    <div
      className="game"
      onContextMenu={(event) => event.preventDefault()}
    >
      <Canvas
        shadows
        camera={{
          position: [0, 6, 11],
          fov: 60,
        }}
        gl={{ antialias: true }}
      >
        <World
          path={path}
          onPathChange={setPath}
          playerPosition={position}
          onPositionChange={handlePositionChange}
        />
      </Canvas>

      <div className="game-hud">
        <div className="logo">
          <h1>SHATTERED REALMS</h1>
          <span>THE LOST KINGDOM</span>
        </div>

        <div className="player-panel">
          <div className="health">
            <span>HP</span>
            <div className="bar">
              <div className="bar-fill" />
            </div>
            <span>100 / 100</span>
          </div>

          <div className="mana">
            <span>MP</span>
            <div className="bar">
              <div className="mana-fill" />
            </div>
            <span>50 / 50</span>
          </div>

          <div className="stat-summary">
            <span>⚔ ATK: {stats.attack}</span>
            <span>🛡 DEF: {stats.defense}</span>
            <span>💪 STR: {stats.strength}</span>
          </div>
        </div>

        <div className="coordinates">
          X: {position.x.toFixed(1)} | Z: {position.z.toFixed(1)}
        </div>

        <div className="controls">
          <strong>CONTROLS</strong>
          <span>Left-click — Move</span>
          <span>Q — Fireball</span>
          <span>W — Arcane Shield</span>
          <span>E — Shadow Step</span>
          <span>R — Sword Strike</span>
          <span>I — Inventory</span>
          <span>{lastAbility}</span>
        </div>

        <div className="bottom-bar">
          <button
            className="action-slot"
            title="Q - Fireball"
            onClick={() => activateAbility("Q")}
            type="button"
          >
            Q
            <small>🔥</small>
          </button>

          <button
            className="action-slot"
            title="W - Arcane Shield"
            onClick={() => activateAbility("W")}
            type="button"
          >
            W
            <small>🛡️</small>
          </button>

          <button
            className="action-slot"
            title="E - Shadow Step"
            onClick={() => activateAbility("E")}
            type="button"
          >
            E
            <small>✨</small>
          </button>

          <button
            className="action-slot"
            title="R - Sword Strike"
            onClick={() => activateAbility("R")}
            type="button"
          >
            R
            <small>⚔️</small>
          </button>

          <button
            className={`action-slot ${inventoryOpen ? "active-slot" : ""}`}
            title="Inventory (I)"
            onClick={() => setInventoryOpen((open) => !open)}
            type="button"
          >
            🎒
          </button>

          <button
            className="action-slot"
            title="Skills - Coming Soon"
            onClick={() => setLastAbility("Skills system coming soon")}
            type="button"
          >
            ⚒
          </button>
        </div>

        {inventoryOpen && (
          <div
            className="inventory-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeInventory();
              }
            }}
          >
            <div className="inventory-window">
              <div className="inventory-header">
                <div>
                  <h2>ADVENTURER'S INVENTORY</h2>
                  <span>Manage your items and equipment</span>
                </div>

                <button
                  className="close-button"
                  onClick={closeInventory}
                  type="button"
                  title="Close inventory"
                >
                  ✕
                </button>
              </div>

              <div className="inventory-content">
                <section className="inventory-section">
                  <h3>INVENTORY</h3>

                  <div className="inventory-grid">
                    {Array.from({ length: 28 }).map((_, index) => {
                      const item = inventory[index];

                      return (
                        <InventorySlot
                          key={item ? item.id : `empty-${index}`}
                          item={item}
                          selected={item?.id === selectedItemId}
                          onClick={() => selectInventoryItem(item)}
                        />
                      );
                    })}
                  </div>

                  <div className="inventory-count">
                    {inventory.length} / 28 slots occupied
                  </div>
                </section>

                <section className="equipment-section">
                  <h3>EQUIPMENT</h3>

                  <div className="equipment-grid">
                    {EQUIPMENT_SLOTS.map((slot) => {
                      const item = equipment[slot.id];

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className={`equipment-slot ${
                            item ? "equipped" : ""
                          } ${
                            selectedEquipmentSlot === slot.id
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => selectEquipmentItem(slot.id)}
                          title={
                            item
                              ? `${slot.name}: ${item.name}`
                              : slot.name
                          }
                        >
                          <span className="equipment-icon">
                            {item ? item.icon : slot.icon}
                          </span>
                          <span className="equipment-name">
                            {slot.name}
                          </span>
                          {item && (
                            <span className="equipped-name">
                              {item.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="character-stats">
                    <h3>CHARACTER STATS</h3>
                    <div><span>Attack</span><strong>{stats.attack}</strong></div>
                    <div><span>Defense</span><strong>{stats.defense}</strong></div>
                    <div><span>Strength</span><strong>{stats.strength}</strong></div>
                  </div>
                </section>
              </div>

              <section className="item-details">
                <div className="item-details-info">
                  {selectedItem || selectedEquippedItem ? (
                    <>
                      <span className="details-icon">
                        {(selectedItem || selectedEquippedItem).icon}
                      </span>
                      <div>
                        <strong>
                          {(selectedItem || selectedEquippedItem).name}
                        </strong>
                        <span>
                          {(selectedItem || selectedEquippedItem).type}
                          {(selectedItem || selectedEquippedItem).count > 1
                            ? ` · Quantity: ${(selectedItem || selectedEquippedItem).count}`
                            : ""}
                        </span>
                        <p>
                          {(selectedItem || selectedEquippedItem).description}
                        </p>
                        {(selectedItem || selectedEquippedItem).stats &&
                          Object.entries(
                            (selectedItem || selectedEquippedItem).stats
                          ).map(([stat, value]) => (
                            <span className="item-stat" key={stat}>
                              {stat.charAt(0).toUpperCase() + stat.slice(1)} +{value}
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="empty-details">
                      Select an item or equipped piece of gear to see its details.
                    </div>
                  )}
                </div>

                <div className="item-actions">
                  {selectedItem?.equipSlot && (
                    <button
                      className="inventory-action-button equip-button"
                      onClick={equipSelectedItem}
                      type="button"
                    >
                      EQUIP
                    </button>
                  )}

                  {selectedEquipmentSlot && selectedEquippedItem && (
                    <button
                      className="inventory-action-button unequip-button"
                      onClick={() => unequipItem(selectedEquipmentSlot)}
                      type="button"
                    >
                      UNEQUIP
                    </button>
                  )}
                </div>
              </section>

              <div className="inventory-footer">
                <span>Drag-free inventory · Click items to inspect</span>
                <span>Press I or ESC to close</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
