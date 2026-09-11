# EvoMonsters processed sprites

Per-stage crops from the 48 owner-flagged multi-stage sheets in `../evomonsters/`.
Originals stay flagged `needs-work`; use these sprites instead.

## Naming

`<base>-stage<N>-col<M>.png` — stage = life stage (1 = youngest), col = color variant.

## The shared-egg rule

Stage 1 is an egg/stone. The source art ships ONE egg design per monster line:
all 4 color columns in row 1 are byte-identical in the source sheets. We keep a
single `stage1-col1` file per line. It applies to every color.

An EvoMonster line for a game is: `stage1-col1` (egg) + `stage2..N-col<M>` for the
chosen color. Assignment manifests must list these paths explicitly; games never
scan or infer.

## Variants

- `rm-` prefix: 192px-cell RPG Maker renders of the same line (non-rm = 64px cells).
- `-left` / `-right`: facing.

Provenance: cropped from `EvoMonsters.zip` sheets; see IMPORT-RECEIPT.tsv rows
with cell_size `processed`.
