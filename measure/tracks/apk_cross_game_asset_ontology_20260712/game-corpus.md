# APK Canonical Game Corpus

Generated from `game-corpus.json` at source revision `ab80f58c55285c164c1b3cdbc3b9ed5b2a03c0ee`. The machine file is authoritative for identifiers and cross-artifact validation; this document is the review surface.

## Boundary

- **29 canonical identities:** 27 live catalog rows plus Abyssal Well and Babel Architect as stale historical requirements.
- Reading copies are evidence for the same canonical IDs, not additional games.
- Primary lesson activities remain outside the APK catalog unless a later product decision promotes them.
- Exported catalog state outranks raw `catalogCards` literals: 14 invalid APK cards are withdrawn at export time.

## Corpus

| Game ID                 | Title                        | Input      | Catalog state | Route state | Strongest implementation evidence | Confidence |
| ----------------------- | ---------------------------- | ---------- | ------------- | ----------- | --------------------------------- | ---------- |
| `castle-defense`        | Castle Defense               | sentence   | playable      | present     | raw component + logic             | high       |
| `dragon-rider`          | Dragon Rider                 | vocabulary | withdrawn     | missing     | Reading imported copy             | medium     |
| `magic-defense`         | Magic Defense                | vocabulary | withdrawn     | missing     | raw component + logic             | high       |
| `rpg-battle`            | RPG Battle                   | vocabulary | playable      | present     | raw component + logic             | high       |
| `dragon-flight`         | Dragon Flight                | vocabulary | withdrawn     | missing     | raw component + logic             | high       |
| `wizard-vs-zombie`      | Wizard vs Zombie             | vocabulary | playable      | present     | raw component + logic             | high       |
| `enchanted-library`     | Enchanted Library            | vocabulary | playable      | present     | raw component + logic             | high       |
| `rune-match`            | Rune Match                   | vocabulary | playable      | present     | raw component + logic             | high       |
| `alchemists-synthesis`  | Alchemist's Synthesis        | vocabulary | playable      | present     | raw component + logic             | high       |
| `potion-rush`           | Potion Rush                  | sentence   | playable      | present     | raw component + logic             | high       |
| `dungeon-liberator`     | Dungeon Liberator            | sentence   | withdrawn     | missing     | raw component + logic             | high       |
| `spellweavers-run`      | Spellweaver's Run            | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `shadow-gate-dungeon`   | Shadow Gate Dungeon          | sentence   | playable      | present     | raw component + logic             | high       |
| `rune-forge-chamber`    | Rune Forge Chamber           | sentence   | playable      | present     | raw component + logic             | high       |
| `village-guardian`      | Village Guardian             | sentence   | playable      | present     | raw component + logic             | high       |
| `labyrinth-goblin-king` | Labyrinth of the Goblin King | sentence   | playable      | present     | raw component + logic             | high       |
| `archers-revenge`       | Archer's Revenge             | vocabulary | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `storm-castle-tower`    | Storm the Castle Tower       | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `griffin-sky-joust`     | Griffin Sky-Joust            | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `realm-carver`          | Realm Carver                 | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `paladins-twin-soul`    | Paladin's Twin-Soul          | vocabulary | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `griffin-riders-escape` | Griffin Rider's Escape       | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `astral-mage`           | Astral Mage                  | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `devourer-slime`        | Devourer Slime               | sentence   | playable      | present     | raw component + logic             | high       |
| `sorcerer-ziggurat`     | The Sorcerer's Ziggurat      | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `haunted-library`       | The Haunted Library          | sentence   | playable      | present     | raw component + logic             | high       |
| `gryphon-patrol`        | Gryphon Patrol               | sentence   | withdrawn     | missing     | archived roadmap evidence         | medium     |
| `abyssal-well`          | The Abyssal Well             | sentence   | stale         | withdrawn   | historical/cancelled evidence     | medium     |
| `babel-architect`       | Babel Architect              | sentence   | stale         | missing     | historical/cancelled evidence     | medium     |

## Discrepancies

- **`discrepancy:catalog:withdrawn-playable`:** Fourteen raw cards say playable but the exported catalog withdraws them. Use exported catalog state and preserve raw literals as discrepancy evidence.
- **`discrepancy:abyssal-well:deleted-source`:** Abyssal Well existed in earlier source but is absent now. Retain stale requirements pending explicit retirement or successor decision.
- **`discrepancy:babel-architect:deleted-source`:** Babel Architect had catalog and cancelled exemplar evidence but no accepted implementation. Retain provisional requirements without restoring a route.
- **`discrepancy:imports:duplicate-copies`:** Reading contains copied implementations that could inflate corpus count. Treat copies as evidence for canonical IDs.

## Copy and host evidence

- Reading has imported copies for Castle Defense, Dragon Rider, Magic Defense, RPG Battle, Dragon Flight, Wizard vs Zombie, Enchanted Library, Rune Match, and Potion Rush. These copies demonstrate deployment history and copy debt.
- Primary currently exposes lesson-level sentence/vocabulary activities, not this APK catalog. They inform content and audience constraints but do not create duplicate catalog identities.
- Current Advantage Games route, API, component, logic, test, and asset roots remain independently inventoried through evidence records in the JSON.

## Acceptance decisions required

1. Confirm the 29-identity boundary, including retaining Abyssal Well and Babel Architect as stale requirement evidence rather than restoring them.
2. Confirm exported withdrawal state is the current routing truth for the 14 invalid cartridges.
3. Confirm Reading copies and Primary lesson activities do not inflate the canonical APK game count.
