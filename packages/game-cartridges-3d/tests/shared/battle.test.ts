/** The battle family's shared stage: its 2D file list and the games that use it stay in step. */
import { describe, expect, it } from 'vitest';
import { manifest, FILES_2D } from '../../src/monster-encounters/manifest.js';
import { battleFiles2D } from '../../src/shared/battle/stage2d.js';

describe('shared battle stage', () => {
  it('Monster Encounters binds every 2D file the stage plays', () => {
    expect([...FILES_2D].sort()).toEqual(battleFiles2D().sort());
    expect(manifest.requiredAssetBindings).toEqual([...FILES_2D]);
  });
});
