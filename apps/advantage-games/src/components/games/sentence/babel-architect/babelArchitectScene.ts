import Phaser from "phaser";
import type { BabelArchitectBlock, BabelArchitectState } from "@/lib/games/babelArchitect";
import { BABEL_ARCHITECT_PALETTE } from "./assetManifest";

/** Phaser scene key used by the adapter to start the babel architect scene. */
export const BABEL_ARCHITECT_SCENE_KEY = "babel-architect";

/** Bridge between React-owned game state and the Phaser render scene. */
export interface BabelArchitectBridge {
  /** Returns the latest serializable game state for rendering. */
  getState: () => BabelArchitectState;
  /** Emits a player block-placement intent back to React. */
  onPlaceBlock: (blockId: string) => void;
}

const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;
const BLOCK_WIDTH = 104;
const BLOCK_HEIGHT = 50;
const ACTIVE_ROW_Y = 132;
const TOWER_BASE_Y = 790;
const BLOCK_STACK_OFFSET = 56;

interface BlockVisual {
  container: Phaser.GameObjects.Container;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

/**
 * Phaser scene that renders the Babel Architect tower and falling blocks.
 *
 * The scene is a dumb renderer: it reads serializable state from the bridge
 * each frame and emits placement intents. It owns no learning rules, scoring,
 * or completion logic.
 */
export class BabelArchitectScene extends Phaser.Scene {
  private bridge: BabelArchitectBridge | null = null;
  private activeBlocks: Map<string, BlockVisual> = new Map();
  private placedBlocks: Map<string, BlockVisual> = new Map();
  private renderedBlockIds: string[] = [];
  private renderedPlacedIds: string[] = [];
  private translationText: Phaser.GameObjects.Text | null = null;
  private builtText: Phaser.GameObjects.Text | null = null;
  private stabilityBar: Phaser.GameObjects.Rectangle | null = null;
  private stabilityLabel: Phaser.GameObjects.Text | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private feedbackText: Phaser.GameObjects.Text | null = null;
  private lastFeedbackKind: string | null = null;
  private background: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: BABEL_ARCHITECT_SCENE_KEY });
  }

  /**
   * Receives the state/intent bridge from the adapter.
   * @param data Bridge providing fresh state and the placement intent callback.
   */
  init(data: BabelArchitectBridge): void {
    this.bridge = data;
    this.activeBlocks.clear();
    this.placedBlocks.clear();
    this.renderedBlockIds = [];
    this.renderedPlacedIds = [];
    this.lastFeedbackKind = null;
  }

  /** Builds the static background, HUD text, and stability bar. */
  create(): void {
    this.renderBackground();
    this.renderTowerBase();
    this.renderHud();
  }

  /** Reads bridge state every frame and reconciles the visible scene. */
  update(): void {
    if (!this.bridge) return;
    const state = this.bridge.getState();
    this.reconcileActiveBlocks(state);
    this.reconcilePlacedBlocks(state);
    this.updateHud(state);
  }

  private renderBackground(): void {
    this.background = this.add.graphics();
    this.background.fillGradientStyle(
      BABEL_ARCHITECT_PALETTE.backgroundTop,
      BABEL_ARCHITECT_PALETTE.backgroundTop,
      BABEL_ARCHITECT_PALETTE.background,
      BABEL_ARCHITECT_PALETTE.background,
      1,
    );
    this.background.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  }

  private renderTowerBase(): void {
    this.add.rectangle(
      VIEWPORT_WIDTH / 2,
      TOWER_BASE_Y + 28,
      VIEWPORT_WIDTH - 24,
      56,
      BABEL_ARCHITECT_PALETTE.towerBase,
    );
    this.add.rectangle(
      VIEWPORT_WIDTH / 2,
      TOWER_BASE_Y + 4,
      VIEWPORT_WIDTH - 60,
      8,
      BABEL_ARCHITECT_PALETTE.stoneHighlight,
    );
  }

  private renderHud(): void {
    this.translationText = this.add
      .text(VIEWPORT_WIDTH / 2, 40, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: `#${BABEL_ARCHITECT_PALETTE.text.toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: VIEWPORT_WIDTH - 32 },
      })
      .setOrigin(0.5);

    this.builtText = this.add
      .text(VIEWPORT_WIDTH / 2, 74, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: `#${BABEL_ARCHITECT_PALETTE.accent.toString(16).padStart(6, "0")}`,
        align: "center",
        wordWrap: { width: VIEWPORT_WIDTH - 32 },
      })
      .setOrigin(0.5);

    this.stabilityBar = this.add.rectangle(
      24,
      VIEWPORT_HEIGHT / 2,
      16,
      360,
      BABEL_ARCHITECT_PALETTE.stabilityHigh,
    );
    this.stabilityBar.setOrigin(0.5, 0.5);

    this.stabilityLabel = this.add
      .text(24, VIEWPORT_HEIGHT / 2 - 200, "Stability", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: `#${BABEL_ARCHITECT_PALETTE.text.toString(16).padStart(6, "0")}`,
      })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(VIEWPORT_WIDTH - 20, 40, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: `#${BABEL_ARCHITECT_PALETTE.text.toString(16).padStart(6, "0")}`,
        align: "right",
      })
      .setOrigin(1, 0.5);

    this.feedbackText = this.add
      .text(VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT - 48, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: `#${BABEL_ARCHITECT_PALETTE.text.toString(16).padStart(6, "0")}`,
        align: "center",
      })
      .setOrigin(0.5);
  }

  private reconcileActiveBlocks(state: BabelArchitectState): void {
    const activeIds = state.phase === "playing"
      ? state.blocks.map((block) => block.id)
      : [];

    for (const id of this.renderedBlockIds) {
      if (!activeIds.includes(id)) {
        const visual = this.activeBlocks.get(id);
        if (visual) {
          visual.container.destroy();
          this.activeBlocks.delete(id);
        }
      }
    }

    const laneCount = Math.max(1, state.blocks.length);
    state.blocks.forEach((block, index) => {
      if (index < state.progressIndex) return;
      const existing = this.activeBlocks.get(block.id);
      const targetX = this.laneX(index, laneCount);
      const targetY = ACTIVE_ROW_Y;
      if (existing) {
        existing.container.x = targetX;
        existing.container.y = targetY;
        return;
      }
      const visual = this.createBlockVisual(block, targetX, targetY, true);
      this.activeBlocks.set(block.id, visual);
    });

    this.renderedBlockIds = activeIds;
  }

  private reconcilePlacedBlocks(state: BabelArchitectState): void {
    const placedIds = state.placedBlocks.map((block) => block.id);

    for (const id of this.renderedPlacedIds) {
      if (!placedIds.includes(id)) {
        const visual = this.placedBlocks.get(id);
        if (visual) {
          visual.container.destroy();
          this.placedBlocks.delete(id);
        }
      }
    }

    state.placedBlocks.forEach((block, stackIndex) => {
      const existing = this.placedBlocks.get(block.id);
      const targetX = VIEWPORT_WIDTH / 2;
      const targetY = TOWER_BASE_Y - stackIndex * BLOCK_STACK_OFFSET;
      const fillColor = block.stable
        ? BABEL_ARCHITECT_PALETTE.stable
        : BABEL_ARCHITECT_PALETTE.unstable;
      if (existing) {
        existing.container.x = targetX;
        existing.container.y = targetY;
        existing.rect.setFillStyle(fillColor);
        return;
      }
      const visual = this.createBlockVisual(block, targetX, targetY, false, fillColor);
      this.placedBlocks.set(block.id, visual);
    });

    this.renderedPlacedIds = placedIds;
  }

  private createBlockVisual(
    block: BabelArchitectBlock,
    x: number,
    y: number,
    interactive: boolean,
    fillColor: number = BABEL_ARCHITECT_PALETTE.stone,
  ): BlockVisual {
    const rect = this.add
      .rectangle(0, 0, BLOCK_WIDTH, BLOCK_HEIGHT, fillColor)
      .setStrokeStyle(2, BABEL_ARCHITECT_PALETTE.stoneHighlight);
    const label = this.add
      .text(0, 0, block.word, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: `#${BABEL_ARCHITECT_PALETTE.text.toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y, [rect, label]);

    if (interactive && this.bridge) {
      const hitArea = new Phaser.Geom.Rectangle(
        -BLOCK_WIDTH / 2,
        -BLOCK_HEIGHT / 2,
        BLOCK_WIDTH,
        BLOCK_HEIGHT,
      );
      rect.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      rect.on("pointerdown", () => {
        this.bridge?.onPlaceBlock(block.id);
      });
      container.setSize(BLOCK_WIDTH, BLOCK_HEIGHT);
    }

    return { container, rect, label };
  }

  private updateHud(state: BabelArchitectState): void {
    if (this.translationText) {
      this.translationText.setText(state.targetTranslation);
    }
    if (this.builtText) {
      const builtWords = state.placedBlocks
        .filter((block) => block.stable)
        .map((block) => block.word);
      this.builtText.setText(builtWords.length > 0 ? builtWords.join(" ") : "...");
    }
    if (this.stabilityBar) {
      const ratio = Math.max(0, Math.min(1, state.stability / 100));
      this.stabilityBar.setScale(1, ratio);
      const low = state.stability <= 30;
      this.stabilityBar.setFillStyle(
        low ? BABEL_ARCHITECT_PALETTE.stabilityLow : BABEL_ARCHITECT_PALETTE.stabilityHigh,
      );
    }
    if (this.scoreText) {
      this.scoreText.setText(`Score ${state.score}  Errors ${state.errors}`);
    }
    if (this.feedbackText && state.feedback) {
      const kind = state.feedback.kind;
      if (kind !== this.lastFeedbackKind) {
        this.lastFeedbackKind = kind;
        const message = this.feedbackMessage(state.feedback);
        this.feedbackText.setText(message);
        const color = this.feedbackColor(kind);
        this.feedbackText.setColor(
          `#${color.toString(16).padStart(6, "0")}`,
        );
      }
    }
  }

  private feedbackMessage(feedback: BabelArchitectState["feedback"]): string {
    if (!feedback) return "";
    switch (feedback.kind) {
      case "correct":
        return `Correct: ${feedback.word}`;
      case "incorrect":
        return `Wrong! Expected "${feedback.expectedWord}"`;
      case "sentence-complete":
        return `Sentence ${feedback.sentenceIndex + 1} complete!`;
      case "victory":
        return "The tower stands triumphant!";
      case "defeat":
        return "The tower has collapsed...";
      case "timeout":
        return "Time has run out...";
      default:
        return "";
    }
  }

  private feedbackColor(kind: string): number {
    switch (kind) {
      case "correct":
      case "sentence-complete":
      case "victory":
        return BABEL_ARCHITECT_PALETTE.stable;
      case "incorrect":
      case "defeat":
      case "timeout":
        return BABEL_ARCHITECT_PALETTE.unstable;
      default:
        return BABEL_ARCHITECT_PALETTE.text;
    }
  }

  private laneX(index: number, laneCount: number): number {
    const usable = VIEWPORT_WIDTH - 64;
    const step = laneCount > 1 ? usable / (laneCount - 1) : 0;
    return 32 + index * step;
  }
}
