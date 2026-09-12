import { createRealmCarverState, tickRealmCarver } from "../realmCarver";
import { GRID_SIZE } from "../realmCarverConfig";

describe("realmCarver logic", () => {
  const sampleSentence = [
    { term: "The", translation: "The" },
    { term: "cat", translation: "cat" },
    { term: "sat", translation: "sat" },
  ];

  describe("createRealmCarverState", () => {
    it("initializes a grid of the correct size", () => {
      const state = createRealmCarverState(sampleSentence);
      expect(state.grid.length).toBe(GRID_SIZE);
      expect(state.grid[0].length).toBe(GRID_SIZE);
    });

    it("claims the borders initially", () => {
      const state = createRealmCarverState(sampleSentence);
      expect(state.grid[0][0]).toBe("claimed");
      expect(state.grid[0][GRID_SIZE - 1]).toBe("claimed");
      expect(state.grid[GRID_SIZE - 1][0]).toBe("claimed");
      expect(state.grid[GRID_SIZE - 1][GRID_SIZE - 1]).toBe("claimed");
      expect(state.grid[1][1]).toBe("wild");
    });

    it("initializes player at origin (0,0)", () => {
      const state = createRealmCarverState(sampleSentence);
      expect(state.player.x).toBe(0);
      expect(state.player.y).toBe(0);
    });
  });

  describe("tickRealmCarver movement", () => {
    it("moves player according to velocity", () => {
      let state = createRealmCarverState(sampleSentence);
      state.player.vx = 1;
      state = tickRealmCarver(state, 100);
      expect(state.player.x).toBeGreaterThan(0);
    });

    it("keeps player within grid boundaries", () => {
      let state = createRealmCarverState(sampleSentence);
      state.player.vx = -1;
      state = tickRealmCarver(state, 100);
      expect(state.player.x).toBe(0);

      state.player.vx = 0;
      state.player.vy = -1;
      state = tickRealmCarver(state, 100);
      expect(state.player.y).toBe(0);
    });
  });

  describe("tickRealmCarver trail logic", () => {
    it("draws a trail when moving on wild cells", () => {
      let state = createRealmCarverState(sampleSentence);
      state.player.x = 0;
      state.player.y = 0;
      state.player.vx = 1;
      state.player.vy = 1;
      state = tickRealmCarver(state, 100);
      
      const hasTrail = state.grid.some(row => row.includes("trail"));
      expect(hasTrail).toBe(true);
    });

    it("completes trail and fills territory when returning to claimed", () => {
      let state = createRealmCarverState(sampleSentence);
      state.grid[1][1] = "trail";
      state.player.x = 1;
      state.player.y = 1;
      state.player.vx = -1;
      state.player.vy = 0;
      
      state = tickRealmCarver(state, 100); 
      expect(state.grid[1][1]).toBe("claimed");
    });

    it("captures correct word when territory is filled", () => {
      let state = createRealmCarverState(sampleSentence);
      state.words[0].x = 5;
      state.words[0].y = 5;
      state.words[0].term = "The";
      
      state.monsters.forEach(m => {
        m.x = 90;
        m.y = 90;
        m.vx = 0;
        m.vy = 0;
      });
      
      // Manually mark a closed loop boundary
      // Trail from (10,0) down to (10,10) and over to (0,10)
      for (let y = 1; y <= 10; y++) state.grid[y][10] = "trail";
      for (let x = 1; x < 10; x++) state.grid[10][x] = "trail";
      
      // Player at (1,10) moves to (0,10) which is claimed
      state.player.x = 1;
      state.player.y = 10;
      state.player.vx = -1;
      state.player.vy = 0;
      
      state = tickRealmCarver(state, 100); 
      
      // (5,5) should be in the captured region (0-10, 0-10)
      expect(state.targetWordIndex).toBe(1);
      expect(state.score).toBe(100);
      expect(state.words.find(w => w.term === "The")).toBeUndefined();
    });
  });

  describe("tickRealmCarver monster logic", () => {
    it("moves monsters according to velocity", () => {
      let state = createRealmCarverState(sampleSentence);
      const initialX = state.monsters[0].x;
      state = tickRealmCarver(state, 100);
      expect(state.monsters[0].x).not.toBe(initialX);
    });

    it("bounces monsters off claimed borders", () => {
      let state = createRealmCarverState(sampleSentence);
      state.monsters[0].x = 1;
      state.monsters[0].vx = -1;
      state = tickRealmCarver(state, 100);
      expect(state.monsters[0].vx).toBeGreaterThan(0);
    });

    it("detects monster-trail collision and resets trail", () => {
      let state = createRealmCarverState(sampleSentence);
      state.grid[10][10] = "trail";
      state.player.hp = 3;
      
      state.monsters[0].x = 10;
      state.monsters[0].y = 10;
      state.monsters[0].vx = 0;
      state.monsters[0].vy = 0;
      
      state = tickRealmCarver(state, 100);
      
      expect(state.player.hp).toBe(2);
      expect(state.grid[10][10]).toBe("wild");
    });
  });
});
