import { createSeededRandom, seededShuffle } from "../../internal/random";

/** Direction assigned to one selectable branch above the current cube. */
export type StepDirection = "left" | "forward" | "right";

/** Stable word token consumed by a reusable adjacent-step graph. */
export interface StepGraphToken {
  /** Stable identity that remains distinct when visible words repeat. */
  id: string;
  /** Word or punctuation displayed on a graph node. */
  text: string;
}

/** Integer grid coordinate projected by the Phaser scene. */
export interface StepGraphCoordinate {
  /** Isometric grid column. */
  gridX: number;
  /** Isometric grid row. */
  gridY: number;
  /** Vertical ziggurat tier. */
  elevation: number;
}

/** One legal or distracting cube in a deterministic graph level. */
export interface StepGraphNode {
  /** Stable node identity within the generated graph. */
  id: string;
  /** Token identity represented by the cube. */
  tokenId: string;
  /** Visible cube label. */
  text: string;
  /** Zero-based sentence-token level. */
  level: number;
  /** Direction selected by keyboard or touch. */
  direction: StepDirection;
  /** Whether this cube advances the ordered learning path. */
  correct: boolean;
  /** Node identities from which this cube may be selected. */
  reachableFrom: readonly string[];
  /** Logical coordinate used by isometric projection. */
  coordinate: StepGraphCoordinate;
}

/** Complete deterministic graph for one ordered token sequence. */
export interface IsometricStepGraph {
  /** Synthetic starting node below the first ziggurat tier. */
  originNodeId: string;
  /** Three selectable nodes for every required token. */
  levels: readonly (readonly StepGraphNode[])[];
  /** Flat node lookup table for transitions and rendering. */
  nodes: Readonly<Record<string, StepGraphNode>>;
}

const DIRECTIONS: readonly StepDirection[] = ["left", "forward", "right"];
const LANES: Readonly<Record<StepDirection, number>> = {
  left: -1,
  forward: 0,
  right: 1,
};

function createDistractorToken(
  tokens: readonly StepGraphToken[],
  expectedIndex: number,
  distractorIndex: number,
  random: () => number,
): StepGraphToken {
  const expectedText = tokens[expectedIndex]!.text
    .normalize("NFKC")
    .toLocaleLowerCase();
  const candidates = tokens.filter(
    (token) => token.text.normalize("NFKC").toLocaleLowerCase() !== expectedText,
  );
  if (candidates.length === 0) {
    return {
      id: `decoy:${expectedIndex}:${distractorIndex}`,
      text: distractorIndex === 0 ? "◇" : "◆",
    };
  }
  return candidates[Math.floor(random() * candidates.length)]!;
}

/**
 * Generates a seeded three-choice graph whose correct route cannot dead-end.
 * @param tokens Ordered stable tokens that form the required path.
 * @param seed Reproducible graph seed.
 * @returns A graph with one reachable correct node at every level.
 * @throws When no tokens are supplied.
 */
export function createIsometricStepGraph(
  tokens: readonly StepGraphToken[],
  seed: number,
): IsometricStepGraph {
  if (tokens.length === 0) {
    throw new Error("Isometric step graph requires at least one token");
  }

  const originNodeId = "ziggurat-origin";
  const random = createSeededRandom(seed);
  let previousCorrectNodeId = originNodeId;
  const levels = tokens.map((expectedToken, level) => {
    const shuffledDirections = seededShuffle(DIRECTIONS, random);
    const correctDirection = shuffledDirections[0]!;
    let distractorIndex = 0;
    const nodes = DIRECTIONS.map((direction): StepGraphNode => {
      const correct = direction === correctDirection;
      const representedToken = correct
        ? expectedToken
        : createDistractorToken(tokens, level, distractorIndex++, random);
      const lane = LANES[direction];
      return {
        id: `level:${level}:${direction}:${representedToken.id}`,
        tokenId: representedToken.id,
        text: representedToken.text,
        level,
        direction,
        correct,
        reachableFrom: [previousCorrectNodeId],
        coordinate: {
          gridX: level + lane,
          gridY: level - lane,
          elevation: level + 1,
        },
      };
    });
    previousCorrectNodeId = nodes.find((node) => node.correct)!.id;
    return nodes;
  });
  const nodes = Object.fromEntries(
    levels.flat().map((node) => [node.id, node]),
  );

  return { originNodeId, levels, nodes };
}

/**
 * Returns cubes directly selectable from a current graph node.
 * @param graph Generated adjacent-step graph.
 * @param currentNodeId Current player node identity.
 * @returns The next legal branch, or an empty array at the summit.
 */
export function getAdjacentStepNodes(
  graph: IsometricStepGraph,
  currentNodeId: string,
): readonly StepGraphNode[] {
  return graph.levels
    .flat()
    .filter((node) => node.reachableFrom.includes(currentNodeId));
}

/**
 * Tests whether a target cube is directly reachable from the current cube.
 * @param graph Generated adjacent-step graph.
 * @param currentNodeId Current player node identity.
 * @param targetNodeId Candidate target identity.
 * @returns Whether the candidate is a legal adjacent selection.
 */
export function isAdjacentStep(
  graph: IsometricStepGraph,
  currentNodeId: string,
  targetNodeId: string,
): boolean {
  return graph.nodes[targetNodeId]?.reachableFrom.includes(currentNodeId) ?? false;
}
