import { describe, expect, it } from 'vitest';
import { strongestHairForm } from '../avatar/hair.js';
import { NO_TINT, portraitLayers, portraitPlan, recolorLayer, stackLayers, type PortraitItem, type PortraitPiece } from '../avatar/portrait.js';
import type { VariantTable } from '../avatar/tint.js';

const piece = (id: string, slot: string, extra: Partial<PortraitPiece> = {}): PortraitPiece => ({ id, slot, hides: [], hair: 'full', ...extra });

describe('avatar portraits', () => {
  it('orders the layers of a loadout: base layers, far hand, back to front, weapon hand last', () => {
    expect(portraitLayers([], 'brown')).toEqual(['base', 'shoes', 'undershirt', 'avatar-hair-swept@brown']);
    const knight = [
      piece('avatar-hair-short', 'hair', { hides: ['hair'] }),
      piece('adventurer-sword', 'mainhand'),
      piece('leather-cap', 'head', { hides: [], hair: 'capped' }),
      piece('studded-leather', 'chest', { hides: ['undershirt'] }),
      piece('boots', 'feet', { hides: ['shoes'] }),
      piece('round-shield', 'offhand'),
      piece('gloves', 'hands'),
    ];
    expect(portraitLayers(knight, 'auburn')).toEqual(['base', 'round-shield', 'boots', 'studded-leather', 'gloves', 'avatar-hair-short.capped@auburn', 'leather-cap', 'adventurer-sword']);
    expect(portraitLayers([piece('iron-helmet', 'head', { hides: ['hair'], hair: 'hidden' })], 'brown')).toEqual(['base', 'shoes', 'undershirt', 'iron-helmet']);
    expect(portraitLayers([piece('knight-helm', 'head', { hair: 'tucked' })], 'black', 'avatar-hair-long')).toEqual(['base', 'shoes', 'undershirt', 'avatar-hair-long.tucked@black', 'knight-helm']);
    expect(portraitLayers([piece('circlet', 'head')], 'teal', 'avatar-hair-long')).toEqual(['base', 'shoes', 'undershirt', 'avatar-hair-long@teal', 'circlet+avatar-hair-long']);
  });

  it('plans the colors of each layer: base tints, the style layer in the base hair color, piece dyes', () => {
    const base: VariantTable = {
      slots: { skin: { channel: 'R', default: 'fair', options: { fair: [0.8, 0.5, 0.4], deep: [0.4, 0.25, 0.2] } }, hair: { channel: 'G', default: 'brown', options: { brown: [0.1, 0.1, 0.1], blond: [0.4, 0.3, 0.2] } } },
      presets: { night: { skin: 'deep', hair: 'blond' } },
      mask: 'tintMask',
    };
    const hairTable: VariantTable = { slots: { hair: base.slots.hair! }, presets: {}, mask: 'tintMask' };
    const capeTable: VariantTable = { slots: { cloth: { channel: 'R', default: 'red', options: { red: [0.5, 0.1, 0.1], blue: [0.1, 0.1, 0.5] } } }, presets: {}, mask: 'tintMask' };
    const swept: PortraitItem = { ...piece('avatar-hair-swept', 'hair', { hides: ['hair'] }), table: hairTable };
    const cape: PortraitItem = { ...piece('cape', 'back'), table: capeTable, dyes: { cloth: 'blue' } };
    const helm: PortraitItem = { ...piece('knight-helm', 'head', { hair: 'capped' }), table: null };
    const plan = portraitPlan({ base, tints: 'night', pieces: [cape, helm], defaultHair: swept });
    expect(plan.map((p) => p.layer)).toEqual(['base', 'shoes', 'undershirt', 'cape', 'avatar-hair-swept.capped@blond', 'knight-helm']);
    expect(plan[0]!.scales[0]![0]).toBeCloseTo(0.5, 6);
    expect(plan[4]!.scales).toEqual(NO_TINT);
    // No base hair choice: the style's default color.
    expect(portraitPlan({ base, tints: { skin: 'deep' }, pieces: [], defaultHair: swept })[3]!.layer).toBe('avatar-hair-swept@brown');
    expect(plan[3]!.scales[0]).toEqual([0.2, 1, 5]);
    expect(plan[5]!.scales).toEqual(NO_TINT);
  });

  it('recolors through the mask in linear light, channel A from the lower half', () => {
    // Four pixels (2 x 2): masked by R, unmasked, transparent, masked by A.
    const color = new Uint8ClampedArray([128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 0, 128, 128, 128, 255]);
    const mask = new Uint8ClampedArray(2 * 2 * 8);
    mask.set([255, 0, 0, 255], 0);
    mask.set([255, 0, 0, 255], 8);
    mask.set([255, 255, 255, 255], 16 + 12);
    const scales = [[2, 1, 0.5], [1, 1, 1], [1, 1, 1], [0.5, 0.5, 0.5]] as const;
    const out = recolorLayer(color, mask, scales, 2);
    // sRGB 128 is 0.2158 linear: x2 = 0.4317 (sRGB 176), x0.5 = 0.1079 (sRGB 92).
    expect([...out.subarray(0, 4)]).toEqual([176, 128, 92, 255]);
    expect([...out.subarray(4, 8)]).toEqual([128, 128, 128, 255]);
    expect([...out.subarray(8, 12)]).toEqual([128, 128, 128, 0]);
    expect([...out.subarray(12, 16)]).toEqual([92, 92, 92, 255]);
    expect(recolorLayer(color, mask, NO_TINT, 2)).toEqual(color);
  });

  it('stacks layers with straight alpha', () => {
    const under = new Uint8ClampedArray([200, 0, 0, 255, 0, 0, 0, 0]);
    const over = new Uint8ClampedArray([0, 0, 200, 128, 0, 200, 0, 255]);
    const out = stackLayers([under, over], 1);
    expect([...out.subarray(0, 4)]).toEqual([100, 0, 100, 255]);
    expect([...stackLayers([new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 0]), over], 1).subarray(0, 4)]).toEqual([0, 0, 200, 128]);
  });
});

describe('hair form', () => {
  it('lets the strongest head piece form win', () => {
    expect(strongestHairForm([])).toBe('full');
    expect(strongestHairForm(['full', 'capped'])).toBe('capped');
    expect(strongestHairForm(['capped', 'tucked'])).toBe('tucked');
    expect(strongestHairForm(['tucked', 'hidden'])).toBe('hidden');
  });
});
