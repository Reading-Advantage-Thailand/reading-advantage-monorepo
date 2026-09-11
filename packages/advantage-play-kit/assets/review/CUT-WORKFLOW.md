# Named-cut workflow

Use this file at the start of the next slicing session.

Serve from the repo root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
xdg-open "http://127.0.0.1:8765/packages/advantage-play-kit/assets/review/cut-editor.html?sheet=<id>"
```

The editor is `cut-editor.html`. Crop with `crop-cutlist.py`.

## Owner rules

1. Give a first-pass cutlist every time a new sheet starts. Do not open empty.
2. Box finding is visual. Do not auto-detect boxes.
3. Number boxes so the owner can correct by number.
4. Open the editor with `xdg-open` before you stop.
5. Do not crop until the owner approves, or until the owner says slice, crop, or process.
6. Do not recut Commission Packs or EvoMonsters processed work.
7. Do not crop whole-file uniform animation or atlas sheets (hero-01, hit-01, flags, combined 4-palette contact sheets, RM walk/idle/battler sheets).
8. Skip byte-identical copies. Keep one.
9. RPG Maker `$` / 3-column character layout: keep one column. Skip the duplicate bottom half.
10. Equal-size grids may stay as `keepSheet`. Do not force named cuts.
11. Do not add cryptographic hashes. Do not broaden hash coverage.
12. Names are lowercase kebab. `grate--4way` is invalid.

## Cutlist fields

Each box has `name`, `box` `[x,y,w,h]`, `kind`, `group`, `frame`, `notes`, `placement`.

- `kind`: `part` / `prop` / `anim-frame` / `overlay` / `structure`
- Intact and damaged pairs share `group`, with `frame` 0 and 1
- Size variants share `group` and use `frame` as the size index
- Animation clips share `group` and use `frame` as the frame index
- `group: unused` plus notes `Do not use` keeps the box and skips the crop

## Crop

```bash
python3 packages/advantage-play-kit/assets/review/crop-cutlist.py \
  --sheet <relative-to-assets/standard> \
  --cutlist <relative-to-assets/standard> \
  --out-dir <processed-dir-relative-to-assets/standard> \
  --prefix <kebab-prefix> \
  --archive "<zip name>" \
  --nested "<outer.zip/inner.zip>" \
  --member "<path inside the inner zip>"
```

Then set `standard-asset-library.test.ts` `toHaveLength` to the non-blank receipt data row count. Do not recompute the frozen T10 catalog digest.

Receipt columns: `destination`, `source_archive`, `nested_archive_chain`, `source_member`, `cell_size`. Processed crops use `cell_size` `processed`.

## Done named mixed sheets

| Sheet | Crops | Notes |
|---|---|---|
| Sewers | 96 | Water numbers punched out |
| Tower Defense 01 | keepSheet | 32×32, 9×8. Not named-cut |
| Tower Defense 02 a–d | 180 | Same cutlist on four palettes |
| fd-dungeon-free-b | 97 | Skip RM/MZ scaled copies |
| fd-dungeon-free-c | 91 | Intact first, then damaged |
| fd-dungeon-free-a5-1 | 38 | Unused bottoms boxed, not cropped |
| fd-dungeon-free-a5-2 | 0 | Pixel-identical floors to a5-1. Cutlist only |
| fd-dungeon-free-door01 | 4 | Keep column 1. Skip copy columns |
| fd-dungeon-free-door02 | 4 | Same 3-column identity |
| fd-dungeon-free-animated | 16 | Top half only. Skip 3-col copies |
| fg-cellar | 416 | Extras native 512×512 sprite |
| fg-cellar-doors | 16 | Four 16×32 frames per animation strip. Open edge included. |
| fg-houses roofs, batch 1 | 24 | Separate roof assemblies in blue, red, and gray. |
| fg-houses roofs, batch 2 | 8 | Cuts 25–32. Gable 31 fits section 30. Cut 32 is a separate overlay. |

## Next mixed sheet

Cellar doors are processed. The animation preview is `cellar-doors-preview.html`.

Pick the next mixed irregular sheet from farming, fantasy-dreamland, rogue, or platformer. Prefer the native sprite sheet.

## Skip on cellar / extras

- Remaining extras RM walk/idle (`216×288`) and SV battlers (`864×576`): keep as sheet
- extras VX-Ace dungeon and cellar: scaled copies
- extras MZ 16/32/48 cellar: scaled copies
- farming-game-world copies of `fg-cellar-source` and `fg-cellar-doors`: byte-identical
- extras RM MV `fg-cellar-a5/b/c/d/e`: engine layouts of the same art. Do not recut after the 512 sheet
- a5-1 unused bottoms, door duplicate columns, animated bottom half: do not recrop

## Editor load ids

`sewers`, `td-02-a`, `dungeon-b`, `dungeon-c`, `dungeon-a5-1`, `dungeon-a5-2`, `door01`, `door02`, `animated`, `cellar`.

Add a `SHEETS` entry and a Load button for each new sheet.

The owner downloads JSON from the editor. Copy it over the placement file, then crop.

## Completed review batch 1

- Farming extras: 41 crops. E16 reuses E14. E04, E08, and E12 use centered 32×80 boxes.
- Village doors: 18 animation strips.
- Small cave minerals: 48 animation strips.

The owner approved all three sheets. The batch contains 107 saved crops.

## Completed review batch 2

- Medium cave minerals: 24 animation strips.
- City doors: 20 animation strips.
- Castle doors: four animation strips.

The owner approved all 48 strips.

## Completed review batch 3

- Large cave minerals: 24 animation strips.
- Mountain animations: 21 animation strips.
- Dungeon doors and gate bars: 11 animation strips.

The owner approved all 56 strips.

## Completed review batch 4

- Castle candles: four animation strips.
- Marshland animations: 16 animation strips.
- Grassland animations: 30 animation strips.

The owner approved all 50 strips.

## Completed review batch 5

- Desert animations: 22 strips. S13 reuses S12.
- Christmas objects: 77 cuts.
- Halloween objects and animations: 78 cuts.

The owner approved all 177 unique cuts.

## Completed review batch 6

- Blacksmith workshop: 68 cuts. W04–W07 use separate pieces. W59–W60 are stairways.
- Remastered Christmas: 49 cuts.
- Remastered Halloween: 100 cuts. T111–T112 contain eight frames, possibly for talking trees.

The owner approved all 217 unique cuts. The batch reuses 56 exact copies.

## Completed review batch 7

- Castle parts: 116 cuts.
- Desert houses: 102 cuts.
- Remastered blacksmith: 105 cuts.

The owner approved all 323 new cuts and 15 reuses. Lettered corrections preserve the original review numbers.

## Completed review batch 8

The owner approved 306 new forest cuts and 192 reuses. All crops passed pixel checks and both library tests.

## Review batch size

The owner requested six sheets per review on 2026-09-07. Batch 19 awaits approval.

## Completed review batch 9

The owner approved 1,534 new crops and 931 reuses. Exact source pixel checks and both library tests passed.

## Separate animation frames

An entry can use `frameBoxes` to list absolute source rectangles in playback order.
All rectangles must have equal dimensions and remain within the source sheet.
The cropper joins these rectangles into one horizontal strip. It preserves the source RGBA pixels.
The preview shows each source rectangle and plays the same frame order.

## Completed review batch 10

The owner approved 267 new cuts and two reuses. Exact pixel checks and both library tests passed.

## Completed review batch 11

The owner approved 1,077 new cuts and 33 reuses. Exact pixel checks and both library tests passed.

## Cleared crop regions

An entry can use `clearRects` for rectangles relative to the output image.
The cropper clears these rectangles after it crops the image. Each rectangle must remain within the output bounds.
Batch 12 uses this field for H02. Its lower right corner contains part of the adjacent cave.
The preview shows the cleared corner. Pixel verification must apply the same clear rectangles to the expected image.

## Completed review batch 12

The owner approved 696 new cuts and 189 reuses. Exact pixel checks and both library tests passed.
H02 uses the approved cleared corner. Its pixel check applied the same clear rectangle.

## Completed review batch 13

The owner approved 1,398 new cuts and 1,513 reuses. Exact pixel checks and both library tests passed.
Cave entrances use separate left strips. F70–F71 and S70–S71 use separate wall pieces.

## Completed review batch 14

The owner approved 1,662 new cuts and 770 reuses. Exact pixel checks and both library tests passed.
Mushroom houses use separate base overlays. The castle crosses preserve their complete widths.

## Completed review batch 15

The owner approved 1,639 new cuts and 252 reuses. Exact pixel checks and both library tests passed.
The six village sheets include winter versions. The native queue now contains 39 sheets.

## Completed review batch 16

The owner approved 2,166 new cuts and 363 reuses. Exact pixel checks and both library tests passed.
The receipt contains 56,879 rows. The native queue contains 33 sheets.

## Completed review batch 17

The owner approved 2,076 new cuts and 920 reuses. Exact pixel checks and both library tests passed.
The cropper excluded 52 unused placeholders. The receipt contains 58,955 rows.
The native queue contains 27 sheets.

## Completed review batch 18

The owner approved 3,344 new cuts and 2,607 exact reuses. Exact pixel checks and both library tests passed.
The cropper excluded two frame-number strips. The receipt contains 62,299 rows.
The native queue contains 21 sheets.

## Completed review batch 19

The owner approved 2,141 new cuts and 809 exact reuses. Exact pixel checks and both library tests passed.
The receipt contains 64,440 rows. The native queue contains 15 sheets.

## Completed review batch 20

The preview contains Godot ground, Godot water, Lost City, Atlantis, Pyramid, and Temple assets.
The preview contains 2,534 new cuts, 712 exact reuses, and four excluded label rows.
The owner approved this batch. All 2,534 new cuts are exported.
Exact pixel checks and both library tests passed. The receipt contains 66,974 rows.

## Completed review batch 21

The preview contains four interiors, marketplace, and ruins.
The owner approved 4,708 new cuts and 1,150 exact reuses.
Exact pixel checks and both library tests passed. The receipt contains 71,682 rows.
The native queue contains three sheets.

## Completed review batch 22

The preview contains normal houses, winter houses, and the rogue village.
The owner approved 716 new cuts and 281 exact reuses.
All 716 new cuts are exported. Exact pixel checks and both library tests passed.
The receipt contains 72,398 rows. The native sheet queue is complete.
This queue covers the native farming, fantasy-dreamland, and rogue families. Other asset families remain outside this count.
