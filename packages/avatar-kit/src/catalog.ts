/**
 * The avatar pack data the Primary avatar needs, copied from the Forge pack
 * `out/packs/avatar/1.0.0/catalog.json` at Forge commit {@link FORGE_COMMIT} by
 * `scripts/port-avatar-pack.py` (data only; the composer is in `portrait.ts`).
 */
import type { HairForm } from "./hair.js";
import type { VariantTable } from "./tint.js";

/** The Forge commit the pack data and the portrait layers come from. */
export const FORGE_COMMIT = "3294ae5";

/** The pack version; the portrait layers are served from `/packs/avatar/<version>/`. */
export const AVATAR_PACK_VERSION = "1.0.0";

/** One catalog item of the pack that a starter set wears. */
export interface AvatarCatalogItem {
  readonly id: string;
  readonly slot: string;
  readonly tier: number;
  readonly twoHanded: boolean;
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

/** The catalog items of the 15 starter sets and the default hair style, by id. */
export const AVATAR_CATALOG: Readonly<Record<string, AvatarCatalogItem>> = {
  "adventurer-sword": {
    "id": "adventurer-sword",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "avatar-hair-long": {
    "id": "avatar-hair-long",
    "slot": "hair",
    "tier": 1,
    "twoHanded": false,
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
  "bard-hat": {
    "id": "bard-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
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
  "belt": {
    "id": "belt",
    "slot": "waist",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "boots": {
    "id": "boots",
    "slot": "feet",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "full",
    "table": null
  },
  "buckler": {
    "id": "buckler",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "cape": {
    "id": "cape",
    "slot": "back",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "cloth-hood": {
    "id": "cloth-hood",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "tucked",
    "table": null
  },
  "club": {
    "id": "club",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "dagger": {
    "id": "dagger",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "druid-cap": {
    "id": "druid-cap",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "duelist-hat": {
    "id": "duelist-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "explorer-hat": {
    "id": "explorer-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "full",
    "table": null
  },
  "gladiator-shield": {
    "id": "gladiator-shield",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "gladiator-sword": {
    "id": "gladiator-sword",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "gloves": {
    "id": "gloves",
    "slot": "hands",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "leather-armor": {
    "id": "leather-armor",
    "slot": "chest",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "mace": {
    "id": "mace",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "mage-wand": {
    "id": "mage-wand",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "quarterstaff": {
    "id": "quarterstaff",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": true,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "rogue-dagger": {
    "id": "rogue-dagger",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "rogue-hood": {
    "id": "rogue-hood",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shaman-cap": {
    "id": "shaman-cap",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shield-maiden-axe": {
    "id": "shield-maiden-axe",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shield-maiden-shield": {
    "id": "shield-maiden-shield",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "full",
    "table": null
  },
  "shortbow": {
    "id": "shortbow",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": true,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "spear": {
    "id": "spear",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "studded-leather": {
    "id": "studded-leather",
    "slot": "chest",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "full",
    "table": null
  },
  "treasure-hunter-hat": {
    "id": "treasure-hunter-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "capped",
    "table": null
  },
  "treasure-hunter-torch": {
    "id": "treasure-hunter-torch",
    "slot": "offhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "treasure-hunter-whip": {
    "id": "treasure-hunter-whip",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "witch-broom": {
    "id": "witch-broom",
    "slot": "mainhand",
    "tier": 1,
    "twoHanded": false,
    "hides": [],
    "hair": "full",
    "table": null
  },
  "witch-hat": {
    "id": "witch-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
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
    "hides": [],
    "hair": "full",
    "table": null
  },
  "wizard-hat": {
    "id": "wizard-hat",
    "slot": "head",
    "tier": 1,
    "twoHanded": false,
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
  }
};
