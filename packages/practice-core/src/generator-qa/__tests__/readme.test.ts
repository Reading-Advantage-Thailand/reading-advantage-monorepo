// Phase-4 T17-T19 author documentation tests — Red phase (TDD).
//
// Contract under test (per test-strategy.md §5, Phase 4):
//
//   "Author docs in `packages/<harness>/README.md` showing the 5-line
//    plug-in for T17–T19."
//
// The README at `packages/practice-core/src/generator-qa/README.md` does
// not exist yet. The tests in this file fail because the file is
// missing — the existence assertion trips, the file-read assertion
// throws ENOENT, and the content checks have nothing to read. The
// Green phase authors the README with a copy-pasteable plug-in
// snippet, an explicit reference to T17/T18/T19, and a 5-line
// "minimum viable plug-in" example an author can paste into a new
// generator module.
//
// What the README MUST contain (per the test-strategy):
//   - Title / location hint for the harness.
//   - The 5-line plug-in snippet using `runGeneratorGate` and
//     `verifyGenerator`.
//   - Explicit references to T17, T18, and T19 (the consumer tracks).
//   - The boundary rule (harness core is domain-neutral; oracles
//     live in math-content).
//
// Red signal: `existsSync` returns false, `readFileSync` throws ENOENT,
// and the content regex assertions trip on a missing or empty file.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// `packages/practice-core/src/generator-qa/README.md` — one level up
// from `__tests__/`.
const README_PATH = resolve(__dirname, '..', 'README.md');

// ---------------------------------------------------------------------------
// Existence + read.
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4) — T17-T19 plug-in README (Task 2)', () => {
  it('README.md exists at packages/practice-core/src/generator-qa/README.md', () => {
    expect(existsSync(README_PATH)).toBe(true);
  });

  it('README.md is non-empty (readable as UTF-8)', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    expect(md.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Plug-in pattern (the 5-line snippet).
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4) — README documents the 5-line plug-in pattern', () => {
  it('README documents a plug-in pattern (runGeneratorGate / verifyGenerator)', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    // Either a section heading or a code block; the word "plug-in" (or
    // "plugin") should appear, AND the README must show how to invoke
    // the gate or verifyGenerator.
    expect(md).toMatch(/plug[- ]?in/i);
    expect(md).toMatch(/runGeneratorGate|verifyGenerator/);
  });

  it('README includes a copy-pasteable code block (triple-backtick fenced)', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    // The "5-line plug-in" must be a code block authors can paste.
    expect(md).toMatch(/```/);
  });

  it('README code block contains the gate invocation (runGeneratorGate or verifyGenerator)', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    // Strip fence lines; the body must reference the gate API.
    const codeBlocks = md.match(/```[\s\S]*?```/g) ?? [];
    const hasGateCall = codeBlocks.some((block) =>
      /runGeneratorGate|verifyGenerator/.test(block),
    );
    expect(hasGateCall).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Consumer-track references (T17 / T18 / T19).
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4) — README references T17, T18, and T19', () => {
  it('README references T17 (Core Algebra Generators)', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    expect(md).toMatch(/T17/);
  });

  it('README references T18 (Advanced Math Generators)', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    expect(md).toMatch(/T18/);
  });

  it('README references T19 (Geometry, Stats & Trig Generators)', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    expect(md).toMatch(/T19/);
  });
});

// ---------------------------------------------------------------------------
// Boundary rule reminder.
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4) — README documents the boundary rule', () => {
  it('README reminds authors that the harness core is domain-neutral', () => {
    const md = readFileSync(README_PATH, 'utf-8');
    // We don't pin a specific phrasing, only the concept.
    expect(md).toMatch(/domain[- ]?neutral|boundary|oracles? live in/i);
  });
});
