#!/usr/bin/env python3
"""Copies the portrait layers the 15 starter sets need from the Forge pack into the Primary app
and regenerates `src/catalog.ts` and `src/pack-index.ts`. Run from this package folder:
`python3 scripts/port-avatar-pack.py ~/Desktop/advantage-forge <forge-commit>`."""
import json, os, re, shutil, sys

FORGE, COMMIT = sys.argv[1], sys.argv[2]
PACK = os.path.join(FORGE, "out/packs/avatar/1.0.0/")
OUT = "../../apps/primary-advantage/public/packs/avatar/1.0.0/"
catalog = json.load(open(PACK + "catalog.json"))
items = {i["id"]: i for i in catalog["items"]}
starters = open(os.path.join(FORGE, "src/apk3d/avatar/starters.ts")).read()
need = {"avatar-hair-swept"}
for _, pieces in re.findall(r"id: '([a-z-]+)'.*?pieces: \[([^\]]*)\]", starters, re.S):
    need.update(re.findall(r"'([a-z0-9-]+)'", pieces))
cat = {}
for i in sorted(need):
    it = items[i]
    cat[i] = {"id": i, "slot": it["slot"], "tier": it["tier"], "twoHanded": it["twoHanded"], "hides": it["equip"]["hides"], "hair": it["equip"]["hair"], "table": it["dyes"]}
styles = {n for n in need if n.startswith("avatar-hair")}
index = json.load(open(PACK + "portraits.json"))
layers = {}
for name, layer in index["layers"].items():
    if "+" in name:
        piece, style = name.split("+")
        ok = piece in need and style in styles
    else:
        ok = name.split("@")[0].split(".")[0] in need or name in ("base", "shoes", "undershirt")
    if ok:
        layers[name] = layer
os.makedirs(OUT + "portraits", exist_ok=True)
for layer in layers.values():
    for f in (layer["color"], layer["mask"]):
        shutil.copyfile(PACK + f, OUT + f)
json.dump({**index, "layers": layers}, open(OUT + "portraits.json", "w"), separators=(",", ":"))
ts = lambda v: json.dumps(v, indent=2)
open("src/catalog.ts", "w").write(f'''/**
 * The avatar pack data the Primary avatar needs, copied from the Forge pack
 * `out/packs/avatar/1.0.0/catalog.json` at Forge commit {{@link FORGE_COMMIT}} by
 * `scripts/port-avatar-pack.py` (data only; the composer is in `portrait.ts`).
 */
import type {{ HairForm }} from "./hair.js";
import type {{ VariantTable }} from "./tint.js";

/** The Forge commit the pack data and the portrait layers come from. */
export const FORGE_COMMIT = "{COMMIT}";

/** The pack version; the portrait layers are served from `/packs/avatar/<version>/`. */
export const AVATAR_PACK_VERSION = "{index["version"]}";

/** One catalog item of the pack that a starter set wears. */
export interface AvatarCatalogItem {{
  readonly id: string;
  readonly slot: string;
  readonly tier: number;
  readonly twoHanded: boolean;
  readonly hides: readonly string[];
  readonly hair: HairForm;
  /** The dye slot table of the piece, or null when it takes no dye. */
  readonly table: VariantTable | null;
}}

/** The slot table of the avatar base: skin, hair, eyes, and cloth options in linear RGB. */
export const AVATAR_BASE: VariantTable = {ts(catalog["base"]["variants"])};

/** The catalog items of the 15 starter sets and the default hair style, by id. */
export const AVATAR_CATALOG: Readonly<Record<string, AvatarCatalogItem>> = {ts(cat)};
''')
open("src/pack-index.ts", "w").write(f'''/**
 * The portrait layer index of the pack (`portraits.json`), trimmed to the layers the starter sets
 * need. Each layer is a color image and a tint mask image under the pack root.
 */
export const PORTRAIT_INDEX: Readonly<Record<string, {{ readonly color: string; readonly mask: string }}>> = {ts(layers)};
''')
print(len(cat), "items", len(layers), "layers")
