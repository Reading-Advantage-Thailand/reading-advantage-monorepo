#!/usr/bin/env python3
"""Copies every portrait layer of the Forge pack into the Primary app and regenerates
`src/catalog.ts` (all ready items with their GP price or reward mark) and `src/pack-index.ts`.
The pack version comes from the one pack folder Forge commits under `demo/public/avatar-pack/`
(the highest version when there are several). Run from this package folder:
`python3 scripts/port-avatar-pack.py ~/Desktop/advantage-forge <forge-commit>`."""
import json, os, re, shutil, sys

FORGE, COMMIT = sys.argv[1], sys.argv[2]
# The pack (catalog, portrait layers, and their index) is committed in Forge under demo/public.
PACKS = os.path.join(FORGE, "demo/public/avatar-pack/")
VERSION = max(os.listdir(PACKS), key=lambda v: tuple(int(n) for n in v.split(".")))
PACK = os.path.join(PACKS, VERSION, "")
CATALOG = PACK + "catalog.json"
OUT = f"../../apps/primary-advantage/public/packs/avatar/{VERSION}/"
catalog = json.load(open(CATALOG))
assert catalog["version"] == VERSION, f"catalog version {catalog['version']} is not the folder {VERSION}"
items = {i["id"]: i for i in catalog["items"]}
starters = open(os.path.join(FORGE, "src/apk3d/avatar/starters.ts")).read()
need = set(items)
for _, pieces in re.findall(r"id: '([a-z-]+)'.*?pieces: \[([^\]]*)\]", starters, re.S):
    missing = set(re.findall(r"'([a-z0-9-]+)'", pieces)) - need
    assert not missing, f"starter pieces not in the catalog: {missing}"
cat = {}
for i in sorted(need):
    it = items[i]
    cat[i] = {"id": i, "slot": it["slot"], "tier": it["tier"], "twoHanded": it["twoHanded"], "source": it.get("source", "shop"), "price": it.get("price", 0), "rating": it.get("rating"), "hides": it["equip"]["hides"], "hair": it["equip"]["hair"], "table": it["dyes"]}
    assert cat[i]["source"] in ("shop", "reward"), f"unknown source on {i}"
styles = {n for n in need if n.startswith("avatar-hair")}
index = json.load(open(PACK + "portraits.json"))
assert index["version"] == VERSION, f"portraits.json version {index['version']} is not the folder {VERSION}"
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
 * `demo/public/avatar-pack/{VERSION}/catalog.json` at Forge commit {{@link FORGE_COMMIT}} by
 * `scripts/port-avatar-pack.py` (data only; the composer is in `portrait.ts`).
 */
import type {{ HairForm }} from "./hair.js";
import type {{ VariantTable }} from "./tint.js";

/** The Forge commit the pack data and the portrait layers come from. */
export const FORGE_COMMIT = "{COMMIT}";

/** The pack version; the portrait layers are served from `/packs/avatar/<version>/`. */
export const AVATAR_PACK_VERSION = "{index["version"]}";

/** One catalog item of the pack (every `ready` piece, the shop stock). */
export interface AvatarCatalogItem {{
  readonly id: string;
  readonly slot: string;
  /** Tier 1 opens at level 1, tier 2 at level 5, tier 3 at level 10. */
  readonly tier: number;
  readonly twoHanded: boolean;
  /** Where a student gets the piece: the shop, or a completion reward (never sold). */
  readonly source: "shop" | "reward";
  /** The GP price from the Forge formula (0 for a free piece or a reward piece). */
  readonly price: number;
  /** The latest review score, or null when unrated. */
  readonly rating: number | null;
  readonly hides: readonly string[];
  readonly hair: HairForm;
  /** The dye slot table of the piece, or null when it takes no dye. */
  readonly table: VariantTable | null;
}}

/** The slot table of the avatar base: skin, hair, eyes, and cloth options in linear RGB. */
export const AVATAR_BASE: VariantTable = {ts(catalog["base"]["variants"])};

/** Every catalog item of the pack, by id. */
export const AVATAR_CATALOG: Readonly<Record<string, AvatarCatalogItem>> = {ts(cat)};
''')
open("src/pack-index.ts", "w").write(f'''/**
 * The portrait layer index of the pack (`portraits.json`): every layer, a color image and a tint
 * mask image under the pack root.
 */
export const PORTRAIT_INDEX: Readonly<Record<string, {{ readonly color: string; readonly mask: string }}>> = {ts(layers)};
''')
print(len(cat), "items", len(layers), "layers")
