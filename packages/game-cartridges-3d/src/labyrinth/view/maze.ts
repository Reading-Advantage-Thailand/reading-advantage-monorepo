/**
 * The stone labyrinth of the Goblin King from the dungeon kit: a floor tile in every cell, one
 * `wall` per wall edge, a `pillar` at every wall junction, torches along the outer wall, and the
 * arch with a portcullis at the gate. The 3D view and the 2D bake (demo/bake.ts) build it with
 * this same code, so the background of the 2D view is the 3D set seen from the 2D camera.
 */
import * as THREE from 'three';
import { InstancedSet, type Placement, type Stage3D } from '@reading-advantage/advantage-play-kit-3d/stage';
import type { Maze } from '../core/index.js';
import { edgePoint, inwardYaw, piecesOf } from './geometry.js';


/** The models of the maze set (the characters load separately). */
export const MAZE_MODELS = ['floor', 'floor-cracked', 'wall', 'pillar', 'arch', 'gate', 'torch-sconce'];

/** The wall models are built for this height (design section 4); pillars are scaled to match. */
export const WALL_HEIGHT = 1.2;

export interface MazeSet {
  /** The portcullis in the gate (it rises when the gate opens); null in a bake. */
  portcullis: THREE.Object3D | null;
  /** The green glow of the open gate. */
  glow: THREE.PointLight;
  /** The world point of the gate arch. */
  gateAt: { x: number; z: number };
}

export interface MazeOptions {
  /** False in a bake: no portcullis (the 2D view draws the open gate itself). */
  dynamic?: boolean;
  /**
   * The wall height in meters. The 3D view keeps the full 1.2 m; the 2D bake looks from a lower
   * camera and builds low walls (0.55 m), so a wall hides little of the corridor behind it.
   */
  wallHeight?: number;
  /** Multiplies the light (the 3D view uses a brighter set than the bake). Default 1. */
  light?: number;
}

/** A pillar is scaled to the wall's height (its model is 1.43 m tall and 0.87 m wide). */
const PILLAR_SCALE = 0.84;

export function buildMaze(stage: Stage3D, maze: Maze, options: MazeOptions = {}): MazeSet {
  const dynamic = options.dynamic ?? true;
  const wallHeight = options.wallHeight ?? WALL_HEIGHT;
  const low = wallHeight < WALL_HEIGHT - 1e-6;
  const scene = stage.scene;
  scene.background = new THREE.Color('#0b0d14');
  scene.fog = null; // the whole maze is in view, from a distance that depends on the screen
  const light = options.light ?? 1;
  scene.add(new THREE.HemisphereLight(0xb4bfe6, 0x2f3042, 1.5 * light));
  stage.addSun(0xd9e0ff, 1.15 * light, [-5, 14, 8], [0, 0, 0], 12);

  // A warm, darker floor against the cool wall stone: the corridors read at a glance. The loader
  // belongs to this stage, so the change touches only this set.
  for (const name of ['floor', 'floor-cracked']) {
    stage.loader.get(stage.loader.modelPath(name))?.scene.traverse((n) => {
      if (!(n as THREE.Mesh).isMesh) return;
      const mat = (n as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.color.multiply(new THREE.Color(0.82, 0.58, 0.42));
    });
  }

  const pieces = piecesOf(maze);
  const placements: Placement[] = [];
  pieces.floors.forEach((p, i) => placements.push({ asset: (i * 7 + (i % 4)) % 6 === 0 ? 'floor-cracked' : 'floor', at: [p.x, 0, p.z] }));
  if (!low) {
    for (const p of pieces.walls) placements.push({ asset: 'wall', at: [p.x, 0, p.z], yaw: p.yaw });
    for (const p of pieces.pillars) placements.push({ asset: 'pillar', at: [p.x, 0, p.z], scale: PILLAR_SCALE });
  } else {
    // Low walls are flattened copies (the instanced set scales every axis alike).
    const flat = wallHeight / WALL_HEIGHT;
    const copy = (name: string, p: { x: number; z: number; yaw: number }, sx: number, sy: number): void => {
      const g = stage.loader.get(stage.loader.modelPath(name));
      if (!g) return;
      const obj = g.scene.clone();
      obj.position.set(p.x, 0, p.z);
      obj.rotation.y = THREE.MathUtils.degToRad(p.yaw);
      obj.scale.set(sx, sy, sx);
      obj.traverse((n) => {
        if ((n as THREE.Mesh).isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });
      stage.scene.add(obj);
    };
    for (const p of pieces.walls) copy('wall', p, 1, flat);
    for (const p of pieces.pillars) copy('pillar', p, PILLAR_SCALE, PILLAR_SCALE * flat);
  }

  // The arch in the outer wall at the gate, its front toward the maze.
  const gateEdge = edgePoint(maze, maze.gate, maze.gateSide);
  const yaw = inwardYaw(maze.gateSide);
  placements.push({ asset: 'arch', at: [gateEdge.x, 0, gateEdge.z], yaw, scale: low ? 0.55 : 1 });
  // A few torches on the outer wall (decoration: no lights, so the set stays cheap).
  const torch = (cell: { col: number; row: number }, side: 'up' | 'down' | 'left' | 'right'): void => {
    const e = edgePoint(maze, cell, side);
    const inset = { up: [0, 0.2], down: [0, -0.2], left: [0.2, 0], right: [-0.2, 0] }[side];
    placements.push({ asset: 'torch-sconce', at: [e.x + inset[0]!, low ? 0.2 : 0.35, e.z + inset[1]!], yaw: inwardYaw(side) });
  };
  for (const col of [1, Math.floor(maze.cols / 2) + 1, maze.cols - 2]) if (!(maze.gate.col === col && maze.gateSide === 'up')) torch({ col, row: 0 }, 'up');
  torch({ col: 0, row: Math.floor(maze.rows / 2) }, 'left');
  torch({ col: maze.cols - 1, row: Math.floor(maze.rows / 2) }, 'right');

  const set = new InstancedSet(placements, (a) => stage.loader.get(stage.loader.modelPath(a)), new Set(['floor', 'floor-cracked']));
  scene.add(set.group);

  // The dark ground beyond the walls.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  let portcullis: THREE.Object3D | null = null;
  const glow = new THREE.PointLight(0x9dffb0, 0, 7, 1.5);
  const inward = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[maze.gateSide];
  glow.position.set(gateEdge.x + inward[0]! * 0.6, 1.2, gateEdge.z + inward[1]! * 0.6);
  scene.add(glow);
  if (dynamic) {
    const g = stage.loader.get(stage.loader.modelPath('gate'));
    if (g) {
      portcullis = g.scene.clone();
      portcullis.position.set(gateEdge.x, 0, gateEdge.z);
      portcullis.rotation.y = THREE.MathUtils.degToRad(yaw);
      portcullis.scale.setScalar(1.3);
      scene.add(portcullis);
    }
  }
  return { portcullis, glow, gateAt: gateEdge };
}
