import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const usages = JSON.parse(
  readFileSync(resolve(dir, "game-asset-usage-matrix.json"), "utf8"),
);
const grouped = Map.groupBy(usages, (usage) => usage.semanticRole);
const mustRoles = new Set([
  "player-avatar",
  "learning-target",
  "hud-and-prompt",
  "collectible-content",
  "gameplay-feedback",
]);

const ontology = [...grouped.entries()].map(([role, items]) => ({
  id: `asset:${items[0].family}:${role}`,
  family: items[0].family,
  semanticRole: role,
  gameplayMeaning: `Provides the ${role.replaceAll("-", " ")} capability without encoding a theme or legacy filename.`,
  usageIds: items.map((item) => item.id),
  consumerSceneIds: [
    ...new Set(items.flatMap((item) => item.consumerSceneIds)),
  ],
  capabilityIds: [...new Set(items.flatMap((item) => item.capabilityIds))],
  requiredStates: [...new Set(items.flatMap((item) => item.states))],
  profileUsage: ["compact", "wide"],
  themes: ["chibi-quest", "riven-lands"],
  allowedSubstitutions: [
    `Another treatment of ${role} with identical states, bounds, readability, and semantic role.`,
  ],
  prohibitedConflations: [
    "Cover or screenshot art",
    "Text-bearing imagery",
    "A different gameplay strength, behavior, collision, or interaction role",
  ],
  currentCoverage: "gap",
  priority: mustRoles.has(role) ? "must" : "should",
}));

writeFileSync(
  resolve(dir, "asset-ontology.json"),
  `${JSON.stringify(ontology, null, 2)}\n`,
);
writeFileSync(
  resolve(dir, "asset-ontology.md"),
  `# APK Semantic Asset Ontology\n\nGameplay meaning is stable; Chibi Quest and Riven Lands are parallel treatments. No legacy filename, sprite grid, or cover composition is part of the semantic contract.\n\n| Semantic ID | Family | Consumers | Priority | Coverage |\n|---|---|---:|---|---|\n${ontology.map((entry) => `| \`${entry.id}\` | ${entry.family} | ${entry.consumerSceneIds.length} | ${entry.priority} | ${entry.currentCoverage} |`).join("\n")}\n\n## Substitution rule\n\nSubstitution requires equivalent states, interaction meaning, collision/readability, profile behavior, and theme-independent geometry. Strength, movement, attack, scale, target, hazard, mount, station, and objective roles must not be conflated.\n`,
);

const must = ontology.filter((entry) => entry.priority === "must");
writeFileSync(
  resolve(dir, "gap-and-coverage-plan.md"),
  `# APK Gap and Coverage Plan\n\nAll ${ontology.length} semantic families are production gaps because Phase 5 accepted no legacy candidate.\n\n## Delivery sequence\n\n1. **Kit contracts:** lifecycle, progression, responsive regions, input, camera, semantic loader, diagnostics, and deterministic test kit.\n2. **Must asset batch:** ${must.map((entry) => entry.semanticRole).join(", ")} in both themes.\n3. **World kits:** forest/village, dungeon/library, castle, sky, arena, and workshop environments with terrain, structures, props, hazards, and indicators.\n4. **Action batch:** creatures/mounts, weapons, projectiles, impacts, damage, and completion VFX.\n5. **Audio/UI hardening:** semantic cues, nine-slice panels, controls, and both-profile text-safe validation.\n\n## Cartridge cohorts\n\nFoundation: Dragon Flight, Magic Defense, Dungeon Liberator. Unfinished-first: Astral Mage and Sorcerer's Ziggurat after provisional decisions. Runner/traversal, arena/action, defense/combat, collector/adventure, and puzzle/workstation cohorts follow.\n\n## Blockers\n\nNo cohort ships until capability contracts, compact/wide profiles, ontology roles, both-theme physical assets, provenance, and browser QC are accepted. Babel Architect and Abyssal Well need explicit product disposition.\n`,
);
