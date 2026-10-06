/**
 * The avatar pack data the Primary avatar needs, copied from the Forge pack
 * `demo/public/avatar-pack/1.0.0/catalog.json` at Forge commit {@link FORGE_COMMIT} by
 * `scripts/port-avatar-pack.py` (data only; the composer is in `portrait.ts`).
 */
import type { HairForm } from "./hair.js";
import type { VariantTable } from "./tint.js";

/** The Forge commit the pack data and the portrait layers come from. */
export const FORGE_COMMIT = "c26e4406";

/** The pack version; the portrait layers are served from `/packs/avatar/<version>/`. */
export const AVATAR_PACK_VERSION = "1.0.0";

/** One catalog item of the pack (every `ready` piece, the shop stock). */
export interface AvatarCatalogItem {
  readonly id: string;
  readonly slot: string;
  /** Tier 1 opens at level 1, tier 2 at level 5, tier 3 at level 10. */
  readonly tier: number;
  readonly twoHanded: boolean;
  /** The GP price from the Forge formula (0 for a free piece). */
  readonly price: number;
  /** The latest review score, or null when unrated. */
  readonly rating: number | null;
  readonly hides: readonly string[];
  readonly hair: HairForm;
  /** The dye slot table of the piece, or null when it takes no dye. */
  readonly table: VariantTable | null;
}

/** The slot table of the avatar base: skin, hair, eyes, and cloth options in linear RGB. */
export const AVATAR_BASE: VariantTable = {
  "slots": {
    "skin": {
      "channel": "R",
      "default": "fair",
      "options": {
        "fair": [
          0.88792,
          0.57112,
          0.37124
        ],
        "light": [
          0.80695,
          0.45641,
          0.2705
        ],
        "tan": [
          0.65837,
          0.32314,
          0.16827
        ],
        "brown": [
          0.25415,
          0.10224,
          0.04817
        ],
        "deep": [
          0.11193,
          0.04374,
          0.02122
        ]
      }
    },
    "hair": {
      "channel": "G",
      "default": "brown",
      "options": {
        "brown": [
          0.10224,
          0.02956,
          0.01229
        ],
        "black": [
          0.01681,
          0.01033,
          0.00857
        ],
        "blond": [
          0.55201,
          0.30947,
          0.06848
        ],
        "auburn": [
          0.2705,
          0.04374,
          0.01161
        ],
        "silver": [
          0.47932,
          0.45641,
          0.55201
        ],
        "teal": [
          0.02843,
          0.15896,
          0.14413
        ]
      }
    },
    "eyes": {
      "channel": "B",
      "default": "brown",
      "options": {
        "brown": [
          0.15593,
          0.05127,
          0.01444
        ],
        "blue": [
          0.02843,
          0.14413,
          0.39157
        ],
        "green": [
          0.04667,
          0.19462,
          0.0356
        ],
        "hazel": [
          0.25415,
          0.14413,
          0.02315
        ],
        "violet": [
          0.14413,
          0.06848,
          0.32314
        ]
      }
    },
    "cloth": {
      "channel": "A",
      "default": "sky",
      "options": {
        "sky": [
          0.11444,
          0.23074,
          0.41789
        ],
        "linen": [
          0.6105,
          0.49693,
          0.29614
        ],
        "moss": [
          0.12744,
          0.18447,
          0.04971
        ],
        "rose": [
          0.36625,
          0.10946,
          0.13843
        ],
        "slate": [
          0.10224,
          0.12214,
          0.16203
        ]
      }
    }
  },
  "presets": {
    "sunny": {
      "skin": "fair",
      "hair": "blond",
      "eyes": "blue",
      "cloth": "rose"
    },
    "forest": {
      "skin": "tan",
      "hair": "auburn",
      "eyes": "green",
      "cloth": "moss"
    },
    "night": {
      "skin": "deep",
      "hair": "black",
      "eyes": "brown",
      "cloth": "slate"
    },
    "frost": {
      "skin": "light",
      "hair": "silver",
      "eyes": "violet",
      "cloth": "linen"
    }
  },
  "mask": "tintMask"
};

/** Every catalog item of the pack, by id. */
export const AVATAR_CATALOG: Readonly<Record<string, AvatarCatalogItem>> = {
  "adventurer-lantern": {
    "id": "adventurer-lantern",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 40,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "adventurer-map": {
    "id": "adventurer-map",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 40,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "adventurer-sword": {
    "id": "adventurer-sword",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "apprentice-wand": {
    "id": "apprentice-wand",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "archer-bow": {
    "id": "archer-bow",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "avatar-hair-long": {
    "id": "avatar-hair-long",
    "slot": "hair",
    "tier": 1,
    "twoHanded": false,
    "price": 0,
    "rating": 7,
    "hides": [
      "hair"
    ],
    "hair": "hidden",
    "table": {
      "slots": {
        "hair": {
          "channel": "R",
          "default": "brown",
          "options": {
            "brown": [
              0.10224,
              0.02956,
              0.01229
            ],
            "black": [
              0.01681,
              0.01033,
              0.00857
            ],
            "blond": [
              0.55201,
              0.30947,
              0.06848
            ],
            "auburn": [
              0.2705,
              0.04374,
              0.01161
            ],
            "silver": [
              0.47932,
              0.45641,
              0.55201
            ],
            "teal": [
              0.02843,
              0.15896,
              0.14413
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "avatar-hair-ponytail": {
    "id": "avatar-hair-ponytail",
    "slot": "hair",
    "tier": 1,
    "twoHanded": false,
    "price": 0,
    "rating": 7.2,
    "hides": [
      "hair"
    ],
    "hair": "hidden",
    "table": {
      "slots": {
        "hair": {
          "channel": "R",
          "default": "brown",
          "options": {
            "brown": [
              0.10224,
              0.02956,
              0.01229
            ],
            "black": [
              0.01681,
              0.01033,
              0.00857
            ],
            "blond": [
              0.55201,
              0.30947,
              0.06848
            ],
            "auburn": [
              0.2705,
              0.04374,
              0.01161
            ],
            "silver": [
              0.47932,
              0.45641,
              0.55201
            ],
            "teal": [
              0.02843,
              0.15896,
              0.14413
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "avatar-hair-short": {
    "id": "avatar-hair-short",
    "slot": "hair",
    "tier": 1,
    "twoHanded": false,
    "price": 0,
    "rating": 7.2,
    "hides": [
      "hair"
    ],
    "hair": "hidden",
    "table": {
      "slots": {
        "hair": {
          "channel": "R",
          "default": "brown",
          "options": {
            "brown": [
              0.10224,
              0.02956,
              0.01229
            ],
            "black": [
              0.01681,
              0.01033,
              0.00857
            ],
            "blond": [
              0.55201,
              0.30947,
              0.06848
            ],
            "auburn": [
              0.2705,
              0.04374,
              0.01161
            ],
            "silver": [
              0.47932,
              0.45641,
              0.55201
            ],
            "teal": [
              0.02843,
              0.15896,
              0.14413
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "avatar-hair-swept": {
    "id": "avatar-hair-swept",
    "slot": "hair",
    "tier": 1,
    "twoHanded": false,
    "price": 0,
    "rating": 7.5,
    "hides": [
      "hair"
    ],
    "hair": "hidden",
    "table": {
      "slots": {
        "hair": {
          "channel": "R",
          "default": "brown",
          "options": {
            "brown": [
              0.10224,
              0.02956,
              0.01229
            ],
            "black": [
              0.01681,
              0.01033,
              0.00857
            ],
            "blond": [
              0.55201,
              0.30947,
              0.06848
            ],
            "auburn": [
              0.2705,
              0.04374,
              0.01161
            ],
            "silver": [
              0.47932,
              0.45641,
              0.55201
            ],
            "teal": [
              0.02843,
              0.15896,
              0.14413
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "axe": {
    "id": "axe",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "barbarian-axe": {
    "id": "barbarian-axe",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 120,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "bard-hat": {
    "id": "bard-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": {
      "slots": {
        "clothing": {
          "channel": "R",
          "default": "teal",
          "options": {
            "teal": [
              0.04667,
              0.23074,
              0.1912
            ],
            "plum": [
              0.17465,
              0.05127,
              0.11444
            ],
            "mustard": [
              0.36625,
              0.23074,
              0.02843
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "battle-axe": {
    "id": "battle-axe",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "belt": {
    "id": "belt",
    "slot": "waist",
    "tier": 1,
    "twoHanded": false,
    "price": 25,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "boots": {
    "id": "boots",
    "slot": "feet",
    "tier": 1,
    "twoHanded": false,
    "price": 25,
    "rating": 7,
    "hides": [
      "shoes"
    ],
    "hair": "full",
    "table": null
  },
  "bracers": {
    "id": "bracers",
    "slot": "hands",
    "tier": 1,
    "twoHanded": false,
    "price": 25,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "buckler": {
    "id": "buckler",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 45,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "cape": {
    "id": "cape",
    "slot": "back",
    "tier": 1,
    "twoHanded": false,
    "price": 40,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "captain-shield": {
    "id": "captain-shield",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 45,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "captain-sword": {
    "id": "captain-sword",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "chainmail": {
    "id": "chainmail",
    "slot": "chest",
    "tier": 2,
    "twoHanded": false,
    "price": 130,
    "rating": 7,
    "hides": [
      "undershirt"
    ],
    "hair": "full",
    "table": null
  },
  "circlet": {
    "id": "circlet",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 90,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "cleric-book": {
    "id": "cleric-book",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 90,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "cleric-hammer": {
    "id": "cleric-hammer",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 240,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "cloak": {
    "id": "cloak",
    "slot": "back",
    "tier": 2,
    "twoHanded": false,
    "price": 70,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "clockwork-soldier-halberd": {
    "id": "clockwork-soldier-halberd",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 200,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": {
      "slots": {
        "metal": {
          "channel": "R",
          "default": "brass",
          "options": {
            "brass": [
              0.32314,
              0.19462,
              0.03689
            ],
            "iron": [
              0.10224,
              0.10224,
              0.11697
            ],
            "copper": [
              0.32314,
              0.10224,
              0.04231
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "cloth-hood": {
    "id": "cloth-hood",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": 7,
    "hides": [],
    "hair": "tucked",
    "table": null
  },
  "club": {
    "id": "club",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 70,
    "rating": 7.1,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "crossbow": {
    "id": "crossbow",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "crown": {
    "id": "crown",
    "slot": "head",
    "tier": 3,
    "twoHanded": false,
    "price": 190,
    "rating": 7.1,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "crystal-focus": {
    "id": "crystal-focus",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 120,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "dagger": {
    "id": "dagger",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "dragoon-helm": {
    "id": "dragoon-helm",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 105,
    "rating": null,
    "hides": [],
    "hair": "tucked",
    "table": {
      "slots": {
        "plate": {
          "channel": "R",
          "default": "blue",
          "options": {
            "blue": [
              0.06848,
              0.10224,
              0.19462
            ],
            "black": [
              0.02315,
              0.02624,
              0.03689
            ],
            "crimson": [
              0.25415,
              0.02732,
              0.04231
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "dragoon-lance": {
    "id": "dragoon-lance",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 220,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "druid-cap": {
    "id": "druid-cap",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "druid-staff": {
    "id": "druid-staff",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 120,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "duelist-hat": {
    "id": "duelist-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "duelist-rapier": {
    "id": "duelist-rapier",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "enchanter-scroll": {
    "id": "enchanter-scroll",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "enchanter-staff": {
    "id": "enchanter-staff",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "explorer-hat": {
    "id": "explorer-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": {
      "slots": {
        "hat": {
          "channel": "R",
          "default": "khaki",
          "options": {
            "khaki": [
              0.57758,
              0.47932,
              0.27889
            ],
            "olive": [
              0.19462,
              0.19462,
              0.0648
            ],
            "slate": [
              0.14413,
              0.19462,
              0.25415
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "explorer-map": {
    "id": "explorer-map",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 40,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "falchion": {
    "id": "falchion",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "fighter-buckler": {
    "id": "fighter-buckler",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 45,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "fighter-cap": {
    "id": "fighter-cap",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 105,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "fighter-sword": {
    "id": "fighter-sword",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "flail": {
    "id": "flail",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "gauntlets": {
    "id": "gauntlets",
    "slot": "hands",
    "tier": 2,
    "twoHanded": false,
    "price": 55,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "gladiator-helmet": {
    "id": "gladiator-helmet",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 105,
    "rating": null,
    "hides": [],
    "hair": "tucked",
    "table": null
  },
  "gladiator-shield": {
    "id": "gladiator-shield",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 45,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "gladiator-sword": {
    "id": "gladiator-sword",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "glaive": {
    "id": "glaive",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 240,
    "rating": 7.1,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "gloves": {
    "id": "gloves",
    "slot": "hands",
    "tier": 1,
    "twoHanded": false,
    "price": 25,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "great-axe": {
    "id": "great-axe",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 260,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "greatsword": {
    "id": "greatsword",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 220,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "greaves": {
    "id": "greaves",
    "slot": "feet",
    "tier": 2,
    "twoHanded": false,
    "price": 50,
    "rating": 7,
    "hides": [
      "shoes"
    ],
    "hair": "full",
    "table": null
  },
  "grimoire": {
    "id": "grimoire",
    "slot": "offhand",
    "tier": 3,
    "twoHanded": false,
    "price": 225,
    "rating": 7.4,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "guardian-hammer": {
    "id": "guardian-hammer",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "guardian-helm": {
    "id": "guardian-helm",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 95,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "guardian-shield": {
    "id": "guardian-shield",
    "slot": "offhand",
    "tier": 3,
    "twoHanded": false,
    "price": 190,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": {
      "slots": {
        "cloth": {
          "channel": "R",
          "default": "teal",
          "options": {
            "teal": [
              0.04231,
              0.19462,
              0.2462
            ],
            "crimson": [
              0.32314,
              0.02519,
              0.03434
            ],
            "royal": [
              0.02843,
              0.09759,
              0.47932
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "halberd": {
    "id": "halberd",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 280,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "hand-axe": {
    "id": "hand-axe",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "heavy-crossbow": {
    "id": "heavy-crossbow",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 280,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "horned-helmet": {
    "id": "horned-helmet",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 95,
    "rating": 7.2,
    "hides": [
      "hair"
    ],
    "hair": "hidden",
    "table": null
  },
  "iron-helmet": {
    "id": "iron-helmet",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 105,
    "rating": 7.5,
    "hides": [
      "hair"
    ],
    "hair": "hidden",
    "table": null
  },
  "javelin": {
    "id": "javelin",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 60,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "katana": {
    "id": "katana",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "kite-shield": {
    "id": "kite-shield",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 90,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "knight-helm": {
    "id": "knight-helm",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 105,
    "rating": null,
    "hides": [],
    "hair": "tucked",
    "table": {
      "slots": {
        "plume": {
          "channel": "R",
          "default": "red",
          "options": {
            "red": [
              0.58408,
              0.04231,
              0.0319
            ],
            "blue": [
              0.02843,
              0.09759,
              0.47932
            ],
            "green": [
              0.02732,
              0.19462,
              0.04519
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "lantern-handheld": {
    "id": "lantern-handheld",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 45,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "leather-armor": {
    "id": "leather-armor",
    "slot": "chest",
    "tier": 1,
    "twoHanded": false,
    "price": 70,
    "rating": 7.5,
    "hides": [
      "undershirt"
    ],
    "hair": "full",
    "table": null
  },
  "leather-cap": {
    "id": "leather-cap",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": 7.1,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "long-sword": {
    "id": "long-sword",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 130,
    "rating": 7.5,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "longbow": {
    "id": "longbow",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "mace": {
    "id": "mace",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "mage-spellbook": {
    "id": "mage-spellbook",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 80,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "mage-wand": {
    "id": "mage-wand",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "magic-scepter": {
    "id": "magic-scepter",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": false,
    "price": 240,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "mantle": {
    "id": "mantle",
    "slot": "back",
    "tier": 2,
    "twoHanded": false,
    "price": 70,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "maul": {
    "id": "maul",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 240,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "morningstar": {
    "id": "morningstar",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "orb": {
    "id": "orb",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 90,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "paladin-hammer": {
    "id": "paladin-hammer",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 120,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "paladin-shield": {
    "id": "paladin-shield",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 90,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "pike": {
    "id": "pike",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 280,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "plate-armor": {
    "id": "plate-armor",
    "slot": "chest",
    "tier": 3,
    "twoHanded": false,
    "price": 260,
    "rating": 7.3,
    "hides": [
      "undershirt"
    ],
    "hair": "full",
    "table": null
  },
  "quarterstaff": {
    "id": "quarterstaff",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": true,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "ranger-bow": {
    "id": "ranger-bow",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "rapier": {
    "id": "rapier",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "ritual-dagger": {
    "id": "ritual-dagger",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "rogue-dagger": {
    "id": "rogue-dagger",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "rogue-hood": {
    "id": "rogue-hood",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": {
      "slots": {
        "cloth": {
          "channel": "R",
          "default": "teal",
          "options": {
            "teal": [
              0.02843,
              0.12214,
              0.11193
            ],
            "crimson": [
              0.19462,
              0.02315,
              0.02956
            ],
            "forest": [
              0.04374,
              0.10224,
              0.02315
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "round-shield": {
    "id": "round-shield",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "rune-stone": {
    "id": "rune-stone",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 120,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "samurai-katana": {
    "id": "samurai-katana",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "scale-armor": {
    "id": "scale-armor",
    "slot": "chest",
    "tier": 2,
    "twoHanded": false,
    "price": 130,
    "rating": 7.3,
    "hides": [
      "undershirt"
    ],
    "hair": "full",
    "table": null
  },
  "scimitar": {
    "id": "scimitar",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "scythe": {
    "id": "scythe",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 260,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shaman-cap": {
    "id": "shaman-cap",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": {
      "slots": {
        "cloth": {
          "channel": "R",
          "default": "teal",
          "options": {
            "teal": [
              0.06848,
              0.47932,
              0.43415
            ],
            "red": [
              0.39157,
              0.04231,
              0.0319
            ],
            "violet": [
              0.14413,
              0.06848,
              0.34191
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "shaman-feather": {
    "id": "shaman-feather",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 40,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shaman-staff": {
    "id": "shaman-staff",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 120,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": {
      "slots": {
        "cloth": {
          "channel": "R",
          "default": "teal",
          "options": {
            "teal": [
              0.06848,
              0.47932,
              0.43415
            ],
            "red": [
              0.39157,
              0.04231,
              0.0319
            ],
            "violet": [
              0.14413,
              0.06848,
              0.34191
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "shield-maiden-axe": {
    "id": "shield-maiden-axe",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shield-maiden-helm": {
    "id": "shield-maiden-helm",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 105,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "shield-maiden-shield": {
    "id": "shield-maiden-shield",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": {
      "slots": {
        "shield": {
          "channel": "R",
          "default": "blue",
          "options": {
            "blue": [
              0.04231,
              0.25415,
              0.47932
            ],
            "crimson": [
              0.25415,
              0.02315,
              0.04231
            ],
            "forest": [
              0.02732,
              0.14413,
              0.04519
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "short-sword": {
    "id": "short-sword",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shortbow": {
    "id": "shortbow",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": true,
    "price": 60,
    "rating": 7.5,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shoulder-armor": {
    "id": "shoulder-armor",
    "slot": "shoulders",
    "tier": 2,
    "twoHanded": false,
    "price": 85,
    "rating": 7.1,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "sickle": {
    "id": "sickle",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 65,
    "rating": 7,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "skeleton-knight-shield": {
    "id": "skeleton-knight-shield",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 95,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": {
      "slots": {
        "armor": {
          "channel": "R",
          "default": "iron",
          "options": {
            "iron": [
              0.06848,
              0.07819,
              0.09084
            ],
            "rusted": [
              0.14703,
              0.06848,
              0.03689
            ],
            "bronze": [
              0.19462,
              0.12744,
              0.03689
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "sling": {
    "id": "sling",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 70,
    "rating": 7.3,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "spear": {
    "id": "spear",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 60,
    "rating": 7.4,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "spear-warden-crest": {
    "id": "spear-warden-crest",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 105,
    "rating": null,
    "hides": [],
    "hair": "tucked",
    "table": null
  },
  "spear-warden-helm": {
    "id": "spear-warden-helm",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 95,
    "rating": null,
    "hides": [],
    "hair": "tucked",
    "table": null
  },
  "spear-warden-javelin": {
    "id": "spear-warden-javelin",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "spear-warden-spear": {
    "id": "spear-warden-spear",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 220,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "spellbook": {
    "id": "spellbook",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 80,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "staff": {
    "id": "staff",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 130,
    "rating": 7.5,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "steel-helmet": {
    "id": "steel-helmet",
    "slot": "head",
    "tier": 2,
    "twoHanded": false,
    "price": 95,
    "rating": 7.2,
    "hides": [
      "hair"
    ],
    "hair": "hidden",
    "table": null
  },
  "studded-leather": {
    "id": "studded-leather",
    "slot": "chest",
    "tier": 1,
    "twoHanded": false,
    "price": 65,
    "rating": 7,
    "hides": [
      "undershirt"
    ],
    "hair": "full",
    "table": null
  },
  "swashbuckler-bandana": {
    "id": "swashbuckler-bandana",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 45,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": {
      "slots": {
        "clothing": {
          "channel": "R",
          "default": "red",
          "options": {
            "red": [
              0.58408,
              0.04231,
              0.0319
            ],
            "blue": [
              0.02843,
              0.09759,
              0.47932
            ],
            "green": [
              0.02732,
              0.19462,
              0.04519
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "swashbuckler-dagger": {
    "id": "swashbuckler-dagger",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "swashbuckler-sabre": {
    "id": "swashbuckler-sabre",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 100,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "throwing-axe": {
    "id": "throwing-axe",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 65,
    "rating": 7.4,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "throwing-knife": {
    "id": "throwing-knife",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "tome": {
    "id": "tome",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 80,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "tower-shield": {
    "id": "tower-shield",
    "slot": "offhand",
    "tier": 3,
    "twoHanded": false,
    "price": 175,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "treasure-hunter-hat": {
    "id": "treasure-hunter-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "treasure-hunter-torch": {
    "id": "treasure-hunter-torch",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 45,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "treasure-hunter-whip": {
    "id": "treasure-hunter-whip",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "trident": {
    "id": "trident",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "wand": {
    "id": "wand",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "warhammer": {
    "id": "warhammer",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": false,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "warlock-book": {
    "id": "warlock-book",
    "slot": "offhand",
    "tier": 2,
    "twoHanded": false,
    "price": 90,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": {
      "slots": {
        "flame": {
          "channel": "R",
          "default": "green",
          "options": {
            "green": [
              0.05127,
              1,
              0.21586
            ],
            "purple": [
              0.52712,
              0.11697,
              1
            ],
            "orange": [
              1,
              0.21586,
              0.02956
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "warrior-sword": {
    "id": "warrior-sword",
    "slot": "mainhand",
    "tier": 3,
    "twoHanded": true,
    "price": 200,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "whip": {
    "id": "whip",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "witch-broom": {
    "id": "witch-broom",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "price": 55,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "witch-hat": {
    "id": "witch-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": {
      "slots": {
        "band": {
          "channel": "R",
          "default": "purple",
          "options": {
            "purple": [
              0.19462,
              0.04231,
              0.35153
            ],
            "red": [
              0.39157,
              0.04231,
              0.02956
            ],
            "green": [
              0.04231,
              0.25415,
              0.04231
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "witch-potion": {
    "id": "witch-potion",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "price": 40,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "wizard-hat": {
    "id": "wizard-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "price": 50,
    "rating": null,
    "hides": [],
    "hair": "capped",
    "table": {
      "slots": {
        "clothing": {
          "channel": "R",
          "default": "red",
          "options": {
            "red": [
              0.47932,
              0.0319,
              0.02416
            ],
            "blue": [
              0.02732,
              0.06848,
              0.34191
            ],
            "purple": [
              0.14703,
              0.0319,
              0.29614
            ]
          }
        }
      },
      "presets": {},
      "mask": "tintMask"
    }
  },
  "wizard-staff": {
    "id": "wizard-staff",
    "slot": "mainhand",
    "tier": 2,
    "twoHanded": true,
    "price": 110,
    "rating": null,
    "hides": [],
    "hair": "full",
    "table": null
  }
};
